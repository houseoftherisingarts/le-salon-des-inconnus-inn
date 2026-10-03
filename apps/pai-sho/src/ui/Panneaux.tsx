// ─── Les panneaux de la partie ──────────────────────────────────────
// La réserve d'un joueur, le journal des coups, les règles et le choix
// du geste de plus après une harmonie.

import { useEffect, useRef } from 'react';
import { TYPES, type Camp, type Coup, type EtatPaiSho, type TypeTuile } from '../jeu/logic';
import { NOMS_TUILES, REGLES, TEXTES, type Langue } from './textes';

const BASE = import.meta.env.BASE_URL;
const icone = (t: TypeTuile) => `${BASE}tuiles/${t}.webp`;

export function Reserve({ etat, camp, langue, nom, actif, plantables, choisie, onChoisir }: {
  etat: EtatPaiSho; camp: Camp; langue: Langue; nom: string; actif: boolean;
  plantables: Set<TypeTuile>; choisie: TypeTuile | null; onChoisir: (t: TypeTuile) => void;
}) {
  const t = TEXTES[langue];
  const noms = NOMS_TUILES[langue];
  return (
    <section className={`reserve verre ${camp} ${actif ? 'active' : ''}`} aria-label={`${t.enMain} · ${nom}`}>
      <h3 className="panneau-titre">
        <span className={`pastille ${camp}`} aria-hidden />
        <span className="panneau-nom">{nom}</span>
      </h3>
      <ul className="reserve-grille">
        {TYPES.map((ty) => {
          const n = etat.reserve[camp][ty];
          const jouable = actif && plantables.has(ty);
          return (
            <li key={ty}>
              <button
                type="button"
                className={`jeton ${n === 0 ? 'vide' : ''} ${jouable ? 'jouable' : ''} ${choisie === ty ? 'choisi' : ''}`}
                disabled={!jouable}
                onClick={() => onChoisir(ty)}
                title={noms[ty]}
                aria-label={`${noms[ty]} × ${n}`}
                data-tuile={ty}
              >
                <img src={icone(ty)} alt="" className={camp === 'invite' ? 'noyer' : ''} />
                <span className="compte">{n}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Traduit la notation du moteur (`R3@0,8`, `0,-7>0,-4+ROCHER@1,2`) en mots. */
export function coupEnMots(texte: string, langue: Langue): string {
  const noms = NOMS_TUILES[langue];
  const nom = (t: string) => noms[t as TypeTuile] ?? t;
  const fr = langue === 'FR';
  const [geste, bonus] = texte.split('+');
  let mots: string;
  const plante = geste.match(/^([A-Z0-9]+)@(.+)$/);
  if (plante) mots = fr ? `${nom(plante[1])} plantée en ${plante[2]}` : `${nom(plante[1])} planted at ${plante[2]}`;
  else mots = geste.replace('>', fr ? ' vers ' : ' to ');
  if (!bonus) return mots;
  const b = bonus.match(/^([A-Z0-9]+)@([^>]+)(?:>(.+))?$/);
  if (!b) return `${mots}, ${bonus}`;
  const pousse = b[3] ? (fr ? `, poussée vers ${b[3]}` : `, pushed to ${b[3]}`) : '';
  return `${mots}, ${nom(b[1])} ${fr ? 'en' : 'at'} ${b[2]}${pousse}`;
}

export function Journal({ coups, langue }: { coups: string[]; langue: Langue }) {
  const t = TEXTES[langue];
  const fin = useRef<HTMLOListElement>(null);
  useEffect(() => { fin.current?.scrollTo({ top: fin.current.scrollHeight }); }, [coups.length]);
  return (
    <section className="journal verre">
      <h3 className="panneau-titre">{t.journal}</h3>
      {coups.length === 0 ? <p className="petit">{t.aucunCoup}</p> : (
        <ol ref={fin} className="journal-liste">
          {coups.map((c, i) => (
            <li key={i} className={i % 2 === 0 ? 'hote' : 'invite'}><span>{i + 1}.</span> {coupEnMots(c, langue)}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function PanneauRegles({ langue, onFermer }: { langue: Langue; onFermer: () => void }) {
  const t = TEXTES[langue];
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onFermer]);
  return (
    <div className="voile" onClick={onFermer}>
      <article className="regles verre" onClick={(e) => e.stopPropagation()} aria-label={t.regles}>
        <header className="regles-tete">
          <h2 className="dialogue-titre">{t.regles}</h2>
          <button type="button" className="bouton discret" onClick={onFermer}>{t.fermer}</button>
        </header>
        <div className="regles-corps">
          {REGLES[langue].map((r) => (
            <section key={r.titre}>
              <h3>{r.titre}</h3>
              <p>{r.corps}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}

export function PanneauBonus({ candidats, langue, onChoisir, onAnnuler }: {
  candidats: Coup[]; langue: Langue; onChoisir: (t: TypeTuile | null) => void; onAnnuler: () => void;
}) {
  const t = TEXTES[langue];
  const noms = NOMS_TUILES[langue];
  const types = [...new Set(candidats.flatMap((c) => (c.type === 'deplacer' && c.bonus ? [c.bonus.tuile] : [])))];
  return (
    <div className="bonus verre" role="dialog" aria-label={t.bonusTitre}>
      <h2 className="dialogue-titre">{t.bonusTitre}</h2>
      <p className="dialogue-texte">{t.bonusAide}</p>
      <ul className="bonus-liste">
        {types.map((ty) => (
          <li key={ty}>
            <button type="button" className="jeton jouable large" onClick={() => onChoisir(ty)} data-bonus={ty}>
              <img src={icone(ty)} alt="" />
              <span>{noms[ty]}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="dialogue-gestes">
        <button type="button" className="bouton discret" onClick={onAnnuler}>{t.annuler}</button>
        <button type="button" className="bouton or" onClick={() => onChoisir(null)} data-bonus="passer">{t.bonusPasser}</button>
      </div>
    </div>
  );
}
