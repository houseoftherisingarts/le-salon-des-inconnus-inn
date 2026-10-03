// ─── Les fiches des tuiles : harmonies, clashs et particularités ────
// Les relations viennent du moteur (`HARMONIE_PAIRE`, `CONFLIT_PAIRE`),
// jamais recopiées. Les particularités reprennent les faits des règles.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BASES, CONFLIT_PAIRE, HARMONIE_PAIRE, TYPES, type TypeTuile } from '../jeu/logic';
import { NOMS_TUILES, type Langue } from './textes';
import './fiches.css';

const BASE = import.meta.env.BASE_URL;
const ROUGES: readonly TypeTuile[] = ['R3', 'R4', 'R5'];

// Le français a besoin de l'article, de l'élision et de « au » / « à la ».
const FR_NOM: Record<TypeTuile, string> = {
  R3: 'la rose', R4: 'le chrysanthème', R5: 'le rhododendron',
  W3: 'le jasmin', W4: 'le lys', W5: 'le jade blanc',
  LOTUS: 'le lotus blanc', ORCHIDEE: 'l’orchidée',
  ROCHER: 'le rocher', ROUE: 'la roue', RENOUEE: 'la renouée', BARQUE: 'la barque',
};
const FR_A: Record<TypeTuile, string> = {
  R3: 'à la rose', R4: 'au chrysanthème', R5: 'au rhododendron',
  W3: 'au jasmin', W4: 'au lys', W5: 'au jade blanc',
  LOTUS: 'au lotus blanc', ORCHIDEE: 'à l’orchidée',
  ROCHER: 'au rocher', ROUE: 'à la roue', RENOUEE: 'à la renouée', BARQUE: 'à la barque',
};
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const liste = (xs: string[], et: string) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${et} ${xs[xs.length - 1]}`);

function phrase(t: TypeTuile, langue: Langue): string {
  const harm = BASES.filter((b) => b !== t && HARMONIE_PAIRE(t, b));
  const choc = BASES.filter((b) => b !== t && CONFLIT_PAIRE(t, b));
  const toutes = harm.length === BASES.length;
  if (langue === 'FR') {
    const sujet = majuscule(FR_NOM[t]);
    if (!harm.length && !choc.length) return `${sujet} ne s’harmonise avec rien et ne se heurte à rien.`;
    const h = toutes ? 'avec toutes les fleurs de base' : `avec ${liste(harm.map((b) => FR_NOM[b]), 'et')}`;
    const c = choc.length ? `se heurte ${liste(choc.map((b) => FR_A[b]), 'et')}` : 'ne se heurte à aucune';
    return `${sujet} s’harmonise ${h}, et ${c}.`;
  }
  const n = NOMS_TUILES.EN;
  const bas = (b: TypeTuile) => n[b].toLowerCase();
  if (!harm.length && !choc.length) return `${n[t]} harmonises with nothing and clashes with nothing.`;
  const h = toutes ? 'with every basic flower' : `with ${liste(harm.map(bas), 'and')}`;
  const c = choc.length ? `clashes with ${liste(choc.map(bas), 'and')}` : 'clashes with none';
  return `${n[t]} harmonises ${h}, and ${c}.`;
}

// Les particularités : une ligne de chiffres, une règle en une ou deux phrases.
const PORTEE: Partial<Record<TypeTuile, number>> = { R3: 3, R4: 4, R5: 5, W3: 3, W4: 4, W5: 5, LOTUS: 2, ORCHIDEE: 6 };

const REGLE: Record<Langue, Record<TypeTuile, string>> = {
  FR: {
    R3: '', R4: '', R5: '', W3: '', W4: '', W5: '',
    LOTUS: 'Il s’harmonise avec toutes les fleurs de base, les vôtres comme celles de l’autre. Tant qu’il fleurit sur le plateau, votre orchidée devient sauvage.',
    ORCHIDEE: 'Les fleurs adverses posées autour d’elle ne peuvent plus bouger d’elles-mêmes. Tant que votre lotus fleurit, elle prend n’importe quelle fleur adverse, et n’importe laquelle peut la prendre.',
    ROCHER: 'Il coupe les harmonies de sa ligne et de sa colonne.',
    ROUE: 'Elle fait tourner d’un cran, dans le sens des aiguilles d’une montre, tout ce qui l’entoure.',
    RENOUEE: 'Elle éteint les harmonies des huit tuiles qui l’entourent.',
    BARQUE: 'Elle déplace une fleur vers un point voisin et prend sa place, ou retire de la partie un accent en disparaissant avec lui.',
  },
  EN: {
    R3: '', R4: '', R5: '', W3: '', W4: '', W5: '',
    LOTUS: 'It harmonises with every basic flower, yours and your opponent’s. While it blooms on the board, your orchid becomes wild.',
    ORCHIDEE: 'Opposing flowers standing around it can no longer move by themselves. While your lotus blooms, it captures any opposing flower, and any opposing flower can capture it.',
    ROCHER: 'It cancels harmonies along its row and column.',
    ROUE: 'It turns everything around it one step clockwise.',
    RENOUEE: 'It silences the harmonies of the eight tiles around it.',
    BARQUE: 'It moves a flower to a neighbouring point and takes its place, or removes an accent from the game by leaving with it.',
  },
};

const TX = {
  FR: {
    titre: 'Harmonies et clashs',
    portee: (n: number) => `Portée : ${n} points`,
    interdit: (rouge: boolean) => `Jardin interdit : ${rouge ? 'blanc' : 'rouge'}`,
    aucun: 'Aucun jardin interdit',
    accent: 'Un accent, posé avec le geste de plus',
    base: 'Prend une fleur adverse qui se heurte à elle en se posant dessus.',
    liste: 'Les douze tuiles',
    diagramme: 'Le cercle des six fleurs : les voisines s’harmonisent, les fleurs qui se font face se heurtent.',
    harmonie: 'Harmonie',
    clash: 'Clash',
  },
  EN: {
    titre: 'Harmonies and clashes',
    portee: (n: number) => `Reach: ${n} points`,
    interdit: (rouge: boolean) => `Forbidden garden: ${rouge ? 'white' : 'red'}`,
    aucun: 'No forbidden garden',
    accent: 'An accent, placed with the extra action',
    base: 'Captures an opposing flower that clashes with it by landing on it.',
    liste: 'The twelve tiles',
    diagramme: 'The circle of six flowers: neighbours harmonise, flowers facing each other clash.',
    harmonie: 'Harmony',
    clash: 'Clash',
  },
};

// Le cercle des six fleurs : chaque trait vient du moteur, vert double
// pour une harmonie, rouge pour un clash.
const CERCLE: readonly TypeTuile[] = ['R3', 'R4', 'R5', 'W3', 'W4', 'W5'];
const CX = 130, CY = 116, RAYON = 72, R_TUILE = 24;
const PLACE = CERCLE.map((_, i) => {
  const a = ((i * 60 - 60) * Math.PI) / 180;
  return { x: CX + RAYON * Math.cos(a), y: CY + RAYON * Math.sin(a) };
});
const PAIRES = CERCLE.flatMap((a, i) => CERCLE.slice(i + 1).map((b, k) => ({ a, b, i, j: i + 1 + k })));

function Diagramme({ langue, actif }: { langue: Langue; actif: TypeTuile | null }) {
  const x = TX[langue];
  const vise = actif && CERCLE.includes(actif) ? actif : null;
  const trait = ({ a, b, i, j }: (typeof PAIRES)[number]) => {
    const harmonie = HARMONIE_PAIRE(a, b);
    if (!harmonie && !CONFLIT_PAIRE(a, b)) return null;
    const p = PLACE[i], q = PLACE[j];
    const d = Math.hypot(q.x - p.x, q.y - p.y), ux = (q.x - p.x) / d, uy = (q.y - p.y) / d;
    const g = R_TUILE + 4;
    const x1 = p.x + ux * g, y1 = p.y + uy * g, x2 = q.x - ux * g, y2 = q.y - uy * g;
    const efface = vise && vise !== a && vise !== b ? 'efface' : '';
    if (!harmonie) return <line key={a + b} className={`trait-clash ${efface}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
    const nx = -uy * 2.2, ny = ux * 2.2;
    return (
      <g key={a + b} className={`trait-harmonie ${efface}`}>
        <line x1={x1 + nx} y1={y1 + ny} x2={x2 + nx} y2={y2 + ny} />
        <line x1={x1 - nx} y1={y1 - ny} x2={x2 - nx} y2={y2 - ny} />
      </g>
    );
  };
  return (
    <figure className="fiche-diagramme">
      <svg viewBox="0 0 260 236" role="img" aria-label={x.diagramme}>
        {PAIRES.map(trait)}
        {CERCLE.map((t, i) => {
          const p = PLACE[i];
          const haut = p.y < CY - 10;
          return (
            <g key={t} className={vise && vise !== t && !HARMONIE_PAIRE(vise, t) && !CONFLIT_PAIRE(vise, t) ? 'efface' : ''}>
              <image href={`${BASE}tuiles/${t}.webp`} x={p.x - R_TUILE} y={p.y - R_TUILE} width={R_TUILE * 2} height={R_TUILE * 2} clipPath="circle(50%)" />
              <circle cx={p.x} cy={p.y} r={R_TUILE} className={`anneau ${vise === t ? 'vise' : ''}`} />
              <text x={p.x} y={haut ? p.y - R_TUILE - 6 : p.y + R_TUILE + 12} textAnchor="middle">{NOMS_TUILES[langue][t]}</text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        <span className="legende harmonie">{x.harmonie}</span>
        <span className="legende clash">{x.clash}</span>
      </figcaption>
    </figure>
  );
}

function Bulle({ t, langue, ancre }: { t: TypeTuile; langue: Langue; ancre: HTMLElement }) {
  const x = TX[langue];
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // Jamais hors de l'écran : à droite de la ligne, sinon à gauche, sinon
  // au-dessus (ou dessous) avec un décalage ramené dans la fenêtre.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = window.innerWidth, H = window.innerHeight, m = 8, g = 10;
    const r = ancre.getBoundingClientRect();
    const w = el.offsetWidth, h = el.offsetHeight;
    const borne = (v: number, max: number) => Math.max(m, Math.min(v, max - m));
    let left: number, top: number;
    if (r.right + g + w <= W - m) { left = r.right + g; top = borne(r.top, H - h + m); }
    else if (r.left - g - w >= m) { left = r.left - g - w; top = borne(r.top, H - h + m); }
    else {
      left = borne(r.left, W - w + m);
      top = r.top - h - g >= m ? r.top - h - g : Math.min(r.bottom + g, H - h - m);
    }
    setPos({ left, top: Math.max(m, top) });
  }, [t, ancre]);

  const portee = PORTEE[t];
  const base = (BASES as readonly TypeTuile[]).includes(t);
  const interdit = base ? x.interdit(ROUGES.includes(t)) : portee ? x.aucun : x.accent;
  return createPortal(
    <div
      ref={ref}
      className="verre fiche-bulle"
      role="tooltip"
      style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: 'hidden' }}
    >
      <p className="fiche-bulle-nom">{NOMS_TUILES[langue][t]}</p>
      <p className="fiche-bulle-chiffres">
        {portee ? <b>{x.portee(portee)}</b> : null}
        {portee ? ' · ' : ''}{interdit}
      </p>
      <p className="fiche-bulle-regle">{base ? x.base : REGLE[langue][t]}</p>
    </div>,
    document.body,
  );
}

export default function Fiches({ langue }: { langue: 'FR' | 'EN' }) {
  const x = TX[langue];
  const [ouvert, setOuvert] = useState(() => window.innerWidth >= 1100);
  const [actif, setActif] = useState<TypeTuile | null>(null);
  const lignes = useRef(new Map<TypeTuile, HTMLElement>());
  const tactile = useRef(false);

  // Au toucher, un tap ailleurs referme l'infobulle.
  useEffect(() => {
    if (!actif) return;
    const hors = (e: PointerEvent) => {
      const cible = e.target as Element;
      if (!cible.closest('.fiche-ligne')) setActif(null);
    };
    document.addEventListener('pointerdown', hors);
    return () => document.removeEventListener('pointerdown', hors);
  }, [actif]);

  return (
    <section className="fiches verre" aria-label={x.titre}>
      <button type="button" className="fiches-bascule" aria-expanded={ouvert} onClick={() => { setOuvert((o) => !o); setActif(null); }}>
        <span>{x.titre}</span>
        <span className="fiches-fleche" aria-hidden>{ouvert ? '−' : '+'}</span>
      </button>
      {ouvert && <Diagramme langue={langue} actif={actif} />}
      {ouvert && (
        <ul className="fiches-liste" aria-label={x.liste} onScroll={() => setActif(null)}>
          {TYPES.map((t) => (
            <li key={t}>
              <button
                type="button"
                className={`fiche-ligne ${actif === t ? 'actif' : ''}`}
                ref={(el) => { if (el) lignes.current.set(t, el); else lignes.current.delete(t); }}
                onPointerDown={(e) => { tactile.current = e.pointerType !== 'mouse'; }}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActif(t); }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActif(null); }}
                onFocus={(e) => { if (e.currentTarget.matches(':focus-visible')) setActif(t); }}
                onBlur={() => setActif(null)}
                onClick={() => { if (tactile.current) setActif((a) => (a === t ? null : t)); }}
                onKeyDown={(e) => { if (e.key === 'Escape') setActif(null); }}
              >
                <img src={`${BASE}tuiles/${t}.webp`} alt="" />
                <span>{phrase(t, langue)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {actif && lignes.current.get(actif) && <Bulle t={actif} langue={langue} ancre={lignes.current.get(actif)!} />}
    </section>
  );
}
