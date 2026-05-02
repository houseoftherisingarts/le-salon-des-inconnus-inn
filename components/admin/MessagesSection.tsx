import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase';
import {
    collection, onSnapshot, orderBy, query, addDoc, serverTimestamp, doc, updateDoc,
} from 'firebase/firestore';
import type { WwooferProfile, WwooferMessage } from '../../types';

// Admin inbox for wwoofer ↔ admin threads only. The Firestore rule for
// /wwoofers/{uid}/messages allows the admin and the wwoofer to read; admin
// writes have fromAdmin:true. Member-to-member /conversations are
// intentionally excluded — admins shouldn't snoop on private DMs.

interface MessagesSectionProps {
    wwoofers: WwooferProfile[];
    adminUid: string;
    adminEmail: string;
}

interface ThreadMeta {
    wwoofer: WwooferProfile;
    messages: WwooferMessage[];
    lastAt: number;          // ms — for sort
    lastPreview: string;     // last message body, truncated
    lastFromAdmin: boolean;
    unreadFromWwoofer: boolean; // last is from the wwoofer (admin needs to reply)
}

const PREVIEW_LIMIT = 80;

export const MessagesSection: React.FC<MessagesSectionProps> = ({ wwoofers, adminUid, adminEmail }) => {
    // Per-wwoofer message arrays, keyed by uid.
    const [threads, setThreads] = useState<Record<string, WwooferMessage[]>>({});
    const [activeUid, setActiveUid] = useState<string | null>(null);
    const [reply, setReply] = useState('');
    const [sending, setSending] = useState(false);

    // Subscribe to every wwoofer's messages subcollection. We only set up
    // listeners when the wwoofer list changes — otherwise the same wwoofer
    // gets dozens of listeners as state updates churn.
    useEffect(() => {
        if (!db) return;
        const unsubs = wwoofers.map((w) =>
            onSnapshot(
                query(collection(db, 'wwoofers', w.uid, 'messages'), orderBy('createdAt', 'asc')),
                (snap) => {
                    const msgs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }) as WwooferMessage);
                    setThreads(prev => ({ ...prev, [w.uid]: msgs }));
                },
                () => {},
            ),
        );
        return () => unsubs.forEach(fn => fn());
    }, [wwoofers]);

    // Build a sorted thread list: those with messages first, ordered by most
    // recent activity. Wwoofers with no messages still appear at the bottom
    // so the admin can start a conversation.
    const threadList = useMemo<ThreadMeta[]>(() => {
        const items = wwoofers.map((w) => {
            const messages = threads[w.uid] ?? [];
            const last = messages[messages.length - 1];
            const lastAt = last?.createdAt?.toMillis?.() ?? 0;
            const body = (last?.text ?? '').replace(/\s+/g, ' ').trim();
            return {
                wwoofer: w,
                messages,
                lastAt,
                lastPreview: body.length > PREVIEW_LIMIT ? body.slice(0, PREVIEW_LIMIT) + '…' : body,
                lastFromAdmin: !!last?.fromAdmin,
                unreadFromWwoofer: !!last && !last.fromAdmin,
            } as ThreadMeta;
        });
        items.sort((a, b) => b.lastAt - a.lastAt);
        return items;
    }, [wwoofers, threads]);

    const active = activeUid ? threadList.find(t => t.wwoofer.uid === activeUid) : null;
    const unreadCount = threadList.filter(t => t.unreadFromWwoofer).length;

    const sendReply = async () => {
        if (!db || !active || !reply.trim() || sending) return;
        setSending(true);
        try {
            await addDoc(
                collection(db, 'wwoofers', active.wwoofer.uid, 'messages'),
                {
                    text: reply.trim(),
                    fromAdmin: true,
                    authorEmail: adminEmail,
                    createdAt: serverTimestamp(),
                },
            );
            setReply('');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="text-neutral-500 text-sm font-lato max-w-2xl">
                    Messagerie wwoofer ↔ admin. Les conversations privées entre membres ne sont pas affichées
                    ici (par respect de la vie privée).
                </p>
                {unreadCount > 0 && (
                    <span className="text-rose-300 font-cinzel text-[10px] uppercase tracking-[0.4em]">
                        ● {unreadCount} en attente de réponse
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[480px]">
                {/* Thread list */}
                <div className="border border-white/10 bg-[#0a0a0a] divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    {threadList.length === 0 ? (
                        <p className="p-6 text-center text-neutral-700 italic text-xs">Aucun wwoofer.</p>
                    ) : threadList.map(t => {
                        const isActive = t.wwoofer.uid === activeUid;
                        return (
                            <button
                                key={t.wwoofer.uid}
                                type="button"
                                onClick={() => setActiveUid(t.wwoofer.uid)}
                                className={`w-full text-left px-4 py-3 transition-colors ${
                                    isActive
                                        ? 'bg-[#1a1208]/50'
                                        : 'hover:bg-white/[0.02]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    {t.wwoofer.photoURL ? (
                                        <img src={t.wwoofer.photoURL} alt="" className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-[#1a1208] border border-[#c5a059]/30 flex items-center justify-center text-[10px] font-cinzel text-[#f3e5ab]">
                                            {(t.wwoofer.displayName?.[0] || '?').toUpperCase()}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className={`text-sm truncate ${isActive ? 'text-[#f3e5ab]' : 'text-neutral-200'}`}>
                                                {t.wwoofer.displayName || t.wwoofer.email || '—'}
                                            </p>
                                            {t.unreadFromWwoofer && (
                                                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[11px] text-neutral-600 truncate mt-0.5">
                                            {t.lastPreview ? (
                                                <>
                                                    {t.lastFromAdmin && <span className="text-neutral-700 mr-1">vous:</span>}
                                                    {t.lastPreview}
                                                </>
                                            ) : (
                                                <span className="italic">Aucun message</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Thread view */}
                <div className="border border-white/10 bg-[#0a0a0a] flex flex-col min-h-[480px]">
                    {!active ? (
                        <div className="flex-1 flex items-center justify-center text-neutral-700 italic font-lato text-sm">
                            Choisissez un fil à gauche pour le lire.
                        </div>
                    ) : (
                        <>
                            <div className="px-5 py-3 border-b border-white/5 flex items-center gap-3">
                                {active.wwoofer.photoURL ? (
                                    <img src={active.wwoofer.photoURL} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#1a1208] border border-[#c5a059]/30 flex items-center justify-center text-[10px] font-cinzel text-[#f3e5ab]">
                                        {(active.wwoofer.displayName?.[0] || '?').toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="font-prata text-[#f3e5ab] text-base truncate">
                                        {active.wwoofer.displayName || '—'}
                                    </p>
                                    <p className="text-[10px] font-josefin text-neutral-600 uppercase tracking-[0.3em] truncate">
                                        {active.wwoofer.email}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                {active.messages.length === 0 ? (
                                    <p className="text-center text-neutral-700 italic font-lato text-xs py-12">
                                        Aucun message dans ce fil. Écrivez-en un pour commencer.
                                    </p>
                                ) : active.messages.map(m => (
                                    <div
                                        key={m.id}
                                        className={`flex ${m.fromAdmin ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm font-lato ${
                                            m.fromAdmin
                                                ? 'bg-[#1a1208]/70 border border-[#c5a059]/30 text-[#f3e5ab]'
                                                : 'bg-white/5 border border-white/10 text-neutral-300'
                                        }`}>
                                            <p className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</p>
                                            <p className="text-[9px] font-josefin uppercase tracking-[0.3em] mt-1 opacity-60">
                                                {m.fromAdmin ? 'admin' : (active.wwoofer.displayName || 'wwoofer')}
                                                {m.createdAt?.toDate && ` · ${m.createdAt.toDate().toLocaleString('fr-CA', { dateStyle: 'short', timeStyle: 'short' })}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form
                                onSubmit={(e) => { e.preventDefault(); sendReply(); }}
                                className="p-3 border-t border-white/5 flex gap-2"
                            >
                                <textarea
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendReply();
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Répondre…"
                                    className="flex-1 bg-[#050505] border border-white/10 text-white px-3 py-2 text-sm font-lato resize-none focus:outline-none focus:border-[#d4af37]/50"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !reply.trim()}
                                    className="px-5 self-end py-2 bg-[#d4af37] text-black text-[10px] font-cinzel font-bold uppercase tracking-[0.4em] hover:bg-[#f3e5ab] disabled:opacity-40 transition-colors shrink-0"
                                >
                                    {sending ? '…' : 'Envoyer'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
