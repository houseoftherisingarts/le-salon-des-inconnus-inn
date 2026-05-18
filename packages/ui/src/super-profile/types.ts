// Super Profile — Maestro-tier-only standalone portfolio page.
//
// Data lives in two places:
//   • members/{uid}/superProfile/config — owner-editable settings doc
//   • usernames/{slug} — uniqueness lookup; doc id is the slug, body is { uid }
//
// Maestro tier itself is gated by members/{uid}/admin/flags.maestroEnabled
// (admin-controlled, mirrors the existing isArtist pattern). Until billing
// exists, this flag is the only way to unlock the editor.

export type SuperProfileMedium = 'photo' | 'visual-art' | 'other';

export interface SuperProfileLinks {
    instagram?: string;
    website?: string;
    buy?: string;       // print shop, gumroad, store, etc.
    booking?: string;   // calendly, contact form, etc.
}

export interface SuperProfileHeroPhoto {
    /** Public download URL of the (alpha-channeled) hero cutout. */
    url: string;
    /** Storage path so the file can be deleted on replace. */
    storagePath: string;
    /**
     * 'manual-png' — the user uploaded a transparent PNG and we trusted it.
     * 'auto-removed' — we ran @imgly/background-removal client-side.
     */
    source: 'manual-png' | 'auto-removed';
    /** Pixel width/height — used by templates to size the cutout proportionally. */
    width?: number;
    height?: number;
}

export interface SuperProfileWork {
    /** Public download URL. */
    url: string;
    /** Storage path for delete. */
    storagePath: string;
    /** Optional caption shown under the work in some templates. */
    caption?: string;
}

export interface SuperProfileConfig {
    /** When false, the public route 404s even if the username is claimed. */
    enabled: boolean;
    /** Lowercase slug, [a-z0-9-]{3,32}. Validated client + server side. */
    username: string;
    medium: SuperProfileMedium;
    hero?: SuperProfileHeroPhoto;
    works: SuperProfileWork[];
    /** Display name shown on the page; defaults to the user's auth displayName. */
    displayName?: string;
    /** Short one-liner under the name. */
    tagline?: string;
    /** Long-form bio paragraph. */
    bio?: string;
    links?: SuperProfileLinks;
    /** Set by serverTimestamp on every save. */
    updatedAt?: any;
}

export interface UsernameClaim {
    uid: string;
    /** Lowercase slug — mirrored from the doc id for convenience in client code. */
    slug: string;
    claimedAt?: any;
}

/** Maximum works in Phase 1. Keeps the layouts predictable. */
export const MAX_WORKS = 12;

/** Storage paths used for super-profile assets. */
export const heroStoragePath = (uid: string, ext: 'png' | 'webp' = 'png') =>
    `members/${uid}/superProfile/hero.${ext}`;
export const workStoragePath = (uid: string, workId: string, ext: string) =>
    `members/${uid}/superProfile/works/${workId}.${ext}`;
