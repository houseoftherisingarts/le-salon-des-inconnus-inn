// ─── Les règles du Pai Sho (jeu de base du Skud) ────────────────────
// Tout est pur. L'état est un objet ordinaire qui passe le clonage
// structuré tel quel : le plateau est un texte de 289 caractères, un par
// case du carré 17 x 17, ce qui rend la copie et la clé de position
// presque gratuites. Référence des règles :
// ~/Documents/Onyx/30_library/pai-sho-skud-regles.md

import {
  AUTOUR, CENTRE, NB_CASES, NEUTRE, POINTS, PORTE_HOTE, PORTE_INVITE, PORTES, ROND, ROUGE, BLANC,
  SUIVANT, TEXTE_PT, VOISINS, ZONES, coordX, coordY, estPorte, indice, type Pt,
} from './plateau';

export type { Pt } from './plateau';

export type Camp = 'hote' | 'invite';
export type TypeTuile =
  | 'R3' | 'R4' | 'R5' | 'W3' | 'W4' | 'W5'
  | 'LOTUS' | 'ORCHIDEE' | 'ROCHER' | 'ROUE' | 'RENOUEE' | 'BARQUE';

/** L'ordre compte : les six fleurs de base suivent le cercle d'harmonie. */
export const TYPES: readonly TypeTuile[] = [
  'R3', 'R4', 'R5', 'W3', 'W4', 'W5', 'LOTUS', 'ORCHIDEE', 'ROCHER', 'ROUE', 'RENOUEE', 'BARQUE',
];
export const BASES = TYPES.slice(0, 6) as readonly TypeTuile[];
export const SPECIALES: readonly TypeTuile[] = ['LOTUS', 'ORCHIDEE'];
export const ACCENTS: readonly TypeTuile[] = ['ROCHER', 'ROUE', 'RENOUEE', 'BARQUE'];

export interface Tuile { type: TypeTuile; camp: Camp }

export type Bonus =
  /** Barque : `a` est la tuile visée; `vers` est l'endroit où la fleur
   *  visée est poussée (absent quand la barque vise un accent). */
  | { type: 'accent'; tuile: TypeTuile; a: Pt; vers?: Pt }
  | { type: 'special'; tuile: TypeTuile; porte: Pt }
  | { type: 'base'; tuile: TypeTuile; porte: Pt };

export type Coup =
  | { type: 'planter'; tuile: TypeTuile; porte: Pt }
  | { type: 'deplacer'; de: Pt; a: Pt; bonus?: Bonus };

export interface Harmonie { a: Pt; b: Pt; camp: Camp }

export type Verdict =
  | { type: 'victoire'; camp: Camp; raison: 'anneau' | 'medianes' | 'blocage' }
  | { type: 'nulle'; raison: 'anneaux' | 'medianes' | 'repetition' | 'compteur' };

export interface EtatPaiSho {
  /** Une lettre par case (indice de plateau.ts), '.' pour le vide.
   *  Hôte en majuscules, invité en minuscules : voir LETTRES. */
  cases: string;
  reserve: Record<Camp, Record<TypeTuile, number>>;
  tour: Camp;
  /** Demi-coups joués depuis le début, les deux plantations d'ouverture comprises. */
  numero: number;
  /** Tuiles prises PAR chaque camp. */
  captures: Record<Camp, number>;
  /** Demi-coups depuis la dernière plantation, prise ou pose d'accent. */
  sansProgres: number;
  /** Positions (plateau + trait) depuis le dernier progrès, la courante en dernier. */
  vues: string[];
  verdict: Verdict | null;
}

/** Garde-fous de l'arbitre, appliqués dans `jouer` pour que la recherche les voie. */
export const DEMI_COUPS_SANS_PROGRES = 200;
export const REPETITIONS_NULLES = 3;

// ─── Le codage des cases ────────────────────────────────────────────

const LETTRES = 'ABCDEFLORWKT';
const VIDE = 46; // '.'
const T_LOTUS = 6, T_ORCHIDEE = 7, T_ROCHER = 8, T_ROUE = 9, T_RENOUEE = 10, T_BARQUE = 11;
const DISTANCE = [3, 4, 5, 3, 4, 5, 2, 6];

/** Type (0 à 11) et camp (0 hôte, 1 invité) d'un code de caractère. */
const T_DE = new Int8Array(128).fill(-1);
const C_DE = new Int8Array(128).fill(-1);
for (let t = 0; t < 12; t++) {
  T_DE[LETTRES.charCodeAt(t)] = t; C_DE[LETTRES.charCodeAt(t)] = 0;
  T_DE[LETTRES.toLowerCase().charCodeAt(t)] = t; C_DE[LETTRES.toLowerCase().charCodeAt(t)] = 1;
}
const lettre = (t: number, c: number): string => (c === 0 ? LETTRES[t] : LETTRES[t].toLowerCase());
const CAMPS: readonly Camp[] = ['hote', 'invite'];
const numCamp = (c: Camp): number => (c === 'hote' ? 0 : 1);
const tIndex = (t: TypeTuile): number => TYPES.indexOf(t);

const poser = (s: string, i: Pt, ch: string): string => s.slice(0, i) + ch + s.slice(i + 1);

/** Clash : deux fleurs de base opposées sur le cercle. */
const clashT = (a: number, b: number): boolean => a <= 5 && b <= 5 && (a - b + 6) % 6 === 3;
const harmT = (a: number, b: number): boolean => a <= 5 && b <= 5 && ((a - b + 6) % 6 === 1 || (a - b + 6) % 6 === 5);

export function HARMONIE_PAIRE(a: TypeTuile, b: TypeTuile): boolean {
  const x = tIndex(a), y = tIndex(b);
  if (x === T_LOTUS) return y <= 5;
  if (y === T_LOTUS) return x <= 5;
  return harmT(x, y);
}
export const CONFLIT_PAIRE = (a: TypeTuile, b: TypeTuile): boolean => clashT(tIndex(a), tIndex(b));

/** Une fleur de base rouge ne finit pas dans un jardin blanc pur, et
 *  l'inverse. Les fleurs spéciales et les accents vont partout, sauf
 *  sur une porte. */
function peutSeTenir(t: number, i: Pt): boolean {
  const z = ZONES[i];
  if (z === 0 || estPorte(i)) return false;
  if (t <= 2) return (z & (ROUGE | NEUTRE)) !== 0;
  if (t <= 5) return (z & (BLANC | NEUTRE)) !== 0;
  return true;
}

/** La première case occupée dans la direction d, ou -1. */
function premier(s: string, i: Pt, d: number): Pt {
  const base = d * NB_CASES;
  for (let j = SUIVANT[base + i]; j >= 0; j = SUIVANT[base + j]) if (s.charCodeAt(j) !== VIDE) return j;
  return -1;
}

/** Une fleur de base en fleur (hors porte) à cet endroit ? Rend son type ou -1. */
function baseEnFleur(s: string, i: Pt): number {
  if (i < 0 || estPorte(i)) return -1;
  const t = T_DE[s.charCodeAt(i)];
  return t >= 0 && t <= 5 ? t : -1;
}

/**
 * Le plateau contient-il un clash qui passe par le point i ? Quand i est
 * occupé, on regarde ses quatre premiers voisins de ligne; quand il est
 * vide, on regarde les deux paires de tuiles qu'il séparait. Appliqué à
 * toutes les cases qu'un coup a changées, ce test vaut le test complet,
 * puisque la position d'avant ne contenait aucun clash.
 */
function clashPar(s: string, i: Pt): boolean {
  if (s.charCodeAt(i) !== VIDE) {
    const t = baseEnFleur(s, i);
    if (t < 0) return false;
    for (let d = 0; d < 4; d++) {
      const u = baseEnFleur(s, premier(s, i, d));
      if (u >= 0 && clashT(t, u)) return true;
    }
    return false;
  }
  for (let d = 0; d < 2; d++) {
    const u = baseEnFleur(s, premier(s, i, d));
    if (u < 0) continue;
    const v = baseEnFleur(s, premier(s, i, d + 2));
    if (v >= 0 && clashT(u, v)) return true;
  }
  return false;
}

// ─── Lotus, orchidée, pièges ────────────────────────────────────────

/** Le lotus de ce camp est-il en fleur (sur le plateau, hors porte) ? */
function lotusEnFleur(s: string, c: number): boolean {
  const i = s.indexOf(lettre(T_LOTUS, c));
  return i >= 0 && !estPorte(i);
}

/** Les tuiles d'un camp piégées par l'orchidée en fleur de l'autre. */
function piegeesPar(s: string, victime: number): Set<Pt> | null {
  const o = s.indexOf(lettre(T_ORCHIDEE, 1 - victime));
  if (o < 0 || estPorte(o)) return null;
  const p = new Set<Pt>();
  for (const j of AUTOUR[o]) {
    const ch = s.charCodeAt(j);
    if (ch !== VIDE && C_DE[ch] === victime && T_DE[ch] <= T_ORCHIDEE) p.add(j);
  }
  return p;
}

function peutPrendre(ta: number, ca: number, tb: number, cb: number, sauvageA: boolean, sauvageB: boolean): boolean {
  if (ca === cb || ta > T_ORCHIDEE || tb > T_ORCHIDEE) return false;
  if (ta === T_ORCHIDEE && sauvageA) return true;
  if (tb === T_ORCHIDEE) return sauvageB;
  if (ta === T_ORCHIDEE || ta === T_LOTUS || tb === T_LOTUS) return false;
  return clashT(ta, tb);
}

// ─── Les harmonies ──────────────────────────────────────────────────

interface Annulations { rocherLigne: Uint8Array; rocherColonne: Uint8Array; renouee: Uint8Array }

function annulations(s: string): Annulations {
  const a = { rocherLigne: new Uint8Array(17), rocherColonne: new Uint8Array(17), renouee: new Uint8Array(NB_CASES) };
  for (const ch of [lettre(T_ROCHER, 0), lettre(T_ROCHER, 1)]) {
    for (let i = s.indexOf(ch); i >= 0; i = s.indexOf(ch, i + 1)) {
      a.rocherLigne[coordY(i) + 8] = 1; a.rocherColonne[coordX(i) + 8] = 1;
    }
  }
  for (const ch of [lettre(T_RENOUEE, 0), lettre(T_RENOUEE, 1)]) {
    for (let i = s.indexOf(ch); i >= 0; i = s.indexOf(ch, i + 1)) for (const j of AUTOUR[i]) a.renouee[j] = 1;
  }
  return a;
}

/** Le camp qui possède l'harmonie entre i et j (j premier voisin de
 *  ligne de i), ou -1. Le lotus s'harmonise avec toute fleur de base,
 *  et l'harmonie revient au propriétaire de la fleur de base. */
function proprietaire(s: string, i: Pt, j: Pt, an: Annulations): number {
  if (j < 0 || estPorte(i) || estPorte(j)) return -1;
  const ci = s.charCodeAt(i), cj = s.charCodeAt(j);
  const ti = T_DE[ci], tj = T_DE[cj];
  let camp: number;
  if (ti <= 5 && tj <= 5) { if (C_DE[ci] !== C_DE[cj] || !harmT(ti, tj)) return -1; camp = C_DE[ci]; }
  else if (ti === T_LOTUS && tj <= 5) camp = C_DE[cj];
  else if (tj === T_LOTUS && ti <= 5) camp = C_DE[ci];
  else return -1;
  if (an.renouee[i] || an.renouee[j]) return -1;
  if (coordY(i) === coordY(j) ? an.rocherLigne[coordY(i) + 8] : an.rocherColonne[coordX(i) + 8]) return -1;
  return camp;
}

function harmoniesDe(s: string): Harmonie[] {
  const an = annulations(s);
  const h: Harmonie[] = [];
  for (const i of POINTS) {
    const t = T_DE[s.charCodeAt(i)];
    if (t < 0 || t > T_LOTUS) continue;
    for (let d = 0; d < 2; d++) { // nord et est : chaque paire une seule fois
      const j = premier(s, i, d);
      const c = proprietaire(s, i, j, an);
      if (c >= 0) h.push({ a: i, b: j, camp: CAMPS[c] });
    }
  }
  return h;
}

export const harmonies = (e: EtatPaiSho): Harmonie[] => harmoniesDe(e.cases);

/** Les partenaires d'harmonie de la tuile en i qui appartiennent au camp c. */
function partenaires(s: string, i: Pt, c: number, an: Annulations): Pt[] {
  const p: Pt[] = [];
  for (let d = 0; d < 4; d++) {
    const j = premier(s, i, d);
    if (proprietaire(s, i, j, an) === c) p.push(j);
  }
  return p;
}

/**
 * Le déplacement de i vers a crée-t-il une harmonie nouvelle pour le camp
 * c ? Une harmonie nouvelle touche soit la tuile déplacée, soit les deux
 * tuiles que sa case de départ séparait. Les accents ne bougent pas
 * pendant un arrangement, donc les annulations sont celles d'avant.
 */
function creeHarmonie(avant: string, apres: string, de: Pt, a: Pt, c: number, an: Annulations): boolean {
  const neuves = partenaires(apres, a, c, an);
  if (neuves.length > 0) {
    const anciennes = partenaires(avant, de, c, an);
    for (const p of neuves) if (!anciennes.includes(p)) return true;
  }
  for (let d = 0; d < 2; d++) {
    const u = premier(apres, de, d), v = premier(apres, de, d + 2);
    if (u < 0 || v < 0 || u === a || v === a) continue;
    if (proprietaire(apres, u, v, an) === c) return true;
  }
  return false;
}

/** Une harmonie qui passe par le centre ou s'y appuie ne compte pas pour l'anneau. */
function toucheCentre(h: Harmonie): boolean {
  const xa = coordX(h.a), ya = coordY(h.a), xb = coordX(h.b), yb = coordY(h.b);
  if (ya === 0 && yb === 0) return Math.min(xa, xb) <= 0 && Math.max(xa, xb) >= 0;
  if (xa === 0 && xb === 0) return Math.min(ya, yb) <= 0 && Math.max(ya, yb) >= 0;
  return false;
}

/**
 * Un anneau d'harmonie existe-t-il pour ce camp ? Chaque harmonie est une
 * arête entre deux tuiles. On tire un rayon du centre vers l'est, juste
 * au-dessus de la ligne y = 0 : une arête le croise quand elle est
 * verticale, à l'est du centre, et qu'elle enjambe y = 0. Une chaîne
 * fermée entoure le centre exactement quand elle croise ce rayon un
 * nombre impair de fois (nombre d'enroulement impair). Chercher un
 * cycle impair revient à colorier le graphe en deux couleurs avec ces
 * poids, ce qui se fait en un parcours.
 */
function anneauDans(h: readonly Harmonie[], camp: Camp): boolean {
  const aretes = h.filter((x) => x.camp === camp && !toucheCentre(x));
  if (aretes.length < 4) return false;
  const adj = new Map<Pt, [Pt, number][]>();
  for (const x of aretes) {
    const ya = coordY(x.a), yb = coordY(x.b);
    const w = coordX(x.a) === coordX(x.b) && coordX(x.a) > 0 && Math.min(ya, yb) <= 0 && Math.max(ya, yb) >= 1 ? 1 : 0;
    if (!adj.has(x.a)) adj.set(x.a, []);
    if (!adj.has(x.b)) adj.set(x.b, []);
    adj.get(x.a)!.push([x.b, w]);
    adj.get(x.b)!.push([x.a, w]);
  }
  const parite = new Map<Pt, number>();
  for (const depart of adj.keys()) {
    if (parite.has(depart)) continue;
    parite.set(depart, 0);
    const pile = [depart];
    while (pile.length) {
      const n = pile.pop()!;
      const p = parite.get(n)!;
      for (const [m, w] of adj.get(n)!) {
        const attendu = p ^ w;
        const vu = parite.get(m);
        if (vu === undefined) { parite.set(m, attendu); pile.push(m); }
        else if (vu !== attendu) return true;
      }
    }
  }
  return false;
}

export const anneauHarmonie = (e: EtatPaiSho, camp: Camp): boolean => anneauDans(harmoniesDe(e.cases), camp);

/** L'harmonie enjambe-t-elle une médiane, ses deux tuiles hors médianes ? */
export function estMediane(h: Harmonie): boolean {
  const xa = coordX(h.a), ya = coordY(h.a), xb = coordX(h.b), yb = coordY(h.b);
  if (ya === yb) return ya !== 0 && Math.min(xa, xb) < 0 && Math.max(xa, xb) > 0;
  return xa !== 0 && Math.min(ya, yb) < 0 && Math.max(ya, yb) > 0;
}

const medianesDans = (h: readonly Harmonie[], camp: Camp): number =>
  h.reduce((n, x) => n + (x.camp === camp && estMediane(x) ? 1 : 0), 0);

export const harmoniesMedianes = (e: EtatPaiSho, camp: Camp): number => medianesDans(harmoniesDe(e.cases), camp);

/** Les paires de fleurs de base en clash sur le plateau (vide dans toute position légale). */
export function conflits(e: EtatPaiSho): [Pt, Pt][] {
  const s = e.cases, r: [Pt, Pt][] = [];
  for (const i of POINTS) {
    const t = baseEnFleur(s, i);
    if (t < 0) continue;
    for (let d = 0; d < 2; d++) {
      const j = premier(s, i, d);
      const u = baseEnFleur(s, j);
      if (u >= 0 && clashT(t, u)) r.push([i, j]);
    }
  }
  return r;
}

// ─── L'état ─────────────────────────────────────────────────────────

const reserveInitiale = (): Record<TypeTuile, number> => ({
  R3: 3, R4: 3, R5: 3, W3: 3, W4: 3, W5: 3, LOTUS: 1, ORCHIDEE: 1, ROCHER: 1, ROUE: 1, RENOUEE: 1, BARQUE: 1,
});

const clePosition = (cases: string, tour: Camp): string => cases + (tour === 'hote' ? 'H' : 'I');

export function etatInitial(): EtatPaiSho {
  const cases = '.'.repeat(NB_CASES);
  return {
    cases,
    reserve: { hote: reserveInitiale(), invite: reserveInitiale() },
    tour: 'hote', numero: 0,
    captures: { hote: 0, invite: 0 },
    sansProgres: 0, vues: [clePosition(cases, 'hote')], verdict: null,
  };
}

export function tuileEn(e: EtatPaiSho, i: Pt): Tuile | null {
  const ch = e.cases.charCodeAt(i);
  return ch === VIDE ? null : { type: TYPES[T_DE[ch]], camp: CAMPS[C_DE[ch]] };
}

export function tuilesEnMain(e: EtatPaiSho, camp: Camp): { type: TypeTuile; nombre: number }[] {
  return TYPES.filter((t) => e.reserve[camp][t] > 0).map((t) => ({ type: t, nombre: e.reserve[camp][t] }));
}

export function tuilesPiegees(e: EtatPaiSho): Pt[] {
  return [...(piegeesPar(e.cases, 0) ?? []), ...(piegeesPar(e.cases, 1) ?? [])];
}

const basesEnReserve = (r: Record<TypeTuile, number>): number => r.R3 + r.R4 + r.R5 + r.W3 + r.W4 + r.W5;

// ─── La génération des coups ────────────────────────────────────────

/**
 * 'tout' : chaque coup légal, bonus compris (ce que voit le joueur).
 * 'ia' : chaque arrangement et chaque plantation, mais des bonus élagués
 * (voir cpu.ts et le README). Les coups sans bonus sont identiques.
 */
export type ModeGeneration = 'tout' | 'ia';

// Le parcours en largeur réutilise ses tableaux : aucune allocation par tuile.
const vu = new Int32Array(NB_CASES);
const dist = new Int8Array(NB_CASES);
const file = new Int16Array(NB_CASES);
let generationVu = 0;

const portesOuvertes = (s: string): Pt[] => PORTES.filter((p) => s.charCodeAt(p) === VIDE);

/** Les bonus permis après un arrangement, sur le plateau d'après. */
function bonusPossibles(s: string, me: number, r: Record<TypeTuile, number>, mode: ModeGeneration): Bonus[] {
  const b: Bonus[] = [];
  const ouvertes = portesOuvertes(s);
  for (const t of SPECIALES) if (r[t] > 0) for (const p of ouvertes) b.push({ type: 'special', tuile: t, porte: p });
  if (!PORTES.some((p) => s.charCodeAt(p) !== VIDE && C_DE[s.charCodeAt(p)] === me)) {
    for (const t of BASES) if (r[t] > 0) for (const p of ouvertes) b.push({ type: 'base', tuile: t, porte: p });
  }
  const ia = mode === 'ia';
  // L'IA ne pose ses accents qu'à côté d'une fleur adverse en fleur :
  // c'est là qu'ils gênent. Le joueur humain, lui, a tout le plateau.
  let cibles: Uint8Array | null = null;
  if (ia) {
    cibles = new Uint8Array(NB_CASES);
    for (const i of POINTS) {
      const ch = s.charCodeAt(i);
      if (ch !== VIDE && C_DE[ch] !== me && T_DE[ch] <= T_ORCHIDEE && !estPorte(i)) for (const j of AUTOUR[i]) cibles[j] = 1;
    }
  }
  const libre = (i: Pt) => s.charCodeAt(i) === VIDE && !estPorte(i) && (!cibles || cibles[i] === 1);
  for (const t of ['ROCHER', 'RENOUEE'] as const) {
    if (r[t] > 0) for (const i of POINTS) if (libre(i)) b.push({ type: 'accent', tuile: t, a: i });
  }
  if (r.ROUE > 0) for (const i of POINTS) if (libre(i) && rouer(s, i, me) !== null) b.push({ type: 'accent', tuile: 'ROUE', a: i });
  if (r.BARQUE > 0) {
    for (const i of POINTS) {
      const ch = s.charCodeAt(i);
      if (ch === VIDE || estPorte(i)) continue;
      const t = T_DE[ch];
      if (ia && C_DE[ch] === me) continue;
      if (t > T_ORCHIDEE) { b.push({ type: 'accent', tuile: 'BARQUE', a: i }); continue; }
      for (const v of AUTOUR[i]) {
        if (s.charCodeAt(v) !== VIDE || !peutSeTenir(t, v)) continue;
        const s2 = poser(poser(s, v, s[i]), i, lettre(T_BARQUE, me));
        if (!clashPar(s2, v) && !clashPar(s2, i)) b.push({ type: 'accent', tuile: 'BARQUE', a: i, vers: v });
      }
    }
  }
  return b;
}

/** Le plateau après une roue posée en w, ou null si la rotation est illégale. */
function rouer(s: string, w: Pt, me: number): string | null {
  const rond = ROND[w];
  for (const j of rond) if (j >= 0 && T_DE[s.charCodeAt(j)] === T_ROCHER) return null;
  const nouv = s.split('');
  nouv[w] = lettre(T_ROUE, me);
  for (let k = 0; k < 8; k++) {
    const src = rond[k], dst = rond[(k + 1) % 8];
    const ch = src >= 0 ? s[src] : '.';
    if (ch !== '.') {
      if (dst < 0 || estPorte(src) || estPorte(dst)) return null;
      const t = T_DE[ch.charCodeAt(0)];
      if (t <= 5 && !peutSeTenir(t, dst)) return null;
    }
    if (dst >= 0) nouv[dst] = ch;
  }
  const r = nouv.join('');
  for (const j of rond) if (j >= 0 && clashPar(r, j)) return null;
  return r;
}

function generer(e: EtatPaiSho, mode: ModeGeneration): Coup[] {
  if (e.verdict) return [];
  const s = e.cases, me = numCamp(e.tour), r = e.reserve[e.tour];
  const coups: Coup[] = [];

  // L'ouverture : l'hôte plante la fleur de son choix dans sa porte, au
  // sud; l'invité plante la même dans la porte d'en face, au nord.
  if (e.numero === 0) {
    for (const t of BASES) coups.push({ type: 'planter', tuile: t, porte: PORTE_HOTE });
    return coups;
  }
  if (e.numero === 1) {
    coups.push({ type: 'planter', tuile: TYPES[T_DE[s.charCodeAt(PORTE_HOTE)]], porte: PORTE_INVITE });
    return coups;
  }

  const ouvertes = portesOuvertes(s);
  for (const t of BASES) if (r[t] > 0) for (const p of ouvertes) coups.push({ type: 'planter', tuile: t, porte: p });

  const an = annulations(s);
  const piegees = piegeesPar(s, me);
  const sauvageMoi = lotusEnFleur(s, me), sauvageLui = lotusEnFleur(s, 1 - me);

  for (const i of POINTS) {
    const ch = s.charCodeAt(i);
    if (ch === VIDE || C_DE[ch] !== me) continue;
    const t = T_DE[ch];
    if (t > T_ORCHIDEE || piegees?.has(i)) continue;
    const max = DISTANCE[t];
    const lettreT = s[i];
    const sansMoi = poser(s, i, '.');

    generationVu++;
    vu[i] = generationVu; dist[i] = 0;
    let tete = 0, queue = 0;
    file[queue++] = i;
    while (tete < queue) {
      const n = file[tete++];
      const dn = dist[n];
      for (const j of VOISINS[n]) {
        if (vu[j] === generationVu) continue;
        const cj = s.charCodeAt(j);
        if (cj !== VIDE) {
          // Une prise met fin au trajet : la case est marquée pour ne
          // pas proposer deux fois la même.
          vu[j] = generationVu;
          if (!estPorte(j) && peutSeTenir(t, j) && peutPrendre(t, me, T_DE[cj], C_DE[cj], sauvageMoi, sauvageLui)) {
            ajouter(i, j);
          }
          continue;
        }
        vu[j] = generationVu; dist[j] = dn + 1;
        if (dn + 1 < max) file[queue++] = j;
        if (peutSeTenir(t, j)) ajouter(i, j);
      }
    }

    function ajouter(de: Pt, a: Pt): void {
      const apres = poser(sansMoi, a, lettreT);
      if (clashPar(apres, a) || clashPar(apres, de)) return;
      coups.push({ type: 'deplacer', de, a });
      if (!creeHarmonie(s, apres, de, a, me, an)) return;
      for (const bonus of bonusPossibles(apres, me, r, mode)) coups.push({ type: 'deplacer', de, a, bonus });
    }
  }
  return coups;
}

export const coupsLegaux = (e: EtatPaiSho): Coup[] => generer(e, 'tout');
/** La liste élaguée de l'IA. Mêmes coups sans bonus, bonus filtrés. */
export const coupsIA = (e: EtatPaiSho): Coup[] => generer(e, 'ia');

// ─── Jouer ──────────────────────────────────────────────────────────

/**
 * L'état après le coup. Le coup est supposé légal (l'arbitre le vérifie
 * avant, la recherche ne produit que des coups légaux) : `jouer` ne
 * refait pas la vérification, qui coûterait une génération complète.
 */
export function jouer(e: EtatPaiSho, c: Coup): EtatPaiSho {
  const me = numCamp(e.tour);
  const moi = e.tour, lui = CAMPS[1 - me];
  let s = e.cases;
  let reserve = e.reserve;
  let captures = e.captures;
  let progres = false, dernierePlantation = false;

  const prendreEnReserve = (t: TypeTuile) => {
    reserve = { ...reserve, [moi]: { ...reserve[moi], [t]: reserve[moi][t] - 1 } };
  };
  const planter = (t: TypeTuile, porte: Pt) => {
    s = poser(s, porte, lettre(tIndex(t), me));
    prendreEnReserve(t);
    progres = true;
    if (tIndex(t) <= 5 && basesEnReserve(reserve[moi]) === 0) dernierePlantation = true;
  };

  if (c.type === 'planter') planter(c.tuile, c.porte);
  else {
    if (s.charCodeAt(c.a) !== VIDE) {
      captures = { ...captures, [moi]: captures[moi] + 1 };
      progres = true;
    }
    s = poser(poser(s, c.a, s[c.de]), c.de, '.');
    const b = c.bonus;
    if (b) {
      if (b.type !== 'accent') planter(b.tuile, b.porte);
      else {
        progres = true;
        prendreEnReserve(b.tuile);
        if (b.tuile === 'ROUE') s = rouer(s, b.a, me) ?? s;
        else if (b.tuile === 'BARQUE') {
          s = b.vers === undefined ? poser(s, b.a, '.') : poser(poser(s, b.vers, s[b.a]), b.a, lettre(T_BARQUE, me));
        } else s = poser(s, b.a, lettre(tIndex(b.tuile), me));
      }
    }
  }

  const tour = lui;
  const cle = clePosition(s, tour);
  const vues = progres ? [cle] : [...e.vues, cle];
  const sansProgres = progres ? 0 : e.sansProgres + 1;

  let verdict: Verdict | null = null;
  const h = harmoniesDe(s);
  const anneauMoi = anneauDans(h, moi), anneauLui = anneauDans(h, lui);
  if (anneauMoi && anneauLui) verdict = { type: 'nulle', raison: 'anneaux' };
  else if (anneauMoi || anneauLui) verdict = { type: 'victoire', camp: anneauMoi ? moi : lui, raison: 'anneau' };
  else if (dernierePlantation) {
    const m = medianesDans(h, moi), l = medianesDans(h, lui);
    verdict = m === l ? { type: 'nulle', raison: 'medianes' } : { type: 'victoire', camp: m > l ? moi : lui, raison: 'medianes' };
  } else if (sansProgres >= DEMI_COUPS_SANS_PROGRES) verdict = { type: 'nulle', raison: 'compteur' };
  else if (!progres) {
    let n = 0;
    for (let k = vues.length - 1; k >= 0; k -= 2) if (vues[k] === cle) n++;
    if (n >= REPETITIONS_NULLES) verdict = { type: 'nulle', raison: 'repetition' };
  }

  return { cases: s, reserve, tour, numero: e.numero + 1, captures, sansProgres, vues, verdict };
}

/**
 * Le verdict de la position. En plus de ce que `jouer` a tranché, un
 * camp au trait qui n'a aucun coup légal perd la partie (blocage) :
 * la règle de 2022 ne dit rien de ce cas, et c'est la lecture la plus
 * simple, celle que le moteur de recherche applique déjà.
 */
export function verdict(e: EtatPaiSho): Verdict | null {
  if (e.verdict) return e.verdict;
  if (generer(e, 'ia').length === 0) return { type: 'victoire', camp: e.tour === 'hote' ? 'invite' : 'hote', raison: 'blocage' };
  return null;
}

// ─── Le coup en texte ───────────────────────────────────────────────
// « R3@0,-8 » une plantation, « 0,-7>0,-4 » un arrangement, suivi au
// besoin du bonus : « +ROCHER@1,2 », « +BARQUE@1,2>2,2 », « +LOTUS@8,0 »,
// « +W4@8,0 ». Le type de tuile dit à lui seul de quel bonus il s'agit.

export function coupEnTexte(c: Coup): string {
  if (c.type === 'planter') return `${c.tuile}@${TEXTE_PT[c.porte]}`;
  const base = `${TEXTE_PT[c.de]}>${TEXTE_PT[c.a]}`;
  const b = c.bonus;
  if (!b) return base;
  if (b.type === 'accent') return `${base}+${b.tuile}@${TEXTE_PT[b.a]}${b.vers === undefined ? '' : `>${TEXTE_PT[b.vers]}`}`;
  return `${base}+${b.tuile}@${TEXTE_PT[b.porte]}`;
}

function lirePoint(t: string): Pt {
  const [x, y] = t.split(',').map(Number);
  if (!Number.isInteger(x) || !Number.isInteger(y) || ZONES[indice(x, y)] === 0 || Math.abs(x) > 8 || Math.abs(y) > 8) {
    throw new Error(`Point illisible : ${t}`);
  }
  return indice(x, y);
}

function lireType(t: string): TypeTuile {
  if (!(TYPES as readonly string[]).includes(t)) throw new Error(`Tuile inconnue : ${t}`);
  return t as TypeTuile;
}

/** Relit un coup. Ne juge pas de sa légalité : c'est le métier de l'arbitre. */
export function coupDepuisTexte(texte: string): Coup {
  const [coeur, bonusTexte] = texte.split('+');
  if (coeur.includes('@')) {
    const [t, p] = coeur.split('@');
    return { type: 'planter', tuile: lireType(t), porte: lirePoint(p) };
  }
  const [de, a] = coeur.split('>');
  if (a === undefined) throw new Error(`Coup illisible : ${texte}`);
  const c: Coup = { type: 'deplacer', de: lirePoint(de), a: lirePoint(a) };
  if (bonusTexte === undefined) return c;
  const [t, reste] = bonusTexte.split('@');
  const tuile = lireType(t);
  if (reste === undefined) throw new Error(`Bonus illisible : ${texte}`);
  if ((ACCENTS as readonly string[]).includes(tuile)) {
    const [p, v] = reste.split('>');
    c.bonus = v === undefined ? { type: 'accent', tuile, a: lirePoint(p) } : { type: 'accent', tuile, a: lirePoint(p), vers: lirePoint(v) };
  } else {
    c.bonus = { type: tuile === 'LOTUS' || tuile === 'ORCHIDEE' ? 'special' : 'base', tuile, porte: lirePoint(reste) };
  }
  return c;
}

/** Pour les tests et l'outillage : un état fabriqué à partir d'une liste
 *  de tuiles posées, après l'ouverture, les réserves diminuées d'autant. */
export function etatDepuis(tuiles: { x: number; y: number; type: TypeTuile; camp: Camp }[], tour: Camp = 'hote'): EtatPaiSho {
  const e = etatInitial();
  let s = e.cases;
  const reserve = { hote: { ...e.reserve.hote }, invite: { ...e.reserve.invite } };
  for (const t of tuiles) {
    s = poser(s, indice(t.x, t.y), lettre(tIndex(t.type), numCamp(t.camp)));
    reserve[t.camp][t.type]--;
  }
  return { ...e, cases: s, reserve, tour, numero: 2, vues: [clePosition(s, tour)] };
}

export { CENTRE };
