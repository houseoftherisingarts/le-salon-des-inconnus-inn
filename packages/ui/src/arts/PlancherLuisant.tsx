import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// Le reflet est une copie inerte de la carte. Les cartes lisent ce contexte pour
// ne pas dupliquer leurs titres ni leurs boutons dans le plan du document.
const DansLeReflet = createContext(false);
export const useDansLeReflet = () => useContext(DansLeReflet);

type AvecVariables = React.CSSProperties & Record<`--${string}`, string | number>;

// Perspective dessinée d'avance : lattes vers un point de fuite en haut au centre,
// joints espacés en 1/distance. Peint une fois, aucune couche 3D à composer.
const LIGNES_SOL = (() => {
  const d: string[] = [];
  for (let x = -250; x <= 350; x += 25) d.push(`M50 0L${x} 100`);
  for (let k = 1; k <= 14; k++) d.push(`M0 ${(100 / (1 + 0.5 * k)).toFixed(2)}H100`);
  return d.join('');
})();

const CSS = `
.pl-scene{position:relative;isolation:isolate;width:100%;background:#050505;
  --_reflet:var(--pl-reflet,clamp(64px,9vw,140px));--_lev0:var(--pl-lev,14px);--_lev:var(--_lev0);
  --_sol:calc(var(--_reflet) + var(--_lev0));--_amp:var(--pl-amp,5px);--_survol:var(--pl-survol,8px);
  --_flou:1px;--_ombre:.85}
.pl-fond{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;
  background:linear-gradient(to bottom,#0a0808 0%,#0e0b0a var(--pl-horizon,30%),#070606 calc(var(--pl-horizon,30%) + 1px),#050505 72%,#030303 100%)}
.pl-lignes{position:absolute;left:0;top:var(--pl-horizon,30%);width:100%;height:calc(100% - var(--pl-horizon,30%));
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 40%);mask-image:linear-gradient(to bottom,transparent,#000 40%)}
.pl-horizon{position:absolute;left:0;right:0;top:var(--pl-horizon,30%);height:1px;
  background:linear-gradient(90deg,transparent,rgba(197,160,89,.34) 28%,rgba(243,229,171,.45) 50%,rgba(197,160,89,.34) 72%,transparent)}
.pl-horizon::after{content:"";position:absolute;left:12%;right:12%;top:-48px;height:96px;
  background:radial-gradient(50% 50% at 50% 50%,rgba(197,160,89,.16),transparent 70%)}
.pl-lustre{position:absolute;left:0;width:55%;top:var(--pl-horizon,30%);height:min(40%,460px);
  background:radial-gradient(50% 50% at 50% 35%,rgba(243,229,171,.075),rgba(243,229,171,.02) 45%,transparent 70%);
  animation:pl-lustre 26s ease-in-out infinite alternate}
.pl-contenu{position:relative;z-index:1}
.pl-objet{position:relative;padding-bottom:calc(var(--_sol) + var(--_lev))}
.pl-objet[data-haut]{--_lev:calc(var(--_lev0) * 2.4);--_ombre:.55}
.pl-carte{position:relative;z-index:2;
  animation:pl-flotte 7.5s ease-in-out calc(var(--pl-i,0) * -1.9s) infinite;
  transition:translate .6s cubic-bezier(.16,1,.3,1)}
.pl-ombre{position:absolute;z-index:1;left:9%;right:9%;bottom:calc(var(--_sol) - 14px);height:28px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(0,0,0,var(--_ombre)),rgba(0,0,0,calc(var(--_ombre) * .4)) 60%,transparent);
  animation:pl-ombre 7.5s ease-in-out calc(var(--pl-i,0) * -1.9s) infinite;
  transition:scale .6s cubic-bezier(.16,1,.3,1)}
.pl-objet[data-haut] .pl-ombre{left:3%;right:3%}
.pl-reflet{position:absolute;z-index:0;left:0;right:0;bottom:0;height:calc(var(--_sol) - var(--_lev));
  overflow:hidden;pointer-events:none;-webkit-user-select:none;user-select:none;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.95) 0%,rgba(0,0,0,.5) 50%,transparent 100%);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.95) 0%,rgba(0,0,0,.5) 50%,transparent 100%)}
.pl-reflet::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(243,229,171,.05),rgba(5,5,5,.30))}
.pl-reflet-flotte{position:absolute;inset:0;
  animation:pl-flotte-reflet 7.5s ease-in-out calc(var(--pl-i,0) * -1.9s) infinite;
  transition:translate .6s cubic-bezier(.16,1,.3,1)}
.pl-copie{position:absolute;left:0;right:0;top:0;transform:scaleY(-1);filter:blur(var(--_flou)) brightness(1.25);opacity:.9}
.pl-copie *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:none!important;animation:none!important}
@media (hover:hover){
  .pl-objet:has(> .pl-carte:hover) .pl-carte{translate:0 calc(var(--_survol) * -1)}
  .pl-objet:has(> .pl-carte:hover) .pl-reflet-flotte{translate:0 var(--_survol)}
  .pl-objet:has(> .pl-carte:hover) .pl-ombre{scale:.88}
}
.pl-objet:has(> .pl-carte :focus-visible) .pl-carte{translate:0 calc(var(--_survol) * -1)}
.pl-objet:has(> .pl-carte :focus-visible) .pl-reflet-flotte{translate:0 var(--_survol)}
.pl-objet:has(> .pl-carte :focus-visible) .pl-ombre{scale:.88}
.pl-scene[data-anime="non"] :is(.pl-carte,.pl-reflet-flotte,.pl-ombre,.pl-lustre){animation-play-state:paused}
@media (max-width:639px){.pl-scene{--_flou:.8px}}
/* Repli R3 : sur écran tactile, le reflet et l'ombre restent immobiles et nets, seule la carte flotte. */
@media (hover:none){.pl-reflet-flotte,.pl-ombre{animation:none}.pl-scene{--_flou:0px}}
@media (prefers-reduced-motion:reduce){
  .pl-scene :is(.pl-carte,.pl-reflet-flotte,.pl-ombre,.pl-lustre){animation:none!important;transition:none!important;translate:none!important;scale:none!important}
}
@keyframes pl-flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--_amp) * -1))}}
@keyframes pl-flotte-reflet{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--_amp))}}
@keyframes pl-ombre{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.92);opacity:.78}}
@keyframes pl-lustre{from{transform:translateX(-15%)}to{transform:translateX(96%)}}
`;

type ScenePropriétés = {
  children: React.ReactNode;
  className?: string;
  contenuClassName?: string;
  as?: 'section' | 'div';
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

export function PlancherLuisant({ children, className = '', contenuClassName = '', as = 'div', ...aria }: ScenePropriétés) {
  const ref = useRef<HTMLDivElement>(null);
  const [anime, setAnime] = useState(true);

  // Met le flottement en pause quand la scène sort de l'écran. La racine nulle suit bien
  // le défilement de <main>, mais <main> rogne la cible avant la marge : la pause se fait
  // donc au bord exact de l'écran, sans saut visible puisque l'animation reprend où elle était.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setAnime(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Balise = as as 'div';
  return (
    <Balise ref={ref} className={`pl-scene ${className}`} data-anime={anime ? 'oui' : 'non'} {...aria}>
      {/* React 19 hisse cette feuille dans <head> et la dédoublonne par href. */}
      <style href="inconnus-plancher-luisant" precedence="medium">{CSS}</style>
      <div className="pl-fond" aria-hidden="true">
        <svg className="pl-lignes" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          <path d={LIGNES_SOL} fill="none" stroke="#f3e5ab" strokeOpacity="0.12" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pl-horizon" />
        <div className="pl-lustre" />
      </div>
      <div className={`pl-contenu ${contenuClassName}`}>{children}</div>
    </Balise>
  );
}

type ObjetPropriétés = { children: React.ReactNode; index?: number; haut?: boolean; className?: string };

export function ObjetFlottant({ children, index = 0, haut = false, className = '' }: ObjetPropriétés) {
  return (
    <div className={`pl-objet ${className}`} data-haut={haut ? '' : undefined} style={{ '--pl-i': index } as AvecVariables}>
      <div className="pl-carte">{children}</div>
      <div className="pl-ombre" aria-hidden="true" />
      {/* Copie retournée : aria-hidden la retire des lecteurs d'écran, inert du clavier
          et des clics, pointer-events:none du survol. */}
      <div className="pl-reflet" aria-hidden="true" inert>
        <div className="pl-reflet-flotte">
          <div className="pl-copie">
            <DansLeReflet.Provider value={true}>{children}</DansLeReflet.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
