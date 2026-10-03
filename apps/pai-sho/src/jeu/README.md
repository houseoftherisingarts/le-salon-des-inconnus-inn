# Le module de jeu du Pai Sho

Règles du Skud Pai Sho de base (livret de 2022), arbitre et adversaire de bois. Tout est pur : aucune classe, aucun effet de bord, rien qui dépende de Three.js ou de React. Référence : `~/Documents/Onyx/30_library/pai-sho-skud-regles.md`.

## L'API

- `plateau.ts` : un point est un entier `i = (x + 8) + (y + 8) * 17`, x vers l'est, y vers la porte du nord, centre en (0,0). `indice(x,y)`, `coord(i)`, `POINTS` (249), `estJouable`, `zone(x,y)` (`'rouge'|'blanc'|'neutre'|'porte'|'centre'`), `ZONES` (drapeaux ROUGE, BLANC, NEUTRE, PORTE), `PORTES` (N, E, S, O), `estSurMediane`, `voisins`, `ligne(i, d)`.
- `logic.ts` : `etatInitial`, `coupsLegaux` (chaque coup légal, bonus compris), `jouer` (pur, fait confiance au coup), `harmonies`, `conflits`, `anneauHarmonie`, `harmoniesMedianes`, `verdict`, `coupEnTexte`, `coupDepuisTexte`, `tuileEn`, `tuilesEnMain`, `tuilesPiegees`, `HARMONIE_PAIRE`, `CONFLIT_PAIRE`, `etatDepuis` (positions de test).
- `arbitre.ts` : `appliquerCoup` (refuse un coup illégal en rendant l'état tel quel, inscrit le blocage), `coupLegal`, `TEXTES_ARBITRE.FR/EN`, `texteVerdict(v, fr)`. La page passe par l'arbitre, jamais par `jouer` directement.
- `cpu.ts` : `adaptateurPaiSho()` pour `src/moteur`, `choisirCoup(e, niveau)`, `evaluer`, `POIDS`. En page, passer par `nouveauPenseur().demanderCoup('paisho', 'skud', etat, niveau)`.

## L'état

`EtatPaiSho` est un objet simple qui passe le clonage structuré : `cases` (texte de 289 caractères, `.` vide, hôte en majuscules, invité en minuscules, lettres `ABCDEF` pour R3 à W5, `L` lotus, `O` orchidée, `R` rocher, `W` roue, `K` renouée, `T` barque), `reserve[camp][type]`, `tour`, `numero`, `captures[camp]` (tuiles prises par ce camp), `sansProgres`, `vues` (positions depuis le dernier progrès), `verdict`. Le lotus en fleur, l'orchidée sauvage et les pièges se déduisent du plateau, aucun drapeau à tenir.

## Le codage des coups

`R3@0,-8` plantation · `0,-7>0,-4` arrangement (une prise s'écrit pareil) · suffixe de bonus `+ROCHER@1,2`, `+RENOUEE@1,2`, `+ROUE@1,2`, `+BARQUE@1,2>2,2` (barque sur une fleur, poussée en 2,2), `+BARQUE@1,2` (barque sur un accent), `+LOTUS@8,0`, `+W4@8,0`. `coupDepuisTexte` relit sans juger; la légalité est l'affaire de l'arbitre.

## Choix sur les points non confirmés

1. Ouverture : l'hôte plante la fleur de base de son choix dans la porte sud (0,-8), l'invité plante la même dans la porte nord (0,8), puis l'hôte joue. Les portes de départ sont fixes.
2. Capture : un coup comme un autre, jamais forcée. La position d'arrivée ne doit contenir aucun clash.
3. Pas de règle « ne pas laisser l'adversaire sans coup ». Un camp au trait sans aucun coup légal perd (blocage) : c'est la lecture la plus simple, et celle du moteur de recherche.
4. Le rocher annule les harmonies dont la ligne (rangée ou colonne) contient un rocher. La renouée annule toute harmonie dont une des deux tuiles est dans ses huit cases.
5. L'orchidée ne piège que lorsqu'elle est en fleur (hors porte). Le lotus peut prendre une orchidée sauvage, puisque toute fleur le peut.
6. La roue fait tourner les accents voisins comme les fleurs (seul le rocher l'interdit, et une roue ne se pose jamais à côté d'un rocher). Rotation horaire vue du dessus, nord en haut.
7. La barque peut viser une tuile adverse comme une des siennes, et elle ne prend jamais.
8. Bonus « fleur de base » : seulement si aucune fleur du camp n'est en porte après l'arrangement.
9. Anneau : un cycle d'harmonies du camp dont le nombre d'enroulement autour du centre est impair, les harmonies qui passent par le centre ou s'y appuient étant retirées. Le test se fait en un parcours (coloriage pondéré du graphe), sans énumérer les cycles. Un cycle qui s'enroulerait deux fois sans se fermer autrement serait ignoré, cas sans portée pratique.
10. Nulles de l'arbitre : triple répétition (plateau et trait), deux cents demi-coups sans plantation, prise ni accent. Elles sont comptées dans `jouer` pour que la recherche les voie.

## L'élagage de l'IA

`coupsIA` contient chaque plantation et chaque arrangement, avec ou sans prise, exactement comme `coupsLegaux`. Seuls les bonus d'accent sont réduits : rocher, renouée et roue ne se posent que sur une case voisine (huit directions) d'une fleur adverse en fleur, et la barque ne vise que des tuiles adverses. Les bonus spéciaux et de base restent tous. Les tests vérifient à chaque coup de quatre parties au hasard que la liste de l'IA ne contient que des coups légaux et tous les coups sans bonus.

Côté moteur, seules les prises sont « bruyantes » : une harmonie se crée dans presque toutes les positions, et la quiescence, qui n'a pas de fond, ne s'arrêterait plus. Les coups à harmonie passent tôt grâce à `promesse`.

## Mesures (Mac de développement, node 24)

- `coupsIA` en milieu de partie : 142 coups en 0,11 ms.
- Recherche : environ 60 000 nœuds par seconde; le niveau 10 atteint la profondeur 3 dans son horloge (2,6 s, dépassement mesuré de 50 ms).
- Niveau 1 : 3 ms. Partie complète niveau 3 contre lui-même : 170 demi-coups en 39 s; niveau 8 : 93 demi-coups en 96 s, toutes deux finies par la dernière fleur.

Tests : `npm test` depuis `apps/pai-sho`.
