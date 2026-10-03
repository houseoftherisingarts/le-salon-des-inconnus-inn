// ─── Les adversaires de la maison ───────────────────────────────────
// Alex, 3 octobre 2026 : « des personnages que l'on choisit, un à la
// fois; la maison reste, et on peut aussi choisir de jouer contre
// Iroh. » La maison garde son niveau réglable et son nom tiré au sort;
// chaque personnage joue à une marche fixe, celle qui lui ressemble,
// et dit un mot en s'asseyant. Les phrases sont à nous, pas des
// répliques de la série.

import type { Niveau } from '../moteur/niveaux';

export interface Adversaire {
  id: string;
  nom: string;
  /** Le nom anglais, quand il diffère. */
  nomEN?: string;
  niveau: Niveau;
  /** Son niveau se règle au menu, de 1 à 10. */
  libre?: boolean;
  motFR: string;
  motEN: string;
}

export const ADVERSAIRES: readonly Adversaire[] = [
  { id: 'iroh',   nom: 'Iroh',   niveau: 9,  motFR: 'Le thé d’abord. Le jeu vient tout seul ensuite.',          motEN: 'Tea first. The game follows on its own.' },
  { id: 'sokka',  nom: 'Sokka',  niveau: 3,  motFR: 'J’ai un plan. Enfin, presque.',                           motEN: 'I have a plan. Well, almost.' },
  { id: 'aang',   nom: 'Aang',   niveau: 4,  motFR: 'On joue d’abord, on s’inquiète après.',                  motEN: 'Play first, worry later.' },
  { id: 'katara', nom: 'Katara', niveau: 5,  motFR: 'Chaque tuile a sa place, comme l’eau trouve la sienne.',   motEN: 'Every tile finds its place, the way water does.' },
  { id: 'toph',   nom: 'Toph',   niveau: 6,  motFR: 'Je n’ai pas besoin de voir le plateau pour te battre.',    motEN: 'I don’t need to see the board to beat you.' },
  { id: 'zuko',   nom: 'Zuko',   niveau: 7,  motFR: 'Je ne perdrai pas deux fois.',                             motEN: 'I will not lose twice.' },
  { id: 'azula',  nom: 'Azula',  niveau: 8,  motFR: 'Tu as déjà perdu, tu ne le sais pas encore.',             motEN: 'You have already lost, you just don’t know it yet.' },
  { id: 'bumi',   nom: 'Bumi',   niveau: 10, motFR: 'Le bon coup est rarement celui que tu attends.',          motEN: 'The right move is rarely the one you expect.' },
  { id: 'kyoshi', nom: 'Guerrière Kyoshi', nomEN: 'Kyoshi Warrior', niveau: 6, motFR: 'L’éventail d’abord, la victoire ensuite.', motEN: 'The fan first, the win after.' },
  // Les gens de la maison, à la fin de la liste (Alex, 3 octobre).
  { id: 'taverniere', nom: 'La dame de la taverne', nomEN: 'The tavern lady', niveau: 2, motFR: 'Une partie, puis je retourne à mes chopes.', motEN: 'One game, then back to my mugs.' },
  { id: 'colporteur', nom: 'Le colporteur', nomEN: 'The peddler', niveau: 1, motFR: 'Si je gagne, vous m’achetez quelque chose.', motEN: 'If I win, you buy something from me.' },
  { id: 'moine', nom: 'Le moine', nomEN: 'The monk', niveau: 5, motFR: 'Je joue lentement, pardonnez-moi d’avance.', motEN: 'I play slowly, forgive me in advance.' },
  { id: 'dame', nom: 'La dame au thé', nomEN: 'The tea lady', niveau: 3, libre: true, motFR: 'Dites-moi à quel point je dois me retenir.', motEN: 'Tell me how much I should hold back.' },
];

export const nomAdversaire = (a: Adversaire, fr: boolean): string => (fr ? a.nom : a.nomEN ?? a.nom);

// Deux jeux de statuettes : les peintes du premier jour (style 1) et
// celles du dessin animé (style 2, par défaut). Fichier <id>2.glb.
const CLE_FIGURINES = 'paisho.figurines';
export const figurinesDessin = (): boolean => { try { return localStorage.getItem(CLE_FIGURINES) !== '1'; } catch { return true; } };
export const sauverFigurines = (dessin: boolean): void => { try { localStorage.setItem(CLE_FIGURINES, dessin ? '2' : '1'); } catch { /* privé */ } };

export const adversaire = (id: string): Adversaire | undefined => ADVERSAIRES.find((a) => a.id === id);

/** À distance, deux joueurs qui ont choisi le même personnage : chacun se
 *  voit tel qu'il s'est choisi, et voit l'autre sous le personnage suivant.
 *  Alex, 3 octobre : « moi je vais voir qu'elle a pris Katara, elle va voir
 *  que j'ai pris un autre ». */
export function vuDEnFace(autre: string | null | undefined, moi: string | null | undefined): string | null {
  if (!autre || !adversaire(autre)) return null;
  if (autre !== moi) return autre;
  const i = ADVERSAIRES.findIndex((a) => a.id === autre);
  return ADVERSAIRES[(i + 1) % ADVERSAIRES.length].id;
}
