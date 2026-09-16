// Vague 7, lot 0 : remet les fiches members/{uid} dans la liste que
// membreValide (firestore.rules) accepte. Sans ça, une seule clé hors liste
// fige la fiche : le membre ne peut plus rien y écrire, ensureMember compris.
//
//   node scripts/migrer-fiches-membres.mjs --dry-run --sauvegarde <fichier.json>
//   node scripts/migrer-fiches-membres.mjs --appliquer --sauvegarde <fichier.json>
//
// API REST Firestore avec le jeton gcloud du propriétaire (même patron que
// scripts/qa/firestore-rest.mjs, aucune clé : l'Admin SDK exige des ADC que
// la machine n'a pas). La sauvegarde garde les valeurs typées telles que
// Firestore les rend. --appliquer déplace phone vers
// members/{uid}/prive/coordonnees.telephone et retire isAdmin, dans un seul
// commit atomique par fiche. Les autres clés hors liste ne sont jamais
// effacées, seulement rapportées, et aucune fiche n'est supprimée.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PROJET = 'le-salon-des-inconnus';
const RACINE = `projects/${PROJET}/databases/(default)/documents`;
const API = 'https://firestore.googleapis.com/v1';
const PERMIS = new Set([
    'displayName', 'email', 'photoURL', 'banniereURL', 'bio', 'discipline', 'ville', 'liens',
    'provider', 'joinedAt', 'lastSeenAt', 'uid', 'membershipType', 'createdAt', 'consentDate', 'consentVersion',
]);

const args = process.argv.slice(2);
const appliquer = args.includes('--appliquer');
const iSauv = args.indexOf('--sauvegarde');
const sauvegarde = iSauv >= 0 ? args[iSauv + 1] : null;
if (!sauvegarde) throw new Error('--sauvegarde <fichier.json> est obligatoire');

const jeton = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
async function appel(methode, url, corps) {
    const r = await fetch(url, {
        method: methode,
        headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJET },
        body: corps ? JSON.stringify(corps) : undefined,
    });
    const texte = await r.text();
    if (!r.ok) throw new Error(`${methode} ${url} → ${r.status} ${texte.slice(0, 300)}`);
    return texte ? JSON.parse(texte) : null;
}

const fiches = [];
let page = '';
do {
    const r = await appel('GET', `${API}/${RACINE}/members?pageSize=300${page ? `&pageToken=${page}` : ''}`);
    fiches.push(...(r.documents || []));
    page = r.nextPageToken || '';
} while (page);

const touchees = fiches
    .map((d) => ({ uid: d.name.split('/').pop(), name: d.name, fields: d.fields || {} }))
    .map((f) => ({ ...f, horsListe: Object.keys(f.fields).filter((k) => !PERMIS.has(k)) }))
    .filter((f) => f.horsListe.length);

writeFileSync(sauvegarde, JSON.stringify({
    projet: PROJET, exporteLe: new Date().toISOString(), totalFiches: fiches.length, fiches: touchees,
}, null, 2));

const compte = {};
for (const f of touchees) for (const k of f.horsListe) compte[k] = (compte[k] || 0) + 1;
const telephone = (f) => f.fields.phone?.stringValue || '';
const aMigrer = touchees.filter((f) => 'phone' in f.fields || 'isAdmin' in f.fields);
const inconnues = touchees.filter((f) => f.horsListe.some((k) => k !== 'phone' && k !== 'isAdmin'));
console.log(`Fiches lues : ${fiches.length}`);
console.log(`Fiches avec au moins une clé hors liste : ${touchees.length}`);
console.log('Clés hors liste :', compte);
console.log(`Fiches à migrer (phone ou isAdmin) : ${aMigrer.length}, dont ${aMigrer.filter(telephone).length} téléphone(s) non vide(s) à déplacer`);
console.log(`Fiches qui garderont une clé inconnue (rapportées, jamais effacées) : ${inconnues.length}`,
    inconnues.map((f) => `${f.uid}: ${f.horsListe.join(',')}`));
console.log('Suppressions de fiche prévues : 0');
console.log(`Sauvegarde : ${sauvegarde}`);

if (!appliquer) { console.log('Mode --dry-run : rien n\'a été écrit.'); process.exit(0); }

let ecrites = 0;
for (const f of aMigrer) {
    const writes = [];
    const tel = telephone(f);
    if (tel) {
        writes.push({
            update: { name: `${f.name}/prive/coordonnees`, fields: { telephone: { stringValue: tel } } },
            updateMask: { fieldPaths: ['telephone'] },
            updateTransforms: [{ fieldPath: 'majLe', setToServerValue: 'REQUEST_TIME' }],
        });
    }
    // Un champ nommé dans le masque mais absent de fields est retiré ; rien d'autre ne bouge.
    writes.push({
        update: { name: f.name, fields: {} },
        updateMask: { fieldPaths: ['phone', 'isAdmin'].filter((k) => k in f.fields) },
        currentDocument: { exists: true },
    });
    await appel('POST', `${API}/projects/${PROJET}/databases/(default)/documents:commit`, { writes });
    ecrites++;
}
console.log(`Fiches migrées : ${ecrites}`);
