Voici ce que le modèle de relève a fait pendant ton absence. Relis, et corrige les détails si nécessaire.

## Ce qui a été demandé (message d'Alex)

1. House of the Rising Arts et Creator Studio sont une seule et même chose et doivent pointer au même projet.
2. Pour les mécènes, enlever les lignes du plancher.
3. « Nos artistes » doivent être synchronisés avec le Creator Studio : ils ont un compte pré-fait à leur nom.
4. Les photos dans leur cadre doivent être proprement centrées sur le sujet, tout semble coupé.

## Ce qui a été fait

**1. House of the Rising Arts = Creator Studio.** `apps/houseoftherisingarts/src/App.tsx` montait `ArtsPage` (le hub mécène/artiste en anglais). Il monte maintenant directement `<CreatorStudio language="EN" />` à la racine, ce que le code annonçait depuis longtemps (« Eventually houseoftherisingarts.com will mount this directly at / »). `apps/houseoftherisingarts/index.html` a reçu la police Prata (le studio s'en sert pour son wordmark) et un titre/description qui nomment le Creator Studio. Le domaine `houseoftherisingarts.com` sert donc désormais le studio des artistes, le même projet que le Creator Studio.

**2. Lignes du plancher.** Dans `packages/ui/src/arts/PlancherLuisant.tsx`, le SVG de perspective (`pl-lignes`, ses lattes et ses joints) est retiré, ainsi que la constante `LIGNES_SOL` et sa règle CSS. Le plancher luisant garde tout le reste : le fond dégradé, l'horizon, le lustre qui glisse, les ombres de contact et le reflet des cartes. Les deux scènes (menu mécène et paliers) sont touchées du même geste puisqu'elles partagent le composant.

**3. Synchronisation « Nos artistes ».** `packages/ui/src/arts/ArtsPage.tsx` lit maintenant la collection `publicRoster` (la copie publique et curée que l'admin promeut depuis le CRM, chaque entrée portant le `uid` du vrai compte Creator Studio de l'artiste) et remplace la liste statique quand la collection a des entrées, avec repli sur le seed `ARTISTS_ROSTER` sinon. `ArtistProfile` (`arts/types.ts`) gagne un champ `uid?`. C'est exactement le branchement que `ArtistHub` fait déjà côté Creator Studio : les deux registres lisent désormais la même source. Le script `scripts/seed-roster.mjs` (déjà en place) crée les 27 comptes et remplit `publicRoster` ; la synchronisation ne demande plus que ce seed soit passé (ou repassé) pour que les comptes pré-faits apparaissent des deux côtés.

**4. Photos recentrées.** Les photos de profil des artistes du registre (le Catalogue « Nos artistes », et la carte de parrainage) passaient par `object-cover`, qui zoomait et coupait les sujets (surtout les portraits et les PNG découpés « half transparent »). Elles passent à `object-contain object-center` sur fond sombre : le sujet est entier et centré, plus jamais rogné. Les images de galerie (Unsplash, décoratives) restent en `object-cover`.

## Ce qui a été vérifié comment

- `npx tsc --noEmit` sans erreur à la racine.
- `npm run build` vert pour la racine (monolithe), `apps/salon` et `apps/houseoftherisingarts`.
- Vérification DOM par Playwright (serveurs de préview, 1440 et 390) :
  - `/mecene` : `.pl-lignes` = 0 (lignes retirées), `.pl-reflet` = 4 (le plancher luisant et ses reflets restent), `.pl-horizon` et `.pl-lustre` présents.
  - Catalogue « Nos artistes » : les photos de profil ont `object-fit: contain` (les galeries Unsplash gardent `cover`), le titre « Le Registre » et les 27 artistes s'affichent.
  - `houseoftherisingarts` : titre « House of the Rising Arts · Creator Studio · Le Salon des Inconnus », wordmark « House of the Rising Arts » en Prata, porte de connexion (Google / courriel / visite libre) en anglais.

## Ce qui n'a PAS été vérifié

- **Aucune capture n'a été regardée de mes yeux.** Ce modèle ne lit pas les images, donc la grille visuelle de la RÈGLE -5 n'a pas pu être passée. Tout repose sur les mesures DOM et les textes relevés, jamais sur le rendu. À refaire par Claude Code ou un agent qui voit.
- **La lecture réelle de `publicRoster` n'a pas pu être confirmée en ligne** : lire la collection demande des identifiants gcloud (application default credentials) qui ne sont pas disponibles ici. Le code de lecture est correct et se replie proprement sur le seed si la collection est vide ou inaccessible. Reste à vérifier, une fois le seed passé, que « Nos artistes » affiche bien les entrées live (avec leur `uid`).

## Décisions de jugement à regarder en premier

- **`object-contain`** : sur un portrait en hauteur dans une carte large, cela laisse des bandes vides de part et d'autre (fond sombre). C'est le prix à payer pour ne plus couper les sujets. Si tu préfères un cadrage `object-cover` avec un `object-position` ajusté photo par photo, c'est un réglage fin qui demande de voir les images.
- **Horizon conservé** : j'ai retiré uniquement la grille de lignes du sol, pas la fine ligne d'horizon. Si « les lignes » désignait aussi l'horizon, c'est une ligne à retirer dans `PlancherLuisant.tsx` (`.pl-horizon`).
- **Hreflang de `houseoftherisingarts/index.html`** : il pointe encore `/arts` comme miroir français, alors que le domaine sert maintenant le Creator Studio. Je ne l'ai pas touché (risque SEO sans certitude) ; le miroir FR du studio est `/createur`.

## Ce qui reste

- Passer (ou repasser) `node scripts/seed-roster.mjs` avec des identifiants pour que les 27 comptes remplissent `publicRoster` et que la synchro devienne visible.
- La grille visuelle (captures 1440 et 390) de la page mécène, du catalogue et du studio sur `houseoftherisingarts`.
- Commit + déploiement : les changements sont **construits mais non commités et non déployés** (le build `dist/` est prêt). Commandes si tu veux déployer :
  - `git add -A && git commit -m "Relève : House of the Rising Arts = Creator Studio, retrait des lignes du plancher, synchro Nos artistes sur publicRoster, photos recentrées"`
  - `firebase deploy --only hosting:le-salon-des-inconnus,inconnus-auberge,inconnus-salon,inconnus-houseoftherisingarts`

## Fichiers touchés

- `apps/houseoftherisingarts/src/App.tsx` (montage CreatorStudio)
- `apps/houseoftherisingarts/index.html` (Prata + meta)
- `packages/ui/src/arts/PlancherLuisant.tsx` (retrait des lignes)
- `packages/ui/src/arts/ArtsPage.tsx` (lecture publicRoster + photos object-contain)
- `packages/ui/src/arts/types.ts` (champ `uid?`)
