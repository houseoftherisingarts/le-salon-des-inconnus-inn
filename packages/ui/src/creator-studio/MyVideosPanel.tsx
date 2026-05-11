import React, { useEffect, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import {
    getFirestore, collection, query, orderBy, onSnapshot,
    doc, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from 'firebase/firestore';
import {
    getStorage, ref as storageRef, uploadBytesResumable,
    getDownloadURL, deleteObject,
} from 'firebase/storage';
import {
    INSPIROSPHERE_CATEGORIES, CATEGORY_LABELS,
    type InspirosphereCategory,
} from './inspirosphereVideos';
import type {
    InspirosphereUserVideo, InspirosphereFeatureStatus,
} from './inspirosphereVideoTypes';

/**
 * MyVideosPanel
 * ─────────────
 * Drop-in panel for the creator's own profile (ArtistHub PROFILE tab). Lists
 * the user's uploaded videos with live updates, accepts new uploads with a
 * progress bar, and lets the user request a video to be featured on the
 * Voices tab of the Inspirosphere.
 *
 * Data flow
 *   • Firestore listener on members/{uid}/videos (ordered by createdAt desc).
 *   • Upload pipeline: putFile → Storage at members/{uid}/videos/{id}.{ext},
 *     then setDoc to members/{uid}/videos/{id} with the storagePath.
 *   • Public profile mirrors the same listener.
 *   • Delete = remove Firestore doc + the Storage object. Both are best-
 *     effort idempotent (catch+continue).
 *
 * What this panel intentionally does NOT do (yet):
 *   • Auto-extract a poster frame. The poster slot is reserved in the
 *     schema; we'll wire frame-grab capture in a follow-up so this round
 *     stays shippable.
 *   • Re-encode. Users upload whatever .mp4/.webm/.mov their phone or
 *     editor produced; the HTML5 video element on PublicProfilePage and the
 *     orb both rely on the browser's codec support.
 */

const MAX_BYTES = 200 * 1024 * 1024;
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'];

interface Props {
    uid: string;
    language: 'EN' | 'FR';
    /** Optional styling hooks passed down from ArtistHub. */
    accentBorder?: string;
    accentBg?: string;
    accentText?: string;
}

interface UploadState {
    file: File;
    title: string;
    category: InspirosphereCategory;
    progress: number;          // 0..1
    error: string | null;
    cancelRequested?: boolean;
    task?: ReturnType<typeof uploadBytesResumable> | null;
}

function extOf(file: File): string {
    const dot = file.name.lastIndexOf('.');
    if (dot === -1) return 'mp4';
    return file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
}

function newVideoId(): string {
    // Short, sortable-ish, URL-safe id. Crockford-ish base32, 11 chars.
    const buf = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 256);
    const alpha = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < buf.length; i++) s += alpha[buf[i] % alpha.length];
    return s + Date.now().toString(36).slice(-4);
}

export const MyVideosPanel: React.FC<Props> = ({
    uid, language,
    accentBorder = 'border-white/15',
    accentBg = 'bg-black/40',
    accentText = 'text-[#c5a059]',
}) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

    const [videos, setVideos] = useState<InspirosphereUserVideo[]>([]);
    const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
    const [upload, setUpload] = useState<UploadState | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Live list of the user's videos. Sorted newest-first so latest upload
    // is the first card the user sees.
    useEffect(() => {
        if (!uid) return;
        const db = getFirestore(getApp());
        const q = query(
            collection(db, 'members', uid, 'videos'),
            orderBy('createdAt', 'desc'),
        );
        const unsub = onSnapshot(q, snap => {
            const rows = snap.docs.map(d => d.data() as InspirosphereUserVideo);
            setVideos(rows);
        }, err => setActionError(String(err?.message ?? err)));
        return () => unsub();
    }, [uid]);

    // Resolve download URLs lazily — only for videos we actually show. The
    // browser caches getDownloadURL behind the scenes, but we still memoize
    // per id to avoid re-issuing the call on every render.
    useEffect(() => {
        const missing = videos.filter(v => v.storagePath && !downloadUrls[v.id]);
        if (missing.length === 0) return;
        const storage = getStorage(getApp());
        let cancelled = false;
        (async () => {
            const additions: Record<string, string> = {};
            for (const v of missing) {
                try {
                    const url = await getDownloadURL(storageRef(storage, v.storagePath));
                    additions[v.id] = url;
                } catch {
                    /* object deleted out from under us — skip */
                }
            }
            if (!cancelled && Object.keys(additions).length) {
                setDownloadUrls(prev => ({ ...prev, ...additions }));
            }
        })();
        return () => { cancelled = true; };
    }, [videos, downloadUrls]);

    // ── Pick a file → seed upload draft ─────────────────────────────────
    const onFilePicked = (file: File) => {
        if (file.size > MAX_BYTES) {
            setActionError(t(
                `Max video size is 200 MB. Your file is ${Math.round(file.size / 1024 / 1024)} MB.`,
                `Taille maximale : 200 Mo. Votre fichier fait ${Math.round(file.size / 1024 / 1024)} Mo.`,
            ));
            return;
        }
        if (file.type && !VIDEO_MIMES.includes(file.type) && !file.type.startsWith('video/')) {
            setActionError(t(
                'Only video files are supported (mp4, webm, mov).',
                'Seuls les fichiers vidéo sont pris en charge (mp4, webm, mov).',
            ));
            return;
        }
        setActionError(null);
        const base = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
        setUpload({
            file,
            title: base || t('Untitled video', 'Vidéo sans titre'),
            category: 'GENERAL',
            progress: 0,
            error: null,
        });
    };

    // ── Commit upload to Storage + Firestore ────────────────────────────
    const submitUpload = async () => {
        if (!upload || !uid) return;
        setActionError(null);
        const id = newVideoId();
        const ext = extOf(upload.file);
        const storagePath = `members/${uid}/videos/${id}.${ext}`;
        const storage = getStorage(getApp());
        const ref = storageRef(storage, storagePath);

        const task = uploadBytesResumable(ref, upload.file, {
            contentType: upload.file.type || 'video/mp4',
        });
        setUpload(u => u ? { ...u, task } : u);

        task.on('state_changed',
            snap => {
                const p = snap.totalBytes > 0 ? snap.bytesTransferred / snap.totalBytes : 0;
                setUpload(u => u ? { ...u, progress: p } : u);
            },
            err => {
                setUpload(u => u ? { ...u, error: String(err?.message ?? err) } : u);
            },
            async () => {
                try {
                    const db = getFirestore(getApp());
                    const docRef = doc(db, 'members', uid, 'videos', id);
                    const payload: Omit<InspirosphereUserVideo, 'createdAt'> & { createdAt: any } = {
                        id,
                        ownerUid: uid,
                        title: upload.title.trim() || t('Untitled video', 'Vidéo sans titre'),
                        category: upload.category,
                        storagePath,
                        featureStatus: 'none',
                        viewCount: 0,
                        createdAt: serverTimestamp(),
                    };
                    await setDoc(docRef, payload);
                    setUpload(null);
                } catch (e) {
                    setUpload(u => u ? { ...u, error: String((e as any)?.message ?? e) } : u);
                }
            },
        );
    };

    const cancelUpload = () => {
        if (!upload) return;
        try { upload.task?.cancel(); } catch {}
        setUpload(null);
    };

    // ── Per-video actions ────────────────────────────────────────────────
    const requestFeature = async (v: InspirosphereUserVideo) => {
        const db = getFirestore(getApp());
        await updateDoc(doc(db, 'members', uid, 'videos', v.id), {
            featureStatus: 'pending' as InspirosphereFeatureStatus,
            requestedAt: serverTimestamp(),
        }).catch(e => setActionError(String((e as any)?.message ?? e)));
    };

    const withdrawRequest = async (v: InspirosphereUserVideo) => {
        const db = getFirestore(getApp());
        await updateDoc(doc(db, 'members', uid, 'videos', v.id), {
            featureStatus: 'none' as InspirosphereFeatureStatus,
        }).catch(e => setActionError(String((e as any)?.message ?? e)));
    };

    const renameVideo = async (v: InspirosphereUserVideo, title: string) => {
        const db = getFirestore(getApp());
        await updateDoc(doc(db, 'members', uid, 'videos', v.id), {
            title: title.trim() || v.title,
            updatedAt: serverTimestamp(),
        }).catch(e => setActionError(String((e as any)?.message ?? e)));
    };

    const recategorize = async (v: InspirosphereUserVideo, category: InspirosphereCategory) => {
        const db = getFirestore(getApp());
        await updateDoc(doc(db, 'members', uid, 'videos', v.id), {
            category,
            updatedAt: serverTimestamp(),
        }).catch(e => setActionError(String((e as any)?.message ?? e)));
    };

    const deleteVideo = async (v: InspirosphereUserVideo) => {
        const ok = window.confirm(t(
            'Delete this video? This cannot be undone.',
            'Supprimer cette vidéo ? Cette action est irréversible.',
        ));
        if (!ok) return;
        const db = getFirestore(getApp());
        const storage = getStorage(getApp());
        try { await deleteObject(storageRef(storage, v.storagePath)); } catch { /* gone already */ }
        try { await deleteDoc(doc(db, 'members', uid, 'videos', v.id)); }
        catch (e) { setActionError(String((e as any)?.message ?? e)); }
    };

    // ── Render ──────────────────────────────────────────────────────────
    return (
        <div className={`p-6 border ${accentBorder} ${accentBg} rounded-xl`}>
            <div className="flex justify-between items-baseline mb-4">
                <h3 className="font-cinzel text-white text-lg">
                    {t('My videos', 'Mes vidéos')}
                </h3>
                <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">
                    {videos.length} {t('total', 'au total')}
                </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed mb-4">
                {t(
                    'Your videos are visible on your public profile. Request a feature and we may showcase yours on the Voices tab of the Inspirosphere.',
                    'Vos vidéos apparaissent sur votre profil public. Faites une demande de mise en avant pour figurer dans l\'onglet Voix de l\'Inspirosphère.',
                )}
            </p>

            {/* Hidden file picker + the upload button. */}
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFilePicked(f);
                    e.target.value = '';
                }}
            />

            {!upload && (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full mb-4 py-4 border border-dashed ${accentBorder} hover:border-white/40 text-neutral-300 hover:text-white font-cinzel text-[11px] uppercase tracking-[0.3em] rounded-md transition-colors`}
                >
                    + {t('Upload a video', 'Téléverser une vidéo')}
                    <span className="block mt-1 text-[9px] text-neutral-500 tracking-widest normal-case">
                        {t('mp4, webm, mov · up to 200 MB', 'mp4, webm, mov · jusqu\'à 200 Mo')}
                    </span>
                </button>
            )}

            {/* Upload-in-progress card */}
            {upload && (
                <div className={`mb-4 p-4 border ${accentBorder} bg-black/50 rounded-md`}>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">
                        {t('New upload', 'Nouveau téléversement')}
                    </p>
                    <p className="text-xs text-neutral-300 mb-3 truncate font-mono">
                        {upload.file.name} · {Math.round(upload.file.size / 1024 / 1024)} MB
                    </p>

                    <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                        {t('Title', 'Titre')}
                    </label>
                    <input
                        type="text"
                        value={upload.title}
                        onChange={e => setUpload(u => u ? { ...u, title: e.target.value } : u)}
                        disabled={!!upload.task}
                        className="w-full px-3 py-2 mb-3 bg-black/60 border border-white/10 text-white text-sm font-lato focus:outline-none focus:border-white/40 disabled:opacity-50"
                        maxLength={120}
                    />

                    <label className="block text-[10px] uppercase tracking-widest text-neutral-500 mb-1">
                        {t('Category', 'Catégorie')}
                    </label>
                    <select
                        value={upload.category}
                        onChange={e => setUpload(u => u ? { ...u, category: e.target.value as InspirosphereCategory } : u)}
                        disabled={!!upload.task}
                        className="w-full px-3 py-2 mb-3 bg-black/60 border border-white/10 text-white text-sm font-lato focus:outline-none focus:border-white/40 disabled:opacity-50"
                    >
                        {INSPIROSPHERE_CATEGORIES.map(c => (
                            <option key={c} value={c}>
                                {language === 'FR' ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en}
                            </option>
                        ))}
                    </select>

                    {upload.task && (
                        <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-neutral-500 mb-1 font-mono tabular-nums">
                                <span>{t('Uploading…', 'Téléversement…')}</span>
                                <span>{Math.round(upload.progress * 100)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-black/60 border border-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-yellow-300 transition-[width] duration-200"
                                    style={{ width: `${upload.progress * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {upload.error && (
                        <p className="text-[10px] text-rose-300 mb-2 font-mono">{upload.error}</p>
                    )}

                    <div className="flex gap-2">
                        {!upload.task && (
                            <button
                                onClick={submitUpload}
                                className="px-4 py-2 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] rounded transition-colors"
                            >
                                {t('Start upload', 'Téléverser')}
                            </button>
                        )}
                        <button
                            onClick={cancelUpload}
                            className="px-4 py-2 border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 font-cinzel text-[10px] uppercase tracking-[0.3em] rounded transition-colors"
                        >
                            {t('Cancel', 'Annuler')}
                        </button>
                    </div>
                </div>
            )}

            {actionError && (
                <p className="text-[10px] text-rose-300 mb-3 font-mono">{actionError}</p>
            )}

            {/* Existing videos */}
            {videos.length === 0 && !upload && (
                <p className="text-sm text-neutral-500 italic font-lato py-6 text-center">
                    {t('No videos uploaded yet.', 'Aucune vidéo téléversée pour l\'instant.')}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {videos.map(v => (
                    <VideoCard
                        key={v.id}
                        video={v}
                        url={downloadUrls[v.id]}
                        language={language}
                        accentBorder={accentBorder}
                        accentText={accentText}
                        onRequestFeature={() => requestFeature(v)}
                        onWithdrawRequest={() => withdrawRequest(v)}
                        onRename={(title) => renameVideo(v, title)}
                        onRecategorize={(cat) => recategorize(v, cat)}
                        onDelete={() => deleteVideo(v)}
                    />
                ))}
            </div>
        </div>
    );
};

// ─── Per-video card ─────────────────────────────────────────────────────

interface CardProps {
    video: InspirosphereUserVideo;
    url: string | undefined;
    language: 'EN' | 'FR';
    accentBorder: string;
    accentText: string;
    onRequestFeature: () => void;
    onWithdrawRequest: () => void;
    onRename: (title: string) => void;
    onRecategorize: (cat: InspirosphereCategory) => void;
    onDelete: () => void;
}

const VideoCard: React.FC<CardProps> = ({
    video, url, language, accentBorder, accentText,
    onRequestFeature, onWithdrawRequest, onRename, onRecategorize, onDelete,
}) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const [editingTitle, setEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(video.title);

    const statusLabel: Record<InspirosphereFeatureStatus, { en: string; fr: string; cls: string }> = {
        none:     { en: 'Private to profile', fr: 'Sur votre profil',     cls: 'text-neutral-400' },
        pending:  { en: 'Review pending',     fr: 'En attente d\'examen', cls: 'text-amber-300' },
        featured: { en: 'Featured · Voices',  fr: 'Mis·e en avant · Voix', cls: 'text-emerald-300' },
        rejected: { en: 'Not featured',       fr: 'Non retenu',           cls: 'text-rose-300' },
    };
    const status = statusLabel[video.featureStatus];

    return (
        <div className={`border ${accentBorder} bg-black/40 rounded-md overflow-hidden flex flex-col`}>
            <div className="aspect-video bg-black relative">
                {url ? (
                    <video src={url} controls preload="metadata" className="w-full h-full object-contain bg-black" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600 text-[10px] font-cinzel uppercase tracking-widest">
                        {t('Loading…', 'Chargement…')}
                    </div>
                )}
            </div>
            <div className="p-3 flex-1 flex flex-col gap-2">
                {editingTitle ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={titleDraft}
                            onChange={e => setTitleDraft(e.target.value)}
                            className="flex-1 px-2 py-1 bg-black/60 border border-white/15 text-white text-sm font-lato focus:outline-none focus:border-white/40"
                            maxLength={120}
                            autoFocus
                        />
                        <button
                            onClick={() => { onRename(titleDraft); setEditingTitle(false); }}
                            className="px-2 py-1 text-[10px] font-cinzel uppercase tracking-widest bg-emerald-600/20 border border-emerald-400/40 text-emerald-200 rounded"
                        >✓</button>
                        <button
                            onClick={() => { setTitleDraft(video.title); setEditingTitle(false); }}
                            className="px-2 py-1 text-[10px] font-cinzel uppercase tracking-widest border border-white/15 text-neutral-400 rounded"
                        >✕</button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditingTitle(true)}
                        className="text-left text-sm font-cinzel text-white hover:text-[#f3e5ab] truncate"
                        title={t('Rename', 'Renommer')}
                    >
                        {video.title}
                    </button>
                )}

                <div className="flex flex-wrap items-center gap-2 text-[10px] font-cinzel uppercase tracking-widest">
                    <select
                        value={video.category}
                        onChange={e => onRecategorize(e.target.value as InspirosphereCategory)}
                        className={`bg-black/60 border ${accentBorder} text-neutral-300 px-2 py-1 rounded text-[10px] font-cinzel uppercase tracking-widest focus:outline-none focus:border-white/40`}
                    >
                        {INSPIROSPHERE_CATEGORIES.map(c => (
                            <option key={c} value={c}>
                                {language === 'FR' ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en}
                            </option>
                        ))}
                    </select>
                    <span className={`${status.cls}`}>· {t(status.en, status.fr)}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                    {video.featureStatus === 'none' && (
                        <button
                            onClick={onRequestFeature}
                            className="px-3 py-1 text-[10px] font-cinzel uppercase tracking-widest border border-fuchsia-400/40 text-fuchsia-200 hover:bg-fuchsia-500/10 rounded transition-colors"
                        >
                            ★ {t('Request feature', 'Demander mise en avant')}
                        </button>
                    )}
                    {video.featureStatus === 'pending' && (
                        <button
                            onClick={onWithdrawRequest}
                            className="px-3 py-1 text-[10px] font-cinzel uppercase tracking-widest border border-white/15 text-neutral-300 hover:bg-white/5 rounded transition-colors"
                        >
                            {t('Withdraw request', 'Retirer la demande')}
                        </button>
                    )}
                    {video.featureStatus === 'rejected' && (
                        <button
                            onClick={onRequestFeature}
                            className="px-3 py-1 text-[10px] font-cinzel uppercase tracking-widest border border-rose-400/40 text-rose-200 hover:bg-rose-500/10 rounded transition-colors"
                        >
                            {t('Resubmit', 'Soumettre à nouveau')}
                        </button>
                    )}
                    <span className="flex-1" />
                    <button
                        onClick={onDelete}
                        className="px-3 py-1 text-[10px] font-cinzel uppercase tracking-widest border border-rose-500/30 text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-200 rounded transition-colors"
                    >
                        {t('Delete', 'Supprimer')}
                    </button>
                </div>
                {video.featureStatus === 'rejected' && video.rejectionReason && (
                    <p className="text-[10px] text-rose-300/80 italic mt-1 font-lato">
                        {video.rejectionReason}
                    </p>
                )}
            </div>
        </div>
    );
};
