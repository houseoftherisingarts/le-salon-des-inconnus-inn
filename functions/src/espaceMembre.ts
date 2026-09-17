import * as functions from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import {
  HOSTAWAY_API_KEY,
  HOSTAWAY_ACCOUNT_ID,
  HOSTAWAY_BASE,
  ALLOWED_LISTINGS,
  NOMS_CHAMBRES,
  getHostawayToken,
  isValidDate,
  addDays,
} from './hostaway';

// Initialisé dans index.ts, mais on s'assure que admin est disponible.
const db = admin.firestore();

// ─── 4.1 mesSejours / 4.2 lierSejour (Hostaway) ─────────────────────────────
// Les séjours ne sont jamais recopiés dans Firestore : ils se lisent en direct
// dans Hostaway à chaque ouverture de l'onglet. Firestore ne garde que l'état
// serveur (dernière lecture, réservations liées, compteur d'essais).

const ADMIN_EMAILS = ['houseoftherisingarts@gmail.com', 'alex@lesalondesinconnus.com'];

// Même liste et même exigence email_verified que isAdmin() des règles Firestore.
function estAdmin(auth: { token?: { email?: string; email_verified?: boolean } } | undefined): boolean {
  const email = auth?.token?.email;
  return auth?.token?.email_verified === true
    && !!email
    && ADMIN_EMAILS.includes(email);
}

// Forme brute d'une réservation Hostaway. Seuls les champs utiles sont lus ;
// aucun nom, téléphone ni adresse du voyageur ne sort jamais vers le client.
interface ReservationHostaway {
  id: number;
  guestEmail?: string;
  listingMapId?: number;
  arrivalDate?: string;
  departureDate?: string;
  status?: string;
  totalPrice?: number | null;
  currency?: string | null;
  numberOfGuests?: number;
  channelName?: string;
  reservationId?: string;
  channelReservationId?: string;
  confirmationCode?: string;
  guestPortalUrl?: string;
}

type StatutSejour = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
const STATUTS_CONNUS: string[] = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

interface Sejour {
  id: number;
  chambreFR: string;
  chambreEN: string;
  listingId: number;
  arrivee: string;
  depart: string;
  nuits: number;
  voyageurs: number;
  statut: StatutSejour;
  canal: string;
  total: number | null;
  devise: string;
  code: string | null;
  portail: string | null;
  lie: boolean;
}

// Cache de module 5 minutes : la liste complète est lue au plus une fois par
// instance pendant ce laps, puis filtrée par membre. Jamais renvoyée telle
// quelle, partagée entre les membres d'une même instance chaude.
let cacheReservations: { pages: ReservationHostaway[]; expire: number } | null = null;
const CACHE_RESERVATIONS_MS = 5 * 60 * 1000;

// Suit la pagination par curseur afterId (l'offset étant déprécié depuis le
// 31 mars 2026). Dix pages de 100 au plus ; si la dixième est pleine, on le
// journalise plutôt que de se taire.
async function chargerReservations(token: string, debut: string, fin: string): Promise<ReservationHostaway[]> {
  if (cacheReservations && cacheReservations.expire > Date.now()) {
    return cacheReservations.pages;
  }
  const pages: ReservationHostaway[] = [];
  let afterId: string | undefined;
  for (let page = 0; page < 10; page++) {
    const params = new URLSearchParams({
      departureStartDate: debut,
      departureEndDate: fin,
      limit: '100',
    });
    if (afterId) params.set('afterId', afterId);
    const url = `${HOSTAWAY_BASE}/reservations?${params.toString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as { status?: string; result?: ReservationHostaway[] };
    if (!res.ok || json.status !== 'success' || !Array.isArray(json.result)) {
      console.error('HostAway reservations error:', res.status, JSON.stringify(json).slice(0, 500));
      throw new HttpsError('unavailable', 'hostaway-indisponible');
    }
    pages.push(...json.result);
    if (json.result.length < 100) break;
    afterId = String(json.result[json.result.length - 1].id);
    if (page === 9) console.log('mesSejours: historique tronqué');
  }
  cacheReservations = { pages, expire: Date.now() + CACHE_RESERVATIONS_MS };
  return pages;
}

// Convertit une réservation brute en objet du contrat 4.1. Une réservation
// retenue par liaison et non par le courriel sort `total` et `portail` à null :
// le portail du voyageur donne accès à la réservation d'une autre personne, et
// un code de confirmation se partage entre compagnons de voyage.
function versSejour(r: ReservationHostaway, courrielNormal: string, liees: number[]): Sejour {
  const parCourriel = (r.guestEmail ?? '').trim().toLowerCase() === courrielNormal;
  const lie = liees.includes(r.id);
  const chambre = NOMS_CHAMBRES[r.listingMapId ?? 0];
  const nuits = r.arrivalDate && r.departureDate
    ? Math.round((Date.parse(r.departureDate) - Date.parse(r.arrivalDate)) / 86_400_000)
    : 0;
  const statut = STATUTS_CONNUS.includes(r.status ?? '') ? (r.status as StatutSejour) : 'confirmed';
  const masquer = !parCourriel;
  return {
    id: r.id,
    chambreFR: chambre?.fr ?? '',
    chambreEN: chambre?.en ?? '',
    listingId: r.listingMapId ?? 0,
    arrivee: r.arrivalDate ?? '',
    depart: r.departureDate ?? '',
    nuits,
    voyageurs: r.numberOfGuests ?? 0,
    statut,
    canal: r.channelName ?? '',
    total: masquer ? null : (typeof r.totalPrice === 'number' ? r.totalPrice : null),
    devise: masquer ? 'CAD' : (r.currency ?? 'CAD'),
    code: r.confirmationCode ?? null,
    portail: masquer ? null : (r.guestPortalUrl ?? null),
    lie,
  };
}

// ─── 4.1 mesSejours (callable) ───────────────────────────────────────────────
// Rend les séjours du membre connecté (ou d'un uidCible, pour l'admin), lus en
// direct dans Hostaway et filtrés sur le courriel vérifié du jeton.
export const mesSejours = onCall(
  { secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID], cors: true, maxInstances: 5, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    const emailJeton = request.auth.token?.email ?? '';
    const verifie = request.auth.token?.email_verified === true && !!emailJeton;

    let uid = request.auth.uid;
    let courriel = emailJeton;

    // uidCible est réservé à l'admin, qui voit alors le séjour d'un autre.
    const uidCible = (request.data as { uidCible?: string } | undefined)?.uidCible;
    if (uidCible) {
      if (!estAdmin(request.auth)) {
        throw new HttpsError('permission-denied', 'Admins only.');
      }
      const cible = await getAuth().getUser(uidCible);
      if (!cible.emailVerified || !cible.email) {
        throw new HttpsError('failed-precondition', 'courriel-non-verifie');
      }
      uid = uidCible;
      courriel = cible.email;
    } else if (!verifie) {
      throw new HttpsError('failed-precondition', 'courriel-non-verifie');
    }

    // Limite de lecture rapprochée pour les membres (pas pour l'admin) : au
    // plus une lecture par 20 secondes, pour ne pas rejouer le parcours de
    // pagination à chaque rendu.
    if (!estAdmin(request.auth)) {
      const dernierSnap = await db.doc(`sejours/${uid}`).get();
      const dernier = dernierSnap.data()?.derniereLecture as { toDate?: () => Date } | undefined;
      if (dernier?.toDate && Date.now() - dernier.toDate().getTime() < 20_000) {
        throw new HttpsError('resource-exhausted', 'Lecture trop rapprochée.');
      }
    }

    const aujourdhui = new Date().toISOString().slice(0, 10);
    const debut = addDays(aujourdhui, -730);
    const fin = addDays(aujourdhui, 540);

    const token = await getHostawayToken();
    const toutes = await chargerReservations(token, debut, fin);

    const lieSnap = await db.doc(`sejours/${uid}`).get();
    const liees: number[] = (lieSnap.data()?.reservationsLiees ?? []) as number[];
    const courrielNormal = courriel.trim().toLowerCase();

    const sejours = toutes
      .filter((r) => r.status !== 'ownerStay'
        && typeof r.listingMapId === 'number'
        && ALLOWED_LISTINGS.has(r.listingMapId))
      .filter((r) => (r.guestEmail ?? '').trim().toLowerCase() === courrielNormal || liees.includes(r.id))
      .map((r) => versSejour(r, courrielNormal, liees));

    await db.doc(`sejours/${uid}`).set(
      { derniereLecture: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

    return { sejours, lu: new Date().toISOString() };
  },
);

// Date du jour dans le fuseau America/Toronto, en AAAA-MM-JJ.
function jourToronto(): string {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const lire = (type: string) => parties.find((p) => p.type === type)?.value ?? '';
  return `${lire('year')}-${lire('month')}-${lire('day')}`;
}

// ─── 4.2 lierSejour (callable) ───────────────────────────────────────────────
// Rattache une réservation au compte par son code de confirmation et sa date
// d'arrivée. Cinq essais par jour au plus ; une réponse identique en cas de code
// faux pour ne rien révéler.
export const lierSejour = onCall(
  { secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID], cors: true, maxInstances: 5 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in.');
    }

    // Lot 7 : l'admin peut rattacher un séjour au compte d'un membre (uidCible),
    // avec les mêmes gardes que 4.1 mais sans limite d'essais.
    const uidCible = (request.data as { uidCible?: string } | undefined)?.uidCible;
    const estCible = typeof uidCible === 'string' && uidCible.length > 0;
    if (estCible && !estAdmin(request.auth)) {
      throw new HttpsError('permission-denied', 'Admins only.');
    }
    if (!estCible) {
      const verifie = request.auth.token?.email_verified === true && !!request.auth.token?.email;
      if (!verifie) {
        throw new HttpsError('failed-precondition', 'courriel-non-verifie');
      }
    }

    const uid = estCible ? (uidCible as string) : request.auth.uid;
    const { code, arrivee } = (request.data ?? {}) as { code?: string; arrivee?: string };
    if (typeof code !== 'string' || !/^[A-Za-z0-9-]{4,40}$/.test(code)) {
      throw new HttpsError('invalid-argument', 'Code invalide.');
    }
    if (!isValidDate(arrivee)) {
      throw new HttpsError('invalid-argument', 'Date invalide.');
    }

    const docRef = db.doc(`sejours/${uid}`);
    const jour = jourToronto();
    const etat = await docRef.get();
    const essais: Record<string, number> = (etat.data()?.essaisLiaison ?? {}) as Record<string, number>;
    if (!estCible && (essais[jour] ?? 0) >= 5) {
      throw new HttpsError('resource-exhausted', "Trop d'essais aujourd'hui.");
    }

    const token = await getHostawayToken();
    const url = `${HOSTAWAY_BASE}/reservations?arrivalStartDate=${arrivee}&arrivalEndDate=${arrivee}&limit=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as { status?: string; result?: ReservationHostaway[] };
    if (!res.ok || json.status !== 'success' || !Array.isArray(json.result)) {
      console.error('HostAway reservations error:', res.status, JSON.stringify(json).slice(0, 500));
      throw new HttpsError('unavailable', 'hostaway-indisponible');
    }

    // Garde contre un filtre de dates ignoré : on écarte côté serveur toute
    // réservation dont la date d'arrivée diffère.
    const codeNormal = code.trim().toLowerCase();
    const trouvee = json.result.find((r) => {
      if (r.arrivalDate !== arrivee) return false;
      const identifiants = [r.confirmationCode, r.channelReservationId, r.reservationId]
        .filter((v): v is string => typeof v === 'string' && v.length > 0);
      return identifiants.some((v) => v.toLowerCase() === codeNormal);
    });

    if (!trouvee) {
      if (!estCible) {
        await docRef.set(
          { essaisLiaison: { ...essais, [jour]: (essais[jour] ?? 0) + 1 } },
          { merge: true },
        );
      }
      return { lie: false };
    }

    // Déjà liée à un autre membre ?
    const deja = await db.collection('sejours')
      .where('reservationsLiees', 'array-contains', trouvee.id)
      .get();
    if (deja.docs.some((d) => d.id !== uid)) {
      throw new HttpsError('already-exists', 'Réservation déjà liée.');
    }

    const actuelles: number[] = (etat.data()?.reservationsLiees ?? []) as number[];
    if (actuelles.includes(trouvee.id)) {
      return { lie: true };
    }
    if (actuelles.length >= 50) {
      throw new HttpsError('resource-exhausted', 'Limite de réservations liées atteinte.');
    }
    await docRef.set(
      { reservationsLiees: [...actuelles, trouvee.id] },
      { merge: true },
    );
    return { lie: true };
  },
);

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

  let uid = request.auth.uid;
  let emailVerifie =
    request.auth.token.email_verified === true && request.auth.token.email
      ? request.auth.token.email
      : null;

  // Lot 7 : l'admin peut lire les billets d'un membre (uidCible). Le courriel
  // vérifié cible se lit alors dans Auth, jamais dans l'entrée.
  const uidCible = (request.data as { uidCible?: string } | undefined)?.uidCible;
  if (uidCible) {
    if (!estAdmin(request.auth)) {
      throw new HttpsError('permission-denied', 'Admins only.');
    }
    const cible = await getAuth().getUser(uidCible);
    uid = uidCible;
    emailVerifie = cible.emailVerified && cible.email ? cible.email : null;
  }

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

// ─── 4.10 nettoyerCompteSupprime · effacement complet du compte ──────────────
// deleteMemberData (AuthModal) n'efface que members/{uid} avant de supprimer le
// compte Auth. Ici on termine le travail : le téléphone, le fil d'aide, l'état
// des séjours, le parrainage, les signalements, les notifications et les images
// Storage. Les messages envoyés à d'autres membres restent, comme le dit 6.10.
export const nettoyerCompteSupprime = functions.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const db2 = admin.firestore();

  // Fiche complète (sous-collections comprises : prive, artistProfile, etc.).
  await db2.recursiveDelete(db2.doc(`members/${uid}`)).catch((e) => {
    console.warn('[nettoyage] members indisponible', e);
  });

  // Fil d'aide et ses messages.
  await db2.recursiveDelete(db2.doc(`soutien/${uid}`)).catch(() => {});

  // État serveur des séjours.
  await db2.doc(`sejours/${uid}`).delete().catch(() => {});

  // Parrainage : mon entrée de filleul, mon compteur et mon code.
  await db2.doc(`parrainages/${uid}`).delete().catch(() => {});
  await db2.doc(`parrainagesCompte/${uid}`).delete().catch(() => {});
  const codes = await db2.collection('codesParrain').where('uid', '==', uid).get();
  await Promise.all(codes.docs.map((d) => d.ref.delete().catch(() => {})));

  // Signalements techniques.
  const signalements = await db2.collection('problemesTechniques').where('uid', '==', uid).get();
  await Promise.all(signalements.docs.map((d) => d.ref.delete().catch(() => {})));

  // Notifications.
  await db2.recursiveDelete(db2.doc(`notifications/${uid}`)).catch(() => {});

  // Images Storage : avatar/bannière de profil et captures de signalement.
  const bucket = admin.storage().bucket();
  await bucket.deleteFiles({ prefix: `members/${uid}/profil/` }).catch(() => {});
  await bucket.deleteFiles({ prefix: `problemes/${uid}/` }).catch(() => {});

  console.log(`[nettoyage] compte ${uid} effacé`);
});
