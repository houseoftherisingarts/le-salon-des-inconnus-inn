// apercusPeintrePhoto : les espaces témoins des gabarits Peintre et
// Photographe, servis sans compte à /apercu/peintre, /apercu/peintre-2,
// /apercu/photographe et /apercu/photographe-2 (ApercuPage.tsx).
//
// Les quatre artistes sont inventés, comme leurs expositions et les mots de
// la presse. Les toiles sont dessinées en SVG puis rendues en webp (aucune
// image générée par IA); les photographies sont celles du Salon, prises sur
// son terrain. Aucune œuvre ni aucun forfait ne porte de lien de paiement :
// le prix s'affiche sans bouton, comme sur un espace dont l'artiste n'a pas
// encore branché Stripe.

import type { OeuvreProfilPro, PhotoSerie, SuperProfileConfig } from './types';

const MEDIA = '/media/apercu';
const SECTIONS_APERCU = { rendezvous: false, contact: false, liens: false } as const;

const toile = (fichier: string, titre: string, annee: string, technique: string, largeurCm: number, hauteurCm: number, statutVente: OeuvreProfilPro['statutVente'], prix?: number): OeuvreProfilPro => ({
    url: `${MEDIA}/${fichier}.webp`, storagePath: '', titre, annee, technique, largeurCm, hauteurCm, statutVente,
    ...(prix ? { prixCents: prix * 100 } : {}),
});

const photo = (fichier: string, largeur: number, hauteur: number): PhotoSerie => ({
    id: fichier, url: `${MEDIA}/${fichier}.webp`, storagePath: '', largeur, hauteur,
});
const paysage = (f: string) => photo(f, 1600, 1060);
const portrait = (f: string) => photo(f, 1059, 1600);

export const APERCUS_PEINTRE_PHOTO: Record<string, SuperProfileConfig> = {
    peintre: {
        enabled: true,
        username: 'solene-dufort',
        medium: 'visual-art',
        type: 'peintre',
        works: [],
        displayName: 'Solène Dufort',
        tagline: 'Des paysages de la Petite-Nation peints en bandes de lumière, à l’huile et sans pinceau pressé.',
        theme: { palette: 'galerie', fonts: 'galerie' },
        sections: { ...SECTIONS_APERCU },
        oeuvres: [
            toile('dufort-lac', 'Lac Simon, six heures', '2025', 'Huile sur toile', 150, 100, 'a-vendre', 4800),
            toile('dufort-brume', 'Brume sur la Petite-Nation', '2025', 'Huile sur toile', 120, 90, 'a-vendre', 3200),
            toile('dufort-octobre', 'Octobre, rang Saint-Charles', '2025', 'Huile sur toile', 100, 100, 'vendu'),
            toile('dufort-erabliere', 'Érablière en mars', '2024', 'Huile et cire froide sur lin', 60, 80, 'sur-demande'),
            toile('dufort-sarrasin', 'Sarrasin', '2024', 'Huile sur toile', 90, 120, 'vendu'),
            toile('dufort-neige', 'Première neige', '2023', 'Huile sur panneau', 50, 40, 'a-vendre', 950),
        ],
        produits: [
            { id: 'r1', nom: 'Lac Simon, en reproduction', description: 'Impression au jet d’encre sur papier coton, 40 × 27 cm, numérotée et signée.', prix: 120, photo: { url: `${MEDIA}/dufort-lac.webp`, storagePath: '' } },
            { id: 'r2', nom: 'Brume, en reproduction', description: 'Impression au jet d’encre sur papier coton, 40 × 30 cm, tirage de cinquante.', prix: 110, photo: { url: `${MEDIA}/dufort-brume.webp`, storagePath: '' } },
        ],
        expositions: [
            { titre: 'Les heures lentes', lieu: 'Centre d’art de Papineauville', dates: '14 novembre au 20 décembre 2026', aVenir: true },
            { titre: 'Horizons pliés', lieu: 'Galerie du Vieux-Pont, Montebello', dates: 'Printemps 2025', aVenir: false },
            { titre: 'Salon d’automne', lieu: 'Maison de la culture de Gatineau', dates: 'Octobre 2024', aVenir: false },
        ],
        atelier: { ville: 'Saint-André-Avellin', visitesSurRendezVous: true, note: 'L’atelier est une ancienne laiterie au bord du rang. On y voit les toiles en cours, posées contre le mur du fond, là où la lumière du nord tombe le mieux.' },
        presse: [
            { citation: 'Ses horizons ne se regardent pas, ils se respirent. On sort de la salle avec l’impression d’avoir marché une heure au bord de l’eau.', source: 'Le Courrier de la Petite-Nation' },
            { citation: 'Une peintre qui sait laisser une couleur tranquille assez longtemps pour qu’elle se mette à parler.', source: 'Revue Couleurs d’ici' },
        ],
        bio: 'Solène Dufort peint depuis vingt ans les paysages qu’elle traverse en allant au marché : le lac au petit matin, les champs de sarrasin en août, les érablières quand la neige commence à céder. Elle travaille à l’huile, par couches minces qu’elle laisse sécher une semaine entre chaque passage, et s’arrête quand la toile a l’air de respirer toute seule. Ses œuvres sont entrées dans plusieurs collections privées de l’Outaouais et des Laurentides.',
    },
    'peintre-2': {
        enabled: true,
        username: 'theo-castonguay',
        medium: 'visual-art',
        type: 'peintre',
        works: [],
        displayName: 'Théo Castonguay',
        tagline: 'Des bandes, des cercles et des couleurs franches qui se répondent d’une toile à l’autre.',
        theme: { palette: 'ardoise', fonts: 'moderne' },
        sections: { ...SECTIONS_APERCU },
        oeuvres: [
            toile('castonguay-rythme', 'Rythme vertical no 3', '2026', 'Acrylique sur toile', 160, 120, 'a-vendre', 6500),
            toile('castonguay-soleil', 'Soleil de plomb', '2025', 'Acrylique sur toile', 100, 100, 'vendu'),
            toile('castonguay-traverse', 'Traverse', '2025', 'Acrylique sur toile', 140, 90, 'a-vendre', 5200),
            toile('castonguay-saisons', 'Quatre saisons', '2024', 'Acrylique sur bois', 80, 80, 'sur-demande'),
            toile('castonguay-signal', 'Signal', '2024', 'Acrylique sur toile', 60, 90, 'a-vendre', 2400),
            toile('castonguay-ecluse', 'Écluse', '2023', 'Acrylique sur toile', 120, 60, 'vendu'),
        ],
        expositions: [
            { titre: 'Bords francs', lieu: 'Galerie Rouge-Brique, Montréal', dates: '6 février au 14 mars 2027', aVenir: true },
            { titre: 'Géométries du dimanche', lieu: 'Centre culturel de Thurso', dates: 'Été 2025', aVenir: false },
        ],
        atelier: { ville: 'Montréal, quartier Saint-Henri', visitesSurRendezVous: true, note: 'Un grand local au deuxième étage d’une ancienne manufacture de chaussures, avec du ruban-cache sur tous les murs.' },
        presse: [
            { citation: 'Il reprend le fil des plasticiens là où on l’avait laissé, avec une joie qui manquait à ses aînés.', source: 'Le Cahier des arts visuels' },
            { citation: 'Des toiles qu’on reconnaît de l’autre bout de la salle, et qu’on a envie de revoir de près.', source: 'Radio Rive-Nord' },
        ],
        bio: 'Théo Castonguay a d’abord été graphiste, et il en a gardé le goût des bords nets et des couleurs qui ne se mélangent pas. Il peint à l’acrylique, au ruban-cache, en couches opaques qu’il ponce entre deux passages pour que la surface reste mate. Chaque série part d’une contrainte simple, une seule forme ou quatre couleurs, qu’il pousse jusqu’à ce qu’elle le surprenne.',
    },
    photographe: {
        enabled: true,
        username: 'clara-beaudry',
        medium: 'photo',
        type: 'photographe',
        works: [],
        displayName: 'Clara Beaudry',
        tagline: 'Photographie documentaire en noir et blanc, au rythme des gens qui travaillent de leurs mains.',
        theme: { palette: 'noir', fonts: 'editorial' },
        sections: { ...SECTIONS_APERCU },
        series: [
            {
                id: 'fumee', titre: 'Dans la fumée',
                description: 'Un après-midi de brûlage au bout du terrain. La fumée faisait le tri entre ce qu’on voyait et ce qu’on devinait.',
                photos: [paysage('nb-8'), paysage('nb-3'), portrait('nb-5'), paysage('nb-11'), photo('nb-feu', 1600, 1200)],
            },
            {
                id: 'remise', titre: 'La vieille remise',
                description: 'Trois jours pour défaire un bâtiment de 1940, planche par planche, en gardant tout ce qui pouvait resservir.',
                photos: [paysage('nb-7'), paysage('nb-2'), portrait('nb-1'), paysage('nb-6')],
            },
            {
                id: 'visages', titre: 'Visages du rang',
                description: 'Les gens de passage, photographiés là où ils se trouvaient, sans leur demander de bouger.',
                photos: [paysage('nb-10'), paysage('nb-9'), paysage('nb-4')],
            },
        ],
        tarifs: [
            { id: 't1', nom: 'Portrait', prix: 250, description: 'Une heure, un lieu que vous choisissez, quinze images retouchées en noir et blanc.' },
            { id: 't2', nom: 'Reportage d’une journée', prix: 1200, description: 'Un chantier, un atelier ou un événement suivi du matin au soir, soixante images livrées en deux semaines.' },
            { id: 't3', nom: 'Tirage d’art', prix: 180, description: 'Une image de mes séries, tirée sur papier baryté et signée, 40 × 50 cm.' },
        ],
        presse: [
            { citation: 'Clara Beaudry photographie le travail comme d’autres photographient la danse.', source: 'Le Journal de l’Outaouais' },
        ],
        bio: 'Clara Beaudry travaille en noir et blanc depuis ses débuts, avec un seul boîtier et deux objectifs. Elle suit des chantiers, des fermes et des ateliers pendant des jours entiers, jusqu’à ce qu’on oublie qu’elle est là. Ses séries ont été exposées à Gatineau, Ottawa et Rimouski.',
    },
    'photographe-2': {
        enabled: true,
        username: 'samuel-aubin',
        medium: 'photo',
        type: 'photographe',
        works: [],
        displayName: 'Samuel Aubin',
        tagline: 'Maisons, jardins et lieux de séjour photographiés à la lumière du jour, pour qu’on ait envie d’y entrer.',
        theme: { palette: 'argent', fonts: 'net' },
        sections: { ...SECTIONS_APERCU },
        series: [
            {
                id: 'aout', titre: 'Août au rang',
                description: 'Une maison centenaire, ses plates-bandes et la forêt autour, du lever du jour au coucher.',
                photos: [photo('drone', 1600, 900), photo('jardins', 1600, 1200), photo('hemerocalles', 1600, 1200), photo('maison', 1600, 900), photo('sciure', 1600, 1200)],
            },
            {
                id: 'cabanes', titre: 'Cabanes',
                description: 'Des chalets de bois vus de l’intérieur, quand les guirlandes s’allument et que la forêt reste dans les fenêtres.',
                photos: [1, 2, 3, 4, 5].map((i) => photo(`cabane-${i}`, 1600, 1200)),
            },
            {
                id: 'autobus', titre: 'Le vieil autobus',
                description: 'Un autobus scolaire devenu chambre, cuisine et salon, photographié de l’avant jusqu’au fond.',
                photos: [photo('bus-foyer', 1600, 900), photo('bus-avant', 1600, 900), photo('bus-arriere', 1600, 900), photo('bus-arriere-2', 1600, 900)],
            },
        ],
        tarifs: [
            { id: 't1', nom: 'Séance immobilière', prix: 350, description: 'Jusqu’à vingt-cinq images d’une maison ou d’un chalet, livrées en trois jours, prêtes pour l’annonce.' },
            { id: 't2', nom: 'Hébergement touristique', prix: 650, description: 'Intérieurs, extérieurs et vue du ciel au drone, pour une fiche de location qui donne envie de réserver.' },
            { id: 't3', nom: 'Journée entière', prix: 1100, description: 'Pour un domaine, une auberge ou plusieurs bâtiments, de la lumière du matin à celle du soir.' },
        ],
        presse: [
            { citation: 'Ses photos d’intérieur ont ce qui manque aux annonces : l’odeur du bois et l’heure qu’il est.', source: 'Magazine Maisons de campagne' },
        ],
        bio: 'Samuel Aubin photographie des lieux : des maisons à vendre, des chalets à louer, des auberges qui veulent montrer ce qu’elles ont de mieux. Il attend la bonne lumière plutôt que de l’inventer, et il ne retouche que ce que l’œil aurait corrigé de lui-même. Il travaille surtout en Outaouais et dans les Laurentides.',
    },
};
