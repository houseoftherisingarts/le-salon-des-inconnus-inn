// Banc d'essai des gabarits Peintre et Photographe (29 septembre 2026) :
// bornes des séries et des tarifs dans superProfile, et photos des séries
// dans Storage. Même harnais que les autres bancs.
//
// Lancé par :
//   PATH="$(brew --prefix openjdk)/bin:$PATH" npx firebase emulators:exec \
//     --only firestore,storage --project demo-salon "node tests/rules.photographe.test.mjs"
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-salon';
const UID_A = 'photo-a';
const UID_B = 'photo-b';

let compteur = 0;
const apps = [];
function app() {
    const a = initializeApp({ projectId: PROJECT_ID, storageBucket: 'le-salon-des-inconnus.firebasestorage.app' }, `photo-${compteur++}`);
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
const serie = (i) => ({ id: `s${i}`, titre: `Série ${i}`, photos: [] });
const tarif = (i) => ({ id: `t${i}`, nom: `Séance ${i}`, prix: 200 });

async function main() {
    const owner = db('owner');
    await setDoc(doc(owner, 'members', UID_A, 'admin', 'flags'), { proEnabled: true });

    await attenduOk('P-01 douze séries', setDoc(cfg(UID_A), { series: Array.from({ length: 12 }, (_, i) => serie(i)) }, { merge: true }));
    await attenduRefus('P-02 treize séries', setDoc(cfg(UID_A), { series: Array.from({ length: 13 }, (_, i) => serie(i)) }, { merge: true }));
    await attenduOk('P-03 douze tarifs', setDoc(cfg(UID_A), { tarifs: Array.from({ length: 12 }, (_, i) => tarif(i)) }, { merge: true }));
    await attenduRefus('P-04 treize tarifs', setDoc(cfg(UID_A), { tarifs: Array.from({ length: 13 }, (_, i) => tarif(i)) }, { merge: true }));
    await attenduRefus('P-05 séries qui ne sont pas une liste', setDoc(cfg(UID_A), { series: 'x' }, { merge: true }));
    await attenduOk('P-06 œuvre avec dimensions et lien de vente', setDoc(cfg(UID_A), { oeuvres: [{ url: 'https://x/y.webp', storagePath: 'a', largeurCm: 120, hauteurCm: 90, lienVente: 'https://buy.stripe.com/test' }] }, { merge: true }));
    await attenduRefus('P-07 B sans Profil Pro écrit des séries', setDoc(cfg(UID_B), { series: [serie(0)] }, { merge: true }));
    await attenduOk('P-08 lecture publique', getDoc(doc(db(), 'members', UID_A, 'superProfile', 'config')));

    const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    const chemin = (uid) => `members/${uid}/superProfile/series/s1/ph1.webp`;
    await attenduOk('S-01 A dépose une photo de série', uploadBytes(ref(st(A), chemin(UID_A)), WEBP, { contentType: 'image/webp' }));
    await attenduRefus('S-02 B dépose dans les séries de A', uploadBytes(ref(st(B), chemin(UID_A)), WEBP, { contentType: 'image/webp' }));
    await attenduRefus('S-03 A dépose un mp3 dans ses séries', uploadBytes(ref(st(A), `members/${UID_A}/superProfile/series/s1/x.mp3`), WEBP, { contentType: 'audio/mpeg' }));

    console.log(resultats.join('\n'));
    console.log(`\n${ok} réussis, ${fail} échoués`);
    await Promise.all(apps.map((a) => deleteApp(a)));
    process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
