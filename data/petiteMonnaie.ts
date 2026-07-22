// La Petite Monnaie — content + curated parcours data.
// Single source of truth for the /petite-monnaie page: the intro copy, the
// four ways to obtain pm, and the geographic route of merchants rendered as
// 3D "pastilles" (same round gold orbs as the room cards).
//
// `coords` are normalized 0-1 positions on the STYLIZED map (x: west→east,
// y: north→south), hand-placed to echo the real Petite-Nation geography so the
// scroll-dive reads as a believable descent from the Salon (Montpellier) south.
// Photos: official pmonnaie.ca where they exist, tourism/business sites otherwise.

export interface PMStop {
  id: string;
  name: string;
  village: string;
  category: string;
  blurb: string;
  image: string;
  link?: string;
  isStart?: boolean;        // Le Salon — the entry point
  isBureauDeChange?: boolean;
  logo?: boolean;           // image is a wordmark logo → contain + light it on the dark orb
  perk?: string;            // a highlighted offer shown on this stop's panel
  address?: string;         // physical address / locality, shown in the panel
  coords: { x: number; y: number };
}

const PM_IMG = 'https://pmonnaie.ca/wp-content/uploads/2024/04';

// ── Intro: what La Petite Monnaie is ────────────────────────────────────────
export const PM_INTRO = {
  eyebrow: 'La monnaie locale de la Petite-Nation',
  title: 'La Petite Monnaie',
  lede:
    "Une monnaie locale et communautaire qui circule dans la MRC de Papineau. " +
    "Une petite-monnaie vaut un dollar canadien, tout simplement. Chaque billet " +
    "dépensé reste dans la région, chez les artisans, les fermes et les cafés qui " +
    "font vivre la Petite-Nation.",
  facts: [
    { value: '1 : 1', label: 'Une petite-monnaie = un dollar canadien' },
    { value: '+5 %', label: 'Bonification à chaque recharge' },
    { value: '150+', label: 'Commerces participants en Petite-Nation' },
    { value: '100 %', label: 'Basée sur la confiance et sécurisée' },
  ],
};

// ── How to obtain it ────────────────────────────────────────────────────────
export interface PMProcureStep {
  id: string;
  icon: string;
  title: string;
  body: string;
  metal: 'green' | 'gold' | 'silver' | 'bronze';
  cta?: { label: string; href: string };
}

export const PM_PROCURE: PMProcureStep[] = [
  {
    id: 'app',
    icon: '📱',
    metal: 'green',
    title: "Sur l'application mobile",
    body:
      "Téléchargez l'application Petite-monnaie sur iOS ou Android, créez votre " +
      "compte et rechargez votre solde. Une bonification de 5 % s'ajoute à chaque " +
      "recharge. L'activation se fait en un à deux jours ouvrables.",
    cta: { label: "Obtenir l'application", href: 'https://pmonnaie.ca/ou-se-procurer-de-la-petite-monnaie/' },
  },
  {
    id: 'bureaux',
    icon: '🏪',
    metal: 'gold',
    title: 'Aux bureaux de change',
    body:
      "Onze commerces phares font office de guichets. Payez en argent comptant ou " +
      "par carte de débit à la caisse, et repartez avec une enveloppe scellée de " +
      "105 petites-monnaies pour 100 $. La bonification de 5 % est déjà incluse.",
  },
  {
    id: 'zeffy',
    icon: '💳',
    metal: 'silver',
    title: 'En ligne, avec Zeffy',
    body:
      "Rechargez votre petite-monnaie virtuelle via notre partenaire Zeffy. " +
      "Paiement sécurisé, sans frais pour la coopérative, avec la même " +
      "bonification de 5 %.",
    cta: { label: 'Recharger avec Zeffy', href: 'https://pmonnaie.ca/recharger-avec-zeffy/' },
  },
  {
    id: 'poste',
    icon: '✉️',
    metal: 'bronze',
    title: 'Par la poste',
    body:
      "Commandez des billets papier sur la boutique en ligne et faites-les livrer " +
      "chez vous. Pratique pour offrir en cadeau ou si vous habitez plus loin. " +
      "Des frais de livraison s'appliquent à ce mode.",
    cta: { label: 'Acheter en ligne', href: 'https://pmonnaie.ca/boutique/' },
  },
];

// ── The parcours: Salon (Namur) → through the Petite-Nation. Coordinates are the real
// projected positions of each village (data/petiteNationGeo.ts); the four Ripon
// stops are nudged apart so they don't stack on the same point.
export const PM_STOPS: PMStop[] = [
  {
    id: 'salon',
    name: 'Le Salon des Inconnus',
    village: 'Namur',
    category: "Votre point de départ",
    blurb:
      "Le voyage commence ici, à l'auberge de Namur. Procurez-vous vos premières " +
      "petites-monnaies sur place, prenez la carte de la région, et suivez la rivière.",
    image: 'https://storage.googleapis.com/salondesinconnus/inn/maison.jpg',
    isStart: true,
    isBureauDeChange: true,
    perk: 'Un café barista, offert, avec votre enveloppe de petites-monnaies',
    address: 'Namur, Petite-Nation',
    coords: { x: 0.6225, y: 0.294 },
  },
  {
    id: 'carbo-bbq',
    name: 'Carbo BBQ',
    village: 'Duhamel',
    category: 'Restaurant fumoir',
    blurb:
      "Tout au nord, au bord du lac Simon, le fumoir de Duhamel : viandes fumées " +
      "lentement et tablée généreuse après une journée en forêt.",
    image: 'https://www.petitenationoutaouais.com/wp-content/uploads/2021/09/carbo-barbecue-martin-tremblay-4.jpg',
    isBureauDeChange: true,
    address: 'Duhamel',
    coords: { x: 0.4302, y: 0.06 },
  },
  {
    id: 'festival-medieval',
    name: 'Festival Médiéval de Montpellier',
    village: 'Montpellier',
    category: 'Festival · arts vivants & artisans',
    blurb:
      "Trois jours où Montpellier remonte le temps : joutes équestres, forge, " +
      "musique et grand marché d'artisans. Le grand rendez-vous médiéval de la Petite-Nation, à deux pas de l'auberge.",
    image: 'https://www.petitenationoutaouais.com/wp-content/uploads/2025/09/festival-medieval-de-montpellier.jpg',
    link: 'https://www.festivalmedievaldemontpellier.org/',
    address: 'Montpellier',
    coords: { x: 0.3224, y: 0.3691 },
  },
  {
    id: 'solart',
    name: "Atelier Galerie d'art Solart",
    village: 'Ripon',
    category: 'Galerie · céramique & sculpture',
    blurb:
      "Dans une ancienne forge du hameau du lac Grosleau, Michelle Lemire crée et " +
      "expose céramiques, sculptures et bijoux depuis 1999. Le cœur des arts visuels de la Petite-Nation.",
    image: 'https://www.ateliergaleriedartsolart.com/cdn/shop/files/SOLART_LOGO_WEB_2022_modifie-1_400x200.jpg?v=1651070679',
    logo: true,
    link: 'https://www.ateliergaleriedartsolart.com/',
    address: '211, chemin du Lac-Grosleau, Ripon',
    coords: { x: 0.382, y: 0.486 },
  },
  {
    id: 'cafe-des-orties',
    name: 'Le Café des Orties',
    village: 'Ripon',
    category: 'Café communautaire & galerie',
    blurb:
      "Installé dans un ancien presbytère, mets biologiques, vins naturels et cidres " +
      "artisanaux. Les murs font galerie tournante : le vrai cœur de la vie artistique de la Petite-Nation.",
    image: `${PM_IMG}/Cafe-des-orties.jpg`,
    link: 'https://www.facebook.com/cafedesorties/',
    address: '46, rue Principale, Ripon',
    coords: { x: 0.418, y: 0.498 },
  },
  {
    id: 'fille-du-boulanger',
    name: 'La Fille du Boulanger',
    village: 'Ripon',
    category: 'Boulangerie au levain',
    blurb:
      "On moud ici sa propre farine de grains biologiques et on cuit des miches au " +
      "levain sur commande, pour réduire le gaspillage. Le samedi, on vient chercher son pain et on croise tout le village.",
    image: 'https://www.lafilleduboulanger.ca/wp-content/uploads/img_0101-770x1024.jpg',
    link: 'https://www.lafilleduboulanger.ca/',
    address: '42, montée Meunier, Ripon',
    coords: { x: 0.398, y: 0.520 },
  },
  {
    id: 'coop-place-du-marche',
    name: 'Coop Place du Marché',
    village: 'Ripon',
    category: 'Marché public · maison de la Petite Monnaie',
    blurb:
      "La coopérative qui porte la petite-monnaie : marché public, scène, 5 à 7 du " +
      "vendredi. À Ripon, même le maire touche une part de son salaire en petites-monnaies.",
    image: `${PM_IMG}/Cooperative-Place-du-Marche.jpg`,
    link: 'https://www.cooperativeplacedumarche.com/',
    isBureauDeChange: true,
    address: '4, rue du Marché, Ripon',
    coords: { x: 0.430, y: 0.510 },
  },
  {
    id: 'alliance-alimentaire',
    name: 'Alliance Alimentaire Papineau',
    village: 'Saint-André-Avellin',
    category: 'Économie sociale',
    blurb:
      "Le pôle nourricier de la région : sécurité alimentaire, producteurs locaux " +
      "et la petite-monnaie solidaire pour celles et ceux qui en ont besoin.",
    image: `${PM_IMG}/alliance.jpg`,
    isBureauDeChange: true,
    address: 'Saint-André-Avellin',
    coords: { x: 0.4593, y: 0.6167 },
  },
  {
    id: 'ferme-aux-colibris',
    name: 'Ferme aux Colibris',
    village: 'Saint-Sixte',
    category: 'Ferme maraîchère',
    blurb:
      "Une ferme à dimension humaine où l'on cultive des légumes de saison et l'art " +
      "des circuits courts. De la terre à votre assiette, sans détour.",
    image: `${PM_IMG}/Colibri.jpg`,
    isBureauDeChange: true,
    address: 'Saint-Sixte',
    coords: { x: 0.2663, y: 0.6585 },
  },
  {
    id: 'les-mignardises',
    name: 'Les Mignardises',
    village: 'Papineauville',
    category: 'Pâtisserie & boulangerie',
    blurb:
      "Sur la route du fleuve, à Papineauville, viennoiseries, pâtisseries et pains " +
      "frais. Une institution gourmande de la Petite-Nation.",
    image: `${PM_IMG}/Mignardises.jpg`,
    isBureauDeChange: true,
    address: 'Papineauville',
    coords: { x: 0.507, y: 0.8058 },
  },
  {
    id: 'chocomotive',
    name: 'Chocomotive',
    village: 'Montebello',
    category: 'Chocolaterie artisanale',
    blurb:
      "Au bord de l'Outaouais, dans l'ancienne gare de Montebello, une chocolaterie " +
      "artisanale et son économusée. La dernière gourmandise du parcours, face au fleuve.",
    image: `${PM_IMG}/Chocomotive.jpg`,
    isBureauDeChange: true,
    address: 'Montebello',
    coords: { x: 0.6067, y: 0.7461 },
  },
];

// Maps-search fallback so every pastille is clickable to a physical location,
// even when the business has no website link of its own.
export const mapsLink = (s: PMStop) =>
  s.link ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${s.address ?? s.village}, Québec`)}`;

// ── Bureaux de change ───────────────────────────────────────────────────────
// Official exchange points (pmonnaie.ca) where you swap CAD for a sealed
// envelope of 105 petites-monnaies for 100 $. Le Salon des Inconnus is one of
// them, with a free barista coffee on every envelope.
export interface PMBureau { name: string; village: string; salon?: boolean; perk?: string; }
export const PM_BUREAUX: PMBureau[] = [
  { name: 'Le Salon des Inconnus', village: 'Namur', salon: true, perk: "Café barista offert à l'achat d'une enveloppe" },
  { name: 'Marché Faubert', village: 'Montpellier' },
  { name: 'Carbo BBQ', village: 'Duhamel' },
  { name: 'Le Café des Orties', village: 'Ripon' },
  { name: 'Coop Place du Marché', village: 'Ripon' },
  { name: 'Alliance Alimentaire Papineau', village: 'Saint-André-Avellin' },
  { name: 'Ferme aux Colibris', village: 'Saint-Sixte' },
  { name: 'Les Mignardises', village: 'Papineauville' },
  { name: 'Chocomotive', village: 'Montebello' },
  { name: 'Dépanneur Bowman', village: 'Bowman' },
  { name: 'Dépanneur 10-10', village: 'Thurso' },
];
