

import { Accommodation, ArtistProfile, PlatformService, LocalGuideCategory } from './types';
import { GUIDE_BLOG_POSTS } from './data/guideBlogPosts';

export const MUSIC_GENRES = {
  Blues: "https://storage.googleapis.com/salondesinconnus/music/background%20blues.mp3",
  Baroque: "https://storage.googleapis.com/salondesinconnus/music/01.01.%20Concerto%20No.%201%20In%20D%20Major_%20Largo-Allegro-Largo-Allegro%3B%20Largo%3B%20Allegro%3B%20Allegro.mp3",
  Celtic: "https://storage.googleapis.com/salondesinconnus/music/background%20celtic.mp3"
};

// Placeholder images for the Inn section
const PLACEHOLDER_ROOM = "https://images.unsplash.com/photo-1590490360182-f33efe29a79d?q=80&w=1000&auto=format&fit=crop";
const PLACEHOLDER_MANOR = "https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg";
const PLACEHOLDER_YURT = "https://storage.googleapis.com/salondesinconnus/inn/yourte.png";
const PLACEHOLDER_BUS = "https://storage.googleapis.com/salondesinconnus/inn/us%20copy.jpg";
const PLACEHOLDER_TINY = "https://storage.googleapis.com/salondesinconnus/inn/For%20site%20temp%20mini%20(1).jpg";

// Shared spaces of the manor/auberge, common to every stay — appended to each unit's own gallery
const COMMON_PHOTOS = [
  "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/IMG_0864.jpg",         // salon / living room
  "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/cuisine%20grande.jpg", // kitchen
  "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/biblio.png",           // library
  "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/jeux%20auberge.jpg",   // games library
  "https://storage.googleapis.com/salondesinconnus/Auberge%20photos/jardins%20auberge.jpg",// gardens
  "https://storage.googleapis.com/salondesinconnus/inn/maison.jpg",                         // manor exterior
  "https://storage.googleapis.com/salondesinconnus/inn/golden%20drone%20copy.jpg"           // aerial of the estate
];

const COMMON_AMENITIES: Accommodation['amenities'] = ['parking', 'wifi', 'hot-tub', 'terrasse', 'projector', 'boardgames'];

export const ACCOMMODATIONS: Accommodation[] = [
  {
    id: 'room1',
    title: "The Writer",
    title_fr: "L'Écrivaine",
    type: "Themed Room",
    type_fr: "Chambre Thématique",
    description: "A literary selection, a writing desk, and craft papers — this room is decorated with a typewriter and writing artifacts.",
    description_fr: "Une sélection litéraire, un pupitre d'écriture et des papiers d'artisanat, cette chambre est décorée avec une machine à écrire et des artefacts d'écriture.",
    guests: 2,
    maxGuests: 3,
    beds: 1,
    baths: 2,
    amenities: COMMON_AMENITIES,
    images: ["https://storage.googleapis.com/salondesinconnus/inn/ecrivaine%20banana.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345789"
  },
  {
    id: 'room2',
    title: "The Musician",
    title_fr: "La Musicienne",
    type: "Themed Room",
    type_fr: "Chambre Thématique",
    description: "This room provides a guitar, a gramophone, and quality headphones for a full musical experience.",
    description_fr: "Cette chambre fournit guitare et gramophone, ainsi que des écouteurs de qualité pour une expérience musicale.",
    guests: 2,
    maxGuests: 3,
    beds: 1,
    baths: 2,
    amenities: COMMON_AMENITIES,
    images: ["https://storage.googleapis.com/salondesinconnus/inn/musicienne%20banana%202.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345790"
  },
  {
    id: 'room3',
    title: "The Filmmaker",
    title_fr: "La Cinéaste",
    type: "Themed Room",
    type_fr: "Chambre Thématique",
    description: "Equipped with a projector, this room is decorated with artifacts of the seventh art.",
    description_fr: "Agrémentée d'un Projecteur, cette chambre est décorée avec des artefacts du 7e art.",
    guests: 2,
    maxGuests: 3,
    beds: 1,
    baths: 2,
    amenities: COMMON_AMENITIES,
    images: ["https://storage.googleapis.com/salondesinconnus/inn/cineast%20banana%202.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345792"
  },
  {
    id: 'room4',
    title: "The Amphitheatre",
    title_fr: "L'Amphithéâtre",
    type: "Themed Room · Private Bath",
    type_fr: "Chambre Thématique · Salle de Bain Privée",
    description: "This room features a private bathroom and is decorated with Moulin Rouge and 1920s theatre inspiration.",
    description_fr: "Cette chambre comporte une salle de bain privée, et est décorée d'inspiration moulin rouge et théâtre des années 20.",
    guests: 2,
    maxGuests: 3,
    beds: 1,
    baths: 3,
    amenities: [...COMMON_AMENITIES!, 'private-bath'],
    images: ["https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345787"
  },
  {
    id: 'manor',
    title: "The Whole Inn",
    title_fr: "L'Auberge Complète",
    type: "Whole Estate",
    type_fr: "Domaine Entier",
    description: "Enjoy 7 rooms and artistic installations, plus the Yurt, for your group.",
    description_fr: "Profitez de 7 Chambres et installations artistiques, ainsi que de la Yourte pour votre groupe.",
    guests: 25,
    maxGuests: "25 + 10",
    beds: "21 + Matelas",
    baths: 3,
    amenities: COMMON_AMENITIES,
    images: [PLACEHOLDER_MANOR, PLACEHOLDER_ROOM],
    bookingLink: "https://salon.holidayfuture.com/listings/345791"
  },
  {
    id: 'yurt',
    title: "The Ger (Yurt)",
    title_fr: "La Ger (Yourte)",
    type: "Glamping",
    type_fr: "Glamping",
    description: "Enjoy this glamping space with a wood stove, sheepskins and a curated book selection, set back behind the inn. Wifi and electricity included. Like the rooms, you have access to the inn and its amenities.",
    description_fr: "Profitez de cet espace glamping avec foyer, peaux de mouton et sélection de livres en retrait derrière l'auberge. Wifi et électricité inclus. Comme avec les chambres, vous avez accès à l'auberge et ses commodités.",
    guests: 4,
    maxGuests: 5,
    beds: "4-5",
    baths: "0 + 3",
    amenities: [...COMMON_AMENITIES!, 'fireplace', 'electricity'],
    images: [PLACEHOLDER_YURT, PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345786"
  },
  {
    id: 'tiny',
    title: "The Meditator",
    title_fr: "La Méditante",
    type: "Off-grid Eco-Stay",
    type_fr: "Éco-Gîte Hors-Réseau",
    description: "Tucked away in the forest (a 2-minute walk from the inn), the Meditator offers a true intimate disconnect by the brookside: no wifi, no LTE. We provide a battery for your lights and laptops. Like the rooms, you have access to the inn and its amenities.",
    description_fr: "En retrait dans la foret (2 minutes de l'auberge), la méditante offre une vraie déconnexion intime en bord de ruisseau : pas de wifi, pas de LTE. Nous fournissons une batterie pour vos lumières et ordinateurs. Comme avec les chambres, vous avez accès à l'auberge et ses commodités.",
    guests: 4,
    maxGuests: 6,
    beds: 1,
    baths: "0.5 + 3",
    amenities: ['parking', 'no-wifi', 'off-grid', 'hot-tub', 'terrasse', 'projector', 'boardgames'],
    images: [
      "https://storage.googleapis.com/salondesinconnus/inn/meditante-1.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/meditante-2.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/meditante-3.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/meditante-4.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/meditante-5.jpeg",
      ...COMMON_PHOTOS
    ],
    bookingLink: "#",
    status: 'COMING_SOON'
  },
  {
    id: 'mini-maison',
    title: "The Shepherdess",
    title_fr: "La Bergère",
    type: "Handmade Tiny House",
    type_fr: "Mini-Maison Artisanale",
    description: "A handmade tiny house steps from the inn: cedar shingles, a blue tin roof, and an all-wood interior bathed in light. A sculpted staircase wraps around a real birch trunk up to a cozy mezzanine bed, while a reading nook nestles in the bay window and an antique cast-iron stove stands as a decorative centerpiece. A cocoon for two, with access to the inn and its amenities. Available July 1st.",
    description_fr: "Une mini-maison faite à la main à deux pas de l'auberge : bardeaux de cèdre, toit de tôle bleu et un intérieur tout en bois baigné de lumière. Un escalier sculpté s'enroule autour d'un véritable tronc de bouleau jusqu'à une mezzanine douillette, une banquette de lecture se niche dans la baie vitrée et un poêle de fonte ancien veille comme pièce décorative. Un cocon pour deux, avec accès à l'auberge et ses commodités. Disponible dès le 1er juillet.",
    guests: 2,
    maxGuests: 2,
    beds: 1,
    baths: "0.5 + 3",
    amenities: ['parking', 'hot-tub', 'terrasse', 'projector', 'boardgames'],
    images: [
      "https://storage.googleapis.com/salondesinconnus/inn/mini-maison-exterieur.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/mini-maison-3.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/mini-maison-2.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/mini-maison-1.jpeg",
      "https://storage.googleapis.com/salondesinconnus/inn/mini-maison-4.jpeg",
      ...COMMON_PHOTOS
    ],
    bookingLink: "https://salon.holidayfuture.com/listings/559483"
  },
  {
    id: 'bus',
    title: "The Bus",
    title_fr: "Le Bus",
    type: "Converted Bus",
    type_fr: "Autobus Converti",
    description: "This converted bus was the heart of the journey that brought us here. Includes water, wifi and electricity, plus pellet heating.",
    description_fr: "Ce bus converti fut le coeur du voyage qui nous a mené ici. Il inclut l'eau, le wifi et l'électricité ainsi qu'un chauffage aux granules.",
    guests: 4,
    maxGuests: 5,
    beds: 2,
    baths: "0.5 + 3",
    amenities: [...COMMON_AMENITIES!, 'fireplace', 'electricity'],
    images: [PLACEHOLDER_BUS, PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345788"
  },
];

export const ARTISTS_ROSTER: ArtistProfile[] = [];

export const PLATFORM_SERVICES: PlatformService[] = [
  {
    id: 'consultation',
    name: "Free Consultation",
    description: "20 minutes to discuss your vision with our architects.",
    basePrice: 0
  }
];

export const EXTERNAL_PLATFORMS = [];

export const LOCAL_GUIDE_DATA: LocalGuideCategory[] = [
    {
        id: 'summer',
        title_fr: "Été et Beaux Jours",
        title_en: "Summer & Sunny Days",
        description_fr: "L'eau, la lumière et la peau qui chauffe au soleil.",
        description_en: "Water, light, and sun-warmed skin.",
        items: [
            {
                id: 'plage-simon',
                tag: "L'incontournable",
                title: "Plage du lac Simon",
                location: "Duhamel / Chénéville",
                description: "La plage publique du lac Simon — un lac de 74 km de circonférence et 45 m de profondeur, avec baignade familiale, quai municipal gratuit et sentiers forestiers autour de Duhamel. L'eau est d'une clarté remarquable; c'est le cœur de l'été dans la région.",
                link: "https://www.sepaq.com/pq/sim/",
                image: "https://lac-simon.net/wp-content/uploads/2024/04/lac-simon-plage.jpeg",
                isVip: true
            },
            {
                id: 'tubes',
                tag: "Le rituel",
                title: "Rivière et Tubes",
                location: "Duhamel",
                description: "L'art du 'slow floating'. Accédez à la rivière, installez-vous sur un tube et laissez le courant vous porter à travers la forêt. Sauvage, silencieux, et profondément relaxant.",
                link: "https://municipalite.duhamel.qc.ca/loisirs-et-culture/activites-de-plein-air/descente-de-la-riviere-petite-nation/",
                image: "https://www.petitenationoutaouais.com/wp-content/uploads/2020/01/remy-ogez-camp-air-eau-bois-425x.jpg",
                isFavorite: true
            },
            {
                id: 'lac-plages',
                tag: "Le lieu",
                title: "Lac des Plages",
                location: "Lac-des-Plages",
                description: "Village villégiature au charme rétro, niché entre forêt et eau claire. Cherchez les accès plus discrets pour éviter la foule; c'est un coin prisé des locaux.",
                link: "https://lacdesplages.com/",
                image: "https://www.petitenationoutaouais.com/wp-content/uploads/2016/10/lac-des-plages-ete-2.jpg"
            },
            {
                id: 'lac-croche',
                tag: "Le secret",
                title: "Lac Croche",
                location: "Montpellier",
                description: "Un petit lac en forêt pour ceux qui fuient le bruit. Baignade, pique-nique et cueillette sauvage. Ici, le silence est roi.",
                image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'ile-raisin',
                tag: "L'évasion",
                title: "Île au Raisin (Lac Gagnon)",
                location: "Duhamel",
                description: "Plus sauvage que les plages officielles. On y va pour lire face à l'immensité et se baigner dans une eau limpide, loin du monde.",
                link: "https://www.sepaq.com/rim/papineau-labelle/",
                image: "https://www.petitenationoutaouais.com/wp-content/uploads/2022/05/reserve-faunique-de-papineau-labelle-canot.jpg"
            }
        ]
    },
    {
        id: 'hiking',
        title_fr: "Randos & Ciel Étoilé",
        title_en: "Hiking & Starry Skies",
        description_fr: "Le temps s'étire et la nature dicte le rythme.",
        description_en: "Time stretches out and nature dictates the rhythm.",
        items: [
            {
                id: 'montagnes-noires',
                tag: "Le joyau",
                title: "Parc des Montagnes Noires",
                location: "Ripon",
                description: "800 acres de forêt municipale avec 25 km de sentiers — randonnée, fat bike, raquette, ski de fond. Tour d'observation de 12 m à 426 m d'altitude, avec vue à 360° sur toute la vallée. Allez-y la nuit en août : le ciel de la Petite-Nation s'ouvre complètement, loin de tout halo lumineux.",
                link: "https://parcdesmontagnesnoires.ca/",
                image: "https://www.petitenationoutaouais.com/wp-content/uploads/2024/06/247871704-1516380238695333-4418798037750066613-n-1024x683.jpg",
                isFavorite: true,
                isVip: true
            },
            {
                id: 'iroquois',
                tag: "L'ambiance",
                title: "Sentier de la rivière Iroquois",
                location: "Outaouais",
                description: "Une marche douce sous une lumière filtrée. Le sentier longe l'eau dans une forêt dense — rêvé pour combiner marche méditative et baignade.",
                link: "https://www.randoquebec.ca/sentiers/sentier-de-la-riviere-iroquois/",
                image: "https://www.petitenationoutaouais.com/wp-content/uploads/2021/09/pierre-martel-sentier-iroquois-chute-scaled-e1633018588891.jpg"
            },
            {
                id: 'cheneville',
                tag: "Le rapide",
                title: "Montagne de Chénéville",
                location: "Chénéville",
                description: "Accessible derrière l'école. Une montée courte et gratifiante. Parfait pour une sortie improvisée avec une belle vue sur le village.",
                link: "https://municipalite.cheneville.qc.ca/loisirs-et-culture/parcs-et-espaces-verts",
                image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800"
            }
        ]
    },
    {
        id: 'culture',
        title_fr: "Culture, Histoire & Matière",
        title_en: "Culture, History & Material",
        description_fr: "L'âme de la région, façonnée par le temps et les mains.",
        description_en: "The soul of the region, shaped by time and hands.",
        items: [
            {
                id: 'papineau',
                tag: "L'histoire",
                title: "Manoir Papineau",
                location: "Montebello",
                description: "Site historique national — le grand manoir seigneurial du 19e siècle de Louis-Joseph Papineau, flanqué de quatre tours et entouré de jardins formels. Une plongée dans l'histoire politique et architecturale du Québec.",
                link: "https://parcs.canada.ca/lhn-nhs/qc/manoirpapineau",
                image: "https://pcweb2.azureedge.net/-/media/lhn-nhs/qc/papineau/images/2022-CANADA-CA/homepage/Lieu-historique-national-Manoir-Papineau-National-Historic-Site_1920x480.jpg",
                isVip: true
            },
            {
                id: 'barclay',
                tag: "La matière",
                title: "Expo-Barclay (Poterie)",
                location: "Plaisance",
                description: "Le rendez-vous annuel des amoureux de la terre et du feu. Démonstrations de tournage, pièces uniques et rencontres avec des céramistes de partout au Québec.",
                image: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'michelle-lemire',
                tag: "L'artiste",
                title: "Michelle Lemire (Galerie Solart)",
                location: "Ripon / Saint-André-Avellin",
                description: "Michelle Lemire a fondé l'Atelier Galerie Solart à Ripon en 1999 — céramique, bronze, pierre et métaux précieux. Ses sculptures, urnes et théières sont façonnées par une philosophie enracinée dans l'eau comme essence de vie.",
                link: "https://www.ateliergaleriedartsolart.com/",
                image: "https://cdn.shopify.com/s/files/1/1545/4709/files/ENTETE_DEMARCHE_MICHELLE.jpg"
            }
        ]
    },
    {
        id: 'food',
        title_fr: "Bouffe & Vie Locale",
        title_en: "Food & Local Life",
        description_fr: "Manger vrai, boire local et rencontrer l'autre.",
        description_en: "Eat real, drink local, and meet people.",
        items: [
            {
                id: 'orties',
                tag: "Le cœur de la région",
                title: "Le Café des Orties",
                location: "Ripon",
                description: "Café communautaire installé dans un ancien presbytère de Ripon — mets biologiques de producteurs locaux, vins naturels, cidres artisanaux. Les murs font office de galerie tournante : c'est le vrai cœur de la vie artistique et intellectuelle de la Petite-Nation. Un lieu unique, vivant, sans équivalent.",
                link: "https://www.facebook.com/cafedesorties/",
                image: PLACEHOLDER_ROOM,
                isFavorite: true,
                isVip: true
            },
            {
                id: 'napoleon',
                tag: "La sortie",
                title: "Le Napoléon",
                location: "Montebello",
                description: "Le bistro intimiste du chef Antoine Meunier — tartare de canard, filet de bison, poutine au foie gras. Produits locaux et de saison dans un cadre raffiné et chaleureux.",
                link: "https://www.lenapoleon.ca/",
                image: "https://static.wixstatic.com/media/b90ba8_df144be50aa54d639d2629f6c12eb4bf~mv2.jpg"
            },
            {
                id: 'boulanger',
                tag: "Le rituel sacré",
                title: "La Fille du Boulanger",
                location: "Montpellier",
                description: "Mélissa et Julien moulent leur propre farine de grains biologiques et cuisent des miches au levain sur commande. Le samedi, on vient chercher son pain et on croise tout le village. Ouvert vendredi et samedi seulement.",
                link: "https://www.lafilleduboulanger.ca/",
                image: "https://www.lafilleduboulanger.ca/wp-content/uploads/img_0101-770x1024.jpg",
                isFavorite: true
            },
            {
                id: 'souche-i',
                tag: "L'escale",
                title: "Souche-i",
                location: "Montebello",
                description: "Restaurant asiatique et microbrasserie dans une maison centenaire de Montebello — sushis, tartares et bières artisanales dans un cadre chaleureux, avec terrasse sur 110 places.",
                link: "https://souche-i.ca/",
                image: "https://souche-i.ca/wp-content/uploads/2022/03/Image2.jpg"
            },
            {
                id: 'pommes',
                tag: "Le terroir",
                title: "Les Pommes Perdues",
                location: "Chénéville",
                description: "Julien Robert et Gilbert Bégin documentent la quête des pommes à cidre du Québec — des cidres sauvages, vifs et ancrés dans le terroir de Chénéville. À emporter ou à déguster sur place.",
                link: "https://lespommesperdues.com/",
                image: "https://img1.wsimg.com/isteam/ip/c0ba14cf-db19-4940-a39c-5ca3c9238b66/pommesperdue-banner.jpg"
            },
            {
                id: 'brasseur',
                tag: "La bière",
                title: "Brasseurs de Montebello",
                location: "Montebello",
                description: "Microbrasserie artisanale au cœur de Montebello. Bières de saison brassées localement, cuisine de pub et terrasse. Un arrêt naturel avant ou après le Manoir Papineau.",
                image: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?auto=format&fit=crop&q=80&w=800"
            }
        ]
    },
    {
        id: 'events',
        title_fr: "Événements & Festivités",
        title_en: "Events & Festivities",
        description_fr: "L'énergie brute de la Petite-Nation.",
        description_en: "Raw energy of the Petite-Nation.",
        items: [
            {
                id: 'medieval',
                tag: "L'incontournable",
                title: "Festival Médiéval de Montpellier",
                location: "Montpellier",
                description: "Le 3e plus grand festival médiéval du Québec — joutes équestres, forge en direct, clans vikings, marché médiéval, spectacles équestres et banquets historiques. Pendant trois jours fin septembre, le village de Montpellier plonge dans le Moyen Âge. Un spectacle visuel et sonore hors du commun, à 15 minutes de l'Auberge.",
                link: "https://www.festivalmedievaldemontpellier.org",
                image: "https://static.wixstatic.com/media/57b705_49a605c853824c8d8a1d020d605e6aea~mv2.jpg",
                isFavorite: true,
                isVip: true
            },
            {
                id: 'mechoui',
                tag: "La fête populaire",
                title: "Méchoui de Montpellier",
                location: "Montpellier",
                description: "Un événement légendaire. Bruyant, festif, fumée et musique. Chaque été, tout le village s'arrête pour cet agape collectif. Une expérience culturelle intense, authentiquement québécoise.",
                link: "https://www.montpellier.ca/",
                image: PLACEHOLDER_ROOM
            },
            {
                id: 'rodeo',
                tag: "L'arène",
                title: "Rodéo de Saint-André-Avellin",
                location: "St-André-Avellin",
                description: "Le Festival Western de Saint-André-Avellin — le seul rodéo professionnel de la région. 200+ cowboys et cowgirls, monte-taureau, course aux tonneaux et musique country sous chapiteau. Chaque juillet.",
                link: "https://rodeoavellin.com/",
                image: "https://www.petitenationoutaouais.com/wp-content/uploads/2024/06/fwstaa2022-1152x648-fr-61f69974.png"
            },
            {
                id: 'peche-blanche',
                tag: "L'hiver vivant",
                title: "Tournoi de Pêche Blanche",
                location: "Lac-Simon",
                description: "En février, le lac gelé se couvre de cabanes de pêche. Le tournoi de pêche blanche de Lac-Simon rassemble pêcheurs locaux et visiteurs dans une atmosphère festive et conviviale, entre deux percées dans la glace.",
                link: "https://lac-simon.net/",
                image: "https://lac-simon.net/wp-content/uploads/2024/04/lac-simon-01.jpeg"
            }
        ]
    },
    {
        id: 'winter',
        title_fr: "Automne & Hiver",
        title_en: "Autumn & Winter",
        description_fr: "Le silence blanc, le feu de foyer et la glace.",
        description_en: "White silence, fireplace, and ice.",
        items: [
            {
                id: 'meute',
                tag: "L'aventure pure",
                title: "Meute Tanwen",
                location: "Montpellier",
                description: "La meute d'huskies sibériens d'Éric Pichette — balades de traîneau d'une heure où vous pilotez vous-même 4 chiens à travers des sentiers forestiers vallonnés de Montpellier. Le contact avec les chiens est intense, chaleureux, inoubliable. Une expérience hivernale comme nulle part ailleurs en région.",
                link: "https://www.tanwen.qc.ca/en",
                image: "https://storage.googleapis.com/salondesinconnus/guide/meute-tanwen.jpg",
                isFavorite: true,
                isVip: true
            },
            {
                id: 'patin',
                tag: "Le jeu",
                title: "Glissade et Patin (Lac Simon)",
                location: "Lac Simon",
                description: "Le lac gelé devient un terrain de jeu immense. Sentier de patin balisé, glissades naturelles et grands espaces blancs. Gratuit, sauvage et magique.",
                link: "https://lac-simon.net/",
                image: "https://lac-simon.net/wp-content/uploads/2024/04/lac-simon-01.jpeg"
            },
            {
                id: 'namur',
                tag: "Le calme",
                title: "Patinoire de Namur",
                location: "Namur",
                description: "La petite patinoire de village, tranquille et peu fréquentée. Un endroit doux pour glisser seul ou avec les enfants, sans la foule — un recoin serein au cœur du village.",
                link: "https://namur.qc.ca/",
                image: PLACEHOLDER_ROOM
            },
            {
                id: 'chevreuils',
                tag: "L'observation",
                title: "Déjeuner avec les chevreuils",
                location: "Duhamel",
                description: "Prenez votre café le matin en regardant par la fenêtre. Dans la neige fraîche, les chevreuils passent souvent à travers les propriétés forestières de la région — un moment de grâce silencieuse.",
                link: "https://municipalite.duhamel.qc.ca/",
                image: PLACEHOLDER_ROOM
            }
        ]
    },
    {
        id: 'spring',
        title_fr: "Printemps",
        title_en: "Spring",
        description_fr: "Le réveil de la terre, l'eau qui coule et la sève.",
        description_en: "Earth awakening, flowing water, and sap.",
        items: [
            {
                id: 'ti-mousse',
                tag: "Le rituel québécois",
                title: "Érablière chez Ti-Mousse",
                location: "Papineauville",
                description: "Authentique cabane à sucre québécoise depuis 1977 — repas traditionnel à volonté, tire sur la neige et balades en traîneau à chevaux. Ouverte de fin février à fin avril. Un passage obligé pour vivre le printemps québécois dans toute sa dimension culturelle et gourmande.",
                link: "https://www.cheztimousse.com/",
                image: PLACEHOLDER_ROOM,
                isFavorite: true,
                isVip: true
            },
            {
                id: 'agricola',
                tag: "La terre",
                title: "Ferme Agricola",
                location: "Papineauville",
                description: "Coopérative de jeunes agriculteurs — légumes bio certifiés, asperges, herbes et fleurs coupées sur 160 acres. Paniers ASC et présence aux marchés fermiers dès le printemps.",
                link: "https://fermeagricola.com/",
                image: PLACEHOLDER_ROOM
            },
            {
                id: 'vezeau',
                tag: "Les fruits",
                title: "Domaine Mont-Vézeau",
                location: "Ripon",
                description: "Vignoble et fraisière à Ripon — 9 000 pieds de vigne, framboises, deux hectares de fraises. Dégustations, autocueillette et pizzas au feu de bois sur la terrasse les fins de semaine.",
                link: "https://www.domainemontvezeau.com/",
                image: "https://admin.tourismeoutaouais.com/api/photos/file/domaine-mont-vezeau-raisins-domaine-mont-vezeau-620x620.webp"
            },
            {
                id: 'presquile',
                tag: "Les oiseaux",
                title: "Parc de la Presqu'île",
                location: "Plaisance",
                description: "Parc national sur la rivière des Outaouais — refuge de 265+ espèces d'oiseaux avec des migrations printanières de bernaches spectaculaires. Sentiers en milieu humide, kayak et vélo entre îles et marécages.",
                link: "https://www.sepaq.com/pq/pla/",
                image: "https://www.petitenationoutaouais.com/wp-content/uploads/2024/05/parc-national-de-plaisance-2.jpg"
            }
        ]
    },
    {
        id: 'must',
        title_fr: "Incontournables",
        title_en: "Must-Sees",
        description_fr: "Toutes saisons. Les classiques indémodables.",
        description_en: "All seasons. Timeless classics.",
        items: [
            {
                id: 'omega',
                tag: "Le safari québécois",
                title: "Parc Omega",
                location: "Montebello",
                description: "Sanctuaire animalier de 2 200 acres — safari de 12 km parmi élans, bisons, loups, cerfs et ours noirs. En soirée, ONIRO propose un parcours piétonnier nocturne et immersif dans la forêt illuminée. Un lieu qui ne ressemble à aucun autre en Amérique du Nord.",
                link: "https://www.parcomega.ca/",
                image: "https://www.parcomega.ca/wp-content/uploads/2026/03/VE250623-0345-scaled.jpg",
                isFavorite: true,
                isVip: true
            },
            {
                id: 'chutes',
                tag: "Le spectacle",
                title: "Chutes de Plaisance",
                location: "Plaisance",
                description: "Cascade de 63 mètres sur la rivière Petite-Nation — puissante au printemps, sculpturale en hiver. Un court sentier avec belvédères retrace l'ancien village industriel de North Nation Mills (années 1800).",
                link: "https://www.chutesplaisance.ca/",
                image: "https://b1367470.smushcdn.com/1367470/wp-content/uploads/2021/07/DSC05663-2-1440x960.jpg"
            },
            {
                id: 'centre-de-vie',
                tag: "Le sanctuaire",
                title: "Centre de Vie",
                location: "Ripon",
                description: "Centre de retraite bien-être sur 108 acres à Ripon — yoga, naturopathie, massothérapie, méditation, cure de jus et programmes de jeûne. Lac privé, sentiers en forêt, repas végétariens, sauna et espaces de repos avec foyers. Un lieu de ressourcement rare, à quelques minutes de l'Auberge.",
                link: "https://www.centredevie.ca/",
                image: PLACEHOLDER_ROOM,
                isFavorite: true
            }
        ]
    }
];

// Attach blog posts at module load. Keeps content out of this file but
// keeps a single export for consumers.
LOCAL_GUIDE_DATA.forEach((cat) => {
    cat.items.forEach((item) => {
        const post = GUIDE_BLOG_POSTS[item.id];
        if (post) item.blogPost = post;
    });
});