// Bio : la démarche de l'artiste, en un paragraphe qui respire. Le texte
// vient de l'artiste lui-même : on le rend tel quel, sans le réécrire.

import * as React from 'react';
import { useTexte } from '../shared';
import { sectionVisible, SectionShell, SectionTitle, type SectionProps } from './common';

export const BioSection: React.FC<SectionProps> = ({ config, language = 'FR' }) => {
    const t = useTexte(language);
    if (!sectionVisible(config, 'bio') || !config.bio) return null;
    return (
        <SectionShell eyebrowEn="About" eyebrowFr="Démarche" language={language} id="bio" tone="graphite">
            <SectionTitle>{t('The practice', 'La démarche')}</SectionTitle>
            <p className="font-lato text-neutral-300 text-base md:text-lg leading-relaxed max-w-3xl whitespace-pre-line">
                {config.bio}
            </p>
        </SectionShell>
    );
};
