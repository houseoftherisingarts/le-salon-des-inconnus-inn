// PetiteMonnaieParcours — cinematic scroll-driven 3D flythrough of the Petite-Nation.
//
// A tall section holds a sticky full-screen viewport. GSAP ScrollTrigger scrubs a
// 0→1 progress into progressRef; an rAF loop turns that into a virtual camera that
// follows the river path (lerp over the stops' real map coords), banks into the
// turns, and dives forward in CSS-perspective depth. Each stop is a round brass
// "pastille" (FMM medallion border): it rises from the deep, settles at the focal
// centre, then WHOOSHES outward past the lens. The active stop's details (with
// address + link) live in a fixed bottom-left panel. Background is a slow moving
// green gradient (money). The map behind is the real Petite-Nation: real river,
// lakes Simon/Papineau, the Ottawa river, villages at their real positions.

import React, { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PM_STOPS, mapsLink, type PMStop } from '../data/petiteMonnaie';
import { PN_RIVER, PN_OTTAWA, PN_LAKES, PN_TOWNS, PN_ROADS, type XY } from '../data/petiteNationGeo';
import { getOptimizedUrl } from '../utils/imageOptimizer';

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
const easeIn = (t: number) => t * t;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

const sideOf = (s: PMStop) => (s.coords.x >= 0.45 ? 1 : -1);

// FMM brass + greens
const BRASS = '#C9A85A';
const BRASS_DEEP = '#B08D3A';
const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';

interface ParcoursProps {
  language: 'EN' | 'FR';
  scrollerRef: React.RefObject<HTMLDivElement | null>;
}

export const PetiteMonnaieParcours: React.FC<ParcoursProps> = ({ language, scrollerRef }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const renderRef = useRef(0);
  const pastilleRefs = useRef<(HTMLDivElement | null)[]>([]);
  const haloRefs = useRef<(HTMLDivElement | null)[]>([]);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const railRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  const N = PM_STOPS.length;

  const embers = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      left: (i * 37) % 100, bottom: (i * 53) % 40, size: 1.5 + (i % 3),
      delay: ((i * 0.73) % 9).toFixed(2), dur: 8 + (i % 6),
      dx: (((i * 53) % 30) - 15), op: (0.35 + (i % 4) * 0.16).toFixed(2),
    })),
    []
  );

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scroller = scrollerRef.current ?? undefined;
    const trigger = ScrollTrigger.create({
      scroller, trigger: section, start: 'top top', end: 'bottom bottom',
      scrub: reduce ? true : 0.5,
      onUpdate: (self) => { progressRef.current = self.progress; },
    });

    // Hold on the first stop (Le Salon) before the journey starts moving, so the
    // opening lingers on the inn instead of immediately descending the Petite-Nation.
    const HOLD = 0.12;

    let raf = 0;
    const tick = () => {
      renderRef.current = reduce ? progressRef.current : lerp(renderRef.current, progressRef.current, 0.11);
      const p = renderRef.current < HOLD ? 0 : (renderRef.current - HOLD) / (1 - HOLD);

      const isMobile = window.innerWidth < 768;
      const spreadX = isMobile ? 640 : 1180;
      const spreadY = isMobile ? 520 : 860;
      const depth = isMobile ? 470 : 640;
      const exitXMax = isMobile ? 720 : 1220;
      const exitZMax = isMobile ? 520 : 780;
      const blurMax = isMobile ? 7 : 13;

      const camZ = p * (N - 1);
      const ci = Math.min(Math.floor(camZ), N - 1);
      const cf = camZ - ci;
      const a = PM_STOPS[ci];
      const b = PM_STOPS[Math.min(ci + 1, N - 1)];
      const camX = lerp(a.coords.x, b.coords.x, cf);
      const camY = lerp(a.coords.y, b.coords.y, cf);
      const active = Math.round(camZ);

      const dirX = b.coords.x - a.coords.x;
      const dirY = b.coords.y - a.coords.y;
      if (worldRef.current) {
        worldRef.current.style.transform =
          `rotateX(${(dirY * 5).toFixed(2)}deg) rotateY(${(dirX * 11).toFixed(2)}deg) rotateZ(${(-dirX * 9).toFixed(2)}deg)`;
      }

      for (let i = 0; i < N; i++) {
        const el = pastilleRefs.current[i];
        if (!el) continue;
        const s = PM_STOPS[i];
        const d = i - camZ;
        const side = sideOf(s);

        let px = (s.coords.x - camX) * spreadX;
        let py = (s.coords.y - camY) * spreadY;
        let pz = -d * depth;
        let rot = 0;
        let op: number;
        let blur = 0;

        if (d < 0) {
          const e = clamp01(-d / 0.95);
          px += side * easeIn(e) * exitXMax;
          py += -easeIn(e) * (isMobile ? 70 : 120);
          pz += easeIn(e) * exitZMax;
          rot = side * e * 14;
          blur = e * e * blurMax;
          op = 1 - smooth(0.08, 0.85, -d);
        } else {
          const en = clamp01(d / 3.2);
          px += side * easeOut(en) * (isMobile ? 150 : 260);
          op = 1 - smooth(2.7, 4.6, d);
          blur = d > 2.9 ? Math.min(5, (d - 2.9) * 2) : 0;
        }

        const isActive = i === active;
        const focalPop = isActive ? 1 + (1 - smooth(0, 0.5, Math.abs(d))) * 0.05 : 1;
        el.style.transform =
          `translate3d(-50%, -50%, 0) translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, ${pz.toFixed(1)}px) rotateZ(${rot.toFixed(2)}deg) scale(${focalPop.toFixed(3)})`;
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = String(1000 - Math.round(d * 10));
        el.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none';
        // only the focal pastille is clickable
        el.style.pointerEvents = isActive && Math.abs(d) < 0.4 ? 'auto' : 'none';

        const halo = haloRefs.current[i];
        if (halo) halo.style.opacity = (0.22 + (1 - smooth(0, 0.7, Math.abs(d))) * 0.78).toFixed(3);

        const panel = panelRefs.current[i];
        if (panel) {
          const focal = isActive ? 1 - smooth(0.12, 0.5, Math.abs(d)) : 0;
          panel.style.opacity = focal.toFixed(3);
          panel.style.transform = `translateY(${lerp(20, 0, focal).toFixed(1)}px)`;
          panel.style.pointerEvents = focal > 0.6 ? 'auto' : 'none';
        }
      }

      if (mapRef.current) {
        mapRef.current.style.transform =
          `translate3d(${(-(camX - 0.5) * (isMobile ? 300 : 540)).toFixed(1)}px, ${(-(camY - 0.5) * (isMobile ? 300 : 540)).toFixed(1)}px, -1000px) scale(2.5)`;
      }

      if (railRef.current) {
        const dots = railRef.current.children;
        for (let i = 0; i < dots.length; i++) {
          const on = i === active;
          (dots[i] as HTMLElement).style.opacity = on ? '1' : '0.28';
          (dots[i] as HTMLElement).style.transform = on ? 'scale(1.7)' : 'scale(1)';
        }
      }

      if (hintRef.current) hintRef.current.style.opacity = clamp01(1 - p * 7).toFixed(3);

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => ScrollTrigger.refresh());
    ro.observe(section);
    return () => { trigger.kill(); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [N, scrollerRef]);

  return (
    <section ref={sectionRef} className="relative" style={{ height: `${Math.max(N * 60, 640)}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden" style={{ background: '#0a0a08' }}>
        {/* warm near-black base with a toned-down green drifting across it */}
        <div className="absolute inset-0 z-0" style={{
          background: 'linear-gradient(135deg, #080907 0%, #0b120d 28%, #132f20 50%, #0b120d 72%, #080907 100%)',
          backgroundSize: '230% 230%', animation: 'pmGreenShift 34s ease-in-out infinite',
        }} />
        <div className="absolute inset-0 z-0 will-change-transform" style={{
          background: 'radial-gradient(56% 46% at 50% 40%, rgba(44,76,54,0.36), transparent 74%)',
          animation: 'pmGreenDrift 32s ease-in-out infinite',
        }} />
        <div className="absolute inset-0 z-0" style={{ background: 'radial-gradient(125% 100% at 50% 42%, transparent 50%, rgba(8,7,6,0.9) 100%)' }} />

        {/* perspective stage with the real map + pastilles */}
        <div className="absolute inset-0 z-[2]" style={{ perspective: '1180px', perspectiveOrigin: '50% 40%' }}>
          <div ref={worldRef} className="absolute inset-0 will-change-transform" style={{ transformStyle: 'preserve-3d' }}>
            <div ref={mapRef} className="absolute left-1/2 top-1/2 will-change-transform"
              style={{ width: 1300, height: 1300, marginLeft: -650, marginTop: -650, transformStyle: 'preserve-3d' }}>
              <RealMap />
            </div>
            <div className="absolute left-1/2 top-[46%]" style={{ transformStyle: 'preserve-3d' }}>
              {PM_STOPS.map((s, i) => (
                <Pastille key={s.id} stop={s} index={i} total={N}
                  setPastille={(el) => (pastilleRefs.current[i] = el)}
                  setHalo={(el) => (haloRefs.current[i] = el)} />
              ))}
            </div>
          </div>
        </div>

        {/* gold embers rising */}
        <div className="absolute inset-0 pointer-events-none z-[3] overflow-hidden">
          {embers.map((e, i) => (
            <span key={i} className="pm-ember absolute rounded-full"
              style={{
                left: `${e.left}%`, bottom: `${e.bottom}%`, width: e.size, height: e.size,
                background: 'radial-gradient(circle, #f3e5ab, #C9A85A 60%, transparent 72%)',
                boxShadow: '0 0 6px #C9A85A99',
                animation: `pmEmber ${e.dur}s ease-in-out ${e.delay}s infinite`,
                '--pm-ember-dx': `${e.dx}px`, '--pm-ember-op': e.op,
              } as React.CSSProperties} />
          ))}
        </div>

        {/* grain + edge vignette */}
        <div className="absolute inset-0 pointer-events-none z-[4] opacity-[0.05]"
          style={{ backgroundImage: `url('${getOptimizedUrl(GRAIN, 800)}')` }} />
        <div className="absolute inset-0 pointer-events-none z-[4]"
          style={{ boxShadow: 'inset 0 0 200px 50px rgba(4,9,6,0.9)' }} />

        {/* bottom-left scrim — keeps the active-stop text readable over the cluster
            of incoming pastilles, without darkening the focal centre */}
        <div className="absolute inset-0 pointer-events-none z-[10]"
          style={{ background: 'linear-gradient(to top right, rgba(5,9,6,0.94) 0%, rgba(5,9,6,0.58) 24%, transparent 50%)' }} />

        {/* active-stop info panel — fixed bottom-left, never clipped */}
        <div className="absolute left-6 md:left-14 bottom-12 md:bottom-16 z-20 w-[min(460px,84vw)]">
          {PM_STOPS.map((s, i) => (
            <div key={s.id} ref={(el) => { panelRefs.current[i] = el; }}
              className="absolute bottom-0 left-0 right-0 will-change-transform" style={{ opacity: 0 }}>
              <div className="flex items-center gap-3">
                <span className="font-cinzel text-sm tracking-[0.2em]" style={{ color: BRASS }}>{String(i).padStart(2, '0')}</span>
                <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${BRASS}99, transparent)` }} />
                <span className="font-lato text-[10px] uppercase tracking-[0.34em]" style={{ color: BRASS }}>{s.village}</span>
              </div>
              <h3 className="mt-3 font-cinzel text-[28px] md:text-4xl leading-[1.05] text-[#f3e5ab]">{s.name}</h3>
              <p className="mt-1.5 font-lato text-[11px] uppercase tracking-[0.2em] text-white/45">{s.category}</p>
              <p className="mt-3 font-lato text-[13px] md:text-sm leading-relaxed text-white/72">{s.blurb}</p>
              {s.perk && (
                <div className="mt-3.5 inline-flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full text-[#f3e5ab]"
                  style={{ background: `${BRASS}1f`, border: `1px solid ${BRASS}73` }}>
                  <span className="text-base leading-none">☕</span>
                  <span className="font-lato text-[12px] leading-snug">{s.perk}</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href={mapsLink(s)} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full text-[11px] font-cinzel uppercase tracking-[0.25em] transition-colors"
                  style={{ border: `1px solid ${BRASS}99`, color: BRASS }}>
                  {s.link ? (s.isStart ? 'Le Salon' : 'Visiter le site') : "Voir l'adresse"} →
                </a>
                {s.address && <span className="font-lato text-[11px] text-white/40">{s.address}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* progress rail */}
        <div ref={railRef} className="absolute right-5 top-1/2 -translate-y-1/2 z-20 hidden sm:flex flex-col gap-2.5">
          {PM_STOPS.map((s) => (
            <span key={s.id} className="block w-1.5 h-1.5 rounded-full transition-all duration-300" style={{ background: BRASS, opacity: 0.28 }} />
          ))}
        </div>

        {/* scroll hint */}
        <div ref={hintRef} className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-[10px] font-cinzel uppercase tracking-[0.4em] pointer-events-none" style={{ color: `${BRASS}bf` }}>
          {language === 'EN' ? 'Follow the river as you scroll' : 'Suivez la rivière au fil du scroll'}
          <span className="w-px h-7" style={{ background: `linear-gradient(180deg, ${BRASS}b3, transparent)` }} />
        </div>
      </div>
    </section>
  );
};

// ── A single pastille: clickable brass medallion orb + halo + ground glow ────
const Pastille: React.FC<{
  stop: PMStop;
  index: number;
  total: number;
  setPastille: (el: HTMLDivElement | null) => void;
  setHalo: (el: HTMLDivElement | null) => void;
}> = ({ stop, index, total, setPastille, setHalo }) => {
  const ring = stop.isStart ? '#f3e5ab' : BRASS;
  const size = stop.isStart ? 320 : 264;
  return (
    <div ref={setPastille} className="absolute left-0 top-0 will-change-transform" style={{ opacity: 0 }}>
      <div className="relative flex flex-col items-center">
        <div ref={setHalo} className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
          style={{ top: -size * 0.2, width: size * 1.55, height: size * 1.55, background: `radial-gradient(circle, ${ring}48 0%, ${ring}18 38%, transparent 66%)`, filter: 'blur(6px)' }} />
        <a href={mapsLink(stop)} target="_blank" rel="noopener noreferrer" title={stop.name}
          className="relative block rounded-full overflow-hidden bg-[#0a120c] group"
          style={{ width: size, height: size, boxShadow: `0 0 0 1px ${BRASS_DEEP}55, 0 26px 70px rgba(0,0,0,0.6), inset 0 0 0 2px ${BRASS}, inset 0 0 0 6px rgba(8,14,10,0.6), inset 0 0 0 8px ${BRASS_DEEP}` }}>
          {/* branded fallback under the photo — a broken/odd image degrades to this,
              never to white. Logo stops sit on near-black so the inverted wordmark's
              own backdrop melts into the orb instead of reading as a rectangle. */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ background: stop.logo ? 'radial-gradient(circle at 50% 38%, #0a0f0c, #050807 78%)' : 'radial-gradient(circle at 50% 34%, #17281d, #0a120c 72%)' }}>
            {!stop.logo && (
              <span className="font-cinzel uppercase tracking-[0.12em]" style={{ color: `${BRASS}b3`, fontSize: size * 0.24 }}>
                {stop.village.slice(0, 2)}
              </span>
            )}
          </div>
          <img src={getOptimizedUrl(stop.image, 640)} alt={stop.name} loading="lazy"
            className={`relative w-full h-full transition-transform duration-700 group-hover:scale-105 ${stop.logo ? 'object-contain p-[18%]' : 'object-cover'}`}
            style={stop.logo ? {
              filter: 'invert(1) brightness(0.97) sepia(0.34) saturate(1.5) hue-rotate(6deg)',
              WebkitMaskImage: 'radial-gradient(ellipse 78% 60% at 50% 50%, #000 58%, transparent 96%)',
              maskImage: 'radial-gradient(ellipse 78% 60% at 50% 50%, #000 58%, transparent 96%)',
            } : undefined}
            draggable={false}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
          <div className="absolute inset-0 pointer-events-none rounded-full"
            style={{ background: 'radial-gradient(120% 120% at 32% 24%, rgba(255,248,224,0.22) 0%, transparent 38%), linear-gradient(180deg, transparent 52%, rgba(6,12,8,0.6) 100%)' }} />
          <span className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-[10px] font-cinzel tracking-[0.3em] text-[#f3e5ab]" style={{ border: `1px solid ${BRASS}55` }}>
            {String(index).padStart(2, '0')} · {String(total - 1).padStart(2, '0')}
          </span>
        </a>
        <div className="pointer-events-none" style={{ marginTop: 6, width: size * 0.7, height: 14, borderRadius: '50%', background: `radial-gradient(ellipse, ${ring}3a, transparent 70%)`, filter: 'blur(3px)' }} />
      </div>
    </div>
  );
};

// ── Real map of the Petite-Nation (gold ink on the green deep) ───────────────
const toPath = (pts: XY[], close = false) =>
  pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p[0] * 1000).toFixed(1)} ${(p[1] * 1000).toFixed(1)}`).join(' ') + (close ? ' Z' : '');

// Roads are 3-point [start, control, end] arrays — draw them as a smooth quadratic
// so they bow gently instead of kinking at the midpoint.
const roadPath = (pts: XY[]) => {
  const P = (p: XY) => `${(p[0] * 1000).toFixed(1)} ${(p[1] * 1000).toFixed(1)}`;
  if (pts.length === 3) return `M ${P(pts[0])} Q ${P(pts[1])} ${P(pts[2])}`;
  return toPath(pts);
};

const RealMap: React.FC = () => {
  return (
    <svg viewBox="0 0 1000 1000" className="w-full h-full" style={{ opacity: 0.62 }}>
      <defs>
        <filter id="pm-soft"><feGaussianBlur stdDeviation="6" /></filter>
        <radialGradient id="pm-lake" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#1f4a3a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0c241a" stopOpacity="0.7" />
        </radialGradient>
      </defs>

      {/* Ottawa river — the wide southern boundary */}
      <path d={toPath(PN_OTTAWA)} fill="none" stroke="#2f6b52" strokeOpacity={0.5} strokeWidth={26} strokeLinecap="round" filter="url(#pm-soft)" />
      <path d={toPath(PN_OTTAWA)} fill="none" stroke={BRASS} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" />

      {/* lakes Simon + Papineau */}
      {PN_LAKES.map((L) => (
        <g key={L.name}>
          <path d={toPath(L.ring, true)} fill="url(#pm-lake)" stroke={BRASS} strokeOpacity={0.55} strokeWidth={2} />
          <text
            x={(L.ring.reduce((a, p) => a + p[0], 0) / L.ring.length) * 1000}
            y={(L.ring.reduce((a, p) => a + p[1], 0) / L.ring.length) * 1000}
            fill={BRASS} fillOpacity={0.5} fontSize={15} fontStyle="italic" textAnchor="middle" fontFamily="Cormorant Garamond, serif">
            {L.name}
          </text>
        </g>
      ))}

      {/* Roads — routes 321/323 and the 148, dotted stone-and-brass trails that
          link every village (Namur↔Chénéville, down through Ripon to Montebello) */}
      {PN_ROADS.map((r, i) => (
        <g key={`road-${i}`}>
          <path d={roadPath(r)} fill="none" stroke="#091611" strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
          <path d={roadPath(r)} fill="none" stroke={BRASS} strokeOpacity={0.34} strokeWidth={1.6} strokeLinecap="round" strokeDasharray="1.5 7" />
        </g>
      ))}

      {/* Rivière de la Petite Nation — glowing gold ink */}
      <path d={toPath(PN_RIVER)} fill="none" stroke="#f0c870" strokeOpacity={0.3} strokeWidth={11} strokeLinecap="round" filter="url(#pm-soft)" />
      <path d={toPath(PN_RIVER)} fill="none" stroke={BRASS} strokeWidth={3.5} strokeLinecap="round" />
      <path d={toPath(PN_RIVER)} fill="none" stroke="#fff6d8" strokeOpacity={0.3} strokeWidth={1} strokeDasharray="2 12" strokeLinecap="round" />

      {/* villages */}
      {Object.entries(PN_TOWNS).map(([name, xy]) => {
        const cx = xy[0] * 1000, cy = xy[1] * 1000;
        return (
          <g key={name}>
            <circle cx={cx} cy={cy} r={16} fill={BRASS} fillOpacity={0.1} />
            <circle cx={cx} cy={cy} r={5.5} fill="#0b0908" stroke={BRASS} strokeWidth={1.6} />
            <circle cx={cx} cy={cy} r={1.8} fill={BRASS} fillOpacity={0.8} />
            <text x={cx + 13} y={cy + 4.5} fill={BRASS} fillOpacity={0.72} fontSize={15.5} fontFamily="Cinzel, serif">{name}</text>
          </g>
        );
      })}
    </svg>
  );
};
