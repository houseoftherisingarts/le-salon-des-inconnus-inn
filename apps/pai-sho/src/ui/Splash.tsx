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

const DUREE_MS = 2400;

/** La couleur de la moitié adverse : la nation du personnage, en deux tons (fond, lueur). */
const NATIONS: Record<string, [string, string]> = {
  feu: ['#5a0f0d', '#ff5a3c'],
  eau: ['#0c2a52', '#4aa3ff'],
  terre: ['#183a16', '#8fd36b'],
  air: ['#5a3a08', '#ffc14d'],
  esprit: ['#1a1038', '#9d7bff'],
};
const NATION_PAR_ID: Record<string, keyof typeof NATIONS> = {
  iroh: 'feu', zuko: 'feu', azula: 'feu', ozai: 'feu', zhao: 'feu', mai: 'feu', tylee: 'feu', jeongjeong: 'feu', piandao: 'feu',
  katara: 'eau', sokka: 'eau', pakku: 'eau', hama: 'eau',
  toph: 'terre', bumi: 'terre', longfeng: 'terre', chou: 'terre', jet: 'terre', kyoshi: 'terre', irohek: 'terre',
  aang: 'air', wanshitong: 'esprit',
};
export const nationDe = (id: string): [string, string] => NATIONS[NATION_PAR_ID[id.replace(/2$/, '')] ?? 'feu'];

interface PropsVs {
  langue: Langue;
  joueur: string;
  /** Le grand portrait du personnage que le joueur porte, s'il en porte un. */
  imageJoueur?: string;
  adversaire: string;
  idAdversaire: string;
  imageAdversaire: string;
  /** Le niveau de l'adversaire, affiché sur sa bannière. */
  niveau?: number;
  onFin: () => void;
}

// Une poignée de braises qui montent : positions et retards fixés une fois.
const BRAISES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37 + 11) % 100, d: (i * 0.37) % 2.2, t: 2.6 + (i % 5) * 0.5, s: 3 + (i % 4) * 2,
}));

export default function Splash({ langue, joueur, imageJoueur, adversaire, idAdversaire, imageAdversaire, niveau, onFin }: PropsVs) {
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
  const base = import.meta.env.BASE_URL;

  // Hors du menu : son animation d'entrée ferait de lui le cadre des éléments fixes.
  return createPortal(
    <button type="button" className="vs" onClick={passer} data-test="vs" aria-label={`${joueur} VS ${adversaire}`}
      style={{ '--vs-fond': fond, '--vs-lueur': lueur } as React.CSSProperties}>
      <span className="vs-cote vs-joueur">
        {/* Sans visage choisi, la tuile du lotus tient la place en grand. */}
        {imageJoueur
          ? <img className="vs-perso" src={imageJoueur} alt="" />
          : <img className="vs-perso vs-perso-lotus" src={`${base}tuiles/LOTUS.webp`} alt="" />}
        <span className="vs-banniere">
          <span className="vs-tag">{t.vsJoueur}</span>
          <span className="vs-nom nom-joueur">{joueur}</span>
        </span>
      </span>
      <span className="vs-cote vs-adversaire">
        <img className="vs-perso" src={imageAdversaire} alt="" />
        <span className="vs-banniere">
          <span className="vs-tag">{niveau ? `${t.vsNiveau} ${niveau}` : t.vsAdversaire}</span>
          <span className="vs-nom">{adversaire}</span>
        </span>
      </span>
      {/* L'éclair de la couture : un trait brisé, tracé en 0,4 s, qui flashe blanc puis reste d'or. */}
      <svg className="vs-eclair" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline className="vs-eclair-large" points="62,0 55,22 60,34 48,52 54,64 42,82 46,100" pathLength={100} />
        <polyline className="vs-eclair-haut" points="0,58 18,54 30,57 48,49 62,52 80,44 100,42" pathLength={100} />
      </svg>
      <span className="vs-braises" aria-hidden="true">
        {BRAISES.map((b, i) => (
          <i key={i} style={{ left: `${b.x}%`, animationDelay: `${b.d}s`, animationDuration: `${b.t}s`, width: b.s, height: b.s }} />
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
