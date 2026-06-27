// PetiteMonnaieCoin — the interactive hero coin.
// The Petite Monnaie emblem struck on a brass coin. As the pointer moves over
// it, the coin tilts in 3D and a specular highlight tracks the cursor, so the
// metal catches the light. It floats gently at rest. Built with framer-motion.

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

const PM_LOGO = 'https://pmonnaie.ca/wp-content/uploads/2024/04/cropped-PM_profil-e1712766855885-270x270.png';
const BRASS = '#C9A85A';
const BRASS_DEEP = '#B08D3A';

export const PetiteMonnaieCoin: React.FC<{ size?: number }> = ({ size = 340 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // pointer position within the coin, 0..1 (0.5 = centred / resting)
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 140, damping: 18 });
  const sy = useSpring(my, { stiffness: 140, damping: 18 });

  const rotateY = useTransform(sx, [0, 1], [20, -20]);
  const rotateX = useTransform(sy, [0, 1], [-20, 20]);
  const glareX = useTransform(sx, [0, 1], ['12%', '88%']);
  const glareY = useTransform(sy, [0, 1], ['10%', '90%']);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,250,228,0.6), rgba(255,248,224,0.14) 26%, transparent 55%)`;
  // a faint shadow that leans opposite the tilt
  const shadowX = useTransform(sx, [0, 1], [26, -26]);

  const onMove = (e: React.MouseEvent) => {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <div className="relative mx-auto" style={{ width: size, height: size, perspective: 1000 }}>
      {/* ground glow */}
      <motion.div className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
        style={{ width: size * 1.5, height: size * 1.5, top: -size * 0.25, background: `radial-gradient(circle, ${BRASS}33 0%, ${BRASS}10 40%, transparent 66%)`, filter: 'blur(8px)', x: shadowX }} />

      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative w-full h-full cursor-pointer"
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        animate={reduce ? undefined : { y: [0, -12, 0] }}
        transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* coin body */}
        <div className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: `radial-gradient(circle at 38% 30%, #f4e6bd 0%, ${BRASS} 32%, ${BRASS_DEEP} 70%, #7c5e1d 100%)`,
            boxShadow: `0 0 0 2px ${BRASS}, 0 0 0 10px ${BRASS_DEEP}, 0 0 0 12px rgba(0,0,0,0.35), 0 40px 80px rgba(0,0,0,0.55), inset 0 0 60px rgba(124,94,29,0.5)`,
          }}>
          {/* milled edge ticks */}
          <div className="absolute inset-0 rounded-full" style={{
            background: `repeating-conic-gradient(${BRASS_DEEP} 0deg 3deg, transparent 3deg 6deg)`,
            WebkitMask: 'radial-gradient(circle, transparent 0 47%, #000 47% 50%, transparent 50%)',
            mask: 'radial-gradient(circle, transparent 0 47%, #000 47% 50%, transparent 50%)',
            opacity: 0.5,
          }} />
          {/* inner face */}
          <div className="absolute rounded-full overflow-hidden"
            style={{ inset: size * 0.12, boxShadow: `inset 0 0 0 2px ${BRASS_DEEP}99, inset 0 6px 18px rgba(124,94,29,0.6)` }}>
            <img src={PM_LOGO} alt="Petite Monnaie" className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 120% at 32% 26%, rgba(255,250,230,0.28) 0%, transparent 42%)' }} />
          </div>
          {/* periodic light ray sweeping edge to edge every 10s (in addition to the
              cursor-tracked highlight below). Soft-edged via the gradient, no blur. */}
          <div className="pm-coin-sheen absolute top-0 bottom-0 left-0 w-[55%] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,250,228,0.55) 50%, transparent 100%)', mixBlendMode: 'screen' }}
            aria-hidden />

          {/* cursor-tracked specular highlight */}
          <motion.div className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: glare, mixBlendMode: 'screen' }} />
        </div>
      </motion.div>
    </div>
  );
};
