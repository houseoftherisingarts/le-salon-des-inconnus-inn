import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { getApp } from 'firebase/app';
import {
    getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, increment,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import {
    INSPIROSPHERE_VIDEOS,
    INSPIROSPHERE_CATEGORIES,
    CATEGORY_LABELS,
    type InspirosphereCategory,
    type InspirosphereVideo,
} from './inspirosphereVideos';
import { INSPIROSPHERE_CITATIONS } from './inspirosphereCitations';
import type {
    InspirosphereCuratedVideo, InspirosphereFeaturedVideo,
} from './inspirosphereVideoTypes';

// ─── Unified orb item shape ───────────────────────────────────────────────
// The orb consumes one type regardless of source. WEB entries (the static
// seed catalog) flow through YouTube/Facebook embeds; FIREBASE entries
// (admin-curated + approved UGC) play via HTML5 <video> from Storage;
// CITATION entries are typeset text rendered inside the orb — no player.
// The `ownerUid` is only attached to FIREBASE entries from a member's
// profile (Voices tab) — that's what powers the view-count ping back to
// members/{ownerUid}/videos/{id}.
type OrbSource =
    | { kind: 'WEB';      url: string }
    | { kind: 'FIREBASE'; storagePath: string; ownerUid?: string }
    | { kind: 'CITATION'; text: string };

interface OrbVideo {
    id: string;
    title: string;
    credit?: string;
    category: InspirosphereCategory;
    source: OrbSource;
}

type OrbTab = 'DISCOVERED' | 'FEATURED' | 'VOICES' | 'CITATIONS';

const TAB_LABELS: Record<OrbTab, { en: string; fr: string }> = {
    DISCOVERED: { en: 'Discovered', fr: 'Découvert' },
    FEATURED:   { en: 'Featured',   fr: 'En vedette' },
    VOICES:     { en: 'Voices',     fr: 'Voix' },
    CITATIONS:  { en: 'Citations',  fr: 'Citations' },
};

const STATIC_AS_ORB: OrbVideo[] = INSPIROSPHERE_VIDEOS.map(v => ({
    id: v.id, title: v.title, credit: v.credit, category: v.category,
    source: { kind: 'WEB', url: v.url },
}));

const CITATIONS_AS_ORB: OrbVideo[] = INSPIROSPHERE_CITATIONS.map(c => ({
    id: c.id, title: c.text, category: c.category,
    source: { kind: 'CITATION', text: c.text },
}));

/**
 * Inspirosphere
 * ─────────────
 * The orb (top half) streams a single video at random; the controls (bottom
 * half) hold Zap, Conscious Mode, the category filter, and the by-category
 * browser. Same top/bottom split as the other Creator Studio elements —
 * the orb portals into the StudioContextViewer's TOOLS body via the
 * `#inspirosphere-orb-slot` mount point, so the viewer chrome (header,
 * resize handle, aurora) stays consistent with other tabs. Falls back to
 * inline rendering when the slot is absent.
 *
 * Two modes:
 *   • ORB     — fullscreen single video inside the orb. "Zap" = pick a new
 *                 random video (filtered by category if one is active).
 *   • CONSCIOUS — grid of all videos by category; clicking one slots it into
 *                 the orb and returns to ORB mode.
 */

interface InspirosphereProps {
    onClose: () => void;
    language: 'EN' | 'FR';
    formStyles: {
        container: string; input: string; label: string;
        submitOn: string; submitOff: string;
        chipActive: string; chipInactive: string; accentText: string;
    };
    pageTitleClass: string;
}

// ─── Embed helpers ────────────────────────────────────────────────────────
/** Convert a source URL into a safe embed URL. Returns null if unrecognized. */
function getEmbedUrl(url: string): string | null {
    // YouTube — watch / shorts / youtu.be / embed
    let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/);
    if (m) {
        return `https://www.youtube.com/embed/${m[1]}?autoplay=1&mute=1&controls=1&playsinline=1&rel=0&modestbranding=1`;
    }
    m = url.match(/youtube\.com\/embed\/([\w-]+)/);
    if (m) {
        const sep = url.includes('?') ? '&' : '?';
        if (url.includes('autoplay')) return url;
        return `${url}${sep}autoplay=1&mute=1&playsinline=1`;
    }
    // Facebook video / reel / share / fb.watch
    if (/facebook\.com|fb\.watch/.test(url)) {
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true&mute=1`;
    }
    return null;
}

/** Pull a YouTube ID for a thumbnail; null when not YouTube. */
function getYouTubeId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]+)/);
    return m?.[1] ?? null;
}

// ─── Component ────────────────────────────────────────────────────────────
type Mode = 'ORB' | 'CONSCIOUS';

export const Inspirosphere: React.FC<InspirosphereProps> = ({
    onClose, language, formStyles, pageTitleClass,
}) => {
    const t = useCallback((en: string, fr: string) => (language === 'FR' ? fr : en), [language]);
    const [mode, setMode] = useState<Mode>('ORB');
    // Active source tab. DISCOVERED = the static seed catalog (web links);
    // FEATURED = admin uploads at /inspirosphereCurated; VOICES = approved
    // UGC at /inspirosphereFeatured. Categories + Conscious Mode + Zap all
    // operate on whichever tab is active.
    const [activeTab, setActiveTab] = useState<OrbTab>('DISCOVERED');
    // Active category filter (Conscious Mode browser + zap pool). null = all.
    const [activeCategory, setActiveCategory] = useState<InspirosphereCategory | null>(null);
    // Currently displayed video index in the filtered pool.
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
    // Bumped on every Zap so the iframe key changes → forces a fresh mount,
    // even when (rarely) the same id is rolled twice in a row.
    const [zapKey, setZapKey] = useState(0);

    // Live Firestore pools for the Featured + Voices tabs. Each list is
    // sorted by sortOrder/publishedAt at the rules layer; we keep the
    // Firestore order in state as-is.
    const [featuredPool, setFeaturedPool] = useState<OrbVideo[]>([]);
    const [voicesPool,   setVoicesPool]   = useState<OrbVideo[]>([]);

    // Resolved Storage download URLs keyed by video id, populated lazily
    // for FIREBASE-sourced videos so the orb can play them.
    const [firebaseUrls, setFirebaseUrls] = useState<Record<string, string>>({});

    // Track which UGC videos we've already counted as 'watched' this tab
    // session, so re-pressing play or scrubbing doesn't inflate the count.
    const voicesViewedRef = useRef<Set<string>>(new Set());

    // ── Subscribe to admin-curated + featured (Voices) collections ──────────
    useEffect(() => {
        let db;
        try { db = getFirestore(getApp()); } catch { return; }
        const unsub1 = onSnapshot(
            query(collection(db, 'inspirosphereCurated'), orderBy('publishedAt', 'desc')),
            snap => {
                setFeaturedPool(snap.docs.map(d => {
                    const x = d.data() as InspirosphereCuratedVideo;
                    return {
                        id: x.id, title: x.title, credit: x.credit, category: x.category,
                        source: { kind: 'FIREBASE', storagePath: x.storagePath },
                    } as OrbVideo;
                }));
            },
            () => { /* swallow — empty collection is fine */ },
        );
        const unsub2 = onSnapshot(
            query(collection(db, 'inspirosphereFeatured'), orderBy('featuredAt', 'desc')),
            snap => {
                setVoicesPool(snap.docs.map(d => {
                    const x = d.data() as InspirosphereFeaturedVideo;
                    return {
                        id: x.id, title: x.title, credit: x.ownerDisplayName, category: x.category,
                        source: { kind: 'FIREBASE', storagePath: x.storagePath, ownerUid: x.ownerUid },
                    } as OrbVideo;
                }));
            },
            () => {},
        );
        return () => { unsub1(); unsub2(); };
    }, []);

    // Unfiltered base pool for the active tab. Kept separate so Conscious
    // Mode's category chips can count from the tab's full catalog instead
    // of the (already category-filtered) `pool` below.
    const baseForTab = useMemo<OrbVideo[]>(() => {
        switch (activeTab) {
            case 'DISCOVERED': return STATIC_AS_ORB;
            case 'FEATURED':   return featuredPool;
            case 'VOICES':     return voicesPool;
            case 'CITATIONS':  return CITATIONS_AS_ORB;
        }
    }, [activeTab, featuredPool, voicesPool]);

    // Pool respecting the active tab + category filter.
    const pool = useMemo<OrbVideo[]>(() => {
        if (!activeCategory) return baseForTab;
        return baseForTab.filter(v => v.category === activeCategory);
    }, [baseForTab, activeCategory]);

    // Resolve Storage download URLs for any FIREBASE entries in the current
    // pool we haven't already fetched. Lazy + cached for the session.
    useEffect(() => {
        const missing = pool.filter(v => v.source.kind === 'FIREBASE' && !firebaseUrls[v.id]);
        if (missing.length === 0) return;
        let cancelled = false;
        let storage;
        try { storage = getStorage(getApp()); } catch { return; }
        (async () => {
            const next: Record<string, string> = {};
            for (const v of missing) {
                if (v.source.kind !== 'FIREBASE') continue;
                try {
                    const url = await getDownloadURL(storageRef(storage!, v.source.storagePath));
                    next[v.id] = url;
                } catch { /* object missing */ }
            }
            if (!cancelled && Object.keys(next).length) {
                setFirebaseUrls(prev => ({ ...prev, ...next }));
            }
        })();
        return () => { cancelled = true; };
    }, [pool, firebaseUrls]);

    /** Pick a random video from the pool, biasing AGAINST repeating the
     *  current one when more than one option exists. */
    const pickRandom = useCallback((avoidId: string | null): OrbVideo | null => {
        if (pool.length === 0) return null;
        if (pool.length === 1) return pool[0];
        let pick = pool[Math.floor(Math.random() * pool.length)];
        // Up to 4 retries to avoid the same one back-to-back.
        for (let i = 0; i < 4 && pick.id === avoidId; i++) {
            pick = pool[Math.floor(Math.random() * pool.length)];
        }
        return pick;
    }, [pool]);

    // Seed on first mount + reseed when the pool changes (tab swap or
    // category swap). The tab dependency is critical: jumping from
    // Discovered → Voices should reseed instead of leaving the previous
    // video orphaned at the top.
    useEffect(() => {
        const next = pickRandom(currentVideoId);
        if (next) {
            setCurrentVideoId(next.id);
            setZapKey(k => k + 1);
        } else {
            // Empty pool (e.g. Voices tab with no approved UGC yet).
            setCurrentVideoId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, activeCategory]);

    // Look up the current video across ALL pools, not just the active one —
    // a Voices video selected in Conscious Mode should still resolve after
    // the user switches tabs (though the orb may then re-zap to the new
    // pool via the effect above).
    const currentVideo = useMemo<OrbVideo | null>(() => {
        if (!currentVideoId) return null;
        const all: OrbVideo[] = [...STATIC_AS_ORB, ...featuredPool, ...voicesPool, ...CITATIONS_AS_ORB];
        return all.find(v => v.id === currentVideoId) ?? null;
    }, [currentVideoId, featuredPool, voicesPool]);

    const zap = useCallback(() => {
        const next = pickRandom(currentVideoId);
        if (next) {
            setCurrentVideoId(next.id);
            setZapKey(k => k + 1);
        }
    }, [pickRandom, currentVideoId]);

    const pickById = useCallback((id: string) => {
        setCurrentVideoId(id);
        setZapKey(k => k + 1);
        // Stay in Conscious Mode after a pick — the user is browsing the
        // grid and likely wants to keep selecting. They close the panel
        // explicitly via the Conscious-mode toggle when they're done.
    }, []);

    // Keep an iframe ref so we could imperatively reload if needed.
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const webUrl = currentVideo && currentVideo.source.kind === 'WEB'
        ? currentVideo.source.url
        : null;
    const embedUrl = webUrl ? getEmbedUrl(webUrl) : null;
    const ytId     = webUrl ? getYouTubeId(webUrl) : null;
    // For FIREBASE-sourced videos we render an HTML5 <video> off the
    // resolved download URL. firebaseUrl stays null for WEB entries.
    const firebaseUrl = currentVideo && currentVideo.source.kind === 'FIREBASE'
        ? firebaseUrls[currentVideo.id] ?? null
        : null;
    const firebaseOwnerUid = currentVideo && currentVideo.source.kind === 'FIREBASE'
        ? currentVideo.source.ownerUid
        : undefined;
    // Citation text — populated only when the active pick is a CITATION
    // entry. Renders as typography in place of the video player.
    const citationText = currentVideo && currentVideo.source.kind === 'CITATION'
        ? currentVideo.source.text
        : null;

    // ── YouTube IFrame Player API integration ──────────────────────────────
    // For YouTube videos we use the IFrame Player API so we can:
    //   • hide YouTube's native controls (the orb crops the iframe and the
    //     controls would be partially hidden);
    //   • drive our own play/pause/timeline/mute/fullscreen UI in the
    //     control bar;
    //   • autoplay with sound when the user opens the orb (the click that
    //     opened the Inspirosphere counts as user activation, so most
    //     browsers permit unmuted autoplay).
    // Non-YouTube URLs (Facebook etc.) fall back to a plain iframe with
    // whatever controls the source provides.
    const playerContainerRef = useRef<HTMLDivElement | null>(null);
    const ytPlayerRef = useRef<any>(null);
    const orbShellRef = useRef<HTMLDivElement | null>(null);
    const [ytApiReady, setYtApiReady] = useState<boolean>(() =>
        typeof window !== 'undefined' && !!(window as any).YT?.Player,
    );
    const [playerReady, setPlayerReady] = useState(false);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [muted, setMuted] = useState(false);

    // Load the YouTube IFrame API script exactly once per session. Idempotent:
    // multiple Inspirospheres opened in a row share the same global YT.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if ((window as any).YT?.Player) { setYtApiReady(true); return; }
        const prev = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
            if (typeof prev === 'function') prev();
            setYtApiReady(true);
        };
        if (!document.getElementById('youtube-iframe-api')) {
            const s = document.createElement('script');
            s.id = 'youtube-iframe-api';
            s.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(s);
        }
    }, []);

    // Create the YT.Player once the API + container are ready and we're on a
    // YouTube source. Subsequent video swaps go through loadVideoById so we
    // don't tear down + rebuild the iframe on every zap.
    useEffect(() => {
        if (!ytApiReady || !ytId || !playerContainerRef.current) return;
        if (ytPlayerRef.current) return;
        const YT = (window as any).YT;
        ytPlayerRef.current = new YT.Player(playerContainerRef.current, {
            videoId: ytId,
            width: '100%',
            height: '100%',
            playerVars: {
                autoplay: 1,
                mute: 0,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                iv_load_policy: 3,
                fs: 0,
                playsinline: 1,
                disablekb: 1,
            },
            events: {
                onReady: (e: any) => {
                    setPlayerReady(true);
                    try {
                        e.target.unMute();
                        e.target.setVolume(80);
                        setMuted(false);
                        setDuration(e.target.getDuration() || 0);
                        e.target.playVideo();
                    } catch {}
                },
                onStateChange: (e: any) => {
                    // YT.PlayerState: -1 unstarted, 0 ended, 1 playing,
                    //                 2 paused, 3 buffering, 5 cued.
                    setPlaying(e.data === 1);
                    if (e.data === 1 || e.data === 2 || e.data === 3) {
                        try { setDuration(e.target.getDuration() || 0); } catch {}
                    }
                    try { setMuted(e.target.isMuted()); } catch {}
                },
            },
        });
        return () => {
            if (ytPlayerRef.current) {
                try { ytPlayerRef.current.destroy(); } catch {}
                ytPlayerRef.current = null;
                setPlayerReady(false);
                setPlaying(false);
                setCurrentTime(0);
                setDuration(0);
            }
        };
        // We intentionally don't depend on ytId here — we create the player
        // once and then swap videos via loadVideoById below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ytApiReady, !!ytId]);

    // Swap the loaded video whenever the current pick changes (Zap, category
    // change, or Conscious-mode click). zapKey forces a reload even if the
    // same id is re-selected.
    useEffect(() => {
        if (!playerReady || !ytId || !ytPlayerRef.current) return;
        try {
            ytPlayerRef.current.loadVideoById(ytId);
            ytPlayerRef.current.unMute();
            ytPlayerRef.current.setVolume(80);
            setMuted(false);
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ytId, zapKey, playerReady]);

    // Poll currentTime / duration for the scrubber. Lightweight; 500ms is
    // plenty since the timeline is small and humans don't perceive sub-second
    // jumps in this context.
    useEffect(() => {
        if (!playerReady) return;
        const id = setInterval(() => {
            const p = ytPlayerRef.current;
            if (!p) return;
            try {
                setCurrentTime(p.getCurrentTime?.() || 0);
                const d = p.getDuration?.() || 0;
                if (d) setDuration(d);
            } catch {}
        }, 500);
        return () => clearInterval(id);
    }, [playerReady]);

    // Control handlers — all guard for player presence + try/catch since the
    // YT API throws when the iframe is between mount states.
    const togglePlay = useCallback(() => {
        const p = ytPlayerRef.current;
        if (!p) return;
        try {
            if (playing) p.pauseVideo();
            else { p.unMute(); p.playVideo(); setMuted(false); }
        } catch {}
    }, [playing]);

    const toggleMute = useCallback(() => {
        const p = ytPlayerRef.current;
        if (!p) return;
        try {
            if (p.isMuted()) { p.unMute(); p.setVolume(80); setMuted(false); }
            else { p.mute(); setMuted(true); }
        } catch {}
    }, []);

    const seekTo = useCallback((sec: number) => {
        const p = ytPlayerRef.current;
        if (!p) return;
        try { p.seekTo(sec, true); setCurrentTime(sec); } catch {}
    }, []);

    const goFullscreen = useCallback(() => {
        // Prefer the YT iframe — fullscreen on the orb wrapper would carry
        // the rounded-full clip with it on some browsers.
        const p = ytPlayerRef.current;
        const target: any = p?.getIframe?.() ?? orbShellRef.current;
        if (!target) return;
        const req = target.requestFullscreen
            || target.webkitRequestFullscreen
            || target.mozRequestFullScreen
            || target.msRequestFullscreen;
        if (req) { try { req.call(target); } catch {} }
    }, []);

    const formatTime = (s: number) => {
        if (!isFinite(s) || s < 0) return '0:00';
        const total = Math.floor(s);
        const m = Math.floor(total / 60);
        const sec = total % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // Keyboard shortcuts: Space/Right = zap, C = conscious toggle, Esc =
    // close, K = play/pause, M = mute toggle, F = fullscreen. Lives below
    // the player handlers so deps (togglePlay/toggleMute/goFullscreen) are
    // initialized — JS const-in-deps would otherwise hit the temporal dead
    // zone on first mount.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); zap(); return; }
            if (e.key === 'c' || e.key === 'C') { setMode(m => m === 'ORB' ? 'CONSCIOUS' : 'ORB'); return; }
            if (e.key === 'k' || e.key === 'K') { e.preventDefault(); togglePlay(); return; }
            if (e.key === 'm' || e.key === 'M') { e.preventDefault(); toggleMute(); return; }
            if (e.key === 'f' || e.key === 'F') { e.preventDefault(); goFullscreen(); return; }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [zap, onClose, togglePlay, toggleMute, goFullscreen]);

    // Locate the viewer's orb slot. The slot is rendered by
    // StudioContextViewer when ctx.inspirosphereActive is true; we re-check
    // on every layout pass because the slot can mount/unmount as the user
    // toggles between tools or collapses the viewer. Fallback path: if no
    // slot is found (standalone usage / older shells), the orb renders
    // inline above the controls.
    const [orbSlot, setOrbSlot] = useState<Element | null>(null);
    useLayoutEffect(() => {
        const find = () => setOrbSlot(document.getElementById('inspirosphere-orb-slot'));
        find();
        // The slot may mount one paint after this component (the viewer's
        // body keys on tab, not on inspirosphereActive). Retry once on next
        // animation frame to catch that race.
        const raf = requestAnimationFrame(find);
        return () => cancelAnimationFrame(raf);
    });

    // ── Orb visual (portaled into the viewer when the slot is mounted) ──
    // Stripped of redundant chrome — the viewer header already labels this as
    // INSPIROSPHÈRE, and the YouTube iframe carries its own title. The title +
    // credit get repeated in the controls section below for accessibility.
    const orbVisual = (
        <div className="relative w-full h-full flex items-center justify-center px-2 py-2">
            {/* The orb itself — fills the viewer body's available height
                with an aspect-ratio square so it stays circular as the
                user resizes the viewer. */}
            <div
                className="relative inspirosphere-orb-container w-full h-full flex items-center justify-center"
            >
                {/* Halo glow — single soft cyan→transparent radial, no
                    visible ring boundary. */}
                <div
                    aria-hidden
                    className="absolute rounded-full pointer-events-none inspirosphere-orb-glow"
                    style={{
                        height: '110%',
                        aspectRatio: '1 / 1',
                        maxHeight: 'min(95%, 760px)',
                        maxWidth: '95%',
                        background: 'radial-gradient(circle, rgba(34,211,238,0.32) 0%, rgba(217,70,239,0.18) 35%, rgba(217,70,239,0) 65%)',
                        filter: 'blur(40px)',
                    }}
                />
                <div
                    ref={orbShellRef}
                    className="relative inspirosphere-orb rounded-full overflow-hidden inspirosphere-breathe"
                    style={{
                        height: '100%',
                        aspectRatio: '1 / 1',
                        maxHeight: 'min(100%, 720px)',
                        maxWidth: '100%',
                        background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), rgba(255,255,255,0.04) 55%, rgba(0,0,0,0.4) 100%)',
                        boxShadow: '0 0 60px rgba(34,211,238,0.25), inset 0 0 30px rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                    }}
                >
                    {/* Cover-fit wrapper: a 16:9 box sized so its height equals
                        the orb diameter; the extra width is clipped by the orb
                        shell's overflow-hidden + rounded-full. The video fills
                        the circle instead of letterboxing. */}
                    {citationText ? (
                        // CITATIONS tab — typeset wisdom inside the orb.
                        // No player chrome; the text is the artwork.
                        <div
                            key={`citation-${currentVideoId}-${zapKey}`}
                            className="absolute inset-0 flex items-center justify-center px-[10%] py-[12%] inspirosphere-citation-fade text-center"
                        >
                            <blockquote className="font-cinzel text-white tracking-wide leading-snug text-balance"
                                style={{
                                    fontSize: 'clamp(1.05rem, 2.4vw, 1.9rem)',
                                    textShadow: '0 1px 12px rgba(0,0,0,0.55)',
                                }}
                            >
                                <span aria-hidden className="block text-fuchsia-300/60 font-serif italic leading-none mb-2"
                                    style={{ fontSize: 'clamp(2.2rem, 4.5vw, 3.6rem)' }}
                                >
                                    “
                                </span>
                                {citationText}
                            </blockquote>
                        </div>
                    ) : ytId ? (
                        <div
                            className="absolute"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                height: '100%',
                                aspectRatio: '16 / 9',
                            }}
                        >
                            <div ref={playerContainerRef} className="w-full h-full" />
                        </div>
                    ) : firebaseUrl ? (
                        // FIREBASE-sourced video (Featured + Voices tabs).
                        // We let the browser drive native controls; the
                        // custom transport bar below is YT-only because
                        // those handlers all call YT.Player methods.
                        <div
                            className="absolute"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                height: '100%',
                                aspectRatio: '16 / 9',
                            }}
                        >
                            <video
                                key={`${currentVideoId}-${zapKey}`}
                                src={firebaseUrl}
                                controls
                                autoPlay
                                playsInline
                                preload="metadata"
                                onPlay={() => {
                                    // Voices view-count ping. Only Voices
                                    // videos carry an ownerUid; admin-curated
                                    // (Featured) doesn't track per-video
                                    // views. Throttled per session via
                                    // voicesViewedRef.
                                    if (!firebaseOwnerUid || !currentVideoId) return;
                                    if (voicesViewedRef.current.has(currentVideoId)) return;
                                    voicesViewedRef.current.add(currentVideoId);
                                    try {
                                        const db = getFirestore(getApp());
                                        void updateDoc(
                                            doc(db, 'members', firebaseOwnerUid, 'videos', currentVideoId),
                                            { viewCount: increment(1) },
                                        ).catch(() => {});
                                    } catch {}
                                }}
                                className="w-full h-full bg-black"
                                style={{ objectFit: 'cover' }}
                            />
                        </div>
                    ) : embedUrl ? (
                        <div
                            className="absolute"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                height: '100%',
                                aspectRatio: '16 / 9',
                            }}
                        >
                            <iframe
                                ref={iframeRef}
                                key={`${currentVideoId}-${zapKey}`}
                                src={embedUrl}
                                title={currentVideo?.title ?? 'video'}
                                className="w-full h-full"
                                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                            />
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="text-neutral-400 text-sm font-cinzel uppercase tracking-widest text-center px-8">
                                {pool.length === 0
                                    ? t('No videos in this category yet.', 'Aucune vidéo dans cette catégorie.')
                                    : t('Loading…', 'Chargement…')}
                            </p>
                        </div>
                    )}

                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at 28% 22%, rgba(255,255,255,0.18), transparent 38%)',
                            mixBlendMode: 'screen',
                        }}
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-full"
                        style={{ boxShadow: 'inset 0 -30px 50px rgba(0,0,0,0.55)' }}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative w-full max-w-7xl mx-auto">
            {/* Orb portals into the viewer's TOOLS slot when present; falls
                back to inline (standalone usage) when the slot is missing. */}
            {orbSlot
                ? createPortal(orbVisual, orbSlot)
                : <section className="relative flex flex-col items-center justify-center pt-12 pb-8 px-4 z-10" style={{ minHeight: 420 }}>{orbVisual}</section>}

            {/* Back-to-Arsenal button — pinned top-right of the controls
                section so it's reachable while the orb lives up in the viewer. */}
            <button
                onClick={onClose}
                aria-label={t('Back to Arsenal', "Retour à l'Arsenal")}
                title={t('Back to Arsenal', "Retour à l'Arsenal")}
                className="absolute top-3 right-3 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/15 bg-black/60 backdrop-blur-md text-neutral-300 hover:text-white hover:border-white/40 hover:bg-black transition-colors text-[10px] font-cinzel uppercase tracking-widest"
            >
                <span aria-hidden>←</span>
                <span className="hidden sm:inline">{t('Arsenal', 'Arsenal')}</span>
            </button>

            {/* Bottom section — controls + Conscious Mode browser. No
                background: the orb's aurora lives up in the viewer, and the
                hub area below already provides the page surface. */}
            <section className="relative z-10">
                {/* Now-playing title + credit — sits above the control bar
                    since the orb itself no longer carries text chrome. */}
                {currentVideo && (
                    <div className="px-4 md:px-8 pt-5 pb-2 text-center">
                        {currentVideo.source.kind !== 'CITATION' && (
                            <h3 className="text-base md:text-lg font-cinzel text-white tracking-wide">
                                {currentVideo.title}
                            </h3>
                        )}
                        <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 mt-1 font-cinzel">
                            {currentVideo.source.kind === 'CITATION'
                                ? t('Anonymous', 'Anonyme')
                                : (currentVideo.credit ?? '—')}
                            <span className="mx-2 text-neutral-700">·</span>
                            {language === 'FR'
                                ? CATEGORY_LABELS[currentVideo.category].fr
                                : CATEGORY_LABELS[currentVideo.category].en}
                        </p>
                    </div>
                )}

                {/* Video transport — play/pause, timeline, time, mute,
                    fullscreen. Only renders for YouTube sources (where the
                    IFrame API gives us programmatic control). */}
                {ytId && (
                    <div className="px-4 md:px-8 pt-2 pb-1 max-w-3xl mx-auto flex items-center gap-3">
                        <button
                            onClick={togglePlay}
                            disabled={!playerReady}
                            aria-label={playing ? t('Pause', 'Pause') : t('Play', 'Lire')}
                            title={playing ? t('Pause (K / Space)', 'Pause (K / Espace)') : t('Play (K)', 'Lire (K)')}
                            className="w-9 h-9 shrink-0 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {playing ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                        <span className="text-[10px] font-mono tabular-nums text-neutral-400 w-12 text-right shrink-0">
                            {formatTime(currentTime)}
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={duration || 1}
                            step={0.1}
                            value={Math.min(currentTime, duration || 0)}
                            onChange={(e) => seekTo(Number(e.target.value))}
                            disabled={!playerReady || duration === 0}
                            className="inspirosphere-scrubber flex-1 cursor-pointer"
                            aria-label={t('Timeline', 'Chronologie')}
                        />
                        <span className="text-[10px] font-mono tabular-nums text-neutral-400 w-12 shrink-0">
                            {formatTime(duration)}
                        </span>
                        <button
                            onClick={toggleMute}
                            disabled={!playerReady}
                            aria-label={muted ? t('Unmute', 'Activer le son') : t('Mute', 'Couper le son')}
                            title={muted ? t('Unmute (M)', 'Activer le son (M)') : t('Mute (M)', 'Couper le son (M)')}
                            className="w-9 h-9 shrink-0 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {muted ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/></svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                            )}
                        </button>
                        <button
                            onClick={goFullscreen}
                            disabled={!playerReady}
                            aria-label={t('Fullscreen', 'Plein écran')}
                            title={t('Fullscreen (F)', 'Plein écran (F)')}
                            className="w-9 h-9 shrink-0 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
                            </svg>
                        </button>
                    </div>
                )}

                {/* Source tab strip — Discovered (web seed) · Featured
                    (admin uploads) · Voices (approved UGC). Switching the
                    tab swaps the pool the orb draws from; the seed effect
                    above re-zaps so the user lands on a video from the
                    new source. */}
                <div className="px-4 md:px-8 pt-4 pb-1 flex justify-center">
                    <div className="inline-flex items-center gap-1 p-1 border border-white/15 rounded-full bg-black/40 backdrop-blur-md">
                        {(['DISCOVERED', 'FEATURED', 'VOICES', 'CITATIONS'] as OrbTab[]).map(tab => {
                            const active = activeTab === tab;
                            const count = tab === 'DISCOVERED' ? STATIC_AS_ORB.length
                                       : tab === 'FEATURED'   ? featuredPool.length
                                       : tab === 'VOICES'     ? voicesPool.length
                                       :                        CITATIONS_AS_ORB.length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => { setActiveTab(tab); setActiveCategory(null); }}
                                    aria-pressed={active}
                                    className={`px-4 py-1.5 text-[10px] font-cinzel uppercase tracking-[0.3em] rounded-full transition-all flex items-center gap-2 ${active ? formStyles.chipActive : formStyles.chipInactive}`}
                                    title={tab === 'VOICES'
                                        ? t('Community videos approved for the orb', "Vidéos de la communauté retenues pour l'orbe")
                                        : tab === 'FEATURED'
                                          ? t('Salon picks — uploaded by the house', 'Choix du Salon — téléversés par la maison')
                                          : tab === 'CITATIONS'
                                            ? t('Anonymized citations — wisdom without a name', 'Citations anonymisées — la sagesse sans nom')
                                            : t('Web finds — the original catalog', 'Trouvailles du web — le catalogue original')}
                                >
                                    <span>{language === 'FR' ? TAB_LABELS[tab].fr : TAB_LABELS[tab].en}</span>
                                    <span className="text-[8px] opacity-60 font-mono tabular-nums">{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Always-visible control bar */}
                <div className="px-4 md:px-8 py-4 flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={zap}
                        disabled={pool.length === 0}
                        className={`group flex items-center gap-3 px-6 py-3 text-sm rounded-lg transition-all ${pool.length === 0 ? formStyles.submitOff : formStyles.submitOn}`}
                        title={t('Zap to a random next video (Space)', 'Passer à une vidéo aléatoire (Espace)')}
                    >
                        <span>{t('Next', 'Suivant')}</span>
                        <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>⚡</span>
                    </button>
                    <button
                        onClick={() => setMode(m => m === 'ORB' ? 'CONSCIOUS' : 'ORB')}
                        className={`px-5 py-3 text-[11px] font-cinzel uppercase tracking-[0.3em] rounded-lg border transition-colors ${mode === 'CONSCIOUS' ? formStyles.chipActive : formStyles.chipInactive}`}
                        title={t('Browse by category (C)', 'Parcourir par catégorie (C)')}
                    >
                        {mode === 'CONSCIOUS'
                            ? t('Close conscious mode', 'Fermer le mode conscient')
                            : t('Conscious mode', 'Mode conscient')}
                    </button>
                    {activeCategory && (
                        <button
                            onClick={() => setActiveCategory(null)}
                            className="text-[10px] font-cinzel uppercase tracking-widest text-neutral-400 hover:text-white border-b border-transparent hover:border-white/40"
                            title={t('Clear category filter', 'Retirer le filtre')}
                        >
                            {language === 'FR'
                                ? `Filtre : ${CATEGORY_LABELS[activeCategory].fr}`
                                : `Filter: ${CATEGORY_LABELS[activeCategory].en}`}
                            <span className="ml-1.5 text-rose-400">✕</span>
                        </button>
                    )}
                    <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 tabular-nums">
                        {pool.length} {t('videos', 'vidéos')}
                    </span>
                </div>

                {/* Conscious Mode panel — categories + grid of thumbnails.
                    No inner scroll: the page itself handles overflow so the
                    user never has nested scroll regions. */}
                {mode === 'CONSCIOUS' && (
                    <div className="border-t border-white/10">
                        <div className="px-4 md:px-8 py-5">
                            {/* Category chips */}
                            <p className={formStyles.label}>{t('Categories', 'Catégories')}</p>
                            <div className="flex flex-wrap gap-2 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setActiveCategory(null)}
                                    aria-pressed={activeCategory === null}
                                    className={`px-3 py-1.5 text-[11px] uppercase tracking-widest rounded-full transition-all border ${activeCategory === null ? formStyles.chipActive : formStyles.chipInactive}`}
                                >
                                    {t('All', 'Toutes')}
                                </button>
                                {INSPIROSPHERE_CATEGORIES.map(c => {
                                    const active = activeCategory === c;
                                    const count = baseForTab.filter(v => v.category === c).length;
                                    if (count === 0) return null;
                                    return (
                                        <button
                                            type="button"
                                            key={c}
                                            onClick={() => setActiveCategory(c)}
                                            aria-pressed={active}
                                            className={`px-3 py-1.5 text-[11px] uppercase tracking-widest rounded-full transition-all border flex items-center gap-2 ${active ? formStyles.chipActive : formStyles.chipInactive}`}
                                        >
                                            <span>{language === 'FR' ? CATEGORY_LABELS[c].fr : CATEGORY_LABELS[c].en}</span>
                                            <span className="text-[9px] opacity-70 tabular-nums font-mono">{count}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Video grid */}
                            <p className={formStyles.label}>{t('Videos', 'Vidéos')}</p>
                            {pool.length === 0 ? (
                                <p className="text-sm text-neutral-500 italic font-lato py-8 text-center">
                                    {t('No videos in this category yet.', 'Aucune vidéo dans cette catégorie pour l\'instant.')}
                                </p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    {pool.map(v => {
                                        // YouTube videos give us a free CDN
                                        // thumbnail; Facebook + Firebase do
                                        // not, so we render the gradient
                                        // fallback for those tiles. Citation
                                        // tiles drop the thumbnail entirely
                                        // and show the quote as the visual.
                                        const webId = v.source.kind === 'WEB' ? getYouTubeId(v.source.url) : null;
                                        const thumb = webId ? `https://img.youtube.com/vi/${webId}/hqdefault.jpg` : null;
                                        const isCitation = v.source.kind === 'CITATION';
                                        const isCurrent = v.id === currentVideoId;
                                        return (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => pickById(v.id)}
                                                className={`group relative text-left rounded-lg overflow-hidden border transition-all ${isCurrent ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.35)]' : 'border-white/10 hover:border-white/40 hover:shadow-[0_0_18px_rgba(255,255,255,0.12)]'}`}
                                            >
                                                <div className="aspect-video overflow-hidden relative bg-black">
                                                    {isCitation ? (
                                                        <div className="w-full h-full flex items-center justify-center p-3 bg-gradient-to-br from-fuchsia-900/40 via-violet-900/40 to-cyan-900/40">
                                                            <p className="text-white/85 text-[11px] font-cinzel leading-snug line-clamp-4 text-center">
                                                                <span aria-hidden className="text-fuchsia-300/70 font-serif italic mr-1">“</span>
                                                                {v.title}
                                                            </p>
                                                        </div>
                                                    ) : thumb ? (
                                                        <img src={thumb} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-fuchsia-700 via-violet-700 to-cyan-700">
                                                            <span className="text-white/70 text-xs font-cinzel uppercase tracking-widest">VIDEO</span>
                                                        </div>
                                                    )}
                                                    {isCurrent && (
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-cyan-400 text-black text-[9px] font-bold uppercase tracking-widest rounded">
                                                            {t('Playing', 'En cours')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-2.5">
                                                    {!isCitation && (
                                                        <p className="text-xs font-cinzel text-white line-clamp-2 leading-tight mb-1">{v.title}</p>
                                                    )}
                                                    <p className="text-[9px] uppercase tracking-widest text-neutral-500 truncate">
                                                        {isCitation ? t('Anonymous', 'Anonyme') : (v.credit ?? '—')}
                                                        <span className="mx-1 text-neutral-700">·</span>
                                                        {language === 'FR'
                                                            ? CATEGORY_LABELS[v.category].fr
                                                            : CATEGORY_LABELS[v.category].en}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>

            <style>{`
                .inspirosphere-aurora-a { animation: insphAuroraA 14s ease-in-out infinite alternate; }
                .inspirosphere-aurora-b { animation: insphAuroraB 18s ease-in-out infinite alternate; }
                .inspirosphere-aurora-c { animation: insphAuroraC 22s ease-in-out infinite alternate; }
                @keyframes insphAuroraA { 0% { transform: translate(-52%, -52%) scale(1.0); opacity: 0.55; }   100% { transform: translate(-48%, -48%) scale(1.08); opacity: 0.85; } }
                @keyframes insphAuroraB { 0% { transform: translate(-48%, -50%) scale(1.05); opacity: 0.5; }  100% { transform: translate(-52%, -52%) scale(1.18); opacity: 0.8; } }
                @keyframes insphAuroraC { 0% { transform: translate(-50%, -48%) scale(0.95); opacity: 0.4; }  100% { transform: translate(-50%, -52%) scale(1.10); opacity: 0.7; } }
                .inspirosphere-breathe { animation: insphBreathe 6s ease-in-out infinite alternate; }
                @keyframes insphBreathe { 0% { transform: scale(1); } 100% { transform: scale(1.015); } }
                .inspirosphere-orb-glow { animation: insphGlow 4s ease-in-out infinite alternate; }
                @keyframes insphGlow { 0% { opacity: 0.6; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1.06); } }
                .inspirosphere-citation-fade { animation: insphCitationFade 700ms ease-out both; }
                @keyframes insphCitationFade {
                    0%   { opacity: 0; transform: translateY(6px) scale(0.985); }
                    100% { opacity: 1; transform: translateY(0)   scale(1); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .inspirosphere-aurora-a, .inspirosphere-aurora-b, .inspirosphere-aurora-c,
                    .inspirosphere-breathe, .inspirosphere-orb-glow,
                    .inspirosphere-citation-fade { animation: none !important; }
                }

                /* Custom timeline scrubber — kept slim so it sits beside the
                   transport buttons without looking heavier than them. */
                .inspirosphere-scrubber {
                    -webkit-appearance: none;
                    appearance: none;
                    height: 4px;
                    border-radius: 9999px;
                    background: rgba(255,255,255,0.12);
                    outline: none;
                }
                .inspirosphere-scrubber::-webkit-slider-runnable-track {
                    height: 4px;
                    border-radius: 9999px;
                    background: rgba(255,255,255,0.12);
                }
                .inspirosphere-scrubber::-moz-range-track {
                    height: 4px;
                    border-radius: 9999px;
                    background: rgba(255,255,255,0.12);
                }
                .inspirosphere-scrubber::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    margin-top: -4px;
                    border-radius: 9999px;
                    background: #f5d0fe;
                    border: 1px solid rgba(0,0,0,0.4);
                    box-shadow: 0 0 8px rgba(217,70,239,0.55);
                    cursor: pointer;
                }
                .inspirosphere-scrubber::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    border-radius: 9999px;
                    background: #f5d0fe;
                    border: 1px solid rgba(0,0,0,0.4);
                    box-shadow: 0 0 8px rgba(217,70,239,0.55);
                    cursor: pointer;
                }
                .inspirosphere-scrubber:disabled { opacity: 0.4; cursor: not-allowed; }
            `}</style>
        </div>
    );
};
