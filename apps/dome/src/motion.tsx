import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export const EASE = [0.22, 1, 0.36, 1] as const;

// D3 — grain fin (SVG feTurbulence inline, mix-blend overlay)
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

// D4 — Atmosphere : section sombre = matière éclairée, jamais un panneau plat.
// Quatre couches CSS pures : key light or, lueur de plancher, vignette, grain.
export function Atmosphere({
  light = '70% 18%',
  strength = 0.8,
  vignette = true,
}: {
  light?: string;
  strength?: number;
  vignette?: boolean;
}) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {strength > 0 && (
        <span
          className="absolute inset-0 breathe"
          style={{
            background: `radial-gradient(55% 42% at ${light}, rgba(197,160,89,${0.16 * strength}), transparent 70%)`,
          }}
        />
      )}
      {strength > 0 && (
        <span
          className="absolute inset-0"
          style={{
            background: `radial-gradient(48% 34% at 12% 96%, rgba(160,102,52,${0.12 * strength}), transparent 72%)`,
          }}
        />
      )}
      {vignette && (
        <span
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 42%, transparent 58%, rgba(0,0,0,0.5))',
          }}
        />
      )}
      <span
        className="absolute inset-0"
        style={{ backgroundImage: GRAIN_URI, mixBlendMode: 'overlay', opacity: 0.05 }}
      />
    </div>
  );
}

// C3 — reveal-on-scroll (fade-up, latch au premier passage)
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 1.1, ease: [...EASE], delay }}
    >
      {children}
    </motion.div>
  );
}

// B3 — eyebrow éditorial : filet or empilé AU-DESSUS, tout au même bord gauche
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div>
      <span className="block w-10 h-px bg-[#c5a059] mb-4" />
      <span className="font-cinzel text-[#c5a059] text-[10px] md:text-[11px] uppercase tracking-[0.5em]">
        {children}
      </span>
    </div>
  );
}
