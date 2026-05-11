
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArtistHub } from './ArtistHub';
import { StudioContextViewer, type ViewerContext, type ViewerTab } from './StudioContextViewer';
import { LoadingOrb } from './LoadingOrb';
import { WelcomeWizard } from './WelcomeWizard';
import { getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';

export type CreatorTheme = 'RAINBOW' | 'RED' | 'BLUE_PUNK' | 'CLASSY' | 'CHROMATIC' | 'COMIC';
export type HubPhase = 'GATEWAY' | 'CHAMPION_SELECT' | 'LOBBY';

/**
 * Minimal user shape consumed by the studio. Kept structural (no firebase dep
 * inside @inconnus/ui) so the consuming app passes whatever auth library it
 * uses — Firebase Auth's User satisfies this naturally.
 */
export interface CreatorStudioUser {
    uid: string;
    email: string | null;
    displayName?: string | null;
    photoURL?: string | null;
}

interface CreatorStudioProps {
    language: 'EN' | 'FR';
    /** Currently authenticated user, or null when anonymous. */
    currentUser?: CreatorStudioUser | null;
    /**
     * True when this user has been promoted to "curated artist" by an admin
     * (members/{uid}/admin/flags.isArtist). Gates publish actions in Reads,
     * Hot Seat, and the public artist-profile route.
     */
    isArtist?: boolean;
    /**
     * Called when an anonymous visitor clicks "Sign in" on the gate. Consumer
     * is expected to open its own auth modal — once auth completes and
     * currentUser flips, the gate closes itself.
     */
    onRequestSignIn?: () => void;
    /** Optional "exit" action shown on the gate (e.g. back to the inn site). */
    onExit?: () => void;
}

export const CreatorStudio: React.FC<CreatorStudioProps> = ({ language: parentLanguage, currentUser = null, isArtist = false, onRequestSignIn, onExit }) => {
     // "View as visitor" — a logged-out user can opt into a limited browse
     // experience (no profile editing, no publish actions). Reset whenever
     // currentUser flips so the gate isn't stuck after sign-out.
     // ALL HOOKS LIVE AT THE TOP — the gate is rendered as a conditional
     // return at the END of this component so hook count stays stable
     // across auth flips (avoids React's "hooks order changed" error).
     const [asVisitor, setAsVisitor] = useState(false);
     React.useEffect(() => {
         if (currentUser) setAsVisitor(false);
     }, [currentUser?.uid]);

     // Loading orb splash — shown on first mount of the Creator Studio so the
     // section change reads as deliberate (logo in glass orb + neon sweep).
     // Only appears once per page-load; if the parent unmounts and remounts
     // the studio, the splash plays again.
     const [showLoadingOrb, setShowLoadingOrb] = useState(true);

     // Per-studio language override. Seeds from the parent prop, then sticks
     // to whatever the user picks via the in-studio toggle. Persisted to
     // localStorage so the choice survives reloads even before sign-in.
     const [language, setLanguage] = useState<'EN' | 'FR'>(() => {
         if (typeof window === 'undefined') return parentLanguage;
         const saved = localStorage.getItem('studioLanguage');
         return (saved === 'EN' || saved === 'FR') ? saved : parentLanguage;
     });
     useEffect(() => {
         if (typeof window !== 'undefined') localStorage.setItem('studioLanguage', language);
     }, [language]);
     const toggleLanguage = () => setLanguage(prev => prev === 'EN' ? 'FR' : 'EN');

     const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

     // Defaulting to NEON ARCADE (RAINBOW) as requested
     const [theme, setTheme] = useState<CreatorTheme>('RAINBOW');

     // Lifted state for Navigation control - Default to LOBBY for Member Mode
     const [hubPhase, setHubPhase] = useState<HubPhase>('LOBBY');

     // Contextual viewer (top half) — receives the active tab + a profile
     // snapshot from ArtistHub via onContextChange. Default WELCOME state
     // shows brand chrome until the user picks a tab. Height defaults to
     // 60% of the viewport so the original brand hero has breathing room.
     const [viewerCtx, setViewerCtx] = useState<ViewerContext>({ tab: 'WELCOME' });
     const [viewerHeight, setViewerHeight] = useState<number>(() =>
        typeof window !== 'undefined'
            ? Math.max(480, Math.min(720, Math.round(window.innerHeight * 0.6)))
            : 560,
     );
     const [viewerCollapsed, setViewerCollapsed] = useState<boolean>(false);

     // When the Inspirosphere opens, grow the viewer (if it's smaller) so the
     // orb has room to breathe. We don't shrink it back on close — the user's
     // manual resize after that is theirs to keep. Only kicks in on the
     // false→true edge, so re-opening (or HMR) doesn't repeatedly fight the
     // user's drag.
     const insphWasActive = useRef(false);
     useEffect(() => {
        const active = viewerCtx.inspirosphereActive === true;
        if (active && !insphWasActive.current) {
            const target = typeof window !== 'undefined'
                ? Math.min(window.innerHeight * 0.85, 820)
                : 780;
            setViewerHeight(h => Math.max(h, target));
            if (viewerCollapsed) setViewerCollapsed(false);
        }
        insphWasActive.current = active;
     }, [viewerCtx.inspirosphereActive, viewerCollapsed]);

     // First-login wizard — shown when the user has never completed it.
     // null = we haven't checked yet (treat as 'don't show'); false = doc
     // exists with onboardingV1Completed=true; true = wizard should show.
     // Checked alongside the theme load to save a Firestore round trip.
     const [onboardingNeeded, setOnboardingNeeded] = useState<boolean>(false);

     // Persist theme + load on sign-in. Writes go to
     // members/{uid}/artistProfile/profile.activeTheme so both the user (on
     // reload) and visiting members (PublicProfilePage) read the same value.
     useEffect(() => {
         if (!currentUser?.uid) return;
         (async () => {
             try {
                 const db = getFirestore(getApp());
                 const snap = await getDoc(doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'));
                 if (snap.exists()) {
                     const data = snap.data() as any;
                     const t = data.activeTheme as CreatorTheme | undefined;
                     if (t && ['RAINBOW', 'RED', 'BLUE_PUNK', 'CLASSY', 'CHROMATIC', 'COMIC'].includes(t)) {
                         setTheme(t);
                     }
                     setOnboardingNeeded(data.onboardingV1Completed !== true);
                 } else {
                     // No artistProfile doc at all → fresh user, run wizard.
                     setOnboardingNeeded(true);
                 }
             } catch { /* fall back to default */ }
         })();
     }, [currentUser?.uid]);

     const persistTheme = async (next: CreatorTheme) => {
         setTheme(next);
         if (!currentUser?.uid) return;
         try {
             const db = getFirestore(getApp());
             await setDoc(
                 doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                 { activeTheme: next, updatedAt: serverTimestamp() },
                 { merge: true },
             );
         } catch { /* non-fatal — local state still updates */ }
     };

     const cycleTheme = () => {
         // Updated Order: Neon -> Riot -> Prism -> System -> Classy -> Comic
         const themes: CreatorTheme[] = ['RAINBOW', 'RED', 'CHROMATIC', 'BLUE_PUNK', 'CLASSY', 'COMIC'];
         const currentIndex = themes.indexOf(theme);
         const nextIndex = (currentIndex + 1) % themes.length;
         persistTheme(themes[nextIndex]);
     };

     const handleBack = () => {
         if (hubPhase !== 'GATEWAY') {
             setHubPhase('GATEWAY');
         } else {
             window.history.back();
         }
     };

     // Sign out — firebase Auth instance is shared with the rest of the app
     // so the studio's currentUser flips to null on success and the gate
     // re-appears. Wrapped in try/catch since signOut can throw on stale
     // tokens (e.g. when the network is flaky); we surface nothing in that
     // case because the user has no recourse — they'll retry naturally.
     const handleLogout = async () => {
         try { await signOut(getAuth(getApp())); } catch { /* non-fatal */ }
     };

     // Theme Names Mapping
     const themeNames: Record<CreatorTheme, string> = {
        RAINBOW: language === 'EN' ? "NEON ARCADE" : "ARCADE NÉON",
        RED: language === 'EN' ? "RIOT PROTOCOL" : "PROTOCOLE ÉMEUTE",
        BLUE_PUNK: language === 'EN' ? "SYSTEM FAILURE" : "ERREUR SYSTÈME",
        CLASSY: language === 'EN' ? "GILDED AGE" : "ÂGE D'OR",
        CHROMATIC: language === 'EN' ? "PRISM FLOW" : "FLUX PRISME",
        COMIC: "KNOCKOUT"
     };

     // Theme Configuration Object
     const themeStyles = useMemo(() => {
         switch(theme) {
             case 'RED':
                 return {
                     bg: 'bg-black',
                     text: 'text-white font-sans',
                     highlight: 'text-red-600',
                     border: 'border-red-600/30',
                     card: 'bg-[#0a0000] border-red-900/50 hover:border-red-600 font-sans border-2',
                     gridItem: (item: any) => ({ bg: 'bg-[#1a0505]', text: 'text-white border-none', rotate: 'rotate-0' }),
                     overlay: 'bg-gradient-to-tr from-black via-transparent to-red-900/30 opacity-60'
                 };
             case 'BLUE_PUNK':
                 return {
                     bg: 'bg-[#050308]',
                     text: 'text-cyan-50 font-mono',
                     highlight: 'text-cyan-400',
                     border: 'border-cyan-500/50',
                     card: 'bg-[#120a1f] border-fuchsia-500 hover:border-cyan-400 hover:-rotate-1 transition-transform border',
                     gridItem: (item: any) => ({ bg: 'bg-slate-900', text: 'text-cyan-300 font-mono', rotate: ['rotate-1', '-rotate-2', 'rotate-3', '-rotate-1'][item.id % 4] }),
                     overlay: 'bg-[linear-gradient(45deg,#130026_25%,transparent_25%,transparent_75%,#130026_75%,#130026),linear-gradient(45deg,#130026_25%,transparent_25%,transparent_75%,#130026_75%,#130026)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20'
                 };
             case 'CLASSY':
                 // League / Hextech Inspired
                 return {
                     bg: 'bg-[#010a13]',
                     text: 'text-[#f0e6d2] font-cinzel',
                     highlight: 'text-[#c8aa6e]',
                     border: 'border-[#c8aa6e]/40',
                     card: 'bg-[#091428] border-[#c8aa6e] hover:border-[#f0e6d2] shadow-xl border-2',
                     gridItem: (item: any) => ({ bg: 'bg-[#0a1428]', text: 'text-[#cdbe91] font-cinzel', rotate: 'rotate-0' }),
                     overlay: 'bg-[radial-gradient(circle_at_center,_rgba(200,170,110,0.15),_transparent_80%)]'
                 };
             case 'CHROMATIC':
                 return {
                     bg: 'bg-[#030005]',
                     text: 'text-white font-sans',
                     highlight: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400',
                     border: 'border-blue-500/30',
                     card: 'bg-white/5 border border-white/10 rounded-xl hover:border-purple-500/50 transition-all duration-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] group',
                     gridItem: (item: any) => ({ bg: 'bg-black/40 backdrop-blur-md', text: 'text-white', rotate: 'rotate-0' }),
                     overlay: 'bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.15),_transparent_70%)]'
                 };
             case 'COMIC':
                 // 2XKO / Borderlands Inspired - RETHOUGHT
                 return {
                     bg: 'bg-[#121214]', // Dark Zinc
                     text: 'text-white font-sans font-black italic tracking-tight',
                     highlight: 'text-[#facc15] drop-shadow-[2px_2px_0px_#000]',
                     // Pop Art Borders: Thick Black + Vibrant Shadow
                     border: 'border-2 border-black shadow-[4px_4px_0px_#facc15]', 
                     // Card: Dark background, Black border, Red hard shadow
                     card: 'bg-[#1e1e24] border-2 border-black shadow-[6px_6px_0px_#ef4444] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_#ef4444] hover:bg-[#25252b] transition-all',
                     gridItem: (item: any) => ({ bg: 'bg-[#1e1e24]', text: 'text-white italic', rotate: 'rotate-1' }),
                     overlay: 'bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:20px_20px] opacity-10' // Dot pattern
                 };
             case 'RAINBOW':
             default:
                 return {
                     bg: 'bg-[#050505]',
                     text: 'text-white font-sans',
                     highlight: 'text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300 italic', 
                     border: 'border-white/20',
                     card: 'bg-transparent border-transparent', 
                     gridItem: (item: any) => item,
                     overlay: 'bg-gradient-to-br from-fuchsia-900/10 to-cyan-900/10'
                 };
         }
     }, [theme]);

     // Colors for chroma wheel icon
     const getChromaIconStyle = (t: CreatorTheme) => {
        switch(t) {
            case 'RED': return 'text-red-500 hover:text-white drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]';
            case 'BLUE_PUNK': return 'text-cyan-400 hover:text-fuchsia-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]';
            case 'CLASSY': return 'text-[#c8aa6e] hover:text-[#f0e6d2] drop-shadow-[0_0_8px_rgba(200,170,110,0.8)]';
            case 'CHROMATIC': return 'text-blue-400 hover:text-yellow-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]';
            case 'COMIC': return 'text-yellow-400 hover:text-white drop-shadow-[2px_2px_0px_#000]';
            default: return 'text-fuchsia-400 hover:text-cyan-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.8)]'; // Rainbow
        }
    };

    // Render the SVG icon based on theme
    const renderThemeIcon = (t: CreatorTheme) => {
        if (t === 'RED') {
             return (
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" />
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                 </svg>
             );
        }
        if (t === 'BLUE_PUNK') {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="square" strokeLinejoin="miter" d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" />
                </svg>
            );
        }
        if (t === 'COMIC') {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
            );
        }
        // Default Circle/Target
        return (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="0.5" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" className="opacity-50" />
            </svg>
        );
    };

     // Gate — runs AFTER all hooks so the hook count stays stable across
     // auth flips. Anonymous visitors who haven't opted into "view as
     // visitor" mode see this card; everyone else falls through to the
     // full studio.
     if (!currentUser && !asVisitor) {
         return (
             <div className="fixed inset-0 z-50 bg-[#050505] text-neutral-100 font-lato flex items-center justify-center p-6 overflow-hidden">
                 <div aria-hidden className="absolute inset-0 pointer-events-none opacity-40">
                     <div
                         className="absolute inset-0"
                         style={{
                             background:
                                 'conic-gradient(from 200deg at 70% 30%, rgba(217,70,239,0.22), rgba(34,211,238,0.18), rgba(253,224,71,0.14), rgba(168,85,247,0.22))',
                             filter: 'blur(110px) saturate(1.2)',
                         }}
                     />
                 </div>

                 <div className="relative z-10 w-full max-w-md text-center">
                     <p className="font-cinzel text-fuchsia-300 text-[10px] uppercase tracking-[0.5em] mb-3">
                         Le Salon des Inconnus
                     </p>
                     <h1 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3 leading-tight">
                         {t('Creator Studio', 'Studio des Créateurs')}
                     </h1>
                     <p className="font-lato text-neutral-400 text-sm leading-relaxed mb-10">
                         {t(
                             "A workspace for artists in residency, performers, and collaborators. Sign in to build your profile, publish writings, and request to be featured across our spaces.",
                             "Un espace de travail pour les artistes en résidence, les interprètes et les collaborateur·rice·s. Connectez-vous pour bâtir votre profil, publier vos écrits, et demander à être mis·e en avant dans nos espaces.",
                         )}
                     </p>

                     <div className="space-y-3">
                         <button
                             onClick={onRequestSignIn}
                             className="w-full py-4 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-xs uppercase tracking-[0.35em] hover:bg-[#d4b06a] hover:scale-[1.01] transition-all"
                             style={{ boxShadow: '0 6px 24px rgba(197,160,89,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}
                         >
                             {t('Sign in', 'Se connecter')}
                         </button>
                         <p className="text-[9px] font-cinzel uppercase tracking-[0.3em] text-neutral-600 py-1">
                             {t('Google · Email · Phone', 'Google · Courriel · Téléphone')}
                         </p>
                     </div>

                     <div className="flex items-center gap-3 my-8 text-neutral-700">
                         <span className="flex-1 h-px bg-white/10" />
                         <span className="text-[9px] font-cinzel uppercase tracking-[0.4em]">
                             {t('or', 'ou')}
                         </span>
                         <span className="flex-1 h-px bg-white/10" />
                     </div>

                     <button
                         onClick={() => setAsVisitor(true)}
                         className="w-full py-3 border border-white/15 text-neutral-300 hover:text-[#f3e5ab] hover:border-[#c5a059]/50 font-cinzel text-[11px] uppercase tracking-[0.3em] transition-colors"
                     >
                         {t('View as visitor', 'Voir comme visiteur')}
                     </button>
                     <p className="text-[10px] text-neutral-600 mt-3 font-lato leading-relaxed">
                         {t(
                             "Browse the studio with limited access. Profile, publish, and curated tools require an account.",
                             "Parcourir le studio avec un accès limité. Profil, publication et outils réservés nécessitent un compte.",
                         )}
                     </p>

                     {onExit && (
                         <button
                             onClick={onExit}
                             className="mt-10 font-cinzel text-[10px] uppercase tracking-[0.4em] text-neutral-700 hover:text-neutral-400 transition-colors"
                         >
                             ↗ {t('Back to the inn', "Retour à l'auberge")}
                         </button>
                     )}
                 </div>
             </div>
         );
     }

     return (
        // Self-managed scroll: the inn's App.tsx wraps every view in a fixed
        // h-screen overflow-hidden container, so any page that's taller than
        // the viewport (this one — viewer + hub) needs its own scrollable
        // area. h-screen + overflow-y-auto turns this div into the studio's
        // own scroll context.
        <div data-studio-theme={theme} className={`h-screen w-full relative overflow-x-hidden overflow-y-auto transition-colors duration-700 ${themeStyles.bg} ${themeStyles.text}`}>

             {/* First-login wizard. Sits above everything (z-9000) and
                 prevents interaction with the studio chrome until done. The
                 user can persist progress between sessions — refreshing
                 keeps them at the same step. */}
             {currentUser && onboardingNeeded && !showLoadingOrb && (
                 <WelcomeWizard
                     uid={currentUser.uid}
                     initialEmail={currentUser.email}
                     initialName={currentUser.displayName ?? null}
                     language={language}
                     onComplete={() => setOnboardingNeeded(false)}
                 />
             )}

             {/* Section-change orb. Plays once on first mount of the studio,
                 then unmounts itself. Reuse this same component (with a
                 different label) on the Inn↔Studio↔Auberge transitions. */}
             {showLoadingOrb && (
                 <LoadingOrb
                     label={t('STUDIO', 'STUDIO')}
                     onDone={() => setShowLoadingOrb(false)}
                 />
             )}

             {/* Background Overlay */}
             <div className={`fixed inset-0 z-0 pointer-events-none transition-all duration-1000 ${themeStyles.overlay}`}>
                 {theme === 'RAINBOW' && (
                    <>
                        {/* Purple/Pink Top Left */}
                        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                        
                        {/* Green Bottom Left - Added as requested */}
                        <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '7s' }} />
                        
                        {/* Blue Top Right - Added as requested */}
                        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
                        
                        {/* Cyan Bottom Right */}
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                        
                        {/* Texture */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                    </>
                 )}
                 {theme === 'CHROMATIC' && (
                    <>
                        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
                        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-[0.03]"></div>
                    </>
                 )}
             </div>

             {/* Header (Contains Logo) */}
             <header className="fixed top-0 w-full z-40 bg-transparent pointer-events-none">
                {/* Changed to w-full and flex with gap to position far left */}
                <div className="w-full px-6 py-4 flex items-center gap-6 pointer-events-auto">
                    
                    {/* Previous Arrow Button */}
                    <button 
                        className={`group flex items-center justify-center w-10 h-10 rounded-full border ${themeStyles.border} bg-black/20 hover:bg-white/10 transition-all backdrop-blur-md`}
                        onClick={handleBack}
                        title="Go Back"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${theme === 'CLASSY' ? 'text-[#c8aa6e]' : 'text-white'} group-hover:-translate-x-0.5 transition-transform`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>

                    <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                        <img src="https://i.imgur.com/B1YfPqn.png" alt="Logo" className="w-12 h-auto drop-shadow-lg" />
                        <span className={`font-cinzel font-bold text-lg tracking-widest hidden md:block ${theme === 'CLASSY' ? 'text-[#c8aa6e]' : 'text-white'}`}>Le Salon des Inconnus</span>
                    </div>
                </div>
             </header>

             {/* GLOBAL THEME + LANGUAGE SWITCHERS (Fixed Position) */}
             <div className="fixed top-24 right-6 md:right-12 z-50 flex flex-col items-end gap-3">
                {/* Language toggle — sits above the theme cycle so both feel
                    like sibling chrome controls. Persists per-user via
                    localStorage so the choice survives reloads. */}
                <button
                    onClick={toggleLanguage}
                    title={language === 'EN' ? 'Switch to French' : 'Passer à l\'anglais'}
                    aria-label={language === 'EN' ? 'Switch to French' : 'Passer à l\'anglais'}
                    className={`group/lang flex items-center gap-2 px-3 py-1.5 rounded-full border ${themeStyles.border} bg-black/40 backdrop-blur-md hover:bg-white/5 transition-all`}
                >
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${language === 'EN' ? themeStyles.highlight : 'text-neutral-500'}`}>EN</span>
                    <span className="w-px h-3 bg-white/20" />
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${language === 'FR' ? themeStyles.highlight : 'text-neutral-500'}`}>FR</span>
                </button>

                {/* Theme cycle */}
                <div className="flex flex-col items-end group">
                    <button
                        onClick={cycleTheme}
                        className={`transition-transform duration-500 mb-2 ${getChromaIconStyle(theme)} group-hover:rotate-90`}
                        title={t('Cycle Theme', 'Changer de thème')}
                    >
                        {renderThemeIcon(theme)}
                    </button>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 opacity-0 transform -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 ${themeStyles.highlight}`}>
                        {themeNames[theme]}
                    </span>
                </div>

                {/* Logout — sibling of language/theme. Only rendered when the
                    user is actually signed in (the gate handles the
                    !currentUser case earlier in the component). */}
                {currentUser && (
                    <button
                        onClick={handleLogout}
                        title={t('Sign out', 'Se déconnecter')}
                        aria-label={t('Sign out', 'Se déconnecter')}
                        className={`group/logout flex items-center gap-2 px-3 py-1.5 rounded-full border ${themeStyles.border} bg-black/40 backdrop-blur-md hover:bg-rose-500/10 hover:border-rose-400/50 transition-all`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-4 h-4 text-neutral-400 group-hover/logout:text-rose-300 transition-colors`}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 group-hover/logout:text-rose-300 transition-colors hidden sm:inline">
                            {t('Sign out', 'Déco')}
                        </span>
                    </button>
                )}
             </div>

             {/* Contextual viewer — replaces the static "CREATOR STUDIO" hero
                 across all themes. Drives off the active tab from ArtistHub.
                 Per-theme hero copy moves into the WELCOME state of the
                 viewer's metadata so the brand still reads loudly on first
                 load. Resizable + collapsible like a Premiere Pro panel. */}
             <div className="relative z-10 w-full pt-16">
                 <StudioContextViewer
                     ctx={viewerCtx}
                     height={viewerHeight}
                     setHeight={setViewerHeight}
                     collapsed={viewerCollapsed}
                     setCollapsed={setViewerCollapsed}
                     language={language}
                     theme={theme}
                     uid={currentUser?.uid ?? null}
                 />
             </div>

             {/* Content Wrapper - REMOVED MAX WIDTH to allow Hub to take over */}
             <div className={`relative z-10 w-full px-0 pb-0 animate-fadeIn`}>

                 {/* Main Hub (Includes Gateway or Dashboard) */}
                 <ArtistHub
                    theme={theme}
                    themeStyles={themeStyles}
                    phase={hubPhase}
                    setPhase={setHubPhase}
                    language={language}
                    currentUser={currentUser}
                    isArtist={isArtist}
                    onRequestSignIn={onRequestSignIn}
                    onExit={onExit}
                    onThemeChange={persistTheme}
                    onContextChange={(ctx) => {
                        // Translate ArtistHub's internal Tab union into the viewer's
                        // ViewerTab union (they share names; cast is safe).
                        setViewerCtx({
                            tab: ctx.tab as ViewerTab,
                            regData: ctx.regData,
                            avatarUrl: ctx.avatarUrl,
                            isArtist: ctx.isArtist,
                            membershipTier: ctx.membershipTier,
                            accessLevel: currentUser ? 'MEMBER' : 'GUEST',
                            inspirosphereActive: ctx.inspirosphereActive ?? false,
                        });
                    }}
                 />

             </div>
             
             <style>{`
                 /* Theme fonts — loaded once for the whole studio. Each theme
                    below repurposes a subset; the @import lives here so we
                    don't ship them on inn pages that never open the studio. */
                 @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Anton&family=Inter:wght@300;400;600;700&family=Space+Grotesk:wght@400;500;700&family=VT323&family=Share+Tech+Mono&family=Bangers&family=Permanent+Marker&display=swap');

                 /* ── Per-theme typography. Forces every common font utility
                    (font-cinzel, font-prata, font-sans, font-lato, font-serif,
                    font-mono) to a theme-specific stack so each theme reads
                    as a distinct visual language end-to-end, not just a
                    color shift. ── */

                 /* RAINBOW (default) — keeps Cinzel display + Lato body. */
                 [data-studio-theme="RAINBOW"] .font-cinzel,
                 [data-studio-theme="RAINBOW"] .font-prata { font-family: 'Cinzel', 'Times New Roman', serif !important; letter-spacing: 0.04em; }
                 [data-studio-theme="RAINBOW"] .font-sans,
                 [data-studio-theme="RAINBOW"] .font-lato { font-family: 'Lato', system-ui, sans-serif !important; }
                 [data-studio-theme="RAINBOW"] .font-serif { font-family: 'Cinzel', serif !important; }

                 /* RED — Riot Protocol: Anton headlines + Inter body. */
                 [data-studio-theme="RED"] .font-cinzel,
                 [data-studio-theme="RED"] .font-prata { font-family: 'Anton', 'Bebas Neue', Impact, sans-serif !important; letter-spacing: 0.03em; font-weight: 400 !important; text-transform: uppercase; }
                 [data-studio-theme="RED"] .font-sans,
                 [data-studio-theme="RED"] .font-lato,
                 [data-studio-theme="RED"] .font-serif,
                 [data-studio-theme="RED"] .font-mono { font-family: 'Inter', system-ui, sans-serif !important; letter-spacing: 0.01em; }

                 /* BLUE_PUNK — System Failure: terminal everywhere. */
                 [data-studio-theme="BLUE_PUNK"] .font-cinzel,
                 [data-studio-theme="BLUE_PUNK"] .font-prata,
                 [data-studio-theme="BLUE_PUNK"] .font-sans,
                 [data-studio-theme="BLUE_PUNK"] .font-lato,
                 [data-studio-theme="BLUE_PUNK"] .font-serif,
                 [data-studio-theme="BLUE_PUNK"] .font-mono { font-family: 'VT323', 'Share Tech Mono', ui-monospace, monospace !important; letter-spacing: 0.02em; }
                 [data-studio-theme="BLUE_PUNK"] h1,
                 [data-studio-theme="BLUE_PUNK"] h2 { text-shadow: 0 0 12px rgba(34, 211, 238, 0.45); }

                 /* CHROMATIC — Prism Flow: modern grotesk + clean sans. */
                 [data-studio-theme="CHROMATIC"] .font-cinzel,
                 [data-studio-theme="CHROMATIC"] .font-prata { font-family: 'Space Grotesk', system-ui, sans-serif !important; letter-spacing: -0.015em; font-weight: 600 !important; text-transform: none; }
                 [data-studio-theme="CHROMATIC"] .font-sans,
                 [data-studio-theme="CHROMATIC"] .font-lato,
                 [data-studio-theme="CHROMATIC"] .font-serif,
                 [data-studio-theme="CHROMATIC"] .font-mono { font-family: 'Inter', system-ui, sans-serif !important; }

                 /* CLASSY — Gilded Age: serif everywhere. */
                 [data-studio-theme="CLASSY"] .font-cinzel,
                 [data-studio-theme="CLASSY"] .font-prata { font-family: 'Cinzel', 'Trajan Pro', serif !important; letter-spacing: 0.06em; }
                 [data-studio-theme="CLASSY"] .font-sans,
                 [data-studio-theme="CLASSY"] .font-lato { font-family: 'Cormorant Garamond', 'EB Garamond', Georgia, serif !important; letter-spacing: 0.01em; }
                 [data-studio-theme="CLASSY"] .font-serif { font-family: 'Cormorant Garamond', serif !important; }
                 [data-studio-theme="CLASSY"] .font-mono { font-family: 'Cormorant Garamond', serif !important; font-style: italic; }

                 /* COMIC — Knockout: comic-book displays + handwritten body. */
                 [data-studio-theme="COMIC"] .font-cinzel,
                 [data-studio-theme="COMIC"] .font-prata { font-family: 'Bangers', 'Anton', Impact, sans-serif !important; letter-spacing: 0.05em; font-weight: 400 !important; }
                 [data-studio-theme="COMIC"] .font-sans,
                 [data-studio-theme="COMIC"] .font-lato,
                 [data-studio-theme="COMIC"] .font-serif,
                 [data-studio-theme="COMIC"] .font-mono { font-family: 'Permanent Marker', 'Bangers', 'Comic Sans MS', cursive !important; }
                 [data-studio-theme="COMIC"] h1,
                 [data-studio-theme="COMIC"] h2 { text-shadow: 3px 3px 0 #000; }

                 /* ── Per-theme accent re-coloring of common heading colors.
                    Targets text-white when paired with a heading font, plus
                    text-neutral-300 body subtitles, so the dominant heading
                    voice carries the theme color identity. ── */
                 [data-studio-theme="RED"] .font-cinzel.text-white,
                 [data-studio-theme="RED"] .font-prata.text-white,
                 [data-studio-theme="RED"] h1.text-white,
                 [data-studio-theme="RED"] h2.text-white { color: #fecaca !important; }
                 [data-studio-theme="RED"] .text-neutral-300,
                 [data-studio-theme="RED"] .text-neutral-400 { color: #fca5a5 !important; }

                 [data-studio-theme="BLUE_PUNK"] .font-cinzel.text-white,
                 [data-studio-theme="BLUE_PUNK"] .font-prata.text-white,
                 [data-studio-theme="BLUE_PUNK"] h1.text-white,
                 [data-studio-theme="BLUE_PUNK"] h2.text-white { color: #67e8f9 !important; }
                 [data-studio-theme="BLUE_PUNK"] .text-neutral-300,
                 [data-studio-theme="BLUE_PUNK"] .text-neutral-400 { color: #a5f3fc !important; }

                 [data-studio-theme="CLASSY"] .font-cinzel.text-white,
                 [data-studio-theme="CLASSY"] .font-prata.text-white,
                 [data-studio-theme="CLASSY"] h1.text-white,
                 [data-studio-theme="CLASSY"] h2.text-white { color: #f3e5ab !important; }
                 [data-studio-theme="CLASSY"] .text-neutral-300,
                 [data-studio-theme="CLASSY"] .text-neutral-400 { color: #cdbe91 !important; }

                 [data-studio-theme="CHROMATIC"] .font-cinzel.text-white,
                 [data-studio-theme="CHROMATIC"] .font-prata.text-white,
                 [data-studio-theme="CHROMATIC"] h1.text-white,
                 [data-studio-theme="CHROMATIC"] h2.text-white {
                     background: linear-gradient(120deg, #a855f7, #3b82f6 45%, #facc15);
                     -webkit-background-clip: text;
                     background-clip: text;
                     color: transparent !important;
                 }

                 [data-studio-theme="COMIC"] .font-cinzel.text-white,
                 [data-studio-theme="COMIC"] .font-prata.text-white,
                 [data-studio-theme="COMIC"] h1.text-white,
                 [data-studio-theme="COMIC"] h2.text-white { color: #facc15 !important; -webkit-text-stroke: 1px #000; }

                 .animate-fadeIn {
                     animation: fadeIn 0.5s ease-out forwards;
                 }
                 @keyframes fadeIn {
                     from { opacity: 0; transform: translateY(20px); }
                     to { opacity: 1; transform: translateY(0); }
                 }
                 
                 /* NEON ANIMATIONS */
                 @keyframes neonPowerUp {
                    0% { opacity: 0; filter: blur(10px); }
                    10% { opacity: 0; }
                    11% { opacity: 1; filter: blur(0px); }
                    12% { opacity: 0; }
                    20% { opacity: 0; }
                    21% { opacity: 1; }
                    25% { opacity: 0.5; }
                    30% { opacity: 1; }
                    35% { opacity: 1; }
                    36% { opacity: 0; }
                    40% { opacity: 1; }
                    100% { opacity: 1; }
                 }

                 @keyframes neonFlicker {
                    0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
                        opacity: 1;
                    }
                    20%, 24%, 55% {
                        opacity: 0.5;
                    }
                 }

                 .neon-text {
                    animation: neonPowerUp 1.5s ease-out forwards;
                 }
                 
                 .group:hover .neon-text {
                    animation: neonFlicker 2s infinite alternate;
                 }
             `}</style>
        </div>
     );
};
