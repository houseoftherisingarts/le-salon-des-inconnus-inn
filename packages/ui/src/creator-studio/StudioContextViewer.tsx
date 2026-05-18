import React, { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ARTISTS_ROSTER } from './roster';
import { flagEmoji, COUNTRY_OPTIONS } from './ArtistHub';
import { getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * StudioContextViewer
 * ───────────────────
 * The "top half" of the Creator Studio. Replaces the static "CREATOR STUDIO"
 * marquee with a contextual viewer that mirrors whichever tab the user is
 * currently in, with a champion-select-style light-wave transition between
 * states.
 *
 * Composition:
 *   • Resizable container (vertical drag handle at the bottom edge)
 *   • Collapse/restore toggle on the right edge
 *   • Per-tab content (PROFILE / ROSTER / TOOLS / READS / etc) keyed by tab
 *     so React remounts on every change → triggers entry animations
 *   • Light-sweep + particles + breathing aurora baked into the chrome
 */

export type ViewerTab =
    | 'WELCOME'  // pre-tab branded state (initial mount)
    | 'PROFILE'
    | 'ROSTER'
    | 'TOOLS'
    | 'READS'
    | 'COLLABORATE'
    | 'MARKET'
    | 'STORE'
    | 'HOT_SEAT'
    | 'CHAT';

export interface ViewerContext {
    tab: ViewerTab;
    /** Snapshot of the artist's profile data — populated when MEMBER. */
    regData?: {
        name: string;
        city: string;
        country?: string;
        archetype: string;
        bio: string;
        skills: string[];
    };
    avatarUrl?: string | null;
    isArtist?: boolean;
    membershipTier?: string;
    accessLevel?: 'GUEST' | 'MEMBER';
    /** When true on the TOOLS tab, the viewer body becomes the Inspirosphere
     *  orb portal target — Inspirosphere renders the sphere up here while its
     *  controls live in the hub area below. */
    inspirosphereActive?: boolean;
}

interface Props {
    ctx: ViewerContext;
    height: number;
    setHeight: (h: number) => void;
    collapsed: boolean;
    setCollapsed: (c: boolean) => void;
    language: 'EN' | 'FR';
    /** Theme accent — drives the aurora/sweep palette per LoL-style theme. */
    theme: string;
    /** Currently signed-in user's uid. Required for the pill-avatar uploader. */
    uid?: string | null;
}

// ─── Per-theme block-title treatment ─────────────────────────────────────────
// Block titles (Time Exchange, Featured artists, etc.) inherit the active
// theme's wordmark feel so they read as siblings of the welcome-hero "STUDIO"
// title — not as a generic serif drop-in. Only NEON ARCADE (RAINBOW) overrides
// today; the other themes already feel coherent with the default font-prata.
const themedTitleClass = (theme: string): string => {
    if (theme === 'RAINBOW') {
        return 'font-studio-display font-black italic uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300 drop-shadow-[0_0_25px_rgba(34,211,238,0.7)] leading-[0.95]';
    }
    return 'font-prata text-white leading-[0.95]';
};

// ─── Per-tab metadata ────────────────────────────────────────────────────────
// Title + subtitle + accent palette per tab. The accent drives the light-wave
// gradient and the breathing aurora behind the content.

const TAB_META: Record<ViewerTab, {
    titleEn: string;
    titleFr: string;
    subtitleEn: string;
    subtitleFr: string;
    fromColor: string;
    toColor: string;
    glowColor: string;
}> = {
    WELCOME: {
        titleEn: 'Creator Studio',
        titleFr: 'Studio des Créateurs',
        subtitleEn: 'A workspace for artists in residency',
        subtitleFr: 'Un espace de travail pour les artistes en résidence',
        fromColor: '#d946ef',
        toColor: '#22d3ee',
        glowColor: '#facc15',
    },
    PROFILE: {
        titleEn: 'Your Profile',
        titleFr: 'Votre Profil',
        subtitleEn: 'Build your identity. Upload your work. Ask to be featured.',
        subtitleFr: 'Bâtissez votre identité. Téléversez vos œuvres. Demandez à être mis·e en avant.',
        fromColor: '#7a1f3a',
        toColor: '#3a132e',
        glowColor: '#c5a059',
    },
    ROSTER: {
        titleEn: 'The Roster',
        titleFr: 'Le Registre',
        subtitleEn: 'Curated artists across the Salon',
        subtitleFr: 'Artistes curaté·e·s à travers le Salon',
        fromColor: '#06b6d4',
        toColor: '#8b5cf6',
        glowColor: '#fbbf24',
    },
    TOOLS: {
        titleEn: 'The Armory',
        titleFr: 'L\'Arsenal',
        subtitleEn: 'Legal codex, kanban, bio forge, copyrighter',
        subtitleFr: 'Codex légal, kanban, forge bio, copyright',
        fromColor: '#ef4444',
        toColor: '#f97316',
        glowColor: '#fde047',
    },
    READS: {
        titleEn: 'The Notebook',
        titleFr: 'Le Carnet',
        subtitleEn: 'Articles, manifestos, voice recordings',
        subtitleFr: 'Articles, manifestes, enregistrements vocaux',
        fromColor: '#0ea5e9',
        toColor: '#6366f1',
        glowColor: '#67e8f9',
    },
    COLLABORATE: {
        titleEn: 'Collaborate',
        titleFr: 'Collaborer',
        subtitleEn: 'Residencies, events, projects, code contributions',
        subtitleFr: 'Résidences, événements, projets, contributions code',
        fromColor: '#10b981',
        toColor: '#06b6d4',
        glowColor: '#a3e635',
    },
    MARKET: {
        titleEn: 'Time Exchange',
        titleFr: 'Échange de Temps',
        subtitleEn: 'Trade tokens. Fulfill contracts. Earn time.',
        subtitleFr: 'Échangez des jetons. Honorez des contrats. Gagnez du temps.',
        fromColor: '#f59e0b',
        toColor: '#dc2626',
        glowColor: '#fef3c7',
    },
    STORE: {
        titleEn: 'The Store',
        titleFr: 'La Boutique',
        subtitleEn: 'Membership tiers and platform skins',
        subtitleFr: 'Paliers d\'adhésion et apparences',
        fromColor: '#ec4899',
        toColor: '#8b5cf6',
        glowColor: '#fde047',
    },
    HOT_SEAT: {
        titleEn: 'Hot Seat',
        titleFr: 'Hot Seat',
        subtitleEn: 'Submit work. Receive critique. Refine.',
        subtitleFr: 'Soumettez votre travail. Recevez une critique. Affinez.',
        fromColor: '#f43f5e',
        toColor: '#fb923c',
        glowColor: '#fda4af',
    },
    CHAT: {
        titleEn: 'Chat',
        titleFr: 'Discussion',
        subtitleEn: 'Coming soon — direct messages between artists',
        subtitleFr: 'Bientôt — messages directs entre artistes',
        fromColor: '#475569',
        toColor: '#1e293b',
        glowColor: '#94a3b8',
    },
};

// ─── Particle field for the LoL-style transition ─────────────────────────────
// Stars sprinkle across the viewer when the tab changes. Each particle has a
// random origin + drift; the entry animation fades them in then floats them
// upward. Using a fixed count keyed by tab transition ensures deterministic
// remount on each change.

const ParticleField: React.FC<{ count?: number }> = ({ count = 24 }) => {
    const particles = React.useMemo(
        () =>
            Array.from({ length: count }, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                top: 60 + Math.random() * 40,
                size: 1 + Math.random() * 2.5,
                delay: Math.random() * 0.4,
                duration: 1.6 + Math.random() * 1.2,
                drift: -10 - Math.random() * 30,
            })),
        [count],
    );
    return (
        <>
            {particles.map((p) => (
                <span
                    key={p.id}
                    className="viewer-particle"
                    style={{
                        left: `${p.left}%`,
                        top: `${p.top}%`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        ['--drift' as any]: `${p.drift}px`,
                    } as CSSProperties}
                />
            ))}
        </>
    );
};

// ─── Per-tab content blocks ──────────────────────────────────────────────────

const ProfileBlock: React.FC<{
    ctx: ViewerContext;
    language: 'EN' | 'FR';
    uid: string | null;
}> = ({ ctx, language, uid }) => {
    const { regData, avatarUrl, isArtist, accessLevel } = ctx;
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    const flag = flagEmoji(regData?.country);
    const countryName = COUNTRY_OPTIONS.find((c) => c.code === regData?.country)?.name;
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const canEdit = accessLevel === 'MEMBER' && !!uid;

    // Self-contained upload: pushes to artists/{uid}/avatar.{ext} and writes
    // the URL onto members/{uid}/artistProfile/profile.avatarUrl. ArtistHub's
    // onSnapshot subscription picks up the change automatically.
    const handleAvatarFile = async (file: File) => {
        if (!uid || !file) return;
        setUploading(true);
        try {
            const app = getApp();
            const storage = getStorage(app);
            const db = getFirestore(app);
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const r = storageRef(storage, `artists/${uid}/avatar.${ext}`);
            await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
            const url = await getDownloadURL(r);
            await setDoc(
                doc(db, 'members', uid, 'artistProfile', 'profile'),
                { avatarUrl: url, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch {
            // Non-fatal — error surfaces in the dossier's profileError state.
        } finally {
            setUploading(false);
        }
    };
    return (
        <div className="relative flex flex-col md:flex-row items-center gap-10 md:gap-14 max-w-5xl w-full">
            {/* Soft maroon glow behind the profile — concentrated around the
                avatar/upper half so the gradient fades to transparent before
                meeting the viewer's bottom depth-fade (no visible seam). */}
            <div
                aria-hidden
                className="absolute inset-[-20%] -z-10 pointer-events-none"
                style={{
                    background:
                        'radial-gradient(55% 55% at 30% 40%, rgba(110,40,75,0.50) 0%, rgba(60,20,40,0.20) 45%, transparent 75%)',
                }}
            />

            {/* Tall-oval avatar — narrow vertical capsule (aspect ~5:9).
                rounded-full on a non-square element draws an ellipse. Click
                to upload a new picture (members only). */}
            <div className="relative w-36 h-64 md:w-40 md:h-72 shrink-0">
                {canEdit && (
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAvatarFile(f);
                            e.target.value = '';
                        }}
                    />
                )}
                <div
                    aria-hidden
                    className="absolute -inset-5 rounded-full pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(circle at 35% 30%, rgba(236,72,153,0.42), transparent 70%)',
                        filter: 'blur(32px)',
                    }}
                />
                <button
                    type="button"
                    onClick={() => { if (canEdit) fileInputRef.current?.click(); }}
                    disabled={!canEdit || uploading}
                    aria-label={canEdit ? t('Change profile picture', 'Changer la photo de profil') : t('Profile picture', 'Photo de profil')}
                    title={canEdit ? t('Click to change your profile picture', 'Cliquer pour changer la photo') : ''}
                    className={`relative w-full h-full rounded-full overflow-hidden border-2 border-white/30 shadow-[0_0_60px_rgba(236,72,153,0.35)] viewer-orb group ${canEdit ? 'cursor-pointer' : 'cursor-default'} disabled:cursor-wait`}
                >
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-fuchsia-700 via-violet-700 to-cyan-700 flex items-center justify-center text-6xl font-black text-white/80">
                            {(regData?.name?.[0] || '?').toUpperCase()}
                        </div>
                    )}
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background:
                                'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.20), transparent 45%), radial-gradient(circle at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)',
                            mixBlendMode: 'screen',
                        }}
                    />
                    {canEdit && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-7 h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                            <span className="text-[10px] uppercase tracking-widest text-white">
                                {uploading ? t('Uploading…', 'Téléversement…') : t('Change', 'Changer')}
                            </span>
                        </div>
                    )}
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                    )}
                </button>
                {flag && (
                    <span
                        className="absolute -bottom-2 -left-2 w-11 h-11 rounded-full bg-black/85 border-2 border-white/40 flex items-center justify-center text-xl shadow-xl"
                        title={countryName}
                        aria-label={countryName}
                    >
                        {flag}
                    </span>
                )}
            </div>

            <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1">
                <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-3">
                    {accessLevel === 'MEMBER'
                        ? (isArtist ? t('Curated Artist', 'Artiste Curaté·e') : t('Member', 'Membre'))
                        : t('Visitor', 'Visiteur')}
                </span>
                <h2 className="viewer-title font-cinzel text-4xl md:text-6xl text-[#f3e5ab] leading-[1.05] mb-3 max-w-[16ch]">
                    {regData?.name || t('Wanderer', 'Vagabond·e')}
                </h2>
                {(regData?.city || countryName) && (
                    <p className="font-cinzel text-neutral-400 text-[11px] uppercase tracking-[0.4em] mb-5">
                        {[regData?.city, countryName].filter(Boolean).join(' · ')}
                    </p>
                )}
                <p className="font-lato text-neutral-300 text-base md:text-lg leading-relaxed max-w-prose">
                    {regData?.bio || t('Build your story.', 'Bâtissez votre récit.')}
                </p>
                {!!regData?.skills?.length && (
                    <div className="flex flex-wrap gap-2 mt-5 justify-center md:justify-start">
                        {regData.skills.slice(0, 6).map((s) => (
                            <span
                                key={s}
                                className="text-[10px] font-cinzel uppercase tracking-widest px-3 py-1.5 border border-white/15 text-neutral-300 bg-black/30"
                            >
                                {s}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const RosterBlock: React.FC<{ language: 'EN' | 'FR'; theme: string }> = ({ language, theme }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    // Spotlight a rotating subset of the roster — 4 cards drift gently.
    const spotlight = ARTISTS_ROSTER.slice(0, 4);
    return (
        <div className="flex flex-col gap-6 max-w-6xl">
            <h2 className={`viewer-title text-5xl md:text-7xl mb-2 ${themedTitleClass(theme)}`}>
                {t('Featured artists', 'Artistes mis·e·s en avant')}
            </h2>
            <p className="font-lato text-neutral-300 text-base md:text-lg max-w-prose">
                {t(
                    'Curated voices across the Salon — visual, audio, digital, sculptural.',
                    'Voix curatées du Salon — visuel, audio, numérique, sculpture.',
                )}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {spotlight.map((a, i) => (
                    <div
                        key={a.id}
                        className="viewer-roster-card relative aspect-[3/4] overflow-hidden rounded-md border border-white/10 group"
                        style={{ animationDelay: `${i * 0.12}s` }}
                    >
                        <img
                            src={a.avatarUrl}
                            alt={a.name}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2">
                            <p className="font-cinzel text-[#f3e5ab] text-xs uppercase tracking-widest truncate">{a.name}</p>
                            <p className="font-lato text-fuchsia-200/80 text-[10px] uppercase tracking-widest truncate">{a.class}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SimpleBlock: React.FC<{
    title: string;
    subtitle: string;
    body?: React.ReactNode;
    theme: string;
}> = ({ title, subtitle, body, theme }) => (
    <div className="flex flex-col gap-4 max-w-4xl">
        <h2 className={`viewer-title text-5xl md:text-7xl ${themedTitleClass(theme)}`}>{title}</h2>
        <p className="font-lato text-neutral-300 text-base md:text-lg leading-relaxed max-w-prose">{subtitle}</p>
        {body}
    </div>
);

// ─── Welcome hero (per-theme original stylings) ──────────────────────────────
// Restored from the pre-viewer era — each theme has its own signature treatment
// of the "CREATOR STUDIO" wordmark. Only renders for the WELCOME state, before
// the user clicks a tab. After that the contextual blocks take over.

const WelcomeHero: React.FC<{ theme: string; language: 'EN' | 'FR' }> = ({ theme, language }) => {
    if (theme === 'RED') {
        return (
            <div className="relative w-full max-w-[1920px] flex flex-col justify-center px-6 md:px-12">
                <div className="flex flex-col items-start leading-[0.8] tracking-tighter mb-4">
                    <h1 className="welcome-line font-studio-display font-black text-7xl md:text-[10rem] text-white">THE</h1>
                    <h1 className="welcome-line font-studio-display font-black text-7xl md:text-[10rem] text-white" style={{ animationDelay: '120ms' }}>CREATOR</h1>
                    <h1 className="welcome-line font-studio-display font-black text-7xl md:text-[10rem] text-[#FF364A]" style={{ animationDelay: '240ms' }}>STUDIO</h1>
                </div>
                <div className="absolute bottom-0 right-6 md:right-12">
                    <p className="bg-[#1a0a0a] text-[#FF364A] font-mono text-xs px-3 py-1 uppercase tracking-widest border border-[#FF364A]/30">
                        {language === 'EN' ? 'dive into the unknown' : "plongez dans l'inconnu"}
                    </p>
                </div>
            </div>
        );
    }

    if (theme === 'BLUE_PUNK') {
        return (
            <div className="flex flex-col items-start px-6 md:px-12">
                <div className="border-l-4 border-cyan-500 pl-6">
                    <h1 className="welcome-line font-mono text-6xl md:text-8xl text-cyan-300 font-bold tracking-tighter uppercase mb-2 skew-x-[-10deg]">
                        CREATOR_<span className="text-fuchsia-500">STUDIO</span>
                    </h1>
                    <p className="welcome-line font-mono text-sm text-fuchsia-400 bg-black inline-block px-2" style={{ animationDelay: '160ms' }}>
                        // CREATOR_STUDIO_V9.0
                    </p>
                </div>
            </div>
        );
    }

    if (theme === 'COMIC') {
        return (
            <div className="relative flex flex-col items-center justify-center text-center select-none overflow-hidden px-6">
                {/* Dynamic Background Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[200px] bg-[#facc15] -rotate-12 opacity-5 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[200px] bg-[#ef4444] rotate-6 opacity-5 pointer-events-none" />
                <div className="relative z-10 flex flex-col items-center">
                    <h1 className="welcome-line font-studio-display font-black italic text-7xl md:text-[8rem] leading-[0.85] tracking-tighter transform -skew-x-12 relative z-10"
                        style={{
                            color: 'transparent',
                            WebkitTextStroke: '3px white',
                            textShadow: '5px 5px 0px #000',
                        }}>
                        CREATOR
                    </h1>
                    <div className="welcome-line relative mt-3 transform skew-x-[-12deg]" style={{ animationDelay: '160ms' }}>
                        <div className="absolute inset-0 bg-black translate-x-3 translate-y-3" />
                        <div className="relative bg-[#facc15] border-4 border-black px-6 py-1">
                            <h1 className="font-studio-display font-black italic text-7xl md:text-[8rem] text-black leading-[0.85] tracking-tighter">STUDIO</h1>
                        </div>
                    </div>
                    <div className="welcome-line mt-6 transform rotate-2" style={{ animationDelay: '320ms' }}>
                        <div className="bg-[#22d3ee] border-4 border-black px-5 py-1.5 shadow-[4px_4px_0px_#000]">
                            <span className="font-studio-display font-bold italic text-black text-base md:text-xl uppercase tracking-widest">
                                {language === 'EN' ? 'SKILL TREE ACTIVE' : 'ARBRE DE TALENTS ACTIF'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (theme === 'CHROMATIC') {
        return (
            <div className="flex flex-col items-center justify-center text-center px-6">
                <h1 className="welcome-line font-studio-display text-6xl md:text-9xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] mb-0 tracking-tight leading-[0.85]">
                    CREATOR
                </h1>
                <h1 className="welcome-line font-studio-display text-6xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 drop-shadow-[0_0_30px_rgba(59,130,246,0.6)] tracking-tight leading-[0.85]"
                    style={{ animationDelay: '120ms' }}>
                    STUDIO
                </h1>
                <div className="welcome-line w-48 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 mx-auto mt-6 mb-4 rounded-full opacity-80 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                    style={{ animationDelay: '240ms' }} />
                <p className="welcome-line font-mono text-sm md:text-base opacity-70 uppercase tracking-widest border-t border-b border-blue-500/30 text-blue-200/70 py-2 inline-block"
                    style={{ animationDelay: '320ms' }}>
                    {language === 'EN' ? 'Dive into the unknown' : "Plongez dans l'inconnu"}
                </p>
            </div>
        );
    }

    if (theme === 'CLASSY') {
        return (
            <div className="flex flex-col items-center justify-center text-center px-6">
                <h1 className="welcome-line font-cinzel text-6xl md:text-9xl mb-3 uppercase leading-[0.85] text-white">
                    {language === 'EN' ? 'CREATOR' : 'STUDIO'}
                </h1>
                <h1 className="welcome-line font-cinzel text-6xl md:text-9xl uppercase leading-[0.85] text-[#c8aa6e]"
                    style={{ animationDelay: '120ms' }}>
                    {language === 'EN' ? 'STUDIO' : 'CRÉATEUR'}
                </h1>
                <p className="welcome-line font-mono text-sm md:text-base opacity-70 uppercase tracking-widest border-t border-b border-current py-2 inline-block mt-6 text-[#c8aa6e]/80"
                    style={{ animationDelay: '240ms' }}>
                    {language === 'EN' ? 'Dive into the unknown' : "Plongez dans l'inconnu"}
                </p>
            </div>
        );
    }

    // RAINBOW (default) — neon arcade. STUDIO uses the original neonPowerUp
    // animation (defined in CreatorStudioShell's <style>) for the signature
    // electric-flicker entrance — DON'T add welcome-line here or it'll
    // override the neon flash.
    return (
        <div className="flex flex-col items-center justify-center text-center px-6 group cursor-default">
            <h1 className="font-studio-display font-black text-6xl md:text-9xl mb-2 uppercase leading-[0.85] transition-all duration-500">
                <span className="welcome-line block text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.5)]">
                    {language === 'EN' ? 'CREATOR' : 'STUDIO'}
                </span>
                <span className="block italic text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300 drop-shadow-[0_0_35px_rgba(34,211,238,0.9)] filter neon-text">
                    {language === 'EN' ? 'STUDIO' : 'CRÉATIF'}
                </span>
            </h1>
            <p className="welcome-line font-mono text-sm md:text-base opacity-70 uppercase tracking-widest border-t border-b border-current py-2 inline-block mt-4"
                style={{ animationDelay: '600ms' }}>
                {language === 'EN' ? 'Dive into the unknown' : "Plongez dans l'inconnu"}
            </p>
        </div>
    );
};

// ─── Main viewer component ───────────────────────────────────────────────────

export const StudioContextViewer: React.FC<Props> = ({
    ctx,
    height,
    setHeight,
    collapsed,
    setCollapsed,
    language,
    theme,
    uid,
}) => {
    const meta = TAB_META[ctx.tab];
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

    // Drag-resize state. Starts on pointerdown, tracks pointermove until
    // pointerup. Uses document-level listeners so the user can drag past
    // the handle bounds without losing capture.
    const dragRef = useRef<{ startY: number; startH: number } | null>(null);
    const [dragging, setDragging] = useState(false);

    // Track whether the user has navigated past the initial WELCOME state.
    // Only show the LoL-style theatrics (sweep + particles + viewer-body fade)
    // for tab transitions — first arrival keeps the original brand hero pure
    // so the neon flash + per-theme signature reads as designed.
    const prevTabRef = useRef<ViewerTab>(ctx.tab);
    const [hasTransitioned, setHasTransitioned] = useState(false);
    useEffect(() => {
        if (prevTabRef.current !== ctx.tab) {
            setHasTransitioned(true);
            prevTabRef.current = ctx.tab;
        }
    }, [ctx.tab]);
    const showFx = hasTransitioned;

    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: PointerEvent) => {
            if (!dragRef.current) return;
            const dy = e.clientY - dragRef.current.startY;
            const next = Math.max(120, Math.min(window.innerHeight * 0.85, dragRef.current.startH + dy));
            setHeight(next);
        };
        const onUp = () => {
            dragRef.current = null;
            setDragging(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [dragging, setHeight]);

    const startDrag = (e: React.PointerEvent) => {
        if (collapsed) setCollapsed(false);
        dragRef.current = { startY: e.clientY, startH: height };
        setDragging(true);
    };

    // Render the right body for the active tab.
    const renderBody = () => {
        switch (ctx.tab) {
            case 'PROFILE':
                return <ProfileBlock ctx={ctx} language={language} uid={uid ?? null} />;
            case 'ROSTER':
                return <RosterBlock language={language} theme={theme} />;
            case 'TOOLS':
                // Inspirosphere takes over the viewer body when active —
                // Inspirosphere.tsx portals the orb into this slot div so the
                // sphere lives in the top half while the controls render below
                // in the hub. Other tools keep the L'Arsenal preview grid.
                if (ctx.inspirosphereActive) {
                    return (
                        <div
                            id="inspirosphere-orb-slot"
                            className="w-full h-full flex items-center justify-center"
                        />
                    );
                }
                return (
                    <SimpleBlock
                        theme={theme}
                        title={t(meta.titleEn, meta.titleFr)}
                        subtitle={t(meta.subtitleEn, meta.subtitleFr)}
                        body={
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 max-w-3xl">
                                {[
                                    { en: 'Legal Codex', fr: 'Codex Légal', icon: '§' },
                                    { en: 'Kanban', fr: 'Kanban', icon: '▦' },
                                    { en: 'Bio Forge', fr: 'Forge Bio', icon: '♟' },
                                    { en: 'Copyrighter', fr: 'Copyright', icon: '©' },
                                ].map((x, i) => (
                                    <div
                                        key={x.en}
                                        className="viewer-roster-card border border-white/15 bg-black/40 backdrop-blur-sm p-4 text-center"
                                        style={{ animationDelay: `${i * 0.1}s` }}
                                    >
                                        <p className="text-3xl text-fuchsia-300 font-cinzel mb-2">{x.icon}</p>
                                        <p className="font-cinzel text-[10px] uppercase tracking-widest text-neutral-200">
                                            {language === 'FR' ? x.fr : x.en}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        }
                    />
                );
            case 'WELCOME':
            default:
                // Restore the original per-theme signature hero on first
                // arrival. Each theme keeps its visual identity intact.
                return <WelcomeHero theme={theme} language={language} />;
            case 'COLLABORATE':
            case 'READS':
            case 'MARKET':
            case 'STORE':
            case 'HOT_SEAT':
            case 'CHAT':
                return (
                    <SimpleBlock
                        theme={theme}
                        title={t(meta.titleEn, meta.titleFr)}
                        subtitle={t(meta.subtitleEn, meta.subtitleFr)}
                    />
                );
        }
    };

    const effectiveHeight = collapsed ? 56 : height;

    return (
        <div
            className="relative w-full overflow-hidden"
            style={{
                height: `${effectiveHeight}px`,
                transition: dragging ? 'none' : 'height 280ms cubic-bezier(0.2, 0.7, 0.3, 1)',
            }}
        >
            {/* Aurora backdrop — slow drifting radial blobs in the tab's accent
                colours. Persists across tab changes for continuity, but the
                colours animate when the tab key changes. */}
            <div aria-hidden className="absolute inset-0 pointer-events-none">
                <div
                    key={`aurora-a-${ctx.tab}`}
                    className="viewer-aurora-a absolute inset-[-10%]"
                    style={{
                        background: `radial-gradient(40% 50% at 30% 35%, ${meta.fromColor}66, transparent 70%)`,
                        filter: 'blur(80px)',
                        mixBlendMode: 'screen',
                    }}
                />
                <div
                    key={`aurora-b-${ctx.tab}`}
                    className="viewer-aurora-b absolute inset-[-10%]"
                    style={{
                        background: `radial-gradient(45% 50% at 70% 70%, ${meta.toColor}66, transparent 70%)`,
                        filter: 'blur(90px)',
                        mixBlendMode: 'screen',
                    }}
                />
                <div
                    key={`aurora-c-${ctx.tab}`}
                    className="viewer-aurora-c absolute inset-[-10%]"
                    style={{
                        background: `radial-gradient(35% 40% at 50% 50%, ${meta.glowColor}33, transparent 70%)`,
                        filter: 'blur(100px)',
                        mixBlendMode: 'screen',
                    }}
                />
                {/* Top edge highlight + bottom edge fade for depth. The
                    bottom fade is suppressed while the Inspirosphere is open
                    so the orb's aurora can flow into the controls below
                    without a visible horizon line. */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                {!ctx.inspirosphereActive && (
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#050505] to-transparent" />
                )}
            </div>

            {/* Per-transition theatrics — only after the user has navigated.
                The first arrival shows the pure original brand hero without
                competing flash effects so the neon-text power-up + per-theme
                signature reads as designed. */}
            {!collapsed && showFx && (
                <div key={`fx-${ctx.tab}`} className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="viewer-sweep absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 65%, transparent 100%)',
                        }}
                    />
                    <div
                        className="viewer-sweep-secondary absolute inset-0"
                        style={{
                            background: `linear-gradient(110deg, transparent 0%, ${meta.glowColor}55 50%, transparent 100%)`,
                            mixBlendMode: 'screen',
                        }}
                    />
                    <ParticleField />
                </div>
            )}

            {/* Body — keyed so React remounts and the entry animation fires.
                viewer-body fade only runs after the first navigation; the
                initial WELCOME render stays static so the inner brand can
                animate uninterrupted. */}
            {!collapsed && (
                <div
                    key={`body-${ctx.tab}`}
                    className={`absolute inset-0 flex items-center justify-center px-8 md:px-16 pb-10 pt-8 ${showFx ? 'viewer-body' : ''}`}
                >
                    {renderBody()}
                </div>
            )}

            {/* Header bar — visible always (even collapsed). Shows the tab name
                + collapse/restore toggle. */}
            <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-5 py-3 z-20">
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: meta.glowColor, boxShadow: `0 0 12px ${meta.glowColor}` }}
                />
                <span className="font-cinzel text-[10px] uppercase tracking-[0.5em] text-white/70">
                    {ctx.tab === 'TOOLS' && ctx.inspirosphereActive
                        ? (language === 'FR' ? 'Inspirosphère' : 'Inspirosphere')
                        : (language === 'FR' ? meta.titleFr : meta.titleEn)}
                </span>
                <span className="flex-1" />
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    aria-label={collapsed ? t('Expand', 'Étendre') : t('Collapse', 'Réduire')}
                    className="w-7 h-7 rounded border border-white/15 hover:border-white/40 hover:bg-white/5 text-white/70 hover:text-white transition-colors flex items-center justify-center text-xs"
                    title={collapsed ? t('Expand viewer', 'Étendre le viewer') : t('Collapse viewer', 'Réduire le viewer')}
                >
                    {collapsed ? '▾' : '▴'}
                </button>
            </div>

            {/* Drag handle — bottom edge. Visible affordance with a 8px hit
                area; hover state for discoverability. */}
            {!collapsed && (
                <div
                    onPointerDown={startDrag}
                    role="separator"
                    aria-orientation="horizontal"
                    className={`absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-30 group ${
                        dragging ? 'bg-fuchsia-400/40' : 'hover:bg-white/10'
                    } transition-colors`}
                >
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-12 h-0.5 bg-white/30 group-hover:bg-white/70 transition-colors rounded-full" />
                </div>
            )}

            {/* Local styles — animations + per-element entry timings. */}
            <style>{`
                .viewer-body {
                    animation: viewerEnter 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
                }
                @keyframes viewerEnter {
                    0% { opacity: 0; transform: translateY(14px); filter: blur(6px); }
                    60% { opacity: 1; filter: blur(0); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }

                .viewer-title {
                    animation: viewerTitle 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
                    text-shadow: 0 4px 30px rgba(0,0,0,0.7);
                }
                @keyframes viewerTitle {
                    0% { letter-spacing: 0.45em; opacity: 0; transform: scale(1.04); }
                    50% { opacity: 1; }
                    100% { letter-spacing: 0.005em; opacity: 1; transform: scale(1); }
                }

                .viewer-sweep {
                    animation: viewerSweep 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
                    transform-origin: center;
                }
                @keyframes viewerSweep {
                    0%   { transform: translateX(-110%); opacity: 0; }
                    20%  { opacity: 1; }
                    100% { transform: translateX(110%); opacity: 0; }
                }
                .viewer-sweep-secondary {
                    animation: viewerSweepDelayed 1400ms cubic-bezier(0.2, 0.7, 0.3, 1) 120ms both;
                }
                @keyframes viewerSweepDelayed {
                    0%   { transform: translateX(-130%); opacity: 0; }
                    25%  { opacity: 1; }
                    100% { transform: translateX(130%); opacity: 0; }
                }

                .viewer-particle {
                    position: absolute;
                    border-radius: 9999px;
                    background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 70%);
                    box-shadow: 0 0 8px rgba(255,255,255,0.6);
                    animation-name: viewerParticle;
                    animation-fill-mode: forwards;
                    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
                    pointer-events: none;
                }
                @keyframes viewerParticle {
                    0%   { opacity: 0; transform: translateY(20px) scale(0); }
                    20%  { opacity: 1; transform: translateY(0) scale(1); }
                    100% { opacity: 0; transform: translateY(var(--drift, -20px)) scale(0.35); }
                }

                .viewer-aurora-a { animation: auroraA 14s ease-in-out infinite alternate; }
                .viewer-aurora-b { animation: auroraB 18s ease-in-out infinite alternate; }
                .viewer-aurora-c { animation: auroraC 22s ease-in-out infinite alternate; }
                @keyframes auroraA {
                    0% { transform: translate(-3%, -2%) scale(1.05); opacity: 0.55; }
                    100% { transform: translate(2%, 3%) scale(1.12); opacity: 0.8; }
                }
                @keyframes auroraB {
                    0% { transform: translate(2%, 3%) scale(1.08); opacity: 0.5; }
                    100% { transform: translate(-2%, -3%) scale(1.15); opacity: 0.75; }
                }
                @keyframes auroraC {
                    0% { transform: translate(0%, 1%) scale(1); opacity: 0.4; }
                    100% { transform: translate(0%, -2%) scale(1.1); opacity: 0.65; }
                }

                .viewer-orb {
                    animation: orbBreathe 6s ease-in-out infinite alternate;
                }
                @keyframes orbBreathe {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.02); }
                }

                .viewer-roster-card {
                    animation: cardEnter 900ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
                }
                @keyframes cardEnter {
                    0% { opacity: 0; transform: translateY(20px); filter: blur(4px); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }

                .welcome-line {
                    animation: welcomeLine 1100ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
                }
                @keyframes welcomeLine {
                    0%   { opacity: 0; transform: translateY(20px); filter: blur(8px); }
                    50%  { opacity: 1; filter: blur(0); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }

                @media (prefers-reduced-motion: reduce) {
                    .viewer-body, .viewer-title, .viewer-sweep, .viewer-sweep-secondary,
                    .viewer-particle, .viewer-aurora-a, .viewer-aurora-b, .viewer-aurora-c,
                    .viewer-orb, .viewer-roster-card, .welcome-line { animation: none !important; }
                }
            `}</style>
        </div>
    );
};
