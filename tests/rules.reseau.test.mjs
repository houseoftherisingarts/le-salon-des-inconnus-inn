// Banc d'essai des règles Firestore du réseau social d'artistes, contre
// l'émulateur. Aucun paquet de test n'est ajouté : `firebase` (déjà une
// dépendance du monorepo) sait parler à l'émulateur avec un jeton d'auth
// simulé via `connectFirestoreEmulator(db, host, port, { mockUserToken })`,
// exactement ce que fait @firebase/rules-unit-testing sous le capot.
//
// Lancé par :
//   PATH="$(brew --prefix openjdk)/bin:$PATH" npx firebase emulators:exec \
//     --only firestore --project demo-reseau "node tests/rules.reseau.test.mjs"
import { readFileSync } from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import {
    getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc, getDoc,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-reseau';
const HOST = '127.0.0.1';
const PORT = 8080;

const UID_A = 'membre-a';
const UID_B = 'membre-b';
const ADMIN_UID = 'admin-uid';
const ADMIN_EMAIL = 'alex@lesalondesinconnus.com';

let compteur = 0;
const apps = [];

/** Une base Firestore par identité — mockUserToken exige 'sub' (jamais
 *  'uid', que le SDK refuse explicitement depuis la v10). */
function baseComme(claims) {
    const app = initializeApp({ projectId: PROJECT_ID }, `reseau-test-${compteur++}`);
    apps.push(app);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, HOST, PORT, claims ? { mockUserToken: claims } : {});
    return db;
}

const dbA = () => baseComme({ sub: UID_A, email: 'a@example.com', email_verified: true });
const dbB = () => baseComme({ sub: UID_B, email: 'b@example.com', email_verified: true });
const dbAdmin = () => baseComme({ sub: ADMIN_UID, email: ADMIN_EMAIL, email_verified: true });
const dbAnon = () => baseComme(null);

let ok = 0;
let fail = 0;
const resultats = [];

async function attenduOk(nom, promesse) {
    try {
        await promesse;
        resultats.push(`✅ ${nom}`);
        ok++;
    } catch (e) {
        resultats.push(`❌ ${nom} (devait réussir)\n   ${String(e.message || e).split('\n')[0]}`);
        fail++;
    }
}

async function attenduRefus(nom, promesse) {
    try {
        await promesse;
        resultats.push(`❌ ${nom} (devait être refusé, a réussi)`);
        fail++;
    } catch (e) {
        if (String(e.code || e.message || '').match(/permission-denied|PERMISSION_DENIED/i)) {
            resultats.push(`✅ ${nom}`);
            ok++;
        } else {
            resultats.push(`❌ ${nom} (erreur inattendue)\n   ${String(e.message || e).split('\n')[0]}`);
            fail++;
        }
    }
}

async function main() {
    console.log(`[rules.reseau] règles chargées : ${readFileSync('firestore.rules', 'utf8').length} octets`);

    // ── members/{uid} : champs sociaux vs drapeaux admin ─────────────────
    await attenduOk(
        'un membre écrit sa propre fiche sociale (bio, discipline, ville, liens)',
        setDoc(doc(dbA(), 'members', UID_A), {
            displayName: 'Membre A', bio: 'Peintre et sculptrice.', discipline: 'Peinture', ville: 'Namur',
            liens: { site: 'https://example.com', instagram: '', facebook: '', autre: '' },
        }),
    );
    await attenduRefus(
        'un membre ne peut pas se poser lui-même isArtist sur members/{uid}',
        setDoc(doc(dbA(), 'members', UID_A), { isArtist: true }, { merge: true }),
    );
    await attenduRefus(
        'un membre ne peut pas écrire la fiche d’un autre',
        setDoc(doc(dbA(), 'members', UID_B), { displayName: 'Usurpation' }),
    );
    await attenduRefus(
        'un lien http:// (pas https) est refusé',
        setDoc(doc(dbB(), 'members', UID_B), { liens: { site: 'http://pas-securise.com', instagram: '', facebook: '', autre: '' } }, { merge: true }),
    );

    // ── mur : publier en son nom, voter en son nom ───────────────────────
    await attenduOk(
        'un membre publie un billet en son nom',
        setDoc(doc(dbA(), 'mur', 'billet-1'), { uid: UID_A, nom: 'Membre A', texte: 'Bonjour le studio.', fil: 'studio' }),
    );
    await attenduRefus(
        'un membre ne publie pas un billet au nom d’un autre',
        setDoc(doc(dbB(), 'mur', 'billet-usurpe'), { uid: UID_A, nom: 'Membre A', texte: 'Usurpation', fil: 'studio' }),
    );
    await attenduRefus(
        'un membre ne modifie pas le billet d’un autre',
        updateDoc(doc(dbB(), 'mur', 'billet-1'), { texte: 'Détourné' }),
    );
    await attenduOk(
        'l’admin peut modérer (mettre à jour) un billet',
        updateDoc(doc(dbAdmin(), 'mur', 'billet-1'), { texte: 'Modéré par l’admin' }),
    );
    await attenduRefus(
        'un tiers ne supprime pas le billet d’un autre',
        deleteDoc(doc(dbB(), 'mur', 'billet-1')),
    );
    await attenduOk(
        'l’auteur supprime son propre billet',
        deleteDoc(doc(dbA(), 'mur', 'billet-1')),
    );

    await setDoc(doc(dbA(), 'mur', 'billet-2'), { uid: UID_A, nom: 'Membre A', texte: 'Un deuxième billet.', fil: 'studio' });
    await attenduOk(
        'un membre vote en son propre nom',
        setDoc(doc(dbB(), 'mur', 'billet-2', 'votes', UID_B), { valeur: 1, nom: 'Membre B' }),
    );
    await attenduRefus(
        'un membre ne vote pas au nom d’un autre',
        setDoc(doc(dbB(), 'mur', 'billet-2', 'votes', UID_A), { valeur: 1, nom: 'Membre A' }),
    );
    await attenduRefus(
        'un billet publié dans un autre fil que "studio" est refusé',
        setDoc(doc(dbA(), 'mur', 'billet-mauvais-fil'), { uid: UID_A, nom: 'Membre A', texte: 'x', fil: 'autre' }),
    );

    // ── badges : décernés par l’admin, vitrine par le membre ─────────────
    await attenduRefus(
        'un membre ne se décerne pas un badge lui-même',
        setDoc(doc(dbA(), 'badges', UID_A), { obtenus: { 'premiere-oeuvre': '2026-01-01' } }),
    );
    await attenduOk(
        'l’admin décerne un badge',
        setDoc(doc(dbAdmin(), 'badges', UID_A), { obtenus: { 'premiere-oeuvre': '2026-01-01' }, exposes: [] }),
    );
    await attenduOk(
        'un membre choisit sa propre vitrine parmi ses badges',
        updateDoc(doc(dbA(), 'badges', UID_A), { exposes: ['premiere-oeuvre'] }),
    );
    await attenduRefus(
        'un membre ne touche pas à "obtenus" sur son propre document de badges',
        updateDoc(doc(dbA(), 'badges', UID_A), { obtenus: { 'mecene': '2026-01-01' } }),
    );

    // ── blocages ──────────────────────────────────────────────────────────
    await attenduOk(
        'un membre écrit sa propre liste de blocages',
        setDoc(doc(dbA(), 'blocages', UID_A), { bloques: [UID_B] }),
    );
    await attenduRefus(
        'un membre ne modifie pas la liste de blocages d’un autre',
        setDoc(doc(dbA(), 'blocages', UID_B), { bloques: [UID_A] }),
    );

    // ── signalements : création ouverte, lecture admin seulement ────────
    await attenduOk(
        'un membre signale un billet',
        setDoc(doc(dbB(), 'signalements', 'sig-1'), { parUid: UID_B, cible: 'post', cibleId: 'billet-2', raison: 'Contenu déplacé' }),
    );
    await attenduRefus(
        'un membre ne lit pas les signalements',
        getDoc(doc(dbB(), 'signalements', 'sig-1')).then((s) => { if (!s.exists()) throw Object.assign(new Error('doc absent'), { code: 'permission-denied' }); }),
    );
    await attenduOk(
        'l’admin lit les signalements',
        getDoc(doc(dbAdmin(), 'signalements', 'sig-1')),
    );

    // ── notifications : écrites par l’auteur du geste, jamais pour soi ──
    await attenduOk(
        'un membre notifie l’auteur d’un billet qu’il commente',
        setDoc(doc(dbB(), 'notifications', UID_A, 'items', 'notif-1'), {
            type: 'commentaire', deUid: UID_B, deNom: 'Membre B', texte: 'a commenté', lu: false,
        }),
    );
    await attenduRefus(
        'un membre ne s’écrit pas une notification à lui-même',
        setDoc(doc(dbA(), 'notifications', UID_A, 'items', 'notif-self'), {
            type: 'vote', deUid: UID_A, deNom: 'Membre A', texte: 'x', lu: false,
        }),
    );
    await attenduRefus(
        'un membre ne peut pas usurper deUid dans une notification',
        setDoc(doc(dbB(), 'notifications', UID_A, 'items', 'notif-usurpe'), {
            type: 'vote', deUid: UID_A, deNom: 'Faux', texte: 'x', lu: false,
        }),
    );
    await attenduOk(
        'le destinataire marque sa notification lue (champ "lu" seul)',
        updateDoc(doc(dbA(), 'notifications', UID_A, 'items', 'notif-1'), { lu: true }),
    );
    await attenduRefus(
        'le destinataire ne peut pas réécrire le texte de sa notification',
        updateDoc(doc(dbA(), 'notifications', UID_A, 'items', 'notif-1'), { lu: true, texte: 'falsifié' }),
    );

    console.log('\n' + resultats.join('\n'));
    console.log(`\n${ok} réussis, ${fail} échoués, sur ${ok + fail} cas.`);

    await Promise.all(apps.map((a) => deleteApp(a).catch(() => {})));
    if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
