import React, { useEffect, useMemo, useRef, useState } from 'react';
import { db, storage } from '../../firebase';
import {
    collection, collectionGroup, doc, getDoc, getDocs, onSnapshot,
    orderBy, query, serverTimestamp, setDoc, updateDoc, deleteDoc, where,
} from 'firebase/firestore';
import {
    ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';
import type { User } from 'firebase/auth';

/**
 * AdminCRM · Inspirosphere section
 * ────────────────────────────────
 * Four sub-tabs:
 *   • Pending  — collectionGroup('videos') where featureStatus == 'pending'.
 *                Approve writes a denormalized doc to inspirosphereFeatured
 *                and flips the source's featureStatus → 'featured'. Reject
 *                flips status only.
 *   • Featured — list of currently-approved UGC (the Voices feed). Unfeature
 *                removes the featured doc + flips source back to 'none'.
 *   • All UGC  — every member video in the system, regardless of status.
 *                Useful for moderation + auditing view counts.
 *   • Curated  — admin uploads for the Featured tab in the orb. Drag/drop
 *                a video, give it a category, publish.
 *
 * The component subscribes to its own data — the parent only passes the
 * authenticated user. The `onPendingCountChange` callback bubbles the
 * pending queue length up to the sidebar badge.
 */

const CATEGORIES = [
    'SCREENWRITING', 'DRAWING', 'CINEMATOGRAPHY', 'MUSIC', 'ACTING',
    'PHOTOGRAPHY', 'WRITING', 'ANIMATION', 'PERFORMANCE', 'MINDSET',
    'CRAFT', 'GENERAL',
] as const;
type Category = typeof CATEGORIES[number];

interface UserVideo {
    id: string;
    ownerUid: string;
    title: string;
    category: Category;
    storagePath: string;
    featureStatus: 'none' | 'pending' | 'featured' | 'rejected';
    viewCount?: number;
    requestedAt?: any;
    createdAt?: any;
    reviewedAt?: any;
    reviewedBy?: string;
    rejectionReason?: string;
}

interface FeaturedDoc {
    id: string;
    ownerUid: string;
    title: string;
    ownerDisplayName?: string;
    category: Category;
    storagePath: string;
    featuredAt?: any;
    featuredBy?: string;
}

interface CuratedDoc {
    id: string;
    title: string;
    credit?: string;
    category: Category;
    storagePath: string;
    publishedAt?: any;
    uploadedBy?: string;
}

interface MemberLite {
    uid: string;
    displayName?: string;
    email?: string;
}

interface Props {
    user: User;
    onPendingCountChange?: (n: number) => void;
}

type SubTab = 'PENDING' | 'FEATURED' | 'ALL' | 'CURATED';

const MAX_BYTES = 200 * 1024 * 1024;

function fmtDate(v: any): string {
    if (!v) return '—';
    const ms = typeof v.seconds === 'number' ? v.seconds * 1000 : (typeof v.toMillis === 'function' ? v.toMillis() : null);
    if (!ms) return '—';
    return new Date(ms).toLocaleDateString();
}

function newVideoId(): string {
    const buf = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 256);
    const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < buf.length; i++) s += alpha[buf[i] % alpha.length];
    return s + Date.now().toString(36).slice(-4);
}

export const InspirosphereSection: React.FC<Props> = ({ user, onPendingCountChange }) => {
    const [subtab, setSubtab] = useState<SubTab>('PENDING');
    const [allVideos, setAllVideos] = useState<UserVideo[]>([]);
    const [featured, setFeatured] = useState<FeaturedDoc[]>([]);
    const [curated, setCurated] = useState<CuratedDoc[]>([]);
    const [members, setMembers] = useState<Record<string, MemberLite>>({});
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);

    // ── Live data ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!db) return;
        // collectionGroup over every member's videos subcollection. Sorting
        // by createdAt happens client-side to avoid forcing a composite
        // index for first launch.
        const unsubAll = onSnapshot(collectionGroup(db, 'videos'), snap => {
            const rows: UserVideo[] = [];
            snap.forEach(d => {
                const data = d.data() as UserVideo;
                if (data?.id) rows.push(data);
            });
            rows.sort((a, b) =>
                (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0),
            );
            setAllVideos(rows);
        }, e => setError(String(e?.message ?? e)));

        const unsubFeatured = onSnapshot(
            query(collection(db, 'inspirosphereFeatured'), orderBy('featuredAt', 'desc')),
            snap => setFeatured(snap.docs.map(d => d.data() as FeaturedDoc)),
            () => { /* empty collection ok */ },
        );

        const unsubCurated = onSnapshot(
            query(collection(db, 'inspirosphereCurated'), orderBy('publishedAt', 'desc')),
            snap => setCurated(snap.docs.map(d => d.data() as CuratedDoc)),
            () => {},
        );

        return () => { unsubAll(); unsubFeatured(); unsubCurated(); };
    }, []);

    // Resolve owner display names for the pending queue. Lazy + cached.
    useEffect(() => {
        if (!db) return;
        const needed = new Set<string>();
        for (const v of allVideos) if (v.ownerUid && !members[v.ownerUid]) needed.add(v.ownerUid);
        if (needed.size === 0) return;
        let cancelled = false;
        (async () => {
            const next: Record<string, MemberLite> = {};
            for (const uid of needed) {
                try {
                    const snap = await getDoc(doc(db!, 'members', uid));
                    if (snap.exists()) {
                        const m = snap.data() as any;
                        next[uid] = { uid, displayName: m.displayName, email: m.email };
                    } else {
                        next[uid] = { uid };
                    }
                } catch {}
            }
            if (!cancelled) setMembers(prev => ({ ...prev, ...next }));
        })();
        return () => { cancelled = true; };
    }, [allVideos, members]);

    // Pending count → sidebar badge.
    const pending = useMemo(() => allVideos.filter(v => v.featureStatus === 'pending'), [allVideos]);
    useEffect(() => { onPendingCountChange?.(pending.length); }, [pending.length, onPendingCountChange]);

    // Resolve Storage URLs lazily for whatever is visible in the current
    // sub-tab, so previews don't all fetch up-front.
    const visiblePaths: { id: string; storagePath: string }[] = useMemo(() => {
        if (subtab === 'PENDING')  return pending.map(v => ({ id: v.id, storagePath: v.storagePath }));
        if (subtab === 'FEATURED') return featured.map(v => ({ id: v.id, storagePath: v.storagePath }));
        if (subtab === 'CURATED')  return curated.map(v => ({ id: v.id, storagePath: v.storagePath }));
        return allVideos.map(v => ({ id: v.id, storagePath: v.storagePath }));
    }, [subtab, pending, featured, curated, allVideos]);

    useEffect(() => {
        if (!storage) return;
        const missing = visiblePaths.filter(p => p.storagePath && !urls[p.id]);
        if (missing.length === 0) return;
        let cancelled = false;
        (async () => {
            const next: Record<string, string> = {};
            for (const p of missing) {
                try {
                    const url = await getDownloadURL(storageRef(storage!, p.storagePath));
                    next[p.id] = url;
                } catch {}
            }
            if (!cancelled && Object.keys(next).length) setUrls(prev => ({ ...prev, ...next }));
        })();
        return () => { cancelled = true; };
    }, [visiblePaths, urls]);

    // ── Actions ─────────────────────────────────────────────────────────
    const approve = async (v: UserVideo) => {
        if (!db) return;
        try {
            const member = members[v.ownerUid] ?? null;
            // 1) Write the denormalized featured doc.
            await setDoc(doc(db, 'inspirosphereFeatured', v.id), {
                id: v.id,
                ownerUid: v.ownerUid,
                title: v.title,
                ownerDisplayName: member?.displayName ?? null,
                category: v.category,
                storagePath: v.storagePath,
                featuredAt: serverTimestamp(),
                featuredBy: user.email ?? user.uid,
            });
            // 2) Flip the source video's status.
            await updateDoc(doc(db, 'members', v.ownerUid, 'videos', v.id), {
                featureStatus: 'featured',
                reviewedAt: serverTimestamp(),
                reviewedBy: user.email ?? user.uid,
                rejectionReason: null,
            });
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    const reject = async (v: UserVideo) => {
        if (!db) return;
        const reason = window.prompt('Optional rejection note (visible to the creator):', '');
        try {
            await updateDoc(doc(db, 'members', v.ownerUid, 'videos', v.id), {
                featureStatus: 'rejected',
                reviewedAt: serverTimestamp(),
                reviewedBy: user.email ?? user.uid,
                rejectionReason: reason ?? null,
            });
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    const unfeature = async (f: FeaturedDoc) => {
        if (!db) return;
        const ok = window.confirm(`Unfeature "${f.title}"? It will disappear from the Voices tab.`);
        if (!ok) return;
        try {
            await deleteDoc(doc(db, 'inspirosphereFeatured', f.id));
            await updateDoc(doc(db, 'members', f.ownerUid, 'videos', f.id), {
                featureStatus: 'none',
                reviewedAt: serverTimestamp(),
                reviewedBy: user.email ?? user.uid,
            }).catch(() => { /* source may have been deleted by the creator */ });
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    // ── Curated upload form ────────────────────────────────────────────
    const [curatedDraft, setCuratedDraft] = useState<{
        file: File; title: string; credit: string; category: Category; progress: number; task?: any;
    } | null>(null);
    const curatedInputRef = useRef<HTMLInputElement | null>(null);

    const startCuratedUpload = () => {
        if (!curatedDraft || !storage || !db) return;
        const id = newVideoId();
        const ext = (curatedDraft.file.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `inspirosphere/curated/${id}.${ext}`;
        const task = uploadBytesResumable(storageRef(storage!, path), curatedDraft.file, {
            contentType: curatedDraft.file.type || 'video/mp4',
        });
        setCuratedDraft(d => d ? { ...d, task } : d);
        task.on('state_changed',
            snap => {
                const p = snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0;
                setCuratedDraft(d => d ? { ...d, progress: p } : d);
            },
            err => setError(String((err as any)?.message ?? err)),
            async () => {
                try {
                    await setDoc(doc(db!, 'inspirosphereCurated', id), {
                        id,
                        title: curatedDraft.title.trim() || 'Untitled',
                        credit: curatedDraft.credit.trim() || null,
                        category: curatedDraft.category,
                        storagePath: path,
                        publishedAt: serverTimestamp(),
                        uploadedBy: user.email ?? user.uid,
                    });
                    setCuratedDraft(null);
                } catch (e) {
                    setError(String((e as any)?.message ?? e));
                }
            },
        );
    };

    const deleteCurated = async (c: CuratedDoc) => {
        if (!db || !storage) return;
        const ok = window.confirm(`Delete curated video "${c.title}"?`);
        if (!ok) return;
        try { await deleteObject(storageRef(storage!, c.storagePath)); } catch {}
        try { await deleteDoc(doc(db!, 'inspirosphereCurated', c.id)); }
        catch (e) { setError(String((e as any)?.message ?? e)); }
    };

    // ── Render ──────────────────────────────────────────────────────────
    const subnav: { id: SubTab; label: string; count: number }[] = [
        { id: 'PENDING',  label: 'En attente', count: pending.length },
        { id: 'FEATURED', label: 'En vedette · Voix', count: featured.length },
        { id: 'ALL',      label: 'Toutes les vidéos', count: allVideos.length },
        { id: 'CURATED',  label: 'Curaté · Featured', count: curated.length },
    ];

    return (
        <div>
            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
                {subnav.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setSubtab(s.id)}
                        className={`px-4 py-2 text-[10px] font-cinzel uppercase tracking-[0.3em] rounded-full border transition-colors ${subtab === s.id ? 'border-[#c5a059]/60 text-[#f3e5ab] bg-[#c5a059]/10' : 'border-white/15 text-neutral-400 hover:text-white hover:border-white/40'}`}
                    >
                        {s.label}
                        <span className="ml-2 text-[9px] opacity-70 font-mono tabular-nums">{s.count}</span>
                    </button>
                ))}
            </div>

            {error && (
                <p className="text-[10px] text-rose-300 mb-3 font-mono">{error}</p>
            )}

            {/* ── Pending queue ── */}
            {subtab === 'PENDING' && (
                <div className="space-y-4">
                    {pending.length === 0 && (
                        <p className="text-sm text-neutral-500 italic font-lato py-6 text-center">
                            Aucune demande en attente.
                        </p>
                    )}
                    {pending.map(v => {
                        const m = members[v.ownerUid];
                        return (
                            <div key={v.id} className="border border-white/10 bg-[#0a0a0a] p-4 rounded">
                                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
                                    <div className="aspect-video bg-black border border-white/10">
                                        {urls[v.id] ? (
                                            <video src={urls[v.id]} controls preload="metadata" className="w-full h-full object-contain bg-black" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-neutral-700 text-[10px]">Loading…</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-cinzel text-white text-base">{v.title}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">
                                            {v.category} · {m?.displayName || m?.email || v.ownerUid.slice(0, 6) + '…'}
                                        </p>
                                        <p className="text-[10px] text-neutral-600 mt-1 font-mono">
                                            requested {fmtDate(v.requestedAt)} · views {v.viewCount ?? 0}
                                        </p>
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => approve(v)}
                                                className="px-4 py-2 bg-emerald-700/30 border border-emerald-600/40 text-emerald-200 hover:bg-emerald-700/50 text-[10px] font-cinzel uppercase tracking-widest rounded transition-colors"
                                            >✓ Publier</button>
                                            <button
                                                onClick={() => reject(v)}
                                                className="px-4 py-2 border border-rose-500/40 text-rose-200 hover:bg-rose-500/10 text-[10px] font-cinzel uppercase tracking-widest rounded transition-colors"
                                            >✕ Refuser</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Featured (Voices) ── */}
            {subtab === 'FEATURED' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {featured.length === 0 && (
                        <p className="text-sm text-neutral-500 italic font-lato py-6 text-center md:col-span-2">
                            Aucune vidéo en vedette pour l'instant.
                        </p>
                    )}
                    {featured.map(f => (
                        <div key={f.id} className="border border-white/10 bg-[#0a0a0a] p-3 rounded">
                            <div className="aspect-video bg-black border border-white/10 mb-3">
                                {urls[f.id] ? (
                                    <video src={urls[f.id]} controls preload="metadata" className="w-full h-full object-contain bg-black" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-neutral-700 text-[10px]">Loading…</div>
                                )}
                            </div>
                            <p className="font-cinzel text-white text-sm">{f.title}</p>
                            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">
                                {f.category} · {f.ownerDisplayName ?? f.ownerUid.slice(0, 6) + '…'}
                            </p>
                            <button
                                onClick={() => unfeature(f)}
                                className="mt-3 px-3 py-1.5 border border-white/15 text-neutral-300 hover:bg-white/5 text-[10px] font-cinzel uppercase tracking-widest rounded"
                            >
                                Retirer
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ── All UGC ── */}
            {subtab === 'ALL' && (
                <div className="border border-white/10 bg-[#0a0a0a] overflow-x-auto rounded">
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-[9px] uppercase tracking-widest text-neutral-500 border-b border-white/5 font-cinzel min-w-[800px]">
                        <span>Titre</span>
                        <span>Auteur·rice</span>
                        <span>Catégorie</span>
                        <span>Statut</span>
                        <span className="text-right">Vues</span>
                    </div>
                    {allVideos.map(v => {
                        const m = members[v.ownerUid];
                        return (
                            <div key={v.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] text-xs min-w-[800px]">
                                <span className="text-white truncate font-lato">{v.title}</span>
                                <span className="text-neutral-400 truncate font-lato">{m?.displayName ?? m?.email ?? v.ownerUid.slice(0, 6) + '…'}</span>
                                <span className="text-neutral-500 font-mono uppercase text-[10px]">{v.category}</span>
                                <span className={`text-[10px] uppercase font-cinzel tracking-widest ${v.featureStatus === 'featured' ? 'text-emerald-300' : v.featureStatus === 'pending' ? 'text-amber-300' : v.featureStatus === 'rejected' ? 'text-rose-300' : 'text-neutral-500'}`}>
                                    {v.featureStatus}
                                </span>
                                <span className="text-neutral-300 font-mono tabular-nums text-right">{v.viewCount ?? 0}</span>
                            </div>
                        );
                    })}
                    {allVideos.length === 0 && (
                        <div className="px-4 py-8 text-center text-neutral-600 text-xs font-lato">
                            Aucune vidéo téléversée par les membres pour l'instant.
                        </div>
                    )}
                </div>
            )}

            {/* ── Curated uploads (Featured tab feed) ── */}
            {subtab === 'CURATED' && (
                <div>
                    <input
                        ref={curatedInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > MAX_BYTES) {
                                setError(`Max 200MB. File is ${Math.round(f.size / 1024 / 1024)}MB.`);
                                e.target.value = '';
                                return;
                            }
                            setCuratedDraft({
                                file: f,
                                title: f.name.replace(/\.[^.]+$/, '').slice(0, 80),
                                credit: '',
                                category: 'GENERAL',
                                progress: 0,
                            });
                            e.target.value = '';
                        }}
                    />

                    {!curatedDraft ? (
                        <button
                            onClick={() => curatedInputRef.current?.click()}
                            className="w-full mb-5 py-4 border border-dashed border-white/15 hover:border-white/40 text-neutral-300 hover:text-white font-cinzel text-[11px] uppercase tracking-[0.3em] rounded transition-colors"
                        >
                            + Téléverser une vidéo (Featured tab)
                        </button>
                    ) : (
                        <div className="border border-white/15 bg-[#0a0a0a] p-4 mb-5 rounded">
                            <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">Nouveau téléversement</p>
                            <p className="text-xs text-neutral-300 mb-3 truncate font-mono">{curatedDraft.file.name} · {Math.round(curatedDraft.file.size / 1024 / 1024)} MB</p>
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Titre</label>
                            <input
                                value={curatedDraft.title}
                                onChange={e => setCuratedDraft(d => d ? { ...d, title: e.target.value } : d)}
                                disabled={!!curatedDraft.task}
                                className="w-full px-3 py-2 mb-3 bg-black/60 border border-white/10 text-white text-sm font-lato focus:outline-none focus:border-white/40 disabled:opacity-50"
                            />
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Crédit (optionnel)</label>
                            <input
                                value={curatedDraft.credit}
                                onChange={e => setCuratedDraft(d => d ? { ...d, credit: e.target.value } : d)}
                                disabled={!!curatedDraft.task}
                                className="w-full px-3 py-2 mb-3 bg-black/60 border border-white/10 text-white text-sm font-lato focus:outline-none focus:border-white/40 disabled:opacity-50"
                            />
                            <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Catégorie</label>
                            <select
                                value={curatedDraft.category}
                                onChange={e => setCuratedDraft(d => d ? { ...d, category: e.target.value as Category } : d)}
                                disabled={!!curatedDraft.task}
                                className="w-full px-3 py-2 mb-3 bg-black/60 border border-white/10 text-white text-sm font-lato focus:outline-none focus:border-white/40 disabled:opacity-50"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>

                            {curatedDraft.task && (
                                <div className="mb-3">
                                    <div className="flex justify-between text-[10px] text-neutral-500 mb-1 font-mono tabular-nums">
                                        <span>Téléversement…</span>
                                        <span>{Math.round(curatedDraft.progress * 100)}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-black/60 border border-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-yellow-300" style={{ width: `${curatedDraft.progress * 100}%` }} />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {!curatedDraft.task && (
                                    <button
                                        onClick={startCuratedUpload}
                                        className="px-4 py-2 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] rounded transition-colors"
                                    >Publier</button>
                                )}
                                <button
                                    onClick={() => { try { curatedDraft.task?.cancel(); } catch {} setCuratedDraft(null); }}
                                    className="px-4 py-2 border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 font-cinzel text-[10px] uppercase tracking-[0.3em] rounded transition-colors"
                                >Annuler</button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {curated.map(c => (
                            <div key={c.id} className="border border-white/10 bg-[#0a0a0a] p-3 rounded">
                                <div className="aspect-video bg-black border border-white/10 mb-3">
                                    {urls[c.id] ? (
                                        <video src={urls[c.id]} controls preload="metadata" className="w-full h-full object-contain bg-black" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-700 text-[10px]">Loading…</div>
                                    )}
                                </div>
                                <p className="font-cinzel text-white text-sm">{c.title}</p>
                                <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">
                                    {c.category}{c.credit ? ` · ${c.credit}` : ''}
                                </p>
                                <button
                                    onClick={() => deleteCurated(c)}
                                    className="mt-3 px-3 py-1.5 border border-rose-500/30 text-rose-300/80 hover:bg-rose-500/10 hover:text-rose-200 text-[10px] font-cinzel uppercase tracking-widest rounded"
                                >Supprimer</button>
                            </div>
                        ))}
                        {curated.length === 0 && (
                            <p className="text-sm text-neutral-500 italic font-lato py-6 text-center md:col-span-2">
                                Aucune vidéo curatée pour l'instant.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
