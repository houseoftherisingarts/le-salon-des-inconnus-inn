import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { LiquidGlassCycler } from './LiquidGlassCycler';
import {
  TrustedPlatforms,
  ManorRoomsSection,
  IndependentStaysSection,
  PhotoGallerySection,
  SpacesGrid,
  DetailsSection,
  VideoTourSection,
  LocalGuideSection,
  HostsSection,
  MapFooterSection,
  LazySection,
  INN_HERO_IMAGES,
} from './InnPage';

const CEILIDH_DOORS_PHOTO = 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg';
const WWOOFING_DOORS_PHOTO = 'https://storage.googleapis.com/salondesinconnus/Artistes/aliel%20campfire.jpg';
const CEILIDH_DOORS_DATE = new Date('2026-05-21T12:00:00');

// ─────────────────────────────────────────────────────────────────────────────
// InnPageTest3 — final structure (per user feedback round):
//   1.  Hero (test3 custom — LiquidGlassCycler + bottom-anchored editorial)
//   2.  TrustedPlatforms strip
//   3.  Custom BÂTIE EN 1898 history (full-bleed, from test2)
//   4.  Custom Services half-moon (Kitchen + Massage, from test2)
//   5.  ManorRoomsSection            } LazySection-wrapped
//   6.  IndependentStaysSection
//   7.  PhotoGallerySection (lazy)
//   8.  SpacesGrid (L'Espace)
//   9.  DetailsSection (lazy)        } LazySection-wrapped (Three.js + audio)
//   10. VideoTourSection (lazy)
//   11. LocalGuideSection
//   12. HostsSection
//   13. EventsSection (Ceilidh teaser)
//   14. WwoofingSection
//   15. MapFooterSection
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
}

const SEC2_PHOTO = 'https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg';
const KITCHEN_PHOTO = 'https://storage.googleapis.com/salondesinconnus/Cuisine/Plating%20alexis%20ai%20(1).jpg';
const MASSAGE_PHOTO = 'https://storage.googleapis.com/salondesinconnus/massage/massage%20andre.png';
const ESPACE_COVER_PHOTO = 'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/jardins%20auberge.jpg';

// 12 spaces shown in the L'Espace 3D deck.
// FR text restored verbatim from the original SpacesGrid in InnPage.tsx — never paraphrase or
// re-translate from EN, the FR was the canonical copy and is what visitors will read most.
const SPACES_DATA: Array<{ titleEn: string; titleFr: string; itemsEn: string[]; itemsFr: string[] }> = [
  { titleEn: 'Ger (Yurt)',     titleFr: 'Ger (Yourte)',    itemsEn: ['Room for 5', 'Wood stove'],                       itemsFr: ['Chambre pour 5', 'Foyer au Bois'] },
  { titleEn: 'Bedrooms (5)',   titleFr: 'Chambres (5)',    itemsEn: ['Musician', 'Writer', 'Filmmaker', 'Theatre', 'Tower'], itemsFr: ['Musicienne', 'Écrivaine', 'Cinéaste', 'Théâtre', 'Tour'] },
  { titleEn: 'Bus',            titleFr: 'Autobus',         itemsEn: ['Room for 5', 'Pellet stove', 'Piano included'],   itemsFr: ['Chambre pour 5', 'Foyer aux granules', 'Piano inclus'] },
  { titleEn: 'Dining Room',    titleFr: 'Salle à Manger',  itemsEn: ['Bistro tables', 'Low table'],                     itemsFr: ['Tables bistro', 'Table basse'] },
  { titleEn: 'Main Salon',     titleFr: 'Salon Principal', itemsEn: ['Library', 'Sofas', 'Soft space', 'Music'],        itemsFr: ['Bibliothèque', 'Sofas', 'Espace doux', 'Musique'] },
  { titleEn: 'Kitchen',        titleFr: 'Cuisine',         itemsEn: ['Self-serve', 'Barista coffee & tea'],             itemsFr: ['Libre Service', 'Café Barista et Thé'] },
  { titleEn: 'Spa / Jacuzzi',  titleFr: 'Spa / Jacuzzi',   itemsEn: ['Relaxation', 'Open 24/7'],                        itemsFr: ['Espace détente', 'Ouvert 24/7'] },
  { titleEn: 'Nature',         titleFr: 'Nature',          itemsEn: ['Stream', 'Lake', 'Forest', 'Terrace'],            itemsFr: ['Ruisseau', 'Lac', 'Forêt', 'Terrasse'] },
  { titleEn: 'Open Space',     titleFr: 'Espace Libre',    itemsEn: ['3 fire pits'],                                    itemsFr: ['3 Pits à Feux'] },
  { titleEn: 'Balconies',      titleFr: 'Balcons',         itemsEn: ['Around the house', 'Upstairs'],                   itemsFr: ['Autour de la maison', 'À l’étage'] },
  { titleEn: 'Game Room',      titleFr: 'Salle de Jeux',   itemsEn: ['Projector', 'Meditation room'],                   itemsFr: ['Projecteur', 'Salle de meditation'] },
  { titleEn: 'Gardens',        titleFr: 'Jardins',         itemsEn: ['Greenhouse', 'Mini house'],                       itemsFr: ['Serre', 'Mini Maison'] },
];

export const InnPageTest3: React.FC<Props> = ({ language, onNavigate }) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroPhotoRef = useRef<HTMLDivElement>(null);
  // Anchor for the half-moon rooms section — both "Réserver" buttons (hero + Origins)
  // smooth-scroll here so the user lands directly on the booking grid.
  const roomsRef = useRef<HTMLDivElement>(null);
  const scrollToRooms = () => {
    const root = scrollRef.current;
    const target = roomsRef.current;
    if (!root || !target) return;
    const top = target.offsetTop - 24;
    root.scrollTo({ top, behavior: 'smooth' });
  };
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroOverlayRef = useRef<HTMLDivElement>(null);
  const [spacesOpen, setSpacesOpen] = useState(false);
  const [doorsExiting, setDoorsExiting] = useState<null | 'CEILIDH' | 'WWOOFING'>(null);
  const daysToCeilidhDoors = Math.max(0, Math.ceil((CEILIDH_DOORS_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const openDoor = (target: 'CEILIDH' | 'WWOOFING') => {
    if (doorsExiting) return;
    setDoorsExiting(target);
    setTimeout(() => onNavigate(target), 1200);
  };

  // ── Lenis smooth scroll ────────────────────────────────────────────────
  useEffect(() => {
    if (!scrollRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      wrapper: scrollRef.current,
      content: scrollRef.current.firstElementChild as HTMLElement,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
    });
    let rafId = 0;
    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(rafId); lenis.destroy(); };
  }, []);

  // ── Scroll-driven hero motion ──────────────────────────────────────────
  useEffect(() => {
    const root = scrollRef.current;
    const photo = heroPhotoRef.current;
    const title = heroTitleRef.current;
    const overlay = heroOverlayRef.current;
    if (!root || !photo || !title || !overlay) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafTick = 0;
    let lastP = -1;
    const update = () => {
      rafTick = 0;
      if (reducedMotion) return;
      const y = root.scrollTop;
      const vh = root.clientHeight;
      // Early-exit once scrolled past hero — Lenis dispatches scroll on every rAF tick, and
      // the previous version wrote 5 inline-style properties every frame even at heroP=1.
      // We only run the writes while the hero is still in/near the viewport AND the value
      // actually changed since last frame.
      if (y > vh * 1.2) {
        if (lastP !== 1) {
          photo.style.transform = 'translate3d(0, -60px, 0) scale(0.92)';
          photo.style.opacity = '0.55';
          title.style.transform = 'translate3d(0, -30px, 0) scale(1.08)';
          title.style.opacity = '0.75';
          overlay.style.opacity = '0.8';
          lastP = 1;
        }
        return;
      }
      const heroP = Math.min(1, Math.max(0, y / (vh * 0.9)));
      if (Math.abs(heroP - lastP) < 0.005) return; // skip near-duplicate writes
      lastP = heroP;
      photo.style.transform = `translate3d(0, ${-heroP * 60}px, 0) scale(${1 - heroP * 0.08})`;
      photo.style.opacity = String(1 - heroP * 0.45);
      title.style.transform = `translate3d(0, ${-heroP * 30}px, 0) scale(${1 + heroP * 0.08})`;
      title.style.opacity = String(1 - heroP * 0.25);
      overlay.style.opacity = String(0.35 + heroP * 0.45);
    };
    const onScroll = () => { if (rafTick) return; rafTick = requestAnimationFrame(update); };
    update();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => { root.removeEventListener('scroll', onScroll); if (rafTick) cancelAnimationFrame(rafTick); };
  }, []);

  return (
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 bg-[#050505] text-white overflow-y-auto custom-scrollbar selection:bg-[#d4af37] selection:text-black"
      data-inn-scroll
    >
      <div>
        {/* ── 1. HERO — cycler + bottom-aligned editorial overlay ────────── */}
        <section className="relative h-screen min-h-[640px] overflow-hidden">

          {/* Hero image stack:
              outer ref (heroPhotoRef) — scroll-driven transform (parallax/scale/opacity)
              inner wrapper          — slow Ken Burns zoom (independent of scroll)
              LiquidGlassCycler      — WebGL bubble transitions every 5s
              The two transforms compose because they live on different elements. */}
          <div
            ref={heroPhotoRef}
            className="absolute inset-0 overflow-hidden will-change-transform"
            style={{ transition: 'opacity 0.4s ease-out' }}
          >
            <div className="absolute inset-0 hero3-kenburns will-change-transform">
              <LiquidGlassCycler images={[...INN_HERO_IMAGES]} intervalMs={5000} />
            </div>
          </div>

          <div
            ref={heroOverlayRef}
            aria-hidden
            className="absolute inset-0 pointer-events-none z-[3]"
            style={{
              background:
                'linear-gradient(to bottom, rgba(5,5,5,0.25) 0%, rgba(5,5,5,0.15) 30%, rgba(5,5,5,0.65) 78%, rgba(5,5,5,0.92) 100%)',
              opacity: 0.35,
            }}
          />

          {/* Mobile: centered editorial composition (eyebrow, big title, tagline,
              CTA row of two equal-width buttons, phone link, scroll cue at the
              bottom). Desktop (md:) keeps the original bottom-anchored left-
              aligned layout. */}
          <div className="relative z-10 h-full max-w-[1400px] mx-auto px-5 md:px-12 flex flex-col items-center justify-end text-center pt-[42vh] pb-20 md:items-stretch md:justify-end md:text-left md:pt-0 md:pb-24">
            <div className="hero3-eyebrow mb-5 md:mb-6 flex items-center justify-center md:justify-start gap-3 md:gap-4">
              <div className="h-px w-8 md:w-14 bg-[#f3e5ab] hero3-rule" />
              <span
                className="font-cinzel text-[#f3e5ab] text-[9px] md:text-xs uppercase tracking-[0.4em] md:tracking-[0.55em]"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                Est. 1898 · Namur, QC
                <span className="hidden md:inline"> · Maison Favier</span>
              </span>
              <div className="h-px w-8 md:hidden bg-[#f3e5ab] hero3-rule" />
            </div>
            <h1
              ref={heroTitleRef}
              className="hero3-title font-prata uppercase leading-[0.88] tracking-[-0.015em] text-[#f3e5ab] mb-5 md:mb-6 will-change-transform"
              style={{
                fontSize: 'clamp(3.6rem, 14vw, 14rem)',
                textShadow: '0 6px 40px rgba(0,0,0,0.7)',
              }}
            >
              {t('The Inn', "L'Auberge")}
            </h1>
            <p
              className="hero3-tagline font-josefin text-neutral-200 text-sm md:text-lg max-w-md md:max-w-2xl leading-relaxed tracking-wide mb-8 md:mb-10 uppercase mx-auto md:mx-0"
              style={{ letterSpacing: '0.18em', textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
            >
              {t('A sanctuary for travelers, artists, and dreamers.', 'Un sanctuaire pour voyageurs, artistes et rêveurs.')}
            </p>
            <div className="hero3-ctas w-full max-w-md md:max-w-none mx-auto md:mx-0 flex flex-col items-center md:flex-row md:items-center md:flex-wrap gap-3">
              {/* On mobile both CTAs share a row, equal width via flex-1.
                  On desktop they're auto-width as before. */}
              <div className="w-full md:w-auto flex items-center gap-2 md:gap-3">
                <button
                  onClick={scrollToRooms}
                  className="flex-1 md:flex-none md:px-10 py-4 bg-[#c5a059] text-[#18181b] font-josefin font-bold text-xs uppercase tracking-[0.3em] hover:bg-[#d4b06a] transition-all md:hover:scale-105 active:scale-95"
                  style={{ boxShadow: '0 6px 24px rgba(197,160,89,0.35)' }}
                >
                  {t('Book Now', 'Réserver')}
                </button>
                <button
                  onClick={() => onNavigate('WWOOFING')}
                  className="flex-1 md:flex-none md:px-8 py-4 bg-[#3a7d44] hover:bg-[#4a8d54] text-white font-josefin font-bold text-xs uppercase tracking-[0.3em] transition-all md:hover:scale-105 active:scale-95"
                  style={{ boxShadow: '0 6px 24px rgba(58,125,68,0.4)', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
                >
                  Wwoofing
                </button>
              </div>
              <a
                href="tel:5144183450"
                className="text-neutral-200 font-josefin text-sm md:text-base font-semibold uppercase tracking-[0.25em] hover:text-[#f3e5ab] transition-colors px-3 py-2"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}
              >
                514 418 3450
              </a>
            </div>
          </div>

          {/* Scroll cue — kept fixed at the bottom of the section, narrower
              spacing on mobile so it doesn't crowd the cookie banner area. */}
          <div className="hero3-scroll absolute bottom-3 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 md:gap-2 z-10" aria-hidden>
            <span className="text-[#f3e5ab]/70 font-cinzel text-[8px] md:text-[9px] uppercase tracking-[0.4em] md:tracking-[0.5em]">
              {t('Scroll', 'Défiler')}
            </span>
            <div className="w-px h-6 md:h-8 bg-gradient-to-b from-[#f3e5ab]/60 to-transparent hero3-scroll-line" />
          </div>
        </section>

        {/* ── 2. TrustedPlatforms strip ─────────────────────────────────── */}
        <TrustedPlatforms language={language} vibe={'HOSTEL'} />

        {/* ── 3. CUSTOM HISTORY — BÂTIE EN 1898 (full-bleed) ────────────── */}
        {/* cv-auto: skip rendering + animation work when scrolled past. Without this, the
            full-bleed photo + sec2KenBurns animation continued painting offscreen and
            contributed to scroll-time GPU stalls. */}
        <section className="cv-auto relative min-h-screen overflow-hidden bg-[#050505]">
          <img
            src={SEC2_PHOTO}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover sec2-photo"
          />
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to right, #050505 0%, rgba(5,5,5,0.92) 18%, rgba(5,5,5,0.55) 42%, rgba(5,5,5,0) 60%)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#050505] to-transparent pointer-events-none" aria-hidden />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none" aria-hidden />

          <div className="relative z-10 max-w-7xl mx-auto min-h-screen flex items-center px-5 md:px-16 lg:px-24 py-16 md:py-20">
            <div className="w-full md:max-w-md reveal-on-load">
              <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em] mb-6 block">
                {t('The Origins', 'Les Origines')}
              </span>
              <h2
                className="font-cinzel text-white uppercase leading-[0.95] tracking-[-0.01em] mb-8"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 4.5rem)',
                  textShadow: '0 4px 30px rgba(0,0,0,0.6)',
                }}
              >
                {t('Welcome to Salon\u00a0des\u00a0Inconnus', 'Bienvenue au Salon\u00a0des\u00a0Inconnus')}
              </h2>
              {/* Original Krystine copy preserved verbatim from InnPage HistorySection. */}
              <div
                className="font-lato text-neutral-300 text-base md:text-lg leading-relaxed mb-8 space-y-5"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}
              >
                <p>
                  {t(
                    'This place is both an Inn for travelers and a Center for Artists & Entrepreneurs established in the ancestral Maison Favier (1898).',
                    "Ce lieu est à la fois une Auberge pour les passants et un Centre d'Artistes & Entrepreneurs établi dans l'ancestrale Maison Favier (1898).",
                  )}
                </p>
                <p>
                  {t(
                    'Le Salon des Inconnus opens its doors in a unique setting, where art and creativity blend with a soothing accommodation experience. Our mission is to nourish emerging, professional, and multidisciplinary artists by offering them an inspiring, co-creative, and relaxing place of residence.',
                    "Le Salon des Inconnus vous ouvre ses portes dans un cadre unique, où l'art et la créativité se marient avec une expérience d'hébergement apaisante. Notre mission est de nourrir les artistes émergents, professionnels et multidisciplinaires en leur offrant un lieu de résidence inspirant, cocréatif et relaxant.",
                  )}
                </p>
              </div>
              <button
                onClick={scrollToRooms}
                className="group flex items-center gap-3 px-8 py-3 border border-[#d4af37]/40 hover:border-[#d4af37] hover:bg-[#d4af37]/5 text-[#d4af37] font-cinzel text-xs uppercase tracking-[0.3em] transition-all"
              >
                {t('Reserve', 'Réserver')}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 5-15. Test2-flow imports — heavy ones lazy-mounted, others wrapped in
              content-visibility:auto so the browser skips rendering them when offscreen ── */}

        {/* Decorative animated header introducing the half-moon booking grid.
            Both "Réserver" buttons (hero + Origins) scroll to roomsRef below. */}
        <div ref={roomsRef} className="cv-auto relative bg-[#050505] pt-20 md:pt-28 pb-10 md:pb-14 px-6 text-center">
          <span className="rooms-eyebrow font-cinzel text-[#c5a059] text-[10px] md:text-xs uppercase tracking-[0.55em] block mb-5">
            {t('Reserve', 'Réservation')}
          </span>
          <h2
            className="rooms-title font-prata text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mx-auto"
            style={{
              fontSize: 'clamp(1.7rem, 4vw, 3.2rem)',
              maxWidth: '20ch',
              textShadow: '0 4px 30px rgba(0,0,0,0.5)',
            }}
          >
            {t(
              'Reserve a room — or reserve the whole estate',
              'Réservez à la chambre, ou réservez tout le domaine',
            )}
          </h2>
          <span aria-hidden className="rooms-rule mx-auto mt-6 block" />
        </div>

        <LazySection placeholderHeight="100vh">
          <div className="cv-auto">
            <ManorRoomsSection language={language} vibe={'HOSTEL'} />
          </div>
        </LazySection>

        <div className="cv-auto">
          <IndependentStaysSection language={language} vibe={'HOSTEL'} />
        </div>

        <LazySection placeholderHeight="50vh">
          <div className="cv-auto">
            <PhotoGallerySection language={language} vibe={'HOSTEL'} />
          </div>
        </LazySection>

        {/* L'Espace — atmospheric 3D deck. Closed: featured top card + visible fan of cards behind,
            ambient sway (8s), gold glow + soft fog. Click → cyclone reveal into 4×3 grid.
            All motion uses transform/opacity only; respects prefers-reduced-motion. */}
        <section
          data-l-espace
          className="cv-auto relative bg-[#050505] py-12 md:py-32 border-t border-[#c5a059]/10 overflow-hidden"
        >
          {/* Atmospheric backdrop — soft gold radial + fog blobs (CSS only, no JS animation).
              Fog drift pauses while open so the grid view is fully static (zero idle paint). */}
          <div aria-hidden className={`absolute inset-0 pointer-events-none ${spacesOpen ? 'espace-bg-still' : ''}`}>
            <div
              className="absolute inset-0 espace-fog"
              style={{
                background:
                  'radial-gradient(ellipse 60% 55% at 50% 55%, rgba(197,160,89,0.14) 0%, rgba(197,160,89,0.05) 35%, transparent 70%)',
              }}
            />
            <div
              className="absolute inset-0 espace-fog espace-fog-2"
              style={{
                background:
                  'radial-gradient(ellipse 38% 28% at 30% 70%, rgba(243,229,171,0.06) 0%, transparent 60%), radial-gradient(ellipse 32% 24% at 72% 38%, rgba(197,160,89,0.07) 0%, transparent 60%)',
              }}
            />
            {/* Subtle grain via repeating gradient */}
            <div
              className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
              style={{
                backgroundImage:
                  'repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0px, transparent 1px, transparent 3px)',
              }}
            />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 md:px-12">
            {/* Editorial header — slimmer now that the cover card carries the
                title. We keep the section heading + tagline for editorial
                rhythm, but drop the redundant "L'Inventaire" eyebrow. */}
            <div className="text-center mb-8 md:mb-12">
              <h2
                className="font-prata uppercase text-[#f3e5ab] leading-[0.9] tracking-[-0.01em] mb-4"
                style={{ fontSize: 'clamp(2.4rem, 7vw, 7rem)', textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
              >
                {t('The Space', "L'Espace")}
              </h2>
              <p className="font-josefin text-neutral-400 text-xs md:text-sm uppercase tracking-[0.35em]">
                12 {t('spaces', 'espaces')} · 1 {t('house', 'maison')}
              </p>
            </div>

            {/* Deck stage — perspective wrapper. Inner wrapper takes the ambient sway so the
                12 cards animate via a single transform rather than 12 simultaneous rAF loops. */}
            <div
              className="relative mx-auto select-none"
              style={{
                perspective: '1800px',
                perspectiveOrigin: '50% 45%',
                width: '100%',
                maxWidth: '1200px',
                // Mobile gets a taller stage so the (now bigger) cover card
                // breathes; desktop keeps its cinematic aspect, just a touch
                // taller now that the card dominates.
                height: spacesOpen ? 'min(900px, 110vw)' : 'min(620px, 110vw)',
                transition: 'height 1.4s cubic-bezier(0.5, 0, 0.2, 1)',
              }}
            >
              {/* Cast shadow under the deck — visually grounds it, fades out when expanding */}
              <div
                aria-hidden
                className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-700"
                style={{
                  bottom: '4%',
                  width: '46%',
                  height: '8%',
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                  opacity: spacesOpen ? 0 : 1,
                }}
              />

              {/* Static stack wrapper. We keep preserve-3d for the per-card depth fan,
                  but DO NOT animate this wrapper — animating a parent of 12 preserve-3d
                  children forces a 12-layer composite every frame and tanks idle FPS to ~12.
                  Ambient motion now lives on the front card only (1 layer). */}
              {/* Stage — when CLOSED the click target is the cover button (below).
                  When OPEN, clicking anywhere on the stage collapses back to cover. */}
              <div
                className="relative w-full h-full"
                style={{
                  transformStyle: 'preserve-3d',
                  cursor: spacesOpen ? 'pointer' : 'default',
                }}
                onClick={() => { if (spacesOpen) setSpacesOpen(false); }}
              >
                {SPACES_DATA.map((space, i) => {
                  const col = i % 4;
                  const row = Math.floor(i / 4);
                  const depth = i; // 0..11; 0 sits at the back of the cover, others fan further behind.
                  const fanY = depth * -3.5;
                  const fanZ = depth * -38;
                  const fanRot = depth * 1.2;
                  const fanX = depth * 1.8;
                  const fanYpx = depth * 4;
                  const collapsedTransform =
                    `translate3d(calc(-50% + ${fanX}px), calc(-50% + ${fanYpx}px), 0)` +
                    ` rotateY(${fanY}deg)` +
                    ` rotateZ(${fanRot}deg)` +
                    ` translateZ(${fanZ}px)`;
                  const gridX = col * 25 + 1.5;
                  const gridY = row * 33 + 1.5;
                  // All cards uniform when closed — the cover overlay sits on top.
                  // Slight opacity falloff keeps the deeper cards quieter.
                  const closedOpacity = Math.max(0.5, 1 - depth * 0.05);

                  return (
                    <div
                      key={i}
                      className="deck-card absolute"
                      style={{
                        width: spacesOpen ? '22%' : '52%',
                        height: spacesOpen ? '30%' : '70%',
                        left: spacesOpen ? `${gridX}%` : '50%',
                        top: spacesOpen ? `${gridY}%` : '50%',
                        transform: spacesOpen
                          ? 'translate3d(0, 0, 0) rotateY(0deg) rotateZ(0deg) translateZ(0px)'
                          : collapsedTransform,
                        opacity: spacesOpen ? 1 : closedOpacity,
                        transition:
                          'left 1.2s cubic-bezier(0.5,0,0.2,1), top 1.2s cubic-bezier(0.5,0,0.2,1),' +
                          ' width 1.2s cubic-bezier(0.5,0,0.2,1), height 1.2s cubic-bezier(0.5,0,0.2,1),' +
                          ' transform 1.4s cubic-bezier(0.5,0,0.2,1), opacity 0.9s ease',
                        transitionDelay: `${(spacesOpen ? i : SPACES_DATA.length - 1 - i) * 55}ms`,
                        background: 'linear-gradient(135deg, rgba(34,26,16,0.94) 0%, rgba(16,13,9,0.98) 100%)',
                        border: '1px solid rgba(197,160,89,0.18)',
                        borderRadius: '14px',
                        boxShadow: '0 16px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                        zIndex: spacesOpen ? 1 : SPACES_DATA.length - depth,
                        // Hide the per-card content when closed to save paint cost — the cover
                        // hides the whole stack visually anyway. Visibility flips with a delay so
                        // the open transition reveals content as cards spread.
                        pointerEvents: spacesOpen ? 'auto' : 'none',
                      }}
                    >
                      <div
                        className="h-full flex flex-col p-4 md:p-6 lg:p-8 relative overflow-hidden"
                        style={{
                          opacity: spacesOpen ? 1 : 0,
                          transition: 'opacity 0.5s ease',
                          transitionDelay: spacesOpen ? `${i * 55 + 600}ms` : '0ms',
                        }}
                      >
                        <span className="font-cinzel text-[#c5a059] uppercase tracking-[0.45em] mb-3 text-[9px]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-prata uppercase text-[#f3e5ab] leading-tight mb-3 tracking-[-0.005em] text-base">
                          {language === 'EN' ? space.titleEn : space.titleFr}
                        </h3>
                        <ul
                          className="space-y-1.5 text-neutral-300 font-josefin uppercase text-[10px]"
                          style={{ letterSpacing: '0.18em' }}
                        >
                          {(language === 'EN' ? space.itemsEn : space.itemsFr).map((item, j) => (
                            <li key={j} className="flex items-baseline gap-2">
                              <span className="text-[#c5a059] shrink-0" aria-hidden>—</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="absolute top-3 right-3 w-2.5 h-2.5 border-t border-r border-[#c5a059]/50" aria-hidden />
                        <div className="absolute bottom-3 left-3 w-2.5 h-2.5 border-b border-l border-[#c5a059]/50" aria-hidden />
                      </div>
                    </div>
                  );
                })}

                {/* Cover overlay — sits in front of the deck while closed.
                    Garden image + "L'Espace" title + tagline. When the user clicks anywhere on
                    the cover (or on the stage behind it), the cover fades + scales away and the
                    12 data cards expand into the grid. */}
                <button
                  type="button"
                  onClick={() => setSpacesOpen((o) => !o)}
                  aria-expanded={spacesOpen}
                  aria-label={t('Reveal the space', "Révéler l'espace")}
                  className="absolute deck-cover overflow-hidden cursor-pointer text-left"
                  style={{
                    // Card is the focal element of the section now — bigger so it dominates.
                    width: '82%',
                    height: '92%',
                    left: '50%',
                    top: '50%',
                    transform: spacesOpen
                      ? 'translate3d(-50%, -50%, 0) scale(0.94)'
                      : 'translate3d(-50%, -50%, 0) scale(1)',
                    opacity: spacesOpen ? 0 : 1,
                    pointerEvents: spacesOpen ? 'none' : 'auto',
                    transition: 'transform 1.1s cubic-bezier(0.5,0,0.2,1), opacity 0.7s ease',
                    borderRadius: '16px',
                    border: '1px solid rgba(197,160,89,0.45)',
                    boxShadow:
                      '0 40px 100px rgba(0,0,0,0.7), 0 0 80px rgba(197,160,89,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
                    zIndex: 50,
                    background: '#0c0a07',
                  }}
                >
                  <img
                    src={ESPACE_COVER_PHOTO}
                    alt=""
                    aria-hidden
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ borderRadius: '16px' }}
                  />
                  {/* Bottom-up dark gradient for text legibility */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: '16px',
                      background:
                        'linear-gradient(180deg, rgba(8,6,4,0.5) 0%, rgba(8,6,4,0.18) 35%, rgba(8,6,4,0.7) 78%, rgba(8,6,4,0.92) 100%)',
                    }}
                  />
                  {/* Top-left gold light wash */}
                  <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      borderRadius: '16px',
                      background:
                        'radial-gradient(ellipse 70% 50% at 22% 12%, rgba(243,229,171,0.22) 0%, transparent 65%)',
                    }}
                  />
                  {/* Cover content */}
                  <div className="relative z-10 h-full flex flex-col p-5 md:p-10 lg:p-14">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-cinzel text-[#c5a059] text-[8px] md:text-xs uppercase tracking-[0.3em] md:tracking-[0.55em]">
                        12 / 12
                      </span>
                      <div className="w-2.5 h-2.5 border-t border-r border-[#c5a059]/60 shrink-0" aria-hidden />
                    </div>
                    <div className="mt-auto">
                      <h3
                        className="font-prata uppercase text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mb-3 md:mb-4"
                        style={{
                          fontSize: 'clamp(1.8rem, 6vw, 5.5rem)',
                          textShadow: '0 4px 30px rgba(0,0,0,0.7)',
                        }}
                      >
                        {t('The Space', "L'Espace")}
                      </h3>
                      <p
                        className="font-josefin text-neutral-200 uppercase mb-4 md:mb-6"
                        style={{
                          fontSize: 'clamp(0.6rem, 0.9vw, 0.85rem)',
                          letterSpacing: '0.22em',
                          textShadow: '0 2px 10px rgba(0,0,0,0.85)',
                        }}
                      >
                        12 {t('spaces', 'espaces')} · 1 {t('house', 'maison')}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="h-px w-10 bg-[#c5a059]/60" />
                        <span className="font-cinzel text-[#f3e5ab] text-[10px] md:text-xs uppercase tracking-[0.5em]">
                          {t('Tap to reveal', 'Toucher pour révéler')}
                        </span>
                        <span className="font-josefin text-[#f3e5ab] text-lg" aria-hidden>↗</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Sub-label below the deck */}
            <div className="text-center mt-10 md:mt-14">
              <span className="font-cinzel text-[#c5a059]/70 text-[10px] uppercase tracking-[0.5em] block mb-2">
                01 — 12
              </span>
              <span className="font-cinzel text-[#f3e5ab] text-[11px] md:text-xs uppercase tracking-[0.4em]">
                {spacesOpen ? t('Click to collapse', 'Cliquer pour replier') : t('Click to reveal', 'Cliquer pour révéler')}
              </span>
            </div>
          </div>
        </section>

        {/* ── 4. CUSTOM SERVICES — Kitchen + Massage half-moon portals ──── */}
        <section className="cv-auto relative bg-[#050505] py-16 md:py-24 px-3 md:px-6 lg:px-10 border-t border-[#c5a059]/10">
          <div className="text-center mb-10 md:mb-14">
            <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em]">
              {t('Services', 'Les Services')}
            </span>
            <h2
              className="font-cinzel text-white uppercase mt-3 leading-[0.95] tracking-[-0.01em]"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}
            >
              {t('Beyond the Stay', "Plus que l'Hébergement")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 max-w-[1500px] mx-auto">
            {/* Kitchen — left. Now an external link to the chef's own site
                (mapchef.ca). The internal /cuisine page still exists as an
                emergency fallback but is excluded from the sitemap. */}
            <a
              href="https://mapchef.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="services-portal group relative overflow-hidden border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-700 rounded-t-[30px] md:rounded-tr-none md:rounded-bl-[30px] md:rounded-tl-[30px] cursor-pointer min-h-[420px] md:min-h-[560px] text-left block"
            >
              <img
                src={KITCHEN_PHOTO}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-90 md:opacity-60 group-hover:opacity-100 md:group-hover:scale-110 transition-all duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-[#050505]/15" />
              <div className="relative z-10 h-full min-h-[420px] md:min-h-[560px] flex flex-col justify-end p-10 md:p-16">
                <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em] mb-3">
                  {t('Kitchen', 'Cuisine')}
                </span>
                <h3 className="font-cinzel text-white text-3xl md:text-5xl uppercase mb-3 leading-tight">
                  {t('Catering', 'Traiteur')}
                </h3>
                <p className="text-neutral-300 text-sm md:text-base font-lato max-w-sm leading-relaxed opacity-100 translate-y-0 md:opacity-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500 mb-5">
                  {t('Molecular catering & Portuguese bistronomy. Private chef for events.', 'Traiteur moléculaire & bistronomie portugaise. Chef privé pour événements.')}
                </p>
                <span className="inline-flex items-center gap-2 text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.4em] opacity-80 group-hover:opacity-100 transition-opacity">
                  {t('Discover', 'Découvrir')}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </a>

            {/* Massage — right. External link to the practitioner's site
                (salonlenvolee.com). The internal /massage page stays as a
                fallback and is excluded from the sitemap. */}
            <a
              href="https://salonlenvolee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="services-portal group relative overflow-hidden border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-700 rounded-b-[30px] md:rounded-bl-none md:rounded-br-[30px] md:rounded-tr-[30px] cursor-pointer min-h-[420px] md:min-h-[560px] text-left block"
            >
              <img
                src={MASSAGE_PHOTO}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-90 md:opacity-60 group-hover:opacity-100 md:group-hover:scale-110 transition-all duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/55 to-[#050505]/15" />
              <div className="relative z-10 h-full min-h-[420px] md:min-h-[560px] flex flex-col justify-end p-10 md:p-16">
                <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em] mb-3">
                  {t('Wellness', 'Bien-être')}
                </span>
                <h3 className="font-cinzel text-white text-3xl md:text-5xl uppercase mb-3 leading-tight">
                  {t('Massage', 'Massothérapie')}
                </h3>
                <p className="text-neutral-300 text-sm md:text-base font-lato max-w-sm leading-relaxed opacity-100 translate-y-0 md:opacity-0 md:translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500 mb-5">
                  {t('Holistic care, Reiki & deep tissue. Practitioner on site.', 'Soins holistiques, Reiki & tissu profond. Praticien sur place.')}
                </p>
                <span className="inline-flex items-center gap-2 text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.4em] opacity-80 group-hover:opacity-100 transition-opacity">
                  {t('Discover', 'Découvrir')}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </a>
          </div>
        </section>

        <LazySection placeholderHeight="800px">
          <div className="cv-auto">
            {/* autoRotate now ON — the rAF in DetailsSection already gates on
                isInView via IntersectionObserver, so it doesn't run when scrolled
                past. The earlier blanket disable made it look frozen on mobile,
                where users have no obvious way to rotate manually. */}
            <DetailsSection language={language} vibe={'HOSTEL'} autoRotate={true} />
          </div>
        </LazySection>

        <LazySection placeholderHeight="600px">
          <div className="cv-auto">
            <VideoTourSection language={language} vibe={'HOSTEL'} />
          </div>
        </LazySection>

        <div className="cv-auto">
          <LocalGuideSection language={language} vibe={'HOSTEL'} onNavigate={onNavigate} />
        </div>
        <div className="cv-auto">
          <HostsSection language={language} vibe={'HOSTEL'} onNavigate={onNavigate} />
        </div>
        {/* ── DIAGONAL DOORS — Grand Ceilidh × Wwoofing fused ────────────── */}
        <section className="cv-auto relative h-screen min-h-[720px] overflow-hidden bg-black select-none">
          {/* Bottom-left triangle — Grand Ceilidh */}
          <button
            type="button"
            onClick={() => openDoor('CEILIDH')}
            aria-label={t('Enter the Grand Ceilidh', 'Entrer dans le Grand Ceilidh')}
            className="doors-half group absolute inset-0 text-left cursor-pointer overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
              transform: doorsExiting ? 'translate(-100%, 100%)' : 'translate(0, 0)',
              transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}
          >
            <img
              src={CEILIDH_DOORS_PHOTO}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700 doors-img"
            />
            <div
              aria-hidden
              className="absolute inset-0 transition-colors duration-500 group-hover:bg-black/10"
              style={{
                background:
                  'linear-gradient(to top right, rgba(5,5,5,0.6) 0%, rgba(5,5,5,0.2) 60%, transparent 100%)',
              }}
            />
            {/* Text block sized to fit inside the triangle's clipped area —
                tightened constraints so nothing crosses the diagonal hypotenuse
                or runs past the viewport edge on any width. */}
            <div className="absolute bottom-10 md:bottom-16 left-5 md:left-12 z-10 max-w-[min(75%,16rem)] transition-transform duration-700 group-hover:-translate-y-2">
              <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.55em] block mb-3">
                {t('May 21–25, 2026', '21–25 mai 2026')}
              </span>
              <h2
                className="font-prata uppercase text-[#f3e5ab] leading-[1.05] tracking-[-0.01em] mb-3"
                style={{
                  fontSize: 'clamp(1.4rem, 3.6vw, 2.8rem)',
                  textShadow: '0 6px 40px rgba(0,0,0,0.7)',
                  paddingTop: '0.05em',
                }}
              >
                {t('Grand Ceilidh', 'Grand Ceilidh')}<br />{t('of May', 'de Mai')}
              </h2>
              {daysToCeilidhDoors > 0 && (
                <div className="flex items-baseline gap-3 mb-4">
                  <span
                    className="font-prata text-[#c5a059] leading-none"
                    style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', textShadow: '0 4px 20px rgba(0,0,0,0.7)' }}
                  >
                    {daysToCeilidhDoors}
                  </span>
                  <span className="font-cinzel text-neutral-300 text-[10px] uppercase tracking-[0.4em]">
                    {t(daysToCeilidhDoors === 1 ? 'day' : 'days', daysToCeilidhDoors === 1 ? 'jour' : 'jours')}
                  </span>
                </div>
              )}
              <span className="inline-flex items-center gap-3 font-josefin text-[#f3e5ab] text-xs uppercase tracking-[0.35em] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {t('Enter', 'Entrer')}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
            </div>
          </button>

          {/* Top-right triangle — Wwoofing */}
          <button
            type="button"
            onClick={() => openDoor('WWOOFING')}
            aria-label={t('Enter Wwoofing', 'Entrer dans le Wwoofing')}
            className="doors-half group absolute inset-0 text-right cursor-pointer overflow-hidden"
            style={{
              clipPath: 'polygon(0 0, 100% 0, 100% 100%)',
              transform: doorsExiting ? 'translate(100%, -100%)' : 'translate(0, 0)',
              transition: 'transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}
          >
            <img
              src={WWOOFING_DOORS_PHOTO}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700 doors-img"
            />
            <div
              aria-hidden
              className="absolute inset-0 transition-colors duration-500 group-hover:bg-black/10"
              style={{
                background:
                  'linear-gradient(to bottom left, rgba(5,5,5,0.65) 0%, rgba(5,5,5,0.2) 60%, transparent 100%)',
              }}
            />
            <div className="absolute top-10 md:top-16 right-5 md:right-12 z-10 max-w-[min(75%,16rem)] text-right transition-transform duration-700 group-hover:translate-y-2">
              <span className="font-cinzel text-[#3a7d44] text-[10px] uppercase tracking-[0.55em] block mb-3" style={{ filter: 'brightness(1.5)' }}>
                {t('Live & Work', 'Vivre & Travailler')}
              </span>
              <h2
                className="font-prata uppercase text-[#f3e5ab] leading-[1.05] tracking-[-0.01em] mb-3"
                style={{
                  fontSize: 'clamp(1.4rem, 3.6vw, 2.8rem)',
                  textShadow: '0 6px 40px rgba(0,0,0,0.7)',
                  paddingTop: '0.05em',  // headroom so cap-height isn't clipped by parent overflow
                }}
              >
                Wwoofing
              </h2>
              <p
                className="font-josefin text-neutral-200 text-xs md:text-sm uppercase max-w-[14rem] ml-auto leading-relaxed mb-4"
                style={{ letterSpacing: '0.18em', textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}
              >
                {t('Gardens · Art · Kitchen · Stay', 'Jardins · Art · Cuisine · Hébergement')}
              </p>
              <span className="inline-flex items-center justify-end gap-3 font-josefin text-[#f3e5ab] text-xs uppercase tracking-[0.35em] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <span className="group-hover:-translate-x-1 transition-transform">←</span>
                {t('Enter', 'Entrer')}
              </span>
            </div>
          </button>

          {/* Centered diagonal line + badge — fades during exit */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{ opacity: doorsExiting ? 0 : 1 }}
            aria-hidden
          >
            <svg className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(245,229,171,0.25)" strokeWidth="1" />
            </svg>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 px-5 py-2 rounded-full bg-black/70 backdrop-blur-md border border-[#c5a059]/30">
              <span className="font-cinzel text-[#f3e5ab] text-[9px] md:text-[10px] uppercase tracking-[0.4em]">
                {t('Choose your door', 'Choisissez votre porte')}
              </span>
            </div>
          </div>
        </section>
        <div className="cv-auto">
          <MapFooterSection language={language} vibe={'HOSTEL'} />
        </div>
      </div>

      {/* Hero animation styles */}
      <style>{`
        .hero3-eyebrow { opacity: 0; animation: hero3FadeUp 0.7s ease-out 0.05s forwards; }
        .hero3-rule { width: 0; animation: hero3RuleGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.55s forwards; }
        @keyframes hero3RuleGrow { to { width: 56px; } }
        .hero3-title {
          opacity: 0;
          transform: translate3d(0, 32px, 0);
          animation: hero3TitleIn 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.7s forwards;
        }
        @keyframes hero3TitleIn { to { opacity: 1; transform: translate3d(0, 0, 0); } }
        .hero3-tagline { opacity: 0; animation: hero3FadeUp 0.9s ease-out 1.1s forwards; }
        .hero3-ctas { opacity: 0; animation: hero3FadeUp 0.7s ease-out 1.35s forwards; }
        .hero3-scroll { opacity: 0; animation: hero3FadeIn 0.9s ease-out 1.7s forwards; }
        .hero3-scroll-line { animation: hero3ScrollPulse 2.4s ease-in-out infinite; }
        @keyframes hero3ScrollPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.6); transform-origin: top; }
          50%      { opacity: 1;   transform: scaleY(1);   transform-origin: top; }
        }
        @keyframes hero3FadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hero3FadeIn { to { opacity: 1; } }

        /* Rooms section header — gentle reveal as you scroll into view.
           A short fade-up on the eyebrow + title; a thin gold rule grows from
           a point to 80px; the title gets a slow gold-to-cream gradient sweep. */
        .rooms-eyebrow {
          opacity: 0;
          animation: roomsFadeUp 0.8s ease-out forwards;
        }
        .rooms-title {
          background: linear-gradient(110deg, #f3e5ab 0%, #c5a059 30%, #f3e5ab 60%, #c5a059 100%);
          background-size: 220% 100%;
          background-position: 0% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          opacity: 0;
          transform: translateY(14px);
          animation:
            roomsFadeUp 1.1s cubic-bezier(0.22,1,0.36,1) 0.18s forwards,
            roomsSheen 7s ease-in-out 1.2s infinite;
        }
        @keyframes roomsFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes roomsSheen {
          0%, 100% { background-position: 0% 50%;   }
          50%      { background-position: 100% 50%; }
        }
        .rooms-rule {
          width: 0; height: 1px;
          background: linear-gradient(to right, transparent, #c5a059, transparent);
          animation: roomsRuleGrow 0.9s cubic-bezier(0.22,1,0.36,1) 0.6s forwards;
        }
        @keyframes roomsRuleGrow { to { width: 80px; } }

        /* Section 3 (BÂTIE EN 1898) — Ken Burns on photo */
        .sec2-photo { animation: sec2KenBurns 18s ease-in-out infinite alternate; will-change: transform; }
        @keyframes sec2KenBurns {
          0%   { transform: scale(1.02) translate(0, 0); }
          100% { transform: scale(1.08) translate(-1%, -1%); }
        }

        /* Hero — slow Ken Burns zoom on the cycler. Lives on an inner wrapper so it composes
           with the scroll-driven transform on heroPhotoRef without overwriting it. */
        .hero3-kenburns { animation: hero3KenBurns 22s ease-in-out infinite alternate; }
        @keyframes hero3KenBurns {
          0%   { transform: scale(1.02) translate3d(0, 0, 0); }
          100% { transform: scale(1.09) translate3d(-1%, -0.6%, 0); }
        }

        /* L'Espace — keyline grows from 0 to ~120px on hover (closed state); always visible when open */
        .lespace-mark:hover .lespace-keyline { width: 120px; }
        .lespace-mark[aria-expanded="true"] .lespace-keyline { width: 100% !important; }

        /* L'Espace — atmospheric fog drift + ambient deck sway.
           Sway is a single transform on the wrapper, not 12 per-card animations,
           so the GPU only composites one layer for the idle motion. */
        .espace-fog {
          animation: espaceFogDrift 18s ease-in-out infinite alternate;
          will-change: transform;
        }
        .espace-fog-2 { animation-duration: 24s; animation-delay: -6s; }
        .espace-bg-still .espace-fog { animation: none !important; transform: none !important; }
        @keyframes espaceFogDrift {
          0%   { transform: translate3d(-1.5%, 0.5%, 0) scale(1.02); }
          100% { transform: translate3d(2%, -0.8%, 0) scale(1.06); }
        }
        .espace-sway {
          animation: espaceSway 9s ease-in-out infinite alternate;
          transform-style: preserve-3d;
        }
        @keyframes espaceSway {
          0%   { transform: rotateY(-2.4deg) rotateX(1.2deg); }
          50%  { transform: rotateY(0.4deg)  rotateX(0.6deg); }
          100% { transform: rotateY(2.6deg)  rotateX(-1deg); }
        }
        /* Cover-only ambient float — one animated layer instead of animating the 12-card stack.
           Pauses when hovered (stable click target) and when the deck is open (handled by
           Tailwind opacity:0 on the cover, plus the inline transform also takes over). */
        .deck-cover {
          animation: espaceCoverFloat 7s ease-in-out infinite alternate;
          will-change: transform;
        }
        @keyframes espaceCoverFloat {
          0%   { transform: translate3d(-50%, calc(-50% - 4px), 0) rotateZ(-0.35deg) scale(1); }
          100% { transform: translate3d(calc(-50% + 4px), -50%, 0) rotateZ(0.5deg)   scale(1); }
        }
        .deck-cover:hover { animation-play-state: paused; }
        /* When open, kill the float animation so the inline transform (scale 0.94) actually applies.
           Without this, the keyframe transform overrides and the cover doesn't shrink/disappear. */
        .deck-cover[aria-expanded="true"] { animation: none !important; }

        @media (prefers-reduced-motion: reduce) {
          .hero3-eyebrow, .hero3-rule, .hero3-title, .hero3-tagline, .hero3-ctas, .hero3-scroll, .hero3-scroll-line {
            opacity: 1 !important; transform: none !important; animation: none !important;
          }
          .hero3-rule { width: 56px !important; }
          .sec2-photo { animation: none !important; transform: scale(1.02) !important; }
          .hero3-kenburns { animation: none !important; transform: scale(1.02) !important; }
          .rooms-eyebrow, .rooms-title, .rooms-rule { animation: none !important; opacity: 1 !important; transform: none !important; }
          .rooms-rule { width: 80px !important; }
          .rooms-title { -webkit-text-fill-color: #f3e5ab !important; color: #f3e5ab !important; background: none !important; }
          .espace-fog, .espace-fog-2, .espace-sway {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};