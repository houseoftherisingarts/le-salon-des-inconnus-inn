// PiedDePage : le pied de page pleine largeur de chaque gabarit, avec le
// collant Vexel en foil holographique porté d'un chantier précédent
// (règle d'Alex du 11 septembre : toujours
// en foil, sur tout site). Le CSS du foil est inline ici plutôt que dans une
// feuille globale : ce fichier ne touche jamais index.css d'apps/salon.

import * as React from 'react';
import { useTexte } from '../shared';
import { sectionVisible, type SectionProps } from './common';

const FOIL_CSS = `
.spf-foil {
  --mx: 30%; --my: 30%; --rx: 0deg; --ry: 0deg;
  color: #fff;
  background:
    radial-gradient(120% 120% at var(--mx) var(--my), rgb(255 255 255 / 0.18), transparent 55%),
    linear-gradient(135deg, #1b1b22 0%, #050505 60%, #14141a 100%);
  overflow: hidden;
  isolation: isolate;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 10px 24px -10px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.25);
  transform: perspective(600px) rotateX(var(--rx)) rotateY(var(--ry));
  transition: transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms cubic-bezier(0.22,1,0.36,1);
  will-change: transform;
}
.spf-foil:hover { box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35), 0 18px 34px -12px rgb(0 0 0 / 0.65), inset 0 1px 0 rgb(255 255 255 / 0.35); }
.spf-foil-sheen {
  position: absolute; inset: -40%; pointer-events: none;
  background: repeating-conic-gradient(from 200deg at var(--mx) var(--my), #ff9ecb 0deg, #ffe08a 24deg, #9bffcf 48deg, #8ad4ff 72deg, #c9a4ff 96deg, #ff9ecb 120deg);
  opacity: 0.16; mix-blend-mode: color-dodge; filter: saturate(1.2) blur(2px);
  transition: opacity 260ms cubic-bezier(0.22,1,0.36,1); z-index: 0;
}
.spf-foil:hover .spf-foil-sheen { opacity: 0.32; }
.spf-foil-grain {
  position: absolute; inset: 0; pointer-events: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>");
  mix-blend-mode: soft-light; opacity: 0.35; z-index: 0;
}
.spf-foil > *:not(.spf-foil-sheen):not(.spf-foil-grain) { position: relative; z-index: 1; }
`;

const CollantVexel: React.FC = () => {
    const ref = React.useRef<HTMLAnchorElement>(null);
    const suivre = (e: React.PointerEvent<HTMLAnchorElement>) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.style.setProperty('--rx', `${((0.5 - y) * 10).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`);
    };
    const relacher = () => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--mx', '30%');
        el.style.setProperty('--my', '30%');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
    };
    return (
        <a
            ref={ref}
            href="https://vexelwebstudio.com"
            target="_blank"
            rel="noopener"
            aria-label="Site créé par Vexel Webstudio"
            onPointerMove={suivre}
            onPointerLeave={relacher}
            className="spf-foil inline-flex items-center gap-3 rounded-[15px] px-4 py-3 select-none"
        >
            <span aria-hidden className="spf-foil-sheen" />
            <span aria-hidden className="spf-foil-grain" />
            <img src="/vexel-logo.png" alt="" width={329} height={320} className="relative h-10 w-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
            <span className="relative flex flex-col leading-none">
                <span className="text-[0.625rem] font-semibold uppercase tracking-[0.22em] text-white/70">Site créé par</span>
                <span className="mt-1 font-prata text-[1.05rem] text-white">Vexel Webstudio</span>
            </span>
        </a>
    );
};

export const PiedDePageSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    if (!sectionVisible(config, 'pied')) return null;
    return (
        <footer className="relative w-full bg-[#050505] border-t border-white/10 px-6 md:px-14 py-14">
            <style>{FOIL_CSS}</style>
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <p className="font-cinzel text-[13px] uppercase tracking-[0.4em] text-neutral-500 text-center md:text-left">
                    {t('Powered by Le Salon des Inconnus', 'Porté par Le Salon des Inconnus')}
                </p>
                <CollantVexel />
            </div>
        </footer>
    );
};
