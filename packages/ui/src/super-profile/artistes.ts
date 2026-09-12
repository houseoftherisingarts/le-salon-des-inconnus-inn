// artistes.ts : le catalogue des dix types d'artiste du Profil Pro.
//
// Trois responsabilités, séparées volontairement de templates/index.ts (qui,
// lui, transforme un type en composant React) :
//   1. Les libellés FR/EN affichés dans l'admin et sur la page publique.
//   2. deduireType() : le pont entre l'ancien `medium` (photo, visual-art,
//      other) et le nouveau `type`, pour qu'un profil créé avant le Profil
//      Pro continue de s'afficher juste.
//   3. sectionsParDefaut() : quelles sections s'allument à la création d'un
//      profil de ce type, avant que l'artiste n'ait touché à rien.

import type { ArtistType, SectionsConfig, SuperProfileConfig, SuperProfileMedium } from './types';

export interface LibelleArtiste {
    fr: string;
    en: string;
    /** Phrase d'aide FR sous le sélecteur de type, dans l'admin. */
    aideFr: string;
    aideEn: string;
}

export const LIBELLES_ARTISTE: Record<ArtistType, LibelleArtiste> = {
    peintre: {
        fr: 'Peintre', en: 'Painter',
        aideFr: 'Mur de galerie, expositions, atelier ouvert sur rendez-vous.',
        aideEn: 'Gallery wall, exhibitions, studio open by appointment.',
    },
    musicien: {
        fr: 'Musicien ou musicienne', en: 'Musician',
        aideFr: 'Écoute en ligne, prochaines dates, presse et dossier de presse.',
        aideEn: 'Streaming links, upcoming dates, press and EPK.',
    },
    photographe: {
        fr: 'Photographe', en: 'Photographer',
        aideFr: 'Mosaïque de photos qui se révèlent au passage du curseur.',
        aideEn: 'Photo mosaic that reveals itself as the cursor passes.',
    },
    sculpteur: {
        fr: 'Sculpteur ou sculptrice', en: 'Sculptor',
        aideFr: 'Le gabarit du peintre, avec les étiquettes de la sculpture.',
        aideEn: "The painter's template, with sculpture-specific labels.",
    },
    ecrivain: {
        fr: 'Écrivain ou écrivaine', en: 'Writer',
        aideFr: 'Typographie éditoriale, bibliographie et liens d\'achat.',
        aideEn: 'Editorial typography, bibliography and buy links.',
    },
    scene: {
        fr: 'Artiste de scène', en: 'Performing artist',
        aideFr: 'Le gabarit du musicien, pensé pour les dates et la vidéo.',
        aideEn: "The musician's template, built for dates and video.",
    },
    cineaste: {
        fr: 'Cinéaste', en: 'Filmmaker',
        aideFr: 'Le gabarit du musicien, avec vos projections à venir.',
        aideEn: "The musician's template, with your upcoming screenings.",
    },
    artisan: {
        fr: 'Artisan ou artisane', en: 'Artisan',
        aideFr: 'Le gabarit du peintre, avec les étiquettes du métier d\'art.',
        aideEn: "The painter's template, with craft-specific labels.",
    },
    numerique: {
        fr: 'Artiste numérique', en: 'Digital artist',
        aideFr: 'Le gabarit du peintre, pour des pièces qui vivent à l\'écran.',
        aideEn: "The painter's template, for pieces that live on screen.",
    },
    autre: {
        fr: 'Autre pratique', en: 'Other practice',
        aideFr: 'Le gabarit éditorial existant, sobre et flexible.',
        aideEn: 'The existing editorial template, sober and flexible.',
    },
};

export const ORDRE_TYPES: ArtistType[] = [
    'peintre', 'musicien', 'photographe', 'sculpteur', 'ecrivain',
    'scene', 'cineaste', 'artisan', 'numerique', 'autre',
];

/**
 * Le type manque sur un profil créé avant le Profil Pro : on le déduit du
 * `medium` historique. photo → photographe, visual-art → peintre,
 * other → autre. `type` prime toujours quand il est déjà posé.
 */
export function deduireType(config: Pick<SuperProfileConfig, 'type' | 'medium'>): ArtistType {
    if (config.type) return config.type;
    const parMedium: Record<SuperProfileMedium, ArtistType> = {
        photo: 'photographe',
        'visual-art': 'peintre',
        other: 'autre',
    };
    return parMedium[config.medium] ?? 'autre';
}

/**
 * La famille de gabarit qui sert un type : sculpteur, artisan et numérique
 * empruntent celui du peintre; scène et cinéaste, celui du musicien.
 * photographe et écrivain gardent leur propre gabarit existant.
 */
export type FamilleGabarit = 'peintre' | 'musicien' | 'photographe' | 'ecrivain';

export function familleGabarit(type: ArtistType): FamilleGabarit {
    switch (type) {
        case 'peintre':
        case 'sculpteur':
        case 'artisan':
        case 'numerique':
            return 'peintre';
        case 'musicien':
        case 'scene':
        case 'cineaste':
            return 'musicien';
        case 'photographe':
            return 'photographe';
        case 'ecrivain':
        case 'autre':
        default:
            return 'ecrivain';
    }
}

/**
 * Les sections allumées par défaut à la création d'un profil de ce type.
 * L'artiste peut ensuite tout rallumer ou tout éteindre depuis Mon site.
 */
export function sectionsParDefaut(type: ArtistType): SectionsConfig {
    const base: SectionsConfig = {
        bio: true, rendezvous: true, contact: true, liens: true, pied: true,
        oeuvres: false, ecoute: false, dates: false, presse: false,
        expositions: false, livres: false, atelier: false,
    };
    switch (familleGabarit(type)) {
        case 'peintre':
            return { ...base, oeuvres: true, expositions: true, atelier: true };
        case 'musicien':
            return { ...base, ecoute: true, dates: true, presse: true };
        case 'photographe':
            return { ...base, oeuvres: true };
        case 'ecrivain':
        default:
            return { ...base, oeuvres: true, livres: true };
    }
}

/** Vrai si la section `id` doit se rendre : présente dans `sections` et à
 *  `true`, ou absente de `sections` (profil pas encore configuré). */
export function sectionAllumee(config: Pick<SuperProfileConfig, 'sections'>, id: keyof SectionsConfig): boolean {
    const v = config.sections?.[id];
    return v !== false;
}
