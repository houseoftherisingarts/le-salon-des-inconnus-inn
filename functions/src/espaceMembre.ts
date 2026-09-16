import * as functions from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

// Initialisé dans index.ts, mais on s'assure que admin est disponible.
const db = admin.firestore();

// ─── 4.11 Le compteur du Ceilidh ─────────────────────────────────────────────
// Maintient le compte total des inscriptions au Ceilidh dans config/ceilidhPlaces
// Déclenché à chaque écriture sur la collection.
export const compterPlacesCeilidh = onDocumentWritten(
  'events/ceilidh-mai-2026/registrations/{uid}',
  async (event) => {
    // Recomptage complet au lieu d'incrément/décrément, pour ne jamais dériver
    // si un document est supprimé à la main dans la console.
    const snapshot = await db.collection('events/ceilidh-mai-2026/registrations').count().get();
    const total = snapshot.data().count;

    await db.doc('config/ceilidhPlaces').set(
      { total, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
);

// ─── 4.1.3 mesBillets (callable) ────────────────────────────────────────────
// Paramètre : uidCible (optionnel). 
// Rend la liste des billets de l'utilisateur (spectacles, inscriptions, contributions, camping)
export const mesBillets = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in.');
  }

  const uidDemande = context.auth.uid;
  const uidCible = data.uidCible as string | undefined;

  let targetUid = uidDemande;
  let targetEmail = context.auth.token.email;

  // Si on demande pour un autre, vérifier qu'on est admin
  if (uidCible && uidCible !== uidDemande) {
    const adminRef = await db.collection('config').doc('admins').get();
    const admins = adminRef.exists ? adminRef.data()?.emails || [] : [];
    // Fallback aux admins hardcodés si non trouvés dans config
    const HARDCODED_ADMINS = ['houseoftherisingarts@gmail.com', 'alex@lesalondesinconnus.com'];
    const callerEmail = context.auth.token.email?.toLowerCase() || '';
    
    const isAdmin = admins.includes(callerEmail) || HARDCODED_ADMINS.includes(callerEmail);
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can view other members\' tickets.');
    }
    
    targetUid = uidCible;
    const targetMember = await db.collection('members').doc(targetUid).get();
    if (targetMember.exists && targetMember.data()?.email) {
      targetEmail = targetMember.data()?.email;
    } else {
      // Si pas de courriel dans members/{uid}, on aura juste targetUid
      targetEmail = '';
    }
  }

  const result = {
    tickets: [] as any[],
    registrations: [] as any[],
    contributions: [] as any[],
    camping: [] as any[]
  };

  // 1. Billets (events/ceilidh-mai-2026/showTickets/{targetUid})
  const ticketDoc = await db.doc(`events/ceilidh-mai-2026/showTickets/${targetUid}`).get();
  if (ticketDoc.exists) {
    result.tickets.push({ id: ticketDoc.id, ...ticketDoc.data() });
  }

  // 2. Inscriptions (events/ceilidh-mai-2026/registrations/{targetUid})
  const regDoc = await db.doc(`events/ceilidh-mai-2026/registrations/${targetUid}`).get();
  if (regDoc.exists) {
    result.registrations.push({ id: regDoc.id, ...regDoc.data() });
  }

  // 3. Contributions (events/ceilidh-mai-2026/contributions/{auto} avec champ uid)
  const contribSnap = await db.collection('events/ceilidh-mai-2026/contributions')
    .where('uid', '==', targetUid)
    .get();
  contribSnap.forEach(doc => {
    result.contributions.push({ id: doc.id, ...doc.data() });
  });

  // 4. Camping (events/camping-fmm-2026/reservations/{session} avec champ courriel)
  if (targetEmail) {
    const campingSnap = await db.collection('events/camping-fmm-2026/reservations')
      .where('email', '==', targetEmail) // Ou 'courriel' selon le schéma, "avec courriel et sans uid" selon le devis
      .get();
    campingSnap.forEach(doc => {
      result.camping.push({ id: doc.id, ...doc.data() });
    });
    
    const campingSnap2 = await db.collection('events/camping-fmm-2026/reservations')
      .where('courriel', '==', targetEmail)
      .get();
    campingSnap2.forEach(doc => {
      // Éviter les doublons
      if (!result.camping.find(c => c.id === doc.id)) {
        result.camping.push({ id: doc.id, ...doc.data() });
      }
    });
  }

  return result;
});
