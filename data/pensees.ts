// Pensée du jour — un paragraphe quotidien (philosophie, art, hospitalité),
// publié automatiquement chaque matin par le job com.alex.pensee-du-jour.
// La plus récente en premier. Ne pas éditer à la main sauf pour retirer
// une entrée refusée par Alex.

export interface Pensee {
    date: string;      // AAAA-MM-JJ
    title_fr: string;
    title_en: string;
    body_fr: string;   // un seul paragraphe
    body_en: string;
}

export const PENSEES: Pensee[] = [];
