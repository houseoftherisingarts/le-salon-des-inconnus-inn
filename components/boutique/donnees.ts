/**
 * La boutique (13 octobre 2026, ordre d'Alex) : l'App Store du studio, la même sur
 * vexelwebstudio.com/boutique et sur le Creator Studio (lesalondesinconnus.com/boutique).
 * Seul l'habillage change d'un site à l'autre; ce fichier est recopié tel quel dans
 * components/boutique/donnees.ts du dépôt du Salon. Changer un prix, un lien ou une
 * phrase ici, puis recopier le fichier là-bas.
 *
 * Trois rayons : gratuit avec un compte, inclus avec l'abonnement du Creator Studio, payant
 * (une fois ou au mois, au choix de la personne). Un produit sans prix affiche « Prix annoncé
 * à la sortie »; dès qu'Alex donne un chiffre, il suffit de remplir `prix`.
 *
 * Les images sont en adresses absolues pour servir les deux sites. Un produit sans image
 * reçoit une affiche typographique dans la peau de son rayon.
 */

export type RayonId = 'gratuit' | 'abonnement' | 'payant';

export type Rayon = {
  id: RayonId;
  numero: string;
  etiquette: string;
  titre: [string, string];
  intro: string;
};

export type Produit = {
  id: string;
  rayon: RayonId;
  nom: string;
  ligne: string;
  texte: string;
  etat: string;
  image?: string;
  alt?: string;
  /** où le programme s'ouvre; absent tant qu'il est à l'établi */
  lien?: string;
  /** en dollars canadiens, taxes en sus; rayon payant seulement */
  prix?: { unique?: number; mensuel?: number };
};

const IMG = 'https://vexelwebstudio.com/previews';
export const CREATOR_STUDIO = 'https://www.lesalondesinconnus.com/creator';
export const COURRIEL = 'alex@lesalondesinconnus.com';

export const BOUTIQUE = {
  titre: 'La boutique du studio',
  sous:
    'Les jeux, les outils et les programmes que nous bâtissons entre deux sites de clients, rangés en trois rayons selon ce qu’ils vous demandent : un compte, l’abonnement du Creator Studio ou un achat.',
  bouton: 'Voir les rayons',
};

export const RAYONS: Rayon[] = [
  {
    id: 'gratuit',
    numero: '01',
    etiquette: 'Rayon 01 · Gratuit avec un compte',
    titre: ['Ouvert à tous,', 'sans carte'],
    intro:
      'Ces programmes ne vous demandent qu’un compte, que vous ouvrez en une minute avec votre adresse Google ou votre courriel, et ils restent à vous sans frais aussi longtemps que vous voudrez vous en servir.',
  },
  {
    id: 'abonnement',
    numero: '02',
    etiquette: 'Rayon 02 · Inclus avec le Creator Studio',
    titre: ['Compris dans', 'l’abonnement'],
    intro:
      'Les outils de ce rayon s’ouvrent avec l’abonnement mensuel du Creator Studio, et ce seul abonnement les donne tous, y compris ceux qui sortiront de l’atelier au fil des mois.',
  },
  {
    id: 'payant',
    numero: '03',
    etiquette: 'Rayon 03 · À l’achat ou au mois',
    titre: ['Le vôtre,', 'à votre façon'],
    intro:
      'Chacun de ces programmes s’achète une fois pour toutes ou se paie au mois, selon ce qui convient à votre entreprise, et chaque fiche dit franchement où il en est, déjà en service chez un client ou encore à l’établi.',
  },
];

export const PRODUITS: Produit[] = [
  {
    id: 'coffre',
    rayon: 'gratuit',
    nom: 'Le Coffre des Inconnus',
    ligne: 'L’argent expliqué aux enfants, une pièce à la fois',
    texte:
      'L’enfant range de vraies pièces canadiennes dans sa caisse, voit son épargne grossir par l’intérêt composé et monte de niveau jusqu’aux questions d’adulte, sur Mac, Windows, Android ou dans le navigateur.',
    etat: 'Bêta gratuite',
    image: `${IMG}/studio/app-coffre.webp`,
    alt: 'L’écran d’accueil du Coffre des Inconnus',
    lien: 'https://coffre.lesinconnus.ca/',
  },
  {
    id: 'pai-sho',
    rayon: 'gratuit',
    nom: 'Pai Sho',
    ligne: 'Un jeu de table en bois, en trois dimensions',
    texte:
      'Le Pai Sho se joue à deux sur un plateau rond, selon les règles du Skud, contre une échelle d’adversaires qui se débloquent en gagnant ou contre un ami invité à distance.',
    etat: 'Bêta ouverte',
    image: `${IMG}/studio/jeux/pai-sho.webp`,
    alt: 'La table de Pai Sho en bois et ses tuiles',
    lien: 'https://www.lesalondesinconnus.com/cafe-jeux/',
  },
  {
    id: 'cv',
    rayon: 'gratuit',
    nom: 'Le Créateur de CV',
    ligne: 'Un CV sobre ou un CV d’artiste, sur la même fiche',
    texte:
      'Vous remplissez vos emplois et vos compétences une seule fois, puis vous passez d’une mise en page classique à une mise en page d’artiste avant d’imprimer la feuille en format lettre.',
    etat: 'En ligne',
    lien: 'https://vexelwebstudio.com/outils/cv',
  },
  {
    id: 'influencer-studio',
    rayon: 'abonnement',
    nom: 'Influencer Studio',
    ligne: 'Vous parlez à votre iPhone, le Mac monte la vidéo',
    texte:
      'La vidéo arrive sur le Mac par le Wi-Fi, se transcrit sur place, perd ses blancs et reçoit ses sous-titres mot à mot, puis sort en vertical et en horizontal, et le montage se fait dans le texte, si bien qu’un mot rayé disparaît de la vidéo.',
    etat: 'En préparation',
  },
  {
    id: 'feuille-de-service',
    rayon: 'abonnement',
    nom: 'La Feuille de service',
    ligne: 'Une journée de tournage réglée sur une seule page',
    texte:
      'La distribution et ses heures d’appel, l’équipe, les accessoires, le découpage des scènes et des plans et la météo du lieu de tournage tiennent sur une feuille que vous partagez par un lien à tout le plateau.',
    etat: 'Dans le Creator Studio',
    lien: CREATOR_STUDIO,
  },
  {
    id: 'guilde',
    rayon: 'payant',
    nom: 'La Guilde',
    ligne: 'Sept employés IA dans un même bureau, sur votre Mac',
    texte:
      'Le site et l’infolettre, la stratégie, les finances, la comptabilité, le marketing, le service à la clientèle et une assistante ont chacun leur salle, gardent leur mémoire et lisent votre propre coffre de notes.',
    etat: 'En service chez une première entreprise',
    image: `${IMG}/studio/app-employe.webp`,
    alt: 'Le bureau des employés IA de La Guilde',
  },
  {
    id: 'guichet',
    rayon: 'payant',
    nom: 'Le Guichet',
    ligne: 'L’espace où vos clients ouvrent et suivent leur dossier',
    texte:
      'Vos clients entrent avec leur courriel, déposent les pièces que votre métier leur demande et suivent leur parcours étape par étape, pendant que votre bureau voit chaque dossier et le sort en PDF.',
    etat: 'En démonstration',
    image: `${IMG}/studio/cap-soumission.webp`,
    alt: 'Un dossier client ouvert dans Le Guichet',
  },
  {
    id: 'sillage',
    rayon: 'payant',
    nom: 'Sillage',
    ligne: 'Ce que vos visiteurs font vraiment sur votre site',
    texte:
      'Les cartes de chaleur des clics et du défilement, les visites filmées, les clics de colère et les formulaires abandonnés se mesurent dans votre propre base de données plutôt que chez un service étranger.',
    etat: 'En service sur un site client',
    image: `${IMG}/studio/analytics-vexel-chaleur.webp`,
    alt: 'La carte de chaleur des clics mesurée par Sillage',
  },
  {
    id: 'grimoire',
    rayon: 'payant',
    nom: 'Le Grimoire',
    ligne: 'Votre carnet de bord en livre de quêtes',
    texte:
      'Les tâches deviennent des quêtes, les habitudes des hauts faits et les gens que vous croisez des personnages avec leur fiche, dans un carnet qui donne envie d’être ouvert chaque matin.',
    etat: 'À l’établi',
  },
];

export const produitsDuRayon = (id: RayonId) => PRODUITS.filter((p) => p.rayon === id);

export const formatPrix = (n: number) => `${n.toLocaleString('fr-CA')} $`;
