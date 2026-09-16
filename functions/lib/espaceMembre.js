"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mesBillets = exports.compterPlacesCeilidh = exports.lierSejour = exports.mesSejours = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("firebase-admin/auth");
const hostaway_1 = require("./hostaway");
// Initialisé dans index.ts, mais on s'assure que admin est disponible.
const db = admin.firestore();
// ─── 4.1 mesSejours / 4.2 lierSejour (Hostaway) ─────────────────────────────
// Les séjours ne sont jamais recopiés dans Firestore : ils se lisent en direct
// dans Hostaway à chaque ouverture de l'onglet. Firestore ne garde que l'état
// serveur (dernière lecture, réservations liées, compteur d'essais).
const ADMIN_EMAILS = ['houseoftherisingarts@gmail.com', 'alex@lesalondesinconnus.com'];
// Même liste et même exigence email_verified que isAdmin() des règles Firestore.
function estAdmin(auth) {
    const email = auth?.token?.email;
    return auth?.token?.email_verified === true
        && !!email
        && ADMIN_EMAILS.includes(email);
}
const STATUTS_CONNUS = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
// Cache de module 5 minutes : la liste complète est lue au plus une fois par
// instance pendant ce laps, puis filtrée par membre. Jamais renvoyée telle
// quelle, partagée entre les membres d'une même instance chaude.
let cacheReservations = null;
const CACHE_RESERVATIONS_MS = 5 * 60 * 1000;
// Suit la pagination par curseur afterId (l'offset étant déprécié depuis le
// 31 mars 2026). Dix pages de 100 au plus ; si la dixième est pleine, on le
// journalise plutôt que de se taire.
async function chargerReservations(token, debut, fin) {
    if (cacheReservations && cacheReservations.expire > Date.now()) {
        return cacheReservations.pages;
    }
    const pages = [];
    let afterId;
    for (let page = 0; page < 10; page++) {
        const params = new URLSearchParams({
            departureStartDate: debut,
            departureEndDate: fin,
            limit: '100',
        });
        if (afterId)
            params.set('afterId', afterId);
        const url = `${hostaway_1.HOSTAWAY_BASE}/reservations?${params.toString()}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const json = (await res.json());
        if (!res.ok || json.status !== 'success' || !Array.isArray(json.result)) {
            console.error('HostAway reservations error:', res.status, JSON.stringify(json).slice(0, 500));
            throw new https_1.HttpsError('unavailable', 'hostaway-indisponible');
        }
        pages.push(...json.result);
        if (json.result.length < 100)
            break;
        afterId = String(json.result[json.result.length - 1].id);
        if (page === 9)
            console.log('mesSejours: historique tronqué');
    }
    cacheReservations = { pages, expire: Date.now() + CACHE_RESERVATIONS_MS };
    return pages;
}
// Convertit une réservation brute en objet du contrat 4.1. Une réservation
// retenue par liaison et non par le courriel sort `total` et `portail` à null :
// le portail du voyageur donne accès à la réservation d'une autre personne, et
// un code de confirmation se partage entre compagnons de voyage.
function versSejour(r, courrielNormal, liees) {
    const parCourriel = (r.guestEmail ?? '').trim().toLowerCase() === courrielNormal;
    const lie = liees.includes(r.id);
    const chambre = hostaway_1.NOMS_CHAMBRES[r.listingMapId ?? 0];
    const nuits = r.arrivalDate && r.departureDate
        ? Math.round((Date.parse(r.departureDate) - Date.parse(r.arrivalDate)) / 86400000)
        : 0;
    const statut = STATUTS_CONNUS.includes(r.status ?? '') ? r.status : 'confirmed';
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
exports.mesSejours = (0, https_1.onCall)({ secrets: [hostaway_1.HOSTAWAY_API_KEY, hostaway_1.HOSTAWAY_ACCOUNT_ID], cors: true, maxInstances: 5, timeoutSeconds: 30 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const emailJeton = request.auth.token?.email ?? '';
    const verifie = request.auth.token?.email_verified === true && !!emailJeton;
    let uid = request.auth.uid;
    let courriel = emailJeton;
    // uidCible est réservé à l'admin, qui voit alors le séjour d'un autre.
    const uidCible = request.data?.uidCible;
    if (uidCible) {
        if (!estAdmin(request.auth)) {
            throw new https_1.HttpsError('permission-denied', 'Admins only.');
        }
        const cible = await (0, auth_1.getAuth)().getUser(uidCible);
        if (!cible.emailVerified || !cible.email) {
            throw new https_1.HttpsError('failed-precondition', 'courriel-non-verifie');
        }
        uid = uidCible;
        courriel = cible.email;
    }
    else if (!verifie) {
        throw new https_1.HttpsError('failed-precondition', 'courriel-non-verifie');
    }
    // Limite de lecture rapprochée pour les membres (pas pour l'admin) : au
    // plus une lecture par 20 secondes, pour ne pas rejouer le parcours de
    // pagination à chaque rendu.
    if (!estAdmin(request.auth)) {
        const dernierSnap = await db.doc(`sejours/${uid}`).get();
        const dernier = dernierSnap.data()?.derniereLecture;
        if (dernier?.toDate && Date.now() - dernier.toDate().getTime() < 20000) {
            throw new https_1.HttpsError('resource-exhausted', 'Lecture trop rapprochée.');
        }
    }
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const debut = (0, hostaway_1.addDays)(aujourdhui, -730);
    const fin = (0, hostaway_1.addDays)(aujourdhui, 540);
    const token = await (0, hostaway_1.getHostawayToken)();
    const toutes = await chargerReservations(token, debut, fin);
    const lieSnap = await db.doc(`sejours/${uid}`).get();
    const liees = (lieSnap.data()?.reservationsLiees ?? []);
    const courrielNormal = courriel.trim().toLowerCase();
    const sejours = toutes
        .filter((r) => r.status !== 'ownerStay'
        && typeof r.listingMapId === 'number'
        && hostaway_1.ALLOWED_LISTINGS.has(r.listingMapId))
        .filter((r) => (r.guestEmail ?? '').trim().toLowerCase() === courrielNormal || liees.includes(r.id))
        .map((r) => versSejour(r, courrielNormal, liees));
    await db.doc(`sejours/${uid}`).set({ derniereLecture: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { sejours, lu: new Date().toISOString() };
});
// Date du jour dans le fuseau America/Toronto, en AAAA-MM-JJ.
function jourToronto() {
    const parties = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const lire = (type) => parties.find((p) => p.type === type)?.value ?? '';
    return `${lire('year')}-${lire('month')}-${lire('day')}`;
}
// ─── 4.2 lierSejour (callable) ───────────────────────────────────────────────
// Rattache une réservation au compte par son code de confirmation et sa date
// d'arrivée. Cinq essais par jour au plus ; une réponse identique en cas de code
// faux pour ne rien révéler.
exports.lierSejour = (0, https_1.onCall)({ secrets: [hostaway_1.HOSTAWAY_API_KEY, hostaway_1.HOSTAWAY_ACCOUNT_ID], cors: true, maxInstances: 5 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const verifie = request.auth.token?.email_verified === true && !!request.auth.token?.email;
    if (!verifie) {
        throw new https_1.HttpsError('failed-precondition', 'courriel-non-verifie');
    }
    const uid = request.auth.uid;
    const { code, arrivee } = (request.data ?? {});
    if (typeof code !== 'string' || !/^[A-Za-z0-9-]{4,40}$/.test(code)) {
        throw new https_1.HttpsError('invalid-argument', 'Code invalide.');
    }
    if (!(0, hostaway_1.isValidDate)(arrivee)) {
        throw new https_1.HttpsError('invalid-argument', 'Date invalide.');
    }
    const docRef = db.doc(`sejours/${uid}`);
    const jour = jourToronto();
    const etat = await docRef.get();
    const essais = (etat.data()?.essaisLiaison ?? {});
    if ((essais[jour] ?? 0) >= 5) {
        throw new https_1.HttpsError('resource-exhausted', "Trop d'essais aujourd'hui.");
    }
    const token = await (0, hostaway_1.getHostawayToken)();
    const url = `${hostaway_1.HOSTAWAY_BASE}/reservations?arrivalStartDate=${arrivee}&arrivalEndDate=${arrivee}&limit=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json());
    if (!res.ok || json.status !== 'success' || !Array.isArray(json.result)) {
        console.error('HostAway reservations error:', res.status, JSON.stringify(json).slice(0, 500));
        throw new https_1.HttpsError('unavailable', 'hostaway-indisponible');
    }
    // Garde contre un filtre de dates ignoré : on écarte côté serveur toute
    // réservation dont la date d'arrivée diffère.
    const codeNormal = code.trim().toLowerCase();
    const trouvee = json.result.find((r) => {
        if (r.arrivalDate !== arrivee)
            return false;
        const identifiants = [r.confirmationCode, r.channelReservationId, r.reservationId]
            .filter((v) => typeof v === 'string' && v.length > 0);
        return identifiants.some((v) => v.toLowerCase() === codeNormal);
    });
    if (!trouvee) {
        await docRef.set({ essaisLiaison: { ...essais, [jour]: (essais[jour] ?? 0) + 1 } }, { merge: true });
        return { lie: false };
    }
    // Déjà liée à un autre membre ?
    const deja = await db.collection('sejours')
        .where('reservationsLiees', 'array-contains', trouvee.id)
        .get();
    if (deja.docs.some((d) => d.id !== uid)) {
        throw new https_1.HttpsError('already-exists', 'Réservation déjà liée.');
    }
    const actuelles = (etat.data()?.reservationsLiees ?? []);
    if (actuelles.includes(trouvee.id)) {
        return { lie: true };
    }
    if (actuelles.length >= 50) {
        throw new https_1.HttpsError('resource-exhausted', 'Limite de réservations liées atteinte.');
    }
    await docRef.set({ reservationsLiees: [...actuelles, trouvee.id] }, { merge: true });
    return { lie: true };
});
// ─── 4.11 Le compteur du Ceilidh ─────────────────────────────────────────────
// Maintient le compte total des billets de spectacle dans config/ceilidhPlaces.
// Déclenché à chaque écriture (création ou suppression) sur showTickets, pour
// que les suppressions faites depuis l'admin se reflètent aussi.
exports.compterPlacesCeilidh = functions.firestore
    .document('events/ceilidh-mai-2026/showTickets/{id}')
    .onWrite(async () => {
    const snapshot = await db
        .collection('events/ceilidh-mai-2026/showTickets')
        .count()
        .get();
    const vendus = snapshot.data().count;
    await db.doc('config/ceilidhPlaces').set({ vendus, majLe: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
});
// Convertit un Timestamp Firestore en chaîne ISO, '' quand absent.
function toIso(v) {
    if (v && typeof v.toDate === 'function') {
        return v.toDate().toISOString();
    }
    return '';
}
// ─── 4.3 mesBillets (callable) ───────────────────────────────────────────────
// Rend les billets, inscriptions, contributions et emplacements de camping du
// membre connecté. Le courriel vérifié n'est exigé que pour le camping, qui est
// la seule collection rattachée au courriel plutôt qu'à l'uid.
exports.mesBillets = (0, https_1.onCall)({ cors: true, maxInstances: 5 }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const uid = request.auth.uid;
    const emailVerifie = request.auth.token.email_verified === true && request.auth.token.email
        ? request.auth.token.email
        : null;
    // 1. Spectacles (events/ceilidh-mai-2026/showTickets/{uid})
    const spectacles = [];
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
    const inscriptions = [];
    const regDoc = await db.doc(`events/ceilidh-mai-2026/registrations/${uid}`).get();
    if (regDoc.exists) {
        const d = regDoc.data() ?? {};
        const le = toIso(d.createdAt ?? d.updatedAt);
        inscriptions.push({
            evenement: 'ceilidh-mai-2026',
            equipes: (Array.isArray(d.teams) ? d.teams : [])
                .map((m) => m?.teamId)
                .filter((t) => typeof t === 'string' && t.length > 0),
            le: le || null,
        });
    }
    // 3. Contributions (events/ceilidh-mai-2026/contributions où uid == uid)
    const contributions = [];
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
    const camping = [];
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
//# sourceMappingURL=espaceMembre.js.map