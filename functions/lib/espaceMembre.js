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
exports.mesBillets = exports.compterPlacesCeilidh = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
// Initialisé dans index.ts, mais on s'assure que admin est disponible.
const db = admin.firestore();
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