import * as functions from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

// Initialisé dans index.ts, mais on s'assure que admin est disponible.
const db = admin.firestore();

// ─── 4.11 Le compteur du Ceilidh ─────────────────────────────────────────────
// Maintient le compte total des billets de spectacle dans config/ceilidhPlaces.
// Déclenché à chaque écriture (création ou suppression) sur showTickets, pour
// que les suppressions faites depuis l'admin se reflètent aussi.
export const compterPlacesCeilidh = functions.firestore
  .document('events/ceilidh-mai-2026/showTickets/{id}')
  .onWrite(async () => {
    const snapshot = await db
      .collection('events/ceilidh-mai-2026/showTickets')
      .count()
      .get();
    const vendus = snapshot.data().count;

    await db.doc('config/ceilidhPlaces').set(
      { vendus, majLe: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  });

// Convertit un Timestamp Firestore en chaîne ISO, '' quand absent.
function toIso(v: unknown): string {
  if (v && typeof (v as { toDate?: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

// ─── 4.3 mesBillets (callable) ───────────────────────────────────────────────
// Rend les billets, inscriptions, contributions et emplacements de camping du
// membre connecté. Le courriel vérifié n'est exigé que pour le camping, qui est
// la seule collection rattachée au courriel plutôt qu'à l'uid.
export const mesBillets = onCall({ cors: true, maxInstances: 5 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const uid = request.auth.uid;
  const emailVerifie =
    request.auth.token.email_verified === true && request.auth.token.email
      ? request.auth.token.email
      : null;

  // 1. Spectacles (events/ceilidh-mai-2026/showTickets/{uid})
  const spectacles: Array<{
    evenement: 'ceilidh-mai-2026';
    type: 'single' | 'weekend';
    soirs: string[];
    code: string;
    montant: number;
    le: string;
  }> = [];
  const ticketDoc = await db.doc(`events/ceilidh-mai-2026/showTickets/${uid}`).get();
  if (ticketDoc.exists) {
    const d = ticketDoc.data() ?? {};
    spectacles.push({
      evenement: 'ceilidh-mai-2026',
      type: d.ticketType === 'weekend' ? 'weekend' : 'single',
      soirs: Array.isArray(d.nights) ? d.nights : [],
      code: typeof d.ticketCode === 'string' ? d.ticketCode : '',
      montant: Number(d.amountCents ?? 0) / 100,
      le: toIso(d.createdAt),
    });
  }

  // 2. Inscriptions (events/ceilidh-mai-2026/registrations/{uid})
  const inscriptions: Array<{
    evenement: 'ceilidh-mai-2026';
    equipes: string[];
    le: string | null;
  }> = [];
  const regDoc = await db.doc(`events/ceilidh-mai-2026/registrations/${uid}`).get();
  if (regDoc.exists) {
    const d = regDoc.data() ?? {};
    const le = toIso(d.createdAt ?? d.updatedAt);
    inscriptions.push({
      evenement: 'ceilidh-mai-2026',
      equipes: (Array.isArray(d.teams) ? d.teams : [])
        .map((m: { teamId?: string }) => m?.teamId)
        .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0),
      le: le || null,
    });
  }

  // 3. Contributions (events/ceilidh-mai-2026/contributions où uid == uid)
  const contributions: Array<{
    evenement: 'ceilidh-mai-2026';
    montant: number;
    le: string;
  }> = [];
  const contribSnap = await db
    .collection('events/ceilidh-mai-2026/contributions')
    .where('uid', '==', uid)
    .get();
  contribSnap.forEach((doc) => {
    const d = doc.data();
    contributions.push({
      evenement: 'ceilidh-mai-2026',
      montant: Number(d.amountCents ?? 0) / 100,
      le: toIso(d.createdAt),
    });
  });

  // 4. Camping (events/camping-fmm-2026/reservations où courriel == email vérifié).
  // Le webhook Stripe recopie le courriel saisi sans le normaliser : on cherche
  // le courriel tel quel et en minuscules.
  const camping: Array<{
    evenement: 'camping-fmm-2026';
    montant: number;
    le: string;
  }> = [];
  if (emailVerifie) {
    const courriels = [...new Set([emailVerifie, emailVerifie.toLowerCase()])];
    const campingSnap = await db
      .collection('events/camping-fmm-2026/reservations')
      .where('courriel', 'in', courriels)
      .get();
    campingSnap.forEach((doc) => {
      const d = doc.data();
      camping.push({
        evenement: 'camping-fmm-2026',
        montant: Number(d.montantCents ?? 0) / 100,
        le: toIso(d.createdAt),
      });
    });
  }

  return { spectacles, inscriptions, contributions, camping };
});
