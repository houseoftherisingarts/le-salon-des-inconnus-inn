// Page.tsx : une page de livre, commune au livre du grand écran, aux feuillets
// du téléphone et à la mesure de la pagination. Le papier, l'encre et les
// filets viennent des jetons --es-page-*, que themes.ts tire de la palette :
// papier clair et encre foncée, quel que soit le fond de la page.
//
// Patron repris des pages à l'encre du Grimoire du festival : un plan au rapport
// fixe (container-type), des zones de texte réglées en fraction de ce plan, un
// titre courant, un filet, un folio. La taille du corps a un plancher en pixels
// pour rester lisible sur un téléphone.

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { classeBloc, paginer, type ExtraitLisible, type PageLivre } from './pagination';

// Un grain de papier dessiné (bruit fractal en niveaux de gris), jamais une photo.
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .45 0 0 0 0 .4 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`;

export const STYLE_PAGE = `
.al-page{position:relative;container-type:inline-size;background:var(--es-page);color:var(--es-page-ink);overflow:hidden;}
.al-page::before{content:"";position:absolute;inset:0;background-image:${GRAIN};opacity:.32;mix-blend-mode:multiply;pointer-events:none;}
.al-page[data-cote="gauche"]::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to left,var(--es-page-ombre),transparent 13%);}
.al-page[data-cote="droite"]::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(to right,var(--es-page-ombre),transparent 13%);}
.al-cadre{position:absolute;inset:7.5cqw 9cqw 7cqw;display:flex;flex-direction:column;}
.al-tete{display:flex;justify-content:space-between;gap:1rem;font-family:var(--es-font-label);font-weight:var(--es-weight-label);text-transform:uppercase;letter-spacing:.2em;font-size:clamp(13px,2.3cqw,14px);color:var(--es-page-ink-2);padding-bottom:2.4cqw;border-bottom:1px solid var(--es-page-ligne);position:relative;}
.al-tete>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.al-page[data-cote="droite"] .al-tete{justify-content:flex-end;}
.al-page[data-cote="droite"] .al-tete::after{left:auto;right:0;}
.al-tete::after{content:"";position:absolute;left:0;bottom:-1px;width:12cqw;height:1px;background:var(--es-accent);}
.al-texte{flex:1;min-height:0;overflow:hidden;margin-top:5cqw;font-family:var(--es-font-body);font-size:clamp(15px,3.4cqw,18px);line-height:1.62;text-align:justify;hyphens:auto;-webkit-hyphens:auto;}
.al-titre{font-family:var(--es-font-display);font-weight:var(--es-weight-display);font-size:1.7em;line-height:1.08;text-align:left;hyphens:manual;margin:0 0 1.1em;letter-spacing:-.01em;}
.al-para{margin:0;text-indent:1.4em;}
.al-lettrine,.al-suite{text-indent:0;}
.al-coupe{text-align-last:justify;}
.al-lettrine::first-letter{float:left;font-family:var(--es-font-display);font-weight:var(--es-weight-display);font-size:3.35em;line-height:.82;padding:.07em .09em 0 0;color:var(--es-accent-texte);}
.al-folio{margin-top:3cqw;text-align:center;font-family:var(--es-font-label);font-size:clamp(13px,2.3cqw,14px);letter-spacing:.14em;color:var(--es-page-ink-2);font-variant-numeric:tabular-nums;}
`;

interface PageProps {
  page?: PageLivre;
  folio?: number;
  cote: 'gauche' | 'droite';
  tete: string;
  className?: string;
  children?: ReactNode;
}

/** Une page imprimée : titre courant, texte, folio. `children` remplace le texte (garde, colophon). */
export function Page({ page, folio, cote, tete, className, children }: PageProps) {
  return (
    <div className={`al-page ${className ?? ''}`} data-cote={cote}>
      <div className="al-cadre">
        <div className="al-tete"><span>{tete}</span></div>
        <div className="al-texte" lang="fr">
          {children ?? page?.blocs.map((b, i) => (b.type === 'titre'
            ? <h3 key={i} className={classeBloc(b)}>{b.texte}</h3>
            : <p key={i} className={classeBloc(b)}>{b.texte}</p>))}
        </div>
        {folio !== undefined && <p className="al-folio">{folio}</p>}
      </div>
    </div>
  );
}

/**
 * La pagination des extraits dans la zone de texte d'une page témoin cachée.
 * Elle se refait quand la page change de taille et quand les polices arrivent.
 */
export function usePagination(extraits: ExtraitLisible[]) {
  const temoin = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<PageLivre[]>([]);
  const cle = JSON.stringify(extraits);

  useLayoutEffect(() => {
    const el = temoin.current;
    const mesure = el?.querySelector<HTMLElement>('.al-texte');
    if (!el || !mesure) return;
    let taille = '';
    let vivant = true;
    const refaire = (force = false) => {
      const t = `${mesure.clientWidth}x${mesure.clientHeight}`;
      if (!vivant || (!force && t === taille)) return;
      taille = t;
      setPages(paginer(mesure, extraits));
    };
    refaire(true);
    const ro = new ResizeObserver(() => refaire());
    ro.observe(el);
    document.fonts?.ready.then(() => refaire(true));
    const polices = () => refaire(true);
    document.fonts?.addEventListener?.('loadingdone', polices);
    return () => { vivant = false; ro.disconnect(); document.fonts?.removeEventListener?.('loadingdone', polices); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  return { temoin, pages };
}
