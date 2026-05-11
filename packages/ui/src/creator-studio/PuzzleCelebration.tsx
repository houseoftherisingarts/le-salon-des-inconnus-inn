import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { JigsawPuzzle } from './JigsawPuzzle';
import { PUZZLE_PIECES_TOTAL, type PuzzleArtwork } from './puzzleArtworks';

/**
 * PuzzleCelebration
 * ─────────────────
 * Plays the completion choreography for a freshly-completed puzzle. Four
 * beats:
 *   1. SHINE — a diagonal gold sweep glides across the assembled puzzle.
 *   2. FUSE  — the jigsaw seams dissolve as a clean image of the artwork
 *              fades in on top. A warm halo blooms.
 *   3. FLY   — the unified artwork arcs from the puzzle slot to the matching
 *              tile in the display case, scaling down along the way.
 *   4. SLAM  — a brief scale-bounce on landing.
 *
 * The overlay is portal-free (just fixed-positioned) and pointer-events-none
 * so the page remains interactive while it plays. `onDone` fires after the
 * slam settles; consumers typically use it to clear the placeholder slot in
 * the display case so the real tile takes over.
 *
 * Reduced motion: skip all motion; fire `onDone` after a short beat so the
 * downstream UI (placeholder → real tile) still resolves cleanly.
 */

interface Props {
    artwork: PuzzleArtwork;
    /** Source DOM rect (live puzzle wrapper) at trigger time. */
    sourceRect: DOMRect;
    /**
     * CSS selector for the destination tile in the display case. We poll for
     * it on each frame for up to ~700ms — the tile may not be mounted yet at
     * trigger time because React's commit phase hasn't reached the case yet.
     */
    targetSelector: string;
    language: 'EN' | 'FR';
    onDone: () => void;
}

type Phase = 'SHINE' | 'FUSE' | 'FLY' | 'DONE';

export const PuzzleCelebration: React.FC<Props> = ({
    artwork, sourceRect, targetSelector, language, onDone,
}) => {
    // prefers-reduced-motion → no choreography. We still fire onDone so the
    // display-case placeholder clears.
    const reduce = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [phase, setPhase] = useState<Phase>('SHINE');
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Resolve the target slot rect — poll on rAF until it shows up.
    useEffect(() => {
        let cancelled = false;
        const start = performance.now();
        const find = () => {
            if (cancelled) return;
            const el = document.querySelector<HTMLElement>(targetSelector);
            if (el) { setTargetRect(el.getBoundingClientRect()); return; }
            if (performance.now() - start < 700) requestAnimationFrame(find);
        };
        find();
        return () => { cancelled = true; };
    }, [targetSelector]);

    // Beat sequencing.
    useEffect(() => {
        if (reduce) {
            const t = setTimeout(onDone, 250);
            return () => clearTimeout(t);
        }
        const t1 = setTimeout(() => setPhase('FUSE'), 750);
        const t2 = setTimeout(() => setPhase('FLY'),  1200);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [reduce, onDone]);

    // Drive the flight via Web Animations API once we know both rects.
    useLayoutEffect(() => {
        if (reduce || phase !== 'FLY' || !targetRect || !wrapperRef.current) return;
        const el = wrapperRef.current;

        const sCx = sourceRect.left + sourceRect.width / 2;
        const sCy = sourceRect.top  + sourceRect.height / 2;
        const tCx = targetRect.left + targetRect.width / 2;
        const tCy = targetRect.top  + targetRect.height / 2;
        const dx = tCx - sCx;
        const dy = tCy - sCy;
        const finalScale = Math.max(0.18, targetRect.width / sourceRect.width);

        // Arc midpoint: lift slightly above the straight line and scale ~halfway.
        const arcY = dy * 0.35 - 60;
        const arcX = dx * 0.55;
        const midScale = (1 + finalScale) / 2 + 0.04;

        const anim = el.animate(
            [
                { transform: 'translate(0, 0) scale(1)',                                 offset: 0 },
                { transform: `translate(${arcX}px, ${arcY}px) scale(${midScale})`,       offset: 0.45 },
                { transform: `translate(${dx}px, ${dy}px) scale(${finalScale * 1.08})`,  offset: 0.85 },
                { transform: `translate(${dx}px, ${dy}px) scale(${finalScale * 0.94})`,  offset: 0.93 },
                { transform: `translate(${dx}px, ${dy}px) scale(${finalScale})`,         offset: 1.0  },
            ],
            { duration: 950, fill: 'forwards', easing: 'cubic-bezier(0.55, 0, 0.1, 1)' },
        );

        const onFinish = () => { setPhase('DONE'); onDone(); };
        anim.addEventListener('finish', onFinish);
        return () => { anim.removeEventListener('finish', onFinish); try { anim.cancel(); } catch {} };
    }, [phase, targetRect, sourceRect, reduce, onDone]);

    // Safety: if we never resolved targetRect (e.g. display case scrolled out),
    // fall through after the FLY phase would have started.
    useEffect(() => {
        if (reduce || phase !== 'FLY') return;
        if (targetRect) return;
        const t = setTimeout(() => { setPhase('DONE'); onDone(); }, 1200);
        return () => clearTimeout(t);
    }, [phase, targetRect, reduce, onDone]);

    if (reduce) return null;
    if (phase === 'DONE') return null;

    // Opacities driven by phase. The base jigsaw (with seams) crossfades to
    // the clean artwork during FUSE.
    const seamsOpacity = phase === 'SHINE' ? 1 : 0;
    const cleanOpacity = phase === 'SHINE' ? 0 : 1;
    const haloOpacity  = phase === 'FUSE'  ? 1 : (phase === 'FLY' ? 0.65 : 0);

    return (
        <div
            aria-hidden
            ref={wrapperRef}
            style={{
                position: 'fixed',
                left: sourceRect.left,
                top:  sourceRect.top,
                width:  sourceRect.width,
                height: sourceRect.height,
                zIndex: 9999,
                pointerEvents: 'none',
                willChange: 'transform',
            }}
        >
            {/* Halo glow — warmest at FUSE, trails through the flight. */}
            <div
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: '-25%',
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle, rgba(255,228,150,0.55) 0%, rgba(255,200,120,0.30) 40%, rgba(217,70,239,0.10) 65%, rgba(0,0,0,0) 80%)',
                    filter: 'blur(28px)',
                    opacity: haloOpacity,
                    transition: 'opacity 400ms ease',
                }}
            />

            <div
                className="relative w-full h-full"
                style={{
                    transformOrigin: 'center',
                    animation: phase === 'SHINE' || phase === 'FUSE'
                        ? 'puzzleCelebPulse 950ms ease-in-out'
                        : 'none',
                }}
            >
                {/* Base — the assembled jigsaw with visible seams. */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: seamsOpacity,
                        transition: 'opacity 450ms ease',
                    }}
                >
                    <JigsawPuzzle
                        artwork={artwork}
                        revealed={PUZZLE_PIECES_TOTAL}
                        size={sourceRect.width}
                        language={language}
                    />
                </div>

                {/* Clean artwork — fades in at FUSE, takes over for the flight. */}
                <img
                    src={artwork.src}
                    alt=""
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 6,
                        opacity: cleanOpacity,
                        transition: 'opacity 480ms ease',
                        boxShadow: phase === 'FUSE'
                            ? '0 0 60px 6px rgba(255,228,150,0.55), inset 0 0 20px rgba(255,255,255,0.15)'
                            : phase === 'FLY'
                                ? '0 18px 36px -8px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.15)'
                                : '0 0 0 rgba(0,0,0,0)',
                        filter: phase === 'FUSE' ? 'brightness(1.18) saturate(1.18)' : 'none',
                    }}
                />

                {/* Diagonal shine sweep — uses a CSS animation so it kicks off
                    cleanly the moment the overlay mounts. */}
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        overflow: 'hidden',
                        borderRadius: 6,
                        pointerEvents: 'none',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0, left: '-60%',
                            width: '60%',
                            height: '100%',
                            background:
                                'linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,240,200,0.85) 45%, rgba(255,255,255,0.95) 50%, rgba(255,240,200,0.85) 55%, rgba(255,255,255,0) 100%)',
                            filter: 'blur(2px)',
                            mixBlendMode: 'screen',
                            animation: 'puzzleCelebShine 850ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
                            opacity: phase === 'SHINE' ? 1 : 0,
                            transition: 'opacity 220ms ease',
                        }}
                    />
                </div>
            </div>

            <style>{`
                @keyframes puzzleCelebShine {
                    0%   { transform: translateX(0) skewX(-12deg);   }
                    100% { transform: translateX(280%) skewX(-12deg);}
                }
                @keyframes puzzleCelebPulse {
                    0%   { transform: scale(1);     }
                    30%  { transform: scale(1.055); }
                    100% { transform: scale(1);     }
                }
            `}</style>
        </div>
    );
};
