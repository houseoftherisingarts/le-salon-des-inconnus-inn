// Vérification des règles Pai Sho contre l'émulateur Firestore.
// npx firebase emulators:exec --only firestore "node scripts/_verif-regles.mjs"
import { initializeApp } from 'firebase/app';
import {
  connectFirestoreEmulator, initializeFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, getDocs, query, where,
} from 'firebase/firestore';

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
const projectId = 'le-salon-des-inconnus';
let n = 0;
function client(uid) {
  const app = initializeApp({ projectId, apiKey: 'x' }, `c${n++}`);
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, host, Number(port), uid ? { mockUserToken: { user_id: uid, sub: uid } } : undefined);
  return db;
}
// Données de départ sans règles : l'API REST de l'émulateur avec « Bearer owner ».
async function seed(chemin, champs) {
  const fields = Object.fromEntries(Object.entries(champs).map(([k, v]) => [k,
    Array.isArray(v) ? { arrayValue: { values: v.map((s) => ({ stringValue: s })) } } : { stringValue: v }]));
  const r = await fetch(`http://${host}:${port}/v1/projects/${projectId}/databases/(default)/documents/${chemin}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error(`seed ${chemin}: ${r.status}`);
}

let echecs = 0;
async function attendu(nom, ok, p) {
  let passe;
  try { await p; passe = true; } catch { passe = false; }
  const bon = passe === ok;
  if (!bon) echecs++;
  console.log(`${bon ? 'PASS' : 'FAIL'}  ${nom} (${ok ? 'permis' : 'refusé'} attendu)`);
}

const alice = client('alice'), bob = client('bob'), eve = client('eve');
await seed('conversations/alice__bob', { type: 'dm', members: ['alice', 'bob'] });
await seed('friendships/alice_bob', { status: 'accepted', uids: ['alice', 'bob'], requestedBy: 'alice' });
await seed('salons/s1', { nom: 'Table', owner: 'alice', members: ['alice', 'bob'] });
await seed('presence/alice', { nom: 'Alice', avatar: '' });
await seed('salles-ouvertes/alice', { nom: 'Alice', peerId: 'paisho-aaaaaaaa' });

await attendu('un étranger ne lit pas une conversation', false, getDoc(doc(eve, 'conversations/alice__bob')));
await attendu('un membre lit sa conversation', true, getDoc(doc(bob, 'conversations/alice__bob')));
await attendu('un étranger ne lit pas les messages', false, getDocs(collection(eve, 'conversations/alice__bob/messages')));
await attendu('message privé de 2 001 signes refusé', false, addDoc(collection(alice, 'conversations/alice__bob/messages'), { uid: 'alice', text: 'x'.repeat(2001), createdAt: serverTimestamp() }));
await attendu('message privé normal permis', true, addDoc(collection(alice, 'conversations/alice__bob/messages'), { uid: 'alice', text: 'salut', createdAt: serverTimestamp() }));

await attendu('un non-membre ne poste pas dans un salon', false, addDoc(collection(eve, 'salons/s1/messages'), { uid: 'eve', text: 'intrus', createdAt: serverTimestamp() }));
await attendu('un non-membre ne lit pas un salon', false, getDoc(doc(eve, 'salons/s1')));
await attendu('un membre poste dans son salon', true, addDoc(collection(bob, 'salons/s1/messages'), { uid: 'bob', text: 'bonjour', createdAt: serverTimestamp() }));
await attendu('un membre ne retire pas un autre membre', false, updateDoc(doc(bob, 'salons/s1'), { members: ['bob'] }));
await attendu('un membre quitte le salon', true, updateDoc(doc(bob, 'salons/s1'), { members: ['alice'] }));

await attendu('le propriétaire écrit son profil de joueur', true, setDoc(doc(alice, 'members/alice/paisho/profil'), { avatar: 'aang', banniere: 'jardin' }));
await attendu('un autre n\'écrit pas ce profil', false, setDoc(doc(bob, 'members/alice/paisho/profil'), { avatar: 'zuko' }));
await attendu('un membre connecté lit le profil', true, getDoc(doc(bob, 'members/alice/paisho/profil')));
await attendu('un anonyme ne lit pas le profil', false, getDoc(doc(client(null), 'members/alice/paisho/profil')));

const defi = doc(collection(alice, 'defis'));
await attendu('alice défie bob', true, setDoc(defi, { from: 'alice', to: 'bob', status: 'pending', peerId: 'paisho-aaaaaaaa', nomDe: 'Alice', createdAt: serverTimestamp() }));
await attendu('bob lit le défi', true, getDoc(doc(bob, 'defis', defi.id)));
await attendu('eve ne lit pas le défi', false, getDoc(doc(eve, 'defis', defi.id)));
await attendu('eve ne liste pas les défis de bob', false, getDocs(query(collection(eve, 'defis'), where('to', '==', 'bob'))));
await attendu('bob liste ses défis reçus', true, getDocs(query(collection(bob, 'defis'), where('to', '==', 'bob'), where('status', '==', 'pending'))));
await attendu('alice ne peut pas accepter à la place de bob', false, updateDoc(doc(alice, 'defis', defi.id), { status: 'accepted' }));
await attendu('bob accepte', true, updateDoc(doc(bob, 'defis', defi.id), { status: 'accepted' }));

await attendu('un ami lit la présence', true, getDoc(doc(bob, 'presence/alice')));
await attendu('un étranger ne lit pas la présence', false, getDoc(doc(eve, 'presence/alice')));
await attendu('un ami voit la table ouverte', true, getDoc(doc(bob, 'salles-ouvertes/alice')));
await attendu('un étranger ne voit pas la table ouverte', false, getDoc(doc(eve, 'salles-ouvertes/alice')));

// Alice fait taire bob : plus de présence, plus de défi, plus de message.
await seed('blocages/alice', { bloques: ['bob'] });
await attendu('bloqué : bob ne voit plus la présence d\'alice', false, getDoc(doc(bob, 'presence/alice')));
await attendu('bloqué : bob ne défie plus alice', false, setDoc(doc(collection(bob, 'defis')), { from: 'bob', to: 'alice', status: 'pending', peerId: 'paisho-bbbbbbbb', nomDe: 'Bob', createdAt: serverTimestamp() }));
await attendu('bloqué : bob n\'écrit plus à alice', false, addDoc(collection(bob, 'conversations/alice__bob/messages'), { uid: 'bob', text: 'hé', createdAt: serverTimestamp() }));

await attendu('file : eve prend sa place', true, setDoc(doc(eve, 'file-attente/eve'), { peerId: 'paisho-eeeeeeee', nom: 'Eve', createdAt: serverTimestamp() }));
await attendu('file : bob marque eve prise', true, updateDoc(doc(bob, 'file-attente/eve'), { prisPar: 'bob' }));
await attendu('file : alice ne reprend pas une place prise', false, updateDoc(doc(alice, 'file-attente/eve'), { prisPar: 'alice' }));

console.log(echecs ? `${echecs} échec(s)` : 'Toutes les vérifications passent.');
process.exit(echecs ? 1 : 0);
