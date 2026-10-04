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
  /** Un temps de réflexion plus long que celui du niveau : la seconde marche d'un même niveau. */
  tempsMs?: number;
  motFR: string;
  motEN: string;
}

// L'échelle d'Alex (4 octobre 2026) : on débloque les adversaires en
// gagnant, « comme Super Smash ». Douze marches, deux figures par marche
// pour deux montées différentes (Iroh seul en bas, le Boulder retiré par
// Alex), Bumi avant-dernier, Iroh du Royaume de la Terre en dernier. Les
// gens de la taverne sont partis.
export const ADVERSAIRES: readonly Adversaire[] = [
  { id: 'iroh',    nom: 'Iroh, maître de thé', nomEN: 'Iroh, tea master', niveau: 1, motFR: 'Le thé d’abord. Le jeu vient tout seul ensuite.', motEN: 'Tea first. The game follows on its own.' },
  { id: 'chou',    nom: 'Le marchand de choux', nomEN: 'The cabbage merchant', niveau: 2, motFR: 'Jouez doucement, j’ai déjà perdu assez de choux cette année.', motEN: 'Play gently, I have lost enough cabbages this year.' },
  { id: 'jet',     nom: 'Jet', niveau: 2, motFR: 'Les règles, c’est pour ceux qui ont peur de perdre.', motEN: 'Rules are for people afraid of losing.' },
  { id: 'aang',    nom: 'Aang', niveau: 3, motFR: 'On joue d’abord, on s’inquiète après.', motEN: 'Play first, worry later.' },
  { id: 'sokka',   nom: 'Sokka', niveau: 3, motFR: 'J’ai un plan. Enfin, presque.', motEN: 'I have a plan. Well, almost.' },
  { id: 'katara',  nom: 'Katara', niveau: 4, motFR: 'Chaque tuile a sa place, comme l’eau trouve la sienne.', motEN: 'Every tile finds its place, the way water does.' },
  { id: 'mai',     nom: 'Mai', niveau: 4, motFR: 'Finissons-en. Ça m’ennuie déjà.', motEN: 'Let’s get this over with. I’m already bored.' },
  { id: 'kyoshi',  nom: 'Guerrière Kyoshi', nomEN: 'Kyoshi warrior', niveau: 5, motFR: 'L’éventail d’abord, la victoire ensuite.', motEN: 'The fan first, the win after.' },
  { id: 'tylee',   nom: 'Ty Lee', niveau: 5, motFR: 'Ton aura devient toute grise quand tu réfléchis trop.', motEN: 'Your aura goes all grey when you think too hard.' },
  { id: 'zhao',    nom: 'Amiral Zhao', nomEN: 'Admiral Zhao', niveau: 5, tempsMs: 1000, motFR: 'Je ne joue pas. Je conquiers.', motEN: 'I do not play. I conquer.' },
  { id: 'jeongjeong', nom: 'Jeong Jeong', niveau: 5, tempsMs: 1000, motFR: 'La retenue gagne plus de parties que la flamme.', motEN: 'Restraint wins more games than fire.' },
  { id: 'zuko',    nom: 'Zuko', niveau: 6, motFR: 'Je ne perdrai pas deux fois.', motEN: 'I will not lose twice.' },
  { id: 'longfeng', nom: 'Long Feng', niveau: 6, motFR: 'Il n’y a pas de défaite à Ba Sing Se.', motEN: 'There is no defeat in Ba Sing Se.' },
  { id: 'pakku',   nom: 'Maître Pakku', nomEN: 'Master Pakku', niveau: 6, tempsMs: 900, motFR: 'Je n’enseigne pas aux impatients.', motEN: 'I do not teach the impatient.' },
  { id: 'piandao', nom: 'Piandao', niveau: 6, tempsMs: 900, motFR: 'Chaque tuile se pose comme on tire l’épée : une seule fois.', motEN: 'Place each tile the way you draw a sword: once.' },
  { id: 'toph',    nom: 'Toph', niveau: 7, motFR: 'Je n’ai pas besoin de voir le plateau pour te battre.', motEN: 'I don’t need to see the board to beat you.' },
  { id: 'hama',    nom: 'Hama', niveau: 7, motFR: 'La lune est pleine ce soir. Prenez garde à vos fleurs.', motEN: 'The moon is full tonight. Mind your flowers.' },
  { id: 'azula',   nom: 'Azula', niveau: 8, motFR: 'Tu as déjà perdu, tu ne le sais pas encore.', motEN: 'You have already lost, you just don’t know it yet.' },
  { id: 'wanshitong', nom: 'Wan Shi Tong', niveau: 8, motFR: 'Je connais dix mille parties. Celle-ci ne m’apprendra rien.', motEN: 'I know ten thousand games. This one will teach me nothing.' },
  { id: 'bumi',    nom: 'Bumi', niveau: 9, motFR: 'Le bon coup est rarement celui que tu attends.', motEN: 'The right move is rarely the one you expect.' },
  { id: 'ozai',    nom: 'Seigneur du Feu Ozai', nomEN: 'Fire Lord Ozai', niveau: 9, motFR: 'Agenouillez-vous, et la partie sera courte.', motEN: 'Kneel, and the game will be short.' },
  { id: 'irohek',  nom: 'Iroh du Royaume de la Terre', nomEN: 'Iroh of the Earth Kingdom', niveau: 10, motFR: 'Vous êtes venu de loin. Voyons jusqu’où.', motEN: 'You have come far. Let us see how far.' },
];

/** Les douze marches de l'échelle, dans l'ordre de la montée. */
export const ECHELONS: readonly (readonly string[])[] = [
  ['iroh'], ['chou', 'jet'], ['aang', 'sokka'], ['katara', 'mai'], ['kyoshi', 'tylee'], ['zhao', 'jeongjeong'],
  ['zuko', 'longfeng'], ['pakku', 'piandao'], ['toph', 'hama'], ['azula', 'wanshitong'], ['bumi', 'ozai'], ['irohek'],
];

export const nomAdversaire = (a: Adversaire, fr: boolean): string => (fr ? a.nom : a.nomEN ?? a.nom);

// Deux jeux de statuettes : les peintes du premier jour (style 1) et
// celles du dessin animé (style 2, par défaut). Fichier <id>2.glb.
const CLE_FIGURINES = 'paisho.figurines';
export const figurinesDessin = (): boolean => { try { return localStorage.getItem(CLE_FIGURINES) === '2'; } catch { return false; } };
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
