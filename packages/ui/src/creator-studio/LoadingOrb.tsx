import React, { useEffect, useState } from 'react';

interface LoadingOrbProps {
    /** Caption under the orb (e.g. "STUDIO", "INN", "AUBERGE"). Drives the
     *  per-section feel when this is reused as a between-sections transition. */
    label?: string;
    /** Logo URL — defaults to the Salon wordmark used in the studio header. */
    logoUrl?: string;
    /** Total visible duration in ms before onDone fires. Animation is tuned for
     *  ~1400ms; pass shorter for snappier transitions or longer for hero loads. */
    durationMs?: number;
    /** Fired once the orb has finished its in/out cycle. Parent is responsible
     *  for unmounting on this signal. */
    onDone?: () => void;
}

/**
 * LoadingOrb
 * ──────────
 * A compact glass orb that sits in the center of a black field and announces
 * a section change. The orb breathes, an aurora drifts behind it, and a neon
 * sweep "lances" across its face — same sweep aesthetic as the StudioContext
 * tab-change animation, scaled down to a single circular surface.
 *
 * Two intended uses:
 *   1. Initial splash for the Creator Studio (mounted once on first load).
 *   2. Inter-section announcer — pop on top of the page when navigating
 *      between Inn / Studio / Auberge to telegraph the theme change.
 */
export const LoadingOrb: React.FC<LoadingOrbProps> = ({
    label = 'STUDIO',
    logoUrl = 'https://i.imgur.com/B1YfPqn.png',
    durationMs = 1400,
    onDone,
}) => {
    const [phase, setPhase] = useState<'in' | 'out'>('in');

    useEffect(() => {
        // Trigger the fade-out 280ms before the total duration so the parent
        // gets a clean handoff right as the orb dissolves.
        const fadeAt = Math.max(400, durationMs - 280);
        const fadeTimer = setTimeout(() => setPhase('out'), fadeAt);
        const doneTimer = setTimeout(() => onDone?.(), durationMs);
        return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer); };
    }, [durationMs, onDone]);

    return (
        <div
            className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505] transition-opacity duration-300 ${phase === 'out' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            role="status"
            aria-live="polite"
            aria-label={`Loading ${label}`}
        >
            {/* Aurora drift behind the orb — mirrors the StudioContextViewer
                aurora pattern but at smaller radius. */}
            <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="orb-aurora-a absolute" style={{ left: '50%', top: '50%', width: '32rem', height: '32rem', transform: 'translate(-50%, -50%)', background: 'radial-gradient(closest-side, rgba(217,70,239,0.35), transparent 70%)', filter: 'blur(40px)', mixBlendMode: 'screen' }} />
                <div className="orb-aurora-b absolute" style={{ left: '50%', top: '50%', width: '36rem', height: '36rem', transform: 'translate(-50%, -50%)', background: 'radial-gradient(closest-side, rgba(34,211,238,0.30), transparent 70%)', filter: 'blur(50px)', mixBlendMode: 'screen' }} />
                <div className="orb-aurora-c absolute" style={{ left: '50%', top: '50%', width: '28rem', height: '28rem', transform: 'translate(-50%, -50%)', background: 'radial-gradient(closest-side, rgba(250,204,21,0.20), transparent 70%)', filter: 'blur(60px)', mixBlendMode: 'screen' }} />
            </div>

            {/* Orb container */}
            <div className="relative orb-pop">
                {/* Outer glow ring — pulses with the breathe animation. */}
                <div
                    aria-hidden
                    className="absolute -inset-6 rounded-full pointer-events-none orb-glow-ring"
                    style={{
                        background: 'radial-gradient(circle, rgba(34,211,238,0.5) 0%, rgba(217,70,239,0.3) 40%, transparent 70%)',
                        filter: 'blur(20px)',
                    }}
                />

                {/* The glass orb itself. Glassmorphism: subtle white tint,
                    backdrop blur, refractive border, soft inner shadow. */}
                <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full overflow-hidden orb-breathe"
                    style={{
                        background: 'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18), rgba(255,255,255,0.04) 55%, rgba(0,0,0,0.4) 100%)',
                        boxShadow: '0 0 60px rgba(34,211,238,0.45), 0 0 120px rgba(217,70,239,0.25), inset 0 0 30px rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                    }}
                >
                    {/* Logo */}
                    <div className="absolute inset-0 flex items-center justify-center p-5">
                        <img
                            src={logoUrl}
                            alt=""
                            className="max-w-full max-h-full object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] orb-logo-fade"
                        />
                    </div>

                    {/* Specular highlight (top-left gloss) */}
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle at 28% 22%, rgba(255,255,255,0.30), transparent 38%)',
                            mixBlendMode: 'screen',
                        }}
                    />

                    {/* Neon sweep — diagonal light lancing across the orb,
                        same easing as the StudioContextViewer tab-change sweep. */}
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none orb-sweep"
                        style={{
                            background: 'linear-gradient(110deg, transparent 0%, transparent 35%, rgba(255,255,255,0.7) 50%, transparent 65%, transparent 100%)',
                            mixBlendMode: 'screen',
                        }}
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none orb-sweep-color"
                        style={{
                            background: 'linear-gradient(110deg, transparent 0%, rgba(34,211,238,0.6) 50%, transparent 100%)',
                            mixBlendMode: 'screen',
                        }}
                    />

                    {/* Refractive bottom-rim shadow for depth */}
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-full"
                        style={{ boxShadow: 'inset 0 -20px 30px rgba(0,0,0,0.55)' }}
                    />
                </div>
            </div>

            {/* Caption */}
            <div className="mt-10 flex flex-col items-center gap-3 orb-label">
                <span className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 font-cinzel">
                    Le Salon des Inconnus
                </span>
                <span
                    className="font-studio-display font-black italic uppercase tracking-tight text-3xl text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300 drop-shadow-[0_0_20px_rgba(34,211,238,0.7)]"
                >
                    {label}
                </span>
            </div>

            <style>{`
                /* Orb entry — scale + soft fade-in. */
                .orb-pop {
                    animation: orbPop 700ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
                }
                @keyframes orbPop {
                    0%   { opacity: 0; transform: scale(0.6); filter: blur(8px); }
                    60%  { opacity: 1; filter: blur(0); }
                    100% { opacity: 1; transform: scale(1); }
                }

                /* Slow breathing pulse on the glass surface. */
                .orb-breathe {
                    animation: orbBreathe 3.4s ease-in-out infinite alternate;
                }
                @keyframes orbBreathe {
                    0%   { transform: scale(1); }
                    100% { transform: scale(1.04); }
                }

                /* Glow ring throbs slightly out-of-phase with the breathe. */
                .orb-glow-ring {
                    animation: orbGlow 2.6s ease-in-out infinite alternate;
                }
                @keyframes orbGlow {
                    0%   { opacity: 0.55; transform: scale(0.96); }
                    100% { opacity: 1;    transform: scale(1.08); }
                }

                /* Neon sweep — primary white lance + tinted secondary lance.
                   Each sweep takes ~1.6s and repeats every 2.6s. */
                .orb-sweep {
                    animation: orbSweep 2.6s cubic-bezier(0.2, 0.7, 0.3, 1) infinite;
                    transform: translateX(-130%);
                }
                @keyframes orbSweep {
                    0%   { transform: translateX(-130%); opacity: 0; }
                    20%  { opacity: 1; }
                    60%  { transform: translateX(130%); opacity: 0; }
                    100% { transform: translateX(130%); opacity: 0; }
                }
                .orb-sweep-color {
                    animation: orbSweep 2.6s cubic-bezier(0.2, 0.7, 0.3, 1) 200ms infinite;
                    transform: translateX(-130%);
                }

                /* Logo gentle fade so it doesn't pop hard at frame 0. */
                .orb-logo-fade {
                    animation: orbLogoFade 900ms ease-out 200ms both;
                }
                @keyframes orbLogoFade {
                    0%   { opacity: 0; transform: scale(0.85); }
                    100% { opacity: 1; transform: scale(1); }
                }

                /* Caption rises into view slightly behind the orb. */
                .orb-label {
                    animation: orbLabel 900ms cubic-bezier(0.2, 0.7, 0.3, 1) 350ms both;
                }
                @keyframes orbLabel {
                    0%   { opacity: 0; transform: translateY(12px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                /* Aurora drift behind the orb. */
                .orb-aurora-a { animation: orbAuroraA 8s ease-in-out infinite alternate; }
                .orb-aurora-b { animation: orbAuroraB 11s ease-in-out infinite alternate; }
                .orb-aurora-c { animation: orbAuroraC 14s ease-in-out infinite alternate; }
                @keyframes orbAuroraA {
                    0%   { transform: translate(-52%, -52%) scale(1.0); opacity: 0.55; }
                    100% { transform: translate(-48%, -48%) scale(1.12); opacity: 0.85; }
                }
                @keyframes orbAuroraB {
                    0%   { transform: translate(-48%, -50%) scale(1.05); opacity: 0.5; }
                    100% { transform: translate(-52%, -52%) scale(1.18); opacity: 0.8; }
                }
                @keyframes orbAuroraC {
                    0%   { transform: translate(-50%, -48%) scale(0.95); opacity: 0.4; }
                    100% { transform: translate(-50%, -52%) scale(1.10); opacity: 0.7; }
                }

                /* Honor reduced-motion preferences — keep the orb visible but
                   freeze the lancing sweep so it doesn't strobe. */
                @media (prefers-reduced-motion: reduce) {
                    .orb-pop, .orb-breathe, .orb-glow-ring,
                    .orb-sweep, .orb-sweep-color, .orb-logo-fade, .orb-label,
                    .orb-aurora-a, .orb-aurora-b, .orb-aurora-c {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
};
