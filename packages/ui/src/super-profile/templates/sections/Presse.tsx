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
                        className={`shrink-0 px-5 py-2.5 font-cinzel text-[10px] uppercase tracking-[0.3em] text-[#f3e5ab] hover:text-[#050505] hover:bg-[#c5a059] transition-colors ${CARD_GLASS}`}
                    >
                        {t('Press kit', 'Dossier de presse')}
                    </a>
                )}
            </div>
            {citations.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {citations.map((c, i) => (
                        <blockquote key={i} className={`p-6 ${CARD_GLASS}`}>
                            <p className="font-prata text-[#f3e5ab] text-lg leading-snug">&laquo;&nbsp;{c.citation}&nbsp;&raquo;</p>
                            {(c.source || c.lienArticle) && (
                                <footer className="mt-4 font-cinzel text-[9px] uppercase tracking-[0.3em] text-neutral-400">
                                    {c.lienArticle ? (
                                        <a href={c.lienArticle} target="_blank" rel="noreferrer noopener" className="hover:text-[#c5a059] transition-colors">
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
