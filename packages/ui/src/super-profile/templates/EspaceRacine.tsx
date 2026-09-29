// EspaceRacine : la racine commune de tous les gabarits d'espace.
//
// Elle résout le thème (themes.ts), pose les variables --es-* sur un seul
// élément, charge la paire de polices choisie et elle seule, et fournit les
// classes utilitaires .es-* que les sections emploient à la place de toute
// couleur ou police écrite en dur. Un gabarit qui s'enveloppe dans
// EspaceRacine hérite donc d'un coup de la palette, des polices et de
// l'accent choisis dans l'atelier.

import * as React from 'react';
import type { FamilleGabarit } from '../artistes';
import type { ThemeEspace } from '../types';
import { resoudreTheme } from '../themes';

const STYLE = `
.es-racine{background:var(--es-bg);color:var(--es-ink);font-family:var(--es-font-body);}
.es-display{font-family:var(--es-font-display);font-weight:var(--es-weight-display);}
.es-label{font-family:var(--es-font-label);font-weight:var(--es-weight-label);}
.es-body{font-family:var(--es-font-body);}
.es-verre{background:var(--es-glass);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border:1px solid var(--es-edge);border-radius:var(--es-radius);}
@keyframes es-monte{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:none;}}
@keyframes es-souffle{0%,100%{transform:scale(1);opacity:.85;}50%{transform:scale(1.06);opacity:1;}}
@keyframes es-eq{0%,100%{transform:scaleY(.35);}50%{transform:scaleY(1);}}
@keyframes es-tourne{to{transform:rotate(360deg);}}
@keyframes es-rideau{from{transform:scaleY(1);}to{transform:scaleY(0);}}
.es-monte{animation:es-monte .9s cubic-bezier(.2,.7,.2,1) both;}
@media (prefers-reduced-motion: reduce){
  .es-racine *,.es-racine *::before,.es-racine *::after{animation:none!important;transition-duration:0s!important;}
}
`;

interface EspaceRacineProps {
    famille: FamilleGabarit;
    theme?: ThemeEspace;
    className?: string;
    children: React.ReactNode;
}

export const EspaceRacine: React.FC<EspaceRacineProps> = ({ famille, theme, className, children }) => {
    const resolu = React.useMemo(() => resoudreTheme(famille, theme), [famille, theme]);

    React.useEffect(() => {
        const id = `es-fonts-${resolu.paire.id}`;
        if (document.getElementById(id)) return;
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = resolu.urlFonts;
        document.head.appendChild(link);
    }, [resolu]);

    return (
        <div
            className={`es-racine ${className ?? ''}`}
            data-palette={resolu.palette.id}
            data-sombre={resolu.palette.sombre ? 'oui' : 'non'}
            style={resolu.vars as React.CSSProperties}
        >
            <style>{STYLE}</style>
            {children}
        </div>
    );
};
