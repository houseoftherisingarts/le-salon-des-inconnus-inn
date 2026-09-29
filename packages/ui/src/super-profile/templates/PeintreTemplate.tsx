// PeintreTemplate : le gabarit Profil Pro d'un peintre (et, par la même
// famille de gabarit, sculpteur, artisan, artiste numérique). Une galerie à
// la tombée du jour, l'or porté par les œuvres plutôt que par un aplat.
//
// Le hero reprend les trois couches des Super Profiles d'origine (fond, nom
// géant, découpe) mais en `relative` : ceci est un vrai site qui défile,
// pas un seul écran fixe. Les sections suivent, chacune s'éteignant depuis
// l'admin via config.sections.

import * as React from 'react';
import type { SectionId } from '../types';
import { ordreSections } from '../ordre';
import type { TemplateProps } from './shared';
import { EspaceRacine } from './EspaceRacine';
import {
    HeroSection, OeuvresSection, BioSection, ExpositionsSection, AtelierSection,
    PriseRendezVousSection, ContactSection, LiensSection, PiedDePageSection,
} from './sections';

const SECTIONS: Partial<Record<SectionId, React.FC<TemplateProps>>> = {
    oeuvres: OeuvresSection,
    bio: BioSection,
    expositions: ExpositionsSection,
    atelier: AtelierSection,
    rendezvous: PriseRendezVousSection,
    contact: ContactSection,
    liens: LiensSection,
};

export const PeintreTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const fondUrl = config.oeuvres?.[0]?.url ?? config.works?.[0]?.url;
    const props = { config, uid, fallbackDisplayName, language };
    return (
        <EspaceRacine famille="peintre" theme={config.theme}>
            <HeroSection
                config={config}
                fallbackDisplayName={fallbackDisplayName}
                language={language}
                ambiance="galerie"
                fondUrl={fondUrl}
            />
            <div id="contenu">
                {ordreSections(config, 'peintre').map((id) => {
                    const Section = SECTIONS[id];
                    return Section ? <Section key={id} {...props} /> : null;
                })}
                <PiedDePageSection {...props} />
            </div>
        </EspaceRacine>
    );
};
