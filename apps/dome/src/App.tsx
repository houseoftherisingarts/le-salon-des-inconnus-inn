import React, { useRef, lazy, Suspense } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { CHARTE, VERSION_CHARTE } from './charte';

// ── Le Dôme des Inconnus ─────────────────────────────────────────────────────
// The community surface of the four-property family (hub · Salon · Auberge ·
// Dôme). Warm hero + the full coop substance: les voies, le cercle, la charte,
// la candidature (real Firebase form). Warm near-black, soft amber glows,
// glassmorphism, rounded corners, drifting embers, whileInView reveals.
// HARD RULES: no italics (accent = gold + weight), no em dashes, transform-only
// motion, prefers-reduced-motion guarded.

// The application form pulls Firebase; keep it out of the initial bundle.
const Apply = lazy(() => import('./Apply'));

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

const SectionTitle: React.FC<{ children: React.ReactNode; max?: string }> = ({ children, max = '18ch' }) => (
  <h2
    className="font-prata"
    style={{ color: CREAM, fontSize: 'clamp(2rem, 4.4vw, 3.4rem)', lineHeight: 1.05, letterSpacing: '-0.015em', maxWidth: max }}
  >
    {children}
  </h2>
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
            Il y a, au bout des chemins de la Petite-Nation, un domaine où la terre se cultive à plusieurs mains et où chacun peut poser ses racines le temps d'une saison. Nous y semons, nous y récoltons, nous partageons ce que nous créons, et quand le soir descend, nous allumons des feux autour desquels naissent les fêtes. La porte vous est grande ouverte.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href="#candidature" className="dome-cta inline-block font-cinzel text-[12px] uppercase tracking-[0.28em] px-9 py-4 rounded-full">
              Déposer ma candidature
            </a>
            <a href="#charte" className="dome-ghost inline-block font-cinzel text-[12px] uppercase tracking-[0.28em] px-9 py-4 rounded-full">
              Lire la charte
            </a>
          </div>
        </motion.div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 dome-scroll" aria-hidden>
          <span className="block h-9 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(217,180,92,0.8))' }} />
        </div>
      </div>
    </section>
  );
};

// ── 2 · LES VOIES ─────────────────────────────────────────────────────────────
const VOIES: { titre: string; body: string; icon: React.ReactNode }[] = [
  {
    titre: 'Cultiver la terre',
    body: "Les jardins et les terres du domaine attendent des mains. Vous semez, vous entretenez, vous récoltez, et la saison rend ce que vous lui avez confié.",
    icon: <path d="M12 21V11m0 0c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6Zm0-2c0-3.5 2.5-6 6-6 0 3.5-2.5 6-6 6Z" />,
  },
  {
    titre: "Vendre ce que l'on crée",
    body: "Un comptoir pour les récoltes, les savons et l'artisanat, une aile pour les oeuvres. Ce qui sort de vos mains trouve preneur, et vous revient en entier.",
    icon: <path d="M4 9l1.5-4h13L20 9M4 9h16M4 9v10a1 1 0 001 1h14a1 1 0 001-1V9M9 13h6" />,
  },
  {
    titre: 'Tenir le café',
    body: "Des heures derrière le comptoir du café, un revenu, un rythme, et le pouls du lieu qui passe entre vos mains.",
    icon: <path d="M4 8h12v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8Zm12 1h2.5a2 2 0 010 4H16M7 4.5c.6-.8.6-1.4 0-2m4 2c.6-.8.6-1.4 0-2" />,
  },
  {
    titre: 'Offrir des soins',
    body: "Des salles prêtes à recevoir votre pratique. Vous apportez votre art du soin, le domaine apporte le calme et le silence.",
    icon: <path d="M12 20s-7-4.5-7-9.5A3.8 3.8 0 0112 7.6 3.8 3.8 0 0119 10.5C19 15.5 12 20 12 20Z" />,
  },
];

const VoiesSection: React.FC = () => (
  <section id="voies" className="px-5 md:px-10 lg:px-16 pt-28 md:pt-36 max-w-6xl mx-auto w-full">
    <Overline label="Les voies" />
    <Reveal>
      <SectionTitle max="20ch">Quatre façons d'habiter le domaine</SectionTitle>
    </Reveal>
    <Reveal>
      <p
        className="font-cormorant mt-5 mb-12 md:mb-16"
        style={{ color: 'rgba(255,250,240,0.72)', fontSize: 'clamp(1.15rem, 1.6vw, 1.35rem)', lineHeight: 1.6, fontWeight: 500, maxWidth: '54ch' }}
      >
        On choisit une voie ou plusieurs, à son rythme, selon ce que les mains ont envie de faire.
      </p>
    </Reveal>

    <div className="grid gap-6 sm:grid-cols-2">
      {VOIES.map((v, i) => (
        <Reveal key={v.titre} delay={(i % 2) * 0.1}>
          <Glass className="h-full p-8 md:p-9">
            <span
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-6"
              style={{ border: '1px solid rgba(217,180,92,0.4)', background: 'rgba(217,180,92,0.05)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                {v.icon}
              </svg>
            </span>
            <h3 className="font-prata mb-3" style={{ color: CREAM, fontSize: 'clamp(1.35rem, 2.2vw, 1.7rem)', lineHeight: 1.12 }}>
              {v.titre}
            </h3>
            <p className="font-cormorant" style={{ color: 'rgba(255,250,240,0.74)', fontSize: '1.15rem', lineHeight: 1.6, fontWeight: 500 }}>
              {v.body}
            </p>
          </Glass>
        </Reveal>
      ))}
    </div>
  </section>
);

// ── 3 · LE CERCLE ─────────────────────────────────────────────────────────────
const CercleSection: React.FC = () => (
  <section className="px-5 md:px-10 lg:px-16 pt-28 md:pt-36 max-w-6xl mx-auto w-full">
    <Overline label="Le cercle" />
    <div className="grid md:grid-cols-2 gap-10 md:gap-14 items-center">
      <Reveal>
        <SectionTitle max="16ch">Dix sièges autour d'une même table</SectionTitle>
        <p
          className="font-cormorant mt-6"
          style={{ color: 'rgba(255,250,240,0.78)', fontSize: 'clamp(1.2rem, 1.7vw, 1.4rem)', lineHeight: 1.62, fontWeight: 500, maxWidth: '48ch' }}
        >
          Le cercle ne compte que dix places, pas une de plus, pour que chaque voix pèse vraiment. Les décisions se prennent ensemble, et celles et ceux qui le souhaitent veillent sur la maison commune au sein du conseil.
        </p>
      </Reveal>
      <Reveal delay={0.12}>
        <Glass className="p-10 flex flex-col items-center">
          <svg viewBox="0 0 300 160" className="w-full max-w-[320px]" fill="none" aria-hidden>
            <path d="M20 150 A130 130 0 0 1 280 150" stroke={GOLD_SOFT} strokeOpacity="0.35" strokeWidth="1" />
            {Array.from({ length: 10 }).map((_, i) => {
              const a = Math.PI - (Math.PI * i) / 9;
              const x = 150 + 130 * Math.cos(a);
              const y = 150 - 130 * Math.sin(a);
              return (
                <circle key={i} cx={x} cy={y} r="6" fill={GOLD_SOFT} fillOpacity={0.25 + (i % 3) * 0.2} stroke={CREAM} strokeOpacity="0.7" strokeWidth="1" />
              );
            })}
          </svg>
          <span className="font-cinzel uppercase mt-6" style={{ fontSize: '10px', letterSpacing: '0.4em', color: 'rgba(255,250,240,0.5)' }}>
            Les dix sièges du cercle
          </span>
        </Glass>
      </Reveal>
    </div>
  </section>
);

// ── 4 · LA CHARTE ─────────────────────────────────────────────────────────────
const CharteSection: React.FC = () => (
  <section id="charte" className="px-5 md:px-10 lg:px-16 pt-28 md:pt-36 max-w-6xl mx-auto w-full">
    <Overline label="La charte" />
    <Reveal>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 md:mb-16">
        <SectionTitle max="16ch">Sept articles, rien de caché</SectionTitle>
        <span className="font-cinzel uppercase" style={{ fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,250,240,0.4)' }}>
          {VERSION_CHARTE}
        </span>
      </div>
    </Reveal>

    <div className="grid md:grid-cols-2 gap-x-14 gap-y-1">
      {CHARTE.map((a, i) => (
        <Reveal key={a.numero} delay={(i % 2) * 0.06}>
          <details className="dome-article py-5" style={{ borderBottom: '1px solid rgba(255,250,240,0.1)' }}>
            <summary className="flex items-baseline gap-4 cursor-pointer list-none">
              <span className="font-cinzel" style={{ color: GOLD, fontSize: '0.9rem' }}>{a.numero}</span>
              <span className="font-cinzel uppercase flex-1" style={{ fontSize: '12px', letterSpacing: '0.22em', color: 'rgba(255,250,240,0.85)' }}>
                {a.titre}
              </span>
              <span className="dome-plus font-cormorant" style={{ color: GOLD, fontSize: '1.4rem', lineHeight: 1 }}>+</span>
            </summary>
            <p className="font-cormorant mt-4 pl-9" style={{ color: 'rgba(255,250,240,0.72)', fontSize: '1.12rem', lineHeight: 1.6, fontWeight: 500 }}>
              {a.texte}
            </p>
          </details>
        </Reveal>
      ))}
    </div>
  </section>
);

// ── 5 · LA CANDIDATURE ────────────────────────────────────────────────────────
const CandidatureSection: React.FC = () => {
  const etapes = [
    { n: '01', t: 'Ton profil', d: 'Avec Google ou votre courriel.' },
    { n: '02', t: 'La charte', d: "Toute la documentation, avant de vous engager." },
    { n: '03', t: 'Ta candidature', d: 'Vos voies, vos mots, votre place au conseil si vous la voulez.' },
  ];
  return (
    <section id="candidature" className="px-5 md:px-10 lg:px-16 pt-28 md:pt-36 max-w-6xl mx-auto w-full">
      <Overline label="La candidature" />
      <div className="grid lg:grid-cols-[1fr,1.15fr] gap-12 lg:gap-16 items-start">
        <Reveal>
          <SectionTitle max="18ch">Nous ne retenons que dix personnes. Dites-nous pourquoi ce sera vous</SectionTitle>
          <p
            className="font-cormorant mt-6"
            style={{ color: 'rgba(255,250,240,0.76)', fontSize: 'clamp(1.15rem, 1.6vw, 1.35rem)', lineHeight: 1.6, fontWeight: 500, maxWidth: '44ch' }}
          >
            Trois étapes, quelques minutes. Chaque candidature est lue par le cercle.
          </p>
          <ol className="mt-10 space-y-6">
            {etapes.map((e) => (
              <li key={e.n} className="flex items-start gap-5">
                <span className="font-cinzel pt-1" style={{ color: GOLD, fontSize: '0.9rem' }}>{e.n}</span>
                <div>
                  <p className="font-cinzel uppercase" style={{ fontSize: '12px', letterSpacing: '0.22em', color: 'rgba(255,250,240,0.85)' }}>{e.t}</p>
                  <p className="font-cormorant mt-1" style={{ color: 'rgba(255,250,240,0.6)', fontSize: '1.1rem', fontWeight: 500 }}>{e.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
        <Reveal delay={0.12}>
          <Suspense
            fallback={
              <Glass className="p-10 text-center font-cinzel" style={{ fontSize: '11px', letterSpacing: '0.4em', color: 'rgba(255,250,240,0.5)' }}>
                UN INSTANT
              </Glass>
            }
          >
            <Apply />
          </Suspense>
        </Reveal>
      </div>
    </section>
  );
};

// ── 6 · LA FAMILLE DES INCONNUS ─────────────────────────────────────────────
// Staging URLs for the sibling properties. Swap to the real domains once DNS connects.
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
        <VoiesSection />
        <CercleSection />
        <CharteSection />
        <CandidatureSection />
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
    .dome-pill { background: rgba(20,15,11,0.5); border: 1px solid rgba(217,180,92,0.22); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
    .dome-cta { color:#120d08; background: linear-gradient(135deg, #e6c778 0%, #c5a059 100%); box-shadow: 0 14px 34px -10px rgba(217,180,92,0.55); transition: transform .4s cubic-bezier(0.16,1,0.3,1), box-shadow .4s; }
    .dome-cta:hover { transform: translateY(-2px); box-shadow: 0 20px 44px -10px rgba(217,180,92,0.7); }
    .dome-ghost { color: rgba(255,250,240,0.82); border: 1px solid rgba(217,180,92,0.35); transition: border-color .35s, color .35s, background .35s; }
    .dome-ghost:hover { color:#f6ead0; border-color: rgba(217,180,92,0.7); background: rgba(217,180,92,0.08); }
    .dome-article summary::-webkit-details-marker { display:none; }
    .dome-plus { transition: transform .3s cubic-bezier(0.16,1,0.3,1); }
    .dome-article[open] .dome-plus { transform: rotate(45deg); }
    .dome-link { position: relative; transition: color .3s; }
    .dome-link:hover { color:#f6ead0; }
    .dome-link::after { content:''; position:absolute; left:0; bottom:-4px; width:100%; height:1px; background: rgba(217,180,92,0.5); transform: scaleX(0); transform-origin: left; transition: transform .35s cubic-bezier(0.16,1,0.3,1); }
    .dome-link:hover::after { transform: scaleX(1); }
    @media (prefers-reduced-motion: reduce) {
      .dome-kenburns { animation: none !important; transform: scale(1.04) !important; }
      .dome-glow, .dome-glow2, .dome-scroll { animation: none !important; }
      .dome-ember { animation: none !important; opacity: 0 !important; }
      .dome-cta, .dome-ghost, .dome-plus { transition: none !important; }
    }
  `}</style>
);
