import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

// ── Le Dôme des Inconnus · La Coop ──────────────────────────────────────────
// The community / wwoofing surface of the four-property family (hub · Salon ·
// Auberge · Dôme). Design language and motion recipes copied from the house
// RetreatShared primitives: warm near-black, soft amber glows, glassmorphism,
// rounded corners, Ken Burns hero, whileInView reveals.
// HARD RULES: no italics anywhere (accent = gold colour + weight only), no
// em dashes in copy, transform-only motion, prefers-reduced-motion guarded.

const GOLD = '#d9b45c';
const GOLD_SOFT = '#c5a059';
const CREAM = '#f6ead0';
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// Sparse, slow-drifting embers for the hero. Transform + opacity only, cheap.
const EMBERS = [
  { left: '13%', bottom: '26%', delay: '0s',  dur: '17s' },
  { left: '29%', bottom: '34%', delay: '5s',  dur: '21s' },
  { left: '47%', bottom: '30%', delay: '9s',  dur: '19s' },
  { left: '66%', bottom: '38%', delay: '3s',  dur: '23s' },
  { left: '81%', bottom: '28%', delay: '7s',  dur: '18s' },
  { left: '91%', bottom: '36%', delay: '11s', dur: '22s' },
];

// Self-contained SVG grain (no external asset), very light, static, cheap.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const GLASS: React.CSSProperties = {
  background: 'rgba(22,17,12,0.42)',
  border: '1px solid rgba(217,180,92,0.18)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  boxShadow: '0 24px 70px -28px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,240,205,0.06)',
};

/** Frosted-glass panel. */
const Glass: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  className = '',
  style,
  children,
}) => (
  <div className={`rounded-[22px] ${className}`} style={{ ...GLASS, ...style }}>
    {children}
  </div>
);

/** Warm near-black atmosphere with soft blurred amber glows for depth. */
const Atmosphere: React.FC = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }} aria-hidden>
    <div
      className="absolute inset-0"
      style={{ background: 'radial-gradient(135% 95% at 50% -10%, #17120d 0%, #0b0908 55%, #060403 100%)' }}
    />
    <div
      className="absolute dome-glow"
      style={{
        top: '-12%',
        left: '16%',
        width: '55vw',
        height: '55vw',
        background: 'radial-gradient(circle, rgba(217,180,92,0.16), transparent 66%)',
        filter: 'blur(90px)',
      }}
    />
    <div
      className="absolute dome-glow2"
      style={{
        bottom: '-16%',
        right: '8%',
        width: '48vw',
        height: '48vw',
        background: 'radial-gradient(circle, rgba(160,120,70,0.13), transparent 68%)',
        filter: 'blur(100px)',
      }}
    />
    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: GRAIN }} />
  </div>
);

/** Soft glass pill (kicker / overline). */
const Pill: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = '',
  style,
}) => (
  <span
    className={`dome-pill inline-block font-cinzel uppercase rounded-full ${className}`}
    style={{ fontSize: '11px', letterSpacing: '0.32em', ...style }}
  >
    {children}
  </span>
);

/** Rounded gold pill CTA with a soft glow. */
const GoldLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a
    href={href}
    rel="noopener"
    className="dome-cta inline-block font-cinzel text-[12px] uppercase tracking-[0.28em] px-9 py-4 rounded-full"
  >
    {children}
  </a>
);

/** Opacity + gentle lift reveal, guarded for reduced motion. */
const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}> = ({ children, className, delay = 0, y = 26 }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
};

/** Fixed top-left way back to the hub. Swap href to https://lesinconnus.com/ once DNS connects. */
const BackToHub: React.FC = () => (
  <a
    href="https://inconnus-hub.web.app/"
    rel="noopener"
    className="dome-pill fixed top-5 left-5 md:top-7 md:left-7 z-50 inline-flex items-center gap-2 font-cinzel uppercase rounded-full px-5 py-2.5"
    style={{ fontSize: '11px', letterSpacing: '0.28em', color: GOLD }}
  >
    ← Les Inconnus
  </a>
);

/** Section overline: a gold rule + tracked Cinzel label. */
const Overline: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-4 mb-10 md:mb-14">
    <span className="h-px w-12" style={{ background: GOLD_SOFT }} aria-hidden />
    <span
      className="font-cinzel uppercase"
      style={{ fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(255,250,240,0.55)' }}
    >
      {label}
    </span>
    <span className="h-px flex-1" style={{ background: 'linear-gradient(90deg, rgba(217,180,92,0.22), transparent)' }} />
  </div>
);

// ── 1 · HERO ────────────────────────────────────────────────────────────────
const Hero: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '14%']);

  return (
    <section ref={ref} className="px-3 md:px-6 pt-6 md:pt-8">
      <div
        className="relative rounded-[28px] overflow-hidden min-h-[86vh] flex items-end"
        style={{ boxShadow: '0 50px 120px -40px rgba(0,0,0,0.85)' }}
      >
        <motion.div className="absolute inset-0 will-change-transform" style={reduce ? undefined : { y }} aria-hidden>
          <img src="/media/yourte-coucher-soleil.jpg" alt="" className="dome-kenburns w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(8,6,5,0.24) 0%, rgba(8,6,5,0.5) 48%, rgba(8,6,5,0.94) 92%)' }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(85% 65% at 50% 28%, transparent 42%, rgba(8,6,5,0.42) 100%)' }}
          />
          {!reduce && (
            <div className="dome-embers" aria-hidden>
              {EMBERS.map((e, i) => (
                <span
                  key={i}
                  className="dome-ember"
                  style={{ left: e.left, bottom: e.bottom, animationDelay: e.delay, animationDuration: e.dur }}
                />
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.95, ease: EASE }}
          className="relative px-6 md:px-14 lg:px-20 pb-16 md:pb-20 w-full"
        >
          <Pill className="mb-7 px-5 py-2" style={{ color: GOLD }}>
            Au coeur de la Petite-Nation
          </Pill>
          <h1
            className="font-prata"
            style={{
              color: CREAM,
              fontSize: 'clamp(2.9rem, 7.2vw, 6.4rem)',
              lineHeight: 0.96,
              letterSpacing: '-0.02em',
              textShadow: '0 4px 40px rgba(0,0,0,0.6)',
            }}
          >
            Le Dôme <span style={{ color: GOLD }}>des Inconnus</span>
          </h1>
          <p
            className="font-cormorant mt-7"
            style={{ color: 'rgba(255,250,240,0.88)', fontSize: 'clamp(1.2rem, 2vw, 1.7rem)', lineHeight: 1.55, maxWidth: '52ch', fontWeight: 500 }}
          >
            Il y a, au bout des chemins de la Petite-Nation, un domaine où la terre se cultive à plusieurs mains et où l'on peut poser ses racines le temps d'une saison. On y sème et l'on y récolte, on y partage ce que l'on crée, et quand le soir descend, on allume des feux autour desquels naissent les fêtes. La porte vous est grande ouverte.
          </p>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 dome-scroll" aria-hidden>
          <span className="block h-9 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(217,180,92,0.8))' }} />
        </div>
      </div>
    </section>
  );
};

// ── 2 · LA VIE AU DOMAINE ─────────────────────────────────────────────────────
const LIFE_CARDS = [
  {
    img: '/media/jardins-auberge.jpg',
    kicker: 'La terre',
    title: 'Cultiver le domaine',
    body: "Mettre les mains dans la terre, voir lever un potager, veiller un verger et le mener jusqu'à l'automne. Ici la terre se travaille à plusieurs, et saison après saison elle rend bien plus que ce qu'on lui confie.",
  },
  {
    img: '/media/salle-a-manger.jpg',
    kicker: "L'ouvrage",
    title: 'Créer, offrir, vendre',
    body: "Ce que vos mains façonnent trouve sa place et trouve preneur. Récoltes, objets, oeuvres, chacun peut faire vivre le fruit de son travail et le déposer entre les mains de ceux qui sauront l'aimer.",
  },
  {
    img: '/media/handpan.jpg',
    kicker: 'Les veillées',
    title: 'Se rassembler, célébrer',
    body: "Des feux le soir, de la musique qui monte, des veillées et des fêtes que l'on imagine ensemble. Chacun peut convier les autres, ouvrir un atelier ou lancer une célébration, et offrir au domaine une soirée de plus à raconter.",
  },
];

const LifeSection: React.FC = () => (
  <section className="px-5 md:px-10 lg:px-16 pt-28 md:pt-36 max-w-6xl mx-auto w-full">
    <Overline label="La vie au domaine" />
    <Reveal>
      <h2
        className="font-prata mb-12 md:mb-16"
        style={{ color: CREAM, fontSize: 'clamp(2rem, 4.4vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.015em', maxWidth: '18ch' }}
      >
        Ce que l'on vient y vivre
      </h2>
    </Reveal>

    <div className="grid gap-7 md:grid-cols-3">
      {LIFE_CARDS.map((card, i) => (
        <Reveal key={card.kicker} delay={i * 0.08}>
          <Glass className="h-full overflow-hidden flex flex-col">
            <div className="dome-imgwrap relative overflow-hidden" style={{ aspectRatio: '4 / 3' }}>
              <img src={card.img} alt={card.title} loading="lazy" className="dome-img w-full h-full object-cover" />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(11,9,8,0.5) 100%)' }}
                aria-hidden
              />
            </div>
            <div className="p-7 md:p-8 flex flex-col flex-1">
              <span className="font-cinzel uppercase block mb-3" style={{ fontSize: '10px', letterSpacing: '0.3em', color: GOLD }}>
                {card.kicker}
              </span>
              <h3 className="font-prata mb-4" style={{ color: CREAM, fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)', lineHeight: 1.12 }}>
                {card.title}
              </h3>
              <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.74)', fontSize: '1.15rem', lineHeight: 1.6, fontWeight: 500 }}>
                {card.body}
              </p>
            </div>
          </Glass>
        </Reveal>
      ))}
    </div>
  </section>
);

// ── 3 · VENIR AU DÔME ───────────────────────────────────────────────────────
// A single warm invitation. The way in stays backstage; the CTA leads to the
// existing intake on the inn site. Swap to aubergedesinconnus.com once DNS connects.
const JoinSection: React.FC = () => (
  <section className="px-5 md:px-10 lg:px-16 pt-28 md:pt-36 max-w-4xl mx-auto w-full">
    <Overline label="Venir au Dôme" />
    <Reveal>
      <Glass className="p-9 md:p-14 flex flex-col items-start" style={{ borderRadius: 26 }}>
        <h3
          className="font-prata mb-6"
          style={{ color: CREAM, fontSize: 'clamp(1.9rem, 3.4vw, 3rem)', lineHeight: 1.06, letterSpacing: '-0.015em', maxWidth: '20ch' }}
        >
          Y prendre place, le temps d'une saison
        </h3>
        <p
          className="font-cormorant mb-9"
          style={{ color: 'rgba(255,250,240,0.8)', fontSize: 'clamp(1.2rem, 1.7vw, 1.4rem)', lineHeight: 1.62, fontWeight: 500, maxWidth: '58ch' }}
        >
          Le Dôme accueille celles et ceux qui ont envie de s'arrêter un moment, pour une saison ou pour l'été entier, et de prendre part à la vie d'un lieu bien vivant. Si le coeur vous en dit, écrivez-nous et venez voir, et nous trouverons ensemble la place qui vous ressemble.
        </p>
        <GoldLink href="https://inconnus-auberge.web.app/wwoofing">Venir vivre une saison</GoldLink>
      </Glass>
    </Reveal>
  </section>
);

// ── 4 · LA FAMILLE DES INCONNUS ─────────────────────────────────────────────
// Staging URLs for the sibling properties. Swap to the real domains
// (aubergedesinconnus.com, lesalondesinconnus.com, lesinconnus.com) once DNS connects.
const FAMILY = [
  { label: "L'Auberge", href: 'https://inconnus-auberge.web.app/' },
  { label: 'Le Salon', href: 'https://inconnus-salon.web.app/' },
  { label: 'Le Hub', href: 'https://inconnus-hub.web.app/' },
];

const FooterBand: React.FC = () => (
  <footer className="px-6 md:px-12 mt-28 md:mt-36 mb-10">
    <div className="max-w-6xl mx-auto pt-12" style={{ borderTop: '1px solid rgba(217,180,92,0.12)' }}>
      <span className="font-cinzel uppercase block mb-6" style={{ fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(255,250,240,0.45)' }}>
        La famille des Inconnus
      </span>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-10">
        {FAMILY.map((f) => (
          <a
            key={f.label}
            href={f.href}
            rel="noopener"
            className="dome-link font-cormorant"
            style={{ color: 'rgba(255,250,240,0.72)', fontSize: '1.2rem', fontWeight: 500 }}
          >
            {f.label}
          </a>
        ))}
      </div>
      <span className="font-cinzel uppercase block" style={{ fontSize: '10px', letterSpacing: '0.28em', color: 'rgba(255,250,240,0.3)' }}>
        © Le Dôme des Inconnus, à Namur au Québec
      </span>
    </div>
  </footer>
);

export default function App() {
  return (
    <div className="relative min-h-screen text-[#f6ead0]">
      <Atmosphere />
      <BackToHub />
      <main>
        <Hero />
        <LifeSection />
        <JoinSection />
      </main>
      <FooterBand />
      <DomeStyle />
    </div>
  );
}

const DomeStyle: React.FC = () => (
  <style>{`
    .dome-kenburns { animation: domeKen 28s ease-in-out infinite alternate; transform-origin: 55% 45%; }
    @keyframes domeKen { from { transform: scale(1.05); } to { transform: scale(1.15) translate3d(-1.5%, -1%, 0); } }
    .dome-glow { animation: domeGlow 34s ease-in-out infinite; }
    .dome-glow2 { animation: domeGlow 40s ease-in-out infinite reverse; }
    @keyframes domeGlow { 0%,100% { transform: translate3d(0,0,0) scale(1); opacity:.9; } 50% { transform: translate3d(3%,4%,0) scale(1.12); opacity:1; } }
    .dome-scroll { animation: domeScroll 2.6s ease-in-out infinite; }
    @keyframes domeScroll { 0%,100% { opacity:.3; transform: translate(-50%,0); } 50% { opacity:.9; transform: translate(-50%,6px); } }
    .dome-embers { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
    .dome-ember { position:absolute; width:5px; height:5px; border-radius:9999px;
      background: radial-gradient(circle, rgba(244,208,132,0.95), rgba(217,180,92,0) 70%);
      opacity:0; will-change: transform, opacity;
      animation-name: domeEmber; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
    @keyframes domeEmber {
      0%   { transform: translate3d(0,0,0) scale(0.6); opacity:0; }
      12%  { opacity:0.85; }
      55%  { opacity:0.55; }
      100% { transform: translate3d(20px,-190px,0) scale(1.2); opacity:0; }
    }
    .dome-img { transition: transform 1.2s cubic-bezier(0.16,1,0.3,1); }
    .dome-imgwrap:hover .dome-img { transform: scale(1.05); }
    .dome-pill { background: rgba(20,15,11,0.5); border: 1px solid rgba(217,180,92,0.22); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
    .dome-cta { position: relative; color:#120d08; background: linear-gradient(135deg, #e6c778 0%, #c5a059 100%); box-shadow: 0 14px 34px -10px rgba(217,180,92,0.55); transition: transform .4s cubic-bezier(0.16,1,0.3,1), box-shadow .4s; }
    .dome-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 44px -10px rgba(217,180,92,0.7); }
    .dome-link { position: relative; transition: color .3s; }
    .dome-link:hover { color:#f6ead0; }
    .dome-link::after { content:''; position:absolute; left:0; bottom:-4px; width:100%; height:1px; background: rgba(217,180,92,0.5); transform: scaleX(0); transform-origin: left; transition: transform .35s cubic-bezier(0.16,1,0.3,1); }
    .dome-link:hover::after { transform: scaleX(1); }
    @media (prefers-reduced-motion: reduce) {
      .dome-kenburns { animation: none !important; transform: scale(1.04) !important; }
      .dome-glow, .dome-glow2, .dome-scroll { animation: none !important; }
      .dome-img, .dome-cta { transition: none !important; }
    }
  `}</style>
);
