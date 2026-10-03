// ─── La visite guidée ───────────────────────────────────────────────
// Repris du festival, sans Tailwind ni bibliothèque d'animation : une
// carte de verre sombre, un anneau de lumière autour de la zone dont on
// parle, et trois boutons. La zone se marque dans la page par
// `data-tuto="<nom>"` ; une ancre absente ne casse rien, la carte se
// centre et la visite continue.

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TUTORIEL, type Langue } from './textes';

const cleVue = (jeu: string) => `paisho.tutoriel.${jeu}`;

/** La visite a-t-elle déjà été offerte sur cet appareil ? */
export function tutorielVu(jeu: string): boolean {
  try { return localStorage.getItem(cleVue(jeu)) === '1'; } catch { return true; }
}

export function marquerTutorielVu(jeu: string): void {
  try { localStorage.setItem(cleVue(jeu), '1'); } catch { /* navigation privée */ }
}

interface Props {
  langue: Langue;
  ouvert: boolean;
  onFermer: () => void;
}

/** Le rectangle de l'ancre, en coordonnées d'écran. */
function useRectAncre(nom: string | undefined, actif: boolean): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!actif || !nom) { setRect(null); return; }
    // La même ancre peut exister deux fois (panneau de bureau, feuille
    // mobile) : on prend celle qui se voit.
    const el = [...document.querySelectorAll<HTMLElement>(`[data-tuto="${nom}"]`)]
      .find((x) => x.getBoundingClientRect().width > 0);
    if (!el) { setRect(null); return; }
    const mesurer = () => setRect(el.getBoundingClientRect());
    mesurer();
    const t = window.setTimeout(mesurer, 320);
    window.addEventListener('resize', mesurer);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', mesurer); };
  }, [nom, actif]);
  return rect;
}

const Tutoriel: React.FC<Props> = ({ langue, ouvert, onFermer }) => {
  const fr = langue === 'FR';
  const etapes = TUTORIEL[langue];
  const [i, setI] = useState(0);
  const etape = etapes[Math.min(i, etapes.length - 1)];
  const rect = useRectAncre(etape?.ancre, ouvert);

  useEffect(() => { if (ouvert) setI(0); }, [ouvert]);

  const precedent = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
  const suivant = useCallback(() => {
    setI((n) => {
      if (n + 1 >= etapes.length) { onFermer(); return n; }
      return n + 1;
    });
  }, [etapes.length, onFermer]);

  useEffect(() => {
    if (!ouvert) return;
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onFermer(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); suivant(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); precedent(); }
    };
    window.addEventListener('keydown', clavier);
    return () => window.removeEventListener('keydown', clavier);
  }, [ouvert, suivant, precedent, onFermer]);

  if (!ouvert) return null;

  // La carte fuit l'anneau : en bas quand la zone est en haut, et
  // l'inverse ; au milieu quand il n'y a rien à entourer.
  const enBas = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : false;
  const place = !rect ? 'tuto-centre' : enBas ? 'tuto-bas' : 'tuto-haut';
  const dernier = i >= etapes.length - 1;

  return createPortal(
    <div className="tuto" role="dialog" aria-modal="true" aria-label={fr ? 'Visite guidée' : 'Guided tour'}>
      <button
        type="button"
        className={`tuto-voile ${rect ? '' : 'sombre'}`}
        onClick={onFermer}
        aria-label={fr ? 'Quitter la visite' : 'Leave the tour'}
      />
      {rect && (
        <div
          className="tuto-anneau"
          aria-hidden
          style={{
            left: Math.max(4, rect.left - 8),
            top: Math.max(4, rect.top - 8),
            width: Math.min(window.innerWidth - 8, rect.width + 16),
            height: Math.min(window.innerHeight - 8, rect.height + 16),
          }}
        />
      )}
      <aside key={i} className={`tuto-carte verre ${place}`}>
        <p className="tuto-sur">
          {fr ? 'Visite guidée' : 'Guided tour'} <span>{i + 1} / {etapes.length}</span>
        </p>
        <h2 className="tuto-titre">{etape.titre}</h2>
        <p className="tuto-corps">{etape.corps}</p>
        <div className="tuto-progres" aria-hidden>
          {etapes.map((_, n) => <span key={n} className={n <= i ? 'fait' : ''} />)}
        </div>
        <div className="tuto-gestes">
          <button type="button" className="bouton discret" onClick={precedent} disabled={i === 0}>
            {fr ? 'Précédent' : 'Back'}
          </button>
          <button type="button" className="bouton lien" onClick={onFermer}>{fr ? 'Quitter' : 'Leave'}</button>
          <button type="button" className="bouton or" onClick={suivant}>
            {dernier ? (fr ? 'Terminer' : 'Finish') : (fr ? 'Suivant' : 'Next')}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default Tutoriel;
