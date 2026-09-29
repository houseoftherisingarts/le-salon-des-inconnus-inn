// Banc d'essai du moteur d'espaces et du gabarit Musicien (29 septembre 2026) :
// bornes de superProfile (pistes, produits, ordre, accent), fiche assistances,
// et pistes audio dans Storage. Même harnais que les autres bancs.
//
// Lancé par :
//   PATH="$(brew --prefix openjdk)/bin:$PATH" npx firebase emulators:exec \
//     --only firestore,storage --project demo-salon "node tests/rules.musicien.test.mjs"
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-salon';
const UID_A = 'musicien-a';
const UID_B = 'musicien-b';

let compteur = 0;
const apps = [];
function app() {
    const a = initializeApp({ projectId: PROJECT_ID, storageBucket: 'le-salon-des-inconnus.firebasestorage.app' }, `musicien-${compteur++}`);
    apps.push(a);
    return a;
}
function db(claims) {
    const d = getFirestore(app());
    connectFirestoreEmulator(d, '127.0.0.1', 8080, claims ? { mockUserToken: claims } : {});
    return d;
}
function st(claims) {
    const s = getStorage(app());
    connectStorageEmulator(s, '127.0.0.1', 9199, claims ? { mockUserToken: claims } : {});
    return s;
}
const A = { sub: UID_A, email: 'a@example.com', email_verified: true };
const B = { sub: UID_B, email: 'b@example.com', email_verified: true };
const ADMIN = { sub: 'admin-uid', email: 'alex@lesalondesinconnus.com', email_verified: true };

let ok = 0;
let fail = 0;
const resultats = [];
async function attenduOk(nom, p) {
    try { await p; resultats.push(`✅ ${nom}`); ok++; }
    catch (e) { resultats.push(`❌ ${nom} (devait réussir)\n   ${String(e.message || e).split('\n')[0]}`); fail++; }
}
async function attenduRefus(nom, p) {
    try { await p; resultats.push(`❌ ${nom} (devait être refusé, a réussi)`); fail++; }
    catch (e) {
        if (String(e.code || e.message || '').match(/permission-denied|PERMISSION_DENIED|unauthorized|403/i)) { resultats.push(`✅ ${nom}`); ok++; }
        else { resultats.push(`❌ ${nom} (erreur inattendue)\n   ${String(e.message || e).split('\n')[0]}`); fail++; }
    }
}

const cfg = (uid) => doc(db(uid === UID_A ? A : B), 'members', uid, 'superProfile', 'config');
const piste = (i) => ({ id: `p${i}`, titre: `Piste ${i}`, url: 'https://x/y.mp3', storagePath: `superProfiles/${UID_A}/pistes/p${i}.mp3` });
const produit = (i) => ({ id: `q${i}`, nom: `Produit ${i}` });

async function main() {
    const owner = db('owner');
    await setDoc(doc(owner, 'members', UID_A, 'admin', 'flags'), { proEnabled: true });
    await setDoc(doc(owner, 'assistances', UID_A), { statut: 'payee', courriel: 'a@example.com' });

    await attenduOk('M-01 douze pistes', setDoc(cfg(UID_A), { pistes: Array.from({ length: 12 }, (_, i) => piste(i)) }, { merge: true }));
    await attenduRefus('M-02 treize pistes', setDoc(cfg(UID_A), { pistes: Array.from({ length: 13 }, (_, i) => piste(i)) }, { merge: true }));
    await attenduOk('M-03 trente produits', setDoc(cfg(UID_A), { produits: Array.from({ length: 30 }, (_, i) => produit(i)) }, { merge: true }));
    await attenduRefus('M-04 trente et un produits', setDoc(cfg(UID_A), { produits: Array.from({ length: 31 }, (_, i) => produit(i)) }, { merge: true }));
    await attenduOk('M-05 accent #ff5c39', setDoc(cfg(UID_A), { theme: { palette: 'scene', fonts: 'affiche', accent: '#ff5c39' } }, { merge: true }));
    await attenduOk('M-06 accent vide', setDoc(cfg(UID_A), { theme: { palette: 'scene', accent: '' } }, { merge: true }));
    await attenduRefus('M-07 accent « red »', setDoc(cfg(UID_A), { theme: { accent: 'red' } }, { merge: true }));
    await attenduRefus('M-08 accent avec du CSS', setDoc(cfg(UID_A), { theme: { accent: '#fff;background:url(x)' } }, { merge: true }));
    await attenduOk('M-09 ordre des sections', setDoc(cfg(UID_A), { ordre: ['bio', 'ecoute', 'dates'] }, { merge: true }));
    await attenduRefus('M-10 B sans Profil Pro écrit son espace', setDoc(cfg(UID_B), { ordre: ['bio'] }, { merge: true }));

    await attenduOk('M-11 A lit son assistance', getDoc(doc(db(A), 'assistances', UID_A)));
    await attenduRefus('M-12 B lit l\'assistance de A', getDoc(doc(db(B), 'assistances', UID_A)));
    await attenduRefus('M-13 A se déclare payé', setDoc(doc(db(A), 'assistances', UID_A), { statut: 'payee' }));
    await attenduRefus('M-14 A crée une assistance pour B', setDoc(doc(db(A), 'assistances', UID_B), { statut: 'payee' }));
    await attenduOk('M-15 l\'admin marque l\'appel fait', updateDoc(doc(db(ADMIN), 'assistances', UID_A), { statut: 'appel-fait', appelFaitLe: new Date().toISOString() }));
    await attenduRefus('M-16 l\'admin change le courriel payé', updateDoc(doc(db(ADMIN), 'assistances', UID_A), { courriel: 'x@y.z' }));

    const MP3 = new Uint8Array([0x49, 0x44, 0x33, 3, 0, 0, 0, 0, 0, 0]);
    await attenduOk('S-01 A dépose une piste mp3', uploadBytes(ref(st(A), `superProfiles/${UID_A}/pistes/p1.mp3`), MP3, { contentType: 'audio/mpeg' }));
    await attenduRefus('S-02 A dépose une image dans pistes', uploadBytes(ref(st(A), `superProfiles/${UID_A}/pistes/p2.png`), MP3, { contentType: 'image/png' }));
    await attenduRefus('S-03 B dépose dans les pistes de A', uploadBytes(ref(st(B), `superProfiles/${UID_A}/pistes/p3.mp3`), MP3, { contentType: 'audio/mpeg' }));
    await attenduRefus('S-04 piste de plus de 30 Mo', uploadBytes(ref(st(A), `superProfiles/${UID_A}/pistes/p4.mp3`), new Uint8Array(30 * 1024 * 1024 + 1), { contentType: 'audio/mpeg' }));

    console.log(resultats.join('\n'));
    console.log(`\n${ok} réussis, ${fail} échoués`);
    await Promise.all(apps.map((a) => deleteApp(a)));
    process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
