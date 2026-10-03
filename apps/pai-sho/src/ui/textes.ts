// ─── Les textes de l'interface ──────────────────────────────────────
// Tout ce qui s'affiche passe par ici. Le français est la langue de
// départ, l'anglais se choisit dans le menu et se garde d'une visite à
// l'autre.

import type { TypeTuile } from '../jeu/logic';

export type Langue = 'FR' | 'EN';
/** Le nom par défaut du joueur local, dans les deux langues : il se conjugue à part. */
const MOI = new Set(['Vous', 'You']);

const FR = {
  titre: 'Pai Sho',
  sousTitre: 'Qui frappe à la porte du jardin ?',
  beta: 'Bêta',
  chargement: 'La table se dresse',
  contreMaison: 'Contre la maison',
  contreMaisonAide: 'Un habitué de la taverne prend place en face de vous et joue à la mesure du niveau que vous lui donnez.',
  niveau: 'Niveau',
  votreCote: 'Votre côté',
  hote: 'Hôte',
  invite: 'Invité',
  hoteAide: 'L’hôte ouvre la partie',
  inviteAide: 'L’invité répond',
  jouerMaison: 'Défier la maison',
  lecon: 'Leçon avec Iroh',
  leconAide: 'Iroh vous apprend les règles en jouant une vraie partie, coup par coup, jusqu’à votre victoire.',
  suivant: 'Suivant',
  jouezLeCoup: 'Jouez le coup indiqué : la tuile et sa case brillent en or.',
  jouerDeux: 'Lancer la partie à deux',
  adversaire: 'Adversaire',
  aDeux: 'À deux sur ce Mac',
  aDeuxAide: 'Vous partagez ce Mac avec un ami, et la table se retourne vers celui dont c’est le tour.',
  tourner: 'Tourner la table à chaque tour',
  aDistance: 'À distance',
  profil: 'Votre profil',
  profilAide: 'Votre nom, votre identifiant et le personnage qui vous représente en face des autres joueurs.',
  votrePersonnage: 'Votre personnage',
  sansPersonnage: 'La dame',
  boutique: 'Boutique de skins au café-jeux',
  aDistanceAide: 'Ouvrez une table et donnez votre identifiant à l’autre joueur, ou rejoignez la sienne avec le sien.',
  reprendre: 'Reprendre la partie',
  tutoriel: 'Tutoriel',
  son: 'Son',
  volume: 'Volume de la musique',
  figurines: (dessin: boolean) => `Statuettes : ${dessin ? 'dessin animé' : 'peintes'}`,
  langue: 'English',
  retour: 'Retour',
  votreNom: 'Votre nom',
  votreId: 'Votre identifiant',
  copier: 'Copier',
  copie: 'Copié',
  ouvrirTable: 'Ouvrir une table',
  rejoindre: 'Rejoindre',
  idAdversaire: 'Identifiant de l’autre joueur',
  amis: 'Vos amis',
  amisAide: 'Les joueurs rencontrés à une table se gardent ici. Touchez un nom pour rejoindre sa table.',
  oublier: 'Oublier',
  attente: 'La table est ouverte. Donnez votre identifiant à l’autre joueur, la partie commencera dès son arrivée.',
  connexion: 'Connexion en cours',
  connecte: 'Connecté',
  perdue: 'La connexion s’est perdue et la table attend le retour de l’autre joueur',
  perdueFin: 'L’autre joueur n’est pas revenu.',
  erreurReseau: 'Impossible de joindre le serveur de rencontre. Vérifiez votre connexion internet.',
  erreurId: 'Aucune table ne répond à cet identifiant.',
  auTrait: 'au trait',
  vous: 'Vous',
  reflechit: 'réfléchit',
  enMain: 'En main',
  journal: 'Les coups',
  aucunCoup: 'Aucun coup joué pour l’instant.',
  abandonner: 'Abandonner',
  confirmerAbandon: 'Abandonner la partie ?',
  oui: 'Oui',
  non: 'Non',
  regles: 'Règles',
  suggestions: 'Suggestions',
  menu: 'Menu',
  fermer: 'Fermer',
  nouvellePartie: 'Nouvelle partie',
  bonusTitre: 'Une harmonie vient de naître',
  bonusAide: 'Vous gagnez un geste de plus. Choisissez la tuile à poser, ou passez.',
  bonusPasser: 'Passer',
  bonusCible: 'Touchez un point en surbrillance sur le plateau.',
  annuler: 'Annuler',
  choisirPorte: 'Touchez une porte en surbrillance pour planter',
  ouverture: 'Choisissez la fleur d’ouverture, elle ira dans votre porte.',
  abandonVous: 'Vous avez abandonné la partie.',
  abandonLui: (nom: string) => (MOI.has(nom) ? 'Vous avez abandonné la partie.' : `${nom} a abandonné la partie.`),
  remporte: (nom: string) => (MOI.has(nom) ? 'Vous remportez la partie' : `${nom} remporte la partie`),
  defaite: 'Défaite',
  joueur1: 'Premier joueur',
  joueur2: 'Second joueur',
  partieDistance: 'Partie à distance',
  maison: 'Maison',
  bonneFete: 'Bonne fete Kamy',
  presentent: 'présentent',
  salonEtVexel: ['Le Salon des Inconnus', '& Vexel Webstudio'],
  choisirAdversaire: 'Choisissez qui s’assoit en face : la maison, au niveau que vous lui donnez, ou un personnage qui joue à sa manière.',
};

const EN: typeof FR = {
  titre: 'Pai Sho',
  sousTitre: 'Who knocks at the garden gate?',
  beta: 'Beta',
  chargement: 'Setting the table',
  contreMaison: 'Against the house',
  contreMaisonAide: 'A tavern regular takes the seat across from you.',
  niveau: 'Level',
  votreCote: 'Your side',
  hote: 'Host',
  invite: 'Guest',
  hoteAide: 'The host opens',
  inviteAide: 'The guest answers',
  jouerMaison: 'Challenge the house',
  lecon: 'Lesson with Iroh',
  leconAide: 'Iroh teaches you the rules by playing a real game, move by move, up to your victory.',
  suivant: 'Next',
  jouezLeCoup: 'Play the move shown: the tile and its square glow gold.',
  jouerDeux: 'Start a two-player game',
  adversaire: 'Opponent',
  aDeux: 'Two on this Mac',
  aDeuxAide: 'Share this Mac with a friend, and the table turns toward whoever plays next.',
  tourner: 'Turn the table every move',
  aDistance: 'Remote',
  profil: 'Your profile',
  profilAide: 'Your name, your ID and the character who sits across from other players.',
  votrePersonnage: 'Your character',
  sansPersonnage: 'The lady',
  boutique: 'Skin shop at the café-jeux',
  aDistanceAide: 'Open a table and give your player ID to your opponent, or join theirs with their ID.',
  reprendre: 'Resume the game',
  tutoriel: 'Tutorial',
  son: 'Sound',
  volume: 'Music volume',
  figurines: (dessin: boolean) => `Figurines: ${dessin ? 'cartoon' : 'painted'}`,
  langue: 'Français',
  retour: 'Back',
  votreNom: 'Your name',
  votreId: 'Your player ID',
  copier: 'Copy',
  copie: 'Copied',
  ouvrirTable: 'Open a table',
  rejoindre: 'Join',
  idAdversaire: 'The other player’s ID',
  amis: 'Your friends',
  amisAide: 'Players you have met at a table are kept here. Tap a name to join their table.',
  oublier: 'Forget',
  attente: 'Your table is open. Give your ID to the other player and the game starts as soon as they arrive.',
  connexion: 'Connecting',
  connecte: 'Connected',
  perdue: 'Connection lost, waiting for the other player',
  perdueFin: 'The other player did not come back.',
  erreurReseau: 'The matchmaking server cannot be reached. Check your internet connection.',
  erreurId: 'No table answers to that ID.',
  auTrait: 'to move',
  vous: 'You',
  reflechit: 'is thinking',
  enMain: 'In hand',
  journal: 'Moves',
  aucunCoup: 'No move played yet.',
  abandonner: 'Resign',
  confirmerAbandon: 'Resign this game?',
  oui: 'Yes',
  non: 'No',
  regles: 'Rules',
  suggestions: 'Hints',
  menu: 'Menu',
  fermer: 'Close',
  nouvellePartie: 'New game',
  bonusTitre: 'A new harmony was born',
  bonusAide: 'You earn one more action. Pick the tile to place, or skip.',
  bonusPasser: 'Skip',
  bonusCible: 'Tap a highlighted point on the board.',
  annuler: 'Cancel',
  choisirPorte: 'Tap a highlighted gate to plant',
  ouverture: 'Choose your opening flower, it goes into your gate.',
  abandonVous: 'You resigned the game.',
  abandonLui: (nom: string) => (MOI.has(nom) ? 'You resigned the game.' : `${nom} resigned the game.`),
  remporte: (nom: string) => (MOI.has(nom) ? 'You win the game' : `${nom} wins the game`),
  defaite: 'Defeat',
  joueur1: 'First player',
  joueur2: 'Second player',
  partieDistance: 'Remote game',
  maison: 'House',
  bonneFete: 'Happy birthday Kamy',
  presentent: 'present',
  salonEtVexel: ['Le Salon des Inconnus', '& Vexel Webstudio'],
  choisirAdversaire: 'Choose who sits across from you: the house, at the level you give it, or a character who plays their own way.',
};

export const TEXTES = { FR, EN };
export type Textes = typeof FR;

export const NOMS_TUILES: Record<Langue, Record<TypeTuile, string>> = {
  FR: {
    R3: 'Rose', R4: 'Chrysanthème', R5: 'Rhododendron',
    W3: 'Jasmin', W4: 'Lys', W5: 'Jade blanc',
    LOTUS: 'Lotus blanc', ORCHIDEE: 'Orchidée',
    ROCHER: 'Rocher', ROUE: 'Roue', RENOUEE: 'Renouée', BARQUE: 'Barque',
  },
  EN: {
    R3: 'Rose', R4: 'Chrysanthemum', R5: 'Rhododendron',
    W3: 'Jasmine', W4: 'Lily', W5: 'White jade',
    LOTUS: 'White lotus', ORCHIDEE: 'Orchid',
    ROCHER: 'Rock', ROUE: 'Wheel', RENOUEE: 'Knotweed', BARQUE: 'Boat',
  },
};

/** Les règles, en phrases entières. Chaque bloc a un titre et un corps. */
export const REGLES: Record<Langue, { titre: string; corps: string }[]> = {
  FR: [
    {
      titre: 'Le but',
      corps: 'Vous gagnez en formant le premier un anneau d’harmonies, une chaîne fermée de vos fleurs reliées deux à deux qui entoure le point central du plateau sans jamais le toucher. Quatre tuiles suffisent pour le plus petit anneau, et rien n’empêche d’en tracer un bien plus grand.',
    },
    {
      titre: 'Le tour',
      corps: 'À votre tour, vous plantez une fleur de base de votre réserve dans une porte libre, ou bien vous déplacez une de vos fleurs déjà sur le plateau. L’hôte ouvre la partie en plantant la fleur de son choix dans sa porte, et l’invité plante la même fleur dans la porte d’en face.',
    },
    {
      titre: 'Les déplacements',
      corps: 'Une fleur avance en ligne droite ou en tournant, jamais en diagonale, sans sauter par-dessus une autre tuile, et le chiffre de son nom donne le nombre de points qu’elle peut parcourir. Le lotus blanc va jusqu’à deux, l’orchidée jusqu’à six. Une fleur rouge ne peut pas s’arrêter dans le jardin blanc, une fleur blanche ne s’arrête pas dans le jardin rouge, et aucune tuile ne revient dans une porte.',
    },
    {
      titre: 'L’harmonie',
      corps: 'Les six fleurs tournent sur un cercle : rose, chrysanthème, rhododendron, jasmin, lys, jade blanc, puis retour à la rose. Deux de vos fleurs voisines sur ce cercle, posées sur la même ligne sans rien entre elles, forment une harmonie, que le plateau dessine d’un fil d’or. Le lotus blanc s’harmonise avec toutes les fleurs de base, les vôtres comme celles de l’autre.',
    },
    {
      titre: 'Le choc et la prise',
      corps: 'Les fleurs opposées sur le cercle se heurtent, la rose contre le jasmin, le chrysanthème contre le lys, le rhododendron contre le jade blanc, et aucun coup ne peut laisser deux d’entre elles face à face sur une ligne libre. Votre fleur prend une fleur adverse en se posant sur elle quand les deux se heurtent, et la tuile prise quitte la partie.',
    },
    {
      titre: 'Le geste de plus',
      corps: 'Quand un déplacement fait naître une nouvelle harmonie, vous pouvez ajouter un geste. Vous posez alors un accent sur le plateau, vous plantez le lotus ou l’orchidée dans une porte libre, ou bien, si aucune de vos fleurs n’attend dans une porte, vous y plantez une fleur de base.',
    },
    {
      titre: 'Les accents',
      corps: 'Le rocher coupe les harmonies de sa ligne et de sa colonne, et la renouée éteint celles des huit tuiles qui l’entourent. La roue fait tourner d’un cran, dans le sens des aiguilles d’une montre, tout ce qui l’entoure. La barque déplace une fleur vers un point voisin et prend sa place, ou retire de la partie un accent en disparaissant avec lui.',
    },
    {
      titre: 'L’orchidée',
      corps: 'Les fleurs adverses posées autour de votre orchidée ne peuvent plus bouger d’elles-mêmes. Tant que votre lotus fleurit sur le plateau, votre orchidée devient sauvage : elle peut prendre n’importe quelle fleur adverse, et n’importe quelle fleur adverse peut la prendre.',
    },
    {
      titre: 'La fin',
      corps: 'Si un joueur pose sa dernière fleur de base sans qu’aucun anneau ne soit formé, la partie s’arrête et gagne celui qui compte le plus d’harmonies traversant une médiane. Un joueur qui n’a plus aucun coup possible perd, et la partie est nulle quand la même position revient trois fois.',
    },
  ],
  EN: [
    {
      titre: 'The goal',
      corps: 'You win by being first to form a harmony ring, a closed chain of your flowers linked in pairs that surrounds the centre point of the board without touching it. Four tiles make the smallest ring, and nothing stops you from drawing a much larger one.',
    },
    {
      titre: 'Your turn',
      corps: 'On your turn you either plant a basic flower from your reserve into an open gate, or move one of your flowers already on the board. The host opens by planting any basic flower in their gate, and the guest plants the same flower in the opposite gate.',
    },
    {
      titre: 'Moving',
      corps: 'A flower moves along the lines and may turn, never diagonally and never over another tile, and the number in its name is how many points it may travel. The white lotus goes up to two and the orchid up to six. A red flower cannot stop in the white garden, a white flower cannot stop in the red garden, and no tile ever goes back into a gate.',
    },
    {
      titre: 'Harmony',
      corps: 'The six flowers sit on a circle: rose, chrysanthemum, rhododendron, jasmine, lily, white jade, then back to rose. Two of your flowers that are neighbours on that circle and stand on the same line with nothing between them form a harmony, which the board draws as a golden thread. The white lotus harmonises with every basic flower, yours and your opponent’s.',
    },
    {
      titre: 'Clash and capture',
      corps: 'Flowers opposite on the circle clash, rose against jasmine, chrysanthemum against lily, rhododendron against white jade, and no move may leave two of them facing each other on an open line. Your flower captures an opposing flower by landing on it when the two clash, and the captured tile leaves the game.',
    },
    {
      titre: 'The extra action',
      corps: 'When a move creates a new harmony you may take one more action. You place an accent on the board, plant the lotus or the orchid in an open gate, or, if none of your flowers is waiting in a gate, plant a basic flower there.',
    },
    {
      titre: 'Accents',
      corps: 'The rock cancels harmonies along its row and column, and the knotweed silences those of the eight tiles around it. The wheel turns everything around it one step clockwise. The boat moves a flower to a neighbouring point and takes its place, or removes an accent from the game by leaving with it.',
    },
    {
      titre: 'The orchid',
      corps: 'Opposing flowers standing around your orchid can no longer move by themselves. While your lotus blooms on the board your orchid is wild: it can capture any opposing flower, and any opposing flower can capture it.',
    },
    {
      titre: 'The end',
      corps: 'If a player places their last basic flower and no ring has formed, the game stops and the player with more harmonies crossing a midline wins. A player with no legal move loses, and the game is drawn when the same position comes back three times.',
    },
  ],
};

/** Les étapes du tutoriel. `ancre` désigne un élément marqué `data-tuto`. */
export const TUTORIEL: Record<Langue, { titre: string; corps: string; ancre?: string }[]> = {
  FR: [
    { titre: 'Bienvenue à la table', corps: 'Le Pai Sho se joue sur un plateau rond où chaque joueur fait pousser son jardin. Faites glisser pour tourner autour de la table, et servez-vous de la molette ou du pincement pour vous approcher.' },
    { titre: 'Votre réserve', corps: 'Les tuiles que vous avez en main attendent ici. Touchez une fleur, puis une porte en surbrillance sur le plateau pour la planter.', ancre: 'reserve' },
    { titre: 'Déplacer une fleur', corps: 'Touchez une de vos fleurs sur le plateau. Les disques verts montrent où elle peut aller, et un halo rouge vous prévient quand un point lui est interdit.' },
    { titre: 'Le fil d’or', corps: 'Deux de vos fleurs en harmonie se relient d’un fil d’or. Fermez une chaîne de ces fils autour du centre et la partie est à vous.' },
    { titre: 'Les coups et les règles', corps: 'Le journal garde chaque coup joué, et le bouton Règles rappelle tout le reste quand vous en avez besoin.', ancre: 'journal' },
  ],
  EN: [
    { titre: 'Welcome to the table', corps: 'Pai Sho is played on a round board where each player grows a garden. Drag to walk around the table, and use the wheel or a pinch to come closer.' },
    { titre: 'Your reserve', corps: 'The tiles in your hand wait here. Tap a flower, then a highlighted gate on the board to plant it.', ancre: 'reserve' },
    { titre: 'Moving a flower', corps: 'Tap one of your flowers on the board. Green discs show where it can go, and a red halo warns you when a point is out of reach.' },
    { titre: 'The golden thread', corps: 'Two of your flowers in harmony are joined by a golden thread. Close a chain of those threads around the centre and the game is yours.' },
    { titre: 'Moves and rules', corps: 'The log keeps every move played, and the Rules button reminds you of everything else whenever you need it.', ancre: 'journal' },
  ],
};

const CLE_LANGUE = 'paisho.langue';
export function langueSauvee(): Langue {
  // L'anglais est la langue d'ouverture; le français revient à qui l'a choisi.
  try { return localStorage.getItem(CLE_LANGUE) === 'FR' ? 'FR' : 'EN'; } catch { return 'EN'; }
}
export function sauverLangue(l: Langue): void {
  try { localStorage.setItem(CLE_LANGUE, l); } catch { /* navigation privée */ }
}
