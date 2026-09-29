// Dates : les prochains lieux, dans l'ordre où ils arrivent.

import * as React from 'react';
import { useTexte } from '../shared';
import { CARD_GLASS, formatDateCourte, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

export const DatesSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const dates = [...(config.dates ?? [])].sort((a, b) => a.date.localeCompare(b.date));
    if (!sectionVisible(config, 'dates') || dates.length === 0) return null;
    return (
        <SectionShell eyebrowEn="Upcoming" eyebrowFr="Dates" language={language} id="dates" tone="graphite">
            <SectionTitle>{t('On the road', 'Les prochaines dates')}</SectionTitle>
            <ul className="divide-y divide-[color:var(--es-edge)]">
                {dates.map((d, i) => (
                    <li key={`${d.date}-${d.lieu}-${i}`} className={`flex flex-wrap items-center justify-between gap-4 py-5 px-2 ${i === 0 ? 'rounded-t-[15px]' : ''}`}>
                        <div>
                            <p className="es-display text-[color:var(--es-ink)] text-xl">{d.lieu}</p>
                            <p className="es-body text-sm text-[color:var(--es-ink-2)] mt-1">{d.ville} · {formatDateCourte(d.date, language)}</p>
                        </div>
                        {d.lienBillets && (
                            <a
                                href={d.lienBillets}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={`shrink-0 px-5 py-2.5 es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-ink)] hover:text-[color:var(--es-accent-ink)] hover:bg-[color:var(--es-accent)] transition-colors ${CARD_GLASS}`}
                            >
                                {t('Tickets', 'Billets')}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </SectionShell>
    );
};
