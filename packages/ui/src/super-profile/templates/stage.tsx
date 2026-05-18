// Shared 3-layer stage used by all three Super Profile templates.
//
// Back   — the artist's uploaded works as a textured "wall" behind everything
//          (varies by template: photo mosaic, scattered cards, clean grid).
// Middle — the artist's name as a huge display headline that flows RIGHT-TO-LEFT,
//          positioned so the cutout partially overlaps it. This is the
//          "text behind the bg-less picture" reference Alex gave.
// Front  — the artist cutout (transparent PNG), the focal point.
//
// Each template imports these primitives and arranges them with its own
// back-layer variation. The middle + front are identical across templates.

import * as React from 'react';
import { SocialLinks, type TemplateProps } from './shared';
import type { SuperProfileConfig } from '../types';

interface NameLayerProps {
    name: string;
    tagline?: string;
    medium?: SuperProfileConfig['medium'];
}

/**
 * Middle layer — huge display name pinned to the right edge and flowing left,
 * so the cutout (positioned center) partially obscures it. Tagline sits
 * underneath in a smaller typographic voice.
 */
export const NameLayer: React.FC<NameLayerProps> = ({ name, tagline, medium }) => {
    const mediumLabel = medium === 'photo' ? 'Photographer'
        : medium === 'visual-art' ? 'Visual Artist'
        : null;
    return (
        <div className="absolute inset-0 pointer-events-none flex items-center">
            {/* The huge type is in a right-anchored column that overflows the
                left side of the viewport — purely visual; pointer-events none
                so the cutout above stays interactive. */}
            <div className="relative w-full pr-[4vw] text-right">
                {mediumLabel && (
                    <p className="font-cinzel text-[#c5a059] text-[10px] md:text-xs uppercase tracking-[0.5em] mb-3">
                        {mediumLabel}
                    </p>
                )}
                <h1
                    className="font-prata text-[#f3e5ab] leading-[0.85] tracking-tight"
                    style={{
                        fontSize: 'clamp(4rem, 16vw, 18rem)',
                        whiteSpace: 'nowrap',
                        // mix-blend lifts the type when works peek through underneath
                        mixBlendMode: 'screen',
                    }}
                >
                    {name}
                </h1>
                {tagline && (
                    <p className="mt-4 font-cormorant italic text-neutral-300 text-xl md:text-2xl leading-relaxed pl-[40vw]">
                        {tagline}
                    </p>
                )}
            </div>
        </div>
    );
};

/**
 * Bottom-left dock — bio paragraph + social links + small chrome. Stays out
 * of the cutout's silhouette so it doesn't fight the focal point.
 */
export const BottomDock: React.FC<{ config: SuperProfileConfig }> = ({ config }) => (
    <div className="absolute bottom-8 left-8 right-8 md:right-auto md:max-w-md z-30 pointer-events-auto">
        {config.bio && (
            <p className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed mb-4 max-w-prose">
                {config.bio}
            </p>
        )}
        <SocialLinks links={config.links} />
    </div>
);

/**
 * Bottom-right dock — work counter / hint. Encourages the viewer to look at
 * the back layer when the template has scrollable / browsable works.
 */
export const WorkCountChip: React.FC<{ count: number; label?: string }> = ({ count, label = 'works' }) => {
    if (count === 0) return null;
    return (
        <div className="absolute bottom-8 right-8 z-30 pointer-events-none">
            <p className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.4em]">
                {String(count).padStart(2, '0')} {label}
            </p>
        </div>
    );
};

/**
 * Shared utility — pseudo-random but deterministic transform so the back-layer
 * scatter is stable across renders (no flicker on hover/state).
 */
export function deterministicTransform(seed: number) {
    const a = Math.sin(seed * 12.9898) * 43758.5453;
    const b = Math.sin(seed * 78.233) * 43758.5453;
    const c = Math.sin(seed * 39.346) * 43758.5453;
    const norm = (n: number) => (n - Math.floor(n)) * 2 - 1; // [-1, 1]
    return {
        x: norm(a) * 38,    // vw offset
        y: norm(b) * 32,    // vh offset
        rot: norm(c) * 14,  // deg
    };
}

/**
 * Re-export the props type so each template's signature is one import deep.
 */
export type { TemplateProps };
