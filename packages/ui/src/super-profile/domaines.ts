// domaines.ts : le nom de domaine personnel d'un Profil Pro.
//
// domaines/{hostname} { uid, slug, creeLe, verifie }. Le hostname (en
// minuscules, sans protocole ni chemin) est l'identifiant du document, ce
// qui rend resoudreHostname() une simple lecture par id : c'est cette
// fonction que l'intégration appellera pour décider, à la racine du site,
// quel Profil Pro servir pour un domaine qui n'est pas celui du Salon.
//
// Le branchement réel du domaine (les enregistrements DNS, Firebase
// Hosting) est un geste d'Alex dans la console : ce fichier ne fait que
// réserver le nom côté Firestore et le lire.

import { getApp } from 'firebase/app';
import {
    getFirestore, doc, getDoc, deleteDoc, runTransaction, serverTimestamp, query,
    collection, where, getDocs, limit,
} from 'firebase/firestore';

export interface DomaineClaim {
    uid: string;
    slug: string;
    creeLe?: any;
    verifie: boolean;
}

/** 'moncoinartiste.com', jamais 'https://www.MonCoinArtiste.com/'. */
export function normaliserHostname(raw: string): string {
    let h = raw.trim().toLowerCase();
    h = h.replace(/^https?:\/\//, '');
    h = h.split('/')[0];
    h = h.replace(/^www\./, '');
    return h;
}

export type ValidationHostname =
    | { ok: true }
    | { ok: false; reason: 'vide' | 'invalide' | 'reserve' };

const HOTES_RESERVES = new Set([
    'inconnus-salon.web.app', 'inconnus-salon.firebaseapp.com',
    'lesalondesinconnus.com', 'www.lesalondesinconnus.com', 'localhost',
]);

export function validerHostname(raw: string): ValidationHostname {
    const h = normaliserHostname(raw);
    if (!h) return { ok: false, reason: 'vide' };
    if (HOTES_RESERVES.has(h)) return { ok: false, reason: 'reserve' };
    // Un domaine minimal : au moins un point, pas d'espace, caractères de nom
    // d'hôte seulement.
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h)) return { ok: false, reason: 'invalide' };
    return { ok: true };
}

/** Le domaine déjà réservé par cet uid, s'il en a un. */
export async function domaineDe(uid: string): Promise<{ hostname: string; claim: DomaineClaim } | null> {
    const db = getFirestore(getApp());
    const q = query(collection(db, 'domaines'), where('uid', '==', uid), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { hostname: d.id, claim: d.data() as DomaineClaim };
}

/**
 * Réserve `hostname` pour `uid`, dans une transaction : un seul domaine par
 * uid, et le nom ne peut pas déjà appartenir à quelqu'un d'autre. Libère
 * l'ancien domaine de l'uid s'il en changeait.
 */
export async function reserverDomaine(uid: string, slug: string, hostnameBrut: string): Promise<void> {
    const validation = validerHostname(hostnameBrut);
    if (validation.ok === false) throw new Error(`Nom de domaine ${validation.reason}.`);
    const hostname = normaliserHostname(hostnameBrut);
    const db = getFirestore(getApp());

    await runTransaction(db, async (tx) => {
        const nouveauRef = doc(db, 'domaines', hostname);
        const nouveauSnap = await tx.get(nouveauRef);
        if (nouveauSnap.exists() && (nouveauSnap.data() as DomaineClaim).uid !== uid) {
            throw new Error('Ce domaine est déjà réservé par un autre profil.');
        }
        // Ancien domaine du même uid, sous un autre nom : on le libère.
        const ancien = await domaineDe(uid);
        if (ancien && ancien.hostname !== hostname) {
            tx.delete(doc(db, 'domaines', ancien.hostname));
        }
        tx.set(nouveauRef, {
            uid,
            slug,
            verifie: nouveauSnap.exists() ? (nouveauSnap.data() as DomaineClaim).verifie : false,
            creeLe: nouveauSnap.exists() ? (nouveauSnap.data() as any).creeLe : serverTimestamp(),
        });
    });
}

export async function retirerDomaine(uid: string, hostname: string): Promise<void> {
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, 'domaines', hostname));
    if (!snap.exists()) return;
    if ((snap.data() as DomaineClaim).uid !== uid) return;
    await deleteDoc(doc(db, 'domaines', hostname));
}

/** Résout un hostname vers le slug de Profil Pro à servir. Utilisé à la
 *  racine du site pour tout domaine qui n'est pas celui du Salon. */
export async function resoudreHostname(hostnameBrut: string): Promise<string | null> {
    const hostname = normaliserHostname(hostnameBrut);
    const db = getFirestore(getApp());
    const snap = await getDoc(doc(db, 'domaines', hostname));
    if (!snap.exists()) return null;
    return (snap.data() as DomaineClaim).slug ?? null;
}
