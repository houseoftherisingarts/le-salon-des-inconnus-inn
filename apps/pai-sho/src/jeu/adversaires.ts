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
  niveau: Niveau;
  motFR: string;
  motEN: string;
}

export const ADVERSAIRES: readonly Adversaire[] = [
  { id: 'sokka',  nom: 'Sokka',  niveau: 3,  motFR: 'J’ai un plan. Enfin, presque.',                           motEN: 'I have a plan. Well, almost.' },
  { id: 'aang',   nom: 'Aang',   niveau: 4,  motFR: 'On joue d’abord, on s’inquiète après.',                  motEN: 'Play first, worry later.' },
  { id: 'katara', nom: 'Katara', niveau: 5,  motFR: 'Chaque tuile a sa place, comme l’eau trouve la sienne.',   motEN: 'Every tile finds its place, the way water does.' },
  { id: 'toph',   nom: 'Toph',   niveau: 6,  motFR: 'Je n’ai pas besoin de voir le plateau pour te battre.',    motEN: 'I don’t need to see the board to beat you.' },
  { id: 'zuko',   nom: 'Zuko',   niveau: 7,  motFR: 'Je ne perdrai pas deux fois.',                             motEN: 'I will not lose twice.' },
  { id: 'azula',  nom: 'Azula',  niveau: 8,  motFR: 'Tu as déjà perdu, tu ne le sais pas encore.',             motEN: 'You have already lost, you just don’t know it yet.' },
  { id: 'iroh',   nom: 'Iroh',   niveau: 9,  motFR: 'Le thé d’abord. Le jeu vient tout seul ensuite.',          motEN: 'Tea first. The game follows on its own.' },
  { id: 'bumi',   nom: 'Bumi',   niveau: 10, motFR: 'Le bon coup est rarement celui que tu attends.',          motEN: 'The right move is rarely the one you expect.' },
];

export const adversaire = (id: string): Adversaire | undefined => ADVERSAIRES.find((a) => a.id === id);
