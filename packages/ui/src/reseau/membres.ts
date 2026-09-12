// Le réseau social d'artistes du Creator Studio — la fiche de membre.
//
// members/{uid} porte deux générations de champs : ceux de la porte
// (displayName, email, photoURL, provider, joinedAt, lastSeenAt, écrits par
// ensureMember dans ./auth) et ceux du profil social ajoutés ici
// (banniereURL, bio, discipline, ville, liens). Les deux vivent dans le même
// document, celui que le reste du studio (artistProfile, admin/flags,
// superProfile) référence déjà par uid.
import { getApp } from 'firebase/app';
import {
    getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs,
    query, orderBy, limit as fsLimit, type Timestamp, type Unsubscribe,
} from 'firebase/firestore';

export interface MembreLiens {
    site?: string;
    instagram?: string;
    facebook?: string;
    autre?: string;
}

export interface MembreDoc {
    uid: string;
    displayName?: string;
    email?: string;
    photoURL?: string;
    banniereURL?: string;
    bio?: string;
    discipline?: string;
    ville?: string;
    liens?: MembreLiens;
    provider?: 'google' | 'email' | string;
    joinedAt?: Timestamp;
    lastSeenAt?: Timestamp;
}

export const BIO_MAX = 1000;
export const DISCIPLINE_MAX = 80;
export const VILLE_MAX = 80;
export const LIEN_MAX = 200;

function db() {
    return getFirestore(getApp());
}

/** Coupe une chaîne à la borne des règles, jamais l'inverse : on ne fait
 *  jamais confiance au client pour respecter la limite tout seul. */
function borne(s: string | undefined, max: number): string {
    return (s ?? '').trim().slice(0, max);
}

/** Un lien vide reste vide; un lien rempli doit commencer par https://,
 *  sinon on le refuse plutôt que d'écrire un lien javascript: ou http:. */
function validerLien(url: string | undefined): string {
    const v = (url ?? '').trim().slice(0, LIEN_MAX);
    if (!v) return '';
    return /^https:\/\//i.test(v) ? v : '';
}

export async function getMembre(uid: string): Promise<MembreDoc | null> {
    const snap = await getDoc(doc(db(), 'members', uid));
    return snap.exists() ? ({ uid, ...(snap.data() as any) } as MembreDoc) : null;
}

export function suivreMembre(uid: string, cb: (m: MembreDoc | null) => void): Unsubscribe {
    return onSnapshot(
        doc(db(), 'members', uid),
        (snap) => cb(snap.exists() ? ({ uid, ...(snap.data() as any) } as MembreDoc) : null),
        () => cb(null),
    );
}

/** Écrit les champs sociaux du profil (jamais les champs de la porte ni les
 *  drapeaux admin, qui vivent ailleurs). Les bornes sont vérifiées ici ET
 *  dans firestore.rules : la règle est la vraie barrière, ce contrôle évite
 *  simplement un aller-retour refusé pour rien. */
export async function majMembre(uid: string, patch: {
    displayName?: string;
    bio?: string;
    discipline?: string;
    ville?: string;
    liens?: MembreLiens;
    banniereURL?: string;
    photoURL?: string;
}): Promise<void> {
    const data: Record<string, unknown> = {};
    if (patch.displayName !== undefined) data.displayName = patch.displayName.trim().slice(0, 120);
    if (patch.bio !== undefined) data.bio = borne(patch.bio, BIO_MAX);
    if (patch.discipline !== undefined) data.discipline = borne(patch.discipline, DISCIPLINE_MAX);
    if (patch.ville !== undefined) data.ville = borne(patch.ville, VILLE_MAX);
    if (patch.banniereURL !== undefined) data.banniereURL = patch.banniereURL;
    if (patch.photoURL !== undefined) data.photoURL = patch.photoURL;
    if (patch.liens !== undefined) {
        data.liens = {
            site: validerLien(patch.liens.site),
            instagram: validerLien(patch.liens.instagram),
            facebook: validerLien(patch.liens.facebook),
            autre: validerLien(patch.liens.autre),
        };
    }
    await setDoc(doc(db(), 'members', uid), data, { merge: true });
}

/** Liste bornée, pour un futur annuaire ou un outil admin — triée par date
 *  d'arrivée, la plus récente en premier. */
export async function listerMembres(max = 200): Promise<MembreDoc[]> {
    const snap = await getDocs(
        query(collection(db(), 'members'), orderBy('joinedAt', 'desc'), fsLimit(max)),
    );
    return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) } as MembreDoc));
}
