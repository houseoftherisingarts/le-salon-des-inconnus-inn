// AuteurTemplate : le gabarit d'espace d'un écrivain, porté de Vexel Space
// (src/gabarits/auteur) par le module _vexel-base/modules/espace. Le nom en
// très grand et le livre le plus récent en volume, la bibliothèque, puis les
// premières pages dans un livre ouvert dont les feuilles tournent au
// défilement. Les autres sections suivent l'ordre et les interrupteurs de
// l'atelier; celles que le Profil Pro avait déjà (œuvres, rendez-vous,
// contact, liens, pied de page) restent celles du Salon.

import * as React from 'react';
import type { SectionId } from '../types';
import { ordreSections } from '../ordre';
import type { TemplateProps } from './shared';
import { EspaceRacine } from './EspaceRacine';
import { OeuvresSection, PriseRendezVousSection, ContactSection, LiensSection, PiedDePageSection } from './sections';
import { STYLE_AUTEUR } from './auteur/commun';
import { Hero } from './auteur/Hero';
import { Livres } from './auteur/Livres';
import { Extraits } from './auteur/Extraits';
import { Bio, Evenements, Presse } from './auteur/Sections';

const SECTIONS: Partial<Record<SectionId, React.FC<TemplateProps>>> = {
    livres: Livres,
    extraits: Extraits,
    evenements: Evenements,
    presse: Presse,
    oeuvres: OeuvresSection,
    bio: Bio,
    rendezvous: PriseRendezVousSection,
    contact: ContactSection,
    liens: LiensSection,
};

export const AuteurTemplate: React.FC<TemplateProps> = ({ config, uid, fallbackDisplayName, language = 'FR' }) => {
    const props = { config, uid, fallbackDisplayName, language };
    return (
        <EspaceRacine famille="ecrivain" theme={config.theme} className="es-auteur">
            <style>{STYLE_AUTEUR}</style>
            <Hero config={config} fallbackDisplayName={fallbackDisplayName} />
            <main id="contenu">
                {ordreSections(config, 'ecrivain').map((id) => {
                    if (config.sections?.[id] === false) return null;
                    const Section = SECTIONS[id];
                    return Section ? <Section key={id} {...props} /> : null;
                })}
                <PiedDePageSection {...props} />
            </main>
        </EspaceRacine>
    );
};
