// Vague 7, lot 3 : recomptage initial du compteur public du Ceilidh.
//
//   node scripts/initialiser-ceilidh-places.mjs
//
// Le déclencheur compterPlacesCeilidh ne s'active qu'à la prochaine écriture
// sur showTickets. Ce script pose tout de suite config/ceilidhPlaces { vendus,
// majLe } avec le compte réel, pour que /ceilidh affiche le bon nombre de
// places restantes dès le déploiement des règles (qui ferment la lecture de
// showTickets au propriétaire et à l'admin).
//
// API REST Firestore avec le jeton gcloud du propriétaire (même patron que
// scripts/qa/firestore-rest.mjs, aucune clé).
import { execFileSync } from 'node:child_process';

const PROJET = 'le-salon-des-inconnus';
const RACINE = `projects/${PROJET}/databases/(default)/documents`;
const API = 'https://firestore.googleapis.com/v1';

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

const billets = [];
let page = '';
do {
  const r = await appel('GET', `${API}/${RACINE}/events/ceilidh-mai-2026/showTickets?pageSize=100${page ? `&pageToken=${page}` : ''}`);
  billets.push(...(r.documents || []));
  page = r.nextPageToken || '';
} while (page);

const vendus = billets.length;
console.log(`Billets de spectacle trouvés : ${vendus}`);

await appel('POST', `${API}/projects/${PROJET}/databases/(default)/documents:commit`, {
  writes: [{
    update: {
      name: `${RACINE}/config/ceilidhPlaces`,
      fields: { vendus: { integerValue: String(vendus) } },
    },
    updateMask: { fieldPaths: ['vendus', 'majLe'] },
    updateTransforms: [{ fieldPath: 'majLe', setToServerValue: 'REQUEST_TIME' }],
  }],
});

console.log(`config/ceilidhPlaces posé : { vendus: ${vendus}, majLe: maintenant }`);
