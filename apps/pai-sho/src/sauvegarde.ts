// ─── La partie en cours, gardée sur l'appareil ──────────────────────
// Après chaque coup, la liste des coups en texte s'écrit ici. Reprendre
// rejoue cette liste à travers l'arbitre : un coup qui ne passe plus
// arrête la relecture là où elle en était, sans rien casser.

import { appliquerCoup, etatInitial } from './jeu/arbitre';
import { coupDepuisTexte, type Camp, type EtatPaiSho } from './jeu/logic';
import type { Niveau } from './moteur/niveaux';

export type Mode = 'maison' | 'deux' | 'distance';

export interface Config {
  mode: Mode;
  niveau: Niveau;
  /** Le camp du joueur de cet appareil (contre la maison, à distance). */
  campLocal: Camp;
  noms: Record<Camp, string>;
  /** À deux sur ce Mac : la table tourne vers le joueur au trait. */
  tourner: boolean;
}

export interface Sauvegarde {
  mode: Mode;
  niveau: Niveau;
  camps: { local: Camp };
  noms: Record<Camp, string>;
  tourner: boolean;
  coups: string[];
  date: string;
}

const CLE = 'paisho.partie';

export function sauver(c: Config, coups: string[]): void {
  const s: Sauvegarde = {
    mode: c.mode, niveau: c.niveau, camps: { local: c.campLocal }, noms: c.noms,
    tourner: c.tourner, coups, date: new Date().toISOString(),
  };
  try { localStorage.setItem(CLE, JSON.stringify(s)); } catch { /* navigation privée */ }
}

export function lireSauvegarde(): Sauvegarde | null {
  try {
    const s = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Sauvegarde | null;
    return s && Array.isArray(s.coups) && s.mode !== 'distance' ? s : null;
  } catch { return null; }
}

export function effacerSauvegarde(): void {
  try { localStorage.removeItem(CLE); } catch { /* rien à effacer */ }
}

export const configDepuis = (s: Sauvegarde): Config => ({
  mode: s.mode, niveau: s.niveau, campLocal: s.camps.local, noms: s.noms, tourner: s.tourner ?? true,
});

/** Rejoue une liste de coups. Rend l'état atteint et les coups gardés. */
export function rejouer(coups: string[]): { etat: EtatPaiSho; coups: string[] } {
  let e = etatInitial();
  const gardes: string[] = [];
  for (const t of coups) {
    let suivant: EtatPaiSho;
    try { suivant = appliquerCoup(e, coupDepuisTexte(t)); } catch { break; }
    if (suivant === e) break;
    e = suivant;
    gardes.push(t);
  }
  return { etat: e, coups: gardes };
}
