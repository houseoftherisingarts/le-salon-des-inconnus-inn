// themes.ts : le registre des thèmes d'espace (docs/ESPACES-DESIGN.md, section 2).
//
// Chaque famille de gabarit déclare ses palettes et ses paires de polices.
// resoudreTheme() transforme le choix de l'atelier (config.theme) en
// variables CSS --es-*, que EspaceRacine pose sur la racine du gabarit :
// aucune section n'écrit plus de couleur en dur, elles lisent ces jetons.
//
// La palette et la paire « salon » reproduisent le canon d'avant le moteur
// (Prata, Cinzel, Lato, or #c5a059, crème #f3e5ab, noir #050505), pour
// qu'un profil existant qui n'a jamais choisi de thème rende à l'identique.
// Peintre et Photographe portent leurs palettes et paires de la section 6
// du document; Écrivain n'a encore que « salon ». Le document ne donne que
// le fond, l'encre et l'accent : le fond 2 est ce fond décalé d'un cran.

import type { FamilleGabarit } from './artistes';
import type { ThemeEspace } from './types';

export interface PaletteEspace {
    id: string;
    nom: string;
    sombre: boolean;
    bg: string;
    bg2: string;
    ink: string;
    accent: string;
}

export interface PaireFonts {
    id: string;
    nom: string;
    display: string;
    label: string;
    body: string;
    poidsDisplay: number;
    poidsLabel: number;
    /** Le paramètre `family=` de Google Fonts, sans le préfixe. */
    google: string;
}

const PALETTE_SALON: PaletteEspace = {
    id: 'salon', nom: 'Salon', sombre: true, bg: '#050505', bg2: '#0f0d0a', ink: '#f3e5ab', accent: '#c5a059',
};

const PAIRE_SALON: PaireFonts = {
    id: 'salon', nom: 'Salon', display: "'Prata', serif", label: "'Cinzel', serif", body: "'Lato', sans-serif",
    poidsDisplay: 400, poidsLabel: 400, google: 'family=Prata&family=Cinzel:wght@400;700&family=Lato:wght@300;400;700',
};

const PALETTES_MUSICIEN: PaletteEspace[] = [
    PALETTE_SALON,
    { id: 'scene', nom: 'Scène', sombre: true, bg: '#07070b', bg2: '#111118', ink: '#f5f5f5', accent: '#ff5c39' },
    { id: 'neon', nom: 'Néon', sombre: true, bg: '#050507', bg2: '#0d0d16', ink: '#eef0ff', accent: '#19e6d2' },
    { id: 'bois', nom: 'Bois', sombre: true, bg: '#1b1410', bg2: '#261c16', ink: '#f1e6d2', accent: '#d9a05b' },
    { id: 'vinyle', nom: 'Vinyle', sombre: false, bg: '#f2ebdf', bg2: '#e9dfcd', ink: '#161412', accent: '#b8312f' },
    { id: 'brume', nom: 'Brume', sombre: false, bg: '#eef1f4', bg2: '#e2e7ec', ink: '#14181d', accent: '#2f6f8f' },
];

const PAIRES_MUSICIEN: PaireFonts[] = [
    PAIRE_SALON,
    {
        id: 'affiche', nom: 'Affiche', display: "'Anton', sans-serif", label: "'Outfit', sans-serif", body: "'Outfit', sans-serif",
        poidsDisplay: 400, poidsLabel: 600, google: 'family=Anton&family=Outfit:wght@300;400;600',
    },
    {
        id: 'chaleur', nom: 'Chaleur', display: "'Fraunces', serif", label: "'Manrope', sans-serif", body: "'Manrope', sans-serif",
        poidsDisplay: 500, poidsLabel: 600, google: 'family=Fraunces:wght@500&family=Manrope:wght@400;600',
    },
];

const PALETTES_PEINTRE: PaletteEspace[] = [
    PALETTE_SALON,
    { id: 'galerie', nom: 'Galerie', sombre: false, bg: '#f7f4ee', bg2: '#eeeae1', ink: '#1a1815', accent: '#1a1815' },
    { id: 'lin', nom: 'Lin', sombre: false, bg: '#efe9dd', bg2: '#e5ddcd', ink: '#2b2520', accent: '#8c5a3c' },
    { id: 'ardoise', nom: 'Ardoise', sombre: true, bg: '#101214', bg2: '#181b1e', ink: '#ecebe6', accent: '#d9c6a2' },
    { id: 'terre', nom: 'Terre', sombre: true, bg: '#1d1512', bg2: '#281d19', ink: '#f0e4d4', accent: '#c26a3d' },
    { id: 'sauge', nom: 'Sauge', sombre: false, bg: '#e9ede6', bg2: '#dee4da', ink: '#1f2621', accent: '#4c7a5c' },
];

const PAIRES_PEINTRE: PaireFonts[] = [
    PAIRE_SALON,
    {
        id: 'galerie', nom: 'Galerie', display: "'Cormorant Garamond', serif", label: "'Manrope', sans-serif", body: "'Manrope', sans-serif",
        poidsDisplay: 500, poidsLabel: 600, google: 'family=Cormorant+Garamond:wght@500&family=Manrope:wght@400;600',
    },
    {
        id: 'moderne', nom: 'Moderne', display: "'Syne', sans-serif", label: "'Syne', sans-serif", body: "'Work Sans', sans-serif",
        poidsDisplay: 700, poidsLabel: 600, google: 'family=Syne:wght@600;700&family=Work+Sans:wght@400;500',
    },
];

const PALETTES_PHOTOGRAPHE: PaletteEspace[] = [
    PALETTE_SALON,
    { id: 'noir', nom: 'Noir', sombre: true, bg: '#0a0a0a', bg2: '#141414', ink: '#f5f5f5', accent: '#f5f5f5' },
    { id: 'blanc', nom: 'Blanc', sombre: false, bg: '#fbfbfb', bg2: '#f0f0f0', ink: '#111111', accent: '#111111' },
    { id: 'sepia', nom: 'Sépia', sombre: true, bg: '#14100d', bg2: '#1e1814', ink: '#ecdcc6', accent: '#c79a6b' },
    { id: 'argent', nom: 'Argent', sombre: false, bg: '#e8e8ea', bg2: '#dcdce0', ink: '#1b1b1f', accent: '#5b6b7b' },
    { id: 'nuit', nom: 'Nuit', sombre: true, bg: '#0b0f14', bg2: '#121821', ink: '#e6edf3', accent: '#7fb3d5' },
];

const PAIRES_PHOTOGRAPHE: PaireFonts[] = [
    PAIRE_SALON,
    {
        id: 'editorial', nom: 'Éditorial', display: "'Playfair Display', serif", label: "'Manrope', sans-serif", body: "'Manrope', sans-serif",
        poidsDisplay: 500, poidsLabel: 600, google: 'family=Playfair+Display:wght@500&family=Manrope:wght@400;600',
    },
    {
        id: 'net', nom: 'Net', display: "'Archivo', sans-serif", label: "'Archivo', sans-serif", body: "'Archivo', sans-serif",
        poidsDisplay: 600, poidsLabel: 600, google: 'family=Archivo:wght@400;600',
    },
];

export const THEMES: Record<FamilleGabarit, { palettes: PaletteEspace[]; fonts: PaireFonts[] }> = {
    musicien: { palettes: PALETTES_MUSICIEN, fonts: PAIRES_MUSICIEN },
    peintre: { palettes: PALETTES_PEINTRE, fonts: PAIRES_PEINTRE },
    photographe: { palettes: PALETTES_PHOTOGRAPHE, fonts: PAIRES_PHOTOGRAPHE },
    ecrivain: { palettes: [PALETTE_SALON], fonts: [PAIRE_SALON] },
};

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Vrai pour une couleur #rrggbb, la seule forme acceptée dans config.theme.accent. */
export function accentValide(v: unknown): v is string {
    return typeof v === 'string' && HEX.test(v);
}

function rgb(hex: string): [number, number, number] {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number): string {
    const [r, g, b] = rgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Mélange a dans b à la proportion p (0 à 1), rendu en rgb(). */
function melange(a: string, b: string, p: number): string {
    const ca = rgb(a);
    const cb = rgb(b);
    const m = ca.map((v, i) => Math.round(v * p + cb[i] * (1 - p)));
    return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
}

function luminance(hex: string): number {
    const lin = rgb(hex).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contraste(a: string, b: string): number {
    const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
}

export interface ThemeResolu {
    palette: PaletteEspace;
    paire: PaireFonts;
    accent: string;
    /** Les variables --es-* à poser en style sur la racine du gabarit. */
    vars: Record<string, string>;
    /** L'adresse Google Fonts de la seule paire choisie. */
    urlFonts: string;
}

export function resoudreTheme(famille: FamilleGabarit, theme?: ThemeEspace): ThemeResolu {
    const registre = THEMES[famille] ?? THEMES.ecrivain;
    const palette = registre.palettes.find((p) => p.id === theme?.palette) ?? registre.palettes[0];
    const paire = registre.fonts.find((f) => f.id === theme?.fonts) ?? registre.fonts[0];
    const accent = accentValide(theme?.accent) ? theme!.accent! : palette.accent;

    // Le texte posé sur l'accent : l'extrême de la palette qui contraste le mieux.
    const [fonce, clair] = luminance(palette.bg) < luminance(palette.ink) ? [palette.bg, palette.ink] : [palette.ink, palette.bg];
    const accentInk = contraste(accent, fonce) >= contraste(accent, clair) ? fonce : clair;

    const vars: Record<string, string> = {
        '--es-bg': palette.bg,
        '--es-bg-2': palette.bg2,
        '--es-ink': palette.ink,
        '--es-ink-2': rgba(palette.ink, 0.72),
        '--es-accent': accent,
        '--es-accent-ink': accentInk,
        '--es-line': rgba(accent, 0.28),
        '--es-glass': rgba(palette.bg, palette.sombre ? 0.4 : 0.55),
        '--es-glow': rgba(accent, 0.35),
        // Deux jetons internes au moteur : le filet du verre (blanc sur fond
        // sombre, noir sur fond clair, comme le canon) et la teinte chaude
        // des fonds de hero (accent fondu dans le fond).
        '--es-edge': palette.sombre ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        '--es-tint': melange(accent, palette.bg, 0.12),
        '--es-font-display': paire.display,
        '--es-font-label': paire.label,
        '--es-font-body': paire.body,
        '--es-weight-display': String(paire.poidsDisplay),
        '--es-weight-label': String(paire.poidsLabel),
        '--es-radius': '15px',
    };

    return { palette, paire, accent, vars, urlFonts: `https://fonts.googleapis.com/css2?${paire.google}&display=swap` };
}
