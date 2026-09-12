// PeintreTemplate : le gabarit Profil Pro d'un peintre (et, par la même
// famille de gabarit, sculpteur, artisan, artiste numérique). Une galerie à
// la tombée du jour, l'or porté par les œuvres plutôt que par un aplat.
//
// Le hero reprend les trois couches des Super Profiles d'origine (fond, nom
// géant, découpe) mais en `relative` : ceci est un vrai site qui défile,
// pas un seul écran fixe. Les sections suivent, chacune s'éteignant depuis
// l'admin via config.sections.

import * as React from 'react';
import type { TemplateProps } from './shared';
import {
    HeroSection, OeuvresSection, BioSection, ExpositionsSection, AtelierSection,
    PriseRendezVousSection, ContactSection, LiensSection, PiedDePageSection,
} from './sections';

export const PeintreTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const fondUrl = config.oeuvres?.[0]?.url ?? config.works?.[0]?.url;
    return (
        <div className="bg-[#050505] text-white font-lato">
            <HeroSection
                config={config}
                fallbackDisplayName={fallbackDisplayName}
                language={language}
                ambiance="galerie"
                fondUrl={fondUrl}
            />
            <div id="contenu">
                <OeuvresSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <BioSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <ExpositionsSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <AtelierSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <PriseRendezVousSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <ContactSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <LiensSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <PiedDePageSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
            </div>
        </div>
    );
};
