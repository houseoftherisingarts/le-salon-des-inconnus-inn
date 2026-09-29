// PeintreTemplate : le gabarit d'espace d'un peintre (et, par la même
// famille de gabarit, sculpteur, artisan, artiste numérique). Une salle de
// galerie qui s'éclaire sur la première toile, puis le mur, où chaque œuvre
// se révèle sous le curseur et se pose à l'échelle dans une pièce au clic.
// Les autres sections suivent l'ordre et les interrupteurs de l'atelier.

import * as React from 'react';
import type { SectionId } from '../types';
import { ordreSections } from '../ordre';
import type { TemplateProps } from './shared';
import { EspaceRacine } from './EspaceRacine';
import {
    PeintreHero, MurOeuvresSection, BoutiqueSection, BioSection, ExpositionsSection, AtelierSection,
    PresseSection, PriseRendezVousSection, ContactSection, LiensSection, PiedDePageSection,
} from './sections';

const SECTIONS: Partial<Record<SectionId, React.FC<TemplateProps>>> = {
    oeuvres: MurOeuvresSection,
    boutique: BoutiqueSection,
    expositions: ExpositionsSection,
    atelier: AtelierSection,
    bio: BioSection,
    presse: PresseSection,
    rendezvous: PriseRendezVousSection,
    contact: ContactSection,
    liens: LiensSection,
};

export const PeintreTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const props = { config, uid, fallbackDisplayName, language };
    return (
        <EspaceRacine famille="peintre" theme={config.theme}>
            <PeintreHero config={config} fallbackDisplayName={fallbackDisplayName} language={language} />
            <main id="contenu">
                {ordreSections(config, 'peintre').map((id) => {
                    const Section = SECTIONS[id];
                    return Section ? <Section key={id} {...props} /> : null;
                })}
                <PiedDePageSection {...props} />
            </main>
        </EspaceRacine>
    );
};
