// PhotoTemplate : le gabarit d'espace d'un photographe. L'obturateur s'ouvre
// sur une photo plein écran, puis les séries défilent de côté, section
// épinglée sur grand écran et bande unique au téléphone. Les tarifs, la
// prise de rendez-vous et les autres sections suivent l'ordre et les
// interrupteurs de l'atelier.

import * as React from 'react';
import type { SectionId } from '../types';
import { ordreSections } from '../ordre';
import type { TemplateProps } from './shared';
import { EspaceRacine } from './EspaceRacine';
import {
    PhotoHero, SeriesSection, TarifsSection, BioSection, PresseSection,
    PriseRendezVousSection, ContactSection, LiensSection, PiedDePageSection,
} from './sections';

const SECTIONS: Partial<Record<SectionId, React.FC<TemplateProps>>> = {
    series: SeriesSection,
    tarifs: TarifsSection,
    rendezvous: PriseRendezVousSection,
    bio: BioSection,
    presse: PresseSection,
    contact: ContactSection,
    liens: LiensSection,
};

export const PhotoTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const props = { config, uid, fallbackDisplayName, language };
    return (
        <EspaceRacine famille="photographe" theme={config.theme}>
            <PhotoHero config={config} fallbackDisplayName={fallbackDisplayName} language={language} />
            <main id="contenu">
                {ordreSections(config, 'photographe').map((id) => {
                    const Section = SECTIONS[id];
                    return Section ? <Section key={id} {...props} /> : null;
                })}
                <PiedDePageSection {...props} />
            </main>
        </EspaceRacine>
    );
};
