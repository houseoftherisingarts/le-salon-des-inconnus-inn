/**
 * Inspirosphere — anonymized citations catalog.
 *
 * Seed pool for the orb's "Citations" tab. Same role as
 * INSPIROSPHERE_VIDEOS, but the orb renders the `text` as typography
 * instead of streaming a video. Citations are intentionally anonymous —
 * no `credit` field — so the wisdom stands on its own.
 *
 * Adding a citation
 * ─────────────────
 * 1. Append a new entry at the end of the array. Order doesn't matter —
 *    the orb picks at random.
 * 2. `text` is the citation as it should be displayed (keep punctuation,
 *    typographic quotes, line breaks if needed).
 * 3. `category` must match one of INSPIROSPHERE_CATEGORIES so the
 *    Conscious-mode category filter applies to citations too.
 */
import type { InspirosphereCategory } from './inspirosphereVideos';

export interface InspirosphereCitation {
    /** Stable id — slug or short string. Used as React key + dedupe. */
    id: string;
    /** The citation, in its original language. No attribution. */
    text: string;
    /** Required category — drives Conscious Mode filtering. */
    category: InspirosphereCategory;
}

// ─── Seed pool ────────────────────────────────────────────────────────
export const INSPIROSPHERE_CITATIONS: InspirosphereCitation[] = [
    { id: 'septieme-pourquoi', text: "C'est le 7e « Pourquoi » qui révèle l'essentiel.", category: 'MINDSET' },
];
