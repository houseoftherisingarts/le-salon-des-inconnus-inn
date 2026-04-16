

export interface Book {
  id: number;
  title: string;
  originalTitle?: string;
  description: string[];
  imageUrl: string;
  link: string;
  hitbox: {
    top: string;
    left: string;
    width: string;
    height: string;
  };
  transformOrigin: string;
  imageStyle?: { [key: string]: string | number };
}

export interface Accommodation {
  id: string;
  title: string;
  title_fr?: string;
  type: string;
  type_fr?: string;
  description: string;
  description_fr?: string;
  guests: number | string;
  beds: number | string;
  baths: number;
  images: string[];
  bookingLink: string;
  price?: string;
  status?: 'AVAILABLE' | 'COMING_SOON';
}

export interface ArtistProfile {
  id: number;
  name: string;
  class: string; // e.g., "Digital Alchemist", "Oil Painter"
  category: 'MUSIC' | 'VISUAL' | 'DIGITAL' | 'SCULPTURE'; // For GenAI Prompts
  avatarUrl: string; // Main Card Art (Front)
  galleryImages: string[]; // Carousel images (Back)
  location: string;
  medium: string;
  subjects: string[];
  currentExpos?: string;
  stats: {
    creativity: number; // 0-100
    technique: number; // 0-100
    vision: number; // 0-100
  };
  bio: string;
  links: {
    buy: string;
    website: string;
    support: string;
  };
}

export interface PlatformService {
  id: string;
  name: string;
  description: string;
  basePrice: number;
}

export interface LocalGuideItem {
  id: string;
  tag: string; // e.g. "L'ambiance", "Le rituel"
  title: string;
  location: string;
  description: string;
  link?: string;
  image: string;
  isFavorite?: boolean; // For "Coup de coeur"
}

export interface LocalGuideCategory {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr?: string;
  description_en?: string;
  items: LocalGuideItem[];
}