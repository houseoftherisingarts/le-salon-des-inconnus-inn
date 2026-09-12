// ─── Le mur du studio ──────────────────────────────────────────────────
// Un seul fil, 'studio', ouvert à tout membre connecté. Porté de Terre
// Sauvage (lui-même du festival médiéval), avec deux différences : les
// photos passent par Storage (pas de data URL logée dans Firestore, le
// Salon a un vrai bucket), et les compteurs de votes/commentaires se
// comptent côté client par abonnement à la sous-collection — aucun index
// composite, aucune Cloud Function.
//
//   mur/{postId}                        { uid, nom, avatarUrl?, texte, photoURL?, fil, creeLe }
//   mur/{postId}/votes/{voterUid}       { valeur, nom, majLe }
//   mur/{postId}/commentaires/{cid}     { uid, nom, avatarUrl?, texte, creeLe }
import { getApp } from 'firebase/app';
import {
    getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot, query, where,
    limit as fsLimit, serverTimestamp, type Timestamp,
} from 'firebase/firestore';

const COL = 'mur';
export const LONGUEUR_MAX_POST = 2000;
export const LONGUEUR_MAX_COMMENTAIRE = 1000;

function db() {
    return getFirestore(getApp());
}

export interface PostMur {
    id: string;
    uid: string;
    nom: string;
    avatarUrl?: string;
    texte: string;
    photoURL?: string;
    fil: 'studio';
    creeLe: Timestamp | null;
}

export async function publierSurLeMur(opts: {
    uid: string; nom: string; avatarUrl?: string; texte: string; photoURL?: string;
}): Promise<string> {
    const texte = opts.texte.trim().slice(0, LONGUEUR_MAX_POST);
    if (!texte && !opts.photoURL) throw new Error('Rien à publier.');
    const id = doc(collection(db(), COL)).id;
    await setDoc(doc(db(), COL, id), {
        uid: opts.uid,
        nom: opts.nom,
        ...(opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
        texte,
        ...(opts.photoURL ? { photoURL: opts.photoURL } : {}),
        fil: 'studio',
        creeLe: serverTimestamp(),
    });
    return id;
}

export async function retirerDuMur(postId: string): Promise<void> {
    await deleteDoc(doc(db(), COL, postId));
}

/** Le mur au complet, trié côté client (le plus récent en premier). */
export function suivreLeMur(cb: (posts: PostMur[]) => void, max = 100): () => void {
    const q = query(collection(db(), COL), where('fil', '==', 'studio'), fsLimit(max));
    return onSnapshot(q, (snap) => {
        const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PostMur));
        posts.sort((a, b) => (b.creeLe?.toMillis?.() ?? 0) - (a.creeLe?.toMillis?.() ?? 0));
        cb(posts);
    }, () => cb([]));
}

/** Les billets d'une seule personne — le mur de l'onglet « Mon mur ». */
export function suivrePublicationsDe(uid: string, cb: (posts: PostMur[]) => void, max = 50): () => void {
    const q = query(collection(db(), COL), where('uid', '==', uid), fsLimit(max));
    return onSnapshot(q, (snap) => {
        const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PostMur));
        posts.sort((a, b) => (b.creeLe?.toMillis?.() ?? 0) - (a.creeLe?.toMillis?.() ?? 0));
        cb(posts);
    }, () => cb([]));
}

// ── Votes ────────────────────────────────────────────────────────────

export interface Decompte { pour: number; contre: number; score: number; }

/** 1 = pour, -1 = contre, 0 = retire le vote. */
export async function voter(postId: string, uid: string, nom: string, valeur: 1 | -1 | 0): Promise<void> {
    const r = doc(db(), COL, postId, 'votes', uid);
    if (valeur === 0) { await deleteDoc(r); return; }
    await setDoc(r, { valeur, nom, majLe: serverTimestamp() });
}

export function suivreVotes(postId: string, monUid: string | null, cb: (d: Decompte, monVote: 1 | -1 | 0) => void): () => void {
    return onSnapshot(collection(db(), COL, postId, 'votes'), (snap) => {
        let pour = 0, contre = 0; let mien: 1 | -1 | 0 = 0;
        snap.forEach((d) => {
            const v = d.data().valeur;
            if (v === 1) pour++; else if (v === -1) contre++;
            if (monUid && d.id === monUid && (v === 1 || v === -1)) mien = v;
        });
        cb({ pour, contre, score: pour - contre }, mien);
    }, () => cb({ pour: 0, contre: 0, score: 0 }, 0));
}

// ── Commentaires ─────────────────────────────────────────────────────

export interface CommentaireMur {
    id: string;
    uid: string;
    nom: string;
    avatarUrl?: string;
    texte: string;
    creeLe: Timestamp | null;
}

export async function publierCommentaire(postId: string, opts: {
    uid: string; nom: string; avatarUrl?: string; texte: string;
}): Promise<string> {
    const texte = opts.texte.trim().slice(0, LONGUEUR_MAX_COMMENTAIRE);
    if (!texte) throw new Error('Rien à publier.');
    const id = doc(collection(db(), COL, postId, 'commentaires')).id;
    await setDoc(doc(db(), COL, postId, 'commentaires', id), {
        uid: opts.uid,
        nom: opts.nom,
        ...(opts.avatarUrl ? { avatarUrl: opts.avatarUrl } : {}),
        texte,
        creeLe: serverTimestamp(),
    });
    return id;
}

export function suivreCommentaires(postId: string, cb: (commentaires: CommentaireMur[]) => void): () => void {
    return onSnapshot(collection(db(), COL, postId, 'commentaires'), (snap) => {
        const liste = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CommentaireMur));
        liste.sort((a, b) => (a.creeLe?.toMillis?.() ?? 0) - (b.creeLe?.toMillis?.() ?? 0));
        cb(liste);
    }, () => cb([]));
}

export async function retirerCommentaire(postId: string, cid: string): Promise<void> {
    await deleteDoc(doc(db(), COL, postId, 'commentaires', cid));
}
