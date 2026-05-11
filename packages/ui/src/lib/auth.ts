/**
 * Shared auth helpers for the Le Salon des Inconnus codebase.
 *
 * The single source of truth for "who is an admin" is the small email
 * allow-list below. It must stay in sync with:
 *   • firestore.rules → function isAdmin()
 *   • storage.rules   → function isAdmin()
 *
 * When we eventually move admin to a custom claim (set via Cloud Function),
 * `isAdmin()` here is the only TypeScript line that needs to flip — every
 * caller already routes through this helper.
 */

const ADMIN_EMAILS: ReadonlyArray<string> = [
    'houseoftherisingarts@gmail.com',
    'alex@lesalondesinconnus.com',
];

/** Minimal user shape — accepts a Firebase Auth User or anything with an
 *  email field. Returns false for null/undefined or missing emails. */
export interface AdminCheckUser {
    email?: string | null;
}

export function isAdmin(user: AdminCheckUser | null | undefined): boolean {
    const email = user?.email?.toLowerCase();
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
}

/** Same allow-list exposed for places that need to render it (e.g. an
 *  "admin" footer link). Treat as read-only. */
export const ADMIN_EMAIL_LIST = ADMIN_EMAILS;
