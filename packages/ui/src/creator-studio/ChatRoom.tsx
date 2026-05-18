import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import {
    getFirestore, collection, query, orderBy, onSnapshot, addDoc,
    serverTimestamp, deleteDoc, doc, limit, type Firestore,
} from 'firebase/firestore';
import type { CreatorStudioUser } from './CreatorStudioShell';

// Top-level Studio chat rooms. The ID is the Firestore subcollection segment;
// labels are the visible text. Order here is the order in the sidebar.
// Rename/reorder freely — Firestore creates room subcollections lazily on the
// first message, so renaming a key only loses prior messages for that key.
export const CHAT_ROOMS: ReadonlyArray<{
    id: string;
    en: string;
    fr: string;
    icon: string;
    blurbEn: string;
    blurbFr: string;
}> = [
    { id: 'general',     en: 'General',         fr: 'Général',           icon: '◆', blurbEn: 'Anything goes — say hi.',                          blurbFr: 'Tout est permis — dis bonjour.' },
    { id: 'studio',      en: 'Studio talk',     fr: 'Atelier',           icon: '✎', blurbEn: 'Work-in-progress, technique, gear.',                 blurbFr: 'Travaux en cours, technique, matériel.' },
    { id: 'collabs',     en: 'Collaborations',  fr: 'Collaborations',    icon: '⊕', blurbEn: 'Looking to team up — or offering a hand.',           blurbFr: 'Envie de collaborer — ou prêt·e à donner un coup de main.' },
    { id: 'critique',    en: 'Critique corner', fr: 'Coin critique',     icon: '♢', blurbEn: 'Soft feedback. Lighter than the Hot Seat.',          blurbFr: 'Retours doux. Moins intense que le Hot Seat.' },
    { id: 'resources',   en: 'Resources',       fr: 'Ressources',        icon: '※', blurbEn: 'Tools, books, grants, open calls.',                  blurbFr: 'Outils, livres, bourses, appels.' },
    { id: 'events',      en: 'Events & shows',  fr: 'Événements',        icon: '☆', blurbEn: 'What is coming up.',                                 blurbFr: 'Ce qui s\'en vient.' },
    { id: 'inn-life',    en: 'Inn life',        fr: 'Vie de l\'Auberge', icon: '⌂', blurbEn: 'Kitchen, garden, residency logistics.',              blurbFr: 'Cuisine, jardin, logistique de résidence.' },
    { id: 'music',       en: 'Music & sound',   fr: 'Musique & son',     icon: '♪', blurbEn: 'Playlists, sound art, gigs.',                        blurbFr: 'Playlists, art sonore, prestations.' },
    { id: 'visual-word', en: 'Visual & word',   fr: 'Visuel & mot',      icon: '◐', blurbEn: 'Visual art, writing, poetry.',                       blurbFr: 'Arts visuels, écriture, poésie.' },
    { id: 'misc',        en: 'Misc',            fr: 'Divers',            icon: '✶', blurbEn: 'Off-topic, jokes, anything else.',                   blurbFr: 'Hors-sujet, blagues, n\'importe quoi.' },
];

interface ChatMessage {
    id: string;
    uid: string;
    name: string;
    avatarUrl?: string | null;
    text: string;
    createdAt?: { seconds: number } | null;
}

interface Props {
    language: 'EN' | 'FR';
    currentUser: CreatorStudioUser | null;
    /** Display name from regData; falls back to currentUser.displayName / email. */
    displayName?: string;
    avatarUrl?: string | null;
    accessLevel: 'GUEST' | 'MEMBER';
    /** Active studio theme — drives accents (RAINBOW = neon arcade). */
    theme: string;
    /** Theme-derived class strings (border, highlight). */
    themeStyles: { border: string; highlight: string };
    isAdmin?: boolean;
}

function studioDb(): Firestore | null {
    try { return getFirestore(getApp()); } catch { return null; }
}

const formatTime = (ts?: { seconds: number } | null): string => {
    if (!ts?.seconds) return '';
    const d = new Date(ts.seconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatRoom: React.FC<Props> = ({
    language, currentUser, displayName, avatarUrl,
    accessLevel, theme, themeStyles, isAdmin,
}) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [activeRoom, setActiveRoom] = useState<string>(() => {
        if (typeof window === 'undefined') return 'general';
        return localStorage.getItem('studioChatActiveRoom') || 'general';
    });
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    const room = CHAT_ROOMS.find(r => r.id === activeRoom) ?? CHAT_ROOMS[0];

    // Persist room selection so refreshing keeps you in the same room.
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('studioChatActiveRoom', activeRoom);
        }
    }, [activeRoom]);

    // Live-subscribe to messages in the active room. Cap at 200 to keep the
    // initial paint cheap; can paginate later if a room gets noisy.
    useEffect(() => {
        const db = studioDb(); if (!db) return;
        const q = query(
            collection(db, 'studioChats', activeRoom, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(200),
        );
        const unsub = onSnapshot(q, snap => {
            const next: ChatMessage[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
            setMessages(next);
        }, err => {
            setError(String(err?.message ?? err));
        });
        return () => unsub();
    }, [activeRoom]);

    // Scroll to bottom whenever messages change in the active room.
    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages, activeRoom]);

    const canPost = accessLevel === 'MEMBER' && !!currentUser?.uid;

    const sendMessage = async () => {
        const text = draft.trim();
        if (!text || !canPost || sending) return;
        const db = studioDb(); if (!db || !currentUser) return;
        setSending(true);
        setError(null);
        try {
            await addDoc(collection(db, 'studioChats', activeRoom, 'messages'), {
                uid: currentUser.uid,
                name: displayName || currentUser.displayName || currentUser.email || 'Member',
                avatarUrl: avatarUrl ?? currentUser.photoURL ?? null,
                text,
                createdAt: serverTimestamp(),
            });
            setDraft('');
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        } finally {
            setSending(false);
        }
    };

    const deleteMessage = async (msg: ChatMessage) => {
        if (!currentUser) return;
        const isOwn = msg.uid === currentUser.uid;
        if (!isOwn && !isAdmin) return;
        const db = studioDb(); if (!db) return;
        try {
            await deleteDoc(doc(db, 'studioChats', activeRoom, 'messages', msg.id));
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const isNeon = theme === 'RAINBOW';
    const accent = isNeon
        ? 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300'
        : 'text-white';

    return (
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 min-h-[600px]">
                {/* Room sidebar */}
                <aside className={`bg-black/40 border ${themeStyles.border} rounded-lg p-3 flex flex-col gap-1`}>
                    <p className="text-[9px] font-cinzel uppercase tracking-[0.3em] text-neutral-500 px-2 py-2">
                        {t('Rooms', 'Salles')}
                    </p>
                    {CHAT_ROOMS.map(r => {
                        const active = r.id === activeRoom;
                        return (
                            <button
                                key={r.id}
                                onClick={() => setActiveRoom(r.id)}
                                className={`text-left px-3 py-2 rounded transition-all flex items-center gap-3 group ${
                                    active
                                        ? `bg-white/10 border ${themeStyles.border}`
                                        : 'hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <span className={`text-base w-5 text-center ${active ? themeStyles.highlight : 'text-neutral-500 group-hover:text-white'}`}>{r.icon}</span>
                                <span className={`flex-1 text-xs font-cinzel uppercase tracking-wider ${active ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
                                    {language === 'FR' ? r.fr : r.en}
                                </span>
                            </button>
                        );
                    })}
                </aside>

                {/* Active room — header + messages + composer */}
                <section className={`bg-black/40 border ${themeStyles.border} rounded-lg flex flex-col`}>
                    {/* Room header */}
                    <header className={`px-5 py-4 border-b ${themeStyles.border} flex items-center gap-4`}>
                        <span className={`text-2xl ${themeStyles.highlight}`}>{room.icon}</span>
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-xl font-cinzel uppercase tracking-wider ${accent} ${isNeon ? 'font-black italic drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]' : ''}`}>
                                {language === 'FR' ? room.fr : room.en}
                            </h3>
                            <p className="text-[11px] text-neutral-500 mt-0.5">
                                {language === 'FR' ? room.blurbFr : room.blurbEn}
                            </p>
                        </div>
                        <span className="hidden md:inline text-[10px] uppercase tracking-widest text-neutral-600">
                            {messages.length} {t('messages', 'messages')}
                        </span>
                    </header>

                    {/* Message list */}
                    <div
                        ref={scrollerRef}
                        className="flex-1 min-h-[380px] max-h-[60vh] overflow-y-auto px-5 py-4 space-y-3"
                    >
                        {messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-center">
                                <p className="text-sm text-neutral-500 italic font-serif max-w-xs">
                                    {t(
                                        'Be the first to break the silence in this room.',
                                        'Sois le·la premier·e à briser le silence dans cette salle.',
                                    )}
                                </p>
                            </div>
                        ) : (
                            messages.map(msg => {
                                const isOwn = msg.uid === currentUser?.uid;
                                const canDelete = isOwn || !!isAdmin;
                                return (
                                    <div key={msg.id} className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                                        <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-700 to-cyan-700 flex items-center justify-center text-xs font-bold text-white/80">
                                            {msg.avatarUrl ? (
                                                <img src={msg.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                (msg.name?.[0] || '?').toUpperCase()
                                            )}
                                        </div>
                                        <div className={`flex flex-col max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                            <div className="flex items-baseline gap-2 text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                                                <span className={`font-cinzel ${isOwn ? themeStyles.highlight : 'text-neutral-400'}`}>{msg.name}</span>
                                                <span>{formatTime(msg.createdAt)}</span>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => deleteMessage(msg)}
                                                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity"
                                                        title={t('Delete', 'Supprimer')}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                            <div className={`px-4 py-2 rounded-2xl text-sm font-lato leading-relaxed whitespace-pre-wrap break-words ${
                                                isOwn
                                                    ? `bg-white/10 border ${themeStyles.border} text-white`
                                                    : 'bg-black/40 border border-white/10 text-neutral-200'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Composer */}
                    <div className={`border-t ${themeStyles.border} p-4`}>
                        {!canPost ? (
                            <p className="text-center text-xs text-neutral-500 font-cinzel uppercase tracking-widest py-3">
                                {accessLevel === 'GUEST'
                                    ? t('Sign in to join the conversation.', 'Connecte-toi pour rejoindre la conversation.')
                                    : t('You need a member account to post.', 'Compte membre requis pour publier.')}
                            </p>
                        ) : (
                            <div className="flex items-end gap-3">
                                <textarea
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={onKeyDown}
                                    placeholder={t(
                                        `Write to #${language === 'FR' ? room.fr : room.en}…`,
                                        `Écrire à #${language === 'FR' ? room.fr : room.en}…`,
                                    )}
                                    rows={1}
                                    className={`flex-1 bg-black/40 border ${themeStyles.border} rounded-lg px-4 py-3 text-sm text-white placeholder:text-neutral-600 font-lato resize-none focus:outline-none focus:border-white/40 max-h-32`}
                                    disabled={sending}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!draft.trim() || sending}
                                    className={`shrink-0 px-5 py-3 font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isNeon
                                            ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black hover:brightness-110'
                                            : 'bg-[#c5a059] text-black hover:bg-[#d4b06a]'
                                    }`}
                                >
                                    {sending ? t('Sending…', 'Envoi…') : t('Send', 'Envoyer')}
                                </button>
                            </div>
                        )}
                        {error && (
                            <p className="text-xs text-rose-400 mt-2">{error}</p>
                        )}
                        <p className="text-[9px] uppercase tracking-widest text-neutral-600 mt-2 text-center">
                            {t('Enter to send · Shift+Enter for newline', 'Entrée pour envoyer · Maj+Entrée pour nouvelle ligne')}
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};
