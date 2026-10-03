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
    corpsFR: 'Asseyez-vous, asseyez-vous. Le thé est encore chaud, et partager une tasse avec un inconnu fascinant est l’un des vrais délices de la vie. J’ai toujours dit que le Pai Sho est bien plus qu’un jeu, alors je ne vais pas vous l’expliquer : nous allons le jouer, une vraie partie, de la première tuile à la dernière. Vous tenez les fleurs de l’hôte et vous ouvrez, je répondrai avec celles de l’invité.',
    corpsEN: 'Sit, sit. The tea is still warm, and sharing tea with a fascinating stranger is one of life’s true delights. I have always said that Pai Sho is more than just a game, so I will not explain it to you. We will play it, a real game, from the first tile to the last. You hold the host’s flowers and you open. I will answer with the guest’s.',
  },
  {
    titreFR: 'Le plateau',
    titreEN: 'The board',
    corpsFR: 'Regardez le losange au milieu du plateau. Un bon jardin se plante en carrés, et celui-ci en compte quatre : vu de votre place, le rouge en haut à droite et en bas à gauche, le blanc en haut à gauche et en bas à droite. Tout autour s’étend la terre neutre, large jusqu’au bord du cercle, où n’importe quelle fleur peut se reposer. Prenez votre temps, le plateau ne s’en ira pas, et le thé non plus.',
    corpsEN: 'Look at the diamond in the middle of the board. A good garden is planted in beds, and this one has four. Seen from your seat, red lies at the top right and bottom left, white at the top left and bottom right. All around it stretches the neutral ground, wide all the way to the rim, where any flower may rest. Take your time. The board is not going anywhere, and neither is the tea.',
  },
  {
    titreFR: 'Les portes et le centre',
    titreEN: 'The gates and the centre',
    corpsFR: 'Deux médianes traversent le plateau en croix et chacune finit sur une porte, si bien qu’il y en a une à chaque point cardinal. Une fleur entre par une porte et n’y revient jamais, un peu comme un jeune homme qui quitte la maison. Là où les médianes se croisent se trouve le centre : la partie se gagne en refermant autour de lui un anneau d’harmonies qui ne le touche jamais, et c’est vers lui que vos fleurs vont pousser.',
    corpsEN: 'Two midlines cross the board, and each one ends at a gate, so there is a gate at every point of the compass. A flower enters through a gate and never returns to one, much like a young man leaving home. Where the midlines meet is the centre. The game is won by closing a ring of harmonies around it without ever touching it, and that is where your flowers will grow.',
  },
  {
    titreFR: 'Votre réserve',
    titreEN: 'Your reserve',
    corpsFR: 'Votre main contient trois exemplaires de chacune des six fleurs de base. La Rose, le Chrysanthème et le Rhododendron sont rouges, et leurs sœurs blanches s’appellent le Jasmin, le Lys et le Jade blanc, qui est ravissant sur un plateau et que je ne recommande à personne dans une théière. Le chiffre que porte chaque tuile, de trois à cinq, dit combien de points elle peut parcourir. Le Lotus blanc, l’Orchidée et les quatre accents attendent à côté. La plupart des gens trouvent la tuile du lotus insignifiante, et je n’ai jamais été de l’avis de la plupart des gens. Ces tuiles-là ne sortent qu’en récompense, vous verrez bientôt comment.',
    corpsEN: 'Your hand holds three of each of the six basic flowers. The Rose, the Chrysanthemum and the Rhododendron are red, and their white sisters are the Jasmine, the Lily and the White jade, which is lovely on a board and which I do not recommend in a teapot. The number on each tile, from three to five, tells how many points it may travel. The White lotus, the Orchid and the four accents wait to one side. Most people think the lotus tile insignificant, and I have never agreed with most people. Those tiles come out only as a reward, and you will soon see how.',
    ancre: 'reserve',
  },
  {
    coup: 'R5@0,-8',
    reponse: 'R5@0,8',
    titreFR: 'Planter en porte',
    titreEN: 'Planting in a gate',
    corpsFR: 'Prenez un Rhododendron et plantez-le dans votre porte, celle du sud, juste devant vous. Une fleur dans une porte ressemble à un thé qui infuse encore : elle n’est pas prête, et elle ne compte pour aucune harmonie tant qu’elle n’en est pas sortie. Pour l’ouverture, je planterai la même fleur dans la porte d’en face, par politesse.',
    corpsEN: 'Take a Rhododendron and plant it in your gate, the southern one, right in front of you. A flower in a gate is like tea that is still steeping: it is not ready yet, and it counts for no harmony until it steps out. For the opening, I will plant the same flower in the gate across from you. It is only polite.',
  },
  {
    coup: '0,-8>-1,-4',
    reponse: '0,8>-2,6',
    titreFR: 'Faire marcher une fleur',
    titreEN: 'Moving a flower',
    corpsFR: 'Votre Rhododendron porte le chiffre cinq, il peut donc parcourir jusqu’à cinq points. Il suit les lignes et peut tourner en chemin, mais il ne coupe jamais en diagonale et ne saute jamais par-dessus une autre tuile, parce qu’il n’y a pas de raccourci dans un jardin. Menez-le quatre points vers le nord, puis un vers l’ouest. Il s’arrête dans le jardin rouge, où il est chez lui. Chaque coup s’inscrit au journal, et vous pourrez y relire la partie quand la théière sera vide.',
    corpsEN: 'Your Rhododendron carries a five, so it may travel up to five points. It follows the lines and may turn as it goes, but it never cuts across a diagonal and never jumps another tile, because there are no shortcuts in a garden. Walk it four points north, then one to the west. It stops in the red garden, where it belongs. Every move is written in the journal, and you may read the game back there once the teapot is empty.',
    ancre: 'journal',
  },
  {
    coup: 'R4@8,0',
    reponse: 'R4@0,8',
    titreFR: 'Les autres portes',
    titreEN: 'The other gates',
    corpsFR: 'Toute porte libre vous est ouverte, même si vous avez commencé au sud, et un jardinier avisé ne plante pas tout par la même porte. Plantez un Chrysanthème dans la porte de l’est, à votre droite. J’en profiterai pour planter le mien chez moi, puisque mon Rhododendron vient de quitter ma porte.',
    corpsEN: 'Any empty gate is open to you, even though you began in the south, and a wise gardener does not plant everything by the same door. Plant a Chrysanthemum in the east gate, on your right. I will take the moment to plant mine at home, since my Rhododendron has just left my gate.',
  },
  {
    coup: '8,0>6,-1',
    reponse: '0,8>2,6',
    titreFR: 'Le jardin qui vous est fermé',
    titreEN: 'The garden closed to you',
    corpsFR: 'Menez votre Chrysanthème deux points vers l’ouest, puis un vers le sud. Il s’arrête au bord du jardin blanc, sur une lisière de terre neutre où toute fleur est la bienvenue. Un pas de plus vers le centre l’aurait fait entrer dans le blanc, et une fleur rouge n’a pas le droit de s’y arrêter, pas plus qu’une fleur blanche ne s’arrête dans le rouge. Chaque fleur a la terre qui lui convient, et les gens aussi.',
    corpsEN: 'Move your Chrysanthemum two points west, then one south. It stops at the edge of the white garden, on a strip of neutral ground where every flower is welcome. One more step toward the centre would have carried it into the white, and a red flower may not rest there, any more than a white flower may rest in the red. Every flower has the soil that suits it. So do people.',
  },
  {
    coup: 'R5@8,0',
    reponse: 'W5@-8,0',
    titreFR: 'L’harmonie',
    titreEN: 'Harmony',
    corpsFR: 'Regardez maintenant ce que je viens de faire au nord. Mon Rhododendron et mon Chrysanthème se tiennent sur la même rangée sans rien entre eux, et un fil d’or les relie. Les six fleurs sont assises en cercle : la Rose a pour voisin le Chrysanthème, qui a pour voisin le Rhododendron, et viennent ensuite le Jasmin, le Lys et le Jade blanc, qui retrouve la Rose. Deux fleurs d’un même camp, voisines sur ce cercle et qui se voient le long d’une ligne, forment une harmonie, et il en va à peu près de même pour les gens. Plantez un Rhododendron à l’est pour préparer la vôtre.',
    corpsEN: 'Now look at what I have done in the north. My Rhododendron and my Chrysanthemum stand on the same row with nothing between them, and a golden thread joins them. The six flowers sit on a circle, from Rose to Chrysanthemum to Rhododendron, then Jasmine, Lily and White jade, and back to Rose. Two flowers of the same side that are neighbours on that circle, and that can see each other along a line, form a harmony. It is much the same with people. Plant a Rhododendron in the east to prepare yours.',
  },
  {
    coup: '8,0>6,1+ROCHER@4,6',
    reponse: '-8,0>-6,-3',
    titreFR: 'Le geste de plus',
    titreEN: 'The extra action',
    corpsFR: 'Menez ce Rhododendron deux points vers l’ouest et un vers le nord, en face de votre Chrysanthème, de l’autre côté de la médiane. Ils se voient le long de la colonne et sont voisins sur le cercle : voilà votre première harmonie. Une harmonie nouvelle vous accorde un geste de plus, alors posez le Rocher sur la rangée de mes deux fleurs, un peu à l’est. Un rocher coupe les harmonies de sa rangée et de sa colonne, et mon fil d’or s’éteint. Ah. Celle-là, je vous l’ai peut-être trop bien enseignée.',
    corpsEN: 'Move this Rhododendron two points west and one north, across the midline from your Chrysanthemum. They see each other along the column and they are neighbours on the circle. There, your first harmony. A new harmony earns you one more action, so place the Rock on the row of my two flowers, a little to the east. A rock cuts every harmony along its row and its column, and my golden thread goes dark. Ah. I may have taught you that one too well.',
  },
  {
    coup: 'R4@-8,0',
    reponse: '-6,-3>-4,-3',
    titreFR: 'Le choc',
    titreEN: 'The clash',
    corpsFR: 'Mon Jade blanc a quitté la porte de l’ouest, plantez-y donc un Chrysanthème, et gardez un œil sur ce Jade. Il est assis en face de votre Rhododendron sur le cercle, et deux fleurs qui se font face se heurtent, comme le Jasmin heurte la Rose et le Lys le Chrysanthème. Aucun coup, ni le vôtre ni le mien, ne peut les laisser face à face sur une ligne libre, car certains invités ne se placent pas à la même table.',
    corpsEN: 'My White jade has left the west gate, so plant a Chrysanthemum there. And keep an eye on that Jade. It sits across the circle from your Rhododendron, and flowers that sit across from each other clash, as Jasmine clashes with Rose and Lily with Chrysanthemum. No move, yours or mine, may leave two of them facing each other on an open line. Some guests should not be seated at the same table.',
  },
  {
    coup: '-8,0>-6,1+R3@8,0',
    reponse: 'W3@0,8',
    titreFR: 'Une deuxième harmonie',
    titreEN: 'A second harmony',
    corpsFR: 'Avancez ce Chrysanthème de deux points vers l’est et d’un vers le nord. D’un bout à l’autre de la rangée qui passe juste au-dessus du centre, il voit votre Rhododendron de l’est, et cette harmonie vous offre un nouveau geste. Cette fois, plantez une Rose dans la porte de l’est, ce qui est permis parce qu’aucune de vos fleurs n’attend déjà dans une porte. Une tasse à la fois, une fleur à la fois.',
    corpsEN: 'Bring this Chrysanthemum two points east and one north. From the far end of the row that runs just above the centre, it sees your eastern Rhododendron, and that harmony earns you another action. This time, plant a Rose in the east gate. You may, because none of your flowers is already waiting in a gate. One cup at a time, one flower at a time.',
  },
  {
    coup: '-1,-4>-4,-3',
    reponse: '0,8>0,5',
    titreFR: 'La prise',
    titreEN: 'Capturing',
    corpsFR: 'Mon Jade blanc s’est promené tout près de votre premier Rhododendron sans jamais lui faire face. Faites trois pas vers l’ouest et un vers le nord pour vous poser sur lui. Une fleur prend la fleur adverse avec laquelle elle se heurte, et la tuile prise quitte la partie. Ne soyez pas triste pour moi : je vous l’ai laissé, comme je garde les meilleures feuilles du pot pour un invité.',
    corpsEN: 'My White jade has wandered close to your first Rhododendron without ever facing it. Take three steps west and one north, and land on it. A flower captures the opposing flower it clashes with, and the captured tile leaves the game. Do not feel bad for me. I left it for you, the way I keep the best leaves in the pot for a guest.',
  },
  {
    coup: '-4,-3>-6,-1',
    titreFR: 'L’anneau',
    titreEN: 'The ring',
    corpsFR: 'Menez votre Rhododendron deux points vers l’ouest et deux vers le nord, sur la rangée qui passe juste au sud du centre. Il y retrouve vos deux Chrysanthèmes, et les quatre fils d’or se referment autour du centre sans le toucher : cet anneau vous donne la partie. Sans lui, nous aurions joué jusqu’à ce que l’un de nous plante sa dernière fleur de base, et celui qui comptait le plus d’harmonies enjambant les médianes l’aurait emporté. Allez, refermez-le. Je remets la bouilloire sur le feu.',
    corpsEN: 'Move your Rhododendron two points west and two north, onto the row just south of the centre. There it meets both your Chrysanthemums, and the four golden threads close around the centre without touching it. That ring gives you the game. Without it, we would have played on until one of us planted the last basic flower, and whoever held more harmonies across the midlines would have won. Go on, close it. I will put the kettle back on.',
  },
];

/** La liste des coups dans l'ordre (élève, Iroh, élève, …), dérivée de LECON. */
export const COUPS_LECON: readonly string[] = LECON.flatMap((e) => [e.coup, e.reponse].filter((c): c is string => c !== undefined));
