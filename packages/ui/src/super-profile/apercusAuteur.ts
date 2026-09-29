// apercusAuteur.ts : les deux espaces d'auteur fictifs servis à /apercu/auteur
// et /apercu/auteur-2, repris de Vexel Space (src/apercusAuteur.ts). Les
// personnes, les livres, les extraits, les lieux et les médias sont inventés,
// et la bio le dit en toutes lettres. Le premier garde la palette et les
// polices du Salon, que prend tout écrivain qui n'a encore rien choisi; le
// second porte la palette bleu et la paire roman. Les visuels sont des
// dessins vectoriels de Vexel Space (scripts/apercus-auteur-svg.py), jamais
// des photos.

import type { LibraireLivre, SuperProfileConfig } from './types';

const A = '/media/apercu/';

const SECTIONS_APERCU = { rendezvous: false, contact: false, liens: false } as const;

const libraires = (id: string): LibraireLivre[] => [
    { id: `${id}-ll`, nom: 'leslibraires.ca', url: 'https://www.leslibraires.ca/' },
    { id: `${id}-rb`, nom: 'Renaud-Bray', url: 'https://www.renaud-bray.com/' },
    { id: `${id}-az`, nom: 'Amazon', url: 'https://www.amazon.ca/' },
];

const ferland: SuperProfileConfig = {
    enabled: true,
    username: 'mathilde-ferland',
    medium: 'other',
    type: 'ecrivain',
    works: [],
    displayName: 'Mathilde Ferland',
    tagline: 'Des romans de famille et de fleuve, écrits lentement, pour les lecteurs qui aiment rester un peu dans la maison une fois l’histoire finie.',
    sections: { ...SECTIONS_APERCU },
    hero: { url: `${A}auteur-ferland-monogramme.svg`, storagePath: '', source: 'manual-png' },
    bio:
      'Mathilde Ferland est une romancière fictive, inventée pour montrer ce que devient un espace d’auteur dans le Creator Studio du Salon des Inconnus. Si elle existait, elle aurait grandi sur la rive sud du fleuve, dans une maison dont les volets changeaient de couleur moins souvent que les saisons, et elle écrirait le matin, avant que la maisonnée se réveille.\n\nSes trois romans suivent des femmes qui reviennent vers un lieu qu’elles croyaient avoir quitté pour de bon, et qui découvrent que le lieu, lui, ne les avait jamais laissées partir.',
    livres: [
      {
        id: 'volets', titre: 'La maison aux volets bleus', mention: 'Roman', annee: '2025',
        couvertureUrl: `${A}auteur-ferland-volets.svg`,
        resume: 'À quarante ans, Claire revient dans la maison de sa grand-mère pour la vendre, et trouve sur la table de la cuisine une liste d’épicerie qui se termine par un seul mot souligné deux fois.\n\nUn roman sur ce que les maisons retiennent quand les gens s’en vont, et sur le bleu exact qu’il faut parfois des mois pour retrouver.',
        libraires: libraires('volets'),
      },
      {
        id: 'fleuve', titre: 'Le fleuve en hiver', mention: 'Roman', annee: '2022',
        couvertureUrl: `${A}auteur-ferland-fleuve.svg`,
        resume: 'L’hiver où la glace prend jusqu’à l’île, tout un village veut traverser à pied, sauf l’homme qui écoute la glace chaque matin avec sa barre de fer.',
        libraires: libraires('fleuve'),
      },
      {
        id: 'rosalie', titre: 'Rosalie, l’été d’après', mention: 'Premier roman', annee: '2019',
        couvertureUrl: `${A}auteur-ferland-rosalie.svg`,
        resume: 'Un été de foin et de silence dans le Bas-Saint-Laurent, où une adolescente apprend que les adultes aussi attendent que quelqu’un parle en premier.',
        libraires: libraires('rosalie'),
      },
    ],
    extraits: [
      {
        id: 'x-volets', titre: 'Chapitre un', livre: 'volets',
        texte:
          'Ma grand-mère repeignait les volets chaque printemps, toujours du même bleu, un bleu qu’elle disait avoir choisi le jour où mon grand-père était parti pour les chantiers et qu’elle n’avait jamais voulu changer depuis, même quand la quincaillerie du village avait cessé de le vendre et qu’il fallait le commander à Québec, deux gallons à la fois, en payant la livraison plus cher que la peinture.\n' +
          'Quand je suis revenue dans la maison, l’automne de mes quarante ans, les volets avaient pâli jusqu’au gris, et c’est la première chose que j’ai remarquée en tournant dans l’allée, avant même la galerie affaissée et les herbes hautes qui avaient mangé le potager. J’ai coupé le moteur et je suis restée longtemps dans la voiture, les mains sur le volant, à regarder ce bleu qui n’en était plus un.\n' +
          'La clé était sous la troisième marche, là où elle avait toujours été. À l’intérieur, l’air sentait la poussière et le bois froid, avec une trace de lavande que je n’arrivais pas à situer, et sur la table de la cuisine il y avait encore sa liste d’épicerie, écrite de sa main penchée : du thé, des œufs, du fil blanc, et tout en bas, souligné deux fois, le mot peinture.\n' +
          'Je me suis assise à sa place, face à la fenêtre, et j’ai compris que je ne repartirais pas avant d’avoir retrouvé ce bleu-là.',
      },
      {
        id: 'x-fleuve', titre: 'La barre de fer', livre: 'fleuve',
        texte:
          'Le fleuve gelait rarement d’une rive à l’autre, mais cet hiver-là, pour la première fois depuis que mon père tenait le registre accroché derrière la porte de la remise, la glace avait pris jusqu’à l’île aux Ruaux, et les hommes du village parlaient de traverser à pied comme dans les histoires de leurs grands-pères.\n' +
          'Mon père, lui, ne disait rien. Il descendait chaque matin sur la grève avec sa barre de fer, frappait la glace à trois endroits et écoutait le son qu’elle rendait, puis il remontait sans un mot et inscrivait dans le registre un chiffre que personne d’autre que lui ne savait lire.\n' +
          'Le jour où Étienne Gagnon a voulu partir avec son traîneau et ses deux chiens, mon père s’est planté au bout du quai, les bras croisés dans son vieux manteau de laine, et il a attendu. Étienne a ri, puis il a cessé de rire, parce que mon père ne bougeait pas et que tout le village était sorti pour voir lequel des deux céderait le premier.\n' +
          'C’est Étienne qui a cédé, ce matin-là. Trois jours plus tard, la glace s’est ouverte au milieu du chenal dans un bruit de tonnerre qui a fait trembler les vitres jusqu’à l’église, et j’ai vu mon père, pour la seule fois de ma vie, fermer les yeux et remercier quelqu’un que je ne voyais pas.',
      },
    ],
    evenements: [
      { id: 'e1', date: '2026-10-18', titre: 'Lecture et signature', lieu: 'Librairie Le Fanal, Rimouski' },
      { id: 'e2', date: '2026-11-21', titre: 'Séance de dédicaces au salon du livre', lieu: 'Grand salon du livre de l’Est, stand 214', lien: 'https://example.com/' },
      { id: 'e3', date: '2027-01-23', titre: 'Club de lecture en ligne', lieu: 'Sur inscription, par l’infolettre' },
      { id: 'e0', date: '2026-05-09', titre: 'Lancement de La maison aux volets bleus', lieu: 'Café-librairie L’Entre-Deux, Kamouraska' },
    ],
    presse: [
      { source: 'Revue Encre douce (fictive)', citation: 'Une écriture patiente, qui laisse au lecteur le temps de s’asseoir dans la cuisine avec elle.' },
      { source: 'Radio des Berges (fictive)', citation: 'Le genre de roman qu’il est difficile de refermer avant la dernière page.' },
    ],
};

const lanctot: SuperProfileConfig = {
    enabled: true,
    username: 'victor-lanctot',
    medium: 'other',
    type: 'ecrivain',
    works: [],
    displayName: 'Victor Lanctôt',
    tagline: 'Des polars de route et de brume, où la nuit québécoise en sait toujours plus long que les enquêteurs.',
    theme: { palette: 'bleu', fonts: 'roman' },
    sections: { ...SECTIONS_APERCU },
    hero: { url: `${A}auteur-lanctot-monogramme.svg`, storagePath: '', source: 'manual-png' },
    bio:
      'Victor Lanctôt est un auteur fictif, inventé pour montrer un espace d’auteur de polar dans le Creator Studio du Salon des Inconnus. Dans sa vie imaginaire, il a conduit un taxi de nuit à Montréal pendant douze ans avant d’écrire son premier roman sur des napperons de casse-croûte, entre deux clients.\n\nSes enquêtes se passent là où la route s’allonge et où les téléphones ne captent plus, parce qu’il aime les endroits où les personnages n’ont plus personne à appeler.',
    livres: [
      {
        id: 'brume', titre: 'Brume sur la 117', mention: 'Polar', annee: '2026',
        couvertureUrl: `${A}auteur-lanctot-117.svg`,
        resume: 'Au kilomètre 212, une voiture attend sur l’accotement avec ses phares allumés et sa portière ouverte, mais personne n’est au volant. Le sergent Dubé a vingt-deux ans de métier sur cette route et il n’a jamais vu une disparition aussi propre.',
        libraires: libraires('brume'),
      },
      {
        id: 'quai', titre: 'Le dernier quai', mention: 'Polar', annee: '2024',
        couvertureUrl: `${A}auteur-lanctot-quai.svg`,
        resume: 'Un homme en habit de soirée au pied d’une grue du port de Sorel, et une carte d’embarquement pour un cargo parti sans lui.',
        libraires: libraires('quai'),
      },
      {
        id: 'hochelaga', titre: 'Nuit blanche à Hochelaga', mention: 'Polar', annee: '2021',
        couvertureUrl: `${A}auteur-lanctot-hochelaga.svg`,
        resume: 'Onze jours sans nouvelles de sa sœur, et une fenêtre de la rue Ontario qui reste allumée toute la nuit.',
        libraires: libraires('hochelaga'),
      },
      {
        id: 'eaux', titre: 'Les eaux dormantes', mention: 'Premier polar', annee: '2018',
        couvertureUrl: `${A}auteur-lanctot-eaux.svg`,
        resume: 'Un lac des Laurentides, un chalet fermé depuis vingt ans et un canot qui revient seul au quai.',
        libraires: libraires('eaux'),
      },
    ],
    extraits: [
      {
        id: 'x-brume', titre: 'Kilomètre 212', livre: 'brume',
        texte:
          'La voiture était arrêtée sur l’accotement, à la hauteur du kilomètre 212, les phares encore allumés dans une brume si épaisse que le sergent Dubé avait failli passer tout droit. Il était quatre heures du matin, la radio ne captait plus rien depuis Mont-Laurier, et la seule chose qui bougeait dans la lumière des phares, c’était la bruine qui tombait en biais.\n' +
          'Dubé a laissé tourner le moteur de l’autopatrouille et il s’est approché à pied, la main sur la lampe de poche plutôt que sur l’arme, parce que vingt-deux ans sur cette route lui avaient appris que les voitures arrêtées au milieu de la nuit cachaient plus souvent un orignal qu’un meurtrier.\n' +
          'La portière du conducteur était ouverte. Sur le siège, il y avait un sac à main, un téléphone dont l’écran s’allumait et s’éteignait au rythme des appels qui entraient sans réponse, et une tasse de café encore tiède dans le porte-gobelet, mais il n’y avait pas de conductrice, ni la moindre trace dans le gravier, vers la forêt comme vers le fossé, comme si elle s’était levée de son siège pour disparaître dans la brume sans toucher terre.\n' +
          'Dubé a regardé le téléphone sonner une dernière fois. Sur l’écran, il n’y avait qu’un seul mot : Maman.',
      },
      {
        id: 'x-quai', titre: 'La grue numéro quatre', livre: 'quai',
        texte:
          'Le port de Sorel ne dort jamais vraiment, mais entre deux heures et cinq heures il fait semblant, et c’est dans ce creux-là que Lucie Marchand avait appris à travailler, depuis que la section des crimes majeurs l’avait envoyée ici pour trois semaines qui duraient maintenant depuis deux ans.\n' +
          'Le corps avait été trouvé au pied de la grue numéro quatre par un débardeur qui fumait en cachette. Il ne l’avait pas touché, il le répétait à qui voulait l’entendre, et Lucie le croyait, parce que personne ne touche un homme vêtu d’un habit de trois mille dollars étendu dans une flaque d’huile sans laisser au moins une empreinte sur le tissu.\n' +
          'Elle s’est accroupie à côté du mort sans rien dire. Les chaussures étaient neuves, les semelles à peine rayées, et dans la poche intérieure du veston, pliée en quatre, il y avait une carte d’embarquement pour un cargo qui avait quitté le quai la veille à minuit, sans lui.\n' +
          'Au-dessus d’elle, la cabine rouge de la grue se balançait doucement dans le vent du fleuve, et Lucie a pensé que quelqu’un, là-haut, avait eu une vue parfaite sur tout ce qui s’était passé.',
      },
      {
        id: 'x-hochelaga', titre: 'La fenêtre d’en face', livre: 'hochelaga',
        texte:
          'Dans la rue Ontario, à trois heures du matin, il ne reste que les chats, les livreurs de journaux et les gens qui ont une raison de ne pas dormir. Samuel Roy faisait partie de la troisième catégorie depuis que sa sœur avait cessé de répondre au téléphone, onze jours plus tôt, et il connaissait maintenant chaque fenêtre de l’immeuble d’en face, celles qui s’éteignaient à minuit et celles qui ne s’allumaient jamais.\n' +
          'Au quatrième étage, pourtant, la troisième fenêtre à partir de la gauche restait éclairée toute la nuit, d’une lumière jaune de lampe ancienne, et depuis trois nuits une silhouette s’y tenait debout, immobile, tournée vers lui.\n' +
          'Samuel s’était d’abord dit que c’était une plante, un manteau sur une patère, n’importe quoi, jusqu’à ce que la silhouette lève la main, lentement, pour tracer sur la vitre embuée un chiffre qu’il avait mis une heure à reconnaître, parce qu’il était écrit à l’envers pour être lu de l’autre côté de la rue.\n' +
          'C’était le numéro de l’appartement de sa sœur.',
      },
    ],
    evenements: [
      { id: 'e1', date: '2026-10-09', titre: 'Soirée polar et lecture à voix haute', lieu: 'Bar Le Quai 12, Sorel-Tracy' },
      { id: 'e2', date: '2026-11-27', titre: 'Dédicaces au salon du livre', lieu: 'Salon du livre du Nord, allée C', lien: 'https://example.com/' },
      { id: 'e3', date: '2027-02-13', titre: 'La nuit du polar', lieu: 'Bibliothèque du Vieux-Moulin, Mont-Laurier' },
      { id: 'e0', date: '2026-04-16', titre: 'Lancement de Brume sur la 117', lieu: 'Librairie La Lanterne, Montréal' },
    ],
    presse: [
      { source: 'Le Polar du dimanche (fictif)', citation: 'Lanctôt connaît la 117 comme d’autres connaissent leur cuisine, et la brume y devient un personnage à part entière.' },
      { source: 'Magazine Nuit noire (fictif)', citation: 'Une enquête sèche et tendue, qui ne lâche le lecteur qu’à la dernière ligne.' },
      { source: 'Radio des Berges (fictive)', citation: 'Le meilleur polar de route que nous ayons lu cette année.' },
    ],
};

export const APERCUS_AUTEUR: Record<string, SuperProfileConfig> = {
    auteur: ferland,
    'auteur-2': lanctot,
};
