# Devis · Vague 5 · Le centre d'arts à la manière de Fortiche

Date : 16 septembre 2026. Dépôt : `/Users/lesalondesinconnus/Documents/Websites/le-salon-des-inconnus-inn-section-v.08 (5)` (monorepo, site principal servi par `App.tsx` sur www.lesalondesinconnus.com). Statut : devis prêt à exécuter, rien n'a été modifié dans le dépôt pendant sa rédaction.

Ce devis remplace la page servie à `/centre-arts` (aujourd'hui le « Hub » à bascule Mécène/Artiste d'`ArtsPage`) par une page éditoriale qui défile, construite dans le monolithe avec l'en-tête `SiteHeader` et le pied de page `SiteFooter`. Les fonctions d'`ArtsPage` (menu des mécènes, catalogue, fiscalité, mécénat, Café, côté artiste) restent vivantes à leurs adresses, et trois d'entre elles reçoivent enfin une adresse propre pour que la nouvelle page puisse y mener directement.

---

## 0. Avant le premier fichier touché

1. Une autre passe écrit dans ce dépôt. Lancer `ListAgents`, puis `git status` et `git pull --rebase` sur `main`. Si une session touche `App.tsx`, `components/SiteFooter.tsx` ou `components/SeoBlock.tsx`, lui écrire par `SendMessage` avant d'éditer ces trois fichiers, et ne jamais écrire à un agent de Workflow encore en marche.
2. Charger dans cet ordre : `premium-web` (orchestrateur), `impeccable`, `gsap-scrolltrigger`, `gsap-react`, `voix-alex` (pour toute retouche de texte), puis `boucle-verdict` au moment de vérifier.
3. Relire la section « Canon » ci-dessous, qui a été mesurée dans le code. Aucune couleur `#d4af37` n'entre dans les nouveaux fichiers.
4. Un seul serveur d'aperçu par dépôt, un agent lourd à la fois.
5. Ne rien écraser de la vague 2 : `components/CentreArtsCommunauteSection.tsx` (la scène de l'accueil qui mène à `/centre-arts`) et `public/media/centre-arts/tournage-manoir-{960,1600,2400}.webp` existent déjà et restent intacts. Le script d'images ajoute des fichiers dans ce dossier, il ne le vide jamais.

---

## 1. Ce que la cartographie a établi (faits vérifiés)

- `App.tsx` ligne 1027 monte `ArtsPage` pour `CENTRE_ARTS`, `MECENE` et `CAFE` via `ARTS_NODE_BY_VIEW` (ligne 267) et `ARTS_VIEW_BY_NODE` (ligne 274). L'`isStandalonePage` de la ligne 363 dépend de `isArtsView`.
- La coquille est `h-screen overflow-hidden` (ligne 716) : chaque page défile dans son propre conteneur `fixed inset-0 overflow-y-auto`, donc tout `ScrollTrigger` doit recevoir `scroller` (patron déjà en place dans `components/PetiteMonnaieParcours.tsx`, ligne 71).
- `SiteHeader` ne s'affiche aujourd'hui que pour `INN`, `INN_TEST3` et `INN_RESERVE_CINE` (ligne 729). Il est `fixed top-0 z-[109]`, et son hook `useScroll` écoute déjà le défilement des conteneurs internes en capture, ce qui le rend opaque au défilement sans modification.
- `SiteFooter` (`components/SiteFooter.tsx`) exige un `viewKey` de type `SeoViewKey` (`config/seo.content.ts`, ligne 48), et `SeoBlock` y pose un `h1` en `sr-only` (ligne 109) ainsi qu'une colonne `lg:sticky lg:top-24` (ligne 114).
- `gsap` 3.15 est installé avec `ScrollTrigger` et `SplitText` (gratuit depuis la 3.13). La page n'a pas besoin de `SplitText` : les titres géants sont posés ligne par ligne à la main, ce qui rend le découpage exact et indépendant du chargement de la police. `@gsap/react` n'est pas installé, donc `gsap.context`/`gsap.matchMedia` servent de nettoyage.
- `ArtsPage.handleNodeClick` connaît les nœuds `hub`, `patron_hub`, `artist_hub`, `roster`, `fiscality`, `patronage`, `platforms`, `registry`, `grimoire`.
- Les paliers codés dans `PatronageSection` : L'Initié 20 $, Le Gardien 100 $, Le Mécène 500 $ par mois, et le Don partagé 50 % aux artistes résidents, 50 % aux opérations du Salon (`ArtsPage.tsx`, lignes 896 à 969).
- **Hébergement (vérifié en ligne le 16 septembre).** Les sites `le-salon-des-inconnus` (www.lesalondesinconnus.com) et `inconnus-auberge` (aubergedesinconnus.com) servent tous deux `dist` et n'ont **aucune** réécriture `**` : seulement un segment unique, `/(pensees|blog|guide|chambre)/…` et `/c/…/…`. Aujourd'hui `https://www.lesalondesinconnus.com/mecene/artistes` répond **404**. Les adresses existantes `/centre-arts`, `/mecene` et `/cafe` passent par les copies statiques de `scripts/postbuild-routes.mjs` (`dist/<chemin>/index.html`), d'où une redirection 301 vers la barre oblique finale (`/cafe` → `/cafe/`).
- `SeoBlock.tsx` garde sa propre table `VIEW_PATHS: Record<SeoViewKey, string>` (ligne 7) et traite toute cible absente de cette table comme une adresse externe (`target="_blank"`). Ajouter `CENTRE_ARTS` à `SeoViewKey` casse `tsc` (clé manquante), et un lien interne vers `MECENE` ou `CREATOR_STUDIO` sortirait en `<a href="MECENE" target="_blank">`.
- Le Café est **en attente par décision d'Alex (21 juillet 2026)** : sa tuile du menu des mécènes est volontairement non cliquable, avec le badge « Bientôt » (`ArtsPage.tsx`, ligne 363). La nouvelle page ne crée donc aucun lien vers `/cafe`.
- Les boutons des paliers et du Don partagé (`ArtsPage.tsx`, lignes 897 à 970) n'ont aucun `onClick` : personne ne peut aujourd'hui s'abonner ni donner depuis ces cartes.
- Aucune collection Firestore ne décrit une programmation générale : `events` ne contient que des documents d'événement (`ceilidh-mai-2026`). La page est donc statique, ses données vivent dans un fichier TypeScript.

### Les six images manquantes

Toutes les images appelées par `packages/ui/src/arts/ArtsPage.tsx` et `arts/roster.ts` existent. Les six vignettes introuvables sont dans `packages/ui/src/sdi-cafe/SdiCafe.tsx`, le module du Café que monte `ArtsPage` au nœud `platforms` (`/cafe`) :

| Ligne | Entrée | Fichier absent | Remplacement réel (mesuré) |
|---|---|---|---|
| 26 | Where the Witch Lives, Mariel Sharp | `WHERE-THE-WITCH-LIVES_...-400x600.jpg` | `/media/Artistes/roster/mariel-sharp.jpg` (400 × 600, vignette seulement) |
| 31 | Improvisation No. 3, Sebastien Leblanc | `thumbnail sebastien leblanc one for all 1.png` | `/media/Artistes/roster/sebastien-oneforall.jpg` (1280 × 720) |
| 35 | Fallin, Leslie | `EXP15_1.48.1.png` | `/media/Artistes/roster/leslie-fallin.jpg` (1280 × 720) |
| 36 | Fille des bois, Tania Martin | `oqqArs4S41o-HD.jpg` | `/media/Artistes/tenesse%20whiskey%20tania.jpg` (1280 × 720) |
| 39 | Magnetosphere | `buJf1H0Im6w-HD.jpg` | `/media/Artistes/magnetosphere.jpg` (1280 × 720) |
| 40 | Futuristic Slums, Jean-Guilhem | `jean-guilhem-bargues-futuristic-slums-small.jpg` | Aucune photo réelle de son travail n'existe dans le dépôt : l'entrée est retirée du tableau `VISUAL` et le retrait est nommé dans le rapport à Alex |

Le même module importe `./roster` (`sdi-cafe/roster.ts`), dont vingt avatars pointent vers des fichiers absents. `arts/roster.ts` porte les mêmes 27 artistes avec des chemins corrigés et un type de forme identique. Correction : dans `SdiCafe.tsx`, remplacer `import { ARTISTS_ROSTER } from './roster';` par `import { ARTISTS_ROSTER as ROSTER_ARTS } from '../arts/roster';` puis `const ARTISTS_ROSTER = ROSTER_ARTS.filter((a) => a.avatarUrl.startsWith('/media/'));`, ce qui écarte aussi les sept avatars Unsplash qui ne montrent pas les vrais artistes. `sdi-cafe/roster.ts` reste en place (d'autres imports éventuels), rien d'autre n'est supprimé.

Le Café reste en attente : ces corrections ne font qu'empêcher des images cassées pour qui tape `/cafe` à la main, et ne le réactivent pas. Il garde deux défauts que ce devis ne corrige pas et nomme dans le rapport à Alex : les liens `url` de « L'habitude de mourir » et de « Where the Witch Lives » pointent vers une vidéo YouTube de remplissage (`dQw4w9WgXcQ`, lignes 25 et 26), et `CREATOR_GALLERY` ainsi que « Salon Sessions Vol. 1 » montrent des photos Unsplash sous des titres de productions du Salon.

---

## 2. Canon du Salon appliqué à cette page (mesuré)

| Jeton CSS (posé sur la racine de la page) | Valeur | Rôle |
|---|---|---|
| `--ca-noir` | `#0a0808` | fond des sections sombres, texte sur crème et sur or |
| `--ca-noir-pied` | `#050505` | bande de couleurs, raccord avec `SiteFooter` |
| `--ca-creme` | `#f3e5ab` | fond des sections claires, titres sur noir |
| `--ca-or` | `#c5a059` | sous-titres et valeurs sur noir (8,13:1), aplat de la section Creator Studio |
| `--ca-bronze` | `#6b4e1c` | sous-titres et valeurs sur crème (6,08:1), dérivé assombri de l'or antique parce que l'or sur crème tombe à 1,94:1 |
| `--ca-bronze-nuit` | `#3d2a0c` | sous-titre sur l'aplat or (5,57:1), distinct du titre noir |
| texte courant sur noir | `#d4d4d4` (13,48:1) | Lato |
| texte courant sur crème | `rgba(10,8,8,0.86)` | Lato |

Polices, toutes déjà chargées par `index.css` : **Prata** (titres géants, sous-titres, valeurs de méta, en capitales par `text-transform`), **Cinzel** 400/700 (surtitres, libellés, colonnes d'adresse), **Lato** 300/400 (corps). Aucune italique nulle part, ni classe `italic`, ni `font-style`. L'accent passe par la couleur.

Mesures globales :

- Gouttière : `--ca-gouttiere: clamp(16px, 3.9vw, 56px)` (16 px à 390, 56 px à 1440).
- Rythme vertical des sections : `padding-block: clamp(72px, 9vw, 160px)`.
- Coins des cadres photo : `15px` partout (canon d'Alex, plus sage que les 40 px de Fortiche).
- Retrait du titre dans le cadre : `--ca-retrait: clamp(12px, 2.4cqi, 40px)`.
- Corps : `font-size: clamp(1rem, 0.35vw + 0.92rem, 1.1875rem); line-height: 1.75; max-width: 60ch`.
- Surtitre : Cinzel, `12px`, `letter-spacing: 0.35em`, capitales, filet de 40 px à gauche (même classe que `SURTITRE` dans `SiteFooter`).
- Sous-titre : Prata capitales, `font-size: clamp(1.15rem, 2.2cqi, 1.9rem)`, `letter-spacing: 0.02em`, `line-height: 1.15`, toujours d'une autre couleur que le titre.
- Libellé de méta : Cinzel `11px`, `letter-spacing: 0.25em`, capitales, `#a3a3a3` sur noir, `rgba(10,8,8,0.6)` sur crème.
- Valeur de méta : Prata capitales, `clamp(1rem, 1.5cqi, 1.35rem)`, or sur noir, bronze sur crème, bronze-nuit sur or.
- Boutons : reprendre exactement les deux classes de `components/CentreArtsCommunauteSection.tsx` (pilule `min-h-[50px] rounded-full`, Cinzel gras 12 px), en remplaçant la couleur de fond selon la section : or sur noir, noir sur crème et sur or.

Mise en page pleine largeur : chaque section occupe 100 % de la largeur avec la gouttière seule comme marge, et les grilles de bureau sont en 12 colonnes (`gap: clamp(16px, 2vw, 32px)`), texte décalé à droite (colonnes 7 à 12) plutôt que centré. Aucun `max-w-* mx-auto` sur un bloc principal.

---

## 3. Le titre géant qui mord la photo (le motif central)

Fortiche mesure 201,6 px en Druk, interlettrage -1 %, capitales. Ici, chaque titre est ajusté pour remplir la largeur de son cadre, en Prata capitales, interlettrage `-0.01em`, `line-height: 0.9`, plafonné à `12.5rem` (200 px). Les largeurs ont été mesurées dans les métriques de Prata (`fontTools`, fichier Prata.ttf), avec 4 % de marge pour les accents et l'arrondi du rendu.

Formule, posée sur l'élément titre dont le parent direct porte `container-type: inline-size`. Ce parent conteneur n'a **aucun padding horizontal** (la requête de conteneur mesure la boîte de contenu, donc un padding serait retranché deux fois) : le retrait est porté par le titre lui-même, et la largeur de référence est celle du cadre. Les tailles du tableau sont arrondies, la formule fait foi.

```css
.ca-titre { font-size: min(calc((100cqi - 2 * var(--ca-retrait)) / var(--ca-em)), 12.5rem); }
```

Deux jeux de lignes par titre : celui du bureau (`md:` et plus, 768 px) et celui du téléphone. Chaque jeu porte son propre `--ca-em`. Le texte complet est lu une fois par les lecteurs d'écran via un `<span className="sr-only">`, et les deux jeux visuels sont `aria-hidden`.

| Titre | Bureau (lignes · em) | Téléphone (lignes · em) | Taille à 390 | à 1024 | à 1440 |
|---|---|---|---|---|---|
| FR Centre d'arts | `Centre d'arts` · 8.71 | `Centre` / `d'arts` · 4.55 | 78 px | 106 px | 150 px |
| EN Arts centre | `Arts centre` · 7.67 | `Arts` / `centre` · 4.55 | 78 | 121 | 171 |
| FR La Maison Favier | `La Maison Favier` · 10.47 | `La Maison` / `Favier` · 6.24 | 57 | 88 | 125 |
| EN Maison Favier | `Maison Favier` · 8.80 | `Maison` / `Favier` · 4.57 | 78 | 105 | 149 |
| FR Résidences | `Résidences` · 7.20 | `Résidences` · 7.20 | 50 | 129 | 182 |
| EN Residencies | `Residencies` · 7.57 | `Residencies` · 7.57 | 47 | 122 | 173 |
| FR Sur scène | `Sur scène` · 6.27 | `Sur` / `scène` · 3.77 | 95 | 148 | 200 |
| EN On stage | `On stage` · 5.68 | `On` / `stage` · 3.72 | 96 | 163 | 200 |
| FR Les mécènes | `Les mécènes` · 7.91 | `Les` / `mécènes` · 5.55 | 64 | 117 | 166 |
| EN Patrons | `Patrons` · 5.32 | `Patrons` · 5.32 | 67 | 174 | 200 |
| Creator Studio | `Creator Studio` · 9.96 | `Creator` / `Studio` · 5.35 | 67 | 93 | 132 |
| FR Venir à Namur | `Venir à Namur` · 8.81 | `Venir à` / `Namur` · 4.38 | 82 | 105 | 149 |
| EN Coming to Namur | `Coming to Namur` · 11.03 | `Coming to` / `Namur` · 6.59 | 54 | 84 | 119 |
| Kamy Rheault | `Kamy Rheault` · 8.81 | `Kamy` / `Rheault` · 5.36 | 67 | 105 | 149 |
| Claude Philippe Nolin | `Claude Philippe` / `Nolin` · 10.07 | `Claude Philippe` / `Nolin` · 10.07 | 36 | 92 (colonne) | 62 (colonne 5/12) |
| Alex T. St-Laurent | `Alex T. St-Laurent` · 11.42 | `Alex T.` / `St-Laurent` · 7.06 | 51 | 81 | 115 |

Aucun titre ne dépasse deux lignes, à aucune largeur. Si l'agent change un mot, il remesure (script en annexe A) avant de livrer.

**La morsure.** Le titre suit le cadre dans le flux et remonte par une marge négative, de sorte que toutes ses lignes sauf la dernière tombent sur la photo et que la moitié haute de la dernière ligne mord le bas du cadre :

```css
.ca-morsure { position: relative; z-index: 2; padding-inline: var(--ca-retrait);
  margin-top: calc(-1 * ((var(--ca-lignes) - 1) * 0.9em + 0.5em)); }
```

`--ca-lignes` vaut 1 ou 2 selon le jeu affiché (deux variables, basculées au point `md`). La marge est en `em`, donc elle suit la taille calculée sans JavaScript. Le cadre porte en bas un voile `linear-gradient(to top, rgba(10,8,8,0.72) 0%, rgba(10,8,8,0) 45%)` pour que la partie crème du titre reste lisible sur l'image. La morsure n'est utilisée que sur les sections à fond noir, parce qu'un titre crème qui sort de la photo doit tomber sur du noir, et jamais sur une photo dont le sujet est dans le bas du cadre (le titre le cacherait) : c'est le cas de la vue aérienne de Namur, dont la maison occupe le dernier dixième de l'image, donc S7 pose son titre au-dessus du cadre. Les sections crème et or posent leur titre au-dessus du cadre, sans morsure, en noir.

Chaque ligne visuelle est un `<span data-ca-ligne className="block overflow-hidden whitespace-nowrap">` qui contient un `<span className="block">` animé ; le masque reçoit `padding-top: 0.12em; margin-top: -0.12em` pour que les accents de É et È ne soient jamais rognés.

---

## 4. Fichiers

### À créer

| Chemin | Contenu |
|---|---|
| `components/centre-arts/CentreArtsPage.tsx` | La page : conteneur de défilement, jetons CSS, sept sections, sous-composants locaux `TitreGeant`, `Cadre`, `Metas`, `BandeCouleurs`, et `SiteFooter`. Un seul fichier de composants, parce qu'aucun de ces morceaux ne sert ailleurs. |
| `components/centre-arts/contenu.ts` | Tous les textes FR/EN, les lignes de titres avec leurs `em`, les images (base, largeurs, dimensions, `alt`), les rangées de méta et leurs liens. |
| `components/centre-arts/useRevelations.ts` | Le mouvement GSAP ScrollTrigger, avec `matchMedia` et nettoyage. |
| `public/media/centre-arts/*.webp` | Les dérivés WebP listés en section 6. |
| `scripts/centre-arts-images.sh` | Les commandes `cwebp` qui produisent ces dérivés, pour qu'ils se refassent à l'identique. |

### À modifier

| Chemin | Changement |
|---|---|
| `App.tsx` | Nouvelles vues et adresses du mécène, montage de la page, en-tête affiché, page autonome (section 5). |
| `components/SeoBlock.tsx` | (1) Prop `sansH1?: boolean` qui rend le titre descriptif en `<p id={`seo-h1-${viewKey}`} className="sr-only">` au lieu d'un `h1` (l'`id` reste, sinon `aria-labelledby` pointe dans le vide). (2) Retrait de `lg:sticky lg:top-24` à la ligne 114 (règle d'Alex : rien ne colle au bas d'une page, et ce bloc vit dans le pied de page de tout le site). (3) La table locale `VIEW_PATHS` passe de `Record<SeoViewKey, string>` à `Record<string, string>` et reçoit `CENTRE_ARTS: '/centre-arts'`, `MECENE: '/mecene'`, `CREATOR_STUDIO: '/creator'` ; `isInternal(to: string): boolean` et `navigate(view: string)` suivent. Sans ce point, `tsc` échoue et les liens internes du bloc « À propos » s'ouvrent en nouvel onglet sur `/MECENE` (404). (4) `max-w-6xl mx-auto` (ligne 113) devient `w-full` : bloc pleine largeur, gouttière seule. |
| `components/SiteFooter.tsx` | Prop `sansH1?: boolean` transmise à `SeoBlock`, et les trois `max-w-6xl mx-auto` (lignes 124, 184, 202) deviennent `w-full`, pour que le pied de page ne soit pas le seul bloc centré avec du vide sur les côtés à 1440 et 1920. Ces deux fichiers touchent tout le site : même consigne de concurrence qu'en section 0, et capture de l'accueil en bas de page avant et après. |
| `config/seo.content.ts` | `'CENTRE_ARTS'` ajouté à `SeoViewKey` et entrée `CENTRE_ARTS` dans `SEO_CONTENT` (textes en section 8). |
| `config/seo.config.ts` | Entrées `PAGE_META` pour `MECENE_ARTISTES`, `MECENE_FISCALITE`, `MECENE_SOUTIEN` ; description de `PAGE_META.CENTRE_ARTS` récrite pour la nouvelle page (l'actuelle décrit la bascule de l'ancien hub) ; `OG_IMAGES.CENTRE_ARTS` qui passe à `/media/centre-arts/og-centre-arts.jpg`. |
| `scripts/postbuild-routes.mjs` | Image et description de l'entrée `centre-arts` mises à jour (mêmes textes que `PAGE_META`), trois routes ajoutées : `path: 'mecene/artistes'`, `'mecene/fiscalite'`, `'mecene/soutenir'` (le `mkdirSync` récursif crée les sous-dossiers). Ces copies statiques sont ce qui sert réellement ces adresses. |
| `firebase.json` | Filet de sécurité sur les **deux** sites qui servent `dist` (`le-salon-des-inconnus` et `inconnus-auberge`) : ajouter `{ "regex": "^/mecene/(artistes|fiscalite|soutenir)/?$", "destination": "/index.html" }` à côté des réécritures existantes. Ne pas ajouter de `**` : la vraie 404 de la vague précédente en dépend. |
| `public/sitemap.xml` | Deux `<url>` ajoutées, en `https://www.` : `/mecene/artistes` et `/mecene/fiscalite`. `/mecene/soutenir` n'y entre pas tant que ses boutons ne font rien (section 11). |
| `public/llms.txt` | Sous « Centre d'arts et communauté », deux lignes pour le catalogue et la fiscalité, même réserve pour le soutien. |
| `packages/ui/src/sdi-cafe/SdiCafe.tsx` | Six vignettes et import du répertoire (section 1). |

Rien n'est retiré d'`ArtsPage.tsx`. Son nœud `hub` reste en place, puisque son bouton retour renvoie désormais à la nouvelle page par `ARTS_VIEW_BY_NODE.hub = 'CENTRE_ARTS'`.

---

## 5. Routage dans `App.tsx`

```ts
// ViewState : ajouter
| 'MECENE_ARTISTES' | 'MECENE_FISCALITE' | 'MECENE_SOUTIEN'

// VIEW_PATHS : ajouter
MECENE_ARTISTES:  '/mecene/artistes',
MECENE_FISCALITE: '/mecene/fiscalite',
MECENE_SOUTIEN:   '/mecene/soutenir',

// ARTS_NODE_BY_VIEW : CENTRE_ARTS en sort, la nouvelle page le prend
const ARTS_NODE_BY_VIEW: Partial<Record<ViewState, string>> = {
  MECENE: 'patron_hub', CAFE: 'platforms',
  MECENE_ARTISTES: 'roster', MECENE_FISCALITE: 'fiscality', MECENE_SOUTIEN: 'patronage',
};
// ARTS_VIEW_BY_NODE : ajouter
roster: 'MECENE_ARTISTES', fiscality: 'MECENE_FISCALITE', patronage: 'MECENE_SOUTIEN',

const CentreArtsPage = lazy(() => import('./components/centre-arts/CentreArtsPage'));
const isStandalonePage = /* existant */ || currentView === 'CENTRE_ARTS';

// ligne 729 : l'en-tête s'affiche aussi sur le centre d'arts
(currentView === 'INN' || currentView === 'INN_TEST3' || currentView === 'INN_RESERVE_CINE' || currentView === 'CENTRE_ARTS')

// à côté du montage d'ArtsPage
{currentView === 'CENTRE_ARTS' && (
  <CentreArtsPage language={language} pret={!isLoading} onNavigate={(v) => handleNavigation(v as ViewState)} />
)}
```

Les chemins à deux segments ne touchent pas `SLUG_PATTERN` et sont trouvés par `PATH_VIEWS` avant tout ; `pathToView` retire déjà la barre oblique finale ajoutée par la redirection 301 de l'hébergement. **Il n'existe pas de réécriture `**`** sur le site du monolithe : sans les trois copies de `postbuild-routes.mjs` et la réécriture ajoutée à `firebase.json` (section 4), un accès direct à `/mecene/artistes` rend la 404. Le prop `pret` retient l'animation d'ouverture tant que l'écran de chargement couvre la page.

Retour et avance du navigateur : `ArtsPage` suit déjà `initialTargetNode` par un effet (ligne 160), donc passer de `/mecene/artistes` à `/mecene` par la flèche Précédent change le nœud sans remonter la page. Revenir au hub (`hub`) fait passer `ArtsPage` une image sur l'ancien hub avant que `CENTRE_ARTS` le démonte : à regarder image par image à la vérification ; si le flash se voit, il se règle dans `ArtsPage` et pas dans `App.tsx`.

`PAGE_META` (FR/EN) des trois nouvelles vues, textes tirés des faits du code :

- `MECENE_ARTISTES` : « Nos artistes | Le Salon des Inconnus » / « Our artists | Le Salon des Inconnus » ; description « Les artistes que nous représentons au Salon des Inconnus, à Namur. » / « The artists we represent at Le Salon des Inconnus, in Namur. »
- `MECENE_FISCALITE` : « Fiscalité de l'art | Le Salon des Inconnus » / « Art and taxes | Le Salon des Inconnus » ; « La fiscalité de l'achat d'œuvres au Québec, expliquée par le centre d'arts du Salon des Inconnus. » / « The tax side of buying art in Quebec, explained by the arts centre of Le Salon des Inconnus. »
- `MECENE_SOUTIEN` : « Soutenir le centre | Le Salon des Inconnus » / « Support the centre | Le Salon des Inconnus » ; « Trois paliers mensuels et le Don partagé pour soutenir les artistes et le centre d'arts du Salon des Inconnus. » / « Three monthly tiers and the Split Donation to support the artists and the arts centre of Le Salon des Inconnus. »

---

## 6. Photos réelles, mesurées, et leurs dérivés

Toutes les sources ont été mesurées avec `sips` et regardées. Toutes sont des photos en largeur, sauf la bibliothèque et Nolin : suivant la règle d'Alex sur l'orientation, une photo en largeur reste un bandeau au téléphone (3:2 ou 4:3), jamais un recadrage 4:5 qui garde le tiers central. Les fichiers dont le nom contient « banana » (`media/inn/*banana*`) sont exclus d'office, parce qu'ils sortent d'un générateur. Aucune image n'est générée pour cette page.

| Rôle | Source (sous `public/media/`) | Taille source | Dérivés `public/media/centre-arts/` | Format affiché |
|---|---|---|---|---|
| Ouverture | `Artistes/labronze-diagonale.jpg` | 6016 × 4000 | `ouverture-{960,1600,2400,2880}.webp` | 21:9 bureau, 3:2 téléphone (les deux interprètes sont aux deux bords de l'image : un 4:5 ne garderait que la table), `object-position: 50% 40%` |
| Le lieu, cadre | `Auberge photos/Maison main.jpg` | 2800 × 1310 | `maison-{960,1600,2400}.webp` | 21:9 bureau, 3:2 téléphone |
| Le lieu, bibliothèque | `Auberge photos/biblio.jpg` | 1696 × 2528 | `bibliotheque-{640,1200,1696}.webp` | 4:5, colonne |
| Le lieu, salle à manger | `Auberge photos/salle a manger.jpg` | 2800 × 2100 | `salle-a-manger-{960,1600,2400}.webp` | 4:3 |
| Fiche Kamy Rheault | `Financement Artistique/kamy inside.jpg` | 2617 × 1446 | `kamy-{960,1600,2400}.webp` | 21:9 bureau, 4:3 téléphone, `object-position: 45% 15%` (le visage est dans le quart haut : centré, le 21:9 coupe le haut de la tête) |
| Fiche Claude Philippe Nolin | `Artistes/roster/claude-philippe-nolin.jpg` | 2768 × 4328 | `nolin-{640,1200,1800}.webp` | 4:5, `object-position: 50% 0%` (les cheveux touchent le haut de l'image) |
| Fiche Alex T. St-Laurent | `Artistes/profle wide.jpg` | 2800 × 1712 | `alex-{960,1600,2400}.webp` | 21:9 bureau, 4:3 téléphone, `object-position: 62% 10%` (à 40 %, le 21:9 coupe le haut de la tête) |
| Billets du Ceilidh | `/vendredi-eric-pichette.png`, `/samedi-marie-laurence.png`, `/dimanche-tania-martin.png` (racine de `public`) | 1080 × 1350 | `billet-{pichette,nault,martin}-{540,1080}.webp` | 4:5 |
| Mécènes | `Financement Artistique/centered copy.jpg` | 2800 × 2100 | `mecenes-{960,1600,2400}.webp` | 21:9 bureau, 4:3 téléphone |
| Creator Studio | `Artistes/main cynthia.jpg` | 1544 × 980 | `murale-{800,1544}.webp` | 3:2, demi-largeur (jamais plus de 772 px CSS) |
| Venir à Namur | `inn/golden drone copy.jpg` | 2800 × 1575 | `namur-{960,1600,2400}.webp` | 21:9 bureau, 3:2 téléphone, `object-position: 60% 100%` (la maison est dans le dernier dixième de l'image), titre au-dessus du cadre, sans morsure |
| Vignette de partage | `Artistes/labronze-diagonale.jpg` | 6016 × 4000 | `og-centre-arts.jpg` 1200 × 630, JPEG qualité 82, moins de 300 Ko | |

Commande type dans `scripts/centre-arts-images.sh` : `cwebp -q 78 -m 6 -metadata none -resize <largeur> 0 "<source>" -o "public/media/centre-arts/<nom>-<largeur>.webp"`, et pour la vignette `magick "<source>" -resize 1200x630^ -gravity center -extent 1200x630 -quality 82 public/media/centre-arts/og-centre-arts.jpg`.

Chaque `<img>` porte `srcSet`, `sizes` (`100vw` pour les cadres pleine largeur, `(min-width: 1024px) 42vw, 100vw` pour les colonnes, `(min-width: 1024px) 31vw, 78vw` pour les billets), `width` et `height` réels, `decoding="async"`, et `loading="lazy"` sauf l'image d'ouverture qui prend `loading="eager"` et `fetchPriority="high"`.

---

## 7. Architecture de la page

```
CentreArtsPage (props: language, pret, onNavigate)
└─ div.ca-racine  ref=scroller  fixed inset-0 z-50 overflow-y-auto overflow-x-hidden  (jetons CSS en style)
   ├─ S1 Ouverture          fond noir   morsure   [data-ca-section="ouverture"]  padding-top: calc(56px + clamp(24px, 4vw, 56px)), l'en-tête fixe fait 56 px
   ├─ S2 Le lieu            fond crème  titre au-dessus du cadre
   ├─ S3 Résidences         fond noir   trois fiches, dont deux avec morsure
   ├─ S4 Sur scène          fond crème  billets + rangées d'ateliers
   ├─ S5 Les mécènes        fond noir   morsure + rangées vers ArtsPage
   ├─ S6 Creator Studio     aplat or    la seule rupture de couleur franche de la page
   ├─ S7 Venir à Namur      fond noir   titre au-dessus du cadre + colonnes d'adresse
   ├─ BandeCouleurs         fond #050505, cinq carrés de 24 px alignés à droite
   └─ SiteFooter viewKey="CENTRE_ARTS" language sansH1 onNavigate
```

Le `h1` visible est le titre de l'ouverture. Les autres titres géants sont des `h2`, les noms d'artistes des `h3`. `useRevelations(scrollerRef, pret)` est appelé une fois dans la page.

Sous-composants locaux, signatures :

```ts
type Langue = 'FR' | 'EN';
type Lignes = { lignes: string[]; em: number };
type Titre = { FR: { bureau: Lignes; tel: Lignes }; EN: { bureau: Lignes; tel: Lignes } };
type ImageCA = { base: string; largeurs: number[]; w: number; h: number; alt: { FR: string; EN: string };
  ratioBureau: string; ratioTel: string; position?: string };
type Meta = { libelle: { FR: string; EN: string }; valeur: { FR: string; EN: string };
  vue?: string; href?: string; externe?: boolean };

TitreGeant({ titre, langue, niveau, couleur, morsure }: ...)
Cadre({ image, langue, sizes, prioritaire, children /* le TitreGeant en morsure */ })
Metas({ items, langue, ton: 'noir' | 'creme' | 'or', disposition: 'bande' | 'rangees' })
```

`Metas` en `bande` reproduit la ligne de méta de Fortiche sous un cadre : une grille de 4 cellules au bureau (`grid-cols-2 lg:grid-cols-4`), chaque cellule avec le libellé Cinzel au-dessus de la valeur Prata. En `rangees`, chaque élément est une ligne pleine largeur séparée par un filet (`border-top: 1px solid` à 15 % de la couleur du texte), avec le libellé en colonnes 1 à 4, la valeur en colonnes 5 à 11 et la flèche en colonne 12 ; au téléphone, le libellé passe au-dessus de la valeur et la flèche reste à droite. Une rangée qui porte `vue` ou `href` devient un `<a href>` complet : le clic sans touche de modification appelle `onNavigate(vue)` après `preventDefault`, exactement comme `Ancre` dans `SiteFooter`, et un `href` externe s'ouvre dans un nouvel onglet avec `rel="noopener noreferrer"`.

---

## 8. Textes intégraux

Tous les textes sont tirés de faits déjà écrits dans `config/seo.content.ts`, `config/seo.config.ts`, `public/llms.txt`, `packages/ui/src/arts/roster.ts`, `ArtsPage.tsx`, `CeilidhPage.tsx`, `KitchenPage.tsx`, `CoffreLanding.tsx` et `SiteHeader.tsx`. Ils ont passé `verifier.py`. Un agent qui les retouche relance le vérificateur.

### S1 · Ouverture (fond noir)

- Surtitre : FR « Le Salon des Inconnus, à Namur » · EN « Le Salon des Inconnus, in Namur »
- Titre (`h1`, crème, morsure) : FR « Centre d'arts » · EN « Arts centre »
- Sous-titre (or) : FR « et communauté » · EN « and community »
- Paragraphe (colonnes 7 à 12) :
  - FR : « Le centre d'arts n'a pas d'autre adresse que la Maison Favier, à Namur. Le manoir accueille des artistes en résidence et présente des spectacles vivants dans sa propre salle, et les œuvres des artistes que nous représentons sont accrochées à ses murs, offertes aux invités qui séjournent chez nous. »
  - EN : « The arts centre has no other address than Maison Favier, in Namur. The manor hosts artists in residence and presents live shows in its own hall, and the work of the artists we represent hangs on its walls, offered to the guests who stay with us. »
  - Le paragraphe du premier jet reprenait mot pour mot celui de `CentreArtsCommunauteSection` : le visiteur qui clique « Découvrir le centre d'arts » sur l'accueil l'aurait relu en arrivant. Faits sources : `seo.content.ts` (résidences, spectacles vivants, salle de spectacle) et `PAGE_META.CATALOGUE` (« les œuvres accrochées au manoir […] offertes aux invités qui séjournent chez nous »).
- Bande de méta sous le cadre (les deux premières cellules sont les portes Mécène et Artiste de l'ancien hub) :
  - « Vous soutenez l'art » → « Les mécènes » → vue `MECENE`, `/mecene` · EN « You support art » → « Patrons »
  - « Vous êtes artiste » → « Creator Studio » → vue `CREATOR_STUDIO`, `/creator` · EN « You are an artist » → « Creator Studio »
  - « Le lieu » → « Maison Favier, 1898 » · EN « The place » → « Maison Favier, 1898 »
  - « La région » → « Petite-Nation, Outaouais » · EN « The region » → « Petite-Nation, Outaouais »
- Alt (ce qu'on voit, sans attribution tant qu'Alex ne l'a pas confirmée) : FR « Deux interprètes autour d'une table dressée dans le jardin, devant la Maison Favier » · EN « Two performers around a set table in the garden, in front of Maison Favier »

### S2 · Le lieu (fond crème)

- Surtitre : FR « Le lieu » · EN « The place »
- Titre (`h2`, noir) : FR « La Maison Favier » · EN « Maison Favier »
- Sous-titre (bronze) : FR « Un manoir victorien de 1898 » · EN « A Victorian manor built in 1898 »
- Paragraphe :
  - FR : « Le manoir loue cinq chambres dont les noms annoncent la couleur, puisque la Musicienne et l'Écrivaine y côtoient la Cinéaste, le Théâtre et la Tour. Autour d'elles s'ouvrent une salle de spectacle, une bibliothèque et la salle à manger commune, et dehors, les jardins et la serre mènent jusqu'à la yourte et à l'autobus aménagé qui abrite un piano. »
  - EN : « The manor rents five rooms whose names set the tone, since the Musicienne and the Écrivaine sit alongside the Cinéaste, the Théâtre and the Tour. Around them are a performance hall, a library and the shared dining room, and outside, the gardens and the greenhouse lead to the yurt and to the converted bus, which houses a piano. »
- Bande de méta :
  - « Construit » → « 1898 » · EN « Built » → « 1898 »
  - « Chambres » → « Cinq, au manoir » · EN « Rooms » → « Five, in the manor »
  - « Scène » → « Une salle de spectacle » · EN « Stage » → « A performance hall »
  - « Dehors » → « Jardins, serre et yourte » · EN « Outside » → « Gardens, greenhouse and yurt »
- Alts : `maison` FR « La Maison Favier au coucher du soleil, au bout de son allée » · EN « Maison Favier at sunset, at the end of its path » ; `bibliotheque` FR « Une étagère de la bibliothèque du manoir » · EN « A shelf in the manor's library » ; `salle-a-manger` FR « La salle à manger du manoir et son tapis rouge » · EN « The manor's dining room and its red rug »

### S3 · Résidences (fond noir)

- Surtitre : FR « Résidences d'artistes » · EN « Artist residencies »
- Titre (`h2`, crème, sans morsure, puisqu'il ouvre la section) : FR « Résidences » · EN « Residencies »
- Sous-titre (or) : FR « Nous accueillons des artistes en résidence » · EN « We host artists in residence »
- Paragraphe :
  - FR : « Le manoir ouvre ses portes aux artistes en résidence, qui partagent la maison avec les musiciens, les entrepreneurs et les wwoofers de la saison. Pour proposer une résidence, écrivez-nous à alex@lesalondesinconnus.com en présentant votre projet en quelques lignes et en précisant les dates qui vous conviennent. »
  - EN : « The manor opens its doors to artists in residence, who share the house with the season's musicians, entrepreneurs and wwoofers. To propose a residency, write to us at alex@lesalondesinconnus.com with a few lines about your project and the dates that suit you. »
- Bouton : FR « Proposer une résidence » · EN « Propose a residency » → `mailto:alex@lesalondesinconnus.com?subject=Proposition%20de%20r%C3%A9sidence` (EN : `?subject=Residency%20proposal`)
- Surtitre des fiches : FR « Les artistes que nous représentons » · EN « The artists we represent »

Fiche 1, Kamy Rheault (cadre 21:9, nom en `h3` crème avec morsure)
- Bande : « Discipline » → « Art actuel, peinture, sculpture et installations » (valeur en casse normale, trop longue pour les capitales) · EN « Discipline » → « Contemporary art, painting, sculpture and installations » ; « Région » → « Petite-Nation » · EN « Region » → « Petite-Nation » ; lien « Au catalogue » → vue `MECENE_ARTISTES` · EN « In the catalogue »
- Texte : FR « Kamy Rheault travaille la peinture, la sculpture et l'installation, et occupe l'espace autant que la toile. » · EN « Kamy Rheault works in painting, sculpture and installation, and takes up the space as much as the canvas. »
- Alt : FR « Kamy Rheault dans un atelier, entre les guitares, les toiles et une sculpture » · EN « Kamy Rheault in a studio, among guitars, canvases and a sculpture » (rien ne dit dans le code que les œuvres visibles sont les siennes)

Fiche 2, Claude Philippe Nolin (portrait : cadre 4:5 en colonnes 1 à 5 au bureau, texte en colonnes 7 à 12, nom sans morsure ; au téléphone, cadre pleine largeur et nom en morsure)
- Bande : « Discipline » → « Arts visuels » · EN « Discipline » → « Visual arts » ; « Région » → « Petite-Nation » ; lien « Au catalogue » → `MECENE_ARTISTES`
- Texte : FR « Artiste visuel, Claude Philippe Nolin travaille à rendre visible ce qui ne l'est pas. » · EN « A visual artist, Claude Philippe Nolin works at making visible what is not. »
- Alt : FR « Portrait de Claude Philippe Nolin en noir et blanc » · EN « Black and white portrait of Claude Philippe Nolin »

Fiche 3, Alex T. St-Laurent (cadre 21:9, morsure)
- Bande : « Discipline » → « Cinéma, photo, théâtre et direction » · EN « Discipline » → « Film, photography, theatre and direction » ; « Au Salon » → « Fondateur et directeur » · EN « At the Salon » → « Founder and director » ; lien « Au catalogue » → `MECENE_ARTISTES`
- Texte : FR « Fondateur et directeur du Salon des Inconnus, Alex ajoute à sa mission artistique celle de tenir l'espace d'un lieu rassembleur, guérisseur et créatif. » · EN « Founder and director of Le Salon des Inconnus, Alex adds to his artistic mission that of holding the space for a gathering, healing and creative place. »
- Alt : FR « Alex T. St-Laurent assis dans les herbes hautes, en veston » · EN « Alex T. St-Laurent sitting in tall grass, in a waistcoat »
- Rangée de clôture : « Tous nos artistes » → « Le catalogue du centre » → `MECENE_ARTISTES` · EN « All our artists » → « The centre's catalogue »

### S4 · Sur scène (fond crème)

- Surtitre : FR « Spectacles et ateliers » · EN « Shows and workshops »
- Titre (`h2`, noir) : FR « Sur scène » · EN « On stage »
- Sous-titre (bronze) : FR « La salle de spectacle du manoir » · EN « The manor's performance hall »
- Paragraphe :
  - FR : « Le Salon des Inconnus accueille des spectacles vivants, des résidences artistiques, des banquets et des rassemblements communautaires tout au long de l'année, et sa programmation met de l'avant la musique, la danse, le théâtre, la performance et les arts multidisciplinaires. »
  - EN : « Le Salon des Inconnus hosts live performances, artist residencies, banquets and community gatherings year-round, and its program leans on music, dance, theatre, performance and multidisciplinary art. »
- Sous-bloc Ceilidh, surtitre : « Grand Ceilidh de Mai 2026 » (identique en EN)
- Bande : « Quand » → « Du 21 au 25 mai 2026 » · EN « When » → « May 21 to 25, 2026 » ; « Où » → « Maison Favier, Namur » · EN « Where » → « Maison Favier, Namur » ; « Esprit » → « Le ceilidh écossais et irlandais » · EN « Spirit » → « The Scottish and Irish ceilidh » ; lien « La page du Ceilidh » → vue `CEILIDH`, `/ceilidh` · EN « The Ceilidh page »
- Billets (légende sous chaque affiche, date en Cinzel, nom en Prata) :
  - « Ven 22 mai · 20 h » / « Éric Pichette » · EN « Fri May 22 · 8 pm » ; alt FR « Affiche du spectacle d'Éric Pichette, le vendredi 22 mai 2026 à 20 h » · EN « Poster for Éric Pichette's show, Friday May 22, 2026 at 8 pm »
  - « Sam 23 mai · 21 h » / « Marie Laurence Nault » · EN « Sat May 23 · 9 pm » ; alt FR « Affiche du spectacle Mosaïque de Marie Laurence Nault, le samedi 23 mai 2026 à 21 h » · EN « Poster for Marie Laurence Nault's show Mosaïque, Saturday May 23, 2026 at 9 pm »
  - « Dim 24 mai · 20 h 30 » / « Tania Martin » · EN « Sun May 24 · 8:30 pm » ; alt FR « Affiche du spectacle de Tania Martin, le dimanche 24 mai 2026 à 20 h 30 » · EN « Poster for Tania Martin's show, Sunday May 24, 2026 at 8:30 pm »
- Rangées des ateliers (surtitre FR « Ateliers et soirées » · EN « Workshops and evenings ») :
  - « Ateliers culinaires » → « La fermentation, le dressage et les techniques moléculaires, avec le chef Marc Alexis Pepin » → `KITCHEN` · EN « Culinary workshops » → « Fermentation, plating and molecular techniques, with chef Marc Alexis Pepin »
  - « En famille » → « Le Coffre des Inconnus, l'application gratuite d'économie personnelle et familiale, de 4 ans au doctorat » → `COFFRE` · EN « For families » → « Le Coffre des Inconnus, the free personal and family finance app, from age 4 to the doctorate » (le premier jet inventait des « ateliers famille » guidés par le livret : rien de tel dans `CoffreLanding.tsx`)
  - « Soirées thématiques » → « Des soirées clés en main pour les groupes, en partenariat avec PPS Canada » → `PPS` · EN « Theme evenings » → « Turnkey evenings for groups, in partnership with PPS Canada »
  - « Événements privés » → « Le manoir, la salle de spectacle, la salle à manger et les jardins se réservent pour les mariages, les retraites et les lancements » → `EVENTS` · EN « Private events » → « The manor, the performance hall, the dining room and the gardens can be booked for weddings, retreats and launches »

### S5 · Les mécènes (fond noir)

- Surtitre : FR « Acheter et soutenir l'art » · EN « Buying and supporting art »
- Titre (`h2`, crème, morsure) : FR « Les mécènes » · EN « Patrons »
- Sous-titre (or) : FR « Soutenir l'art autrement » · EN « Supporting art differently »
- Paragraphe :
  - FR : « Chez les mécènes, vous trouvez les artistes que nous représentons et les façons de soutenir leur travail comme celui du centre, avec en prime ce qu'il faut savoir sur la fiscalité de l'achat d'œuvres au Québec. »
  - EN : « On the patrons' side, you will find the artists we represent and the ways to support their work and the centre's, along with what you need to know about the tax side of buying art in Quebec. »
- Rangées :
  - « Nos artistes » → « Le catalogue des artistes que nous représentons » → `MECENE_ARTISTES` · EN « Our artists » → « The catalogue of the artists we represent »
  - « Investir et économiser » → « La fiscalité de l'achat d'œuvres au Québec » → `MECENE_FISCALITE` · EN « Invest and save » → « The tax side of buying art in Quebec »
  - « Soutenir le centre » → « Les paliers de mécénat et le Don partagé » → `MECENE_SOUTIEN` · EN « Support the centre » → « Patronage tiers and the Split Donation »
  - Le premier jet affichait ici les prix des trois paliers et une rangée séparée pour le Don partagé. Leurs boutons ne font rien dans `ArtsPage` : annoncer des montants sur la nouvelle page pousserait le visiteur vers un bouton mort. Une seule rangée, sans prix, jusqu'à la décision d'Alex (section 11).
  - Aucune rangée vers le Café, en attente par décision d'Alex depuis le 21 juillet 2026.
- Bouton : FR « Entrer chez les mécènes » · EN « Enter the patrons' side » → `MECENE`
- Alt : FR « Un salon aux murs rouges, garni d'instruments et d'œuvres » · EN « A red-walled lounge filled with instruments and artwork »

Le libellé anglais « The Maecenas » est celui du code (`ArtsPage.tsx`, vers la ligne 955).

### S6 · Creator Studio (aplat or, la rupture unique de la page)

- Surtitre (noir à 70 %) : FR « Communauté et Creator Studio » · EN « Community and Creator Studio »
- Titre (`h2`, noir) : « Creator Studio »
- Sous-titre (bronze-nuit) : FR « L'atelier des artistes » · EN « The artists' workshop »
- Paragraphe :
  - FR : « Le Creator Studio est l'espace de travail des artistes en résidence, des interprètes et des collaborateurs du Salon, qui y bâtissent leur profil, y publient leurs écrits et peuvent y demander une mise en avant. Il est ouvert en version bêta. »
  - EN : « The Creator Studio is the workspace of the Salon's artists in residence, performers and collaborators, who build their profile there, publish their writing and can ask to be featured. It is open as a beta. »
- Bouton (noir, texte crème) : FR « Entrer au Creator Studio » · EN « Enter the Creator Studio » → `CREATOR_STUDIO`
- Photo en colonnes 7 à 12, 3:2, alt : FR « Cynthia Filion peint une murale sur la galerie du manoir » · EN « Cynthia Filion painting a mural on the manor's porch »
- Surtitre des rangées : FR « La communauté » · EN « The community »
- Rangées (ton or) :
  - « Membre résident » → « Une place rémunérée pour vivre et travailler au Salon, logé dans le bus aménagé » → `COMMUNITY` · EN « Resident member » → « A paid place to live and work at the Salon, housed in the converted bus » (texte de `PAGE_META.COMMUNITY`)
  - « Wwoofing » → « Quatre heures de travail par jour en échange du gîte et du couvert, pour un séjour d'au moins sept jours » → `WWOOFING` · EN « Wwoofing » → « Four hours of work a day in exchange for room and board, for a stay of at least seven days »
  - « Le Dôme des Inconnus » → « La communauté » → `https://ledomedesinconnus.com/` (externe) · EN « Le Dôme des Inconnus » → « The community » (libellé de `SiteHeader` et de `llms.txt` ; « un domaine vivant » n'existait nulle part)
  - « La Petite Monnaie » → « La monnaie locale de la Petite-Nation » → `PETITE_MONNAIE` · EN « La Petite Monnaie » → « The local currency of the Petite-Nation »

### S7 · Venir à Namur (fond noir)

- Surtitre : FR « Venir au Salon » · EN « Getting here »
- Titre (`h2`, crème, morsure) : FR « Venir à Namur » · EN « Coming to Namur »
- Sous-titre (or) : FR « Dans la Petite-Nation, en Outaouais » · EN « In the Petite-Nation, Outaouais »
- Colonnes d'adresse à la Fortiche (Cinzel 700, capitales, 15 px, `letter-spacing: 0.12em`, crème, une information par ligne, `grid-cols-1 sm:grid-cols-3`, alignées à gauche au téléphone et centrées dans leur colonne à partir de `sm`) :
  - « 826 Côte à Favier » / FR « Namur (Québec) » EN « Namur (Quebec) » / « J0V 1N0 »
  - « Parc Oméga » / « Montebello » / FR « 25 minutes »
  - « Mont-Tremblant » / FR « Domaine skiable » EN « Ski resort » / « 35 minutes »
- Rangées :
  - « Séjourner » → « Réserver une chambre à l'auberge » → `INN` · EN « Stay » → « Book a room at the inn »
  - « Téléphone » → « 514 418 3450 » → `tel:+15144183450` · EN « Phone »
  - « Courriel » → « alex@lesalondesinconnus.com » → `mailto:alex@lesalondesinconnus.com` · EN « Email »
- Alt : FR « Le domaine vu du ciel, au milieu des forêts de la Petite-Nation en automne » · EN « The estate seen from above, among the autumn forests of the Petite-Nation »

### Bande de couleurs

Cinq carrés de 24 px collés les uns aux autres, alignés sur la gouttière de droite, `aria-hidden`, dans l'ordre crème, or, bronze, bronze-nuit, noir (ce dernier avec un contour `1px rgba(243,229,171,0.2)`). Elle précède le pied de page et ne colle jamais à l'écran.

### `SEO_CONTENT.CENTRE_ARTS` (bloc « À propos » du pied de page)

FR
- `h1` : « Centre d'arts du Salon des Inconnus, à la Maison Favier de Namur (Outaouais) »
- `kicker` : « Centre d'arts »
- `sectionTitle` : « Un centre d'artistes dans un manoir de 1898 »
- `paragraphs` :
  1. « Le Salon des Inconnus est une auberge et un centre d'artistes installés dans la Maison Favier, un manoir victorien de 1898 à Namur, dans la Petite-Nation en Outaouais, où des artistes émergents, professionnels et multidisciplinaires séjournent en résidence aux côtés de musiciens, d'entrepreneurs et de wwoofers de saison. »
  2. « Le centre d'arts réunit d'un côté les acheteurs et les mécènes, qui y trouvent les artistes que nous représentons, le mécénat et la fiscalité de l'achat d'œuvres au Québec, et de l'autre les artistes, qui disposent au Creator Studio d'un espace de travail pour bâtir leur profil et publier leurs écrits. La salle de spectacle du manoir accueille des spectacles vivants tout au long de l'année, et le Grand Ceilidh de Mai y a réuni artistes, wwoofers et voisins du 21 au 25 mai 2026. »
- `internalLinks` : `{ to: 'MECENE', label: 'les mécènes', hint: "acheter et soutenir l'art autrement" }`, `{ to: 'CREATOR_STUDIO', label: 'le Creator Studio', hint: "l'atelier des artistes" }`, `{ to: 'EVENTS', label: 'les événements et spectacles' }`
- `externalLinks` : `{ to: 'https://tourismeoutaouais.com', label: 'Tourisme Outaouais' }`, `{ to: 'https://www.parcomega.ca', label: 'Parc Oméga' }`
- `faq` :
  - « Acceptez-vous les artistes en résidence ? » → « Oui, le Salon des Inconnus accueille des artistes émergents, professionnels et multidisciplinaires, et les résidences se réservent par téléphone (514 418 3450) ou par courriel (alex@lesalondesinconnus.com). »
  - « Comment proposer une résidence artistique ? » → « Par courriel à alex@lesalondesinconnus.com avec une courte présentation du projet et les dates souhaitées. »
  - « Y a-t-il une salle de spectacle ? » → « Oui, le manoir a sa salle de spectacle, et des espaces extérieurs sont aménagés pour les performances en saison. »

EN
- `h1` : « Arts centre of Le Salon des Inconnus, at Maison Favier in Namur (Outaouais) »
- `kicker` : « Arts centre »
- `sectionTitle` : « An artists' centre in an 1898 manor »
- `paragraphs` :
  1. « Le Salon des Inconnus is an inn and artists' centre set in Maison Favier, an 1898 Victorian manor in Namur, in the Petite-Nation region of Outaouais, where emerging, professional and multidisciplinary artists stay in residence alongside musicians, entrepreneurs and seasonal wwoofers. »
  2. « The arts centre brings together buyers and patrons on one side, who find the artists we represent, patronage and the tax side of buying art in Quebec, and artists on the other, who have a workspace in the Creator Studio to build their profile and publish their writing. The manor's performance hall hosts live shows year-round, and the Grand Ceilidh de Mai brought artists, wwoofers and neighbours together there from May 21 to 25, 2026. »
- `internalLinks` : mêmes cibles, libellés « patrons » (hint « buy and support art differently »), « the Creator Studio » (hint « the artists' workshop »), « events and shows »
- `externalLinks` : `https://tourismeoutaouais.com/en` « Tourisme Outaouais », `https://www.parcomega.ca` « Parc Oméga »
- `faq` (réponses anglaises existantes, cadratins retirés) :
  - « Do you host artists in residence? » → « Yes, we host emerging, professional and multidisciplinary artists, and residencies can be booked by phone (514 418 3450) or by email (alex@lesalondesinconnus.com). »
  - « How do I propose an artist residency? » → « By email to alex@lesalondesinconnus.com, with a short presentation of the project and the dates you have in mind. »
  - « Is there a performance hall? » → « Yes, the manor has its own performance room, and outdoor spaces are set up for in-season shows. »

---

## 9. Comportements

### Défilement et mouvement (`useRevelations.ts`)

Aucun `pin`, aucune section collante, aucun Lenis, aucun WebGL. Le défilement reste natif dans le conteneur de la page, donc la molette et le geste tactile ne sont jamais capturés.

```ts
import { useLayoutEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

export function useRevelations(ref: React.RefObject<HTMLDivElement | null>, pret: boolean) {
  useLayoutEffect(() => {
    const scroller = ref.current;
    if (!scroller || !pret) return;
    const mm = gsap.matchMedia(scroller);
    mm.add(
      { bouge: '(prefers-reduced-motion: no-preference)', large: '(min-width: 1024px) and (hover: hover)' },
      (ctx) => {
        const { bouge, large } = ctx.conditions as { bouge: boolean; large: boolean };
        if (!bouge) return; // mouvement réduit : tout est déjà visible, rien ne se cache
        const q = gsap.utils.toArray<HTMLElement>;
        q('[data-ca-titre]', scroller).forEach((titre) =>
          gsap.from(titre.querySelectorAll('[data-ca-ligne] > span'), {
            yPercent: 110, duration: 1.1, ease: 'power4.out', stagger: 0.09,
            scrollTrigger: { trigger: titre, scroller, start: 'top 88%', once: true },
          }));
        q('[data-ca-cadre]', scroller).forEach((cadre) => {
          const masque = cadre.querySelector('[data-ca-masque]');
          const image = cadre.querySelector('[data-ca-image]');
          // fromTo avec quatre valeurs des deux côtés : le style calculé au repos
          // vaut « inset(0px round 15px) », une seule valeur, que GSAP ne sait pas
          // interpoler depuis quatre (saut sec à la fin au lieu d'une ouverture).
          if (masque) gsap.fromTo(masque,
            { clipPath: 'inset(8% 4% 8% 4% round 15px)' },
            { clipPath: 'inset(0% 0% 0% 0% round 15px)', duration: 1.2, ease: 'power3.out',
              scrollTrigger: { trigger: cadre, scroller, start: 'top 85%', once: true } });
          if (large && image) gsap.fromTo(image, { yPercent: -5 }, {
            yPercent: 5, ease: 'none',
            scrollTrigger: { trigger: cadre, scroller, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });
        q('[data-ca-metas]', scroller).forEach((groupe) =>
          gsap.from(groupe.children, {
            y: 16, autoAlpha: 0, duration: 0.7, ease: 'power2.out', stagger: 0.06,
            scrollTrigger: { trigger: groupe, scroller, start: 'top 90%', once: true },
          }));
      });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => mm.revert();
  }, [ref, pret]);
}
```

Précisions :
- Le déclencheur d'un cadre est toujours l'élément parent `[data-ca-cadre]`, jamais le masque qui porte le `clip-path`, parce qu'un élément rogné n'est jamais vu comme entré à l'écran.
- `[data-ca-masque]` a `clip-path: inset(0% 0% 0% 0% round 15px)` au repos et `overflow: hidden` ; `[data-ca-image]` est positionné en `absolute`, `inset: -5% 0`, `height: 110%`, `object-fit: cover`, pour laisser la course de la parallaxe sans jamais montrer de bord.
- Tous les états de départ sont posés par `gsap.from` à l'intérieur de la branche `bouge`. Si le JavaScript tombe ou si le visiteur réduit les animations, le contenu est visible tel quel.
- Seuls `transform`, `opacity` et `clip-path` s'animent, jamais une propriété de mise en page.
- Le fond ne s'anime pas : chaque section porte sa couleur, et la bascule crème, noir, or se fait au changement de sujet, comme chez Fortiche.
- La langue qui change remonte la page (clé `language` sur la racine), ce qui refait les déclencheurs.

### Survol (seulement sous `@media (hover: hover)`)

- Cadres des fiches et des mécènes : l'image passe à `scale(1.03)` en `700ms cubic-bezier(0.22,1,0.36,1)`.
- Rangées de méta cliquables : un filet de la couleur de la valeur se déploie sous la valeur (`background-size` de `0% 1px` à `100% 1px`, 400 ms) et la flèche glisse de 4 px vers la droite.
- Billets du Ceilidh : `translateY(-6px)` et ombre `0 18px 40px rgba(10,8,8,0.25)`, 400 ms.
- Boutons : mêmes états que `CentreArtsCommunauteSection`.

### Clavier et accessibilité

- Chaque cible est un vrai `<a href>` (chemins réels, `mailto:`, `tel:`), atteignable à la tabulation dans l'ordre visuel.
- Focus visible : `outline: 2px solid` crème avec décalage 3 px sur noir, noir sur crème et sur or. Jamais `outline: none` sans remplaçant.
- Un seul `h1` visible par page (le titre d'ouverture), grâce à `sansH1` sur le pied de page.
- Les lignes visuelles des titres sont `aria-hidden`, le texte complet est dans un `sr-only`.
- Les billets sont des `<figure>` avec `<figcaption>`, et l'affiche porte un `alt` complet parce qu'elle contient du texte.
- La bande de couleurs est `aria-hidden`.

### Téléphone

- Gouttière de 16 px, aucun défilement horizontal de page.
- Les billets deviennent une rangée à glisser : `display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 12px`, chaque billet à `78%` de largeur avec `scroll-snap-align: start`, la rangée débordant jusqu'aux bords par `margin-inline: calc(-1 * var(--ca-gouttiere))` et `padding-inline: var(--ca-gouttiere)`, `overscroll-behavior-x: contain`.
- La parallaxe est coupée (branche `large`), les révélations restent.
- La photo du Creator Studio passe au-dessus du texte, pleine largeur, en 3:2.
- Poids du premier écran visé : moins de 350 Ko d'images (dérivé 960 de l'ouverture environ 90 Ko à mesurer).

---

## 10. Plan de vérification (boucle-verdict, trois tours au plus)

Serveur local : `npm run build` (qui lance `tsc`, puis `postbuild-routes.mjs`), puis `npx firebase emulators:start --only hosting` en ne visant que le port du site `le-salon-des-inconnus` (un seul serveur regardé). **Pas `scripts/qa/servir-salon.mjs`** : il sert `apps/salon/dist`, pas le monolithe. **Pas `vite preview`** non plus : son repli SPA sert `index.html` partout et cacherait la 404 des adresses à deux segments. La garde `gardeHote` ne redirige pas `localhost`. Script de captures à écrire dans le scratchpad de la session, sur le modèle de `scripts/qa/captures-studio.mjs` (Playwright, vrai viewport mobile `isMobile: true, deviceScaleFactor: 3`).

Captures, regardées une à une avec la grille de `boucle-verdict` :
1. `/centre-arts` en FR et en EN, à 1440 × 900 et 390 × 844 (Chromium), et à 390 × 844 sous **WebKit**, au sommet puis au début de chaque `[data-ca-section]` (le conteneur de la page fait défiler, pas la fenêtre), puis tout en bas du pied de page. Soit environ 9 positions × 2 langues × 3 moteurs.
2. `/centre-arts` à 768 et 1024 de large, sommet et section Creator Studio.
3. Mouvement réduit émulé (`reducedMotion: 'reduce'`), sommet et milieu, à 1440 et 390.
4. `/mecene`, `/mecene/artistes`, `/mecene/fiscalite`, `/mecene/soutenir`, `/cafe` à 1440 et 390, chacune au sommet, plus l'accueil `/` en bas de page à 1440 et 390 (le pied de page et `SeoBlock` changent pour tout le site).
5. Un état de focus clavier sur une rangée de méta, à 1440.

Mesures scriptées, rapportées en chiffres :
- **Lignes des titres** (mesurées après `await document.fonts.ready`, sinon on mesure la police de repli) : pour chaque `[data-ca-titre]`, le nombre de lignes visibles est 1 ou 2, et chaque `[data-ca-ligne]` a `scrollWidth <= clientWidth` du parent conteneur, à 390, 768, 1024, 1440 et 1920, en FR et en EN.
- **Morsure** : pour chaque titre en morsure, `rect(dernière ligne).top < rect(cadre).bottom < rect(dernière ligne).bottom`.
- **En-tête** : `SiteHeader` est présent (56 px), et au sommet le bas de l'en-tête reste au-dessus du surtitre de l'ouverture (aucun recouvrement), à 390 comme à 1440 ; après 20 px de défilement du conteneur, l'en-tête passe opaque.
- **Liens du pied de page** : dans le bloc « À propos » de `/centre-arts`, les liens « les mécènes » et « le Creator Studio » ont `href="/mecene"` et `href="/creator"` et aucun `target`.
- **Navigation** : accès direct (nouvel onglet) à chacune des trois adresses du mécène, puis clic de `/mecene` vers le catalogue et flèche Précédent : l'adresse et le nœud affiché suivent à chaque fois ; `/mecene/nimportequoi` rend toujours la vraie 404.
- **Débordement** : `scroller.scrollWidth <= scroller.clientWidth` à chaque largeur.
- **Rien de collant** : aucun élément de la page (hors en-tête) n'a `position: sticky` ou `fixed` ; vérifier aussi que le bloc « À propos » du pied de page ne l'est plus.
- **Images** : aucune réponse 404 sur la page, et sur `/cafe` tapé à la main ; pour chaque `img`, `naturalWidth >= rendu × min(devicePixelRatio, 2) × 0.9`, sauf les vignettes du Café (listées à part).
- **Couleurs** : aucune occurrence de `#d4af37`, `rgb(212, 175, 55)` dans les styles calculés de la page (hors en-tête et pied de page, qui ne sont pas de cette vague) ; `grep -n "d4af37\|italic" components/centre-arts/*` rend zéro.
- **Texte** : `grep -n "—" components/centre-arts/contenu.ts config/seo.content.ts` ne trouve rien dans les nouvelles entrées ; `python3 ~/.claude/skills/voix-alex/scripts/verifier.py` sur un fichier qui extrait toutes les chaînes de `contenu.ts` et de l'entrée `CENTRE_ARTS` rend zéro marqueur.
- **Routes** : chaque nouvelle adresse répond 200 en ligne et affiche le bon nœud (texte attendu : catalogue, fiscalité, paliers) ; le bouton retour d'`ArtsPage` mène à `/centre-arts`.
- **Poids** : octets d'images transférés avant le premier défilement à 390, visés sous 350 Ko ; aucune longue tâche de plus de 200 ms pendant un défilement complet à 390 (trace Playwright).
- **Mouvement réduit** : toutes les lignes de titres ont `transform: none` et `opacity: 1` au chargement.

Un agent vérificateur indépendant (Sonnet) relit les captures et les mesures, puis rend un verdict. La boucle recommence après chaque correction, trois tours au plus, puis l'agent livre ou nomme ce qui reste.

Déploiement : hébergement seulement, sur les deux sites qui servent `dist`, `firebase deploy --only hosting:le-salon-des-inconnus,hosting:inconnus-auberge` (les deux servent aujourd'hui le même bundle `index-Bt6N9Ljx.js` ; n'en pousser qu'un ferait diverger aubergedesinconnus.com). Puis vérification en ligne sur www.lesalondesinconnus.com et aubergedesinconnus.com : empreinte du bundle servi comparée au `dist` local, captures 1440 et 390 refaites en ligne, `curl -sIL` qui finit en 200 sur `/centre-arts`, `/mecene`, `/mecene/artistes`, `/mecene/fiscalite` et `/mecene/soutenir` (un `curl -sI` sans `-L` rend 301, c'est la barre oblique finale), `curl -sI /mecene/nimportequoi` toujours 404, balises `og:image` de `/centre-arts/` lues dans le HTML servi.

---

## 11. Risques et points à confirmer

1. **Session concurrente dans le dépôt.** `App.tsx` est un fichier chaud. Tirer juste avant, commiter en un seul commit ciblé juste après, jamais de `git stash` sur un arbre propre.
2. **Attributions de photos à confirmer par Alex** avant la mise en ligne publique : `labronze-diagonale.jpg` comme tournage de La Bronze (déduit du nom de fichier et de l'entrée « L'habitude de mourir » du Café, dont le lien est un espace réservé), `kamy inside.jpg` comme Kamy Rheault, `main cynthia.jpg` comme Cynthia Filion à la galerie du manoir, `golden drone copy.jpg` comme vue du domaine. Deux autres photos demandent son œil avant la mise en ligne, parce qu'elles ont le lissé et le ciel d'une retouche poussée : `profle wide.jpg` (son propre portrait, qui ne doit pas être une version régénérée de son visage) et `Maison main.jpg` (ciel de coucher de soleil très travaillé). Si l'une tombe, l'alt devient neutre et la fiche concernée passe à une autre photo mesurée du tableau de la section 6.
3. **Le Ceilidh est passé.** Les billets et la bande sont écrits au passé implicite (dates précises, lien « La page du Ceilidh »), sans annoncer de prochaine édition, puisqu'aucune date 2027 n'existe dans le code. Les affiches portent un tiret cadratin incrusté dans l'image, entre « Grand Ceilidh de Mai 2026 » et « Spectacle » : c'est de l'image, pas de la prose, mais Alex peut vouloir les refaire.
4. **Jean-Guilhem Barguès** perd sa vignette au Café faute de photo réelle, et sept artistes du répertoire n'ont qu'un avatar Unsplash, écartés du Café par le filtre. Les rétablir demande de vraies photos de leur part.
5. **L'écran de chargement** recouvre la page au premier accès direct : le prop `pret` retient les révélations, sinon l'ouverture jouerait derrière le voile.
6. **`100cqi`** demande Safari 16 et plus, Chrome 105 et plus. En dessous, le titre retombe à la taille du navigateur : prévoir `font-size: clamp(2.5rem, 9vw, 9rem)` juste avant la règle en `cqi` comme repli.
7. **Accents en capitales Prata** : le masque des lignes peut rogner le haut de É et È si le `padding-top: 0.12em` saute. La capture WebKit le montre en premier.
8. **Le bloc « À propos » collant** (`SeoBlock`, ligne 114) touche toutes les pages du site. Le retirer respecte la règle d'Alex, mais il faut regarder une autre page (accueil, bas de page, 1440) après le changement.
9. **L'or `#d4af37`** reste dans `SiteHeader` et `ArtsPage` : ce devis ne les touche pas, la vague 0 l'a déjà nommé, et la page elle-même n'en contient pas.
10. **Les boutons de soutien ne font rien** (décision à prendre par Alex). Les trois paliers (« Join The Circle » et les deux autres) et « Faire un Don Partagé » n'ont ni `onClick` ni lien de paiement, et la carte du Gardien promet un « Corporate Tax Receipt » que rien ne délivre. La nouvelle page n'affiche donc pas les montants, `/mecene/soutenir` reçoit son adresse mais reste hors du `sitemap.xml` et de `llms.txt`, et la question est posée à Alex dans le rapport : brancher un paiement (Stripe, Interac) ou retirer les cartes.
11. **Mot de passe administrateur dans le bundle.** `ArtsPage.toggleAdmin` compare la saisie à une chaîne écrite en clair dans le code client. Elle est lisible par quiconque ouvre le JavaScript du site, avec ou sans ce devis (ligne 171). Ce devis ne la corrige pas, mais le rapport la nomme, parce que la vague rend `ArtsPage` joignable par trois adresses indexées de plus.
12. **Canonique qui redirige.** Le HTML servi à `/centre-arts/` déclare `<link rel="canonical" href="…/centre-arts">`, adresse qui répond 301 vers `/centre-arts/`. Le défaut touche déjà toutes les routes copiées par `postbuild-routes.mjs` et n'est pas de cette vague ; il est nommé, pas corrigé ici.

Ordre de grandeur : un agent constructeur et un agent vérificateur, en série, sur une longue demi-journée de travail machine ; hébergement seulement au déploiement.

---

## Annexe A · Remesurer un titre

```bash
python3 - <<'EOF'
from fontTools.ttLib import TTFont
f = TTFont("Prata.ttf")  # télécharger Prata depuis Google Fonts si absent
cmap, hm, upm = f.getBestCmap(), f['hmtx'], f['head'].unitsPerEm
def em(ligne): return (sum(hm[cmap[ord(c)]][0] for c in ligne.upper()) / upm - 0.01 * (len(ligne) - 1)) * 1.04
for l in ["Centre d'arts", "Centre", "d'arts"]: print(l, round(em(l), 2))
EOF
```

La valeur `--ca-em` d'un jeu de lignes est le maximum des `em` de ses lignes.
