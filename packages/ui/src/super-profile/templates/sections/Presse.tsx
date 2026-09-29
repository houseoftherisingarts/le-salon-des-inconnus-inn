// Presse : les citations qu'on a écrites sur l'artiste, plus le dossier de
// presse (EPK) quand il existe. Jamais d'italique (canon du Salon) : la
// citation se distingue par le guillemet et par un filet, pas par la police.

import * as React from 'react';
import { useTexte } from '../shared';
import { CARD_GLASS, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

export const PresseSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const citations = config.presse ?? [];
    if (!sectionVisible(config, 'presse') || (citations.length === 0 && !config.lienEPK)) return null;
    return (
        <SectionShell eyebrowEn="Press" eyebrowFr="Presse" language={language} id="presse">
            <div className="flex flex-wrap items-end justify-between gap-6 -mt-4 mb-10">
                <SectionTitle>{t('What they wrote', 'Ce qu’on en a écrit')}</SectionTitle>
                {config.lienEPK && (
                    <a
                        href={config.lienEPK}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={`shrink-0 px-5 py-2.5 es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-ink)] hover:text-[color:var(--es-accent-ink)] hover:bg-[color:var(--es-accent)] transition-colors ${CARD_GLASS}`}
                    >
                        {t('Press kit', 'Dossier de presse')}
                    </a>
                )}
            </div>
            {citations.length > 0 && (
                <div className={`grid grid-cols-1 gap-4 ${citations.length > 1 ? 'md:grid-cols-2' : ''}`}>
                    {citations.map((c, i) => (
                        <blockquote key={i} className={`${citations.length > 1 ? 'p-6' : 'p-8 md:p-12'} ${CARD_GLASS}`}>
                            <p className={`es-display text-[color:var(--es-ink)] leading-snug ${citations.length > 1 ? 'text-lg' : 'text-2xl md:text-3xl max-w-4xl'}`}>&laquo;&nbsp;{c.citation}&nbsp;&raquo;</p>
                            {(c.source || c.lienArticle) && (
                                <footer className="mt-4 es-label text-[13px] uppercase tracking-[0.3em] text-[color:var(--es-ink-2)]">
                                    {c.lienArticle ? (
                                        <a href={c.lienArticle} target="_blank" rel="noreferrer noopener" className="hover:text-[color:var(--es-accent)] transition-colors">
                                            {c.source || c.lienArticle}
                                        </a>
                                    ) : c.source}
                                </footer>
                            )}
                        </blockquote>
                    ))}
                </div>
            )}
        </SectionShell>
    );
};
