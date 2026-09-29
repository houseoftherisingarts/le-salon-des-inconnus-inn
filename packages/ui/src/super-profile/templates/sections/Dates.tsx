// Dates : les prochains lieux, dans l'ordre où ils arrivent. Le jour en grand,
// comme sur une affiche de tournée, puis le lieu et la ville; le billet
// s'ouvre chez le diffuseur quand l'artiste a fourni le lien.

import * as React from 'react';
import { useTexte } from '../shared';
import { sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

function morceaux(iso: string, language: 'EN' | 'FR') {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return { jour: '', mois: iso, semaine: '' };
    const loc = language === 'FR' ? 'fr-CA' : 'en-CA';
    return {
        jour: String(d.getDate()).padStart(2, '0'),
        mois: `${d.toLocaleDateString(loc, { month: 'short' }).replace('.', '')} ${d.getFullYear()}`,
        semaine: d.toLocaleDateString(loc, { weekday: 'long' }),
    };
}

export const DatesSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const dates = [...(config.dates ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    if (!sectionVisible(config, 'dates') || dates.length === 0) return null;
    return (
        <SectionShell eyebrowEn="Upcoming" eyebrowFr="Dates" language={language} id="dates" tone="graphite">
            <SectionTitle>{t('On the road', 'Les prochaines dates')}</SectionTitle>
            <ul className="border-t border-[color:var(--es-edge)]">
                {dates.map((d, i) => {
                    const m = morceaux(d.date, language);
                    return (
                        <li
                            key={`${d.date}-${d.lieu}-${i}`}
                            className="group grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] items-center gap-x-5 md:gap-x-10 gap-y-3 py-6 md:py-7 border-b border-[color:var(--es-edge)] transition-colors hover:bg-[color:var(--es-glass)] px-1 md:px-4"
                        >
                            <div className="flex items-baseline gap-3 w-[7.5rem] md:w-[10rem]">
                                <span className="es-display text-5xl md:text-6xl leading-none tabular-nums text-[color:var(--es-accent)]">{m.jour}</span>
                                <span className="es-label text-[13px] uppercase tracking-[0.2em] text-[color:var(--es-ink-2)]">{m.mois}</span>
                            </div>
                            <div className="min-w-0">
                                <p className="es-display text-xl md:text-2xl leading-tight text-[color:var(--es-ink)]">{d.lieu}</p>
                                <p className="es-body text-[15px] text-[color:var(--es-ink-2)] mt-1 first-letter:uppercase">
                                    {m.semaine} · {d.ville}
                                </p>
                            </div>
                            {d.lienBillets && (
                                <a
                                    href={d.lienBillets}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    aria-label={t(`Tickets for ${d.lieu}`, `Billets pour ${d.lieu}`)}
                                    className="col-start-2 md:col-start-auto justify-self-start md:justify-self-end inline-flex items-center min-h-[44px] px-5 rounded-full border border-[color:var(--es-edge)] es-label text-[13px] uppercase tracking-[0.25em] text-[color:var(--es-ink)] hover:text-[color:var(--es-accent-ink)] hover:bg-[color:var(--es-accent)] hover:border-transparent transition-colors"
                                >
                                    {t('Ticket', 'Billet')}
                                </a>
                            )}
                        </li>
                    );
                })}
            </ul>
        </SectionShell>
    );
};
