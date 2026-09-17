import React, { useCallback, useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { LiquidGlassCycler } from './LiquidGlassCycler';
import { HeroFocalAdmin } from './HeroFocalAdmin';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { VexelSoutienSection } from './VexelSoutienSection';
import { CentreArtsCommunauteSection } from './CentreArtsCommunauteSection';
import { SiteFooter } from './SiteFooter';
import { getOptimizedUrl, getSrcSet } from '../utils/imageOptimizer';
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
  LazySection,
  INN_HERO_IMAGES,
  INN_HERO_FOCUS,
} from './InnPage';
import { RoomOrbProvider } from './RoomOrbModal';
import GlyphPortal from './GlyphPortal';

const CEILIDH_DOORS_PHOTO = '/media/inn/golden%20drone%20copy.jpg';
const WWOOFING_DOORS_PHOTO = '/wwoof/bw-6.jpg';
const CEILIDH_DOORS_DATE = new Date('2026-05-21T12:00:00');

// ─────────────────────────────────────────────────────────────────────────────
// InnPageTest3: final structure (per user feedback round):
//   1.  Hero (test3 custom, LiquidGlassCycler + bottom-anchored editorial)
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
//   15. SiteFooter (À propos du lieu, carte, NAP, liens, collant Vexel)
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  language: 'EN' | 'FR';
  onNavigate: (view: string) => void;
  // Poster frame shown behind the canvas backdrop until the scrub frames load.
  posterSrc?: string;
}

// Cinematic backdrop: number of pre-extracted frames in /public/hero/cine-rev/
// (f_01.jpg … f_48.jpg), drawn to a canvas as the scroll scrubs, reliable on
// every browser where video.currentTime seeking is not.
const CINE_FRAME_COUNT = 48;

// Reduce-motion gate for the *extra* motion only: Lenis smooth-scroll and the hero
// parallax. The cinematic scroll-scrub itself ALWAYS plays (owner's call): it's the
// signature of the page and, now that it's a light canvas frame-sequence rather than
// a decoded video, it's gentle enough to keep on for everyone.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KITCHEN_PHOTO = '/media/Cuisine/Plating%20alexis%20ai%20(1).jpg';
const MASSAGE_PHOTO = '/media/massage/massage%20andre.jpg';
const ESPACE_COVER_PHOTO = '/media/Auberge%20photos/jardins%20auberge.jpg';

// 12 spaces shown in the L'Espace 3D deck.
// FR text restored verbatim from the original SpacesGrid in InnPage.tsx: never paraphrase or
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
  posterSrc = '/hero/reserve-hero-poster.jpg',
}) => {
  const t = (en: string, fr: string) => (language === 'EN' ? en : fr);
  const scrollRef = useRef<HTMLDivElement>(null);
  const heroPhotoRef = useRef<HTMLDivElement>(null);
  // Anchor for the half-moon rooms section, both "Réserver" buttons (hero + Origins)
  // smooth-scroll here so the user lands directly on the booking grid.
  const roomsRef = useRef<HTMLDivElement>(null);
  // ── Cinematic "Réserver" backdrop: scroll-scrubbed Veo establishing shot ──
  // reserveTrackRef = the tall scroll track that wraps the whole booking section.
  // The backdrop is scrubbed as a canvas frame-sequence (reserveCanvasRef, below)
  // on every viewport. See the note there.
  // reserveOverlayRef / reserveCopyRef = the establishing title that resolves over
  // the footage before the real half-moon estate card + balloon rooms reveal.
  const reserveTrackRef = useRef<HTMLDivElement>(null);
  const reserveOverlayRef = useRef<HTMLDivElement>(null);
  const reserveCopyRef = useRef<HTMLDivElement>(null);       // beat 1: "Entrez dans le Manoir"
  const reserveEditorialRef = useRef<HTMLDivElement>(null);  // beat 2: "Bienvenue…" editorial

  // ── Cinematic backdrop: canvas frame-sequence (all viewports) ──────────────
  // The backdrop is a <canvas> driven by pre-extracted frame images, scrubbed by
  // scroll progress. video.currentTime seeking was unreliable (black first frame
  // on Safari/iOS) and decode-on-seek of the 10MB clip thrashed the GPU; drawing
  // pre-decoded JPEGs is light and identical on every browser.
  const reserveCanvasRef = useRef<HTMLCanvasElement>(null);
  const cineFramesRef = useRef<HTMLImageElement[]>([]);
  const cineFrameIdxRef = useRef(0);

  // Hero photo framing: defaults from INN_HERO_FOCUS, overridable live via the
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

  // Preload the cinematic frames once; redraw the current frame as each image
  // arrives so there's no blank flash. Frames are ~115KB each (5.6MB total),
  // lighter than the old 10MB clip, and they drive the scrub on every viewport.
  // Only the first frame loads with the page; the other 47 (~5.5MB) start at the
  // first scroll gesture or once the browser is idle after load, so they stay off
  // the first-screen critical path without delaying the scrub for real visitors.
  useEffect(() => {
    const imgs: HTMLImageElement[] = [];
    const srcOf = (i: number) => `/hero/cine-rev/f_${String(i).padStart(2, '0')}.jpg`;
    for (let i = 1; i <= CINE_FRAME_COUNT; i++) {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { fitCine(); drawCine(); };
      imgs.push(im);
    }
    imgs[0].src = srcOf(1);
    cineFramesRef.current = imgs;
    let started = false;
    let idleId = 0;
    const root = scrollRef.current;
    const startAll = () => {
      if (started) return;
      started = true;
      imgs.forEach((im, i) => { if (!im.src) im.src = srcOf(i + 1); });
    };
    const opts: AddEventListenerOptions = { passive: true, once: true };
    root?.addEventListener('scroll', startAll, opts);
    window.addEventListener('wheel', startAll, opts);
    window.addEventListener('touchstart', startAll, opts);
    window.addEventListener('keydown', startAll, { once: true });
    const onLoad = () => {
      const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: { timeout: number }) => number);
      idleId = ric ? ric(startAll, { timeout: 4000 }) : window.setTimeout(startAll, 2500);
    };
    if (document.readyState === 'complete') onLoad(); else window.addEventListener('load', onLoad, { once: true });
    return () => {
      root?.removeEventListener('scroll', startAll);
      window.removeEventListener('wheel', startAll);
      window.removeEventListener('touchstart', startAll);
      window.removeEventListener('keydown', startAll);
      window.removeEventListener('load', onLoad);
      const cic = (window as any).cancelIdleCallback;
      if (cic) cic(idleId); else clearTimeout(idleId);
      cineFramesRef.current = [];
    };
  }, [fitCine, drawCine]);

  const scrollToRooms = () => {
    const root = scrollRef.current;
    const target = roomsRef.current;
    if (!root || !target) return;
    const top = target.offsetTop - 24;
    root.scrollTo({ top, behavior: 'smooth' });
  };
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroOverlayRef = useRef<HTMLDivElement>(null);
  // L'Espace: GlyphPortal entry (the word "ESPACE" becomes the door), then a list.
  const espaceListRef = useRef<HTMLUListElement>(null);
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
    if (prefersReducedMotion()) return;

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

    const reducedMotion = prefersReducedMotion();
    let rafTick = 0;
    let lastP = -1;
    const update = () => {
      rafTick = 0;
      if (reducedMotion) return;
      const y = root.scrollTop;
      const vh = root.clientHeight;
      // Early-exit once scrolled past hero: Lenis dispatches scroll on every rAF tick, and
      // the previous version wrote 5 inline-style properties every frame even at heroP=1.
      // We only run the writes while the hero is still in/near the viewport AND the value
      // actually changed since last frame.
      if (y > vh * 1.2) {
        if (lastP !== 1) {
          // Dolly IN on exit (scale > 1) so the photo always overfills, never
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

  // ── FUSED CINEMATIC ORIGINS: two beats over one scrubbed shot ─────────────
  // The same living room that used to be the static "Les Origines" photo is now
  // the moving backdrop. As the track passes through the viewport (progress 0→1):
  //   • video.currentTime: the push-in scrubs forward, completing by ~0.62
  //   • beat 1 ("Entrez dans le Manoir"): resolves 0.05–0.20, holds, lifts 0.48–0.62
  //   • beat 2 (the real "Bienvenue…" editorial): resolves 0.56–0.76, then holds
  //     over the settled room behind a left-dark wash. Text is verbatim from the
  //     live HistorySection (Rule 6: enrich, don't replace).
  // The booking section below still renders completely normally, with no video.
  useEffect(() => {
    const root = scrollRef.current;
    const track = reserveTrackRef.current;
    const canvas = reserveCanvasRef.current;
    const overlay = reserveOverlayRef.current;
    const copy = reserveCopyRef.current;
    const editorial = reserveEditorialRef.current;
    if (!root || !track || !canvas) return;

    // The scrub always plays (no reduce-motion bail): it's the signature of the page
    // and is now a light canvas frame draw rather than a decoded video.
    fitCine();
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
      const n = cineFramesRef.current.length || CINE_FRAME_COUNT;
      cineFrameIdxRef.current = Math.round(vp * (n - 1));
      drawCine();

      // Beat 1 ("Entrez dans le Manoir"): resolve 0.05–0.20, hold, lift away 0.48–0.62.
      if (copy) {
        const inP = Math.min(1, Math.max(0, (p - 0.05) / 0.15));
        const outP = Math.min(1, Math.max(0, (p - 0.48) / 0.14));
        copy.style.opacity = String(inP * (1 - outP));
        copy.style.transform = `translate3d(0, ${(1 - inP) * 24 - outP * 36}px, 0)`;
      }
      // Beat 2 (the "Bienvenue…" editorial): resolve 0.56–0.76 (slight crossfade with
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
    start();                                         // canvas frames: redraw as each arrives; no video decode to wait on

    return () => {
      root.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (rafTick) cancelAnimationFrame(rafTick);
    };
  }, [fitCine, drawCine]);

  // ── L'ESPACE list: each inventory row fades/slides in as it enters the viewport. ──
  useEffect(() => {
    const list = espaceListRef.current;
    if (!list) return;
    const items = Array.from(list.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('espace-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    items.forEach((it) => io.observe(it));
    return () => io.disconnect();
  }, []);

  return (
    <RoomOrbProvider language={language}>
    <div
      ref={scrollRef}
      className="fixed inset-0 z-50 bg-[#050505] text-white overflow-y-auto custom-scrollbar selection:bg-[#d4af37] selection:text-black"
      data-inn-scroll
    >
      <div>
        {/* ── 1. HERO: cycler + bottom-aligned editorial overlay ────────── */}
        <section className="relative h-screen min-h-[640px] overflow-hidden">

          {/* Hero image stack:
              outer ref (heroPhotoRef): scroll-driven transform (parallax/scale/opacity)
              inner wrapper:           slow Ken Burns zoom (independent of scroll)
              LiquidGlassCycler:       WebGL bubble transitions every 5s
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
            {/* CITQ classification: Gîte touristique classé 4 soleils. Small on-brand
                plaque: four gold suns + label, in the warm-dark hero palette. */}
            <div className="hero3-soleils mb-8 md:mb-10 mx-auto md:mx-0 w-fit">
              <div
                className="flex items-center gap-2.5 rounded-[3px] border border-[#c5a059]/40 bg-black/25 px-3.5 py-2 backdrop-blur-sm"
                style={{ boxShadow: '0 4px 18px rgba(0,0,0,0.45)' }}
                title={t('Tourist home rated 4 suns', 'Gîte touristique classé 4 soleils')}
                aria-label={t('Tourist home rated 4 suns', 'Gîte touristique classé 4 soleils')}
              >
                <span className="flex items-center gap-[3px]" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      className="w-[15px] h-[15px] md:w-[17px] md:h-[17px]"
                      style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.85))' }}
                    >
                      <circle cx="12" cy="12" r="4.1" fill="#f3d27a" />
                      <g stroke="#f3d27a" strokeWidth="1.6" strokeLinecap="round">
                        <line x1="12" y1="1.6" x2="12" y2="4.4" />
                        <line x1="12" y1="19.6" x2="12" y2="22.4" />
                        <line x1="1.6" y1="12" x2="4.4" y2="12" />
                        <line x1="19.6" y1="12" x2="22.4" y2="12" />
                        <line x1="4.7" y1="4.7" x2="6.7" y2="6.7" />
                        <line x1="17.3" y1="17.3" x2="19.3" y2="19.3" />
                        <line x1="4.7" y1="19.3" x2="6.7" y2="17.3" />
                        <line x1="17.3" y1="6.7" x2="19.3" y2="4.7" />
                      </g>
                    </svg>
                  ))}
                </span>
                <span
                  className="font-cinzel text-[#f3e5ab] text-[8px] md:text-[10px] uppercase tracking-[0.26em] md:tracking-[0.34em] whitespace-nowrap"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  {t('Tourist Home · Rated 4 Suns', 'Gîte touristique · Classé 4 soleils')}
                </span>
              </div>
            </div>
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

          {/* Scroll cue: kept fixed at the bottom of the section, narrower
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
            {/* All viewports: frame-image scrub on a canvas. Reliable on every
                browser (no video.currentTime decode-on-seek, no Safari black
                first frame), and far lighter than streaming + seeking a 10MB
                clip, so it never thrashes the GPU/compositor the way the old
                video scrub did. The poster behind covers any pre-load flash. */}
            <canvas
              ref={reserveCanvasRef}
              aria-hidden
              className="absolute inset-0 w-full h-full"
            />
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

        {/* ── 5-15. Test2-flow imports: heavy ones lazy-mounted, others wrapped in
              content-visibility:auto so the browser skips rendering them when offscreen ── */}

        {/* ════════════════════════════════════════════════════════════════════
            REAL "RÉSERVEZ…" SECTION: rendered EXACTLY as on the live site.
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
              'Reserve a room, or reserve the whole estate',
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

        {/* L'Espace: GlyphPortal entry — the word "ESPACE" becomes the door into
            the twelve-space inventory. The scroll-scrubbed letter portal replaces
            the earlier words→photo intro; the inventory list follows below. */}
        <section data-l-espace className="relative bg-[#050505] border-t border-[#c5a059]/10">
          <GlyphPortal
            word={t('SPACE', 'ESPACE')}
            fontFamily="'Cinzel', serif"
            fontWeight={700}
            enterLabel={t('Enter', 'Entrer')}
            style={{
              '--gp-paper': '#050505',
              '--gp-ink': '#f3e5ab',
              '--gp-field': '#c5a059',
              '--gp-foreground': '#0a0808',
            }}
            background={
              <div style={{ position: 'absolute', inset: 0, transform: 'scale(var(--gp-field-scale,1))', background: '#c5a059' }}>
                <img
                  src={getOptimizedUrl(ESPACE_COVER_PHOTO, 1800)}
                  srcSet={getSrcSet(ESPACE_COVER_PHOTO)}
                  sizes="100vw"
                  alt=""
                  loading="eager"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.5 }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse 75% 60% at 50% 42%, rgba(5,5,5,0) 40%, rgba(5,5,5,0.42) 100%)',
                  }}
                />
              </div>
            }
            front={
              <div
                style={{
                  position: 'absolute',
                  top: 'clamp(96px,13%,112px)',
                  left: 'clamp(24px,6%,64px)',
                  right: 'clamp(24px,6%,64px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 14,
                }}
              >
                <div style={{ height: 1, width: 40, background: '#c5a059', flex: '0 0 auto' }} />
                <span className="font-cinzel text-[12px] uppercase tracking-[0.35em] text-[#c5a059]">
                  {t('The Space', "L'Espace")}
                </span>
                <div style={{ height: 1, width: 40, background: '#c5a059', flex: '0 0 auto' }} />
              </div>
            }
          >
            <div style={{ textAlign: 'center', maxWidth: '60ch', margin: '0 auto' }}>
              <p className="font-cinzel text-[11px] uppercase tracking-[0.4em] mb-5" style={{ color: 'rgba(10,8,8,.66)' }}>
                {t('The Inventory', "L'Inventaire")}
              </p>
              <h2 className="font-prata" style={{ color: '#0a0808', fontSize: 'clamp(2rem,5vw,4.25rem)', lineHeight: 0.95, margin: '0 0 16px' }}>
                {t('Twelve spaces', 'Douze espaces')}
              </h2>
              <p className="font-cinzel text-[11px] md:text-sm uppercase tracking-[0.55em]" style={{ color: 'rgba(10,8,8,.66)', margin: 0 }}>
                12 {t('spaces', 'espaces')} · 1 {t('house', 'maison')}
              </p>
            </div>
          </GlyphPortal>

          {/* ── Act 2 · the inventory list ── */}
          <div className="relative max-w-5xl mx-auto px-6 md:px-12 pb-20 md:pb-32">
            <ul ref={espaceListRef} className="border-b border-[#c5a059]/10">
              {SPACES_DATA.map((space, i) => (
                <li
                  key={i}
                  className="espace-row grid grid-cols-[2.4rem_1fr] md:grid-cols-[5rem_1fr_minmax(0,26rem)] gap-x-4 md:gap-x-10 items-start py-8 md:py-10 border-t border-[#c5a059]/10"
                >
                  <span className="font-cinzel text-[#c5a059] text-xs md:text-base tracking-[0.3em] pt-1.5 md:pt-2">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-prata uppercase text-[#f3e5ab] text-2xl md:text-4xl leading-[1.05] tracking-[-0.01em]">
                    {language === 'EN' ? space.titleEn : space.titleFr}
                  </h3>
                  <ul className="col-start-2 md:col-start-3 mt-4 md:mt-2 space-y-2">
                    {(language === 'EN' ? space.itemsEn : space.itemsFr).map((item, j) => (
                      <li key={j} className="flex items-baseline gap-3 font-josefin text-neutral-300 text-sm md:text-[15px]">
                        <span className="inline-block w-1 h-1 rounded-full bg-[#c5a059]/70 shrink-0 translate-y-[-2px]" aria-hidden />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── 4. CUSTOM SERVICES: Kitchen + Massage half-moon portals ──── */}
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
            {/* Kitchen, left. Now an external link to the chef's own site
                (mapchef.ca). The internal /cuisine page still exists as an
                emergency fallback but is excluded from the sitemap. */}
            <a
              href="https://mapchef.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="services-portal group relative overflow-hidden border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-700 rounded-t-[30px] md:rounded-tr-none md:rounded-bl-[30px] md:rounded-tl-[30px] cursor-pointer min-h-[420px] md:min-h-[560px] text-left block"
            >
              <img
                src={getOptimizedUrl(KITCHEN_PHOTO, 1600)}
                srcSet={getSrcSet(KITCHEN_PHOTO)}
                sizes="(min-width: 768px) 50vw, 100vw"
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

            {/* Massage, right. External link to the practitioner's site
                (salonlenvolee.com). The internal /massage page stays as a
                fallback and is excluded from the sitemap. */}
            <a
              href="https://salonlenvolee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="services-portal group relative overflow-hidden border border-[#d4af37]/30 hover:border-[#d4af37] transition-all duration-700 rounded-b-[30px] md:rounded-bl-none md:rounded-br-[30px] md:rounded-tr-[30px] cursor-pointer min-h-[420px] md:min-h-[560px] text-left block"
            >
              <img
                src={getOptimizedUrl(MASSAGE_PHOTO, 1600)}
                srcSet={getSrcSet(MASSAGE_PHOTO)}
                sizes="(min-width: 768px) 50vw, 100vw"
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
            {/* autoRotate now ON: the rAF in DetailsSection already gates on
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
          <HostsSection language={language} vibe={'HOSTEL'} onNavigate={onNavigate} sansCoordonnees />
        </div>
        {/* ── DIAGONAL DOORS: Grand Ceilidh × Wwoofing fused ────────────── */}
        {/* ── Participer: three doors into the project ─────────────────── */}
        <section className="cv-auto relative bg-[#050505] py-20 md:py-28 px-6 md:px-12 lg:px-20 border-t border-[#c5a059]/10">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-4 mb-10 md:mb-14">
              <span className="h-px w-12 bg-[#c5a059]" />
              <span className="font-cinzel uppercase text-[#c5a059]" style={{ fontSize: '12px', letterSpacing: '0.4em' }}>{t('Take part', 'Participer')}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {[
                { eyebrow: t('Live & Work', 'Vivre & Travailler'), title: 'Wwoofing', tag: t('Gardens · Kitchen · Volunteer', 'Jardins · Cuisine · Bénévolat'), img: '/wwoof/bw-6.jpg', go: 'WWOOFING', bw: true },
                { eyebrow: t('A place opens', 'Une place se libère'), title: t('The Community', 'La Communauté'), tag: t('Live here · Paid place', 'Vivre ici · Place rémunérée'), img: '/wwoof/fire-bw.jpg', go: 'COMMUNITY', bw: true },
                { eyebrow: t('Support', 'Soutenir'), title: t('Make a gift', 'Faire un don'), tag: t('Help the mission', 'Aider la mission'), img: CEILIDH_DOORS_PHOTO, go: 'DONATION', bw: true },
              ].map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onNavigate(d.go)}
                  className="group relative overflow-hidden rounded-[15px] text-left"
                  style={{ aspectRatio: '3 / 4' }}
                  aria-label={d.title}
                >
                  <img
                    src={getOptimizedUrl(d.img, 1600)}
                    srcSet={getSrcSet(d.img)}
                    sizes="(min-width: 768px) 33vw, 100vw"
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
                    style={d.bw ? { filter: 'grayscale(1) contrast(1.04)' } : undefined}
                  />
                  <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.35) 46%, rgba(5,5,5,0.05) 78%)' }} />
                  <div className="absolute inset-x-0 bottom-0 p-6 md:p-7">
                    <span className="font-cinzel uppercase block mb-2 text-[#c5a059]" style={{ fontSize: '10px', letterSpacing: '0.4em' }}>{d.eyebrow}</span>
                    <h3 className="font-prata text-[#f3e5ab] leading-tight" style={{ fontSize: 'clamp(1.6rem, 2.4vw, 2.3rem)', letterSpacing: '-0.01em' }}>{d.title}</h3>
                    <p className="font-josefin uppercase text-neutral-300 mt-2" style={{ fontSize: '11px', letterSpacing: '0.18em' }}>{d.tag}</p>
                    <span className="inline-flex items-center gap-2 font-cinzel uppercase text-[#f3e5ab] mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ fontSize: '10px', letterSpacing: '0.3em' }}>
                      {t('Enter', 'Entrer')} <span className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </div>
                  <span className="absolute inset-0 pointer-events-none rounded-[15px]" style={{ boxShadow: 'inset 0 0 0 1px rgba(197,160,89,0.25)' }} />
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Centre d'arts et communauté : avant « À propos du lieu », qui vit
            désormais dans le pied de page (vague 2, 16 sept. 2026). */}
        <CentreArtsCommunauteSection language={language} onNavigate={onNavigate} />

        {/* Faire vivre le Salon autrement : confier un site à Vexel Webstudio,
            dernière scène avant le pied de page (demande d'Alex, 16 sept. 2026). */}
        <VexelSoutienSection language={language} />

        {/* Vrai pied de page : À propos du lieu (SEO + FAQ, source du JSON-LD
            FAQPage), carte, adresse NAP, plan du site et collant Vexel. */}
        <SiteFooter viewKey="INN" language={language} onNavigate={onNavigate} />
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
        .hero3-soleils { opacity: 0; animation: hero3FadeUp 0.8s ease-out 1.3s forwards; }
        .hero3-ctas { opacity: 0; animation: hero3FadeUp 0.7s ease-out 1.5s forwards; }
        .hero3-scroll { opacity: 0; animation: hero3FadeIn 0.9s ease-out 1.7s forwards; }
        .hero3-scroll-line { animation: hero3ScrollPulse 2.4s ease-in-out infinite; }
        @keyframes hero3ScrollPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.6); transform-origin: top; }
          50%      { opacity: 1;   transform: scaleY(1);   transform-origin: top; }
        }
        @keyframes hero3FadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes hero3FadeIn { to { opacity: 1; } }

        /* Rooms section header: gentle reveal as you scroll into view.
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

        /* Hero: slow Ken Burns zoom on the cycler. Lives on an inner wrapper so it composes
           with the scroll-driven transform on heroPhotoRef without overwriting it. */
        .hero3-kenburns { animation: hero3KenBurns 22s ease-in-out infinite alternate; }
        @keyframes hero3KenBurns {
          0%   { transform: scale(1.02) translate3d(0, 0, 0); }
          100% { transform: scale(1.09) translate3d(-1%, -0.6%, 0); }
        }

        /* L'Espace inventory rows: hidden until they scroll into view, then a
           gentle fade + rise. The IntersectionObserver adds .espace-in once. */
        .espace-row {
          opacity: 0;
          transform: translateY(40px);
          transition: opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .espace-row.espace-in { opacity: 1; transform: translateY(0); }

        /* ── Cinematic INTRO ACT ─────────────────────────────────────────────
           The track holds a sticky 100vh video + an extent spacer that supplies
           the scroll length for the scrub. Total track height = 100vh + extent,
           so the sticky child pins through the whole act, then releases onto the
           solid-black booking section below. isolation keeps the act on its own
           stacking context so nothing bleeds past it. */
        .reserve-cine-track { isolation: isolate; }
        .reserve-cine-extent { height: 240vh; }

        /* The scrub extent stays full height for everyone: the scroll-scrub plays
           regardless of the OS reduce-motion setting (owner's call), so there is no
           dead scroll to collapse. Only the hero entrance animations below are
           reduced for prefers-reduced-motion. */

        @media (prefers-reduced-motion: reduce) {
          .hero3-eyebrow, .hero3-rule, .hero3-title, .hero3-tagline, .hero3-soleils, .hero3-ctas, .hero3-scroll, .hero3-scroll-line {
            opacity: 1 !important; transform: none !important; animation: none !important;
          }
          .hero3-rule { width: 56px !important; }
          .hero3-kenburns { animation: none !important; transform: scale(1.02) !important; }
          .rooms-eyebrow, .rooms-title, .rooms-rule { animation: none !important; opacity: 1 !important; transform: none !important; }
          .rooms-rule { width: 80px !important; }
          .rooms-title { -webkit-text-fill-color: #f3e5ab !important; color: #f3e5ab !important; background: none !important; }
          .espace-row { opacity: 1 !important; transform: none !important; transition: none !important; }
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