// Liens : la grille de tous les liens externes de l'artiste (Instagram,
// site, boutique, réservation), en cartes plutôt qu'en icônes discrètes.

import * as React from 'react';
import type { SuperProfileLinks } from '../../types';
import { useTexte } from '../shared';
import { CARD_GLASS, sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

const LIBELLES: Record<keyof SuperProfileLinks, { en: string; fr: string }> = {
    instagram: { en: 'Instagram', fr: 'Instagram' },
    website: { en: 'Website', fr: 'Site web' },
    buy: { en: 'Shop', fr: 'Boutique' },
    booking: { en: 'Book', fr: 'Réserver' },
};

export const LiensSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    const links = config.links;
    const entries = links
        ? (Object.keys(LIBELLES) as Array<keyof SuperProfileLinks>).filter((k) => links[k])
        : [];
    if (!sectionVisible(config, 'liens') || entries.length === 0) return null;
    return (
        <SectionShell eyebrowEn="Elsewhere" eyebrowFr="Ailleurs" language={language} id="liens">
            <SectionTitle>{t('Find the work elsewhere', 'Retrouver le travail ailleurs')}</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entries.map((k) => (
                    <a
                        key={k}
                        href={links![k]}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={`flex items-center justify-between px-6 py-5 hover:border-[#c5a059]/50 transition-colors ${CARD_GLASS}`}
                    >
                        <span className="font-cinzel text-[13px] uppercase tracking-[0.3em] text-[#f3e5ab]">
                            {t(LIBELLES[k].en, LIBELLES[k].fr)}
                        </span>
                        <span className="text-[#c5a059]">↗</span>
                    </a>
                ))}
            </div>
        </SectionShell>
    );
};
