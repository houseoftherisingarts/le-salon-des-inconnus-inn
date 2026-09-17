import { getApp } from 'firebase/app';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, query, where,
  serverTimestamp, type Timestamp,
} from 'firebase/firestore';

function db() {
  return getFirestore(getApp());
}

// ─── 6.9 Parrainage (mécanisme porté, sans récompense) ──────────────────────
// Le code vit dans codesParrain/{CODE} ({ uid, creeLe }), la liste des invités
// dans parrainages/{filleulUid} ({ parrainUid, code, filleulNom, creeLe }) et
// le compteur dans parrainagesCompte/{uid} ({ n, majLe }, écrit par la fonction).

export interface Filleul {
  id: string;
  nom: string;
  creeLe: string; // ISO, '' si absent
  valide: boolean;
}

function toIso(v: unknown): string {
  if (v && typeof (v as { toDate?: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

// Génère un code de 8 caractères [A-Z0-9].
function genererCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

// Retrouve le code du membre, ou en crée un s'il n'en a pas encore.
export async function trouverOuCreerCode(uid: string): Promise<string> {
  const q = query(collection(db(), 'codesParrain'), where('uid', '==', uid));
  const existants = await getDocs(q);
  if (!existants.empty) return existants.docs[0].id;

  for (let essai = 0; essai < 6; essai++) {
    const code = genererCode();
    const ref = doc(db(), 'codesParrain', code);
    if ((await getDoc(ref)).exists) continue;
    await setDoc(ref, { uid, creeLe: serverTimestamp() });
    return code;
  }
  throw new Error('Impossible de générer un code unique.');
}

// Le lien d'invitation : l'adresse /compte avec le code en paramètre.
export function lienInvitation(code: string): string {
  return `https://www.lesalondesinconnus.com/compte?parrain=${code}`;
}

// La liste des filleuls (parrains = moi), triée côté client sur la date.
export async function lireFilleuls(uid: string): Promise<Filleul[]> {
  const q = query(collection(db(), 'parrainages'), where('parrainUid', '==', uid));
  const snap = await getDocs(q);
  const liste: Filleul[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      nom: typeof data.filleulNom === 'string' ? data.filleulNom : '',
      creeLe: toIso(data.creeLe),
      valide: data.valide === true,
    };
  });
  liste.sort((a, b) => (b.creeLe || '').localeCompare(a.creeLe || ''));
  return liste;
}

// Le parrainage dont je suis le filleul, s'il existe.
export async function lireMonParrainage(uid: string): Promise<{ code: string; parrainUid: string } | null> {
  const snap = await getDoc(doc(db(), 'parrainages', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { code: typeof d.code === 'string' ? d.code : '', parrainUid: typeof d.parrainUid === 'string' ? d.parrainUid : '' };
}

// Le compteur tenu par la fonction (parrainagesCompte/{uid}.n).
export async function lireNbFilleuls(uid: string): Promise<number> {
  const snap = await getDoc(doc(db(), 'parrainagesCompte', uid));
  const n = Number(snap.data()?.n ?? 0);
  return Number.isFinite(n) ? n : 0;
}

// Réclame un code retenu (sessionStorage) à la création du compte. Lit le
// propriétaire du code, puis écrit parrainages/{uid}. La règle refuse toute
// entrée incohérente (code inexistant, parrain = soi-même, déjà parrainé).
export async function reclaimerCodeParrain(uid: string, nom: string, code: string): Promise<void> {
  const codeNormal = (code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6,10}$/.test(codeNormal)) return;
  const ref = doc(db(), 'parrainages', uid);
  if ((await getDoc(ref)).exists) return;

  const codeSnap = await getDoc(doc(db(), 'codesParrain', codeNormal));
  if (!codeSnap.exists) return;
  const parrainUid = typeof codeSnap.data().uid === 'string' ? codeSnap.data().uid : '';
  if (!parrainUid || parrainUid === uid) return;

  try {
    await setDoc(ref, {
      parrainUid,
      code: codeNormal,
      filleulNom: (nom || '').slice(0, 120),
      creeLe: serverTimestamp(),
    });
  } catch {
    // La règle a refusé : on ne bloque jamais la connexion pour un parrainage.
  }
}
