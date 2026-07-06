
export const SITE_URL = "https://www.lesalondesinconnus.com";

export const CONTACT_INFO = {
  address: "826 Côte à Favier",
  locality: "Namur",
  region: "QC",
  postalCode: "J0V 1N0",
  country: "CA",
  phone: "+15144183450",
  coords: {
    lat: 45.8943,
    lng: -74.9118
  }
};

export const SEMANTIC_NEIGHBORS = [
  // The "Big 4" Magnets
  { name: "Parc Oméga", type: "TouristAttraction", url: "https://www.parcomega.ca", address: "Montebello, QC" },
  { name: "Fairmont Le Château Montebello", type: "Hotel", url: "https://www.fairmont.com/montebello", address: "Montebello, QC" },
  { name: "Parc des Montagnes Noires de Ripon", type: "TouristAttraction", url: "https://parcdesmontagnesnoires.ca", address: "Ripon, QC" },
  { name: "Centre touristique du Lac-Simon", type: "TouristAttraction", url: "https://www.sepaq.com/pq/lsi", address: "Duhamel, QC" },
  { name: "Mont Tremblant Ski Resort", type: "SkiResort", url: "https://www.tremblant.ca", address: "Mont-Tremblant, QC" },

  // The "Petite Nation" Flavor (Food & Culture)
  { name: "Café des Orties", type: "Restaurant", address: "Ripon, QC" },
  { name: "Koko Café", type: "Restaurant", address: "Namur, QC" },
  { name: "Brasseurs de Montebello", type: "Brewery", address: "Montebello, QC" },
  { name: "ChocoMotive", type: "FoodEstablishment", address: "Montebello, QC" },
  { name: "Fromagerie Montebello", type: "FoodEstablishment", address: "Montebello, QC" },
  { name: "Kenauk Nature", type: "TouristAttraction", address: "Montebello, QC" },
  { name: "Chutes de Plaisance", type: "TouristAttraction", address: "Plaisance, QC" },
  { name: "Lieu historique national du Manoir-Papineau", type: "LandmarksOrHistoricalBuildings", address: "Montebello, QC" }
];

export const UPCOMING_EVENTS = [
  // WINTER 2026 (The "Cozy & Sport" Season)
  { name: "Fête des Semences de la Petite-Nation", date: "2026-01-24", location: "Papineauville" },
  { name: "Bal de Neige (Winterlude)", date: "2026-01-30", endDate: "2026-02-16", location: "Gatineau/Ottawa" },
  { name: "Marathon Canadien de Ski (CSM)", date: "2026-02-06", endDate: "2026-02-08", location: "Montebello to Lachute" },
  { name: "Gatineau Loppet", date: "2026-02-13", endDate: "2026-02-15", location: "Gatineau Park" },
  { name: "Montebello Fatbike Festival", date: "2026-02-20", endDate: "2026-02-22", location: "Montebello" },
  { name: "Tournoi de Pêche Blanche", date: "2026-02-28", location: "Lac-Simon" },

  // SPRING 2026 (The "Awakening" Season)
  { name: "Festival de la Truite de Saint-Sixte", date: "2026-05-15", endDate: "2026-05-17", location: "Saint-Sixte" },
  { name: "Canadian Tulip Festival", date: "2026-05-08", endDate: "2026-05-18", location: "Ottawa" },
  { name: "Challenge cycliste des Collines", date: "2026-05-23", location: "Outaouais" },
  { name: "Marché Public de la Petite-Nation (Opening)", date: "2026-06-06", location: "Ripon" },

  // SUMMER 2026 (The "Crowd & Music" Season)
  { name: "Festival Outaouais en fête", date: "2026-06-19", endDate: "2026-06-24", location: "Parc des Cèdres" },
  { name: "Saint-Jean-Baptiste (National Holiday)", date: "2026-06-24", location: "Saint-André-Avellin / Montebello" },
  { name: "Tremblant International Blues Festival", date: "2026-07-08", endDate: "2026-07-12", location: "Mont-Tremblant" },
  { name: "Festival Western St-André-Avellin", date: "2026-07-16", endDate: "2026-07-26", location: "Saint-André-Avellin" },
  { name: "Twist Fibre Festival", date: "2026-08-07", endDate: "2026-08-09", location: "Saint-André-Avellin" },
  { name: "Petite Nation en Fête", date: "2026-08-12", endDate: "2026-08-15", location: "Thurso" },
  { name: "Val-des-Bois en Musique", date: "2026-08-27", endDate: "2026-08-29", location: "Val-des-Bois" },

  // FALL 2026 (The "Colors & Culture" Season)
  { name: "Gatineau Hot Air Balloon Festival", date: "2026-09-02", endDate: "2026-09-06", location: "Gatineau" },
  { name: "Ripon Trad Festival", date: "2026-09-17", endDate: "2026-09-20", location: "Ripon" },
  { name: "Festival Médiéval de Montpellier", date: "2026-09-19", endDate: "2026-09-21", location: "Montpellier" },
  { name: "Symposium d'art in situ", date: "2026-09-26", endDate: "2026-09-27", location: "Plaisance" },
  { name: "Festival de la Galette de Sarrasin", date: "2026-10-02", endDate: "2026-10-11", location: "Louiseville" },
  { name: "NCC Fall Rhapsody", date: "2026-10-01", endDate: "2026-10-25", location: "Gatineau Park" }
];

export const PAGE_META = {
  INN: {
    EN: {
      title: "Le Salon des Inconnus | Artistic Inn in Outaouais (Namur, QC)",
      description: "Victorian manor inn in Namur, Outaouais. Artist & entrepreneur residency with spa, hot tub, live music and wwoofing, 25 min from Parc Oméga.",
      keywords: "Parc Omega hotel, Chateau Montebello alternative, Lac à l'épaule Outaouais, Montagnes Noires Ripon"
    },
    FR: {
      title: "Le Salon des Inconnus | Auberge d'artistes en Outaouais (Namur)",
      description: "Manoir victorien à Namur, Outaouais. Auberge pour artistes et entrepreneurs avec spa, jacuzzi, spectacles et wwoofing, à 25 min du Parc Oméga.",
      keywords: "Hôtel Parc Oméga, Hébergement Montebello, Lac à l'épaule Petite Nation, Hotel near Parc Omega, Bed and Breakfast Quebec, Auberge Ripon"
    }
  },
  INN_TEST2: {
    EN: { title: "Inn Editorial Test 2 | Le Salon des Inconnus", description: "Editorial hero test (Bespoke pattern).", keywords: "" },
    FR: { title: "Test Éditorial 2 | Le Salon des Inconnus", description: "Test de hero éditorial (motif Bespoke).", keywords: "" },
  },
  INN_TEST3: {
    EN: { title: "Inn Editorial Test 3 | Le Salon des Inconnus", description: "Bold rebuild: cinematic hero with motion.", keywords: "" },
    FR: { title: "Test Éditorial 3 | Le Salon des Inconnus", description: "Refonte audacieuse : hero cinématique avec animations.", keywords: "" },
  },
  KITCHEN: {
    EN: { 
        title: "The Culinary Lab | Molecular Catering & Portuguese Bistronomy", 
        description: "Signature kitchen by chef Marc Alexis Pepin: Portuguese bistronomy and molecular cuisine. Catering for weddings and events across Outaouais.",
        keywords: "Molecular Catering, Private Chef Ottawa, Portuguese Bistronomy, Wedding Catering Quebec, Traiteur Outaouais" 
    },
    FR: { 
        title: "Le Laboratoire Culinaire | Traiteur Moléculaire & Bistronomie Portugaise", 
        description: "Cuisine signature du chef Marc Alexis Pepin : bistronomie portugaise et cuisine moléculaire. Traiteur pour mariages et événements en Outaouais.",
        keywords: "Traiteur Moléculaire, Chef Privé Montréal, Bistronomie Portugaise, Mariage Outaouais, Catering Ottawa, Private Chef Quebec" 
    }
  },
  MASSOTHERAPY: {
    EN: { title: "Massage & Reiki in Outaouais | Le Salon des Inconnus", description: "Massage therapy and reiki at Maison Favier with Andrée Dancause. Spa and hot tub on site, in Namur, Outaouais. Member rates available.", keywords: "Massage Petite Nation, Reiki Ripon" },
    FR: { title: "Massothérapie & Reiki en Outaouais | Le Salon des Inconnus", description: "Massothérapie et reiki à la Maison Favier avec Andrée Dancause. Spa et jacuzzi sur place, à Namur en Outaouais. Tarifs membres disponibles.", keywords: "Massothérapie Petite Nation, Reiki Ripon" }
  },
  HOSTS: {
    EN: { title: "Hosts & Team | Le Salon des Inconnus, Namur", description: "Meet the team behind Le Salon des Inconnus: Alex T. St-Laurent, chef Marc Alexis Pepin, massage therapist Andrée Dancause and resident artists.", keywords: "Artistic Residency Quebec, Maison Favier History" },
    FR: { title: "Hôtes & Équipe | Le Salon des Inconnus, Namur", description: "Rencontrez l'équipe du Salon des Inconnus : Alex T. St-Laurent, le chef Marc Alexis Pepin, la massothérapeute Andrée Dancause et les artistes en résidence.", keywords: "Résidence d'artiste Québec, Histoire Maison Favier" }
  },
  GUIDE: {
    EN: { title: "Local Guide to Petite-Nation & Outaouais | Le Salon des Inconnus", description: "What to do around the inn: Parc Oméga, Lac-Simon, Montagnes Noires, Mont-Tremblant, Petite-Nation festivals and local food and drink.", keywords: "Guide Outaouais, Things to do Montebello" },
    FR: { title: "Guide local de la Petite-Nation et de l'Outaouais", description: "Quoi faire autour de l'auberge : Parc Oméga, Lac-Simon, Montagnes Noires, Mont-Tremblant, festivals et adresses gourmandes de la Petite-Nation.", keywords: "Guide Outaouais, Quoi faire Montebello" }
  },
  PETITE_MONNAIE: {
    EN: { title: "La Petite Monnaie · Local Currency of the Petite-Nation | Le Salon des Inconnus", description: "What La Petite Monnaie is, how to get it, and a scroll-through route of the artistic and community merchants of the Petite-Nation that accept it, starting at the inn.", keywords: "Petite Monnaie, monnaie locale Outaouais, Petite-Nation, achat local" },
    FR: { title: "La Petite Monnaie · la monnaie locale de la Petite-Nation | Le Salon des Inconnus", description: "Ce qu'est la Petite Monnaie, comment s'en procurer, et un parcours immersif des commerces artistiques et communautaires de la Petite-Nation qui l'acceptent, au départ de l'auberge.", keywords: "Petite Monnaie, monnaie locale Outaouais, Petite-Nation, achat local, pmonnaie" }
  },
  EVENTS: {
    EN: { title: "Events at Maison Favier | Le Salon des Inconnus", description: "Live shows, residencies and gatherings at Le Salon des Inconnus, Namur. Next: Grand Ceilidh de Mai 2026 (May 21–25). Private bookings available.", keywords: "Events Outaouais, Cultural events Quebec" },
    FR: { title: "Événements à la Maison Favier | Le Salon des Inconnus", description: "Spectacles, résidences et rassemblements au Salon des Inconnus, Namur. Prochain : Grand Ceilidh de Mai 2026 (21–25 mai). Réservations privées.", keywords: "Événements Outaouais, Événements culturels Québec" }
  },
  CEILIDH: {
    EN: { title: "Grand Ceilidh de Mai 2026 · Festival in Namur | Le Salon des Inconnus", description: "Five-day community festival at Maison Favier, May 21–25, 2026. Live music, dance, banquet, shared work and wwoofing in Namur, Outaouais.", keywords: "Ceilidh Quebec, Festival communautaire 2026, Wwoofing event" },
    FR: { title: "Grand Ceilidh de Mai 2026 · Festival à Namur | Le Salon des Inconnus", description: "Festival communautaire de cinq jours à la Maison Favier, du 21 au 25 mai 2026. Musique, danse, banquet, chantiers communs et wwoofing en Outaouais.", keywords: "Ceilidh Québec, Festival communautaire 2026, Événement Wwoofing" }
  },
  WWOOFING: {
    EN: { title: "Wwoofing in Outaouais | Le Salon des Inconnus, Namur", description: "Wwoofing at Maison Favier: 4 hours of work a day for room, board and community life. Weekly or monthly stays until end of October, prospector bunkhouse tent or tiny house. Namur, Outaouais.", keywords: "Wwoofing Quebec, Wwoofing Outaouais, Volunteer farm Quebec" },
    FR: { title: "Programme de Wwoofing en Outaouais | Le Salon des Inconnus", description: "Wwoofing à la Maison Favier : 4 h de travail par jour en échange du gîte et de la vie communautaire. Séjours à la semaine ou au mois jusqu'à fin octobre, tente prospecteur ou mini-maison.", keywords: "Wwoofing Québec, Wwoofing Outaouais, Ferme bénévole Québec" }
  },
  PPS: {
    EN: { title: "Theme Evenings & Team Retreats (PPS Canada) | Le Salon des Inconnus", description: "Corporate retreats and theme evenings at Maison Favier, in partnership with PPS Canada: beach party, team building, live music, comedy, conferences. Namur, Outaouais.", keywords: "corporate retreat Outaouais, team building Namur, theme evening Quebec, PPS Canada" },
    FR: { title: "Soirées thématiques & retraites d'équipe (PPS Canada) | Le Salon des Inconnus", description: "Retraites d'entreprise et soirées thématiques à la Maison Favier, en partenariat avec PPS Canada : beach party, team building, musique live, humour, conférences. Namur, Outaouais.", keywords: "retraite d'entreprise Outaouais, team building Namur, soirée thématique Québec, PPS Canada" }
  },
  COMMUNITY: {
    EN: { title: "Join the Community | Le Salon des Inconnus, Namur", description: "Live and work at Le Salon des Inconnus in Namur: a paid resident-member place, housed in the converted bus, at the heart of an artists' inn in Outaouais.", keywords: "intentional community Quebec, live in community Outaouais, resident member, artist community Quebec" },
    FR: { title: "Faire partie de la communauté | Le Salon des Inconnus", description: "Vivre et travailler au Salon des Inconnus, à Namur : une place de membre résident rémunérée, logé dans le bus aménagé, au cœur d'une auberge d'artistes en Outaouais.", keywords: "communauté intentionnelle Québec, vivre en communauté Outaouais, membre résident, communauté d'artistes" }
  },
  DONATION: {
    EN: { title: "Support Le Salon des Inconnus | Donate", description: "Support the artists' inn Le Salon des Inconnus in Namur, Outaouais. Every gift helps keep the place, the residencies and the events alive.", keywords: "support artists Quebec, donate" },
    FR: { title: "Soutenir Le Salon des Inconnus | Faire un don", description: "Soutenez l'auberge d'artistes Le Salon des Inconnus à Namur, en Outaouais. Chaque don aide à faire vivre le lieu, les résidences et les événements.", keywords: "soutenir artistes Québec, faire un don" }
  },
  PENSEES: {
    EN: { title: "Thoughts of the Day | Le Salon des Inconnus", description: "A short daily paragraph on hospitality, art and the life of the house, written at Le Salon des Inconnus, Namur, Outaouais.", keywords: "daily journal, hospitality, artists inn Quebec" },
    FR: { title: "Pensée du jour | Le Salon des Inconnus", description: "Un court paragraphe quotidien sur l'hospitalité, l'art et la vie de la maison, écrit au Salon des Inconnus, à Namur, en Outaouais.", keywords: "journal quotidien, hospitalité, auberge d'artistes Québec" }
  },
  MY_PROFILE: {
    EN: { title: "My Profile | Le Salon des Inconnus", description: "Your member space at Le Salon des Inconnus.", keywords: "" },
    FR: { title: "Mon Profil | Le Salon des Inconnus", description: "Votre espace membre au Salon des Inconnus.", keywords: "" }
  },
  PUBLIC_PROFILE: {
    EN: { title: "Member Profile | Le Salon des Inconnus", description: "A profile from the community.", keywords: "" },
    FR: { title: "Profil Membre | Le Salon des Inconnus", description: "Profil d'un membre de la communauté.", keywords: "" }
  },
  MESSAGING: {
    EN: { title: "Messages | Le Salon des Inconnus", description: "Your conversations with the community.", keywords: "" },
    FR: { title: "Messages | Le Salon des Inconnus", description: "Vos conversations avec la communauté.", keywords: "" }
  },
  ADMIN: {
    EN: { title: "Admin CRM | Le Salon des Inconnus", description: "Administration space.", keywords: "" },
    FR: { title: "Admin CRM | Le Salon des Inconnus", description: "Espace d'administration.", keywords: "" }
  },
  INVITATION: {
    EN: { title: "You Have Been Invited | Le Salon des Inconnus", description: "A private evening at the manor, by named invitation only.", keywords: "" },
    FR: { title: "Vous avez été invité | Le Salon des Inconnus", description: "Une soirée privée au manoir, sur invitation nominative uniquement.", keywords: "" }
  },
  ENTREPRISES: {
    EN: { title: "Corporate Retreats & Team Building | Le Salon des Inconnus", description: "Privatized team days at Maison Favier, Namur: chef's table, massage therapy, staged theme evenings and on-site accommodation, less than an hour from Ottawa.", keywords: "corporate retreat Outaouais, team building Namur, executive offsite Quebec" },
    FR: { title: "Retraites d'entreprise & team building | Le Salon des Inconnus", description: "Journées d'équipe privatisées à la Maison Favier, Namur : table du chef, massothérapie, soirées thématiques mises en scène et hébergement sur place, à moins d'une heure d'Ottawa.", keywords: "retraite d'entreprise Outaouais, team building Namur, offsite exécutif Québec" }
  }
} as const;

export type ViewKey = keyof typeof PAGE_META;

// Per-route <meta name="robots"> override — most routes are index,follow by
// default (set in index.html) and don't need an entry here. Add a route only
// when it must deviate (e.g. an unlisted invitation page reached by QR code).
export const ROBOTS_OVERRIDES: Partial<Record<ViewKey, string>> = {
  INVITATION: 'noindex, nofollow',
};

// Social/AI share image per route — ABSOLUTE URLs (crawlers require absolute).
// Routes not listed fall back to DEFAULT_OG_IMAGE.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/media/inn/golden%20drone%20copy.jpg`;
export const OG_IMAGES: Partial<Record<ViewKey, string>> = {
  INN:            `${SITE_URL}/media/inn/golden%20drone%20copy.jpg`,
  PETITE_MONNAIE: `${SITE_URL}/media/Financement%20Artistique/centered%20copy.jpg`,
  COMMUNITY:      `${SITE_URL}/media/inn/us%20copy.jpg`,
  KITCHEN:        `${SITE_URL}/media/Auberge%20photos/cuisine%20grande.jpg`,
  MASSOTHERAPY:   `${SITE_URL}/media/massage/massage%20andre.jpg`,
  WWOOFING:       `${SITE_URL}/media/Financement%20Artistique/centered%20copy.jpg`,
  HOSTS:          `${SITE_URL}/media/Financement%20Artistique/centered%20copy.jpg`,
  PPS:            `${SITE_URL}/media/inn/golden%20drone%20copy.jpg`,
};
