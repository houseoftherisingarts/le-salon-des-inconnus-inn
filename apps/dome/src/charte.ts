// Charte fondatrice de la Coopérative du Dôme des Inconnus.
// BROUILLON de travail : le texte final doit être validé par Alex
// (et par le CDRQ à la constitution) avant toute signature.

export interface ArticleCharte {
  numero: string;
  titre: string;
  texte: string;
}

export const VERSION_CHARTE = 'Charte fondatrice · version 2026';

export const CHARTE: ArticleCharte[] = [
  {
    numero: '01',
    titre: 'La mission',
    texte:
      "La Coopérative du Dôme des Inconnus rassemble dix personnes qui font vivre le domaine de Maison Favier, à Namur. Elle existe pour que la terre soit cultivée, que les mains qui créent aient un comptoir, et que le lieu reste ouvert, vivant et partagé.",
  },
  {
    numero: '02',
    titre: 'Le lieu',
    texte:
      "La coopérative loue ses espaces au domaine par un bail : les jardins et les terres cultivables, la boutique, le café et les salles de soins. Ce bail est couvert par les cotisations des membres. Le domaine demeure propriétaire des lieux; la coopérative en est la locataire et la gardienne.",
  },
  {
    numero: '03',
    titre: 'Les membres',
    texte:
      "La coopérative compte au plus dix membres. Chaque membre verse une cotisation de dix dollars par mois, qui couvre sa part du loyer. Chaque membre a une voix, peu importe son ancienneté ou son activité.",
  },
  {
    numero: '04',
    titre: 'Ce que le membre peut faire',
    texte:
      "Cultiver la terre et récolter. Vendre à la boutique ce qui sort de ses mains : récoltes, savons, artisanat, et ses œuvres dans l'aile des arts. Tenir le café à temps partiel. Offrir des soins dans les espaces de massage. Un membre choisit une ou plusieurs de ces voies, à son rythme.",
  },
  {
    numero: '05',
    titre: 'Le fruit du travail',
    texte:
      "Ce qu'un membre vend lui appartient en entier. La coopérative ne prélève aucune commission sur les ventes. La cotisation mensuelle est la seule contribution demandée.",
  },
  {
    numero: '06',
    titre: 'Le conseil',
    texte:
      "Un conseil d'administration formé de membres volontaires veille sur la coopérative : le bail, les cotisations, l'accueil des nouveaux membres et la vie commune. Siéger au conseil est un service, ouvert à toute personne membre qui s'y porte volontaire.",
  },
  {
    numero: '07',
    titre: "L'esprit",
    texte:
      "On entre à la coopérative comme on entre dans une maison habitée : avec soin. Les décisions se prennent ensemble, les espaces se partagent, et ce qui se crée ici porte la marque du lieu. La coopérative est constituée comme coopérative de solidarité selon la loi du Québec.",
  },
];
