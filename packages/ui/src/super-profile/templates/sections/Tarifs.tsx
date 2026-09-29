// Tarifs : les forfaits du photographe, en lignes de carte des vins. Le nom
// à gauche, le prix aligné à droite en chiffres tabulaires, la description
// dessous, et « Réserver » quand le forfait porte un lien https.

import * as React from 'react';
import { lienHttpsValide } from '../../types';
import { useTexte } from '../shared';
import { formatPrixCents, sectionVisible, type SectionProps } from './common';

export const TarifsSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const tarifs = (config.tarifs ?? []).filter((x) => x.nom?.trim());
    if (!sectionVisible(config, 'tarifs') || tarifs.length === 0) return null;
    return (
        <section id="tarifs" className="relative w-full border-t border-[color:var(--es-edge)] bg-[color:var(--es-bg-2)] px-6 md:px-14 py-20 md:py-28">
            <div className="max-w-[1480px] mx-auto grid md:grid-cols-12 gap-10 md:gap-8">
                <div className="md:col-span-4">
                    <p className="es-label text-[color:var(--es-accent)] text-[13px] uppercase tracking-[0.4em] mb-5">{t('Rates', 'Tarifs')}</p>
                    <h2 className="es-display text-[color:var(--es-ink)] text-4xl md:text-6xl leading-[1.05]">{t('Sessions', 'Les séances')}</h2>
                </div>
                <ul className="md:col-span-8 border-t border-[color:var(--es-line)]">
                    {tarifs.map((x) => {
                        const lien = lienHttpsValide(x.lien) ? x.lien : undefined;
                        return (
                            <li key={x.id} className="border-b border-[color:var(--es-line)] py-7 md:py-9 grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 items-baseline">
                                <h3 className="es-display text-[color:var(--es-ink)] text-2xl md:text-3xl leading-tight">{x.nom}</h3>
                                {typeof x.prix === 'number' && x.prix > 0 && <p className="es-label text-[color:var(--es-accent)] text-lg md:text-xl tracking-[0.06em] tabular-nums text-right">{formatPrixCents(Math.round(x.prix * 100))}</p>}
                                {x.description && <p className="es-body col-span-2 md:col-span-1 text-[color:var(--es-ink-2)] text-base md:text-lg leading-relaxed max-w-2xl">{x.description}</p>}
                                {lien && (
                                    <a
                                        href={lien}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-2 justify-self-start md:justify-self-end inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full border border-[color:var(--es-line)] es-label text-[13px] uppercase tracking-[0.2em] text-[color:var(--es-ink)] hover:border-[color:var(--es-accent)] hover:text-[color:var(--es-accent)] transition-colors"
                                    >
                                        {t('Book', 'Réserver')}
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden><path d="M7 17 17 7" /><path d="M7 7h10v10" /></svg>
                                    </a>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
};
