// Banc d'essai Storage du lot 6 de la vague 7 (captures de signalement sous
// problemes/{uid}/). Même harnais que les bancs Firestore : le SDK firebase
// parle à l'émulateur Storage avec un jeton simulé.
//
// Lancé par :
//   PATH="$(brew --prefix openjdk)/bin:$PATH" npx firebase emulators:exec \
//     --only firestore,storage --project demo-salon \
//     "node tests/rules.reseau.test.mjs && node tests/rules.espace.test.mjs && node tests/storage.espace.test.mjs"
import { initializeApp, deleteApp } from 'firebase/app';
import {
    getStorage, connectStorageEmulator, ref, uploadBytes, getDownloadURL,
} from 'firebase/storage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-salon';
const UID_A = 'espace-a';
const UID_B = 'espace-b';

let compteur = 0;
const apps = [];
function baseComme(claims) {
    const app = initializeApp(
        { projectId: PROJECT_ID, storageBucket: 'le-salon-des-inconnus.firebasestorage.app' },
        `storage-espace-${compteur++}`,
    );
    apps.push(app);
    const storage = getStorage(app);
    connectStorageEmulator(storage, '127.0.0.1', 9199, claims ? { mockUserToken: claims } : {});
    return storage;
}
const stA = () => baseComme({ sub: UID_A, email: 'a@example.com', email_verified: true });
const stB = () => baseComme({ sub: UID_B, email: 'b@example.com', email_verified: true });
const stAdmin = () => baseComme({ sub: 'admin-uid', email: 'alex@lesalondesinconnus.com', email_verified: true });

// En-tête PNG minimal (le contenu exact n'importe pas : seul le contentType
// compte pour isImage()).
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

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
        if (String(e.code || e.message || '').match(/permission-denied|PERMISSION_DENIED|unauthorized|401/i)) { resultats.push(`✅ ${nom}`); ok++; }
        else { resultats.push(`❌ ${nom} (erreur inattendue)\n   ${String(e.message || e).split('\n')[0]}`); fail++; }
    }
}

async function main() {
    await attenduOk('S-01 A dépose une image sous problemes/A/1.png',
        uploadBytes(ref(stA(), `problemes/${UID_A}/1.png`), PNG, { contentType: 'image/png' }));
    await attenduRefus('S-02 A dépose sous problemes/B/1.png (chemin d\'un autre)',
        uploadBytes(ref(stA(), `problemes/${UID_B}/1.png`), PNG, { contentType: 'image/png' }));
    await attenduRefus('S-03 A dépose un PDF sous problemes/A/1.pdf',
        uploadBytes(ref(stA(), `problemes/${UID_A}/1.pdf`), PNG, { contentType: 'application/pdf' }));
    await attenduRefus('S-04 B lit la capture de A',
        getDownloadURL(ref(stB(), `problemes/${UID_A}/1.png`)));
    await attenduOk('S-04 b l\'admin lit la capture de A',
        getDownloadURL(ref(stAdmin(), `problemes/${UID_A}/1.png`)));

    console.log('\n' + resultats.join('\n'));
    console.log(`\n${ok} réussis, ${fail} échoués, sur ${ok + fail} cas.`);
    await Promise.all(apps.map((a) => deleteApp(a).catch(() => {})));
    if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
