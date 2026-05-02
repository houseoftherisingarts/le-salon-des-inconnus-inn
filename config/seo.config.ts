
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
      title: "Le Salon des Inconnus | Artistic Inn near Parc Omega & Montebello",
      description: "Your 2026 basecamp for the Golden Triangle. 20 mins from Parc Omega wolves, 45 mins from Mont-Tremblant skiing. Historic 1898 Inn & Event Venue.",
      keywords: "Parc Omega hotel, Chateau Montebello alternative, Lac à l'épaule Outaouais, Montagnes Noires Ripon"
    },
    FR: {
      title: "Le Salon des Inconnus | Auberge Artistique & Golf (Petite Nation)",
      description: "Votre camp de base 2026. À 20 min du Parc Oméga, 45 min de Mont-Tremblant. Auberge historique (1898) et salle de spectacle.",
      keywords: "Hôtel Parc Oméga, Hébergement Montebello, Lac à l'épaule Petite Nation, Hotel near Parc Omega, Bed and Breakfast Quebec, Auberge Ripon"
    }
  },
  INN_TEST2: {
    EN: { title: "Inn Editorial Test 2 | Le Salon des Inconnus", description: "Editorial hero test (Bespoke pattern).", keywords: "" },
    FR: { title: "Test Éditorial 2 | Le Salon des Inconnus", description: "Test de hero éditorial (motif Bespoke).", keywords: "" },
  },
  INN_TEST3: {
    EN: { title: "Inn Editorial Test 3 | Le Salon des Inconnus", description: "Bold rebuild — cinematic hero with motion.", keywords: "" },
    FR: { title: "Test Éditorial 3 | Le Salon des Inconnus", description: "Refonte audacieuse — hero cinématique avec animations.", keywords: "" },
  },
  KITCHEN: {
    EN: { 
        title: "The Culinary Lab | Molecular Catering & Portuguese Bistronomy", 
        description: "The ultimate catering experience in Quebec. A fusion of Portuguese bistronomy and Montreal molecular cuisine. Private chef for weddings and high-end events.", 
        keywords: "Molecular Catering, Private Chef Ottawa, Portuguese Bistronomy, Wedding Catering Quebec, Traiteur Outaouais" 
    },
    FR: { 
        title: "Le Laboratoire Culinaire | Traiteur Moléculaire & Bistronomie Portugaise", 
        description: "L'expérience traiteur ultime au Québec. Fusion de bistronomie portugaise et cuisine moléculaire montréalaise. Chef privé pour mariages et événements haut de gamme.", 
        keywords: "Traiteur Moléculaire, Chef Privé Montréal, Bistronomie Portugaise, Mariage Outaouais, Catering Ottawa, Private Chef Quebec" 
    }
  },
  MASSOTHERAPY: {
    EN: { title: "Le Salon des Inconnus | Massage & Reiki", description: "Relaxation and holistic care in the heart of nature.", keywords: "Massage Petite Nation, Reiki Ripon" },
    FR: { title: "Le Salon des Inconnus | Massothérapie & Reiki", description: "Détente et soins holistiques au cœur de la nature.", keywords: "Massothérapie Petite Nation, Reiki Ripon" }
  },
  HOSTS: {
    EN: { title: "Le Salon des Inconnus | Meet the Artists", description: "Discover the creators behind the Maison Favier project.", keywords: "Artistic Residency Quebec, Maison Favier History" },
    FR: { title: "Le Salon des Inconnus | Rencontrer les Artistes", description: "Découvrez les créateurs derrière le projet Maison Favier.", keywords: "Résidence d'artiste Québec, Histoire Maison Favier" }
  },
  GUIDE: {
    EN: { title: "Le Salon des Inconnus | Local Guide Outaouais", description: "Best things to do in Montebello, Ripon, and Mont-Tremblant.", keywords: "Guide Outaouais, Things to do Montebello" },
    FR: { title: "Le Salon des Inconnus | Guide Local Outaouais", description: "Quoi faire à Montebello, Ripon et Mont-Tremblant.", keywords: "Guide Outaouais, Quoi faire Montebello" }
  },
  EVENTS: {
    EN: { title: "Events | Le Salon des Inconnus", description: "Artistic and community events at Maison Favier.", keywords: "Events Outaouais, Cultural events Quebec" },
    FR: { title: "Événements | Le Salon des Inconnus", description: "Événements artistiques et communautaires à la Maison Favier.", keywords: "Événements Outaouais, Événements culturels Québec" }
  },
  CEILIDH: {
    EN: { title: "Grand Ceilidh de Mai 2026 | Le Salon des Inconnus", description: "Wwoofing, performances, banquet and community — May 21–25, 2026 in Namur, QC.", keywords: "Ceilidh Quebec, Festival communautaire 2026, Wwoofing event" },
    FR: { title: "Grand Ceilidh de Mai 2026 | Le Salon des Inconnus", description: "Wwoofing, spectacles, banquet et communauté — 21–25 mai 2026 à Namur, QC.", keywords: "Ceilidh Québec, Festival communautaire 2026, Événement Wwoofing" }
  },
  WWOOFING: {
    EN: { title: "Wwoofing | Le Salon des Inconnus", description: "Live and work at Le Salon des Inconnus — apply as a wwoofer at Maison Favier.", keywords: "Wwoofing Quebec, Wwoofing Outaouais, Volunteer farm Quebec" },
    FR: { title: "Wwoofing | Le Salon des Inconnus", description: "Vivez et travaillez au Salon des Inconnus — postuler comme wwoofer à la Maison Favier.", keywords: "Wwoofing Québec, Wwoofing Outaouais, Ferme bénévole Québec" }
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
  }
} as const;

export type ViewKey = keyof typeof PAGE_META;
