import { getApp } from 'firebase/app';
import {
  getFirestore, collection, doc, getDoc, setDoc, addDoc, query, orderBy, onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

function db() {
  return getFirestore(getApp());
}

export interface MessageSoutien {
  id: string;
  auteur: 'membre' | 'equipe';
  texte: string;
  creeLe: string;
}

function toIso(v: unknown): string {
  if (v && typeof (v as { toDate?: unknown }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return '';
}

// Le fil d'aide : un document parent soutien/{uid} (nom, courriel) et une
// sous-collection de messages, lus en ordre chronologique.
export function suivreFilSoutien(uid: string, cb: (messages: MessageSoutien[]) => void): () => void {
  const q = query(collection(db(), 'soutien', uid, 'messages'), orderBy('creeLe', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({
      id: d.id,
      auteur: d.data().auteur === 'equipe' ? 'equipe' : 'membre',
      texte: typeof d.data().texte === 'string' ? d.data().texte : '',
      creeLe: toIso(d.data().creeLe),
    })));
  }, () => cb([]));
}

// Crée le parent s'il n'existe pas, puis dépose le message. Le parent ne se crée
// qu'une fois (la règle refuse la mise à jour par le membre).
export async function envoyerMessageSoutien(uid: string, nom: string, courriel: string, texte: string): Promise<void> {
  const parent = doc(db(), 'soutien', uid);
  try {
    if (!(await getDoc(parent)).exists) {
      await setDoc(parent, { uid, nom, courriel, creeLe: serverTimestamp() });
    }
  } catch { /* le parent existe déjà, ou la création a été refusée */ }
  await addDoc(collection(db(), 'soutien', uid, 'messages'), {
    auteur: 'membre',
    texte: texte.slice(0, 4000),
    creeLe: serverTimestamp(),
  });
}
