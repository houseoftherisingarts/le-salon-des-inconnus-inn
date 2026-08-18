/**
 * Page d'artiste d'Alex T. St-Laurent, section art du Salon des Inconnus (/alex).
 *
 * Toute la copie de la page vit ici. Locale fr-CA, jamais « on », jamais de
 * tiret cadratin.
 *
 * SOURCE DU CONTENU : le CV artistique d'Alex,
 * ~/Documents/desktop Cleanup jan 2026/CV artistique/index.html (7 janv. 2026)
 * et sa v2 (12 janv. 2026). Rien n'est invente ici : chaque prix, chaque film
 * et chaque date vient de ce document. Ce qui n'y est pas ne monte pas sur la
 * page.
 */

export const ALEX = {
  name: 'Alex T. St-Laurent',
  role: 'Cinéaste · Comédien · Bâtisseur de lieux',
  portrait: '/media/Alex/alex-portrait.jpg',
  portraitSmall: '/media/Alex/alex-portrait-720.jpg',
  email: 'alex@lesalondesinconnus.com',
  eyebrow: "Portrait d'artiste",
  /* Le titre du hero : le mot accent est porte par la couleur, jamais l'italique. */
  heroTitle: 'Je bâtis des lieux, des images et des systèmes qui laissent les inconnus créer.',
  heroSub:
    'Formé en production cinématographique à Concordia. Prix du jury au Concordia Film Festival, sélection Cannes Short Corner. Fondateur du Salon des Inconnus et du studio Vexel.',
  // REGLE ABSOLUE : deux lignes maximum au rendu. Le reste descend dans le corps.
  manifesto: "Un lieu qui tient debout.",
  manifestoBody:
    "L'art libre demande ça, et quelqu'un qui tient la porte ouverte. Je passe mes années à fabriquer les deux, une discipline à la fois.",
};

/** Ce que je fais. Quatre pratiques, toutes adossees au CV. */
export const PRATIQUES = [
  {
    title: 'Réalisation et image',
    body: 'Réalisation, direction photo, montage et étalonnage. Courts métrages, documentaires, vidéoclips, captations live et contenu de marque, du tournage à la livraison.',
  },
  {
    title: 'Jeu et mise en scène',
    body: 'Comédien et metteur en scène formé au théâtre depuis 2005. Coach de jeu à La Fabrique, direction de la troupe clandestine Râvâges.',
  },
  {
    title: 'Lieux et direction artistique',
    body: 'Le Salon des Inconnus : un tiers-lieu de cinq acres, manoir, yourte et studio-bus, où se produisent vernissages, spectacles, murales et résidences.',
  },
  {
    title: 'Media solving et systèmes',
    body: 'Stratégie narrative, plateformes et développement web. Vexel Webstudio construit les sites et les outils qui financent le reste et servent de laboratoire.',
  },
];

/** Prix et distinctions. Tirees du CV artistique, aucune ajoutee. */
export const PRIX: { year: string; award: string; org: string; work?: string }[] = [
  {
    year: '2014',
    award: 'Best of the Fest',
    org: 'Concordia Film Festival, jury présidé par Danny Lennon',
    work: 'Fluffy, Round, Goodbye',
  },
  {
    year: '2015',
    award: 'Meilleur film érotique',
    org: 'Rendez-vous du cinéma québécois',
    work: 'Buzz Mec MAG',
  },
  {
    year: '2012',
    award: 'Best Film',
    org: 'Champlain Film Festival',
    work: 'El Santo Contra el Chupacabra',
  },
  {
    year: '2013',
    award: 'Top 20 mondial',
    org: '100H Film Race',
    work: 'Du Nouveau par la Fenêtre',
  },
  {
    year: '2010',
    award: 'Meilleur acteur',
    org: 'Gala Théâtre',
  },
  {
    year: '2010',
    award: 'Prix du meilleur comédien',
    org: 'Capitaine Fracasse',
  },
  {
    year: '2009',
    award: 'Meilleur texte',
    org: 'Gala Théâtre',
  },
  {
    year: 'Cinéma',
    award: 'Dean Cheschire Memorial Award',
    org: 'Champlain College St-Lambert',
    work: 'Meilleur étudiant en cinéma',
  },
];

export type FilmoBloc = {
  titre: string;
  items: { title: string; meta: string; note?: string }[];
};

/** Filmographie, telle qu'elle est ecrite dans le CV. */
export const FILMOGRAPHIE: FilmoBloc[] = [
  {
    titre: 'Fiction',
    items: [
      {
        title: 'Chunk',
        meta: '2016 · coréalisation',
        note: 'Sélection Cannes Short Corner.',
      },
      {
        title: 'Buzz Mec MAG',
        meta: '2015 · coréalisation',
        note: 'Rendez-vous du cinéma québécois. Meilleur film érotique.',
      },
      {
        title: 'Fluffy, Round, Goodbye',
        meta: '2014 · coréalisation et production',
        note: 'Dark fantasy thriller. Best of the Fest, Concordia Film Festival.',
      },
      {
        title: 'Du Nouveau par la Fenêtre',
        meta: '2013 · équipe de production',
        note: 'Top 20 mondial, 100H Film Race.',
      },
      {
        title: 'El Santo Contra el Chupacabra',
        meta: '2012 · coréalisation et production',
        note: 'Comédie fantastique. Best Film, Champlain Film Festival.',
      },
      {
        title: 'Bolted · Paul’s Course',
        meta: '2017 et 2018 · coréalisation et production',
      },
      {
        title: 'Bareback · Stuck Home Syndrome · Noise Hunters · Betty Cracker',
        meta: 'Réalisation',
      },
    ],
  },
  {
    titre: 'Documentaire',
    items: [
      {
        title: 'Bulbes Engorgés',
        meta: 'En production · direction photo et montage',
        note: 'Projet éducatif et sexopositif sur l’anatomie clitoridienne. Avec Élise Lortie.',
      },
      {
        title: 'Junexit',
        meta: 'Réalisation',
        note: 'Documentaire engagé sur la résistance citoyenne et le pétrole, Camp de la Rivière, Gaspésie.',
      },
    ],
  },
  {
    titre: 'Vidéoclips et musique',
    items: [
      {
        title: 'Tania Martin',
        meta: 'Depuis 2022 · cinéaste officiel',
        note: 'Fille des Bois, Ici pour de Bon, TDAH.',
      },
      {
        title: 'Leslie, Fallin',
        meta: 'Réalisation et direction photo',
      },
    ],
  },
  {
    titre: 'Séries et captations',
    items: [
      {
        title: 'Séances Vivantes',
        meta: 'Série en cours · réalisation, caméra, montage',
        note: 'Captations au Salon des Inconnus : Louis-Julien Durso, Charles-Antoine Goulet, Deux Folles et un Banjo, Captain Generous, Tania Martin, Magnetosphere.',
      },
      {
        title: 'One for All',
        meta: 'Série en cours',
        note: 'Premier épisode avec Sébastien Leblanc.',
      },
    ],
  },
  {
    titre: 'Télévision et mandats',
    items: [
      {
        title: 'Santé la Vie, TVA',
        meta: 'Saisons 1, 2 et 3 · conception, idéation, splinter unit director, caméra 1',
      },
      {
        title: '19-2',
        meta: '2014 · rôle',
        note: 'Male junkie victim, crédité IMDb.',
      },
      {
        title: 'Stratégie vidéo et vlogs',
        meta: '2017-2019 · réalisation et stratégie narrative',
        note: 'Martin Latulippe, François Lemay, Paul Pyronnet.',
      },
      {
        title: 'Where the Witch Lives · L’Habitude de Mourir',
        meta: 'Hôte de production et site manager · photographe de plateau',
      },
    ],
  },
  {
    titre: 'Scène',
    items: [
      {
        title: 'Râvâges',
        meta: '2021-2022 · troupe clandestine',
        note: 'Mise en scène, écriture, jeu.',
      },
      {
        title: 'La Fabrique',
        meta: 'Diesel 2012, Shame on You 2011',
        note: 'Coach de jeu, assistance à la mise en scène.',
      },
      {
        title: 'Capitaine Fracasse',
        meta: '2010 · comédien, danseur, combat',
        note: 'Prix du meilleur comédien.',
      },
      {
        title: 'Ozone',
        meta: '2009 · comédien, scénariste, guitariste, assistant à la mise en scène',
        note: 'La pièce qui a ouvert l’univers Ozone.',
      },
    ],
  },
];

/** Les lieux et les institutions bâtis, avec leurs chiffres réels. */
export const REALISATIONS = [
  {
    year: 'Depuis 2020',
    title: 'Le Salon des Inconnus',
    role: 'Fondateur et directeur artistique',
    note: 'Auberge d’artistes et studio de production sur cinq acres à Namur : manoir, yourte, studio-bus. Vernissages, spectacles, tournages, murales et résidences en économie du don. 434 réservations encaissées, près de 106 000 $ de chiffre d’affaires réalisé.',
  },
  {
    year: 'Depuis 2024',
    title: 'Festival Médiéval de Montpellier',
    role: 'Coorganisateur et réalisateur vidéo',
    note: 'Logistique, partenariats, porte-parole, contenu promotionnel et aftermovies. 3 100 personnes accueillies à l’édition 2025.',
  },
  {
    year: 'En cours',
    title: 'Vexel Webstudio',
    role: 'Fondateur, direction artistique et développement',
    note: 'Studio web. Sites et applications livrés pour des conférenciers, des artistes, des organismes et des entrepreneurs.',
  },
  {
    year: 'En cours',
    title: 'Creator Studio',
    role: 'Architecture de plateforme',
    note: 'Conception UI et UX d’un studio créatif pour les artistes, avec sa forge assistée par IA et son codex.',
  },
  {
    year: 'En cours',
    title: 'Le Coffre des Inconnus',
    role: 'Conception et développement',
    note: 'Application d’éducation financière pour les familles, bâtie autour d’une doctrine de jarres et de portes.',
  },
];

/** Formation, telle quelle. */
export const FORMATION = [
  { title: 'Université Concordia', note: 'Production cinématographique' },
  { title: 'Champlain College St-Lambert', note: 'Cinéma et communications' },
  { title: 'Théâtre', note: 'Théâtre St-Laurent 2010, Théâtre Notre-Dame de Lourdes 2005-2010' },
  { title: 'Paul Pyronnet Institut', note: 'Base-Tech-Prat en PNL, 2019' },
  { title: 'Académie Zéro Limite', note: 'Webmarketing et leadership, Martin Latulippe' },
  { title: 'Vipassana', note: 'Pratique de méditation' },
];

/** Projets en chantier. Ce qui avance en ce moment, dit sans promesse de date. */
export const CHANTIERS = [
  {
    title: 'Ozone, le roman graphique',
    body: 'Série en scénarisation et en design. L’univers existe depuis 2009, de la pièce de théâtre aux storylines, et vit déjà dans un wiki non linéaire qui sert de mémoire au monde.',
  },
  {
    title: 'The Child and the Painter',
    body: 'Titre de travail. Phase de scénarisation.',
  },
  {
    title: 'Le premier long métrage',
    body: 'Le processus s’ouvre en octobre 2026. Pas une date de livraison, une date d’allumage.',
  },
  {
    title: 'La communauté des Inconnus',
    body: 'Une communauté intentionnelle autour du Salon : vivre, entretenir le lieu, créer, en échange du soin qu’on lui porte.',
  },
];

export type Annee = {
  /** Age, seulement pour l'annee en cours et les annees a venir. */
  age?: number;
  /** Periode, pour les annees passees : elles n'ont pas besoin d'un age precis. */
  periode?: string;
  /** Nom de l'annee, facon calendrier zodiacal. */
  titre: string;
  /** Une phrase : ce que l'annee demande. */
  promesse: string;
  /** Les gestes concrets de l'annee. */
  gestes: string[];
  statut: 'passe' | 'encours' | 'avenir';
};

/**
 * Le calendrier des annees. Une annee, une discipline, un chantier.
 * Les annees passees portent une periode, pas un age : elles resument ce qui
 * est deja fait, et tout ce qu'elles contiennent vient du CV artistique.
 * 33 a 37 viennent d'Alex.
 */
export const ANNEES: Annee[] = [
  {
    periode: '2005-2012',
    titre: 'Années de la Scène',
    promesse: 'Le théâtre avant tout le reste : jouer, écrire, monter.',
    gestes: [
      'Meilleur texte, Gala Théâtre 2009',
      'Meilleur acteur, Gala Théâtre 2010',
      'Capitaine Fracasse, prix du meilleur comédien',
      'Ozone, la pièce qui ouvre l’univers',
    ],
    statut: 'passe',
  },
  {
    periode: '2012-2017',
    titre: 'Années de l’École du Cinéma',
    promesse: 'Apprendre le métier de l’image, et le prouver en festival.',
    gestes: [
      'Champlain, puis Concordia en production',
      'Best Film, Champlain Film Festival',
      'Best of the Fest, Concordia Film Festival',
      'Sélection Cannes Short Corner',
    ],
    statut: 'passe',
  },
  {
    periode: '2014-2020',
    titre: 'Années du Média',
    promesse: 'Vivre de la caméra, apprendre à résoudre par le média.',
    gestes: [
      'Santé la Vie, trois saisons à TVA',
      'Stratégie vidéo et vlogs',
      'Junexit, documentaire en Gaspésie',
      'Première entreprise et développement web',
    ],
    statut: 'passe',
  },
  {
    periode: '2020-2025',
    titre: 'Années du Lieu',
    promesse: 'Ouvrir la maison et en faire une scène permanente.',
    gestes: [
      'Le Salon des Inconnus ouvre ses portes',
      'Séances Vivantes, la série de captations',
      'Le Festival Médiéval de Montpellier',
      'Les résidences en économie du don',
    ],
    statut: 'passe',
  },
  {
    age: 33,
    titre: 'Année de la Structure',
    promesse: 'Rendre le système assez solide pour tenir sans moi.',
    gestes: [
      'Automatiser l’auberge',
      'Bâtir la base Vexel',
      'Poser les finances au clair',
      'Livrer le Coffre des Inconnus',
    ],
    statut: 'encours',
  },
  {
    age: 34,
    titre: 'Année de la Danse',
    promesse: 'Ramener le corps dans le travail.',
    gestes: [
      'Apprendre à danser',
      'Créer une chorégraphie complète',
      'Monter un vidéoclip autour de cette chorégraphie',
    ],
    statut: 'avenir',
  },
  {
    age: 35,
    titre: 'Année du Film',
    promesse: 'Le long métrage, du scénario à la salle.',
    gestes: ['Écrire', 'Financer', 'Tourner', 'Montrer'],
    statut: 'avenir',
  },
  {
    age: 36,
    titre: 'Année de la Musique',
    promesse: 'Écrire une chanson complète, jusqu’à la dernière portée.',
    gestes: [
      'Apprendre la théorie musicale',
      'Apprendre l’orchestration',
      'Orchestrer et enregistrer',
      'Un EP, sinon un album',
    ],
    statut: 'avenir',
  },
  {
    age: 37,
    titre: 'Année des Arts visuels',
    promesse: 'Revenir au pinceau et à la main.',
    gestes: ['Une pratique quotidienne', 'Une série', 'Une exposition'],
    statut: 'avenir',
  },
];

export const CTA = {
  eyebrow: 'Travailler ensemble',
  title: 'Une scène, un site, un film, un lieu.',
  body: 'Écrivez-moi ce que vous voulez bâtir. Vous aurez la réponse d’un humain, et ce sera la mienne.',
  primary: { label: 'Écrire à Alex', href: 'mailto:alex@lesalondesinconnus.com?subject=Projet' },
  secondary: { label: 'Voir le studio', href: '/' },
};
