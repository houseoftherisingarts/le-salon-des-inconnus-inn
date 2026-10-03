// ─── Le plateau du Pai Sho ──────────────────────────────────────────
// La géométrie seule, calculée une fois au chargement. Un point est un
// entier, son indice dans le carré de 17 sur 17 : i = (x + 8) + (y + 8) * 17,
// avec x vers l'est, y vers la porte du nord et le centre en (0,0).
// Les tables qui suivent servent à chaque nœud de la recherche, d'où
// les tableaux typés plutôt que des objets.

export type Pt = number;

export const COTE = 17;
export const NB_CASES = COTE * COTE;

export const indice = (x: number, y: number): Pt => (x + 8) + (y + 8) * COTE;
export const coordX = (i: Pt): number => (i % COTE) - 8;
export const coordY = (i: Pt): number => Math.floor(i / COTE) - 8;
export const coord = (i: Pt): { x: number; y: number } => ({ x: coordX(i), y: coordY(i) });

export function estJouable(x: number, y: number): boolean {
  return Math.abs(x) <= 8 && Math.abs(y) <= 8 && Math.abs(x) + Math.abs(y) <= 12;
}

/** Les drapeaux de zone. Un point qui touche deux jardins porte les deux. */
export const ROUGE = 1;
export const BLANC = 2;
export const NEUTRE = 4;
export const PORTE = 8;

/** Les 249 points jouables, du sud-ouest au nord-est. */
export const POINTS: readonly Pt[] = (() => {
  const t: Pt[] = [];
  for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) if (estJouable(x, y)) t.push(indice(x, y));
  return t;
})();

function zonesCalculees(x: number, y: number): number {
  if (!estJouable(x, y)) return 0;
  const s = Math.abs(x) + Math.abs(y);
  if ((x === 0 && Math.abs(y) === 8) || (y === 0 && Math.abs(x) === 8)) return PORTE;
  if (s >= 8) return NEUTRE;
  const surAxe = x === 0 || y === 0;
  if (s === 7) {
    if (surAxe) return ROUGE | BLANC | NEUTRE;
    return (x * y > 0 ? ROUGE : BLANC) | NEUTRE;
  }
  if (surAxe) return ROUGE | BLANC;
  return x * y > 0 ? ROUGE : BLANC;
}

/** Les zones de chaque point, 0 hors du plateau. */
export const ZONES: Uint8Array = (() => {
  const z = new Uint8Array(NB_CASES);
  for (const i of POINTS) z[i] = zonesCalculees(coordX(i), coordY(i));
  return z;
})();

export type NomZone = 'rouge' | 'blanc' | 'neutre' | 'porte' | 'centre';

/**
 * Le nom d'une zone pour l'affichage. Les points des médianes à
 * l'intérieur du losange touchent le rouge et le blanc à la fois : ils
 * acceptent les deux couleurs, donc ils se rangent sous « neutre ».
 * `ZONES` garde le détail pour qui en a besoin.
 */
export function zone(x: number, y: number): NomZone {
  if (x === 0 && y === 0) return 'centre';
  const z = ZONES[indice(x, y)];
  if (z & PORTE) return 'porte';
  if (z === ROUGE) return 'rouge';
  if (z === BLANC) return 'blanc';
  return 'neutre';
}

export const estPorte = (i: Pt): boolean => ZONES[i] === PORTE;
export const estJardinRougePur = (i: Pt): boolean => ZONES[i] === ROUGE;
export const estJardinBlancPur = (i: Pt): boolean => ZONES[i] === BLANC;
export const estSurMediane = (x: number, y: number): boolean => x === 0 || y === 0;

export const CENTRE: Pt = indice(0, 0);

/** Nord, est, sud, ouest. */
export const PORTES: readonly Pt[] = [indice(0, 8), indice(8, 0), indice(0, -8), indice(-8, 0)];
export const PORTE_HOTE: Pt = indice(0, -8);
export const PORTE_INVITE: Pt = indice(0, 8);

/** Les quatre directions : nord, est, sud, ouest. La direction opposée est d ^ 2. */
const DX = [0, 1, 0, -1];
const DY = [1, 0, -1, 0];

/** SUIVANT[d * 289 + i] : le point voisin dans la direction d, ou -1. */
export const SUIVANT: Int16Array = (() => {
  const t = new Int16Array(4 * NB_CASES).fill(-1);
  for (const i of POINTS) {
    for (let d = 0; d < 4; d++) {
      const x = coordX(i) + DX[d], y = coordY(i) + DY[d];
      if (estJouable(x, y)) t[d * NB_CASES + i] = indice(x, y);
    }
  }
  return t;
})();

/** Les voisins orthogonaux jouables d'un point. */
export const VOISINS: readonly (readonly Pt[])[] = (() => {
  const t: Pt[][] = [];
  for (let i = 0; i < NB_CASES; i++) {
    t.push([]);
    for (let d = 0; d < 4; d++) { const j = SUIVANT[d * NB_CASES + i]; if (j >= 0) t[i].push(j); }
  }
  return t;
})();
export const voisins = (i: Pt): readonly Pt[] => VOISINS[i];

/** Les huit cases autour, dans le sens des aiguilles d'une montre en
 *  partant du nord. Une case hors du plateau vaut -1 : la roue en a
 *  besoin pour savoir qu'une tuile tomberait dans le vide. */
const ROND_DX = [0, 1, 1, 1, 0, -1, -1, -1];
const ROND_DY = [1, 1, 0, -1, -1, -1, 0, 1];
export const ROND: readonly (readonly Pt[])[] = (() => {
  const t: Pt[][] = [];
  for (let i = 0; i < NB_CASES; i++) {
    const x = coordX(i), y = coordY(i);
    t.push(ROND_DX.map((dx, k) => (estJouable(x + dx, y + ROND_DY[k]) ? indice(x + dx, y + ROND_DY[k]) : -1)));
  }
  return t;
})();

/** Les huit cases autour qui existent, sans les trous. */
export const AUTOUR: readonly (readonly Pt[])[] = ROND.map((r) => r.filter((j) => j >= 0));

/** Les points d'une ligne à partir de i (exclu), dans la direction d. */
export function ligne(i: Pt, d: number): Pt[] {
  const t: Pt[] = [];
  for (let j = SUIVANT[d * NB_CASES + i]; j >= 0; j = SUIVANT[d * NB_CASES + j]) t.push(j);
  return t;
}

/** Le texte d'un point, « x,y », préparé d'avance pour les noms de coups. */
export const TEXTE_PT: readonly string[] = Array.from({ length: NB_CASES }, (_, i) => `${coordX(i)},${coordY(i)}`);
