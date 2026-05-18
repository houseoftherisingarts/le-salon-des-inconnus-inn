export interface ArtistProfile {
  id: number;
  name: string;
  class: string;
  category: 'MUSIC' | 'VISUAL' | 'DIGITAL' | 'SCULPTURE';
  avatarUrl: string;
  galleryImages: string[];
  location: string;
  medium: string;
  subjects: string[];
  currentExpos?: string;
  stats: {
    creativity: number;
    technique: number;
    vision: number;
  };
  bio: string;
  links: {
    buy: string;
    website: string;
    support: string;
  };
}
