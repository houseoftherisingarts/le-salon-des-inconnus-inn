// Types lifted from creator-studio-repo-v0.2 (3)/types.ts.
// Note the ArtistProfile shape here has a `skills: string[]` field that the
// salon ArtsPage's ArtistProfile (in ../arts/types.ts) does NOT have — that's
// why the two rosters and types live side-by-side instead of being merged.

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
  skills: string[];
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

export type HubTier = 'NOVICE' | 'ARTISAN' | 'MASTER';

export interface HubTask {
  id: string;
  title: string;
  status: 'TODO' | 'DOING' | 'DONE';
}

export interface HubContract {
  id: string;
  title: string;
  reward: number;
  requester: string;
  requesterAvatar?: string;
  type: 'HELP_WANTED' | 'TIME_TO_SPARE';
  duration: string;
  tags: string[];
  status: 'OPEN' | 'FULFILLED';
  team: string[];
}

export interface HubArticle {
  id: string;
  title: string;
  author: string;
  /** Owner uid (set on Firestore-backed articles; absent on legacy seeds). */
  authorUid?: string;
  date: string;
  category: string;
  tags: string[];
  summary: string;
  /** Plain-text fallback. New articles use `blocks` (a JSON-serialized
   *  BlockRow[] from the BlockEditor) and only fall back to `content` for
   *  legacy seed articles. */
  content: string;
  /** Serialized BlockRow[] from BlockEditor; preferred when present. */
  blocks?: string;
  /** Article cover photo (banner). */
  coverUrl?: string;
  imageUrl?: string;
  audioUrl?: string;
  votes: number;
  /** Publish lifecycle: drafts are private to the author; 'requested' shows
   *  in the admin queue; 'public' is admin-approved and visible everywhere. */
  publishStatus?: 'draft' | 'requested' | 'public' | 'declined';
  publishRequestedAt?: any;
  publishedAt?: any;
}
