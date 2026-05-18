// EditorialTemplate — writers / musicians / performers / "Other" Mind Palace.
//
// Three layers, back-to-front:
//   1. Works arranged as a clean masonry-ish grid, low opacity, fills the
//      whole canvas (treated as backdrop pattern, not focal content).
//   2. Huge name flowing right-to-left, the typographic statement.
//   3. Artist cutout, centered.
//
// Distinct from VisualArt: this template assumes the works are SUPPORTING
// (sketches, scanned writing pages, sheet music photos) rather than
// gallery-piece-first. The grid is even and recedes; the type does the
// heavy lifting.

import * as React from 'react';
import { ArtistCutout, BackToSalonLink, type TemplateProps } from './shared';
import { BottomDock, NameLayer, WorkCountChip } from './stage';

export const EditorialTemplate: React.FC<TemplateProps> = ({ config, fallbackDisplayName }) => {
    const works = config.works ?? [];
    const displayName = config.displayName || fallbackDisplayName || config.username;

    // Repeat works (if few) so the back grid reads as filled. Cap at 16.
    const target = Math.min(16, Math.max(works.length, works.length > 0 ? 8 : 0));
    const tiles = Array.from({ length: target }, (_, i) => works[i % works.length]).filter(Boolean);

    return (
        <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-lato">
            <BackToSalonLink />

            {/* ── Layer 1 · Back: low-opacity grid of works ─────────────── */}
            <div className="absolute inset-0 z-0">
                {tiles.length > 0 ? (
                    <div className="absolute inset-0 columns-3 md:columns-4 lg:columns-5 gap-2 opacity-50">
                        {tiles.map((w, i) => (
                            <div key={`${w.storagePath}-${i}`} className="break-inside-avoid mb-2">
                                <img
                                    src={w.url}
                                    alt=""
                                    className="block w-full h-auto grayscale-[40%] hover:grayscale-0 transition-all duration-700"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1208]/40 to-[#050505]" />
                )}
                {/* Editorial wash — pulls the back layer back, lets the type
                    and cutout breathe. */}
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse at center, rgba(5,5,5,0.45) 20%, rgba(5,5,5,0.78) 65%, rgba(5,5,5,0.94) 100%)',
                    }}
                />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paisley.png')] opacity-[0.05] pointer-events-none" />
            </div>

            {/* ── Layer 2 · Middle: name flowing right-to-left ─────────── */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                <NameLayer name={displayName} tagline={config.tagline} medium={config.medium} />
            </div>

            {/* ── Layer 3 · Front: artist cutout ────────────────────────── */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <ArtistCutout
                    src={config.hero?.url}
                    alt={displayName}
                    className="max-h-[90vh] max-w-[46vw]"
                />
            </div>

            <BottomDock config={config} />
            <WorkCountChip count={works.length} label="pieces" />
        </div>
    );
};
