

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

export type AmenityKey =
  | 'parking'
  | 'wifi'
  | 'no-wifi'
  | 'hot-tub'
  | 'terrasse'
  | 'projector'
  | 'boardgames'
  | 'fireplace'
  | 'private-bath'
  | 'electricity'
  | 'off-grid';

export interface Accommodation {
  id: string;
  title: string;
  title_fr?: string;
  type: string;
  type_fr?: string;
  description: string;
  description_fr?: string;
  guests: number | string;
  /** Stretch capacity (e.g. "Max 3" when standard is 2). When omitted, guests is the cap. */
  maxGuests?: number | string;
  beds: number | string;
  baths: number | string;
  amenities?: AmenityKey[];
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
  isVip?: boolean;      // Full-width featured card at top of category
  /** When set, clicking the card flips into an in-app blog post.
      The card still links externally via the "Visiter le site" CTA inside.
      Used for SEO/GEO — Article + LocalBusiness JSON-LD is injected on open. */
  blogPost?: BlogPost;
}

export interface BlogPostSection {
  title_fr: string;
  title_en: string;
  body_fr: string;
  body_en: string;
}

export interface BlogPostFaq {
  q_fr: string;
  q_en: string;
  a_fr: string;
  a_en: string;
}

export interface BlogPostSchema {
  /** schema.org @type — e.g. "Restaurant", "TouristAttraction", "Park", "LocalBusiness", "Event" */
  type?: string;
  address?: string;
  phone?: string;
  lat?: number;
  lng?: number;
  openingHours?: string;
  priceRange?: string;
}

export interface BlogPost {
  intro_fr: string;
  intro_en: string;
  sections: BlogPostSection[];
  faqs?: BlogPostFaq[];
  schema?: BlogPostSchema;
  /** True until the owner has reviewed the auto-generated draft. UI shows a small badge. */
  _draft?: boolean;
}

export interface LocalGuideCategory {
  id: string;
  title_fr: string;
  title_en: string;
  description_fr?: string;
  description_en?: string;
  items: LocalGuideItem[];
}

export type WwooferStatus = 'pending' | 'approved' | 'declined';

export interface WwooferProfile {
  uid: string;
  displayName: string;
  email: string;
  phone?: string;
  photoURL?: string;
  city?: string;
  country?: string;
  age?: number;
  languages?: string[];
  preferredTasks?: string[];
  experience?: string;
  motivations?: string;
  needs?: string;
  dietaryRestrictions?: string;
  allergies?: string;
  healthNotes?: string;
  accommodationPreference?: string;
  hasVehicle?: boolean;
  smoker?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  status?: WwooferStatus;
  createdAt?: any;
  updatedAt?: any;
}

export interface WwooferVisitRequest {
  id: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;   // ISO yyyy-mm-dd
  numberOfDays: number;
  notes?: string;
  status: WwooferStatus;
  createdAt?: any;
  decidedAt?: any;
  decidedByEmail?: string;
}

export interface WwooferMessage {
  id: string;
  text: string;
  fromAdmin: boolean;
  authorEmail?: string;
  createdAt?: any;
}

// ─── Show offers ────────────────────────────────────────────────────────────
// Submissions from artists who'd like to perform during the Ceilidh weekend.
// Stored at events/{EVENT_ID}/showOffers/{offerId}.
export type ShowOfferType   = 'donation' | 'paid';
export type ShowOfferStatus = 'new' | 'contacted' | 'accepted' | 'refused';

export interface ShowOffer {
  id: string;
  type: ShowOfferType;
  status: ShowOfferStatus;
  // Artist / contact
  artistName: string;
  contactName: string;
  email: string;
  phone?: string;
  // Performance details
  performersCount: number;
  canUnplugged: boolean;
  durationMinutes: number;
  genre?: string;
  description?: string;       // what they'd play
  technicalNeeds?: string;    // free-form
  preferredDays?: string[];   // ISO yyyy-mm-dd within event window
  // Paid only
  requestedFeeCAD?: number;
  // Free-form
  notes?: string;
  // Submission metadata
  submittedByUid?: string;
  submittedByEmail?: string;
  createdAt?: any;
  decidedAt?: any;
  adminNote?: string;
}