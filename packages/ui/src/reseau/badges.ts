// Les badges du réseau d'artistes. L'admin décerne (bouton dans ROSTER);
// chaque membre choisit sa vitrine de cinq badges parmi ceux qu'il a reçus.
//
//   badges/{uid} { obtenus: { [badgeId]: Timestamp }, exposes: [badgeId, …] }
import { getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, onSnapshot, setDoc, type Timestamp } from 'firebase/firestore';

export interface BadgeInfo { id: string; nom: string; nomEn: string; icone: string; }

export const CATALOGUE_BADGES: Record<string, BadgeInfo> = {
    'premiere-oeuvre': { id: 'premiere-oeuvre', nom: 'Première œuvre', nomEn: 'First work', icone: '🎨' },
    'premier-billet': { id: 'premier-billet', nom: 'Premier billet', nomEn: 'First post', icone: '📝' },
    'cent-votes': { id: 'cent-votes', nom: 'Cent votes reçus', nomEn: '100 votes received', icone: '⭐' },
    'collaborateur': { id: 'collaborateur', nom: 'Collaborateur', nomEn: 'Collaborator', icone: '🤝' },
    'mecene': { id: 'mecene', nom: 'Mécène', nomEn: 'Patron', icone: '🏛️' },
    'expose-au-salon': { id: 'expose-au-salon', nom: 'Exposé au Salon', nomEn: 'Exhibited at the Salon', icone: '🖼️' },
    'profil-complet': { id: 'profil-complet', nom: 'Profil complet', nomEn: 'Complete profile', icone: '✔️' },
    'profil-pro': { id: 'profil-pro', nom: 'Profil Pro', nomEn: 'Pro Profile', icone: '💎' },
};

export const MAX_VITRINE = 5;

export interface MesBadges { obtenus: Record<string, Timestamp>; exposes: string[]; }

function db() {
    return getFirestore(getApp());
}

export async function getBadgesDe(uid: string): Promise<MesBadges> {
    const snap = await getDoc(doc(db(), 'badges', uid));
    if (!snap.exists()) return { obtenus: {}, exposes: [] };
    const data = snap.data() as any;
    return { obtenus: data.obtenus || {}, exposes: Array.isArray(data.exposes) ? data.exposes : [] };
}

export function suivreBadgesDe(uid: string, cb: (b: MesBadges) => void): () => void {
    return onSnapshot(doc(db(), 'badges', uid), (snap) => {
        if (!snap.exists()) { cb({ obtenus: {}, exposes: [] }); return; }
        const data = snap.data() as any;
        cb({ obtenus: data.obtenus || {}, exposes: Array.isArray(data.exposes) ? data.exposes : [] });
    }, () => cb({ obtenus: {}, exposes: [] }));
}

/** L'admin décerne ou retire un badge. */
export async function decernerBadge(uid: string, badgeId: string, donner: boolean): Promise<void> {
    const actuel = await getBadgesDe(uid);
    const obtenus: Record<string, unknown> = { ...actuel.obtenus };
    if (donner) obtenus[badgeId] = new Date();
    else delete obtenus[badgeId];
    await setDoc(doc(db(), 'badges', uid), { obtenus }, { merge: true });
}

/** Le membre choisit sa vitrine — cinq badges au plus, tous déjà obtenus. */
export async function exposerBadges(uid: string, badgeIds: string[]): Promise<void> {
    const actuel = await getBadgesDe(uid);
    const valides = badgeIds.filter((id) => id in actuel.obtenus).slice(0, MAX_VITRINE);
    await setDoc(doc(db(), 'badges', uid), { exposes: valides }, { merge: true });
}
