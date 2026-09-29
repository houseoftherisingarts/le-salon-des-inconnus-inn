// Pistes : la liste des pistes déposées par l'artiste, au-dessus des liens
// de plateformes dans la section Écoute. Chaque ligne lance la piste dans le
// lecteur partagé (LecteurContexte), qui garantit qu'une seule joue à la fois
// et fait apparaître la barre collante.

import * as React from 'react';
import type { PisteEspace } from '../../types';
import { formatDuree, useLecteur } from '../lecteur/LecteurContexte';
import { IconeLecture } from '../lecteur/LecteurCollant';

const Egaliseur: React.FC = () => (
    <span aria-hidden className="inline-flex items-end gap-[3px] h-4">
        {[0, 1, 2].map((k) => (
            <span
                key={k}
                className="w-[3px] rounded-full bg-[color:var(--es-accent)]"
                style={{ height: '100%', transformOrigin: 'bottom', animation: `es-eq ${0.7 + k * 0.18}s ease-in-out ${k * 0.12}s infinite` }}
            />
        ))}
    </span>
);

export const ListePistes: React.FC<{ pistes: PisteEspace[]; language?: 'EN' | 'FR' }> = ({ pistes, language = 'FR' }) => {
    const lecteur = useLecteur();
    if (!lecteur || pistes.length === 0) return null;
    const fr = language === 'FR';
    return (
        <ol className="es-verre overflow-hidden divide-y divide-[color:var(--es-edge)] mb-8" data-pistes>
            {pistes.map((p, i) => {
                const active = lecteur.courant === i;
                const joue = active && lecteur.enLecture;
                return (
                    <li key={p.id}>
                        <button
                            type="button"
                            onClick={() => lecteur.jouer(i)}
                            aria-label={`${joue ? (fr ? 'Pause' : 'Pause') : (fr ? 'Écouter' : 'Play')} ${p.titre}`}
                            aria-pressed={joue}
                            className={`group w-full flex items-center gap-4 md:gap-6 px-4 md:px-6 py-4 md:py-5 text-left transition-colors ${
                                active ? 'bg-[color:var(--es-glow)]' : 'hover:bg-[color:var(--es-glass)]'
                            }`}
                        >
                            <span className="es-display text-2xl md:text-3xl tabular-nums w-10 text-[color:var(--es-accent)]">
                                {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="flex-1 min-w-0 es-body text-base md:text-lg text-[color:var(--es-ink)] truncate">{p.titre}</span>
                            {joue ? <Egaliseur /> : null}
                            <span className="es-body text-[13px] tabular-nums text-[color:var(--es-ink-2)]">{formatDuree(p.duree)}</span>
                            <span className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center border border-[color:var(--es-edge)] text-[color:var(--es-ink)] group-hover:bg-[color:var(--es-accent)] group-hover:text-[color:var(--es-accent-ink)] group-hover:border-transparent transition-colors">
                                <IconeLecture enLecture={joue} className="w-4 h-4" />
                            </span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
};
