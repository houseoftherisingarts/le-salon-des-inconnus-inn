// ─── La leçon d'Iroh ────────────────────────────────────────────────
// Une partie entière, coups imposés, où l'élève (l'hôte) apprend les
// règles en jouant et gagne par l'anneau d'harmonies. Iroh (l'invité)
// répond par des coups légaux qui laissent le plan se faire. La ligne
// est rejouée par l'arbitre dans logic.test.ts.
//
// Le plan : quatre fleurs aux coins du rectangle (±6, ±1), tous en terre
// neutre, Rhododendron au nord-est et au sud-ouest, Chrysanthème au
// sud-est et au nord-ouest. Le Rhododendron d'ouverture fait le détour
// par la prise du Jade blanc avant de fermer l'anneau.

export interface EtapeLecon {
  /** Le coup que l'élève doit jouer (notation du moteur, ex. `R3@0,-8`, `0,-7>0,-4`). Absent = étape d'explication seule. */
  coup?: string;
  /** La réplique d'Iroh jouée automatiquement juste après le coup de l'élève. Absente à la dernière étape si l'élève vient de gagner. */
  reponse?: string;
  titreFR: string; titreEN: string;
  corpsFR: string; corpsEN: string;
  /** Zone de la page à entourer : 'reserve' (la main de l'élève), 'journal', ou rien (le plateau). */
  ancre?: 'reserve' | 'journal';
}

export const LECON: readonly EtapeLecon[] = [
  {
    titreFR: 'Une tasse avant la partie',
    titreEN: 'A cup before we play',
    corpsFR: 'Asseyez-vous, le thé est encore chaud. Je vais vous apprendre le Pai Sho comme mon vieux maître me l’a appris, les mains sur les tuiles, et nous jouerons une vraie partie du premier coup au dernier. Vous tenez les fleurs de l’hôte et vous ouvrez, je réponds avec celles de l’invité.',
    corpsEN: 'Sit down, the tea is still warm. I will teach you Pai Sho the way my old master taught me, hands on the tiles, and we will play a real game from the first move to the last. You hold the host’s flowers and you open, and I answer with the guest’s.',
  },
  {
    titreFR: 'Le plateau',
    titreEN: 'The board',
    corpsFR: 'Regardez le losange au milieu du plateau. Vu de votre place, il se partage en quatre quartiers qui alternent comme des carrés de potager, le rouge en haut à droite et en bas à gauche, le blanc en haut à gauche et en bas à droite. Autour du losange s’étend la terre neutre, large jusqu’au bord du cercle, où n’importe quelle fleur peut s’arrêter.',
    corpsEN: 'Look at the diamond in the middle of the board. Seen from your seat, it splits into four quarters that alternate like beds in a kitchen garden, red at the top right and bottom left, white at the top left and bottom right. Around the diamond lies the neutral ground, wide all the way to the rim, where any flower may stop.',
  },
  {
    titreFR: 'Les portes et le centre',
    titreEN: 'The gates and the centre',
    corpsFR: 'Les deux médianes coupent le plateau en croix et chacune finit sur une porte, au nord, au sud, à l’est et à l’ouest. Les fleurs entrent par là et n’y reviennent jamais. Le centre se trouve au croisement des médianes : la partie se gagne en l’entourant d’un anneau d’harmonies qui ne le touche pas, et c’est vers lui que vos fleurs vont pousser.',
    corpsEN: 'The two midlines cross the board, and each one ends at a gate, north, south, east and west. Flowers come in through the gates and never go back. The centre sits where the midlines meet: the game is won by closing a ring of harmonies around it without touching it, so that is where your flowers will grow.',
  },
  {
    titreFR: 'Votre réserve',
    titreEN: 'Your reserve',
    corpsFR: 'Votre main contient trois exemplaires de chacune des six fleurs de base. La Rose, le Chrysanthème et le Rhododendron sont rouges, le Jasmin, le Lys et le Jade blanc sont blancs, et le chiffre de chaque fleur, de trois à cinq, dit combien de points elle peut parcourir. Le Lotus blanc, l’Orchidée et les quatre accents attendent à côté : ceux-là ne sortent qu’en récompense, vous verrez bientôt comment.',
    corpsEN: 'Your hand holds three of each of the six basic flowers. The Rose, the Chrysanthemum and the Rhododendron are red, the Jasmine, the Lily and the White jade are white, and the number on each flower, from three to five, tells how many points it may travel. The White lotus, the Orchid and the four accents wait beside them. Those only come out as a reward, and you will soon see how.',
    ancre: 'reserve',
  },
  {
    coup: 'R5@0,-8',
    reponse: 'R5@0,8',
    titreFR: 'Planter en porte',
    titreEN: 'Planting in a gate',
    corpsFR: 'Prenez un Rhododendron et plantez-le dans votre porte, celle du sud, juste devant vous. Une fleur posée dans une porte attend son heure et ne compte pour aucune harmonie tant qu’elle n’en est pas sortie. Pour l’ouverture, je planterai la même fleur dans la porte d’en face.',
    corpsEN: 'Take a Rhododendron and plant it in your gate, the southern one, right in front of you. A flower in a gate is waiting for its moment, and it counts for no harmony until it steps out. For the opening I will plant the same flower in the gate across from you.',
  },
  {
    coup: '0,-8>-1,-4',
    reponse: '0,8>-2,6',
    titreFR: 'Faire marcher une fleur',
    titreEN: 'Moving a flower',
    corpsFR: 'Votre Rhododendron porte le chiffre cinq, il peut donc parcourir jusqu’à cinq points, en ligne droite ou en tournant, jamais en diagonale ni par-dessus une autre tuile. Menez-le quatre points vers le nord, puis un vers l’ouest. Il s’arrête dans le jardin rouge, où il est chez lui. Chaque coup s’inscrit au journal, et vous pourrez y relire la partie quand la théière sera vide.',
    corpsEN: 'Your Rhododendron carries a five, so it may travel up to five points, straight or turning, never diagonally and never over another tile. Walk it four points north, then one to the west. It stops in the red garden, where it belongs. Every move goes into the journal, and you can read the game back there once the teapot is empty.',
    ancre: 'journal',
  },
  {
    coup: 'R4@8,0',
    reponse: 'R4@0,8',
    titreFR: 'Les autres portes',
    titreEN: 'The other gates',
    corpsFR: 'Toute porte libre vous est ouverte, même si vous avez commencé au sud, et celles de l’est et de l’ouest n’attendent que vous. Plantez un Chrysanthème dans la porte de l’est, à votre droite. J’en profiterai pour planter le mien chez moi, puisque mon Rhododendron vient de quitter ma porte.',
    corpsEN: 'Any empty gate is open to you, even though you began in the south, and the east and west gates are waiting. Plant a Chrysanthemum in the east gate, on your right. I will use the moment to plant mine at home, since my Rhododendron has just left my gate.',
  },
  {
    coup: '8,0>6,-1',
    reponse: '0,8>2,6',
    titreFR: 'Le jardin qui vous est fermé',
    titreEN: 'The garden closed to you',
    corpsFR: 'Menez votre Chrysanthème deux points vers l’ouest, puis un vers le sud. Il s’arrête au bord du jardin blanc, sur une lisière de terre neutre où toute fleur est chez elle. Un pas de plus vers le centre l’aurait fait entrer dans le blanc, et une fleur rouge n’a pas le droit de s’y arrêter, pas plus qu’une fleur blanche ne s’arrête dans le rouge.',
    corpsEN: 'Move your Chrysanthemum two points west, then one south. It stops at the edge of the white garden, on a strip of neutral ground where every flower is welcome. One more step toward the centre would have taken it into the white, and a red flower may not stop there, any more than a white flower may stop in the red.',
  },
  {
    coup: 'R5@8,0',
    reponse: 'W5@-8,0',
    titreFR: 'L’harmonie',
    titreEN: 'Harmony',
    corpsFR: 'Regardez ce que je viens de faire au nord. Mon Rhododendron et mon Chrysanthème se tiennent sur la même rangée sans rien entre eux, et un fil d’or les relie. Les six fleurs tournent sur un cercle, de la Rose au Chrysanthème et au Rhododendron, puis au Jasmin, au Lys et au Jade blanc avant de revenir à la Rose; deux fleurs d’un même camp, voisines sur ce cercle et qui se voient en ligne, forment une harmonie. Plantez un Rhododendron à l’est pour préparer la vôtre.',
    corpsEN: 'Look at what I have just done in the north. My Rhododendron and my Chrysanthemum stand on the same row with nothing between them, and a golden thread links them. The six flowers turn on a circle, from Rose to Chrysanthemum to Rhododendron, then Jasmine, Lily and White jade before coming back to Rose. Two flowers of the same side that are neighbours on that circle and see each other along a line form a harmony. Plant a Rhododendron in the east to prepare yours.',
  },
  {
    coup: '8,0>6,1+ROCHER@4,6',
    reponse: '-8,0>-6,-3',
    titreFR: 'Le geste de plus',
    titreEN: 'The extra action',
    corpsFR: 'Menez ce Rhododendron deux points vers l’ouest et un vers le nord, juste au-dessus de votre Chrysanthème. Ils se voient le long de la colonne et sont voisins sur le cercle : votre première harmonie vient de naître. Une harmonie nouvelle vous accorde un geste de plus, alors posez le Rocher sur la rangée de mes deux fleurs, un peu à l’est. Un rocher coupe les harmonies de sa rangée et de sa colonne, et mon fil d’or s’éteint.',
    corpsEN: 'Move this Rhododendron two points west and one north, just above your Chrysanthemum. They see each other along the column and they are neighbours on the circle, so your first harmony is born. A new harmony grants you one more action, so place the Rock on the row of my two flowers, a little to the east. A rock cuts every harmony along its row and its column, and my golden thread goes dark.',
  },
  {
    coup: 'R4@-8,0',
    reponse: '-6,-3>-4,-3',
    titreFR: 'Le choc',
    titreEN: 'The clash',
    corpsFR: 'Mon Jade blanc a quitté la porte de l’ouest, plantez-y donc un Chrysanthème. Surveillez ce Jade, car il est à l’opposé de votre Rhododendron sur le cercle, et deux fleurs opposées se heurtent comme le Jasmin heurte la Rose et le Lys le Chrysanthème. Aucun coup, le vôtre comme le mien, ne peut les laisser face à face sur une ligne libre.',
    corpsEN: 'My White jade has left the west gate, so plant a Chrysanthemum there. Keep an eye on that Jade. It sits opposite your Rhododendron on the circle, and opposite flowers clash, just as Jasmine clashes with Rose and Lily with Chrysanthemum. No move, yours or mine, may leave two of them facing each other on an open line.',
  },
  {
    coup: '-8,0>-6,1+R3@8,0',
    reponse: 'W3@0,8',
    titreFR: 'Une deuxième harmonie',
    titreEN: 'A second harmony',
    corpsFR: 'Avancez ce Chrysanthème de deux points vers l’est et d’un vers le nord. D’un bout à l’autre de la rangée qui passe juste au-dessus du centre, il voit votre Rhododendron de l’est, et cette harmonie vous offre un nouveau geste. Cette fois, plantez une Rose dans la porte de l’est, ce qui est permis parce qu’aucune de vos fleurs n’attend déjà dans une porte.',
    corpsEN: 'Bring this Chrysanthemum two points east and one north. From one end of the row to the other, just above the centre, it sees your eastern Rhododendron, and that harmony grants you another action. This time, plant a Rose in the east gate. You may, because none of your flowers is already waiting in a gate.',
  },
  {
    coup: '-1,-4>-4,-3',
    reponse: '0,8>0,5',
    titreFR: 'La prise',
    titreEN: 'Capturing',
    corpsFR: 'Mon Jade blanc s’est approché de votre premier Rhododendron sans jamais lui faire face. Faites trois pas vers l’ouest et un vers le nord pour vous poser sur lui. Une fleur prend la fleur adverse avec laquelle elle se heurte, et la tuile prise quitte la partie. Je vous l’ai laissé, comme je garde la meilleure feuille du pot pour un invité.',
    corpsEN: 'My White jade has come close to your first Rhododendron without ever facing it. Take three steps west and one north and land on it. A flower captures an opposing flower it clashes with, and the captured tile leaves the game. I left it for you, the way I keep the best leaves in the pot for a guest.',
  },
  {
    coup: '-4,-3>-6,-1',
    titreFR: 'L’anneau',
    titreEN: 'The ring',
    corpsFR: 'Menez votre Rhododendron deux points vers l’ouest et deux vers le nord, sur la rangée qui passe juste au sud du centre. Il y retrouve vos deux Chrysanthèmes, et les quatre fils d’or se referment autour du centre sans le toucher : cet anneau vous donne la partie. Sans lui, nous aurions joué jusqu’à ce qu’un de nous plante sa dernière fleur de base, et celui qui comptait le plus d’harmonies enjambant les médianes l’aurait emporté. Je vais refaire du thé.',
    corpsEN: 'Move your Rhododendron two points west and two north, onto the row just south of the centre. There it meets both your Chrysanthemums, and the four golden threads close around the centre without touching it. That ring wins you the game. Without it we would have played on until one of us planted a last basic flower, and whoever held more harmonies across the midlines would have won. I will make another pot of tea.',
  },
];

/** La liste des coups dans l'ordre (élève, Iroh, élève, …), dérivée de LECON. */
export const COUPS_LECON: readonly string[] = LECON.flatMap((e) => [e.coup, e.reponse].filter((c): c is string => c !== undefined));
