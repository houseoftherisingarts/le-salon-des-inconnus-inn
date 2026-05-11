import React, { useMemo } from 'react';
import {
    PUZZLE_GRID_COLS, PUZZLE_GRID_ROWS, PUZZLE_PIECES_TOTAL,
    type PuzzleArtwork,
} from './puzzleArtworks';

/**
 * JigsawPuzzle
 * ────────────
 * Renders a deterministic 4×4 jigsaw over a photograph. Pieces revealed so
 * far show their slice of the photo; un-earned pieces show as faint outlined
 * silhouettes. The interlock pattern (which edges have tabs vs blanks) is
 * derived from a hash of the artwork id, so the same artwork ALWAYS yields
 * the same jigsaw layout — no piece "shifts" between renders or sessions.
 *
 * Implementation notes
 *   • Pieces are SVG <path>s. Each piece has 4 edges; each shared edge is
 *     either flat, tab (convex bulge), or blank (concave dip). Adjacent
 *     pieces have mirrored edges so they nest perfectly.
 *   • Tabs/blanks use cubic Béziers shaped like the classic puzzle "bulb on
 *     a neck" — no straight 90° corners to a square. This is what makes the
 *     pieces read as jigsaw, not tile.
 *   • The whole puzzle is one <svg> with one <image> per revealed piece,
 *     each clipped to its path. Hidden pieces just stroke the outline.
 */

interface Props {
    artwork: PuzzleArtwork;
    /** How many pieces to show as filled (0..PUZZLE_PIECES_TOTAL). */
    revealed: number;
    /** Reveal order — which piece index gets shown at each step. Stable per
     *  artwork so the same coin earns the same next visible piece. */
    revealOrderHint?: number[];
    /** CSS size of the rendered puzzle. Default 320px square. */
    size?: number;
    language: 'EN' | 'FR';
}

// ─── Deterministic PRNG (mulberry32) ─────────────────────────────────────────
// Tiny, fast, and seedable — perfect for "same id → same layout".
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

// ─── Edge generation ─────────────────────────────────────────────────────────
type EdgeKind = 'flat' | 'tab' | 'blank';
interface PieceEdges { top: EdgeKind; right: EdgeKind; bottom: EdgeKind; left: EdgeKind; }

function buildEdges(rows: number, cols: number, seed: number): PieceEdges[][] {
    const rand = mulberry32(seed);
    // Horizontal edges: between row r and r+1, for each column c.
    // hEdges[r][c] = true → top piece has 'tab' (sticks down), bottom has 'blank'.
    const hEdges: boolean[][] = [];
    for (let r = 0; r < rows - 1; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < cols; c++) row.push(rand() > 0.5);
        hEdges.push(row);
    }
    // Vertical edges: between col c and c+1, for each row r.
    // vEdges[r][c] = true → left piece has 'tab' (sticks right), right has 'blank'.
    const vEdges: boolean[][] = [];
    for (let r = 0; r < rows; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < cols - 1; c++) row.push(rand() > 0.5);
        vEdges.push(row);
    }

    const grid: PieceEdges[][] = [];
    for (let r = 0; r < rows; r++) {
        const row: PieceEdges[] = [];
        for (let c = 0; c < cols; c++) {
            const top: EdgeKind    = r === 0          ? 'flat' : (hEdges[r - 1][c] ? 'blank' : 'tab');
            const bottom: EdgeKind = r === rows - 1   ? 'flat' : (hEdges[r][c]     ? 'tab'   : 'blank');
            const left: EdgeKind   = c === 0          ? 'flat' : (vEdges[r][c - 1] ? 'blank' : 'tab');
            const right: EdgeKind  = c === cols - 1   ? 'flat' : (vEdges[r][c]     ? 'tab'   : 'blank');
            row.push({ top, right, bottom, left });
        }
        grid.push(row);
    }
    return grid;
}

// ─── Path construction ───────────────────────────────────────────────────────
// Each piece occupies a W×H cell. Tabs bulge outward; blanks dip inward.
// Bulb depth + neck shape are tuned to read as a recognisable jigsaw.

function pieceEdgePath(
    side: 'top' | 'right' | 'bottom' | 'left',
    edge: EdgeKind,
    W: number, H: number,
): string {
    if (edge === 'flat') {
        switch (side) {
            case 'top':    return `L ${W} 0`;
            case 'right':  return `L ${W} ${H}`;
            case 'bottom': return `L 0 ${H}`;
            case 'left':   return `L 0 0`;
        }
    }

    // Bulge geometry on a horizontal edge (top/bottom). 'd' is the bulge
    // direction multiplier: -1 = up/left (out of cell), +1 = down/right.
    // For top: tab → up (negative y) → d=-1; blank → down (positive y) → d=+1.
    // For bottom: tab → down → d=+1; blank → up → d=-1.
    // For left: tab → left → d=-1; blank → right → d=+1.
    // For right: tab → right → d=+1; blank → left → d=-1.
    const d = (() => {
        if (side === 'top')    return edge === 'tab' ? -1 : 1;
        if (side === 'bottom') return edge === 'tab' ?  1 : -1;
        if (side === 'left')   return edge === 'tab' ? -1 : 1;
        return /* right */            edge === 'tab' ?  1 : -1;
    })();

    // Edge length we're traversing
    const L = (side === 'top' || side === 'bottom') ? W : H;
    // Bulb depth (perpendicular to the edge) — ~22% of the edge length.
    const D = L * 0.22;

    // The bulb sits at the midpoint of the edge; necks are 35–65% along.
    // Coordinates below are relative to the *start* of this edge segment,
    // then we translate them into the absolute coords for this piece.
    //
    // We define the path as a series of cubic Béziers along the edge axis.
    // For a 'top' edge going from (0,0) → (W,0):
    //   axis = +x   perp = -y * d
    // For 'right' edge going from (W,0) → (W,H):
    //   axis = +y   perp = +x * d
    // For 'bottom' edge going from (W,H) → (0,H):
    //   axis = -x   perp = +y * d
    // For 'left' edge going from (0,H) → (0,0):
    //   axis = -y   perp = -x * d

    // Helper to convert (along, perp) → absolute (x, y) for this side.
    //
    // Sign convention:  d = -1 means "out of the cell" (tab on top/left,
    // blank on bottom/right);  d = +1 means "into the cell". For 'top' and
    // 'left' the outward direction is negative-axis (up / left), so we
    // multiply by d directly (d=-1 yields a negative perp → outward). For
    // 'bottom' and 'right' the outward direction is positive-axis, also
    // matched by `+ perp * d` with d=+1. Using `-perp * d` on top/left (as
    // earlier versions of this file did) inverted the bulge direction,
    // causing tab/blank pairs on horizontal/vertical seams to shrink AWAY
    // from each other instead of interlocking — producing visible "blank"
    // gaps in completed pieces.
    const project = (along: number, perp: number): [number, number] => {
        switch (side) {
            case 'top':    return [along,        perp * d];
            case 'right':  return [W + perp * d,  along];
            case 'bottom': return [W - along,     H + perp * d];
            case 'left':   return [perp * d,     H - along];
        }
    };

    // Five waypoints along the edge: 0%, 35%, 50%, 65%, 100%
    // Cubic Bézier control points are placed to give the bulge a "neck".
    const pts = [
        project(L * 0.35, 0),        // p1: enter neck on edge axis
        project(L * 0.40, D * 0.4),  // c1: pull out a bit
        project(L * 0.30, D * 1.0),  // c2: bulb left shoulder (overshoot back)
        project(L * 0.50, D * 1.05), // p2: bulb apex
        project(L * 0.70, D * 1.0),  // c3: bulb right shoulder
        project(L * 0.60, D * 0.4),  // c4: pull back in
        project(L * 0.65, 0),        // p3: exit neck
        project(L,        0),        // end of edge
    ];
    const f = (n: number) => n.toFixed(2);
    return [
        `L ${f(pts[0][0])} ${f(pts[0][1])}`,
        `C ${f(pts[1][0])} ${f(pts[1][1])} ${f(pts[2][0])} ${f(pts[2][1])} ${f(pts[3][0])} ${f(pts[3][1])}`,
        `C ${f(pts[4][0])} ${f(pts[4][1])} ${f(pts[5][0])} ${f(pts[5][1])} ${f(pts[6][0])} ${f(pts[6][1])}`,
        `L ${f(pts[7][0])} ${f(pts[7][1])}`,
    ].join(' ');
}

function piecePath(edges: PieceEdges, W: number, H: number): string {
    // Start at piece's top-left and trace clockwise.
    return [
        `M 0 0`,
        pieceEdgePath('top',    edges.top,    W, H),
        pieceEdgePath('right',  edges.right,  W, H),
        pieceEdgePath('bottom', edges.bottom, W, H),
        pieceEdgePath('left',   edges.left,   W, H),
        `Z`,
    ].join(' ');
}

// ─── Reveal order ───────────────────────────────────────────────────────────
// Default reveal order: a deterministic shuffle so each artwork has its own
// "fill rhythm". The first PUZZLE_PIECES_PRE_REVEALED indices are shown on
// fresh puzzles; subsequent indices appear as coins are earned.

function makeRevealOrder(seed: number, count: number): number[] {
    const order = Array.from({ length: count }, (_, i) => i);
    const rand = mulberry32(seed ^ 0xA5A5A5);
    // Fisher–Yates
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const JigsawPuzzle: React.FC<Props> = ({
    artwork, revealed, revealOrderHint, size = 320, language,
}) => {
    const seed = useMemo(() => hashString(artwork.id), [artwork.id]);
    const edges = useMemo(
        () => buildEdges(PUZZLE_GRID_ROWS, PUZZLE_GRID_COLS, seed),
        [seed],
    );
    const revealOrder = useMemo(
        () => revealOrderHint && revealOrderHint.length === PUZZLE_PIECES_TOTAL
            ? revealOrderHint
            : makeRevealOrder(seed, PUZZLE_PIECES_TOTAL),
        [seed, revealOrderHint],
    );

    // SVG viewBox is the full puzzle rect plus padding for tabs that overhang.
    const cellW = 100;
    const cellH = 100;
    const overhang = cellW * 0.25;
    const totalW = cellW * PUZZLE_GRID_COLS;
    const totalH = cellH * PUZZLE_GRID_ROWS;
    const vbX = -overhang;
    const vbY = -overhang;
    const vbW = totalW + overhang * 2;
    const vbH = totalH + overhang * 2;

    // Index every piece by its grid order (row * cols + col).
    const allPieces = useMemo(() => {
        const list: { idx: number; row: number; col: number; d: string; tx: number; ty: number; }[] = [];
        for (let r = 0; r < PUZZLE_GRID_ROWS; r++) {
            for (let c = 0; c < PUZZLE_GRID_COLS; c++) {
                const idx = r * PUZZLE_GRID_COLS + c;
                list.push({
                    idx, row: r, col: c,
                    d: piecePath(edges[r][c], cellW, cellH),
                    tx: c * cellW, ty: r * cellH,
                });
            }
        }
        return list;
    }, [edges]);

    const revealedSet = useMemo(() => {
        const s = new Set<number>();
        for (let i = 0; i < Math.min(revealed, revealOrder.length); i++) s.add(revealOrder[i]);
        return s;
    }, [revealed, revealOrder]);

    const isComplete = revealed >= PUZZLE_PIECES_TOTAL;

    return (
        <div
            className="relative"
            style={{ width: size, aspectRatio: '1 / 1' }}
            role="img"
            aria-label={(language === 'FR' ? artwork.titleFr : artwork.titleEn) + ` — ${revealed}/${PUZZLE_PIECES_TOTAL}`}
        >
            <svg
                viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
                className="w-full h-full overflow-visible"
            >
                <defs>
                    {/* One clipPath per piece — each scoped to that piece's
                        local origin so the underlying <image> can be tiled
                        consistently across all pieces. */}
                    {allPieces.map(p => (
                        <clipPath
                            key={`clip-${p.idx}`}
                            id={`piece-${artwork.id}-${p.idx}`}
                            clipPathUnits="userSpaceOnUse"
                        >
                            <path d={p.d} transform={`translate(${p.tx} ${p.ty})`} />
                        </clipPath>
                    ))}
                    {/* Soft inner shadow gradient for the empty board. */}
                    <radialGradient id={`board-bg-${artwork.id}`} cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
                    </radialGradient>
                </defs>

                {/* Board background — very subtle so empty pieces still read
                    as a frame, not as a black hole on the profile. */}
                <rect
                    x={0} y={0} width={totalW} height={totalH}
                    fill={`url(#board-bg-${artwork.id})`}
                    rx={2} ry={2}
                />

                {/* Revealed pieces — image clipped to each piece's path */}
                {allPieces.map(p => {
                    const isRevealed = revealedSet.has(p.idx);
                    if (!isRevealed) return null;
                    return (
                        <g key={`r-${p.idx}`} clipPath={`url(#piece-${artwork.id}-${p.idx})`}>
                            <image
                                href={artwork.src}
                                x={0} y={0}
                                width={totalW} height={totalH}
                                preserveAspectRatio="xMidYMid slice"
                            />
                        </g>
                    );
                })}

                {/* Hidden pieces — faint outline silhouettes so the user can
                    see the shape of what they're working toward. */}
                {allPieces.map(p => {
                    const isRevealed = revealedSet.has(p.idx);
                    if (isRevealed) return null;
                    return (
                        <path
                            key={`h-${p.idx}`}
                            d={p.d}
                            transform={`translate(${p.tx} ${p.ty})`}
                            fill="rgba(255,255,255,0.025)"
                            stroke="rgba(255,255,255,0.18)"
                            strokeWidth={0.6}
                            strokeDasharray="2 2"
                        />
                    );
                })}

                {/* Subtle separator lines on revealed pieces so the jigsaw
                    grid still reads as discrete pieces, not one flat image. */}
                {allPieces.map(p => {
                    const isRevealed = revealedSet.has(p.idx);
                    if (!isRevealed) return null;
                    return (
                        <path
                            key={`o-${p.idx}`}
                            d={p.d}
                            transform={`translate(${p.tx} ${p.ty})`}
                            fill="none"
                            stroke="rgba(0,0,0,0.45)"
                            strokeWidth={0.6}
                        />
                    );
                })}
            </svg>

            {/* Completion glow */}
            {isComplete && (
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none rounded-md puzzle-complete-glow"
                />
            )}

            <style>{`
                @keyframes puzzleCompleteGlow {
                    0%   { box-shadow: 0 0 0px rgba(34,211,238,0); }
                    50%  { box-shadow: 0 0 40px rgba(217,70,239,0.55), inset 0 0 20px rgba(34,211,238,0.35); }
                    100% { box-shadow: 0 0 0px rgba(34,211,238,0); }
                }
                .puzzle-complete-glow {
                    animation: puzzleCompleteGlow 2.4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
