// ─── Ouvrir une conversation ─────────────────────────────────────────
// ArtistHub (COLLABORATE) lit et écrit déjà dans conversations/{id} et sa
// sous-collection messages, mais rien n'y crée encore une conversation.
// Ce fichier ajoute ce geste, avec le même identifiant idempotent que les
// amitiés (paire d'uid triée) : rouvrir « Écrire » sur la même personne
// retombe toujours sur le même fil.
import { getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { peutEcrireA } from './moderation';

function db() {
    return getFirestore(getApp());
}

export const cleConversation = (a: string, b: string): string => [a, b].sort().join('__');

/** Crée le fil s'il n'existe pas, ou rafraîchit les noms/photos au passage.
 *  Refuse silencieusement (retourne null) si l'une des deux personnes a
 *  fait taire l'autre. */
export async function ouvrirConversation(
    meUid: string, meNom: string, mePhoto: string | null | undefined,
    autreUid: string, autreNom: string, autrePhoto?: string | null,
): Promise<string | null> {
    if (meUid === autreUid) return null;
    if (!(await peutEcrireA(meUid, autreUid))) return null;
    const id = cleConversation(meUid, autreUid);
    await setDoc(doc(db(), 'conversations', id), {
        type: 'dm',
        members: [meUid, autreUid].sort(),
        memberProfiles: {
            [meUid]: { displayName: meNom, photoURL: mePhoto ?? null },
            [autreUid]: { displayName: autreNom, photoURL: autrePhoto ?? null },
        },
    }, { merge: true });
    return id;
}
