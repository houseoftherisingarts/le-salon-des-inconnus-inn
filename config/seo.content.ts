// ─────────────────────────────────────────────────────────────────────────────
// SEO content registry — per-page text, internal links, external citations, FAQ.
// Rendered by <SeoBlock /> at the bottom of key pages.
//
// IMPORTANT (editorial review):
//   The body paragraphs below are FACTUAL/DESCRIPTIVE — they exist so AI engines
//   and search crawlers can read what the place IS, where it sits, and what it
//   offers. They are NOT written in Alex's editorial voice. Feel free to rewrite
//   them in canonical voice — the structure (paragraphs, links, FAQ) is what
//   matters for AEO; the wording is yours to shape.
// ─────────────────────────────────────────────────────────────────────────────

import type { ViewKey } from './seo.config';

export interface SeoLink {
  /** Internal view key OR external absolute URL. */
  to: string;
  label: string;
  /** Optional context shown after the link (italic, smaller). */
  hint?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface SeoContent {
  /** Descriptive H1 for SEO. Rendered visually-hidden so existing visual hero stays intact. */
  h1: string;
  /** Editorial section heading shown on the page. */
  sectionTitle: string;
  /** Short kicker above the section title. */
  kicker: string;
  /** Descriptive body paragraphs (factual French/English copy for crawlers). */
  paragraphs: string[];
  /** In-body internal links to other pages of the site (min. 3). */
  internalLinks: SeoLink[];
  /** Citations to credible external sources (min. 2 on content pages). */
  externalLinks: SeoLink[];
  /** FAQ entries — also serialised as FAQPage JSON-LD. */
  faq: FaqItem[];
}

type PerLanguage<T> = { FR: T; EN: T };

/** Pages that get a full SeoBlock. Other pages can inherit from INN. */
export type SeoViewKey = Extract<
  ViewKey,
  'INN' | 'WWOOFING' | 'EVENTS' | 'CEILIDH' | 'MASSOTHERAPY' | 'KITCHEN' | 'HOSTS' | 'GUIDE' | 'PETITE_MONNAIE' | 'COMMUNITY'
>;

export const SEO_CONTENT: Record<SeoViewKey, PerLanguage<SeoContent>> = {
  // ───────────────────────────────────────────────────────────────────────────
  PETITE_MONNAIE: {
    FR: {
      h1: "La Petite Monnaie — la monnaie locale de la Petite-Nation (Outaouais, Québec)",
      kicker: "Économie locale",
      sectionTitle: "La monnaie locale de la Petite-Nation",
      paragraphs: [
        "La Petite Monnaie est la monnaie locale et communautaire de la Petite-Nation, dans la MRC de Papineau, en Outaouais. Une petite-monnaie vaut un dollar canadien, et chaque billet dépensé reste dans la région, chez les artisans, les fermes, les cafés et les galeries de la vallée. Elle est portée par la Coopérative de solidarité Place du Marché, à Ripon, et plus de 150 commerces l'acceptent.",
        "On s'en procure de quatre façons : sur l'application mobile Petite-monnaie, aux onze bureaux de change répartis dans la vallée, en ligne avec Zeffy, ou par la poste. À chaque recharge, une bonification de 5 % s'ajoute au solde : payez 100 $, repartez avec 105 petites-monnaies. Le Salon des Inconnus, à Namur, est l'un des onze bureaux de change : on y échange ses premiers billets et on repart avec la carte de la région.",
      ],
      internalLinks: [
        { to: 'GUIDE', label: 'le guide local de la Petite-Nation' },
        { to: 'INN', label: "l'auberge du Salon des Inconnus à Namur" },
        { to: 'KITCHEN', label: 'la cuisine et le café barista de l\'auberge' },
      ],
      externalLinks: [
        { to: 'https://pmonnaie.ca', label: 'Petite-monnaie (site officiel)' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        { q: "C'est quoi la Petite Monnaie ?", a: "La monnaie locale et communautaire de la Petite-Nation (MRC de Papineau, Outaouais). Une petite-monnaie vaut un dollar canadien et s'accepte uniquement dans les commerces participants de la région." },
        { q: "Combien vaut une petite-monnaie ?", a: "Une petite-monnaie égale un dollar canadien. À chaque recharge, une bonification de 5 % s'ajoute : 100 $ donnent 105 petites-monnaies." },
        { q: "Où s'en procurer ?", a: "Sur l'application mobile Petite-monnaie, aux onze bureaux de change de la vallée, en ligne avec Zeffy, ou par la poste. Le Salon des Inconnus à Namur est l'un des bureaux de change." },
        { q: "Quels commerces l'acceptent ?", a: "Plus de 150 commerces de la MRC de Papineau, dont des fermes, boulangeries, cafés-galeries, chocolateries et le Festival Médiéval de Montpellier. La liste complète vit sur pmonnaie.ca et dans l'application." },
        { q: "Peut-on en obtenir au Salon des Inconnus ?", a: "Oui. Le Salon des Inconnus, à Namur, est l'un des onze bureaux de change. On y achète ses premières petites-monnaies et on repart avec la carte de la région." },
      ],
    },
    EN: {
      h1: "La Petite Monnaie — the local currency of the Petite-Nation (Outaouais, Québec)",
      kicker: "Local economy",
      sectionTitle: "The local currency of the Petite-Nation",
      paragraphs: [
        "La Petite Monnaie is the local, community currency of the Petite-Nation, in the MRC de Papineau, Outaouais. One petite-monnaie is worth one Canadian dollar, and every note you spend stays in the region, with the artisans, farms, cafés and galleries of the valley. It is run by the Coopérative de solidarité Place du Marché in Ripon, and more than 150 businesses accept it.",
        "There are four ways to get it: the Petite-monnaie mobile app, the eleven exchange points across the valley, online through Zeffy, or by mail. Every top-up adds a 5% bonus: pay 100 $, leave with 105 petites-monnaies. Le Salon des Inconnus, in Namur, is one of the eleven exchange points, where you can pick up your first notes and grab the regional map.",
      ],
      internalLinks: [
        { to: 'GUIDE', label: 'the local guide to the Petite-Nation' },
        { to: 'INN', label: 'Le Salon des Inconnus inn in Namur' },
        { to: 'KITCHEN', label: 'the kitchen and barista coffee at the inn' },
      ],
      externalLinks: [
        { to: 'https://pmonnaie.ca', label: 'Petite-monnaie (official site)' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        { q: "What is La Petite Monnaie?", a: "The local, community currency of the Petite-Nation (MRC de Papineau, Outaouais). One petite-monnaie is worth one Canadian dollar and is accepted only at participating businesses in the region." },
        { q: "How much is one petite-monnaie worth?", a: "One petite-monnaie equals one Canadian dollar. Every top-up adds a 5% bonus: 100 $ gives you 105 petites-monnaies." },
        { q: "Where can I get it?", a: "On the Petite-monnaie mobile app, at the eleven exchange points in the valley, online through Zeffy, or by mail. Le Salon des Inconnus in Namur is one of the exchange points." },
        { q: "Which businesses accept it?", a: "More than 150 businesses across the MRC de Papineau, including farms, bakeries, café-galleries, chocolate makers and the Medieval Festival of Montpellier. The full list lives on pmonnaie.ca and in the app." },
        { q: "Can I get it at Le Salon des Inconnus?", a: "Yes. Le Salon des Inconnus, in Namur, is one of the eleven exchange points. You can buy your first petites-monnaies there and leave with the regional map." },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  COMMUNITY: {
    FR: {
      h1: "Faire partie de la communauté du Salon des Inconnus — place de membre résident (Namur, Outaouais)",
      kicker: "Vivre sur place",
      sectionTitle: "Une place de membre résident s'ouvre",
      paragraphs: [
        "Le Salon des Inconnus est une petite communauté grandissante, enracinée dans une auberge familiale à Namur, en Outaouais. Il y a des membres permanents qui vivent sur place et des membres de passage qui laissent leur trace. En ce moment, une place se libère : vivre dans le bus aménagé, avec accès complet à l'auberge et au terrain.",
        "C'est un vrai métier. La tâche principale est le ménage des chambres et des espaces communs, au cœur de l'expérience des invités, avec quelques moments où l'on tient le fort et des tâches partagées de la vie commune. L'approche est hybride : une sécurité de base et un salaire de base au-dessus du wwoofing communautaire, en plus du logement et des avantages, tout en gardant à la personne la liberté de maintenir sa propre activité économique, ce qui convient bien aux nomades numériques.",
      ],
      internalLinks: [
        { to: 'WWOOFING', label: 'le wwoofing bénévole', hint: 'séjours plus courts en échange de quatre heures de travail par jour' },
        { to: 'INN', label: "l'auberge et les espaces communs" },
        { to: 'KITCHEN', label: 'la cuisine de la maisonnée' },
      ],
      externalLinks: [
        { to: 'https://wwoof.ca', label: 'WWOOF Canada' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        { q: "C'est quoi la place de membre résident ?", a: "Une place pour vivre sur place au Salon des Inconnus, à Namur, et prendre soin du lieu au quotidien. La place qui se libère en ce moment, c'est habiter le bus aménagé, avec accès complet à l'auberge et au terrain." },
        { q: "Est-ce que c'est rémunéré ?", a: "Oui, c'est un vrai métier. L'approche est hybride : un salaire de base au-dessus du wwoofing communautaire, en plus du logement et des avantages, tout en te laissant libre de garder ta propre activité économique. C'est idéal pour les nomades numériques." },
        { q: "Où est-ce qu'on est logé ?", a: "Dans le bus aménagé, équipé et chauffé, avec accès complet à l'auberge, à la cuisine et au terrain. Tu es chez toi dans ton bus, tout en faisant partie de la vie de la maison." },
        { q: "Quelles sont les tâches ?", a: "Surtout le ménage des chambres et des espaces communs, au cœur de l'expérience des invités. S'ajoutent des moments où tu tiens le fort quand on est partis, et des tâches partagées entre membres parce qu'on vit ensemble." },
        { q: "Quelle est la différence avec le wwoofing ?", a: "Le wwoofing est bénévole et plutôt court, en échange du gîte et du couvert. La place de membre résident est un engagement plus durable et rémunéré, au centre de la raison d'être du lieu." },
        { q: "Quel profil recherchez-vous ?", a: "Une personne qui se sent bien dans un environnement propre et qui a le souci du détail, solide en communication, capable de réguler ses émotions, et qui aime créer des systèmes pour optimiser sa contribution. En retour, on s'engage au même soin dans la communication, à la même empathie et au même engagement." },
      ],
    },
    EN: {
      h1: "Join the community at Le Salon des Inconnus — resident-member place (Namur, Outaouais)",
      kicker: "Living on site",
      sectionTitle: "A resident-member place is opening",
      paragraphs: [
        "Le Salon des Inconnus is a small, growing community rooted in a family inn in Namur, Outaouais. There are permanent members who live on site and members who pass through and leave their mark. Right now, a place is opening up: living in the converted bus, with full access to the inn and the land.",
        "This is real work. The main task is housekeeping the rooms and common spaces, at the heart of the guests' experience, with moments of holding the fort and shared tasks of daily life together. The approach is hybrid: a base of security and a base wage above community wwoofing, plus housing and perks, while leaving the person free to keep their own economic activity going, which suits digital nomads well.",
      ],
      internalLinks: [
        { to: 'WWOOFING', label: 'volunteer wwoofing', hint: 'shorter stays in exchange for four hours of work a day' },
        { to: 'INN', label: 'the inn and common spaces' },
        { to: 'KITCHEN', label: 'the household kitchen' },
      ],
      externalLinks: [
        { to: 'https://wwoof.ca', label: 'WWOOF Canada' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        { q: "What is the resident-member place?", a: "A place to live on site at Le Salon des Inconnus, in Namur, and care for the space day to day. The spot opening up now is living in the converted bus, with full access to the inn and the land." },
        { q: "Is it paid?", a: "Yes, it is real work. The approach is hybrid: a base wage above community wwoofing, plus housing and perks, while leaving you free to keep your own economic activity going. It suits digital nomads well." },
        { q: "Where do you live?", a: "In the converted bus, equipped and heated, with full access to the inn, the kitchen and the land. You are home in your own bus, while being part of the life of the house." },
        { q: "What are the tasks?", a: "Mainly housekeeping the rooms and common spaces, at the heart of the guests' experience. On top of that, holding the fort while the hosts are away, and tasks shared among members because we live together." },
        { q: "How is it different from wwoofing?", a: "Wwoofing is volunteer and fairly short, in exchange for room and board. The resident-member place is a longer, paid commitment, at the very centre of why the place exists." },
        { q: "What kind of person are you looking for?", a: "Someone who feels good in a clean space and has an eye for detail, solid in communication, able to regulate their emotions, and who enjoys building systems to optimize their contribution. In return, we commit to the same care in communication, the same empathy and the same engagement." },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  INN: {
    FR: {
      h1: "Auberge d'Artistes et d'Entrepreneurs en Outaouais — Maison Favier (Namur, Québec)",
      kicker: "À propos du lieu",
      sectionTitle: "Une auberge, un manoir, un centre d'artistes",
      paragraphs: [
        "Le Salon des Inconnus est une auberge installée dans la Maison Favier, un manoir victorien bâti en 1898, à Namur, dans la région de la Petite-Nation en Outaouais (Québec). L'établissement combine cinq chambres au manoir, une yourte, un autobus aménagé avec piano, deux mini-maisons en bois (La Bergère, faite à la main, et La Méditante, un éco-gîte hors-réseau au bord d'un ruisseau en forêt), des espaces communs (salon, bibliothèque, cuisine en libre-service, salle de méditation, salle de jeux avec projecteur), un spa et un jacuzzi ouverts en tout temps, ainsi que des jardins, une serre et trois pits à feu.",
        "Le lieu accueille à la fois les voyageurs de passage et une communauté plus durable d'artistes, de musiciens et d'entrepreneurs en résidence. On y propose de la massothérapie, une cuisine signature, des spectacles vivants, un programme de wwoofing et plusieurs événements communautaires comme le Grand Ceilidh de Mai. Namur se situe à environ vingt-cinq minutes du Parc Oméga à Montebello et à trente-cinq minutes du domaine skiable de Mont-Tremblant — un point d'ancrage pratique pour explorer la Petite-Nation.",
        "L'auberge est référencée par Tourisme Outaouais et figure sur Booking.com, Hotels.com et Vrbo. Pour réserver une chambre, le domaine entier ou un séjour artistique, on peut écrire à alex@lesalondesinconnus.com ou téléphoner au 514 418 3450.",
      ],
      internalLinks: [
        { to: 'WWOOFING', label: 'le programme de wwoofing', hint: 'séjours longs en échange de quatre heures de travail par jour' },
        { to: 'CEILIDH', label: 'le Grand Ceilidh de Mai 2026', hint: 'cinq jours de spectacles et de chantiers communs, du 21 au 25 mai' },
        { to: 'MASSOTHERAPY', label: 'la massothérapie et le reiki avec Andrée Dancause' },
        { to: 'KITCHEN', label: 'la cuisine signature avec le chef Marc Alexis Pepin' },
        { to: 'GUIDE', label: 'le guide local de la Petite-Nation' },
      ],
      externalLinks: [
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
        { to: 'https://www.parcomega.ca', label: 'Parc Oméga' },
        { to: 'https://www.sepaq.com/pq/lsi', label: 'Centre touristique du Lac-Simon (Sépaq)' },
      ],
      faq: [
        {
          q: "Qu'est-ce que Le Salon des Inconnus ?",
          a: "Une auberge et un centre d'artistes installés dans la Maison Favier, un manoir victorien de 1898 à Namur, dans la Petite-Nation en Outaouais. Le lieu accueille des voyageurs, des artistes en résidence, des wwoofers et des événements comme le Grand Ceilidh de Mai.",
        },
        {
          q: "Où êtes-vous situés en Outaouais ?",
          a: "Au 826 Côte à Favier, à Namur (Québec), dans la région de la Petite-Nation, à environ vingt-cinq minutes du Parc Oméga (Montebello) et trente-cinq minutes de Mont-Tremblant.",
        },
        {
          q: "Acceptez-vous les artistes en résidence ?",
          a: "Oui. Le Salon des Inconnus accueille des artistes émergents, professionnels et multidisciplinaires. Les résidences peuvent être réservées par téléphone (514 418 3450) ou par courriel (alex@lesalondesinconnus.com).",
        },
        {
          q: "Y a-t-il un spa et un jacuzzi sur place ?",
          a: "Oui. Le spa et le jacuzzi sont accessibles aux résidents en tout temps. La massothérapie et les soins de reiki sont offerts sur réservation par Andrée Dancause.",
        },
        {
          q: "Comment réserver ?",
          a: "Par téléphone au 514 418 3450, par courriel à alex@lesalondesinconnus.com, ou via Booking.com, Hotels.com et Vrbo. Le domaine entier peut aussi être réservé pour des retraites et des événements privés.",
        },
      ],
    },
    EN: {
      h1: "Inn for Artists and Entrepreneurs in Outaouais — Maison Favier (Namur, Québec)",
      kicker: "About the place",
      sectionTitle: "An inn, a manor, an artist hub",
      paragraphs: [
        "Le Salon des Inconnus is an inn set inside Maison Favier, a Victorian manor built in 1898, in Namur, in the Petite-Nation region of Outaouais, Québec. The estate combines five manor rooms, a yurt, a converted bus with a piano, two handmade wooden tiny houses (La Bergère, a handcrafted cabin, and La Méditante, an off-grid eco-cabin by a forest brook), common spaces (parlour, library, self-serve kitchen, meditation room, game room with projector), a 24/7 spa and hot tub, plus gardens, a greenhouse and three fire pits.",
        "It serves both travellers passing through and a longer-staying community of artists, musicians and entrepreneurs in residence. On site we offer massage therapy, a signature kitchen, live music, a wwoofing program and community events such as the Grand Ceilidh de Mai. Namur sits about twenty-five minutes from Parc Oméga in Montebello and thirty-five minutes from Mont-Tremblant — a practical basecamp for the Petite-Nation.",
        "The inn is listed by Tourisme Outaouais and appears on Booking.com, Hotels.com and Vrbo. To book a room, the whole estate or an artistic stay, write to alex@lesalondesinconnus.com or call 514 418 3450.",
      ],
      internalLinks: [
        { to: 'WWOOFING', label: 'the wwoofing program', hint: 'long stays in exchange for four hours of work a day' },
        { to: 'CEILIDH', label: 'the Grand Ceilidh de Mai 2026', hint: 'five days of shows and shared work, May 21–25' },
        { to: 'MASSOTHERAPY', label: 'massage therapy and reiki with Andrée Dancause' },
        { to: 'KITCHEN', label: 'the signature kitchen with chef Marc Alexis Pepin' },
        { to: 'GUIDE', label: 'the local guide to Petite-Nation' },
      ],
      externalLinks: [
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
        { to: 'https://www.parcomega.ca', label: 'Parc Oméga' },
        { to: 'https://www.sepaq.com/pq/lsi', label: 'Lac-Simon (Sépaq)' },
      ],
      faq: [
        {
          q: "What is Le Salon des Inconnus?",
          a: "An inn and artist centre set in Maison Favier, an 1898 Victorian manor in Namur, in the Petite-Nation region of Outaouais. It welcomes travellers, artists in residence, wwoofers and events like the Grand Ceilidh de Mai.",
        },
        {
          q: "Where are you located in Outaouais?",
          a: "At 826 Côte à Favier, Namur, Québec, in the Petite-Nation, about twenty-five minutes from Parc Oméga (Montebello) and thirty-five minutes from Mont-Tremblant.",
        },
        {
          q: "Do you host artists in residence?",
          a: "Yes — emerging, professional and multidisciplinary artists. Residencies can be booked by phone (514 418 3450) or email (alex@lesalondesinconnus.com).",
        },
        {
          q: "Is there a spa and hot tub on site?",
          a: "Yes. The spa and hot tub are open to guests around the clock. Massage and reiki are available by appointment with Andrée Dancause.",
        },
        {
          q: "How do I book?",
          a: "By phone (514 418 3450), email (alex@lesalondesinconnus.com), or via Booking.com, Hotels.com and Vrbo. The whole estate can also be reserved for retreats and private events.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  WWOOFING: {
    FR: {
      h1: "Programme de Wwoofing au Salon des Inconnus — Maison Favier, Namur (Outaouais)",
      kicker: "Vivre & travailler",
      sectionTitle: "Wwoofer à la Maison Favier",
      paragraphs: [
        "Le programme de wwoofing du Salon des Inconnus accueille des bénévoles à la Maison Favier, à Namur en Outaouais, dans le cadre du réseau WWOOF (World Wide Opportunities on Organic Farms). En échange du gîte, du couvert et du temps partagé en communauté, les wwoofers offrent environ quatre heures de travail concentré par jour : aux jardins, à la cuisine, à l'entretien des espaces communs ou à la production d'événements.",
        "Le séjour minimum est de sept jours. Plusieurs formules d'hébergement sont possibles selon la disponibilité : chambre partagée au manoir, chambre privée, yourte ou tente. Les repas se prennent à la grande table et la méditation est offerte deux fois par jour, sans obligation. Le reste du temps appartient au wwoofer, pour lire, créer, marcher dans les bois ou rejoindre les autres résidents.",
        "Plusieurs wwoofers participent ensuite au Grand Ceilidh de Mai, l'aboutissement de la saison. Les candidatures se font directement en ligne après création d'un compte membre.",
      ],
      internalLinks: [
        { to: 'INN', label: "l'auberge et la Maison Favier" },
        { to: 'CEILIDH', label: 'le Grand Ceilidh de Mai 2026', hint: 'rassemblement communautaire du 21 au 25 mai' },
        { to: 'KITCHEN', label: 'la cuisine et la table partagée' },
        { to: 'GUIDE', label: 'la région et la Petite-Nation' },
      ],
      externalLinks: [
        { to: 'https://wwoof.ca', label: 'WWOOF Canada' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Combien d'heures faut-il travailler par jour ?",
          a: "Quatre heures de travail concentré par jour, en deux périodes (matin et après-midi). Les repas et la méditation sont en dehors de ce temps.",
        },
        {
          q: "Quelle est la durée minimale d'un séjour de wwoofing ?",
          a: "Sept jours. Moins que cela, la rencontre est trop courte pour s'intégrer au rythme de la maison.",
        },
        {
          q: "Quels types d'hébergement sont offerts aux wwoofers ?",
          a: "Chambre partagée au manoir, chambre privée selon disponibilité, yourte avec foyer au bois, ou camping en tente. Le choix se fait dans le formulaire de candidature.",
        },
        {
          q: "Faut-il être membre WWOOF Canada pour postuler ?",
          a: "L'adhésion WWOOF est recommandée mais pas obligatoire pour entamer la conversation. Les candidatures passent par le formulaire en ligne du Salon des Inconnus.",
        },
      ],
    },
    EN: {
      h1: "Wwoofing Program at Le Salon des Inconnus — Maison Favier, Namur (Outaouais)",
      kicker: "Live & work",
      sectionTitle: "Wwoofing at Maison Favier",
      paragraphs: [
        "The wwoofing program at Le Salon des Inconnus welcomes volunteers to Maison Favier, in Namur, Outaouais, within the WWOOF (World Wide Opportunities on Organic Farms) network. In exchange for room, board and shared community time, wwoofers contribute about four focused hours of work a day: in the gardens, the kitchen, maintaining shared spaces, or helping produce events.",
        "Minimum stay is seven days. Lodging options include a shared manor room, a private room when available, a yurt, or a tent. Meals are taken at the long table and meditation is offered twice a day, never required. The rest of the time belongs to the wwoofer.",
        "Many wwoofers go on to take part in the Grand Ceilidh de Mai, the season's culmination. Applications are made online after creating a member account.",
      ],
      internalLinks: [
        { to: 'INN', label: 'the inn and Maison Favier' },
        { to: 'CEILIDH', label: 'the Grand Ceilidh de Mai 2026', hint: 'community gathering, May 21–25' },
        { to: 'KITCHEN', label: 'the kitchen and shared table' },
        { to: 'GUIDE', label: 'the Petite-Nation region' },
      ],
      externalLinks: [
        { to: 'https://wwoof.ca', label: 'WWOOF Canada' },
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "How many hours of work per day?",
          a: "Four focused hours, split across morning and afternoon. Meals and meditation are outside that time.",
        },
        {
          q: "What is the minimum stay?",
          a: "Seven days. Less than that doesn't allow time to settle into the rhythm of the house.",
        },
        {
          q: "What lodging is available to wwoofers?",
          a: "A shared manor room, a private room when available, a yurt with a wood stove, or tent camping. You pick in the application form.",
        },
        {
          q: "Do I need a WWOOF Canada membership to apply?",
          a: "WWOOF membership is encouraged but not strictly required to start the conversation. Applications go through the Salon des Inconnus form.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  CEILIDH: {
    FR: {
      h1: "Grand Ceilidh de Mai 2026 — Festival communautaire au Salon des Inconnus, Namur",
      kicker: "21–25 mai 2026",
      sectionTitle: "Le Grand Ceilidh de Mai",
      paragraphs: [
        "Le Grand Ceilidh de Mai est un rassemblement de cinq jours organisé à la Maison Favier, du 21 au 25 mai 2026. Inspiré du ceilidh écossais et irlandais (musique, danse, récits autour du feu), l'événement rassemble des wwoofers, des artistes, des voisins et des invités pour des spectacles, un banquet, des chantiers communs et des moments de fête.",
        "L'inscription se fait directement en ligne. Plusieurs équipes prennent en charge la cuisine, la production scénique, les jardins et l'accueil. La participation peut se faire à la journée, en bénévolat actif ou en hébergement complet sur place.",
        "L'événement est le point culminant de la saison de wwoofing du Salon des Inconnus. Il marque l'ouverture officielle de la saison estivale dans la Petite-Nation.",
      ],
      internalLinks: [
        { to: 'WWOOFING', label: 'le programme de wwoofing', hint: 'plusieurs wwoofers participent au ceilidh' },
        { to: 'INN', label: "l'auberge et la Maison Favier" },
        { to: 'EVENTS', label: 'les autres événements à venir' },
        { to: 'KITCHEN', label: 'la cuisine du chef Marc Alexis Pepin' },
      ],
      externalLinks: [
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
        { to: 'https://www.petitenationoutaouais.com', label: 'Tourisme Petite-Nation' },
      ],
      faq: [
        {
          q: "Quelles sont les dates du Grand Ceilidh de Mai 2026 ?",
          a: "Du 21 au 25 mai 2026, à la Maison Favier (826 Côte à Favier, Namur, Québec).",
        },
        {
          q: "Qu'est-ce qu'un ceilidh ?",
          a: "Un ceilidh (prononcé « keilī ») est un rassemblement traditionnel d'origine écossaise et irlandaise, fait de musique, de danse et de récits partagés autour du feu.",
        },
        {
          q: "Comment s'inscrire ou réserver ?",
          a: "L'inscription passe par le formulaire en ligne, accessible depuis la page Ceilidh après création d'un compte membre. Pour les questions logistiques : alex@lesalondesinconnus.com ou 514 418 3450.",
        },
        {
          q: "Faut-il être wwoofer pour participer ?",
          a: "Non. Le ceilidh est ouvert aux wwoofers de la saison, mais aussi aux invités, aux artistes et aux voisins de la Petite-Nation.",
        },
      ],
    },
    EN: {
      h1: "Grand Ceilidh de Mai 2026 — Community Festival at Le Salon des Inconnus, Namur",
      kicker: "May 21–25, 2026",
      sectionTitle: "The Grand Ceilidh de Mai",
      paragraphs: [
        "The Grand Ceilidh de Mai is a five-day gathering held at Maison Favier, May 21–25, 2026. Inspired by the Scottish/Irish ceilidh tradition (music, dance, fireside storytelling), it brings together wwoofers, artists, neighbours and guests for shows, a banquet, shared work and celebration.",
        "Registration happens online. Crews look after the kitchen, the stage, the gardens and the welcome. You can take part for a day, as an active volunteer, or with full lodging on site.",
        "The ceilidh is the culmination of the season's wwoofing program and marks the unofficial start of summer in the Petite-Nation.",
      ],
      internalLinks: [
        { to: 'WWOOFING', label: 'the wwoofing program', hint: 'many wwoofers join the ceilidh' },
        { to: 'INN', label: 'the inn and Maison Favier' },
        { to: 'EVENTS', label: 'other upcoming events' },
        { to: 'KITCHEN', label: 'chef Marc Alexis Pepin and the kitchen' },
      ],
      externalLinks: [
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
        { to: 'https://www.petitenationoutaouais.com', label: 'Tourisme Petite-Nation' },
      ],
      faq: [
        {
          q: "When is the Grand Ceilidh de Mai 2026?",
          a: "May 21–25, 2026 at Maison Favier (826 Côte à Favier, Namur, Québec).",
        },
        {
          q: "What is a ceilidh?",
          a: "A ceilidh (\"kay-lee\") is a Scottish/Irish gathering of music, dance and storytelling around the fire.",
        },
        {
          q: "How do I register?",
          a: "Through the online form on the Ceilidh page after creating a member account. For logistics: alex@lesalondesinconnus.com or 514 418 3450.",
        },
        {
          q: "Do I have to be a wwoofer to attend?",
          a: "No. The ceilidh is open to wwoofers, invited guests, artists and Petite-Nation neighbours.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  EVENTS: {
    FR: {
      h1: "Événements et spectacles au Salon des Inconnus — Maison Favier, Namur (Outaouais)",
      kicker: "Programmation",
      sectionTitle: "Événements à la Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus accueille des spectacles vivants, des résidences artistiques, des banquets et des rassemblements communautaires tout au long de l'année dans la Maison Favier, à Namur (Outaouais). La programmation met de l'avant la musique, la danse, le théâtre, la performance et les arts multidisciplinaires.",
        "Le point fort de la saison 2026 est le Grand Ceilidh de Mai, du 21 au 25 mai 2026 — cinq jours de spectacles, de banquets et de chantiers communs avec les wwoofers et les artistes en résidence. La salle de spectacle, la salle à manger et les jardins sont aussi disponibles pour des événements privés (mariages, retraites, lancements).",
        "Pour proposer un projet, réserver le domaine ou s'informer sur la programmation, on peut écrire à alex@lesalondesinconnus.com.",
      ],
      internalLinks: [
        { to: 'CEILIDH', label: 'la page du Grand Ceilidh de Mai 2026' },
        { to: 'INN', label: 'le manoir et les espaces disponibles' },
        { to: 'KITCHEN', label: 'la cuisine signature pour les banquets' },
        { to: 'WWOOFING', label: 'le programme de wwoofing' },
      ],
      externalLinks: [
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
        { to: 'https://www.petitenationoutaouais.com', label: 'Tourisme Petite-Nation' },
      ],
      faq: [
        {
          q: "Quel est le prochain grand événement ?",
          a: "Le Grand Ceilidh de Mai 2026, du 21 au 25 mai, à la Maison Favier — cinq jours de spectacles, de banquets et de wwoofing communautaire.",
        },
        {
          q: "Peut-on louer le lieu pour un événement privé ?",
          a: "Oui. Le manoir, la salle de spectacle, la salle à manger et les jardins peuvent être réservés pour des mariages, des retraites et des lancements. Contact : alex@lesalondesinconnus.com.",
        },
        {
          q: "Y a-t-il une salle de spectacle ?",
          a: "Oui. Le Salon des Inconnus dispose d'une salle de spectacle au manoir et d'espaces extérieurs aménagés pour les performances en saison.",
        },
      ],
    },
    EN: {
      h1: "Events and Shows at Le Salon des Inconnus — Maison Favier, Namur (Outaouais)",
      kicker: "Program",
      sectionTitle: "Events at Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus hosts live performances, artist residencies, banquets and community gatherings year-round at Maison Favier, in Namur (Outaouais). The program leans on music, dance, theatre, performance and multidisciplinary art.",
        "The 2026 season highlight is the Grand Ceilidh de Mai, May 21–25 — five days of shows, banquets and shared work with wwoofers and artists in residence. The performance room, dining hall and gardens are also available for private events (weddings, retreats, launches).",
        "To propose a project, book the estate or learn about programming, write to alex@lesalondesinconnus.com.",
      ],
      internalLinks: [
        { to: 'CEILIDH', label: 'the Grand Ceilidh de Mai 2026 page' },
        { to: 'INN', label: 'the manor and available spaces' },
        { to: 'KITCHEN', label: 'the signature kitchen for banquets' },
        { to: 'WWOOFING', label: 'the wwoofing program' },
      ],
      externalLinks: [
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
        { to: 'https://www.petitenationoutaouais.com', label: 'Tourisme Petite-Nation' },
      ],
      faq: [
        {
          q: "What is the next major event?",
          a: "The Grand Ceilidh de Mai 2026, May 21–25 at Maison Favier — five days of shows, banquets and community wwoofing.",
        },
        {
          q: "Can the venue be rented for private events?",
          a: "Yes. The manor, performance room, dining hall and gardens can be reserved for weddings, retreats and launches. Contact: alex@lesalondesinconnus.com.",
        },
        {
          q: "Is there a performance hall?",
          a: "Yes — a performance room at the manor plus outdoor spaces set up for in-season shows.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  MASSOTHERAPY: {
    FR: {
      h1: "Massothérapie et reiki en Outaouais — Le Salon des Inconnus, Namur",
      kicker: "Soins",
      sectionTitle: "Massothérapie et reiki à la Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus offre des soins de massothérapie et de reiki avec Andrée Dancause, dans une salle dédiée du manoir, à Namur. Les rendez-vous sont accessibles aux résidents de l'auberge ainsi qu'aux visiteurs de la Petite-Nation et des environs.",
        "Le menu de soins inclut des massages thérapeutiques (suédois, deep tissue), des soins énergétiques (reiki) et des séances combinant les deux approches. Des tarifs membres sont offerts aux personnes inscrites au Salon. Le spa et le jacuzzi de l'auberge sont accessibles avant ou après le rendez-vous.",
        "Pour réserver une séance, appeler le 514 418 3450 ou écrire à alex@lesalondesinconnus.com.",
      ],
      internalLinks: [
        { to: 'INN', label: "l'auberge et le spa ouvert 24/7" },
        { to: 'KITCHEN', label: 'la cuisine pour prolonger la pause' },
        { to: 'GUIDE', label: 'les attraits de la Petite-Nation' },
      ],
      externalLinks: [
        { to: 'https://www.fqm.qc.ca', label: 'Fédération Québécoise des Massothérapeutes' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Faut-il être client de l'auberge pour prendre rendez-vous ?",
          a: "Non. Les soins sont ouverts aux visiteurs externes, sur réservation. Les résidents bénéficient d'un tarif membre.",
        },
        {
          q: "Quels types de soins sont offerts ?",
          a: "Massage suédois, deep tissue, reiki, et séances combinées. Les détails sont précisés au moment de la réservation.",
        },
        {
          q: "Le spa et le jacuzzi sont-ils inclus ?",
          a: "L'accès au spa et au jacuzzi est compris pour les résidents de l'auberge en tout temps. Pour les visiteurs externes, l'accès dépend de la formule réservée.",
        },
      ],
    },
    EN: {
      h1: "Massage Therapy and Reiki in Outaouais — Le Salon des Inconnus, Namur",
      kicker: "Bodywork",
      sectionTitle: "Massage and reiki at Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus offers massage therapy and reiki with Andrée Dancause, in a dedicated room of the manor, in Namur. Appointments are open to inn guests as well as visitors from the Petite-Nation and surrounding areas.",
        "The menu includes therapeutic massage (Swedish, deep tissue), energy work (reiki) and combined sessions. Member rates apply to people registered with Le Salon. The inn's spa and hot tub are accessible before or after the appointment.",
        "To book a session, call 514 418 3450 or write to alex@lesalondesinconnus.com.",
      ],
      internalLinks: [
        { to: 'INN', label: 'the inn and 24/7 spa' },
        { to: 'KITCHEN', label: 'the kitchen to extend the break' },
        { to: 'GUIDE', label: 'things to do in Petite-Nation' },
      ],
      externalLinks: [
        { to: 'https://www.fqm.qc.ca', label: 'Fédération Québécoise des Massothérapeutes' },
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Do I have to be an inn guest to book?",
          a: "No. Sessions are open to external visitors by appointment. Members get a discounted rate.",
        },
        {
          q: "What kinds of treatments are offered?",
          a: "Swedish massage, deep tissue, reiki and combined sessions. Details are confirmed at booking.",
        },
        {
          q: "Are the spa and hot tub included?",
          a: "Spa and hot tub access is included for inn guests around the clock. For external visitors, access depends on the package booked.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  KITCHEN: {
    FR: {
      h1: "Cuisine signature et traiteur en Outaouais — Chef Marc Alexis Pepin, Namur",
      kicker: "Cuisine",
      sectionTitle: "La table de la Maison Favier",
      paragraphs: [
        "Le laboratoire culinaire du Salon des Inconnus, dirigé par le chef Marc Alexis Pepin, marie la bistronomie portugaise et la cuisine moléculaire montréalaise. Les services comprennent la table d'hôtes pour les résidents, le traiteur pour mariages et événements en Outaouais, et des chefs's tables ponctuels lors des grands rassemblements comme le Grand Ceilidh de Mai.",
        "La cuisine met de l'avant les producteurs de la Petite-Nation : Fromagerie Montebello, Brasseurs de Montebello, ChocoMotive, ainsi que les jardins et la serre de la Maison Favier. Les wwoofers participent souvent à la cuisine et à la table partagée pendant la saison.",
        "Pour réserver un service traiteur ou une chef's table, écrire à alex@lesalondesinconnus.com.",
      ],
      internalLinks: [
        { to: 'INN', label: "l'auberge et les chambres" },
        { to: 'WWOOFING', label: 'le wwoofing en cuisine' },
        { to: 'EVENTS', label: 'les événements et banquets' },
        { to: 'CEILIDH', label: 'le banquet du Ceilidh de Mai' },
      ],
      externalLinks: [
        { to: 'https://www.brasseursdemontebello.ca', label: 'Brasseurs de Montebello' },
        { to: 'https://chocomotive.ca', label: 'ChocoMotive (Montebello)' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Offrez-vous un service traiteur en Outaouais ?",
          a: "Oui. Le chef Marc Alexis Pepin offre un service traiteur pour mariages, retraites d'entreprise et événements privés dans la Petite-Nation et l'Outaouais.",
        },
        {
          q: "La table est-elle ouverte au public ?",
          a: "La table d'hôtes est principalement réservée aux résidents et aux événements privés. Des chefs's tables ponctuels sont annoncés sur la page Événements.",
        },
        {
          q: "Travaillez-vous avec des producteurs locaux ?",
          a: "Oui — Fromagerie Montebello, Brasseurs de Montebello, ChocoMotive, ainsi que les jardins et la serre de la Maison Favier.",
        },
      ],
    },
    EN: {
      h1: "Signature Kitchen and Catering in Outaouais — Chef Marc Alexis Pepin, Namur",
      kicker: "Kitchen",
      sectionTitle: "The table at Maison Favier",
      paragraphs: [
        "The culinary lab at Le Salon des Inconnus, led by chef Marc Alexis Pepin, blends Portuguese bistronomy and Montréal molecular cuisine. Services include the resident table d'hôtes, catering for weddings and events across Outaouais, and occasional chef's tables during major gatherings such as the Grand Ceilidh de Mai.",
        "The kitchen showcases Petite-Nation producers — Fromagerie Montebello, Brasseurs de Montebello, ChocoMotive — alongside Maison Favier's own gardens and greenhouse. Wwoofers often join the kitchen team and the shared table during the season.",
        "To book a catering service or a chef's table, write to alex@lesalondesinconnus.com.",
      ],
      internalLinks: [
        { to: 'INN', label: 'the inn and rooms' },
        { to: 'WWOOFING', label: 'kitchen wwoofing' },
        { to: 'EVENTS', label: 'events and banquets' },
        { to: 'CEILIDH', label: 'the Ceilidh banquet' },
      ],
      externalLinks: [
        { to: 'https://www.brasseursdemontebello.ca', label: 'Brasseurs de Montebello' },
        { to: 'https://chocomotive.ca', label: 'ChocoMotive (Montebello)' },
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Do you offer catering in Outaouais?",
          a: "Yes. Chef Marc Alexis Pepin offers catering for weddings, corporate retreats and private events across the Petite-Nation and Outaouais.",
        },
        {
          q: "Is the table open to the public?",
          a: "The table d'hôtes is primarily for inn guests and private events. Public chef's tables are announced on the Events page.",
        },
        {
          q: "Do you work with local producers?",
          a: "Yes — Fromagerie Montebello, Brasseurs de Montebello, ChocoMotive, plus Maison Favier's own gardens and greenhouse.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  HOSTS: {
    FR: {
      h1: "Les hôtes et l'équipe du Salon des Inconnus — Maison Favier, Namur",
      kicker: "L'équipe",
      sectionTitle: "Qui anime la Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus est porté par Alex T. St-Laurent, qui en assure la vision, la direction et la programmation depuis la Maison Favier, à Namur (Outaouais). Autour du projet gravitent une équipe d'artistes, d'artisans et de collaborateurs : le chef Marc Alexis Pepin (cuisine), la massothérapeute Andrée Dancause (soins), ainsi qu'une rotation d'artistes en résidence et de wwoofers de saison.",
        "L'équipe accueille les visiteurs, encadre les résidences artistiques, organise les événements communautaires et veille au quotidien du manoir. Le ton de la maison se résume à l'idée centrale : « la vie comme jeu ».",
        "Pour entrer en contact avec l'équipe : alex@lesalondesinconnus.com ou 514 418 3450.",
      ],
      internalLinks: [
        { to: 'INN', label: "l'auberge et le manoir" },
        { to: 'WWOOFING', label: 'rejoindre la maison comme wwoofer' },
        { to: 'MASSOTHERAPY', label: 'les soins avec Andrée Dancause' },
        { to: 'KITCHEN', label: "la cuisine du chef Marc Alexis Pepin" },
      ],
      externalLinks: [
        { to: 'https://www.petitenationoutaouais.com/attraits/le-salon-des-inconnus-maison-favier/', label: 'Tourisme Petite-Nation — fiche du Salon' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Qui dirige Le Salon des Inconnus ?",
          a: "Alex T. St-Laurent en assure la direction et la programmation, entouré du chef Marc Alexis Pepin, de la massothérapeute Andrée Dancause, d'artistes en résidence et de wwoofers de saison.",
        },
        {
          q: "Comment proposer une résidence artistique ?",
          a: "Par courriel à alex@lesalondesinconnus.com avec une courte présentation du projet et les dates souhaitées.",
        },
      ],
    },
    EN: {
      h1: "Hosts and team of Le Salon des Inconnus — Maison Favier, Namur",
      kicker: "The team",
      sectionTitle: "Who runs Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus is led by Alex T. St-Laurent, who runs vision, direction and programming from Maison Favier in Namur (Outaouais). Around the project gravitate a team of artists, makers and collaborators: chef Marc Alexis Pepin (kitchen), massage therapist Andrée Dancause (bodywork), plus a rotating cast of artists in residence and seasonal wwoofers.",
        "The team welcomes visitors, supports residencies, runs community events and tends to the daily life of the manor. The tone of the house comes down to one idea: \"life as play.\"",
        "To reach the team: alex@lesalondesinconnus.com or 514 418 3450.",
      ],
      internalLinks: [
        { to: 'INN', label: 'the inn and manor' },
        { to: 'WWOOFING', label: 'join the house as a wwoofer' },
        { to: 'MASSOTHERAPY', label: 'bodywork with Andrée Dancause' },
        { to: 'KITCHEN', label: "chef Marc Alexis Pepin's kitchen" },
      ],
      externalLinks: [
        { to: 'https://www.petitenationoutaouais.com/attraits/le-salon-des-inconnus-maison-favier/', label: 'Tourisme Petite-Nation — Salon listing' },
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Who runs Le Salon des Inconnus?",
          a: "Alex T. St-Laurent leads vision and programming, with chef Marc Alexis Pepin, massage therapist Andrée Dancause, artists in residence and seasonal wwoofers.",
        },
        {
          q: "How do I propose an artistic residency?",
          a: "Email alex@lesalondesinconnus.com with a short pitch of the project and your preferred dates.",
        },
      ],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  GUIDE: {
    FR: {
      h1: "Guide local de la Petite-Nation et de l'Outaouais — Le Salon des Inconnus, Namur",
      kicker: "À explorer",
      sectionTitle: "Quoi faire autour de la Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus est situé à Namur, en plein cœur de la Petite-Nation, à mi-chemin entre Montebello et Mont-Tremblant. Le secteur est reconnu pour son patrimoine bâti, ses lacs et ses parcs régionaux, et pour la richesse de son offre culturelle saisonnière.",
        "À une vingtaine de minutes, le Parc Oméga permet d'observer la faune nord-américaine en liberté. Le Centre touristique du Lac-Simon (Sépaq) propose plage, randonnée et canot, tandis que le Parc des Montagnes Noires de Ripon et les Chutes de Plaisance offrent des sentiers pour tous les niveaux. Le Lieu historique national du Manoir-Papineau et le Fairmont Le Château Montebello complètent l'offre patrimoniale.",
        "Côté gastronomie, on recommande Café des Orties (Ripon), Koko Café (Namur), Brasseurs de Montebello, ChocoMotive et Fromagerie Montebello. La région accueille aussi de nombreux festivals : Ripon Trad Festival, Festival Médiéval de Montpellier, Festival Western St-André-Avellin, NCC Fall Rhapsody.",
      ],
      internalLinks: [
        { to: 'INN', label: "l'auberge comme camp de base" },
        { to: 'WWOOFING', label: 'séjourner plus longtemps en wwoofing' },
        { to: 'CEILIDH', label: 'le Grand Ceilidh de Mai 2026' },
        { to: 'MASSOTHERAPY', label: 'soins et détente sur place' },
      ],
      externalLinks: [
        { to: 'https://www.parcomega.ca', label: 'Parc Oméga' },
        { to: 'https://www.sepaq.com/pq/lsi', label: 'Lac-Simon (Sépaq)' },
        { to: 'https://parcdesmontagnesnoires.ca', label: 'Parc des Montagnes Noires de Ripon' },
        { to: 'https://www.fairmont.com/montebello', label: 'Fairmont Le Château Montebello' },
        { to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "Combien de temps faut-il pour aller au Parc Oméga ?",
          a: "Environ 20 minutes en voiture depuis la Maison Favier (Namur).",
        },
        {
          q: "Y a-t-il un domaine skiable près de l'auberge ?",
          a: "Oui — Mont-Tremblant est à environ 45 minutes. La région offre aussi de la motoneige, du fatbike et du ski de fond en hiver.",
        },
        {
          q: "Quels festivals avoir à l'œil dans la Petite-Nation ?",
          a: "Le Ripon Trad Festival, le Festival Médiéval de Montpellier, le Festival Western St-André-Avellin et le NCC Fall Rhapsody, entre autres.",
        },
      ],
    },
    EN: {
      h1: "Local Guide to Petite-Nation and Outaouais — Le Salon des Inconnus, Namur",
      kicker: "What to explore",
      sectionTitle: "Things to do around Maison Favier",
      paragraphs: [
        "Le Salon des Inconnus sits in Namur, right in the Petite-Nation, halfway between Montebello and Mont-Tremblant. The area is known for its built heritage, lakes and regional parks, and for a rich seasonal cultural calendar.",
        "About twenty-five minutes away, Parc Oméga offers a drive-through view of North American wildlife. The Centre touristique du Lac-Simon (Sépaq) has a beach, hiking and canoeing, while the Parc des Montagnes Noires de Ripon and the Chutes de Plaisance provide trails for all levels. The Manoir-Papineau National Historic Site and Fairmont Le Château Montebello round out the heritage circuit.",
        "For food and drink: Café des Orties (Ripon), Koko Café (Namur), Brasseurs de Montebello, ChocoMotive and Fromagerie Montebello. The region also hosts many festivals — Ripon Trad Festival, Festival Médiéval de Montpellier, Festival Western St-André-Avellin and NCC Fall Rhapsody among them.",
      ],
      internalLinks: [
        { to: 'INN', label: 'the inn as your basecamp' },
        { to: 'WWOOFING', label: 'longer stays through wwoofing' },
        { to: 'CEILIDH', label: 'the Grand Ceilidh de Mai 2026' },
        { to: 'MASSOTHERAPY', label: 'on-site bodywork' },
      ],
      externalLinks: [
        { to: 'https://www.parcomega.ca', label: 'Parc Oméga' },
        { to: 'https://www.sepaq.com/pq/lsi', label: 'Lac-Simon (Sépaq)' },
        { to: 'https://parcdesmontagnesnoires.ca', label: 'Parc des Montagnes Noires de Ripon' },
        { to: 'https://www.fairmont.com/montebello', label: 'Fairmont Le Château Montebello' },
        { to: 'https://tourismeoutaouais.com/en', label: 'Tourisme Outaouais' },
      ],
      faq: [
        {
          q: "How long does it take to get to Parc Oméga?",
          a: "About 20 minutes by car from Maison Favier (Namur).",
        },
        {
          q: "Is there a ski resort near the inn?",
          a: "Yes — Mont-Tremblant is about 45 minutes away. The region also has snowmobiling, fatbiking and cross-country skiing in winter.",
        },
        {
          q: "What festivals should I watch for in the Petite-Nation?",
          a: "Ripon Trad Festival, Festival Médiéval de Montpellier, Festival Western St-André-Avellin and NCC Fall Rhapsody, among others.",
        },
      ],
    },
  },
};
