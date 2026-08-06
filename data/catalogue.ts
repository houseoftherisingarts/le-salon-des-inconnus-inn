// Catalogue de prévente des œuvres : /catalogue (page non listée, noindex).
//
// Les œuvres seront tirées des artistes déjà présents sur la plateforme
// (Creator Studio) et du site. Tant que `img` est null, la grille affiche un
// cadre d'attente au bon ratio : la mise en page se juge sans les photos.
//
// Pour remplir : remplacer les entrées ci-dessous par les vraies œuvres et
// pointer `img` vers /media/catalogue/<fichier>.jpg.

export interface Artwork {
  id: string;
  /** Titre de l'œuvre. */
  title: string;
  /** Nom de l'artiste tel qu'affiché. */
  artist: string;
  /** Slug du profil sur la plateforme, s'il existe. Ouvre /{slug}. */
  artistSlug?: string;
  /** Technique : huile sur toile, photographie argentique, grès émaillé... */
  medium: string;
  /** Dimensions lisibles, ex. « 61 × 91 cm ». */
  dimensions: string;
  /** Prix en dollars. null = sur demande. */
  price: number | null;
  /** Chemin de l'image, ou null tant que la photo n'est pas prise. */
  img: string | null;
  /** Où l'œuvre est accrochée dans la maison. */
  location: string;
  /** Deux ou trois phrases sur l'œuvre. */
  note: string;
  status: 'available' | 'reserved' | 'sold';
}

export const CATALOGUE: Artwork[] = [
  {
    id: 'placeholder-1',
    title: "Titre de l'œuvre",
    artist: "Nom de l'artiste",
    medium: 'Huile sur toile',
    dimensions: '61 × 91 cm',
    price: 1200,
    img: null,
    location: 'Salon principal',
    note: "Deux ou trois phrases sur l'œuvre : ce qu'elle raconte, ce qui a mené l'artiste à la peindre, ce qu'elle change dans la pièce où elle est accrochée.",
    status: 'available',
  },
  {
    id: 'placeholder-2',
    title: "Titre de l'œuvre",
    artist: "Nom de l'artiste",
    medium: 'Photographie argentique',
    dimensions: '40 × 50 cm',
    price: 450,
    img: null,
    location: 'Corridor de l\'étage',
    note: "Deux ou trois phrases sur l'œuvre : ce qu'elle raconte, ce qui a mené l'artiste à la faire, ce qu'elle change dans la pièce où elle est accrochée.",
    status: 'available',
  },
  {
    id: 'placeholder-3',
    title: "Titre de l'œuvre",
    artist: "Nom de l'artiste",
    medium: 'Grès émaillé',
    dimensions: '28 cm de hauteur',
    price: 280,
    img: null,
    location: 'Salle à manger',
    note: "Deux ou trois phrases sur l'œuvre : ce qu'elle raconte, ce qui a mené l'artiste à la façonner, ce qu'elle change dans la pièce où elle est posée.",
    status: 'available',
  },
  {
    id: 'placeholder-4',
    title: "Titre de l'œuvre",
    artist: "Nom de l'artiste",
    medium: 'Encre et gouache sur papier',
    dimensions: '30 × 40 cm',
    price: 320,
    img: null,
    location: 'Chambre de la Méditante',
    note: "Deux ou trois phrases sur l'œuvre : ce qu'elle raconte, ce qui a mené l'artiste à la tracer, ce qu'elle change dans la pièce où elle est accrochée.",
    status: 'available',
  },
  {
    id: 'placeholder-5',
    title: "Titre de l'œuvre",
    artist: "Nom de l'artiste",
    medium: 'Bois tourné',
    dimensions: '22 × 22 cm',
    price: null,
    img: null,
    location: 'Bibliothèque',
    note: "Deux ou trois phrases sur l'œuvre : ce qu'elle raconte, ce qui a mené l'artiste à la tourner, ce qu'elle change dans la pièce où elle est posée.",
    status: 'available',
  },
  {
    id: 'placeholder-6',
    title: "Titre de l'œuvre",
    artist: "Nom de l'artiste",
    medium: 'Acrylique sur panneau',
    dimensions: '76 × 76 cm',
    price: 1600,
    img: null,
    location: 'Grand escalier',
    note: "Deux ou trois phrases sur l'œuvre : ce qu'elle raconte, ce qui a mené l'artiste à la peindre, ce qu'elle change dans la pièce où elle est accrochée.",
    status: 'available',
  },
];

/** Nombre d'œuvres affichées par lot dans la grille (règle poids-réseau). */
export const CATALOGUE_BATCH = 12;
