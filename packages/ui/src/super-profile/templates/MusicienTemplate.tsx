// MusicienTemplate : le gabarit Profil Pro d'un musicien (et, par la même
// famille de gabarit, artiste de scène, cinéaste). La salle avant le premier
// accord : contrastes forts, écoute en avant, les dates qui s'enchaînent.

import * as React from 'react';
import type { TemplateProps } from './shared';
import {
    HeroSection, BioSection, EcouteSection, DatesSection, PresseSection,
    PriseRendezVousSection, ContactSection, LiensSection, PiedDePageSection,
} from './sections';

export const MusicienTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const fondUrl = config.works?.[0]?.url ?? config.oeuvres?.[0]?.url;
    return (
        <div className="bg-[#050505] text-white font-lato">
            <HeroSection
                config={config}
                fallbackDisplayName={fallbackDisplayName}
                language={language}
                ambiance="scene"
                fondUrl={fondUrl}
                workCountLabel={language === 'FR' ? 'dates' : 'dates'}
            />
            <div id="contenu">
                <EcouteSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <DatesSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <PresseSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <BioSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <PriseRendezVousSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <ContactSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <LiensSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
                <PiedDePageSection config={config} uid={uid} fallbackDisplayName={fallbackDisplayName} language={language} />
            </div>
        </div>
    );
};
