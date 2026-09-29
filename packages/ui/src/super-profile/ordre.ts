// ordre.ts : l'ordre des sections d'un espace.
//
// Chaque famille a son ordre par défaut (docs/ESPACES-DESIGN.md). L'atelier
// enregistre dans config.ordre l'ordre choisi par l'artiste; ordreSections()
// le relit en gardant seulement les identifiants connus de la famille, puis
// ajoute à la suite, dans l'ordre par défaut, ceux qui manquent. Le hero et
// le pied de page ne figurent pas ici : ils restent en tête et en queue.

import { familleGabarit, sectionsParDefaut, type FamilleGabarit } from './artistes';
import type { ArtistType, SectionId, SectionsConfig, SuperProfileConfig } from './types';

export const SECTIONS_PAR_FAMILLE: Record<FamilleGabarit, SectionId[]> = {
    musicien: ['ecoute', 'dates', 'boutique', 'presse', 'bio', 'rendezvous', 'contact', 'liens'],
    peintre: ['oeuvres', 'boutique', 'expositions', 'atelier', 'bio', 'presse', 'rendezvous', 'contact', 'liens'],
    photographe: ['series', 'tarifs', 'rendezvous', 'bio', 'presse', 'contact', 'liens'],
    ecrivain: ['livres', 'oeuvres', 'bio', 'rendezvous', 'contact', 'liens'],
};

export function ordreSections(config: Pick<SuperProfileConfig, 'ordre'>, famille: FamilleGabarit): SectionId[] {
    const defaut = SECTIONS_PAR_FAMILLE[famille] ?? SECTIONS_PAR_FAMILLE.ecrivain;
    const choisi = (config.ordre ?? []).filter((id, i, tous) => defaut.includes(id) && tous.indexOf(id) === i);
    return [...choisi, ...defaut.filter((id) => !choisi.includes(id))];
}

/** Monte (-1) ou descend (+1) une section d'un cran; renvoie un nouvel ordre. */
export function deplacer<T>(ordre: T[], id: T, sens: -1 | 1): T[] {
    const i = ordre.indexOf(id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= ordre.length) return ordre;
    const suivant = [...ordre];
    [suivant[i], suivant[j]] = [suivant[j], suivant[i]];
    return suivant;
}

/**
 * Les interrupteurs après un changement de type. Tout ce que l'artiste a
 * déjà réglé reste tel quel (le contenu commun ne bouge pas); seules les
 * sections propres à la nouvelle famille, qu'il n'a jamais pu régler,
 * prennent leur valeur par défaut. Sans ça, un musicien devenu peintre
 * garderait son mur d'œuvres éteint.
 */
export function sectionsApresChangement(sections: SectionsConfig | undefined, ancien: ArtistType, nouveau: ArtistType): SectionsConfig {
    const defauts = sectionsParDefaut(nouveau);
    if (!sections) return defauts;
    const avant = SECTIONS_PAR_FAMILLE[familleGabarit(ancien)] ?? [];
    const suivant: SectionsConfig = { ...sections };
    for (const id of SECTIONS_PAR_FAMILLE[familleGabarit(nouveau)] ?? []) {
        if (!avant.includes(id)) suivant[id] = defauts[id] ?? true;
    }
    return suivant;
}
