// Livre3D.tsx : un livre en volume, fait de CSS seulement. La couverture
// déposée fait la face, une tranche assombrie la reliure, des filets de papier
// la gouttière. Sert au hero et à la fiche du livre vedette.

import type { CSSProperties } from 'react';

const STYLE_3D = `
.a3d{position:relative;width:100%;aspect-ratio:2/3;transform-style:preserve-3d;--ep:30px;}
.a3d>*{position:absolute;}
.a3d-face{inset:0;transform:translateZ(calc(var(--ep) / 2));border-radius:2px 5px 5px 2px;overflow:hidden;background:var(--es-bg-3);}
.a3d-face::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,var(--es-page-ombre) 0,transparent 1.6%,var(--es-page-ombre) 3%,transparent 7.5%);pointer-events:none;}
.a3d-dos{inset:0;transform:translateZ(calc(var(--ep) / -2));background:var(--es-page-ink);border-radius:5px 2px 2px 5px;}
.a3d-tranche{top:0;bottom:0;left:0;width:var(--ep);transform:translateX(-50%) rotateY(-90deg);overflow:hidden;background:var(--es-page-ink);}
.a3d-tranche img{height:100%;width:100%;object-fit:cover;object-position:left center;filter:brightness(.62) saturate(1.1);}
.a3d-pages{top:1.2%;bottom:1.2%;right:0;width:var(--ep);transform:translateX(50%) rotateY(90deg);background:repeating-linear-gradient(90deg,var(--es-page) 0 2px,var(--es-page-ligne) 2px 3px);}
.a3d-haut{left:0;right:0;top:0;height:var(--ep);transform:translateY(-50%) rotateX(90deg);background:repeating-linear-gradient(0deg,var(--es-page) 0 2px,var(--es-page-ligne) 2px 3px);}
.a3d-titre{inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:12% 10%;background:var(--es-accent);color:var(--es-accent-ink);}
`;

interface Props {
  titre: string;
  couverture?: string;
  auteur?: string;
  className?: string;
  style?: CSSProperties;
}

export function Livre3D({ titre, couverture, auteur, className, style }: Props) {
  return (
    <div className={`a3d ${className ?? ''}`} style={style} data-livre-3d>
      <style>{STYLE_3D}</style>
      <div className="a3d-dos" />
      <div className="a3d-pages" />
      <div className="a3d-haut" />
      <div className="a3d-tranche">{couverture && <img src={couverture} alt="" />}</div>
      <div className="a3d-face">
        {couverture
          ? <img src={couverture} alt={titre} className="h-full w-full object-cover" />
          : (
            <div className="a3d-titre">
              <span className="es-display text-[clamp(1.5rem,3vw,2.5rem)] leading-[1.02]">{titre}</span>
              {auteur && <span className="es-label mt-3 !text-[0.8125rem] opacity-80">{auteur}</span>}
            </div>
          )}
      </div>
    </div>
  );
}
