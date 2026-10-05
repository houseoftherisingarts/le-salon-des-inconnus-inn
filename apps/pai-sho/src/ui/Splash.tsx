// ─── L'écran « VS » et le choix du nom ──────────────────────────────
// Alex, 4 octobre 2026 : « there are splash screens like 'Username' VS
// 'Iroh' like in super smash », puis, le 5 : « like this but branded in
// our avatar pai sho style », devant l'écran VS de Smash Ultimate. Donc
// deux moitiés pleines qui se heurtent sur un éclair, les personnages en
// grand qui débordent du cadre, les noms sur des bannières en biais dans
// les coins du haut, et un VS qui claque devant le lotus. Le joueur tient
// l'or du Pai Sho; l'adversaire prend la couleur de sa nation.

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TEXTES, type Langue } from './textes';

// Alex, 5 octobre au matin, devant le générique d'Avatar (Eau, Terre, Feu, Air :
// un maître en action sur une calligraphie géante et des coups de pinceau de son
// élément) : « inspire-toi plus de ça », et « trois secondes de plus ».
const DUREE_MS = 5400;

interface Nation { fond: string; lueur: string; calli: string; mot: [string, string] }
/** Chaque nation : le fond et la lueur de sa moitié, sa calligraphie (celles du générique) et son mot. */
const NATIONS: Record<string, Nation> = {
  feu: { fond: '#5a0f0d', lueur: '#ff5a3c', calli: '火烈', mot: ['Feu', 'Fire'] },
  eau: { fond: '#0c2a52', lueur: '#4aa3ff', calli: '水善', mot: ['Eau', 'Water'] },
  terre: { fond: '#183a16', lueur: '#8fd36b', calli: '土強', mot: ['Terre', 'Earth'] },
  air: { fond: '#a4480c', lueur: '#ffa030', calli: '气和', mot: ['Air', 'Air'] },
  esprit: { fond: '#1a1038', lueur: '#9d7bff', calli: '靈智', mot: ['Esprit', 'Spirit'] },
  lotus: { fond: '#8a6418', lueur: '#ffd76a', calli: '白蓮', mot: ['Lotus', 'Lotus'] },
};
const NATION_PAR_ID: Record<string, string> = {
  iroh: 'feu', zuko: 'feu', azula: 'feu', ozai: 'feu', zhao: 'feu', mai: 'feu', tylee: 'feu', jeongjeong: 'feu', piandao: 'feu',
  katara: 'eau', sokka: 'eau', pakku: 'eau', hama: 'eau', korra: 'eau',
  toph: 'terre', bumi: 'terre', longfeng: 'terre', chou: 'terre', jet: 'terre', kyoshi: 'terre', irohek: 'terre',
  aang: 'air', wanshitong: 'esprit',
};
const nomNation = (id?: string): string => (id && NATION_PAR_ID[id.replace(/2$/, '')]) || (id ? 'feu' : 'lotus');
export const nationDe = (id: string): [string, string] => { const n = NATIONS[nomNation(id)]; return [n.fond, n.lueur]; };

/** Les coups de pinceau de chaque élément, dessinés dans un carré de 100 : traits à révéler, pleins à fondre. */
const ENCRES: Record<string, { traits: string[]; pleins: string[] }> = {
  feu: { traits: ['M22 82 C 12 60, 34 52, 28 30', 'M40 70 C 30 50, 52 44, 46 20'], pleins: ['M30 92 C 18 70, 40 62, 34 36 C 46 50, 58 40, 52 14 C 70 36, 74 62, 58 84 C 52 74, 46 76, 44 92 Z'] },
  eau: { traits: ['M4 62 C 22 36, 36 86, 56 54 S 86 26, 98 48', 'M10 80 C 26 60, 40 96, 58 72'], pleins: [] },
  terre: { traits: ['M12 30 l 16 -8 l 14 10 l -6 16 l -20 2 Z', 'M44 54 l 10 -6 l 8 8 l -6 10 l -12 -2 Z'], pleins: ['M30 70 l 5 -3 l 4 4 l -3 5 Z', 'M60 30 l 4 -2 l 3 3 l -2 4 Z', 'M18 58 l 3 -2 l 3 2 l -2 3 Z'] },
  air: { traits: ['M50 50 a 5 5 0 1 1 -5 5 a 11 11 0 1 1 11 -11 a 18 18 0 1 1 -18 18 a 26 26 0 1 1 26 -26 a 35 35 0 1 1 -35 35'], pleins: [] },
  esprit: { traits: ['M 70 26 A 28 28 0 1 1 66 22'], pleins: [] },
  lotus: { traits: ['M50 78 C 40 62, 42 44, 50 30', 'M50 78 C 30 70, 22 54, 26 40', 'M50 78 C 70 70, 78 54, 74 40'], pleins: [] },
};

function Encre({ nation }: { nation: string }) {
  const e = ENCRES[nation];
  return (
    <svg className="vs-encre" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id={`vs-brosse-${nation}`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      {/* Le motif tient dans le coin haut, à côté de la calligraphie, à 60 % du carré. */}
      <g filter={`url(#vs-brosse-${nation})`} transform="translate(14 10) scale(0.62)">
        {e.traits.map((d, i) => <path key={i} d={d} pathLength={1} style={{ animationDelay: `${0.6 + i * 0.25}s` }} />)}
        {e.pleins.map((d, i) => <path key={`p${i}`} className="plein" d={d} />)}
      </g>
    </svg>
  );
}

interface PropsVs {
  langue: Langue;
  joueur: string;
  /** Le grand portrait du personnage que le joueur porte, s'il en porte un. */
  imageJoueur?: string;
  /** L'identifiant de ce personnage, pour sa nation; rien = le lotus. */
  idJoueur?: string;
  adversaire: string;
  idAdversaire: string;
  imageAdversaire: string;
  /** Le niveau de l'adversaire, affiché sur sa bannière. */
  niveau?: number;
  onFin: () => void;
}

// Le tracé de la couture, en écran large (haut en bas) et au téléphone (gauche à droite).
// Les clip-path des deux moitiés (campagne.css) suivent les mêmes points : à changer ensemble.
const ECLAIR_LARGE = '62,0 58,12 63,20 54,33 59,42 49,55 55,63 45,76 50,85 42,100';
const ECLAIR_HAUT = '0,58 14,55 26,58 40,50 52,54 66,46 80,49 100,42';

// Une poignée de braises qui montent : positions et retards fixés une fois.
const BRAISES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37 + 11) % 100, d: (i * 0.37) % 2.2, t: 2.6 + (i % 5) * 0.5, s: 3 + (i % 4) * 2,
}));

export default function Splash({ langue, joueur, imageJoueur, idJoueur, adversaire, idAdversaire, imageAdversaire, niveau, onFin }: PropsVs) {
  const t = TEXTES[langue];
  const fini = useRef(false);
  const finir = useRef(onFin);
  finir.current = onFin;
  const passer = () => { if (!fini.current) { fini.current = true; finir.current(); } };
  useEffect(() => {
    const minuterie = window.setTimeout(passer, DUREE_MS);
    window.addEventListener('keydown', passer);
    return () => { window.clearTimeout(minuterie); window.removeEventListener('keydown', passer); };
  }, []);
  const [fond, lueur] = nationDe(idAdversaire);
  const nJ = nomNation(idJoueur); const nA = nomNation(idAdversaire);
  const en = langue === 'EN' ? 1 : 0;
  const base = import.meta.env.BASE_URL;

  // Hors du menu : son animation d'entrée ferait de lui le cadre des éléments fixes.
  return createPortal(
    <button type="button" className="vs" onClick={passer} data-test="vs" aria-label={`${joueur} VS ${adversaire}`}
      style={{ '--vs-fond': fond, '--vs-lueur': lueur } as React.CSSProperties}>
      <span className="vs-cote vs-joueur">
        <span className="vs-calli" aria-hidden="true">{NATIONS[nJ].calli}</span>
        <Encre nation={nJ} />
        {/* Sans visage choisi, la tuile du lotus tient la place en grand. */}
        {imageJoueur
          ? <img className="vs-perso" src={imageJoueur} alt="" />
          : <img className="vs-perso vs-perso-lotus" src={`${base}tuiles/LOTUS.webp`} alt="" />}
        <span className="vs-banniere">
          <span className="vs-tag">{t.vsJoueur} · {NATIONS[nJ].mot[en]}</span>
          <span className="vs-nom nom-joueur">{joueur}</span>
        </span>
      </span>
      <span className="vs-cote vs-adversaire">
        <span className="vs-calli" aria-hidden="true">{NATIONS[nA].calli}</span>
        <Encre nation={nA} />
        <img className="vs-perso" src={imageAdversaire} alt="" />
        <span className="vs-banniere">
          <span className="vs-tag">{niveau ? `${t.vsNiveau} ${niveau}` : t.vsAdversaire} · {NATIONS[nA].mot[en]}</span>
          <span className="vs-nom">{adversaire}</span>
        </span>
      </span>
      {/* L'éclair de la couture : un trait brisé, tracé en 0,4 s, qui flashe blanc puis reste d'or. */}
      <svg className="vs-eclair" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {/* Trois traits par éclair : le halo large, la lueur, puis le cœur blanc; le flou se fait sur le svg, Chrome rogne les filtres posés sur un trait. */}
        {[ECLAIR_LARGE, ECLAIR_HAUT].map((pts, i) => [
          <polyline key={`h${i}`} className={`vs-eclair-halo ${i ? 'vs-eclair-haut' : 'vs-eclair-large'}`} points={pts} />,
          <polyline key={`l${i}`} className={`vs-eclair-lueur ${i ? 'vs-eclair-haut' : 'vs-eclair-large'}`} points={pts} />,
          <polyline key={`c${i}`} className={`vs-eclair-coeur ${i ? 'vs-eclair-haut' : 'vs-eclair-large'}`} points={pts} />,
        ])}
      </svg>
      <span className="vs-braises" aria-hidden="true">
        {BRAISES.map((b, i) => (
          <i key={i} style={{ '--i': i, left: `${b.x}%`, animationDelay: `${b.d}s`, animationDuration: `${b.t}s`, width: b.s, height: b.s } as React.CSSProperties} />
        ))}
      </span>
      <img className="vs-lotus" src={`${base}tuiles/LOTUS.webp`} alt="" aria-hidden="true" />
      <span className="vs-mot" aria-hidden="true">VS</span>
    </button>,
    document.body,
  );
}

/** Le nom du joueur, de 2 à 16 caractères; sans annulation à la première visite. */
export function ChoixNom({ langue, initial, onValider, onFermer, max = 16 }: {
  langue: Langue; initial: string; onValider: (nom: string) => void; onFermer?: () => void; max?: number;
}) {
  const t = TEXTES[langue];
  const [nom, setNom] = useState(initial.slice(0, max));
  const propre = nom.trim();
  const valide = propre.length >= 2 && propre.length <= max;
  return createPortal(
    <div className="voile nom-voile" data-test="choix-nom" onClick={onFermer}>
      <form className="dialogue verre" role="dialog" aria-modal="true" aria-labelledby="choix-nom-titre"
        onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (valide) onValider(propre); }}>
        <h2 className="dialogue-titre" id="choix-nom-titre">{t.choisirNom}</h2>
        <p className="dialogue-texte">{t.choisirNomAide}</p>
        <input className="saisie nom-saisie" value={nom} maxLength={max} minLength={2} autoFocus required
          onChange={(e) => setNom(e.target.value)} aria-label={t.votreNom} data-test="nom-saisie" />
        <div className="dialogue-gestes">
          <button type="submit" className="bouton or plein" disabled={!valide} data-test="nom-valider">{t.valider}</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
