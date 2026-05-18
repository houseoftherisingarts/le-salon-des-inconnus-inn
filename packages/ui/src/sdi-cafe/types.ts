// Cafe-local copy of ArtistProfile. Same shape as packages/ui/src/arts/types.ts
// (no `skills` field — that's the creator-studio variant). Kept separate so the
// cafe's roster can evolve independently if its needs diverge.
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
