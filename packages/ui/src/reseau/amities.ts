// ─── Les amitiés ───────────────────────────────────────────────────────
// Réutilise la collection friendships que le COLLABORATE d'ArtistHub lit
// déjà (uids triés, requestedBy, status, profiles). Ce fichier ajoute
// seulement ce qui manquait : demander, accepter, refuser, et un
// abonnement réutilisable pour ProfilSocial (onglet « Mes amis ») et
// PageMembre (bouton « Demander en ami »).
//
//   friendships/{uidA_uidB} { uids: [a, b], requestedBy, status, profiles? }
import { getApp } from 'firebase/app';
import {
    getFirestore, collection, doc, deleteDoc, onSnapshot, query, setDoc, updateDoc,
    serverTimestamp, where,
} from 'firebase/firestore';

function db() {
    return getFirestore(getApp());
}

export type StatutAmitie = 'pending' | 'accepted';

export interface Amitie {
    id: string;
    uids: string[];
    requestedBy: string;
    status: StatutAmitie;
    profiles?: Record<string, { displayName?: string; photoURL?: string | null }>;
}

export const cleAmitie = (a: string, b: string): string => [a, b].sort().join('_');

export async function demanderAmitie(
    moi: string, moiNom: string, moiPhoto: string | undefined,
    autre: string, autreNom: string, autrePhoto?: string,
): Promise<void> {
    if (moi === autre) return;
    await setDoc(doc(db(), 'friendships', cleAmitie(moi, autre)), {
        uids: [moi, autre].sort(),
        requestedBy: moi,
        status: 'pending' as StatutAmitie,
        profiles: {
            [moi]: { displayName: moiNom, photoURL: moiPhoto ?? null },
            [autre]: { displayName: autreNom, photoURL: autrePhoto ?? null },
        },
    }, { merge: true });
}

export async function accepterAmitie(moi: string, autre: string): Promise<void> {
    await updateDoc(doc(db(), 'friendships', cleAmitie(moi, autre)), {
        status: 'accepted' as StatutAmitie,
        acceptedAt: serverTimestamp(),
    });
}

/** Refuse une demande reçue, ou retire une amitié déjà acceptée. */
export async function retirerAmitie(moi: string, autre: string): Promise<void> {
    await deleteDoc(doc(db(), 'friendships', cleAmitie(moi, autre)));
}

export function suivreMesAmities(uid: string, cb: (liens: Amitie[]) => void): () => void {
    const q = query(collection(db(), 'friendships'), where('uids', 'array-contains', uid));
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Amitie)));
    }, () => cb([]));
}

export function estAmi(liens: Amitie[], moi: string, autre: string): boolean {
    return liens.some((l) => l.status === 'accepted' && l.uids.includes(moi) && l.uids.includes(autre));
}

export function amitieEnAttente(liens: Amitie[], moi: string, autre: string): Amitie | undefined {
    return liens.find((l) => l.status === 'pending' && l.uids.includes(moi) && l.uids.includes(autre));
}
