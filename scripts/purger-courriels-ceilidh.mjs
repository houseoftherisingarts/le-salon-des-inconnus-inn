// Vague 7, lot 3 : retire le champ email des inscriptions du Ceilidh.
//
//   node scripts/purger-courriels-ceilidh.mjs --essai
//   node scripts/purger-courriels-ceilidh.mjs --appliquer
//
// Les inscriptions (events/ceilidh-mai-2026/registrations/{uid}) restent en
// lecture publique pour les équipes, la ligne du temps et le décompte des
// chambres, mais le courriel de l'inscrit ne doit plus y être lisible par tout
// visiteur. La règle d'écriture le refuse désormais ; ce script retire le champ
// des inscriptions existantes. Rien d'autre n'est touché, aucune inscription
// n'est supprimée.
//
// API REST Firestore avec le jeton gcloud du propriétaire (même patron que
// scripts/qa/firestore-rest.mjs, aucune clé).
import { execFileSync } from 'node:child_process';

const PROJET = 'le-salon-des-inconnus';
const RACINE = `projects/${PROJET}/databases/(default)/documents`;
const API = 'https://firestore.googleapis.com/v1';

const args = process.argv.slice(2);
const appliquer = args.includes('--appliquer');
const essai = args.includes('--essai');
if (!appliquer && !essai) throw new Error('Passer --essai ou --appliquer');

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

const inscriptions = [];
let page = '';
do {
  const r = await appel('GET', `${API}/${RACINE}/events/ceilidh-mai-2026/registrations?pageSize=300${page ? `&pageToken=${page}` : ''}`);
  inscriptions.push(...(r.documents || []));
  page = r.nextPageToken || '';
} while (page);

const aPurger = inscriptions
  .map((d) => ({ uid: d.name.split('/').pop(), name: d.name, fields: d.fields || {} }))
  .filter((f) => 'email' in f.fields);

console.log(`Inscriptions lues : ${inscriptions.length}`);
console.log(`Inscriptions qui portent un champ email : ${aPurger.length}`);
for (const f of aPurger) {
  console.log(`  ${f.uid} → ${f.fields.email?.stringValue || '(vide)'}`);
}

if (!appliquer) { console.log('Mode --essai : rien n\'a été écrit.'); process.exit(0); }

let purges = 0;
for (const f of aPurger) {
  // Un champ nommé dans le masque mais absent de fields est retiré ; rien
  // d'autre ne bouge.
  await appel('POST', `${API}/projects/${PROJET}/databases/(default)/documents:commit`, {
    writes: [{
      update: { name: f.name, fields: {} },
      updateMask: { fieldPaths: ['email'] },
      currentDocument: { exists: true },
    }],
  });
  purges++;
}
console.log(`Champs email retirés : ${purges}`);
