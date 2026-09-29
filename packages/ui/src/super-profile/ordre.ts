// ordre.ts : l'ordre des sections d'un espace.
//
// Chaque famille a son ordre par défaut (docs/ESPACES-DESIGN.md). L'atelier
// enregistre dans config.ordre l'ordre choisi par l'artiste; ordreSections()
// le relit en gardant seulement les identifiants connus de la famille, puis
// ajoute à la suite, dans l'ordre par défaut, ceux qui manquent. Le hero et
// le pied de page ne figurent pas ici : ils restent en tête et en queue.

import type { FamilleGabarit } from './artistes';
import type { SectionId, SuperProfileConfig } from './types';

export const SECTIONS_PAR_FAMILLE: Record<FamilleGabarit, SectionId[]> = {
    musicien: ['ecoute', 'dates', 'boutique', 'presse', 'bio', 'rendezvous', 'contact', 'liens'],
    peintre: ['oeuvres', 'bio', 'expositions', 'atelier', 'rendezvous', 'contact', 'liens'],
    photographe: ['oeuvres', 'bio', 'rendezvous', 'contact', 'liens'],
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
