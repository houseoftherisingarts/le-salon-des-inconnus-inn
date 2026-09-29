// apercus.ts : les espaces témoins, servis sans compte à /apercu/{slug}
// (ApercuPage.tsx). Ceux du gabarit Musicien sont ici, à /apercu/musicien et
// /apercu/musicien-2; ceux du Peintre et du Photographe viennent de
// apercusPeintrePhoto.ts.
//
// Les deux artistes sont inventés, comme leurs salles, leurs disques et les
// mots de la presse. Les pistes sont de vrais enregistrements du domaine
// public, coupés à 90 secondes et servis par le site lui-même (d'où le halo
// qui suit la vraie musique). Aucun produit ne porte de lien de paiement :
// le prix s'affiche sans bouton, comme sur un espace dont l'artiste n'a pas
// encore branché Stripe.

import type { SuperProfileConfig } from './types';
import { APERCUS_PEINTRE_PHOTO } from './apercusPeintrePhoto';

const MEDIA = '/media/apercu';

const produit = (id: string, nom: string, description: string, prix: number, fichier: string, vendu = false) => ({
    id, nom, description, prix, vendu, photo: { url: `${MEDIA}/${fichier}`, storagePath: '' },
});

const piste = (id: string, titre: string, n: number) => ({
    id, titre, url: `${MEDIA}/piste-${n}.mp3`, storagePath: '', duree: 90,
});

const SECTIONS_APERCU = { rendezvous: false, contact: false, liens: false } as const;

export const APERCUS: Record<string, SuperProfileConfig> = {
    musicien: {
        enabled: true,
        username: 'oscar-vermeil',
        medium: 'other',
        type: 'musicien',
        works: [],
        displayName: 'Oscar Vermeil',
        tagline: 'Blues électrique et chansons de route, de Gatineau jusqu’à Gaspé.',
        theme: { palette: 'scene', fonts: 'affiche' },
        sections: { ...SECTIONS_APERCU },
        pistes: [
            piste('p1', 'Route 148, minuit', 1),
            piste('p2', 'Les néons de la rue Principale', 3),
            piste('p3', 'Dernier traversier', 4),
        ],
        dates: [
            { date: '2026-10-17', lieu: 'Le Quai des Lanternes', ville: 'Gatineau' },
            { date: '2026-11-07', lieu: 'Salle du Vieux Moulin', ville: 'Papineauville' },
            { date: '2026-11-28', lieu: 'Café de la Traverse', ville: 'Rimouski' },
            { date: '2027-01-23', lieu: 'Le Hangar à bateaux', ville: 'Gaspé' },
            { date: '2027-02-13', lieu: 'Théâtre du Pont-Levis', ville: 'Montréal' },
        ],
        produits: [
            produit('v1', 'Route 148, le vinyle', 'Douze chansons pressées sur vinyle rouge, avec les paroles glissées dans la pochette.', 38, 'vermeil-vinyle.svg'),
            produit('v2', 'Affiche de la tournée', 'Sérigraphie en deux couleurs sur papier épais, signée à la main au dos.', 25, 'vermeil-affiche.svg', true),
            produit('v3', 'Sac de la route', 'Un grand sac de coton brut qui a déjà vu passer quelques traversiers.', 22, 'vermeil-sac.svg'),
        ],
        presse: [
            { citation: 'Une guitare qui sent l’asphalte mouillé et une voix qui a dormi dans sa voiture plus souvent qu’à son tour.', source: 'La Gazette des Deux Rives' },
            { citation: 'Le genre de spectacle où la salle se lève sans que personne ne l’ait demandé.', source: 'Les Ondes de la Nation' },
        ],
        bio: 'Oscar Vermeil a appris la guitare dans le garage de son oncle, entre un moteur de motoneige et une radio qui ne captait que les stations de blues américaines. Ses chansons parlent des routes qu’il a faites pour aller jouer, des villages où il est resté plus longtemps que prévu et des gens qui lui ont offert le café après le spectacle. Il tourne seul ou en trio, avec la même vieille Telecaster et un ampli qui a survécu à trois hivers dans une camionnette.',
    },
    'musicien-2': {
        enabled: true,
        username: 'clemence-aubier',
        medium: 'other',
        type: 'musicien',
        works: [],
        displayName: 'Clémence Aubier',
        tagline: 'Violon classique et répertoire de chambre, joué de près, dans des salles où le bois s’entend.',
        theme: { palette: 'vinyle', fonts: 'chaleur' },
        sections: { ...SECTIONS_APERCU },
        pistes: [
            piste('a1', 'Premier mouvement, Allegro', 2),
            piste('a2', 'Largo pour un matin gris', 5),
            piste('a3', 'Finale, sans se presser', 6),
        ],
        dates: [
            { date: '2026-10-24', lieu: 'Chapelle Saint-Hubert', ville: 'Montebello' },
            { date: '2026-12-12', lieu: 'Maison des Arts du Lac', ville: 'Sherbrooke' },
            { date: '2027-01-30', lieu: 'Salle des Pins gris', ville: 'Québec' },
            { date: '2027-02-20', lieu: 'Grange des Érables', ville: 'Knowlton' },
        ],
        produits: [
            produit('c1', 'Saisons intérieures', 'Le premier disque, enregistré en deux nuits dans une chapelle de bois.', 30, 'aubier-disque.svg'),
            produit('c2', 'Affiche du récital', 'Impression sur papier coton, format 45 par 60 centimètres.', 28, 'aubier-affiche.svg'),
            produit('c3', 'Sac à partitions', 'Toile épaisse et doublure cousue, assez grand pour un cahier de sonates.', 24, 'aubier-sac.svg', true),
        ],
        presse: [
            { citation: 'Elle joue comme si la salle entière retenait le même souffle, et c’est probablement le cas.', source: 'Le Carnet musical de l’Estrie' },
            { citation: 'Un archet précis et généreux, qui laisse la place au silence entre les phrases.', source: 'Revue Contrepoint' },
        ],
        bio: 'Clémence Aubier joue du violon depuis l’âge de six ans et donne aujourd’hui des récitals dans les petites salles du Québec, celles où le public est assez proche pour voir l’archet trembler. Son répertoire va des maîtres baroques aux compositeurs d’ici, et elle aime glisser entre deux mouvements l’histoire de la pièce qu’elle s’apprête à jouer. Elle enseigne aussi, le mardi et le jeudi, à une douzaine d’élèves qui la suivent parfois en tournée.',
    },
    ...APERCUS_PEINTRE_PHOTO,
};

export const SLUGS_APERCU = Object.keys(APERCUS);
