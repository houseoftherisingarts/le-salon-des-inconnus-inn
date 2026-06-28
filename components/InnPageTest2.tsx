import React from 'react';
import { RoomOrbProvider } from './RoomOrbModal';
import {
  InnHero,
  ManorRoomsSection,
  IndependentStaysSection,
  PhotoGallerySection,
  SpacesGrid,
  DetailsSection,
  VideoTourSection,
  LocalGuideSection,
  HostsSection,
  EventsSection,
  WwoofingSection,
  MapFooterSection,
  LazySection,
} from './InnPage';

// ─────────────────────────────────────────────────────────────────────────────
// InnPageTest2 — editorial test page.
//   • Hero: original InnHero (WebGL liquid-glass cycler) — untouched, HOSTEL vibe
//   • Section 2: 50/50 split (text + photo with Ken Burns)
//   • Section 3: Services half-moon portals (Kitchen + Massage)
// ─────────────────────────────────────────────────────────────────────────────

interface InnPageTest2Props {
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
}

const SECTION2_PHOTO = '/media/Financement%20Artistique/centered%20copy.jpg';
const KITCHEN_PHOTO = '/media/Cuisine/Plating%20alexis%20ai%20(1).jpg';
const MASSAGE_PHOTO = '/media/massage/massage%20andre.png';

export const InnPageTest2: React.FC<InnPageTest2Props> = ({ language, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);

  return (
    <RoomOrbProvider language={language}>
    <div
      className="fixed inset-0 z-50 bg-[#050505] text-white overflow-y-auto custom-scrollbar selection:bg-[#d4af37] selection:text-black"
      data-inn-scroll
    >
      {/* Tiny back-to-real-Inn link */}
      <button
        onClick={() => onNavigate('INN')}
        className="fixed top-5 left-5 z-[100] flex items-center gap-2 text-[10px] font-cinzel uppercase tracking-[0.4em] text-[#d4af37]/70 hover:text-[#d4af37] transition-colors"
      >
        <span>←</span>
        {t('Real inn', 'Page actuelle')}
      </button>

      {/* ── HERO — original WebGL liquid-glass cycler, HOSTEL vibe (matches live /) ── */}
      <InnHero
        language={language}
        vibe={'HOSTEL'}
        onCycleVibe={() => { /* vibe locked on test page */ }}
        onReserver={() => {
          // Scroll one viewport down to the History section
          const root = document.querySelector('[data-inn-scroll]') as HTMLElement | null;
          if (root) root.scrollTo({ top: root.clientHeight, behavior: 'smooth' });
        }}
        onWwoofing={() => onNavigate('WWOOFING')}
      />

      {/* ── SECTION 2 — full-bleed photo with dark gradient overlay (text on left) ── */}
      <section className="relative min-h-screen overflow-hidden bg-[#050505]">
        {/* Full-bleed photo bleeds across the entire viewport, no hard column edge */}
        <img
          src={SECTION2_PHOTO}
          alt="Maison Favier interior"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover sec2-img"
        />
        {/* Dark gradient overlay: solid black on left, fading to transparent on right.
            Text sits over the dark area; photo dominates on the right. */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to right, #050505 0%, rgba(5,5,5,0.92) 18%, rgba(5,5,5,0.55) 42%, rgba(5,5,5,0) 60%)',
          }}
        />
        {/* Soft top + bottom fades so photo doesn't have hard horizontal edges */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" aria-hidden />

        {/* Text overlay — left column, vertically centered */}
        <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex items-center px-8 md:px-16 lg:px-24 py-20">
          <div className="max-w-md reveal-on-load">
            <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em] mb-6 block">
              {t('The History', 'L\'Histoire')}
            </span>
            <h2
              className="font-cinzel text-white uppercase leading-[0.95] tracking-[-0.01em] mb-8"
              style={{
                fontSize: 'clamp(2rem, 5vw, 4.5rem)',
                textShadow: '0 4px 30px rgba(0,0,0,0.6)',
              }}
            >
              {t('Built in 1898', 'Bâtie en 1898')}
            </h2>
            <p
              className="font-lato text-neutral-300 text-base md:text-lg leading-relaxed mb-8"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}
            >
              {t(
                'A Victorian manor on twelve forested acres above the Lac Simon valley. We restored it room by room — preserving the bones, layering in art, music, food, and the quiet space artists need to make work that matters.',
                'Un manoir victorien sur douze acres boisés surplombant la vallée du Lac Simon. Nous l\'avons restauré pièce par pièce — préservant les os, ajoutant l\'art, la musique, la nourriture et l\'espace silencieux dont les artistes ont besoin pour créer.',
              )}
            </p>
            <button
              onClick={() => onNavigate('CEILIDH')}
              className="group flex items-center gap-3 px-8 py-3 border border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#d4af37]/5 text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.3em] transition-all"
            >
              {t('Discover', 'Découvrir')}
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — Services: Kitchen + Massage half-moon portals ── */}
      <section className="relative bg-[#050505] py-16 md:py-24 px-3 md:px-6 lg:px-10">
        {/* Eyebrow */}
        <div className="text-center mb-10 md:mb-14">
          <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em]">
            {t('Services', 'Les Services')}
          </span>
          <h2
            className="font-cinzel text-white uppercase mt-3 leading-[0.95] tracking-[-0.01em]"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
          >
            {t('Beyond the Stay', 'Plus que l\'Hébergement')}
          </h2>
        </div>

        {/* Two half-moon portals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 max-w-[1500px] mx-auto">

          {/* KITCHEN — left portal, rounded outer-left */}
          <button
            onClick={() => onNavigate('KITCHEN')}
            className="services-portal group relative overflow-hidden border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-700 rounded-t-[30px] md:rounded-tr-none md:rounded-bl-[30px] md:rounded-tl-[30px] cursor-pointer min-h-[420px] md:min-h-[560px] text-left"
          >
            <img
              src={KITCHEN_PHOTO}
              alt="Cuisine"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-[#050505]/15" />
            <div className="relative z-10 h-full min-h-[420px] md:min-h-[560px] flex flex-col justify-end p-10 md:p-16">
              <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em] mb-3">
                {t('Kitchen', 'Cuisine')}
              </span>
              <h3 className="font-cinzel text-white text-3xl md:text-5xl uppercase mb-3 leading-tight">
                {t('Catering', 'Traiteur')}
              </h3>
              <p className="text-neutral-300 text-sm md:text-base font-lato max-w-sm leading-relaxed opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 mb-5">
                {t('Molecular catering & Portuguese bistronomy. Private chef for events.', 'Traiteur moléculaire & bistronomie portugaise. Chef privé pour événements.')}
              </p>
              <span className="inline-flex items-center gap-2 text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.4em] opacity-80 group-hover:opacity-100 transition-opacity">
                {t('Discover', 'Découvrir')}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </button>

          {/* MASSAGE — right portal, rounded outer-right */}
          <button
            onClick={() => onNavigate('MASSOTHERAPY')}
            className="services-portal group relative overflow-hidden border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-700 rounded-b-[30px] md:rounded-bl-none md:rounded-br-[30px] md:rounded-tr-[30px] cursor-pointer min-h-[420px] md:min-h-[560px] text-left"
          >
            <img
              src={MASSAGE_PHOTO}
              alt="Massotherapy"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-[#050505]/15" />
            <div className="relative z-10 h-full min-h-[420px] md:min-h-[560px] flex flex-col justify-end p-10 md:p-16">
              <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em] mb-3">
                {t('Wellness', 'Bien-être')}
              </span>
              <h3 className="font-cinzel text-white text-3xl md:text-5xl uppercase mb-3 leading-tight">
                {t('Massage', 'Massothérapie')}
              </h3>
              <p className="text-neutral-300 text-sm md:text-base font-lato max-w-sm leading-relaxed opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 mb-5">
                {t('Holistic care, Reiki & deep tissue. Practitioner on site.', 'Soins holistiques, Reiki & tissu profond. Praticien sur place.')}
              </p>
              <span className="inline-flex items-center gap-2 text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.4em] opacity-80 group-hover:opacity-100 transition-opacity">
                {t('Discover', 'Découvrir')}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </button>

        </div>
      </section>

      {/* ── Manor + Connected Rooms (estate tree) ── */}
      <section className="bg-[#050505] border-t border-white/5">
        <ManorRoomsSection language={language} vibe={'HOSTEL'} />
      </section>

      {/* ── Independent Stays (bus + tiny) ── */}
      <section className="bg-[#050505] border-t border-white/5">
        <IndependentStaysSection language={language} vibe={'HOSTEL'} />
      </section>

      {/* ── Photo Gallery (lazy-loaded for perf) ── */}
      <section className="bg-[#050505] border-t border-white/5">
        <LazySection placeholderHeight="50vh">
          <PhotoGallerySection language={language} vibe={'HOSTEL'} />
        </LazySection>
      </section>

      {/* ── L'Espace — 12-card amenity grid ── */}
      <section className="bg-[#050505] border-t border-white/5">
        <SpacesGrid language={language} vibe={'HOSTEL'} />
      </section>

      {/* ── (Section 3 — Services half-moon — already above between manor and gallery; keeping as-is) ── */}

      {/* ── Details — Ressentez l'ambiance (3D objects + video) ── */}
      <section className="bg-[#050505] border-t border-white/5">
        <DetailsSection language={language} vibe={'HOSTEL'} />
      </section>

      {/* ── Video Tour (lazy) ── */}
      <section className="bg-[#050505] border-t border-white/5">
        <LazySection placeholderHeight="600px">
          <VideoTourSection language={language} vibe={'HOSTEL'} />
        </LazySection>
      </section>

      {/* ── Local Guide ── */}
      <LocalGuideSection
        language={language}
        vibe={'HOSTEL'}
        onNavigate={onNavigate}
      />

      {/* ── Hosts intro ── */}
      <HostsSection
        language={language}
        vibe={'HOSTEL'}
        onNavigate={onNavigate}
      />

      {/* ── Events teaser (Ceilidh) ── */}
      <EventsSection
        language={language}
        vibe={'HOSTEL'}
        onNavigate={onNavigate}
      />

      {/* ── Wwoofing teaser ── */}
      <WwoofingSection
        language={language}
        vibe={'HOSTEL'}
        onNavigate={onNavigate}
      />

      {/* ── Map footer ── */}
      <MapFooterSection language={language} vibe={'HOSTEL'} />

      {/* Animation styles */}
      <style>{`
        /* Eyebrow rules grow on entry */
        .hero-rule-grow {
          width: 0;
          animation: ruleGrow 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
        }
        @media (min-width: 768px) { .hero-rule-grow { animation-name: ruleGrowMd; } }
        @keyframes ruleGrow   { to { width: 40px; } }
        @keyframes ruleGrowMd { to { width: 56px; } }

        .hero-eyebrow {
          opacity: 0;
          animation: fadeIn 0.7s ease-out 0.1s forwards;
        }

        .hero-title {
          opacity: 0;
          transform: translateY(28px);
          animation: titleIn 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.3s forwards;
          will-change: transform, opacity;
        }
        @keyframes titleIn { to { opacity: 1; transform: translateY(0); } }

        .hero-photo {
          opacity: 0;
          transform: scale(0.94);
          animation:
            photoIn 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.55s forwards,
            photoFloat 7s ease-in-out 1.7s infinite;
          will-change: transform;
        }
        @keyframes photoIn { to { opacity: 1; transform: scale(1); } }
        @keyframes photoFloat {
          0%, 100% { transform: translateY(0)   scale(1); }
          50%      { transform: translateY(-6px) scale(1.005); }
        }

        .hero-tagline {
          opacity: 0;
          transform: translateY(12px);
          animation: fadeUp 0.8s ease-out 0.95s forwards;
        }
        .hero-ctas {
          opacity: 0;
          transform: translateY(8px);
          animation: fadeUp 0.7s ease-out 1.15s forwards;
        }
        .hero-scroll {
          opacity: 0;
          animation: fadeIn 0.8s ease-out 1.5s forwards;
        }
        .hero-scroll-line {
          animation: scrollPulse 2.4s ease-in-out infinite;
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.6); transform-origin: top; }
          50%      { opacity: 1;   transform: scaleY(1);   transform-origin: top; }
        }

        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

        /* Section 2 — gentle parallax-like Ken Burns on the photo */
        .sec2-img { animation: kenBurns 18s ease-in-out infinite alternate; }
        @keyframes kenBurns {
          0%   { transform: scale(1.02) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1%, -1%); }
        }
        .reveal-on-load > * { opacity: 0; animation: fadeUp 1s ease-out 0.4s forwards; }

        @media (prefers-reduced-motion: reduce) {
          .hero-eyebrow, .hero-title, .hero-photo, .hero-tagline, .hero-ctas, .hero-scroll,
          .reveal-on-load > * {
            opacity: 1 !important;
            transform: none !important;
            animation: none !important;
          }
          .hero-rule-grow { width: 56px !important; animation: none !important; }
          .hero-scroll-line, .sec2-img { animation: none !important; }
        }
      `}</style>
    </div>
    </RoomOrbProvider>
  );
};
