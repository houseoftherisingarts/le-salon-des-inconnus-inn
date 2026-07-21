import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getOptimizedUrl } from '../utils/imageOptimizer';

// Shared design primitives for /entreprises and /forfaits. Language: warm
// cinematic dark + GLASSMORPHISM (frosted translucent panels, soft rounded
// corners ~15-24px, gentle glow), anchored on the house Creator Studio look.
// HARD RULES: no italics anywhere (accent = gold colour + weight only), rounded
// corners never sharp, soft depth over hard hairlines. Motion is transform-only
// and yields to prefers-reduced-motion.

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const GOLD = '#d9b45c';
const GOLD_SOFT = '#c5a059';
const CREAM = '#f6ead0';

const GLASS: React.CSSProperties = {
  background: 'rgba(22,17,12,0.42)',
  border: '1px solid rgba(217,180,92,0.18)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 24px 70px -28px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,240,205,0.06)',
};

/** Reusable frosted-glass panel. */
export const Glass: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ className = '', style, children }) => (
  <div className={`rounded-[22px] ${className}`} style={{ ...GLASS, ...style }}>{children}</div>
);

/** Warm near-black atmosphere with soft blurred amber glows for depth. */
export const Atmosphere: React.FC = () => (
  <>
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(135% 95% at 50% -10%, #17120d 0%, #0b0908 55%, #060403 100%)' }} />
      <div className="absolute rs-glow" style={{ top: '-12%', left: '18%', width: '55vw', height: '55vw', background: 'radial-gradient(circle, rgba(217,180,92,0.16), transparent 66%)', filter: 'blur(90px)' }} />
      <div className="absolute rs-glow2" style={{ bottom: '-16%', right: '10%', width: '48vw', height: '48vw', background: 'radial-gradient(circle, rgba(160,120,70,0.13), transparent 68%)', filter: 'blur(100px)' }} />
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
    </div>
    <RetreatStyle />
  </>
);

/** Fixed top bar: a glass pill back button + tracked page title. */
export const TopBar: React.FC<{ onBack: () => void; title: string; back: string }> = ({ onBack, title, back }) => (
  <header className="fixed top-0 w-full z-[100]">
    <div className="mx-auto px-5 md:px-8 py-5 flex justify-between items-center">
      <button onClick={onBack} className="rs-pill font-cinzel uppercase text-[11px] tracking-[0.26em] px-5 py-2.5 rounded-full" style={{ color: CREAM }}>
        ← {back}
      </button>
      <span className="font-cinzel text-[11px] md:text-xs tracking-[0.42em] hidden md:block" style={{ color: 'rgba(217,180,92,0.72)' }}>
        {title}
      </span>
    </div>
  </header>
);

/** Cinematic hero as a large rounded image card with a Ken Burns drift, warm
 *  scrim, a glass kicker pill, and an oversized Prata title (gold upright
 *  accent word — never italic). */
export const HeroFramed: React.FC<{
  img: string; kicker: string; lead: string; accent: string; tail?: string; sub: string;
}> = ({ img, kicker, lead, accent, tail, sub }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);
  return (
    <section ref={ref} className="px-3 md:px-6 pt-20 md:pt-24">
      <div className="relative rounded-[28px] overflow-hidden min-h-[86vh] flex items-end" style={{ boxShadow: '0 50px 120px -40px rgba(0,0,0,0.85)' }}>
        <motion.div className="absolute inset-0 will-change-transform" style={{ y }} aria-hidden>
          <img src={getOptimizedUrl(img, 1920)} alt="" className="rs-kenburns w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,5,0.22) 0%, rgba(8,6,5,0.5) 48%, rgba(8,6,5,0.94) 92%)' }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(85% 65% at 50% 28%, transparent 42%, rgba(8,6,5,0.42) 100%)' }} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }} className="relative px-6 md:px-14 lg:px-20 pb-16 md:pb-20 w-full">
          <span className="rs-pill inline-block font-cinzel uppercase mb-7 px-5 py-2 rounded-full" style={{ fontSize: '11px', letterSpacing: '0.34em', color: GOLD }}>{kicker}</span>
          <h1 className="font-prata" style={{ color: CREAM, fontSize: 'clamp(2.9rem, 7.2vw, 6.4rem)', lineHeight: 0.96, letterSpacing: '-0.02em', textShadow: '0 4px 40px rgba(0,0,0,0.6)' }}>
            {lead} <span style={{ color: GOLD }}>{accent}</span>{tail ? <> {tail}</> : null}
          </h1>
          <p className="font-cormorant mt-7" style={{ color: 'rgba(255,250,240,0.86)', fontSize: 'clamp(1.2rem, 2vw, 1.7rem)', lineHeight: 1.5, maxWidth: '54ch', fontWeight: 500 }}>
            {sub}
          </p>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rs-scroll" aria-hidden>
          <span className="block h-9 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(217,180,92,0.8))' }} />
        </div>
      </div>
    </section>
  );
};

/** Roman-numeral section index in a soft glass pill + overline. */
export const SectionLabel: React.FC<{ numeral: string; label: string }> = ({ numeral, label }) => (
  <div className="flex items-center gap-4 mb-12 md:mb-16">
    <span className="rs-pill grid place-items-center font-prata rounded-full" style={{ color: GOLD, width: '46px', height: '46px', fontSize: '1.1rem' }}>{numeral}</span>
    <span className="font-cinzel uppercase" style={{ fontSize: '11px', letterSpacing: '0.32em', color: 'rgba(255,250,240,0.55)' }}>{label}</span>
    <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(217,180,92,0.28), transparent)' }} />
  </div>
);

/** Alternating asymmetric row: soft rounded image card + upright text. */
export const EditorialRow: React.FC<{
  img: string; kicker: string; title: string; body: string; flip?: boolean;
}> = ({ img, kicker, title, body, flip }) => (
  <motion.article
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className="grid md:grid-cols-12 gap-8 md:gap-14 items-center"
  >
    <div className={`md:col-span-7 ${flip ? 'md:order-2' : ''}`}>
      <div className="rs-imgwrap relative overflow-hidden rounded-[18px]" style={{ aspectRatio: '16 / 10', boxShadow: '0 34px 80px -34px rgba(0,0,0,0.85)', border: '1px solid rgba(217,180,92,0.14)' }}>
        <img src={getOptimizedUrl(img, 1100)} alt={title} loading="lazy" className="rs-img w-full h-full object-cover" />
      </div>
    </div>
    <div className={`md:col-span-5 ${flip ? 'md:order-1' : ''}`}>
      <span className="font-cinzel uppercase block mb-4" style={{ fontSize: '10px', letterSpacing: '0.3em', color: GOLD }}>{kicker}</span>
      <h3 className="font-prata mb-4" style={{ color: CREAM, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.1 }}>{title}</h3>
      <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.74)', fontSize: 'clamp(1.1rem, 1.5vw, 1.28rem)', lineHeight: 1.6, fontWeight: 500 }}>{body}</p>
    </div>
  </motion.article>
);

/** Rounded gold pill CTA with a soft glow. */
export const GoldButton: React.FC<{ onClick?: () => void; href?: string; children: React.ReactNode; type?: 'button' | 'submit'; disabled?: boolean }> = ({ onClick, href, children, type, disabled }) => {
  const cls = 'rs-cta inline-block font-cinzel text-[12px] uppercase tracking-[0.28em] px-10 py-4 rounded-full disabled:opacity-50';
  if (href) return <a href={href} className={cls}>{children}</a>;
  return <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
};

const RetreatStyle: React.FC = () => (
  <style>{`
    .rs-kenburns { animation: rsKen 28s ease-in-out infinite alternate; transform-origin: 55% 45%; }
    @keyframes rsKen { from { transform: scale(1.05); } to { transform: scale(1.15) translate3d(-1.5%, -1%, 0); } }
    .rs-glow { animation: rsGlow 34s ease-in-out infinite; }
    .rs-glow2 { animation: rsGlow 40s ease-in-out infinite reverse; }
    @keyframes rsGlow { 0%,100% { transform: translate3d(0,0,0) scale(1); opacity:.9;} 50% { transform: translate3d(3%,4%,0) scale(1.12); opacity:1;} }
    .rs-scroll { animation: rsScroll 2.6s ease-in-out infinite; }
    @keyframes rsScroll { 0%,100% { opacity:.3; transform: translate(-50%,0);} 50% { opacity:.9; transform: translate(-50%,6px);} }
    .rs-img { transition: transform 1.2s cubic-bezier(0.16,1,0.3,1); }
    .rs-imgwrap:hover .rs-img { transform: scale(1.05); }
    .rs-pill { background: rgba(20,15,11,0.5); border: 1px solid rgba(217,180,92,0.22); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); transition: border-color .35s, color .35s, background .35s; }
    .rs-pill:hover { border-color: rgba(217,180,92,0.55); color:#f6ead0; }
    .rs-cta { position: relative; color:#120d08; background: linear-gradient(135deg, #e6c778 0%, #c5a059 100%); box-shadow: 0 14px 34px -10px rgba(217,180,92,0.55); transition: transform .4s cubic-bezier(0.16,1,0.3,1), box-shadow .4s; }
    .rs-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 44px -10px rgba(217,180,92,0.7); }
    @media (prefers-reduced-motion: reduce) {
      .rs-kenburns { animation: none !important; transform: scale(1.04) !important; }
      .rs-glow, .rs-glow2, .rs-scroll { animation: none !important; }
      .rs-img, .rs-cta { transition: none !important; }
    }
  `}</style>
);
