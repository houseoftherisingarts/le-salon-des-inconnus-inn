

import { Accommodation, ArtistProfile, PlatformService, LocalGuideCategory } from './types';

export const MUSIC_GENRES = {
  Blues: "https://storage.googleapis.com/salondesinconnus/music/background%20blues.mp3",
  Baroque: "https://storage.googleapis.com/salondesinconnus/music/01.01.%20Concerto%20No.%201%20In%20D%20Major_%20Largo-Allegro-Largo-Allegro%3B%20Largo%3B%20Allegro%3B%20Allegro.mp3",
  Celtic: "https://storage.googleapis.com/salondesinconnus/music/background%20celtic.mp3"
};

// Placeholder images for the Inn section
const PLACEHOLDER_ROOM = "https://images.unsplash.com/photo-1590490360182-f33efe29a79d?q=80&w=1000&auto=format&fit=crop";
const PLACEHOLDER_MANOR = "https://storage.googleapis.com/salondesinconnus/Financement%20Artistique/centered%20copy.jpg";
const PLACEHOLDER_YURT = "https://storage.googleapis.com/salondesinconnus/inn/yourte.png";
const PLACEHOLDER_TINY = "https://storage.googleapis.com/salondesinconnus/inn/For%20site%20temp%20mini%20(1).jpg";
const PLACEHOLDER_BUS = "https://storage.googleapis.com/salondesinconnus/inn/us%20copy.jpg";

export const ACCOMMODATIONS: Accommodation[] = [
  {
    id: 'room1',
    title: "L'Écrivaine",
    type: "Themed Room",
    type_fr: "Chambre Thématique",
    description: "Nestled in the highest turret, this room offers panoramic views of the estate. Perfect for solitary writers or romantic getaways.",
    description_fr: "Nichée dans la plus haute tourelle, cette chambre offre une vue panoramique sur le domaine. Parfait pour les écrivains solitaires ou les escapades romantiques.",
    guests: 2,
    beds: 1,
    baths: 1,
    images: ["https://storage.googleapis.com/salondesinconnus/inn/ecrivaine%20banana.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345789"
  },
  {
    id: 'room2',
    title: "La Musicienne",
    type: "Themed Room",
    type_fr: "Chambre Thématique",
    description: "A spacious suite featuring a skylight directly above the master bed for stargazing in comfort.",
    description_fr: "Une suite spacieuse dotée d'un puits de lumière directement au-dessus du lit principal pour observer les étoiles confortablement.",
    guests: 3,
    beds: 2,
    baths: 1,
    images: ["https://storage.googleapis.com/salondesinconnus/inn/musicienne%20banana%202.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345790"
  },
  {
    id: 'room3',
    title: "La Cinéaste",
    type: "Themed Room",
    type_fr: "Chambre Thématique",
    description: "Surrounded by artifacts and books, this room immerses you in the history of the Salon.",
    description_fr: "Entourée d'artefacts et de livres, cette pièce vous plonge dans l'histoire du Salon.",
    guests: 2,
    beds: 1,
    baths: 1,
    images: ["https://storage.googleapis.com/salondesinconnus/inn/cineast%20banana%202.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345792"
  },
  {
    id: 'room4',
    title: "L'Amphithéâtre",
    type: "Private Bathroom",
    type_fr: "Salle de Bain Privée",
    description: "Direct access to the rose garden. A serene escape filled with the scent of blooming flowers.",
    description_fr: "Accès direct à la roseraie. Une évasion sereine remplie du parfum des fleurs épanouies.",
    guests: 2,
    beds: 1,
    baths: 1,
    images: ["https://storage.googleapis.com/salondesinconnus/inn/amphiteatre%20banana.jpg", PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345787"
  },
  {
    id: 'manor',
    title: "Le Manoir Entier",
    type: "Whole Estate",
    type_fr: "Domaine Entier",
    description: "Rent the entire Salon des Inconnus for your private event, wedding, or large family gathering. Access to all rooms and grounds.",
    description_fr: "Louez tout le Salon des Inconnus pour votre événement privé, mariage ou grand rassemblement familial. Accès à toutes les chambres et aux terrains.",
    guests: "14 - 25",
    beds: "21 + Matelas",
    baths: 6,
    images: [PLACEHOLDER_MANOR, PLACEHOLDER_ROOM],
    bookingLink: "https://salon.holidayfuture.com/listings/345791"
  },
  {
    id: 'yurt',
    title: "La Yourte Mystique",
    type: "Glamping",
    type_fr: "Glamping",
    description: "A luxurious Mongolian yurt situated in the lower meadow. Off-grid experience with wood-burning stove.",
    description_fr: "Une yourte mongole luxueuse située dans la prairie inférieure. Expérience hors réseau avec poêle à bois.",
    guests: "4-6",
    beds: "4-5",
    baths: 0.5,
    images: [PLACEHOLDER_YURT, PLACEHOLDER_MANOR],
    bookingLink: "https://salon.holidayfuture.com/listings/345786"
  },
  {
    id: 'tiny',
    title: "La Méditante",
    type: "Eco-Stay",
    type_fr: "Éco-Gîte",
    description: "Minimalist living at its finest. Tucked away in the forest edge, efficient and cozy.",
    description_fr: "Le minimalisme à son meilleur. Niché à l'orée de la forêt, efficace et douillet.",
    guests: 2,
    beds: 1,
    baths: 1,
    images: [PLACEHOLDER_TINY, PLACEHOLDER_MANOR],
    bookingLink: "#",
    status: 'COMING_SOON'
  },
  {
    id: 'bus',
    title: "Supertramp Bus",
    title_fr: "Le Bus Magique",
    type: "Converted Bus",
    type_fr: "Autobus Converti",
    description: "An homage to the wild spirit. A vintage bus converted into a whimsical living space for adventurers.",
    description_fr: "Un hommage à l'esprit sauvage. Un bus vintage converti en un espace de vie fantaisiste pour les aventuriers.",
    guests: 4,
    beds: 2,
    baths: 1,
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
                tag: "L'ambiance",
                title: "Plage du lac Simon",
                location: "Duhamel / Chénéville",
                description: "Vacances classiques. C'est la grande plage de sable fin, animée et familiale. Idéale pour une journée baignade sans complications.",
                link: "https://www.sepaq.com/pq/sim/",
                image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800",
                isFavorite: false
            },
            {
                id: 'tubes',
                tag: "Le rituel",
                title: "Rivière et Tubes",
                location: "Duhamel",
                description: "L'art du 'slow floating'. Accédez à la rivière, installez-vous sur un tube et laissez le courant vous porter. Sauvage et relaxant.",
                link: "https://municipalite.duhamel.qc.ca/loisirs-et-culture/activites-de-plein-air/descente-de-la-riviere-petite-nation/",
                image: "https://images.unsplash.com/photo-1564344463-54e7d96924c7?auto=format&fit=crop&q=80&w=800",
                isFavorite: true
            },
            {
                id: 'lac-plages',
                tag: "Le lieu",
                title: "Lac des Plages",
                location: "Lac-des-Plages",
                description: "Un village villégiature au charme rétro. Cherchez les accès plus discrets pour éviter la foule; c'est un coin prisé des locaux.",
                link: "https://lacdesplages.com/",
                image: "https://images.unsplash.com/photo-1595183866380-49635b7573d8?auto=format&fit=crop&q=80&w=800"
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
                description: "Plus sauvage que les plages officielles. On y va pour lire face à l'immensité et se baigner dans une eau claire.",
                link: "https://www.sepaq.com/rim/papineau-labelle/",
                image: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=800"
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
                tag: "L'expérience",
                title: "Parc des Montagnes Noires",
                location: "Ripon",
                description: "Des sentiers pour tous niveaux. Le conseil des Inconnus : Allez-y la nuit, surtout en août. Loin de la pollution lumineuse, le ciel s'ouvre littéralement.",
                link: "https://parcdesmontagnesnoires.ca/",
                image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&q=80&w=800",
                isFavorite: true
            },
            {
                id: 'iroquois',
                tag: "L'ambiance",
                title: "Sentier de la rivière Iroquois",
                location: "Outaouais",
                description: "Une marche douce sous une lumière filtrée. Le sentier longe l'eau; rêvé pour combiner marche méditative et saucette.",
                link: "https://www.randoquebec.ca/sentiers/sentier-de-la-riviere-iroquois/",
                image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'cheneville',
                tag: "Le rapide",
                title: "Montagne de Chénéville",
                location: "Chénéville",
                description: "Accessible derrière l'école. Une montée courte, une vue gratifiante. Parfait pour une sortie improvisée.",
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
                description: "Site historique national majestueux. Le manoir et ses jardins racontent le Québec d'autrefois.",
                link: "https://www.pc.gc.ca/fr/lhn-nhs/qc/manoirpapineau",
                image: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Manoir-Papineau_National_Historic_Site.jpg"
            },
            {
                id: 'medieval',
                tag: "L'immersion",
                title: "Festival Médiéval",
                location: "Montpellier",
                description: "Un village entier qui bascule dans le temps. Costumes, hydromel et combats. Vérifiez les dates (souvent fin août).",
                link: "https://festim.ca/",
                image: "https://images.unsplash.com/photo-1599308112702-5e923e597405?auto=format&fit=crop&q=80&w=800",
                isFavorite: true
            },
            {
                id: 'barclay',
                tag: "La matière",
                title: "Expo-Barclay (Poterie)",
                location: "Plaisance",
                description: "Le rendez-vous des amoureux de la terre et du feu. Démonstrations et pièces uniques.",
                image: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'michelle-lemire',
                tag: "L'artiste",
                title: "Michelle Lemire (Galerie Solart)",
                location: "Ripon / Saint-André-Avellin",
                description: "Une créatrice qui fusionne pierre, verre et métal. Voir son univers, c'est voir la transformation de la matière.",
                link: "https://www.atelier-solart.ca/",
                image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&q=80&w=800"
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
                tag: "L'incontournable",
                title: "Le Café des Orties",
                location: "Ripon",
                description: "Cuisine du marché, fleurs sauvages et ambiance bohème. Le cœur battant de la communauté artistique locale.",
                link: "https://www.facebook.com/cafedesorties/",
                image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800",
                isFavorite: true
            },
            {
                id: 'napoleon',
                tag: "La sortie",
                title: "Le Napoléon",
                location: "Montebello",
                description: "Restaurant chaleureux avec une ambiance feutrée. Idéal pour s'offrir une soirée 'en ville' après la forêt.",
                link: "https://www.lenapoleon.ca/",
                image: "https://images.unsplash.com/photo-1514362545857-3bc16549766b?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'boulanger',
                tag: "Le rituel sacré",
                title: "La Fille du Boulanger",
                location: "Montpellier",
                description: "Point de ralliement. Le samedi, on vient chercher son pain réservé et on croise tout le village.",
                link: "https://www.facebook.com/lafilleduboulanger/",
                image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800",
                isFavorite: true
            },
            {
                id: 'pommes',
                tag: "Le terroir",
                title: "Les Pommes Perdues",
                location: "Chénéville",
                description: "Micro-cidrerie valorisant les pommes sauvages. Des cidres vivants, bruts, qui racontent le territoire.",
                link: "https://lespommesperdues.com/",
                image: "https://images.unsplash.com/photo-1560526860-7a0e35f3d327?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'carbo',
                tag: "Le concept",
                title: "Carbo BBQ",
                location: "Au bord de l'eau",
                description: "Ce n'est pas un resto, c'est un art de vivre. Apportez votre BBQ portatif au bord d'une rivière.",
                image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'brasseur',
                tag: "L'escale",
                title: "Maison du Brasseur",
                location: "Saint-Jovite (Tremblant)",
                description: "Une valeur sûre pour les amateurs de houblon. Bières artisanales et cuisine soignée.",
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
                id: 'mechoui',
                tag: "La fête populaire",
                title: "Méchoui de Montpellier",
                location: "Montpellier",
                description: "Un événement légendaire. Bruyant, festif, fumée et musique. Une expérience culturelle intense.",
                link: "https://www.montpellier.ca/",
                image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800",
                isFavorite: false
            },
            {
                id: 'rodeo',
                tag: "L'arène",
                title: "Rodéo de Saint-André-Avellin",
                location: "St-André-Avellin",
                description: "Un des plus grands au Québec. L'univers des cowboys, la poussière, les chevaux.",
                link: "https://rodeoavellin.com/",
                image: "https://images.unsplash.com/photo-1534431522867-d154483522f1?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'trad',
                tag: "La musique",
                title: "Scène Trad Locale (Souche-i)",
                location: "Montebello",
                description: "Gardez l'œil ouvert pour les soirées de musique traditionnelle (reels, gigues).",
                link: "https://www.facebook.com/souchei/",
                image: "https://images.unsplash.com/photo-1514525253440-b39345208668?auto=format&fit=crop&q=80&w=800"
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
                id: 'patin',
                tag: "Le jeu",
                title: "Glissade et Patin",
                location: "Lac Simon",
                description: "Le lac gelé devient un terrain de jeu immense. Sentier de patin, glissades...",
                link: "https://lac-simon.net/",
                image: "https://images.unsplash.com/photo-1482862304917-062e08c4a452?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'namur',
                tag: "Le village",
                title: "Patinoire de Namur",
                location: "Namur",
                description: "La petite patinoire locale avec sa cabane. C'est ici que la petite société locale se retrouve le soir.",
                link: "https://namur.qc.ca/",
                image: "https://images.unsplash.com/photo-1549448937-56e63283f32c?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'meute',
                tag: "L'aventure",
                title: "Meute Tanwen",
                location: "Duhamel",
                description: "Traîneau à chiens et expériences nordiques. Connexion avec les chiens et silence de la neige.",
                link: "https://meutetanwen.com/",
                image: "https://images.unsplash.com/photo-1549232822-6b9409893963?auto=format&fit=crop&q=80&w=800",
                isFavorite: true
            },
            {
                id: 'chevreuils',
                tag: "L'observation",
                title: "Déjeuner avec les chevreuils",
                location: "Duhamel",
                description: "Prenez votre café en regardant par la fenêtre; ils passeront probablement vous dire bonjour.",
                link: "https://municipalite.duhamel.qc.ca/",
                image: "https://images.unsplash.com/photo-1477764250597-dffe9f601ae8?auto=format&fit=crop&q=80&w=800"
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
                id: 'agricola',
                tag: "La terre",
                title: "Ferme Agricola",
                location: "Papineauville",
                description: "Célèbre pour ses asperges au printemps. Se reconnecter au cycle des saisons et au travail du sol.",
                link: "https://fermeagricola.com/",
                image: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'vezeau',
                tag: "Les fruits",
                title: "Domaine Mont-Vézeau",
                location: "Ripon",
                description: "Vins de fraises et framboises, cidres. Autocueillette l'été, mais produits à déguster à l'année.",
                link: "https://domainemont-vezeau.com/",
                image: "https://images.unsplash.com/photo-1621506821957-1b50ab7787a4?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'ti-mousse',
                tag: "Le sucre",
                title: "Érablière chez Ti-Mousse",
                location: "Val-des-Bois / Papineau",
                description: "La cabane à sucre traditionnelle sans prétention. Sirop, tire sur la neige, repas copieux.",
                link: "https://www.erablierecheztimousse.com/",
                image: "https://images.unsplash.com/photo-1588691509376-7d377b752496?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'presquile',
                tag: "Les oiseaux",
                title: "Parc de la Presqu’île",
                location: "Plaisance",
                description: "Le meilleur spot pour voir les migrations (bernaches, canards). Le vacarme des oiseaux contraste avec le calme de l'eau.",
                link: "https://www.sepaq.com/pq/pla/",
                image: "https://images.unsplash.com/photo-1480044965905-02098d419e96?auto=format&fit=crop&q=80&w=800"
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
                id: 'chutes',
                tag: "Le spectacle",
                title: "Chutes de Plaisance",
                location: "Plaisance",
                description: "Puissantes au printemps, fraîches en été, colorées en automne et sculpturales en hiver.",
                link: "https://www.chutesplaisance.ca/",
                image: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&q=80&w=800"
            },
            {
                id: 'omega',
                tag: "La faune",
                title: "Parc Omega",
                location: "Montebello",
                description: "Parcours parmi les animaux (wapitis, loups, ours). Chaque saison offre une scène différente.",
                link: "https://www.parcomega.ca/",
                image: "https://images.unsplash.com/photo-1560700329-c236378619bc?auto=format&fit=crop&q=80&w=800",
                isFavorite: true
            }
        ]
    }
];