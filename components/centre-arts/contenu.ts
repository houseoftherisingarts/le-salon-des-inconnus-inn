// Contenu de la page /centre-arts (vague 5, 16 septembre 2026, à la manière
// de Fortiche). Tous les textes sont tirés de faits déjà écrits dans le dépôt
// (seo.content, seo.config, llms.txt, arts/roster, ArtsPage, CeilidhPage) et
// ont passé verifier.py. Les lignes des titres géants portent leur largeur en
// em mesurée dans les métriques de Prata : un mot changé se remesure.

export type Langue = 'FR' | 'EN';
export type Txt = { FR: string; EN: string };
export type Lignes = { lignes: string[]; em: number };
export type Titre = { FR: { bureau: Lignes; tel: Lignes }; EN: { bureau: Lignes; tel: Lignes } };
export type ImageCA = {
  base: string; largeurs: number[]; w: number; h: number; alt: Txt;
  ratioBureau: string; ratioTel: string; position?: string;
};
export type Meta = { libelle: Txt; valeur: Txt; vue?: string; href?: string; externe?: boolean; casseNormale?: boolean };

// Adresses réelles des vues (miroir de VIEW_PATHS dans App.tsx).
export const CHEMINS: Record<string, string> = {
  MECENE: '/mecene', CREATOR_STUDIO: '/creator', MECENE_ARTISTES: '/mecene/artistes',
  MECENE_FISCALITE: '/mecene/fiscalite', MECENE_SOUTIEN: '/mecene/soutenir', CEILIDH: '/ceilidh',
  KITCHEN: '/cuisine', COFFRE: '/coffre', PPS: '/soiree-thematique-pps', EVENTS: '/evenements',
  COMMUNITY: '/communaute', WWOOFING: '/wwoofing', PETITE_MONNAIE: '/petite-monnaie', INN: '/',
};

const t = (FR: string, EN = FR): Txt => ({ FR, EN });
const l = (em: number, ...lignes: string[]): Lignes => ({ lignes, em });
const memes = (bureau: Lignes, tel: Lignes) => ({ FR: { bureau, tel }, EN: { bureau, tel } });

export const TITRES = {
  ouverture: { FR: { bureau: l(8.71, "Centre d'arts"), tel: l(4.55, 'Centre', "d'arts") }, EN: { bureau: l(7.67, 'Arts centre'), tel: l(4.55, 'Arts', 'centre') } } as Titre,
  lieu: { FR: { bureau: l(10.47, 'La Maison Favier'), tel: l(6.24, 'La Maison', 'Favier') }, EN: { bureau: l(8.8, 'Maison Favier'), tel: l(4.57, 'Maison', 'Favier') } } as Titre,
  residences: { FR: { bureau: l(7.2, 'Résidences'), tel: l(7.2, 'Résidences') }, EN: { bureau: l(7.57, 'Residencies'), tel: l(7.57, 'Residencies') } } as Titre,
  scene: { FR: { bureau: l(6.27, 'Sur scène'), tel: l(3.77, 'Sur', 'scène') }, EN: { bureau: l(5.68, 'On stage'), tel: l(3.72, 'On', 'stage') } } as Titre,
  mecenes: { FR: { bureau: l(7.91, 'Les mécènes'), tel: l(5.55, 'Les', 'mécènes') }, EN: { bureau: l(5.32, 'Patrons'), tel: l(5.32, 'Patrons') } } as Titre,
  creator: memes(l(9.96, 'Creator Studio'), l(5.35, 'Creator', 'Studio')) as Titre,
  namur: { FR: { bureau: l(8.81, 'Venir à Namur'), tel: l(4.38, 'Venir à', 'Namur') }, EN: { bureau: l(11.03, 'Coming to Namur'), tel: l(6.59, 'Coming to', 'Namur') } } as Titre,
  kamy: memes(l(8.81, 'Kamy Rheault'), l(5.36, 'Kamy', 'Rheault')) as Titre,
  nolin: memes(l(10.07, 'Claude Philippe', 'Nolin'), l(10.07, 'Claude Philippe', 'Nolin')) as Titre,
  alex: memes(l(11.42, 'Alex T. St-Laurent'), l(7.06, 'Alex T.', 'St-Laurent')) as Titre,
};

const B = '/media/centre-arts/';
export const IMAGES = {
  ouverture: { base: B + 'ouverture', largeurs: [960, 1600, 2400, 2880], w: 6016, h: 4000, ratioBureau: '21 / 9', ratioTel: '3 / 2', position: '50% 40%',
    alt: t("Deux interprètes autour d'une table dressée dans un jardin, devant une maison de bois", 'Two performers around a set table in a garden, in front of a wooden house') },
  maison: { base: B + 'maison', largeurs: [960, 1600, 2400], w: 2800, h: 1310, ratioBureau: '21 / 9', ratioTel: '3 / 2',
    alt: t('La Maison Favier au coucher du soleil, au bout de son allée', 'Maison Favier at sunset, at the end of its path') },
  bibliotheque: { base: B + 'bibliotheque', largeurs: [640, 1200, 1696], w: 1696, h: 2528, ratioBureau: '4 / 5', ratioTel: '4 / 5',
    alt: t('Une étagère de la bibliothèque du manoir', "A shelf in the manor's library") },
  salle: { base: B + 'salle-a-manger', largeurs: [960, 1600, 2400], w: 2800, h: 2100, ratioBureau: '4 / 3', ratioTel: '4 / 3',
    alt: t('La salle à manger du manoir et son tapis rouge', "The manor's dining room and its red rug") },
  kamy: { base: B + 'kamy', largeurs: [960, 1600, 2400], w: 2617, h: 1446, ratioBureau: '21 / 9', ratioTel: '4 / 3', position: '45% 15%',
    alt: t('Une femme aux lunettes rondes dans un atelier, entre des guitares et des toiles', 'A woman in round glasses in a studio, among guitars and canvases') },
  nolin: { base: B + 'nolin', largeurs: [640, 1200, 1800], w: 2768, h: 4328, ratioBureau: '4 / 5', ratioTel: '4 / 5', position: '50% 0%',
    alt: t('Portrait de Claude Philippe Nolin en noir et blanc', 'Black and white portrait of Claude Philippe Nolin') },
  alex: { base: B + 'alex', largeurs: [960, 1600, 2400], w: 2800, h: 1712, ratioBureau: '21 / 9', ratioTel: '4 / 3', position: '62% 10%',
    alt: t('Alex T. St-Laurent assis dans les herbes hautes, en veston', 'Alex T. St-Laurent sitting in tall grass, in a waistcoat') },
  mecenes: { base: B + 'mecenes', largeurs: [960, 1600, 2400], w: 2800, h: 2100, ratioBureau: '21 / 9', ratioTel: '4 / 3',
    alt: t("Un salon aux murs rouges, garni d'instruments et d'œuvres", 'A red-walled lounge filled with instruments and artwork') },
  murale: { base: B + 'murale', largeurs: [800, 1544], w: 1544, h: 980, ratioBureau: '3 / 2', ratioTel: '3 / 2',
    alt: t('Une artiste peint une murale sur un mur de planches', 'An artist painting a mural on a wooden wall') },
  namur: { base: B + 'namur', largeurs: [960, 1600, 2400], w: 2800, h: 1575, ratioBureau: '21 / 9', ratioTel: '3 / 2', position: '60% 100%',
    alt: t('Le domaine vu du ciel, au milieu des forêts de la Petite-Nation en automne', 'The estate seen from above, among the autumn forests of the Petite-Nation') },
} satisfies Record<string, ImageCA>;

export const BILLETS = [
  { img: 'billet-pichette', quand: t('Ven 22 mai · 20 h', 'Fri May 22 · 8 pm'), nom: 'Éric Pichette',
    alt: t("Affiche du spectacle d'Éric Pichette, le vendredi 22 mai 2026 à 20 h", "Poster for Éric Pichette's show, Friday May 22, 2026 at 8 pm") },
  { img: 'billet-nault', quand: t('Sam 23 mai · 21 h', 'Sat May 23 · 9 pm'), nom: 'Marie Laurence Nault',
    alt: t('Affiche du spectacle Mosaïque de Marie Laurence Nault, le samedi 23 mai 2026 à 21 h', "Poster for Marie Laurence Nault's show Mosaïque, Saturday May 23, 2026 at 9 pm") },
  { img: 'billet-martin', quand: t('Dim 24 mai · 20 h 30', 'Sun May 24 · 8:30 pm'), nom: 'Tania Martin',
    alt: t('Affiche du spectacle de Tania Martin, le dimanche 24 mai 2026 à 20 h 30', "Poster for Tania Martin's show, Sunday May 24, 2026 at 8:30 pm") },
];

export const S1 = {
  surtitre: t('Le Salon des Inconnus, à Namur', 'Le Salon des Inconnus, in Namur'),
  sousTitre: t('et communauté', 'and community'),
  texte: t(
    "Le centre d'arts n'a pas d'autre adresse que la Maison Favier, à Namur. Le manoir accueille des artistes en résidence et présente des spectacles vivants dans sa propre salle, et les œuvres des artistes que nous représentons sont accrochées à ses murs, offertes aux invités qui séjournent chez nous.",
    'The arts centre has no other address than Maison Favier, in Namur. The manor hosts artists in residence and presents live shows in its own hall, and the work of the artists we represent hangs on its walls, offered to the guests who stay with us.'),
  metas: [
    { libelle: t("Vous soutenez l'art", 'You support art'), valeur: t('Les mécènes', 'Patrons'), vue: 'MECENE' },
    { libelle: t('Vous êtes artiste', 'You are an artist'), valeur: t('Creator Studio'), vue: 'CREATOR_STUDIO' },
    { libelle: t('Le lieu', 'The place'), valeur: t('Maison Favier, 1898') },
    { libelle: t('La région', 'The region'), valeur: t('Petite-Nation, Outaouais') },
  ] as Meta[],
};

export const S2 = {
  surtitre: t('Le lieu', 'The place'),
  sousTitre: t('Un manoir victorien de 1898', 'A Victorian manor built in 1898'),
  texte: t(
    "Le manoir loue cinq chambres dont les noms annoncent la couleur, puisque la Musicienne et l'Écrivaine y côtoient la Cinéaste, le Théâtre et la Tour. Autour d'elles s'ouvrent la salle de spectacle et la bibliothèque, puis la salle à manger commune, et dehors, les jardins et la serre mènent jusqu'à la yourte et à l'autobus aménagé qui abrite un piano.",
    'The manor rents five rooms whose names set the tone, since the Musicienne and the Écrivaine sit alongside the Cinéaste, the Théâtre and the Tour. Around them open the performance hall and the library, then the shared dining room, and outside, the gardens and the greenhouse lead to the yurt and to the converted bus, which houses a piano.'),
  metas: [
    { libelle: t('Construit', 'Built'), valeur: t('1898') },
    { libelle: t('Chambres', 'Rooms'), valeur: t('Cinq, au manoir', 'Five, in the manor') },
    { libelle: t('Scène', 'Stage'), valeur: t('Une salle de spectacle', 'A performance hall') },
    { libelle: t('Dehors', 'Outside'), valeur: t('Les jardins et la yourte', 'The gardens and the yurt') },
  ] as Meta[],
};

const auCatalogue: Meta = { libelle: t('Voir aussi', 'See also'), valeur: t('Au catalogue', 'In the catalogue'), vue: 'MECENE_ARTISTES' };

export const S3 = {
  surtitre: t("Résidences d'artistes", 'Artist residencies'),
  sousTitre: t('Nous accueillons des artistes en résidence', 'We host artists in residence'),
  texte: t(
    "Le manoir ouvre ses portes aux artistes en résidence, qui partagent la maison avec les musiciens et les entrepreneurs, et avec les wwoofers de la saison. Pour proposer une résidence, écrivez-nous à alex@lesalondesinconnus.com en présentant votre projet en quelques lignes et en précisant les dates qui vous conviennent.",
    "The manor opens its doors to artists in residence, who share the house with musicians and entrepreneurs, and with the season's wwoofers. To propose a residency, write to us at alex@lesalondesinconnus.com with a few lines about your project and the dates that suit you."),
  bouton: t('Proposer une résidence', 'Propose a residency'),
  mailto: t('mailto:alex@lesalondesinconnus.com?subject=Proposition%20de%20r%C3%A9sidence', 'mailto:alex@lesalondesinconnus.com?subject=Residency%20proposal'),
  surtitreFiches: t('Les artistes que nous représentons', 'The artists we represent'),
  kamy: {
    metas: [
      { libelle: t('Discipline'), valeur: t('Art actuel, peinture, sculpture et installations', 'Contemporary art, painting, sculpture and installations'), casseNormale: true },
      { libelle: t('Région', 'Region'), valeur: t('Petite-Nation') },
      auCatalogue,
    ] as Meta[],
    texte: t("Kamy Rheault travaille la peinture, la sculpture et l'installation, et occupe l'espace autant que la toile.", 'Kamy Rheault works in painting, sculpture and installation, and takes up the space as much as the canvas.'),
  },
  nolin: {
    metas: [
      { libelle: t('Discipline'), valeur: t('Arts visuels', 'Visual arts') },
      { libelle: t('Région', 'Region'), valeur: t('Petite-Nation') },
      auCatalogue,
    ] as Meta[],
    texte: t("Artiste visuel, Claude Philippe Nolin travaille à rendre visible ce qui ne l'est pas.", 'A visual artist, Claude Philippe Nolin works at making visible what is not.'),
  },
  alex: {
    metas: [
      { libelle: t('Discipline'), valeur: t('Cinéma, photo, théâtre et direction', 'Film, photography, theatre and direction'), casseNormale: true },
      { libelle: t('Au Salon', 'At the Salon'), valeur: t('Fondateur et directeur', 'Founder and director') },
      auCatalogue,
    ] as Meta[],
    texte: t(
      "Fondateur et directeur du Salon des Inconnus, Alex ajoute à sa mission artistique celle de tenir l'espace d'un lieu rassembleur, guérisseur et créatif.",
      'Founder and director of Le Salon des Inconnus, Alex adds to his artistic mission that of holding the space for a gathering, healing and creative place.'),
  },
  cloture: [{ libelle: t('Tous nos artistes', 'All our artists'), valeur: t('Le catalogue du centre', "The centre's catalogue"), vue: 'MECENE_ARTISTES' }] as Meta[],
};

export const S4 = {
  surtitre: t('Spectacles et ateliers', 'Shows and workshops'),
  sousTitre: t('La salle de spectacle du manoir', "The manor's performance hall"),
  texte: t(
    "Le Salon des Inconnus accueille toute l'année des spectacles vivants et des résidences artistiques, mais aussi des banquets et des rassemblements communautaires, et sa programmation va de la musique et de la danse jusqu'au théâtre et à la performance.",
    'Le Salon des Inconnus hosts live performances and artist residencies year-round, along with banquets and community gatherings, and its program runs from music and dance to theatre and performance.'),
  surtitreCeilidh: t('Grand Ceilidh de Mai 2026'),
  metasCeilidh: [
    { libelle: t('Quand', 'When'), valeur: t('Du 21 au 25 mai 2026', 'May 21 to 25, 2026') },
    { libelle: t('Où', 'Where'), valeur: t('Maison Favier, Namur') },
    { libelle: t('Esprit', 'Spirit'), valeur: t('Le ceilidh écossais et irlandais', 'The Scottish and Irish ceilidh') },
    { libelle: t('Voir aussi', 'See also'), valeur: t('La page du Ceilidh', 'The Ceilidh page'), vue: 'CEILIDH' },
  ] as Meta[],
  surtitreAteliers: t('Ateliers et soirées', 'Workshops and evenings'),
  ateliers: [
    { libelle: t('Ateliers culinaires', 'Culinary workshops'), valeur: t('La fermentation et le dressage jusqu\'aux techniques moléculaires, avec le chef Marc Alexis Pepin', 'Fermentation and plating through to molecular techniques, with chef Marc Alexis Pepin'), vue: 'KITCHEN' },
    { libelle: t('En famille', 'For families'), valeur: t("Le Coffre des Inconnus, l'application gratuite d'économie personnelle et familiale, de 4 ans au doctorat", 'Le Coffre des Inconnus, the free personal and family finance app, from age 4 to the doctorate'), vue: 'COFFRE' },
    { libelle: t('Soirées thématiques', 'Theme evenings'), valeur: t('Des soirées clés en main pour les groupes, en partenariat avec PPS Canada', 'Turnkey evenings for groups, in partnership with PPS Canada'), vue: 'PPS' },
    { libelle: t('Événements privés', 'Private events'), valeur: t('Le manoir et ses jardins se réservent pour les mariages et les retraites', 'The manor and its gardens can be booked for weddings and retreats'), vue: 'EVENTS' },
  ] as Meta[],
};

export const S5 = {
  surtitre: t("Acheter et soutenir l'art", 'Buying and supporting art'),
  sousTitre: t("Soutenir l'art autrement", 'Supporting art differently'),
  texte: t(
    "Chez les mécènes, vous trouvez les artistes que nous représentons et les façons de soutenir leur travail comme celui du centre, avec en prime ce qu'il faut savoir sur la fiscalité de l'achat d'œuvres au Québec.",
    "On the patrons' side, you will find the artists we represent and the ways to support their work and the centre's, along with what you need to know about the tax side of buying art in Quebec."),
  rangees: [
    { libelle: t('Nos artistes', 'Our artists'), valeur: t('Le catalogue des artistes que nous représentons', 'The catalogue of the artists we represent'), vue: 'MECENE_ARTISTES' },
    { libelle: t('Investir et économiser', 'Invest and save'), valeur: t("La fiscalité de l'achat d'œuvres au Québec", 'The tax side of buying art in Quebec'), vue: 'MECENE_FISCALITE' },
    { libelle: t('Soutenir le centre', 'Support the centre'), valeur: t('Les paliers de mécénat et le Don partagé', 'Patronage tiers and the Split Donation'), vue: 'MECENE_SOUTIEN' },
  ] as Meta[],
  bouton: t('Entrer chez les mécènes', "Enter the patrons' side"),
};

export const S6 = {
  surtitre: t('Communauté et Creator Studio', 'Community and Creator Studio'),
  sousTitre: t("L'atelier des artistes", "The artists' workshop"),
  texte: t(
    "Le Creator Studio est l'espace de travail des artistes en résidence, des interprètes et des collaborateurs du Salon, qui y bâtissent leur profil, y publient leurs écrits et peuvent y demander une mise en avant. Il est ouvert en version bêta.",
    "The Creator Studio is the workspace of the Salon's artists in residence and performers, and of its collaborators, who build their profile and publish their writing there, and can ask to be featured. It is open as a beta."),
  bouton: t('Entrer au Creator Studio', 'Enter the Creator Studio'),
  surtitreRangees: t('La communauté', 'The community'),
  rangees: [
    { libelle: t('Membre résident', 'Resident member'), valeur: t('Une place rémunérée pour vivre et travailler au Salon, logé dans le bus aménagé', 'A paid place to live and work at the Salon, housed in the converted bus'), vue: 'COMMUNITY' },
    { libelle: t('Wwoofing'), valeur: t("Quatre heures de travail par jour en échange du gîte et du couvert, pour un séjour d'au moins sept jours", 'Four hours of work a day in exchange for room and board, for a stay of at least seven days'), vue: 'WWOOFING' },
    { libelle: t('Le Dôme des Inconnus'), valeur: t('La communauté', 'The community'), href: 'https://ledomedesinconnus.com/', externe: true },
    { libelle: t('La Petite Monnaie'), valeur: t('La monnaie locale de la Petite-Nation', 'The local currency of the Petite-Nation'), vue: 'PETITE_MONNAIE' },
  ] as Meta[],
};

export const S7 = {
  surtitre: t('Venir au Salon', 'Getting here'),
  sousTitre: t('Dans la Petite-Nation, en Outaouais', 'In the Petite-Nation, Outaouais'),
  adresses: [
    [t('826 Côte à Favier'), t('Namur (Québec)', 'Namur (Quebec)'), t('J0V 1N0')],
    [t('Parc Oméga'), t('Montebello'), t('25 minutes')],
    [t('Mont-Tremblant'), t('Domaine skiable', 'Ski resort'), t('35 minutes')],
  ],
  rangees: [
    { libelle: t('Séjourner', 'Stay'), valeur: t('Réserver une chambre à l\'auberge', 'Book a room at the inn'), vue: 'INN' },
    { libelle: t('Téléphone', 'Phone'), valeur: t('514 418 3450'), href: 'tel:+15144183450', casseNormale: true },
    { libelle: t('Courriel', 'Email'), valeur: t('alex@lesalondesinconnus.com'), href: 'mailto:alex@lesalondesinconnus.com', casseNormale: true },
  ] as Meta[],
};
