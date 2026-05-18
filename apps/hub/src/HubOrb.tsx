import { useEffect, useRef, useState, type CSSProperties } from 'react';

// One row per branch of the family. Order = list display order, top to bottom.
type Choice = {
  id: string;
  name: string;
  taglineFr: string;
  blurbFr: string;
  url: string;
  image: string;
  available: boolean;
  // Per-image framing inside the circular orb. Defaults: center / cover.
  // Use `imageSize: '78% auto'` + `imageBg` to shrink an image whose subject
  // would otherwise be clipped by the circle's rim (e.g. text near edges).
  imagePosition?: string;
  imageSize?: string;
  imageBg?: string;
};

const CHOICES: Choice[] = [
  {
    id: 'auberge',
    name: "L'Auberge",
    taglineFr: 'Maison Favier · Lac Simon',
    blurbFr:
      'Cinq chambres · Table partagée · Silence entre Montebello et Tremblant',
    url: 'https://aubergedesinconnus.com/',
    image:
      'https://storage.googleapis.com/salondesinconnus/Auberge%20photos/Maison%20main.png',
    available: true,
  },
  {
    id: 'salon',
    name: 'Le Salon',
    taglineFr: "Centre d'art · Petite Nation",
    blurbFr:
      "Galerie · Ateliers · Fiscalité de l'art · Pour créateurs et acquéreurs",
    url: 'https://lesalondesinconnus.com/',
    image: '/salon-creator-studio.png',
    // Screenshot has text near the edges — shrink so it sits safely inside
    // the circular rim, with a dark backdrop matching the orb interior.
    imageSize: '78% auto',
    imageBg: '#0a0a0a',
    available: true,
  },
  // House of the Rising Arts is intentionally NOT a door on the FR hub.
  // The domain houseoftherisingarts.com is just an English-friendly alias that
  // redirects to the Salon — it is not a separate destination users pick here.
  {
    id: 'dome',
    name: 'Le Dôme',
    taglineFr: 'La communauté',
    blurbFr:
      'Hub communautaire · Projets partagés · Bâtir ensemble · Bientôt',
    url: 'https://ledomdesinconnus.com/',
    image:
      'https://storage.googleapis.com/salondesinconnus/Artistes/evi%20wide.png',
    // Evinali sits in the right portion of this wide shot — pull the focal
    // point to her face so she lands centered in the orb.
    imagePosition: '72% 38%',
    available: false,
  },
];

// Synthesize a slow "shimmer" via Web Audio — a stacked cluster of high
// sine partials (A major-ish) that swell in over ~0.3s, drift upward a
// touch for a rising/magical feel, and decay over ~1.6s. A faint
// high-passed noise wash sits on top for airy sparkle. No transient: the
// cluster fades in rather than hitting.
function useShimmer() {
  const ctxRef = useRef<AudioContext | null>(null);
  return () => {
    try {
      if (!ctxRef.current) {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctor) return;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current!;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const duration = 1.6;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.22, now + 0.3);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(ctx.destination);

      // High partials — stagger their entries so the chord blooms rather
      // than arrives all at once.
      const partials: { freq: number; offset: number; gain: number }[] = [
        { freq: 880,  offset: 0.00, gain: 0.18 }, // A5
        { freq: 1320, offset: 0.06, gain: 0.14 }, // E6
        { freq: 1760, offset: 0.12, gain: 0.12 }, // A6
        { freq: 2217, offset: 0.18, gain: 0.09 }, // C#7
        { freq: 2637, offset: 0.24, gain: 0.07 }, // E7
        { freq: 3520, offset: 0.30, gain: 0.05 }, // A7
      ];

      partials.forEach((p) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, now);
        // Slow upward glide — the "rising shimmer" character.
        osc.frequency.linearRampToValueAtTime(p.freq * 1.012, now + duration);
        const start = now + p.offset;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(p.gain, start + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.connect(g);
        g.connect(master);
        osc.start(start);
        osc.stop(now + duration + 0.05);
      });

      // Airy sparkle — high-passed white noise, very faint.
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 5500;
      hp.Q.value = 0.7;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.04, now + 0.4);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      noise.connect(hp);
      hp.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
      noise.stop(now + duration);
    } catch {
      /* audio context creation can fail in private mode; silently no-op */
    }
  };
}

export function HubOrb() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const playShimmer = useShimmer();

  // Cross-fade state — two stacked layers swap which one is "current"; the
  // other fades out underneath. Each layer stores a choice index so it
  // carries its own framing (position/size/backdrop).
  const [layerA, setLayerA] = useState<number>(0);
  const [layerB, setLayerB] = useState<number | null>(null);
  const [activeLayer, setActiveLayer] = useState<'A' | 'B'>('A');

  useEffect(() => {
    if (activeLayer === 'A') {
      setLayerB(selectedIdx);
      requestAnimationFrame(() => setActiveLayer('B'));
    } else {
      setLayerA(selectedIdx);
      requestAnimationFrame(() => setActiveLayer('A'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx]);

  const choiceA = CHOICES[layerA];
  const choiceB = layerB !== null ? CHOICES[layerB] : null;
  const layerStyle = (c: Choice): CSSProperties => ({
    backgroundImage: `url(${c.image})`,
    backgroundPosition: c.imagePosition ?? 'center',
    backgroundSize: c.imageSize ?? 'cover',
    backgroundColor: c.imageBg ?? 'transparent',
    backgroundRepeat: 'no-repeat',
  });

  const onChoiceClick = (i: number) => {
    if (i === selectedIdx) return;
    playShimmer();
    setSelectedIdx(i);
  };

  const onConfirm = () => {
    const choice = CHOICES[selectedIdx];
    if (!choice.available) return;
    setConfirming(true);
    setTimeout(() => {
      window.location.href = choice.url;
    }, 600);
  };

  const choice = CHOICES[selectedIdx];

  return (
    <div className="hub-orb-root relative w-full min-h-screen overflow-hidden bg-[#050505] text-neutral-100 font-lato">
      {/* Atmospheric background */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(ellipse at 75% 50%, rgba(197,160,89,0.18), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(40,80,140,0.14), transparent 60%)',
          }}
        />

        {/* Iridescent Creator-Studio gradient over the whole page — fades in
            only for the Salon door. Two stacked layers (conic + drifting blobs)
            blended in screen/overlay so it tints the existing scene rather
            than covering it. Slow rotation + drift gives the water-like feel. */}
        <div
          className={`hub-iridescent absolute inset-0 transition-opacity duration-[1600ms] ease-out ${
            choice.id === 'salon' ? 'opacity-25' : 'opacity-0'
          }`}
        >
          <div
            className="hub-iridescent-conic absolute inset-0"
            style={{
              background:
                'conic-gradient(from 0deg at 50% 50%, rgba(217,70,239,0.55), rgba(34,211,238,0.5), rgba(253,224,71,0.45), rgba(168,85,247,0.55), rgba(34,211,238,0.5), rgba(217,70,239,0.55))',
              filter: 'blur(90px) saturate(1.25)',
              mixBlendMode: 'screen',
            }}
          />
          <div
            className="hub-iridescent-blobs absolute inset-0"
            style={{
              background:
                'radial-gradient(35% 45% at 22% 30%, rgba(232,121,249,0.55), transparent 70%), radial-gradient(40% 45% at 78% 38%, rgba(34,211,238,0.5), transparent 70%), radial-gradient(45% 40% at 50% 82%, rgba(253,224,71,0.4), transparent 70%), radial-gradient(30% 35% at 12% 70%, rgba(168,85,247,0.45), transparent 70%)',
              filter: 'blur(70px) saturate(1.15)',
              mixBlendMode: 'overlay',
            }}
          />
        </div>

        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("https://www.transparenttextures.com/patterns/black-linen.png")',
          }}
        />
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-6 md:px-12 py-12 md:py-16 grid md:grid-cols-[1fr_1.2fr] gap-10 md:gap-20 items-center min-h-screen">
        {/* LEFT — text list of choices + selected meta + confirm */}
        <div className="flex flex-col gap-10 md:gap-14">
          <ul className="flex flex-col">
            {CHOICES.map((c, i) => {
              const isSelected = i === selectedIdx;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onChoiceClick(i)}
                    className="group w-full text-left py-3 md:py-4 flex items-baseline gap-4 md:gap-6 transition-all duration-300"
                  >
                    {/* Selection indicator dot */}
                    <span
                      className={`shrink-0 w-2 h-2 rounded-full transition-all duration-300 translate-y-[-3px] ${
                        isSelected
                          ? 'bg-[#f3e5ab] shadow-[0_0_14px_rgba(243,229,171,0.95)]'
                          : 'bg-white/15 group-hover:bg-white/40'
                      }`}
                    />
                    <span className="flex flex-col">
                      <span
                        className={`font-cinzel uppercase transition-all duration-300 leading-[0.95] ${
                          isSelected
                            ? 'text-[#f3e5ab] tracking-[0.05em]'
                            : 'text-neutral-500 group-hover:text-neutral-200 tracking-[0.02em]'
                        }`}
                        style={{
                          fontSize: 'clamp(1.5rem, 3vw, 2.6rem)',
                        }}
                      >
                        {c.name}
                      </span>
                      <span
                        className={`font-cinzel text-[10px] uppercase tracking-[0.4em] mt-2 transition-colors ${
                          isSelected ? 'text-[#c5a059]' : 'text-neutral-700 group-hover:text-neutral-500'
                        }`}
                      >
                        {c.taglineFr}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Confirm — indented to line up with the title text (past the dot). */}
          <button
            onClick={onConfirm}
            disabled={!choice.available || confirming}
            className={`self-start ml-6 md:ml-8 px-9 py-4 font-cinzel font-bold text-xs uppercase tracking-[0.35em] transition-all duration-300 border ${
              choice.available
                ? 'bg-[#c5a059] text-[#18181b] border-[#c5a059] hover:bg-[#d4b06a] hover:scale-[1.02]'
                : 'bg-transparent text-neutral-600 border-white/10 cursor-not-allowed'
            } ${confirming ? 'opacity-50 scale-[0.98]' : ''}`}
            style={{
              boxShadow: choice.available
                ? '0 6px 24px rgba(197,160,89,0.3), inset 0 1px 0 rgba(255,255,255,0.2)'
                : 'none',
            }}
          >
            {confirming ? 'Ouverture…' : 'Confirmer'}
          </button>
        </div>

        {/* RIGHT — glass orb + blurb beneath it */}
        <div className="hub-orb-wrap relative flex flex-col items-center justify-center gap-8 md:gap-10">
          <div className="relative w-full max-w-[560px] aspect-square">
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(197,160,89,0.22), transparent 60%)',
                filter: 'blur(50px)',
              }}
            />

          <div
            role="button"
            tabIndex={choice.available ? 0 : -1}
            onClick={onConfirm}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onConfirm();
              }
            }}
            aria-label={choice.available ? `Confirmer ${choice.name}` : `${choice.name} — lancement prochain`}
            aria-disabled={!choice.available}
            className={`hub-orb relative aspect-square w-full max-w-[560px] rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059]/70 ${
              choice.available ? 'cursor-pointer' : 'cursor-not-allowed'
            }`}
          >
            {/* IMAGE LAYERS — cross-fade with Ken Burns */}
            <div
              className={`hub-img-layer absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
                activeLayer === 'A' ? 'opacity-100 hub-img-active' : 'opacity-0'
              }`}
              style={layerStyle(choiceA)}
            />
            {choiceB && (
              <div
                className={`hub-img-layer absolute inset-0 transition-opacity duration-[1400ms] ease-out ${
                  activeLayer === 'B' ? 'opacity-100 hub-img-active' : 'opacity-0'
                }`}
                style={layerStyle(choiceB)}
              />
            )}

            {/* Vignette inside the orb so the image meets the rim softly */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)',
              }}
            />

            {/* Glassy refraction shell on top of the image */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.18), rgba(0,0,0,0) 38%)',
                mixBlendMode: 'screen',
              }}
            />

            {/* Top specular highlight, breathing */}
            <div
              className="absolute inset-x-[15%] top-[5%] h-[36%] rounded-full pointer-events-none hub-orb-shine"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.55), rgba(255,255,255,0) 65%)',
                filter: 'blur(2px)',
              }}
            />

            {/* Gold ornate ring */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                border: '1px solid rgba(243,229,171,0.5)',
                boxShadow:
                  'inset 0 0 0 5px rgba(0,0,0,0.55), inset 0 0 0 6px rgba(197,160,89,0.6), inset 0 0 70px rgba(197,160,89,0.2), 0 0 80px rgba(197,160,89,0.18), 0 0 200px rgba(197,160,89,0.08), 0 30px 80px rgba(0,0,0,0.6)',
              }}
            />

            {/* Bottom name banner inside the orb (LoL nameplate) */}
            <div className="absolute left-0 right-0 bottom-[16%] flex justify-center pointer-events-none">
              <span
                key={choice.id}
                className="hub-nameplate px-6 py-2 font-cinzel uppercase text-[#f3e5ab]"
                style={{
                  letterSpacing: '0.15em',
                  fontSize: 'clamp(0.85rem, 1.1vw, 1.05rem)',
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 25%, rgba(0,0,0,0.55) 75%, transparent 100%)',
                  textShadow: '0 2px 12px rgba(0,0,0,0.85)',
                }}
              >
                {choice.name}
              </span>
            </div>
          </div>
          </div>

          {/* Selected blurb — glass container that echoes the orb's
              language: dark interior, gold rim, breathing top highlight. */}
          <div
            key={choice.id}
            className="hub-blurb-glass relative w-full max-w-[560px] rounded-2xl overflow-hidden"
          >
            {/* Dark glassy interior */}
            <div className="relative px-8 py-4 bg-black/35 backdrop-blur-md">
              <p
                className="hub-blurb font-cinzel uppercase text-[#e8d8a6] text-[11px] md:text-[12px] tracking-[0.28em] leading-[1.7] text-center"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {choice.blurbFr}
              </p>
            </div>

            {/* Refraction sheen */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.18), rgba(0,0,0,0) 55%)',
                mixBlendMode: 'screen',
              }}
            />

            {/* Top specular highlight, breathing (reuses orb shine) */}
            <div
              className="hub-orb-shine absolute inset-x-[12%] top-0 h-[42%] pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.45), rgba(255,255,255,0) 70%)',
                filter: 'blur(2px)',
              }}
            />

            {/* Gold ornate rim — same palette as the orb */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                border: '1px solid rgba(243,229,171,0.45)',
                boxShadow:
                  'inset 0 0 0 2px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(197,160,89,0.4), inset 0 0 30px rgba(197,160,89,0.12), 0 0 30px rgba(197,160,89,0.12), 0 12px 30px rgba(0,0,0,0.5)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Top-left wordmark */}
      <div className="absolute top-6 left-6 md:top-8 md:left-12 z-20 flex items-center gap-3">
        <span className="font-cinzel text-[#c5a059] text-[10px] uppercase tracking-[0.5em]">
          Les Inconnus
        </span>
      </div>

      <style>{`
        .hub-img-layer {
          will-change: transform, opacity;
        }
        .hub-img-active {
          animation: hubKenBurns 16s ease-in-out infinite alternate;
        }
        @keyframes hubKenBurns {
          0%   { transform: scale(1.05); }
          100% { transform: scale(1.14) translateY(-1.5%); }
        }
        .hub-orb-shine {
          animation: hubShine 6s ease-in-out infinite alternate;
        }
        @keyframes hubShine {
          0%   { opacity: 0.45; transform: translateY(0); }
          100% { opacity: 0.7;  transform: translateY(2px); }
        }
        .hub-blurb,
        .hub-nameplate {
          animation: hubFadeText 600ms ease-out;
        }
        @keyframes hubFadeText {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .hub-blurb-glass {
          animation: hubGlassIn 800ms ease-out;
        }
        @keyframes hubGlassIn {
          0%   { opacity: 0; transform: translateY(10px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .hub-iridescent-conic {
          transform-origin: 50% 50%;
          animation: hubIrConic 22s linear infinite;
        }
        @keyframes hubIrConic {
          0%   { transform: rotate(0deg)   scale(1.05); }
          50%  { transform: rotate(180deg) scale(1.12); }
          100% { transform: rotate(360deg) scale(1.05); }
        }
        .hub-iridescent-blobs {
          animation: hubIrBlobs 14s ease-in-out infinite alternate;
        }
        @keyframes hubIrBlobs {
          0%   { transform: translate(-2%,  1%)   scale(1.05); opacity: 0.85; }
          50%  { transform: translate( 2%, -1.5%) scale(1.10); opacity: 1;    }
          100% { transform: translate(-1%,  2%)   scale(1.07); opacity: 0.9;  }
        }
        @media (prefers-reduced-motion: reduce) {
          .hub-img-active { animation: none !important; }
          .hub-orb-shine  { animation: none !important; }
          .hub-blurb, .hub-nameplate, .hub-blurb-glass { animation: none !important; }
          .hub-iridescent-conic, .hub-iridescent-blobs { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
