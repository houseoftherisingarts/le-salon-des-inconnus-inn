// ─── La cloche ───────────────────────────────────────────────────────
// Trois sources se combinent dans le panneau : les notifications écrites
// par le client qui commente ou vote sur le billet d'un autre, les
// messages non lus (conversations existantes du COLLABORATE), et les
// demandes d'amitié en attente (friendships existantes). Les deux
// dernières collections existent déjà (ArtistHub les lit depuis
// longtemps) : on ne fait ici que les relire pour la cloche, sans rien
// changer à leur forme.
import { getApp } from 'firebase/app';
import {
    getFirestore, collection, doc, onSnapshot, query, where, orderBy,
    limit as fsLimit, setDoc, serverTimestamp, type Timestamp,
} from 'firebase/firestore';

function db() {
    return getFirestore(getApp());
}

// ── Notifications écrites (commentaire / vote / badge) ────────────────

export type TypeNotification = 'commentaire' | 'vote' | 'badge' | 'parrainage';

export interface ItemNotification {
    id: string;
    type: TypeNotification;
    deUid: string;
    deNom: string;
    postId?: string;
    texte: string;
    creeLe: Timestamp | null;
    lu: boolean;
}

/** Écrite par la personne qui agit (commente ou vote), jamais par le
 *  destinataire : la règle interdit d'écrire une notification pour
 *  soi-même — inutile de prévenir qui vient de faire le geste. */
export async function envoyerNotification(destinataireUid: string, opts: {
    deUid: string; deNom: string; type: TypeNotification; texte: string; postId?: string;
}): Promise<void> {
    if (destinataireUid === opts.deUid) return;
    const id = doc(collection(db(), 'notifications', destinataireUid, 'items')).id;
    await setDoc(doc(db(), 'notifications', destinataireUid, 'items', id), {
        type: opts.type,
        deUid: opts.deUid,
        deNom: opts.deNom,
        ...(opts.postId ? { postId: opts.postId } : {}),
        texte: opts.texte.slice(0, 300),
        creeLe: serverTimestamp(),
        lu: false,
    });
}

export function suivreNotifications(uid: string, cb: (items: ItemNotification[]) => void, max = 10): () => void {
    const q = query(
        collection(db(), 'notifications', uid, 'items'),
        orderBy('creeLe', 'desc'),
        fsLimit(max),
    );
    return onSnapshot(q, (snap) => {
        cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as ItemNotification)));
    }, () => cb([]));
}

export async function marquerNotificationLue(uid: string, itemId: string): Promise<void> {
    await setDoc(doc(db(), 'notifications', uid, 'items', itemId), { lu: true }, { merge: true });
}

// ── Messages non lus (conversations) ───────────────────────────────────

interface ConversationBrute {
    id: string;
    members: string[];
    memberProfiles?: Record<string, { displayName: string; photoURL?: string }>;
    lastMessage?: string;
    lastMessageAt?: Timestamp | null;
    lastReadAt?: Record<string, Timestamp>;
}

export interface ConversationNonLue {
    id: string;
    autreUid: string;
    autreNom: string;
    dernierMessage: string;
    quand: number;
}

/** Une conversation compte comme non lue quand personne n'a encore posé de
 *  lastReadAt pour moi, ou que le dernier message est plus récent que ma
 *  dernière lecture. */
export function suivreMessagesNonLus(uid: string, cb: (conv: ConversationNonLue[]) => void): () => void {
    const q = query(collection(db(), 'conversations'), where('members', 'array-contains', uid));
    return onSnapshot(q, (snap) => {
        const nonLues: ConversationNonLue[] = [];
        snap.forEach((d) => {
            const c = { id: d.id, ...(d.data() as any) } as ConversationBrute;
            const dernier = c.lastMessageAt?.toMillis?.() ?? 0;
            if (!dernier) return;
            const luLe = c.lastReadAt?.[uid]?.toMillis?.() ?? 0;
            if (dernier <= luLe) return;
            const autreUid = (c.members || []).find((m) => m !== uid) || '';
            const autreNom = c.memberProfiles?.[autreUid]?.displayName || 'Un membre';
            nonLues.push({ id: c.id, autreUid, autreNom, dernierMessage: c.lastMessage || '', quand: dernier });
        });
        nonLues.sort((a, b) => b.quand - a.quand);
        cb(nonLues);
    }, () => cb([]));
}

/** Pose lastReadAt[uid] à l'ouverture d'une conversation — merge, donc ne
 *  touche à rien d'autre sur le document. */
export async function marquerConversationLue(convId: string, uid: string): Promise<void> {
    await setDoc(doc(db(), 'conversations', convId), { lastReadAt: { [uid]: serverTimestamp() } }, { merge: true });
}

// ── Demandes d'amitié en attente ───────────────────────────────────────

interface FriendshipBrute {
    id: string;
    uids: string[];
    requestedBy: string;
    status: 'pending' | 'accepted';
    profiles?: Record<string, { displayName?: string; photoURL?: string | null }>;
}

export interface DemandeAmitie {
    id: string;
    deUid: string;
    deNom: string;
}

export function suivreDemandesAmitieEnAttente(uid: string, cb: (demandes: DemandeAmitie[]) => void): () => void {
    const q = query(collection(db(), 'friendships'), where('uids', 'array-contains', uid));
    return onSnapshot(q, (snap) => {
        const demandes: DemandeAmitie[] = [];
        snap.forEach((d) => {
            const f = { id: d.id, ...(d.data() as any) } as FriendshipBrute;
            if (f.status !== 'pending' || f.requestedBy === uid) return;
            demandes.push({ id: f.id, deUid: f.requestedBy, deNom: f.profiles?.[f.requestedBy]?.displayName || 'Un membre' });
        });
        cb(demandes);
    }, () => cb([]));
}
