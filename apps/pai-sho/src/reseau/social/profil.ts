// ─── Le profil de joueur ────────────────────────────────────────────
// Deux étages. members/{uid} porte ce que le Salon partage déjà (nom,
// bio), écrit par majMembre du kit. members/{uid}/paisho/profil porte ce
// qui n'appartient qu'au jeu : l'avatar (une statuette gagnée), la
// bannière (une des salles du jeu), la campagne et le bilan en ligne.
// La photo du compte Salon n'est jamais remplacée par une statuette.

import { doc, getFirestore, increment, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { DECORS } from '../../skins';

export interface ProfilJeu {
  avatar?: string;
  banniere?: string;
  battus?: number;
  victoires?: number;
  defaites?: number;
}

export const BIO_JEU_MAX = 200;
export const BANNIERES = DECORS.map((d) => d.id);
export const imageBanniere = (id: string | undefined): string =>
  `${import.meta.env.BASE_URL}scenes/${BANNIERES.includes(id as never) ? id : 'taverne'}-salle.jpg`;

const ref = (uid: string) => doc(getFirestore(), 'members', uid, 'paisho', 'profil');

export function suivreProfilJeu(uid: string, cb: (p: ProfilJeu) => void): Unsubscribe {
  return onSnapshot(ref(uid), (s) => cb((s.data() as ProfilJeu) ?? {}), () => cb({}));
}

/** Écrit les champs du jeu, bornés ici comme dans firestore.rules. */
export async function majProfilJeu(uid: string, p: Pick<ProfilJeu, 'avatar' | 'banniere' | 'battus'>): Promise<void> {
  const d: Record<string, unknown> = {};
  if (p.avatar !== undefined) d.avatar = p.avatar.slice(0, 32);
  if (p.banniere !== undefined) d.banniere = p.banniere.slice(0, 32);
  if (p.battus !== undefined) d.battus = Math.max(0, Math.min(99, Math.round(p.battus)));
  await setDoc(ref(uid), d, { merge: true });
}

/** Une partie à distance finie compte au bilan, si le joueur est connecté. */
export function compterPartieEnLigne(gagnee: boolean): void {
  const u = getAuth().currentUser;
  if (!u) return;
  void setDoc(ref(u.uid), gagnee ? { victoires: increment(1) } : { defaites: increment(1) }, { merge: true }).catch(() => {});
}
