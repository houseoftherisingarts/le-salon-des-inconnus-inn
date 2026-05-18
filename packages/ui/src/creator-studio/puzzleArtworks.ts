/**
 * Puzzle artwork pool. Each entry is one curated photograph that can serve as
 * the artwork behind a 4×4 jigsaw on a member's profile. Order in this array
 * determines rotation: the first puzzle a user gets is index 0; on completion
 * they advance to index 1, then 2, etc. Wraps around once exhausted.
 *
 * To add a photo: drop the image somewhere stable (Firebase Storage, your
 * portfolio CDN, imgur if you must) and append a new entry below. The `id`
 * MUST be stable forever — it's stored on member profiles to track which
 * puzzle each user is currently solving.
 */
export interface PuzzleArtwork {
    /** Stable identifier — never reuse or change after a user has earned this. */
    id: string;
    /** Public image URL — should be a high-resolution photograph. */
    src: string;
    /** Display title for the display case. */
    titleEn: string;
    titleFr: string;
    /** Optional credit line (defaults to "Le Salon des Inconnus"). */
    credit?: string;
}

export const PUZZLE_ARTWORKS: ReadonlyArray<PuzzleArtwork> = [
    // ── Seed entries ─────────────────────────────────────────────────────────
    // These are placeholders sourced from Unsplash so the system has something
    // to render before you swap them for your own photographs. Replace `src`
    // with your photo URLs and adjust titles to match. The `id`s can stay.
    {
        id: 'lantern-window',
        src: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=1200&q=80',
        titleEn: 'Lantern Window',
        titleFr: 'Fenêtre à la lanterne',
    },
    {
        id: 'autumn-grove',
        src: 'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?w=1200&q=80',
        titleEn: 'Autumn Grove',
        titleFr: 'Bosquet d\'automne',
    },
    {
        id: 'old-stone-path',
        src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80',
        titleEn: 'The Old Stone Path',
        titleFr: 'Le vieux sentier de pierre',
    },
    {
        id: 'kitchen-morning',
        src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80',
        titleEn: 'Kitchen at Morning',
        titleFr: 'Cuisine au matin',
    },
    {
        id: 'forest-edge',
        src: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
        titleEn: 'Edge of the Forest',
        titleFr: 'Lisière de la forêt',
    },
];

// Puzzle math — kept here so the UI and the completion check share a single
// source of truth. Adjust these if you re-tune the economy.
export const PUZZLE_PIECES_TOTAL = 16;        // 4×4 grid
export const PUZZLE_PIECES_PRE_REVEALED = 8;  // every new puzzle starts half done
export const PUZZLE_PIECES_TO_EARN = PUZZLE_PIECES_TOTAL - PUZZLE_PIECES_PRE_REVEALED; // 8
export const COINS_PER_PIECE = 10;            // every 10 lifetime coins → 1 piece
export const COINS_PER_COMPLETION_BONUS = 10; // awarded to spendable balance on each completion
export const PUZZLE_GRID_COLS = 4;
export const PUZZLE_GRID_ROWS = 4;

/**
 * Resolve which artwork the user is currently solving. Wraps the pool when
 * exhausted so a power-user never sees an empty puzzle.
 */
export function pickPuzzleArtwork(
    currentPuzzleId: string | null | undefined,
    puzzlesCompleted: number,
): PuzzleArtwork {
    if (currentPuzzleId) {
        const found = PUZZLE_ARTWORKS.find(a => a.id === currentPuzzleId);
        if (found) return found;
    }
    return PUZZLE_ARTWORKS[puzzlesCompleted % PUZZLE_ARTWORKS.length];
}

/**
 * Number of pieces visible on the active puzzle, given lifetime coin earnings
 * and how many puzzles the user has already completed. Pre-revealed half is
 * always added; earned pieces accumulate on top of that.
 */
export function visiblePieceCount(
    lifetimeCoins: number,
    puzzlesCompleted: number,
): number {
    const earnedTotal = Math.floor(lifetimeCoins / COINS_PER_PIECE);
    const earnedOnCurrent = Math.max(0, earnedTotal - puzzlesCompleted * PUZZLE_PIECES_TO_EARN);
    return Math.min(PUZZLE_PIECES_TOTAL, PUZZLE_PIECES_PRE_REVEALED + earnedOnCurrent);
}
