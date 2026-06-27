
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
    EN: { title: "Wwoofing in Outaouais | Le Salon des Inconnus, Namur", description: "Wwoofing program at Maison Favier: 4 hours of work a day in exchange for room, board and shared community. Min. 7-day stays in Namur, Outaouais.", keywords: "Wwoofing Quebec, Wwoofing Outaouais, Volunteer farm Quebec" },
    FR: { title: "Programme de Wwoofing en Outaouais | Le Salon des Inconnus", description: "Programme de wwoofing à la Maison Favier : 4 heures de travail par jour en échange du gîte, du couvert et de la vie communautaire. Séjour min. 7 jours.", keywords: "Wwoofing Québec, Wwoofing Outaouais, Ferme bénévole Québec" }
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
