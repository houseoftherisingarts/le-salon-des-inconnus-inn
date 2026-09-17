import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

// Préférences privées (members/{uid}/prive/preferences). Les noms de champs sont
// ceux de la règle Firestore (5.1 b) : courrielReponseEquipe et
// courrielNouveauMessage, pas les anciens courrielEquipe/courrielMessages.

export interface Preferences {
  langue: 'FR' | 'EN';
  banniere?: string;
  courrielReponseEquipe: boolean;
  courrielNouveauMessage: boolean;
}

export interface Coordonnees {
  telephone: string;
}

export async function lirePreferences(uid: string): Promise<Preferences | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'members', uid, 'prive', 'preferences'));
  if (snap.exists()) {
    return snap.data() as Preferences;
  }
  return null;
}

export async function ecrirePreferences(uid: string, data: Partial<Preferences>): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'members', uid, 'prive', 'preferences');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...data, majLe: serverTimestamp() });
  } else {
    await setDoc(ref, {
      langue: 'FR',
      courrielReponseEquipe: true,
      courrielNouveauMessage: false,
      ...data,
      majLe: serverTimestamp(),
    });
  }
}

export async function lireCoordonnees(uid: string): Promise<Coordonnees | null> {
  if (!db) return null;
  const snap = await getDoc(doc(db, 'members', uid, 'prive', 'coordonnees'));
  if (snap.exists()) {
    return snap.data() as Coordonnees;
  }
  return null;
}

export async function ecrireCoordonnees(uid: string, telephone: string): Promise<void> {
  if (!db) return;
  const ref = doc(db, 'members', uid, 'prive', 'coordonnees');
  await setDoc(ref, { telephone, majLe: serverTimestamp() }, { merge: true });
}
