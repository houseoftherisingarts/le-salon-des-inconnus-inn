// PiedEcosysteme : la bande de pied de page commune aux apps des Inconnus
// (vague 3 de l'écosystème, 16 septembre 2026). Elle porte le collant Vexel en
// foil et, à gauche, soit la mention « Un projet créatif du Salon des
// Inconnus » avec le sigle doré, soit une ligne de liens (le hub y met les
// trois maisons). Couleurs en style en ligne et polices remises au canon du
// Salon dans la bande, pour que les thèmes du Creator Studio (qui repeignent
// .font-cinzel, .font-prata et .text-white) ne la rendent jamais illisible.

import * as React from 'react';
import { CollantVexel } from '../super-profile/templates/sections/CollantVexel';

const SALON_URL = 'https://www.lesalondesinconnus.com/';
const CREME = '#f3e5ab';
const OR = '#c5a059';

const CANON_CSS = `
.pied-eco .font-prata, [data-studio-theme] .pied-eco.pied-eco .font-prata { font-family: 'Prata', Georgia, serif !important; font-weight: 400 !important; text-transform: none !important; letter-spacing: normal !important; }
.pied-eco .font-cinzel, [data-studio-theme] .pied-eco.pied-eco .font-cinzel { font-family: 'Cinzel', 'Times New Roman', serif !important; text-transform: uppercase !important; }
[data-studio-theme] .pied-eco.pied-eco .font-cinzel.font-bold { font-weight: 700 !important; }
[data-studio-theme] .pied-eco.pied-eco .pied-eco-mention { letter-spacing: 0.2em !important; }
[data-studio-theme] .pied-eco.pied-eco .font-prata.text-white { color: #fff !important; background: none !important; -webkit-background-clip: border-box !important; background-clip: border-box !important; -webkit-text-stroke: 0 !important; }
[data-studio-theme] .pied-eco.pied-eco .font-lato, [data-studio-theme] .pied-eco.pied-eco .font-sans { font-family: 'Lato', system-ui, sans-serif !important; }
.pied-eco-lien { transition: color 200ms cubic-bezier(0.22,1,0.36,1); }
.pied-eco-lien:hover, .pied-eco-lien:focus-visible { color: ${CREME} !important; }
`;

export type LienEcosysteme = { label: string; href: string };

export const PiedEcosysteme: React.FC<{
    language: 'EN' | 'FR';
    /** Remplace la mention du Salon par une ligne de liens. */
    liens?: LienEcosysteme[];
    /** Petit titre au-dessus des liens. */
    titreLiens?: string;
    className?: string;
}> = ({ language, liens, titreLiens, className = '' }) => (
    <footer
        className={`pied-eco relative w-full px-5 md:px-10 lg:px-16 py-7 md:py-8 ${className}`}
        style={{ background: 'rgba(10,8,8,0.92)', borderTop: `1px solid rgba(197,160,89,0.22)` }}
    >
        <style>{CANON_CSS}</style>
        <div className="flex flex-col md:flex-row items-center md:justify-between gap-6">
            {liens ? (
                <nav aria-label={titreLiens} className="flex flex-col items-center md:items-start gap-3">
                    {titreLiens && (
                        <span className="font-cinzel text-[11px] tracking-[0.32em]" style={{ color: OR }}>{titreLiens}</span>
                    )}
                    <ul className="flex flex-wrap justify-center md:justify-start gap-x-7 gap-y-2">
                        {liens.map((l) => (
                            <li key={l.href}>
                                <a href={l.href} className="pied-eco-lien font-prata text-[1.05rem]" style={{ color: 'rgba(243,229,171,0.78)' }}>
                                    {l.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            ) : (
                <a
                    href={SALON_URL}
                    className="pied-eco-lien group flex items-center gap-3.5 text-left"
                    style={{ color: 'rgba(243,229,171,0.85)' }}
                >
                    <img
                        src="/salon-logo-or.png"
                        alt=""
                        width={512}
                        height={512}
                        className="h-11 w-11 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(197,160,89,0.35)]"
                    />
                    <span className="pied-eco-mention font-cinzel text-[12px] md:text-[13px] font-bold tracking-[0.2em] leading-snug">
                        {language === 'FR' ? 'Un projet créatif du Salon des Inconnus' : 'A creative project of Le Salon des Inconnus'}
                    </span>
                </a>
            )}
            <CollantVexel language={language} />
        </div>
    </footer>
);
