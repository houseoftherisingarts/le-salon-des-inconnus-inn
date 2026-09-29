// MusicienTemplate : le gabarit d'espace d'un musicien (et, par la même
// famille de gabarit, artiste de scène, cinéaste). La salle avant le premier
// accord : un hero de scène, les pistes en avant, les dates qui
// s'enchaînent, la boutique, puis le reste dans l'ordre choisi à l'atelier.
// Le lecteur est partagé par toute la page : la liste des pistes le lance,
// la barre collante le garde sous la main, le halo du hero bat avec lui.

import * as React from 'react';
import type { SectionId } from '../types';
import { ordreSections } from '../ordre';
import type { TemplateProps } from './shared';
import { EspaceRacine } from './EspaceRacine';
import { LecteurProvider } from './lecteur/LecteurContexte';
import { LecteurCollant } from './lecteur/LecteurCollant';
import {
    MusicienHero, BioSection, EcouteSection, DatesSection, PresseSection, BoutiqueSection,
    PriseRendezVousSection, ContactSection, LiensSection, PiedDePageSection,
} from './sections';

const SECTIONS: Partial<Record<SectionId, React.FC<TemplateProps>>> = {
    ecoute: EcouteSection,
    dates: DatesSection,
    boutique: BoutiqueSection,
    presse: PresseSection,
    bio: BioSection,
    rendezvous: PriseRendezVousSection,
    contact: ContactSection,
    liens: LiensSection,
};

export const MusicienTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const fondUrl = config.works?.[0]?.url ?? config.oeuvres?.[0]?.url;
    const props = { config, uid, fallbackDisplayName, language };
    return (
        <EspaceRacine famille="musicien" theme={config.theme}>
            <LecteurProvider pistes={config.pistes ?? []}>
                <MusicienHero config={config} fallbackDisplayName={fallbackDisplayName} language={language} fondUrl={fondUrl} />
                <main id="contenu">
                    {ordreSections(config, 'musicien').map((id) => {
                        const Section = SECTIONS[id];
                        return Section ? <Section key={id} {...props} /> : null;
                    })}
                    <PiedDePageSection {...props} />
                </main>
                <LecteurCollant language={language} />
            </LecteurProvider>
        </EspaceRacine>
    );
};
