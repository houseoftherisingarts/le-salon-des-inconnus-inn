// Contenu du Café-jeux (/cafe-jeux). Les prix en dollars sont ceux affichés;
// le serveur (functions/src/cafeJeux.ts) garde sa propre table et fait foi.

type T = { FR: string; EN: string };

export type Skin = {
  id: string;
  type: 'plateau' | 'tuiles';
  nom: T;
  texte: T;
  petales: number;
  prix: number; // CAD
  teinte: string; // pastille d'aperçu
};

export const SKINS_PAI_SHO: Skin[] = [
  {
    id: 'vexel', type: 'plateau', petales: 600, prix: 4.99,
    nom: { FR: 'Plateau Vexel, fini métal', EN: 'Vexel board, metal finish' },
    texte: { FR: 'Le plateau passe au métal brossé, aux couleurs de Vexel.', EN: 'The board turns to brushed metal, in Vexel colours.' },
    teinte: 'conic-gradient(from 210deg, #c9ced6, #6b7380, #e8ecf1, #59616d, #c9ced6)',
  },
  {
    id: 'salon', type: 'plateau', petales: 600, prix: 4.99,
    nom: { FR: 'Plateau du Salon, érable pâle', EN: 'Salon board, pale maple' },
    texte: { FR: 'Un érable pâle et lisse, le bois clair de la maison.', EN: 'A smooth pale maple, the light wood of the house.' },
    teinte: 'repeating-linear-gradient(100deg, #ead6b0 0 6px, #dcc395 6px 9px, #f0e0c0 9px 15px)',
  },
  {
    id: 'nacre', type: 'tuiles', petales: 350, prix: 2.99,
    nom: { FR: 'Tuiles de nacre', EN: 'Mother-of-pearl tiles' },
    texte: { FR: 'Des tuiles irisées qui changent de teinte avec la lumière.', EN: 'Iridescent tiles that shift colour with the light.' },
    teinte: 'conic-gradient(from 40deg, #f4efe6, #d9e6f2, #f1dcea, #e3f1e4, #f4efe6)',
  },
  {
    id: 'obsidienne', type: 'tuiles', petales: 350, prix: 2.99,
    nom: { FR: 'Tuiles d’obsidienne', EN: 'Obsidian tiles' },
    texte: { FR: 'Une pierre noire et polie, qui renvoie le feu de la taverne.', EN: 'A black polished stone that throws back the tavern fire.' },
    teinte: 'radial-gradient(circle at 32% 28%, #5d5a66 0%, #1b1a20 45%, #0b0a0d 100%)',
  },
  {
    id: 'cuivre', type: 'tuiles', petales: 350, prix: 2.99,
    nom: { FR: 'Tuiles de cuivre', EN: 'Copper tiles' },
    texte: { FR: 'Un cuivre martelé qui rougit sous les lampes.', EN: 'Hammered copper that reddens under the lamps.' },
    teinte: 'radial-gradient(circle at 30% 28%, #f2b48a 0%, #b8653a 45%, #6e3418 100%)',
  },
];

export type JeuFestival = { id: string; nom: T; texte: T; image: string; url: T };

const FMM = 'https://festivalmedievaldemontpellier.org';

export const JEUX_FESTIVAL: JeuFestival[] = [
  {
    id: 'merelle', image: '/media/cafe-jeux/fmm-merelle.webp',
    nom: { FR: 'La Mérelle', EN: 'Nine Men’s Morris' },
    texte: { FR: 'Le jeu des moulins, où chaque alignement de trois enlève une pièce à l’autre camp.', EN: 'The mill game, where every line of three takes a piece from the other side.' },
    url: { FR: `${FMM}/jeux/merelle`, EN: `${FMM}/en/games/merelle` },
  },
  {
    id: 'renard', image: '/media/cafe-jeux/fmm-renard.webp',
    nom: { FR: 'Le Renard et les Oies', EN: 'Fox and Geese' },
    texte: { FR: 'Les oies montent en bloc vers la tanière pendant que le renard cherche le saut qui éclaircira le troupeau.', EN: 'The geese climb together toward the den while the fox looks for the leap that will thin the flock.' },
    url: { FR: `${FMM}/jeux/renard`, EN: `${FMM}/en/games/fox-and-geese` },
  },
  {
    id: 'tafl', image: '/media/cafe-jeux/fmm-tafl-v2.webp',
    nom: { FR: 'Hnefatafl', EN: 'Hnefatafl' },
    texte: { FR: 'Un roi cerné par des dissidents cherche la sortie par un des quatre coins de la taverne.', EN: 'A king ringed by dissidents looks for the way out through one of the four corners of the tavern.' },
    url: { FR: `${FMM}/jeunesse/hnefatafl`, EN: `${FMM}/en/youth/hnefatafl` },
  },
  {
    id: 'des', image: '/media/cafe-jeux/fmm-des.webp',
    nom: { FR: 'Les dés du menteur', EN: 'Liar’s Dice' },
    texte: { FR: 'Cinq dés sous le gobelet, et une annonce qui monte jusqu’à ce que quelqu’un doute.', EN: 'Five dice under the cup, and a bid that climbs until someone doubts.' },
    url: { FR: `${FMM}/jeux/des`, EN: `${FMM}/en/games/dice` },
  },
  {
    id: 'chouette', image: '/media/cafe-jeux/fmm-chouette.webp',
    nom: { FR: 'Le Cul de chouette', EN: 'Cul de chouette' },
    texte: { FR: 'Le jeu de dés de Kaamelott, qui se joue à trois dés avec ses cris et ses paris.', EN: 'The dice game from Kaamelott, played with three dice, its shouts and its bets.' },
    url: { FR: `${FMM}/jeux/chouette`, EN: `${FMM}/en/games/cul-de-chouette` },
  },
  {
    id: 'tarot', image: '/media/cafe-jeux/fmm-tarot.webp',
    nom: { FR: 'Tarot de Marseille', EN: 'Marseille Tarot' },
    texte: { FR: 'Une carte, trois cartes ou la croix celtique en dix lames, et chacune reçoit sa lecture.', EN: 'One card, three cards or the ten of the Celtic cross, and each gets its reading.' },
    url: { FR: `${FMM}/jeux/tarot`, EN: `${FMM}/en/games/tarot` },
  },
];

export const TEXTES = {
  FR: {
    eyebrow: 'Le Salon des Inconnus · Café-jeux',
    titre: 'Le Café-jeux',
    lede: 'Une table de Pai Sho en bois vous attend dans la taverne, les jeux du Festival médiéval de Montpellier se jouent juste à côté, et chaque jeu garde sa boutique de parures, que vous réglez avec les pétales gagnés à la table ou par carte.',
    cta: 'Prendre place',
    vosPetales: 'Vos pétales',
    paiEyebrow: 'Le jeu de la maison',
    paiTitre: 'Pai Sho, le jardin de bois',
    paiTexte: 'Chaque fleur posée sur le plateau rond cherche ses voisines, et la première personne qui referme un cercle d’harmonies autour du centre remporte la partie. Vous jouez contre un habitué de la taverne, à deux sur le même appareil ou à distance avec quelqu’un qui vous attend ailleurs.',
    pleinEcran: 'Plein écran',
    quitter: 'Quitter le plein écran',
    cadreTitre: 'Pai Sho, la table de la taverne',
    boutique: 'La boutique du jardin',
    gain: 'Chaque partie jouée contre la maison ou à distance vous rapporte des pétales, et une victoire contre la maison en rapporte trois fois plus, d’autant que le niveau est élevé.',
    plateaux: 'Plateaux',
    tuiles: 'Tuiles',
    petales: 'pétales',
    possede: 'Dans votre jardin',
    manque: (n: number) => `Encore ${n} pétales`,
    carteCompte: 'Le paiement par carte demande un compte du Salon, pour que la parure vous suive d’un appareil à l’autre.',
    merci: (nom: string) => `La parure « ${nom} » est maintenant dans votre jardin et vous attend à la prochaine partie.`,
    gagne: (n: number) => `+${n} pétales`,
    erreur: 'Le paiement n’a pas pu s’ouvrir. Réessayez dans un instant.',
    fmmEyebrow: 'Les jeux du festival',
    fmmTitre: 'La table du Festival médiéval',
    fmmTexte: 'Le Festival médiéval de Montpellier a fait tailler ses propres jeux, de la mérelle du seigneur au cul de chouette de la taverne, et ils se jouent ici sans quitter le café. La partie demande un compte du festival, parce que c’est lui qui garde vos parties et vos défis.',
    jouer: 'Jouer ici',
    enCours: 'Sur la table',
    surLeSite: 'Ouvrir sur le site du festival',
    fermer: 'Fermer',
  },
  EN: {
    eyebrow: 'Le Salon des Inconnus · Games café',
    titre: 'The Games Café',
    lede: 'A wooden Pai Sho table waits for you in the tavern, the games of the Montpellier Medieval Festival are played right beside it, and every game keeps its own shop of finishes, paid with the petals you win at the table or by card.',
    cta: 'Take a seat',
    vosPetales: 'Your petals',
    paiEyebrow: 'The house game',
    paiTitre: 'Pai Sho, the wooden garden',
    paiTexte: 'Every flower laid on the round board looks for its neighbours, and the first player to close a ring of harmonies around the centre wins. You play against a tavern regular, two on the same device, or at a distance with someone waiting for you elsewhere.',
    pleinEcran: 'Full screen',
    quitter: 'Exit full screen',
    cadreTitre: 'Pai Sho, the tavern table',
    boutique: 'The garden shop',
    gain: 'Every game played against the house or at a distance earns you petals, and a win against the house earns three times more, all the more as the level rises.',
    plateaux: 'Boards',
    tuiles: 'Tiles',
    petales: 'petals',
    possede: 'In your garden',
    manque: (n: number) => `${n} petals to go`,
    carteCompte: 'Paying by card needs a Salon account, so the finish follows you from one device to the next.',
    merci: (nom: string) => `“${nom}” is now in your garden and waits for you at the next game.`,
    gagne: (n: number) => `+${n} petals`,
    erreur: 'The payment could not open. Please try again in a moment.',
    fmmEyebrow: 'The festival games',
    fmmTitre: 'The Medieval Festival table',
    fmmTexte: 'The Montpellier Medieval Festival had its own games carved, from the lord’s merels to the tavern’s cul de chouette, and they are played here without leaving the café. A game needs a festival account, since that account keeps your matches and your challenges.',
    jouer: 'Play here',
    enCours: 'On the table',
    surLeSite: 'Open on the festival site',
    fermer: 'Close',
  },
};
