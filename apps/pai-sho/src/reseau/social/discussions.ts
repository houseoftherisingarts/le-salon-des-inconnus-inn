// ─── Les discussions : à deux et en salon ───────────────────────────
// À deux : les fils conversations/{a__b} du kit (ouvrirConversation),
// les mêmes que la boîte du Salon lit, avec la même forme de message
// { uid, displayName, photoURL, text, createdAt }. En groupe :
// salons/{id} { nom, owner, members, createdAt } et sa sous-collection
// messages, propres au jeu. Les règles bornent le texte à 2 000 signes.

import {
  addDoc, arrayRemove, arrayUnion, collection, doc, getCountFromServer, getFirestore, limitToLast, onSnapshot,
  orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, type Unsubscribe,
} from 'firebase/firestore';

export const TEXTE_MAX = 2000;
export const NOM_SALON_MAX = 40;
export const SALON_MAX_MEMBRES = 20;

export interface MessageFil {
  id: string;
  uid: string;
  displayName?: string;
  text: string;
  createdAt?: Timestamp | null;
}

export interface Salon {
  id: string;
  nom: string;
  owner: string;
  members: string[];
  noms?: Record<string, string>;
}

/** Un fil : 'dm' pour conversations/{id}, 'salon' pour salons/{id}. */
export interface Fil { type: 'dm' | 'salon'; id: string; titre: string; autreUid?: string }

const racine = (f: Pick<Fil, 'type' | 'id'>) => (f.type === 'dm' ? ['conversations', f.id] : ['salons', f.id]) as [string, string];

export function suivreMessages(f: Pick<Fil, 'type' | 'id'>, cb: (m: MessageFil[]) => void): Unsubscribe {
  const q = query(collection(getFirestore(), ...racine(f), 'messages'), orderBy('createdAt', 'asc'), limitToLast(100));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MessageFil, 'id'>) }))), () => cb([]));
}

export async function envoyerMessage(f: Pick<Fil, 'type' | 'id'>, uid: string, nom: string, texte: string): Promise<void> {
  const text = texte.trim().slice(0, TEXTE_MAX);
  if (!text) return;
  const db = getFirestore();
  await addDoc(collection(db, ...racine(f), 'messages'), { uid, displayName: nom, photoURL: null, text, createdAt: serverTimestamp() });
  await updateDoc(doc(db, ...racine(f)), { lastMessage: text.slice(0, 140), lastMessageAt: serverTimestamp() });
}

export function suivreMesSalons(uid: string, cb: (s: Salon[]) => void): Unsubscribe {
  const q = query(collection(getFirestore(), 'salons'), where('members', 'array-contains', uid));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Salon, 'id'>) }))), () => cb([]));
}

export async function creerSalon(uid: string, monNom: string, nom: string, invites: { uid: string; nom: string }[]): Promise<string> {
  const propre = nom.trim().slice(0, NOM_SALON_MAX);
  const membres = [uid, ...invites.map((i) => i.uid).filter((u) => u !== uid)].slice(0, SALON_MAX_MEMBRES);
  const noms = Object.fromEntries([[uid, monNom], ...invites.map((i) => [i.uid, i.nom])]);
  const r = doc(collection(getFirestore(), 'salons'));
  await setDoc(r, { nom: propre, owner: uid, members: membres, noms, createdAt: serverTimestamp() });
  return r.id;
}

export async function inviterAuSalon(id: string, autre: { uid: string; nom: string }): Promise<void> {
  await updateDoc(doc(getFirestore(), 'salons', id), { members: arrayUnion(autre.uid), [`noms.${autre.uid}`]: autre.nom });
}

export async function quitterSalon(id: string, uid: string): Promise<void> {
  await updateDoc(doc(getFirestore(), 'salons', id), { members: arrayRemove(uid) });
}

export interface ConversationJeu { id: string; autreUid: string; autreNom: string; quand: number; lu: number; nonLu: boolean }

/** Tous mes fils à deux, le plus récent en tête (le tri se fait ici : la
 *  requête reste sur un seul champ, sans index composite). */
export function suivreConversations(uid: string, cb: (c: ConversationJeu[]) => void): Unsubscribe {
  const q = query(collection(getFirestore(), 'conversations'), where('members', 'array-contains', uid));
  return onSnapshot(q, (s) => cb(s.docs.map((d) => {
    const c = d.data() as { members?: string[]; memberProfiles?: Record<string, { displayName?: string }>; lastMessageAt?: Timestamp; lastReadAt?: Record<string, Timestamp> };
    const autreUid = (c.members ?? []).find((m) => m !== uid) ?? '';
    const quand = c.lastMessageAt?.toMillis?.() ?? 0;
    const lu = c.lastReadAt?.[uid]?.toMillis?.() ?? 0;
    return { id: d.id, autreUid, autreNom: c.memberProfiles?.[autreUid]?.displayName || '…', quand, lu, nonLu: quand > lu };
  }).filter((c) => c.autreUid).sort((a, b) => b.quand - a.quand)), () => cb([]));
}

/** Le nombre de messages arrivés dans un fil depuis ma dernière lecture. */
export async function compterNonLus(id: string, depuis: number): Promise<number> {
  const q = query(collection(getFirestore(), 'conversations', id, 'messages'), where('createdAt', '>', Timestamp.fromMillis(depuis)));
  return (await getCountFromServer(q)).data().count;
}
