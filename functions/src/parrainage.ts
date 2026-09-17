import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';

// ─── 4.4 parrainageFilleul · déclencheur v1 ──────────────────────────────────
// Porté de Krystine (K/functions/src/parrainage.ts) en gardant le mécanisme et
// en retirant ce qui est propre à Krystine : niskas, formations, cadeaux, accès
// à vie et module gamification. Aucune récompense n'est posée ici : le Salon n'en
// a défini aucune, et en inventer serait une promesse que personne n'a faite. Le
// compteur parrainagesCompte est prêt pour le jour où Alex en fixera une.

const db = admin.firestore();

// Un compte plus vieux que ça n'est pas une inscription : le parrainage est
// effacé sans compter (sinon un vieux compte réclame un code après coup).
const COMPTE_NEUF_MS = 48 * 60 * 60 * 1000;

export const parrainageFilleul = functions.firestore
  .document('parrainages/{filleulUid}')
  .onCreate(async (snap, context) => {
    const data = snap.data() as { parrainUid?: string; filleulNom?: string } | undefined;
    const parrainUid = data?.parrainUid;
    const filleulUid = context.params.filleulUid;

    // 1. Refuser si parrainUid manque ou égale le filleul.
    if (!parrainUid || parrainUid === filleulUid) return;

    // 2. Refuser (et supprimer) si le compte Auth du filleul a plus de 48 heures.
    try {
      const cree = Date.parse((await getAuth().getUser(filleulUid)).metadata.creationTime || '');
      if (cree && Date.now() - cree > COMPTE_NEUF_MS) {
        await db.doc(`parrainages/${filleulUid}`).delete();
        console.log(`[parrainage] ${filleulUid} : compte trop ancien, parrainage refusé`);
        return;
      }
    } catch (e) {
      console.warn('[parrainage] âge du compte indisponible', e);
    }

    // 3. Poser valide: true, valideLe.
    await db.doc(`parrainages/${filleulUid}`).update({
      valide: true,
      valideLe: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Compter les filleules valides du parrain et écrire le compteur.
    const filleules = await db
      .collection('parrainages')
      .where('parrainUid', '==', parrainUid)
      .where('valide', '==', true)
      .count()
      .get();
    const n = filleules.data().count;
    await db.doc(`parrainagesCompte/${parrainUid}`).set(
      { n, majLe: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );

    // 5. Notification de type 'parrainage' dans la cloche du parrain. La langue
    // suit prive/preferences.langue du parrain, FR par défaut.
    const nom = (data?.filleulNom ?? '').trim() || 'Un membre';
    let texte = `${nom} a rejoint le Salon grâce à votre invitation.`;
    try {
      const prefs = (await db.doc(`members/${parrainUid}/prive/preferences`).get()).data();
      if (prefs?.langue === 'EN') {
        texte = `${nom} joined the Salon through your invitation.`;
      }
    } catch {
      // FR par défaut : un échec de lecture ne casse pas la notification.
    }
    await db.collection('notifications').doc(parrainUid).collection('items').add({
      type: 'parrainage',
      deUid: filleulUid,
      deNom: nom,
      texte,
      creeLe: admin.firestore.FieldValue.serverTimestamp(),
      lu: false,
    });

    console.log(`[parrainage] ${parrainUid} compte ${n} filleule(s)`);
  });
