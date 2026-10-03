// ─── L'adversaire de bois du Pai Sho ────────────────────────────────
// Le moteur commun (src/moteur) cherche; ce fichier lui dit ce qu'est
// une bonne position. Tout se note du point de vue du camp au trait.
//
// Les coups de la machine viennent de `coupsIA` : chaque plantation et
// chaque arrangement y sont, sans exception, mais les bonus d'accent
// sont élagués (accents posés seulement à côté d'une fleur adverse,
// barque seulement sur une tuile adverse). Sans cet élagage, un seul
// arrangement qui crée une harmonie ouvre plusieurs centaines de bonus.

import { choisirAuNiveau, type ChoixOptions, type Niveau } from '../moteur/niveaux';
import type { Adaptateur } from '../moteur/types';
import {
  TYPES, coupEnTexte, coupsIA, estMediane, harmonies, jouer, tuilesPiegees,
  type Camp, type Coup, type EtatPaiSho,
} from './logic';
import { NB_CASES, POINTS, coordX, coordY, estPorte } from './plateau';

const ECART_CENTRE = Int8Array.from({ length: NB_CASES }, (_, i) => Math.abs(coordX(i)) + Math.abs(coordY(i)));

/** Les poids de l'évaluation, en centièmes. */
export const POIDS = {
  harmonie: 100,
  mediane: 60,
  /** Par nombre de côtés du centre couverts (nord, sud, est, ouest). */
  cotes: [0, 40, 120, 300, 600],
  prise: 150,
  piegee: 40,
  enFleur: 15,
  centre: 3,
};

const FLEURS_HOTE = 'ABCDEFLO';
const FLEURS_INVITE = 'abcdeflo';

/** Une note brute pour un camp (0 hôte, 1 invité), sans le point de vue. */
function noterCamps(e: EtatPaiSho): [number, number] {
  const n: [number, number] = [0, 0];
  const cotes = [0, 0];
  for (const h of harmonies(e)) {
    const c = h.camp === 'hote' ? 0 : 1;
    n[c] += POIDS.harmonie;
    if (!estMediane(h)) continue;
    n[c] += POIDS.mediane;
    const horiz = coordY(h.a) === coordY(h.b);
    cotes[c] |= horiz ? (coordY(h.a) > 0 ? 1 : 2) : (coordX(h.a) > 0 ? 4 : 8);
  }
  for (let c = 0; c < 2; c++) {
    let k = cotes[c], bits = 0;
    while (k) { bits += k & 1; k >>= 1; }
    n[c] += POIDS.cotes[bits];
  }
  n[0] += POIDS.prise * e.captures.hote;
  n[1] += POIDS.prise * e.captures.invite;
  const s = e.cases;
  for (const i of POINTS) {
    const ch = s[i];
    if (ch === '.' || estPorte(i)) continue;
    const c = FLEURS_HOTE.includes(ch) ? 0 : FLEURS_INVITE.includes(ch) ? 1 : -1;
    if (c < 0) continue;
    n[c] += POIDS.enFleur + POIDS.centre * (12 - ECART_CENTRE[i]);
  }
  for (const i of tuilesPiegees(e)) n[s[i] === s[i].toUpperCase() ? 0 : 1] -= POIDS.piegee;
  return n;
}

/** Un petit bruit tiré de la position elle-même : il départage les
 *  coups égaux sans rendre la note instable d'un appel à l'autre, ce
 *  que la table de transposition ne supporterait pas. */
function bruit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 7) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 7) - 3;
}

export function evaluer(e: EtatPaiSho): number {
  const [h, i] = noterCamps(e);
  return (e.tour === 'hote' ? h - i : i - h) + bruit(e.cases);
}

function cle(e: EtatPaiSho): string {
  let r = e.tour === 'hote' ? 'H' : 'I';
  for (const t of TYPES) r += e.reserve.hote[t];
  for (const t of TYPES) r += e.reserve.invite[t];
  return e.cases + r;
}

function promesse(e: EtatPaiSho, c: Coup): number {
  if (c.type === 'planter') return 1;
  let p = (12 - ECART_CENTRE[c.a]) / 4;
  if (e.cases.charCodeAt(c.a) !== 46) p += 6;
  if (c.bonus) p += c.bonus.type === 'accent' ? 3 : c.bonus.type === 'special' ? 4 : 2;
  return p;
}

export function adaptateurPaiSho(): Adaptateur<EtatPaiSho, Coup> {
  return {
    coups: coupsIA,
    jouer,
    fini: (e) => {
      const v = e.verdict;
      if (!v) return null;
      if (v.type === 'nulle') return 0;
      return v.camp === e.tour ? 1 : -1;
    },
    evaluer,
    cle,
    nomCoup: coupEnTexte,
    // Seules les prises sont bruyantes. Les coups qui créent une
    // harmonie existent dans presque toutes les positions : la
    // quiescence, qui n'a pas de fond, ne s'arrêterait plus.
    bruyant: (e, c) => c.type === 'deplacer' && e.cases.charCodeAt(c.a) !== 46,
    promesse,
  };
}

/** Le coup de la machine à ce niveau, ou null s'il n'y a rien à jouer. */
export function choisirCoup(e: EtatPaiSho, niveau: Niveau, o: ChoixOptions = {}): Coup | null {
  if (e.verdict) return null;
  return choisirAuNiveau(adaptateurPaiSho(), e, niveau, o);
}

export type { Camp };
