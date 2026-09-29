// LivreOuvert.tsx : le wow du gabarit Auteur, sur grand écran. La section
// Extraits devient un livre posé à plat dans une scène collante; le défilement
// tourne ses feuilles une à une, avec un temps d'arrêt entre deux tournes pour
// que la double page se lise. Le livre se redresse en entrant dans l'écran.
//
// Chaque feuille est son propre contexte 3D (perspective dans sa transformation,
// recto et verso dos à dos), si bien que l'ordre d'empilement se règle par
// z-index : la pile de droite descend, celle de gauche monte, et la feuille qui
// tourne passe au-dessus des deux. Référence : le mode « hard » de StPageFlip
// (Nodlik) et le plan au rapport fixe du Grimoire du festival; rien n'est copié.

import { useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { Fleche } from './commun';
import { Page, STYLE_PAGE, usePagination } from './Page';
import type { ExtraitLisible, PageLivre } from './pagination';

const STYLE_LIVRE = `
.al-livre{position:relative;aspect-ratio:10/7;width:min(100%,calc((100svh - 190px) * 10 / 7));margin-inline:auto;}
.al-livre::before{content:"";position:absolute;inset:0.6% -0.5% -1.6%;border-radius:6px;background:var(--es-page);box-shadow:0 1px 0 var(--es-page-ligne),0 3px 0 -1px var(--es-page),0 4px 0 -1px var(--es-page-ligne),0 6px 0 -2px var(--es-page),0 7px 0 -2px var(--es-page-ligne),0 50px 90px -40px var(--es-ombre);}
.al-moitie{position:absolute;top:0;bottom:0;width:50%;}
.al-feuille{position:absolute;top:0;bottom:0;left:50%;width:50%;transform-origin:left center;transform-style:preserve-3d;}
.al-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;}
.al-verso{transform:rotateY(180deg);}
.al-voile{position:absolute;inset:0;background:var(--es-page-ink);pointer-events:none;}
.al-reliure{position:absolute;top:0;bottom:0;left:50%;width:2px;transform:translateX(-1px);background:var(--es-page-ombre);z-index:999;pointer-events:none;}
`;

const borne = (v: number) => Math.min(1, Math.max(0, v));

/** Le nombre de feuilles tournées (fractionnaire) pour une progression p de 0 à 1. */
export function tournees(p: number, feuilles: number): number {
  let f = 0;
  for (let i = 0; i < feuilles; i++) {
    const t = borne((p - (i + 1) / (feuilles + 1)) / (0.5 / (feuilles + 1)) + 0.5);
    f += t * t * (3 - 2 * t);
  }
  return f;
}

function Feuille({ i, n, f, recto, verso }: { i: number; n: number; f: MotionValue<number>; recto: React.ReactNode; verso: React.ReactNode }) {
  const rotateY = useTransform(f, (v) => -180 * borne(v - i));
  const zIndex = useTransform(f, (v) => (v - i >= 0.5 ? i + 1 : 2 * n - i));
  const ombreRecto = useTransform(f, (v) => { const t = borne(v - i); return t < 0.5 ? t * 0.5 : 0; });
  const ombreVerso = useTransform(f, (v) => { const t = borne(v - i); return t >= 0.5 ? (1 - t) * 0.5 : 0; });
  return (
    <motion.div className="al-feuille" style={{ rotateY, zIndex, transformPerspective: 2400 }} data-feuille={i}>
      <div className="al-face">{recto}<motion.span aria-hidden className="al-voile" style={{ opacity: ombreRecto }} /></div>
      <div className="al-face al-verso">{verso}<motion.span aria-hidden className="al-voile" style={{ opacity: ombreVerso }} /></div>
    </motion.div>
  );
}

interface Props {
  extraits: ExtraitLisible[];
  nom: string;
}

export function LivreOuvert({ extraits, nom }: Props) {
  const { temoin, pages } = usePagination(extraits);
  const feuilles = Math.max(1, Math.ceil(pages.length / 2));
  const scene = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const lisse = useSpring(scrollYProgress, { stiffness: 150, damping: 34, mass: 0.4 });
  const f = useTransform(lisse, (p) => tournees(p, feuilles));
  const { scrollYProgress: entree } = useScroll({ target: scene, offset: ['start end', 'start start'] });
  const inclinaison = useTransform(entree, [0, 1], [24, 0]);
  const echelle = useTransform(entree, [0, 1], [0.9, 1]);
  const [planche, setPlanche] = useState(0);
  useMotionValueEvent(f, 'change', (v) => setPlanche(Math.round(v)));

  const tete = (p?: PageLivre) => p?.livre ?? p?.titre ?? '';
  const face = (k: number, cote: 'gauche' | 'droite') => {
    const p = pages[k];
    return <Page page={p} folio={p ? k + 1 : undefined} cote={cote} tete={cote === 'gauche' ? nom : tete(p)} className="h-full w-full" />;
  };

  const aller = (k: number) => {
    const el = scene.current;
    if (!el) return;
    const s = Math.ceil(k / 2);
    const haut = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: haut + (el.offsetHeight - window.innerHeight) * ((s + 0.5) / (feuilles + 1)), behavior: 'smooth' });
  };
  /** Saute au-delà du livre, jusqu'à la section suivante. */
  const passer = () => {
    const el = scene.current;
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + el.offsetHeight, behavior: 'smooth' });
  };

  const debuts = extraits.map((x) => ({ x, k: pages.findIndex((p) => p.extrait === x.id) }));
  const courante = pages[2 * planche] ?? pages[2 * planche - 1] ?? pages[0];
  const visibles = [2 * planche - 1, 2 * planche].filter((k) => k >= 0 && k < pages.length).map((k) => k + 1);

  return (
    <div ref={scene} className="relative" style={{ height: `calc(${(feuilles + 1) * 80}vh + 100vh)` }} data-livre-scene>
      <style>{STYLE_PAGE + STYLE_LIVRE}</style>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden px-5 pb-8 pt-[88px] md:px-10">
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[58%] h-[70vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl" style={{ background: 'radial-gradient(ellipse, var(--es-glow), transparent 68%)' }} />
        <div className="relative mx-auto grid w-full max-w-[1320px] items-center gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
          <aside className="min-w-0">
            <p className="es-label text-[color:var(--es-accent-texte)]">Extraits</p>
            <h2 className="es-display mt-4 max-w-[12ch] text-[clamp(2.1rem,1.4rem+2.2vw,3.5rem)] leading-[1.02]">Premières pages</h2>
            <div className="mt-8 hidden lg:block" aria-live="polite">
              <p className="text-[0.9375rem] text-[color:var(--es-ink-3)]">Vous lisez</p>
              <p className="es-display mt-1 text-[1.5rem] leading-tight" data-extrait-courant>{courante?.titre}</p>
              {courante?.livre && courante.livre !== courante.titre && <p className="mt-1 text-[0.9375rem] text-[color:var(--es-ink-2)]">tiré de {courante.livre}</p>}
              <div className="mt-6 h-px w-full bg-[color:var(--es-line)]">
                <motion.div className="h-px origin-left bg-[color:var(--es-accent)]" style={{ scaleX: lisse }} />
              </div>
              <p className="es-num mt-3 text-[0.875rem] text-[color:var(--es-ink-3)]" data-folios>
                {visibles.length ? `${visibles.length > 1 ? 'Pages' : 'Page'} ${visibles.join(' et ')} sur ${pages.length}` : 'Sommaire'}
              </p>
              <button type="button" onClick={passer} className="es-bouton-ligne mt-8">Passer les extraits <Fleche className="h-4 w-4 rotate-90" /></button>
            </div>
          </aside>

          <motion.div className="al-livre" style={{ rotateX: inclinaison, scale: echelle, transformPerspective: 1600 }}>
            {/* La page témoin, invisible, qui sert à la pagination. */}
            <div ref={temoin} aria-hidden className="al-moitie left-1/2" style={{ visibility: 'hidden' }}>
              <Page cote="droite" tete="" folio={0} className="h-full w-full" />
            </div>

            <div className="al-moitie left-0" style={{ zIndex: 0 }}>
              <Page cote="gauche" tete={nom} className="h-full w-full">
                <p className="es-label !text-[0.8125rem] text-[color:var(--es-page-ink-2)]">Sommaire</p>
                <ol className="mt-5 space-y-4 text-left">
                  {debuts.map(({ x, k }) => (
                    <li key={x.id}>
                      <button type="button" onClick={() => aller(Math.max(0, k))} className="group flex w-full items-baseline gap-3 text-left">
                        <span className="min-w-0">
                          <span className="block font-[family-name:var(--es-font-display)] text-[1.35em] leading-tight transition-colors group-hover:text-[color:var(--es-accent-texte)]">{x.titre}</span>
                          {x.livre && x.livre !== x.titre && <span className="block text-[0.8em] text-[color:var(--es-page-ink-2)]">{x.livre}</span>}
                        </span>
                        <span aria-hidden className="mb-[0.3em] flex-1 border-b border-dotted border-[color:var(--es-page-ligne)]" />
                        <span className="es-num text-[0.85em] text-[color:var(--es-page-ink-2)]">{k >= 0 ? k + 1 : ''}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </Page>
            </div>

            <div className="al-moitie left-1/2" style={{ zIndex: 0 }}>
              <Page cote="droite" tete="" className="h-full w-full">
                <div className="flex h-full flex-col justify-center text-left">
                  <p className="al-titre">La suite est dans le livre</p>
                  <p className="text-[color:var(--es-page-ink-2)]">Ces pages s’arrêtent ici, mais l’histoire continue chez votre libraire.</p>
                  <a href="#livres" className="es-bouton mt-7 self-start">Voir les livres <Fleche /></a>
                </div>
              </Page>
            </div>

            {Array.from({ length: feuilles }, (_, i) => (
              <Feuille key={i} i={i} n={feuilles} f={f} recto={face(2 * i, 'droite')} verso={face(2 * i + 1, 'gauche')} />
            ))}
            <span aria-hidden className="al-reliure" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
