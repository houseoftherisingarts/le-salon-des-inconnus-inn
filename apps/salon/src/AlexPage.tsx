import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ALEX,
  PRATIQUES,
  REALISATIONS,
  FILMOGRAPHIE,
  FORMATION,
  PRIX,
  CHANTIERS,
  ANNEES,
  CTA,
  type Annee,
} from './alexContent';

/**
 * Page d'artiste d'Alex T. St-Laurent, dans la section art du Salon.
 *
 * Charte du Salon, mesuree sur l'accueil (InnPage) : noir CHAUD #0a0808,
 * or antique #c5a059, creme #f3e5ab, Prata pour le display, Cinzel espace
 * pour les etiquettes, Lato 300 pour le corps. Brume qui derive, grain,
 * braises : la meme atmosphere que la maison. Jamais d'italique, jamais le
 * jaune vif #d4af37 en dominante, jamais de noir plat.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const OR = '#c5a059';
const CREME = '#f3e5ab';
const NOIR = '#0a0808';

/** Brume + grain + lueur : l'atmosphere de l'accueil, montee une seule fois. */
function Atmosphere() {
  const reduced = useReducedMotion();
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {/* Lueurs chaudes : le feu hors champ */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 45% at 72% 18%, rgba(197,160,89,0.16), transparent 70%), radial-gradient(55% 40% at 12% 82%, rgba(140,74,32,0.14), transparent 72%)',
          }}
        />
        {!reduced && (
          <>
            <div
              className="alx-fog absolute inset-x-0 bottom-0 h-[70vh] bg-contain bg-repeat-x opacity-[0.14]"
              style={{
                backgroundImage:
                  "url('https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog1.png')",
              }}
            />
            <div
              className="alx-fog-rev absolute inset-x-0 bottom-0 h-[70vh] bg-contain bg-repeat-x opacity-[0.1]"
              style={{
                backgroundImage:
                  "url('https://raw.githubusercontent.com/SochavaAG/example-assets/master/fog2.png')",
              }}
            />
          </>
        )}
        {/* Grain : la texture de la maison */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'url("https://www.transparenttextures.com/patterns/stardust.png")',
          }}
        />
      </div>
      <style>{`
        @keyframes alxFog { from { background-position: 0 bottom; } to { background-position: 1000px bottom; } }
        .alx-fog { animation: alxFog 70s linear infinite; }
        .alx-fog-rev { animation: alxFog 52s linear infinite reverse; animation-delay: -6s; }
        @keyframes alxEmber {
          0%   { transform: translate3d(0,0,0) scale(0.5); opacity: 0; }
          14%  { opacity: 0.75; }
          86%  { opacity: 0.6; }
          100% { transform: translate3d(var(--dx, 16px), -220px, 0) scale(1); opacity: 0; }
        }
        .alx-ember { animation: alxEmber var(--dur, 11s) linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .alx-fog, .alx-fog-rev, .alx-ember { animation: none !important; }
        }
      `}</style>
    </>
  );
}

/** Braises : quatorze points d'or qui montent, transform seulement. */
function Braises() {
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="alx-ember absolute block rounded-full"
          style={{
            left: `${(i * 7.3 + 5) % 96}%`,
            bottom: `${(i * 11) % 40}%`,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            background: i % 2 ? OR : CREME,
            boxShadow: `0 0 8px ${OR}`,
            ['--dx' as string]: `${(i % 5) * 9 - 18}px`,
            ['--dur' as string]: `${9 + (i % 6) * 2}s`,
            animationDelay: `${-i * 1.7}s`,
          }}
        />
      ))}
    </div>
  );
}

/** Filet dore + losange : le separateur de l'accueil. */
function Filet() {
  return (
    <div className="my-16 flex items-center justify-center gap-4 opacity-70 md:my-24" aria-hidden>
      <span className="h-px w-16 md:w-32" style={{ background: `linear-gradient(to right, transparent, ${OR})` }} />
      <span className="h-1.5 w-1.5 rotate-45" style={{ background: OR }} />
      <span className="h-px w-16 md:w-32" style={{ background: `linear-gradient(to left, transparent, ${OR})` }} />
    </div>
  );
}

/** Etiquette Cinzel en petites capitales espacees, l'eyebrow de la maison. */
function Etiquette({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-cinzel text-[0.7rem] uppercase tracking-[0.34em]"
      style={{ color: OR }}
    >
      {children}
    </p>
  );
}

/** Apparition au scroll, lente et posee. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 1, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Titre mot a mot : l'accent est porte par l'or, jamais par l'italique. */
function TitreAnime({ text, accentFrom }: { text: string; accentFrom: number }) {
  const words = text.split(' ');
  return (
    <h1
      className="font-prata max-w-[15ch] text-[clamp(2.3rem,5.2vw,4.6rem)] leading-[1.08]"
      style={{ color: CREME, letterSpacing: '-0.015em' }}
    >
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.09em] align-bottom">
          <motion.span
            className="inline-block"
            style={{ marginRight: '0.26em', color: i >= accentFrom ? OR : undefined }}
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.1, delay: 0.5 + i * 0.05, ease: EASE }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </h1>
  );
}

/** Hero : la copie a gauche, le portrait a droite, chaud, jamais froid. */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 96]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -44]);

  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute inset-y-0 right-0 w-full lg:w-[53%]"
        style={reduced ? undefined : { y: photoY }}
        initial={{ clipPath: 'inset(0 0 100% 0)' }}
        animate={{ clipPath: 'inset(0 0 0% 0)' }}
        transition={{ duration: 1.5, delay: 0.2, ease: EASE }}
      >
        <motion.img
          src={ALEX.portrait}
          alt=""
          className="h-full w-full object-cover object-[50%_26%]"
          style={{ filter: 'sepia(0.32) saturate(1.15) contrast(1.06) brightness(0.94)' }}
          initial={{ scale: 1.12 }}
          animate={{ scale: 1 }}
          transition={{ duration: 3, ease: EASE }}
        />
        {/* Le portrait se fond dans le noir chaud, jamais de bord net */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${NOIR} 0%, rgba(10,8,8,0.6) 26%, rgba(10,8,8,0.06) 64%, transparent 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to bottom, rgba(10,8,8,0.6) 0%, transparent 32%, rgba(10,8,8,0.4) 74%, ${NOIR} 100%)`,
          }}
        />
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background: `linear-gradient(to bottom, rgba(10,8,8,0.55) 0%, rgba(10,8,8,0.5) 36%, rgba(10,8,8,0.9) 72%, ${NOIR} 100%)`,
          }}
        />
        {/* Lueur doree au bord de la silhouette */}
        <div
          className="absolute inset-0 mix-blend-screen"
          style={{
            background: 'radial-gradient(46% 34% at 46% 30%, rgba(197,160,89,0.22), transparent 72%)',
          }}
        />
      </motion.div>

      <Braises />

      <motion.div
        className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1280px] flex-col justify-end px-6 pb-24 pt-40 md:px-10"
        style={reduced ? undefined : { y: copyY }}
      >
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.25, ease: EASE }}
        >
          <Etiquette>{ALEX.eyebrow}</Etiquette>
        </motion.div>

        <motion.p
          className="font-cinzel mb-6 mt-4 text-[clamp(0.95rem,1.5vw,1.2rem)] uppercase tracking-[0.3em]"
          style={{ color: 'rgba(243,229,171,0.72)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.35, ease: EASE }}
        >
          {ALEX.name}
        </motion.p>

        <TitreAnime text={ALEX.heroTitle} accentFrom={7} />

        <div className="mt-9 grid max-w-[60ch] gap-8 lg:max-w-[46ch]">
          <motion.p
            className="font-lato text-[1.05rem] font-light leading-relaxed"
            style={{ color: 'rgba(243,229,171,0.66)' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.25, ease: EASE }}
          >
            {ALEX.heroSub}
          </motion.p>
          <motion.div
            className="flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.45, ease: EASE }}
          >
            <a
              href="#calendrier"
              className="font-cinzel rounded-[15px] px-7 py-3 text-xs uppercase tracking-[0.22em] transition-colors"
              style={{ background: OR, color: '#17110a' }}
            >
              Le calendrier des années
            </a>
            <a
              href={CTA.primary.href}
              className="font-cinzel rounded-[15px] border px-7 py-3 text-xs uppercase tracking-[0.22em] transition-colors hover:bg-white/5"
              style={{ borderColor: 'rgba(197,160,89,0.5)', color: CREME }}
            >
              {CTA.primary.label}
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/** Carte d'une annee du calendrier : silhouette doree, age ou periode. */
function AnneeCard({ annee }: { annee: Annee }) {
  const encours = annee.statut === 'encours';
  const avenir = annee.statut === 'avenir';
  const label = encours ? 'En cours' : avenir ? 'À venir' : 'Accompli';

  return (
    <article
      className="relative flex w-[78vw] flex-none flex-col overflow-hidden rounded-[15px] border backdrop-blur-md sm:w-[56vw] lg:w-[29vw]"
      style={{
        background: 'rgba(10,8,8,0.55)',
        borderColor: encours ? 'rgba(197,160,89,0.6)' : 'rgba(243,229,171,0.14)',
        boxShadow: encours ? '0 0 70px rgba(197,160,89,0.22)' : 'none',
      }}
    >
      <div className="relative h-[25svh] max-h-[230px] min-h-[168px] overflow-hidden">
        <img
          src={ALEX.portraitSmall}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-full w-full object-cover object-[50%_20%]"
          style={{
            filter: `grayscale(1) sepia(0.55) saturate(1.4) contrast(1.6) brightness(${avenir ? 0.5 : 0.8})`,
            opacity: avenir ? 0.42 : 0.88,
            maskImage: 'linear-gradient(to bottom, black 38%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 38%, transparent 100%)',
          }}
        />
        {encours && (
          <div
            aria-hidden
            className="absolute inset-0 mix-blend-screen"
            style={{
              background: 'radial-gradient(70% 60% at 50% 28%, rgba(197,160,89,0.4), transparent 72%)',
            }}
          />
        )}
        <p
          className={`font-prata absolute bottom-2 left-6 leading-none ${
            annee.age
              ? 'text-[clamp(3.6rem,6.4vw,5.8rem)]'
              : 'font-cinzel text-[clamp(1.05rem,1.7vw,1.35rem)] tracking-[0.2em]'
          }`}
          style={{ color: encours ? OR : CREME, opacity: avenir ? 0.55 : 1 }}
        >
          {annee.age ?? annee.periode}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-7 pt-3">
        <div className="flex items-center gap-3">
          <span
            className="font-cinzel text-[0.65rem] uppercase tracking-[0.26em]"
            style={{ color: encours ? OR : 'rgba(243,229,171,0.45)' }}
          >
            {label}
          </span>
          <span className="h-px flex-1" style={{ background: 'rgba(197,160,89,0.25)' }} />
        </div>
        <h3 className="font-prata text-2xl" style={{ color: CREME }}>
          {annee.titre}
        </h3>
        <p className="font-lato text-sm font-light" style={{ color: 'rgba(243,229,171,0.6)' }}>
          {annee.promesse}
        </p>
        <ul className="mt-auto flex flex-col gap-2 pt-2">
          {annee.gestes.map((geste) => (
            <li
              key={geste}
              className="font-lato flex gap-3 text-sm font-light"
              style={{ color: 'rgba(243,229,171,0.85)' }}
            >
              <span aria-hidden style={{ color: OR }}>
                ·
              </span>
              {geste}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

/**
 * Le calendrier : la section se colle a l'ecran et les annees defilent
 * lateralement au rythme du scroll vertical.
 */
function CalendrierRail() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth + 40));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  if (reduced) {
    return (
      <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-6">
        {ANNEES.map((annee) => (
          <div key={annee.titre} className="snap-start">
            <AnneeCard annee={annee} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative z-10" style={{ height: `calc(100svh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <motion.div ref={trackRef} className="flex gap-6 px-6 lg:px-12" style={{ x }}>
          {ANNEES.map((annee) => (
            <AnneeCard key={annee.titre} annee={annee} />
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/** Bandeau de section : etiquette Cinzel + grand titre Prata. */
function TitreSection({ etiquette, titre }: { etiquette: string; titre: string }) {
  return (
    <Reveal>
      <Etiquette>{etiquette}</Etiquette>
      <h2
        className="font-prata mt-4 max-w-[20ch] text-[clamp(1.8rem,3.8vw,3.1rem)] leading-[1.14]"
        style={{ color: CREME, letterSpacing: '-0.015em' }}
      >
        {titre}
      </h2>
    </Reveal>
  );
}

const CONTENEUR = 'relative z-10 mx-auto w-full max-w-[1280px] px-6 md:px-10';

export default function AlexPage() {
  useEffect(() => {
    document.title = `${ALEX.name} · Le Salon des Inconnus`;
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ background: NOIR }}>
      <Atmosphere />
      <main className="relative">
        <Hero />

        {/* Manifeste */}
        <section className={`${CONTENEUR} py-24 md:py-32`}>
          <Reveal>
            <p
              className="font-prata max-w-[24ch] text-[clamp(1.6rem,3.3vw,2.8rem)] leading-[1.22]"
              style={{ color: CREME, letterSpacing: '-0.015em' }}
            >
              {ALEX.manifesto}
            </p>
          </Reveal>
        </section>

        <Filet />

        {/* Les pratiques */}
        <section className={`${CONTENEUR} py-10`}>
          <Reveal>
            <Etiquette>Ce que je fais</Etiquette>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {PRATIQUES.map((pratique, i) => (
              <Reveal key={pratique.title} delay={i * 0.08}>
                <p className="font-cinzel text-sm" style={{ color: OR }}>
                  0{i + 1}
                </p>
                <h3 className="font-prata mt-3 text-xl" style={{ color: CREME }}>
                  {pratique.title}
                </h3>
                <p
                  className="font-lato mt-3 text-sm font-light leading-relaxed"
                  style={{ color: 'rgba(243,229,171,0.6)' }}
                >
                  {pratique.body}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        <Filet />

        {/* Filmographie */}
        <section className={`${CONTENEUR} py-10`}>
          <TitreSection etiquette="Filmographie" titre="Du court métrage au plateau de télévision." />
          <div className="mt-14 grid gap-x-16 gap-y-14 lg:grid-cols-2">
            {FILMOGRAPHIE.map((bloc, i) => (
              <Reveal key={bloc.titre} delay={i * 0.06}>
                <h3 className="font-cinzel text-[0.7rem] uppercase tracking-[0.3em]" style={{ color: OR }}>
                  {bloc.titre}
                </h3>
                <ul className="mt-6 border-t" style={{ borderColor: 'rgba(197,160,89,0.18)' }}>
                  {bloc.items.map((item) => (
                    <li
                      key={item.title}
                      className="border-b py-5"
                      style={{ borderColor: 'rgba(197,160,89,0.18)' }}
                    >
                      <p className="font-prata text-lg" style={{ color: CREME }}>
                        {item.title}
                      </p>
                      <p
                        className="font-cinzel mt-1 text-[0.68rem] uppercase tracking-[0.18em]"
                        style={{ color: 'rgba(197,160,89,0.75)' }}
                      >
                        {item.meta}
                      </p>
                      {item.note && (
                        <p
                          className="font-lato mt-2 text-sm font-light leading-relaxed"
                          style={{ color: 'rgba(243,229,171,0.6)' }}
                        >
                          {item.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </section>

        <Filet />

        {/* Prix */}
        {PRIX.length > 0 && (
          <section className={`${CONTENEUR} py-10`}>
            <TitreSection etiquette="Prix et distinctions" titre="Ce que des jurys ont déjà tranché." />
            <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {PRIX.map((prix, i) => (
                <Reveal key={`${prix.award}-${prix.year}`} delay={(i % 3) * 0.06}>
                  <li
                    className="h-full rounded-[15px] border p-7 backdrop-blur-md"
                    style={{
                      background: 'rgba(10,8,8,0.5)',
                      borderColor: 'rgba(243,229,171,0.14)',
                    }}
                  >
                    <p className="font-cinzel text-xs uppercase tracking-[0.24em]" style={{ color: OR }}>
                      {prix.year}
                    </p>
                    <h3 className="font-prata mt-3 text-xl" style={{ color: CREME }}>
                      {prix.award}
                    </h3>
                    <p className="font-lato mt-2 text-sm font-light" style={{ color: 'rgba(243,229,171,0.62)' }}>
                      {prix.org}
                    </p>
                    {prix.work && (
                      <p className="font-lato mt-1 text-sm font-light" style={{ color: 'rgba(243,229,171,0.4)' }}>
                        {prix.work}
                      </p>
                    )}
                  </li>
                </Reveal>
              ))}
            </ul>
          </section>
        )}

        <Filet />

        {/* Les lieux */}
        <section className={`${CONTENEUR} py-10`}>
          <TitreSection etiquette="Réalisations" titre="Ce qui existe déjà, et qui tourne." />
          <ul className="mt-14 border-t" style={{ borderColor: 'rgba(197,160,89,0.18)' }}>
            {REALISATIONS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <li
                  className="grid gap-3 border-b py-8 lg:grid-cols-[9rem_1fr_1.1fr] lg:items-baseline lg:gap-10"
                  style={{ borderColor: 'rgba(197,160,89,0.18)' }}
                >
                  <span
                    className="font-cinzel text-[0.68rem] uppercase tracking-[0.2em]"
                    style={{ color: 'rgba(197,160,89,0.8)' }}
                  >
                    {item.year}
                  </span>
                  <div>
                    <h3 className="font-prata text-2xl" style={{ color: CREME }}>
                      {item.title}
                    </h3>
                    <p className="font-lato mt-2 text-sm font-light" style={{ color: 'rgba(243,229,171,0.55)' }}>
                      {item.role}
                    </p>
                  </div>
                  <p
                    className="font-lato text-sm font-light leading-relaxed"
                    style={{ color: 'rgba(243,229,171,0.62)' }}
                  >
                    {item.note}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>

        <Filet />

        {/* Formation */}
        <section className={`${CONTENEUR} py-10`}>
          <Reveal>
            <Etiquette>Formation</Etiquette>
          </Reveal>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {FORMATION.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <p className="font-prata text-lg" style={{ color: CREME }}>
                  {item.title}
                </p>
                <p className="font-lato mt-1 text-sm font-light" style={{ color: 'rgba(243,229,171,0.55)' }}>
                  {item.note}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        <Filet />

        {/* En chantier */}
        <section className={`${CONTENEUR} py-10`}>
          <TitreSection etiquette="En chantier" titre="Ce qui avance en ce moment." />
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {CHANTIERS.map((chantier, i) => (
              <Reveal key={chantier.title} delay={i * 0.08}>
                <div
                  className="h-full rounded-[15px] border p-8 backdrop-blur-md transition-colors"
                  style={{ background: 'rgba(10,8,8,0.5)', borderColor: 'rgba(243,229,171,0.14)' }}
                >
                  <h3 className="font-prata text-xl" style={{ color: CREME }}>
                    {chantier.title}
                  </h3>
                  <p
                    className="font-lato mt-3 text-sm font-light leading-relaxed"
                    style={{ color: 'rgba(243,229,171,0.6)' }}
                  >
                    {chantier.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/*
          LA RUPTURE (Von Restorff, une seule dans la page) : l'ouverture du
          calendrier, plein ecran, la silhouette geante et l'age en tres grand.
        */}
        <section id="calendrier" className="relative overflow-hidden">
          <div className="relative flex min-h-[92svh] items-center">
            <div
              aria-hidden
              className="absolute inset-y-0 right-[-10%] w-[76%] overflow-hidden lg:right-0 lg:w-[50%]"
            >
              <img
                src={ALEX.portrait}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover object-[50%_16%]"
                style={{ filter: 'grayscale(1) sepia(0.6) saturate(1.5) contrast(1.85) brightness(0.62)' }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, ${NOIR} 0%, rgba(10,8,8,0.72) 30%, rgba(10,8,8,0.12) 78%, rgba(10,8,8,0.55) 100%)`,
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to bottom, ${NOIR} 0%, transparent 26%, transparent 62%, ${NOIR} 100%)`,
                }}
              />
            </div>
            <Braises />
            <div className={CONTENEUR}>
              <Reveal>
                <Etiquette>Le calendrier des années</Etiquette>
                <p
                  className="font-prata mt-6 leading-[0.82] text-[clamp(7rem,21vw,19rem)]"
                  style={{ color: OR, textShadow: '0 0 90px rgba(197,160,89,0.35)' }}
                >
                  33
                </p>
                <h2
                  className="font-prata mt-5 text-[clamp(1.9rem,4.6vw,3.6rem)]"
                  style={{ color: CREME, letterSpacing: '-0.015em' }}
                >
                  Année de la Structure.
                </h2>
                <p
                  className="font-lato mt-6 max-w-[46ch] text-[1.05rem] font-light leading-relaxed"
                  style={{ color: 'rgba(243,229,171,0.65)' }}
                >
                  Une année, une discipline, un chantier. Le nom se choisit avant que l’année
                  commence, et tout le reste plie devant lui.
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        <CalendrierRail />

        {/* Fermeture : un prochain geste, jamais une question de principe. */}
        <section className={`${CONTENEUR} py-24`}>
          <Reveal>
            <Etiquette>{CTA.eyebrow}</Etiquette>
            <h2
              className="font-prata mt-4 max-w-[18ch] text-[clamp(1.9rem,4.4vw,3.4rem)]"
              style={{ color: CREME, letterSpacing: '-0.015em' }}
            >
              {CTA.title}
            </h2>
            <p
              className="font-lato mt-6 max-w-[50ch] text-[1.05rem] font-light leading-relaxed"
              style={{ color: 'rgba(243,229,171,0.65)' }}
            >
              {CTA.body}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href={CTA.primary.href}
                className="font-cinzel rounded-[15px] px-7 py-3 text-xs uppercase tracking-[0.22em]"
                style={{ background: OR, color: '#17110a' }}
              >
                {CTA.primary.label}
              </a>
              <a
                href="/centre"
                className="font-cinzel rounded-[15px] border px-7 py-3 text-xs uppercase tracking-[0.22em] hover:bg-white/5"
                style={{ borderColor: 'rgba(197,160,89,0.5)', color: CREME }}
              >
                Le centre d’art
              </a>
            </div>
          </Reveal>
        </section>
      </main>
    </div>
  );
}
