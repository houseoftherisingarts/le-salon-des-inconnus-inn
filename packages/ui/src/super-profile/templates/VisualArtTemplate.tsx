// VisualArtTemplate — painter / illustrator / sculptor Mind Palace.
//
// Three layers, back-to-front:
//   1. Works scattered as a "wall of sketches", each rotated and offset
//      deterministically so the composition is stable on every render.
//   2. Huge name flowing right-to-left, partially obscured by the cutout.
//   3. Artist cutout, centered.

import * as React from 'react';
import { ArtistCutout, BackToSalonLink, type TemplateProps } from './shared';
import { BottomDock, NameLayer, WorkCountChip, deterministicTransform } from './stage';

export const VisualArtTemplate: React.FC<TemplateProps> = ({ config, fallbackDisplayName }) => {
    const works = config.works ?? [];
    const displayName = config.displayName || fallbackDisplayName || config.username;

    return (
        <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-lato">
            <BackToSalonLink />

            {/* Ambient washes so the dark canvas doesn't read as a void */}
            <div aria-hidden className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[55%] h-[55%] bg-[#c5a059]/15 rounded-full blur-[150px]" />
                <div className="absolute -bottom-[15%] -right-[15%] w-[55%] h-[55%] bg-fuchsia-500/10 rounded-full blur-[160px]" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
            </div>

            {/* ── Layer 1 · Back: scattered works wall ──────────────────── */}
            <div className="absolute inset-0 z-10 pointer-events-none">
                {works.map((w, i) => {
                    const { x, y, rot } = deterministicTransform(i + 1);
                    const size = 18 + ((i * 7) % 12); // 18..29 vw
                    return (
                        <figure
                            key={`${w.storagePath}-${i}`}
                            className="absolute top-1/2 left-1/2 origin-center pointer-events-auto group"
                            style={{
                                transform: `translate(calc(-50% + ${x}vw), calc(-50% + ${y}vh)) rotate(${rot}deg)`,
                                width: `${size}vw`,
                                maxWidth: '320px',
                                minWidth: '160px',
                            }}
                        >
                            <div className="relative bg-[#0a0a0a] p-2 shadow-2xl border border-white/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-0 group-hover:z-30">
                                <img
                                    src={w.url}
                                    alt={w.caption || `Work ${i + 1}`}
                                    className="block w-full h-auto"
                                    loading="lazy"
                                />
                                {w.caption && (
                                    <figcaption className="absolute -bottom-6 left-0 right-0 text-center font-cormorant italic text-neutral-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                        {w.caption}
                                    </figcaption>
                                )}
                            </div>
                        </figure>
                    );
                })}
            </div>

            {/* ── Layer 2 · Middle: name flowing right-to-left ─────────── */}
            <div className="absolute inset-0 z-20 pointer-events-none">
                <NameLayer name={displayName} tagline={config.tagline} medium={config.medium} />
            </div>

            {/* ── Layer 3 · Front: artist cutout ────────────────────────── */}
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <ArtistCutout
                    src={config.hero?.url}
                    alt={displayName}
                    className="max-h-[88vh] max-w-[44vw]"
                />
            </div>

            <BottomDock config={config} />
            <WorkCountChip count={works.length} />
        </div>
    );
};
