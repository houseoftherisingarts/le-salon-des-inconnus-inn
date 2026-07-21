import { useCallback, useRef, useState } from 'react';

// lesinconnus.com — the family selection page. One cinematic background (the
// golden-hour drone shot of the domain), a welcome title, and three glass
// image cards side by side on desktop. Click = go. Redesigned 2026-07-21 per
// Alex: no orb, no blurb box, no confirm step; AI Studio bar (glass, rounded,
// glow, zero italics).

type Choice = {
  id: string;
  name: string;
  taglineFr: string;
  url: string;
  image: string;
  imagePosition?: string;
};

const CHOICES: Choice[] = [
  {
    id: 'auberge',
    name: "L'Auberge des Inconnus",
    taglineFr: 'Maison Favier · Namur',
    url: 'https://aubergedesinconnus.com/',
    image: '/media/Auberge%20photos/Maison%20main.jpg',
  },
  {
    id: 'salon',
    name: 'Le Salon des Inconnus',
    taglineFr: "Centre d'art & activités",
    // Interim: the art surface lives on the inconnus-salon Firebase site until
    // the lesalondesinconnus.com domain swap (Phase 2.1). Update then.
    url: 'https://inconnus-salon.web.app/',
    image: '/media/biblio.jpg',
  },
  {
    id: 'dome',
    name: 'Le Dôme des Inconnus',
    taglineFr: 'La communauté',
    // Interim: swap to https://ledomedesinconnus.com/ once DNS is connected.
    url: 'https://inconnus-dome.web.app/',
    image: '/media/yourte%20coucher%20de%20soleil.jpg',
  },
];

const GOLD = '#d9b45c';
const CREAM = '#f6ead0';
const GRAIN = 'https://www.transparenttextures.com/patterns/stardust.png';

// Soft rising shimmer on hover/confirm — a small cluster of high sine
// partials that swell and decay. Kept from the original orb as the page's
// audio signature.
function playShimmer(ctx: AudioContext, gainScale = 1) {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.06 * gainScale, now + 0.3);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  master.connect(ctx.destination);
  [880, 1108.7, 1318.5, 1760].forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, now);
    o.frequency.linearRampToValueAtTime(f * 1.02, now + 1.4);
    g.gain.setValueAtTime(0.25 - i * 0.04, now);
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + 1.6);
  });
}

export function HubOrb() {
  const [leaving, setLeaving] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  const shimmer = useCallback((scale = 1) => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      if (audioRef.current.state === 'suspended') audioRef.current.resume();
      playShimmer(audioRef.current, scale);
    } catch {
      // audio is a garnish; never block navigation on it
    }
  }, []);

  const go = useCallback(
    (url: string) => {
      shimmer(1.4);
      setLeaving(true);
      window.setTimeout(() => {
        window.location.href = url;
      }, 420);
    },
    [shimmer],
  );

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#0b0908' }}
    >
      {/* Cinematic background — golden-hour drone shot of the domain */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <img
          src="/media/golden%20drone%20copy.jpg"
          alt=""
          className="hub-kenburns absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,5,0.55) 0%, rgba(8,6,5,0.35) 40%, rgba(8,6,5,0.88) 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 70% at 50% 42%, transparent 35%, rgba(8,6,5,0.65) 100%)' }} />
        <div className="hub-glow absolute" style={{ top: '-15%', left: '25%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(217,180,92,0.14), transparent 65%)', filter: 'blur(90px)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url('${GRAIN}')` }} />
      </div>

      {/* Brand mark */}
      <div className="absolute top-6 left-6 md:top-8 md:left-10 z-20">
        <span className="font-cinzel text-[11px] uppercase tracking-[0.45em]" style={{ color: 'rgba(217,180,92,0.8)' }}>
          Les Inconnus
        </span>
      </div>

      {/* Content — Arkkhe-anchored lockup left, floating glass cards, rotating seal */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 md:px-14 lg:px-20 py-14 gap-8 md:gap-10 max-w-[1280px] mx-auto w-full">
        <header className="hub-rise">
          <h1 style={{ fontFamily: "'Prata', serif", color: CREAM, lineHeight: 1.02, textShadow: '0 4px 44px rgba(0,0,0,0.7)' }}>
            <span className="block" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
              Bienvenue <span aria-hidden style={{ color: GOLD, fontSize: '0.72em' }}>›</span> chez
            </span>
            <span className="block" style={{ fontSize: 'clamp(3rem, 7.2vw, 5.8rem)', letterSpacing: '-0.01em' }}>
              les Inconnus
            </span>
          </h1>
          <p className="font-cinzel uppercase mt-5" style={{ fontSize: 'clamp(10px, 1.1vw, 12px)', letterSpacing: '0.45em', color: GOLD }}>
            Faites votre sélection
          </p>
        </header>

        <nav className="hub-rise-late grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              onClick={() => go(c.url)}
              onMouseEnter={() => shimmer(0.5)}
              className="hub-card group relative overflow-hidden rounded-[28px] text-left"
              style={{ aspectRatio: '3 / 3.3', border: '1px solid rgba(255,255,255,0.14)' }}
            >
              <img
                src={c.image}
                alt={c.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                style={c.imagePosition ? { objectPosition: c.imagePosition } : undefined}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,5,0) 40%, rgba(8,6,5,0.32) 68%, rgba(8,6,5,0.78) 100%)' }} />
              <div className="absolute inset-x-3 bottom-3 rounded-[20px] px-4 py-3.5 backdrop-blur-xl flex items-center gap-3.5 transition-colors duration-300"
                   style={{ background: 'rgba(28,22,16,0.55)', border: '1px solid rgba(217,180,92,0.22)' }}>
                <span className="hub-chip grid place-items-center shrink-0 rounded-full" aria-hidden
                      style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #e6c778, #c5a059)', color: '#171009', fontSize: '1.05rem', boxShadow: '0 6px 18px -6px rgba(217,180,92,0.6)' }}>
                  ›
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="truncate" style={{ fontFamily: "'Prata', serif", color: CREAM, fontSize: 'clamp(0.98rem, 1.3vw, 1.12rem)', lineHeight: 1.2 }}>
                    {c.name}
                  </span>
                  <span className="font-cinzel uppercase mt-1" style={{ fontSize: '9px', letterSpacing: '0.3em', color: GOLD }}>
                    {c.taglineFr}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </nav>

        {/* Rotating seal — Arkkhe's circular-text signature, in the house voice */}
        <div className="hidden md:flex absolute bottom-6 left-1/2 -translate-x-1/2 items-center justify-center pointer-events-none" aria-hidden>
          <svg className="hub-seal" width="104" height="104" viewBox="0 0 104 104">
            <defs>
              <path id="sealCircle" d="M 52,52 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" />
            </defs>
            <text style={{ fontFamily: "'Cinzel', serif", fontSize: '8.6px', letterSpacing: '0.32em', fill: 'rgba(217,180,92,0.75)' }}>
              <textPath href="#sealCircle">FAITES VOTRE SÉLECTION · LES INCONNUS ·</textPath>
            </text>
          </svg>
          <span className="absolute" style={{ color: GOLD, fontSize: '1.1rem', transform: 'rotate(90deg)' }}>›</span>
        </div>
      </div>

      <style>{`
        .hub-kenburns { animation: hubKen 30s ease-in-out infinite alternate; transform-origin: 50% 40%; }
        @keyframes hubKen { from { transform: scale(1.04); } to { transform: scale(1.13) translate3d(0, -1.5%, 0); } }
        .hub-glow { animation: hubGlow 36s ease-in-out infinite; }
        @keyframes hubGlow { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(4%,5%,0) scale(1.1); } }
        .hub-rise { animation: hubRise 0.9s cubic-bezier(0.16,1,0.3,1) both; }
        .hub-rise-late { animation: hubRise 0.9s cubic-bezier(0.16,1,0.3,1) 0.15s both; }
        @keyframes hubRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        .hub-card { box-shadow: 0 30px 70px -30px rgba(0,0,0,0.8); transition: transform .5s cubic-bezier(0.16,1,0.3,1), border-color .4s, box-shadow .5s; }
        .hub-card:hover { transform: translateY(-6px); border-color: rgba(217,180,92,0.55) !important; box-shadow: 0 40px 90px -30px rgba(0,0,0,0.9), 0 0 40px -6px rgba(217,180,92,0.25); }
        @media (prefers-reduced-motion: reduce) {
          .hub-kenburns, .hub-glow { animation: none !important; }
          .hub-rise, .hub-rise-late { animation: none !important; opacity: 1 !important; transform: none !important; }
          .hub-card, .hub-card img { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
