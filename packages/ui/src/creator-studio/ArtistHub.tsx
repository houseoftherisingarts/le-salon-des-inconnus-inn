
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HubContract, HubArticle } from './types';
import { HubPhase, CreatorStudioUser } from './CreatorStudioShell';
import { ARTISTS_ROSTER } from './roster';
import { KanbanTool } from './KanbanTool';
import { GoogleGenAI, Modality } from "@google/genai";
import {
    getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
    collection, query, where, orderBy, onSnapshot,
    serverTimestamp, type Firestore,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage';
import { BlockEditor } from './BlockEditor';
import { ChatRoom } from './ChatRoom';
import { Inspirosphere } from './Inspirosphere';
import { JigsawPuzzle } from './JigsawPuzzle';
import { PuzzleCelebration } from './PuzzleCelebration';
import { MyVideosPanel } from './MyVideosPanel';
import {
    PUZZLE_PIECES_TOTAL, PUZZLE_PIECES_PRE_REVEALED, PUZZLE_PIECES_TO_EARN,
    COINS_PER_PIECE, COINS_PER_COMPLETION_BONUS,
    pickPuzzleArtwork, visiblePieceCount, PUZZLE_ARTWORKS,
    type PuzzleArtwork,
} from './puzzleArtworks';
import { getApp } from 'firebase/app';

// Safe firebase accessors — return null when no app is initialized (e.g. when
// the studio is mounted in a context that hasn't set up Firebase yet, like
// the standalone salon scaffold). Prevents the gate from rendering as a
// blank page on apps that haven't wired auth.
function studioFirestore(): Firestore | null {
    try { return getFirestore(getApp()); } catch { return null; }
}
function studioStorage(): FirebaseStorage | null {
    try { return getStorage(getApp()); } catch { return null; }
}

interface ArtistHubProps {
    theme: string;
    themeStyles: any;
    phase: HubPhase;
    setPhase: (phase: HubPhase) => void;
    language: 'EN' | 'FR';
    /** Authenticated user; null when anonymous. Controls MEMBER vs GUEST gating. */
    currentUser?: CreatorStudioUser | null;
    /** Curated-artist flag from members/{uid}/admin/flags.isArtist. Gates publish. */
    isArtist?: boolean;
    /** Triggers the consumer's sign-in flow (auth modal). */
    onRequestSignIn?: () => void;
    /** Returns the user to the parent app (e.g. inn root). */
    onExit?: () => void;
    /** Switch the active base theme. Persisted to the user's profile. */
    onThemeChange?: (theme: 'RAINBOW' | 'RED' | 'BLUE_PUNK' | 'CLASSY' | 'CHROMATIC' | 'COMIC') => void;
    /**
     * Reports the active tab + a snapshot of the artist's profile data up to
     * the shell so the contextual viewer (top half of the screen) can render
     * the matching preview/transition.
     */
    onContextChange?: (ctx: {
        tab: string;
        regData: { name: string; city: string; archetype: string; bio: string; skills: string[]; country?: string };
        avatarUrl: string | null;
        isArtist: boolean;
        membershipTier: string;
        /** True while the Inspirosphere is open under the TOOLS tab — lets
         *  the shell switch the viewer body into the orb portal slot. */
        inspirosphereActive?: boolean;
    }) => void;
}

type AccessLevel = 'GUEST' | 'MEMBER';
type MembershipTier = 'FREE' | 'INITIATE' | 'ARTISAN' | 'MAESTRO';

// Reordered: COLLABORATE is now first
type Tab = 'COLLABORATE' | 'TOOLS' | 'READS' | 'ROSTER' | 'PROFILE' | 'MARKET' | 'STORE' | 'HOT_SEAT' | 'CHAT';

interface RegistrationData {
    name: string;
    city: string;
    /** ISO 3166-1 alpha-2 country code (e.g., 'CA', 'FR'). Used to render
     *  the country flag emoji on the public profile + the contextual viewer. */
    country?: string;
    archetype: string;
    bio: string;
    skills: string[]; // User entered skills
}

/** Country dropdown options — alpha-2 codes mapped to display names + flag
 *  emoji. Limited to common origins for the inn's residents/audience; users
 *  needing something else can be added later. The flag is computed from the
 *  code via the regional-indicator codepoint trick (no asset shipping). */
export const COUNTRY_OPTIONS: { code: string; name: string }[] = [
    { code: 'CA', name: 'Canada' },
    { code: 'US', name: 'United States' },
    { code: 'FR', name: 'France' },
    { code: 'BE', name: 'Belgique' },
    { code: 'CH', name: 'Suisse' },
    { code: 'DE', name: 'Deutschland' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IT', name: 'Italia' },
    { code: 'ES', name: 'España' },
    { code: 'PT', name: 'Portugal' },
    { code: 'NL', name: 'Nederland' },
    { code: 'BR', name: 'Brasil' },
    { code: 'AR', name: 'Argentina' },
    { code: 'MX', name: 'México' },
    { code: 'JP', name: '日本' },
    { code: 'KR', name: '한국' },
    { code: 'AU', name: 'Australia' },
    { code: 'NZ', name: 'New Zealand' },
];

export function flagEmoji(countryCode?: string | null): string {
    if (!countryCode || countryCode.length !== 2) return '';
    const upper = countryCode.toUpperCase();
    if (!/^[A-Z]{2}$/.test(upper)) return '';
    const codePoints = upper.split('').map(c => 0x1F1E6 + (c.charCodeAt(0) - 'A'.charCodeAt(0)));
    return String.fromCodePoint(...codePoints);
}

interface PlatformSkin {
    id: string;
    name: string;
    /** Legacy display label — kept for back-compat. New cards prefer
     *  priceTokens/priceUSD (both optional, mutually inclusive). */
    price: string;
    /** Cost in time tokens. Omit when the skin is level-gated only. */
    priceTokens?: number;
    /** Real-money cost in USD. Omit when not for sale in cash. */
    priceUSD?: number;
    /** Cost in coins (the activity-based internal currency). The current
     *  flat rate per the economy spec is 100 coins per skin. */
    priceCoins?: number;
    description: string;
    minLevel: number; // Gamification
    style: {
        bg: string;
        text: string;
        border: string;
        highlight: string;
    };
    colorSwatch: string; // Replaced icon with CSS color
}

// Hot Seat Types
interface HotSeatFeedback {
    id: string;
    author: string;
    capacity: string; // 'Professional', 'Profane', etc.
    text: string;
    timestamp: string;
}

interface HotSeatSubmission {
    id: string;
    title: string;
    artist: string;
    /** Discipline/medium — see HOT_SEAT_DISCIPLINES below for canonical keys. */
    type: string;
    /** Where the work is in its life cycle: sketch, draft, final, etc. */
    stage?: string;
    description: string;
    imageUrl?: string;
    /** Optional public link (Vimeo, SoundCloud, GitHub, Google Doc, etc.). */
    workLink?: string;
    /** Multi-select: which kinds of feedback the artist is asking for. */
    feedbackSought?: string[];
    /** Open-ended: specific questions the artist wants critics to answer. */
    specificQuestions?: string;
    /** Optional content note for sensitive themes. */
    sensitivities?: string;
    feedback: HotSeatFeedback[];
}

// Discipline list for the Hot Seat submission form. Keys are stable English
// strings stored on the doc; labels are bilingual for display.
const HOT_SEAT_DISCIPLINES: { key: string; en: string; fr: string }[] = [
    { key: 'Script',         en: 'Script / Screenplay',     fr: 'Scénario' },
    { key: 'ShortStory',     en: 'Short story',              fr: 'Nouvelle' },
    { key: 'Novel',          en: 'Novel excerpt',            fr: 'Extrait de roman' },
    { key: 'Poetry',         en: 'Poetry',                   fr: 'Poésie' },
    { key: 'Essay',          en: 'Essay / Article',          fr: 'Essai / Article' },
    { key: 'SongLyrics',     en: 'Song lyrics',              fr: 'Paroles de chanson' },
    { key: 'MusicComp',      en: 'Music composition',        fr: 'Composition musicale' },
    { key: 'MusicRec',       en: 'Music recording / mix',    fr: 'Enregistrement / mix' },
    { key: 'SoundArt',       en: 'Sound art',                fr: 'Art sonore' },
    { key: 'Drawing',        en: 'Drawing / Illustration',   fr: 'Dessin / Illustration' },
    { key: 'Painting',       en: 'Painting',                 fr: 'Peinture' },
    { key: 'Photography',    en: 'Photography',              fr: 'Photographie' },
    { key: 'DigitalArt',     en: 'Digital art',              fr: 'Art numérique' },
    { key: 'Sculpture',      en: 'Sculpture / 3D',           fr: 'Sculpture / 3D' },
    { key: 'ShortFilm',      en: 'Short film',               fr: 'Court métrage' },
    { key: 'MusicVideo',     en: 'Music video',              fr: 'Vidéoclip' },
    { key: 'Animation',      en: 'Animation',                fr: 'Animation' },
    { key: 'Performance',    en: 'Performance / Theatre',    fr: 'Performance / Théâtre' },
    { key: 'Dance',          en: 'Dance / Choreography',     fr: 'Danse / Chorégraphie' },
    { key: 'GameDesign',     en: 'Game / Interactive',       fr: 'Jeu / Interactif' },
    { key: 'Code',           en: 'Code / Software',          fr: 'Code / Logiciel' },
    { key: 'Other',          en: 'Other',                    fr: 'Autre' },
];

const HOT_SEAT_STAGES: { key: string; en: string; fr: string }[] = [
    { key: 'sketch',         en: 'Rough sketch / Idea',     fr: 'Esquisse / Idée' },
    { key: 'firstDraft',     en: 'First draft',              fr: 'Premier jet' },
    { key: 'midDraft',       en: 'Mid-draft / Iterating',    fr: 'En cours / Itération' },
    { key: 'lateDraft',      en: 'Late draft / Polishing',   fr: 'Quasi finale / Polissage' },
    { key: 'final',          en: 'Final piece',              fr: 'Œuvre finale' },
];

// Each feedback type carries a tiny stroked-vector glyph (NOT an emoji — see
// the icon-style design rules) so the chip reads at a glance even with the
// label hidden by translation. Paths are 24-viewBox, 1.6-stroke; render via
// the FeedbackGlyph helper below.
const HOT_SEAT_FEEDBACK_TYPES: {
    key: string; en: string; fr: string; blurbEn: string; blurbFr: string; icon: string;
}[] = [
    { key: 'technical',  en: 'Technical',         fr: 'Technique',         blurbEn: 'Craft, execution, mechanics.',                   blurbFr: 'Technique, exécution, mécanique.',
      icon: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7.4-3.5a7.5 7.5 0 0 0-.1-1.3l2-1.5-2-3.5-2.4.8a7.5 7.5 0 0 0-2.2-1.3L14.5 3h-5l-.2 2.2a7.5 7.5 0 0 0-2.2 1.3l-2.4-.8-2 3.5 2 1.5a7.5 7.5 0 0 0 0 2.6l-2 1.5 2 3.5 2.4-.8a7.5 7.5 0 0 0 2.2 1.3L9.5 21h5l.2-2.2a7.5 7.5 0 0 0 2.2-1.3l2.4.8 2-3.5-2-1.5c.1-.4.1-.8.1-1.3Z' },
    { key: 'emotional',  en: 'Emotional',         fr: 'Émotionnel',        blurbEn: 'How does it make people feel?',                  blurbFr: 'Quelle émotion ça déclenche ?',
      icon: 'M12 20s-7-4.35-7-10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 19 10c0 5.65-7 10-7 10Z' },
    { key: 'conceptual', en: 'Conceptual',        fr: 'Conceptuel',        blurbEn: 'The idea — does it land?',                       blurbFr: "L'idée — est-ce qu'elle passe ?",
      icon: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11.2c.6.5 1 1.2 1 2v.3h4v-.3c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z' },
    { key: 'structural', en: 'Structural',        fr: 'Structurel',        blurbEn: 'Composition, pacing, layout, flow.',             blurbFr: 'Composition, rythme, mise en page.',
      icon: 'M3 4h7v7H3zM14 4h7v4h-7zM14 11h7v9h-7zM3 14h7v6H3z' },
    { key: 'audience',   en: 'Audience fit',      fr: "Public visé",       blurbEn: 'Who is this for? Who would love it?',            blurbFr: 'Pour qui ? Qui adorerait ?',
      icon: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 20c0-3.3 3.1-5 7-5s7 1.7 7 5M16 14c2.8 0 6 1.2 6 4' },
    { key: 'honesty',    en: 'Honesty check',     fr: 'Test d\'honnêteté', blurbEn: 'Is it working at all? Be blunt.',                blurbFr: "Est-ce que ça fonctionne ? Sois franc·he.",
      icon: 'M12 3v18M5 7l-3 7c0 1.7 1.3 3 3 3s3-1.3 3-3l-3-7Zm14 0-3 7c0 1.7 1.3 3 3 3s3-1.3 3-3l-3-7Z' },
    { key: 'suggestions', en: 'Suggestions',      fr: 'Suggestions',       blurbEn: 'Alternatives, things to try, references.',       blurbFr: 'Alternatives, pistes, références.',
      icon: 'M12 2v3M19 5l-2 2M22 12h-3M5 5l2 2M2 12h3M9 18h6M10 21h4M12 7a5 5 0 0 0-3 9c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2A5 5 0 0 0 12 7Z' },
    { key: 'language',   en: 'Language / Voice',  fr: 'Langue / Voix',     blurbEn: 'Word choice, tone, dialect, register.',          blurbFr: 'Choix de mots, ton, dialecte, registre.',
      icon: 'M21 12a8 8 0 0 1-12.8 6.4L3 20l1.6-5.2A8 8 0 1 1 21 12Z' },
];

/** Base themes available to every member — same set as the top-right
 *  theme cycler, but listed in the Wardrobe as ordinary picks so the
 *  artist can lock in their preferred aesthetic and broadcast it on their
 *  public profile. Each entry's swatch is a representative color (or
 *  gradient) so the wardrobe pill reads at a glance. */
const BASE_THEMES: { key: 'RAINBOW' | 'RED' | 'BLUE_PUNK' | 'CLASSY' | 'CHROMATIC' | 'COMIC'; name: { en: string; fr: string }; swatch: string }[] = [
    { key: 'RAINBOW',   name: { en: 'Neon Arcade',     fr: 'Arcade Néon' },     swatch: 'linear-gradient(135deg, #d946ef, #22d3ee, #facc15)' },
    { key: 'RED',       name: { en: 'Riot Protocol',   fr: 'Protocole Émeute' },swatch: 'linear-gradient(135deg, #ef4444, #7f1d1d)' },
    { key: 'CHROMATIC', name: { en: 'Prism Flow',      fr: 'Flux Prisme' },     swatch: 'linear-gradient(135deg, #a855f7, #3b82f6, #facc15)' },
    { key: 'BLUE_PUNK', name: { en: 'System Failure',  fr: 'Erreur Système' },  swatch: 'linear-gradient(135deg, #22d3ee, #ec4899)' },
    { key: 'CLASSY',    name: { en: 'Gilded Age',      fr: 'Âge d’Or' },        swatch: 'linear-gradient(135deg, #c8aa6e, #091428)' },
    { key: 'COMIC',     name: { en: 'Knockout',        fr: 'Knockout' },        swatch: 'linear-gradient(135deg, #facc15, #ef4444)' },
];

const SKINS: PlatformSkin[] = [
    {
        id: 'skin_flat_white',
        name: 'Flat White',
        price: '$2.00',
        priceTokens: 5,
        priceUSD: 2,
        priceCoins: 100,
        description: 'Classy Apple Store White. Minimalist.',
        minLevel: 0,
        style: {
            bg: 'bg-[#f5f5f7]',
            text: 'text-neutral-900 font-sans',
            border: 'border-neutral-300',
            highlight: 'text-neutral-500'
        },
        colorSwatch: '#f5f5f7'
    },
    {
        id: 'skin_iris_black',
        name: 'Iris Black',
        price: '$2.00',
        priceTokens: 5,
        priceUSD: 2,
        priceCoins: 100,
        description: 'Classy Apple Store Black. Deep contrast.',
        minLevel: 0,
        style: {
            bg: 'bg-[#000000]',
            text: 'text-white font-sans',
            border: 'border-neutral-800',
            highlight: 'text-white'
        },
        colorSwatch: '#000000'
    },
    {
        id: 'skin_mezzo_coffee',
        name: 'Mezzo Coffee',
        price: '$2.00',
        priceTokens: 5,
        priceUSD: 2,
        priceCoins: 100,
        description: 'Warm brown tones. Smooth to the eyes.',
        minLevel: 0,
        style: {
            bg: 'bg-[#2c241b]',
            text: 'text-[#eaddcf] font-serif',
            border: 'border-[#5e4b35]',
            highlight: 'text-[#c0a080]'
        },
        colorSwatch: '#2c241b'
    },
    {
        id: 'skin_middle_grey',
        name: 'Middle Grey',
        price: '$2.00',
        priceTokens: 5,
        priceUSD: 2,
        priceCoins: 100,
        description: 'Neutral grey. Balanced and soft.',
        minLevel: 0,
        style: {
            bg: 'bg-[#2e2e2e]',
            text: 'text-[#e0e0e0] font-mono',
            border: 'border-[#404040]',
            highlight: 'text-[#a0a0a0]'
        },
        colorSwatch: '#2e2e2e'
    },
    {
        id: 'skin_void_master',
        name: 'Void Master',
        price: 'Unlock',
        description: 'Absolute zero. Available at Level 10.',
        minLevel: 10,
        style: {
            bg: 'bg-[#05000a]',
            text: 'text-purple-200 font-cinzel',
            border: 'border-purple-900',
            highlight: 'text-purple-500'
        },
        colorSwatch: '#1a0022'
    },
    {
        id: 'skin_gold_legend',
        name: 'Gold Legend',
        price: 'Unlock',
        description: 'Pure opulence. Available at Level 20.',
        minLevel: 20,
        style: {
            bg: 'bg-[#1a1400]',
            text: 'text-yellow-100 font-serif',
            border: 'border-yellow-500',
            highlight: 'text-yellow-400'
        },
        colorSwatch: '#332a00'
    }
];

const SUGGESTED_BOOKS = [
    { title: "Mindset", author: "Carol Dweck", url: "https://www.amazon.com/Mindset-Psychology-Carol-S-Dweck/dp/0345472322", summary: "The new psychology of success. How we can learn to fulfill our potential." },
    { title: "Outwitting the Devil", author: "Napoleon Hill", url: "https://www.amazon.com/Outwitting-Devil-Secret-Freedom-Success/dp/1454900679", summary: "The secret to freedom and success. Unlocking the barriers of fear and procrastination." },
    { title: "The Gap and The Gain", author: "Dan Sullivan", url: "https://www.amazon.com/Gap-Gain-Achievers-Happiness-Confidence/dp/1401964362", summary: "Focus on your progress (the gain) rather than the ideal (the gap) to maintain happiness and high performance." },
    { title: "King, Warrior, Magician, Lover", author: "Robert Moore", url: "https://www.amazon.com/King-Warrior-Magician-Lover-Rediscovering/dp/0062506064", summary: "Rediscovering the archetypes of the mature masculine. A guide to psychological wholeness." }
];

const CREATIVITY_QUOTES = [
    { text: "The most creative individuals were found to be those who had not lost their ability to play.", author: "Donald MacKinnon" },
    { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
    { text: "Play is the exultation of the possible.", author: "Martin Buber" },
    { text: "You can't use up creativity. The more you use, the more you have.", author: "Maya Angelou" },
    { text: "The creation of something new is not accomplished by the intellect but by the play instinct.", author: "Carl Jung" }
];

// --- ICONS (SVG Replacements) ---
const Icons = {
    Visual: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a16.001 16.001 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>,
    Audio: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" /></svg>,
    Digital: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>,
    Perform: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.414-.375-.825.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Sculpt: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>,
    Help: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>,
    Time: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    Home: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    Spark: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.047 8.287 8.287 0 009 9.601a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>,
    Handshake: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575V12a1.5 1.5 0 003 0v-1.5m6.75-4.5a1.5 1.5 0 00-3 0v2.175V12a1.5 1.5 0 003 0v-1.5m-6.75-4.5v3m0-3l.075 5.925M13.5 12v3" /></svg>,
    Token: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>,
    Law: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" /></svg>,
    Board: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Calc: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-1.5A2.25 2.25 0 018.25 6z" /></svg>,
    Lock: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
    Dna: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>,
    Play: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" /></svg>,
    Speaker: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>,
    Shield: () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>,
};

// --- AUDIO HELPERS FOR TTS ---
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// --- SKIN PREVIEW COMPONENT ---
const SkinVariancePreview: React.FC<{ skin: PlatformSkin }> = ({ skin }) => {
    return (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 w-48">
            <div className={`w-full h-32 rounded-lg border-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative ${skin.style.bg} ${skin.style.border}`}>
                {/* Simulated UI Header */}
                <div className={`h-6 border-b ${skin.style.border} flex items-center px-3 justify-between bg-white/5`}>
                    <div className="flex gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${skin.style.text.includes('text-white') || skin.style.text.includes('text-[#') ? 'bg-white' : 'bg-black'} opacity-40`}></div>
                        <div className={`w-2 h-2 rounded-full ${skin.style.text.includes('text-white') || skin.style.text.includes('text-[#') ? 'bg-white' : 'bg-black'} opacity-20`}></div>
                    </div>
                    <div className={`text-[8px] font-bold uppercase tracking-widest ${skin.style.highlight}`}>
                        HUB V.2
                    </div>
                </div>
                
                {/* Simulated Content */}
                <div className={`p-3 flex gap-2 h-full ${skin.style.text}`}>
                    {/* Sidebar */}
                    <div className={`w-8 h-16 border rounded ${skin.style.border} bg-current opacity-5`}></div>
                    
                    {/* Main Area */}
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="w-full h-2 rounded bg-current opacity-10"></div>
                        <div className="w-3/4 h-2 rounded bg-current opacity-10"></div>
                        
                        <div className="flex gap-1 mt-1">
                             <div className="w-4 h-4 rounded bg-current opacity-10"></div>
                             <div className="w-4 h-4 rounded bg-current opacity-10"></div>
                             <div className="w-4 h-4 rounded bg-current opacity-10"></div>
                        </div>

                        <div className={`mt-auto w-full py-1 border rounded text-center text-[6px] uppercase font-bold ${skin.style.border} ${skin.style.highlight}`}>
                            {skin.name} Mode
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Tooltip Arrow */}
            <div className={`w-4 h-4 transform rotate-45 mx-auto -mt-2 border-r border-b ${skin.style.bg} ${skin.style.border}`}></div>
        </div>
    );
};

// --- HEXTECH UI HELPERS (THEMED) ---

const HexButton: React.FC<{ onClick?: () => void; children: React.ReactNode; primary?: boolean; className?: string; themeStyles: any; disabled?: boolean }> = ({ onClick, children, primary, className = '', themeStyles, disabled }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`relative group px-8 py-3 font-cinzel font-bold uppercase tracking-widest text-xs transition-all duration-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
        {/* The skewed background shape */}
        <div className={`absolute inset-0 transform skew-x-[-12deg] border-2 transition-all duration-300
            ${primary 
                ? `bg-white/10 ${themeStyles.border} group-hover:bg-white/20` 
                : `bg-black/40 border-white/10 group-hover:${themeStyles.border}`
            }`} 
        />
        <span className={`relative z-10 transition-colors ${primary ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
            {children}
        </span>
    </button>
);

const ClassIcon: React.FC<{ type: string; selected: boolean; onClick: () => void; themeStyles: any }> = ({ type, selected, onClick, themeStyles }) => {
    
    const renderIcon = () => {
        switch(type) {
            case 'VISUAL': return <Icons.Visual />;
            case 'AUDIO': return <Icons.Audio />;
            case 'DIGITAL': return <Icons.Digital />;
            case 'PERFORM': return <Icons.Perform />;
            case 'SCULPT': return <Icons.Sculpt />;
            default: return <Icons.Spark />;
        }
    };

    return (
        <div 
            onClick={onClick}
            className={`cursor-pointer flex flex-col items-center gap-3 transition-all duration-300 ${selected ? 'scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
        >
            <div className={`w-20 h-20 flex items-center justify-center border-2 rounded-full bg-black/40 backdrop-blur-md relative transition-all duration-500
                ${selected ? `${themeStyles.border} shadow-[0_0_20px_rgba(255,255,255,0.2)]` : 'border-white/10'}`}>
                <span className="text-white drop-shadow-md">{renderIcon()}</span>
                {selected && <div className={`absolute inset-0 border-2 rounded-full animate-ping opacity-20 ${themeStyles.border}`}></div>}
            </div>
            <span className={`font-cinzel text-[10px] tracking-widest uppercase ${selected ? 'text-white' : 'text-neutral-500'}`}>{type}</span>
        </div>
    );
};

// --- TOOL COMPONENTS ---

// 1. Legal Modal
const LegalModal: React.FC<{ onClose: () => void; themeStyles: any; isMaestro: boolean }> = ({ onClose, themeStyles, isMaestro }) => {
    const [tab, setTab] = useState<'COPYRIGHT' | 'TEMPLATES' | 'RESOURCES' | 'AI'>('COPYRIGHT');
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
            <div className={`w-full max-w-3xl bg-[#0a0a0a] border ${themeStyles.border} h-[85vh] flex flex-col relative shadow-2xl`}>
                <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white z-10">✕</button>
                
                <div className="p-8 border-b border-white/10 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                        <Icons.Law />
                    </div>
                    <h2 className="font-cinzel text-3xl text-white mb-2">The Legal Codex</h2>
                    <p className="text-neutral-500 text-xs uppercase tracking-widest">Protecting Your Creation</p>
                </div>

                <div className="flex border-b border-white/10 overflow-x-auto">
                    {['COPYRIGHT', 'TEMPLATES', 'RESOURCES', 'AI'].map(t => (
                        <button 
                            key={t}
                            onClick={() => setTab(t as any)}
                            className={`flex-1 py-4 px-4 text-xs font-bold uppercase tracking-widest transition-colors whitespace-nowrap ${tab === t ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-8 font-lato text-neutral-300 space-y-8">
                    {tab === 'COPYRIGHT' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h3 className="font-cinzel text-xl text-white border-b border-white/10 pb-2">Copyright Essentials</h3>
                            
                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">Automatic Protection</h4>
                                <p className="text-sm">In most jurisdictions (Berne Convention), copyright exists the moment a work is fixed in a tangible medium. You do not strictly need to register it to own it, though registration helps significantly in lawsuits.</p>
                            </div>

                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">Your Rights</h4>
                                <p className="text-sm">As the creator, you have the exclusive right to:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-neutral-400">
                                    <li>Reproduce the work (copies).</li>
                                    <li>Distribute copies to the public.</li>
                                    <li>Perform or display the work publicly.</li>
                                    <li>Create derivative works (remixes, sequels).</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">Fair Use</h4>
                                <p className="text-sm">Limited use of copyrighted material without permission is allowed for purposes such as criticism, comment, news reporting, teaching, and research.</p>
                            </div>

                            <div className="bg-blue-900/10 p-4 border border-blue-500/30 rounded mt-4">
                                <p className="text-xs text-blue-200"><strong>Note:</strong> Moral rights (integrity of work, attribution) can often be waived but not transferred, unlike economic rights.</p>
                            </div>
                        </div>
                    )}

                    {tab === 'TEMPLATES' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h3 className="font-cinzel text-xl text-white border-b border-white/10 pb-2">Contract Templates</h3>
                            <p className="text-sm">Standardized legal documents to protect your work and agreements.</p>

                            <div className="grid grid-cols-1 gap-4">
                                {/* Free Template 1 */}
                                <div className="p-4 border border-white/10 bg-white/5 rounded flex justify-between items-center group hover:border-[#d4af37]/50 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Model Release Form</h4>
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">Essential for Photographers</p>
                                    </div>
                                    <button className="px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase rounded hover:bg-white/20">Download</button>
                                </div>

                                {/* Free Template 2 */}
                                <div className="p-4 border border-white/10 bg-white/5 rounded flex justify-between items-center group hover:border-[#d4af37]/50 transition-colors">
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Work for Hire Agreement</h4>
                                        <p className="text-[10px] text-neutral-400 uppercase tracking-widest mt-1">For Freelancers & Clients</p>
                                    </div>
                                    <button className="px-4 py-2 bg-white/10 text-white text-xs font-bold uppercase rounded hover:bg-white/20">Download</button>
                                </div>

                                {/* Locked Template */}
                                <div className={`p-4 border border-white/10 ${isMaestro ? 'bg-white/5' : 'bg-black/40 opacity-70'} rounded flex justify-between items-center`}>
                                    <div>
                                        <h4 className="font-bold text-neutral-500 text-sm flex items-center gap-2">
                                            Licensing Contract {!isMaestro && <Icons.Lock />}
                                        </h4>
                                        <p className="text-[10px] text-neutral-600 uppercase tracking-widest mt-1">Commercial Usage Rights</p>
                                    </div>
                                    <button disabled={!isMaestro} className={`px-4 py-2 border border-white/5 text-xs font-bold uppercase rounded ${isMaestro ? 'bg-white/10 text-white hover:bg-white/20' : 'text-neutral-600 cursor-not-allowed'}`}>
                                        {isMaestro ? 'Download' : 'Maestro Only'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'RESOURCES' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h3 className="font-cinzel text-xl text-white border-b border-white/10 pb-2">Royalty-Free Resources</h3>
                            <p className="text-sm mb-4">Safe assets to use in your commercial or personal projects without fear of strikes.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-bold text-[#d4af37] text-sm uppercase tracking-widest mb-3">Images & Video</h4>
                                    <ul className="space-y-2">
                                        <li><a href="https://unsplash.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-white text-neutral-400 transition-colors">↗ Unsplash</a></li>
                                        <li><a href="https://pexels.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-white text-neutral-400 transition-colors">↗ Pexels</a></li>
                                        <li><a href="https://pixabay.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-white text-neutral-400 transition-colors">↗ Pixabay</a></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#d4af37] text-sm uppercase tracking-widest mb-3">Music & Audio</h4>
                                    <ul className="space-y-2">
                                        <li><a href="https://freemusicarchive.org" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-white text-neutral-400 transition-colors">↗ Free Music Archive</a></li>
                                        <li><a href="https://youtube.com/audiolibrary" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-white text-neutral-400 transition-colors">↗ YouTube Audio Library</a></li>
                                        <li><a href="https://incompetech.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-white text-neutral-400 transition-colors">↗ Incompetech</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {tab === 'AI' && (
                        <div className="space-y-6 animate-fadeIn">
                            <h3 className="font-cinzel text-xl text-white border-b border-white/10 pb-2">AI & Copyright</h3>
                            
                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">USCO Stance</h4>
                                <p className="text-sm">Works created purely by AI without significant human creative input are currently <strong>not copyrightable</strong> in the US and many other jurisdictions.</p>
                            </div>

                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">Human-AI Collaboration</h4>
                                <p className="text-sm">If a human modifies, arranges, or curates AI output significantly, the human-created aspects may be protected.</p>
                            </div>

                            <div className="bg-yellow-900/20 p-4 border border-yellow-700/50 rounded mt-4 flex gap-4">
                                <div className="text-2xl">💡</div>
                                <div>
                                    <p className="text-xs text-yellow-200 font-bold uppercase tracking-widest mb-1">Pro Tip</p>
                                    <p className="text-sm text-yellow-100">Always document your creative process (prompts, edits, sketches, layers) to prove human authorship if challenged.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-white/10 bg-black/20">
                     <div className="flex items-center justify-between gap-4">
                         <div className="hidden md:block">
                             <p className="text-white text-sm font-bold">Legal Consultation</p>
                             <p className="text-neutral-500 text-[10px]">30-min session with Arts & Entertainment lawyer.</p>
                         </div>
                         <button 
                            disabled={!isMaestro}
                            className={`flex-1 py-4 px-6 font-cinzel font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all rounded
                                ${isMaestro ? 'bg-[#d4af37] text-black hover:bg-[#b89c6f]' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'}
                            `}
                         >
                             {!isMaestro && <Icons.Lock />}
                             {isMaestro ? "Book Session (Free)" : "Unlock with Maestro Tier"}
                         </button>
                     </div>
                </div>
            </div>
        </div>
    );
};

// 2. Bio-Forge (Enhanced)
const BioForge: React.FC<{ onClose: () => void; themeStyles: any }> = ({ onClose, themeStyles }) => {
    const [mode, setMode] = useState<'IDENTITY' | 'TREE'>('IDENTITY');
    
    // IDENTITY STATE
    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState({
        hook: '',
        story: '',
        value: '',
        ask: ''
    });

    // SKILL TREE STATE
    interface SkillNode {
        id: string;
        label: string;
        parentId: string | null;
        lesson: string;
        evolution: string;
        x?: number; // Visual position if needed, or just auto-layout
        y?: number;
    }
    
    const [nodes, setNodes] = useState<SkillNode[]>([
        { id: 'root', label: 'The Artist', parentId: null, lesson: 'Soul', evolution: 'Expression' }
    ]);
    const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
    const [newNode, setNewNode] = useState({ label: '', parentId: 'root', lesson: '', evolution: '' });

    const handleAddNode = () => {
        if (!newNode.label) return;
        const node: SkillNode = {
            id: `node-${Date.now()}`,
            label: newNode.label,
            parentId: newNode.parentId,
            lesson: newNode.lesson,
            evolution: newNode.evolution
        };
        setNodes([...nodes, node]);
        setIsNodeModalOpen(false);
        setNewNode({ label: '', parentId: 'root', lesson: '', evolution: '' });
    };

    const generateBio = () => {
        return `${answers.hook}\n\n${answers.story}\n\n${answers.value}\n\n${answers.ask}`;
    };

    // Helper to render tree (recursive or flat mapped)
    const renderTree = () => {
        // Simple visualizer: Root at top, children below.
        return (
            <div className="flex flex-col items-center space-y-8 overflow-y-auto max-h-[60vh] p-4 w-full">
                {/* Root */}
                {nodes.filter(n => !n.parentId).map(root => (
                    <div key={root.id} className="flex flex-col items-center w-full">
                        <div className="p-4 bg-fuchsia-900/40 border border-fuchsia-500 text-white font-cinzel font-bold rounded-xl shadow-[0_0_20px_rgba(192,38,211,0.3)] z-10 relative">
                            {root.label}
                        </div>
                        {renderChildren(root.id)}
                    </div>
                ))}
            </div>
        );
    };

    const renderChildren = (parentId: string) => {
        const children = nodes.filter(n => n.parentId === parentId);
        if (children.length === 0) return null;
        return (
            <div className="flex flex-wrap justify-center gap-8 mt-8 relative">
                {children.map(child => (
                    <div key={child.id} className="flex flex-col items-center relative">
                        {/* Vertical line from parent */}
                        <div className="h-8 w-px bg-white/20 -mt-8 mb-0"></div>
                        
                        <div className="group relative p-4 bg-neutral-900 border border-white/20 rounded-lg hover:border-[#d4af37] transition-all w-48 text-center">
                            <h4 className="text-white font-bold text-sm mb-1">{child.label}</h4>
                            <div className="text-[9px] text-neutral-400 uppercase tracking-widest mt-2 border-t border-white/10 pt-2">
                                Becomes: <span className="text-fuchsia-400">{child.evolution}</span>
                            </div>
                            
                            {/* Hover Details */}
                            <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-black border border-white/20 p-2 text-[10px] text-neutral-300 rounded pointer-events-none z-20">
                                Lesson: {child.lesson}
                            </div>
                        </div>
                        {renderChildren(child.id)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
            <div className={`w-full max-w-6xl bg-[#0a0a0a] border ${themeStyles.border} h-[90vh] flex flex-col relative shadow-2xl overflow-hidden`}>
                <button onClick={onClose} className="absolute top-6 right-6 text-neutral-500 hover:text-white z-20">✕</button>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button 
                        onClick={() => setMode('IDENTITY')}
                        className={`flex-1 py-4 font-cinzel font-bold uppercase tracking-widest transition-all ${mode === 'IDENTITY' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Identity Anvil
                    </button>
                    <button 
                        onClick={() => setMode('TREE')}
                        className={`flex-1 py-4 font-cinzel font-bold uppercase tracking-widest transition-all ${mode === 'TREE' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                        Skill Tree Builder
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 relative">
                    
                    {/* MODE: IDENTITY ANVIL */}
                    {mode === 'IDENTITY' && (
                        <div className="max-w-3xl mx-auto h-full flex flex-col">
                            {/* Progress */}
                            <div className="flex gap-2 mb-8">
                                {[1,2,3,4,5].map(i => (
                                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-[#d4af37]' : 'bg-white/10'}`}></div>
                                ))}
                            </div>

                            <div className="flex-1 flex flex-col justify-center">
                                {step === 1 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <div className="bg-red-900/10 border border-red-500/30 p-6 rounded-lg">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl">📢</span>
                                                <h3 className="font-bold text-red-400 text-sm uppercase tracking-widest">Gary Vaynerchuk Advice</h3>
                                            </div>
                                            <p className="text-sm text-neutral-300 italic">
                                                "Attention is the asset. Don't be boring. If you don't stop the scroll in the first 3 seconds, you're dead. What is the one thing about your art that is undeniable? Jab, Jab, Jab, Right Hook."
                                            </p>
                                        </div>
                                        <div>
                                            <h2 className="font-cinzel text-3xl text-white mb-2">1. The Hook (Attention)</h2>
                                            <p className="text-neutral-500 text-xs uppercase tracking-widest mb-4">The Headline</p>
                                            <textarea 
                                                className="w-full h-32 bg-black border border-white/20 p-4 text-white focus:border-[#d4af37] outline-none text-lg font-serif"
                                                placeholder="e.g. I paint the nightmares you forget when you wake up."
                                                value={answers.hook}
                                                onChange={(e) => setAnswers({...answers, hook: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <div className="bg-blue-900/10 border border-blue-500/30 p-6 rounded-lg">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl">❤️</span>
                                                <h3 className="font-bold text-blue-400 text-sm uppercase tracking-widest">Martin Latulippe Advice</h3>
                                            </div>
                                            <p className="text-sm text-neutral-300 italic">
                                                "People don't buy what you do, they buy *why* you do it. Be human. Show the struggle. Vulnerability creates resonance. What pain or moment of joy birthed this art?"
                                            </p>
                                        </div>
                                        <div>
                                            <h2 className="font-cinzel text-3xl text-white mb-2">2. The Story (Connection)</h2>
                                            <p className="text-neutral-500 text-xs uppercase tracking-widest mb-4">Origin Story</p>
                                            <textarea 
                                                className="w-full h-32 bg-black border border-white/20 p-4 text-white focus:border-[#d4af37] outline-none text-lg font-serif"
                                                placeholder="Tell the origin story..."
                                                value={answers.story}
                                                onChange={(e) => setAnswers({...answers, story: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <div className="bg-orange-900/10 border border-orange-500/30 p-6 rounded-lg">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl">🔥</span>
                                                <h3 className="font-bold text-orange-400 text-sm uppercase tracking-widest">Tony Robbins Advice</h3>
                                            </div>
                                            <p className="text-sm text-neutral-300 italic">
                                                "Life is about emotion. You aren't selling a canvas; you are selling a *state change*. How does the buyer feel when they own this? What is the transformation you provide?"
                                            </p>
                                        </div>
                                        <div>
                                            <h2 className="font-cinzel text-3xl text-white mb-2">3. The Value (Transformation)</h2>
                                            <p className="text-neutral-500 text-xs uppercase tracking-widest mb-4">The Shift</p>
                                            <textarea 
                                                className="w-full h-32 bg-black border border-white/20 p-4 text-white focus:border-[#d4af37] outline-none text-lg font-serif"
                                                placeholder="e.g. My work brings chaos into order, giving your space a focal point of intense calm."
                                                value={answers.value}
                                                onChange={(e) => setAnswers({...answers, value: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 4 && (
                                    <div className="animate-fadeIn space-y-6">
                                        <div className="bg-emerald-900/10 border border-emerald-500/30 p-6 rounded-lg">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl">🤝</span>
                                                <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-widest">The Close</h3>
                                            </div>
                                            <p className="text-sm text-neutral-300 italic">
                                                "You have built value and connection. Now, lead them. If you don't ask, the answer is always no. Be clear about the next step."
                                            </p>
                                        </div>
                                        <div>
                                            <h2 className="font-cinzel text-3xl text-white mb-2">4. The Ask (Close)</h2>
                                            <p className="text-neutral-500 text-xs uppercase tracking-widest mb-4">Call to Action</p>
                                            <textarea 
                                                className="w-full h-32 bg-black border border-white/20 p-4 text-white focus:border-[#d4af37] outline-none text-lg font-serif"
                                                placeholder="e.g. Join the collection. Book a consultation."
                                                value={answers.ask}
                                                onChange={(e) => setAnswers({...answers, ask: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 5 && (
                                    <div className="animate-fadeIn flex flex-col items-center w-full">
                                        <h2 className="font-cinzel text-3xl text-white mb-8">Identity Forged</h2>
                                        <div className="bg-white/5 p-8 rounded border border-white/10 text-left font-serif text-lg leading-relaxed text-neutral-300 w-full mb-8 whitespace-pre-line">
                                            {generateBio()}
                                        </div>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(generateBio())}
                                            className="px-8 py-3 bg-[#d4af37] hover:bg-[#b89c6f] text-black font-bold uppercase text-xs tracking-widest rounded transition-colors"
                                        >
                                            Copy to Clipboard
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-between">
                                {step > 1 ? (
                                    <button onClick={() => setStep(s => s - 1)} className="text-neutral-500 hover:text-white uppercase font-bold text-xs">← Back</button>
                                ) : <div></div>}
                                {step < 5 ? (
                                    <HexButton primary onClick={() => setStep(s => s + 1)} themeStyles={themeStyles}>Next Phase</HexButton>
                                ) : (
                                    <button onClick={onClose} className="text-neutral-500 hover:text-white uppercase font-bold text-xs">Close</button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* MODE: SKILL TREE */}
                    {mode === 'TREE' && (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="font-cinzel text-2xl text-white">Skill Tree</h2>
                                    <p className="text-neutral-500 text-xs uppercase tracking-widest">Map your evolution</p>
                                </div>
                                <button 
                                    onClick={() => setIsNodeModalOpen(true)}
                                    className="px-6 py-2 bg-fuchsia-700 hover:bg-fuchsia-600 text-white font-bold uppercase text-xs tracking-widest rounded shadow-[0_0_15px_rgba(192,38,211,0.4)]"
                                >
                                    + Add Node
                                </button>
                            </div>

                            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl relative overflow-hidden flex justify-center p-8">
                                {/* Tree Visualization */}
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] opacity-10 pointer-events-none"></div>
                                {renderTree()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Add Node Modal */}
                {isNodeModalOpen && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
                        <div className="bg-[#151515] border border-white/20 p-8 w-full max-w-md shadow-2xl relative">
                            <h3 className="font-cinzel text-xl text-white mb-6 text-center">Synthesize a New Skill</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Skill / Job Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-black border border-white/20 p-2 text-white text-sm outline-none focus:border-fuchsia-500"
                                        placeholder="e.g. Waitressing / Construction"
                                        value={newNode.label}
                                        onChange={e => setNewNode({...newNode, label: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">Connected To</label>
                                    <select 
                                        className="w-full bg-black border border-white/20 p-2 text-white text-sm outline-none focus:border-fuchsia-500"
                                        value={newNode.parentId || ''}
                                        onChange={e => setNewNode({...newNode, parentId: e.target.value})}
                                    >
                                        {nodes.map(n => (
                                            <option key={n.id} value={n.id}>{n.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">What does this teach my art?</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-black border border-white/20 p-2 text-white text-sm outline-none focus:border-fuchsia-500"
                                        placeholder="e.g. Dealing with difficult people"
                                        value={newNode.lesson}
                                        onChange={e => setNewNode({...newNode, lesson: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase font-bold text-neutral-500 mb-1">What does this skill evolve into?</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-black border border-white/20 p-2 text-white text-sm outline-none focus:border-fuchsia-500"
                                        placeholder="e.g. Client Management / Resilience"
                                        value={newNode.evolution}
                                        onChange={e => setNewNode({...newNode, evolution: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 mt-8">
                                <button 
                                    onClick={() => setIsNodeModalOpen(false)}
                                    className="flex-1 py-3 border border-white/10 hover:bg-white/5 text-neutral-400 font-bold uppercase text-xs tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAddNode}
                                    className="flex-1 py-3 bg-fuchsia-700 hover:bg-fuchsia-600 text-white font-bold uppercase text-xs tracking-widest shadow-lg"
                                >
                                    Add Node
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// 3. Copyrighter Modal (New Tool)
const CopyrighterModal: React.FC<{ onClose: () => void; themeStyles: any }> = ({ onClose, themeStyles }) => {
    const [step, setStep] = useState(1);
    const [title, setTitle] = useState('');
    const [timestamp, setTimestamp] = useState('');

    const handleRegister = () => {
        setStep(2);
        // Simulate a blockchain timestamp
        setTimeout(() => {
            setTimestamp(new Date().toISOString());
            setStep(3);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
            <div className={`w-full max-w-lg bg-[#0a0a0a] border ${themeStyles.border} relative shadow-2xl overflow-hidden`}>
                <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white z-10">✕</button>
                
                <div className="p-8 text-center bg-black/40 border-b border-white/10">
                    <div className="w-16 h-16 mx-auto mb-4 bg-white/5 rounded-full flex items-center justify-center">
                        <Icons.Shield />
                    </div>
                    <h2 className="font-cinzel text-2xl text-white mb-1">The Copyrighter</h2>
                    <p className="text-neutral-500 text-xs uppercase tracking-widest">Le Salon Registry</p>
                </div>

                <div className="p-8">
                    {step === 1 && (
                        <div className="space-y-6">
                            <p className="text-neutral-300 text-sm text-center">
                                Timestamp your creative assets on our internal registry. This creates a proof of existence.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Project Title / Asset Name</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-black border border-white/20 p-3 text-white focus:border-white/50 outline-none"
                                    placeholder="e.g. Final Draft_v3.pdf"
                                />
                            </div>
                            <div className="border border-dashed border-white/20 rounded p-8 text-center cursor-pointer hover:bg-white/5 transition-colors">
                                <span className="text-2xl block mb-2">📎</span>
                                <span className="text-xs text-neutral-400 uppercase font-bold">Upload File (Hash Only)</span>
                            </div>
                            <button 
                                onClick={handleRegister}
                                disabled={!title}
                                className={`w-full py-3 font-cinzel font-bold text-xs uppercase tracking-widest ${title ? 'bg-white text-black hover:bg-neutral-200' : 'bg-white/10 text-neutral-500 cursor-not-allowed'}`}
                            >
                                Register Asset
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="text-center py-8">
                            <div className="inline-block w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                            <p className="text-neutral-400 text-xs uppercase tracking-widest">Hashing & Timestamping...</p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto text-3xl border border-green-500/50">
                                ✓
                            </div>
                            <div>
                                <h3 className="text-white font-cinzel text-xl">Asset Registered</h3>
                                <p className="text-neutral-500 text-xs mt-1">Stored in Le Salon Immutable Ledger</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded text-left space-y-2 border border-white/10">
                                <div>
                                    <span className="text-[10px] uppercase text-neutral-500 block">Asset Name</span>
                                    <span className="text-white text-sm font-mono">{title}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-neutral-500 block">Timestamp</span>
                                    <span className="text-[#d4af37] text-sm font-mono">{timestamp}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-neutral-500 block">Hash ID</span>
                                    <span className="text-neutral-400 text-[10px] font-mono break-all">0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069</span>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-full py-3 border border-white/20 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// 4. Library Modal (New Feature)
const LibraryModal: React.FC<{ onClose: () => void; themeStyles: any }> = ({ onClose, themeStyles }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fadeIn">
            <div className={`w-full max-w-4xl bg-[#0a0a0a] border ${themeStyles.border} h-[80vh] flex flex-col relative shadow-2xl`}>
                <button onClick={onClose} className="absolute top-6 right-6 text-neutral-500 hover:text-white z-10 text-xl">✕</button>
                
                <div className="p-10 border-b border-white/10 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]">
                    <h2 className="font-cinzel text-4xl text-white mb-2">The Library</h2>
                    <p className="text-[#d4af37] text-xs uppercase tracking-[0.2em]">Essential Readings for the Creator</p>
                </div>

                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {SUGGESTED_BOOKS.map((book, i) => (
                        <a 
                            key={i} 
                            href={book.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group block bg-[#1a1a1a] border border-white/10 p-6 hover:border-[#d4af37] transition-all hover:-translate-y-1"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-serif text-xl text-white group-hover:text-[#d4af37] transition-colors">{book.title}</h3>
                                <span className="text-neutral-500 text-lg">↗</span>
                            </div>
                            <p className="text-xs text-neutral-500 uppercase tracking-widest mb-4">By {book.author}</p>
                            <p className="text-sm text-neutral-300 font-lato leading-relaxed">
                                {book.summary}
                            </p>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
};


export const ArtistHub: React.FC<ArtistHubProps> = ({ theme, themeStyles, phase, setPhase, language, currentUser = null, isArtist = false, onRequestSignIn, onExit, onThemeChange, onContextChange }) => {
    // Default tab is COLLABORATE for everyone — including logged-in users —
    // so the studio's first impression is always the branded WELCOME hero in
    // the viewer above. The `hasNavigated` flag tracks whether the user has
    // explicitly chosen a tab; flipped at the click sites (not via effect,
    // which Strict Mode would fire twice).
    const [activeTab, setActiveTab] = useState<Tab>('COLLABORATE');
    const [hasNavigated, setHasNavigated] = useState(false);

    // Access level derives from real auth: signed-in user → MEMBER; anonymous
    // → GUEST. The local toggle (line ~1749) still lets users preview the
    // GUEST experience even when authed. When auth state changes from outside
    // (login / logout), only flip the access level — never override the
    // active tab, so the WELCOME viewer hero stays put.
    const [accessLevel, setAccessLevel] = useState<AccessLevel>(currentUser ? 'MEMBER' : 'GUEST');
    useEffect(() => {
        setAccessLevel(currentUser ? 'MEMBER' : 'GUEST');
        if (currentUser) {
            setPhase('LOBBY');
        }
    }, [currentUser?.uid]);
    const [membershipTier, setMembershipTier] = useState<MembershipTier>('INITIATE');
    const [userPoints, setUserPoints] = useState(50);
    const userLevel = Math.floor(userPoints / 10);

    const [filterSubject, setFilterSubject] = useState("ALL");
    const [userTokens, setUserTokens] = useState(10);

    // Coins / puzzle progression — independent from Time Tokens (which are
    // hours-of-skill currency for the Exchange). Coins are awarded for site
    // activity; lifetimeCoins drives puzzle progression and never decreases.
    // Spending coins on skins reduces `coins` but leaves `lifetimeCoins`
    // untouched, so the user keeps their puzzle progress.
    const [coins, setCoins] = useState(0);
    const [lifetimeCoins, setLifetimeCoins] = useState(0);
    const [puzzlesCompleted, setPuzzlesCompleted] = useState(0);
    const [currentPuzzleId, setCurrentPuzzleId] = useState<string | null>(null);
    const [displayCase, setDisplayCase] = useState<string[]>([]);
    // Live puzzle DOM wrapper — used to snapshot the source rect at the moment
    // a puzzle completes, so the celebration overlay can fly from here to the
    // matching display-case tile.
    const puzzleSlotRef = useRef<HTMLDivElement | null>(null);
    interface PuzzleCelebrationState {
        artwork: PuzzleArtwork;
        sourceRect: DOMRect;
        /** Index of the destination tile in the post-completion display case. */
        targetIndex: number;
    }
    const [puzzleCelebration, setPuzzleCelebration] = useState<PuzzleCelebrationState | null>(null);
    // Display-case interactions: fullscreen viewer + sell + gift flow.
    const [viewingPuzzleIndex, setViewingPuzzleIndex] = useState<number | null>(null);
    const [giftingPuzzleIndex, setGiftingPuzzleIndex] = useState<number | null>(null);
    interface PuzzleGift {
        id: string;
        fromUid: string;
        toUid: string;
        fromName: string;
        toName: string;
        puzzleId: string;
        status: 'pending' | 'accepted' | 'declined';
        createdAt?: { seconds: number } | null;
        respondedAt?: { seconds: number } | null;
        reclaimed?: boolean;
    }
    // Gifts where the current user is the recipient and status is 'pending'.
    const [puzzleGiftsInbox, setPuzzleGiftsInbox] = useState<PuzzleGift[]>([]);
    // Gifts the current user sent that came back declined and haven't been
    // re-added to their display case yet — drives auto-reclaim.
    const [puzzleGiftsToReclaim, setPuzzleGiftsToReclaim] = useState<PuzzleGift[]>([]);

    // Roster claim map: rosterArtist.id → { uid, uidName }. Drives the
    // "I am this artist · Claim profile" button on each roster card. Live
    // via onSnapshot so the button disappears for everyone the moment the
    // claim doc is written.
    interface RosterClaim { uid: string; uidName?: string }
    const [rosterClaims, setRosterClaims] = useState<Record<string, RosterClaim>>({});
    // Roster card the user is currently trying to claim (null = modal closed).
    const [claimingArtistId, setClaimingArtistId] = useState<number | null>(null);
    const [claimPassword, setClaimPassword] = useState('');
    const [claimError, setClaimError] = useState<string | null>(null);
    const [claimSubmitting, setClaimSubmitting] = useState(false);
    // Sections the user has visited at least once (tab keys). Drives the
    // +5-on-first-visit coin reward — once a key is here we never re-award.
    const [sectionsVisited, setSectionsVisited] = useState<string[]>([]);
    // Article ids that have already triggered the +10 publish bonus, so we
    // don't double-award when the snapshot re-fires for the same article.
    const [articlesAwarded, setArticlesAwarded] = useState<string[]>([]);
    const [randomQuote, setRandomQuote] = useState(CREATIVITY_QUOTES[0]);
    
    // Tools State
    const [activeTool, setActiveTool] = useState<'LEGAL' | 'BIOFORGE' | 'COPYRIGHTER' | 'KANBAN' | 'GRANTS_CA' | 'INSPIROSPHERE' | null>(null);

    // Library State
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);

    // Set Random Quote on Mount
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * CREATIVITY_QUOTES.length);
        setRandomQuote(CREATIVITY_QUOTES[randomIndex]);
    }, []);

    // Hot Seat State
    const [hotSeatView, setHotSeatView] = useState<'LIST' | 'SUBMIT' | 'CRITIQUE'>('LIST');
    const [selectedHotSeatWork, setSelectedHotSeatWork] = useState<HotSeatSubmission | null>(null);
    const [hotSeatSubmissions, setHotSeatSubmissions] = useState<HotSeatSubmission[]>([
        {
            id: '1',
            title: 'Untitled Blue Period',
            artist: 'Krystel Levert',
            type: 'Visual',
            description: 'Trying a new layering technique with oil. Is the contrast too harsh in the lower quadrant?',
            imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb39279c0f?q=80&w=1000&auto=format&fit=crop',
            feedback: [
                { id: 'f1', author: 'Marc Alexis', capacity: 'Profane', text: 'I love the depth, but the top left feels empty. Maybe needs a counter-weight.', timestamp: '2h ago' }
            ]
        },
        {
            id: '2',
            title: 'Act 3 Scene 2',
            artist: 'Alice Renard',
            type: 'Writing',
            description: 'Dialogue flows weirdly between the protagonist and the shadow. Need help with pacing.',
            imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?q=80&w=1000&auto=format&fit=crop',
            feedback: []
        }
    ]);
    const [newSubmission, setNewSubmission] = useState<{
        title: string;
        type: string;
        stage: string;
        description: string;
        imageUrl: string;
        workLink: string;
        feedbackSought: string[];
        specificQuestions: string;
        sensitivities: string;
    }>({
        title: '',
        type: 'Drawing',
        stage: 'midDraft',
        description: '',
        imageUrl: '',
        workLink: '',
        feedbackSought: [],
        specificQuestions: '',
        sensitivities: '',
    });
    const [newCritique, setNewCritique] = useState({ capacity: 'Profane', text: '' });

    // Collaborate State
    const [collabForm, setCollabForm] = useState<'RESIDENCY' | 'EVENT' | 'PROJECT' | null>(null);
    const [collabFormData, setCollabFormData] = useState({ 
        name: '', 
        email: '', 
        idea: '', 
        dates: '',
        revenueTier: 'emerging', // 'emerging', 'established', 'master'
        needsBursary: false
    });

    // Skin State
    const [purchasedSkins, setPurchasedSkins] = useState<string[]>([]);
    const [activeSkinId, setActiveSkinId] = useState<string | null>(null);
    // Store preview — applied while browsing the STORE tab, reverts when the
    // user navigates away (effect cleared further below).
    const [previewSkinId, setPreviewSkinId] = useState<string | null>(null);

    // Effective skin = preview (if active) → activeSkinId. Lets users feel a
    // cosmetic before buying without overwriting their saved selection.
    const currentSkin = SKINS.find(s => s.id === (previewSkinId ?? activeSkinId));
    const currentStyles = currentSkin ? { ...themeStyles, ...currentSkin.style } : themeStyles;

    // Per-tab landing-title treatment. NEON ARCADE swaps the default cinzel
    // serif for the studio-display neon italic so titles like "Time Exchange"
    // read as siblings of the welcome-hero "STUDIO" wordmark. Other themes
    // already feel coherent with cinzel.
    const pageTitleClass = theme === 'RAINBOW'
        ? 'font-studio-display font-black italic uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.6)]'
        : 'font-cinzel text-white';

    // Per-theme form styling — drives the Hot Seat submission form (and any
    // future form that wants to inflect with the active skin). Each theme
    // gets a coherent bundle: container chrome, input/select chrome, the
    // chip-toggle active/inactive states, the submit button, and label
    // typography. The bundles intentionally borrow the theme's signature
    // accent so the form reads as part of the surrounding skin, not a
    // generic dark-grey island dropped on top.
    const formStyles = useMemo(() => {
        switch (theme) {
            case 'RAINBOW':
                return {
                    container:    'bg-black/60 backdrop-blur-md border border-white/15 rounded-xl shadow-[0_0_60px_rgba(217,70,239,0.15)]',
                    input:        'bg-black/40 border border-white/15 text-white placeholder:text-neutral-600 focus:border-cyan-400 focus:shadow-[0_0_14px_rgba(34,211,238,0.35)] outline-none transition-shadow rounded',
                    label:        'block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-2',
                    chipActive:   'border-fuchsia-400 bg-fuchsia-500/15 text-white shadow-[0_0_12px_rgba(217,70,239,0.4)]',
                    chipInactive: 'border-white/15 text-neutral-400 hover:text-white hover:border-white/40',
                    submitOn:     'bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-yellow-300 text-black font-black italic uppercase tracking-tight hover:brightness-110',
                    submitOff:    'bg-white/5 text-neutral-500 cursor-not-allowed',
                    accentText:   'text-cyan-300',
                };
            case 'RED':
                return {
                    container:    'bg-[#0a0000] border border-red-900/60 rounded-sm',
                    input:        'bg-black/50 border border-red-900/50 text-white placeholder:text-neutral-700 focus:border-red-500 outline-none rounded-sm',
                    label:        'block text-[10px] font-mono uppercase tracking-widest text-red-400/80 mb-2',
                    chipActive:   'border-red-500 bg-red-500/20 text-red-100',
                    chipInactive: 'border-white/15 text-neutral-400 hover:text-white hover:border-red-500/50',
                    submitOn:     'bg-red-900 hover:bg-red-700 text-white border border-red-500 uppercase tracking-widest',
                    submitOff:    'bg-white/5 text-neutral-500 cursor-not-allowed',
                    accentText:   'text-red-400',
                };
            case 'BLUE_PUNK':
                return {
                    container:    'bg-[#120a1f] border border-fuchsia-500/40 rounded-sm',
                    input:        'bg-black/50 border border-cyan-500/30 text-cyan-100 placeholder:text-neutral-600 font-mono focus:border-fuchsia-400 outline-none rounded-sm',
                    label:        'block text-[10px] font-mono uppercase tracking-widest text-cyan-300/80 mb-2',
                    chipActive:   'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-100 font-mono',
                    chipInactive: 'border-cyan-500/20 text-cyan-400/60 hover:text-cyan-200 hover:border-cyan-400/60 font-mono',
                    submitOn:     'bg-fuchsia-600 hover:bg-fuchsia-500 text-white border border-cyan-400/40 font-mono uppercase tracking-widest',
                    submitOff:    'bg-white/5 text-neutral-500 cursor-not-allowed',
                    accentText:   'text-fuchsia-300',
                };
            case 'CLASSY':
                return {
                    container:    'bg-[#091428] border-2 border-[#c8aa6e]/50 rounded',
                    input:        'bg-[#010a13]/60 border border-[#c8aa6e]/30 text-[#f0e6d2] placeholder:text-[#c8aa6e]/40 font-cinzel focus:border-[#c8aa6e] outline-none rounded-sm',
                    label:        'block text-[10px] font-cinzel uppercase tracking-[0.3em] text-[#c8aa6e]/80 mb-2',
                    chipActive:   'border-[#c8aa6e] bg-[#c8aa6e]/20 text-[#f0e6d2]',
                    chipInactive: 'border-[#c8aa6e]/20 text-[#cdbe91]/60 hover:text-[#f0e6d2] hover:border-[#c8aa6e]/60',
                    submitOn:     'bg-[#c8aa6e] hover:bg-[#d4b876] text-[#091428] font-cinzel uppercase tracking-widest',
                    submitOff:    'bg-[#091428] text-[#c8aa6e]/40 border border-[#c8aa6e]/20 cursor-not-allowed',
                    accentText:   'text-[#c8aa6e]',
                };
            case 'CHROMATIC':
                return {
                    container:    'bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-xl shadow-[0_0_40px_rgba(168,85,247,0.15)]',
                    input:        'bg-black/40 border border-white/10 text-white placeholder:text-neutral-600 focus:border-purple-400 focus:shadow-[0_0_14px_rgba(168,85,247,0.35)] outline-none transition-shadow rounded-lg',
                    label:        'block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-400 mb-2',
                    chipActive:   'border-purple-400 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-white',
                    chipInactive: 'border-white/15 text-neutral-400 hover:text-white hover:border-white/40',
                    submitOn:     'bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 text-black font-bold uppercase tracking-widest hover:brightness-110',
                    submitOff:    'bg-white/5 text-neutral-500 cursor-not-allowed',
                    accentText:   'text-purple-300',
                };
            case 'COMIC':
                return {
                    container:    'bg-[#1e1e24] border-2 border-black shadow-[6px_6px_0px_#facc15] rounded-sm',
                    input:        'bg-[#121214] border-2 border-black text-white placeholder:text-neutral-600 font-black italic focus:border-[#facc15] focus:shadow-[3px_3px_0px_#facc15] outline-none rounded-sm',
                    label:        'block text-[10px] font-black italic uppercase tracking-tight text-white mb-2',
                    chipActive:   'border-2 border-black bg-[#facc15] text-black font-black italic shadow-[2px_2px_0px_#000]',
                    chipInactive: 'border-2 border-black bg-white/5 text-white hover:bg-white/10 font-black italic',
                    submitOn:     'bg-[#ef4444] text-white border-2 border-black shadow-[4px_4px_0px_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_#000] font-black italic uppercase tracking-tight transition-all',
                    submitOff:    'bg-white/5 text-neutral-500 border-2 border-black/40 cursor-not-allowed font-black italic',
                    accentText:   'text-[#facc15]',
                };
            default:
                return {
                    container:    'bg-[#141414] border border-white/10 rounded-xl',
                    input:        'bg-black/40 border border-white/20 text-white placeholder:text-neutral-600 focus:border-white/50 outline-none rounded',
                    label:        'block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-500 mb-2',
                    chipActive:   'border-white bg-white/10 text-white',
                    chipInactive: 'border-white/15 text-neutral-400 hover:text-white hover:border-white/40',
                    submitOn:     'bg-white text-black hover:bg-white/90 uppercase tracking-widest font-cinzel',
                    submitOff:    'bg-white/5 text-neutral-500 cursor-not-allowed',
                    accentText:   'text-white',
                };
        }
    }, [theme]);

    // Shared editorial section header — used across the Hot Seat submission,
    // article editor, contract modal, and collab forms so every long form
    // reads as a magazine spread (numbered chapters with helper copy and a
    // hairline rule), not a generic stack of fields.
    const FormSectionHeader: React.FC<{ n: string; en: string; fr: string; helpEn?: string; helpFr?: string }> = ({ n, en, fr, helpEn, helpFr }) => (
        <div className="flex items-baseline gap-3 mb-3">
            <span className={`font-mono text-[11px] tracking-[0.3em] tabular-nums ${formStyles.accentText} opacity-70`}>{n}</span>
            <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-cinzel uppercase tracking-[0.25em] ${theme === 'COMIC' ? 'font-black italic' : ''}`}>
                    {language === 'FR' ? fr : en}
                </h4>
                {(helpEn || helpFr) && (
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                        {language === 'FR' ? helpFr : helpEn}
                    </p>
                )}
            </div>
            <span className={`hidden sm:block flex-1 h-px ${theme === 'COMIC' ? 'bg-black' : 'bg-white/10'}`} />
        </div>
    );

    // Editorial header — consistent kicker + display title + brief used at
    // the top of every revamped form. Pass `n` to render a "№ 047" stamp.
    const FormEditorialHeader: React.FC<{
        kicker: string; titleEn: string; titleFr: string;
        leadEn?: string; leadFr?: string; n?: string;
    }> = ({ kicker, titleEn, titleFr, leadEn, leadFr, n }) => (
        <header className="mb-6">
            <div className="flex items-center gap-3 mb-3">
                <span className={`font-mono text-[10px] tracking-[0.5em] ${formStyles.accentText} opacity-80`}>{kicker}</span>
                <span className="flex-1 h-px bg-white/15" />
                {n && (
                    <span className="font-mono text-[10px] tracking-[0.3em] text-neutral-500 tabular-nums">{n}</span>
                )}
            </div>
            <h2 className={`text-3xl md:text-5xl leading-[0.95] mb-3 ${pageTitleClass}`}>
                {language === 'FR' ? titleFr : titleEn}
            </h2>
            {(leadEn || leadFr) && (
                <p className="text-sm text-neutral-300 max-w-2xl font-lato leading-relaxed">
                    {language === 'FR' ? leadFr : leadEn}
                </p>
            )}
        </header>
    );

    // Gallery State
    const [currentArtIndex, setCurrentArtIndex] = useState(0);

    // Registration State
    const [regData, setRegData] = useState<RegistrationData>({
        name: 'Vagabond',
        city: 'Digital Realm',
        country: 'CA',
        archetype: 'VISUAL',
        bio: 'Exploring the unknown.',
        skills: ['Creativity', 'Observation']
    });

    // Detect whether the visitor is in Canada — unlocks the "Aide aux
    // Subventions" tool. Priority: explicit profile country, then browser
    // timezone (Canadian zones), then navigator.language ("en-CA"/"fr-CA").
    // Re-runs when regData updates so a profile country change instantly
    // unlocks the tool.
    const isCanadianVisitor = useMemo(() => {
        if (regData.country === 'CA') return true;
        if (typeof Intl !== 'undefined') {
            try {
                const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
                if (/^America\/(Toronto|Montreal|Vancouver|Edmonton|Halifax|St_Johns|Winnipeg|Regina|Iqaluit|Whitehorse|Yellowknife|Moncton|Goose_Bay|Glace_Bay)$/.test(tz)) {
                    return true;
                }
            } catch { /* ignore */ }
        }
        if (typeof navigator !== 'undefined') {
            const lang = (navigator.language || '').toLowerCase();
            if (lang === 'en-ca' || lang === 'fr-ca') return true;
        }
        return false;
    }, [regData.country]);

    // ── Profile persistence (Firestore) ──────────────────────────────────────
    // Profile lives at members/{uid}/artistProfile/profile. Owner is the only
    // writer; firestore.rules enforces this. Consumers (the inn app) have
    // already initialized firebase via getApp() — we just call getFirestore()
    // on the same default app.
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileSavedAt, setProfileSavedAt] = useState<number | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
    // The single "featured" artwork URL — what shows as the user's main piece
    // at the top of their profile. Falls back to galleryUrls[0] when unset.
    const [featuredArtworkUrl, setFeaturedArtworkUrl] = useState<string | null>(null);
    // Whether the featured-artwork picker modal is open.
    const [isFeaturedPickerOpen, setIsFeaturedPickerOpen] = useState(false);
    type FeatureRequestStatus = 'none' | 'pending' | 'approved' | 'declined';
    const [featureRequest, setFeatureRequest] = useState<FeatureRequestStatus>('none');
    const [featureBusy, setFeatureBusy] = useState(false);

    // Inline edit drafts for the PROFILE tab. Bio + skills auto-save to
    // Firestore on commit (Enter / Done) so users don't have to remember to
    // tap the page-level Save Profile button after a quick tweak.
    const [editingBio, setEditingBio] = useState(false);
    const [bioDraft, setBioDraft] = useState('');
    const [editingSkills, setEditingSkills] = useState(false);
    const [newSkillInput, setNewSkillInput] = useState('');

    // Inbox — loaded from /conversations where uid is in members.
    interface InboxConversation {
        id: string;
        type: 'dm' | 'group';
        members: string[];
        memberProfiles: Record<string, { displayName: string; photoURL?: string }>;
        title?: string;
        lastMessage?: string;
        lastMessageAt?: { seconds: number } | null;
    }
    interface InboxMessage {
        id: string;
        uid: string;
        displayName: string;
        photoURL?: string;
        text: string;
        createdAt?: { seconds: number } | null;
    }
    const [conversations, setConversations] = useState<InboxConversation[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [convMessages, setConvMessages] = useState<InboxMessage[]>([]);
    const [messageDraft, setMessageDraft] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    // Friends — friendships docs where uids contains current user; status can
    // be 'pending' (incoming/outgoing request) or 'accepted'. Field shape
    // matches what PublicProfilePage writes (requestedBy + optional profiles
    // map for display).
    interface Friendship {
        id: string;
        uids: string[];
        requestedBy: string;
        status: 'pending' | 'accepted';
        profiles?: Record<string, { displayName?: string; photoURL?: string | null }>;
    }
    const [friendships, setFriendships] = useState<Friendship[]>([]);

    // Cosmetics — locally tracked but persisted to Firestore so purchases
    // survive reload. Loaded inside the same effect that loads the profile.

    // Live subscription to this user's profile doc. onSnapshot means any write
    // (from the pill avatar uploader, the dossier, or another tab) reflects
    // back into local state without a manual reload. featureRequest is loaded
    // once — its status changes are admin-driven and rare.
    useEffect(() => {
        if (!currentUser?.uid) {
            setAvatarUrl(null);
            setGalleryUrls([]);
            setFeatureRequest('none');
            return;
        }
        const db = studioFirestore(); if (!db) return;
        let firstLoad = true;
        const unsubProfile = onSnapshot(
            doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
            (profSnap) => {
                if (profSnap.exists()) {
                    const data = profSnap.data() as any;
                    setRegData(prev => ({
                        name: data.name ?? prev.name,
                        city: data.city ?? prev.city,
                        country: data.country ?? prev.country,
                        archetype: data.archetype ?? prev.archetype,
                        bio: data.bio ?? prev.bio,
                        skills: Array.isArray(data.skills) && data.skills.length ? data.skills : prev.skills,
                    }));
                    if (typeof data.avatarUrl === 'string') setAvatarUrl(data.avatarUrl);
                    if (Array.isArray(data.galleryUrls)) setGalleryUrls(data.galleryUrls);
                    if (typeof data.featuredArtworkUrl === 'string' || data.featuredArtworkUrl === null) {
                        setFeaturedArtworkUrl(data.featuredArtworkUrl ?? null);
                    }
                    if (Array.isArray(data.purchasedSkins)) setPurchasedSkins(data.purchasedSkins);
                    if (typeof data.activeSkinId === 'string' || data.activeSkinId === null) setActiveSkinId(data.activeSkinId ?? null);
                    if (typeof data.coins === 'number') setCoins(data.coins);
                    if (typeof data.lifetimeCoins === 'number') setLifetimeCoins(data.lifetimeCoins);
                    if (typeof data.puzzlesCompleted === 'number') setPuzzlesCompleted(data.puzzlesCompleted);
                    if (typeof data.currentPuzzleId === 'string' || data.currentPuzzleId === null) setCurrentPuzzleId(data.currentPuzzleId ?? null);
                    if (Array.isArray(data.displayCase)) setDisplayCase(data.displayCase);
                    if (Array.isArray(data.sectionsVisited)) setSectionsVisited(data.sectionsVisited);
                    if (Array.isArray(data.articlesAwarded)) setArticlesAwarded(data.articlesAwarded);
                } else if (firstLoad) {
                    // Seed the form with auth display name for first-time users.
                    setRegData(prev => ({
                        ...prev,
                        name: currentUser.displayName || prev.name,
                    }));
                    if (currentUser.photoURL) setAvatarUrl(currentUser.photoURL);
                }
                firstLoad = false;
            },
            (e) => setProfileError(String((e as any)?.message ?? e)),
        );
        // Feature-request: one-time read is fine — admin decisions are rare.
        (async () => {
            try {
                const reqSnap = await getDoc(doc(db, 'featureRequests', currentUser.uid));
                if (reqSnap.exists()) {
                    const s = (reqSnap.data() as any).status as FeatureRequestStatus;
                    setFeatureRequest(s ?? 'pending');
                } else {
                    setFeatureRequest('none');
                }
            } catch (e) {
                setProfileError(String((e as any)?.message ?? e));
            }
        })();
        return () => { unsubProfile(); };
    }, [currentUser?.uid]);

    // Live subscription to the user's conversations + friendships. Powers the
    // inbox panel and friends grid in the PROFILE tab. Both listeners tear
    // down on uid change.
    useEffect(() => {
        if (!currentUser?.uid) {
            setConversations([]);
            setFriendships([]);
            return;
        }
        const db = studioFirestore(); if (!db) return;
        const convQ = query(
            collection(db, 'conversations'),
            where('members', 'array-contains', currentUser.uid),
            orderBy('lastMessageAt', 'desc'),
        );
        const unsubConv = onSnapshot(convQ, snap => {
            const list: InboxConversation[] = [];
            snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
            setConversations(list);
        }, () => { /* swallow — empty state handles it */ });

        const friendQ = query(
            collection(db, 'friendships'),
            where('uids', 'array-contains', currentUser.uid),
        );
        const unsubFriend = onSnapshot(friendQ, snap => {
            const list: Friendship[] = [];
            snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
            setFriendships(list);
        }, () => { /* swallow */ });

        return () => { unsubConv(); unsubFriend(); };
    }, [currentUser?.uid]);

    // Live messages for the open conversation in the inbox panel.
    useEffect(() => {
        if (!activeConvId) { setConvMessages([]); return; }
        const db = studioFirestore(); if (!db) return;
        const msgsQ = query(
            collection(db, 'conversations', activeConvId, 'messages'),
            orderBy('createdAt', 'asc'),
        );
        const unsub = onSnapshot(msgsQ, snap => {
            const list: InboxMessage[] = [];
            snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
            setConvMessages(list);
        });
        return () => unsub();
    }, [activeConvId]);

    // Send a message into the active conversation. Also bumps the parent
    // conversation doc's lastMessage/lastMessageAt so the inbox sorts.
    const handleSendMessage = async () => {
        const text = messageDraft.trim();
        if (!text || !currentUser?.uid || !activeConvId) return;
        setSendingMessage(true);
        try {
            const db = studioFirestore(); if (!db) return;
            await addDoc(collection(db, 'conversations', activeConvId, 'messages'), {
                uid: currentUser.uid,
                displayName: regData.name || currentUser.displayName || 'Member',
                photoURL: avatarUrl ?? currentUser.photoURL ?? null,
                text,
                createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'conversations', activeConvId), {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
            });
            setMessageDraft('');
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        } finally {
            setSendingMessage(false);
        }
    };

    // Accept an incoming friend request. Status flips from 'pending' to
    // 'accepted' on the friendship doc; the requester sees this on their end
    // via the same onSnapshot.
    const handleAcceptFriend = async (friendshipId: string) => {
        if (!currentUser?.uid) return;
        try {
            const db = studioFirestore(); if (!db) return;
            await updateDoc(doc(db, 'friendships', friendshipId), {
                status: 'accepted',
                acceptedAt: serverTimestamp(),
            });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    // Inline edit handlers — save bio + skills directly to Firestore so the
    // user doesn't need to remember the page Save button.
    const handleSaveBio = async () => {
        if (!currentUser?.uid) return;
        const next = bioDraft.trim() || regData.bio;
        setRegData(prev => ({ ...prev, bio: next }));
        setEditingBio(false);
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { bio: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };
    const handleAddSkill = async () => {
        const s = newSkillInput.trim();
        if (!s || !currentUser?.uid) return;
        if (regData.skills.some(x => x.toLowerCase() === s.toLowerCase())) {
            setNewSkillInput('');
            return;
        }
        const next = [...regData.skills, s];
        setRegData(prev => ({ ...prev, skills: next }));
        setNewSkillInput('');
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { skills: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };
    const handleRemoveSkill = async (skill: string) => {
        if (!currentUser?.uid) return;
        const next = regData.skills.filter(x => x !== skill);
        setRegData(prev => ({ ...prev, skills: next }));
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { skills: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    // Delete a gallery image — removes from the Firestore array and best-effort
    // deletes the underlying Storage object. Storage delete is non-fatal: if
    // the URL doesn't decode to a known path (legacy uploads), the array
    // removal still wins.
    const handleDeleteGalleryImage = async (url: string) => {
        if (!currentUser?.uid) return;
        const next = galleryUrls.filter(u => u !== url);
        setGalleryUrls(next);
        if (currentArtIndex >= next.length) setCurrentArtIndex(Math.max(0, next.length - 1));
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { galleryUrls: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
        try {
            const storage = studioStorage();
            if (!storage) return;
            // Storage download URLs encode the object path between /o/ and ?
            const m = url.match(/\/o\/([^?]+)/);
            if (m && m[1]) {
                const path = decodeURIComponent(m[1]);
                await deleteObject(storageRef(storage, path));
            }
        } catch { /* non-fatal */ }
    };

    // Save the current profile snapshot. Triggered by the Save button on the
    // Profile tab.
    /**
     * Award `amount` coins to the signed-in member. Mutates BOTH the
     * spendable balance and the lifetime tally; checks for puzzle completion
     * after the lifetime increment and, if the active puzzle is now full,
     * advances to the next artwork + grants the +10 completion bonus.
     *
     * Pass a positive `amount` for activity rewards. Spending coins should
     * use `spendCoins` (defined below) — never call this with a negative
     * value, since lifetimeCoins must never decrease.
     */
    const awardCoins = async (amount: number) => {
        if (!currentUser?.uid || amount <= 0) return;
        const db = studioFirestore(); if (!db) return;
        try {
            const { PUZZLE_PIECES_TOTAL, PUZZLE_PIECES_TO_EARN, COINS_PER_PIECE,
                    COINS_PER_COMPLETION_BONUS, PUZZLE_PIECES_PRE_REVEALED,
                    pickPuzzleArtwork, PUZZLE_ARTWORKS } = await import('./puzzleArtworks');

            const newLifetime = lifetimeCoins + amount;
            const newCoins = coins + amount;
            const earnedTotalPieces = Math.floor(newLifetime / COINS_PER_PIECE);
            const earnedOnCurrent = Math.max(0, earnedTotalPieces - puzzlesCompleted * PUZZLE_PIECES_TO_EARN);
            const visiblePieces = Math.min(PUZZLE_PIECES_TOTAL, PUZZLE_PIECES_PRE_REVEALED + earnedOnCurrent);

            const completed = visiblePieces >= PUZZLE_PIECES_TOTAL;
            const finishingArtwork = pickPuzzleArtwork(currentPuzzleId, puzzlesCompleted);
            const nextPuzzlesCompleted = completed ? puzzlesCompleted + 1 : puzzlesCompleted;
            const nextDisplayCase = completed ? [...displayCase, finishingArtwork.id] : displayCase;
            const nextArtworkId = completed
                ? PUZZLE_ARTWORKS[nextPuzzlesCompleted % PUZZLE_ARTWORKS.length].id
                : (currentPuzzleId ?? finishingArtwork.id);
            const finalCoins = newCoins + (completed ? COINS_PER_COMPLETION_BONUS : 0);
            const finalLifetime = newLifetime + (completed ? COINS_PER_COMPLETION_BONUS : 0);

            // If this award completes the puzzle, snapshot the live puzzle's
            // DOM rect BEFORE we flip state — the next render swaps to the
            // fresh (empty) puzzle, so we'd lose the source frame otherwise.
            // The celebration overlay flies from this rect to the display-case
            // tile at the end of the new displayCase array.
            if (completed && puzzleSlotRef.current) {
                const sourceRect = puzzleSlotRef.current.getBoundingClientRect();
                const targetIndex = displayCase.length; // new tile lands at the end
                setPuzzleCelebration({ artwork: finishingArtwork, sourceRect, targetIndex });
            }

            // Optimistic local update so the puzzle redraws immediately.
            setCoins(finalCoins);
            setLifetimeCoins(finalLifetime);
            setPuzzlesCompleted(nextPuzzlesCompleted);
            setCurrentPuzzleId(nextArtworkId);
            setDisplayCase(nextDisplayCase);

            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                {
                    coins: finalCoins,
                    lifetimeCoins: finalLifetime,
                    puzzlesCompleted: nextPuzzlesCompleted,
                    currentPuzzleId: nextArtworkId,
                    displayCase: nextDisplayCase,
                    updatedAt: serverTimestamp(),
                },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    /**
     * Spend coins on perks/skins. Decrements spendable balance only; the
     * lifetime tally (and therefore puzzle progress) is unaffected. Returns
     * true if the spend was applied, false if the balance was insufficient.
     */
    const spendCoins = async (amount: number): Promise<boolean> => {
        if (!currentUser?.uid || amount <= 0) return false;
        if (coins < amount) return false;
        const db = studioFirestore(); if (!db) return false;
        const next = coins - amount;
        setCoins(next);
        try {
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { coins: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
            return true;
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
            // Roll back on failure.
            setCoins(coins);
            return false;
        }
    };

    const handleSaveProfile = async () => {
        if (!currentUser?.uid) return;
        setProfileSaving(true);
        setProfileError(null);
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                {
                    name: regData.name,
                    city: regData.city,
                    archetype: regData.archetype,
                    bio: regData.bio,
                    skills: regData.skills,
                    avatarUrl: avatarUrl ?? null,
                    galleryUrls,
                    updatedAt: serverTimestamp(),
                },
                { merge: true },
            );
            setProfileSavedAt(Date.now());
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        } finally {
            setProfileSaving(false);
        }
    };

    // Avatar upload — picks a file, pushes to Firebase Storage at
    // artists/{uid}/avatar.{ext}, and stores the public URL on the profile.
    const handleAvatarUpload = async (file: File) => {
        if (!currentUser?.uid || !file) return;
        setAvatarUploading(true);
        setProfileError(null);
        try {
            const storage = studioStorage(); if (!storage) return;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const r = storageRef(storage, `artists/${currentUser.uid}/avatar.${ext}`);
            await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
            const url = await getDownloadURL(r);
            setAvatarUrl(url);
            // Persist immediately so the URL survives a reload even if the
            // user doesn't tap Save again.
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { avatarUrl: url, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        } finally {
            setAvatarUploading(false);
        }
    };

    /** Set a gallery image as the user's featured (main) artwork. Persists
     *  to the profile so visiting members see the chosen featured piece. */
    const setFeaturedArtwork = async (url: string | null) => {
        if (!currentUser?.uid) return;
        setFeaturedArtworkUrl(url);
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { featuredArtworkUrl: url, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    // Gallery image upload — appends to the user's gallery. Each upload goes
    // to artists/{uid}/gallery/{timestamp}.{ext}. The first upload also seeds
    // featuredArtworkUrl so the user instantly has a main piece on display.
    const handleGalleryUpload = async (file: File) => {
        if (!currentUser?.uid || !file) return;
        setAvatarUploading(true);
        setProfileError(null);
        try {
            const storage = studioStorage(); if (!storage) return;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const stamp = Date.now();
            const r = storageRef(storage, `artists/${currentUser.uid}/gallery/${stamp}.${ext}`);
            await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
            const url = await getDownloadURL(r);
            const next = [...galleryUrls, url];
            setGalleryUrls(next);
            // Auto-feature the very first upload so the slot fills immediately.
            const isFirstUpload = galleryUrls.length === 0 && !featuredArtworkUrl;
            if (isFirstUpload) setFeaturedArtworkUrl(url);
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                {
                    galleryUrls: next,
                    ...(isFirstUpload ? { featuredArtworkUrl: url } : {}),
                    updatedAt: serverTimestamp(),
                },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        } finally {
            setAvatarUploading(false);
        }
    };

    // "Ask to be featured" — submits a request to the Artistic CRM. Doc id
    // is the user's uid so it's idempotent (one pending request per user).
    const handleAskToBeFeatured = async () => {
        if (!currentUser?.uid) return;
        setFeatureBusy(true);
        setProfileError(null);
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(doc(db, 'featureRequests', currentUser.uid), {
                uid: currentUser.uid,
                displayName: regData.name || currentUser.displayName || currentUser.email,
                email: currentUser.email,
                photoURL: avatarUrl ?? currentUser.photoURL ?? null,
                askedAt: serverTimestamp(),
                status: 'pending',
            });
            setFeatureRequest('pending');
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        } finally {
            setFeatureBusy(false);
        }
    };

    // Audio TTS State
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    // File pickers for profile avatar + gallery uploads. Hidden <input>s in
    // the PROFILE tab; the visible buttons trigger .click() on these refs.
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const galleryInputRef = useRef<HTMLInputElement | null>(null);

    // Notify the shell when context changes so the top viewer can re-render
    // with matching content + transition. Stays in WELCOME (the original
    // brand hero) until the user actually clicks a tab — even logged-in
    // members see the brand first, then choose where to go.
    useEffect(() => {
        onContextChange?.({
            tab: hasNavigated ? activeTab : 'WELCOME',
            regData: { ...regData },
            avatarUrl,
            isArtist,
            membershipTier,
            inspirosphereActive: activeTab === 'TOOLS' && activeTool === 'INSPIROSPHERE',
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, activeTool, hasNavigated, regData.name, regData.city, regData.country, regData.archetype, regData.bio, regData.skills, avatarUrl, isArtist, membershipTier]);

    // Market State
    const [contracts, setContracts] = useState<HubContract[]>([
        { 
            id: 'C-01', 
            title: 'Vocal Mixing for Demo', 
            requester: 'Tania Martin', 
            requesterAvatar: 'https://storage.googleapis.com/salondesinconnus/Artistes/Tania.jpg',
            type: 'HELP_WANTED', 
            reward: 1, 
            duration: '1h', 
            tags: ['AUDIO', 'MIXING'],
            status: 'OPEN',
            team: []
        },
        { 
            id: 'C-02', 
            title: 'Logo Vectorization', 
            requester: 'Alex T. St-Laurent', 
            requesterAvatar: 'https://storage.googleapis.com/salondesinconnus/Artistes/Alex.jpg',
            type: 'HELP_WANTED', 
            reward: 1, 
            duration: '1h', 
            tags: ['DESIGN', 'VECTOR'],
            status: 'OPEN',
            team: []
        },
        { 
            id: 'C-03', 
            title: 'Guitar Layer Recording', 
            requester: 'Kyle Murray', 
            requesterAvatar: 'https://storage.googleapis.com/salondesinconnus/Artistes/Kyle.jpg',
            type: 'HELP_WANTED', 
            reward: 2, 
            duration: '2h', 
            tags: ['MUSIC', 'COLLAB'],
            status: 'OPEN',
            team: ['https://storage.googleapis.com/salondesinconnus/Artistes/Sebastien.jpg']
        },
        { 
            id: 'C-04', 
            title: 'I have time for Grant Writing', 
            requester: 'Emilie G. Lavictoire', 
            requesterAvatar: 'https://storage.googleapis.com/salondesinconnus/Artistes/Emilie.jpg',
            type: 'TIME_TO_SPARE', 
            reward: 1, 
            duration: '1h', 
            tags: ['ADMIN', 'WRITING'],
            status: 'OPEN',
            team: []
        },
    ]);

    // Article State
    const [articles, setArticles] = useState<HubArticle[]>([
        { 
            id: '1', 
            title: "NOISE = SIGNAL", 
            author: "System", 
            date: "JAN 25", 
            category: "AUDIO",
            tags: ["AUDIO", "FUTURE"], 
            summary: "Finding melody in industrial screech.",
            content: "In the post-industrial soundscape, what we perceive as noise is merely unstructured potential. By applying granular synthesis to the hum of server farms, we discover a new form of choral music...",
            votes: 42,
            imageUrl: "https://images.unsplash.com/photo-1519808323868-cc39bd4b7746?q=80&w=1000&auto=format&fit=crop"
        },
        { 
            id: '2', 
            title: "DIGITAL DECAY", 
            author: "System", 
            date: "DEC 24", 
            category: "VISUAL",
            tags: ["VISUAL", "GLITCH"], 
            summary: "Bit rot as an aesthetic choice.",
            content: "Data degradation is not a failure, but a feature. The way a JPEG artifacts over thousands of reposts creates a patina of digital history...",
            votes: 38
        },
    ]);
    const [selectedArticle, setSelectedArticle] = useState<HubArticle | null>(null);
    const [isWritingModalOpen, setIsWritingModalOpen] = useState(false);
    // Articles authored by the current user, loaded live from Firestore. The
    // existing `articles` state above keeps the seeded "System" articles for
    // discoverability; we merge ownArticles with seeds for display.
    const [ownArticles, setOwnArticles] = useState<HubArticle[]>([]);
    const [editingArticle, setEditingArticle] = useState<HubArticle | null>(null);
    const [articleSaving, setArticleSaving] = useState(false);
    // Editor draft state — the modal binds to this rather than the original
    // simple newArticleData shape.
    const [draftArticle, setDraftArticle] = useState<{
        title: string;
        category: string;
        tags: string;
        coverUrl: string;
        blocks: string;
    }>({ title: '', category: 'VISUAL', tags: '', coverUrl: '', blocks: '' });
    const [coverUploading, setCoverUploading] = useState(false);

    // Post Contract Modal State
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [newContractData, setNewContractData] = useState({
        title: '',
        type: 'HELP_WANTED' as 'HELP_WANTED' | 'TIME_TO_SPARE',
        duration: '1',
        tagString: ''
    });

    // ─── MARKET sub-tabs: Time / Resources / Foire ─────────────────────────
    type MarketView = 'TIME' | 'RESOURCES' | 'FOIRE';
    const [marketView, setMarketView] = useState<MarketView>('TIME');

    // Resource exchange — physical equipment (cameras, lights, tools, …).
    interface MarketResource {
        id: string;
        ownerUid: string;
        ownerName: string;
        ownerEmail?: string;
        title: string;
        description: string;
        category: string;          // e.g. 'CAMERA' | 'AUDIO' | 'LIGHT' | 'TOOL' | 'OTHER'
        condition: string;         // e.g. 'NEW' | 'GOOD' | 'WORN'
        available: boolean;
        createdAt?: { seconds: number } | null;
    }
    const [marketResources, setMarketResources] = useState<MarketResource[]>([]);
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [newResourceData, setNewResourceData] = useState({
        title: '', description: '', category: 'CAMERA', condition: 'GOOD',
    });

    // Foire — peer-to-peer auction marketplace for completed puzzles & owned skins.
    interface MarketListing {
        id: string;
        sellerUid: string;
        sellerName: string;
        kind: 'puzzle' | 'skin';
        refId: string;
        refTitle: string;
        refImageUrl?: string;
        startPrice: number;
        currentBid: number;
        currentBidderUid: string | null;
        currentBidderName: string | null;
        bidCount: number;
        status: 'active' | 'sold' | 'cancelled';
        createdAt?: { seconds: number } | null;
        closedAt?: { seconds: number } | null;
    }
    const [marketListings, setMarketListings] = useState<MarketListing[]>([]);
    // Modal state: choosing the sell path on a completed puzzle.
    const [puzzleSellChoiceIndex, setPuzzleSellChoiceIndex] = useState<number | null>(null);
    // Modal state: listing a skin to the Foire.
    const [listingSkinId, setListingSkinId] = useState<string | null>(null);
    // Per-listing bid drafts (transient).
    const [bidDrafts, setBidDrafts] = useState<Record<string, string>>({});
    const [bidSubmitting, setBidSubmitting] = useState<string | null>(null);

    // The "featured" carousel + portfolio grid both source from the user's
    // own galleryUrls (uploaded via handleGalleryUpload). When empty, the
    // carousel shows an inline upload affordance instead of mock images.
    const galleryImages = galleryUrls;
    const artTitles: string[] = [];

    // Keep the carousel anchored on the user-chosen featured piece. When the
    // featured URL changes (or on first hydration), snap currentArtIndex to it
    // so the slot opens on the artist's intended main work.
    useEffect(() => {
        if (!featuredArtworkUrl || galleryImages.length === 0) return;
        const idx = galleryImages.indexOf(featuredArtworkUrl);
        if (idx >= 0) setCurrentArtIndex(idx);
    }, [featuredArtworkUrl, galleryImages.length]);

    const handleEnter = (mode: AccessLevel) => {
        if (mode === 'MEMBER') {
            setPhase('CHAMPION_SELECT');
        } else {
            setAccessLevel('GUEST');
            setPhase('LOBBY');
            setActiveTab('COLLABORATE');
            setHasNavigated(true);
        }
    };

    const handleLockIn = () => {
        if (!regData.name || !regData.archetype) return; 
        
        // Generate default skills based on archetype if none
        let defaultSkills = [];
        if (regData.skills.length === 0) {
             switch(regData.archetype) {
                case 'VISUAL': defaultSkills = ["Illustration", "Color Theory", "Layout"]; break;
                case 'AUDIO': defaultSkills = ["Composition", "Mixing", "Mastering"]; break;
                case 'DIGITAL': defaultSkills = ["3D Modeling", "Animation", "VFX"]; break;
                case 'SCULPT': defaultSkills = ["Anatomy", "Materials", "Casting"]; break;
                case 'PERFORM': defaultSkills = ["Acting", "Voice", "Improv"]; break;
                default: defaultSkills = ["Creativity", "Technique", "Vision"];
            }
        } else {
            defaultSkills = regData.skills;
        }

        setRegData({...regData, skills: defaultSkills});
        setAccessLevel('MEMBER');
        setMembershipTier('INITIATE'); // Give them a base level
        setPhase('LOBBY');
        setActiveTab('PROFILE');
        setHasNavigated(true);
    };

    const handleJoinClick = () => {
        setPhase('CHAMPION_SELECT');
    };

    const nextArt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (galleryImages.length === 0) return;
        setCurrentArtIndex((prev) => (prev + 1) % galleryImages.length);
    };

    const prevArt = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (galleryImages.length === 0) return;
        setCurrentArtIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
    };

    // Opens the avatar file picker (PROFILE tab). Falls back to gallery picker
    // when called from secondary upload affordances. The actual upload flow
    // runs in handleAvatarUpload / handleGalleryUpload.
    const handleUploadClick = () => {
        galleryInputRef.current?.click();
    };

    const [collabSubmitting, setCollabSubmitting] = useState(false);
    interface CollabRequestRow {
        id: string;
        type: 'RESIDENCY' | 'EVENT' | 'PROJECT';
        idea: string;
        status: 'new' | 'in_progress' | 'approved' | 'declined' | 'archived';
        createdAt?: { seconds: number } | null;
        respondedAt?: { seconds: number } | null;
        adminResponse?: string;
        respondedByEmail?: string;
    }
    const [myCollabRequests, setMyCollabRequests] = useState<CollabRequestRow[]>([]);
    /**
     * Persist the collab form to `collabRequests/{id}`. Lands in the Admin
     * CRM (Demandes de collab tab); the admin's reply comes back on the
     * submitter's Profile tab via the live subscription `myCollabRequests`.
     * Requires sign-in: rules stamp `uid` and require it match auth.
     */
    const handleCollabSubmit = async () => {
        if (!collabForm) return;
        if (!currentUser?.uid) {
            alert(language === 'EN'
                ? 'Sign in to submit a collab request — admins reply through your profile.'
                : "Connecte-toi pour envoyer une demande — les réponses arrivent sur ton profil.");
            return;
        }
        const db = studioFirestore();
        if (!db) return;
        setCollabSubmitting(true);
        try {
            await addDoc(collection(db, 'collabRequests'), {
                type: collabForm,
                uid: currentUser.uid,
                uidEmail: currentUser.email ?? null,
                name: collabFormData.name.trim(),
                email: collabFormData.email.trim(),
                idea: collabFormData.idea.trim(),
                ...(collabForm === 'RESIDENCY' ? {
                    dates: collabFormData.dates.trim(),
                    revenueTier: collabFormData.revenueTier,
                    needsBursary: collabFormData.needsBursary,
                } : {}),
                status: 'new',
                createdAt: serverTimestamp(),
            });
            if (collabForm === 'EVENT') addPoints(7, 'Event Proposal');
            setCollabForm(null);
            setCollabFormData({ name: '', email: '', idea: '', dates: '', revenueTier: 'emerging', needsBursary: false });
        } catch (e) {
            alert(`${language === 'EN' ? 'Submission failed' : 'Envoi échoué'}: ${String((e as any)?.message ?? e)}`);
        } finally {
            setCollabSubmitting(false);
        }
    };

    // --- GAMIFICATION HELPERS ---
    // Legacy `addPoints` is now a thin shim over `awardCoins` — XP and coins
    // were unified per the new economy. The integer amount becomes the coin
    // award; fractional values are floored to keep the lifetime tally clean.
    // Existing call sites keep their reasons for the console log; the values
    // below stand unless they're explicitly overridden by the new spec
    // (skin purchase = 20, article approval = 10, section discovery = 5).
    const addPoints = (amount: number, reason: string) => {
        const whole = Math.floor(amount);
        // eslint-disable-next-line no-console
        console.log(`+${whole} coins: ${reason}`);
        if (whole > 0) void awardCoins(whole);
        // Mirror into legacy userPoints so any UI still reading it shows
        // matching totals until those readers migrate to `lifetimeCoins`.
        setUserPoints(prev => prev + amount);
    };

    // --- MARKET LOGIC ---
    const handlePostContract = () => {
        if (!newContractData.title) return;
        
        const contract: HubContract = {
            id: `C-${Math.floor(Math.random() * 1000)}`,
            title: newContractData.title,
            requester: regData.name || 'Anonymous',
            // Use a placeholder avatar for the user for now
            requesterAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop', 
            type: newContractData.type,
            reward: parseInt(newContractData.duration) || 1,
            duration: `${newContractData.duration}h`,
            tags: newContractData.tagString.split(',').map(s => s.trim().toUpperCase()).filter(s => s),
            status: 'OPEN',
            team: []
        };

        setContracts([contract, ...contracts]);
        setIsPostModalOpen(false);
        setNewContractData({ title: '', type: 'HELP_WANTED', duration: '1', tagString: '' });
    };

    const handleAcceptContract = (id: string) => {
        if (accessLevel !== 'MEMBER') return;
        
        setContracts(prev => prev.map(c => {
            if (c.id === id) {
                // Add current user to team. Simulating avatar.
                const userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop';
                if (!c.team.includes(userAvatar)) {
                    return { ...c, team: [...c.team, userAvatar] };
                }
            }
            return c;
        }));
    };

    const handleFulfillContract = (id: string) => {
        setContracts(prev => prev.map(c => {
            if (c.id === id && c.status === 'OPEN') {
                const cost = c.reward;
                
                if (c.type === 'HELP_WANTED') {
                    setUserTokens(t => Math.max(0, t - cost));
                    addPoints(2, "Given Token");
                } else {
                    setUserTokens(t => Math.min(100, t + cost)); // Capped at 100
                    addPoints(2, "Gained Token");
                }
                
                return { ...c, status: 'FULFILLED' };
            }
            return c;
        }));
    };

    // --- WRITING LOGIC ---
    // Live subscription to the user's articles. Stored at
    // members/{uid}/articles/{articleId}. Drafts are private; 'requested' is
    // visible to admins for review; 'public' is approved + everyone visible.
    useEffect(() => {
        if (!currentUser?.uid) { setOwnArticles([]); return; }
        const db = studioFirestore(); if (!db) return;
        const q = query(
            collection(db, 'members', currentUser.uid, 'articles'),
            orderBy('updatedAt', 'desc'),
        );
        const unsub = onSnapshot(q, (snap) => {
            const list: HubArticle[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                list.push({
                    id: d.id,
                    title: data.title ?? '',
                    author: data.author ?? '',
                    authorUid: data.authorUid ?? currentUser.uid,
                    date: data.date ?? '',
                    category: data.category ?? 'VISUAL',
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    summary: data.summary ?? '',
                    content: data.content ?? '',
                    blocks: data.blocks,
                    coverUrl: data.coverUrl,
                    imageUrl: data.imageUrl,
                    votes: data.votes ?? 0,
                    publishStatus: data.publishStatus,
                    publishRequestedAt: data.publishRequestedAt,
                    publishedAt: data.publishedAt,
                });
            });
            setOwnArticles(list);
        });
        return () => unsub();
    }, [currentUser?.uid]);

    // Award +10 coins the first time each of the user's own articles flips
    // to publishStatus 'public'. We track which article ids have already
    // triggered the bonus on the profile (`articlesAwarded`) so re-renders
    // and snapshot replays don't double-pay.
    useEffect(() => {
        if (!currentUser?.uid) return;
        const newlyPublic = ownArticles.filter(
            a => a.publishStatus === 'public' && !articlesAwarded.includes(a.id)
        );
        if (newlyPublic.length === 0) return;
        const nextAwarded = [...articlesAwarded, ...newlyPublic.map(a => a.id)];
        setArticlesAwarded(nextAwarded);
        const db = studioFirestore();
        if (db) {
            void setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { articlesAwarded: nextAwarded, updatedAt: serverTimestamp() },
                { merge: true },
            );
        }
        // Award one bonus per newly-published article. awardCoins handles
        // puzzle-completion math + lifetime increment.
        newlyPublic.forEach(() => void awardCoins(10));
    }, [ownArticles, currentUser?.uid]);

    // ─── Puzzle gifts: inbox + auto-reclaim subscriptions ──────────────────
    // Inbox = pending gifts addressed to me. Reclaim queue = gifts I sent that
    // were declined and haven't been added back to my displayCase yet. Both
    // queries are scoped to my uid so other users' gifts never reach me.
    useEffect(() => {
        if (!currentUser?.uid) {
            setPuzzleGiftsInbox([]);
            setPuzzleGiftsToReclaim([]);
            return;
        }
        const db = studioFirestore(); if (!db) return;
        const inboxQ = query(
            collection(db, 'puzzleGifts'),
            where('toUid', '==', currentUser.uid),
            where('status', '==', 'pending'),
        );
        const unsubInbox = onSnapshot(inboxQ, (snap) => {
            const list: PuzzleGift[] = [];
            snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
            setPuzzleGiftsInbox(list);
        }, () => { /* swallow — empty state handles it */ });
        const reclaimQ = query(
            collection(db, 'puzzleGifts'),
            where('fromUid', '==', currentUser.uid),
            where('status', '==', 'declined'),
        );
        const unsubReclaim = onSnapshot(reclaimQ, (snap) => {
            const list: PuzzleGift[] = [];
            snap.forEach(d => {
                const data = d.data() as any;
                if (!data.reclaimed) list.push({ id: d.id, ...data });
            });
            setPuzzleGiftsToReclaim(list);
        }, () => { /* swallow */ });
        return () => { unsubInbox(); unsubReclaim(); };
    }, [currentUser?.uid]);

    // Auto-reclaim: when a gift I sent is declined, put the puzzle back in my
    // display case and stamp `reclaimed: true` on the gift so we don't loop.
    useEffect(() => {
        if (!currentUser?.uid || puzzleGiftsToReclaim.length === 0) return;
        const db = studioFirestore(); if (!db) return;
        (async () => {
            const nextDisplayCase = [...displayCase];
            let changed = false;
            for (const g of puzzleGiftsToReclaim) {
                if (!nextDisplayCase.includes(g.puzzleId)) {
                    nextDisplayCase.push(g.puzzleId);
                    changed = true;
                }
                try {
                    await updateDoc(doc(db, 'puzzleGifts', g.id), { reclaimed: true });
                } catch { /* ignore — will retry on next render */ }
            }
            if (changed) {
                setDisplayCase(nextDisplayCase);
                try {
                    await setDoc(
                        doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                        { displayCase: nextDisplayCase, updatedAt: serverTimestamp() },
                        { merge: true },
                    );
                } catch { /* swallow */ }
            }
        })();
    }, [puzzleGiftsToReclaim, currentUser?.uid]);

    // ─── Puzzle actions: sell, gift, accept, decline ───────────────────────
    /**
     * Sell a completed puzzle back to the Salon for SELL_PUZZLE_COINS coins.
     * The puzzle leaves the displayCase; coins are added to the spendable
     * balance ONLY (lifetime is unaffected so progression isn't gamed).
     */
    const SELL_PUZZLE_COINS = 25;
    const sellPuzzleAt = async (index: number) => {
        if (!currentUser?.uid || index < 0 || index >= displayCase.length) return;
        const db = studioFirestore(); if (!db) return;
        const next = displayCase.filter((_, i) => i !== index);
        const nextCoins = coins + SELL_PUZZLE_COINS;
        setDisplayCase(next);
        setCoins(nextCoins);
        setViewingPuzzleIndex(null);
        try {
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { displayCase: next, coins: nextCoins, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    /**
     * Gift a puzzle to a friend. Creates a pending puzzleGifts doc and
     * removes the puzzle from my displayCase. If the recipient declines,
     * the auto-reclaim effect above will add it back automatically.
     */
    const giftPuzzleAt = async (index: number, toUid: string, toName: string) => {
        if (!currentUser?.uid || index < 0 || index >= displayCase.length) return;
        if (toUid === currentUser.uid) return;
        const db = studioFirestore(); if (!db) return;
        const puzzleId = displayCase[index];
        const next = displayCase.filter((_, i) => i !== index);
        setDisplayCase(next);
        setGiftingPuzzleIndex(null);
        setViewingPuzzleIndex(null);
        try {
            await addDoc(collection(db, 'puzzleGifts'), {
                fromUid: currentUser.uid,
                toUid,
                fromName: regData.name || currentUser.displayName || 'Member',
                toName,
                puzzleId,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { displayCase: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            // Roll back optimistic state if the write failed.
            setDisplayCase(displayCase);
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    /** Accept a gift — adds puzzle to my displayCase, marks gift accepted. */
    const acceptPuzzleGift = async (g: PuzzleGift) => {
        if (!currentUser?.uid || g.toUid !== currentUser.uid) return;
        const db = studioFirestore(); if (!db) return;
        const next = displayCase.includes(g.puzzleId) ? displayCase : [...displayCase, g.puzzleId];
        setDisplayCase(next);
        try {
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { displayCase: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
            await updateDoc(doc(db, 'puzzleGifts', g.id), {
                status: 'accepted',
                respondedAt: serverTimestamp(),
            });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    // ─── Market subscriptions: Resources + Foire ───────────────────────────
    // Both collections are global (any signed-in member can browse). Live
    // snapshots so listings appear without a refresh and bids are real-time.
    useEffect(() => {
        const db = studioFirestore(); if (!db) return;
        const unsubR = onSnapshot(
            collection(db, 'marketResources'),
            (snap) => {
                const list: MarketResource[] = [];
                snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
                list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
                setMarketResources(list);
            },
            () => { /* swallow */ },
        );
        const unsubL = onSnapshot(
            collection(db, 'marketListings'),
            (snap) => {
                const list: MarketListing[] = [];
                snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
                // Active first (newest first), then closed.
                list.sort((a, b) => {
                    if (a.status === 'active' && b.status !== 'active') return -1;
                    if (a.status !== 'active' && b.status === 'active') return 1;
                    return (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0);
                });
                setMarketListings(list);
            },
            () => { /* swallow */ },
        );
        return () => { unsubR(); unsubL(); };
    }, []);

    // ─── Resource: create / toggle availability / delete ────────────────────
    const createResource = async () => {
        if (!currentUser?.uid || !newResourceData.title.trim()) return;
        const db = studioFirestore(); if (!db) return;
        try {
            await addDoc(collection(db, 'marketResources'), {
                ownerUid: currentUser.uid,
                ownerName: regData.name || currentUser.displayName || 'Member',
                ownerEmail: currentUser.email ?? null,
                title: newResourceData.title.trim(),
                description: newResourceData.description.trim(),
                category: newResourceData.category,
                condition: newResourceData.condition,
                available: true,
                createdAt: serverTimestamp(),
            });
            setIsResourceModalOpen(false);
            setNewResourceData({ title: '', description: '', category: 'CAMERA', condition: 'GOOD' });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };
    const toggleResourceAvailability = async (r: MarketResource) => {
        if (!currentUser?.uid || r.ownerUid !== currentUser.uid) return;
        const db = studioFirestore(); if (!db) return;
        try {
            await updateDoc(doc(db, 'marketResources', r.id), { available: !r.available });
        } catch { /* swallow */ }
    };
    const deleteResource = async (r: MarketResource) => {
        if (!currentUser?.uid || r.ownerUid !== currentUser.uid) return;
        const db = studioFirestore(); if (!db) return;
        try {
            await deleteDoc(doc(db, 'marketResources', r.id));
        } catch { /* swallow */ }
    };

    // ─── Foire: list a puzzle / list a skin ─────────────────────────────────
    /** List a completed puzzle to the Foire. Removes from displayCase (escrow). */
    const listPuzzleToFoire = async (puzzleIndex: number) => {
        if (!currentUser?.uid || puzzleIndex < 0 || puzzleIndex >= displayCase.length) return;
        const puzzleId = displayCase[puzzleIndex];
        const art = PUZZLE_ARTWORKS.find(a => a.id === puzzleId);
        if (!art) return;
        const db = studioFirestore(); if (!db) return;
        const next = displayCase.filter((_, i) => i !== puzzleIndex);
        setDisplayCase(next);
        setPuzzleSellChoiceIndex(null);
        setViewingPuzzleIndex(null);
        try {
            await addDoc(collection(db, 'marketListings'), {
                sellerUid: currentUser.uid,
                sellerName: regData.name || currentUser.displayName || 'Member',
                kind: 'puzzle',
                refId: puzzleId,
                refTitle: language === 'FR' ? art.titleFr : art.titleEn,
                refImageUrl: art.src,
                startPrice: 1,
                currentBid: 1,
                currentBidderUid: null,
                currentBidderName: null,
                bidCount: 0,
                status: 'active',
                createdAt: serverTimestamp(),
            });
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { displayCase: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
            setMarketView('FOIRE');
        } catch (e) {
            // Roll back optimistic state on failure.
            setDisplayCase(displayCase);
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    /** List an owned skin to the Foire. Removes from purchasedSkins. */
    const listSkinToFoire = async (skinId: string) => {
        if (!currentUser?.uid) return;
        if (!purchasedSkins.includes(skinId)) return;
        const skin = SKINS.find(s => s.id === skinId);
        if (!skin) return;
        const db = studioFirestore(); if (!db) return;
        const nextSkins = purchasedSkins.filter(x => x !== skinId);
        const nextActive = activeSkinId === skinId ? null : activeSkinId;
        setPurchasedSkins(nextSkins);
        setActiveSkinId(nextActive);
        setListingSkinId(null);
        try {
            await addDoc(collection(db, 'marketListings'), {
                sellerUid: currentUser.uid,
                sellerName: regData.name || currentUser.displayName || 'Member',
                kind: 'skin',
                refId: skinId,
                refTitle: skin.name,
                refImageUrl: undefined,
                startPrice: 1,
                currentBid: 1,
                currentBidderUid: null,
                currentBidderName: null,
                bidCount: 0,
                status: 'active',
                createdAt: serverTimestamp(),
            });
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { purchasedSkins: nextSkins, activeSkinId: nextActive, updatedAt: serverTimestamp() },
                { merge: true },
            );
            setMarketView('FOIRE');
        } catch (e) {
            setPurchasedSkins(purchasedSkins);
            setActiveSkinId(activeSkinId);
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    /** Place a bid on a Foire listing. Refunds the previous bidder, escrows
     *  the new bid by deducting from spendable coins. Refunds are credited
     *  back to the previous bidder via their profile doc. Bid must strictly
     *  raise the current price. */
    const placeBid = async (listing: MarketListing, amount: number) => {
        if (!currentUser?.uid) return;
        if (listing.sellerUid === currentUser.uid) return; // can't bid on own
        if (listing.status !== 'active') return;
        if (amount <= listing.currentBid) return;
        if (coins < amount) return;
        const db = studioFirestore(); if (!db) return;
        setBidSubmitting(listing.id);
        try {
            // Escrow this user's bid: debit their spendable balance.
            const nextCoins = coins - amount;
            setCoins(nextCoins);
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { coins: nextCoins, updatedAt: serverTimestamp() },
                { merge: true },
            );
            // Refund the previous bidder (if any). They own their profile doc;
            // a malicious actor could skip this, so the rule layer trusts the
            // bidder to do the right thing — acceptable for a small community.
            if (listing.currentBidderUid && listing.currentBidderUid !== currentUser.uid) {
                try {
                    // Read the previous bidder's profile to add the refund.
                    const prevSnap = await getDoc(doc(db, 'members', listing.currentBidderUid, 'artistProfile', 'profile'));
                    if (prevSnap.exists()) {
                        const prevCoins = (prevSnap.data() as any).coins ?? 0;
                        await setDoc(
                            doc(db, 'members', listing.currentBidderUid, 'artistProfile', 'profile'),
                            { coins: prevCoins + listing.currentBid, updatedAt: serverTimestamp() },
                            { merge: true },
                        );
                    }
                } catch { /* permission denied if rules forbid — accept and move on */ }
            }
            await updateDoc(doc(db, 'marketListings', listing.id), {
                currentBid: amount,
                currentBidderUid: currentUser.uid,
                currentBidderName: regData.name || currentUser.displayName || 'Member',
                bidCount: (listing.bidCount ?? 0) + 1,
            });
            setBidDrafts(prev => { const next = { ...prev }; delete next[listing.id]; return next; });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        } finally {
            setBidSubmitting(null);
        }
    };

    /** Seller accepts the current top bid: pay seller, transfer item to bidder. */
    const acceptTopBid = async (listing: MarketListing) => {
        if (!currentUser?.uid || currentUser.uid !== listing.sellerUid) return;
        if (listing.status !== 'active') return;
        if (!listing.currentBidderUid || listing.currentBid <= 0) return;
        const db = studioFirestore(); if (!db) return;
        try {
            // Credit seller's coins.
            const nextCoins = coins + listing.currentBid;
            setCoins(nextCoins);
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { coins: nextCoins, updatedAt: serverTimestamp() },
                { merge: true },
            );
            // Transfer the item to the buyer's profile.
            const buyerSnap = await getDoc(doc(db, 'members', listing.currentBidderUid, 'artistProfile', 'profile'));
            const buyerData = buyerSnap.exists() ? (buyerSnap.data() as any) : {};
            const buyerPatch: any = { updatedAt: serverTimestamp() };
            if (listing.kind === 'puzzle') {
                const arr: string[] = Array.isArray(buyerData.displayCase) ? buyerData.displayCase : [];
                if (!arr.includes(listing.refId)) buyerPatch.displayCase = [...arr, listing.refId];
            } else if (listing.kind === 'skin') {
                const arr: string[] = Array.isArray(buyerData.purchasedSkins) ? buyerData.purchasedSkins : [];
                if (!arr.includes(listing.refId)) buyerPatch.purchasedSkins = [...arr, listing.refId];
            }
            await setDoc(
                doc(db, 'members', listing.currentBidderUid, 'artistProfile', 'profile'),
                buyerPatch,
                { merge: true },
            );
            // Close the listing.
            await updateDoc(doc(db, 'marketListings', listing.id), {
                status: 'sold',
                closedAt: serverTimestamp(),
            });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    /** Seller cancels listing: refund the current bidder, return item to seller. */
    const cancelListing = async (listing: MarketListing) => {
        if (!currentUser?.uid || currentUser.uid !== listing.sellerUid) return;
        if (listing.status !== 'active') return;
        const db = studioFirestore(); if (!db) return;
        try {
            // Refund the current bidder if any.
            if (listing.currentBidderUid && listing.currentBid > 0) {
                try {
                    const prevSnap = await getDoc(doc(db, 'members', listing.currentBidderUid, 'artistProfile', 'profile'));
                    if (prevSnap.exists()) {
                        const prevCoins = (prevSnap.data() as any).coins ?? 0;
                        await setDoc(
                            doc(db, 'members', listing.currentBidderUid, 'artistProfile', 'profile'),
                            { coins: prevCoins + listing.currentBid, updatedAt: serverTimestamp() },
                            { merge: true },
                        );
                    }
                } catch { /* permission may deny — accept */ }
            }
            // Return the item to seller's inventory.
            const myPatch: any = { updatedAt: serverTimestamp() };
            if (listing.kind === 'puzzle') {
                if (!displayCase.includes(listing.refId)) {
                    const next = [...displayCase, listing.refId];
                    setDisplayCase(next);
                    myPatch.displayCase = next;
                }
            } else if (listing.kind === 'skin') {
                if (!purchasedSkins.includes(listing.refId)) {
                    const next = [...purchasedSkins, listing.refId];
                    setPurchasedSkins(next);
                    myPatch.purchasedSkins = next;
                }
            }
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                myPatch,
                { merge: true },
            );
            // Close the listing.
            await updateDoc(doc(db, 'marketListings', listing.id), {
                status: 'cancelled',
                closedAt: serverTimestamp(),
            });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    // ─── My collab requests subscription ───────────────────────────────────
    // Drives the "Your collab requests" inbox on the Profile tab. The doc
    // model lives in firestore.rules under match /collabRequests; admins
    // triage from the AdminCRM and write `adminResponse` + `status`, which
    // streams here in real time.
    useEffect(() => {
        if (!currentUser?.uid) {
            setMyCollabRequests([]);
            return;
        }
        const db = studioFirestore(); if (!db) return;
        const q = query(
            collection(db, 'collabRequests'),
            where('uid', '==', currentUser.uid),
        );
        const unsub = onSnapshot(q, (snap) => {
            const list: CollabRequestRow[] = [];
            snap.forEach(d => list.push({ id: d.id, ...(d.data() as any) }));
            // Newest first, by createdAt seconds (handles missing timestamps).
            list.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
            setMyCollabRequests(list);
        }, () => { /* swallow — empty state handles it */ });
        return () => unsub();
    }, [currentUser?.uid]);

    // ─── Roster claims subscription ────────────────────────────────────────
    // The claims collection is small (one doc per claimed artist), so a live
    // subscription is cheap and lets the "Claim" button vanish in real-time
    // for every visitor the second a claim is written.
    useEffect(() => {
        const db = studioFirestore(); if (!db) return;
        const unsub = onSnapshot(
            collection(db, 'rosterClaims'),
            (snap) => {
                const next: Record<string, RosterClaim> = {};
                snap.forEach(d => {
                    const data = d.data() as any;
                    if (data?.uid) next[d.id] = { uid: data.uid, uidName: data.uidName };
                });
                setRosterClaims(next);
            },
            () => { /* swallow — empty state handles it */ },
        );
        return () => unsub();
    }, []);

    /**
     * Claim a curated roster artist. Validates the shared password, writes a
     * rosterClaims doc (Firestore rule blocks overwrites, so the first
     * claimant wins atomically), then seeds the user's profile from the
     * roster entry — but ONLY for fields that are still empty, so a user
     * who's already started filling things in doesn't lose their work.
     */
    const SHARED_CLAIM_PASSWORD = 'AlexApproves';
    const claimRosterArtist = async () => {
        if (!currentUser?.uid || claimingArtistId === null) return;
        const artist = ARTISTS_ROSTER.find(a => a.id === claimingArtistId);
        if (!artist) return;
        setClaimError(null);
        if (claimPassword !== SHARED_CLAIM_PASSWORD) {
            setClaimError(language === 'EN' ? 'Wrong password.' : 'Mot de passe incorrect.');
            return;
        }
        if (rosterClaims[String(artist.id)]) {
            setClaimError(language === 'EN' ? 'This profile has already been claimed.' : 'Ce profil a déjà été réclamé.');
            return;
        }
        setClaimSubmitting(true);
        const db = studioFirestore();
        if (!db) { setClaimSubmitting(false); return; }
        try {
            // Atomically reserve the claim. Firestore's create rule lets each
            // user create exactly their own claim doc; if two users race, one
            // succeeds, the other gets a permission denied (then sees the
            // claim arrive via the snapshot and the button vanishes).
            await setDoc(
                doc(db, 'rosterClaims', String(artist.id)),
                {
                    rosterId: artist.id,
                    uid: currentUser.uid,
                    uidName: regData.name || currentUser.displayName || currentUser.email || 'Member',
                    artistName: artist.name,
                    claimedAt: serverTimestamp(),
                },
            );

            // Seed empty profile fields from the roster entry. We never
            // overwrite anything the user has already filled in.
            const seeded: Record<string, any> = {};
            if (!regData.name && artist.name) seeded.name = artist.name;
            if (!regData.archetype && artist.category) seeded.archetype = artist.category;
            if (!regData.bio && (artist as any).bio) seeded.bio = (artist as any).bio;
            if ((!regData.skills || regData.skills.length === 0) && Array.isArray(artist.skills) && artist.skills.length) {
                seeded.skills = artist.skills;
            }
            if (!regData.city && (artist as any).location) seeded.city = (artist as any).location;
            if (!avatarUrl && artist.avatarUrl) seeded.avatarUrl = artist.avatarUrl;
            const existingGallery = galleryUrls.length;
            const rosterGallery = Array.isArray(artist.galleryImages) ? artist.galleryImages : [];
            if (existingGallery === 0 && rosterGallery.length > 0) {
                seeded.galleryUrls = rosterGallery;
                if (!featuredArtworkUrl) seeded.featuredArtworkUrl = rosterGallery[0];
            }
            if (Object.keys(seeded).length > 0) {
                seeded.updatedAt = serverTimestamp();
                await setDoc(
                    doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                    seeded,
                    { merge: true },
                );
                // Optimistic local update for everything we wrote.
                setRegData(prev => ({
                    name: seeded.name ?? prev.name,
                    city: seeded.city ?? prev.city,
                    country: prev.country,
                    archetype: seeded.archetype ?? prev.archetype,
                    bio: seeded.bio ?? prev.bio,
                    skills: seeded.skills ?? prev.skills,
                }));
                if (seeded.avatarUrl) setAvatarUrl(seeded.avatarUrl);
                if (seeded.galleryUrls) setGalleryUrls(seeded.galleryUrls);
                if (seeded.featuredArtworkUrl) setFeaturedArtworkUrl(seeded.featuredArtworkUrl);
            }

            // Close the modal — the snapshot subscription will drop the
            // button on every other client too.
            setClaimingArtistId(null);
            setClaimPassword('');
        } catch (e: any) {
            // Firestore returns 'permission-denied' if the doc already exists
            // and the create rule rejects (race lost). Translate to a friendly
            // message; the snapshot will catch up next tick.
            const msg = String(e?.message ?? e);
            setClaimError(msg.includes('permission')
                ? (language === 'EN' ? 'Someone else just claimed this profile.' : "Quelqu'un d'autre vient de réclamer ce profil.")
                : msg);
        } finally {
            setClaimSubmitting(false);
        }
    };

    /** Decline a gift — sender will see this and auto-reclaim. */
    const declinePuzzleGift = async (g: PuzzleGift) => {
        if (!currentUser?.uid || g.toUid !== currentUser.uid) return;
        const db = studioFirestore(); if (!db) return;
        try {
            await updateDoc(doc(db, 'puzzleGifts', g.id), {
                status: 'declined',
                respondedAt: serverTimestamp(),
            });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    // First-visit coin reward — +5 the first time the user lands on each
    // tab. Re-visiting a known tab does nothing. The profile keeps the
    // visited list so the bonus is once-per-user per section, forever.
    useEffect(() => {
        if (!currentUser?.uid || !hasNavigated) return;
        if (sectionsVisited.includes(activeTab)) return;
        const next = [...sectionsVisited, activeTab];
        setSectionsVisited(next);
        const db = studioFirestore();
        if (db) {
            void setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { sectionsVisited: next, updatedAt: serverTimestamp() },
                { merge: true },
            );
        }
        void awardCoins(5);
    }, [activeTab, hasNavigated, currentUser?.uid]);

    // Open the editor — empty for new, hydrated for edit.
    const openArticleEditor = (existing?: HubArticle) => {
        if (existing) {
            setEditingArticle(existing);
            setDraftArticle({
                title: existing.title || '',
                category: existing.category || 'VISUAL',
                tags: (existing.tags || []).join(', '),
                coverUrl: existing.coverUrl || '',
                blocks: existing.blocks || existing.content || '',
            });
        } else {
            setEditingArticle(null);
            setDraftArticle({ title: '', category: 'VISUAL', tags: '', coverUrl: '', blocks: '' });
        }
        setIsWritingModalOpen(true);
    };

    // Cover upload — separate endpoint per article. Articles get their own
    // folder so cleanup of an article cleans its cover too.
    const uploadArticleCover = async (file: File): Promise<string | null> => {
        if (!currentUser?.uid || !file) return null;
        setCoverUploading(true);
        try {
            const storage = studioStorage(); if (!storage) return null;
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const id = editingArticle?.id || `pending-${Date.now()}`;
            const r = storageRef(storage, `artists/${currentUser.uid}/articles/${id}/cover.${ext}`);
            await uploadBytes(r, file, { contentType: file.type || 'image/jpeg' });
            const url = await getDownloadURL(r);
            return url;
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
            return null;
        } finally {
            setCoverUploading(false);
        }
    };

    // Build a short summary from the BlockEditor content for previews.
    const summaryFromBlocks = (blocks: string): string => {
        try {
            const rows = JSON.parse(blocks);
            if (!Array.isArray(rows)) return '';
            const text = rows
                .flatMap((r: any) => Array.isArray(r.columns) ? r.columns : [])
                .filter((c: any) => c.type === 'text' && typeof c.value === 'string')
                .map((c: any) => c.value)
                .join(' ');
            const flat = text.replace(/\*\*|_/g, '').replace(/\s+/g, ' ').trim();
            return flat.length > 140 ? flat.slice(0, 140) + '…' : flat;
        } catch {
            return blocks.slice(0, 140);
        }
    };

    // Save draft — creates or updates a Firestore article. Status defaults to
    // 'draft' on first save and is preserved on subsequent edits.
    const handleSaveArticleDraft = async (alsoRequestPublish: boolean = false) => {
        if (!currentUser?.uid) return;
        if (!draftArticle.title.trim()) return;
        setArticleSaving(true);
        setProfileError(null);
        try {
            const db = studioFirestore(); if (!db) return;
            const id = editingArticle?.id || `art-${Date.now()}`;
            const tags = draftArticle.tags.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
            const summary = summaryFromBlocks(draftArticle.blocks);
            const status: HubArticle['publishStatus'] = alsoRequestPublish
                ? 'requested'
                : (editingArticle?.publishStatus ?? 'draft');
            await setDoc(
                doc(db, 'members', currentUser.uid, 'articles', id),
                {
                    title: draftArticle.title.trim(),
                    author: regData.name || currentUser.displayName || 'Member',
                    authorUid: currentUser.uid,
                    date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase(),
                    category: draftArticle.category,
                    tags,
                    summary,
                    blocks: draftArticle.blocks,
                    content: '', // legacy field — empty for block-authored articles
                    coverUrl: draftArticle.coverUrl || null,
                    publishStatus: status,
                    ...(alsoRequestPublish ? { publishRequestedAt: serverTimestamp() } : {}),
                    votes: editingArticle?.votes ?? 0,
                    updatedAt: serverTimestamp(),
                    ...(editingArticle ? {} : { createdAt: serverTimestamp() }),
                },
                { merge: true },
            );
            setIsWritingModalOpen(false);
            setEditingArticle(null);
            setDraftArticle({ title: '', category: 'VISUAL', tags: '', coverUrl: '', blocks: '' });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        } finally {
            setArticleSaving(false);
        }
    };

    // Flip an existing article's status to 'requested' (admin queue). Used
    // from the article card directly, without re-opening the editor.
    const handleRequestPublish = async (article: HubArticle) => {
        if (!currentUser?.uid || !article.id) return;
        try {
            const db = studioFirestore(); if (!db) return;
            await updateDoc(doc(db, 'members', currentUser.uid, 'articles', article.id), {
                publishStatus: 'requested',
                publishRequestedAt: serverTimestamp(),
            });
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    // Delete — removes the Firestore doc only. Cover cleanup is best-effort
    // omitted; admin can sweep storage later.
    const handleDeleteArticle = async (article: HubArticle) => {
        if (!currentUser?.uid || !article.id) return;
        if (!confirm(language === 'EN' ? 'Delete this article?' : 'Supprimer cet article ?')) return;
        try {
            const db = studioFirestore(); if (!db) return;
            await deleteDoc(doc(db, 'members', currentUser.uid, 'articles', article.id));
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    const handleVote = (id: string, delta: number) => {
        setArticles(prev => prev.map(a => a.id === id ? { ...a, votes: a.votes + delta } : a));
        // Upvoting gives the author points (simplified: voter gets nothing, author gets 4 if threshold met)
        // Here we just simulate user getting points for engagement if they upvote
        if (delta > 0) {
            // Note: In a real app we'd check if user already voted.
            // Simplified: Writing an article and getting 4 upvotes = 4 points.
            // We'll just give the user points for voting? Prompt says "Write article and get 4 upvotes".
            // We'll leave the author logic for a backend.
        }
    };

    // Purchase a cosmetic skin via tokens, coins, USD checkout, or level claim.
    //  - 'tokens'  → deducts userTokens (must be >= priceTokens)
    //  - 'coins'   → deducts spendable coins (must be >= priceCoins). Lifetime
    //                 coins are NOT touched, so puzzle progression survives.
    //  - 'usd'     → simulated checkout (TODO: wire Stripe). Confirms then unlocks.
    //  - 'level'   → free claim once user reaches the skin's minLevel.
    // The unlock writes through to Firestore so the skin survives reload.
    const handlePurchaseSkin = async (skinId: string, method: 'tokens' | 'coins' | 'usd' | 'level' = 'tokens') => {
        const skin = SKINS.find(s => s.id === skinId);
        if (!skin) return;
        if (purchasedSkins.includes(skinId)) return;

        // Validate the chosen method.
        if (method === 'tokens') {
            if (typeof skin.priceTokens !== 'number') return;
            if (userTokens < skin.priceTokens) {
                alert(language === 'EN'
                    ? `You need ${skin.priceTokens} time tokens — you have ${userTokens}.`
                    : `Il faut ${skin.priceTokens} jetons de temps — vous en avez ${userTokens}.`);
                return;
            }
        } else if (method === 'coins') {
            if (typeof skin.priceCoins !== 'number') return;
            if (coins < skin.priceCoins) {
                alert(language === 'EN'
                    ? `You need ${skin.priceCoins} coins — you have ${coins}.`
                    : `Il faut ${skin.priceCoins} pièces — vous en avez ${coins}.`);
                return;
            }
        } else if (method === 'usd') {
            if (typeof skin.priceUSD !== 'number') return;
            // TODO: wire Stripe. For now simulate a successful checkout via confirm.
            const ok = confirm(language === 'EN'
                ? `Pay $${skin.priceUSD.toFixed(2)} for ${skin.name}? (Simulated checkout — no card charged yet.)`
                : `Payer $${skin.priceUSD.toFixed(2)} pour ${skin.name} ? (Achat simulé — aucune carte débitée pour l'instant.)`);
            if (!ok) return;
        } else if (method === 'level') {
            if (skin.minLevel > userLevel) {
                alert(language === 'EN' ? `Level ${skin.minLevel} required.` : `Niveau ${skin.minLevel} requis.`);
                return;
            }
        }

        // Apply the cost (tokens) or note the USD purchase.
        if (method === 'tokens' && typeof skin.priceTokens === 'number') {
            setUserTokens(t => Math.max(0, t - skin.priceTokens!));
        } else if (method === 'coins' && typeof skin.priceCoins === 'number') {
            const ok = await spendCoins(skin.priceCoins);
            if (!ok) return;
        }

        const next = [...purchasedSkins, skinId];
        setPurchasedSkins(next);
        addPoints(20, "Skin Purchase");

        if (currentUser?.uid) {
            try {
                const db = studioFirestore(); if (!db) return;
                await setDoc(
                    doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                    { purchasedSkins: next, updatedAt: serverTimestamp() },
                    { merge: true },
                );
            } catch (e) {
                setProfileError(String((e as any)?.message ?? e));
            }
        }
    };

    // Clear store preview when the user navigates away from the STORE tab —
    // the saved activeSkinId takes over again.
    useEffect(() => {
        if (activeTab !== 'STORE') setPreviewSkinId(null);
    }, [activeTab]);

    // Persist active skin selection so the chosen cosmetic re-applies on
    // reload. Wraps setActiveSkinId.
    const selectActiveSkin = async (skinId: string | null) => {
        setActiveSkinId(skinId);
        if (!currentUser?.uid) return;
        try {
            const db = studioFirestore(); if (!db) return;
            await setDoc(
                doc(db, 'members', currentUser.uid, 'artistProfile', 'profile'),
                { activeSkinId: skinId, updatedAt: serverTimestamp() },
                { merge: true },
            );
        } catch (e) {
            setProfileError(String((e as any)?.message ?? e));
        }
    };

    const handleReadArticle = (article: HubArticle) => {
        setSelectedArticle(article);
        // Delay point award to simulate reading time
        setTimeout(() => {
            addPoints(0.5, "Read Article");
        }, 3000);
    };

    const handleSpeak = async (text: string) => {
        if (isPlayingAudio) return;
        
        setIsPlayingAudio(true);
        try {
            const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text: text }] }],
              config: {
                responseModalities: [Modality.AUDIO], 
                speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
              },
            });

            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            }

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  audioContextRef.current,
                  24000,
                  1,
                );
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.onended = () => setIsPlayingAudio(false);
                source.start();
            } else {
                setIsPlayingAudio(false);
            }

        } catch (e) {
            console.error("TTS Error", e);
            setIsPlayingAudio(false);
        }
    };

    const handleUpgradeMembership = (tier: MembershipTier) => {
        setMembershipTier(tier);
        addPoints(5, "Membership Upgrade");
        alert(`Welcome to ${tier} tier!`);
    };

    const handleInvest = () => {
        if(confirm("Confirm investment of 100 Credits to platform development?")) {
            addPoints(10, "Investment");
            alert("Thank you for your investment!");
        }
    };

    const handleContributeCode = () => {
        addPoints(15, "Code Contribution Approved"); // Simulating approval
        alert(language === 'EN'
            ? 'Pull Request Submitted. +15 coins pending approval.'
            : 'Pull Request envoyée. +15 pièces en attente d\'approbation.');
    };

    // --- HOT SEAT LOGIC ---
    const handleHotSeatSubmit = () => {
        if (!newSubmission.title) return;
        const submission: HotSeatSubmission = {
            id: `WIP-${Date.now()}`,
            title: newSubmission.title,
            artist: regData.name || 'Anonymous',
            type: newSubmission.type,
            stage: newSubmission.stage,
            description: newSubmission.description,
            imageUrl: newSubmission.imageUrl || "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1000&auto=format&fit=crop",
            workLink: newSubmission.workLink || undefined,
            feedbackSought: newSubmission.feedbackSought,
            specificQuestions: newSubmission.specificQuestions || undefined,
            sensitivities: newSubmission.sensitivities || undefined,
            feedback: []
        };
        setHotSeatSubmissions([submission, ...hotSeatSubmissions]);
        setHotSeatView('LIST');
        setNewSubmission({
            title: '', type: 'Drawing', stage: 'midDraft', description: '',
            imageUrl: '', workLink: '', feedbackSought: [],
            specificQuestions: '', sensitivities: '',
        });
    };

    /** Toggle a feedback-type chip in the submission form. */
    const toggleFeedbackSought = (key: string) => {
        setNewSubmission(prev => ({
            ...prev,
            feedbackSought: prev.feedbackSought.includes(key)
                ? prev.feedbackSought.filter(x => x !== key)
                : [...prev.feedbackSought, key],
        }));
    };

    const handleHotSeatCritique = () => {
        if (!selectedHotSeatWork || !newCritique.text) return;
        
        const feedback: HotSeatFeedback = {
            id: `FB-${Date.now()}`,
            author: regData.name || 'Anonymous',
            capacity: newCritique.capacity,
            text: newCritique.text,
            timestamp: 'Just now'
        };

        const updatedWork = { ...selectedHotSeatWork, feedback: [...selectedHotSeatWork.feedback, feedback] };
        
        setHotSeatSubmissions(prev => prev.map(w => w.id === selectedHotSeatWork.id ? updatedWork : w));
        setSelectedHotSeatWork(updatedWork);
        setNewCritique({ capacity: 'Profane', text: '' });
    };


    // --- RENDER TOOL HELPERS ---
    const renderToolModal = () => {
        if (activeTool === 'LEGAL') {
            return <LegalModal onClose={() => setActiveTool(null)} themeStyles={currentStyles} isMaestro={membershipTier === 'MAESTRO'} />;
        }
        if (activeTool === 'BIOFORGE') {
            return <BioForge onClose={() => setActiveTool(null)} themeStyles={currentStyles} />;
        }
        if (activeTool === 'COPYRIGHTER') {
            return <CopyrighterModal onClose={() => setActiveTool(null)} themeStyles={currentStyles} />;
        }
        // Inspirosphere is intentionally NOT rendered here — it lives inline
        // in the Main Content Area (replacing the active tab) so the Studio
        // contextual viewer at the top of the shell stays visible.
        if (activeTool === 'GRANTS_CA') {
            // Canada-only "Aide aux Subventions" — eventual AI-assisted scan
            // of CCA / SODEC / Telefilm / etc. databases + draft helper.
            // Stubbed for now with the planned scope, links, and a "notify
            // me when ready" capture so we have demand signal before build.
            return (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
                     onClick={() => setActiveTool(null)} role="dialog" aria-modal="true">
                    <div className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 ${formStyles.container}`}
                         onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActiveTool(null)} aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                className="absolute top-3 right-3 w-9 h-9 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base">✕</button>

                        <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-cinzel uppercase tracking-[0.4em] px-2 py-1 border border-red-400/50 text-red-200 bg-red-500/10 rounded flex items-center gap-1">
                                🍁 {language === 'EN' ? 'Canada · Beta' : 'Canada · Bêta'}
                            </span>
                        </div>
                        <h2 className={`text-3xl md:text-4xl mb-3 ${pageTitleClass}`}>
                            {language === 'EN' ? 'Grants Aid' : 'Aide aux Subventions'}
                        </h2>
                        <p className="text-sm text-neutral-300 max-w-2xl font-lato leading-relaxed mb-8">
                            {language === 'EN'
                                ? "An AI assistant that scans Canadian government grant databases (Canada Council for the Arts, SODEC, Telefilm, CALQ, regional councils) and helps you draft applications. We're building it now — meanwhile, the curated links below get you started."
                                : "Un assistant IA qui scanne les bases gouvernementales canadiennes (Conseil des arts du Canada, SODEC, Téléfilm, CALQ, conseils régionaux) et t'aide à rédiger les demandes. On le construit en ce moment — pour l'instant, les liens curatés ci-dessous sont un bon départ."}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                            {[
                                { name: 'Canada Council for the Arts', fr: 'Conseil des arts du Canada', url: 'https://canadacouncil.ca/funding' },
                                { name: 'SODEC', fr: 'SODEC', url: 'https://sodec.gouv.qc.ca/' },
                                { name: 'Telefilm Canada', fr: 'Téléfilm Canada', url: 'https://telefilm.ca/' },
                                { name: 'CALQ (Québec)', fr: 'CALQ (Québec)', url: 'https://www.calq.gouv.qc.ca/' },
                                { name: 'Ontario Arts Council', fr: 'Conseil des arts de l\'Ontario', url: 'https://www.arts.on.ca/' },
                                { name: 'Canadian Heritage', fr: 'Patrimoine canadien', url: 'https://www.canada.ca/en/canadian-heritage.html' },
                            ].map(g => (
                                <a key={g.url} href={g.url} target="_blank" rel="noopener noreferrer"
                                   className={`group flex items-center gap-3 p-4 border border-white/10 bg-black/40 hover:border-red-400/40 hover:bg-red-500/5 rounded transition-all`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-cinzel text-white truncate">{language === 'FR' ? g.fr : g.name}</p>
                                        <p className="text-[10px] text-neutral-500 truncate">{g.url.replace(/^https?:\/\//, '')}</p>
                                    </div>
                                    <span className="text-neutral-500 group-hover:text-white transition-colors">↗</span>
                                </a>
                            ))}
                        </div>

                        <div className={`p-5 rounded-lg border-l-4 border-red-500 bg-red-500/5`}>
                            <h4 className="font-cinzel text-[10px] font-bold text-red-300 uppercase tracking-[0.3em] mb-2">
                                {language === 'EN' ? 'Coming next' : 'Prochaines étapes'}
                            </h4>
                            <ul className="space-y-2 text-sm text-neutral-300 font-lato leading-relaxed">
                                <li className="flex gap-2"><span className="font-mono text-red-300 tabular-nums">01</span><span>{language === 'EN' ? 'Database scanner: surfaces grants matching your discipline + region + deadline.' : 'Scanner de bases : fait remonter les bourses qui collent à ta discipline + région + échéance.'}</span></li>
                                <li className="flex gap-2"><span className="font-mono text-red-300 tabular-nums">02</span><span>{language === 'EN' ? 'Application drafter: generates a first pass from your bio + project description.' : 'Brouilleur de demande : génère un premier jet à partir de ta bio + description du projet.'}</span></li>
                                <li className="flex gap-2"><span className="font-mono text-red-300 tabular-nums">03</span><span>{language === 'EN' ? 'Deadline tracker: pings you 3 weeks before each opportunity closes.' : 'Suivi des échéances : te ping 3 semaines avant la fermeture de chaque appel.'}</span></li>
                            </ul>
                        </div>
                    </div>
                </div>
            );
        }
        if (activeTool === 'KANBAN') {
            // The Kanban now persists per-board to Firestore and supports a
            // multi-board switcher (free for the first paid tier, otherwise
            // unlock for 50 coins). Pass everything it needs from the hub
            // here so it can read/write coins, branch on tier, and theme.
            return (
                <div className="fixed inset-0 z-[80] bg-[#050505] overflow-hidden">
                    <KanbanTool
                        themeStyles={currentStyles}
                        formStyles={formStyles}
                        pageTitleClass={pageTitleClass}
                        uid={currentUser?.uid ?? null}
                        language={language}
                        membershipTier={membershipTier}
                        coins={coins}
                        spendCoins={spendCoins}
                        onClose={() => setActiveTool(null)}
                    />
                </div>
            );
        }
        return null;
    };

    // --- TRANSLATION MAPS ---
    const tabTranslations: Record<Tab, string> = {
        COLLABORATE: language === 'EN' ? 'COLLABORATE' : 'COLLABORER',
        TOOLS: language === 'EN' ? 'TOOLS' : 'OUTILS',
        READS: language === 'EN' ? 'READS' : 'LECTURES',
        ROSTER: language === 'EN' ? 'ROSTER' : 'RÉPERTOIRE',
        PROFILE: language === 'EN' ? 'PROFILE' : 'PROFIL',
        MARKET: language === 'EN' ? 'MARKET' : 'MARCHÉ',
        STORE: language === 'EN' ? 'STORE' : 'BOUTIQUE',
        HOT_SEAT: language === 'EN' ? 'HOT SEAT' : 'CRITIQUE',
        CHAT: language === 'EN' ? 'CHAT' : 'CLAVARDAGE'
    };

    // --- GATEWAY (Selection Screen) ---
    if (phase === 'GATEWAY') {
        return (
            <div className="w-full min-h-[80vh] flex flex-col items-center justify-center relative p-4">
                
                {/* Background Graphics */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 ${theme === 'RED' ? 'bg-red-900' : theme === 'BLUE_PUNK' ? 'bg-cyan-900' : theme === 'CLASSY' ? 'bg-yellow-900' : 'bg-fuchsia-900'}`}></div>
                </div>

                <div className="w-full h-[70vh] max-w-7xl z-10 flex flex-col md:flex-row gap-4">
                    
                    {/* OBSERVER (Browse) - League Style (Clean/Gold) */}
                    <div 
                        onClick={() => handleEnter('GUEST')}
                        className="relative flex-1 group cursor-pointer overflow-hidden border-2 border-[#c8aa6e]/50 hover:border-[#c8aa6e] transition-all duration-500 bg-[#091428] shadow-2xl"
                    >
                        {/* Background Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#010a13] via-transparent to-[#0a1428]/80 z-10" />
                        <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700 bg-[url('https://www.transparenttextures.com/patterns/hexellence.png')]"></div>
                        
                        {/* Image Layer */}
                        <img 
                            src="https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?q=80&w=1000&auto=format&fit=crop" 
                            className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100" 
                        />
                        
                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col justify-center items-center z-20">
                            {/* Decorative Top */}
                            <div className="mb-8 w-px h-16 bg-gradient-to-b from-transparent via-[#c8aa6e] to-transparent opacity-50 group-hover:h-24 transition-all duration-500"></div>
                            
                            <h2 className="text-6xl font-cinzel font-bold text-[#f0e6d2] uppercase tracking-[0.2em] text-center leading-[1.1] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
                                {language === 'EN' ? "Ob" : "Ob"}<br/>
                                <span className="text-[#c8aa6e] group-hover:text-white transition-colors duration-500">ser</span><br/>
                                {language === 'EN' ? "ver" : "veur"}
                            </h2>
                            
                            {/* Decorative Bottom */}
                            <div className="mt-8 w-px h-16 bg-gradient-to-b from-transparent via-[#c8aa6e] to-transparent opacity-50 group-hover:h-24 transition-all duration-500"></div>
                            
                            <p className="absolute bottom-8 font-cinzel text-xs text-[#c8aa6e] tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                                {language === 'EN' ? "Enter the Archives" : "Entrer dans les Archives"}
                            </p>
                        </div>
                    </div>

                    {/* CREATOR (Join) - Punk/Street Style (Ripped/Dirty) */}
                    <div 
                        onClick={() => handleEnter('MEMBER')}
                        className="relative flex-1 group cursor-pointer overflow-hidden bg-black shadow-2xl transition-all duration-500 hover:-translate-y-1"
                    >
                        {/* Ripped Edge Simulation via multiple shadows or clip-path? Using a graphic overlay style here */}
                        <div className="absolute inset-0 border-4 border-transparent group-hover:border-fuchsia-600/50 transition-colors duration-300 z-30 pointer-events-none" style={{clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 5% 50%)'}}></div>

                        {/* Background Splatters */}
                        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/40 via-black to-cyan-900/40 z-10" />
                        <div className="absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity duration-300" style={{backgroundImage: 'url("https://www.transparenttextures.com/patterns/wall-4-light.png")'}}></div>
                        
                        {/* Image Layer */}
                        <img 
                            src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop" 
                            className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale contrast-125 group-hover:grayscale-0 transition-all duration-1000 scale-110 group-hover:scale-105 group-hover:rotate-1" 
                        />
                        
                        {/* Content */}
                        <div className="absolute inset-0 flex flex-col justify-center items-center z-20 mix-blend-hard-light">
                            <h2 className="text-7xl font-black font-sans text-white uppercase tracking-tighter text-center leading-[0.9] transform -skew-x-12 group-hover:skew-x-0 transition-all duration-300 drop-shadow-[5px_5px_0px_rgba(255,0,255,0.5)]">
                                Cre<br/>
                                <span className="text-cyan-400 group-hover:text-yellow-300 transition-colors duration-200">a</span><br/>
                                {language === 'EN' ? "tor" : "teur"}
                            </h2>
                            
                            {/* Paint Splatter Decoration */}
                            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                            
                            <p className="absolute bottom-8 font-mono font-bold text-xs bg-black text-white px-2 py-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 transform rotate-2">
                                {language === 'EN' ? "Join the Chaos" : "Rejoindre le Chaos"}
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // --- CHAMPION SELECT (Registration) ---
    if (phase === 'CHAMPION_SELECT') {
        return (
            <div className="w-full min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
                {/* Background Glow */}
                <div className={`absolute inset-0 opacity-10 ${themeStyles.bg}`}></div>

                <div className="w-full max-w-5xl relative z-10 flex flex-col md:flex-row gap-8">
                    
                    {/* Left: Selection Panel */}
                    <div className="flex-1 space-y-8">
                        <div className="text-left">
                            <h2 className="text-white font-cinzel text-4xl font-bold tracking-widest mb-1">{language === 'EN' ? "IDENTITY" : "IDENTITÉ"}</h2>
                            <p className="text-neutral-500 text-xs uppercase tracking-widest">{language === 'EN' ? "Forging your profile" : "Forger votre profil"}</p>
                        </div>

                        {/* Name Input */}
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder={language === 'EN' ? "ENTER ALIAS" : "ENTRER ALIAS"}
                                value={regData.name}
                                onChange={(e) => setRegData({...regData, name: e.target.value})}
                                className={`w-full bg-black/30 border-b-2 ${themeStyles.border} text-2xl font-cinzel text-white py-3 focus:outline-none placeholder-neutral-700 uppercase tracking-wider`}
                            />
                        </div>

                        {/* City + Country — country code drives the flag emoji
                            shown on the public profile + contextual viewer. */}
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                placeholder={language === 'EN' ? "CITY" : "VILLE"}
                                value={regData.city}
                                onChange={(e) => setRegData({ ...regData, city: e.target.value })}
                                className={`w-full bg-black/30 border-b-2 ${themeStyles.border} text-sm font-cinzel text-white py-2 focus:outline-none placeholder-neutral-700 uppercase tracking-wider`}
                            />
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{flagEmoji(regData.country) || '🌍'}</span>
                                <select
                                    value={regData.country || ''}
                                    onChange={(e) => setRegData({ ...regData, country: e.target.value || undefined })}
                                    className={`flex-1 bg-black/30 border-b-2 ${themeStyles.border} text-sm font-cinzel text-white py-2 focus:outline-none uppercase tracking-wider`}
                                >
                                    <option value="">{language === 'EN' ? 'COUNTRY' : 'PAYS'}</option>
                                    {COUNTRY_OPTIONS.map(c => (
                                        <option key={c.code} value={c.code}>{flagEmoji(c.code)} {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div>
                            <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-6">{language === 'EN' ? "Select Archetype" : "Choisir Archétype"}</p>
                            <div className="flex gap-4 justify-start">
                                {['VISUAL', 'AUDIO', 'DIGITAL', 'SCULPT', 'PERFORM'].map(type => (
                                    <ClassIcon 
                                        key={type} 
                                        type={type} 
                                        selected={regData.archetype === type} 
                                        onClick={() => setRegData({...regData, archetype: type})}
                                        themeStyles={themeStyles}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Bio */}
                        <div className="relative">
                            <textarea 
                                placeholder={language === 'EN' ? "YOUR MANIFESTO..." : "VOTRE MANIFESTE..."}
                                value={regData.bio}
                                onChange={(e) => setRegData({...regData, bio: e.target.value})}
                                className={`w-full h-32 bg-black/30 border ${themeStyles.border} p-4 text-neutral-300 font-serif text-sm focus:outline-none resize-none`}
                            ></textarea>
                            <div className={`absolute bottom-0 right-0 w-4 h-4 border-b border-r ${themeStyles.border}`}></div>
                        </div>
                    </div>

                    {/* Right: Splash Art */}
                    <div className="w-full md:w-1/3 flex flex-col justify-end items-center">
                        <div className={`w-full aspect-[3/4] border-2 ${themeStyles.border} bg-black/40 relative mb-6 overflow-hidden shadow-2xl`}>
                            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                <span className="text-8xl">{regData.archetype ? (regData.archetype === 'VISUAL' ? '🎨' : regData.archetype === 'AUDIO' ? '🎵' : '✨') : '?'}</span>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4">
                                <h3 className="text-white font-cinzel text-xl font-bold uppercase">{regData.name || 'UNKNOWN'}</h3>
                                <p className="text-neutral-400 text-xs uppercase tracking-widest">{regData.archetype || (language === 'EN' ? 'Select Class' : 'Choisir Classe')}</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleLockIn}
                            disabled={!regData.name || !regData.archetype}
                            className={`w-full py-4 font-cinzel font-bold text-lg uppercase tracking-[0.2em] transition-all duration-300 border ${themeStyles.border} ${!regData.name || !regData.archetype ? 'bg-black/20 text-neutral-600 cursor-not-allowed grayscale' : 'bg-white/10 text-white hover:bg-white/20'}`}
                        >
                            {language === 'EN' ? "Lock In" : "Confirmer"}
                        </button>
                    </div>

                </div>
            </div>
        );
    }

    // --- LOBBY (The Main Hub) ---
    return (
        <div className={`w-full min-h-screen ${currentStyles.text} font-sans relative`}>

            {/* Theme Background Override Layer */}
            {currentSkin && (
                <div className={`fixed inset-0 z-[-10] ${currentStyles.bg} transition-colors duration-500`}></div>
            )}

            {/* Puzzle completion overlay — fixed, pointer-events-none.
                Lives at the document level so it floats above the puzzle
                section's clip/overflow while flying to the display case. */}
            {puzzleCelebration && (
                <PuzzleCelebration
                    artwork={puzzleCelebration.artwork}
                    sourceRect={puzzleCelebration.sourceRect}
                    targetSelector={`[data-puzzle-slot="${puzzleCelebration.targetIndex}"]`}
                    language={language}
                    onDone={() => setPuzzleCelebration(null)}
                />
            )}

            {/* Render any Active Tool Modal */}
            {renderToolModal()}
            
            {/* Library Modal */}
            {isLibraryOpen && (
                <LibraryModal onClose={() => setIsLibraryOpen(false)} themeStyles={currentStyles} />
            )}

            {/* Top Navigation Bar - Updated with Gradient Fade Out */}
            <div 
                className={`z-40 sticky top-0 px-6 pt-4 pb-12 flex items-center justify-between bg-gradient-to-b from-[#1a1a1a] to-transparent`}
            >
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full border-2 ${currentStyles.border} flex items-center justify-center bg-black/50 shadow-inner`}>
                        {/* Replaced Eye Emoji with SVG */}
                        {(accessLevel === 'MEMBER' && regData.archetype) ? (
                            <span className="text-lg">{regData.archetype === 'VISUAL' ? <Icons.Visual /> : <Icons.Audio />}</span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-neutral-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        )}
                    </div>
                    <div className="flex flex-col">
                        <h4 className={`font-cinzel font-bold text-base ${currentStyles.text} uppercase tracking-wider`}>{accessLevel === 'MEMBER' ? regData.name : (language === 'EN' ? 'Guest Observer' : 'Observateur Invité')}</h4>
                        <div className="flex items-center gap-2">
                             {/* Level Progress Bar */}
                             <div className="h-1.5 w-24 bg-black/50 rounded-full overflow-hidden border border-white/10" title={`${userPoints % 10} / 10 Points to next level`}>
                                <div 
                                    className={`h-full ${theme === 'RED' ? 'bg-red-600' : 'bg-[#d4af37]'} transition-all duration-1000`} 
                                    style={{ width: `${(userPoints % 10) * 10}%` }}
                                ></div>
                             </div>
                             <span className="text-[9px] font-bold text-neutral-500 uppercase">Lvl {userLevel}</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 overflow-x-auto">
                    {(Object.keys(tabTranslations) as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); setHasNavigated(true); }}
                            className={`px-4 py-2 font-cinzel font-bold text-[10px] uppercase tracking-[0.15em] transition-all relative group
                                ${activeTab === tab 
                                    ? currentStyles.highlight 
                                    : 'text-neutral-500 hover:text-neutral-300'
                                }`}
                        >
                            {/* Tab Background Texture if Active */}
                            {activeTab === tab && (
                                <div className={`absolute inset-0 bg-white/5 border border-white/10 -skew-x-12 -z-10 ${currentStyles.border}`}></div>
                            )}
                            {tabTranslations[tab]}
                        </button>
                    ))}
                </div>

                {/* Tokens (Was Essence) / Admin Toggle */}
                <div className="flex items-center gap-4">
                    {accessLevel === 'MEMBER' && (
                        <div className="flex items-center gap-1">
                            <span className={`font-bold font-serif italic text-sm ${currentStyles.highlight}`}>{userTokens}</span>
                            <Icons.Token />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full max-w-[95%] mx-auto px-4 pb-12 relative min-h-[80vh] -mt-8">

                {/* TOOLS — Inspirosphere variant.
                    When the user opens the Inspirosphere from the Arsenal
                    grid, it replaces the grid in-place: the orb takes the
                    upper section, the controls + Conscious Mode browser
                    sit in the lower section. The Studio contextual viewer
                    above stays visible. Scoped to the TOOLS tab only — if
                    the user switches tabs, the tool quietly hides. */}
                {activeTab === 'TOOLS' && activeTool === 'INSPIROSPHERE' && (
                    <Inspirosphere
                        onClose={() => setActiveTool(null)}
                        language={language}
                        formStyles={formStyles}
                        pageTitleClass={pageTitleClass}
                    />
                )}

                {/* TOOLS (ARMORY) - UPDATED WITH REQUESTED TOOLS */}
                {activeTab === 'TOOLS' && activeTool !== 'INSPIROSPHERE' && (
                    <div className="relative max-w-7xl mx-auto">
                        <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 ${accessLevel === 'GUEST' ? 'opacity-20 pointer-events-none' : ''}`}>
                            
                            {/* Tool 1: Legal */}
                            <div 
                                onClick={() => setActiveTool('LEGAL')}
                                className={`bg-black/40 border ${currentStyles.border} p-8 hover:bg-white/5 transition-all group cursor-pointer aspect-square flex flex-col items-center justify-center text-center`}
                            >
                                <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 text-neutral-400 group-hover:text-white`}>
                                    <Icons.Law />
                                </div>
                                <h3 className="font-cinzel text-white uppercase font-bold text-xl">{language === 'EN' ? "Legal Codex" : "Codex Légal"}</h3>
                                <p className="text-neutral-500 text-xs mt-3 px-4">Copyright, Royalties, AI Policy & Legal Counsel.</p>
                            </div>

                            {/* Tool 2: Kanban — opens the imported KanbanTool inline.
                                Was previously window.open('…/studio/board') to an external page. */}
                            <div
                                onClick={() => setActiveTool('KANBAN')}
                                className={`bg-black/40 border ${currentStyles.border} p-8 hover:bg-white/5 transition-all group cursor-pointer aspect-square flex flex-col items-center justify-center text-center`}
                            >
                                <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 text-neutral-400 group-hover:text-white`}>
                                    <Icons.Board />
                                </div>
                                <h3 className="font-cinzel text-white uppercase font-bold text-xl">{language === 'EN' ? "Creative Board" : "Tableau Créatif"}</h3>
                                <p className="text-neutral-500 text-xs mt-3 px-4">Personal Scrum Board for managing artistic chaos.</p>
                            </div>

                            {/* Tool 3: Bio-Forge */}
                            <div 
                                onClick={() => setActiveTool('BIOFORGE')}
                                className={`bg-black/40 border ${currentStyles.border} p-8 hover:bg-white/5 transition-all group cursor-pointer aspect-square flex flex-col items-center justify-center text-center`}
                            >
                                <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 text-neutral-400 group-hover:text-white`}>
                                    <Icons.Dna />
                                </div>
                                <h3 className="font-cinzel text-white uppercase font-bold text-xl">Bio-Forge</h3>
                                <p className="text-neutral-500 text-xs mt-3 px-4">Craft your pitch, build your skill tree & CV.</p>
                            </div>

                            {/* Tool 4: Copyrighter (NEW) */}
                            <div
                                onClick={() => setActiveTool('COPYRIGHTER')}
                                className={`bg-black/40 border ${currentStyles.border} p-8 hover:bg-white/5 transition-all group cursor-pointer aspect-square flex flex-col items-center justify-center text-center`}
                            >
                                <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 text-neutral-400 group-hover:text-white`}>
                                    <Icons.Shield />
                                </div>
                                <h3 className="font-cinzel text-white uppercase font-bold text-xl">Copyrighter</h3>
                                <p className="text-neutral-500 text-xs mt-3 px-4">Timestamp & Register assets on the blockchain.</p>
                            </div>

                            {/* Tool 5: Inspirosphere — orb tool. Always visible.
                                Streams a single curated video at random from
                                the Inspirosphere catalog; "Next" zaps to the
                                next random pick; "Conscious mode" exposes
                                the by-category browser. */}
                            <div
                                onClick={() => setActiveTool('INSPIROSPHERE')}
                                className={`relative bg-gradient-to-br from-fuchsia-900/15 via-cyan-900/10 to-black/40 border ${currentStyles.border} p-8 hover:from-fuchsia-900/25 hover:to-cyan-900/15 transition-all group cursor-pointer aspect-square flex flex-col items-center justify-center text-center overflow-hidden`}
                            >
                                {/* A tiny orb glyph behind the icon — visual hint */}
                                <div aria-hidden className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-30 group-hover:opacity-60 transition-opacity"
                                     style={{ background: 'radial-gradient(circle at 35% 30%, rgba(34,211,238,0.55), rgba(217,70,239,0.30) 50%, transparent 75%)', filter: 'blur(12px)' }} />
                                <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/60 text-neutral-400 group-hover:text-white relative`}
                                     style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.06)' }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M10 9l5 3-5 3z" fill="currentColor" />
                                    </svg>
                                </div>
                                <h3 className="font-cinzel text-white uppercase font-bold text-xl">
                                    {language === 'EN' ? 'Inspirosphere' : 'Inspirosphère'}
                                </h3>
                                <p className="text-neutral-500 text-xs mt-3 px-4">
                                    {language === 'EN'
                                        ? 'Random curated videos. Zap, browse, ignite.'
                                        : 'Vidéos curatées au hasard. Zappe, parcours, allume.'}
                                </p>
                            </div>

                            {/* Tool 6: Aide aux Subventions — Canada-only.
                                Surfaces only when the visitor is detected as
                                being in Canada (profile country, browser
                                timezone, or navigator language). Tagged with
                                a maple-leaf badge so it reads as regional. */}
                            {isCanadianVisitor && (
                                <div
                                    onClick={() => setActiveTool('GRANTS_CA')}
                                    className={`relative bg-gradient-to-br from-red-900/20 via-black/40 to-black/40 border-2 border-red-500/30 p-8 hover:from-red-900/30 hover:border-red-400/60 transition-all group cursor-pointer aspect-square flex flex-col items-center justify-center text-center overflow-hidden`}
                                >
                                    {/* Maple leaf badge — top-right corner */}
                                    <span className="absolute top-3 right-3 text-[9px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 border border-red-400/50 text-red-200 bg-red-500/10 rounded backdrop-blur-md flex items-center gap-1">
                                        🍁 CA
                                    </span>
                                    <div className="w-20 h-20 mb-6 rounded-full border-2 border-red-500/30 group-hover:border-red-400/60 flex items-center justify-center bg-black/60 text-red-300 group-hover:text-red-100 transition-colors">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                            <path d="M12 2l1.5 4.5L18 8l-3.5 3 1 4.5L12 13l-3.5 2.5 1-4.5L6 8l4.5-1.5z" />
                                            <path d="M12 17v5M9 22h6" />
                                        </svg>
                                    </div>
                                    <h3 className="font-cinzel text-white uppercase font-bold text-xl">
                                        {language === 'EN' ? 'Grants Aid' : 'Aide aux Subventions'}
                                    </h3>
                                    <p className="text-neutral-400 text-xs mt-3 px-4">
                                        {language === 'EN'
                                            ? 'Scan Canadian government databases. Help draft applications.'
                                            : 'Scanne les bases gouvernementales. Aide à rédiger les demandes.'}
                                    </p>
                                </div>
                            )}

                        </div>
                        {accessLevel === 'GUEST' && (
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className={`w-96 p-1 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent p-[1px]`}>
                                    <div className="bg-[#050505] rounded-full p-8 text-center border border-white/10">
                                        <h3 className="text-white font-cinzel font-bold text-xl uppercase mb-2">{language === 'EN' ? "Login Required" : "Connexion Requise"}</h3>
                                        <p className="text-neutral-500 text-xs mb-6">{language === 'EN' ? "Tools are locked for Observers." : "Les outils sont verrouillés pour les observateurs."}</p>
                                        <HexButton primary onClick={handleJoinClick} themeStyles={currentStyles}>{language === 'EN' ? "Create Profile" : "Créer un Profil"}</HexButton>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PROFILE */}
                {activeTab === 'PROFILE' && (
                    <div className="relative w-full h-full">
                        {/* Hidden file inputs for avatar + gallery uploads. Triggered
                            via the visible buttons below. */}
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleAvatarUpload(f);
                                e.target.value = '';
                            }}
                        />
                        <input
                            ref={galleryInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleGalleryUpload(f);
                                e.target.value = '';
                            }}
                        />

                        {/* Action bar — only meaningful for signed-in members. The
                            Save button persists name/bio/skills; "Ask to be featured"
                            sends a request the Artistic CRM can approve. */}
                        {accessLevel === 'MEMBER' && currentUser && (
                            <div className="mb-6 p-4 border border-white/10 bg-black/40 backdrop-blur-sm flex flex-wrap items-center gap-3">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={profileSaving}
                                    className="px-5 py-2.5 bg-[#c5a059] text-[#18181b] font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all disabled:opacity-50"
                                >
                                    {profileSaving
                                        ? (language === 'EN' ? 'Saving…' : 'Sauvegarde…')
                                        : (language === 'EN' ? 'Save profile' : 'Sauvegarder')}
                                </button>

                                {profileSavedAt && !profileSaving && (Date.now() - profileSavedAt) < 4000 && (
                                    <span className="text-[10px] font-cinzel uppercase tracking-widest text-emerald-400">
                                        ✓ {language === 'EN' ? 'Saved' : 'Sauvegardé'}
                                    </span>
                                )}

                                <span className="flex-1" />

                                {featureRequest === 'none' && (
                                    <button
                                        onClick={handleAskToBeFeatured}
                                        disabled={featureBusy || !regData.name || !regData.bio}
                                        className="px-5 py-2.5 border border-fuchsia-400/50 text-fuchsia-200 hover:bg-fuchsia-500/10 hover:border-fuchsia-300 font-cinzel font-bold text-[10px] uppercase tracking-[0.3em] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                        title={!regData.name || !regData.bio ? (language === 'EN' ? 'Fill name + bio first' : 'Remplir nom et bio d\'abord') : undefined}
                                    >
                                        ★ {language === 'EN' ? 'Ask to be featured' : 'Demander à être mis·e en avant'}
                                    </button>
                                )}
                                {featureRequest === 'pending' && (
                                    <span className="px-4 py-2 border border-amber-400/40 text-amber-200 font-cinzel text-[10px] uppercase tracking-widest">
                                        ⌛ {language === 'EN' ? 'Request pending' : 'Demande en attente'}
                                    </span>
                                )}
                                {featureRequest === 'approved' && (
                                    <span className="px-4 py-2 border border-emerald-400/40 text-emerald-300 font-cinzel text-[10px] uppercase tracking-widest">
                                        ✓ {language === 'EN' ? 'Featured' : 'Mis·e en avant'}
                                    </span>
                                )}
                                {featureRequest === 'declined' && (
                                    <button
                                        onClick={handleAskToBeFeatured}
                                        disabled={featureBusy}
                                        className="px-4 py-2 border border-rose-400/40 text-rose-200 hover:bg-rose-500/10 font-cinzel text-[10px] uppercase tracking-widest"
                                    >
                                        {language === 'EN' ? 'Resubmit request' : 'Soumettre à nouveau'}
                                    </button>
                                )}

                                {profileError && (
                                    <span className="w-full text-[10px] text-rose-300 font-mono">
                                        {profileError}
                                    </span>
                                )}
                            </div>
                        )}

                        <div className={`flex flex-col xl:flex-row gap-8 p-4 ${accessLevel === 'GUEST' ? 'blur-sm opacity-30 pointer-events-none' : ''}`}>

                             {/* LEFT: THE MUGSHOT & ID */}
                             <div className="w-full xl:w-1/3 flex flex-col gap-6">
                                 {/* Image Container with "Tape" effect */}
                                 <div className="relative bg-[#1a1a1a] p-2 rotate-1 shadow-xl group cursor-pointer border border-white/5">
                                     {/* Upload Overlay Button */}
                                     {/* Add image — pushes onto galleryUrls. */}
                                     <button
                                        onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click(); }}
                                        className="absolute top-4 right-4 z-40 bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-fuchsia-600"
                                        title={language === 'EN' ? 'Add image' : 'Ajouter une image'}
                                     >
                                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                         </svg>
                                     </button>

                                     {/* Delete current image — only when one is shown. */}
                                     {galleryImages.length > 0 && (
                                         <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteGalleryImage(galleryImages[currentArtIndex]); }}
                                            className="absolute top-4 right-16 z-40 bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                                            title={language === 'EN' ? 'Delete image' : "Supprimer l'image"}
                                         >
                                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                             </svg>
                                         </button>
                                     )}

                                     {/* Tape Strip Top */}
                                     <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#e0d0b0] opacity-80 shadow-md rotate-[-2deg]" style={{ clipPath: 'polygon(0% 5%, 5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%)' }}></div>

                                     {/* The Gallery Carousel — sources from the user's galleryUrls.
                                         Empty state shows an upload affordance instead of a mock image. */}
                                     <div className="aspect-[3/4] overflow-hidden bg-black relative">
                                         {regData.archetype && galleryImages.length > 0 ? (
                                             <>
                                                <img
                                                    src={galleryImages[currentArtIndex]}
                                                    alt={language === 'EN' ? 'Featured artwork' : 'Œuvre mise en avant'}
                                                    className="w-full h-full object-cover transition-all duration-500"
                                                />
                                                {galleryImages.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={prevArt}
                                                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            ←
                                                        </button>
                                                        <button
                                                            onClick={nextArt}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-black/50 text-white rounded-full hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                                                        >
                                                            →
                                                        </button>
                                                    </>
                                                )}
                                                {/* "Change featured" affordance — opens the same picker
                                                    as the empty state so the user can pick from their
                                                    roster or upload a new piece. */}
                                                {accessLevel === 'MEMBER' && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setIsFeaturedPickerOpen(true); }}
                                                        className="absolute top-2 right-2 z-30 px-2.5 py-1 text-[9px] font-cinzel uppercase tracking-widest bg-black/70 border border-white/20 text-white/80 hover:text-white hover:border-white/50 hover:bg-black rounded transition-all opacity-0 group-hover:opacity-100"
                                                        title={language === 'EN' ? 'Change featured artwork' : "Changer l'œuvre en vedette"}
                                                    >
                                                        ✎ {language === 'EN' ? 'Change' : 'Changer'}
                                                    </button>
                                                )}
                                             </>
                                         ) : (
                                             <button
                                                onClick={(e) => { e.stopPropagation(); setIsFeaturedPickerOpen(true); }}
                                                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#1a1a1a] hover:bg-[#222] transition-colors group/empty"
                                                title={language === 'EN' ? 'Pick or upload your featured artwork' : 'Choisir ou téléverser ton œuvre en vedette'}
                                             >
                                                 <span className="text-5xl text-neutral-600 group-hover/empty:text-fuchsia-400 transition-colors">＋</span>
                                                 <span className="text-[10px] uppercase tracking-widest text-neutral-500 group-hover/empty:text-neutral-300">
                                                     {language === 'EN' ? 'Add your work' : 'Ajouter une œuvre'}
                                                 </span>
                                             </button>
                                         )}

                                         <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/concrete-wall.png')] opacity-30 mix-blend-overlay z-10 pointer-events-none"></div>

                                         {galleryImages.length > 0 && (
                                             <div className="absolute bottom-4 left-0 w-full text-center z-20 pointer-events-none">
                                                 <div className="inline-block bg-black text-white font-mono font-bold text-xs px-2 py-1 rotate-[-2deg] border border-white">
                                                     {currentArtIndex + 1} / {galleryImages.length}
                                                 </div>
                                             </div>
                                         )}
                                     </div>

                                     {/* Scribble Overlay — only when archetype set + image present. */}
                                     {regData.archetype && galleryImages.length > 0 && (
                                         <div className="absolute top-4 -right-4 bg-fuchsia-600 text-white px-3 py-1 font-bold font-sans text-xs rotate-6 shadow-lg border-2 border-white transform skew-x-[-10deg]" style={{ fontFamily: '"Permanent Marker", cursive' }}>
                                             {artTitles[currentArtIndex] || (language === 'EN' ? 'FEATURED' : 'EN VEDETTE')}
                                         </div>
                                     )}
                                 </div>

                                 {/* Skills — inline editable. Add/remove writes through to
                                     Firestore (handleAddSkill/handleRemoveSkill). */}
                                 <div className={`bg-[#0a0a0a] p-6 border ${currentStyles.border} relative`}>
                                     <div className={`flex justify-between items-center mb-4 border-b ${currentStyles.border} pb-2`}>
                                         <h3 className="font-cinzel text-white text-lg">{language === 'EN' ? 'SKILLS' : 'COMPÉTENCES'}</h3>
                                         <button
                                            onClick={() => setEditingSkills(v => !v)}
                                            className="text-[10px] uppercase text-neutral-500 hover:text-white"
                                         >
                                             {editingSkills ? (language === 'EN' ? 'Done' : 'Fini') : (language === 'EN' ? 'Edit' : 'Éditer')}
                                         </button>
                                     </div>
                                     <div className="flex flex-wrap gap-2">
                                         {regData.skills.length > 0 ? regData.skills.map((skill) => (
                                             <span key={skill} className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-xs text-neutral-300 font-bold uppercase tracking-wider rounded">
                                                 {skill}
                                                 {editingSkills && (
                                                     <button
                                                        onClick={() => handleRemoveSkill(skill)}
                                                        className="text-rose-400 hover:text-rose-200 ml-1 leading-none"
                                                        title={language === 'EN' ? 'Remove' : 'Retirer'}
                                                     >
                                                        ×
                                                     </button>
                                                 )}
                                             </span>
                                         )) : (
                                             <span className="text-xs text-neutral-600 italic">
                                                 {language === 'EN' ? 'No skills listed' : 'Aucune compétence'}
                                             </span>
                                         )}
                                     </div>
                                     {editingSkills && (
                                         <div className="mt-3 flex gap-2">
                                             <input
                                                type="text"
                                                value={newSkillInput}
                                                onChange={(e) => setNewSkillInput(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); } }}
                                                placeholder={language === 'EN' ? 'Add a skill…' : 'Ajouter…'}
                                                className="flex-1 bg-black/40 border border-white/15 px-2 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white/30 rounded"
                                             />
                                             <button
                                                onClick={handleAddSkill}
                                                disabled={!newSkillInput.trim()}
                                                className="px-3 py-1 border border-white/15 text-[10px] uppercase tracking-wider text-neutral-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed rounded"
                                             >
                                                 +
                                             </button>
                                         </div>
                                     )}
                                 </div>

                                 {/* Status Indicator */}
                                 <div className={`border ${currentStyles.border} p-4 bg-black/40 relative overflow-hidden flex flex-col justify-center items-center min-h-[80px]`}>
                                     <h4 className="text-white font-cinzel text-[10px] uppercase mb-1 opacity-50">Status</h4>
                                     <div className="flex items-center gap-2">
                                         <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                                         <span className="text-lg font-bold text-green-500 font-mono tracking-widest">ONLINE</span>
                                     </div>
                                 </div>
                             </div>

                             {/* RIGHT: THE DOSSIER */}
                             <div className="flex-1 relative flex flex-col gap-8">
                                 
                                 {/* Header Name + verified badge. No "Send Message" button —
                                     this view always renders the user's OWN profile. The
                                     PublicProfilePage carries Send Message for visiting
                                     other artists. */}
                                 <div className="relative">
                                     <h1 className="text-6xl md:text-8xl font-black font-sans text-white uppercase tracking-tighter leading-[0.85] opacity-90 flex items-center gap-3 flex-wrap">
                                         <span>{regData.name || 'UNKNOWN'}</span>
                                         {isArtist && (
                                             <span
                                                title={language === 'EN' ? 'Curated artist — verified by the Salon' : 'Artiste curaté·e — vérifié·e par le Salon'}
                                                aria-label={language === 'EN' ? 'Verified curated artist' : 'Artiste curaté·e vérifié·e'}
                                                className="inline-flex items-center justify-center w-9 h-9 md:w-12 md:h-12 rounded-full bg-[#c5a059]/15 border border-[#c5a059]/40 shadow-[0_0_18px_rgba(197,160,89,0.35)]"
                                             >
                                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#c5a059" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 md:w-7 md:h-7">
                                                     <polyline points="20 6 9 17 4 12" />
                                                 </svg>
                                             </span>
                                         )}
                                     </h1>
                                     {/* Label: Artist ID */}
                                     <span className="absolute -top-4 -left-4 text-cyan-400 font-mono text-xs font-bold bg-black px-2 py-1 rotate-[-5deg] border border-cyan-500/50">
                                         ARTIST ID
                                     </span>
                                     <div className={`mt-4 flex items-center justify-between border-b ${currentStyles.border} pb-4`}>
                                         <p className="font-mono text-fuchsia-400 text-sm font-bold tracking-widest bg-fuchsia-900/20 inline-block px-2">
                                             // ARCHETYPE: {regData.archetype || 'UNREGISTERED'} | TIER: {membershipTier}
                                         </p>
                                     </div>
                                 </div>

                                 {/* Manifesto — click to edit; auto-saves on commit. */}
                                 <div className="relative group">
                                     <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 rounded blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                     <div className={`relative bg-[#050505] border ${currentStyles.border} p-8 min-h-[150px]`}>
                                         <div className="absolute top-0 left-0 w-2 h-full bg-neutral-800"></div>
                                         <div className="flex items-center justify-between mb-4">
                                             <h4 className="font-cinzel text-neutral-500 text-xs uppercase tracking-widest">
                                                 {language === 'EN' ? 'Manifesto' : 'Manifeste'}
                                             </h4>
                                             {!editingBio && (
                                                 <button
                                                    onClick={() => { setBioDraft(regData.bio); setEditingBio(true); }}
                                                    className="text-[10px] uppercase text-neutral-500 hover:text-white tracking-widest"
                                                 >
                                                     {language === 'EN' ? 'Edit' : 'Éditer'}
                                                 </button>
                                             )}
                                         </div>
                                         {editingBio ? (
                                             <div className="pl-6 border-l-2 border-fuchsia-500/40">
                                                 <textarea
                                                    value={bioDraft}
                                                    onChange={(e) => setBioDraft(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Escape') { setEditingBio(false); }
                                                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { handleSaveBio(); }
                                                    }}
                                                    autoFocus
                                                    rows={4}
                                                    className="w-full bg-black/50 border border-white/15 px-3 py-2 text-neutral-100 font-serif text-lg leading-relaxed focus:outline-none focus:border-fuchsia-400/40 resize-y"
                                                    placeholder={language === 'EN' ? 'Speak your truth…' : 'Dire votre vérité…'}
                                                 />
                                                 <div className="flex gap-2 mt-2">
                                                     <button
                                                        onClick={handleSaveBio}
                                                        className="px-4 py-1.5 border border-[#c5a059]/50 bg-[#c5a059]/10 text-[#f3e5ab] text-[10px] uppercase tracking-widest hover:bg-[#c5a059]/20"
                                                     >
                                                         {language === 'EN' ? 'Save' : 'Sauvegarder'}
                                                     </button>
                                                     <button
                                                        onClick={() => setEditingBio(false)}
                                                        className="px-4 py-1.5 border border-white/15 text-neutral-400 text-[10px] uppercase tracking-widest hover:bg-white/5"
                                                     >
                                                         {language === 'EN' ? 'Cancel' : 'Annuler'}
                                                     </button>
                                                     <span className="text-[9px] uppercase tracking-widest text-neutral-600 self-center ml-2">⌘↵ {language === 'EN' ? 'to save' : 'pour sauver'}</span>
                                                 </div>
                                             </div>
                                         ) : (
                                             <p
                                                onClick={() => { setBioDraft(regData.bio); setEditingBio(true); }}
                                                className="text-neutral-300 font-serif text-lg leading-relaxed italic pl-6 border-l-2 border-neutral-700 cursor-text hover:border-fuchsia-500/40 transition-colors"
                                             >
                                                 "{regData.bio || (language === 'EN' ? 'No manifesto found. Subject remains silent.' : 'Aucun manifeste. Le sujet reste silencieux.')}"
                                             </p>
                                         )}
                                     </div>
                                 </div>
                                 
                                 {/* My collab requests — submissions to the COLLABORATE
                                     tab. Admins triage in the CRM; their reply lands
                                     here in real time via `adminResponse` + `status`. */}
                                 {myCollabRequests.length > 0 && (
                                     <div className={`bg-[#0a0a0a] p-5 border ${currentStyles.border} rounded-xl mb-6`}>
                                         <div className="flex items-baseline justify-between mb-3">
                                             <h3 className="font-cinzel text-white text-base">
                                                 {language === 'EN' ? 'Your collab requests' : 'Tes demandes de collab'}
                                             </h3>
                                             <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-neutral-500">
                                                 {myCollabRequests.length} {language === 'EN' ? 'sent' : 'envoyée·s'}
                                             </span>
                                         </div>
                                         <div className="space-y-2">
                                             {myCollabRequests.map(r => {
                                                 const typeLabel = r.type === 'RESIDENCY' ? (language === 'EN' ? 'Residency' : 'Résidence')
                                                     : r.type === 'EVENT' ? (language === 'EN' ? 'Event' : 'Événement')
                                                     : (language === 'EN' ? 'Project' : 'Projet');
                                                 const statusLabel = r.status === 'approved' ? (language === 'EN' ? 'Approved' : 'Approuvée')
                                                     : r.status === 'declined' ? (language === 'EN' ? 'Declined' : 'Refusée')
                                                     : r.status === 'in_progress' ? (language === 'EN' ? 'In progress' : 'En cours')
                                                     : (language === 'EN' ? 'New · waiting' : 'Nouvelle · en attente');
                                                 const statusTone = r.status === 'approved' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                                                     : r.status === 'declined' ? 'border-rose-400/40 text-rose-200 bg-rose-500/10'
                                                     : r.status === 'in_progress' ? 'border-amber-400/40 text-amber-200 bg-amber-500/10'
                                                     : 'border-white/15 text-neutral-300 bg-white/5';
                                                 return (
                                                     <div key={r.id} className={`p-4 bg-black/40 border border-white/10 rounded`}>
                                                         <div className="flex flex-wrap items-center gap-2 mb-2">
                                                             <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 border border-white/15 text-neutral-300 bg-black/40 rounded">
                                                                 {typeLabel}
                                                             </span>
                                                             <span className={`text-[10px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 border rounded ${statusTone}`}>
                                                                 {statusLabel}
                                                             </span>
                                                             {r.createdAt?.seconds && (
                                                                 <span className="text-[10px] text-neutral-500 ml-auto font-mono">
                                                                     {new Date(r.createdAt.seconds * 1000).toLocaleDateString()}
                                                                 </span>
                                                             )}
                                                         </div>
                                                         <p className="text-sm text-neutral-300 font-lato leading-relaxed line-clamp-3">{r.idea}</p>
                                                         {r.adminResponse && (
                                                             <div className="mt-3 pt-3 border-t border-white/10">
                                                                 <p className="text-[10px] uppercase tracking-[0.3em] text-[#c5a059] mb-1.5 font-cinzel">
                                                                     {language === 'EN' ? "Reply from the Salon" : 'Réponse du Salon'}
                                                                 </p>
                                                                 <p className="text-sm text-white font-lato italic leading-relaxed">"{r.adminResponse}"</p>
                                                             </div>
                                                         )}
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     </div>
                                 )}

                                 {/* Inbound puzzle gifts — pending offers from other
                                     members. Accepting adds the puzzle to the display
                                     case; declining returns it to the sender. */}
                                 {puzzleGiftsInbox.length > 0 && (
                                     <div className={`bg-gradient-to-br from-fuchsia-500/10 via-cyan-500/5 to-transparent p-5 border ${currentStyles.border} rounded-xl mb-6`}>
                                         <div className="flex items-baseline justify-between mb-3">
                                             <h3 className="font-cinzel text-white text-base flex items-center gap-2">
                                                 <span className="inline-block w-2 h-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.8)] hot-seat-pulse" />
                                                 {language === 'EN' ? 'Puzzle gifts waiting' : 'Cadeaux en attente'}
                                             </h3>
                                             <span className="text-[9px] font-mono uppercase tracking-[0.3em] text-fuchsia-200/80">
                                                 {puzzleGiftsInbox.length} {language === 'EN' ? 'pending' : 'en attente'}
                                             </span>
                                         </div>
                                         <div className="space-y-2">
                                             {puzzleGiftsInbox.map(g => {
                                                 const art = PUZZLE_ARTWORKS.find(a => a.id === g.puzzleId);
                                                 return (
                                                     <div key={g.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/10 rounded">
                                                         <div className="shrink-0 w-14 h-14 rounded overflow-hidden border border-white/15">
                                                             {art ? (
                                                                 <img src={art.src} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                             ) : (
                                                                 <div className="w-full h-full bg-gradient-to-br from-fuchsia-700 to-cyan-700" />
                                                             )}
                                                         </div>
                                                         <div className="flex-1 min-w-0">
                                                             <p className="text-sm font-cinzel text-white truncate">
                                                                 {art ? (language === 'FR' ? art.titleFr : art.titleEn) : g.puzzleId}
                                                             </p>
                                                             <p className="text-[10px] uppercase tracking-widest text-neutral-400 truncate">
                                                                 {language === 'EN' ? 'from' : 'de la part de'} <span className="text-white">{g.fromName}</span>
                                                             </p>
                                                         </div>
                                                         <div className="flex gap-2">
                                                             <button
                                                                 onClick={() => acceptPuzzleGift(g)}
                                                                 className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-emerald-400/40 text-emerald-200 hover:bg-emerald-400/10 rounded"
                                                             >
                                                                 {language === 'EN' ? 'Accept' : 'Accepter'}
                                                             </button>
                                                             <button
                                                                 onClick={() => declinePuzzleGift(g)}
                                                                 className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-rose-400/40 text-rose-200 hover:bg-rose-400/10 rounded"
                                                             >
                                                                 {language === 'EN' ? 'Decline' : 'Refuser'}
                                                             </button>
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                     </div>
                                 )}

                                 {/* Coins + active puzzle. Lifetime coins drive the
                                     puzzle progression (8 pieces pre-revealed, 8 earned
                                     per puzzle). Spendable balance funds skins/perks
                                     elsewhere. Puzzles already finished sit in the
                                     display case below. */}
                                 {(() => {
                                     const visible = visiblePieceCount(lifetimeCoins, puzzlesCompleted);
                                     const activeArtwork = pickPuzzleArtwork(currentPuzzleId, puzzlesCompleted);
                                     const coinsTowardNextPiece = lifetimeCoins % COINS_PER_PIECE;
                                     const coinsUntilNextPiece = COINS_PER_PIECE - coinsTowardNextPiece;
                                     const isAdminUser = currentUser?.email === 'houseoftherisingarts@gmail.com'
                                                      || currentUser?.email === 'alex@lesalondesinconnus.com';
                                     return (
                                         <div className={`bg-[#0a0a0a] p-6 border ${currentStyles.border} rounded-xl mb-6`}>
                                             <div className="flex justify-between items-baseline mb-4">
                                                 <h3 className="font-cinzel text-white text-lg">{language === 'EN' ? 'Coins & Puzzle' : 'Pièces & Casse-tête'}</h3>
                                                 <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">
                                                     {language === 'EN' ? 'Earn through activity' : "Gagne par l'activité"}
                                                 </span>
                                             </div>

                                             <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
                                                 {/* Live puzzle */}
                                                 <div className="flex flex-col items-center gap-3">
                                                     <div ref={puzzleSlotRef} style={{ width: 300, height: 300 }}>
                                                         <JigsawPuzzle
                                                             artwork={activeArtwork}
                                                             revealed={visible}
                                                             size={300}
                                                             language={language}
                                                         />
                                                     </div>
                                                     <p className="font-cinzel text-[10px] uppercase tracking-[0.3em] text-neutral-400 text-center">
                                                         {language === 'EN' ? activeArtwork.titleEn : activeArtwork.titleFr}
                                                     </p>
                                                 </div>

                                                 {/* Stats panel */}
                                                 <div className="flex flex-col gap-4">
                                                     <div className="grid grid-cols-2 gap-3">
                                                         <div className={`border ${currentStyles.border} bg-black/40 p-4`}>
                                                             <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 mb-1">{language === 'EN' ? 'Spendable' : 'Solde'}</p>
                                                             <p className={`font-serif font-bold italic text-3xl ${currentStyles.highlight}`}>{coins}</p>
                                                             <p className="text-[10px] text-neutral-500 mt-1">{language === 'EN' ? 'coins' : 'pièces'}</p>
                                                         </div>
                                                         <div className={`border ${currentStyles.border} bg-black/40 p-4`}>
                                                             <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 mb-1">{language === 'EN' ? 'Lifetime' : 'À vie'}</p>
                                                             <p className="font-serif font-bold italic text-3xl text-white">{lifetimeCoins}</p>
                                                             <p className="text-[10px] text-neutral-500 mt-1">{language === 'EN' ? 'progress earned' : 'progression cumulée'}</p>
                                                         </div>
                                                     </div>

                                                     {/* Piece progress bar */}
                                                     <div>
                                                         <div className="flex justify-between text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                                                             <span>{language === 'EN' ? 'Pieces revealed' : 'Pièces révélées'}</span>
                                                             <span className="text-neutral-300">{visible} / {PUZZLE_PIECES_TOTAL}</span>
                                                         </div>
                                                         <div className="w-full h-2 bg-black/60 border border-white/10 rounded-full overflow-hidden">
                                                             <div
                                                                 className="h-full bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-yellow-300 transition-[width] duration-700 ease-out"
                                                                 style={{ width: `${(visible / PUZZLE_PIECES_TOTAL) * 100}%` }}
                                                             />
                                                         </div>
                                                         {visible < PUZZLE_PIECES_TOTAL && (
                                                             <p className="text-[10px] text-neutral-500 mt-2">
                                                                 {language === 'EN'
                                                                     ? `${coinsUntilNextPiece} more coin${coinsUntilNextPiece === 1 ? '' : 's'} to reveal the next piece.`
                                                                     : `${coinsUntilNextPiece} pièce${coinsUntilNextPiece === 1 ? '' : 's'} de plus pour révéler la prochaine.`}
                                                             </p>
                                                         )}
                                                         {visible >= PUZZLE_PIECES_TOTAL && (
                                                             <p className="text-[10px] text-emerald-300 mt-2 font-cinzel uppercase tracking-widest">
                                                                 ✓ {language === 'EN' ? 'Puzzle complete — earn 1 more coin to claim it.' : 'Casse-tête complet — gagne 1 pièce de plus pour le réclamer.'}
                                                             </p>
                                                         )}
                                                     </div>

                                                     {/* Rules summary */}
                                                     <p className="text-[10px] text-neutral-500 leading-relaxed">
                                                         {language === 'EN'
                                                             ? `Every ${COINS_PER_PIECE} coins of activity reveals 1 piece. Each puzzle starts ${PUZZLE_PIECES_PRE_REVEALED}/${PUZZLE_PIECES_TOTAL} done — you earn the other ${PUZZLE_PIECES_TO_EARN}. Completing a puzzle adds it to your display case and grants a +${COINS_PER_COMPLETION_BONUS}-coin bonus to your spendable balance.`
                                                             : `Toutes les ${COINS_PER_PIECE} pièces gagnées révèlent 1 morceau. Chaque casse-tête démarre à ${PUZZLE_PIECES_PRE_REVEALED}/${PUZZLE_PIECES_TOTAL} — tu gagnes les ${PUZZLE_PIECES_TO_EARN} autres. Le compléter l'ajoute à ta vitrine et ajoute +${COINS_PER_COMPLETION_BONUS} pièces à ton solde.`}
                                                     </p>

                                                     {/* Admin-only test grant */}
                                                     {isAdminUser && (
                                                         <div className="flex gap-2 pt-2 border-t border-white/10 mt-2">
                                                             <button
                                                                 onClick={() => awardCoins(10)}
                                                                 className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 rounded"
                                                             >
                                                                 +10 ({language === 'EN' ? 'admin test' : 'test admin'})
                                                             </button>
                                                             <button
                                                                 onClick={() => awardCoins(80)}
                                                                 className="px-3 py-1.5 text-[10px] font-cinzel uppercase tracking-widest border border-amber-400/40 text-amber-200 hover:bg-amber-400/10 rounded"
                                                             >
                                                                 +80 ({language === 'EN' ? 'finish puzzle' : 'finir le casse-tête'})
                                                             </button>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>

                                             {/* Display case — completed puzzles. Each card
                                                 shows the full artwork and its title. */}
                                             {displayCase.length > 0 && (
                                                 <div className="mt-6 pt-6 border-t border-white/10">
                                                     <div className="flex justify-between items-baseline mb-3">
                                                         <h4 className="font-cinzel text-white text-sm uppercase tracking-widest">
                                                             {language === 'EN' ? 'Display Case' : 'Vitrine'}
                                                         </h4>
                                                         <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">
                                                             {displayCase.length} {language === 'EN' ? 'completed' : 'complétés'}
                                                         </span>
                                                     </div>
                                                     <div className="flex gap-3 overflow-x-auto pb-2">
                                                         {displayCase.map((id, i) => {
                                                             const art = PUZZLE_ARTWORKS.find(a => a.id === id);
                                                             if (!art) return null;
                                                             // While the celebration overlay is mid-flight toward
                                                             // this slot, keep the slot mounted (for rect lookup)
                                                             // but hide its contents so the user only sees the
                                                             // single flying artwork.
                                                             const hiddenForCeleb = puzzleCelebration?.targetIndex === i;
                                                             return (
                                                                 <button
                                                                     type="button"
                                                                     key={`${id}-${i}`}
                                                                     data-puzzle-slot={i}
                                                                     onClick={() => setViewingPuzzleIndex(i)}
                                                                     className="shrink-0 w-32 group text-left focus:outline-none"
                                                                     title={language === 'EN' ? 'Open in fullscreen' : 'Ouvrir en plein écran'}
                                                                 >
                                                                     <div className="aspect-square overflow-hidden rounded-md border border-white/15 group-hover:border-white/40 group-focus-visible:border-white/70 transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)] group-hover:scale-[1.02]">
                                                                         <img
                                                                             src={art.src}
                                                                             alt=""
                                                                             className="w-full h-full object-cover"
                                                                             loading="lazy"
                                                                             style={{ opacity: hiddenForCeleb ? 0 : 1 }}
                                                                         />
                                                                     </div>
                                                                     <p
                                                                         className="mt-1.5 text-[9px] font-cinzel uppercase tracking-widest text-neutral-400 group-hover:text-white text-center truncate"
                                                                         style={{ opacity: hiddenForCeleb ? 0 : 1 }}
                                                                     >
                                                                         {language === 'EN' ? art.titleEn : art.titleFr}
                                                                     </p>
                                                                 </button>
                                                             );
                                                         })}
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })()}

                                 {/* Wardrobe — base themes (always available) + purchased
                                     cosmetic skins. Selecting a base theme persists
                                     activeTheme on the user's profile so visiting
                                     members see it on the public profile. The cosmetic
                                     skin sits as an overlay on top; "Default" clears it. */}
                                 <div className={`bg-[#0a0a0a] p-6 border ${currentStyles.border} rounded-xl`}>
                                     <div className="flex justify-between items-baseline mb-4">
                                         <h3 className="font-cinzel text-white text-lg">{language === 'EN' ? 'Wardrobe' : 'Garde-robe'}</h3>
                                         <span className="text-[9px] uppercase tracking-[0.3em] text-neutral-500">
                                             {language === 'EN' ? 'Visible on your public profile' : 'Visible sur votre profil public'}
                                         </span>
                                     </div>

                                     <p className="text-[10px] uppercase tracking-widest text-[#c5a059] mb-3">{language === 'EN' ? 'Base themes' : 'Thèmes de base'}</p>
                                     <div className="flex gap-4 overflow-x-auto pb-3 mb-4">
                                         {BASE_THEMES.map(({ key, name, swatch }) => {
                                             const isActive = theme === key;
                                             return (
                                                 <div key={key} className="flex flex-col items-center gap-2 min-w-[84px]">
                                                     <button
                                                        onClick={() => onThemeChange?.(key)}
                                                        title={language === 'EN' ? name.en : name.fr}
                                                        className={`w-16 h-16 rounded-full border-2 transition-all ${isActive ? 'border-[#c5a059] shadow-[0_0_18px_rgba(197,160,89,0.45)]' : 'border-white/10 hover:border-white/30'}`}
                                                        style={{ backgroundImage: swatch, backgroundSize: 'cover' }}
                                                     />
                                                     <span className={`text-[10px] uppercase font-bold text-center ${isActive ? 'text-[#c5a059]' : 'text-neutral-500'}`}>
                                                         {language === 'EN' ? name.en : name.fr}
                                                     </span>
                                                 </div>
                                             );
                                         })}
                                     </div>

                                     <div className="flex justify-between items-baseline mb-3">
                                         <p className="text-[10px] uppercase tracking-widest text-[#c5a059]">{language === 'EN' ? 'Cosmetic skins' : 'Habillages cosmétiques'}</p>
                                         <button
                                            onClick={() => { setActiveTab('STORE'); setHasNavigated(true); }}
                                            className="text-[10px] uppercase tracking-widest text-cyan-300 hover:text-white border-b border-cyan-400/30 hover:border-cyan-300 transition-colors"
                                         >
                                             {language === 'EN' ? 'Visit the Store →' : 'Voir le magasin →'}
                                         </button>
                                     </div>
                                     <div className="flex gap-4 overflow-x-auto pb-2">
                                         {/* Default — clears any cosmetic overlay back to the base theme. */}
                                         <div className="flex flex-col items-center gap-2 min-w-[84px]">
                                             <button
                                                onClick={() => selectActiveSkin(null)}
                                                className={`w-16 h-16 rounded-full border-2 flex items-center justify-center bg-black/50 transition-all ${activeSkinId === null ? 'border-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                                             >
                                                 <Icons.Visual />
                                             </button>
                                             <span className={`text-[10px] uppercase font-bold ${activeSkinId === null ? 'text-[#c5a059]' : 'text-neutral-500'}`}>{language === 'EN' ? 'None' : 'Aucun'}</span>
                                         </div>

                                         {purchasedSkins.length === 0 && (
                                             <button
                                                onClick={() => { setActiveTab('STORE'); setHasNavigated(true); }}
                                                className="flex items-center min-w-[280px] text-xs text-neutral-500 hover:text-cyan-300 italic text-left transition-colors"
                                             >
                                                 {language === 'EN' ? 'Buy cosmetics from the Store to layer over your base theme. ' : 'Acheter des cosmétiques au magasin pour superposer. '}
                                                 <span className="ml-1 not-italic uppercase tracking-widest text-cyan-300 underline">
                                                     {language === 'EN' ? 'Store →' : 'Magasin →'}
                                                 </span>
                                             </button>
                                         )}

                                         {purchasedSkins.map(skinId => {
                                             const skin = SKINS.find(s => s.id === skinId);
                                             if (!skin) return null;
                                             const isActive = activeSkinId === skinId;
                                             return (
                                                 <div key={skin.id} className="flex flex-col items-center gap-2 min-w-[84px]">
                                                     <button
                                                        onClick={() => selectActiveSkin(skin.id)}
                                                        className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all ${isActive ? 'border-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.3)]' : 'border-white/10 hover:border-white/30'}`}
                                                        style={{ backgroundColor: skin.colorSwatch }}
                                                     />
                                                     <span className={`text-[10px] uppercase font-bold text-center ${isActive ? 'text-[#c5a059]' : 'text-neutral-500'}`}>
                                                         {skin.name}
                                                     </span>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>

                                 {/* Content Layout: Portfolio & WRITINGS */}
                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                     
                                     {/* Portfolio Grid — sources from galleryUrls. Each tile shows a
                                         delete affordance on hover; the trailing tile is always the
                                         "add" button so the grid stays at >=6 cells. */}
                                     <div className={`bg-black/20 border ${currentStyles.border} p-6 rounded-xl`}>
                                         <div className="flex justify-between items-center mb-4">
                                             <h3 className="font-cinzel text-white text-lg">{language === 'EN' ? 'Portfolio' : 'Portfolio'}</h3>
                                             <button
                                                onClick={handleUploadClick}
                                                disabled={avatarUploading}
                                                className="text-[10px] uppercase text-cyan-400 border border-cyan-500/30 px-2 py-1 hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-wait"
                                             >
                                                 {avatarUploading ? (language === 'EN' ? 'Uploading…' : 'Téléversement…') : (language === 'EN' ? '+ Add Project' : '+ Ajouter')}
                                             </button>
                                         </div>
                                         <div className="grid grid-cols-3 gap-2">
                                             {galleryUrls.map((url, i) => (
                                                 <div
                                                    key={url}
                                                    onClick={() => setCurrentArtIndex(i)}
                                                    className="aspect-square bg-white/5 border border-white/5 hover:border-white/20 transition-all cursor-pointer group relative overflow-hidden"
                                                 >
                                                     <img src={url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" alt={`Portfolio ${i + 1}`} loading="lazy" />
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteGalleryImage(url); }}
                                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-rose-300 hover:bg-rose-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all text-xs flex items-center justify-center"
                                                        title={language === 'EN' ? 'Delete' : 'Supprimer'}
                                                     >
                                                         ×
                                                     </button>
                                                     {currentArtIndex === i && (
                                                         <div className="absolute inset-0 ring-2 ring-fuchsia-400 pointer-events-none" />
                                                     )}
                                                 </div>
                                             ))}
                                             <button
                                                onClick={handleUploadClick}
                                                disabled={avatarUploading}
                                                className="aspect-square bg-white/5 border border-dashed border-white/10 hover:border-cyan-400/40 hover:bg-cyan-500/5 transition-all flex items-center justify-center group disabled:opacity-40 disabled:cursor-wait"
                                                title={language === 'EN' ? 'Add image' : 'Ajouter'}
                                             >
                                                 <span className="text-3xl text-neutral-700 group-hover:text-cyan-300">+</span>
                                             </button>
                                             {/* Pad to a minimum of 2 rows for visual balance. */}
                                             {Array.from({ length: Math.max(0, 5 - galleryUrls.length) }).map((_, i) => (
                                                 <div key={`pad-${i}`} className="aspect-square bg-white/[0.02] border border-white/5" aria-hidden />
                                             ))}
                                         </div>
                                     </div>

                                     {/* Writings Section */}
                                     <div className={`bg-black/20 border ${currentStyles.border} p-6 rounded-xl flex flex-col`}>
                                         <div className="flex justify-between items-center mb-4">
                                             <h3 className="font-cinzel text-white text-lg">{language === 'EN' ? 'Writings' : 'Écrits'}</h3>
                                             <button
                                                onClick={() => openArticleEditor()}
                                                className="text-[10px] uppercase border border-fuchsia-500/30 text-fuchsia-400 px-2 py-1 hover:bg-fuchsia-500/10 transition-all"
                                             >
                                                 {language === 'EN' ? '+ Write Article' : '+ Nouvel article'}
                                             </button>
                                         </div>
                                         <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] custom-scrollbar pr-2">
                                             {ownArticles.length > 0 ? ownArticles.map(article => {
                                                 const status = article.publishStatus ?? 'draft';
                                                 const statusMeta = {
                                                     draft:     { label: language === 'EN' ? 'Draft'             : 'Brouillon',         cls: 'border-neutral-600/40 text-neutral-400' },
                                                     requested: { label: language === 'EN' ? 'Awaiting review'   : 'En attente',        cls: 'border-amber-500/40 text-amber-300' },
                                                     public:    { label: language === 'EN' ? 'Public'            : 'Public',            cls: 'border-emerald-500/40 text-emerald-300' },
                                                     declined:  { label: language === 'EN' ? 'Declined'          : 'Refusé',            cls: 'border-rose-500/40 text-rose-300' },
                                                 }[status];
                                                 return (
                                                     <div key={article.id} className="p-3 bg-white/5 border border-white/5 hover:border-white/20 transition-colors group/article">
                                                         <div className="flex items-start gap-3">
                                                             {article.coverUrl && (
                                                                 <img src={article.coverUrl} alt="" className="w-14 h-14 object-cover rounded shrink-0 border border-white/10" />
                                                             )}
                                                             <div className="flex-1 min-w-0">
                                                                 <button onClick={() => openArticleEditor(article)} className="block text-left w-full">
                                                                     <h4 className="text-white text-sm font-bold mb-0.5 truncate">{article.title || (language === 'EN' ? 'Untitled' : 'Sans titre')}</h4>
                                                                     <p className="text-neutral-500 text-xs leading-snug line-clamp-2">{article.summary || (language === 'EN' ? '—' : '—')}</p>
                                                                 </button>
                                                                 <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                                     <span className={`text-[9px] uppercase tracking-widest border px-1.5 py-0.5 ${statusMeta.cls}`}>{statusMeta.label}</span>
                                                                     <span className="text-[9px] text-neutral-600 uppercase tracking-widest">{article.date}</span>
                                                                     {(status === 'draft' || status === 'declined') && (
                                                                         <button
                                                                            onClick={() => handleRequestPublish(article)}
                                                                            className="ml-auto text-[9px] uppercase tracking-widest text-cyan-300 hover:text-white border border-cyan-500/30 px-1.5 py-0.5 hover:bg-cyan-500/10"
                                                                         >
                                                                             {language === 'EN' ? 'Request public' : 'Demander la publication'}
                                                                         </button>
                                                                     )}
                                                                     <button
                                                                        onClick={() => handleDeleteArticle(article)}
                                                                        className="text-[9px] uppercase tracking-widest text-rose-400 hover:text-rose-200 opacity-0 group-hover/article:opacity-100 transition-opacity"
                                                                     >
                                                                         {language === 'EN' ? 'Delete' : 'Suppr.'}
                                                                     </button>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 );
                                             }) : (
                                                 <div className="flex items-center justify-center h-full text-neutral-600 text-xs italic min-h-[120px]">
                                                     {language === 'EN' ? 'No writings yet — start your first article.' : 'Aucun écrit pour l’instant — commencer votre premier article.'}
                                                 </div>
                                             )}
                                         </div>
                                     </div>

                                 </div>

                                 {/* Decorative Stamps - Updated Text */}
                                 <div className="absolute top-0 right-0 w-24 h-24 border-4 border-red-500/30 rounded-full flex items-center justify-center rotate-[-15deg] pointer-events-none mix-blend-screen">
                                     <span className="text-red-500/30 font-black text-xs uppercase tracking-widest text-center transform -rotate-12">ARTISTIC<br/>ARCHIVES</span>
                                 </div>
                             </div>
                        </div>

                        {/* Inbox + Friends — full-width panels beneath the dossier.
                            Inbox lists conversations sourced live from Firestore;
                            clicking one expands an inline thread with a composer.
                            Friends panel shows accepted + pending requests with
                            an Accept action for incoming pendings. */}
                        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 p-4 ${accessLevel === 'GUEST' ? 'blur-sm opacity-30 pointer-events-none' : ''}`}>
                            {/* INBOX */}
                            <div className={`bg-black/20 border ${currentStyles.border} p-6 rounded-xl flex flex-col`}>
                                <div className={`flex justify-between items-center mb-4 border-b ${currentStyles.border} pb-2`}>
                                    <h3 className="font-cinzel text-white text-lg">{language === 'EN' ? 'Inbox' : 'Boîte de réception'}</h3>
                                    <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                                        {conversations.length} {language === 'EN' ? 'thread' + (conversations.length === 1 ? '' : 's') : 'fil' + (conversations.length === 1 ? '' : 's')}
                                    </span>
                                </div>

                                {conversations.length === 0 ? (
                                    <div className="text-center text-neutral-600 text-xs italic py-12">
                                        {language === 'EN' ? 'No messages yet. Start a conversation from another artist’s profile.' : 'Aucun message. Démarrer une conversation depuis le profil d’un·e autre artiste.'}
                                    </div>
                                ) : !activeConvId ? (
                                    <div className="space-y-1 max-h-[280px] overflow-y-auto custom-scrollbar pr-1">
                                        {conversations.map((c) => {
                                            const otherUid = c.members.find(u => u !== currentUser?.uid) ?? '';
                                            const other = c.memberProfiles?.[otherUid];
                                            const title = c.type === 'group' ? (c.title ?? 'Group') : (other?.displayName ?? 'Member');
                                            return (
                                                <button
                                                    key={c.id}
                                                    onClick={() => setActiveConvId(c.id)}
                                                    className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded text-left transition-colors group"
                                                >
                                                    <div className="w-9 h-9 rounded-full bg-[#c5a059]/20 border border-[#c5a059]/30 flex items-center justify-center overflow-hidden shrink-0">
                                                        {other?.photoURL ? (
                                                            <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[#c5a059] font-cinzel text-xs font-bold">{title.slice(0, 2).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white text-sm font-cinzel uppercase tracking-wider truncate">{title}</p>
                                                        <p className="text-neutral-500 text-xs truncate">{c.lastMessage ?? '—'}</p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex flex-col flex-1 min-h-[280px]">
                                        <button
                                            onClick={() => setActiveConvId(null)}
                                            className="text-[10px] uppercase tracking-widest text-cyan-400 hover:text-white mb-3 self-start"
                                        >
                                            ← {language === 'EN' ? 'Back to inbox' : 'Retour'}
                                        </button>
                                        <div className="flex-1 max-h-[260px] overflow-y-auto custom-scrollbar pr-1 space-y-2 mb-3">
                                            {convMessages.length === 0 ? (
                                                <p className="text-xs text-neutral-600 italic text-center py-6">
                                                    {language === 'EN' ? 'No messages yet — say hello.' : 'Aucun message — dites bonjour.'}
                                                </p>
                                            ) : convMessages.map(m => {
                                                const mine = m.uid === currentUser?.uid;
                                                return (
                                                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${mine ? 'bg-fuchsia-500/20 border border-fuchsia-500/30 text-white' : 'bg-white/5 border border-white/10 text-neutral-200'}`}>
                                                            {!mine && <p className="text-[9px] uppercase tracking-widest text-neutral-500 mb-0.5">{m.displayName}</p>}
                                                            <p className="font-lato leading-snug whitespace-pre-wrap">{m.text}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={messageDraft}
                                                onChange={(e) => setMessageDraft(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                                                placeholder={language === 'EN' ? 'Write a message…' : 'Écrire un message…'}
                                                className="flex-1 bg-black/40 border border-white/15 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-fuchsia-400/40 rounded"
                                            />
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={sendingMessage || !messageDraft.trim()}
                                                className="px-4 py-2 border border-fuchsia-500/40 bg-fuchsia-500/10 text-white text-[10px] uppercase tracking-widest hover:bg-fuchsia-500/20 disabled:opacity-40 disabled:cursor-not-allowed rounded"
                                            >
                                                {sendingMessage ? '…' : (language === 'EN' ? 'Send' : 'Envoyer')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* FRIENDS */}
                            <div className={`bg-black/20 border ${currentStyles.border} p-6 rounded-xl`}>
                                <div className={`flex justify-between items-center mb-4 border-b ${currentStyles.border} pb-2`}>
                                    <h3 className="font-cinzel text-white text-lg">{language === 'EN' ? 'Friends' : 'Amis'}</h3>
                                    <span className="text-[10px] uppercase tracking-widest text-neutral-500">
                                        {friendships.filter(f => f.status === 'accepted').length} {language === 'EN' ? 'connected' : 'connecté·e·s'}
                                    </span>
                                </div>

                                {/* Pending incoming requests */}
                                {(() => {
                                    const incoming = friendships.filter(f => f.status === 'pending' && f.requestedBy !== currentUser?.uid);
                                    if (incoming.length === 0) return null;
                                    return (
                                        <div className="mb-4">
                                            <p className="text-[10px] uppercase tracking-widest text-cyan-400 mb-2">
                                                {language === 'EN' ? 'Incoming requests' : 'Demandes reçues'}
                                            </p>
                                            <div className="space-y-2">
                                                {incoming.map(f => {
                                                    const other = f.profiles?.[f.requestedBy];
                                                    const name = other?.displayName ?? 'Member';
                                                    return (
                                                        <div key={f.id} className="flex items-center gap-3 p-2 bg-cyan-500/5 border border-cyan-500/20 rounded">
                                                            <div className="w-9 h-9 rounded-full bg-[#c5a059]/20 border border-[#c5a059]/30 flex items-center justify-center overflow-hidden shrink-0">
                                                                {other?.photoURL ? (
                                                                    <img src={other.photoURL} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-[#c5a059] font-cinzel text-xs font-bold">{name.slice(0, 2).toUpperCase()}</span>
                                                                )}
                                                            </div>
                                                            <p className="flex-1 text-white text-sm font-cinzel uppercase tracking-wider truncate">{name}</p>
                                                            <button
                                                                onClick={() => handleAcceptFriend(f.id)}
                                                                className="px-3 py-1 border border-emerald-400/40 bg-emerald-500/10 text-emerald-300 text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 rounded"
                                                            >
                                                                {language === 'EN' ? 'Accept' : 'Accepter'}
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Accepted friends grid */}
                                {(() => {
                                    const accepted = friendships.filter(f => f.status === 'accepted');
                                    if (accepted.length === 0) {
                                        return (
                                            <div className="text-center text-neutral-600 text-xs italic py-8">
                                                {language === 'EN' ? 'No friends yet. Visit the Roster and add someone.' : 'Aucun·e ami·e. Visiter le Répertoire pour en ajouter.'}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {accepted.map(f => {
                                                const otherUid = f.uids.find(u => u !== currentUser?.uid) ?? '';
                                                const other = f.profiles?.[otherUid];
                                                const name = other?.displayName ?? 'Member';
                                                return (
                                                    <div key={f.id} className="flex flex-col items-center gap-2 group">
                                                        <div className="w-14 h-14 rounded-full bg-[#c5a059]/15 border-2 border-[#c5a059]/30 group-hover:border-[#c5a059]/60 flex items-center justify-center overflow-hidden transition-colors">
                                                            {other?.photoURL ? (
                                                                <img src={other.photoURL} alt={name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[#c5a059] font-cinzel text-sm font-bold">{name.slice(0, 2).toUpperCase()}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] uppercase font-bold text-neutral-400 group-hover:text-white text-center truncate w-full">{name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                                {/* Outgoing pending — small footer hint */}
                                {(() => {
                                    const outgoing = friendships.filter(f => f.status === 'pending' && f.requestedBy === currentUser?.uid);
                                    if (outgoing.length === 0) return null;
                                    return (
                                        <p className="mt-4 text-[10px] uppercase tracking-widest text-neutral-600 italic">
                                            {outgoing.length} {language === 'EN' ? `outgoing request${outgoing.length === 1 ? '' : 's'}` : `demande${outgoing.length === 1 ? '' : 's'} en attente`}
                                        </p>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* My videos — upload + manage. Sits below the bio/info
                            columns as its own full-width section so video cards
                            have room to breathe. Members only. */}
                        {accessLevel === 'MEMBER' && currentUser && (
                            <div className="mt-8 px-4">
                                <MyVideosPanel
                                    uid={currentUser.uid}
                                    language={language}
                                    accentBorder={currentStyles.border}
                                />
                            </div>
                        )}

                        {accessLevel === 'GUEST' && (
                             <div className="absolute inset-0 flex items-center justify-center z-10">
                                <div className={`bg-black/90 border ${currentStyles.border} p-10 text-center backdrop-blur-md max-w-md shadow-2xl relative overflow-hidden`}>
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-fuchsia-500"></div>
                                    <div className="w-20 h-20 mx-auto mb-6 border-2 border-white/20 rounded-full flex items-center justify-center text-4xl bg-black">
                                        <Icons.Lock />
                                    </div>
                                    <h3 className="text-white font-cinzel font-bold text-2xl uppercase mb-2">{language === 'EN' ? "Restricted Access" : "Accès Restreint"}</h3>
                                    <p className="text-neutral-400 text-sm mb-8 font-lato">{language === 'EN' ? "This dossier is classified. Register a profile to view subject details." : "Ce dossier est classifié. Enregistrez un profil pour voir les détails."}</p>
                                    <HexButton primary onClick={handleJoinClick} themeStyles={currentStyles}>{language === 'EN' ? "CREATE PROFILE" : "CRÉER UN PROFIL"}</HexButton>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ROSTER (ALL ARTISTS) - NEW TAB */}
                {activeTab === 'ROSTER' && (
                    <div className="relative animate-fadeIn max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className={`text-4xl mb-2 ${pageTitleClass}`}>{language === 'EN' ? "Active Roster" : "Répertoire Actif"}</h2>
                            <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">{language === 'EN' ? "Known Agents & Creators" : "Agents et Créateurs Connus"}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {ARTISTS_ROSTER.map((artist) => {
                                const claim = rosterClaims[String(artist.id)];
                                const isClaimedByMe = claim?.uid === currentUser?.uid;
                                const isUnclaimed = !claim;
                                return (
                                <div key={artist.id} className={`group bg-[#1a1a1a] border border-white/10 hover:${currentStyles.border} transition-all duration-300 overflow-hidden relative`}>
                                    {/* Image */}
                                    <div className="aspect-square overflow-hidden relative">
                                        <img
                                            src={artist.avatarUrl}
                                            alt={artist.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                                        <div className="absolute bottom-4 left-4">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-white`}>
                                                {artist.category}
                                            </span>
                                        </div>
                                        {/* Claim status — pinned top-right of the image. */}
                                        {claim && (
                                            <div className="absolute top-3 right-3">
                                                <span className={`text-[9px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 rounded backdrop-blur-md border ${isClaimedByMe ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100' : 'bg-black/50 border-white/20 text-white/80'}`}>
                                                    ✓ {isClaimedByMe
                                                        ? (language === 'EN' ? 'Yours' : 'Tien·ne')
                                                        : (language === 'EN' ? 'Claimed' : 'Réclamé')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-6 relative">
                                        <h3 className="font-cinzel text-lg text-white mb-1 leading-tight group-hover:text-cyan-400 transition-colors">{artist.name}</h3>
                                        <p className="text-xs text-neutral-500 font-mono uppercase mb-4">{artist.class}</p>

                                        {/* Skills Preview */}
                                        <div className="flex flex-wrap gap-1 mb-4">
                                            {artist.skills && artist.skills.slice(0, 3).map((skill, i) => (
                                                <span key={i} className="text-[9px] bg-white/5 px-1.5 py-0.5 text-neutral-400 border border-white/5 rounded">{skill}</span>
                                            ))}
                                        </div>

                                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                            <span className="text-[10px] text-neutral-400">{artist.location}</span>
                                            <button className="text-xs text-white hover:text-cyan-400 transition-colors">View Dossier →</button>
                                        </div>

                                        {/* Claim affordance — shown only when unclaimed AND signed in.
                                            Once any user claims this artist, the button vanishes for
                                            everyone forever (the rosterClaims doc is locked). */}
                                        {isUnclaimed && accessLevel === 'MEMBER' && (
                                            <button
                                                onClick={() => { setClaimingArtistId(artist.id); setClaimPassword(''); setClaimError(null); }}
                                                className="mt-4 w-full py-2.5 text-[10px] font-cinzel uppercase tracking-[0.25em] border border-fuchsia-400/40 bg-fuchsia-500/5 text-fuchsia-200 hover:bg-fuchsia-500/15 hover:border-fuchsia-300 rounded transition-colors"
                                            >
                                                ★ {language === 'EN' ? 'I am this artist · Claim profile' : 'Je suis cette personne · Réclamer le profil'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* COLLABORATE TAB (NEW) */}
                {activeTab === 'COLLABORATE' && (
                    <div className="relative animate-fadeIn max-w-7xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className={`text-4xl mb-2 ${pageTitleClass}`}>{language === 'EN' ? "Collaborate" : "Collaborer"}</h2>
                            <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">{language === 'EN' ? "Collaborate with Le Salon des Inconnus" : "Collaborer avec le Salon des Inconnus"}</p>
                        </div>

                        {/* Selection Cards */}
                        {!collabForm && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                {/* Residency */}
                                <div 
                                    onClick={() => setCollabForm('RESIDENCY')}
                                    className={`group cursor-pointer bg-[#1a1a1a] p-8 border hover:bg-white/5 transition-all flex flex-col items-center text-center ${currentStyles.border}`}
                                >
                                    <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 transition-colors text-neutral-400 group-hover:text-white`}>
                                        <Icons.Home />
                                    </div>
                                    <h3 className="font-cinzel text-xl text-white mb-2 group-hover:text-[#d4af37]">{language === 'EN' ? "Artist Residency" : "Résidence d'Artiste"}</h3>
                                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                                        Retreat to create. We offer space, silence, and support.
                                    </p>
                                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-white">Request Stay →</span>
                                </div>

                                {/* Event */}
                                <div 
                                    onClick={() => setCollabForm('EVENT')}
                                    className={`group cursor-pointer bg-[#1a1a1a] p-8 border hover:bg-white/5 transition-all flex flex-col items-center text-center ${currentStyles.border}`}
                                >
                                    <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 transition-colors text-neutral-400 group-hover:text-white`}>
                                        <Icons.Spark />
                                    </div>
                                    <h3 className="font-cinzel text-xl text-white mb-2 group-hover:text-[#d4af37]">{language === 'EN' ? "Propose Event" : "Proposer un Événement"}</h3>
                                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                                        Workshops, concerts, or gatherings. Bring your community.
                                    </p>
                                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-white">Submit Proposal →</span>
                                </div>

                                {/* Project */}
                                <div 
                                    onClick={() => setCollabForm('PROJECT')}
                                    className={`group cursor-pointer bg-[#1a1a1a] p-8 border hover:bg-white/5 transition-all flex flex-col items-center text-center ${currentStyles.border}`}
                                >
                                    <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 transition-colors text-neutral-400 group-hover:text-white`}>
                                        <Icons.Handshake />
                                    </div>
                                    <h3 className="font-cinzel text-xl text-white mb-2 group-hover:text-[#d4af37]">{language === 'EN' ? "Creative Collab" : "Collab Créative"}</h3>
                                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                                        Have a wild idea? Seeking a specific skill? Let's build together.
                                    </p>
                                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-white">Start Project →</span>
                                </div>

                                {/* Contribution Code Button */}
                                <div 
                                    onClick={handleContributeCode}
                                    className={`group cursor-pointer bg-[#1a1a1a] p-8 border hover:bg-white/5 transition-all flex flex-col items-center text-center ${currentStyles.border}`}
                                >
                                    <div className={`w-20 h-20 mb-6 rounded-full border-2 border-white/10 group-hover:${currentStyles.border} flex items-center justify-center bg-black/50 transition-colors text-neutral-400 group-hover:text-white`}>
                                        <Icons.Digital />
                                    </div>
                                    <h3 className="font-cinzel text-xl text-white mb-2 group-hover:text-[#d4af37]">{language === 'EN' ? "Contribute Code" : "Contribuer du Code"}</h3>
                                    <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                                        Help build this platform. PRs welcomed.
                                    </p>
                                    <span className="text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-white flex items-center gap-1">
                                        +15 {language === 'EN' ? 'coins' : 'pièces'} <Icons.Token />
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Collab forms — Residency / Event / Project share the
                            same skeleton with type-specific sections. Editorial
                            header per type so the form announces what it is. */}
                        {collabForm && (() => {
                            const titles = {
                                RESIDENCY: { en: 'Residency application', fr: 'Demande de résidence' },
                                EVENT:     { en: 'Event proposal',         fr: 'Proposition d\'événement' },
                                PROJECT:   { en: 'Collaboration idea',     fr: 'Idée de collaboration' },
                            } as const;
                            const leads = {
                                RESIDENCY: { en: 'Apply for a creative retreat at the Manor. Letter of intent + a tangible trace of your work earn you the official recognition.', fr: "Demande une retraite créative au Manoir. Une lettre d'intention + une trace tangible de ton travail t'accordent la reconnaissance officielle." },
                                EVENT:     { en: 'Pitch a show, workshop, or gathering you want to host at the Salon.', fr: "Propose un spectacle, atelier ou rassemblement que tu veux tenir au Salon." },
                                PROJECT:   { en: 'Got an idea that needs the Salon? Tell us what you bring and what you need.', fr: "Une idée qui appelle le Salon ? Dis ce que tu apportes et ce qu'il te faut." },
                            } as const;
                            const ideaLabels = {
                                RESIDENCY: { en: 'Project description & letter of intent', fr: "Description du projet & lettre d'intention" },
                                EVENT:     { en: 'Event concept & expected audience',      fr: 'Concept & public attendu' },
                                PROJECT:   { en: 'The idea & what you bring',              fr: "L'idée & ce que tu apportes" },
                            } as const;
                            return (
                            <div className={`max-w-3xl mx-auto relative animate-fadeIn shadow-2xl ${formStyles.container}`}>
                                <button
                                    onClick={() => setCollabForm(null)}
                                    aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                    className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 hover:bg-black flex items-center justify-center text-base"
                                >
                                    ✕
                                </button>

                                <div className="p-8 md:p-10">
                                    <FormEditorialHeader
                                        kicker={language === 'EN' ? 'COLLABORATE · APPLICATION' : 'COLLABORER · DEMANDE'}
                                        titleEn={titles[collabForm].en}
                                        titleFr={titles[collabForm].fr}
                                        leadEn={leads[collabForm].en}
                                        leadFr={leads[collabForm].fr}
                                    />

                                    <div className="space-y-8">
                                        {/* Residency-only protocol callout */}
                                        {collabForm === 'RESIDENCY' && (
                                            <div className={`p-5 rounded-lg border-l-4 border-[#d4af37] bg-[#d4af37]/5`}>
                                                <h4 className="font-cinzel text-[10px] font-bold text-[#d4af37] uppercase tracking-[0.3em] mb-3">
                                                    {language === 'EN' ? 'Official protocol' : 'Protocole officiel'}
                                                </h4>
                                                <ul className="space-y-3 text-sm text-neutral-300 font-lato leading-relaxed">
                                                    <li className="flex gap-3">
                                                        <span className="font-mono text-[#d4af37] tabular-nums">01</span>
                                                        <span><strong className="text-white">{language === 'EN' ? 'Letter of intent:' : "Lettre d'intention :"}</strong> {language === 'EN' ? 'a clear statement of what you intend to create or explore.' : "un énoncé clair de ce que tu comptes créer ou explorer."}</span>
                                                    </li>
                                                    <li className="flex gap-3">
                                                        <span className="font-mono text-[#d4af37] tabular-nums">02</span>
                                                        <span><strong className="text-white">{language === 'EN' ? 'Trace of work:' : 'Trace du travail :'}</strong> {language === 'EN' ? 'leave a tangible form (art, recording, performance, knowledge) at the Salon to receive recognition documents.' : "laisse une forme tangible (œuvre, enregistrement, performance, savoir) pour recevoir les documents de reconnaissance."}</span>
                                                    </li>
                                                </ul>
                                            </div>
                                        )}

                                        {/* 01 — IDENTITY */}
                                        <section>
                                            <FormSectionHeader n="01" en="Identity" fr="Identité"
                                                helpEn="How we reach you back."
                                                helpFr="Comment te recontacter." />
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={collabFormData.name}
                                                    onChange={(e) => setCollabFormData({...collabFormData, name: e.target.value})}
                                                    className={`w-full p-3 ${formStyles.input}`}
                                                    placeholder={language === 'EN' ? 'Your full name' : 'Ton nom complet'}
                                                    autoComplete="name"
                                                />
                                                <input
                                                    type="email"
                                                    value={collabFormData.email}
                                                    onChange={(e) => setCollabFormData({...collabFormData, email: e.target.value})}
                                                    className={`w-full p-3 ${formStyles.input}`}
                                                    placeholder="contact@email.com"
                                                    autoComplete="email"
                                                    inputMode="email"
                                                />
                                            </div>
                                        </section>

                                        {/* 02 — RESIDENCY-specific: tier + dates */}
                                        {collabForm === 'RESIDENCY' && (
                                            <section>
                                                <FormSectionHeader n="02" en="Stay & tier" fr="Séjour & palier"
                                                    helpEn="Tier helps us calibrate rates and grant eligibility."
                                                    helpFr="Le palier nous aide à calibrer les tarifs et l'éligibilité aux bourses." />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <select
                                                        value={collabFormData.revenueTier}
                                                        onChange={(e) => setCollabFormData({...collabFormData, revenueTier: e.target.value})}
                                                        className={`w-full p-3 ${formStyles.input}`}
                                                    >
                                                        <option value="emerging" className="bg-black text-white">{language === 'EN' ? 'Emerging (low income)' : 'Émergent·e (faible revenu)'}</option>
                                                        <option value="established" className="bg-black text-white">{language === 'EN' ? 'Established' : 'Établi·e'}</option>
                                                        <option value="master" className="bg-black text-white">{language === 'EN' ? 'Master / Institution' : 'Maître / Institution'}</option>
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder={language === 'EN' ? 'e.g. Summer 2025 · 2 weeks' : 'ex. Été 2025 · 2 semaines'}
                                                        value={collabFormData.dates}
                                                        onChange={(e) => setCollabFormData({...collabFormData, dates: e.target.value})}
                                                        className={`w-full p-3 ${formStyles.input}`}
                                                    />
                                                </div>

                                                {/* Bursary toggle — surfaces only when emerging */}
                                                {collabFormData.revenueTier === 'emerging' && (
                                                    <label className="mt-3 flex items-start gap-3 cursor-pointer p-4 rounded border-l-4 border-[#d4af37] bg-[#d4af37]/5 hover:bg-[#d4af37]/10 transition-colors">
                                                        <span className={`shrink-0 mt-0.5 w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${collabFormData.needsBursary ? 'bg-[#d4af37] border-[#d4af37]' : 'bg-transparent border-white/30'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={collabFormData.needsBursary}
                                                                onChange={(e) => setCollabFormData({...collabFormData, needsBursary: e.target.checked})}
                                                                className="sr-only"
                                                            />
                                                            {collabFormData.needsBursary && <span className="text-black font-bold text-xs leading-none">✓</span>}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="font-cinzel text-sm text-white">
                                                                {language === 'EN' ? 'Apply for in-house bursary' : 'Demander la bourse interne'}
                                                            </span>
                                                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                                                                {language === 'EN'
                                                                    ? 'Up to 50% of residency costs covered in exchange for community service or workshops.'
                                                                    : "Jusqu'à 50 % des frais de résidence en échange de service communautaire ou d'ateliers."}
                                                            </p>
                                                        </div>
                                                    </label>
                                                )}
                                            </section>
                                        )}

                                        {/* (NUMBERED) — DESCRIPTION */}
                                        <section>
                                            <FormSectionHeader
                                                n={collabForm === 'RESIDENCY' ? '03' : '02'}
                                                en={ideaLabels[collabForm].en}
                                                fr={ideaLabels[collabForm].fr}
                                                helpEn="Be specific. Vague pitches go in the slow pile."
                                                helpFr="Sois précis·e. Les pitchs flous vont dans la pile lente."
                                            />
                                            <textarea
                                                rows={7}
                                                value={collabFormData.idea}
                                                onChange={(e) => setCollabFormData({...collabFormData, idea: e.target.value})}
                                                className={`w-full p-3 ${formStyles.input}`}
                                                placeholder={language === 'EN' ? 'Tell us about your work, your intent, and what the Salon makes possible…' : "Parle-nous de ton travail, ton intention, et ce que le Salon rend possible…"}
                                            />
                                        </section>

                                        {/* SUBMIT */}
                                        <div className="pt-3">
                                            {!currentUser?.uid && (
                                                <p className="text-[11px] text-amber-300/80 mb-2 text-center">
                                                    {language === 'EN'
                                                        ? 'Sign in first — admin replies arrive on your profile.'
                                                        : "Connecte-toi d'abord — les réponses arrivent sur ton profil."}
                                                </p>
                                            )}
                                            <button
                                                onClick={handleCollabSubmit}
                                                disabled={collabSubmitting || !currentUser?.uid || !collabFormData.name || !collabFormData.email || !collabFormData.idea}
                                                title={
                                                    !currentUser?.uid
                                                        ? (language === 'EN' ? 'Sign in to submit' : 'Connecte-toi pour envoyer')
                                                        : !collabFormData.name
                                                            ? (language === 'EN' ? 'Add your name' : 'Ajoute ton nom')
                                                            : !collabFormData.email
                                                                ? (language === 'EN' ? 'Add an email' : 'Ajoute un courriel')
                                                                : !collabFormData.idea
                                                                    ? (language === 'EN' ? 'Describe the work' : "Décris le travail")
                                                                    : ''
                                                }
                                                className={`group w-full flex items-center justify-center gap-3 py-4 text-base rounded transition-all ${(currentUser?.uid && collabFormData.name && collabFormData.email && collabFormData.idea) ? formStyles.submitOn : formStyles.submitOff}`}
                                            >
                                                <span>
                                                    {collabSubmitting
                                                        ? (language === 'EN' ? 'Sending…' : 'Envoi…')
                                                        : (language === 'EN' ? 'Submit application' : 'Envoyer la demande')}
                                                </span>
                                                <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            );
                        })()}
                    </div>
                )}

                {/* HOT SEAT (RANKED) */}
                {activeTab === 'HOT_SEAT' && (
                    <div className="relative w-full max-w-7xl mx-auto min-h-[70vh]">
                        {accessLevel === 'GUEST' ? (
                            <div className="flex flex-col items-center justify-center py-20 relative">
                                <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="border border-red-500 bg-black/90 p-6 text-center shadow-[0_0_30px_rgba(220,20,20,0.3)]">
                                        <h3 className="text-red-500 font-cinzel font-bold text-xl uppercase mb-2">Arena Locked</h3>
                                        <p className="text-neutral-400 text-xs mb-4">Level 30 required (Join Roster)</p>
                                        <HexButton onClick={handleJoinClick} themeStyles={currentStyles}>Unlock</HexButton>
                                    </div>
                                </div>
                                <div className="blur-sm opacity-40 text-center">
                                    <div className={`w-40 h-40 mx-auto mb-8 bg-gradient-to-b from-red-900/40 to-black rounded-full flex items-center justify-center border-4 ${currentStyles.border} shadow-[0_0_50px_rgba(220,50,50,0.4)]`}>
                                        <span className="text-6xl text-white font-cinzel font-bold">VS</span>
                                    </div>
                                    <h2 className={`text-4xl font-bold uppercase mb-4 ${pageTitleClass}`}>The Hot Seat</h2>
                                </div>
                            </div>
                        ) : (
                            // MEMBER VIEW
                            <div className="animate-fadeIn">
                                {/* Navigation */}
                                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
                                    <div>
                                        <h2 className={`text-4xl mb-1 ${pageTitleClass}`}>The Hot Seat</h2>
                                        <p className="text-neutral-500 text-xs uppercase tracking-widest">Peer Review Arena. <span className="text-red-500">Honest but Kind.</span></p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => setHotSeatView('LIST')}
                                            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors ${hotSeatView === 'LIST' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            View Queue
                                        </button>
                                        <button 
                                            onClick={() => setHotSeatView('SUBMIT')}
                                            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 transition-colors ${hotSeatView === 'SUBMIT' ? 'text-white border-b-2 border-white' : 'text-neutral-500 hover:text-white'}`}
                                        >
                                            Submit Work
                                        </button>
                                    </div>
                                </div>

                                {/* LIST VIEW */}
                                {hotSeatView === 'LIST' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {hotSeatSubmissions.map(work => (
                                            <div 
                                                key={work.id}
                                                onClick={() => { setSelectedHotSeatWork(work); setHotSeatView('CRITIQUE'); }}
                                                className="group cursor-pointer bg-[#141414] border border-white/10 hover:border-red-500/50 transition-all duration-300 rounded-xl overflow-hidden relative"
                                            >
                                                {/* Image */}
                                                <div className="h-48 overflow-hidden relative">
                                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                                                    <img src={work.imageUrl || "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?q=80&w=1000&auto=format&fit=crop"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Work" />
                                                    <span className="absolute top-2 left-2 z-20 bg-black/60 text-white text-[10px] font-bold uppercase px-2 py-1 rounded backdrop-blur-md">
                                                        {work.type}
                                                    </span>
                                                </div>
                                                
                                                {/* Info */}
                                                <div className="p-6">
                                                    <h3 className="font-cinzel text-lg text-white mb-1 group-hover:text-red-400 transition-colors">{work.title}</h3>
                                                    <p className="text-xs text-neutral-500 uppercase tracking-wider mb-4">by {work.artist}</p>
                                                    <p className="text-sm text-neutral-400 line-clamp-2 mb-4 font-lato">{work.description}</p>
                                                    
                                                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                                        <span className="text-xs text-neutral-500">{work.feedback.length} Critiques</span>
                                                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Review →</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* SUBMIT VIEW */}
                                {hotSeatView === 'SUBMIT' && (() => {
                                    const canSubmit = !!newSubmission.title && newSubmission.feedbackSought.length > 0;
                                    const disc = HOT_SEAT_DISCIPLINES.find(d => d.key === newSubmission.type);
                                    const stageIdx = Math.max(0, HOT_SEAT_STAGES.findIndex(s => s.key === newSubmission.stage));
                                    const stage = HOT_SEAT_STAGES[stageIdx];
                                    const previewTitle = newSubmission.title || (language === 'EN' ? 'Untitled Draft' : 'Brouillon sans titre');
                                    const previewDescription = newSubmission.description
                                        || (language === 'EN'
                                            ? 'Your description will appear here, framing the work for critics before they respond.'
                                            : "Ta description apparaîtra ici pour cadrer l'œuvre avant la critique.");
                                    const FeedbackGlyph: React.FC<{ d: string; size?: number; className?: string }> = ({ d, size = 16, className = '' }) => (
                                        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
                                            <path d={d} />
                                        </svg>
                                    );
                                    // Numbered editorial section header used 7× below.
                                    // SectionHeader extracted to FormSectionHeader at the
                                    // component scope so all forms share one definition.
                                    const SectionHeader = FormSectionHeader;
                                    return (
                                    <div className="relative max-w-7xl mx-auto">
                                        {/* Aurora — drifting blobs in the theme's accent palette,
                                            sitting behind the form to give it a stage. Hidden under
                                            prefers-reduced-motion via the keyframes below. */}
                                        <div aria-hidden className="hot-seat-aurora absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-2xl">
                                            <div className="hot-seat-aurora-a absolute -inset-[20%]" style={{ background: 'radial-gradient(40% 40% at 25% 30%, rgba(220,38,38,0.30), transparent 65%)', filter: 'blur(60px)', mixBlendMode: 'screen' }} />
                                            <div className="hot-seat-aurora-b absolute -inset-[20%]" style={{ background: 'radial-gradient(40% 40% at 75% 70%, rgba(217,70,239,0.25), transparent 65%)', filter: 'blur(70px)', mixBlendMode: 'screen' }} />
                                            <div className="hot-seat-aurora-c absolute -inset-[20%]" style={{ background: 'radial-gradient(35% 35% at 50% 50%, rgba(34,211,238,0.18), transparent 70%)', filter: 'blur(80px)', mixBlendMode: 'screen' }} />
                                        </div>

                                        {/* Editorial header — kicker + huge wordmark + brief.
                                            "HOT SEAT · ARENA" reads as a magazine masthead; the
                                            rule below it sits inside the page chrome (not a card). */}
                                        <header className="px-4 md:px-8 pt-8 pb-6 mb-2">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className={`font-mono text-[10px] tracking-[0.5em] ${formStyles.accentText} opacity-80`}>
                                                    {language === 'EN' ? 'HOT SEAT · ARENA' : 'HOT SEAT · ARÈNE'}
                                                </span>
                                                <span className="flex-1 h-px bg-white/15" />
                                                <span className="font-mono text-[10px] tracking-[0.3em] text-neutral-500 tabular-nums">
                                                    №&nbsp;{String(hotSeatSubmissions.length + 1).padStart(3, '0')}
                                                </span>
                                            </div>
                                            <h2 className={`text-4xl md:text-6xl leading-[0.95] mb-3 ${pageTitleClass}`}>
                                                {language === 'EN' ? 'Step into the Arena' : "Entre dans l'arène"}
                                            </h2>
                                            <p className="text-sm md:text-base text-neutral-300 max-w-2xl font-lato leading-relaxed">
                                                {language === 'EN'
                                                    ? 'Critics see exactly what you submit. The more honest the brief, the more honest the response. Frame the work, name the stage, and tell us what kind of feedback you actually want.'
                                                    : 'La critique voit exactement ce que tu soumets. Plus le brief est honnête, plus le retour le sera. Cadre l\'œuvre, nomme l\'étape, et dis ce que tu cherches comme retour.'}
                                            </p>
                                        </header>

                                        {/* 5fr / 7fr split: live preview ledger on the left,
                                            numbered editorial sections on the right. Stacks on
                                            mobile (preview first so the user sees what they're
                                            building before they fill it). */}
                                        <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-6 lg:gap-10 px-4 md:px-8 pb-8">

                                            {/* ─── LIVE PREVIEW LEDGER ───────────────────────── */}
                                            <aside className="lg:sticky lg:top-4 self-start">
                                                <div className={`relative overflow-hidden ${formStyles.container}`}>
                                                    {/* Cover — falls back to a moody placeholder
                                                        with the discipline written across it so
                                                        the card never looks broken when empty. */}
                                                    <div className="relative aspect-[4/5] bg-black overflow-hidden">
                                                        {newSubmission.imageUrl ? (
                                                            <img
                                                                src={newSubmission.imageUrl}
                                                                alt=""
                                                                className="absolute inset-0 w-full h-full object-cover"
                                                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-black via-[#1a0010] to-[#001a18]">
                                                                <span className={`font-cinzel text-[10px] tracking-[0.6em] ${formStyles.accentText} opacity-50`}>
                                                                    {language === 'EN' ? 'COVER' : 'COUVERTURE'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Bottom gradient veil so the title sits
                                                            cleanly on top of any photo. */}
                                                        <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />
                                                        {/* Pinned discipline + stage badges */}
                                                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                                                            {disc && (
                                                                <span className={`text-[9px] font-cinzel uppercase tracking-[0.25em] px-2 py-1 rounded backdrop-blur-md bg-black/40 border ${formStyles.chipActive.replace(/bg-[^ ]*/g, '').replace(/text-[^ ]*/g, 'text-white')}`}>
                                                                    {language === 'FR' ? disc.fr : disc.en}
                                                                </span>
                                                            )}
                                                            {stage && (
                                                                <span className="text-[9px] font-cinzel uppercase tracking-[0.25em] px-2 py-1 rounded backdrop-blur-md bg-amber-500/15 border border-amber-400/40 text-amber-100">
                                                                    {language === 'FR' ? stage.fr : stage.en}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Pinned "PREVIEW" stamp */}
                                                        <div className="absolute top-3 right-3">
                                                            <span className="text-[9px] font-mono uppercase tracking-[0.4em] px-2 py-1 rounded bg-white/5 border border-white/15 text-white/70 backdrop-blur-md">
                                                                {language === 'EN' ? 'Preview' : 'Aperçu'}
                                                            </span>
                                                        </div>
                                                        {/* Title block — sits over the gradient */}
                                                        <div className="absolute inset-x-0 bottom-0 p-5">
                                                            <h3 className={`text-2xl md:text-3xl leading-tight ${pageTitleClass}`} style={{ wordBreak: 'break-word' }}>
                                                                {previewTitle}
                                                            </h3>
                                                            <p className="text-[10px] uppercase tracking-[0.4em] text-white/60 mt-2 font-cinzel">
                                                                {language === 'EN' ? 'by' : 'par'} {regData.name || (language === 'EN' ? 'Anonymous' : 'Anonyme')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Body of the ledger card */}
                                                    <div className="p-5 space-y-4">
                                                        {newSubmission.sensitivities && (
                                                            <div className="text-[11px] text-rose-200 bg-rose-900/20 border border-rose-500/30 px-3 py-2 rounded">
                                                                <span className="font-bold uppercase tracking-widest text-[10px] mr-1">
                                                                    {language === 'EN' ? 'Note' : 'Avertissement'}:
                                                                </span>
                                                                {newSubmission.sensitivities}
                                                            </div>
                                                        )}

                                                        <p className="text-sm text-neutral-300 font-lato leading-relaxed line-clamp-5">
                                                            {previewDescription}
                                                        </p>

                                                        {/* Feedback chips the critic will see */}
                                                        <div>
                                                            <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-2 font-cinzel">
                                                                {language === 'EN' ? 'Asks for' : 'Demande'}
                                                            </p>
                                                            {newSubmission.feedbackSought.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {newSubmission.feedbackSought.map(k => {
                                                                        const ft = HOT_SEAT_FEEDBACK_TYPES.find(t => t.key === k);
                                                                        if (!ft) return null;
                                                                        return (
                                                                            <span key={k} className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full border ${formStyles.chipActive}`}>
                                                                                <FeedbackGlyph d={ft.icon} size={11} />
                                                                                {language === 'FR' ? ft.fr : ft.en}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <p className="text-[11px] text-neutral-600 italic">
                                                                    {language === 'EN' ? 'Pick at least one feedback type →' : 'Choisis au moins un type de retour →'}
                                                                </p>
                                                            )}
                                                        </div>

                                                        {newSubmission.specificQuestions && (
                                                            <div className="border-t border-white/10 pt-3">
                                                                <p className="text-[10px] uppercase tracking-[0.4em] text-neutral-500 mb-1.5 font-cinzel">
                                                                    {language === 'EN' ? 'Asking specifically' : 'Demande précise'}
                                                                </p>
                                                                <p className="text-sm text-neutral-200 font-lato italic leading-relaxed line-clamp-3">
                                                                    "{newSubmission.specificQuestions}"
                                                                </p>
                                                            </div>
                                                        )}

                                                        {newSubmission.workLink && (
                                                            <p className="text-[11px] truncate">
                                                                <span className={`font-mono uppercase tracking-widest text-[9px] ${formStyles.accentText} opacity-70 mr-1.5`}>↗</span>
                                                                <span className="text-neutral-400">{newSubmission.workLink.replace(/^https?:\/\//, '').slice(0, 40)}…</span>
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Footer status — pulses while incomplete */}
                                                    <div className={`px-5 py-3 border-t ${theme === 'COMIC' ? 'border-black border-t-2' : 'border-white/10'} flex items-center justify-between text-[10px] uppercase tracking-[0.3em]`}>
                                                        <span className={canSubmit ? 'text-emerald-300' : 'text-neutral-500'}>
                                                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${canSubmit ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-neutral-600 hot-seat-pulse'}`} />
                                                            {canSubmit
                                                                ? (language === 'EN' ? 'Ready to enter' : "Prêt à entrer")
                                                                : (language === 'EN' ? 'Drafting' : 'Rédaction')}
                                                        </span>
                                                        <span className="text-neutral-600 font-mono tabular-nums">
                                                            {newSubmission.feedbackSought.length}/{HOT_SEAT_FEEDBACK_TYPES.length}
                                                        </span>
                                                    </div>
                                                </div>
                                            </aside>

                                            {/* ─── EDITORIAL FORM SECTIONS ─────────────────── */}
                                            <div className={`p-6 md:p-8 space-y-8 ${formStyles.container}`}>

                                                {/* 01 — TITLE */}
                                                <section>
                                                    <SectionHeader n="01" en="Title" fr="Titre"
                                                        helpEn="The line critics will read first."
                                                        helpFr="La ligne que la critique lira en premier." />
                                                    <input
                                                        type="text"
                                                        value={newSubmission.title}
                                                        onChange={(e) => setNewSubmission({...newSubmission, title: e.target.value})}
                                                        className={`w-full p-3 text-lg ${formStyles.input}`}
                                                        placeholder={language === 'EN' ? 'Untitled Draft 1…' : 'Brouillon sans titre…'}
                                                        autoFocus
                                                    />
                                                </section>

                                                {/* 02 — DISCIPLINE — visual chip grid (no select) */}
                                                <section>
                                                    <SectionHeader n="02" en="Discipline" fr="Discipline"
                                                        helpEn="Pick the medium that fits best."
                                                        helpFr="Choisis le médium qui correspond." />
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {HOT_SEAT_DISCIPLINES.map(d => {
                                                            const active = newSubmission.type === d.key;
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={d.key}
                                                                    onClick={() => setNewSubmission({...newSubmission, type: d.key})}
                                                                    aria-pressed={active}
                                                                    className={`min-h-[40px] px-3 py-2 text-[11px] uppercase tracking-widest rounded-full transition-all border ${active ? formStyles.chipActive : formStyles.chipInactive}`}
                                                                >
                                                                    {language === 'FR' ? d.fr : d.en}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </section>

                                                {/* 03 — STAGE — horizontal stepper */}
                                                <section>
                                                    <SectionHeader n="03" en="Stage" fr="Étape"
                                                        helpEn="Where in its life cycle is the piece?"
                                                        helpFr="Où en est l'œuvre dans son cycle ?" />
                                                    <div className="relative px-2 pt-2 pb-1">
                                                        {/* Connecting rule behind the dots */}
                                                        <div aria-hidden className="absolute left-2 right-2 top-[19px] h-px bg-white/10" />
                                                        <div
                                                            aria-hidden
                                                            className={`absolute left-2 top-[19px] h-px transition-[width] duration-500 ease-out ${formStyles.submitOn.includes('gradient') ? 'bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300' : (theme === 'CLASSY' ? 'bg-[#c8aa6e]' : theme === 'COMIC' ? 'bg-[#facc15]' : theme === 'BLUE_PUNK' ? 'bg-fuchsia-400' : theme === 'RED' ? 'bg-red-500' : 'bg-white')}`}
                                                            style={{ width: `calc(${(stageIdx / (HOT_SEAT_STAGES.length - 1)) * 100}% - ${(stageIdx / (HOT_SEAT_STAGES.length - 1)) * 16}px)` }}
                                                        />
                                                        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${HOT_SEAT_STAGES.length}, minmax(0, 1fr))` }}>
                                                            {HOT_SEAT_STAGES.map((s, i) => {
                                                                const isActive = i === stageIdx;
                                                                const isPast = i < stageIdx;
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        key={s.key}
                                                                        onClick={() => setNewSubmission({...newSubmission, stage: s.key})}
                                                                        aria-pressed={isActive}
                                                                        aria-current={isActive ? 'step' : undefined}
                                                                        className="group flex flex-col items-center gap-2 min-h-[44px] focus:outline-none"
                                                                    >
                                                                        <span
                                                                            className={`relative w-3 h-3 rounded-full transition-all duration-300 ${
                                                                                isActive
                                                                                    ? `scale-150 ${theme === 'CLASSY' ? 'bg-[#c8aa6e] shadow-[0_0_12px_rgba(200,170,110,0.7)]' : theme === 'COMIC' ? 'bg-[#facc15] shadow-[0_0_8px_rgba(250,204,21,0.7)]' : theme === 'BLUE_PUNK' ? 'bg-fuchsia-400 shadow-[0_0_12px_rgba(217,70,239,0.7)]' : theme === 'RED' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.7)]' : 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]'}`
                                                                                    : isPast
                                                                                        ? `${theme === 'CLASSY' ? 'bg-[#c8aa6e]' : theme === 'COMIC' ? 'bg-[#facc15]' : theme === 'BLUE_PUNK' ? 'bg-fuchsia-500' : theme === 'RED' ? 'bg-red-500' : 'bg-white'} opacity-70`
                                                                                        : 'bg-white/10 border border-white/20 group-hover:bg-white/30'
                                                                            }`}
                                                                        />
                                                                        <span className={`text-[9px] md:text-[10px] uppercase tracking-widest text-center leading-tight max-w-[8ch] transition-colors ${isActive ? formStyles.accentText : 'text-neutral-500 group-hover:text-neutral-300'}`}>
                                                                            {language === 'FR' ? s.fr : s.en}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </section>

                                                {/* 04 — VISUALS */}
                                                <section>
                                                    <SectionHeader n="04" en="Visuals" fr="Visuels"
                                                        helpEn="A cover image and an optional public link to the work."
                                                        helpFr="Une image de couverture et un lien public optionnel vers l'œuvre." />
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        <input
                                                            type="text"
                                                            value={newSubmission.imageUrl}
                                                            onChange={(e) => setNewSubmission({...newSubmission, imageUrl: e.target.value})}
                                                            className={`w-full p-3 ${formStyles.input}`}
                                                            placeholder={language === 'EN' ? 'Cover image URL…' : "URL de l'image…"}
                                                            inputMode="url"
                                                            autoComplete="off"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={newSubmission.workLink}
                                                            onChange={(e) => setNewSubmission({...newSubmission, workLink: e.target.value})}
                                                            className={`w-full p-3 ${formStyles.input}`}
                                                            placeholder={language === 'EN' ? 'Vimeo / Doc / GitHub…' : 'Vimeo / Doc / GitHub…'}
                                                            inputMode="url"
                                                            autoComplete="off"
                                                        />
                                                    </div>
                                                </section>

                                                {/* 05 — DESCRIBE */}
                                                <section>
                                                    <SectionHeader n="05" en="Describe the work" fr="Décris l'œuvre"
                                                        helpEn="Set the table. Constraints, intention, anything the critic should know."
                                                        helpFr="Mets la table. Contraintes, intention, ce que la critique doit savoir." />
                                                    <textarea
                                                        rows={5}
                                                        value={newSubmission.description}
                                                        onChange={(e) => setNewSubmission({...newSubmission, description: e.target.value})}
                                                        className={`w-full p-3 ${formStyles.input}`}
                                                        placeholder={language === 'EN'
                                                            ? 'What is it about? What were you trying to do? Any constraints or context the critic should know?'
                                                            : "De quoi s'agit-il ? Quelle était l'intention ? Y a-t-il un contexte que la critique doit connaître ?"}
                                                    />
                                                </section>

                                                {/* 06 — WHAT YOU SEEK */}
                                                <section>
                                                    <SectionHeader n="06" en="What you seek" fr="Ce que tu cherches"
                                                        helpEn="Critics will lean into the angles you pick."
                                                        helpFr="La critique se concentrera sur les angles choisis." />
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                                        {HOT_SEAT_FEEDBACK_TYPES.map(ft => {
                                                            const active = newSubmission.feedbackSought.includes(ft.key);
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    key={ft.key}
                                                                    onClick={() => toggleFeedbackSought(ft.key)}
                                                                    aria-pressed={active}
                                                                    title={language === 'FR' ? ft.blurbFr : ft.blurbEn}
                                                                    className={`min-h-[64px] px-3 py-2.5 text-left rounded-lg transition-all border flex items-start gap-2.5 ${active ? formStyles.chipActive : formStyles.chipInactive}`}
                                                                >
                                                                    <FeedbackGlyph d={ft.icon} size={18} className="shrink-0 mt-0.5" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="block text-[11px] uppercase tracking-widest font-cinzel leading-tight">
                                                                            {language === 'FR' ? ft.fr : ft.en}
                                                                        </span>
                                                                        <span className="block text-[10px] opacity-70 mt-0.5 leading-snug font-lato normal-case tracking-normal">
                                                                            {language === 'FR' ? ft.blurbFr : ft.blurbEn}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <p className={`text-[10px] mt-2 ${formStyles.accentText} opacity-60 tabular-nums`}>
                                                        {newSubmission.feedbackSought.length === 0
                                                            ? (language === 'EN' ? 'Pick at least one.' : 'Choisis-en au moins un.')
                                                            : (language === 'EN' ? `${newSubmission.feedbackSought.length} selected.` : `${newSubmission.feedbackSought.length} sélectionné·s.`)}
                                                    </p>
                                                </section>

                                                {/* 07 — SPECIFIC QUESTIONS */}
                                                <section>
                                                    <SectionHeader n="07" en="Specific questions" fr="Questions précises"
                                                        helpEn="Optional — but the more pointed, the more useful."
                                                        helpFr="Optionnel — mais plus c'est précis, plus c'est utile." />
                                                    <textarea
                                                        rows={3}
                                                        value={newSubmission.specificQuestions}
                                                        onChange={(e) => setNewSubmission({...newSubmission, specificQuestions: e.target.value})}
                                                        className={`w-full p-3 ${formStyles.input}`}
                                                        placeholder={language === 'EN'
                                                            ? 'e.g. "Does the second act drag?" or "Is the colour balance off in the third panel?"'
                                                            : 'ex. « Le deuxième acte traîne-t-il ? » ou « La balance des couleurs est-elle bonne dans le troisième panneau ? »'}
                                                    />
                                                </section>

                                                {/* 08 — CONTENT NOTE */}
                                                <section>
                                                    <SectionHeader n="08" en="Content note" fr="Avertissement"
                                                        helpEn="Optional flag for heavy themes, nudity, language."
                                                        helpFr="Flag optionnel pour thèmes lourds, nudité, langage." />
                                                    <input
                                                        type="text"
                                                        value={newSubmission.sensitivities}
                                                        onChange={(e) => setNewSubmission({...newSubmission, sensitivities: e.target.value})}
                                                        className={`w-full p-3 ${formStyles.input}`}
                                                        placeholder={language === 'EN'
                                                            ? 'Heavy themes, nudity, language…'
                                                            : 'Thèmes lourds, nudité, langage…'}
                                                    />
                                                </section>

                                                {/* SUBMIT — full-width, theatrical, with arrow */}
                                                <div className="pt-4">
                                                    <button
                                                        onClick={handleHotSeatSubmit}
                                                        disabled={!canSubmit}
                                                        title={
                                                            !newSubmission.title
                                                                ? (language === 'EN' ? 'A title is required' : 'Le titre est requis')
                                                                : newSubmission.feedbackSought.length === 0
                                                                    ? (language === 'EN' ? 'Select at least one type of feedback you seek' : 'Choisis au moins un type de retour souhaité')
                                                                    : ''
                                                        }
                                                        className={`group w-full flex items-center justify-center gap-3 py-5 text-base rounded transition-all ${canSubmit ? formStyles.submitOn : formStyles.submitOff}`}
                                                    >
                                                        <span>{language === 'EN' ? 'Enter the Arena' : "Entrer dans l'arène"}</span>
                                                        <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                                                    </button>
                                                    {!canSubmit && (
                                                        <p
                                                            className="text-[11px] text-amber-300/80 mt-2 text-center"
                                                            role="status"
                                                            aria-live="polite"
                                                        >
                                                            {!newSubmission.title
                                                                ? (language === 'EN' ? 'Add a title before stepping into the arena.' : "Ajoute un titre avant d'entrer dans l'arène.")
                                                                : (language === 'EN' ? 'Pick at least one type of feedback to seek.' : 'Choisis au moins un type de retour souhaité.')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <style>{`
                                            .hot-seat-aurora-a { animation: hotSeatAuroraA 18s ease-in-out infinite alternate; }
                                            .hot-seat-aurora-b { animation: hotSeatAuroraB 22s ease-in-out infinite alternate; }
                                            .hot-seat-aurora-c { animation: hotSeatAuroraC 26s ease-in-out infinite alternate; }
                                            @keyframes hotSeatAuroraA { 0% { transform: translate(-2%, -1%) scale(1); }   100% { transform: translate(2%, 2%) scale(1.08); } }
                                            @keyframes hotSeatAuroraB { 0% { transform: translate(2%, 2%) scale(1.05); }  100% { transform: translate(-3%, -2%) scale(1.12); } }
                                            @keyframes hotSeatAuroraC { 0% { transform: translate(0%, 1%) scale(0.98); } 100% { transform: translate(0%, -2%) scale(1.06); } }
                                            .hot-seat-pulse { animation: hotSeatPulse 1.6s ease-in-out infinite; }
                                            @keyframes hotSeatPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
                                            @media (prefers-reduced-motion: reduce) {
                                                .hot-seat-aurora-a, .hot-seat-aurora-b, .hot-seat-aurora-c, .hot-seat-pulse { animation: none !important; }
                                            }
                                        `}</style>
                                    </div>
                                    );
                                })()}

                                {/* CRITIQUE VIEW */}
                                {hotSeatView === 'CRITIQUE' && selectedHotSeatWork && (
                                    <div className="flex flex-col lg:flex-row gap-8 h-[70vh]">
                                        {/* Work Display */}
                                        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden flex flex-col">
                                            <div className="flex-1 bg-black relative flex items-center justify-center p-4">
                                                <img src={selectedHotSeatWork.imageUrl} className="max-w-full max-h-full object-contain" alt="Work" />
                                            </div>
                                            <div className="p-6 bg-[#141414] border-t border-white/10 space-y-4">
                                                <div>
                                                    <h3 className="font-cinzel text-2xl text-white mb-1">{selectedHotSeatWork.title}</h3>
                                                    <p className="text-xs text-neutral-500 uppercase">
                                                        {language === 'EN' ? 'by' : 'par'} {selectedHotSeatWork.artist}
                                                    </p>
                                                </div>

                                                {/* Discipline + stage badges */}
                                                <div className="flex flex-wrap gap-2">
                                                    {(() => {
                                                        const disc = HOT_SEAT_DISCIPLINES.find(d => d.key === selectedHotSeatWork.type);
                                                        const stage = HOT_SEAT_STAGES.find(s => s.key === selectedHotSeatWork.stage);
                                                        return (
                                                            <>
                                                                {disc && (
                                                                    <span className="text-[10px] font-cinzel uppercase tracking-widest px-2.5 py-1 border border-white/15 text-neutral-300 bg-black/40 rounded">
                                                                        {language === 'FR' ? disc.fr : disc.en}
                                                                    </span>
                                                                )}
                                                                {stage && (
                                                                    <span className="text-[10px] font-cinzel uppercase tracking-widest px-2.5 py-1 border border-amber-500/30 text-amber-200 bg-amber-500/10 rounded">
                                                                        {language === 'FR' ? stage.fr : stage.en}
                                                                    </span>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>

                                                {selectedHotSeatWork.sensitivities && (
                                                    <div className="text-[11px] text-rose-200 bg-rose-900/20 border border-rose-500/30 px-3 py-2 rounded">
                                                        <span className="font-bold uppercase tracking-widest text-[10px] mr-1">
                                                            {language === 'EN' ? 'Note' : 'Avertissement'}:
                                                        </span>
                                                        {selectedHotSeatWork.sensitivities}
                                                    </div>
                                                )}

                                                <p className="text-sm text-neutral-300 font-lato leading-relaxed">{selectedHotSeatWork.description}</p>

                                                {selectedHotSeatWork.workLink && (
                                                    <a
                                                        href={selectedHotSeatWork.workLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-white border-b border-cyan-400/30 hover:border-cyan-200"
                                                    >
                                                        {language === 'EN' ? 'Open the work →' : "Ouvrir l'œuvre →"}
                                                    </a>
                                                )}

                                                {/* What the artist asked for */}
                                                {selectedHotSeatWork.feedbackSought && selectedHotSeatWork.feedbackSought.length > 0 && (
                                                    <div className="pt-3 border-t border-white/10">
                                                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
                                                            {language === 'EN' ? 'Feedback the artist asked for' : "Retours demandés par l'artiste"}
                                                        </p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {selectedHotSeatWork.feedbackSought.map(k => {
                                                                const ft = HOT_SEAT_FEEDBACK_TYPES.find(t => t.key === k);
                                                                if (!ft) return null;
                                                                return (
                                                                    <span
                                                                        key={k}
                                                                        title={language === 'FR' ? ft.blurbFr : ft.blurbEn}
                                                                        className="text-[10px] font-cinzel uppercase tracking-widest px-2.5 py-1 border border-red-500/30 text-red-200 bg-red-500/10 rounded"
                                                                    >
                                                                        {language === 'FR' ? ft.fr : ft.en}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {selectedHotSeatWork.specificQuestions && (
                                                    <div className="pt-3 border-t border-white/10">
                                                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1.5">
                                                            {language === 'EN' ? 'Specific questions' : 'Questions précises'}
                                                        </p>
                                                        <p className="text-sm text-neutral-200 font-lato italic leading-relaxed">
                                                            "{selectedHotSeatWork.specificQuestions}"
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Feedback Column */}
                                        <div className="w-full lg:w-96 flex flex-col bg-[#141414] border border-white/10 rounded-xl overflow-hidden">
                                            <div className="p-4 border-b border-white/10 bg-black/20">
                                                <h4 className="font-cinzel text-white text-sm">Critique Log</h4>
                                            </div>
                                            
                                            {/* List */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                                {selectedHotSeatWork.feedback.length > 0 ? (
                                                    selectedHotSeatWork.feedback.map(fb => (
                                                        <div key={fb.id} className="bg-white/5 p-4 rounded border border-white/5">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <span className="text-xs font-bold text-white">{fb.author}</span>
                                                                <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 bg-white/10 rounded text-neutral-300">{fb.capacity}</span>
                                                            </div>
                                                            <p className="text-xs text-neutral-400 leading-relaxed font-lato">{fb.text}</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-center text-xs text-neutral-600 italic mt-10">No feedback yet. Be the first.</p>
                                                )}
                                            </div>

                                            {/* Input Area */}
                                            <div className="p-4 border-t border-white/10 bg-black/40 space-y-3">
                                                <select 
                                                    className="w-full bg-black border border-white/10 p-2 text-xs text-neutral-300 outline-none focus:border-white/30"
                                                    value={newCritique.capacity}
                                                    onChange={(e) => setNewCritique({...newCritique, capacity: e.target.value})}
                                                >
                                                    <option value="Profane">Profane / Observer</option>
                                                    <option value="Professional Writer">Professional Writer</option>
                                                    <option value="Professional Editor">Professional Video Editor</option>
                                                    <option value="Visual Artist">Visual Artist</option>
                                                    <option value="Musician">Musician</option>
                                                </select>
                                                <textarea 
                                                    className="w-full bg-black border border-white/10 p-3 text-xs text-white outline-none focus:border-white/30 resize-none h-20"
                                                    placeholder="Honest but kind feedback..."
                                                    value={newCritique.text}
                                                    onChange={(e) => setNewCritique({...newCritique, text: e.target.value})}
                                                ></textarea>
                                                <button 
                                                    onClick={handleHotSeatCritique}
                                                    disabled={!newCritique.text}
                                                    className={`w-full py-2 font-bold text-xs uppercase tracking-widest ${newCritique.text ? 'bg-white text-black hover:bg-neutral-200' : 'bg-white/10 text-neutral-600 cursor-not-allowed'}`}
                                                >
                                                    Post Critique
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* READS (LORE) - REDESIGNED */}
                {activeTab === 'READS' && (
                    <div className="relative max-w-[90rem] mx-auto py-12 px-6">
                        
                        {/* Detail Overlay */}
                        {selectedArticle && (
                            <div className="fixed inset-0 z-50 bg-black/95 overflow-y-auto animate-fadeIn">
                                <div className={`max-w-4xl mx-auto min-h-screen bg-[#0f0f0f] border-x border-white/10 shadow-2xl relative`}>
                                    {/* Close Button */}
                                    <button 
                                        onClick={() => setSelectedArticle(null)}
                                        className="fixed top-6 right-6 md:right-12 z-50 text-white bg-black/50 p-2 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        ✕
                                    </button>

                                    {/* Article Header Image */}
                                    <div className="h-[40vh] w-full relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] to-transparent z-10"></div>
                                        <img 
                                            src={selectedArticle.imageUrl || "https://images.unsplash.com/photo-1507842217121-ad763adcd942?q=80&w=1000&auto=format&fit=crop"} 
                                            className="w-full h-full object-cover grayscale opacity-50"
                                            alt="Header" 
                                        />
                                        <div className="absolute bottom-0 left-0 w-full p-8 z-20">
                                            <div className="flex gap-2 mb-4">
                                                {selectedArticle.tags.map(t => (
                                                    <span key={t} className="px-2 py-1 bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest">{t}</span>
                                                ))}
                                            </div>
                                            <h1 className="font-serif text-5xl md:text-7xl text-white font-bold mb-4 leading-tight">{selectedArticle.title}</h1>
                                            <div className="flex items-center justify-between border-t border-white/20 pt-4 text-neutral-400 font-mono text-xs uppercase tracking-widest">
                                                <span>By {selectedArticle.author}</span>
                                                <span>{selectedArticle.date}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Article Content */}
                                    <div className="p-8 md:p-16 text-lg text-neutral-300 font-serif leading-relaxed space-y-8">
                                        
                                        {/* Actions: TTS */}
                                        <div className="flex items-center gap-4 border-b border-white/10 pb-8 mb-8">
                                            <button 
                                                onClick={() => handleSpeak(selectedArticle.content)}
                                                className={`flex items-center gap-2 px-4 py-2 border rounded transition-all ${isPlayingAudio ? 'bg-fuchsia-900/50 border-fuchsia-500 text-white' : 'border-white/20 text-neutral-400 hover:text-white'}`}
                                            >
                                                {isPlayingAudio ? (
                                                    <>
                                                        <span className="animate-pulse">●</span> Speaking...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icons.Speaker /> Listen with Gemini
                                                    </>
                                                )}
                                            </button>
                                        </div>

                                        <p className="first-letter:text-5xl first-letter:font-bold first-letter:text-white first-letter:mr-3 first-letter:float-left whitespace-pre-wrap">
                                            {selectedArticle.content}
                                        </p>
                                        
                                        {/* Voting */}
                                        <div className="mt-16 flex items-center justify-center gap-8 border-t border-white/10 pt-8">
                                            <button 
                                                onClick={() => handleVote(selectedArticle.id, 1)}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <span className="text-2xl group-hover:-translate-y-1 transition-transform">▲</span>
                                                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500 group-hover:text-white">Upvote</span>
                                            </button>
                                            <span className="text-4xl font-bold text-white">{selectedArticle.votes}</span>
                                            <button 
                                                onClick={() => handleVote(selectedArticle.id, -1)}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <span className="text-2xl group-hover:translate-y-1 transition-transform">▼</span>
                                                <span className="text-xs uppercase tracking-widest font-bold text-neutral-500 group-hover:text-white">Downvote</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col lg:flex-row gap-12">
                            {/* Side Menu (Subjects & Books) */}
                            <div className="hidden lg:block w-64 shrink-0">
                                 <div className="sticky top-32 flex flex-col gap-12">
                                    {/* Subjects */}
                                    <div className="flex flex-col gap-4 text-left border-l-2 border-white/10 pl-6">
                                        <span className="font-mono text-xs text-neutral-600 uppercase tracking-widest mb-2">/ Subjects</span>
                                        {["ALL", "VISUAL", "AUDIO", "DESIGN", "CORE", "FUTURE", "AI"].map((subject) => (
                                            <button
                                                key={subject}
                                                onClick={() => setFilterSubject(subject)}
                                                className={`text-left font-black text-2xl uppercase transition-all duration-300 font-sans tracking-tighter hover:translate-x-2
                                                    ${filterSubject === subject 
                                                        ? 'text-white translate-x-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
                                                        : 'text-neutral-800 hover:text-neutral-500'
                                                    }`}
                                            >
                                                {subject}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Suggested Books Button */}
                                    <div className="border-l-2 border-[#d4af37]/30 pl-6">
                                        <span className="font-mono text-xs text-[#d4af37] uppercase tracking-widest mb-4 block">/ Library</span>
                                        <button 
                                            onClick={() => setIsLibraryOpen(true)}
                                            className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 p-3 text-neutral-300 font-cinzel text-xs uppercase tracking-wider transition-colors"
                                        >
                                            Open Suggested Library
                                        </button>
                                    </div>

                                    {/* Random Creativity Quote Card */}
                                    <div className="border-l-2 border-fuchsia-500/30 pl-6 relative group">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20 rounded blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="relative p-6 bg-black/40 border border-white/10 hover:border-fuchsia-500/50 transition-colors">
                                            <span className="text-4xl text-fuchsia-500 font-serif leading-none absolute top-2 left-2">"</span>
                                            <p className="text-sm text-neutral-300 font-serif italic relative z-10 pt-4 mb-4 leading-relaxed">
                                                {randomQuote.text}
                                            </p>
                                            <p className="text-xs text-fuchsia-400 font-bold uppercase tracking-widest text-right">
                                                — {randomQuote.author}
                                            </p>
                                        </div>
                                    </div>
                                 </div>
                            </div>

                            {/* Content List */}
                            <div className="flex-1 flex flex-col gap-20">
                                {articles
                                    .filter(a => filterSubject === 'ALL' || a.tags.includes(filterSubject))
                                    .map((article, index) => (
                                    <div 
                                        key={article.id}
                                        onClick={() => handleReadArticle(article)} 
                                        className={`group relative pl-8 border-l-2 border-white/10 hover:border-l-4 hover:border-white transition-all duration-300 cursor-pointer max-w-4xl
                                            ${index % 2 !== 0 ? 'lg:ml-24' : ''} 
                                        `}
                                    >
                                        {/* Hover Background Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-xl"></div>
                                        
                                        {/* Meta Line */}
                                        <div className="flex items-center gap-4 mb-2">
                                            <span className="font-mono text-xs text-neutral-500 tracking-widest">{article.date}</span>
                                            <div className="flex gap-2">
                                                {article.tags.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 border border-white/20 text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{tag}</span>
                                                ))}
                                            </div>
                                            <span className="text-xs text-neutral-600">by {article.author}</span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-5xl md:text-7xl font-black text-white mb-4 leading-[0.85] tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-neutral-400 transition-all">
                                            {article.title}
                                        </h3>

                                        {/* Summary */}
                                        <p className="text-neutral-400 font-lato text-lg max-w-xl group-hover:text-white transition-colors">
                                            {article.summary}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* MARKET — three sub-views: Time / Resources / Foire */}
                {activeTab === 'MARKET' && (
                    <div className="max-w-7xl mx-auto">
                        {/* Sub-view switcher — sits at the top of the Marché.
                            Time = the existing token economy (skill-hours).
                            Resources = peer-to-peer material lending (cameras, lights…).
                            Foire = bidding marketplace where members resell completed
                            puzzles + skins for coins (no money). */}
                        <div className="mb-8 flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/10 max-w-fit mx-auto">
                            {([
                                { id: 'TIME',      en: "Time Exchange",     fr: "Échange de Temps" },
                                { id: 'RESOURCES', en: "Resource Exchange", fr: "Échange de Ressources" },
                                { id: 'FOIRE',     en: "Foire",             fr: "Foire" },
                            ] as { id: MarketView; en: string; fr: string }[]).map(v => {
                                const active = marketView === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => setMarketView(v.id)}
                                        aria-pressed={active}
                                        className={`px-5 py-2.5 text-[11px] font-cinzel uppercase tracking-[0.25em] rounded-md transition-all ${active ? `${formStyles.submitOn}` : 'text-neutral-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        {language === 'FR' ? v.fr : v.en}
                                    </button>
                                );
                            })}
                        </div>

                        {marketView === 'TIME' && (<>
                        {/* Concept Banner */}
                        <div className={`p-8 mb-12 border ${currentStyles.border} bg-black/40 text-center relative overflow-hidden`}>
                            <div className="relative z-10">
                                <h2 className={`text-3xl md:text-4xl mb-4 ${pageTitleClass}`}>
                                    {language === 'EN' ? "The Time Exchange" : "L'Échange de Temps"}
                                </h2>
                                <p className="font-lato text-neutral-400 max-w-2xl mx-auto mb-6">
                                    {language === 'EN' ? "In the Studio, money is obsolete. We trade in" : "Dans le Studio, l'argent est obsolète. Nous échangeons du"} <span className="text-white font-bold">{language === 'EN' ? "Time" : "Temps"}</span>.
                                    <br/>
                                    {language === 'EN' ? "Give an hour of your skill to earn a Token. Spend a Token to request an hour from another." : "Donnez une heure de votre compétence pour gagner un Jeton. Dépensez un Jeton pour demander une heure à un autre."}
                                </p>
                                <div className="flex justify-center gap-8 text-sm font-mono uppercase tracking-widest text-[#d4af37]">
                                    <span>{language === 'EN' ? "1 Hour = 1 Token" : "1 Heure = 1 Jeton"}</span>
                                    <span>{language === 'EN' ? "Max Hoarding: 100 Tokens" : "Max Cumul: 100 Jetons"}</span>
                                </div>
                            </div>
                            {/* Background decoration */}
                            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
                        </div>

                        {/* Contracts Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Create Contract Card Button */}
                            <div 
                                onClick={() => accessLevel === 'MEMBER' && setIsPostModalOpen(true)}
                                className={`border-2 border-dashed ${currentStyles.border} bg-transparent p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-all min-h-[250px] group ${accessLevel === 'GUEST' ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                 <div className="w-16 h-16 rounded-full border border-white/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="text-3xl text-neutral-500 group-hover:text-white">+</span>
                                 </div>
                                 <h3 className="font-cinzel text-white text-lg mb-2">{language === 'EN' ? "Post a Contract" : "Publier un Contrat"}</h3>
                                 <p className="text-xs text-neutral-500">{language === 'EN' ? "Need help? Offer a token." : "Besoin d'aide ? Offrez un jeton."}</p>
                            </div>

                            {/* Official Salon Donation Contract */}
                            <div className={`relative p-6 border-2 border-[#d4af37] bg-gradient-to-b from-[#1a1500] to-black flex flex-col transition-all group hover:shadow-[0_0_30px_rgba(212,175,55,0.2)]`}>
                                <div className="flex justify-between items-start mb-4">
                                    <span className="font-mono text-[10px] text-[#d4af37]">OFFICIAL QUEST</span>
                                    <span className="px-2 py-1 text-[10px] font-bold uppercase bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/50">
                                        EARN TOKENS
                                    </span>
                                </div>
                                
                                <h3 className="font-cinzel font-bold text-white text-xl mb-2">Donate Time to the Salon</h3>
                                
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-bold">S</div>
                                    <span className="text-xs text-neutral-400">Salon des Inconnus</span>
                                </div>

                                <p className="text-xs text-neutral-400 mb-6 font-lato">
                                    Help maintain the digital or physical space. Gardening, Coding, Cleaning, Organizing.
                                </p>

                                <div className="mt-auto pt-4 border-t border-[#d4af37]/20 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icons.Token />
                                        <span className="font-bold text-white text-sm">1 Token / hr</span>
                                    </div>
                                    
                                    <button 
                                        onClick={() => accessLevel === 'MEMBER' && setUserTokens(t => Math.min(100, t + 1))}
                                        className={`text-xs font-bold uppercase tracking-widest text-[#d4af37] hover:text-white`}
                                    >
                                        Accept Task →
                                    </button>
                                </div>
                            </div>

                            {contracts.map(c => (
                                <div key={c.id} className={`relative p-6 border bg-black/40 flex flex-col transition-all group hover:-translate-y-1 ${accessLevel === 'GUEST' ? 'border-white/10 opacity-60' : `${c.status === 'FULFILLED' ? 'border-green-900 opacity-80' : currentStyles.border} hover:shadow-lg`}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="font-mono text-[10px] text-neutral-500">CONTRACT #{c.id}</span>
                                        <div className="flex gap-2">
                                            {c.status === 'FULFILLED' ? (
                                                <span className="px-2 py-1 text-[10px] font-bold uppercase bg-green-900/30 text-green-400 border border-green-500/30">
                                                    FULFILLED
                                                </span>
                                            ) : (
                                                <span className={`px-2 py-1 text-[10px] font-bold uppercase ${c.type === 'HELP_WANTED' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' : 'bg-blue-900/30 text-blue-400 border border-blue-500/30'}`}>
                                                    {c.type === 'HELP_WANTED' ? 'HELP WANTED' : 'TIME TO SPARE'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <h3 className="font-cinzel font-bold text-white text-xl mb-2 group-hover:text-[#d4af37] transition-colors">{c.title}</h3>
                                    
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden border border-white/20">
                                            {c.requesterAvatar ? (
                                                <img src={c.requesterAvatar} alt={c.requester} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px]">?</div>
                                            )}
                                        </div>
                                        <span className="text-xs text-neutral-400">{c.requester}</span>
                                    </div>

                                    {/* Team Section */}
                                    <div className="mb-4 pt-4 border-t border-white/5">
                                        <p className="text-[9px] uppercase text-neutral-500 mb-2">Project Team</p>
                                        <div className="flex -space-x-2">
                                            {c.team.length > 0 ? c.team.map((avatar, i) => (
                                                <div key={i} className="w-6 h-6 rounded-full border border-black bg-neutral-800 overflow-hidden" title="Member">
                                                    <img src={avatar} alt="Member" className="w-full h-full object-cover" />
                                                </div>
                                            )) : (
                                                <span className="text-xs text-neutral-600 italic">No members yet.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <div className="flex gap-2 mb-4 flex-wrap">
                                            {c.tags.map(t => (
                                                <span key={t} className="text-[9px] uppercase border border-white/10 px-2 py-1 text-neutral-500">{t}</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                            <div className="flex items-center gap-2">
                                                <Icons.Token />
                                                <span className="font-bold text-white text-sm">{c.reward} Token{c.reward > 1 ? 's' : ''}</span>
                                            </div>
                                            
                                            {accessLevel === 'MEMBER' && c.status === 'OPEN' && (
                                                <>
                                                    {c.requester === regData.name ? (
                                                        <button 
                                                            onClick={() => handleFulfillContract(c.id)}
                                                            disabled={c.team.length === 0}
                                                            className={`text-xs font-bold uppercase tracking-widest ${c.team.length > 0 ? 'text-green-400 hover:text-green-300' : 'text-neutral-600 cursor-not-allowed'}`}
                                                        >
                                                            Mark Fulfilled
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleAcceptContract(c.id)}
                                                            className="text-xs font-bold uppercase tracking-widest text-[#d4af37] hover:text-white"
                                                        >
                                                            {c.team.some(avatar => avatar.includes('1534528741775')) ? 'Joined' : 'Accept Job →'}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>)}

                        {marketView === 'RESOURCES' && (<>
                            <div className={`p-8 mb-10 border ${currentStyles.border} bg-black/40 text-center relative overflow-hidden`}>
                                <div className="relative z-10">
                                    <h2 className={`text-3xl md:text-4xl mb-4 ${pageTitleClass}`}>
                                        {language === 'EN' ? "Resource Exchange" : "Échange de Ressources"}
                                    </h2>
                                    <p className="font-lato text-neutral-400 max-w-2xl mx-auto">
                                        {language === 'EN'
                                            ? "Cameras, lights, instruments, tools — list what you have, borrow what you need. Coordinated through direct contact."
                                            : "Caméras, éclairage, instruments, outils — liste ce que tu as, emprunte ce qu'il te faut. Le contact se fait en direct."}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {/* Add resource CTA */}
                                <button
                                    type="button"
                                    onClick={() => accessLevel === 'MEMBER' && setIsResourceModalOpen(true)}
                                    disabled={accessLevel !== 'MEMBER'}
                                    className={`border-2 border-dashed ${currentStyles.border} bg-transparent p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-all min-h-[220px] group ${accessLevel !== 'MEMBER' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                        <span className="text-2xl text-neutral-500 group-hover:text-white">+</span>
                                    </div>
                                    <h3 className="font-cinzel text-white text-base mb-1">{language === 'EN' ? "List a resource" : "Lister une ressource"}</h3>
                                    <p className="text-xs text-neutral-500">{language === 'EN' ? "Camera, mic, light, tool…" : "Caméra, micro, lumière, outil…"}</p>
                                </button>

                                {marketResources.length === 0 ? (
                                    <div className="md:col-span-2 lg:col-span-2 flex items-center justify-center min-h-[220px] border border-white/10 bg-black/30 rounded text-sm text-neutral-500 italic">
                                        {language === 'EN' ? 'No resources listed yet — be the first.' : 'Aucune ressource encore. Sois la première à en lister une.'}
                                    </div>
                                ) : marketResources.map(r => {
                                    const isMine = r.ownerUid === currentUser?.uid;
                                    return (
                                        <div key={r.id} className={`p-5 border bg-black/40 rounded flex flex-col ${currentStyles.border} ${r.available ? '' : 'opacity-60'}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 rounded bg-white/5 border border-white/10 text-neutral-300">
                                                    {r.category}
                                                </span>
                                                <span className={`text-[10px] font-cinzel uppercase tracking-widest px-2 py-1 rounded border ${r.available ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10' : 'border-rose-400/40 text-rose-200 bg-rose-500/10'}`}>
                                                    {r.available ? (language === 'EN' ? 'Available' : 'Disponible') : (language === 'EN' ? 'Unavailable' : 'Indispo.')}
                                                </span>
                                            </div>
                                            <h3 className="font-cinzel text-white text-lg mb-1">{r.title}</h3>
                                            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">{r.condition}</p>
                                            <p className="text-sm text-neutral-300 font-lato leading-relaxed mb-4 line-clamp-3">
                                                {r.description || (language === 'EN' ? 'No details provided.' : 'Aucun détail.')}
                                            </p>
                                            <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
                                                <span className="text-xs text-neutral-400 truncate">{r.ownerName}</span>
                                                {isMine ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => toggleResourceAvailability(r)}
                                                            className="text-[10px] font-cinzel uppercase tracking-widest text-neutral-400 hover:text-white border-b border-transparent hover:border-white/40"
                                                        >
                                                            {r.available ? (language === 'EN' ? 'Mark unavailable' : 'Marquer indispo.') : (language === 'EN' ? 'Mark available' : 'Marquer dispo.')}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteResource(r)}
                                                            className="text-[10px] font-cinzel uppercase tracking-widest text-rose-400 hover:text-rose-200"
                                                        >
                                                            {language === 'EN' ? 'Delete' : 'Supprimer'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    r.ownerEmail && (
                                                        <a
                                                            href={`mailto:${r.ownerEmail}?subject=${encodeURIComponent(`Salon · ${r.title}`)}`}
                                                            className="text-[11px] font-cinzel uppercase tracking-widest text-[#c5a059] hover:text-white"
                                                        >
                                                            {language === 'EN' ? 'Contact →' : 'Contacter →'}
                                                        </a>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>)}

                        {marketView === 'FOIRE' && (<>
                            <div className={`p-8 mb-10 border ${currentStyles.border} bg-black/40 text-center relative overflow-hidden`}>
                                <div className="relative z-10">
                                    <h2 className={`text-3xl md:text-4xl mb-4 ${pageTitleClass}`}>
                                        {language === 'EN' ? "The Foire" : "La Foire"}
                                    </h2>
                                    <p className="font-lato text-neutral-400 max-w-2xl mx-auto mb-6">
                                        {language === 'EN'
                                            ? "Resell your completed puzzles and skins to other members. Bids start at 1 coin. Sellers accept the top bid when ready."
                                            : "Revends tes casse-têtes complétés et tes skins à d'autres membres. Les enchères démarrent à 1 pièce. Le ou la vendeuse accepte la meilleure offre quand iel veut."}
                                    </p>
                                    <div className="flex justify-center gap-6 text-xs font-mono uppercase tracking-widest text-[#c5a059]">
                                        <span>{language === 'EN' ? '1 coin opening bid' : '1 pièce départ'}</span>
                                        <span>·</span>
                                        <span>{language === 'EN' ? 'Coins, not money' : 'Pièces, pas argent réel'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* "List from inventory" affordances */}
                            {accessLevel === 'MEMBER' && (
                                <div className="mb-8 p-5 border border-white/10 bg-black/30 rounded-lg">
                                    <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-3 font-cinzel">
                                        {language === 'EN' ? 'List from your inventory' : 'Vendre depuis ton inventaire'}
                                    </p>
                                    {(displayCase.length === 0 && purchasedSkins.length === 0) ? (
                                        <p className="text-sm text-neutral-500 italic">
                                            {language === 'EN' ? "You don't have any completed puzzles or owned skins yet." : "Tu n'as ni casse-têtes complétés ni skins possédés pour l'instant."}
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {displayCase.map((id, i) => {
                                                const art = PUZZLE_ARTWORKS.find(a => a.id === id);
                                                if (!art) return null;
                                                return (
                                                    <button
                                                        key={`puzzle-${id}-${i}`}
                                                        type="button"
                                                        onClick={() => setPuzzleSellChoiceIndex(i)}
                                                        className="flex items-center gap-2 px-3 py-2 border border-white/15 bg-black/40 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/5 rounded text-xs transition-all"
                                                        title={language === 'EN' ? 'Sell this puzzle' : 'Vendre ce casse-tête'}
                                                    >
                                                        <span className="w-6 h-6 rounded overflow-hidden border border-white/15 shrink-0">
                                                            <img src={art.src} alt="" className="w-full h-full object-cover" />
                                                        </span>
                                                        <span className="text-neutral-200 font-cinzel uppercase tracking-widest text-[10px]">
                                                            {language === 'FR' ? art.titleFr : art.titleEn}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                            {purchasedSkins.map(skinId => {
                                                const skin = SKINS.find(s => s.id === skinId);
                                                if (!skin) return null;
                                                return (
                                                    <button
                                                        key={`skin-${skinId}`}
                                                        type="button"
                                                        onClick={() => setListingSkinId(skinId)}
                                                        className="flex items-center gap-2 px-3 py-2 border border-white/15 bg-black/40 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/5 rounded text-xs transition-all"
                                                        title={language === 'EN' ? 'Sell this skin' : 'Vendre ce skin'}
                                                    >
                                                        <span className="w-6 h-6 rounded shrink-0" style={{ backgroundColor: skin.colorSwatch }} />
                                                        <span className="text-neutral-200 font-cinzel uppercase tracking-widest text-[10px]">{skin.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Listings grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {marketListings.length === 0 && (
                                    <div className="md:col-span-2 lg:col-span-3 flex items-center justify-center min-h-[200px] border border-white/10 bg-black/30 rounded text-sm text-neutral-500 italic">
                                        {language === 'EN' ? 'No active listings — be the first to put something on the block.' : 'Aucune annonce active — sois la première à mettre quelque chose en vente.'}
                                    </div>
                                )}
                                {marketListings.map(listing => {
                                    const isMine = listing.sellerUid === currentUser?.uid;
                                    const isMyBid = listing.currentBidderUid === currentUser?.uid;
                                    const minNextBid = listing.currentBid + 1;
                                    const draft = bidDrafts[listing.id] ?? '';
                                    const draftAmount = parseInt(draft) || 0;
                                    const canBid = !isMine && listing.status === 'active' && draftAmount >= minNextBid && coins >= draftAmount;
                                    return (
                                        <div key={listing.id} className={`relative p-5 border bg-black/40 rounded-lg flex flex-col ${currentStyles.border} ${listing.status !== 'active' ? 'opacity-70' : ''}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <span className="text-[10px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 rounded bg-white/5 border border-white/10 text-neutral-300">
                                                    {listing.kind === 'puzzle'
                                                        ? (language === 'EN' ? 'Puzzle' : 'Casse-tête')
                                                        : (language === 'EN' ? 'Skin' : 'Skin')}
                                                </span>
                                                <span className={`text-[10px] font-cinzel uppercase tracking-widest px-2 py-1 rounded border ${
                                                    listing.status === 'sold' ? 'border-emerald-400/40 text-emerald-200 bg-emerald-500/10'
                                                    : listing.status === 'cancelled' ? 'border-neutral-500/40 text-neutral-400 bg-neutral-500/10'
                                                    : 'border-fuchsia-400/40 text-fuchsia-100 bg-fuchsia-500/10'}`}>
                                                    {listing.status}
                                                </span>
                                            </div>

                                            {/* Image / swatch */}
                                            {listing.refImageUrl ? (
                                                <div className="aspect-[4/3] rounded overflow-hidden border border-white/10 mb-4">
                                                    <img src={listing.refImageUrl} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="aspect-[4/3] rounded mb-4 bg-gradient-to-br from-fuchsia-700 via-violet-700 to-cyan-700 flex items-center justify-center">
                                                    <span className="text-white/60 text-xs font-cinzel uppercase tracking-widest">SKIN</span>
                                                </div>
                                            )}

                                            <h3 className="font-cinzel text-white text-lg mb-1">{listing.refTitle}</h3>
                                            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3">
                                                {language === 'EN' ? 'by' : 'par'} {listing.sellerName}
                                            </p>

                                            <div className="border-t border-white/10 pt-3 mb-3 flex items-end justify-between">
                                                <div>
                                                    <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 mb-1">
                                                        {language === 'EN' ? 'Top bid' : 'Meilleure offre'}
                                                    </p>
                                                    <p className="text-2xl font-serif italic text-[#c5a059]">{listing.currentBid} <span className="text-xs text-neutral-400">{language === 'EN' ? 'coins' : 'pièces'}</span></p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 mb-1">{language === 'EN' ? 'bids' : 'offres'}</p>
                                                    <p className="text-base font-mono tabular-nums text-neutral-300">{listing.bidCount}</p>
                                                </div>
                                            </div>

                                            {listing.currentBidderName && (
                                                <p className={`text-[10px] uppercase tracking-widest mb-3 ${isMyBid ? 'text-emerald-300' : 'text-neutral-500'}`}>
                                                    {isMyBid
                                                        ? (language === 'EN' ? "You're the top bidder" : "Tu es en tête")
                                                        : (language === 'EN' ? `Top: ${listing.currentBidderName}` : `Meneur·e : ${listing.currentBidderName}`)}
                                                </p>
                                            )}

                                            {listing.status === 'active' && !isMine && accessLevel === 'MEMBER' && (
                                                <div className="mt-auto pt-3 border-t border-white/10 flex gap-2">
                                                    <input
                                                        type="number"
                                                        min={minNextBid}
                                                        value={draft}
                                                        onChange={(e) => setBidDrafts(prev => ({ ...prev, [listing.id]: e.target.value }))}
                                                        placeholder={`${minNextBid}+`}
                                                        className={`w-24 px-3 py-2 text-sm font-serif italic ${formStyles.input}`}
                                                    />
                                                    <button
                                                        onClick={() => placeBid(listing, draftAmount)}
                                                        disabled={!canBid || bidSubmitting === listing.id}
                                                        title={
                                                            draftAmount < minNextBid
                                                                ? (language === 'EN' ? `Bid must be at least ${minNextBid}` : `Offre minimale : ${minNextBid}`)
                                                                : coins < draftAmount
                                                                    ? (language === 'EN' ? `You only have ${coins} coins` : `Tu n'as que ${coins} pièces`)
                                                                    : ''
                                                        }
                                                        className={`flex-1 py-2 text-[11px] font-cinzel uppercase tracking-widest rounded transition-all ${canBid && bidSubmitting !== listing.id ? formStyles.submitOn : formStyles.submitOff}`}
                                                    >
                                                        {bidSubmitting === listing.id
                                                            ? (language === 'EN' ? 'Bidding…' : 'Enchère…')
                                                            : (language === 'EN' ? 'Place bid' : 'Enchérir')}
                                                    </button>
                                                </div>
                                            )}

                                            {listing.status === 'active' && isMine && (
                                                <div className="mt-auto pt-3 border-t border-white/10 flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            const ok = confirm(language === 'EN'
                                                                ? `Cancel this listing? The current bidder will be refunded and the item returns to your inventory.`
                                                                : "Annuler cette annonce ? La personne en tête sera remboursée et l'objet revient dans ton inventaire.");
                                                            if (ok) cancelListing(listing);
                                                        }}
                                                        className="flex-1 py-2 text-[11px] font-cinzel uppercase tracking-widest border border-rose-400/40 text-rose-200 hover:bg-rose-400/10 rounded transition-colors"
                                                    >
                                                        {language === 'EN' ? 'Cancel' : 'Annuler'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!listing.currentBidderUid) return;
                                                            const ok = confirm(language === 'EN'
                                                                ? `Accept ${listing.currentBid} coins from ${listing.currentBidderName}?`
                                                                : `Accepter ${listing.currentBid} pièces de ${listing.currentBidderName} ?`);
                                                            if (ok) acceptTopBid(listing);
                                                        }}
                                                        disabled={!listing.currentBidderUid}
                                                        className={`flex-1 py-2 text-[11px] font-cinzel uppercase tracking-widest rounded transition-all ${listing.currentBidderUid ? formStyles.submitOn : formStyles.submitOff}`}
                                                    >
                                                        {language === 'EN' ? 'Accept top bid' : 'Accepter'}
                                                    </button>
                                                </div>
                                            )}

                                            {listing.status === 'sold' && (
                                                <p className="mt-auto pt-3 border-t border-white/10 text-center text-xs text-emerald-300 font-cinzel uppercase tracking-widest">
                                                    ✓ {language === 'EN' ? `Sold for ${listing.currentBid}` : `Vendu pour ${listing.currentBid}`}
                                                </p>
                                            )}
                                            {listing.status === 'cancelled' && (
                                                <p className="mt-auto pt-3 border-t border-white/10 text-center text-xs text-neutral-500 font-cinzel uppercase tracking-widest">
                                                    {language === 'EN' ? 'Cancelled' : 'Annulé'}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>)}
                    </div>
                )}

                {/* STORE TAB */}
                {activeTab === 'STORE' && (
                    <div className="max-w-7xl mx-auto space-y-16">
                        
                        {/* Memberships */}
                        <section>
                            <div className="text-center mb-12">
                                <h2 className={`text-4xl mb-2 ${pageTitleClass}`}>{language === 'EN' ? "Membership Tiers" : "Niveaux d'Adhésion"}</h2>
                                <p className="text-neutral-500 text-sm uppercase tracking-widest">{language === 'EN' ? "Upgrade your creative arsenal" : "Améliorez votre arsenal créatif"}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { id: "INITIATE", name: "Initiate", price: "$4", period: "/ Month", features: ["Basic Profile", "Access to Market", "5% Shop Discount"] },
                                    { id: "ARTISAN", name: "Artisan", price: "$18", period: "/ Month", features: ["Enhanced Profile", "Priority Market Listing", "15% Shop Discount", "Access to Analytics"] },
                                    { id: "MAESTRO", name: "Maestro", price: "$48", period: "/ Month", features: ["Write Articles", "0% Commission", "VIP Event Access", "Dedicated Concierge", "25% Shop Discount"] }
                                ].map((tier, idx) => (
                                    <div key={idx} className={`relative bg-black/40 border p-8 flex flex-col items-center text-center transition-all group hover:-translate-y-2 ${idx === 1 ? 'border-[#d4af37] shadow-[0_0_30px_rgba(212,175,55,0.1)] scale-105 z-10' : 'border-white/10 hover:border-white/30'}`}>
                                        {idx === 1 && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4af37] text-black text-[10px] font-bold uppercase px-3 py-1 tracking-widest">Most Popular</div>}
                                        
                                        <h3 className="font-cinzel text-2xl text-white mb-2">{tier.name}</h3>
                                        <div className="flex items-baseline gap-1 mb-6">
                                            <span className="text-4xl font-bold text-white">{tier.price}</span>
                                            <span className="text-xs text-neutral-500">{tier.period}</span>
                                        </div>
                                        
                                        <ul className="space-y-3 mb-8 w-full">
                                            {tier.features.map((feat, i) => (
                                                <li key={i} className="text-xs text-neutral-300 font-lato flex items-center justify-center gap-2">
                                                    <span className="text-[#d4af37]">•</span> {feat}
                                                </li>
                                            ))}
                                        </ul>
                                        
                                        <HexButton 
                                            themeStyles={currentStyles} 
                                            onClick={() => handleUpgradeMembership(tier.id as MembershipTier)}
                                            className={`w-full ${idx === 1 ? 'border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black' : ''}`}
                                        >
                                            {membershipTier === tier.id ? 'Current Plan' : 'Subscribe'}
                                        </HexButton>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Invest Section */}
                        <section className="bg-gradient-to-r from-emerald-900/20 to-transparent p-8 border border-emerald-500/30 rounded-xl relative overflow-hidden">
                            <div className="flex items-center justify-between relative z-10">
                                <div>
                                    <h3 className="font-cinzel text-2xl text-emerald-400 mb-2">{language === 'EN' ? "Invest in the Platform" : "Investir dans la Plateforme"}</h3>
                                    <p className="text-neutral-400 text-sm max-w-lg">
                                        Help us develop more tools, secure better servers, and expand the physical residency space.
                                        Every investment grants <span className="text-white font-bold">10 Points</span>.
                                    </p>
                                </div>
                                <button 
                                    onClick={handleInvest}
                                    className="px-8 py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold uppercase tracking-widest text-xs rounded shadow-lg"
                                >
                                    Invest 100 Credits
                                </button>
                            </div>
                        </section>

                        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                        {/* Skins / Support */}
                        <section>
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h2 className={`text-3xl mb-1 ${pageTitleClass}`}>Platform Skins</h2>
                                    <p className="text-neutral-500 text-xs uppercase tracking-widest">Digital cosmetics & Level Rewards</p>
                                </div>
                                <div className="hidden md:block text-right">
                                    <span className="text-xs text-[#d4af37] font-bold border border-[#d4af37]/30 px-3 py-1 bg-[#d4af37]/10 uppercase">
                                        Current Goal: Server Upgrade (45%)
                                    </span>
                                </div>
                            </div>

                            <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-4">
                                {language === 'EN'
                                    ? 'Click any skin to preview it on your workspace. Preview reverts when you leave the Store.'
                                    : 'Cliquer sur un habillage pour le prévisualiser sur votre espace. La prévisualisation s’annule quand vous quittez le magasin.'}
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {SKINS.map((skin) => {
                                    const owned = purchasedSkins.includes(skin.id);
                                    const previewing = previewSkinId === skin.id;
                                    const locked = skin.minLevel > userLevel;
                                    const canBuyTokens = !owned && typeof skin.priceTokens === 'number' && !locked;
                                    const canBuyUSD = !owned && typeof skin.priceUSD === 'number' && !locked;
                                    const canBuyCoins = !owned && typeof skin.priceCoins === 'number' && !locked;
                                    const canClaim = !owned && skin.minLevel > 0 && skin.minLevel <= userLevel && !skin.priceTokens && !skin.priceUSD && !skin.priceCoins;
                                    const enoughTokens = canBuyTokens && userTokens >= (skin.priceTokens ?? Infinity);
                                    const enoughCoins = canBuyCoins && coins >= (skin.priceCoins ?? Infinity);
                                    return (
                                        <div
                                            key={skin.id}
                                            onClick={() => { if (!locked) setPreviewSkinId(previewing ? null : skin.id); }}
                                            className={`group relative p-4 rounded-xl border transition-all duration-300 overflow-visible cursor-pointer ${skin.style.bg} ${skin.style.border} ${locked ? 'opacity-50 grayscale cursor-not-allowed' : ''} ${previewing ? 'ring-2 ring-[#c5a059] shadow-[0_0_24px_rgba(197,160,89,0.35)]' : ''}`}
                                            title={locked ? '' : (previewing
                                                ? (language === 'EN' ? 'Click to clear preview' : 'Cliquer pour annuler')
                                                : (language === 'EN' ? 'Click to preview on your workspace' : 'Cliquer pour prévisualiser'))}
                                        >
                                            {/* Preview Popup */}
                                            <SkinVariancePreview skin={skin} />

                                            {/* Swatch tile */}
                                            <div
                                                className={`aspect-square mb-4 flex items-center justify-center border relative overflow-hidden rounded ${skin.style.border} bg-black/10`}
                                                style={{ backgroundColor: skin.colorSwatch }}
                                            >
                                                {locked && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                                        <div className="text-white text-xs font-bold text-center">
                                                            <Icons.Lock />
                                                            <span className="block mt-1">LVL {skin.minLevel}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {previewing && !locked && (
                                                    <div className="absolute top-1 left-1 px-2 py-0.5 bg-[#c5a059] text-black text-[9px] font-bold uppercase tracking-widest rounded">
                                                        {language === 'EN' ? 'Previewing' : 'Aperçu'}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className={`font-cinzel text-sm font-bold ${skin.style.text.split(' ')[0]}`}>{skin.name}</h4>
                                                    <p className={`text-[10px] ${skin.style.highlight} line-clamp-2`}>{skin.description}</p>
                                                </div>
                                            </div>

                                            {owned ? (
                                                <div className="w-full py-2 mt-2 bg-green-500/20 text-green-500 text-[10px] font-bold uppercase tracking-widest text-center border border-green-500/50 rounded">
                                                    {language === 'EN' ? 'Owned' : 'Acquis'}
                                                </div>
                                            ) : canClaim ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePurchaseSkin(skin.id, 'level'); }}
                                                    className={`w-full py-2 mt-2 bg-black/5 hover:bg-black/10 border ${skin.style.border} ${skin.style.text.split(' ')[0]} text-[10px] font-bold uppercase tracking-widest transition-all rounded`}
                                                >
                                                    {language === 'EN' ? 'Claim' : 'Réclamer'}
                                                </button>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-1.5 mt-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePurchaseSkin(skin.id, 'coins'); }}
                                                        disabled={!canBuyCoins || !enoughCoins}
                                                        title={canBuyCoins && !enoughCoins ? (language === 'EN' ? `Need ${skin.priceCoins} coins (you have ${coins})` : `Il faut ${skin.priceCoins} pièces (vous en avez ${coins})`) : ''}
                                                        className={`flex flex-col items-center justify-center gap-0.5 py-2 border ${skin.style.border} ${skin.style.text.split(' ')[0]} text-[10px] font-bold uppercase tracking-widest transition-all rounded ${canBuyCoins && enoughCoins ? 'bg-black/5 hover:bg-black/15' : 'opacity-40 cursor-not-allowed'}`}
                                                    >
                                                        <span>{skin.priceCoins ?? '—'}</span>
                                                        <span className="text-[8px] opacity-80">{language === 'EN' ? 'coins' : 'pièces'}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePurchaseSkin(skin.id, 'tokens'); }}
                                                        disabled={!canBuyTokens || !enoughTokens}
                                                        title={canBuyTokens && !enoughTokens ? (language === 'EN' ? `Need ${skin.priceTokens} tokens (you have ${userTokens})` : `Il faut ${skin.priceTokens} jetons (vous en avez ${userTokens})`) : ''}
                                                        className={`flex flex-col items-center justify-center gap-0.5 py-2 border ${skin.style.border} ${skin.style.text.split(' ')[0]} text-[10px] font-bold uppercase tracking-widest transition-all rounded ${canBuyTokens && enoughTokens ? 'bg-black/5 hover:bg-black/15' : 'opacity-40 cursor-not-allowed'}`}
                                                    >
                                                        <span>{skin.priceTokens ?? '—'}</span>
                                                        <span className="text-[8px] opacity-80">{language === 'EN' ? 'tokens' : 'jetons'}</span>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePurchaseSkin(skin.id, 'usd'); }}
                                                        disabled={!canBuyUSD}
                                                        className={`py-2 border ${skin.style.border} ${skin.style.text.split(' ')[0]} text-[10px] font-bold uppercase tracking-widest transition-all rounded ${canBuyUSD ? 'bg-black/5 hover:bg-black/15' : 'opacity-40 cursor-not-allowed'}`}
                                                    >
                                                        {typeof skin.priceUSD === 'number' ? `$${skin.priceUSD.toFixed(2)}` : '—'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                    </div>
                )}

                {/* CHAT — themed multi-room chat. Sidebar of 10 rooms (defined
                    in ChatRoom.tsx), Firestore-backed per-room subscriptions,
                    auth-gated posting, and theme-aware accents. */}
                {activeTab === 'CHAT' && (
                    <ChatRoom
                        language={language}
                        currentUser={currentUser}
                        displayName={regData.name}
                        avatarUrl={avatarUrl}
                        accessLevel={accessLevel}
                        theme={theme}
                        themeStyles={{ border: currentStyles.border, highlight: currentStyles.highlight }}
                        isAdmin={
                            currentUser?.email === 'houseoftherisingarts@gmail.com'
                            || currentUser?.email === 'alex@lesalondesinconnus.com'
                        }
                    />
                )}

                {/* Post Contract Modal — Time Exchange. Two contract types
                    (need help vs have time), with an inline cost preview. */}
                {isPostModalOpen && (() => {
                    const tokens = parseInt(newContractData.duration) || 0;
                    const isHelp = newContractData.type === 'HELP_WANTED';
                    return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                        <div className={`w-full max-w-2xl relative shadow-2xl max-h-[92vh] flex flex-col ${formStyles.container}`}>
                            <button
                                onClick={() => setIsPostModalOpen(false)}
                                aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 hover:bg-black flex items-center justify-center text-base"
                            >
                                ✕
                            </button>
                          <div className="overflow-y-auto custom-scrollbar p-6 md:p-8">
                            <FormEditorialHeader
                                kicker={language === 'EN' ? 'TIME EXCHANGE · CONTRACT' : 'ÉCHANGE DE TEMPS · CONTRAT'}
                                titleEn="Post a Contract"
                                titleFr="Publier un Contrat"
                                leadEn="One token equals one hour. Ask for what you need or offer what you have — the Salon brokers the trade."
                                leadFr="Un jeton équivaut à une heure. Demande ce dont tu as besoin ou offre ce que tu as — le Salon orchestre l'échange."
                            />

                            <div className="space-y-7">
                                {/* 01 — TYPE — visual cards */}
                                <section>
                                    <FormSectionHeader n="01" en="Contract type" fr="Type de contrat"
                                        helpEn="Are you the one asking, or the one offering?"
                                        helpFr="Tu demandes, ou tu offres ?" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setNewContractData({...newContractData, type: 'HELP_WANTED'})}
                                            aria-pressed={isHelp}
                                            className={`p-5 border-2 text-left transition-all rounded ${isHelp ? 'border-emerald-400 bg-emerald-500/15 text-white shadow-[0_0_18px_rgba(52,211,153,0.25)]' : 'border-white/10 text-neutral-400 hover:text-white hover:border-white/40 hover:bg-white/5'}`}
                                        >
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M12 22s7-4 7-10V5l-7-3-7 3v7c0 6 7 10 7 10Z"/><path d="M9 12l2 2 4-4"/></svg>
                                            <div className="font-cinzel uppercase tracking-widest text-sm mb-1">{language === 'EN' ? 'I need help' : "J'ai besoin d'aide"}</div>
                                            <p className="text-[11px] opacity-70 font-lato leading-snug normal-case tracking-normal">
                                                {language === 'EN' ? 'Ask another member to spend their hour on your project.' : "Demande à un·e membre de consacrer une heure à ton projet."}
                                            </p>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewContractData({...newContractData, type: 'TIME_TO_SPARE'})}
                                            aria-pressed={!isHelp}
                                            className={`p-5 border-2 text-left transition-all rounded ${!isHelp ? 'border-blue-400 bg-blue-500/15 text-white shadow-[0_0_18px_rgba(59,130,246,0.25)]' : 'border-white/10 text-neutral-400 hover:text-white hover:border-white/40 hover:bg-white/5'}`}
                                        >
                                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                                            <div className="font-cinzel uppercase tracking-widest text-sm mb-1">{language === 'EN' ? 'I have time' : "J'ai du temps"}</div>
                                            <p className="text-[11px] opacity-70 font-lato leading-snug normal-case tracking-normal">
                                                {language === 'EN' ? 'Offer your skill in exchange for tokens.' : "Offre ta compétence en échange de jetons."}
                                            </p>
                                        </button>
                                    </div>
                                </section>

                                {/* 02 — TITLE */}
                                <section>
                                    <FormSectionHeader n="02" en="Title" fr="Titre"
                                        helpEn="One sentence. What is the contract about?"
                                        helpFr="Une phrase. De quoi s'agit-il ?" />
                                    <input
                                        type="text"
                                        value={newContractData.title}
                                        onChange={(e) => setNewContractData({...newContractData, title: e.target.value})}
                                        className={`w-full p-3 ${formStyles.input}`}
                                        placeholder={language === 'EN' ? 'e.g. Logo design for a residency poster…' : "ex. Logo pour une affiche de résidence…"}
                                        autoFocus
                                    />
                                </section>

                                {/* 03 — DURATION + COST */}
                                <section>
                                    <FormSectionHeader n="03" en="Duration" fr="Durée"
                                        helpEn="One token = one hour. The cost preview updates live."
                                        helpFr="Un jeton = une heure. L'aperçu du coût se met à jour en temps réel." />
                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="number"
                                                min="1"
                                                value={newContractData.duration}
                                                onChange={(e) => setNewContractData({...newContractData, duration: e.target.value})}
                                                className={`w-28 p-3 text-center text-2xl font-serif italic ${formStyles.input}`}
                                            />
                                            <span className="text-xs uppercase tracking-widest text-neutral-500">{language === 'EN' ? 'hours' : 'heures'}</span>
                                        </div>
                                        <div className={`px-4 py-3 border-2 rounded ${tokens > 0 ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#f3e5ab]' : 'border-white/10 text-neutral-600'} text-sm font-cinzel uppercase tracking-widest flex items-center gap-2`}>
                                            <span className="font-serif italic text-2xl normal-case">{tokens}</span>
                                            <span>{language === 'EN' ? 'tokens' : 'jetons'}</span>
                                        </div>
                                    </div>
                                </section>

                                {/* 04 — TAGS */}
                                <section>
                                    <FormSectionHeader n="04" en="Tags" fr="Étiquettes"
                                        helpEn="Helps the right people find this."
                                        helpFr="Aide les bonnes personnes à trouver ce contrat." />
                                    <input
                                        type="text"
                                        value={newContractData.tagString}
                                        onChange={(e) => setNewContractData({...newContractData, tagString: e.target.value})}
                                        className={`w-full p-3 ${formStyles.input}`}
                                        placeholder={language === 'EN' ? 'design, illustration, code…' : 'design, illustration, code…'}
                                    />
                                </section>

                                {/* SUBMIT */}
                                <div className="pt-3">
                                    <button
                                        onClick={handlePostContract}
                                        disabled={!newContractData.title}
                                        title={!newContractData.title ? (language === 'EN' ? 'A title is required' : 'Le titre est requis') : ''}
                                        className={`group w-full flex items-center justify-center gap-3 py-4 text-base rounded transition-all ${newContractData.title ? formStyles.submitOn : formStyles.submitOff}`}
                                    >
                                        <span>{language === 'EN' ? 'Publish contract' : 'Publier le contrat'}</span>
                                        <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                                    </button>
                                </div>
                            </div>
                          </div>
                        </div>
                    </div>
                    );
                })()}

                {/* Article Editor Modal — BlockEditor-driven; supports cover
                    upload, multi-row layout, and request-to-publish. */}
                {/* ─── Resource creation modal (Marché → Ressources) ────── */}
                {isResourceModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
                         onClick={() => setIsResourceModalOpen(false)} role="dialog" aria-modal="true">
                        <div className={`relative w-full max-w-lg p-6 ${formStyles.container}`} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setIsResourceModalOpen(false)} aria-label={language === 'EN' ? 'Close' : 'Fermer'} className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base">✕</button>
                            <p className={`text-[10px] uppercase tracking-[0.4em] mb-1 ${formStyles.accentText}`}>
                                {language === 'EN' ? 'NEW RESOURCE' : 'NOUVELLE RESSOURCE'}
                            </p>
                            <h3 className={`text-2xl mb-5 ${pageTitleClass}`}>
                                {language === 'EN' ? 'List a resource' : 'Lister une ressource'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className={formStyles.label}>{language === 'EN' ? 'Title' : 'Titre'}</label>
                                    <input type="text" value={newResourceData.title} onChange={(e) => setNewResourceData({ ...newResourceData, title: e.target.value })} className={`w-full p-3 ${formStyles.input}`} placeholder={language === 'EN' ? 'e.g. Sony FX3 + 24-70mm…' : 'ex. Sony FX3 + 24-70mm…'} autoFocus />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={formStyles.label}>{language === 'EN' ? 'Category' : 'Catégorie'}</label>
                                        <select value={newResourceData.category} onChange={(e) => setNewResourceData({ ...newResourceData, category: e.target.value })} className={`w-full p-3 ${formStyles.input}`}>
                                            <option value="CAMERA" className="bg-black text-white">{language === 'EN' ? 'Camera' : 'Caméra'}</option>
                                            <option value="LENS" className="bg-black text-white">{language === 'EN' ? 'Lens' : 'Objectif'}</option>
                                            <option value="AUDIO" className="bg-black text-white">{language === 'EN' ? 'Audio' : 'Audio'}</option>
                                            <option value="LIGHT" className="bg-black text-white">{language === 'EN' ? 'Light' : 'Éclairage'}</option>
                                            <option value="INSTRUMENT" className="bg-black text-white">{language === 'EN' ? 'Instrument' : 'Instrument'}</option>
                                            <option value="TOOL" className="bg-black text-white">{language === 'EN' ? 'Tool' : 'Outil'}</option>
                                            <option value="SPACE" className="bg-black text-white">{language === 'EN' ? 'Space' : 'Espace'}</option>
                                            <option value="OTHER" className="bg-black text-white">{language === 'EN' ? 'Other' : 'Autre'}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={formStyles.label}>{language === 'EN' ? 'Condition' : 'État'}</label>
                                        <select value={newResourceData.condition} onChange={(e) => setNewResourceData({ ...newResourceData, condition: e.target.value })} className={`w-full p-3 ${formStyles.input}`}>
                                            <option value="NEW" className="bg-black text-white">{language === 'EN' ? 'New' : 'Neuf'}</option>
                                            <option value="GOOD" className="bg-black text-white">{language === 'EN' ? 'Good' : 'Bon'}</option>
                                            <option value="WORN" className="bg-black text-white">{language === 'EN' ? 'Worn' : 'Usé'}</option>
                                            <option value="FOR_PARTS" className="bg-black text-white">{language === 'EN' ? 'For parts' : 'Pour pièces'}</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className={formStyles.label}>{language === 'EN' ? 'Description' : 'Description'}</label>
                                    <textarea rows={4} value={newResourceData.description} onChange={(e) => setNewResourceData({ ...newResourceData, description: e.target.value })} className={`w-full p-3 ${formStyles.input}`} placeholder={language === 'EN' ? 'Lend / trade terms, accessories included, pickup location…' : "Conditions de prêt, accessoires inclus, lieu de récupération…"} />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button onClick={() => setIsResourceModalOpen(false)} className="px-4 py-2.5 border border-white/15 text-neutral-300 text-[10px] uppercase tracking-widest hover:bg-white/5 rounded">
                                        {language === 'EN' ? 'Cancel' : 'Annuler'}
                                    </button>
                                    <button onClick={createResource} disabled={!newResourceData.title.trim()} className={`px-5 py-2.5 text-[11px] uppercase tracking-widest rounded transition-all ${newResourceData.title.trim() ? formStyles.submitOn : formStyles.submitOff}`}>
                                        {language === 'EN' ? 'Publish resource' : 'Publier la ressource'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Skin → Foire confirm modal ─────────────────────── */}
                {listingSkinId !== null && (() => {
                    const skin = SKINS.find(s => s.id === listingSkinId);
                    if (!skin) return null;
                    return (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
                             onClick={() => setListingSkinId(null)} role="dialog" aria-modal="true">
                            <div className={`relative w-full max-w-md p-6 ${formStyles.container}`} onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => setListingSkinId(null)} aria-label={language === 'EN' ? 'Close' : 'Fermer'} className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base">✕</button>
                                <p className={`text-[10px] uppercase tracking-[0.4em] mb-1 ${formStyles.accentText}`}>
                                    {language === 'EN' ? 'LIST TO FOIRE' : 'METTRE EN VENTE'}
                                </p>
                                <h3 className={`text-2xl mb-3 ${pageTitleClass}`}>{skin.name}</h3>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="w-12 h-12 rounded border border-white/15" style={{ backgroundColor: skin.colorSwatch }} />
                                    <p className="text-xs text-neutral-400 leading-relaxed">{skin.description}</p>
                                </div>
                                <p className="text-xs text-neutral-400 leading-relaxed mb-5">
                                    {language === 'EN'
                                        ? 'Listing this skin opens an auction starting at 1 coin. The skin leaves your wardrobe until the listing closes — accept the top bid to seal the sale, or cancel to take it back.'
                                        : "Mettre ce skin en vente ouvre une enchère à partir de 1 pièce. Le skin quitte ta garde-robe jusqu'à la clôture — accepte la meilleure offre pour conclure, ou annule pour le récupérer."}
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setListingSkinId(null)} className="px-4 py-2.5 border border-white/15 text-neutral-300 text-[10px] uppercase tracking-widest hover:bg-white/5 rounded">
                                        {language === 'EN' ? 'Cancel' : 'Annuler'}
                                    </button>
                                    <button onClick={() => listSkinToFoire(listingSkinId)} className={`px-5 py-2.5 text-[11px] uppercase tracking-widest rounded transition-all ${formStyles.submitOn}`}>
                                        {language === 'EN' ? 'List to Foire' : 'Mettre en vente'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ─── Puzzle sell-path chooser ──────────────────────────
                    Asks the seller: instant 25-coin sell back to the platform,
                    or list to the Foire with a 1-coin opening bid (auction). */}
                {puzzleSellChoiceIndex !== null && (() => {
                    const idx = puzzleSellChoiceIndex;
                    const puzzleId = displayCase[idx];
                    if (!puzzleId) return null;
                    const art = PUZZLE_ARTWORKS.find(a => a.id === puzzleId);
                    if (!art) return null;
                    return (
                        <div
                            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
                            onClick={() => setPuzzleSellChoiceIndex(null)}
                            role="dialog"
                            aria-modal="true"
                        >
                            <div
                                className={`relative w-full max-w-2xl bg-[#0a0a0a] border ${currentStyles.border} rounded-lg p-6`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setPuzzleSellChoiceIndex(null)}
                                    aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base"
                                >✕</button>
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="shrink-0 w-16 h-16 rounded overflow-hidden border border-white/15">
                                        <img src={art.src} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-[0.4em] text-[#c5a059] mb-1">
                                            {language === 'EN' ? 'Choose sell path' : 'Choisir le mode de vente'}
                                        </p>
                                        <h3 className={`text-xl ${pageTitleClass}`}>
                                            {language === 'FR' ? art.titleFr : art.titleEn}
                                        </h3>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ok = confirm(language === 'EN'
                                                ? `Instant sell back to the platform for ${SELL_PUZZLE_COINS} coins?`
                                                : `Vente instantanée à la plateforme pour ${SELL_PUZZLE_COINS} pièces ?`);
                                            if (ok) sellPuzzleAt(idx);
                                        }}
                                        className="p-5 border-2 border-amber-400/40 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-300 rounded text-left transition-all"
                                    >
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200/80 mb-1 font-cinzel">{language === 'EN' ? 'Instant sale' : 'Vente instantanée'}</p>
                                        <p className="text-2xl font-serif italic text-amber-100 mb-1">+{SELL_PUZZLE_COINS} {language === 'EN' ? 'coins' : 'pièces'}</p>
                                        <p className="text-xs text-neutral-400 leading-relaxed">{language === 'EN' ? 'Sell back to the platform now. Coins land in your spendable balance immediately.' : "Revendre à la plateforme tout de suite. Les pièces arrivent dans ton solde dépensable immédiatement."}</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ok = confirm(language === 'EN'
                                                ? 'List on the Foire with a 1-coin opening bid? Other members can bid; you accept the top bid when you\'re ready.'
                                                : 'Mettre en vente à la Foire à partir de 1 pièce ? Les autres membres peuvent enchérir ; tu acceptes la meilleure offre quand tu veux.');
                                            if (ok) listPuzzleToFoire(idx);
                                        }}
                                        className="p-5 border-2 border-fuchsia-400/40 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 hover:border-fuchsia-300 rounded text-left transition-all"
                                    >
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-200/80 mb-1 font-cinzel">{language === 'EN' ? 'Foire (auction)' : 'Foire (enchère)'}</p>
                                        <p className="text-2xl font-serif italic text-fuchsia-100 mb-1">{language === 'EN' ? 'starts at 1 coin' : "départ : 1 pièce"}</p>
                                        <p className="text-xs text-neutral-400 leading-relaxed">{language === 'EN' ? 'Members bid up. Accept the top bid whenever you like — or cancel to take it back.' : "Les membres enchérissent. Tu acceptes la meilleure offre quand tu veux — ou tu annules pour le récupérer."}</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ─── Roster claim modal ─────────────────────────────────
                    Asks for the shared password Alex has handed out to the
                    real artists. On success, the claim is recorded in
                    Firestore (rule prevents any further re-claim) and the
                    user's profile is seeded from the roster entry — but only
                    for fields they haven't already filled themselves. */}
                {claimingArtistId !== null && (() => {
                    const artist = ARTISTS_ROSTER.find(a => a.id === claimingArtistId);
                    if (!artist) return null;
                    return (
                        <div
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
                            onClick={() => { setClaimingArtistId(null); setClaimPassword(''); setClaimError(null); }}
                            role="dialog"
                            aria-modal="true"
                            aria-label={language === 'EN' ? 'Claim profile' : 'Réclamer le profil'}
                        >
                            <div
                                className={`relative w-full max-w-md bg-[#0a0a0a] border ${currentStyles.border} rounded-lg p-6`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => { setClaimingArtistId(null); setClaimPassword(''); setClaimError(null); }}
                                    aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base"
                                >
                                    ✕
                                </button>

                                <div className="flex items-center gap-4 mb-5">
                                    <div className="shrink-0 w-16 h-16 rounded-full overflow-hidden border border-white/15">
                                        <img src={artist.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-200/80 mb-1">
                                            {language === 'EN' ? 'Claim profile' : 'Réclamer le profil'}
                                        </p>
                                        <h3 className="font-cinzel text-xl text-white truncate">{artist.name}</h3>
                                        <p className="text-xs text-neutral-500 font-mono uppercase truncate">{artist.class}</p>
                                    </div>
                                </div>

                                <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                                    {language === 'EN'
                                        ? 'Enter the password Alex shared with you. On success, this profile becomes yours: your name, bio, skills, photo, and gallery will be seeded from the curated roster (only for fields you haven\'t already filled in).'
                                        : "Saisis le mot de passe partagé par Alex. En cas de succès, ce profil devient le tien : ton nom, ta bio, tes compétences, ta photo et ta galerie seront repris du répertoire (seulement pour les champs encore vides)."}
                                </p>

                                <label className="block text-[10px] font-cinzel uppercase tracking-[0.3em] text-neutral-500 mb-2">
                                    {language === 'EN' ? 'Password' : 'Mot de passe'}
                                </label>
                                <input
                                    type="password"
                                    autoComplete="off"
                                    value={claimPassword}
                                    onChange={(e) => { setClaimPassword(e.target.value); setClaimError(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' && !claimSubmitting) claimRosterArtist(); }}
                                    placeholder="••••••••••"
                                    className="w-full p-3 bg-black/60 border border-white/15 text-white focus:border-fuchsia-400 outline-none rounded"
                                    autoFocus
                                />

                                {claimError && (
                                    <p
                                        className="mt-3 text-xs text-rose-300 bg-rose-900/20 border border-rose-500/30 px-3 py-2 rounded"
                                        role="alert"
                                        aria-live="polite"
                                    >
                                        {claimError}
                                    </p>
                                )}

                                <div className="mt-5 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => { setClaimingArtistId(null); setClaimPassword(''); setClaimError(null); }}
                                        className="px-4 py-2 text-[10px] font-cinzel uppercase tracking-widest border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 rounded"
                                    >
                                        {language === 'EN' ? 'Cancel' : 'Annuler'}
                                    </button>
                                    <button
                                        onClick={() => claimRosterArtist()}
                                        disabled={claimSubmitting || !claimPassword}
                                        className="px-4 py-2 text-[11px] font-cinzel uppercase tracking-widest border border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20 hover:border-fuchsia-300 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {claimSubmitting
                                            ? (language === 'EN' ? 'Claiming…' : 'Réclamation…')
                                            : (language === 'EN' ? 'Claim profile' : 'Réclamer le profil')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ─── Featured artwork picker ─────────────────────────────
                    Opens from the "Ajouter une œuvre" / "Change" buttons in
                    the profile's featured slot. Shows the user's uploaded
                    roster as thumbnails — clicking one promotes it to the
                    featured slot — plus an upload-new affordance. */}
                {isFeaturedPickerOpen && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
                        onClick={() => setIsFeaturedPickerOpen(false)}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div
                            className={`relative w-full max-w-3xl bg-[#0a0a0a] border ${currentStyles.border} rounded-lg p-6 max-h-[85vh] flex flex-col`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsFeaturedPickerOpen(false)}
                                aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base"
                            >
                                ✕
                            </button>
                            <div className="mb-1">
                                <p className="text-[10px] uppercase tracking-[0.4em] text-[#c5a059] mb-1">
                                    {language === 'EN' ? 'Featured artwork' : 'Œuvre en vedette'}
                                </p>
                                <h3 className={`text-2xl ${pageTitleClass}`}>
                                    {language === 'EN' ? 'Pick from your roster' : 'Choisis dans ton répertoire'}
                                </h3>
                                <p className="text-xs text-neutral-400 mt-2 max-w-md">
                                    {language === 'EN'
                                        ? 'The piece you pick becomes the main artwork on your profile. Upload a new image to add it to the roster and feature it instantly.'
                                        : "La pièce choisie devient l'œuvre principale sur ton profil. Téléverse une nouvelle image pour l'ajouter au répertoire et la mettre en vedette."}
                                </p>
                            </div>

                            {/* Roster grid */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar mt-5 -mx-2 px-2">
                                {galleryUrls.length === 0 ? (
                                    <div className="border border-white/10 bg-black/40 p-10 text-center rounded">
                                        <p className="text-sm text-neutral-400 italic mb-2">
                                            {language === 'EN'
                                                ? 'No works in your roster yet.'
                                                : 'Aucune œuvre dans ton répertoire pour le moment.'}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-widest text-neutral-600">
                                            {language === 'EN' ? 'Upload your first piece below.' : 'Téléverse ta première pièce ci-dessous.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {galleryUrls.map((url, i) => {
                                            const isFeatured = (featuredArtworkUrl ?? galleryUrls[0]) === url;
                                            return (
                                                <button
                                                    type="button"
                                                    key={url + i}
                                                    onClick={() => { setFeaturedArtwork(url); setIsFeaturedPickerOpen(false); }}
                                                    className={`relative group aspect-square overflow-hidden rounded-md border-2 transition-all focus:outline-none ${
                                                        isFeatured
                                                            ? 'border-[#c5a059] shadow-[0_0_20px_rgba(197,160,89,0.45)]'
                                                            : 'border-white/10 hover:border-white/40 hover:shadow-[0_0_18px_rgba(255,255,255,0.15)]'
                                                    }`}
                                                    aria-pressed={isFeatured}
                                                    title={isFeatured
                                                        ? (language === 'EN' ? 'Currently featured' : 'En vedette actuellement')
                                                        : (language === 'EN' ? 'Set as featured' : 'Mettre en vedette')}
                                                >
                                                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                    {isFeatured && (
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-start p-2">
                                                            <span className="text-[9px] font-cinzel uppercase tracking-[0.3em] px-2 py-1 bg-[#c5a059] text-black rounded">
                                                                ★ {language === 'EN' ? 'Featured' : 'En vedette'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {!isFeatured && (
                                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity">
                                                            <span className="text-[10px] font-cinzel uppercase tracking-widest text-white border border-white/40 px-3 py-1.5 rounded">
                                                                ★ {language === 'EN' ? 'Feature' : 'Mettre en vedette'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Upload new + clear-featured actions */}
                            <div className={`mt-5 pt-4 border-t ${currentStyles.border} flex flex-col sm:flex-row gap-2 sm:items-center`}>
                                <button
                                    onClick={() => galleryInputRef.current?.click()}
                                    className="flex-1 px-4 py-2.5 text-[11px] font-cinzel uppercase tracking-widest border border-fuchsia-400/50 text-fuchsia-200 hover:bg-fuchsia-400/10 hover:border-fuchsia-300 rounded transition-colors flex items-center justify-center gap-2"
                                >
                                    <span className="text-base leading-none">＋</span>
                                    {language === 'EN' ? 'Upload a new piece' : 'Téléverser une nouvelle pièce'}
                                </button>
                                {featuredArtworkUrl && (
                                    <button
                                        onClick={() => { setFeaturedArtwork(null); }}
                                        className="px-4 py-2.5 text-[10px] font-cinzel uppercase tracking-widest border border-white/15 text-neutral-400 hover:text-white hover:border-white/40 rounded transition-colors"
                                    >
                                        {language === 'EN' ? 'Clear featured' : 'Retirer la vedette'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Puzzle fullscreen viewer ───────────────────────────
                    Opens when the user clicks a card in the Display Case.
                    Hosts the Sell-for-25 and Gift actions. Click outside or
                    press the X to dismiss. */}
                {viewingPuzzleIndex !== null && (() => {
                    const puzzleId = displayCase[viewingPuzzleIndex];
                    if (!puzzleId) return null;
                    const art = PUZZLE_ARTWORKS.find(a => a.id === puzzleId);
                    if (!art) return null;
                    return (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-md animate-fadeIn"
                            onClick={() => setViewingPuzzleIndex(null)}
                            role="dialog"
                            aria-modal="true"
                            aria-label={language === 'FR' ? art.titleFr : art.titleEn}
                        >
                            <div
                                className={`relative w-full max-w-5xl max-h-[92vh] flex flex-col ${currentStyles.border} bg-[#050505] border rounded-lg overflow-hidden`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Pinned close */}
                                <button
                                    onClick={() => setViewingPuzzleIndex(null)}
                                    aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                    className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/70 border border-white/20 text-neutral-300 hover:text-white hover:border-white/50 hover:bg-black flex items-center justify-center text-base"
                                >
                                    ✕
                                </button>

                                {/* Artwork */}
                                <div className="flex-1 flex items-center justify-center bg-black overflow-hidden p-4">
                                    <img
                                        src={art.src}
                                        alt={language === 'FR' ? art.titleFr : art.titleEn}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>

                                {/* Title + actions */}
                                <div className={`p-5 md:p-6 border-t ${currentStyles.border} bg-[#080808] flex flex-col md:flex-row md:items-center gap-4`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-mono uppercase tracking-[0.4em] text-neutral-500 mb-1">
                                            {language === 'EN' ? 'Display case · #' : 'Vitrine · n°'}{viewingPuzzleIndex + 1}
                                        </p>
                                        <h3 className={`text-2xl md:text-3xl ${pageTitleClass}`}>
                                            {language === 'FR' ? art.titleFr : art.titleEn}
                                        </h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setPuzzleSellChoiceIndex(viewingPuzzleIndex)}
                                            className="px-4 py-2.5 text-[11px] font-cinzel uppercase tracking-widest border border-amber-400/50 text-amber-200 hover:bg-amber-400/10 hover:border-amber-300 rounded transition-colors"
                                        >
                                            {language === 'EN' ? 'Sell…' : 'Revendre…'}
                                        </button>
                                        <button
                                            onClick={() => setGiftingPuzzleIndex(viewingPuzzleIndex)}
                                            className="px-4 py-2.5 text-[11px] font-cinzel uppercase tracking-widest border border-fuchsia-400/50 text-fuchsia-200 hover:bg-fuchsia-400/10 hover:border-fuchsia-300 rounded transition-colors"
                                        >
                                            {language === 'EN' ? 'Gift to a member' : 'Offrir à un·e membre'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ─── Puzzle gift picker ─────────────────────────────────
                    Recipient is chosen from the user's accepted friend list.
                    If no friends, prompts the user to add one first. */}
                {giftingPuzzleIndex !== null && (() => {
                    const puzzleId = displayCase[giftingPuzzleIndex];
                    if (!puzzleId) return null;
                    const art = PUZZLE_ARTWORKS.find(a => a.id === puzzleId);
                    const acceptedFriends = friendships.filter(f => f.status === 'accepted');
                    return (
                        <div
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
                            onClick={() => setGiftingPuzzleIndex(null)}
                            role="dialog"
                            aria-modal="true"
                        >
                            <div
                                className={`relative w-full max-w-md bg-[#0a0a0a] border ${currentStyles.border} rounded-lg p-6 max-h-[80vh] flex flex-col`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setGiftingPuzzleIndex(null)}
                                    aria-label={language === 'EN' ? 'Close' : 'Fermer'}
                                    className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 flex items-center justify-center text-base"
                                >
                                    ✕
                                </button>
                                <h3 className="font-cinzel text-white text-lg mb-1">
                                    {language === 'EN' ? 'Gift this puzzle' : 'Offrir ce casse-tête'}
                                </h3>
                                <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-200/80 mb-4">
                                    {art ? (language === 'FR' ? art.titleFr : art.titleEn) : ''}
                                </p>
                                <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
                                    {language === 'EN'
                                        ? 'Pick a friend below. They\'ll receive a pending offer — if they decline, the puzzle returns to you automatically.'
                                        : "Choisis un·e ami·e ci-dessous. Il·elle recevra une offre — si refusée, le casse-tête te revient automatiquement."}
                                </p>

                                {acceptedFriends.length === 0 ? (
                                    <div className="border border-white/10 bg-black/40 p-6 text-center rounded">
                                        <p className="text-sm text-neutral-400 italic mb-3">
                                            {language === 'EN'
                                                ? 'You have no friends to gift to yet.'
                                                : "Tu n'as encore aucun·e ami·e à qui offrir."}
                                        </p>
                                        <p className="text-[10px] uppercase tracking-widest text-neutral-600">
                                            {language === 'EN'
                                                ? 'Add friends from the Roster to enable gifting.'
                                                : "Ajoute des ami·es depuis le Registre pour activer les cadeaux."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 space-y-1.5">
                                        {acceptedFriends.map(f => {
                                            const otherUid = f.uids.find(u => u !== currentUser?.uid) || '';
                                            const profile = f.profiles?.[otherUid];
                                            const name = profile?.displayName || otherUid.slice(0, 8);
                                            return (
                                                <button
                                                    type="button"
                                                    key={f.id}
                                                    onClick={() => giftPuzzleAt(giftingPuzzleIndex, otherUid, name)}
                                                    className="w-full flex items-center gap-3 p-3 bg-black/40 border border-white/10 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/5 transition-all rounded text-left"
                                                >
                                                    <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-fuchsia-700 to-cyan-700 flex items-center justify-center text-xs font-bold text-white/80">
                                                        {profile?.photoURL ? (
                                                            <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            name[0]?.toUpperCase() || '?'
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-cinzel text-white truncate">{name}</p>
                                                        <p className="text-[10px] uppercase tracking-widest text-neutral-500">
                                                            {language === 'EN' ? 'Send →' : 'Envoyer →'}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {isWritingModalOpen && (() => {
                    const isEditing = !!editingArticle;
                    const status = editingArticle?.publishStatus;
                    const statusLabel = status === 'public'
                        ? (language === 'EN' ? 'PUBLIC · EDIT CREATES NEW VERSION' : 'PUBLIC · MODIFIE = NOUVELLE VERSION')
                        : status === 'requested'
                            ? (language === 'EN' ? 'AWAITING REVIEW' : 'EN ATTENTE')
                            : (language === 'EN' ? 'DRAFT · PRIVATE' : 'BROUILLON · PRIVÉ');
                    const statusTone = status === 'public' ? 'text-emerald-300'
                        : status === 'requested' ? 'text-amber-300'
                        : 'text-neutral-400';
                    return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
                        <div className={`w-full max-w-4xl relative shadow-2xl max-h-[92vh] flex flex-col ${formStyles.container}`}>
                            {/* Pinned close — sits outside the scrollable body so it's
                                always reachable, even when the article is long. */}
                            <button
                                onClick={() => setIsWritingModalOpen(false)}
                                aria-label={language === 'EN' ? 'Close editor' : 'Fermer l\'éditeur'}
                                className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/60 border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 hover:bg-black flex items-center justify-center text-base"
                            >
                                ✕
                            </button>
                          <div className="overflow-y-auto custom-scrollbar p-6 md:p-10">
                            <FormEditorialHeader
                                kicker={language === 'EN' ? 'SALON PRESS · ARTICLE' : 'PRESSE DU SALON · ARTICLE'}
                                titleEn={isEditing ? 'Edit article' : 'New article'}
                                titleFr={isEditing ? "Éditer l'article" : 'Nouvel article'}
                                leadEn="Write something worth reading. The Salon publishes pieces that frame intent, name the medium, and trust the reader."
                                leadFr="Écris quelque chose qui vaut la lecture. Le Salon publie des textes qui cadrent l'intention, nomment le médium, et font confiance au lectorat."
                                n={isEditing && (editingArticle as any)?.id ? `№ ${String((editingArticle as any).id).slice(-4).toUpperCase()}` : undefined}
                            />

                            <div className="space-y-8">
                                {/* 01 — COVER */}
                                <section>
                                    <FormSectionHeader n="01" en="Cover" fr="Couverture"
                                        helpEn="Sets the tone before the first sentence."
                                        helpFr="Donne le ton avant la première phrase." />
                                    <div className={`relative h-48 rounded-lg overflow-hidden flex items-center justify-center bg-black/40 border-2 border-dashed ${theme === 'COMIC' ? 'border-black' : 'border-white/15'}`}>
                                        {draftArticle.coverUrl && (
                                            <img src={draftArticle.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                                        )}
                                        <div className="relative z-10 flex items-center gap-3 bg-black/70 backdrop-blur-md rounded px-4 py-2 border border-white/15">
                                            <label className={`cursor-pointer text-xs uppercase tracking-widest font-cinzel transition-colors ${formStyles.accentText} hover:text-white`}>
                                                {coverUploading ? (language === 'EN' ? 'Uploading…' : 'Téléversement…') : draftArticle.coverUrl ? (language === 'EN' ? 'Replace' : 'Remplacer') : (language === 'EN' ? '＋ Upload cover' : "＋ Téléverser")}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    disabled={coverUploading}
                                                    className="hidden"
                                                    onChange={async (e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) {
                                                            const url = await uploadArticleCover(f);
                                                            if (url) setDraftArticle(prev => ({ ...prev, coverUrl: url }));
                                                        }
                                                        e.target.value = '';
                                                    }}
                                                />
                                            </label>
                                            {draftArticle.coverUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDraftArticle(prev => ({ ...prev, coverUrl: '' }))}
                                                    className="text-rose-300 hover:text-rose-200 text-xs uppercase tracking-widest font-cinzel"
                                                >
                                                    {language === 'EN' ? 'Remove' : 'Retirer'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* 02 — TITLE & CATEGORY */}
                                <section>
                                    <FormSectionHeader n="02" en="Headline" fr="Manchette"
                                        helpEn="The line readers will see first — and the category that frames it."
                                        helpFr="La ligne que le lectorat verra en premier — et la catégorie qui la cadre." />
                                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                                        <input
                                            type="text"
                                            value={draftArticle.title}
                                            onChange={(e) => setDraftArticle(prev => ({ ...prev, title: e.target.value }))}
                                            placeholder={language === 'EN' ? 'Title…' : 'Titre…'}
                                            className={`w-full bg-transparent border-b-2 ${theme === 'COMIC' ? 'border-black focus:border-[#facc15]' : 'border-white/15 focus:border-[#c5a059]'} text-white text-3xl font-cinzel py-2 outline-none placeholder-neutral-700`}
                                            autoFocus
                                        />
                                        <select
                                            value={draftArticle.category}
                                            onChange={(e) => setDraftArticle(prev => ({ ...prev, category: e.target.value }))}
                                            className={`px-3 py-3 ${formStyles.input}`}
                                        >
                                            <option value="VISUAL" className="bg-black text-white">{language === 'EN' ? 'Visual' : 'Visuel'}</option>
                                            <option value="AUDIO" className="bg-black text-white">Audio</option>
                                            <option value="DIGITAL" className="bg-black text-white">{language === 'EN' ? 'Digital' : 'Numérique'}</option>
                                            <option value="DESIGN" className="bg-black text-white">Design</option>
                                            <option value="CORE" className="bg-black text-white">Core</option>
                                            <option value="FUTURE" className="bg-black text-white">{language === 'EN' ? 'Future' : 'Futur'}</option>
                                            <option value="ESSAY" className="bg-black text-white">{language === 'EN' ? 'Essay' : 'Essai'}</option>
                                        </select>
                                    </div>
                                </section>

                                {/* 03 — TAGS */}
                                <section>
                                    <FormSectionHeader n="03" en="Tags" fr="Étiquettes"
                                        helpEn="A few — for discovery, not SEO bait."
                                        helpFr="Quelques-unes — pour la découverte, pas pour le SEO." />
                                    <input
                                        type="text"
                                        value={draftArticle.tags}
                                        onChange={(e) => setDraftArticle(prev => ({ ...prev, tags: e.target.value }))}
                                        placeholder={language === 'EN' ? 'comma, separated, like, this' : 'séparées, par, virgules'}
                                        className={`w-full p-3 ${formStyles.input}`}
                                    />
                                </section>

                                {/* 04 — BODY */}
                                <section>
                                    <FormSectionHeader n="04" en="Body" fr="Corps de l'article"
                                        helpEn="Write in blocks. Drop images. Move things around. Markdown for emphasis (**bold**, _italic_)."
                                        helpFr="Écris en blocs. Déposez des images. Réorganisez. Markdown pour l'emphase (**gras**, _italique_)." />
                                    <BlockEditor
                                        value={draftArticle.blocks}
                                        onChange={(next) => setDraftArticle(prev => ({ ...prev, blocks: next }))}
                                        uid={currentUser?.uid ?? null}
                                        mediaLibrary={galleryUrls}
                                        language={language}
                                    />
                                </section>

                                {/* Footer actions — status badge + cancel/save/publish.
                                    Publish bonus is +10 coins on first approval (handled
                                    server-side via the article snapshot effect). */}
                                <div className={`flex flex-col sm:flex-row items-center gap-3 pt-5 border-t ${theme === 'COMIC' ? 'border-black border-t-2' : 'border-white/10'}`}>
                                    <span className={`text-[10px] uppercase tracking-[0.3em] font-mono mr-auto ${statusTone}`}>
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${status === 'public' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : status === 'requested' ? 'bg-amber-400' : 'bg-neutral-500'}`} />
                                        {statusLabel}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setIsWritingModalOpen(false)}
                                        className="px-4 py-2.5 border border-white/15 text-neutral-300 text-[10px] uppercase tracking-widest hover:bg-white/5 rounded"
                                    >
                                        {language === 'EN' ? 'Cancel' : 'Annuler'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSaveArticleDraft(false)}
                                        disabled={articleSaving || !draftArticle.title.trim()}
                                        className="px-4 py-2.5 border border-white/30 text-white text-[10px] uppercase tracking-widest font-cinzel hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed rounded"
                                    >
                                        {articleSaving ? '…' : (language === 'EN' ? 'Save draft' : 'Sauvegarder')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSaveArticleDraft(true)}
                                        disabled={articleSaving || !draftArticle.title.trim()}
                                        className={`group flex items-center gap-2 px-5 py-2.5 text-[11px] uppercase tracking-widest rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed ${formStyles.submitOn}`}
                                    >
                                        <span>{articleSaving ? '…' : (language === 'EN' ? 'Request to publish' : 'Demander la publication')}</span>
                                        <span className="inline-block transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                                    </button>
                                </div>
                            </div>
                          </div>
                        </div>
                    </div>
                    );
                })()}
            </div>
        </div>
    );
};
