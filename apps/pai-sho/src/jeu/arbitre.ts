// ─── L'arbitre du Pai Sho ───────────────────────────────────────────
// La porte d'entrée des pages et du jeu en réseau. `logic.ts` fait
// confiance au coup qu'on lui donne, pour que la recherche aille vite;
// l'arbitre, lui, refuse tout coup qui n'est pas dans la liste légale
// et tranche le blocage. La triple répétition et les deux cents
// demi-coups sans progrès sont comptés dans `jouer`, pour que la
// machine les voie venir pendant sa recherche; l'arbitre en publie les
// seuils et les phrases.
//
// Tout est pur et déterministe : deux joueurs en réseau qui rejouent la
// même liste de coups tombent sur le même verdict.

import {
  coupEnTexte, coupsLegaux, etatInitial as etatInitialJeu, jouer, verdict,
  type Coup, type EtatPaiSho, type Verdict,
} from './logic';

export { DEMI_COUPS_SANS_PROGRES, REPETITIONS_NULLES } from './logic';

export const etatInitial = (): EtatPaiSho => etatInitialJeu();

export function coupLegal(e: EtatPaiSho, c: Coup): boolean {
  const nom = coupEnTexte(c);
  return coupsLegaux(e).some((x) => coupEnTexte(x) === nom);
}

/**
 * Joue un coup vérifié. Un coup illégal rend l'état d'origine, tel quel.
 * Le blocage du camp suivant est inscrit dans l'état, pour que la page
 * n'ait qu'un seul endroit où lire la fin de partie.
 */
export function appliquerCoup(e: EtatPaiSho, c: Coup): EtatPaiSho {
  if (e.verdict || !coupLegal(e, c)) return e;
  const n = jouer(e, c);
  if (n.verdict) return n;
  const v = verdict(n);
  return v ? { ...n, verdict: v } : n;
}

// ─── Ce que le joueur lit à l'écran ─────────────────────────────────

const FR = {
  titreVictoire: 'Victoire',
  titreNulle: 'Partie nulle',
  hote: "L'hôte",
  invite: "L'invité",
  anneau: (qui: string) => `${qui} a fermé un anneau d'harmonie autour du centre et remporte la partie.`,
  medianes: (qui: string) => `La dernière fleur est plantée. ${qui} compte le plus d'harmonies qui enjambent les médianes et l'emporte.`,
  blocage: (qui: string) => `Le camp d'en face n'a plus aucun coup possible. ${qui} remporte la partie.`,
  anneaux: 'Les deux joueurs ont fermé leur anneau dans le même tour. La partie est nulle.',
  medianesEgales: 'La dernière fleur est plantée et les deux jardins comptent autant d’harmonies sur les médianes. La partie est nulle.',
  repetition: 'La même position revient pour la troisième fois. La partie est nulle.',
  compteur: 'Deux cents demi-coups ont passé sans plantation, sans prise et sans accent posé. La partie est nulle.',
};

const EN = {
  titreVictoire: 'Victory',
  titreNulle: 'Drawn game',
  hote: 'The host',
  invite: 'The guest',
  anneau: (who: string) => `${who} has closed a ring of harmony around the centre and wins the game.`,
  medianes: (who: string) => `The last flower is planted. ${who} holds more harmonies across the midlines and wins.`,
  blocage: (who: string) => `The other side has no legal move left. ${who} wins the game.`,
  anneaux: 'Both players closed their ring on the same turn. The game is drawn.',
  medianesEgales: 'The last flower is planted and both gardens hold as many harmonies across the midlines. The game is drawn.',
  repetition: 'The same position has come round a third time. The game is drawn.',
  compteur: 'Two hundred half-moves have passed with no planting, no capture and no accent placed. The game is drawn.',
};

export const TEXTES_ARBITRE = { FR, EN };

/** La phrase du verdict, ou null tant que la partie continue. */
export function texteVerdict(v: Verdict | null, fr: boolean): string | null {
  if (!v) return null;
  const t = fr ? FR : EN;
  if (v.type === 'victoire') return t[v.raison](v.camp === 'hote' ? t.hote : t.invite);
  return v.raison === 'medianes' ? t.medianesEgales : t[v.raison];
}
