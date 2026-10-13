// BoutiquePage : l'App Store du Creator Studio (13 octobre 2026, ordre d'Alex).
//
// La même boutique que vexelwebstudio.com/boutique, mêmes rayons et mêmes fiches
// (./donnees.ts, recopié tel quel du dépôt Vexel), habillée ici aux thèmes du
// studio : le rayon gratuit en Neon Arcade, le rayon de l'abonnement en Prism
// Flow, le rayon payant en Gilded Age. Le hero reprend le tunnel cosmique de
// /highstest : il entre au noir, s'allume au premier défilement, puis le titre
// grossit et s'efface pour laisser place aux rayons.

import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CosmicTunnel } from '../HighsTestPage';
import {
  BOUTIQUE, COURRIEL, CREATOR_STUDIO, RAYONS, formatPrix, produitsDuRayon,
  type Produit, type Rayon, type RayonId,
} from './donnees';

gsap.registerPlugin(ScrollTrigger);

interface BoutiquePageProps {
  currentUser: { uid: string } | null;
  onRequestSignIn: () => void;
  onEnterStudio: () => void;
  onBack: () => void;
}

type Mode = 'unique' | 'mensuel';

/* Chaque rayon porte le thème du Creator Studio qui lui répond, le même que chez Vexel. */
const THEMES: Record<RayonId, {
  fond: string; halo: string; degrade: string; titre: string; etiquette: string;
  carte: string; etat: string; nom: string; ligne: string; texte: string;
  bouton: string; creux: string; trait: string; accent: string;
}> = {
  gratuit: {
    fond: 'bg-[#050505]',
    halo: 'bg-[radial-gradient(60%_50%_at_15%_20%,rgba(232,121,249,0.14),transparent_70%),radial-gradient(50%_45%_at_90%_80%,rgba(34,211,238,0.10),transparent_70%)]',
    degrade: 'bg-gradient-to-r from-fuchsia-400 via-cyan-400 to-yellow-300',
    titre: 'font-prata',
    etiquette: 'text-cyan-300',
    carte: 'border-white/15 hover:border-fuchsia-400/70 hover:shadow-[0_0_50px_-12px_rgba(232,121,249,0.55)]',
    etat: 'border-fuchsia-400/40 text-fuchsia-300',
    nom: 'font-prata text-[23px] text-white',
    ligne: 'font-lato text-[15px] text-white/90',
    texte: 'font-lato text-[14.5px] text-white/65',
    bouton: 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-[#050505]',
    creux: 'border-cyan-300/70 text-cyan-200',
    trait: 'rgba(255,255,255,0.14)',
    accent: '#e879f9',
  },
  abonnement: {
    fond: 'bg-[#030005]',
    halo: 'bg-[radial-gradient(55%_50%_at_80%_15%,rgba(168,85,247,0.16),transparent_70%),radial-gradient(50%_50%_at_10%_85%,rgba(59,130,246,0.14),transparent_70%)]',
    degrade: 'bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400',
    titre: 'font-prata',
    etiquette: 'text-purple-300',
    carte: 'border-white/10 bg-white/5 hover:border-purple-500/60 hover:shadow-[0_0_40px_-8px_rgba(168,85,247,0.45)]',
    etat: 'border-blue-400/40 text-blue-300',
    nom: 'font-prata text-[23px] text-white',
    ligne: 'font-lato text-[15px] text-white/90',
    texte: 'font-lato text-[14.5px] text-white/65',
    bouton: 'bg-gradient-to-r from-purple-500 via-blue-500 to-yellow-400 text-[#030005]',
    creux: 'border-purple-400/70 text-purple-200',
    trait: 'rgba(147,197,253,0.18)',
    accent: '#a855f7',
  },
  payant: {
    fond: 'bg-[#010a13]',
    halo: 'bg-[radial-gradient(60%_55%_at_50%_30%,rgba(200,170,110,0.12),transparent_75%)]',
    degrade: 'bg-gradient-to-r from-[#c8aa6e] via-[#f0e6d2] to-[#c8aa6e]',
    titre: 'font-cinzel uppercase tracking-[0.04em]',
    etiquette: 'text-[#c8aa6e]',
    carte: 'border-[#c8aa6e]/45 bg-[#091428]/70 hover:border-[#f0e6d2] hover:shadow-[0_0_50px_-14px_rgba(200,170,110,0.6)]',
    etat: 'border-[#c8aa6e]/50 text-[#c8aa6e]',
    nom: 'font-cinzel text-[21px] font-bold text-[#f0e6d2]',
    ligne: 'font-lato text-[16px] text-[#f0e6d2]',
    texte: 'font-lato text-[15.5px] text-[#cdbe91]/85',
    bouton: 'bg-[#c8aa6e] text-[#010a13]',
    creux: 'border-[#c8aa6e] text-[#f0e6d2]',
    trait: 'rgba(200,170,110,0.35)',
    accent: '#c8aa6e',
  },
};

const PILULE = 'inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 font-lato text-[14px] font-bold transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function BoutiquePage({ currentUser, onRequestSignIn, onEnterStudio, onBack }: BoutiquePageProps) {
  useEffect(() => {
    document.title = `${BOUTIQUE.titre} · Creator Studio | Le Salon des Inconnus`;
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* le chrome du haut : retour au Salon, entrée du studio */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-4 md:px-10">
        <button onClick={onBack} className={`${PILULE} border border-white/15 bg-black/40 text-white backdrop-blur-md`}>
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Le Salon des Inconnus</span>
          <span className="sm:hidden">Le Salon</span>
        </button>
        <button onClick={onEnterStudio} className={`${PILULE} bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-yellow-300 text-[#050505]`}>
          <span className="hidden sm:inline">Entrer au Creator Studio</span>
          <span className="sm:hidden">Creator Studio</span>
        </button>
      </header>

      <Hero />

      <main id="rayons">
        {RAYONS.map((r) => (
          <SectionRayon key={r.id} rayon={r} currentUser={currentUser} onRequestSignIn={onRequestSignIn} onEnterStudio={onEnterStudio} />
        ))}
      </main>

      <footer className="flex flex-col items-start justify-between gap-6 border-t border-[#c8aa6e]/25 bg-[#010a13] px-6 py-14 md:flex-row md:items-center md:px-16">
        <p className="max-w-[52ch] font-lato text-[15px] leading-relaxed text-[#cdbe91]/80">
          La même boutique vit chez Vexel Webstudio, et un seul compte vous suit d’un côté comme de l’autre.
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={onBack} className={`${PILULE} border border-[#c8aa6e]/60 text-[#f0e6d2]`}>Retour au Salon</button>
          <button onClick={onEnterStudio} className={`${PILULE} bg-[#c8aa6e] text-[#010a13]`}>Entrer au Creator Studio</button>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Le hero : le tunnel plein écran, épinglé sur 220vh. À l'arrivée, un rideau
// noir se lève pendant que le titre monte; au premier défilement, le tunnel
// passe de la veilleuse à la pleine lumière et accélère; plus bas, le titre
// grossit et s'efface au moment où le rayon gratuit arrive.
// ─────────────────────────────────────────────────────────────────────────
function Hero() {
  const section = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const titre = useRef<HTMLDivElement>(null);
  const bas = useRef<HTMLDivElement>(null);
  const progres = useRef(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    /* le tunnel ne tourne que lorsqu'il est à l'écran */
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => io.disconnect();

    const ctx = gsap.context(() => {
      gsap.timeline()
        .from('[data-rideau]', { opacity: 1, duration: 1.1, ease: 'power2.inOut' })
        .from('[data-mot]', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.08 }, 0.25)
        .from('[data-apparait]', { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }, 0.7);

      gsap.timeline({
        scrollTrigger: {
          trigger: el, start: 'top top', end: 'bottom bottom', scrub: 0.6,
          onUpdate: (s) => { progres.current = s.progress; },
        },
      })
        .fromTo(scene.current, { opacity: 0.4, scale: 1.08 }, { opacity: 1, scale: 1, ease: 'none', duration: 0.3 }, 0)
        .to(bas.current, { y: -40, opacity: 0, ease: 'power1.in', duration: 0.25 }, 0.3)
        .to(titre.current, { scale: 1.3, opacity: 0, ease: 'power1.in', duration: 0.45 }, 0.5);
    }, el);
    return () => { ctx.revert(); io.disconnect(); };
  }, []);

  const descendre = () => document.getElementById('gratuit')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={section} className="relative h-[220vh]" aria-labelledby="boutique-titre">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div ref={scene} className="absolute inset-0">
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 0, 5], fov: 75 }}
            frameloop={visible ? 'always' : 'never'}
            gl={{ antialias: false, powerPreference: 'high-performance' }}
          >
            <CosmicTunnel progressRef={progres} />
          </Canvas>
        </div>
        {/* vignette et fondu vers le rayon gratuit */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_65%_at_50%_45%,transparent_35%,rgba(5,5,5,0.85)_100%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-b from-transparent to-[#050505]" />
        <div aria-hidden data-rideau="" className="pointer-events-none absolute inset-0 bg-[#050505] opacity-0" />

        <div ref={titre} className="absolute inset-x-0 top-[22vh] px-5 text-center md:top-[24vh]">
          <p data-apparait="" className="font-cinzel text-[12px] uppercase tracking-[0.5em] text-white/75 md:text-[13px]">
            Creator Studio · Le Salon des Inconnus
          </p>
          <h1 id="boutique-titre" className="mt-5 font-prata text-[clamp(3.6rem,12vw,11.5rem)] leading-[0.95] drop-shadow-[0_0_40px_rgba(232,121,249,0.45)]">
            {['La', 'Boutique'].map((m) => (
              <span key={m} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <span data-mot="" className="inline-block bg-gradient-to-r from-fuchsia-400 via-cyan-300 to-yellow-200 bg-clip-text px-[0.12em] text-transparent">
                  {m}
                </span>
              </span>
            ))}
          </h1>
        </div>

        <div ref={bas} className="absolute inset-x-0 bottom-0 flex flex-col gap-6 px-5 pb-10 md:flex-row md:items-end md:justify-between md:px-12 md:pb-12">
          <p data-apparait="" className="max-w-[46ch] font-lato text-[15px] leading-relaxed text-white/85 md:text-[16px]">
            {BOUTIQUE.sous}
          </p>
          <nav data-apparait="" aria-label="Les rayons" className="flex flex-wrap gap-2">
            {RAYONS.map((r) => (
              <a
                key={r.id}
                href={`#${r.id}`}
                className="inline-flex min-h-[40px] items-center rounded-full border border-white/20 bg-black/40 px-4 font-lato text-[13px] text-white/90 backdrop-blur-md transition-colors hover:border-white/60"
              >
                {r.etiquette.split(' · ')[1]}
              </a>
            ))}
            <button onClick={descendre} className={`${PILULE} bg-white text-[#050505]`}>
              {BOUTIQUE.bouton}
            </button>
          </nav>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Un rayon : l'entête collée à gauche sur grand écran (numéro géant détouré,
// étiquette, titre de deux lignes, intro, bascule de paiement pour le rayon
// payant), la grille des fiches à droite. Au téléphone, tout s'empile.
// ─────────────────────────────────────────────────────────────────────────
function SectionRayon({ rayon, currentUser, onRequestSignIn, onEnterStudio }: {
  rayon: Rayon;
  currentUser: { uid: string } | null;
  onRequestSignIn: () => void;
  onEnterStudio: () => void;
}) {
  const th = THEMES[rayon.id];
  const produits = produitsDuRayon(rayon.id);
  const [mode, setMode] = useState<Mode>('unique');

  return (
    <section id={rayon.id} aria-labelledby={`${rayon.id}-titre`} className={`relative scroll-mt-20 overflow-hidden ${th.fond}`}>
      <div aria-hidden className={`pointer-events-none absolute inset-0 ${th.halo}`} />
      <div aria-hidden className={`absolute inset-x-0 top-0 h-px ${th.degrade} opacity-60`} />

      <div className="relative grid gap-12 px-5 py-24 md:px-12 md:py-32 lg:grid-cols-12 lg:gap-10 xl:px-20">
        <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
          <span
            aria-hidden
            className="block font-sans text-[clamp(5rem,16vw,9.5rem)] font-black leading-[0.8] tabular-nums text-transparent"
            style={{ WebkitTextStroke: `1.5px ${th.trait}` }}
          >
            {rayon.numero}
          </span>
          <p className={`mt-6 font-cinzel text-[12px] uppercase tracking-[0.32em] ${th.etiquette}`}>{rayon.etiquette}</p>
          <h2 id={`${rayon.id}-titre`} className={`mt-4 text-[clamp(2.4rem,5vw,4.2rem)] leading-[1.02] ${th.titre}`}>
            {rayon.titre.map((l) => (
              <span key={l} className={`block bg-clip-text text-transparent ${th.degrade}`}>{l}</span>
            ))}
          </h2>
          <p className={`mt-6 max-w-[46ch] leading-relaxed ${th.texte}`}>{rayon.intro}</p>
          {rayon.id === 'payant' && (
            <div role="group" aria-label="Façon de payer" className="mt-8 inline-flex gap-1 rounded-full border border-[#c8aa6e]/45 bg-[#091428]/70 p-1">
              {(['unique', 'mensuel'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                  className={`min-h-[40px] rounded-full px-5 font-cinzel text-[12px] font-bold uppercase tracking-[0.2em] transition-colors ${mode === m ? 'bg-[#c8aa6e] text-[#010a13]' : 'text-[#cdbe91]'}`}
                >
                  {m === 'unique' ? 'Une fois' : 'Au mois'}
                </button>
              ))}
            </div>
          )}
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-8 xl:gap-6">
          {produits.map((p, i) => (
            <motion.li
              key={p.id}
              className="flex"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '0px 0px -10% 0px' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: (i % 2) * 0.09 }}
            >
              <Fiche produit={p} rayon={rayon} mode={mode} currentUser={currentUser} onRequestSignIn={onRequestSignIn} onEnterStudio={onEnterStudio} />
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Fiche({ produit: p, rayon, mode, currentUser, onRequestSignIn, onEnterStudio }: {
  produit: Produit;
  rayon: Rayon;
  mode: Mode;
  currentUser: { uid: string } | null;
  onRequestSignIn: () => void;
  onEnterStudio: () => void;
}) {
  const th = THEMES[rayon.id];
  return (
    <article
      aria-labelledby={`bq-${p.id}`}
      className={`flex w-full flex-col rounded-[15px] border bg-black/40 p-3 pb-5 backdrop-blur-md transition-all duration-500 hover:-translate-y-1 motion-reduce:hover:translate-y-0 ${th.carte}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-black">
        {p.image ? (
          <img src={p.image} alt={p.alt ?? ''} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-105" />
        ) : (
          <Affiche nom={p.nom} numero={rayon.numero} rayon={rayon.id} />
        )}
      </div>
      <span className={`mt-4 self-start rounded-full border px-2.5 py-1 font-lato text-[11.5px] font-bold tracking-wide ${th.etat}`}>{p.etat}</span>
      <h3 id={`bq-${p.id}`} className={`mt-3 leading-tight ${th.nom}`}>{p.nom}</h3>
      <p className={`mt-1.5 font-bold leading-snug ${th.ligne}`}>{p.ligne}</p>
      <p className={`mt-2.5 leading-relaxed ${th.texte}`}>{p.texte}</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
        <Prix produit={p} rayon={rayon} mode={mode} />
        <Appel produit={p} rayon={rayon} currentUser={currentUser} onRequestSignIn={onRequestSignIn} onEnterStudio={onEnterStudio} />
      </div>
    </article>
  );
}

/* sans capture, le programme reçoit une affiche : son nom détouré sur la lueur du thème */
function Affiche({ nom, numero, rayon }: { nom: string; numero: string; rayon: RayonId }) {
  const th = THEMES[rayon];
  return (
    <div aria-hidden className={`absolute inset-0 ${th.fond}`}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(110% 90% at 85% 110%, ${th.accent}55, transparent 60%)` }} />
      <span className="absolute right-[7%] top-[9%] font-sans text-[13px] font-bold tabular-nums tracking-[0.2em]" style={{ color: th.accent }}>{numero}</span>
      <span
        className={`absolute bottom-[9%] left-[7%] right-[7%] text-[clamp(2rem,4vw,2.8rem)] leading-[0.95] text-transparent ${rayon === 'payant' ? 'font-cinzel font-bold uppercase' : 'font-prata'}`}
        style={{ WebkitTextStroke: `1.2px ${th.accent}`, overflowWrap: 'anywhere' }}
      >
        {nom}
      </span>
    </div>
  );
}

function Prix({ produit: p, rayon, mode }: { produit: Produit; rayon: Rayon; mode: Mode }) {
  const base = 'font-lato font-bold tabular-nums';
  const clair = rayon.id === 'payant' ? 'text-[#f0e6d2]' : 'text-white';
  if (rayon.id === 'gratuit') return <span className={`${base} text-[17px] ${clair}`}>Gratuit</span>;
  if (rayon.id === 'abonnement') return <span className={`${base} text-[17px] ${clair}`}>Inclus</span>;
  const montant = p.prix?.[mode];
  if (montant == null) return <span className={`${base} text-[13px] text-[#cdbe91]/75`}>Prix annoncé à la sortie</span>;
  return (
    <span className={`${base} text-[17px] ${clair}`}>
      {formatPrix(montant)}
      {mode === 'mensuel' && <span className="text-[13px] font-normal text-[#cdbe91]/75"> par mois</span>}
    </span>
  );
}

function Appel({ produit: p, rayon, currentUser, onRequestSignIn, onEnterStudio }: {
  produit: Produit;
  rayon: Rayon;
  currentUser: { uid: string } | null;
  onRequestSignIn: () => void;
  onEnterStudio: () => void;
}) {
  const th = THEMES[rayon.id];
  const plein = `${PILULE} ${th.bouton}`;

  if (rayon.id === 'gratuit' && p.lien) {
    /* le rayon gratuit demande un compte : sans compte, le bouton ouvre la fenêtre de connexion */
    return currentUser ? (
      <a href={p.lien} target="_blank" rel="noreferrer noopener" className={plein}>Ouvrir <span aria-hidden>↗</span></a>
    ) : (
      <button onClick={onRequestSignIn} className={plein}>Créer mon compte gratuit</button>
    );
  }
  if (p.lien === CREATOR_STUDIO) {
    return <button onClick={onEnterStudio} className={plein}>Ouvrir le Creator Studio</button>;
  }
  if (p.lien) {
    return <a href={p.lien} target="_blank" rel="noreferrer noopener" className={plein}>Ouvrir <span aria-hidden>↗</span></a>;
  }
  return (
    <a href={`mailto:${COURRIEL}?subject=${encodeURIComponent(`Boutique : ${p.nom}`)}`} className={`${PILULE} border ${th.creux}`}>
      {p.prix ? 'Le commander' : 'Me prévenir à la sortie'}
    </a>
  );
}
