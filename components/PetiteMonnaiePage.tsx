// PetiteMonnaiePage — landing for La Petite Monnaie.
// Top: what it is + how to obtain it (full-width editorial, never a centered
// narrow column). Bottom: the 3D scroll parcours through the artistic and
// community merchants of the Petite-Nation, starting at the Salon. Matches the
// site's warm gold-on-dark medieval system.

import React, { useEffect, useRef } from 'react';
import { PM_INTRO, PM_PROCURE, PM_BUREAUX } from '../data/petiteMonnaie';
import { PetiteMonnaieParcours } from './PetiteMonnaieParcours';
import { PetiteMonnaieCoin } from './PetiteMonnaieCoin';
import { SeoBlock } from './SeoBlock';
import { getOptimizedUrl } from '../utils/imageOptimizer';

const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';

const PAD = 'px-6 md:px-12 lg:px-20';

// Each "how to obtain it" card wears a subtly different metal so the four ways
// read at a glance: app = green, bureau de change = gold, Zeffy = silver,
// poste = bronze. All sit on the same warm-dark base, so body copy stays legible.
type MetalKey = 'green' | 'gold' | 'silver' | 'bronze';
const METAL: Record<MetalKey, { bg: string; border: string; sheen: string; glint: string; accent: string; title: string }> = {
  green: {
    bg: 'linear-gradient(152deg, rgba(60,108,76,0.20) 0%, rgba(34,58,42,0.10) 40%, #0e120e 82%)',
    border: 'rgba(96,150,110,0.34)', accent: '#8fcfa0', title: '#dff0e2',
    sheen: 'linear-gradient(135deg, rgba(170,210,180,0.07), transparent 46%)',
    glint: 'linear-gradient(90deg, transparent, rgba(180,220,190,0.18), transparent)',
  },
  gold: {
    bg: 'linear-gradient(152deg, rgba(201,168,90,0.22) 0%, rgba(120,96,40,0.10) 40%, #12100b 82%)',
    border: 'rgba(201,168,90,0.42)', accent: '#dcb055', title: '#f3e5ab',
    sheen: 'linear-gradient(135deg, rgba(243,229,171,0.09), transparent 46%)',
    glint: 'linear-gradient(90deg, transparent, rgba(243,229,171,0.22), transparent)',
  },
  silver: {
    bg: 'linear-gradient(152deg, rgba(176,186,196,0.18) 0%, rgba(90,100,110,0.09) 40%, #0e0f11 82%)',
    border: 'rgba(176,186,196,0.36)', accent: '#c2cad2', title: '#eef2f5',
    sheen: 'linear-gradient(135deg, rgba(226,232,238,0.09), transparent 46%)',
    glint: 'linear-gradient(90deg, transparent, rgba(226,232,238,0.20), transparent)',
  },
  bronze: {
    bg: 'linear-gradient(152deg, rgba(165,102,56,0.20) 0%, rgba(96,58,32,0.10) 40%, #110d0a 82%)',
    border: 'rgba(176,110,62,0.38)', accent: '#c98a5a', title: '#ecd2bb',
    sheen: 'linear-gradient(135deg, rgba(214,150,104,0.08), transparent 46%)',
    glint: 'linear-gradient(90deg, transparent, rgba(214,150,104,0.20), transparent)',
  },
};

interface PetiteMonnaiePageProps {
  onNavigate: () => void;
  language: 'EN' | 'FR';
}

export const PetiteMonnaiePage: React.FC<PetiteMonnaiePageProps> = ({ onNavigate, language }) => {
  const fr = language === 'FR';
  // The app shell is h-screen overflow-hidden, so each page is its own scroller
  // (same pattern as GuidePage). The parcours' ScrollTrigger binds to this node.
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const reveal = (el: Element) => el.classList.add('pm-in');
    const els = Array.from(root.querySelectorAll('.pm-reveal'));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { root, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((el) => io.observe(el));

    // Safety net — content must never stay invisible. A passive scroll pass reveals
    // anything in view that the observer somehow missed (HMR re-mounts, fast scroll),
    // and a timer reveals whatever is already on screen at mount.
    const sweep = () => {
      let remaining = false;
      els.forEach((el) => {
        if (el.classList.contains('pm-in')) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.94 && r.bottom > 0) reveal(el);
        else remaining = true;
      });
      if (!remaining) root.removeEventListener('scroll', sweep);
    };
    root.addEventListener('scroll', sweep, { passive: true });
    const failsafe = window.setTimeout(sweep, 1200);

    return () => { io.disconnect(); clearTimeout(failsafe); root.removeEventListener('scroll', sweep); };
  }, []);

  return (
    <div ref={scrollerRef} className="fixed inset-0 z-40 overflow-y-auto overflow-x-hidden text-white" style={{ background: '#0a0a08' }}>
      {/* page-wide atmosphere — warm near-black base (like the rest of the site)
          with a toned-down green that drifts across it, never a full green field */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #080907 0%, #0b120d 32%, #112a1d 50%, #0b120d 68%, #080907 100%)' }} />
        <div className="absolute inset-0 will-change-transform" style={{ background: 'radial-gradient(56% 42% at 50% 26%, rgba(44,76,54,0.32), transparent 72%)', animation: 'pmGreenDrift 40s ease-in-out infinite' }} />
        {/* edges fall back to warm black so the green reads as a glow, not a wash */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(125% 95% at 50% 38%, transparent 52%, rgba(8,7,6,0.92) 100%)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${getOptimizedUrl(GRAIN, 800)}')` }} />
      </div>

      {/* ── Hero: what it is (full-width editorial) ───────────────────────── */}
      <header className={`relative ${PAD} pt-32 md:pt-40 pb-14`}>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="pm-reveal order-2 lg:order-1">
            <p className="font-cinzel text-[#C9A85A] text-[11px] md:text-xs uppercase tracking-[0.42em]">
              {PM_INTRO.eyebrow}
            </p>
            <h1 className="mt-5 font-cinzel text-[14vw] leading-[0.92] sm:text-7xl lg:text-[5rem] text-[#f3e5ab]">
              {PM_INTRO.title}
            </h1>
            <p className="mt-6 font-lato text-base md:text-lg leading-relaxed text-white/72 max-w-xl">
              {PM_INTRO.lede}
            </p>
          </div>
          <div className="pm-reveal order-1 lg:order-2 flex justify-center lg:justify-end" style={{ animationDelay: '0.12s' }}>
            <PetiteMonnaieCoin size={340} />
          </div>
        </div>
      </header>

      {/* facts — full-bleed band, left-aligned */}
      <div className="pm-reveal grid grid-cols-2 md:grid-cols-4 border-y border-[#dcb055]/15">
        {PM_INTRO.facts.map((f, i) => (
          <div key={f.label}
            className={`px-6 md:px-10 lg:px-20 py-8 md:py-11 border-[#dcb055]/12 ${i < 3 ? 'md:border-r' : ''} ${i % 2 === 0 ? 'border-r md:border-r' : ''} ${i < 2 ? 'border-b md:border-b-0' : ''}`}>
            <div className="font-cinzel text-4xl md:text-5xl text-[#dcb055]">{f.value}</div>
            <div className="mt-2 font-lato text-[11px] leading-snug uppercase tracking-[0.14em] text-white/45 max-w-[18ch]">{f.label}</div>
          </div>
        ))}
      </div>

      {/* ── How to obtain it (full-width, 4 across) ───────────────────────── */}
      <section className={`${PAD} py-16 md:py-24`}>
        <div className="pm-reveal flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-14">
          <h2 className="font-cinzel text-3xl md:text-5xl text-[#f3e5ab] max-w-[16ch]">
            {fr ? "Comment s'en procurer" : 'How to get it'}
          </h2>
          <p className="font-lato text-sm text-white/55 max-w-sm md:text-right">
            {fr
              ? "Quatre façons simples d'avoir vos premières petites-monnaies en poche avant de partir explorer la Petite-Nation."
              : 'Four simple ways to get your first petites-monnaies before exploring the Petite-Nation.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PM_PROCURE.map((step, i) => {
            const m = METAL[step.metal];
            return (
              <div key={step.id}
                className="pm-reveal group relative flex flex-col rounded-2xl p-6 md:p-7 min-h-[260px] overflow-hidden transition-transform duration-500 ease-out hover:-translate-y-1.5"
                style={{ animationDelay: `${i * 0.08}s`, background: m.bg, border: `1px solid ${m.border}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                {/* brushed-metal sheen + a glint that sweeps in on hover */}
                <span aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: m.sheen }} />
                <span aria-hidden className="absolute -inset-x-8 -top-20 h-28 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                  style={{ background: m.glint, transform: 'rotate(7deg)' }} />
                <div className="relative flex items-center justify-between">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="font-cinzel text-sm tracking-[0.2em]" style={{ color: m.accent }}>{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="relative mt-5 font-cinzel text-xl" style={{ color: m.title }}>{step.title}</h3>
                <p className="relative mt-3 font-lato text-sm leading-relaxed text-white/68 flex-1">{step.body}</p>
                {step.cta && (
                  <a href={step.cta.href} target="_blank" rel="noopener noreferrer"
                    className="relative inline-flex items-center gap-2 mt-5 font-cinzel text-[11px] uppercase tracking-[0.25em] transition-opacity hover:opacity-80"
                    style={{ color: m.accent }}>
                    {step.cta.label} →
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* Salon perk — free barista coffee with your petites-monnaies */}
        <div className="pm-reveal mt-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-[#dcb055]/30 px-6 py-5"
          style={{ background: 'linear-gradient(100deg, rgba(220,176,85,0.12), rgba(220,176,85,0.02) 60%, transparent)' }}>
          <span className="text-3xl leading-none">☕</span>
          <p className="font-lato text-sm md:text-base text-white/80 leading-relaxed">
            <span className="font-cinzel text-[#f3e5ab]">{fr ? 'Au Salon des Inconnus' : 'At Le Salon des Inconnus'}</span>{' '}
            {fr
              ? ": procurez-vous vos petites-monnaies sur place et repartez avec un café barista, offert."
              : ': pick up your petites-monnaies on site and leave with a free barista coffee.'}
          </p>
        </div>
      </section>

      {/* ── Bureaux de change ────────────────────────────────────────────── */}
      <section className={`${PAD} pb-16 md:pb-24 border-t border-white/5 pt-16 md:pt-20`}>
        <div className="pm-reveal flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-9">
          <h2 className="font-cinzel text-3xl md:text-5xl text-[#f3e5ab] max-w-[14ch]">
            {fr ? 'Les bureaux de change' : 'The exchange points'}
          </h2>
          <p className="font-lato text-sm text-white/55 max-w-md md:text-right">
            {fr
              ? "Onze commerces phares font office de guichets : payez 100 $ comptant ou par débit, repartez avec une enveloppe scellée de 105 petites-monnaies."
              : 'Eleven flagship businesses act as wickets: pay 100 $ in cash or debit, leave with a sealed envelope of 105 petites-monnaies.'}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {PM_BUREAUX.map((b, i) => (
            <div key={b.name}
              className={`pm-reveal rounded-xl px-5 py-4 ${b.salon ? 'sm:col-span-2' : ''}`}
              style={{
                animationDelay: `${i * 0.05}s`,
                border: b.salon ? '1px solid #C9A85A88' : '1px solid rgba(201,168,90,0.16)',
                background: b.salon ? 'linear-gradient(100deg, rgba(201,168,90,0.12), rgba(201,168,90,0.02) 70%, transparent)' : 'rgba(13,23,17,0.5)',
              }}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-cinzel text-[#f3e5ab] text-[15px] leading-tight">{b.name}</span>
                <span className="font-lato text-[10px] uppercase tracking-[0.2em]" style={{ color: '#C9A85A' }}>{b.village}</span>
              </div>
              {b.perk && (
                <div className="mt-2.5 inline-flex items-center gap-2 text-[12px] font-lato" style={{ color: '#f3e5ab' }}>
                  <span>☕</span><span>{b.perk}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── The parcours intro ───────────────────────────────────────────── */}
      <section className={`${PAD} pt-16 md:pt-24 pb-8 border-t border-white/5`}>
        <p className="pm-reveal font-cinzel text-[#dcb055] text-[11px] uppercase tracking-[0.42em]">
          {fr ? 'Le parcours' : 'The route'}
        </p>
        <div className="pm-reveal mt-4 grid lg:grid-cols-12 gap-6 items-end" style={{ animationDelay: '0.08s' }}>
          <h2 className="lg:col-span-8 font-cinzel text-4xl md:text-6xl text-[#f3e5ab] leading-[1.02]">
            {fr ? 'Suivez la rivière, de commerce en commerce' : 'Follow the river, shop to shop'}
          </h2>
          <p className="lg:col-span-4 font-lato text-sm md:text-base text-white/60 lg:pb-2">
            {fr
              ? "Le voyage part du Salon des Inconnus, à Namur, et descend la Petite-Nation. Descendez pour avancer."
              : 'The journey starts at Le Salon des Inconnus in Namur and travels down the Petite-Nation. Scroll to move forward.'}
          </p>
        </div>
      </section>

      {/* ── The 3D scroll flythrough ─────────────────────────────────────── */}
      <PetiteMonnaieParcours language={language} scrollerRef={scrollerRef} />

      {/* ── Closing (full-width) ─────────────────────────────────────────── */}
      <section className={`${PAD} py-20 md:py-28 border-t border-white/5`}>
        <div className="grid lg:grid-cols-12 gap-8 items-end">
          <h2 className="pm-reveal lg:col-span-7 font-cinzel text-3xl md:text-5xl text-[#f3e5ab] leading-tight">
            {fr ? 'Plus de 150 commerces dans toute la Petite-Nation' : 'Over 150 merchants across the Petite-Nation'}
          </h2>
          <div className="pm-reveal lg:col-span-5" style={{ animationDelay: '0.08s' }}>
            <p className="font-lato text-sm md:text-base text-white/60">
              {fr
                ? "Ce parcours n'est qu'un avant-goût. La liste complète des commerçants participants vit sur le site de la Petite Monnaie et dans l'application."
                : 'This route is only a taste. The full list of participating merchants lives on the Petite Monnaie site and in the app.'}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a href="https://pmonnaie.ca/commercants-participants/" target="_blank" rel="noopener noreferrer"
                className="px-7 py-3 rounded-full bg-[#dcb055] text-black font-cinzel text-xs uppercase tracking-[0.25em] hover:bg-[#f0c870] transition-colors">
                {fr ? 'Voir tous les commerces' : 'See all merchants'}
              </a>
              <button onClick={onNavigate}
                className="px-7 py-3 rounded-full border border-white/25 text-white/80 font-cinzel text-xs uppercase tracking-[0.25em] hover:bg-white/10 transition-colors">
                {fr ? "Retour à l'auberge" : 'Back to the inn'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <SeoBlock viewKey="PETITE_MONNAIE" language={language} />
    </div>
  );
};
