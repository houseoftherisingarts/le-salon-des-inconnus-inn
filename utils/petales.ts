// Les pétales du Café-jeux : la monnaie que l'on gagne en jouant au Pai Sho et
// qui débloque les parures. Solde et parures vivent dans le localStorage du
// site (même origine que le jeu encadré, qui lit `paisho.debloques`).

export const CLE_PETALES = 'salon.petales';
export const CLE_DEBLOQUES = 'paisho.debloques';

export type MessagePartie = {
  type: 'paisho:partie';
  gagnee: boolean;
  contre: 'maison' | 'deux' | 'distance';
  niveau: number;
};

/** Pétales gagnés pour une fin de partie annoncée par le jeu.
 *  20 la partie, 60 la victoire contre la maison, multipliés par niveau/5 à la
 *  maison; 20 à distance; rien à deux sur le même appareil. */
export function petalesPourPartie(m: unknown): number {
  const p = m as Partial<MessagePartie> | null;
  if (!p || p.type !== 'paisho:partie') return 0;
  if (p.contre === 'distance') return 20;
  if (p.contre !== 'maison') return 0;
  const niveau = Math.min(10, Math.max(1, Math.round(Number(p.niveau) || 1)));
  return Math.round(((p.gagnee === true) ? 60 : 20) * niveau / 5);
}

export function lireSolde(): number {
  try {
    const n = Number(localStorage.getItem(CLE_PETALES));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch { return 0; }
}

export function ecrireSolde(n: number): void {
  try { localStorage.setItem(CLE_PETALES, String(Math.max(0, Math.floor(n)))); } catch { /* navigation privée */ }
}

export function lireDebloques(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLE_DEBLOQUES) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}

export function ecrireDebloques(ids: string[]): void {
  try { localStorage.setItem(CLE_DEBLOQUES, JSON.stringify([...new Set(ids)])); } catch { /* navigation privée */ }
}
