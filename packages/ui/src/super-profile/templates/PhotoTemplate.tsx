// PhotoTemplate — photographer's Mind Palace.
//
// Three layers, back-to-front:
//   1. Works mosaic, full-bleed, with the RevealWaveImage shader playing
//      on each tile (B&W dither + flashlight reveal on cursor).
//   2. Huge name flowing right-to-left in display type, mix-blend screen so
//      the photos underneath bleed through.
//   3. Artist cutout, centered, the focal point.

import * as React from 'react';
import { RevealWaveImage } from '../RevealWaveImage';
import { ArtistCutout, BackToSalonLink, type TemplateProps } from './shared';
import { BottomDock, NameLayer, WorkCountChip } from './stage';

export const PhotoTemplate: React.FC<TemplateProps> = ({ config, fallbackDisplayName }) => {
    const works = config.works ?? [];
    const displayName = config.displayName || fallbackDisplayName || config.username;

    // Tile count for the mosaic — repeat the user's works if they only have
    // a few, so the wall reads as full rather than thin. Cap at 12 tiles.
    const tileCount = Math.min(12, Math.max(works.length, works.length > 0 ? 6 : 0));
    const tiles = Array.from({ length: tileCount }, (_, i) => works[i % works.length]).filter(Boolean);

    return (
        <div className="fixed inset-0 bg-[#050505] text-white overflow-hidden font-lato">
            <BackToSalonLink />

            {/* ── Layer 1 · Back: works mosaic ──────────────────────────── */}
            <div className="absolute inset-0 z-0">
                {tiles.length > 0 ? (
                    <div
                        className="absolute inset-0 grid gap-[2px]"
                        style={{
                            gridTemplateColumns: `repeat(${tiles.length >= 9 ? 4 : 3}, 1fr)`,
                            gridAutoRows: '1fr',
                        }}
                    >
                        {tiles.map((w, i) => (
                            <div key={`${w.storagePath}-${i}`} className="relative overflow-hidden">
                                <RevealWaveImage
                                    src={w.url}
                                    revealRadius={0.35}
                                    revealSoftness={0.5}
                                    pixelSize={3}
                                    waveSpeed={0.35 + (i % 3) * 0.05}
                                    waveFrequency={2.5}
                                    waveAmplitude={0.14}
                                    mouseRadius={0.25}
                                    className="absolute inset-0 w-full h-full"
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#1a1208] to-[#050505]" />
                )}
                {/* Vignette pulls focus to the centerpiece */}
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse at center, rgba(5,5,5,0) 28%, rgba(5,5,5,0.65) 78%, rgba(5,5,5,0.92) 100%)',
                    }}
                />
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
                    className="max-h-[92vh] max-w-[58vw]"
                />
            </div>

            <BottomDock config={config} />
            <WorkCountChip count={works.length} label="photos" />
        </div>
    );
};
