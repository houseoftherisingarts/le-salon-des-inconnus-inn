// ─── La tenue du studio ──────────────────────────────────────────────
// Chacun peut faire taire quelqu'un et signaler un billet, un commentaire
// ou un membre à l'équipe. Porté de Terre Sauvage.
//
//   blocages/{uid}      { bloques: [uid, uid, …] }   la liste de la personne
//   signalements/{id}   un billet, un commentaire ou un membre rapporté
import { getApp } from 'firebase/app';
import {
    getFirestore, addDoc, arrayRemove, arrayUnion, collection, doc, getDoc, onSnapshot,
    serverTimestamp, setDoc,
} from 'firebase/firestore';

function db() {
    return getFirestore(getApp());
}

export const LONGUEUR_MAX_SIGNALEMENT = 2000;

export function suivreBlocages(uid: string, cb: (bloques: string[]) => void): () => void {
    return onSnapshot(
        doc(db(), 'blocages', uid),
        (snap) => cb((snap.data()?.bloques as string[]) || []),
        () => cb([]),
    );
}

export async function bloquer(moi: string, autre: string): Promise<void> {
    if (moi === autre) return;
    await setDoc(doc(db(), 'blocages', moi), { bloques: arrayUnion(autre) }, { merge: true });
}

export async function debloquer(moi: string, autre: string): Promise<void> {
    await setDoc(doc(db(), 'blocages', moi), { bloques: arrayRemove(autre) }, { merge: true });
}

export type CibleSignalee = 'post' | 'commentaire' | 'membre';

export interface Signalement {
    parUid: string;
    parNom: string;
    cible: CibleSignalee;
    cibleId: string;
    raison: string;
}

export async function signaler(s: Signalement): Promise<void> {
    await addDoc(collection(db(), 'signalements'), {
        ...s,
        raison: s.raison.slice(0, LONGUEUR_MAX_SIGNALEMENT),
        creeLe: serverTimestamp(),
        traite: false,
    });
}

/** Vérifie le blocage avant tout envoi de message privé, dans les deux
 *  sens : si l'un des deux a fait taire l'autre, rien ne part. */
export async function peutEcrireA(moiUid: string, autreUid: string): Promise<boolean> {
    const [maListe, sonneListe] = await Promise.all([
        new Promise<string[]>((resolve) => {
            const off = suivreBlocages(moiUid, (b) => { resolve(b); off(); });
        }),
        new Promise<string[]>((resolve) => {
            const off = suivreBlocages(autreUid, (b) => { resolve(b); off(); });
        }),
    ]);
    return !maListe.includes(autreUid) && !sonneListe.includes(moiUid);
}
