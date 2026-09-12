// Livres : la bibliographie, couverture d'abord, lien d'achat quand il existe.

import * as React from 'react';
import { useTexte } from '../shared';
import { CARD_GLASS, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

export const LivresSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const livres = config.livres ?? [];
    if (!sectionVisible(config, 'livres') || livres.length === 0) return null;
    return (
        <SectionShell eyebrowEn="Books" eyebrowFr="Livres" language={language} id="livres">
            <SectionTitle>{t('The books', 'Les livres')}</SectionTitle>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 md:gap-6">
                {livres.map((l, i) => (
                    <div key={`${l.titre}-${i}`} className="group">
                        <div className={`aspect-[2/3] overflow-hidden mb-3 ${CARD_GLASS}`}>
                            {l.couvertureUrl ? (
                                <img
                                    src={l.couvertureUrl}
                                    alt={l.titre}
                                    loading="lazy"
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center p-4 text-center">
                                    <span className="font-prata text-[#f3e5ab] text-sm">{l.titre}</span>
                                </div>
                            )}
                        </div>
                        <p className="font-lato text-sm text-neutral-200 leading-snug">{l.titre}</p>
                        {l.lienAchat && (
                            <a
                                href={l.lienAchat}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-[#c5a059] hover:text-[#f3e5ab] transition-colors"
                            >
                                {t('Buy', 'Se procurer')}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </SectionShell>
    );
};
