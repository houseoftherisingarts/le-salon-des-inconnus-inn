// ─── L'échelle des adversaires ──────────────────────────────────────
// Alex, 4 octobre 2026 : « you unlock the opponents by winning, like
// Super Smash ». Une marche s'ouvre dès qu'une des deux figures de la
// marche d'avant est battue, et chaque adversaire battu devient un
// visage que le joueur peut porter. Iroh fait exception : ses deux
// habits ne se gagnent qu'en battant le dernier, parce qu'être Iroh est
// l'honneur. Tout se garde sur l'appareil.

import { ADVERSAIRES, ECHELONS } from './adversaires';

const CLE = 'paisho.progression';

export function battus(): string[] {
  try {
    const l: unknown = JSON.parse(localStorage.getItem(CLE) ?? '[]');
    return Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : [];
  } catch { return []; }
}
export const estBattu = (id: string): boolean => battus().includes(id);
export const echelonDe = (id: string): number => ECHELONS.findIndex((e) => e.includes(id));
export const echelonOuvert = (i: number): boolean => i === 0 || (i > 0 && ECHELONS[i - 1].some(estBattu));
export const adversaireOuvert = (id: string): boolean => echelonOuvert(echelonDe(id));
export const toutBattu = (): boolean => ADVERSAIRES.every((a) => estBattu(a.id));
export const avatarOuvert = (id: string): boolean => (id === 'iroh' || id === 'irohek' ? estBattu('irohek') : estBattu(id));
/** Le premier adversaire ouvert et pas encore battu, dans l'ordre de la montée. */
export const prochainDefi = (): string => ECHELONS.flat().find((id) => adversaireOuvert(id) && !estBattu(id)) ?? 'irohek';

export interface Deblocage {
  perso: string;
  /** Les visages gagnés par cette victoire. */
  avatars: string[];
  /** La marche qui vient de s'ouvrir, s'il y en a une. */
  defis: string[];
  honneur: boolean;
}

/** Inscrit une victoire; rend ce qu'elle ouvre, ou null si elle n'ouvre rien de neuf. */
export function enregistrerVictoire(id: string): Deblocage | null {
  const avant = battus();
  const i = echelonDe(id);
  if (i < 0 || avant.includes(id)) return null;
  try { localStorage.setItem(CLE, JSON.stringify([...avant, id])); } catch { /* privé */ }
  const defis = avant.some((b) => ECHELONS[i].includes(b)) ? [] : [...(ECHELONS[i + 1] ?? [])];
  const avatars = id === 'irohek' ? ['irohek', 'iroh'] : id === 'iroh' ? [] : [id];
  return avatars.length === 0 && defis.length === 0 ? null : { perso: id, avatars, defis, honneur: id === 'irohek' };
}
