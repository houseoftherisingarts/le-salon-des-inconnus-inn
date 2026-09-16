// PiedDePage : le pied de page pleine largeur de chaque gabarit, avec le
// collant Vexel en foil holographique (règle d'Alex du 11 septembre : toujours
// en foil, sur tout site). Le collant et sa carte vivent dans CollantVexel.tsx
// depuis le 16 septembre 2026, pour que le pied de page du Salon le réemploie.

import * as React from 'react';
import { useTexte } from '../shared';
import { sectionVisible, type SectionProps } from './common';
import { CollantVexel } from './CollantVexel';

export const PiedDePageSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    if (!sectionVisible(config, 'pied')) return null;
    return (
        <footer className="relative w-full bg-[#050505] border-t border-white/10 px-6 md:px-14 py-14">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <a
                    href="/centre"
                    className="inline-flex items-center min-h-[44px] font-cinzel text-[13px] uppercase tracking-[0.4em] text-neutral-500 hover:text-[#c5a059] transition-colors text-center md:text-left"
                >
                    {t('Powered by Le Salon des Inconnus', 'Porté par Le Salon des Inconnus')}
                </a>
                <CollantVexel language={language} />
            </div>
        </footer>
    );
};
