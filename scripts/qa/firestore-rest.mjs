// Écrit ou lit des documents Firestore par l'API REST avec le jeton OAuth de gcloud
// (compte propriétaire du projet : les règles de sécurité ne s'appliquent pas, ce qui
// sert à semer des comptes témoins et des drapeaux admin avant une boucle de vérification).
//
// Usage :
//   node scripts/qa/firestore-rest.mjs set <chemin/du/doc> '<json>'      (fusion des champs)
//   node scripts/qa/firestore-rest.mjs get <chemin/du/doc>
//   node scripts/qa/firestore-rest.mjs seed <fichier.json>                 ({ "chemin": {..}, ... })
//   node scripts/qa/firestore-rest.mjs delete <chemin/du/doc>
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PROJET = process.env.FIREBASE_PROJECT || 'le-salon-des-inconnus';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJET}/databases/(default)/documents`;

const jeton = () => execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();

// Conversion JSON → valeurs typées Firestore (un sous-ensemble suffisant pour les tests).
function versValeur(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(v)) return { timestampValue: v };
    return { stringValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(versValeur) } };
  if (typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, versValeur(x)])) } };
  throw new Error(`type non géré : ${typeof v}`);
}

function depuisValeur(f) {
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('timestampValue' in f) return f.timestampValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(depuisValeur);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, depuisValeur(x)]));
  return f;
}

async function appel(methode, chemin, corps) {
  const r = await fetch(`${BASE}/${chemin}${corps && methode === 'PATCH' ? '?' + Object.keys(corps.fields).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&') : ''}`, {
    method: methode,
    headers: { Authorization: `Bearer ${jeton()}`, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await r.text();
  if (!r.ok) throw new Error(`${methode} ${chemin} → ${r.status} ${texte.slice(0, 300)}`);
  return texte ? JSON.parse(texte) : null;
}

export async function setDoc(chemin, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, versValeur(v)]));
  return appel('PATCH', chemin, { fields });
}
export async function getDoc(chemin) {
  const d = await appel('GET', chemin).catch((e) => (String(e).includes('404') ? null : Promise.reject(e)));
  return d ? Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, depuisValeur(v)])) : null;
}
export async function deleteDoc(chemin) {
  return appel('DELETE', chemin);
}

const [, , cmd, a, b] = process.argv;
if (cmd === 'set') { await setDoc(a, JSON.parse(b)); console.log('ok', a); }
else if (cmd === 'get') { console.log(JSON.stringify(await getDoc(a), null, 2)); }
else if (cmd === 'delete') { await deleteDoc(a); console.log('supprimé', a); }
else if (cmd === 'seed') {
  const plan = JSON.parse(readFileSync(a, 'utf8'));
  for (const [chemin, data] of Object.entries(plan)) { await setDoc(chemin, data); console.log('ok', chemin); }
}
else if (cmd) { console.error('commande inconnue'); process.exit(1); }
