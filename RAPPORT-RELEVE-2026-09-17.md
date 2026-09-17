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

---

# Tâche 2 — Test d'identité visuelle « Gilded Age » sur l'auberge + l'espace client

Voici ce que le modèle de relève a fait pendant ton absence. Relis, et corrige les détails si nécessaire.

## Ce qui a été demandé (message d'Alex, mot pour mot)

> « je veux faire un test d'update d'identité visuelle de tout ce qui est le salon des inconnus auberge et son espace client. rends le plus comme le class et sobre de vexel, le gilded age »

## Ce qui a été fait

Le « Gilded Age » est l'un des six thèmes de ton Creator Studio (la clé `CLASSY`, dans `packages/ui/src/creator-studio/CreatorStudioShell.tsx`) : encre profonde `#010a13`, champagne `#c8aa6e`, ivoire `#f0e6d2`, Cinzel partout, filets or fins. Je l'ai porté tel quel sur l'auberge et l'espace client, en gardant la retenue « sobre » de Vexel (filets d'un pixel, accents par opacité, un seul accent or par surface).

Le changement de palette, appliqué à tout le monolithe de l'auberge (88 composants, `App.tsx`, `index.html`, `index.css`, `public/404.html`) :

| ancien (Salon) | nouveau (Gilded Age) | rôle |
|---|---|---|
| `#c5a059` `#dcb055` `#d4af37` `#d9b45c` | `#c8aa6e` | l'or champagne, seul accent |
| `#d4b06a` `#e8c06a` `#e0bc45` | `#d8bd85` | l'or au survol |
| `#f3e5ab` `#faeecd` | `#f0e6d2` | l'ivoire des titres |
| `#0a0808` `#050505` `#0a0a0a` `#0a0807` | `#010a13` | l'encre profonde |
| `#18181b` | `#091428` | les surfaces relevées |

Avec leurs équivalents `rgba(...)`. Le fichier `tailwind.config.js` reçoit les jetons `gilded.*` et le bloc `gold` est réaligné sur les mêmes valeurs.

Au-delà du simple recoloriage, trois gestes de sobriété sur l'espace client (`components/compte/`) : une lueur or radiale derrière la porte non connectée, une lueur douce sous la bannière de l'espace connecté, et le rail à droite qui passe des cartes de verre `bg-black/40` à des cartes d'encre `#091428/60` à filet champagne, avec un seul bouton or plein (le parrainage) au lieu de trois.

## Ce qui a été vérifié comment

- `npx tsc --noEmit` vert, et `npx vite build` vert (50 s, le monolithe complet).
- Mesure DOM par Playwright sur neuf routes (serveur de dev, 1440 et 390) : le fond du `body` passe à `rgb(1,10,19)` (l'encre), les titres de `/` et `/compte` passent à `rgb(240,230,210)` (l'ivoire), **zéro** ancien or ou ancien crème restant sur toutes les routes de l'auberge, aucun débordement horizontal (`overflowX: ok` partout).
- Le seul ancien or qui restait sur `/chambre` venait d'un `color = 'c5a059'` sans dièse dans `PublicProfilePage.tsx` (l'icône sociale SimpleIcons) ; corrigé en `c8aa6e`.

## Ce qui n'a PAS été vérifié

- **Aucune capture n'a été regardée de mes yeux.** Ce modèle ne lit pas les images, donc la grille visuelle de la RÈGLE -5 n'a pas pu être passée. Les captures fraîches sont prêtes dans `/tmp/gilded-final-*.png` (accueil 1440 et 390, avec une position défilée, et `/compte` 1440 et 390). À relire par Claude Code ou un agent qui voit avant de dire « c'est bon ».

## Décisions de jugement à regarder en premier

- **L'encre `#010a13` est bleutée, pas brune.** C'est exactement l'encre du thème Gilded Age, mais elle va contre la règle « noir chaud » du Salon (`#0a0808`). Le champagne et l'ivoire portent la chaleur à sa place. Si tu trouves l'auberge trop froide, je remonte la température de l'encre d'un cran (vers `#071018` ou un noir olive) sans toucher au reste.
- **Un seul or au lieu de trois.** L'ancien site faisait cohabiter `#c5a059`, `#dcb055` et `#d4af37`. Le Gilded Age les fond tous dans `#c8aa6e`, ce qui calme l'ensemble mais peut paraître moins « médiéval ». C'est le pari « sobre » que tu as demandé.
- **Périmètre laissé intact exprès.** `packages/ui` (le centre d'arts/mécène, le Profil Pro, le Réseau, l'écosystème) et `apps/*` gardent leurs propres identités : ce sont d'autres mondes, et le centre d'arts a déjà son thème CLASSY en interne. Je n'y ai pas touché. Si « tout le salon » devait inclure ces mondes-là, c'est une passe de plus du même geste.

## Ce qui reste

- La grille visuelle (captures 1440 et 390) à passer par un agent qui voit.
- Rien n'est commité ni déployé : c'est un test, tout est réversible d'un `git checkout`.
- La passe d'extension vers `packages/ui` et les gabarits de courriel (`public/courriel/`) si tu valides la direction.

## Fichiers touchés

- 88 composants de `components/` (recoloriage or → champagne, crème → ivoire, noir → encre) dont `InnPage.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`, `LoadingScreen.tsx`.
- `components/compte/EspaceMembrePage.tsx`, `Banniere.tsx`, `OngletsMembre.tsx`, `RailMembre.tsx` et les onglets (palette + sobriété du shell).
- `components/PublicProfilePage.tsx` (icône sociale sans dièse).
- `App.tsx`, `index.html`, `index.css`, `public/404.html`, `tailwind.config.js` (jetons `gilded` + bloc `gold` réaligné).

---

# Tâche 3 — Alex : garder le Gilded Age seulement pour l'espace membre

Voici ce que le modèle de relève a fait pendant ton absence. Relis, et corrige les détails si nécessaire.

## Ce qui a été demandé (message d'Alex, mot pour mot)

> « only keep it for espace membre, discard for main site »

## Ce qui a été fait

Le recoloriage Gilded Age du test (tâche 2) a été **annulé sur le site principal** (l'auberge publique : les pages, l'en-tête, le pied de page, l'admin, le blog, le centre d'arts, `App.tsx`, `index.html`, `index.css`, `public/404.html` et `tailwind.config.js`) et **conservé uniquement sur l'espace membre**, soit 71 fichiers restaurés à l'état d'avant via `git restore` et 21 fichiers laissés tels quels :

- `components/compte/` au complet (17 fichiers : la porte, la coquille, les onglets, le rail, les panneaux déplacés) ;
- `components/ProfilePage.tsx` (Mon profil), `components/MessagingPage.tsx` (messages), `components/AuthModal.tsx` (la porte de connexion) ;
- `components/D20Roller.tsx` (le dé D20, utilisé seulement dans l'espace membre).

Le site principal retrouve donc son canon d'origine (noir chaud `#0a0808`, or `#c5a059`/`#dcb055`/`#d4af37`, crème `#f3e5ab`), et l'espace membre garde l'encre `#010a13`, le champagne `#c8aa6e` et l'ivoire `#f0e6d2`.

## Ce qui a été vérifié comment

- `npx tsc --noEmit` sans erreur.
- `npx vite build` vert (45 s, monolithe complet).

## Décisions de jugement à regarder en premier

- **`MemberPanel.tsx` restauré.** Ce widget (le panneau « Mon espace ») vit dans l'en-tête du site principal, visible sur toutes les pages ; je l'ai donc remis à l'or d'origine pour ne pas laisser un accent champagne isolé sur le site public. Si tu le voulais lui aussi en Gilded Age (c'est le point d'entrée de l'espace membre), c'est un `git restore` à retirer de ce fichier.
- **`PublicProfilePage.tsx` restauré.** C'est le profil public d'un artiste (page publique), donc remis au canon du site principal, y compris le petit correctif d'icône sociale (sans dièse) qui repasse à `c5a059`.
- **`AuthModal.tsx` conservé.** C'est la porte de connexion de l'espace membre (et du Creator Studio) ; je l'ai laissée en champagne. Elle se déclenche aussi depuis la porte du Creator Studio, où le champagne tombe juste.

## Ce qui n'a PAS été vérifié

- **Aucune capture regardée.** Ce modèle ne lit pas les images ; la grille visuelle de la RÈGLE -5 reste à passer par Claude Code ou un agent qui voit, en particulier `/compte` (champagne) et une page publique (retour à l'or) pour confirmer que la frontière entre les deux mondes est nette.

## Ce qui reste

- Rien n'est commité ni déployé : tout reste réversible d'un `git checkout`.
- La grille visuelle (captures 1440 et 390) des deux mondes.
