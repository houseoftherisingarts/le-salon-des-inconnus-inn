// Banc d'essai du lot 0 de la vague 7 (porte d'inscription de la fenêtre
// « Espace Membre »), même harnais que rules.reseau.test.mjs : le SDK
// `firebase` parle à l'émulateur avec un jeton simulé, aucun paquet ajouté.
//
// Lancé par :
//   PATH="$(brew --prefix openjdk)/bin:$PATH" npx firebase emulators:exec \
//     --only firestore --project demo-salon \
//     "node tests/rules.reseau.test.mjs && node tests/rules.espace.test.mjs"
import { initializeApp, deleteApp } from 'firebase/app';
import {
    getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc, getDoc,
    getDocs, collection, serverTimestamp, Timestamp,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-salon';
const UID_A = 'espace-a';
const UID_B = 'espace-b';
const UID_T = 'espace-tel';
const UID_G = 'espace-google';

let compteur = 0;
const apps = [];
function baseComme(claims) {
    const app = initializeApp({ projectId: PROJECT_ID }, `espace-test-${compteur++}`);
    apps.push(app);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, '127.0.0.1', 8080, claims ? { mockUserToken: claims } : {});
    return db;
}
const dbA = () => baseComme({ sub: UID_A, email: 'a@example.com', email_verified: true });
const dbB = () => baseComme({ sub: UID_B, email: 'b@example.com', email_verified: true });
const dbG = () => baseComme({ sub: UID_G, email: 'g@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } });
const dbTel = () => baseComme({ sub: UID_T, phone_number: '+18195550101', firebase: { sign_in_provider: 'phone' } });
const dbAdmin = () => baseComme({ sub: 'admin-uid', email: 'alex@lesalondesinconnus.com', email_verified: true });
const dbFauxAdmin = () => baseComme({ sub: 'faux-admin', email: 'alex@lesalondesinconnus.com', email_verified: false });
const dbAnon = () => baseComme(null);
// Mode « owner » : le jeton littéral 'owner' est traité par l'émulateur comme
// l'Admin SDK (contourne les règles). Sert à semer showTickets, que la règle
// `allow write: false` interdit à tout client, même admin.
const dbOwner = () => {
    const app = initializeApp({ projectId: PROJECT_ID }, `espace-owner-${compteur++}`);
    apps.push(app);
    const db = getFirestore(app);
    connectFirestoreEmulator(db, '127.0.0.1', 8080, { mockUserToken: 'owner' });
    return db;
};

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
        if (String(e.code || e.message || '').match(/permission-denied|PERMISSION_DENIED/i)) { resultats.push(`✅ ${nom}`); ok++; }
        else { resultats.push(`❌ ${nom} (erreur inattendue)\n   ${String(e.message || e).split('\n')[0]}`); fail++; }
    }
}

// La forme exacte qu'écrit createMemberProfile (components/AuthModal.tsx).
const ficheAuthModal = (uid, email, extra = {}) => ({
    uid,
    email,
    displayName: 'Essai',
    membershipType: 'voyageur',
    createdAt: serverTimestamp(),
    consentDate: new Date().toISOString(),
    consentVersion: '1',
    ...extra,
});

async function main() {
    // ── Inscription par les trois portes ───────────────────────────────────
    await attenduOk('R-01 inscription par courriel : forme exacte d\'AuthModal',
        setDoc(doc(dbA(), 'members', UID_A), ficheAuthModal(UID_A, 'a@example.com')));
    await attenduOk('R-01 g inscription par Google (avec photoURL)',
        setDoc(doc(dbG(), 'members', UID_G), ficheAuthModal(UID_G, 'g@example.com', { photoURL: 'https://lh3.googleusercontent.com/x' })));
    await attenduOk('R-01 t inscription par téléphone (courriel vide)',
        setDoc(doc(dbTel(), 'members', UID_T), ficheAuthModal(UID_T, '', { membershipType: 'artiste' })));
    await attenduOk('R-01 t le téléphone va dans prive/coordonnees',
        setDoc(doc(dbTel(), 'members', UID_T, 'prive', 'coordonnees'), { telephone: '+18195550101', majLe: serverTimestamp() }));

    // ── Ce que la porte ne peut plus écrire ─────────────────────────────────
    await attenduRefus('R-02 un membre crée sa fiche avec isAdmin: true',
        setDoc(doc(dbB(), 'members', UID_B), ficheAuthModal(UID_B, 'b@example.com', { isAdmin: true })));
    await attenduRefus('R-02 b un membre ajoute isAdmin à sa fiche existante',
        setDoc(doc(dbA(), 'members', UID_A), { isAdmin: true }, { merge: true }));
    await attenduRefus('R-03 un membre crée sa fiche avec phone',
        setDoc(doc(dbB(), 'members', UID_B), ficheAuthModal(UID_B, 'b@example.com', { phone: '+18195550101' })));
    await attenduRefus('R-04 membershipType « admin »',
        setDoc(doc(dbB(), 'members', UID_B), ficheAuthModal(UID_B, 'b@example.com', { membershipType: 'admin' })));
    await attenduRefus('R-05 un membre change son createdAt',
        updateDoc(doc(dbA(), 'members', UID_A), { createdAt: Timestamp.fromDate(new Date('2020-01-01')) }));
    await attenduOk('R-06 fusion ensureMember (displayName, email, photoURL, provider, lastSeenAt)',
        setDoc(doc(dbA(), 'members', UID_A), {
            displayName: 'Essai A', email: 'a@example.com', photoURL: '', provider: 'email', lastSeenAt: serverTimestamp(),
        }, { merge: true }));
    await attenduRefus('R-07 A écrit la fiche de B',
        setDoc(doc(dbA(), 'members', UID_B), ficheAuthModal(UID_B, 'b@example.com')));
    await attenduRefus('R-09 A se crée une fiche avec le courriel d\'Alex',
        setDoc(doc(dbB(), 'members', UID_B), ficheAuthModal(UID_B, 'alex@lesalondesinconnus.com')));
    await attenduRefus('R-09 c createdAt fixé au 1er janvier 2020 à la création',
        setDoc(doc(dbB(), 'members', UID_B), ficheAuthModal(UID_B, 'b@example.com', { createdAt: Timestamp.fromDate(new Date('2020-01-01')) })));
    await attenduRefus('R-01 u uid qui ne correspond pas au document',
        setDoc(doc(dbB(), 'members', UID_B), ficheAuthModal(UID_A, 'b@example.com')));

    // Fiche sans createdAt (porte du Creator Studio) : B la crée par ensureMember.
    await attenduOk('R-09 d préparation : fiche ensureMember sans createdAt',
        setDoc(doc(dbB(), 'members', UID_B), { displayName: 'B', email: 'b@example.com', photoURL: '', provider: 'google', joinedAt: serverTimestamp(), lastSeenAt: serverTimestamp() }));
    await attenduRefus('R-09 d B ajoute un createdAt à une fiche qui n\'en avait pas',
        updateDoc(doc(dbB(), 'members', UID_B), { createdAt: serverTimestamp() }));

    // ── Lectures ─────────────────────────────────────────────────────────────
    await attenduOk('lecture de la fiche d\'autrui par un membre connecté (page publique)',
        getDoc(doc(dbB(), 'members', UID_A)));
    await attenduRefus('lecture d\'une fiche par un visiteur anonyme',
        getDoc(doc(dbAnon(), 'members', UID_A)));

    // ── Sous-collection privée ───────────────────────────────────────────────
    await attenduOk('R-10 A écrit prive/coordonnees { telephone }',
        setDoc(doc(dbA(), 'members', UID_A, 'prive', 'coordonnees'), { telephone: '819 555-0101' }));
    await attenduRefus('R-10 b téléphone avec des lettres',
        setDoc(doc(dbA(), 'members', UID_A, 'prive', 'coordonnees'), { telephone: 'javascript:1' }));
    await attenduRefus('R-11 B lit prive/coordonnees de A',
        getDoc(doc(dbB(), 'members', UID_A, 'prive', 'coordonnees')));
    await attenduOk('R-12 l\'admin vérifié lit prive/coordonnees de A',
        getDoc(doc(dbAdmin(), 'members', UID_A, 'prive', 'coordonnees')));
    await attenduRefus('R-13 le faux admin non vérifié lit prive/coordonnees de A',
        getDoc(doc(dbFauxAdmin(), 'members', UID_A, 'prive', 'coordonnees')));
    await attenduRefus('R-13 b le faux admin non vérifié écrit la fiche de A',
        setDoc(doc(dbFauxAdmin(), 'members', UID_A), { isAdmin: true }, { merge: true }));
    await attenduRefus('R-14 prive/preferences { langue: DE }',
        setDoc(doc(dbA(), 'members', UID_A, 'prive', 'preferences'), { langue: 'DE' }));
    await attenduRefus('R-15 prive/preferences avec un champ role',
        setDoc(doc(dbA(), 'members', UID_A, 'prive', 'preferences'), { langue: 'FR', role: 'admin' }));
    await attenduOk('R-15 b prive/preferences valides',
        setDoc(doc(dbA(), 'members', UID_A, 'prive', 'preferences'), { langue: 'FR', courrielNouveauMessage: true }));

    // ── Suppression par soi-même ─────────────────────────────────────────────
    await attenduOk('R-09 b A supprime sa propre fiche',
        deleteDoc(doc(dbA(), 'members', UID_A)));
    await attenduRefus('R-09 e B supprime la fiche de G',
        deleteDoc(doc(dbB(), 'members', UID_G)));

    // ── Lot 3 : billets du Ceilidh (showTickets / config / registrations) ────
    // Un billet factice semé en mode owner (la règle refuse l'écriture client).
    await attenduOk('semis du billet showTickets/A en mode owner',
        setDoc(doc(dbOwner(), 'events', 'ceilidh-mai-2026', 'showTickets', UID_A), {
            uid: UID_A, ticketType: 'single', nights: [], ticketCode: 'CEIL26-TEST-0001', amountCents: 1000, createdAt: serverTimestamp(),
        }));

    await attenduRefus('R-60 un visiteur anonyme lit showTickets/A',
        getDoc(doc(dbAnon(), 'events', 'ceilidh-mai-2026', 'showTickets', UID_A)));
    await attenduOk('R-61 un visiteur anonyme lit config/ceilidhPlaces',
        getDoc(doc(dbAnon(), 'config', 'ceilidhPlaces')));
    await attenduOk('R-62 un visiteur anonyme lit la collection registrations',
        getDocs(collection(dbAnon(), 'events', 'ceilidh-mai-2026', 'registrations')));
    await attenduRefus('R-63 A écrit son inscription avec un champ email',
        setDoc(doc(dbA(), 'events', 'ceilidh-mai-2026', 'registrations', UID_A), { uid: UID_A, email: 'a@example.com' }));
    await attenduOk('R-63 b A écrit son inscription sans email',
        setDoc(doc(dbA(), 'events', 'ceilidh-mai-2026', 'registrations', UID_A), { uid: UID_A, displayName: 'Essai A' }));
    await attenduOk('R-64 A lit son propre billet showTickets/A',
        getDoc(doc(dbA(), 'events', 'ceilidh-mai-2026', 'showTickets', UID_A)));
    await attenduRefus('R-64 b B lit le billet showTickets de A',
        getDoc(doc(dbB(), 'events', 'ceilidh-mai-2026', 'showTickets', UID_A)));

    // ── Lot 4 : séjours Hostaway (état serveur, jamais écrit par le client) ──
    await attenduOk('semis de sejours/A en mode owner',
        setDoc(doc(dbOwner(), 'sejours', UID_A), { derniereLecture: serverTimestamp() }));
    await attenduRefus('R-20 A écrit sejours/A',
        setDoc(doc(dbA(), 'sejours', UID_A), { reservationsLiees: [123] }));
    await attenduOk('R-21 A lit sejours/A',
        getDoc(doc(dbA(), 'sejours', UID_A)));
    await attenduRefus('R-21 b B lit sejours/A',
        getDoc(doc(dbB(), 'sejours', UID_A)));
    await attenduOk('R-21 c l\'admin lit sejours/A',
        getDoc(doc(dbAdmin(), 'sejours', UID_A)));

    // ── Lot 5 : parrainage (codesParrain / parrainages / parrainagesCompte) ──
    await attenduOk('R-50 A crée son code codesParrain/ABC123',
        setDoc(doc(dbA(), 'codesParrain', 'ABC123'), { uid: UID_A, creeLe: serverTimestamp() }));
    await attenduRefus('R-50 b B crée codesParrain/XYZ789 en posant uid: A',
        setDoc(doc(dbB(), 'codesParrain', 'XYZ789'), { uid: UID_A, creeLe: serverTimestamp() }));
    await attenduOk('R-51 B crée parrainages/B avec le code ABC123 de A',
        setDoc(doc(dbB(), 'parrainages', UID_B), {
            parrainUid: UID_A, code: 'ABC123', filleulNom: 'Essai B', creeLe: serverTimestamp(),
        }));
    await attenduRefus('R-52 A crée parrainages/A en se parrainant lui-même',
        setDoc(doc(dbA(), 'parrainages', UID_A), {
            parrainUid: UID_A, code: 'ABC123', filleulNom: 'Essai A', creeLe: serverTimestamp(),
        }));
    await attenduRefus('R-53 B réclame un code qui n\'appartient pas au parrainUid',
        setDoc(doc(dbB(), 'parrainages', UID_B), {
            parrainUid: UID_G, code: 'ABC123', filleulNom: 'Essai B', creeLe: serverTimestamp(),
        }));
    await attenduOk('R-54 le parrain A lit parrainages/B',
        getDoc(doc(dbA(), 'parrainages', UID_B)));
    await attenduRefus('R-54 b un tiers (G) lit parrainages/B',
        getDoc(doc(dbG(), 'parrainages', UID_B)));
    await attenduRefus('R-55 B pose valide: true sur parrainages/B',
        updateDoc(doc(dbB(), 'parrainages', UID_B), { valide: true }));
    await attenduRefus('R-56 A écrit parrainagesCompte/A',
        setDoc(doc(dbA(), 'parrainagesCompte', UID_A), { n: 3 }));
    await attenduOk('R-65 B (connecté) lit codesParrain/ABC123',
        getDoc(doc(dbB(), 'codesParrain', 'ABC123')));
    await attenduRefus('R-65 b un visiteur anonyme lit codesParrain/ABC123',
        getDoc(doc(dbAnon(), 'codesParrain', 'ABC123')));

    console.log('\n' + resultats.join('\n'));
    console.log(`\n${ok} réussis, ${fail} échoués, sur ${ok + fail} cas.`);
    await Promise.all(apps.map((a) => deleteApp(a).catch(() => {})));
    if (fail > 0) process.exitCode = 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
