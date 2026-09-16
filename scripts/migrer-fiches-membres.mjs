// Vague 7, lot 0 : remet les fiches members/{uid} dans la liste que
// membreValide (firestore.rules) accepte. Sans ça, une seule clé hors liste
// fige la fiche : le membre ne peut plus rien y écrire, ensureMember compris.
//
//   node scripts/migrer-fiches-membres.mjs --dry-run --sauvegarde <fichier.json>
//   node scripts/migrer-fiches-membres.mjs --appliquer --sauvegarde <fichier.json>
//
// Admin SDK, avec le jeton gcloud du propriétaire du projet (aucune clé).
// --appliquer déplace phone vers members/{uid}/prive/coordonnees.telephone et
// retire isAdmin. Les autres clés hors liste ne sont jamais effacées : elles
// sont seulement rapportées. Aucune fiche n'est supprimée.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

const PERMIS = new Set([
    'displayName', 'email', 'photoURL', 'banniereURL', 'bio', 'discipline', 'ville', 'liens',
    'provider', 'joinedAt', 'lastSeenAt', 'uid', 'membershipType', 'createdAt', 'consentDate', 'consentVersion',
]);
const args = process.argv.slice(2);
const appliquer = args.includes('--appliquer');
const sauvegarde = args[args.indexOf('--sauvegarde') + 1];
if (!sauvegarde || args.indexOf('--sauvegarde') < 0) throw new Error('--sauvegarde <fichier.json> est obligatoire');

const credential = {
    getAccessToken: async () => ({
        access_token: execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim(),
        expires_in: 3000,
    }),
};
const db = getFirestore(initializeApp({ projectId: 'le-salon-des-inconnus', credential }));

const enJson = (v) => JSON.parse(JSON.stringify(v, (_, x) =>
    x instanceof Timestamp ? { __timestamp: x.toDate().toISOString() } : x));

const snap = await db.collection('members').get();
const touchees = [];
for (const d of snap.docs) {
    const data = d.data();
    const horsListe = Object.keys(data).filter((k) => !PERMIS.has(k));
    if (horsListe.length) touchees.push({ uid: d.id, horsListe, data });
}

writeFileSync(sauvegarde, JSON.stringify({
    projet: 'le-salon-des-inconnus', exporteLe: new Date().toISOString(), totalFiches: snap.size,
    fiches: touchees.map((f) => ({ uid: f.uid, horsListe: f.horsListe, data: enJson(f.data) })),
}, null, 2));

const compte = {};
for (const f of touchees) for (const k of f.horsListe) compte[k] = (compte[k] || 0) + 1;
const avecPhone = touchees.filter((f) => 'phone' in f.data);
const autres = touchees.filter((f) => f.horsListe.some((k) => k !== 'phone' && k !== 'isAdmin'));
console.log(`Fiches lues : ${snap.size}`);
console.log(`Fiches avec au moins une clé hors liste : ${touchees.length}`);
console.log('Clés hors liste :', compte);
console.log(`Téléphones à déplacer : ${avecPhone.filter((f) => f.data.phone).length}`);
console.log(`Fiches qui garderont une clé inconnue (rapportées, jamais effacées) : ${autres.length}`, autres.map((f) => f.uid));
console.log(`Sauvegarde : ${sauvegarde}`);

if (!appliquer) { console.log('Mode --dry-run : rien n\'a été écrit.'); process.exit(0); }

let ecrites = 0;
for (const f of touchees) {
    const maj = {};
    if ('isAdmin' in f.data) maj.isAdmin = FieldValue.delete();
    if ('phone' in f.data) maj.phone = FieldValue.delete();
    if (!Object.keys(maj).length) continue;
    const batch = db.batch();
    if (f.data.phone) {
        batch.set(db.doc(`members/${f.uid}/prive/coordonnees`),
            { telephone: String(f.data.phone), majLe: FieldValue.serverTimestamp() }, { merge: true });
    }
    batch.update(db.doc(`members/${f.uid}`), maj);
    await batch.commit();
    ecrites++;
}
console.log(`Fiches migrées : ${ecrites}`);
