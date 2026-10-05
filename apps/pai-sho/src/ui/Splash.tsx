// ─── L'écran « VS » et le choix du nom ──────────────────────────────
// Alex, 4 octobre 2026 : « there are splash screens like 'Username' VS
// 'Iroh' like in super smash, and then the game starts. » Le joueur à
// gauche sur une dalle d'or sombre, l'adversaire à droite, le VS qui
// claque au centre; la partie part seule après 1,8 s, un clic ou une
// touche la lance tout de suite. Le nom, lui, se choisit une fois, à la
// première visite, et sert partout, à distance comme contre la maison.

import { useEffect, useRef, useState } from 'react';
import { TEXTES, type Langue } from './textes';

const DUREE_MS = 1800;

interface PropsVs {
  joueur: string;
  /** La vignette du personnage que le joueur porte, s'il en porte un. */
  imageJoueur?: string;
  adversaire: string;
  imageAdversaire: string;
  onFin: () => void;
}

export default function Splash({ joueur, imageJoueur, adversaire, imageAdversaire, onFin }: PropsVs) {
  const fini = useRef(false);
  const finir = useRef(onFin);
  finir.current = onFin;
  const passer = () => { if (!fini.current) { fini.current = true; finir.current(); } };
  useEffect(() => {
    const minuterie = window.setTimeout(passer, DUREE_MS);
    window.addEventListener('keydown', passer);
    return () => { window.clearTimeout(minuterie); window.removeEventListener('keydown', passer); };
  }, []);

  return (
    <button type="button" className="vs" onClick={passer} data-test="vs" aria-label={`${joueur} VS ${adversaire}`}>
      <span className="vs-cote vs-joueur">
        {imageJoueur && <img className="vs-vignette" src={imageJoueur} alt="" />}
        <span className="vs-nom">{joueur}</span>
      </span>
      <span className="vs-cote vs-adversaire">
        <img className="vs-vignette" src={imageAdversaire} alt="" />
        <span className="vs-nom">{adversaire}</span>
      </span>
      <span className="vs-mot" aria-hidden="true">VS</span>
    </button>
  );
}

/** Le nom du joueur, de 2 à 16 caractères; sans annulation à la première visite. */
export function ChoixNom({ langue, initial, onValider, onFermer }: {
  langue: Langue; initial: string; onValider: (nom: string) => void; onFermer?: () => void;
}) {
  const t = TEXTES[langue];
  const [nom, setNom] = useState(initial.slice(0, 16));
  const propre = nom.trim();
  const valide = propre.length >= 2 && propre.length <= 16;
  return (
    <div className="voile nom-voile" data-test="choix-nom" onClick={onFermer}>
      <form className="dialogue verre" role="dialog" aria-modal="true" aria-labelledby="choix-nom-titre"
        onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (valide) onValider(propre); }}>
        <h2 className="dialogue-titre" id="choix-nom-titre">{t.choisirNom}</h2>
        <p className="dialogue-texte">{t.choisirNomAide}</p>
        <input className="saisie nom-saisie" value={nom} maxLength={16} minLength={2} autoFocus required
          onChange={(e) => setNom(e.target.value)} aria-label={t.votreNom} data-test="nom-saisie" />
        <div className="dialogue-gestes">
          <button type="submit" className="bouton or plein" disabled={!valide} data-test="nom-valider">{t.valider}</button>
        </div>
      </form>
    </div>
  );
}
