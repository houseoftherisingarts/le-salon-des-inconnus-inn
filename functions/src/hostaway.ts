// ─── Hostaway : le socle partagé ─────────────────────────────────────────────
// Tout ce qui parle à l'API Hostaway vit ici : le jeton, la base, la liste des
// annonces autorisées, le nom des chambres et les petits helpers de dates. Les
// quatre fonctions de réservation en direct (getHostawayAvailability, etc.) et
// les fonctions de l'espace membre (mesSejours, lierSejour) importent tout
// d'ici, pour que la logique reste à un seul endroit.
import { defineSecret } from 'firebase-functions/params';
import { HttpsError } from 'firebase-functions/v2/https';

export const HOSTAWAY_API_KEY = defineSecret('HOSTAWAY_API_KEY');
export const HOSTAWAY_ACCOUNT_ID = defineSecret('HOSTAWAY_ACCOUNT_ID');

// En émulateur seulement, un test peut pointer HOSTAWAY_BASE_TEST vers un
// serveur local. En production la base reste figée : aucune variable
// d'environnement ne peut détourner le jeton vers une autre adresse.
export const HOSTAWAY_BASE =
  process.env.FUNCTIONS_EMULATOR === 'true'
    ? process.env.HOSTAWAY_BASE_TEST ?? 'https://api.hostaway.com/v1'
    : 'https://api.hostaway.com/v1';

// The confirmed live listing ids. Requests for anything else are rejected so
// this endpoint can't be turned into an open proxy against the HostAway account.
export const ALLOWED_LISTINGS = new Set([
  345789, 345790, 345792, 345787, 345786, 345791, 345788, 559483,
  563826, // La Méditante
]);

// Nom des chambres pour l'onglet Séjours, tiré de constants.ts (ACCOMMODATIONS).
export const NOMS_CHAMBRES: Record<number, { fr: string; en: string }> = {
  345789: { fr: "L'Écrivaine", en: 'The Writer' },
  345790: { fr: 'La Musicienne', en: 'The Musician' },
  345792: { fr: 'La Cinéaste', en: 'The Filmmaker' },
  345787: { fr: "L'Amphithéâtre", en: 'The Amphitheatre' },
  345791: { fr: "L'Auberge Complète", en: 'The Whole Inn' },
  345786: { fr: 'La Ger (Yourte)', en: 'The Ger (Yurt)' },
  563826: { fr: 'La Méditante', en: 'The Meditator' },
  559483: { fr: 'La Bergère', en: 'The Shepherdess' },
  345788: { fr: 'Le Bus', en: 'The Bus' },
};

// Token cache shared across warm invocations of a single instance. HostAway
// access tokens are long-lived (≈ 24 months); we refresh well before expiry.
let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getHostawayToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: HOSTAWAY_ACCOUNT_ID.value(),
    client_secret: HOSTAWAY_API_KEY.value(),
    scope: 'general',
  });
  const res = await fetch(`${HOSTAWAY_BASE}/accessTokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-control': 'no-cache',
    },
    body,
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) {
    console.error('HostAway token error:', res.status, JSON.stringify(json));
    throw new HttpsError('internal', 'Could not authenticate with HostAway.');
  }
  const ttlMs = (json.expires_in ?? 3600) * 1000;
  cachedToken = { value: json.access_token, expiresAt: now + ttlMs };
  return json.access_token;
}

// Accept only YYYY-MM-DD to keep the calendar / quote queries well-formed.
export function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// Add `days` calendar-days to a YYYY-MM-DD string (UTC, no DST drift).
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
