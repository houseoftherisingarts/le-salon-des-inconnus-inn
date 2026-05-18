// Username slug rules + Firestore claim helpers.
//
// Slug format: [a-z0-9-]{3,32}. No leading/trailing hyphen, no double-hyphen,
// no purely-numeric (avoids visual confusion with uids).
//
// Uniqueness: usernames/{slug} doc. Created in a transaction that checks the
// slot is empty AND that the calling user isn't already claiming a different
// slug. The user's claim is mirrored on their superProfile/config doc.

import {
    getFirestore, doc, getDoc, setDoc, deleteDoc,
    runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { getApp } from 'firebase/app';

const SLUG_REGEX = /^[a-z0-9]([a-z0-9-]{1,30})[a-z0-9]$/;

/**
 * Reserved slugs. Anything that maps to a real route, a brand name we'd
 * never want squatted, or a platform-common term that would be misleading
 * as a personal portfolio URL.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
    // Existing routes (matches VIEW_PATHS in App.tsx, minus the leading /)
    'admin', 'mainpagetest2', 'mainpagetest3', 'massage', 'guide',
    'cuisine', 'evenements', 'ceilidh', 'wwoofing', 'profil', 'membre',
    'messages', 'creator',
    // Reserved future paths
    'api', 'auth', 'login', 'signup', 'sdi', 'salon', 'inn', 'u',
    // Brand names
    'alex', 'alextstlaurent', 'salondesinconnus', 'lesalondesinconnus',
    // Platform terms
    'about', 'contact', 'terms', 'privacy', 'help', 'support', 'blog',
    'store', 'shop', 'search', 'home', 'index', 'app', 'www', 'mail',
    'maestro', 'artiste', 'artist', 'tier',
]);

export type UsernameValidation =
    | { ok: true }
    | { ok: false; reason: 'too-short' | 'too-long' | 'bad-chars' | 'edge-hyphen' | 'numeric-only' | 'reserved' };

export function validateUsername(raw: string): UsernameValidation {
    const slug = raw.trim().toLowerCase();
    if (slug.length < 3) return { ok: false, reason: 'too-short' };
    if (slug.length > 32) return { ok: false, reason: 'too-long' };
    if (slug.startsWith('-') || slug.endsWith('-')) return { ok: false, reason: 'edge-hyphen' };
    if (/^\d+$/.test(slug)) return { ok: false, reason: 'numeric-only' };
    if (!SLUG_REGEX.test(slug)) return { ok: false, reason: 'bad-chars' };
    if (RESERVED_SLUGS.has(slug)) return { ok: false, reason: 'reserved' };
    return { ok: true };
}

/**
 * Turn an arbitrary displayName into a candidate slug. Caller still has to
 * run validateUsername and check availability — this is a starting suggestion.
 */
export function slugifyDisplayName(name: string | null | undefined): string {
    if (!name) return '';
    const slug = name
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')    // strip combining accents
        .replace(/[^a-z0-9]+/g, '-')                         // collapse runs of non-alphanum
        .replace(/^-+|-+$/g, '')                             // trim hyphens
        .slice(0, 32);
    if (slug.length < 3) return '';
    return slug;
}

/**
 * Reads usernames/{slug} and returns true if the slot is available OR the
 * existing claim belongs to `currentUid` (so the user can re-confirm their
 * own slug as available).
 */
export async function isSlugAvailable(slug: string, currentUid: string | null): Promise<boolean> {
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, 'usernames', slug));
    if (!snap.exists()) return true;
    const data = snap.data() as { uid?: string };
    return data.uid === currentUid;
}

/**
 * Claim `newSlug` for `uid`. Releases the user's previous slug (if any) in
 * the same transaction. Throws if newSlug is already taken by someone else.
 */
export async function claimUsername(
    uid: string,
    newSlug: string,
    previousSlug: string | null,
): Promise<void> {
    const db = getFirestore(getApp());
    await runTransaction(db, async (tx) => {
        const newRef = doc(db, 'usernames', newSlug);
        const newSnap = await tx.get(newRef);
        if (newSnap.exists()) {
            const data = newSnap.data() as { uid?: string };
            if (data.uid !== uid) {
                throw new Error('Username already taken');
            }
        }
        // Release the old slot if the user is migrating.
        if (previousSlug && previousSlug !== newSlug) {
            const oldRef = doc(db, 'usernames', previousSlug);
            const oldSnap = await tx.get(oldRef);
            if (oldSnap.exists() && (oldSnap.data() as { uid?: string }).uid === uid) {
                tx.delete(oldRef);
            }
        }
        tx.set(newRef, {
            uid,
            slug: newSlug,
            claimedAt: serverTimestamp(),
        });
    });
}

/** Release a user's slug (used when they disable the Super Profile). */
export async function releaseUsername(uid: string, slug: string): Promise<void> {
    const db = getFirestore(getApp());
    const ref = doc(db, 'usernames', slug);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if ((snap.data() as { uid?: string }).uid !== uid) return;
    await deleteDoc(ref);
}

/**
 * Resolve a slug to a uid. Used by the public /{username} route. Returns null
 * if the slug is unclaimed.
 */
export async function resolveSlugToUid(slug: string): Promise<string | null> {
    const v = validateUsername(slug);
    if (!v.ok) return null;
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, 'usernames', slug));
    if (!snap.exists()) return null;
    return (snap.data() as { uid?: string }).uid ?? null;
}
