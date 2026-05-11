/**
 * Type definitions for the Inspirosphere video pipeline.
 *
 * Three video kinds coexist:
 *
 *   1. Static seed (`InspirosphereVideo` in inspirosphereVideos.ts) — the
 *      original curated catalog of web links (YouTube / FB). Lives in code,
 *      reads from `inspirosphereVideos.ts`. Powers the "Discovered" tab.
 *
 *   2. Admin-curated (`InspirosphereCuratedVideo`) — videos Alex uploads
 *      directly into Firebase Storage and lists in the "Featured" tab.
 *      Lives in Firestore at `inspirosphereCurated/{videoId}`.
 *
 *   3. User-generated (`InspirosphereUserVideo`) — every video any creator
 *      uploads from their profile. Always visible on the creator's public
 *      profile page. Lives in Firestore at `members/{uid}/videos/{videoId}`.
 *      When the creator clicks "Request feature", featureStatus flips to
 *      'pending' and the doc surfaces in AdminCRM's review queue. On
 *      approval, an `InspirosphereFeaturedVideo` is written to the flat
 *      `inspirosphereFeatured/{videoId}` collection — that's what powers
 *      the public "Voices" tab without needing a collectionGroup query.
 *
 * The flattened featured/curated collections cost two writes per approval
 * (source flip + denormalized copy) but give us cheap public reads + simple
 * security rules (admin-write/public-read, no traversal).
 */

import type { InspirosphereCategory } from './inspirosphereVideos';

/** Source kind for a single piece of media used by the orb player. */
export type InspirosphereVideoSource =
    | { kind: 'YOUTUBE';  url: string }                // external link
    | { kind: 'FACEBOOK'; url: string }                // external link
    | { kind: 'FIREBASE'; storagePath: string };       // uploaded MP4

/** Where the user's request sits in the admin review pipeline. */
export type InspirosphereFeatureStatus =
    | 'none'        // never requested
    | 'pending'     // awaiting admin review
    | 'featured'    // approved + live in Voices tab
    | 'rejected';   // turned down (rejectionReason explains why)

// ─── User-generated videos ────────────────────────────────────────────────
// Stored at members/{uid}/videos/{videoId}. Owner-write, public-read so
// every visitor can see them on the creator's public profile page. The
// view counter is publicly writeable for the `viewCount` field ONLY (rule
// uses request.resource.data.diff so nothing else can sneak in).

export interface InspirosphereUserVideo {
    /** Firestore document id (also used as the Storage object basename). */
    id: string;
    ownerUid: string;
    /** Display name shown on the card. */
    title: string;
    /** One of INSPIROSPHERE_CATEGORIES — drives Conscious-mode filtering
     *  in the Voices tab once featured. */
    category: InspirosphereCategory;
    /** Path inside the default Storage bucket. NOT a download URL — we
     *  call getDownloadURL() at render time so the URL token is fresh. */
    storagePath: string;
    /** Optional poster image, also a Storage path. */
    posterPath?: string;
    /** Approximate clip length (seconds). Best-effort — captured on upload
     *  if the browser exposes it via the loadedmetadata event. */
    durationSec?: number;
    /** Feature-request state. Default 'none' on upload. */
    featureStatus: InspirosphereFeatureStatus;
    /** Public view counter. Anyone authenticated may increment by 1; admins
     *  read this in CRM. NEVER shown on the public profile page. */
    viewCount: number;
    requestedAt?: any;        // serverTimestamp
    reviewedAt?:  any;        // serverTimestamp
    reviewedBy?:  string;     // admin email at time of review
    rejectionReason?: string;
    createdAt:    any;        // serverTimestamp
    updatedAt?:   any;        // serverTimestamp
}

// ─── Admin-curated videos ────────────────────────────────────────────────
// Stored at inspirosphereCurated/{videoId}. Admin-write, public-read.
// Powers the "Featured" tab — Alex's own picks delivered with full
// editorial control.

export interface InspirosphereCuratedVideo {
    id: string;
    title: string;
    credit?: string;
    category: InspirosphereCategory;
    storagePath: string;
    posterPath?: string;
    durationSec?: number;
    /** Admin email that uploaded — auditing. */
    uploadedBy: string;
    publishedAt: any;
    /** Lets the admin reorder Featured without re-uploading; the orb
     *  pool sorts by this field then by publishedAt. */
    sortOrder?: number;
}

// ─── Denormalized featured (Voices tab) ──────────────────────────────────
// Stored at inspirosphereFeatured/{videoId}. Admin-write, public-read.
// Written by the "Approve" action; mirrors the source user-video fields
// plus the original ownerUid so we can link back to the creator's profile.

export interface InspirosphereFeaturedVideo {
    id: string;                  // = source video id
    ownerUid: string;
    /** Display name at time of approval — snapshotted so renaming the
     *  source on the profile doesn't silently mutate the Voices feed. */
    title: string;
    /** Captured from the source video's owner at approval time so the
     *  Voices tab can show "by NAME" without a second read. */
    ownerDisplayName?: string;
    category: InspirosphereCategory;
    storagePath: string;
    posterPath?: string;
    durationSec?: number;
    featuredAt: any;
    featuredBy: string;          // admin email
    sortOrder?: number;
}
