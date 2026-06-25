import React, { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { LiquidGlassCycler } from './LiquidGlassCycler';
import { HeroFocalAdmin } from './HeroFocalAdmin';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SeoBlock } from './SeoBlock';
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
  INN_HERO_FOCUS,
} from './InnPage';
import { RoomOrbProvider } from './RoomOrbModal';

const CEILIDH_DOORS_PHOTO = 'https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg';
const WWOOFING_DOORS_PHOTO = '/wwoof/cabin-1.jpg';
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
  // Cinematic backdrop. Defaults to the forward push-in (used on the live main page).
  // The /reserve-cine experiment passes the reversed clip that ends on the full
  // living-room shot, so the two can be compared side by side.
  videoSrc?: string;
  posterSrc?: string;
}

// Mobile cinematic: number of pre-extracted frames in /public/hero/cine-rev/
// (f_01.jpg … f_48.jpg), drawn to a canvas as the scroll scrubs — reliable on
// touch where video.currentTime seeking is not.
const CINE_FRAME_COUNT = 48;

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

export const InnPageReserveCine: React.FC<Props> = ({
  language,
  onNavigate,
  videoSrc = '/hero/reserve-hero-scrub.mp4',
  posterSrc = '/hero/reserve-hero-poster.jpg',
}) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroPhotoRef = useRef<HTMLDivElement>(null);
  // Anchor for the half-moon rooms section — both "Réserver" buttons (hero + Origins)
  // smooth-scroll here so the user lands directly on the booking grid.
  const roomsRef = useRef<HTMLDivElement>(null);
  // ── Cinematic "Réserver" backdrop: scroll-scrubbed Veo establishing shot ──
  // reserveTrackRef = the tall scroll track that wraps the whole booking section.
  // reserveVideoRef = the sticky video scrubbed by scroll progress through that track.
  // reserveOverlayRef / reserveCopyRef = the establishing title that resolves over
  // the footage before the real half-moon estate card + balloon rooms reveal.
  const reserveTrackRef = useRef<HTMLDivElement>(null);
  const reserveVideoRef = useRef<HTMLVideoElement>(null);
  const reserveOverlayRef = useRef<HTMLDivElement>(null);
  const reserveCopyRef = useRef<HTMLDivElement>(null);       // beat 1 — "Entrez dans le Manoir"
  const reserveEditorialRef = useRef<HTMLDivElement>(null);  // beat 2 — "Bienvenue…" editorial

  // ── Mobile cinematic backdrop ──────────────────────────────────────────────
  // On phones, video.currentTime seeking can't be decode-scrubbed smoothly during
  // touch scroll, so the backdrop is a <canvas> driven by pre-extracted frame
  // images instead. Desktop keeps the sharp <video> scrub.
  const reserveCanvasRef = useRef<HTMLCanvasElement>(null);
  const cineFramesRef = useRef<HTMLImageElement[]>([]);
  const cineFrameIdxRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);

  // Hero photo framing — defaults from INN_HERO_FOCUS, overridable live via the
  // /?herofocal drag editor (stored in Firestore config/innHeroFocus).
  const [heroFocus, setHeroFocus] = useState<number[]>(INN_HERO_FOCUS);
  const [focalAdminOpen, setFocalAdminOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('herofocal'),
  );
  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, 'config', 'innHeroFocus'))
      .then((snap) => {
        const f = snap.exists() ? (snap.data().focus as number[]) : null;
        if (Array.isArray(f) && f.length === INN_HERO_IMAGES.length) {
          setHeroFocus(f.map((v) => Math.min(1, Math.max(0, Number(v)))));
        }
      })
      .catch(() => {});
  }, []);

  const fitCine = useCallback(() => {
    const c = reserveCanvasRef.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(c.offsetWidth * dpr), h = Math.round(c.offsetHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }, []);

  const drawCine = useCallback(() => {
    const c = reserveCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const imgs = cineFramesRef.current;
    const im = imgs[Math.max(0, Math.min(imgs.length - 1, cineFrameIdxRef.current))];
    if (!im || !im.complete || !im.naturalWidth) return;
    const cw = c.width, ch = c.height, iw = im.naturalWidth, ih = im.naturalHeight;
    const s = Math.max(cw / iw, ch / ih), w = iw * s, h = ih * s; // cover-fit
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  }, []);

  // Track the mobile breakpoint (drives canvas-vs-video).
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Preload the cinematic frames once on a small screen; redraw the current frame
  // as each image arrives so there's no blank flash.
  useEffect(() => {
    if (!isMobile) return;
    const imgs: HTMLImageElement[] = [];
    for (let i = 1; i <= CINE_FRAME_COUNT; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { fitCine(); drawCine(); };
      im.src = `/hero/cine-rev/f_${String(i).padStart(2, '0')}.jpg`;
      imgs.push(im);
    }
    cineFramesRef.current = imgs;
    return () => { cineFramesRef.current = []; };
  }, [isMobile, fitCine, drawCine]);

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
  // L'Espace expanded grid — column count tracks viewport width so the
  // 12 cards stack 1 / 2 / 4 across small / medium / large screens.
  // Without this, mobile saw 4 narrow columns of unreadable text.
  const [espaceCols, setEspaceCols] = useState<1 | 2 | 4>(4);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const compute = () => {
      const w = window.innerWidth;
      setEspaceCols(w < 640 ? 1 : w < 1024 ? 2 : 4);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
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
          // Dolly IN on exit (scale > 1) so the photo always overfills — never
          // shrinks below the frame and reveals the dark background as bars.
          photo.style.transform = 'translate3d(0, -40px, 0) scale(1.10)';
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
      // Scale UP (1 -> 1.10), not down: a gentle dolly-in as the hero fades, so the
      // photo keeps covering the viewport and no dark edge/pillarbox is exposed.
      photo.style.transform = `translate3d(0, ${-heroP * 40}px, 0) scale(${1 + heroP * 0.10})`;
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

  // ── FUSED CINEMATIC ORIGINS — two beats over one scrubbed shot ─────────────
  // The same living room that used to be the static "Les Origines" photo is now
  // the moving backdrop. As the track passes through the viewport (progress 0→1):
  //   • video.currentTime — the push-in scrubs forward, completing by ~0.62
  //   • beat 1 ("Entrez dans le Manoir") — resolves 0.05–0.20, holds, lifts 0.48–0.62
  //   • beat 2 (the real "Bienvenue…" editorial) — resolves 0.56–0.76, then holds
  //     over the settled room behind a left-dark wash. Text is verbatim from the
  //     live HistorySection (Rule 6: enrich, don't replace).
  // The booking section below still renders completely normally, with no video.
  useEffect(() => {
    const root = scrollRef.current;
    const track = reserveTrackRef.current;
    const vid = reserveVideoRef.current;
    const canvas = reserveCanvasRef.current;
    const overlay = reserveOverlayRef.current;
    const copy = reserveCopyRef.current;
    const editorial = reserveEditorialRef.current;
    if (!root || !track) return;
    if (isMobile ? !canvas : !vid) return; // backdrop element must exist for this mode

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Static, fully legible: hide the beat-1 title, show the Bienvenue editorial
      // over the final frame, no scrub, no dead scroll (extent collapsed in CSS).
      if (copy) { copy.style.opacity = '0'; }
      if (editorial) { editorial.style.opacity = '1'; editorial.style.transform = 'none'; }
      if (overlay) overlay.style.opacity = '0.5';
      if (isMobile) { cineFrameIdxRef.current = CINE_FRAME_COUNT - 1; fitCine(); drawCine(); }
      return;
    }

    if (vid) vid.pause();
    if (canvas) fitCine();
    let rafTick = 0;
    let lastP = -1;
    const update = () => {
      rafTick = 0;
      const rect = track.getBoundingClientRect();
      const vh = root.clientHeight;
      // Progress 0→1 across the scroll length of the intro track. The sticky child
      // pins for the full track; (track height − one viewport) is the scrubbable span.
      const span = track.offsetHeight - vh;
      const scrolled = -rect.top; // px scrolled into the track
      const p = Math.min(1, Math.max(0, scrolled / Math.max(1, span)));
      if (Math.abs(p - lastP) < 0.004) return;
      lastP = p;

      // Push-in completes by ~0.62 (when the editorial takes over), then holds on
      // the settled final frame so the Bienvenue copy sits over a stable room.
      const vp = Math.min(1, Math.max(0, p / 0.62));
      if (isMobile) {
        const n = cineFramesRef.current.length || CINE_FRAME_COUNT;
        cineFrameIdxRef.current = Math.round(vp * (n - 1));
        drawCine();
      } else if (vid) {
        const dur = (vid.duration && isFinite(vid.duration)) ? vid.duration : 8;
        const tTarget = Math.min(dur - 0.05, vp * dur);
        if (Math.abs(vid.currentTime - tTarget) > 0.02) vid.currentTime = tTarget;
      }

      // Beat 1 — "Entrez dans le Manoir": resolve 0.05–0.20, hold, lift away 0.48–0.62.
      if (copy) {
        const inP = Math.min(1, Math.max(0, (p - 0.05) / 0.15));
        const outP = Math.min(1, Math.max(0, (p - 0.48) / 0.14));
        copy.style.opacity = String(inP * (1 - outP));
        copy.style.transform = `translate3d(0, ${(1 - inP) * 24 - outP * 36}px, 0)`;
      }
      // Beat 2 — the "Bienvenue…" editorial: resolve 0.56–0.76 (slight crossfade with
      // beat 1), then hold to the end of the track.
      if (editorial) {
        const eIn = Math.min(1, Math.max(0, (p - 0.56) / 0.20));
        editorial.style.opacity = String(eIn);
        editorial.style.transform = `translate3d(0, ${(1 - eIn) * 28}px, 0)`;
      }
      // Base vignette: gentle through beat 1, a touch deeper once the editorial
      // arrives (its own left-dark wash carries the text legibility).
      if (overlay) {
        const eIn = Math.min(1, Math.max(0, (p - 0.56) / 0.20));
        overlay.style.opacity = String(0.34 + eIn * 0.14);
      }
    };
    const onScroll = () => { if (rafTick) return; rafTick = requestAnimationFrame(update); };
    const onResize = () => { if (canvas) fitCine(); lastP = -1; if (!rafTick) rafTick = requestAnimationFrame(update); };

    const start = () => { update(); root.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onResize); };
    if (isMobile) start();                          // canvas: frames may still be loading; redraw as they arrive
    else if (vid && vid.readyState >= 1) start();   // video: wait for metadata so duration is known
    else if (vid) vid.addEventListener('loadedmetadata', start, { once: true });

    return () => {
      root.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (vid) vid.removeEventListener('loadedmetadata', start);
      if (rafTick) cancelAnimationFrame(rafTick);
    };
  }, [isMobile, videoSrc, fitCine, drawCine]);

  return (
    <RoomOrbProvider language={language}>
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
              <LiquidGlassCycler images={[...INN_HERO_IMAGES]} focus={heroFocus} intervalMs={5000} />
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

        {/* ====================================================================
            FUSED CINEMATIC ORIGINS  (replaces the static "Les Origines" photo +
            the old standalone intro act -- it was the same living room, so now it
            is one section). A tall scroll track holds a sticky full-viewport
            living-room shot scrubbed by scroll. Beat 1 ("Entrez dans le Manoir")
            resolves over the push-in; beat 2 (the real "Bienvenue" editorial,
            text verbatim) resolves in over the settled, dimmed room. The booking
            section below still renders completely normally, with no video.
            ==================================================================== */}
        <div ref={reserveTrackRef} className="reserve-cine-track relative bg-[#050505]">
          {/* Sticky scrubbed backdrop -- pinned for the length of the track. The
              poster sits behind as a fallback so there's never a blank flash. */}
          <div
            className="sticky top-0 h-screen w-full overflow-hidden bg-center bg-cover"
            style={{ backgroundImage: `url(${posterSrc})` }}
          >
            {isMobile ? (
              // Phones: frame-image scrub on a canvas (touch-reliable).
              <canvas
                ref={reserveCanvasRef}
                aria-hidden
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              // Desktop: sharp video scrubbed via currentTime.
              <video
                ref={reserveVideoRef}
                src={videoSrc}
                poster={posterSrc}
                muted
                playsInline
                preload="auto"
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* Base vignette -- top/bottom legibility for the beat-1 title. */}
            <div
              ref={reserveOverlayRef}
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to bottom, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.18) 32%, rgba(5,5,5,0.32) 68%, rgba(5,5,5,0.72) 100%)',
                opacity: 0.34,
              }}
            />

            {/* Cinematic frame vignettes -- fade the room's light ceiling (top) and
                its grey foggy floor (bottom) into solid #050505 so neither edge ever
                reads as a flat grey bar. Static + strong, independent of scroll. */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-[22%] pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, #050505 0%, rgba(5,5,5,0.45) 45%, transparent 100%)' }}
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[36%] pointer-events-none"
              style={{ background: 'linear-gradient(to top, #050505 0%, rgba(5,5,5,0.72) 40%, transparent 100%)' }}
            />

            {/* BEAT 1 -- establishing title, centered. Real HOSTEL type + golds. */}
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
              <div ref={reserveCopyRef} className="reserve-cine-copy will-change-transform" style={{ opacity: 0 }}>
                <span className="font-cinzel text-[#c5a059] text-[10px] md:text-xs uppercase tracking-[0.55em] block mb-5">
                  {t('The Estate', 'Le Domaine')}
                </span>
                <h2
                  className="font-prata text-[#f3e5ab] leading-[0.95] tracking-[-0.01em] mx-auto"
                  style={{
                    fontSize: 'clamp(2.2rem, 6.5vw, 5.5rem)',
                    maxWidth: '15ch',
                    textShadow: '0 6px 44px rgba(0,0,0,0.8)',
                  }}
                >
                  {t('Step into the Manor', 'Entrez dans le Manoir')}
                </h2>
                <p
                  className="font-josefin text-neutral-200 text-xs md:text-sm uppercase mt-6 mx-auto max-w-md"
                  style={{ letterSpacing: '0.2em', textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
                >
                  {t('Maison Favier · Established 1898', 'Maison Favier · Établie en 1898')}
                </p>
              </div>
            </div>

            {/* BEAT 2 -- the real "Bienvenue" editorial, left-aligned over the
                settled room. Eyebrow / title / both paragraphs / CTA are verbatim
                from the live HistorySection (Rule 6: enrich, don't replace). */}
            <div ref={reserveEditorialRef} className="absolute inset-0 will-change-transform" style={{ opacity: 0 }}>
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to right, #050505 0%, rgba(5,5,5,0.92) 20%, rgba(5,5,5,0.55) 44%, rgba(5,5,5,0) 64%)',
                }}
              />
              {/* Compacted + a gentle upward bias so the whole block \u2014 eyebrow
                  through the R\u00e9server button \u2014 stays centered yet clears short 13"
                  viewports and the fixed cookie banner at the bottom. */}
              <div className="relative z-10 max-w-7xl mx-auto h-full flex items-center px-5 md:px-16 lg:px-24 pt-10 pb-20 md:pt-14 md:pb-24">
                <div className="w-full md:max-w-md">
                  <span className="text-[#d4af37] font-cinzel text-[10px] md:text-xs uppercase tracking-[0.55em] mb-4 block">
                {t('The Origins', 'Les Origines')}
              </span>
              <h2
                className="font-cinzel text-white uppercase leading-[0.95] tracking-[-0.01em] mb-5"
                style={{
                  fontSize: 'clamp(1.9rem, 4.2vw, 3.6rem)',
                  textShadow: '0 4px 30px rgba(0,0,0,0.6)',
                }}
              >
                {t('Welcome to Salon\u00a0des\u00a0Inconnus', 'Bienvenue au Salon\u00a0des\u00a0Inconnus')}
              </h2>
              {/* Original Krystine copy preserved verbatim from InnPage HistorySection. */}
              <div
                className="font-lato text-neutral-300 text-sm md:text-base leading-relaxed mb-5 space-y-4"
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
            </div>
          </div>
          {/* Scroll length of the act -- supplies room for both beats + the scrub.
              Reduced-motion collapses it so there's no dead scroll. */}
          <div className="reserve-cine-extent" aria-hidden />
        </div>

        {/* ── 5-15. Test2-flow imports — heavy ones lazy-mounted, others wrapped in
              content-visibility:auto so the browser skips rendering them when offscreen ── */}

        {/* ════════════════════════════════════════════════════════════════════
            REAL "RÉSERVEZ…" SECTION — rendered EXACTLY as on the live site.
            NO video behind it, NO overlay, NO overlap. Verbatim from InnPageTest3:
            decorative header → half-moon "L'Auberge Complète" estate card
            (ManorRoomsSection) → round balloon room cards (IndependentStaysSection).
            ════════════════════════════════════════════════════════════════════ */}
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
                // taller now that the card dominates. When open, the height
                // scales with column count so cards stay readable.
                height: spacesOpen
                  ? (espaceCols === 4 ? 'min(900px, 110vw)'
                     : espaceCols === 2 ? '1700px'
                     : '3200px')
                  : 'min(620px, 110vw)',
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
                  const col = i % espaceCols;
                  const row = Math.floor(i / espaceCols);
                  const numRows = Math.ceil(SPACES_DATA.length / espaceCols);
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
                  // Open-grid percentages: column width = 100/cols, leave a
                  // small gutter. Card height = 100/rows minus a tighter gap
                  // so 12 stacked cards on mobile still get usable vertical
                  // space (~250px each at the 3200px stage height).
                  const colSpan = 100 / espaceCols;
                  const rowSpan = 100 / numRows;
                  const widthPct  = colSpan - 3;
                  const heightPct = rowSpan - 1.5;
                  const gridX = col * colSpan + 1.5;
                  const gridY = row * rowSpan + 0.75;
                  // All cards uniform when closed — the cover overlay sits on top.
                  // Slight opacity falloff keeps the deeper cards quieter.
                  const closedOpacity = Math.max(0.5, 1 - depth * 0.05);

                  return (
                    <div
                      key={i}
                      className="deck-card absolute"
                      style={{
                        width: spacesOpen ? `${widthPct}%` : '52%',
                        height: spacesOpen ? `${heightPct}%` : '70%',
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
                        className="h-full flex flex-col p-5 md:p-6 lg:p-8 relative overflow-hidden"
                        style={{
                          opacity: spacesOpen ? 1 : 0,
                          transition: 'opacity 0.5s ease',
                          transitionDelay: spacesOpen ? `${i * 55 + 600}ms` : '0ms',
                        }}
                      >
                        <span className="font-cinzel text-[#c5a059] uppercase tracking-[0.45em] mb-3 text-[10px] md:text-[9px]">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-prata uppercase text-[#f3e5ab] leading-tight mb-3 tracking-[-0.005em] text-xl md:text-base">
                          {language === 'EN' ? space.titleEn : space.titleFr}
                        </h3>
                        <ul
                          className="space-y-1.5 text-neutral-300 font-josefin uppercase text-xs md:text-[10px]"
                          style={{ letterSpacing: '0.16em' }}
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
        {/* SEO body section — substantial French copy, internal links, external
            citations, FAQ accordion. Also sources the FAQPage JSON-LD via
            App.tsx route effect. */}
        <SeoBlock viewKey="INN" language={language} onNavigate={onNavigate} />

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

        /* ── Cinematic INTRO ACT ─────────────────────────────────────────────
           The track holds a sticky 100vh video + an extent spacer that supplies
           the scroll length for the scrub. Total track height = 100vh + extent,
           so the sticky child pins through the whole act, then releases onto the
           solid-black booking section below. isolation keeps the act on its own
           stacking context so nothing bleeds past it. */
        .reserve-cine-track { isolation: isolate; }
        .reserve-cine-extent { height: 240vh; }

        @media (prefers-reduced-motion: reduce) {
          /* Collapse the scroll extent so there's no dead scroll — the poster
             frame + copy show statically and the booking section follows. */
          .reserve-cine-extent { height: 0 !important; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero3-eyebrow, .hero3-rule, .hero3-title, .hero3-tagline, .hero3-ctas, .hero3-scroll, .hero3-scroll-line {
            opacity: 1 !important; transform: none !important; animation: none !important;
          }
          .hero3-rule { width: 56px !important; }
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
      {focalAdminOpen && (
        <HeroFocalAdmin
          images={[...INN_HERO_IMAGES]}
          defaults={INN_HERO_FOCUS}
          onClose={() => setFocalAdminOpen(false)}
        />
      )}
    </RoomOrbProvider>
  );
};