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
    // Interim: swap back to https://aubergedesinconnus.com/ once DNS is connected.
    url: 'https://inconnus-auberge.web.app/',
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
    imagePosition: '50% 30%',
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
      className={`relative min-h-screen w-full overflow-x-hidden transition-opacity duration-500 ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#0b0908' }}
    >
      {/* Cinematic background — golden-hour drone shot of the domain */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
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

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-5 md:px-10 py-16 gap-9 md:gap-12">
        <header className="text-center hub-rise">
          <h1
            className="mb-4"
            style={{ fontFamily: "'Prata', serif", color: CREAM, fontSize: 'clamp(2.1rem, 5vw, 4rem)', lineHeight: 1.05, textShadow: '0 4px 40px rgba(0,0,0,0.65)' }}
          >
            Bienvenue chez les Inconnus
          </h1>
          <p className="font-cinzel uppercase" style={{ fontSize: 'clamp(11px, 1.2vw, 13px)', letterSpacing: '0.45em', color: GOLD }}>
            Faites votre sélection
          </p>
        </header>

        <nav className="hub-rise-late grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              onClick={() => go(c.url)}
              onMouseEnter={() => shimmer(0.5)}
              className="hub-card group relative overflow-hidden rounded-[22px] text-left"
              style={{ aspectRatio: '3 / 3.6', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              <img
                src={c.image}
                alt={c.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                style={c.imagePosition ? { objectPosition: c.imagePosition } : undefined}
              />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,5,0.05) 30%, rgba(8,6,5,0.4) 62%, rgba(8,6,5,0.92) 100%)' }} />
              <div className="absolute inset-x-3 bottom-3 rounded-[16px] px-5 py-4 backdrop-blur-md transition-colors duration-300"
                   style={{ background: 'rgba(20,15,11,0.5)', border: '1px solid rgba(217,180,92,0.2)' }}>
                <span className="block" style={{ fontFamily: "'Prata', serif", color: CREAM, fontSize: 'clamp(1.02rem, 1.4vw, 1.2rem)', lineHeight: 1.25 }}>
                  {c.name}
                </span>
                <span className="font-cinzel uppercase block mt-1.5" style={{ fontSize: '9.5px', letterSpacing: '0.32em', color: GOLD }}>
                  {c.taglineFr}
                </span>
              </div>
            </button>
          ))}
        </nav>
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
