import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getOptimizedUrl } from '../utils/imageOptimizer';

// Shared art-direction primitives for the two revenue pages (/entreprises,
// /forfaits). One visual language: warm cinematic dark, an inset gold hairline
// frame, editorial oversized type, roman-numeral section index, slow Ken Burns
// heroes, alternating asymmetric image rows. All motion is transform-only and
// yields to prefers-reduced-motion (see the <style> block at the bottom).

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';
const GOLD = '#c5a059';
const CREAM = '#f3e5ab';

/** Fixed warm near-black atmosphere: radial warm glow that drifts, plus grain. */
export const Atmosphere: React.FC = () => (
  <>
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 90% at 50% -8%, #191410 0%, #0b0908 52%, #050403 100%)' }} />
      <div className="absolute inset-0 rs-drift will-change-transform" style={{ background: 'radial-gradient(42% 34% at 50% 12%, rgba(197,160,89,0.16), transparent 70%)' }} />
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 240px 60px rgba(0,0,0,0.75)' }} />
      <div className="absolute inset-0 opacity-[0.055]" style={{ backgroundImage: `url('${GRAIN}')` }} />
    </div>
    <RetreatStyle />
  </>
);

/** Fixed top bar with a back link and the page's tracked title. */
export const TopBar: React.FC<{ onBack: () => void; title: string; back: string }> = ({ onBack, title, back }) => (
  <header className="fixed top-0 w-full z-[100]">
    <div className="mx-auto px-6 md:px-10 py-5 flex justify-between items-center">
      <button onClick={onBack} className="rs-link text-[11px] md:text-xs font-cinzel uppercase tracking-[0.28em]" style={{ color: GOLD }}>
        ← {back}
      </button>
      <span className="font-cinzel text-[11px] md:text-xs tracking-[0.42em] hidden md:block" style={{ color: 'rgba(197,160,89,0.7)' }}>
        {title}
      </span>
    </div>
  </header>
);

/** Cinematic hero: full-bleed Ken Burns image, layered warm wash, inset gold
 *  hairline frame, oversized Prata title with one italic gold accent word. */
export const HeroFramed: React.FC<{
  img: string; kicker: string; lead: string; accent: string; tail?: string; sub: string;
}> = ({ img, kicker, lead, accent, tail, sub }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  return (
    <section ref={ref} className="relative min-h-[92vh] flex items-end overflow-hidden">
      <motion.div className="absolute inset-0 will-change-transform" style={{ y }} aria-hidden>
        <img src={getOptimizedUrl(img, 1920)} alt="" className="rs-kenburns w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,5,0.30) 0%, rgba(8,6,5,0.55) 46%, rgba(8,6,5,0.97) 92%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(80% 60% at 50% 30%, transparent 40%, rgba(8,6,5,0.5) 100%)' }} />
      </motion.div>

      {/* inset gold hairline frame — the signature detail */}
      <div className="absolute pointer-events-none" style={{ inset: '18px', border: `1px solid rgba(197,160,89,0.28)` }} aria-hidden />
      <div className="absolute pointer-events-none" style={{ inset: '22px', border: `1px solid rgba(197,160,89,0.10)` }} aria-hidden />

      <motion.div style={{ opacity: fade }} className="relative px-6 md:px-14 lg:px-24 pb-20 md:pb-28 w-full">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>
          <div className="flex items-center gap-4 mb-7">
            <span className="h-px w-14" style={{ background: GOLD }} />
            <span className="font-cinzel uppercase" style={{ fontSize: '11px', letterSpacing: '0.42em', color: GOLD }}>{kicker}</span>
          </div>
          <h1 className="font-prata" style={{ color: CREAM, fontSize: 'clamp(2.9rem, 7.4vw, 6.6rem)', lineHeight: 0.94, letterSpacing: '-0.02em', textShadow: '0 2px 40px rgba(0,0,0,0.6)' }}>
            {lead}{' '}
            <span className="font-cormorant italic" style={{ color: GOLD, fontWeight: 500 }}>{accent}</span>
            {tail ? <> {tail}</> : null}
          </h1>
          <p className="font-cormorant italic mt-8" style={{ color: 'rgba(255,252,244,0.82)', fontSize: 'clamp(1.2rem, 2.1vw, 1.75rem)', lineHeight: 1.5, maxWidth: '52ch' }}>
            {sub}
          </p>
        </motion.div>
      </motion.div>

      <div className="absolute bottom-7 left-1/2 -translate-x-1/2 rs-scroll" aria-hidden>
        <span className="block h-10 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(197,160,89,0.7))' }} />
      </div>
    </section>
  );
};

/** Roman-numeral section index + letter-spaced overline + hairline. */
export const SectionLabel: React.FC<{ numeral: string; label: string }> = ({ numeral, label }) => (
  <div className="flex items-baseline gap-5 mb-12 md:mb-16">
    <span className="font-prata" style={{ color: 'rgba(197,160,89,0.55)', fontSize: 'clamp(1.4rem, 2.4vw, 2rem)' }}>{numeral}</span>
    <span className="h-px flex-1 max-w-[120px] mt-3" style={{ background: 'rgba(197,160,89,0.3)' }} />
    <span className="font-cinzel uppercase" style={{ fontSize: '11px', letterSpacing: '0.34em', color: 'rgba(255,252,244,0.5)' }}>{label}</span>
  </div>
);

/** Alternating asymmetric image/text row with a gold-framed image. */
export const EditorialRow: React.FC<{
  img: string; kicker: string; title: string; body: string; flip?: boolean;
}> = ({ img, kicker, title, body, flip }) => (
  <motion.article
    initial={{ opacity: 0, y: 26 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className={`grid md:grid-cols-12 gap-8 md:gap-14 items-center ${flip ? '' : ''}`}
  >
    <div className={`md:col-span-7 ${flip ? 'md:order-2' : ''}`}>
      <div className="rs-imgwrap relative overflow-hidden" style={{ aspectRatio: '16 / 10' }}>
        <img src={getOptimizedUrl(img, 1100)} alt={title} loading="lazy" className="rs-img w-full h-full object-cover" />
        <div className="absolute inset-0 pointer-events-none" style={{ border: '1px solid rgba(197,160,89,0.22)' }} />
      </div>
    </div>
    <div className={`md:col-span-5 ${flip ? 'md:order-1' : ''}`}>
      <span className="font-cinzel uppercase block mb-4" style={{ fontSize: '10px', letterSpacing: '0.32em', color: GOLD }}>{kicker}</span>
      <h3 className="font-prata mb-4" style={{ color: CREAM, fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.08 }}>{title}</h3>
      <p className="font-cormorant" style={{ color: 'rgba(255,252,244,0.72)', fontSize: 'clamp(1.1rem, 1.5vw, 1.28rem)', lineHeight: 1.6 }}>{body}</p>
    </div>
  </motion.article>
);

/** Refined CTA with a gold fill-sweep on hover. */
export const GoldButton: React.FC<{ onClick?: () => void; href?: string; children: React.ReactNode; type?: 'button' | 'submit'; disabled?: boolean }> = ({ onClick, href, children, type, disabled }) => {
  const cls = 'rs-cta relative inline-block px-11 py-4 font-cinzel text-[12px] uppercase tracking-[0.34em] overflow-hidden disabled:opacity-50';
  const inner = <span className="relative z-10">{children}</span>;
  if (href) return <a href={href} className={cls}>{inner}</a>;
  return <button type={type ?? 'button'} onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
};

const RetreatStyle: React.FC = () => (
  <style>{`
    .rs-kenburns { animation: rsKen 26s ease-in-out infinite alternate; transform-origin: 55% 45%; }
    @keyframes rsKen { from { transform: scale(1.06); } to { transform: scale(1.16) translate3d(-1.5%, -1%, 0); } }
    .rs-drift { animation: rsDrift 44s ease-in-out infinite; }
    @keyframes rsDrift { 0%,100% { transform: translate3d(0,0,0) scale(1);} 50% { transform: translate3d(0,2.5%,0) scale(1.06);} }
    .rs-scroll { animation: rsScroll 2.6s ease-in-out infinite; }
    @keyframes rsScroll { 0%,100% { opacity: 0.3; transform: translate(-50%, 0);} 50% { opacity: 0.9; transform: translate(-50%, 6px);} }
    .rs-img { transition: transform 1.1s cubic-bezier(0.16,1,0.3,1); }
    .rs-imgwrap:hover .rs-img { transform: scale(1.05); }
    .rs-link { position: relative; transition: color .3s; }
    .rs-link::after { content:''; position:absolute; left:0; right:100%; bottom:-3px; height:1px; background:#c5a059; transition: right .4s cubic-bezier(0.16,1,0.3,1); }
    .rs-link:hover { color:#f3e5ab; }
    .rs-link:hover::after { right:0; }
    .rs-cta { color:#f3e5ab; border:1px solid rgba(197,160,89,0.5); transition: color .5s, border-color .5s; }
    .rs-cta::before { content:''; position:absolute; inset:0; background:#c5a059; transform: translateY(101%); transition: transform .5s cubic-bezier(0.16,1,0.3,1); z-index:0; }
    .rs-cta:hover { color:#0b0908; border-color:#c5a059; }
    .rs-cta:hover::before { transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) {
      .rs-kenburns { animation: none !important; transform: scale(1.04) !important; }
      .rs-drift, .rs-scroll { animation: none !important; }
      .rs-img { transition: none !important; }
    }
  `}</style>
);
