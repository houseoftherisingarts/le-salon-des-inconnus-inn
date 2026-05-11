import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
    getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL,
} from 'firebase/storage';
import type { CreatorTheme } from './CreatorStudioShell';

/**
 * WelcomeWizard
 * ─────────────
 * One-question-per-screen onboarding shown on first sign-in. League-of-
 * Legends-flavoured: light beams sweep across the backdrop, each step
 * slides in from the right with a cinematic timing curve, a soft procedural
 * SFX chime fires at every transition (no audio assets, no licenses).
 *
 * State machine
 *   • A registry of Step objects defines order + required-ness + render fn.
 *   • Forward goes 'right→left' (next slides in from the right). Back is
 *     mirrored. The active step controls its own form value via the
 *     `answers` accumulator; submitting commits it to Firestore + advances.
 *
 * Persistence
 *   • Each commit setDoc({ merge: true }) on members/{uid}/artistProfile/profile,
 *     so a refresh mid-wizard resumes where the user left off.
 *   • Final step sets onboardingV1Completed: true. The shell hides the
 *     wizard whenever that flag is true.
 *
 * SFX
 *   • Pure Web Audio API. Two cues: 'forward' (rising 5th) and 'back'
 *     (falling 5th), plus a single 'complete' chord at finish. Silent when
 *     the user hasn't interacted yet (autoplay policy compliant — the
 *     first click on 'Begin' counts as user activation).
 */

// ─── Theme choices (mirrored from ArtistHub BASE_THEMES) ──────────────────
const THEMES: { key: CreatorTheme; nameEn: string; nameFr: string; swatch: string }[] = [
    { key: 'RAINBOW',   nameEn: 'Neon Arcade',    nameFr: 'Arcade Néon',     swatch: 'linear-gradient(135deg, #d946ef, #22d3ee, #facc15)' },
    { key: 'RED',       nameEn: 'Riot Protocol',  nameFr: 'Protocole Émeute',swatch: 'linear-gradient(135deg, #ef4444, #7f1d1d)' },
    { key: 'CHROMATIC', nameEn: 'Prism Flow',     nameFr: 'Flux Prisme',     swatch: 'linear-gradient(135deg, #a855f7, #3b82f6, #facc15)' },
    { key: 'BLUE_PUNK', nameEn: 'System Failure', nameFr: 'Erreur Système',  swatch: 'linear-gradient(135deg, #22d3ee, #ec4899)' },
    { key: 'CLASSY',    nameEn: 'Gilded Age',     nameFr: "Âge d'Or",        swatch: 'linear-gradient(135deg, #c8aa6e, #1a1208)' },
    { key: 'COMIC',     nameEn: 'Knockout',       nameFr: 'Knockout',        swatch: 'linear-gradient(135deg, #facc15, #ef4444)' },
];

// ─── Studio backdrop (mirrors CreatorStudioShell's per-theme overlay) ─────
// One source of truth per theme: a base background color, an overlay class
// (gradient / pattern), and per-theme animated blobs. The wizard renders
// the same surface as the studio so it reads as the 'first room' of the
// studio, not a separate vestibule. Theme reacts live to answers.theme so
// the picker on Step 10 gives instant feedback.
const STUDIO_BG: Record<CreatorTheme, string> = {
    RAINBOW:   'bg-[#050505]',
    RED:       'bg-black',
    BLUE_PUNK: 'bg-[#050308]',
    CLASSY:    'bg-[#010a13]',
    CHROMATIC: 'bg-[#030005]',
    COMIC:     'bg-[#121214]',
};

const STUDIO_OVERLAY: Record<CreatorTheme, string> = {
    RAINBOW:   'bg-gradient-to-br from-fuchsia-900/10 to-cyan-900/10',
    RED:       'bg-gradient-to-tr from-black via-transparent to-red-900/30 opacity-60',
    BLUE_PUNK: "bg-[linear-gradient(45deg,#130026_25%,transparent_25%,transparent_75%,#130026_75%,#130026),linear-gradient(45deg,#130026_25%,transparent_25%,transparent_75%,#130026_75%,#130026)] bg-[length:20px_20px] bg-[position:0_0,10px_10px] opacity-20",
    CLASSY:    'bg-[radial-gradient(circle_at_center,_rgba(200,170,110,0.15),_transparent_80%)]',
    CHROMATIC: 'bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.15),_transparent_70%)]',
    COMIC:     'bg-[radial-gradient(#444_1px,transparent_1px)] [background-size:20px_20px] opacity-10',
};

const ART_TYPES: { id: string; en: string; fr: string }[] = [
    { id: 'music',         en: 'Music',         fr: 'Musique' },
    { id: 'writing',       en: 'Writing',       fr: 'Écriture' },
    { id: 'visual',        en: 'Visual art',    fr: 'Arts visuels' },
    { id: 'photography',   en: 'Photography',   fr: 'Photographie' },
    { id: 'cinema',        en: 'Cinema',        fr: 'Cinéma' },
    { id: 'performance',   en: 'Performance',   fr: 'Performance' },
    { id: 'craft',         en: 'Craft',         fr: 'Artisanat' },
    { id: 'dance',         en: 'Dance',         fr: 'Danse' },
    { id: 'theatre',       en: 'Theatre',       fr: 'Théâtre' },
    { id: 'illustration',  en: 'Illustration',  fr: 'Illustration' },
];

// ─── Answers shape ────────────────────────────────────────────────────────
interface FavouriteAnswer { value: string; public: boolean; }

interface WelcomeAnswers {
    realName: string;
    displayName: string;
    phone: string;
    email: string;
    artTypes: string[];
    /** Free-form URLs. Service is detected from each URL at render time so
     *  the same store flows to the public profile's 'Social Links' row. */
    links: string[];
    favourites: {
        music: FavouriteAnswer;
        book:  FavouriteAnswer;
        show:  FavouriteAnswer;
    };
    theme: CreatorTheme;
    firstWorkUrl?: string;
}

const DEFAULT_ANSWERS: WelcomeAnswers = {
    realName: '',
    displayName: '',
    phone: '',
    email: '',
    artTypes: [],
    links: [],
    favourites: {
        music: { value: '', public: true },
        book:  { value: '', public: true },
        show:  { value: '', public: true },
    },
    theme: 'RAINBOW',
};

// ─── Component ────────────────────────────────────────────────────────────
interface Props {
    uid: string;
    initialEmail?: string | null;
    initialName?: string | null;
    language: 'EN' | 'FR';
    onComplete: () => void;
}

type StepId =
    | 'INTRO' | 'REAL_NAME' | 'DISPLAY_NAME' | 'PHONE' | 'ART_TYPES'
    | 'LINKS' | 'FAVE_MUSIC' | 'FAVE_BOOK' | 'FAVE_SHOW' | 'THEME'
    | 'FIRST_WORK' | 'DONE';

const STEP_ORDER: StepId[] = [
    'INTRO', 'REAL_NAME', 'DISPLAY_NAME', 'PHONE', 'ART_TYPES',
    'LINKS', 'FAVE_MUSIC', 'FAVE_BOOK', 'FAVE_SHOW', 'THEME',
    'FIRST_WORK', 'DONE',
];

// Steps the user can skip (everything except identity + art type).
const OPTIONAL_STEPS: Set<StepId> = new Set([
    'PHONE', 'LINKS', 'FAVE_MUSIC', 'FAVE_BOOK', 'FAVE_SHOW', 'FIRST_WORK',
]);

export const WelcomeWizard: React.FC<Props> = ({
    uid, initialEmail, initialName, language, onComplete,
}) => {
    const t = useCallback((en: string, fr: string) => (language === 'FR' ? fr : en), [language]);

    const [stepIndex, setStepIndex] = useState(0);
    const [direction, setDirection] = useState<'FWD' | 'BACK'>('FWD');
    const [answers, setAnswers] = useState<WelcomeAnswers>({
        ...DEFAULT_ANSWERS,
        email: initialEmail ?? '',
        realName: initialName ?? '',
        displayName: initialName ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const currentStep = STEP_ORDER[stepIndex];

    // ── Web Audio SFX ─────────────────────────────────────────────────────
    const audioCtxRef = useRef<AudioContext | null>(null);
    const ensureCtx = (): AudioContext | null => {
        if (typeof window === 'undefined') return null;
        if (!audioCtxRef.current) {
            try {
                const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
                audioCtxRef.current = AC ? new AC() : null;
            } catch { return null; }
        }
        return audioCtxRef.current;
    };
    const playChime = (kind: 'FWD' | 'BACK' | 'DONE') => {
        const ctx = ensureCtx();
        if (!ctx) return;
        const now = ctx.currentTime;
        // Two-tone glide: rising 5th for forward, falling 5th for back,
        // bright triad chord for done. Detuned slightly so it doesn't sound
        // synthetic — closer to a tuned bell than a square beep.
        const notes = kind === 'DONE'
            ? [523, 659, 784]                  // C5 + E5 + G5
            : kind === 'FWD'
                ? [392, 587]                   // G4 → D5
                : [587, 392];                  // D5 → G4
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const gain = ctx.createGain();
            const start = now + i * 0.08;
            const dur = kind === 'DONE' ? 0.9 : 0.32;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + dur + 0.05);
        });
    };

    // ── Resume — read existing profile + onboarding flag ────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const db = getFirestore(getApp());
                const snap = await getDoc(doc(db, 'members', uid, 'artistProfile', 'profile'));
                if (cancelled || !snap.exists()) return;
                const d = snap.data() as any;
                // Migrate legacy `{ instagram, website, other }` shape if
                // present — collect non-empty values into the new flat
                // array. New writes go to `links: string[]`.
                setAnswers(prev => {
                    let nextLinks: string[] = prev.links;
                    if (Array.isArray(d.links)) {
                        nextLinks = d.links.filter((s: any) => typeof s === 'string' && s.trim());
                    } else if (d.welcomeLinks && typeof d.welcomeLinks === 'object') {
                        nextLinks = [d.welcomeLinks.instagram, d.welcomeLinks.website, d.welcomeLinks.other]
                            .filter((s: any) => typeof s === 'string' && s.trim());
                    }
                    return ({
                    ...prev,
                    realName: d.realName ?? prev.realName,
                    displayName: d.displayName ?? d.name ?? prev.displayName,
                    phone: d.phone ?? '',
                    email: d.email ?? prev.email,
                    artTypes: Array.isArray(d.artTypes) ? d.artTypes : prev.artTypes,
                    links: nextLinks,
                    favourites: {
                        music: { ...prev.favourites.music, ...(d.favourites?.music || {}) },
                        book:  { ...prev.favourites.book,  ...(d.favourites?.book  || {}) },
                        show:  { ...prev.favourites.show,  ...(d.favourites?.show  || {}) },
                    },
                    theme: d.activeTheme ?? prev.theme,
                    firstWorkUrl: d.firstWorkUrl ?? prev.firstWorkUrl,
                    });
                });
            } catch { /* fall back to defaults */ }
        })();
        return () => { cancelled = true; };
    }, [uid]);

    // ── Persist + advance ────────────────────────────────────────────────
    const persistCurrent = async (): Promise<boolean> => {
        if (!uid) return false;
        setSaving(true);
        setError(null);
        try {
            const db = getFirestore(getApp());
            // We push a denormalized snapshot of the answers each step;
            // it's tiny so an extra setDoc isn't worth gating.
            await setDoc(
                doc(db, 'members', uid, 'artistProfile', 'profile'),
                {
                    realName: answers.realName,
                    displayName: answers.displayName,
                    name: answers.displayName, // legacy field many places key on
                    phone: answers.phone,
                    email: answers.email,
                    artTypes: answers.artTypes,
                    // New flat string[] — `welcomeLinks` (legacy object)
                    // is left alone for read-only backwards compat; we
                    // never write to it again.
                    links: answers.links.filter(s => s.trim()),
                    favourites: answers.favourites,
                    activeTheme: answers.theme,
                    firstWorkUrl: answers.firstWorkUrl ?? null,
                    updatedAt: serverTimestamp(),
                },
                { merge: true },
            );
            return true;
        } catch (e) {
            setError(String((e as any)?.message ?? e));
            return false;
        } finally {
            setSaving(false);
        }
    };

    const advance = async () => {
        const ok = await persistCurrent();
        if (!ok) return;
        setDirection('FWD');
        playChime('FWD');
        setStepIndex(i => Math.min(i + 1, STEP_ORDER.length - 1));
    };
    const goBack = () => {
        setDirection('BACK');
        playChime('BACK');
        setStepIndex(i => Math.max(0, i - 1));
    };

    const finish = async () => {
        const ok = await persistCurrent();
        if (!ok) return;
        try {
            const db = getFirestore(getApp());
            await setDoc(
                doc(db, 'members', uid, 'artistProfile', 'profile'),
                { onboardingV1Completed: true, onboardingCompletedAt: serverTimestamp() },
                { merge: true },
            );
            playChime('DONE');
            onComplete();
        } catch (e) {
            setError(String((e as any)?.message ?? e));
        }
    };

    // ── Validation per step ──────────────────────────────────────────────
    const canAdvance = useMemo<boolean>(() => {
        if (currentStep === 'REAL_NAME')     return answers.realName.trim().length >= 2;
        if (currentStep === 'DISPLAY_NAME')  return answers.displayName.trim().length >= 2;
        if (currentStep === 'ART_TYPES')     return answers.artTypes.length >= 1;
        return true;
    }, [currentStep, answers]);

    // ── First-work upload helper ─────────────────────────────────────────
    const firstWorkInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const onPickFirstWork = (file: File) => {
        if (!uid) return;
        const path = `members/${uid}/welcome/first-work-${Date.now()}.${(file.name.split('.').pop() || 'jpg')}`;
        const storage = getStorage(getApp());
        const task = uploadBytesResumable(storageRef(storage, path), file, { contentType: file.type });
        setUploadProgress(0);
        task.on('state_changed',
            snap => setUploadProgress(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0),
            err => { setError(String((err as any)?.message ?? err)); setUploadProgress(null); },
            async () => {
                try {
                    const url = await getDownloadURL(task.snapshot.ref);
                    setAnswers(a => ({ ...a, firstWorkUrl: url }));
                    setUploadProgress(null);
                } catch (e) {
                    setError(String((e as any)?.message ?? e));
                    setUploadProgress(null);
                }
            },
        );
    };

    // ── Render frame (light show + step container) ───────────────────────
    const progress = stepIndex / (STEP_ORDER.length - 1);

    return (
        <div
            data-studio-theme={answers.theme}
            className={`fixed inset-0 z-[9000] ${STUDIO_BG[answers.theme]} text-white font-lato overflow-hidden transition-colors duration-700`}
            role="dialog"
            aria-modal="true"
        >
            {/* Studio backdrop — mirrors the per-theme overlay rendered by
                CreatorStudioShell so the wizard reads as the 'first room'
                of the studio, not a separate aesthetic. The overlay reacts
                live to answers.theme, so picking a theme on Step 10 gives
                an instant preview of what the studio will look like. */}
            <div
                aria-hidden
                className={`absolute inset-0 pointer-events-none transition-all duration-1000 ${STUDIO_OVERLAY[answers.theme]}`}
            >
                {answers.theme === 'RAINBOW' && (
                    <>
                        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                        <div className="absolute bottom-[10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '7s' }} />
                        <div className="absolute top-[10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s' }} />
                        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
                    </>
                )}
                {answers.theme === 'CHROMATIC' && (
                    <>
                        <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px]" />
                        <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-purple-900/20 rounded-full blur-[120px]" />
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-[0.03]" />
                    </>
                )}
            </div>

            {/* Progress + skip + back chrome */}
            <div className="absolute top-0 left-0 right-0 z-50 flex items-center gap-4 px-6 py-4">
                <div className="flex-1 h-0.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-yellow-200 transition-[width] duration-700 ease-out"
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
                <span className="text-[10px] font-cinzel uppercase tracking-[0.35em] text-neutral-400 font-mono tabular-nums">
                    {stepIndex + 1} / {STEP_ORDER.length}
                </span>
                {stepIndex > 0 && currentStep !== 'DONE' && (
                    <button
                        onClick={goBack}
                        className="text-[10px] font-cinzel uppercase tracking-[0.35em] text-neutral-400 hover:text-white transition-colors"
                    >
                        ← {t('Back', 'Retour')}
                    </button>
                )}
                {OPTIONAL_STEPS.has(currentStep) && (
                    <button
                        onClick={advance}
                        className="text-[10px] font-cinzel uppercase tracking-[0.35em] text-neutral-500 hover:text-neutral-200 transition-colors"
                    >
                        {t('Skip', 'Passer')} →
                    </button>
                )}
            </div>

            {/* Step container — keyed by stepIndex so React fully remounts on
                advance, retriggering the bubble-reveal animation (same
                rhythm + easing as the inn-hero WebGL bubble transition,
                approximated with a CSS circular clip-path + halo glow so
                text stays crisp through the wipe). */}
            <div
                key={`${stepIndex}-${direction}`}
                className={`relative z-10 w-full h-full flex items-center justify-center px-6 ${direction === 'FWD' ? 'welcome-bubble-fwd' : 'welcome-bubble-back'}`}
            >
                {/* Halo bloom — pulses outward from the bubble's anchor at
                    the start of the reveal. Gives the wipe its 'liquid
                    glass' warmth without needing a shader. */}
                <div
                    aria-hidden
                    className={`absolute inset-0 pointer-events-none ${direction === 'FWD' ? 'welcome-bubble-glow-fwd' : 'welcome-bubble-glow-back'}`}
                    style={{
                        background: direction === 'FWD'
                            ? 'radial-gradient(circle at 60% 50%, rgba(255,228,150,0.30), rgba(217,70,239,0.16) 35%, rgba(34,211,238,0.10) 55%, rgba(0,0,0,0) 75%)'
                            : 'radial-gradient(circle at 40% 50%, rgba(255,228,150,0.30), rgba(217,70,239,0.16) 35%, rgba(34,211,238,0.10) 55%, rgba(0,0,0,0) 75%)',
                        filter: 'blur(40px)',
                    }}
                />
                <div className="w-full max-w-2xl">
                    {currentStep === 'INTRO' && (
                        <StepIntro language={language} onBegin={advance} />
                    )}
                    {currentStep === 'REAL_NAME' && (
                        <StepText
                            label={t('What is your real name?', 'Quel est ton vrai nom ?')}
                            sub={t('We use this for any agreements, billing, and legal correspondence. Stays private.', 'Pour les ententes, la facturation et la correspondance officielle. Reste privé.')}
                            value={answers.realName}
                            onChange={v => setAnswers(a => ({ ...a, realName: v }))}
                        />
                    )}
                    {currentStep === 'DISPLAY_NAME' && (
                        <StepText
                            label={t('How should we call you?', 'Comment on devrait t\'appeler ?')}
                            sub={t('This is what shows on your public profile and your works.', 'C\'est ce qu\'on affichera sur ton profil public et tes œuvres.')}
                            value={answers.displayName}
                            onChange={v => setAnswers(a => ({ ...a, displayName: v }))}
                        />
                    )}
                    {currentStep === 'PHONE' && (
                        <StepText
                            label={t('Phone number', 'Numéro de téléphone')}
                            sub={t('Optional. Used only when something needs a real-time reply (a residency confirmation, a logistics question).', 'Optionnel. Seulement utilisé en cas d\'urgence (confirmation de résidence, logistique).')}
                            value={answers.phone}
                            onChange={v => setAnswers(a => ({ ...a, phone: v }))}
                            placeholder="(514) 555-…"
                            type="tel"
                        />
                    )}
                    {currentStep === 'ART_TYPES' && (
                        <StepChips
                            label={t('What kind of art do you make?', 'Quel type d\'art fais-tu ?')}
                            sub={t('Pick everything that fits, or add your own. You can edit this later.', 'Choisis tout ce qui correspond, ou ajoute le tien. Tu pourras modifier plus tard.')}
                            options={ART_TYPES.map(a => ({ id: a.id, label: language === 'FR' ? a.fr : a.en }))}
                            values={answers.artTypes}
                            onChange={v => setAnswers(a => ({ ...a, artTypes: v }))}
                            allowCustom
                            customAddLabel={t('Add yours', 'Ajouter le tien')}
                            customPlaceholder={t('Your discipline', 'Ta discipline')}
                        />
                    )}
                    {currentStep === 'LINKS' && (
                        <StepLinks
                            language={language}
                            values={answers.links}
                            onChange={(v: string[]) => setAnswers(a => ({ ...a, links: v }))}
                        />
                    )}
                    {currentStep === 'FAVE_MUSIC' && (
                        <StepFavourite
                            label={t('A song or artist that holds you up.', 'Une chanson ou un·e artiste qui te porte.')}
                            sub={t('Optional. Can be shown on your profile — toggle below.', 'Optionnel. Peut être visible sur ton profil — bascule ci-dessous.')}
                            language={language}
                            value={answers.favourites.music}
                            onChange={v => setAnswers(a => ({ ...a, favourites: { ...a.favourites, music: v } }))}
                        />
                    )}
                    {currentStep === 'FAVE_BOOK' && (
                        <StepFavourite
                            label={t('A book you keep returning to.', 'Un livre que tu relis.')}
                            sub={t('Optional. Can be shown on your profile — toggle below.', 'Optionnel. Peut être visible sur ton profil — bascule ci-dessous.')}
                            language={language}
                            value={answers.favourites.book}
                            onChange={v => setAnswers(a => ({ ...a, favourites: { ...a.favourites, book: v } }))}
                        />
                    )}
                    {currentStep === 'FAVE_SHOW' && (
                        <StepFavourite
                            label={t('A film or show that taught you something.', 'Un film ou une série qui t\'a appris quelque chose.')}
                            sub={t('Optional. Can be shown on your profile — toggle below.', 'Optionnel. Peut être visible sur ton profil — bascule ci-dessous.')}
                            language={language}
                            value={answers.favourites.show}
                            onChange={v => setAnswers(a => ({ ...a, favourites: { ...a.favourites, show: v } }))}
                        />
                    )}
                    {currentStep === 'THEME' && (
                        <StepTheme
                            language={language}
                            value={answers.theme}
                            onChange={v => setAnswers(a => ({ ...a, theme: v }))}
                        />
                    )}
                    {currentStep === 'FIRST_WORK' && (
                        <StepFirstWork
                            language={language}
                            url={answers.firstWorkUrl}
                            progress={uploadProgress}
                            onPickFile={(f) => onPickFirstWork(f)}
                            inputRef={firstWorkInputRef}
                        />
                    )}
                    {currentStep === 'DONE' && (
                        <StepDone language={language} displayName={answers.displayName} />
                    )}

                    {/* Forward/finish button — final step shows "Enter the Salon" */}
                    {currentStep !== 'INTRO' && (
                        <div className="mt-10 flex flex-col items-center">
                            <button
                                onClick={currentStep === 'DONE' ? finish : advance}
                                disabled={!canAdvance || saving}
                                className="px-10 py-4 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-xs uppercase tracking-[0.4em] hover:bg-[#d4b06a] disabled:opacity-30 transition-all shadow-[0_8px_28px_rgba(197,160,89,0.32)] hover:shadow-[0_10px_36px_rgba(197,160,89,0.45)]"
                            >
                                {currentStep === 'DONE'
                                    ? t('Enter the Salon', 'Entrer dans le Salon')
                                    : saving ? '…' : t('Continue', 'Continuer')}
                            </button>
                            {error && (
                                <p className="text-[10px] text-rose-300 font-mono mt-3">{error}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                /* Bubble reveal — same rhythm + cubic-bezier as the inn-hero
                   WebGL transition (2.5s power2.inOut on uP). Old layer
                   unmounts (React keys force re-render); new layer animates
                   from a circular clip at the anchor outward to full
                   coverage, with a brief chromatic warmth pulse for the
                   liquid-glass feel without needing a fragment shader. */
                @keyframes welcomeBubbleFwd {
                    0%   { clip-path: circle(0% at 60% 50%); opacity: 0;   filter: blur(8px) saturate(1.35) hue-rotate(8deg); }
                    20%  { opacity: 1; }
                    70%  { filter: blur(0) saturate(1.05) hue-rotate(0deg); }
                    100% { clip-path: circle(160% at 60% 50%); opacity: 1; filter: blur(0) saturate(1) hue-rotate(0deg); }
                }
                @keyframes welcomeBubbleBack {
                    0%   { clip-path: circle(0% at 40% 50%); opacity: 0;   filter: blur(8px) saturate(1.35) hue-rotate(-8deg); }
                    20%  { opacity: 1; }
                    70%  { filter: blur(0) saturate(1.05) hue-rotate(0deg); }
                    100% { clip-path: circle(160% at 40% 50%); opacity: 1; filter: blur(0) saturate(1) hue-rotate(0deg); }
                }
                .welcome-bubble-fwd  { animation: welcomeBubbleFwd 1.8s cubic-bezier(0.65, 0, 0.35, 1) both; }
                .welcome-bubble-back { animation: welcomeBubbleBack 1.55s cubic-bezier(0.65, 0, 0.35, 1) both; }

                /* Halo bloom — pulses outward from the bubble's anchor as
                   the wipe begins, then fades. Matches the inn shader's
                   rim-glow timing. */
                @keyframes welcomeBubbleGlow {
                    0%   { opacity: 0;    transform: scale(0.3); }
                    25%  { opacity: 0.85; }
                    100% { opacity: 0;    transform: scale(1.55); }
                }
                .welcome-bubble-glow-fwd,
                .welcome-bubble-glow-back {
                    animation: welcomeBubbleGlow 1.8s cubic-bezier(0.65, 0, 0.35, 1) both;
                    transform-origin: center;
                    will-change: transform, opacity;
                }

                @media (prefers-reduced-motion: reduce) {
                    .welcome-bubble-fwd, .welcome-bubble-back { animation-duration: 0.01s !important; }
                    .welcome-bubble-glow-fwd, .welcome-bubble-glow-back { animation: none !important; opacity: 0 !important; }
                }
            `}</style>
        </div>
    );
};

// ─── Step components ──────────────────────────────────────────────────────

const StepIntro: React.FC<{ language: 'EN' | 'FR'; onBegin: () => void }> = ({ language, onBegin }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="text-center">
            <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-4">
                Le Salon des Inconnus
            </p>
            <h1 className="font-prata text-[#f3e5ab] text-4xl md:text-6xl mb-6 leading-tight">
                {t('Welcome.', 'Bienvenue.')}
            </h1>
            <p className="text-neutral-300 text-lg font-lato leading-relaxed max-w-xl mx-auto mb-10">
                {t(
                    'A few quick questions so we know who you are. Two minutes — and then your room is yours.',
                    'Quelques questions rapides pour qu\'on sache qui tu es. Deux minutes — puis ta chambre est à toi.',
                )}
            </p>
            <button
                onClick={onBegin}
                className="px-12 py-4 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-xs uppercase tracking-[0.45em] hover:bg-[#d4b06a] transition-all shadow-[0_8px_28px_rgba(197,160,89,0.32)] hover:shadow-[0_12px_42px_rgba(197,160,89,0.5)]"
            >
                {t('Begin', 'Commencer')}
            </button>
        </div>
    );
};

interface StepTextProps {
    label: string; sub?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
}
const StepText: React.FC<StepTextProps> = ({ label, sub, value, onChange, placeholder, type }) => (
    <div className="text-center">
        <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3 leading-tight">{label}</h2>
        {sub && <p className="text-neutral-400 text-sm font-lato mb-8 max-w-lg mx-auto">{sub}</p>}
        <input
            type={type ?? 'text'}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
            autoFocus
            className="w-full max-w-md mx-auto block bg-transparent border-b-2 border-[#c5a059]/30 focus:border-[#c5a059] focus:outline-none text-white text-center text-2xl md:text-3xl font-prata py-3 placeholder-neutral-700"
        />
    </div>
);

interface StepChipsProps {
    label: string; sub?: string;
    options: { id: string; label: string }[];
    values: string[];
    onChange: (v: string[]) => void;
    /** When true, render an inline 'add custom' affordance. Custom entries
     *  are stored as 'custom:<value>' so the chip vs. preset distinction
     *  survives a round-trip without a separate field on the profile. */
    allowCustom?: boolean;
    customPlaceholder?: string;
    customAddLabel?: string;
}
const StepChips: React.FC<StepChipsProps> = ({
    label, sub, options, values, onChange,
    allowCustom = false, customPlaceholder, customAddLabel,
}) => {
    const toggle = (id: string) => {
        if (values.includes(id)) onChange(values.filter(v => v !== id));
        else onChange([...values, id]);
    };

    // Custom entries — anything in `values` that isn't one of the preset
    // option ids. Rendered as removable gold chips alongside the presets.
    const presetIds = new Set(options.map(o => o.id));
    const customEntries = values.filter(v => !presetIds.has(v));
    const removeCustom = (id: string) => onChange(values.filter(v => v !== id));

    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const commit = () => {
        const v = draft.trim();
        if (!v) { setAdding(false); setDraft(''); return; }
        // Tag with `custom:` so the chip distinguishes itself from presets
        // and we don't accidentally collide with a future preset id.
        const id = `custom:${v}`;
        if (!values.includes(id)) onChange([...values, id]);
        setDraft('');
        setAdding(false);
    };

    return (
        <div className="text-center">
            <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3 leading-tight">{label}</h2>
            {sub && <p className="text-neutral-400 text-sm font-lato mb-8 max-w-lg mx-auto">{sub}</p>}
            <div className="flex flex-wrap gap-3 justify-center">
                {options.map(o => {
                    const active = values.includes(o.id);
                    return (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => toggle(o.id)}
                            className={`px-5 py-2.5 text-xs font-cinzel uppercase tracking-[0.3em] rounded-full border transition-all ${active ? 'border-[#c5a059] text-[#18181b] bg-[#c5a059] shadow-[0_4px_22px_rgba(197,160,89,0.4)]' : 'border-white/15 text-neutral-300 hover:border-white/40 hover:text-white'}`}
                        >
                            {o.label}
                        </button>
                    );
                })}

                {/* User-added custom chips — clicking removes them. */}
                {customEntries.map(id => {
                    const label = id.startsWith('custom:') ? id.slice(7) : id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => removeCustom(id)}
                            className="px-5 py-2.5 text-xs font-cinzel uppercase tracking-[0.3em] rounded-full border border-[#c5a059] text-[#18181b] bg-[#c5a059] shadow-[0_4px_22px_rgba(197,160,89,0.4)] hover:bg-[#d4b06a] flex items-center gap-2"
                            title="Click to remove"
                        >
                            <span>{label}</span>
                            <span aria-hidden className="text-[10px] opacity-70">✕</span>
                        </button>
                    );
                })}

                {/* Add-custom affordance. Inline input that grows from a pill
                    so the "+" cell stays in the chip rhythm. */}
                {allowCustom && (
                    adding ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); commit(); }
                                else if (e.key === 'Escape') { setDraft(''); setAdding(false); }
                            }}
                            placeholder={customPlaceholder ?? 'Your discipline'}
                            autoFocus
                            maxLength={32}
                            className="px-5 py-2.5 text-xs font-cinzel uppercase tracking-[0.3em] rounded-full border border-dashed border-[#c5a059]/60 bg-transparent text-white focus:outline-none focus:border-[#c5a059] placeholder-neutral-500 min-w-[180px]"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 0); }}
                            className="px-5 py-2.5 text-xs font-cinzel uppercase tracking-[0.3em] rounded-full border border-dashed border-white/25 text-neutral-400 hover:text-white hover:border-white/50 transition-all flex items-center gap-2"
                        >
                            <span aria-hidden>+</span>
                            <span>{customAddLabel ?? 'Add yours'}</span>
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

interface StepLinksProps {
    language: 'EN' | 'FR';
    values: string[];
    onChange: (v: string[]) => void;
}
const StepLinks: React.FC<StepLinksProps> = ({ language, values, onChange }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);

    // Ensure we always show at least 2 empty rows for a clean starting state.
    const rows = values.length >= 2 ? values : [...values, ...Array(2 - values.length).fill('')];

    const setAt = (idx: number, v: string) => {
        const next = [...rows];
        next[idx] = v;
        onChange(next);
    };
    const removeAt = (idx: number) => {
        const next = rows.filter((_, i) => i !== idx);
        onChange(next);
    };
    const addRow = () => onChange([...rows, '']);

    return (
        <div className="text-center">
            <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3 leading-tight">
                {t('Your professional links.', 'Tes liens professionnels.')}
            </h2>
            <p className="text-neutral-400 text-sm font-lato mb-8 max-w-lg mx-auto">
                {t(
                    'All optional. They appear as social icons on your public profile.',
                    'Tous optionnels. Ils apparaîtront en icônes sur ton profil public.',
                )}
            </p>
            <div className="space-y-3 max-w-md mx-auto text-left">
                {rows.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="shrink-0">
                            <SocialIcon url={url} size={36} />
                        </div>
                        <input
                            type="url"
                            placeholder={t(
                                i === 0 ? 'instagram.com/…' : i === 1 ? 'your website' : 'another link',
                                i === 0 ? 'instagram.com/…' : i === 1 ? 'ton site web' : 'un autre lien',
                            )}
                            value={url}
                            onChange={e => setAt(i, e.target.value)}
                            className="flex-1 bg-black/40 border border-white/15 px-4 py-3 text-white font-lato focus:outline-none focus:border-[#c5a059]/60"
                        />
                        <button
                            type="button"
                            onClick={() => removeAt(i)}
                            disabled={rows.length <= 1}
                            className="shrink-0 w-9 h-9 flex items-center justify-center border border-white/15 text-neutral-500 hover:text-rose-300 hover:border-rose-400/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded"
                            title={t('Remove this link', 'Retirer ce lien')}
                            aria-label={t('Remove link', 'Retirer le lien')}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addRow}
                    className="mt-2 w-full py-3 border border-dashed border-white/20 text-neutral-400 hover:text-white hover:border-[#c5a059]/60 font-cinzel text-[10px] uppercase tracking-[0.3em] rounded transition-colors"
                >
                    + {t('Add another link', 'Ajouter un autre lien')}
                </button>
            </div>
        </div>
    );
};

// ─── Social-icon detection (shared between wizard + public profile) ──────
// Lifted into a module export so PublicProfilePage can render the same
// chips in its 'Social Links' section. Detects the service from the URL's
// hostname; unknown hosts fall back to the first letter of the domain.

const SOCIAL_MAP: Record<string, { slug: string; name: string }> = {
    'instagram.com':    { slug: 'instagram',    name: 'Instagram' },
    'twitter.com':      { slug: 'x',            name: 'X' },
    'x.com':            { slug: 'x',            name: 'X' },
    'tiktok.com':       { slug: 'tiktok',       name: 'TikTok' },
    'youtube.com':      { slug: 'youtube',      name: 'YouTube' },
    'youtu.be':         { slug: 'youtube',      name: 'YouTube' },
    'facebook.com':     { slug: 'facebook',     name: 'Facebook' },
    'fb.watch':         { slug: 'facebook',     name: 'Facebook' },
    'bandcamp.com':     { slug: 'bandcamp',     name: 'Bandcamp' },
    'soundcloud.com':   { slug: 'soundcloud',   name: 'SoundCloud' },
    'spotify.com':      { slug: 'spotify',      name: 'Spotify' },
    'open.spotify.com': { slug: 'spotify',      name: 'Spotify' },
    'linkedin.com':     { slug: 'linkedin',     name: 'LinkedIn' },
    'vimeo.com':        { slug: 'vimeo',        name: 'Vimeo' },
    'behance.net':      { slug: 'behance',      name: 'Behance' },
    'dribbble.com':     { slug: 'dribbble',     name: 'Dribbble' },
    'substack.com':     { slug: 'substack',     name: 'Substack' },
    'github.com':       { slug: 'github',       name: 'GitHub' },
    'patreon.com':      { slug: 'patreon',      name: 'Patreon' },
    'twitch.tv':        { slug: 'twitch',       name: 'Twitch' },
    'medium.com':       { slug: 'medium',       name: 'Medium' },
    'pinterest.com':    { slug: 'pinterest',    name: 'Pinterest' },
    'threads.net':      { slug: 'threads',      name: 'Threads' },
    'mastodon.social':  { slug: 'mastodon',     name: 'Mastodon' },
    'apple.com':        { slug: 'applemusic',   name: 'Apple Music' },
    'music.apple.com':  { slug: 'applemusic',   name: 'Apple Music' },
};

export function detectSocialService(url: string): { slug: string; name: string } | null {
    if (!url || !url.trim()) return null;
    let candidate = url.trim();
    // Tolerate bare hostnames like "instagram.com/handle" without a scheme.
    if (!/^[a-z]+:\/\//i.test(candidate)) candidate = 'https://' + candidate;
    try {
        const h = new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
        if (SOCIAL_MAP[h]) return SOCIAL_MAP[h];
        for (const [key, val] of Object.entries(SOCIAL_MAP)) {
            if (h === key || h.endsWith('.' + key)) return val;
        }
        return null;
    } catch { return null; }
}

/** Get the safe first letter for a fallback chip. Returns '·' for blank/
 *  unparseable inputs so the chip slot never collapses. */
export function socialFallbackLetter(url: string): string {
    if (!url || !url.trim()) return '·';
    let candidate = url.trim();
    if (!/^[a-z]+:\/\//i.test(candidate)) candidate = 'https://' + candidate;
    try {
        const h = new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
        return h.charAt(0).toUpperCase() || '·';
    } catch {
        return url.trim().charAt(0).toUpperCase() || '·';
    }
}

interface SocialIconProps {
    url: string;
    size?: number;
    /** Hex without # — used to colorize the simpleicons CDN response.
     *  Defaults to the salon gold. */
    color?: string;
}
export const SocialIcon: React.FC<SocialIconProps> = ({ url, size = 24, color = 'c5a059' }) => {
    const svc = detectSocialService(url);
    if (svc) {
        // simpleicons.org CDN — single-color PNG/SVG sized + tinted on the
        // server side. Falls back to letter chip on a load error.
        return (
            <span
                className="inline-flex items-center justify-center rounded-full border border-[#c5a059]/40"
                style={{ width: size, height: size, background: 'rgba(197,160,89,0.08)' }}
                title={svc.name}
                aria-label={svc.name}
            >
                <img
                    src={`https://cdn.simpleicons.org/${svc.slug}/${color}`}
                    alt=""
                    width={Math.round(size * 0.55)}
                    height={Math.round(size * 0.55)}
                    style={{ display: 'block' }}
                    onError={(e) => {
                        // If the CDN icon fails (offline, unknown slug),
                        // swap to a letter fallback in place.
                        const target = e.currentTarget;
                        const parent = target.parentElement;
                        if (!parent) return;
                        const letter = socialFallbackLetter(url);
                        parent.innerHTML = `<span style="color:#${color};font-family:Cinzel,serif;font-weight:700;font-size:${Math.round(size * 0.45)}px">${letter}</span>`;
                    }}
                />
            </span>
        );
    }
    // Unknown service — render a letter chip.
    return (
        <span
            className="inline-flex items-center justify-center rounded-full border border-[#c5a059]/40 font-cinzel font-bold"
            style={{
                width: size, height: size,
                background: 'rgba(197,160,89,0.08)',
                color: `#${color}`,
                fontSize: Math.round(size * 0.45),
            }}
            title={url || ''}
            aria-label={url || ''}
        >
            {socialFallbackLetter(url)}
        </span>
    );
};

interface StepFavouriteProps {
    label: string; sub?: string;
    language: 'EN' | 'FR';
    value: FavouriteAnswer;
    onChange: (v: FavouriteAnswer) => void;
}
const StepFavourite: React.FC<StepFavouriteProps> = ({ label, sub, language, value, onChange }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="text-center">
            <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3 leading-tight">{label}</h2>
            {sub && <p className="text-neutral-400 text-sm font-lato mb-8 max-w-lg mx-auto">{sub}</p>}
            <input
                type="text"
                value={value.value}
                onChange={e => onChange({ ...value, value: e.target.value })}
                autoFocus
                className="w-full max-w-md mx-auto block bg-transparent border-b-2 border-[#c5a059]/30 focus:border-[#c5a059] focus:outline-none text-white text-center text-2xl font-prata py-3"
            />
            <div className="mt-6 flex items-center justify-center gap-3">
                <label className="text-[10px] font-cinzel uppercase tracking-[0.35em] text-neutral-400 flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={value.public}
                        onChange={e => onChange({ ...value, public: e.target.checked })}
                        className="accent-[#c5a059] w-4 h-4"
                    />
                    {t('Show on my profile', 'Afficher sur mon profil')}
                </label>
            </div>
        </div>
    );
};

interface StepThemeProps {
    language: 'EN' | 'FR';
    value: CreatorTheme;
    onChange: (v: CreatorTheme) => void;
}
const StepTheme: React.FC<StepThemeProps> = ({ language, value, onChange }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="text-center">
            <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3 leading-tight">
                {t('Pick a wardrobe.', 'Choisis une garde-robe.')}
            </h2>
            <p className="text-neutral-400 text-sm font-lato mb-8 max-w-lg mx-auto">
                {t('Sets the colours of your studio. You can change it any time from your profile.', 'Donne le ton à ton studio. Modifiable n\'importe quand depuis ton profil.')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                {THEMES.map(th => {
                    const active = value === th.key;
                    return (
                        <button
                            key={th.key}
                            type="button"
                            onClick={() => onChange(th.key)}
                            className={`group relative aspect-[4/3] rounded-md overflow-hidden border-2 transition-all ${active ? 'border-[#c5a059] shadow-[0_0_30px_rgba(197,160,89,0.45)]' : 'border-white/10 hover:border-white/40'}`}
                            style={{ backgroundImage: th.swatch, backgroundSize: 'cover' }}
                        >
                            <span className="absolute inset-0 flex items-end justify-center pb-3 bg-gradient-to-t from-black/70 via-black/0 to-transparent">
                                <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] text-white">
                                    {language === 'FR' ? th.nameFr : th.nameEn}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

interface StepFirstWorkProps {
    language: 'EN' | 'FR';
    url?: string;
    progress: number | null;
    onPickFile: (file: File) => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}
const StepFirstWork: React.FC<StepFirstWorkProps> = ({ language, url, progress, onPickFile, inputRef }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="text-center">
            <h2 className="font-prata text-[#f3e5ab] text-3xl md:text-4xl mb-3 leading-tight">
                {t('Drop in your first work?', 'Téléverse une première œuvre ?')}
            </h2>
            <p className="text-neutral-400 text-sm font-lato mb-8 max-w-lg mx-auto">
                {t('Optional. An image, a sketch, anything. You can do this later.', 'Optionnel. Une image, un croquis, n\'importe quoi. À faire plus tard si tu veux.')}
            </p>
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) onPickFile(f);
                    e.target.value = '';
                }}
            />
            {!url && progress === null && (
                <button
                    onClick={() => inputRef.current?.click()}
                    className="mx-auto block px-10 py-6 border border-dashed border-white/20 hover:border-[#c5a059]/60 text-neutral-300 hover:text-white font-cinzel text-[11px] uppercase tracking-[0.35em] rounded transition-colors"
                >
                    + {t('Upload an image', 'Téléverser une image')}
                </button>
            )}
            {progress !== null && (
                <div className="max-w-sm mx-auto">
                    <div className="flex justify-between text-[10px] text-neutral-500 mb-1 font-mono tabular-nums">
                        <span>{t('Uploading…', 'Téléversement…')}</span>
                        <span>{Math.round((progress ?? 0) * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/60 border border-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-yellow-200 transition-[width] duration-200" style={{ width: `${(progress ?? 0) * 100}%` }} />
                    </div>
                </div>
            )}
            {url && (
                <div className="max-w-sm mx-auto">
                    <img src={url} alt="" className="w-full h-auto rounded border border-[#c5a059]/40 shadow-[0_8px_30px_rgba(0,0,0,0.5)]" />
                    <p className="text-[10px] font-cinzel uppercase tracking-[0.35em] text-emerald-300 mt-3">
                        ✓ {t('Saved.', 'Sauvegardé.')}
                    </p>
                </div>
            )}
        </div>
    );
};

const StepDone: React.FC<{ language: 'EN' | 'FR'; displayName: string }> = ({ language, displayName }) => {
    const t = (en: string, fr: string) => (language === 'FR' ? fr : en);
    return (
        <div className="text-center relative">
            {/* Final flourish — a soft expanding halo behind the headline */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at center, rgba(255,228,150,0.35), rgba(217,70,239,0.18) 40%, rgba(0,0,0,0) 70%)',
                    filter: 'blur(40px)',
                }}
            />
            <p className="relative font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em] mb-4">
                Le Salon des Inconnus
            </p>
            <h2 className="relative font-prata text-[#f3e5ab] text-4xl md:text-6xl mb-6 leading-tight">
                {t('Welcome,', 'Bienvenue,')} {displayName || t('friend', 'ami·e')}.
            </h2>
            <p className="relative text-neutral-300 text-lg font-lato leading-relaxed max-w-xl mx-auto">
                {t(
                    'Your room is set. The studio is yours to wander.',
                    'Ta chambre est prête. Le studio est à toi.',
                )}
            </p>
        </div>
    );
};
