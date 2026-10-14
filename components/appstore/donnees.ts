/* Copie de vexel-site/src/site/boutique.ts : y changer les données, puis recopier ici. */
/**
 * La boutique (13 octobre 2026, ordre d'Alex) : l'App Store du studio, la même sur
 * vexelwebstudio.com/appstore et sur le Creator Studio (lesalondesinconnus.com/appstore).
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
  /** la vitrine /appstore : rayon de catégorie, plateformes, teinte de l'icône, carte « À la une » */
  categorie: string;
  plateformes?: string;
  teinte: [string, string];
  alaune?: boolean;
  /** icône d'app en image (carrée); sans elle, la tuile prend la teinte et un glyphe */
  icone?: string;
  /** gratuit sans compte : Obtenir ouvre le lien tout de suite (les jeux de table installables) */
  sansCompte?: boolean;
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
      'Ces programmes ne vous demandent qu’un compte, le même compte gratuit qui vous ouvre le réseau du Creator Studio, et ils restent à vous sans frais aussi longtemps que vous voudrez vous en servir.',
  },
  {
    id: 'abonnement',
    numero: '02',
    etiquette: 'Rayon 02 · Inclus avec le Creator Studio',
    titre: ['Compris dans', 'l’abonnement'],
    intro:
      'Le réseau du Creator Studio reste gratuit pour tout le monde, et les outils de ce rayon s’ouvrent avec l’un de ses trois abonnements de membre, qui les donnent tous, y compris ceux qui sortiront de l’atelier au fil des mois.',
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

/* Les paliers de membre du Creator Studio (ArtistHub.tsx, onglet STORE) : le gratuit ouvre le
   réseau et le rayon 01, chacun des trois payants ouvre aussi le rayon 02. */
export type Adhesion = { id: string; nom: string; prix: number };
export const ADHESIONS: Adhesion[] = [
  { id: 'gratuit', nom: 'Gratuit', prix: 0 },
  { id: 'initiate', nom: 'Initiate', prix: 4 },
  { id: 'artisan', nom: 'Artisan', prix: 18 },
  { id: 'maestro', nom: 'Maestro', prix: 48 },
];
/** le premier palier payant, celui qui ouvre le rayon 02 */
export const ADHESION_MIN = Math.min(...ADHESIONS.filter((a) => a.prix > 0).map((a) => a.prix));

export const PRODUITS: Produit[] = [
  {
    id: 'coffre',
    icone: `${IMG}/studio/icones/coffre.webp`,
    rayon: 'gratuit',
    nom: 'Le Coffre des Inconnus',
    ligne: 'L’argent expliqué aux enfants, une pièce à la fois',
    texte:
      'L’enfant range de vraies pièces canadiennes dans sa caisse, voit son épargne grossir par l’intérêt composé et monte de niveau jusqu’aux questions d’adulte, sur Mac, Windows, Android ou dans le navigateur.',
    etat: 'Bêta gratuite',
    image: `${IMG}/studio/app-coffre.webp`,
    alt: 'L’écran d’accueil du Coffre des Inconnus',
    lien: 'https://coffre.lesinconnus.ca/',
    categorie: 'Éducation',
    plateformes: 'Mac, Windows, Android, Web',
    teinte: ['#34d399', '#0e7490'],
    alaune: true,
  },
  {
    id: 'pai-sho',
    icone: `${IMG}/studio/icones/pai-sho.webp`,
    rayon: 'gratuit',
    nom: 'Pai Sho',
    ligne: 'Un jeu de table en bois, en trois dimensions',
    texte:
      'Le Pai Sho se joue à deux sur un plateau rond, selon les règles du Skud, contre une échelle d’adversaires qui se débloquent en gagnant ou contre un ami invité à distance.',
    etat: 'Bêta ouverte',
    image: `${IMG}/studio/jeux/pai-sho.webp`,
    alt: 'La table de Pai Sho en bois et ses tuiles',
    lien: 'https://www.lesalondesinconnus.com/cafe-jeux/',
    categorie: 'Jeux',
    plateformes: 'Web',
    teinte: ['#e0b07a', '#7c4a21'],
    alaune: true,
  },
  /* Les jeux de table (13 octobre 2026) : six apps autonomes, sans compte, installables et jouables
     hors ligne, bâties dans ~/Documents/Websites/jeux-de-table et servies sous /jeux/<id>/. */
  {
    id: 'hnefatafl',
    rayon: 'gratuit',
    nom: 'Hnefatafl',
    ligne: 'Le jeu de table des Vikings, un roi contre une armée',
    texte:
      'Le roi part du trône, au centre du plateau, et cherche à gagner un coin avec ses défenseurs pendant que des assaillants deux fois plus nombreux tentent de l’enfermer. Vous prenez le camp qui vous plaît contre une maison qui compte dix niveaux, du Marmiton au Connétable, ou vous jouez à deux sur le même appareil, avec des pièces d’ivoire sculpté dans l’esprit des pièces de Lewis.',
    etat: 'Gratuit, sans compte',
    image: `${IMG}/studio/jeux/hnefatafl.webp`,
    alt: 'Le plateau de hnefatafl et ses pièces d’ivoire sculpté',
    icone: 'https://vexelwebstudio.com/jeux/hnefatafl/icon-192.png',
    lien: 'https://vexelwebstudio.com/jeux/hnefatafl/',
    categorie: 'Jeux',
    plateformes: 'iPhone, Android, Mac, Windows',
    teinte: ['#e9d5a1', '#5b3a1e'],
    alaune: true,
    sansCompte: true,
  },
  {
    id: 'merelle',
    rayon: 'gratuit',
    nom: 'La Mérelle',
    ligne: 'Le jeu des moulins, gravé sur un banc de cloître',
    texte:
      'Chaque joueur pose ses neuf pions puis les déplace pour aligner trois pièces, et chaque moulin formé retire un pion à l’adversaire jusqu’à ce qu’il n’en reste que deux. Les moines de tilleul peint s’affrontent sur une pierre gravée comme celles qu’on trouve encore sur les bancs des cloîtres, contre la maison ou à deux.',
    etat: 'Gratuit, sans compte',
    image: `${IMG}/studio/jeux/merelle.webp`,
    alt: 'Le plateau de mérelle gravé dans la pierre et ses pions en moines de bois',
    icone: 'https://vexelwebstudio.com/jeux/merelle/icon-192.png',
    lien: 'https://vexelwebstudio.com/jeux/merelle/',
    categorie: 'Jeux',
    plateformes: 'iPhone, Android, Mac, Windows',
    teinte: ['#e7dcc4', '#6b5a43'],
    sansCompte: true,
  },
  {
    id: 'renard',
    rayon: 'gratuit',
    nom: 'Le Renard et les Oies',
    ligne: 'Treize oies pour enfermer un seul renard',
    texte:
      'Le renard saute par-dessus les oies comme aux dames et peut en croquer plusieurs d’un seul élan, tandis que les oies, qui ne prennent jamais, avancent ensemble pour l’acculer. La règle suivie est la forme ancienne que les historiens tiennent pour authentique, celle des pièces achetées par Édouard IV, et les figurines de bois peint donnent à la partie un air de ferme.',
    etat: 'Gratuit, sans compte',
    image: `${IMG}/studio/jeux/renard.webp`,
    alt: 'Le renard et les oies en bois peint sur leur planche',
    icone: 'https://vexelwebstudio.com/jeux/renard/icon-192.png',
    lien: 'https://vexelwebstudio.com/jeux/renard/',
    categorie: 'Jeux',
    plateformes: 'iPhone, Android, Mac, Windows',
    teinte: ['#f4a261', '#7a3b12'],
    sansCompte: true,
  },
  {
    id: 'des',
    rayon: 'gratuit',
    nom: 'Les Dés du menteur',
    ligne: 'Un jeu de bluff autour de la table d’une taverne',
    texte:
      'Chacun garde ses dés sous son gobelet et annonce combien de faces il croit voir sur toute la table, en montant toujours d’un cran, jusqu’à ce qu’un convive crie au menteur. Les convives assis autour de vous bluffent à leur façon, et celui qui perd la manche laisse un dé derrière lui.',
    etat: 'Gratuit, sans compte',
    image: `${IMG}/studio/jeux/des.webp`,
    alt: 'La table de la taverne, les gobelets et les convives des Dés du menteur',
    icone: 'https://vexelwebstudio.com/jeux/des/icon-192.png',
    lien: 'https://vexelwebstudio.com/jeux/des/',
    categorie: 'Jeux',
    plateformes: 'iPhone, Android, Mac, Windows',
    teinte: ['#d4a373', '#5e3023'],
    sansCompte: true,
  },
  {
    id: 'chouette',
    rayon: 'gratuit',
    nom: 'Le Cul de chouette',
    ligne: 'Trois dés, deux chouettes et le cul, jusqu’à 343',
    texte:
      'Le jeu de dés de Kaamelott se joue ici selon le règlement que les joueurs ont fini par mettre par écrit, avec les chouettes, les velutes, les suites, le sirotage et sa mise, la grelottine et la bévue qui coûte dix points. Le premier qui atteint 343 l’emporte, et ce sont les convives de la taverne qui vous donnent la réplique.',
    etat: 'Gratuit, sans compte',
    image: `${IMG}/studio/jeux/chouette.webp`,
    alt: 'Les trois dés du Cul de chouette sur la table de la taverne',
    icone: 'https://vexelwebstudio.com/jeux/chouette/icon-192.png',
    lien: 'https://vexelwebstudio.com/jeux/chouette/',
    categorie: 'Jeux',
    plateformes: 'iPhone, Android, Mac, Windows',
    teinte: ['#c9a227', '#4a3410'],
    sansCompte: true,
  },
  {
    id: 'tarot',
    rayon: 'gratuit',
    nom: 'Le Tarot de Marseille',
    ligne: 'Une lame, trois lames ou la croix celtique',
    texte:
      'Vous posez votre question, le paquet se mélange une seule fois et une lame sur deux sort renversée, puis chaque carte se retourne sur un tapis de velours avec sa lecture, à l’endroit comme à l’envers. Le tirage reste honnête du début à la fin, et la bougie posée au coin du tapis veille sur la séance.',
    etat: 'Gratuit, sans compte',
    image: `${IMG}/studio/jeux/tarot.webp`,
    alt: 'Un tirage en croix celtique sur le tapis de velours',
    icone: 'https://vexelwebstudio.com/jeux/tarot/icon-192.png',
    lien: 'https://vexelwebstudio.com/jeux/tarot/',
    categorie: 'Jeux',
    plateformes: 'iPhone, Android, Mac, Windows',
    teinte: ['#b5838d', '#3d1f2b'],
    sansCompte: true,
  },
  {
    id: 'cv',
    icone: `${IMG}/studio/icones/cv.webp`,
    rayon: 'gratuit',
    nom: 'Le Créateur de CV',
    ligne: 'Un CV sobre ou un CV d’artiste, sur la même fiche',
    texte:
      'Vous remplissez vos emplois et vos compétences une seule fois, puis vous passez d’une mise en page classique à une mise en page d’artiste avant d’imprimer la feuille en format lettre.',
    etat: 'En ligne',
    lien: 'https://vexelwebstudio.com/outils/cv',
    categorie: 'Productivité',
    plateformes: 'Web',
    teinte: ['#93c5fd', '#4f46e5'],
  },
  {
    id: 'influencer-studio',
    icone: `${IMG}/studio/icones/influencer-studio.webp`,
    rayon: 'abonnement',
    nom: 'Influencer Studio',
    ligne: 'Vous parlez à votre iPhone, le Mac monte la vidéo',
    texte:
      'La vidéo arrive sur le Mac par le Wi-Fi, se transcrit sur place, perd ses blancs et reçoit ses sous-titres mot à mot, puis sort en vertical et en horizontal, et le montage se fait dans le texte, si bien qu’un mot rayé disparaît de la vidéo.',
    etat: 'En préparation',
    categorie: 'Vidéo',
    plateformes: 'iPhone et Mac',
    teinte: ['#f472b6', '#7c3aed'],
  },
  {
    id: 'feuille-de-service',
    icone: `${IMG}/studio/icones/feuille-de-service.webp`,
    rayon: 'abonnement',
    nom: 'La Feuille de service',
    ligne: 'Une journée de tournage réglée sur une seule page',
    texte:
      'La distribution et ses heures d’appel, l’équipe, les accessoires, le découpage des scènes et des plans et la météo du lieu de tournage tiennent sur une feuille que vous partagez par un lien à tout le plateau.',
    etat: 'Dans le Creator Studio',
    lien: CREATOR_STUDIO,
    categorie: 'Cinéma',
    plateformes: 'Web',
    teinte: ['#fcd34d', '#e11d48'],
  },
  {
    /* l'outil bâti pour One Grand Film dans Google AI Studio (« Vexel - OGF Timeline ») */
    id: 'trame',
    icone: `${IMG}/studio/icones/trame.webp`,
    rayon: 'abonnement',
    nom: 'La Trame',
    ligne: 'Votre film, scène par scène, sur la ligne du temps',
    texte:
      'Chaque personnage a sa rangée et chaque scène sa carte, avec sa durée, son émotion et son action, si bien que vous déplacez les scènes d’un acte à l’autre, gardez les autres en réserve sur un banc à part et voyez la durée du film changer à mesure.',
    etat: 'À l’établi',
    image: `${IMG}/studio/app-trame.webp`,
    alt: 'Le tableau de La Trame, une rangée par personnage et une carte par scène',
    categorie: 'Cinéma',
    plateformes: 'Web',
    teinte: ['#67e8f9', '#4338ca'],
    alaune: true,
  },
  {
    id: 'guilde',
    icone: `${IMG}/studio/icones/guilde.webp`,
    rayon: 'payant',
    nom: 'La Guilde',
    ligne: 'Sept employés IA dans un même bureau, sur votre Mac',
    texte:
      'Le site et l’infolettre, la stratégie, les finances, la comptabilité, le marketing, le service à la clientèle et une assistante ont chacun leur salle, gardent leur mémoire et lisent votre propre coffre de notes.',
    etat: 'En service chez une première entreprise',
    image: `${IMG}/studio/app-employe.webp`,
    alt: 'Le bureau des employés IA de La Guilde',
    categorie: 'Entreprise',
    plateformes: 'Mac',
    teinte: ['#c4b5fd', '#be185d'],
    alaune: true,
    prix: { unique: 20, mensuel: 20 },
  },
  {
    id: 'guichet',
    icone: `${IMG}/studio/icones/guichet.webp`,
    rayon: 'payant',
    nom: 'Le Guichet',
    ligne: 'L’espace où vos clients ouvrent et suivent leur dossier',
    texte:
      'Vos clients entrent avec leur courriel, déposent les pièces que votre métier leur demande et suivent leur parcours étape par étape, pendant que votre bureau voit chaque dossier et le sort en PDF.',
    etat: 'En démonstration',
    image: `${IMG}/studio/cap-soumission.webp`,
    alt: 'Un dossier client ouvert dans Le Guichet',
    categorie: 'Entreprise',
    plateformes: 'Web',
    teinte: ['#7dd3fc', '#1d4ed8'],
    prix: { unique: 20, mensuel: 20 },
  },
  {
    id: 'sillage',
    icone: `${IMG}/studio/icones/sillage.webp`,
    rayon: 'payant',
    nom: 'Sillage',
    ligne: 'Ce que vos visiteurs font vraiment sur votre site',
    texte:
      'Les cartes de chaleur des clics et du défilement, les visites filmées, les clics de colère et les formulaires abandonnés se mesurent dans votre propre base de données plutôt que chez un service étranger.',
    etat: 'En service sur un site client',
    image: `${IMG}/studio/analytics-vexel-chaleur.webp`,
    alt: 'La carte de chaleur des clics mesurée par Sillage',
    categorie: 'Analytique',
    plateformes: 'Web',
    teinte: ['#fda4af', '#9d174d'],
    prix: { unique: 20, mensuel: 20 },
  },
  {
    id: 'grimoire',
    icone: `${IMG}/studio/icones/grimoire.webp`,
    rayon: 'payant',
    nom: 'Le Grimoire',
    ligne: 'Votre carnet de bord en livre de quêtes',
    texte:
      'Les tâches deviennent des quêtes, les habitudes des hauts faits et les gens que vous croisez des personnages avec leur fiche, dans un carnet qui donne envie d’être ouvert chaque matin.',
    etat: 'À l’établi',
    prix: { unique: 20, mensuel: 20 },
    categorie: 'Productivité',
    teinte: ['#e9d5a1', '#8a6420'],
  },
];

export const produitsDuRayon = (id: RayonId) => PRODUITS.filter((p) => p.rayon === id);

export const formatPrix = (n: number) => `${n.toLocaleString('fr-CA')} $`;
