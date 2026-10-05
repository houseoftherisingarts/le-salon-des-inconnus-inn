// ─── Défis, file d'attente et tables ouvertes ───────────────────────
// Les trois chemins finissent au même endroit : le lien PeerJS de
// src/reseau/pair.ts. Celui qui attend tient déjà la table ouverte sous
// son identifiant de joueur; celui qui arrive la rejoint.
//
//   defis/{id}             { from, to, status, peerId, nomDe, createdAt }
//   file-attente/{uid}     { peerId, nom, createdAt, prisPar? }
//   salles-ouvertes/{uid}  { peerId, nom, createdAt }
//
// Un défi meurt au bout de deux minutes sans réponse. La file renonce au
// bout de 90 secondes. Aucun serveur TURN : un lien qui ne s'ouvre pas en
// 20 secondes se dit tel quel, avec de quoi réessayer.

import {
  collection, deleteDoc, doc, getDocs, getFirestore, limit, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, setDoc, updateDoc, where, type Timestamp, type Unsubscribe,
} from 'firebase/firestore';

export const DEFI_MS = 120_000;
export const FILE_MS = 90_000;
export const LIEN_MS = 20_000;

export type StatutDefi = 'pending' | 'accepted' | 'declined' | 'expired';

export interface Defi {
  id: string;
  from: string;
  to: string;
  status: StatutDefi;
  peerId: string;
  nomDe: string;
  createdAt?: Timestamp | null;
}

const db = () => getFirestore();
const ms = (t: Timestamp | null | undefined): number => t?.toMillis?.() ?? Date.now();

// ── Défier un ami ────────────────────────────────────────────────────

export async function lancerDefi(moi: string, nomDe: string, peerId: string, ami: string): Promise<string> {
  const r = doc(collection(db(), 'defis'));
  await setDoc(r, { from: moi, to: ami, status: 'pending', peerId, nomDe, createdAt: serverTimestamp() });
  // La cloche du Salon l'annonce aussi; un refus des règles n'empêche pas le défi.
  void setDoc(doc(collection(db(), 'notifications', ami, 'items')), {
    type: 'defi', deUid: moi, deNom: nomDe, texte: `${nomDe} · Pai Sho`, creeLe: serverTimestamp(), lu: false,
  }).catch(() => {});
  return r.id;
}

export const repondreDefi = (id: string, status: StatutDefi) => updateDoc(doc(db(), 'defis', id), { status });

export function suivreDefi(id: string, cb: (d: Defi | null) => void): Unsubscribe {
  return onSnapshot(doc(db(), 'defis', id), (s) => cb(s.exists() ? ({ id: s.id, ...s.data() } as Defi) : null), () => cb(null));
}

/** Les défis reçus encore vivants (moins de deux minutes). */
export function suivreDefisRecus(uid: string, cb: (d: Defi[]) => void): Unsubscribe {
  const q = query(collection(db(), 'defis'), where('to', '==', uid), where('status', '==', 'pending'));
  return onSnapshot(q, (s) => cb(
    s.docs.map((d) => ({ id: d.id, ...d.data() } as Defi)).filter((d) => Date.now() - ms(d.createdAt) < DEFI_MS),
  ), () => cb([]));
}

// ── La file d'attente ────────────────────────────────────────────────

interface Place { uid: string; peerId: string; nom: string; createdAt?: Timestamp | null; prisPar?: string }

export async function entrerFile(uid: string, nom: string, peerId: string): Promise<void> {
  await setDoc(doc(db(), 'file-attente', uid), { peerId, nom, createdAt: serverTimestamp() });
}

export const quitterFile = (uid: string) => deleteDoc(doc(db(), 'file-attente', uid)).catch(() => {});

/** Ma place : `prisPar` dit qu'un autre joueur m'a choisi et me rejoint. */
export function suivrePlace(uid: string, cb: (p: Place | null) => void): Unsubscribe {
  return onSnapshot(doc(db(), 'file-attente', uid), (s) => cb(s.exists() ? ({ uid, ...s.data() } as Place) : null), () => cb(null));
}

/**
 * Cherche le plus ancien joueur libre arrivé avant moi et le prend, dans
 * une transaction : deux joueurs ne peuvent pas prendre le même. Rend le
 * joueur pris (dont on rejoint la table), ou null.
 */
export async function apparier(uid: string, nom: string, bloques: string[]): Promise<Place | null> {
  const s = await getDocs(query(collection(db(), 'file-attente'), orderBy('createdAt', 'asc'), limit(20)));
  const mienne = s.docs.find((d) => d.id === uid);
  const avant = ms(mienne?.data().createdAt as Timestamp | undefined);
  const libres = s.docs
    .map((d) => ({ uid: d.id, ...d.data() } as Place))
    .filter((p) => p.uid !== uid && !p.prisPar && !bloques.includes(p.uid) && ms(p.createdAt) <= avant && Date.now() - ms(p.createdAt) < FILE_MS);
  for (const p of libres) {
    try {
      const pris = await runTransaction(db(), async (tx) => {
        const r = doc(db(), 'file-attente', p.uid);
        const frais = await tx.get(r);
        if (!frais.exists() || frais.data().prisPar) return false;
        tx.update(r, { prisPar: uid });
        tx.set(doc(collection(db(), 'defis')), { from: uid, to: p.uid, status: 'accepted', peerId: p.peerId, nomDe: nom, createdAt: serverTimestamp() });
        return true;
      });
      if (pris) { await quitterFile(uid); return p; }
    } catch { /* pris par un autre entre-temps : le suivant */ }
  }
  return null;
}

// ── Les tables ouvertes ──────────────────────────────────────────────

export async function publierTable(uid: string, nom: string, peerId: string): Promise<void> {
  await setDoc(doc(db(), 'salles-ouvertes', uid), { peerId, nom, createdAt: serverTimestamp() });
}

export const retirerTable = (uid: string) => deleteDoc(doc(db(), 'salles-ouvertes', uid)).catch(() => {});
