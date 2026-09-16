# Devis vague 6 : le plancher noir luisant de la page mécène

Dépôt : `/Users/lesalondesinconnus/Documents/Websites/le-salon-des-inconnus-inn-section-v.08 (5)` (appelé REPO plus bas).
Demande d'Alex, mot pour mot : « la page mécène, je veux un effet de plancher noir luisant, comme si les cartes flottaient au dessus d'un plancher avec un reflet léger. »
Portée : les 4 cartes du menu servi sur www.lesalondesinconnus.com/mecene (nœud `patron_hub`, `buyerView === 'MENU'`) et les 3 paliers de l'onglet « Soutenir le centre » de `PatronageSection` (`buyerView === 'SUPPORT'`, `patronTab === 'CENTER'`), qui restent sous la même adresse /mecene.
Taille : moyenne, puisque le chantier crée deux composants, modifie un seul fichier existant et ajoute un script de vérification avec quelques WebP, ce qu'un seul agent constructeur sur Sonnet mène sans fan-out.

---

## 0. Avant le premier geste

1. Une autre passe travaille dans le dépôt. Le constructeur lance `git -C "$REPO" status --short` et `git -C "$REPO" log --oneline -5`, puis relit `packages/ui/src/arts/ArtsPage.tsx` en entier juste avant d'éditer, parce que les numéros de ligne cités ici (relevés le 16 septembre sur le commit `81e29d1`) peuvent avoir bougé. Les remplacements se font sur les chaînes d'ancrage citées, jamais sur des numéros de ligne.
2. Si `ArtsPage.tsx` apparaît modifié et non commité par l'autre passe, le constructeur n'utilise ni `git stash` ni `git checkout` : il édite par-dessus, avec des remplacements ciblés, après avoir fait une copie `.bak` dans le scratchpad.
3. Charger `coding-standards` avant d'écrire du code, et `boucle-verdict` avant de dire que c'est fait.

---

## 1. Ce que nous avons mesuré dans le code

- La page entière vit dans `ArtsPage` : racine `absolute inset-0 overflow-hidden bg-[#141414]`, et le défilement se fait dans `<main ref={mainScrollRef} className="pt-20 h-full overflow-y-auto">`, jamais sur la fenêtre. Tout calcul de visibilité ou de défilement doit en tenir compte.
- `BuyerMenu` (ancre `const BuyerMenu = () => (`) aligne trois `MenuCard` et une tuile Café désactivée dans `max-w-6xl mx-auto`, ce qui laisse environ 170 px de vide de chaque côté à 1440 (capture `26-mecene-1440.png`). Comme les cartes sont des `div onClick`, aucune n'est atteignable au clavier, et leurs voiles indigo (`bg-indigo-950/60`) avec des titres en Cinzel blanc et des sous-titres en Lato indigo sortent du canon du Salon.
- `MenuCard`, `BuyerMenu` et `PatronageSection` sont déclarés DANS le corps d'`ArtsPage`. Chaque rendu d'`ArtsPage` (ouvrir le menu Famille, par exemple) crée un nouveau type de composant et remonte tout le sous-arbre. Une animation CSS repartirait alors de zéro et sauterait. Les nouvelles pièces vivent donc au niveau module, dans des fichiers à part.
- Les paliers (ancre `{/* Membership Tiers */}`) sont trois `motion.div` à hauteur fixe (`h-[400px]`, `h-[450px]`), avec le jaune `#d4af37`, de l'indigo, une pastille « Most Popular » et tous les textes en anglais seulement, y compris en version française.
- Le conteneur des onglets (ancre `{/* TAB CONTENT AREAS */}` suivi de `<div className="max-w-7xl mx-auto px-6 min-h-[50vh]">`) empêche tout fond pleine largeur.
- `index.css` charge Prata, Cinzel et Lato et définit les classes `.font-prata`, `.font-cinzel` et `.font-lato` ; le dépôt tourne sur React 19.2, framer-motion 12 et Tailwind 3, qui accepte les propriétés arbitraires `[--x:valeur]`.
- Photos réelles et résolutions mesurées avec `sips` :
  - `public/media/Artistes/leslie main.jpg` : 1920 × 1080, mais avec deux bandes blanches de 47 px en haut et en bas (letterbox mesuré ligne par ligne). Une carte en portrait montre toute la hauteur de la photo, donc ces bandes apparaîtraient en haut et en bas de la carte : la conversion les rogne (section 4) et la source utile fait 1920 × 984.
  - `public/media/Financement Artistique/kamy museum.png` : 1096 × 565. Trop petite pour une carte en 4:5 à 1440 (il faudrait 782 px de haut à densité 2). Elle est remplacée dans le menu.
  - `public/media/Financement Artistique/kamy inside.jpg` : 2617 × 1446. Même artiste, même série de photos que le musée, déjà utilisée par la page Fiscalité. Elle prend la carte « Investir et économiser ».
  - `public/media/Financement Artistique/kamy christina barcelona.jpg` : 1938 × 1068.
  - Café : photo libre Unsplash `photo-1521017432531-fbd92d768814`, déjà en ligne. Nous la gardons, puisque c'est une vraie photo, en attendant une photo du lieu.
- `cwebp` est installé dans `/usr/local/bin` et `playwright` figure au `package.json` racine.
- `ArtsPage` ne monte aucun pied de page et `App.tsx` ne monte pas `SiteHeader` sur les vues d'arts, rien de collant n'existe au bas de cette vue et le devis n'en ajoute aucun. En revanche `CookieBanner` (`fixed bottom-0 z-[250]`) s'affiche sur /mecene tant que la clé `sdl_privacy_consent` (version `'1'`) est absente : dans un contexte Playwright neuf, il couvre le bas du plancher et fausse la mesure 5 et les captures (voir section 10).
- La langue vit dans l'état d'`App.tsx` (défaut `'FR'`, jamais lue dans l'adresse) et seul `SiteHeader` la bascule. Or `SiteHeader` n'est pas monté sur /mecene : la version anglaise ne s'atteint qu'en basculant sur l'accueil puis en naviguant dans l'application (`App.tsx` écoute `popstate`).
- `apps/salon` monte aussi `ArtsPage`, mais `gardeHote` renvoie l'hôte `inconnus-salon` vers le monolithe pour /mecene : aucune version à vérifier de ce côté. Tailwind scanne `./packages/**/src/**`, donc les classes arbitraires des nouveaux fichiers seront générées.

---

## 2. La technique retenue, et pourquoi

Le miroir WebGL (`MeshReflectorMaterial` de drei) ne reflète que des objets 3D et ne voit jamais des cartes HTML. Il est écarté, comme le plan l'a décidé.

`-webkit-box-reflect` est écarté aussi, pour trois raisons mesurables : Firefox ne le connaît pas, il ne permet pas de flouter le reflet seul, et le reflet suit la carte dans le même sens alors qu'un vrai reflet descend quand la carte monte.

La scène se compose donc de quatre couches, toutes en CSS et SVG statique :

1. **Le sol** : un fond noir chaud dont la perspective est dessinée d'avance dans un SVG (lattes qui convergent vers un point de fuite et joints de plus en plus serrés vers l'horizon). Aucun `rotateX`, aucune couche 3D, donc rien de lourd à composer sur un téléphone : le sol se peint une seule fois.
2. **Le lustre** : une tache de lumière crème très douce qui glisse lentement sur le sol (26 s, aller-retour), animée en `transform` seulement.
3. **Chaque objet** : la vraie carte qui flotte de 5 px en 7,5 s, une ombre de contact elliptique posée sur la ligne de sol, et le reflet.
4. **Le reflet** : une copie de la carte est retournée par `scaleY(-1)` et légèrement floutée à l'intérieur d'un cadre que masque un dégradé. La copie descend quand la carte monte, ce qui donne un reflet physiquement juste.

---

## 3. Fichiers

| Geste | Chemin |
|---|---|
| Créer | `packages/ui/src/arts/PlancherLuisant.tsx` (scène, objet flottant, contexte du reflet, CSS) |
| Créer | `packages/ui/src/arts/MeceneScenes.tsx` (`MenuMecene`, `PaliersMecene`, cartes) |
| Modifier | `packages/ui/src/arts/ArtsPage.tsx` (retirer `BuyerMenu`, `MenuCard` et le bloc des paliers, brancher les deux scènes, sortir le conteneur `max-w-7xl`) |
| Créer | `public/media/centre-arts/mecene/*.webp` (9 fichiers) |
| Créer | `scripts/qa/plancher-mecene.mjs` (mesures et captures) |

Aucune dépendance ajoutée. Aucune collection Firestore touchée : cette vague ne lit ni n'écrit de données. Aucun changement à `packages/ui/package.json`, puisque les deux fichiers sont importés en relatif par `ArtsPage`.

---

## 4. Les images

```bash
REPO="/Users/lesalondesinconnus/Documents/Websites/le-salon-des-inconnus-inn-section-v.08 (5)"
OUT="$REPO/public/media/centre-arts/mecene"
mkdir -p "$OUT"
# $3 : rognage optionnel « x y largeur hauteur », appliqué avant le redimensionnement.
conv() { for w in 960 1440 1920; do cwebp -q 78 ${3:+-crop $3} -resize $w 0 -metadata none "$REPO/public/media/$1" -o "$OUT/$2-$w.webp"; done; }
# leslie main.jpg porte deux bandes blanches de 47 px : on garde les lignes 48 à 1031.
conv "Artistes/leslie main.jpg" leslie-main "0 48 1920 984"
conv "Financement Artistique/kamy inside.jpg" kamy-atelier
conv "Financement Artistique/kamy christina barcelona.jpg" kamy-barcelone
ls -la "$OUT"
```

Plafonds de poids, vérifiés sur la sortie de `ls` : chaque `-960` sous 90 Ko, chaque `-1440` sous 200 Ko, chaque `-1920` sous 320 Ko. Au-delà, refaire la conversion en `-q 72`. Ouvrir ensuite `leslie-main-1440.webp` et confirmer qu'aucune ligne blanche ne reste en haut ni en bas.

Pourquoi ces largeurs et ce `sizes` : les photos sont en paysage (environ 16:9) et les cartes les recadrent en portrait. Ce qui compte est donc la HAUTEUR affichée, pas la largeur. Une carte 4:5 de 313 px de large fait 391 px de haut, soit 27vw à 1440, et une source 16:9 doit alors faire 48vw de large pour couvrir cette hauteur. Le calcul donne :

```
sizes="(min-width: 1280px) 54vw, (min-width: 640px) 64vw, 112vw"
```

À 390 px et densité 3, le navigateur demande 1310 px et prend `-1440.webp`. À 1440 et densité 2, il demande 1555 px et prend `-1920.webp`. Le 54vw (au lieu de 48vw) vient de la photo de Leslie rognée : elle est plus panoramique (1,95:1), et à 48vw sa version 1440 n'aurait fait que 735 px de haut pour 772 px affichés, soit un agrandissement de 1,05 pile sur le seuil de la mesure 16.

Café : `https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=70&w=960` avec `w=1440` et `w=1920` dans le `srcset` (le paramètre `auto=format` sert du WebP ou de l'AVIF).

---

## 5. `packages/ui/src/arts/PlancherLuisant.tsx` (code intégral)

API :

- `<PlancherLuisant as? className? contenuClassName? aria-label? aria-labelledby?>` : la scène pleine largeur. `className` porte la hauteur et les variables d'horizon, `contenuClassName` porte les marges internes et la mise en page.
- `<ObjetFlottant index haut? className?>` : un objet posé sur le sol. `index` décale la phase du flottement ; `haut` le fait flotter plus haut (palier mis en avant).
- `useDansLeReflet()` : vaut `true` quand la carte est rendue dans la copie. La carte s'en sert pour remplacer ses titres `h3` et ses `button` par des `div`, et pour vider ses `alt`.
- Variables publiques, toutes optionnelles, posées par le consommateur (classes Tailwind arbitraires) : `--pl-horizon` (défaut 30 %), `--pl-reflet` (hauteur visible du reflet, défaut `clamp(64px, 9vw, 140px)`), `--pl-lev` (hauteur de flottement au repos, défaut 14px), `--pl-amp` (amplitude, défaut 5px), `--pl-survol` (levée au survol, défaut 8px). Le CSS du composant les lit avec une valeur de repli et ne les déclare jamais, ce qui évite tout conflit d'ordre entre sa feuille et Tailwind.

Contrat pour les enfants : la carte a une hauteur propre (`aspect-ratio`, `min-height` ou contenu), jamais `h-full`, parce que la copie est positionnée en absolu. Comme elle est rendue deux fois, elle ne porte aucun `id` et ne déclenche aucun effet de bord, qu'il s'agisse d'un `useEffect` qui écrit, d'un suivi analytique, d'un formulaire ou d'un paiement.

```tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

// Le reflet est une copie inerte de la carte. Les cartes lisent ce contexte pour
// ne pas dupliquer leurs titres ni leurs boutons dans le plan du document.
const DansLeReflet = createContext(false);
export const useDansLeReflet = () => useContext(DansLeReflet);

type AvecVariables = React.CSSProperties & Record<`--${string}`, string | number>;

// Perspective dessinée d'avance : lattes vers un point de fuite en haut au centre,
// joints espacés en 1/distance. Peint une fois, aucune couche 3D à composer.
const LIGNES_SOL = (() => {
  const d: string[] = [];
  for (let x = -250; x <= 350; x += 25) d.push(`M50 0L${x} 100`);
  for (let k = 1; k <= 14; k++) d.push(`M0 ${(100 / (1 + 0.5 * k)).toFixed(2)}H100`);
  return d.join('');
})();

const CSS = `
.pl-scene{position:relative;isolation:isolate;width:100%;background:#050505;
  --_reflet:var(--pl-reflet,clamp(64px,9vw,140px));--_lev0:var(--pl-lev,14px);--_lev:var(--_lev0);
  --_sol:calc(var(--_reflet) + var(--_lev0));--_amp:var(--pl-amp,5px);--_survol:var(--pl-survol,8px);
  --_flou:1.5px;--_ombre:.85}
.pl-fond{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;
  background:linear-gradient(to bottom,#0a0808 0%,#0e0b0a var(--pl-horizon,30%),#070606 calc(var(--pl-horizon,30%) + 1px),#050505 72%,#030303 100%)}
.pl-lignes{position:absolute;left:0;top:var(--pl-horizon,30%);width:100%;height:calc(100% - var(--pl-horizon,30%));
  -webkit-mask-image:linear-gradient(to bottom,transparent,#000 40%);mask-image:linear-gradient(to bottom,transparent,#000 40%)}
.pl-horizon{position:absolute;left:0;right:0;top:var(--pl-horizon,30%);height:1px;
  background:linear-gradient(90deg,transparent,rgba(197,160,89,.20) 28%,rgba(243,229,171,.26) 50%,rgba(197,160,89,.20) 72%,transparent)}
.pl-horizon::after{content:"";position:absolute;left:12%;right:12%;top:-48px;height:96px;
  background:radial-gradient(50% 50% at 50% 50%,rgba(197,160,89,.09),transparent 70%)}
.pl-lustre{position:absolute;left:0;width:55%;top:var(--pl-horizon,30%);height:min(40%,460px);
  background:radial-gradient(50% 50% at 50% 35%,rgba(243,229,171,.075),rgba(243,229,171,.02) 45%,transparent 70%);
  animation:pl-lustre 26s ease-in-out infinite alternate}
.pl-contenu{position:relative;z-index:1}
.pl-objet{position:relative;padding-bottom:calc(var(--_sol) + var(--_lev))}
.pl-objet[data-haut]{--_lev:calc(var(--_lev0) * 2.4);--_ombre:.55}
.pl-carte{position:relative;z-index:2;
  animation:pl-flotte 7.5s ease-in-out calc(var(--pl-i,0) * -1.9s) infinite;
  transition:translate .6s cubic-bezier(.16,1,.3,1)}
.pl-ombre{position:absolute;z-index:1;left:9%;right:9%;bottom:calc(var(--_sol) - 14px);height:28px;border-radius:50%;
  background:radial-gradient(closest-side,rgba(0,0,0,var(--_ombre)),rgba(0,0,0,calc(var(--_ombre) * .4)) 60%,transparent);
  animation:pl-ombre 7.5s ease-in-out calc(var(--pl-i,0) * -1.9s) infinite;
  transition:scale .6s cubic-bezier(.16,1,.3,1)}
.pl-objet[data-haut] .pl-ombre{left:3%;right:3%}
.pl-reflet{position:absolute;z-index:0;left:0;right:0;bottom:0;height:calc(var(--_sol) - var(--_lev));
  overflow:hidden;pointer-events:none;-webkit-user-select:none;user-select:none;
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.55) 0%,rgba(0,0,0,.16) 55%,transparent 100%);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.55) 0%,rgba(0,0,0,.16) 55%,transparent 100%)}
.pl-reflet::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,rgba(5,5,5,.10),rgba(5,5,5,.55))}
.pl-reflet-flotte{position:absolute;inset:0;
  animation:pl-flotte-reflet 7.5s ease-in-out calc(var(--pl-i,0) * -1.9s) infinite;
  transition:translate .6s cubic-bezier(.16,1,.3,1)}
.pl-copie{position:absolute;left:0;right:0;top:0;transform:scaleY(-1);filter:blur(var(--_flou));opacity:.6}
.pl-copie *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important;transition:none!important;animation:none!important}
@media (hover:hover){
  .pl-objet:has(> .pl-carte:hover) .pl-carte{translate:0 calc(var(--_survol) * -1)}
  .pl-objet:has(> .pl-carte:hover) .pl-reflet-flotte{translate:0 var(--_survol)}
  .pl-objet:has(> .pl-carte:hover) .pl-ombre{scale:.88}
}
.pl-objet:has(> .pl-carte :focus-visible) .pl-carte{translate:0 calc(var(--_survol) * -1)}
.pl-objet:has(> .pl-carte :focus-visible) .pl-reflet-flotte{translate:0 var(--_survol)}
.pl-objet:has(> .pl-carte :focus-visible) .pl-ombre{scale:.88}
.pl-scene[data-anime="non"] :is(.pl-carte,.pl-reflet-flotte,.pl-ombre,.pl-lustre){animation-play-state:paused}
@media (max-width:639px){.pl-scene{--_flou:.8px}}
@media (prefers-reduced-motion:reduce){
  .pl-scene :is(.pl-carte,.pl-reflet-flotte,.pl-ombre,.pl-lustre){animation:none!important;transition:none!important;translate:none!important;scale:none!important}
}
@keyframes pl-flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(var(--_amp) * -1))}}
@keyframes pl-flotte-reflet{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--_amp))}}
@keyframes pl-ombre{0%,100%{transform:scaleX(1);opacity:1}50%{transform:scaleX(.92);opacity:.78}}
@keyframes pl-lustre{from{transform:translateX(-15%)}to{transform:translateX(96%)}}
`;

type ScenePropriétés = {
  children: React.ReactNode;
  className?: string;
  contenuClassName?: string;
  as?: 'section' | 'div';
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

export function PlancherLuisant({ children, className = '', contenuClassName = '', as = 'div', ...aria }: ScenePropriétés) {
  const ref = useRef<HTMLDivElement>(null);
  const [anime, setAnime] = useState(true);

  // Met le flottement en pause quand la scène sort de l'écran. La racine nulle suit bien
  // le défilement de <main>, mais <main> rogne la cible avant la marge : la pause se fait
  // donc au bord exact de l'écran, sans saut visible puisque l'animation reprend où elle était.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setAnime(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Balise = as as 'div';
  return (
    <Balise ref={ref} className={`pl-scene ${className}`} data-anime={anime ? 'oui' : 'non'} {...aria}>
      {/* React 19 hisse cette feuille dans <head> et la dédoublonne par href. */}
      <style href="inconnus-plancher-luisant" precedence="medium">{CSS}</style>
      <div className="pl-fond" aria-hidden="true">
        <svg className="pl-lignes" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
          <path d={LIGNES_SOL} fill="none" stroke="#f3e5ab" strokeOpacity="0.045" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="pl-horizon" />
        <div className="pl-lustre" />
      </div>
      <div className={`pl-contenu ${contenuClassName}`}>{children}</div>
    </Balise>
  );
}

type ObjetPropriétés = { children: React.ReactNode; index?: number; haut?: boolean; className?: string };

export function ObjetFlottant({ children, index = 0, haut = false, className = '' }: ObjetPropriétés) {
  return (
    <div className={`pl-objet ${className}`} data-haut={haut ? '' : undefined} style={{ '--pl-i': index } as AvecVariables}>
      <div className="pl-carte">{children}</div>
      <div className="pl-ombre" aria-hidden="true" />
      {/* Copie retournée : aria-hidden la retire des lecteurs d'écran, inert du clavier
          et des clics, pointer-events:none du survol. */}
      <div className="pl-reflet" aria-hidden="true" inert>
        <div className="pl-reflet-flotte">
          <div className="pl-copie">
            <DansLeReflet.Provider value={true}>{children}</DansLeReflet.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Géométrie, pour que le constructeur puisse la vérifier au pixel :

- `--_sol` est la distance entre le bas de l'objet et la ligne de sol, identique pour tous les objets d'une rangée. Les ombres de contact tombent donc toutes sur la même ligne, même quand le palier du milieu flotte plus haut.
- Bas de la carte = ligne de sol moins `--_lev`. Haut du reflet = ligne de sol plus `--_lev`. L'écart entre la carte et son reflet vaut `2 × --_lev` : 28 px au repos, 67 px pour un objet `haut`.
- `scaleY(-1)` se fait autour du centre de la copie, qui est calée en haut du cadre : le haut du cadre montre donc le bas de la carte, exactement comme dans un vrai reflet.
- Survol : `translate` (propriété individuelle) se compose avec l'animation qui tourne sur `transform`, sans que l'une n'écrase l'autre. Le survol du reflet lui-même ne soulève rien, grâce à `:has(> .pl-carte:hover)`.

Les deux fichiers de ce devis passent `tsc` avec les options du `tsconfig.json` du dépôt et ses `@types/react` 19 (vérifié le 16 septembre dans une copie hors dépôt), `inert` compris. Vérifier quand même dans le DOM rendu que l'attribut `inert=""` est bien présent. Le `tsconfig.json` racine n'a pas de `include` : `npm run build` compile aussi `packages/ui`, donc une erreur de type dans ces fichiers bloque le build.

---

## 6. `packages/ui/src/arts/MeceneScenes.tsx` (code intégral)

```tsx
import React from 'react';
import { PlancherLuisant, ObjetFlottant, useDansLeReflet } from './PlancherLuisant';

type Langue = 'EN' | 'FR';

const MEDIA = '/media/centre-arts/mecene';
const srcSetLocal = (nom: string) => [960, 1440, 1920].map((w) => `${MEDIA}/${nom}-${w}.webp ${w}w`).join(', ');
const UNSPLASH_CAFE = 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&q=70';
const srcSetCafe = [960, 1440, 1920].map((w) => `${UNSPLASH_CAFE}&w=${w} ${w}w`).join(', ');
const SIZES_MENU = '(min-width: 1280px) 54vw, (min-width: 640px) 64vw, 112vw';

type CarteMenuPropriétés = {
  titre: string;
  surtitre: string;
  src: string;
  srcSet: string;
  alt: string;
  position: string;
  onClick?: () => void;
  badge?: string;
  prioritaire?: boolean;
};

// Un <button> n'accepte que du contenu de phrase : ni h2 ni p à l'intérieur, et un lecteur
// d'écran aplatit de toute façon ce qu'il contient. Le texte vit donc dans des span.
function CarteMenu({ titre, surtitre, src, srcSet, alt, position, onClick, badge, prioritaire = false }: CarteMenuPropriétés) {
  const reflet = useDansLeReflet();
  const active = Boolean(onClick) && !reflet;
  const Racine = active ? 'button' : 'div';

  return (
    <Racine
      {...(active ? { type: 'button' as const, onClick } : {})}
      className={`group relative block w-full overflow-hidden rounded-[15px] border border-[#c5a059]/20 bg-[#0a0808] text-left
        aspect-[16/11] sm:aspect-[4/3] xl:aspect-[4/5] [container-type:inline-size]
        shadow-[0_40px_60px_-40px_rgba(0,0,0,0.95)]
        ${active ? 'cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c5a059]' : 'cursor-default'}`}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={SIZES_MENU}
        alt={reflet ? '' : alt}
        loading={prioritaire && !reflet ? 'eager' : 'lazy'}
        fetchPriority={prioritaire && !reflet ? 'high' : 'auto'}
        decoding="async"
        style={{ objectPosition: position }}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${active ? 'group-hover:scale-[1.04]' : 'opacity-50 grayscale-[35%]'}`}
      />
      <span aria-hidden="true" className="absolute inset-0 block bg-[linear-gradient(to_top,rgba(5,5,5,0.9)_0%,rgba(10,8,8,0.45)_45%,rgba(10,8,8,0.08)_100%)]" />
      {badge && (
        <span className="absolute right-[clamp(14px,5cqi,22px)] top-[clamp(14px,5cqi,22px)] rounded-full border border-[#c5a059]/40 bg-black/55 px-4 py-1.5 font-cinzel text-[10px] uppercase tracking-[0.3em] text-[#c5a059] backdrop-blur-md">
          {badge}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 block p-[clamp(18px,7cqi,32px)]">
        <span className="block font-cinzel text-[11px] uppercase tracking-[0.3em] text-[#c5a059]">{surtitre}</span>
        <span className="mt-2 block font-prata text-[clamp(1.5rem,9cqi,2.25rem)] leading-[1.1] text-[#f3e5ab] [text-wrap:balance]">
          {titre}
        </span>
      </span>
    </Racine>
  );
}

type MenuMecenePropriétés = {
  language: Langue;
  onArtistes: () => void;
  onFiscalite: () => void;
  onSoutien: () => void;
};

export function MenuMecene({ language, onArtistes, onFiscalite, onSoutien }: MenuMecenePropriétés) {
  const en = language === 'EN';
  const cartes: (CarteMenuPropriétés & { cle: string })[] = [
    {
      cle: 'artistes',
      surtitre: en ? 'The roster' : 'Le registre',
      titre: en ? 'See our artists' : 'Nos artistes',
      src: `${MEDIA}/leslie-main-1440.webp`,
      srcSet: srcSetLocal('leslie-main'),
      alt: en ? 'An artist from our roster in a snowy forest' : 'Une artiste du registre dans une forêt enneigée',
      position: '72% 40%',
      onClick: onArtistes,
    },
    {
      cle: 'fiscalite',
      surtitre: en ? 'Tax advantages' : 'Avantages fiscaux',
      titre: en ? 'Invest and save' : 'Investir et économiser',
      src: `${MEDIA}/kamy-atelier-1440.webp`,
      srcSet: srcSetLocal('kamy-atelier'),
      alt: en ? 'An artist among her instruments and canvases' : 'Une artiste parmi ses instruments et ses toiles',
      position: '44% 40%',
      onClick: onFiscalite,
    },
    {
      cle: 'soutien',
      surtitre: en ? 'Patronage' : 'Mécénat',
      titre: en ? 'Support projects' : 'Soutenir des projets',
      src: `${MEDIA}/kamy-barcelone-1440.webp`,
      srcSet: srcSetLocal('kamy-barcelone'),
      alt: en ? 'An artist painting on the floor of her studio' : 'Une artiste qui peint au sol dans son atelier',
      position: '45% 55%',
      onClick: onSoutien,
    },
    {
      cle: 'cafe',
      surtitre: en ? 'Productions and artists' : 'Productions et artistes',
      titre: 'Café',
      src: `${UNSPLASH_CAFE}&w=1440`,
      srcSet: srcSetCafe,
      alt: en ? 'A café with long wooden tables' : 'Un café aux longues tables de bois',
      position: '50% 50%',
      badge: en ? 'Coming soon' : 'Bientôt',
    },
  ];

  return (
    <PlancherLuisant
      as="section"
      aria-labelledby="mecene-titre"
      className="flex min-h-full flex-col [--pl-horizon:9%] sm:[--pl-horizon:17%] xl:[--pl-horizon:47%]"
      contenuClassName="flex flex-1 flex-col justify-center px-[clamp(16px,4vw,72px)] pt-[clamp(28px,6vh,64px)] pb-[clamp(40px,8vh,104px)]"
    >
      <header className="mb-[clamp(24px,4vh,44px)]">
        <p className="font-cinzel text-[11px] uppercase tracking-[0.4em] text-[#c5a059]">{en ? 'Patron' : 'Mécène'}</p>
        <h1 id="mecene-titre" className="mt-3 max-w-[22ch] font-prata text-[clamp(1.8rem,3.2vw,3rem)] leading-[1.12] text-[#f3e5ab] [text-wrap:balance] xl:max-w-none">
          {en ? 'Support the artists of the Petite-Nation' : 'Soutenir les artistes de la Petite-Nation'}
        </h1>
      </header>
      <ul role="list" className="grid grid-cols-1 gap-x-[clamp(16px,2vw,28px)] gap-y-[clamp(8px,2vh,20px)] sm:grid-cols-2 xl:grid-cols-4">
        {cartes.map(({ cle, ...carte }, i) => (
          <li key={cle}>
            <ObjetFlottant index={i}>
              <CarteMenu {...carte} prioritaire={i === 0} />
            </ObjetFlottant>
          </li>
        ))}
      </ul>
    </PlancherLuisant>
  );
}

type Palier = {
  cle: string;
  nom: Record<Langue, string>;
  prix: number;
  avantages: Record<Langue, string[]>;
  haut: boolean;
};

const PALIERS: Palier[] = [
  {
    cle: 'initie',
    nom: { FR: "L'Initié", EN: 'The Initiate' },
    prix: 20,
    avantages: {
      FR: ['Du contenu numérique exclusif', "L'accès à l'infolettre", 'La réservation en priorité, 48 heures à l\'avance'],
      EN: ['Exclusive digital content', 'Newsletter access', 'Priority booking, 48 hours ahead'],
    },
    haut: false,
  },
  {
    cle: 'gardien',
    nom: { FR: 'Le Gardien', EN: 'The Guardian' },
    prix: 100,
    avantages: {
      // « Corporate Tax Receipt » retiré : aucun reçu officiel de don ne peut être promis sans statut
      // d'organisme de bienfaisance enregistré (vault, strategie-commandites.md). Revient seulement sur OK d'Alex.
      FR: ["Tous les avantages de l'Initié", 'Une estampe en édition limitée chaque année', '10 % de rabais sur les séjours'],
      EN: ['Every Initiate perk', 'One limited edition print each year', '10% off your stays'],
    },
    haut: true,
  },
  {
    cle: 'mecene',
    nom: { FR: 'Le Mécène', EN: 'The Maecenas' },
    prix: 500,
    avantages: {
      FR: ['Tous les avantages du Gardien', 'Une esquisse originale chaque année', 'Un souper privé avec les artistes', 'Votre nom sur le mur des fondateurs', 'Un service de conciergerie'],
      EN: ['Every Guardian perk', 'One original sketch each year', 'A private dinner with the artists', 'Your name on the founders wall', 'Concierge service'],
    },
    haut: false,
  },
];

function CartePalier({ palier, language }: { palier: Palier; language: Langue }) {
  const reflet = useDansLeReflet();
  const Nom = reflet ? 'div' : 'h3';
  const Bouton = reflet ? 'div' : 'button';
  const en = language === 'EN';
  const prix = en ? `$${palier.prix}` : `${palier.prix} $`;

  return (
    <div
      className={`flex flex-col rounded-[15px] border p-[clamp(24px,2.4vw,36px)] shadow-[0_40px_60px_-40px_rgba(0,0,0,0.95)]
        ${palier.haut
          ? 'min-h-[clamp(440px,34vw,480px)] border-[#c5a059]/45 bg-[linear-gradient(to_bottom,#15110b,#0a0808)]'
          : 'min-h-[clamp(400px,31vw,440px)] border-[#c5a059]/15 bg-[#0a0808]'}`}
    >
      <Nom className="font-prata text-[1.6rem] leading-tight text-[#f3e5ab]">{palier.nom[language]}</Nom>
      <p className="mt-4 font-prata text-[clamp(2.4rem,3.6vw,3.25rem)] leading-none text-[#f3e5ab]">
        {prix} <span className="font-lato text-sm text-neutral-400">{en ? '/ month' : '/ mois'}</span>
      </p>
      <ul role="list" className="mt-8 flex-1 space-y-3">
        {palier.avantages[language].map((a) => (
          <li key={a} className="flex gap-3 font-lato text-[15px] leading-relaxed text-neutral-300">
            <span aria-hidden="true" className="text-[#c5a059]">♦</span>
            {a}
          </li>
        ))}
      </ul>
      <Bouton
        {...(reflet ? {} : { type: 'button' as const })}
        className={`mt-8 w-full rounded-full py-3.5 text-center font-cinzel text-xs uppercase tracking-[0.25em] transition-colors
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c5a059]
          ${palier.haut
            ? 'bg-[#c5a059] text-[#050505] hover:bg-[#d0ae6c]'
            : 'border border-[#c5a059]/30 text-[#f3e5ab] hover:bg-[#c5a059]/10'}`}
      >
        {en ? 'Join the circle' : 'Rejoindre le cercle'}
      </Bouton>
    </div>
  );
}

export function PaliersMecene({ language }: { language: Langue }) {
  return (
    <PlancherLuisant
      aria-label={language === 'EN' ? 'Membership tiers' : 'Paliers de soutien'}
      className="[--pl-horizon:4%] lg:[--pl-horizon:36%]"
      contenuClassName="px-[clamp(16px,4vw,72px)] pt-[clamp(32px,5vw,72px)] pb-[clamp(40px,6vw,96px)]"
    >
      <ul role="list" className="grid grid-cols-1 items-end gap-x-[clamp(16px,2.2vw,32px)] gap-y-2 lg:grid-cols-3">
        {PALIERS.map((p, i) => (
          <li key={p.cle}>
            <ObjetFlottant index={i} haut={p.haut}>
              <CartePalier palier={p} language={language} />
            </ObjetFlottant>
          </li>
        ))}
      </ul>
    </PlancherLuisant>
  );
}
```

Remarques sur les paliers :

- La pastille « Most Popular » disparaît. Rien dans le code ni dans le vault ne prouve que ce palier est le plus choisi, et nous n'affichons pas un fait non vérifié. Le Gardien se distingue désormais en flottant plus haut que les deux autres, ce qui sert directement l'effet demandé.
- Les `motion.div` et leur `whileInView` disparaissent des paliers : dans la copie, chaque animation d'entrée se déclencherait une deuxième fois avec un décalage, et le reflet apparaîtrait avant ou après sa carte.
- Les boutons « Rejoindre le cercle » n'avaient aucune action en ligne et n'en reçoivent pas ici. Brancher un paiement relève d'une autre vague.

---

## 7. Modifications de `packages/ui/src/arts/ArtsPage.tsx`

1. **Import**, sous `import { SdiCafe } from '../sdi-cafe/SdiCafe';` :
   ```tsx
   import { MenuMecene, PaliersMecene } from './MeceneScenes';
   ```
2. **Supprimer** le bloc qui commence à `  // 2. Buyer Menu` et se termine à la fin de la déclaration `const MenuCard = (...) => (...);` (juste avant `  // 3. Artist Catalog (The Dossier)`). Vérifier d'abord avec `grep -n "MenuCard\|BuyerMenu"` qu'aucun autre usage n'existe (le 16 septembre : aucun hors de ce bloc et de la ligne de rendu).
3. **Remplacer** la ligne de rendu `{buyerView === 'MENU' && <BuyerMenu />}` par :
   ```tsx
   {buyerView === 'MENU' && (
     <MenuMecene
       language={language}
       onArtistes={() => setBuyerView('CATALOG')}
       onFiscalite={() => setBuyerView('TAXES')}
       onSoutien={() => { setBuyerView('SUPPORT'); setPatronTab('CENTER'); }}
     />
   )}
   ```
4. **Conteneur des onglets** dans `PatronageSection` : remplacer `<div className="max-w-7xl mx-auto px-6 min-h-[50vh]">` (celui qui suit `{/* TAB CONTENT AREAS */}`) par `<div className="min-h-[50vh]">`, puis envelopper le bloc de chacun des onglets ARTIST, PROJECT et BEYOND dans un NOUVEAU `<div className="max-w-7xl mx-auto px-6">…</div>`. Ne jamais ajouter ces classes sur le `div` existant de l'onglet : PROJECT porte déjà `max-w-5xl` et BEYOND `max-w-6xl`, et Tailwind émet `max-w-7xl` après eux dans la feuille, si bien que la classe ajoutée gagnerait et élargirait ces deux onglets.
5. **Onglet CENTER** : envelopper la bannière « Don partagé » (ancre `{/* Split Donation Banner */}`) dans `<div className="max-w-7xl mx-auto px-6">…</div>`. Ses textes et sa mise en page ne bougent pas, mais ses couleurs passent au canon, parce qu'elle est posée juste au-dessus du plancher et que son jaune `#d4af37` jurerait à côté de l'or antique des paliers : dans ce seul bloc, `#d4af37` devient `#c5a059` (bordure, filet du haut, titre, fond du bouton) et `rgba(212,175,55,0.3)` devient `rgba(197,160,89,0.3)`. Ensuite, remplacer tout le bloc `{/* Membership Tiers */}` (le `div` `grid grid-cols-1 md:grid-cols-3 gap-8 items-end` et ses trois `motion.div`) par :
   ```tsx
   <PaliersMecene language={language} />
   ```
   La marge `mb-16` de la bannière reste, et la scène du plancher occupe ensuite toute la largeur de `<main>`.
6. Le reste du fichier ne bouge pas, qu'il s'agisse de l'en-tête, du Hub, de la Fiscalité, du Catalogue ou du héros de `PatronageSection`, et `useReducedMotion` comme `motion` restent importés parce que d'autres blocs s'en servent.

Taille : `ArtsPage.tsx` perd environ 120 lignes ; `MeceneScenes.tsx` en fait environ 260 et `PlancherLuisant.tsx` environ 150, sous la limite de 500 du CLAUDE.md du dépôt.

---

## 8. Mesures et mise en page

| Élément | 390 × 844 | 640 à 1279 | 1440 × 900 |
|---|---|---|---|
| Colonnes du menu | 1 | 2 | 4 (xl) |
| Proportion des cartes du menu | 16:11 (358 × 246) | 4:3 | 4:5 (environ 313 × 391) |
| Marge latérale | `clamp(16px, 4vw, 72px)` = 16 | 26 à 51 | 58 |
| Horizon du menu | 9 % | 17 % | 47 % |
| Reflet visible `--pl-reflet` | 64 px | 58 à 115 px | 130 px |
| Flottement au repos / objet haut | 14 / 34 px | idem | idem |
| Amplitude / survol | 5 / 8 px | idem | idem |
| Flou du reflet | 0,8 px | 1,5 px | 1,5 px |
| Titre h1 | Prata `clamp(1.8rem, 3.2vw, 3rem)` = 28,8 px, 2 lignes | 1 ou 2 lignes | 46 px, 1 ligne |
| Titres des cartes | Prata `clamp(1.5rem, 9cqi, 2.25rem)` | idem | idem, 2 lignes au plus |
| Colonnes des paliers | 1 | 1 jusqu'à 1023, 3 dès 1024 | 3 (environ 416 px chacun) |
| Horizon des paliers | 4 % | 4 %, puis 36 % dès 1024 | 36 % |

Budget vertical du menu à 1440 × 900 : sur les 820 px qu'offre `<main>`, la marge du haut prend 54 px, l'en-tête de section environ 110, les cartes 391, l'écart entre carte et reflet 28 et le reflet 130, ce qui fait 713 px. Il reste environ 107 px de sol nu sous les reflets, et la scène (`min-h-full`) couvre `<main>` jusqu'en bas, donc aucun vide gris `#141414` ne se voit.

À 390 × 844 : la première carte et son reflet tiennent dans le premier écran (80 + 120 + 246 + 28 + 64 = 538 px), les quatre objets se suivent sur environ 1650 px de défilement et chacun garde son ombre de contact et son reflet, ce qui lit le plancher sur toute la colonne.

Pleine largeur : la scène fait 100 % de `<main>` ; aucune règle `100vw` n'est employée, parce que la barre de défilement de 6 px de `<main>` créerait un défilement horizontal.

---

## 9. Comportements

- **Survol (pointeur fin)** : la carte monte de 8 px, son reflet descend de 8 px, l'ombre se resserre à 88 %, la photo s'agrandit à 104 %, le tout en 600 ms `cubic-bezier(.16,1,.3,1)`. Survoler le reflet ne déclenche rien.
- **Clavier** : après les boutons de l'en-tête, qui précèdent `<main>` dans le DOM, Tab passe par les trois cartes actives du menu dans l'ordre de lecture ; la tuile Café n'est pas focalisable et sa pastille « Bientôt » dit pourquoi. Entrée et Espace activent les boutons nativement. Le focus clavier (`:focus-visible`) lève la carte comme le survol et affiche un contour or antique de 2 px décalé de 4 px ; un clic de souris ne laisse pas la carte levée, ce que `:focus-within` aurait fait sur les boutons « Rejoindre le cercle » qui ne mènent nulle part. Aucun élément de la copie n'est focalisable (`inert`).
- **Lecteurs d'écran** : un seul `h1`, une `section` nommée par lui, une liste de quatre cartes dont trois boutons (leur texte est en `span`, puisqu'un bouton ne peut contenir ni titre ni paragraphe) ; les paliers sont une liste de trois `h3`. La copie est `aria-hidden`, ses titres sont des `div` et ses images ont `alt=""`.
- **Défilement** : rien de collant, rien qui capture la molette. Le flottement et le lustre se mettent en pause dès que la scène sort de l'écran. Aucune marge d'anticipation : `<main>` rogne la cible avant que la marge de l'observateur ne s'applique, elle serait donc sans effet.
- **Mouvement réduit** (`prefers-reduced-motion: reduce`) : aucune animation, aucune levée au survol ni au focus. Les cartes restent posées à 14 px du sol avec leur ombre et leur reflet, donc l'effet de plancher demeure entier, simplement immobile. Le contour de focus reste le signal du clavier.
- **Poids au premier écran** : seule la première carte du menu charge tout de suite (`loading="eager"`, `fetchPriority="high"`) ; les trois autres sont en `lazy`, ce qui ne change rien à 1440 où elles sont visibles, mais épargne trois photos au téléphone avant le défilement.
- **Coût GPU** : aucune règle `will-change` au départ. Les animations ne touchent que `transform` et `opacity`, que les navigateurs promeuvent d'eux-mêmes le temps de l'animation. Le sol et ses lignes sont peints une fois. Le flou est posé sur `.pl-copie`, qui ne bouge pas elle-même : c'est son parent qui est animé, donc le flou ne se recalcule pas à chaque image. La copie désactive `backdrop-filter`, les transitions et les animations de tout ce qu'elle contient.
- **WebKit (Safari iOS)** : `mask-image` est doublé de `-webkit-mask-image` pour Safari antérieur à 15.4. Le masque vit sur `.pl-reflet`, le flou sur `.pl-copie` et le retournement aussi, jamais le masque et le flou sur le même élément, ce qui évite le rognage du flou connu sous WebKit. `backdrop-filter` est coupé dans la copie parce qu'un ancêtre avec filtre ou masque en fait une racine d'arrière-plan et que WebKit le rend vide ou faux. `:has()` demande Safari 15.4, `translate` et `scale` individuels Safari 14.1, `inert` Safari 15.5 : sous ces versions, seul le survol ou le focus perd sa levée, le reste s'affiche.

---

## 10. Plan de vérification

Serveur : `npm run build` à la racine du dépôt, puis `npx vite preview --port 4274 --strictPort` en arrière-plan (un seul serveur d'aperçu par dépôt ; vérifier qu'aucune autre passe n'occupe déjà un aperçu et le réutiliser au besoin). Si le build échoue à cause du travail de l'autre passe, le signaler au lieu de corriger ses fichiers.

Script `scripts/qa/plancher-mecene.mjs`, sur le modèle de `scripts/qa/captures-studio.mjs` (vrai viewport mobile émulé, `isMobile: true`, `deviceScaleFactor: 3`). Usage : `node scripts/qa/plancher-mecene.mjs http://localhost:4274 <scratchpad>/captures-apres/vague6`.

Chaque contexte reçoit, avant tout chargement, `context.addInitScript(() => localStorage.setItem('sdl_privacy_consent', JSON.stringify({ level: 'essential', version: '1', date: '2026-09-16' })))`, sinon le bandeau de témoins couvre le bas du plancher. Une capture à part, `menu-fr-chromium-390-temoins.png`, garde le bandeau pour vérifier qu'il ne cache ni une carte ni un bouton quand il est ouvert.

Scénarios, chacun en Chromium 1440 × 900 (densité 2), Chromium 390 × 844 et WebKit 390 × 844 (appareil `iPhone 13` de Playwright) :

1. `menu-fr` : `/mecene`, langue FR.
2. `menu-en` : la bascule de langue n'existe pas sur /mecene. Ouvrir `/`, attendre la fin de l'écran de chargement, cliquer la bascule de langue de `SiteHeader`, puis `history.pushState({}, '', '/mecene')` suivi de `dispatchEvent(new PopStateEvent('popstate'))`. Vérifier que le `h1` est en anglais avant de mesurer.
3. `paliers-fr` : `/mecene`, clic sur « Soutenir des projets », défilement de `<main>` jusqu'à la scène des paliers.

Captures, dans `captures-apres/vague6/` : pour chaque scénario et chaque appareil, `haut`, `milieu` (défilement de `<main>` à 50 %) et `bas`, plus `menu-1440-survol` (souris sur la deuxième carte) et `menu-1440-focus` (deux Tab). Nom : `<scénario>-<moteur>-<largeur>-<position>.png`.

Mesures, écrites en JSON à côté des captures, avec un seuil de réussite chacune :

| # | Mesure | Réussite |
|---|---|---|
| 1 | `main.scrollWidth - main.clientWidth` et `document.documentElement.scrollWidth - innerWidth` | 0 |
| 2 | Largeur de `.pl-scene` comparée à `main.clientWidth` | écart ≤ 1 px |
| 3 | Pour chaque `.pl-objet` : haut de `.pl-reflet` moins bas de `.pl-carte` | `2 × lev` à ±1 px (28, ou 67 pour `data-haut`), mesuré avec les animations en pause via `document.getAnimations().forEach(a => a.pause())` après avoir remis `currentTime = 0` |
| 4 | Centres verticaux des `.pl-ombre` d'une même rangée | écart ≤ 1 px |
| 5 | À 1440, bas du dernier `.pl-reflet` du menu comparé au bas de `<main>` visible | au moins 40 px de sol nu dessous, sans défiler |
| 6 | Lignes du `h1` (hauteur ÷ `line-height` calculé) à 390 et à 360 ; lignes de chaque titre de carte et de palier | ≤ 2 |
| 7 | Dix appuis sur Tab : `document.activeElement.closest('.pl-reflet')` | toujours `null` |
| 8 | `page.locator('.pl-scene').ariaSnapshot()`, et `document.querySelectorAll('.pl-scene button :is(h1,h2,h3,h4,p,div)').length` | chaque titre de carte apparaît une seule fois ; 0 élément de bloc dans un bouton |
| 9 | `document.elementFromPoint` au centre de chaque reflet | jamais un `button` ni un descendant de `.pl-reflet` |
| 10 | Chromium, CDP `Performance.getMetrics` : `LayoutCount` et `RecalcStyleCount` avant et après 3 s sans interaction | `LayoutCount` inchangé |
| 11 | WebKit 390 : durées d'image par `requestAnimationFrame` pendant 5 s | médiane ≤ 17 ms, 95e centile ≤ 25 ms |
| 12 | Chromium 390, CDP `LayerTree.enable` puis compte des couches | ≤ 24 ; au-delà, noter le chiffre et appliquer le repli du risque R3 |
| 13 | `emulateMedia({ reducedMotion: 'reduce' })` : `getComputedStyle(.pl-carte).animationName`, puis, après `document.fonts.ready` et 1 s d'attente (le fondu d'entrée d'`ArtsPage` dure 0,8 s et n'est pas coupé par le mouvement réduit), deux captures à 1 s d'écart | `none`, et captures identiques octet pour octet |
| 14 | Onglet « Soutenir le centre » à 390, `<main>` remonté en haut : `data-anime` de la scène des paliers comparé à sa position (sur le menu, cette scène n'est pas montée du tout) ; puis `<main>` défilé jusqu'à la scène | `"non"` si le haut de la scène est sous `innerHeight`, sinon la mesure est notée non concluante et refaite à 1440 ; `"oui"` une fois la scène à l'écran |
| 15 | WebKit : `getComputedStyle(.pl-reflet).webkitMaskImage` | différent de `none` |
| 16 | Chaque image de carte : `max(rect.width × dpr ÷ naturalWidth, rect.height × dpr ÷ naturalHeight)` et `currentSrc` | ≤ 1,05, et `currentSrc` finit par `.webp` (ou vient d'Unsplash pour le Café) |
| 17 | `fontStyle` calculé de tout texte dans `.pl-scene` | `normal` partout |
| 18 | Couleurs calculées (`color`, `background-color`, `border-color`, `background-image`) dans `.pl-scene` et dans la bannière « Don partagé » | aucune ne contient `212, 175, 55` |
| 19 | `fontFamily` du `h1` et des titres, puis des surtitres | contient `Prata`, puis `Cinzel` |
| 20 | Texte visible de la scène | aucun tiret cadratin (U+2014), aucun mot anglais en version FR |
| 21 | Console | aucune erreur venant de `PlancherLuisant` ou `MeceneScenes` (les erreurs de tiers ne se rapportent pas) |

Lecture des captures avec la grille de `boucle-verdict` : pleine largeur sans vide latéral, aucun élément qui en cache un autre (la pastille Bientôt ne touche pas le titre Café), titres sur deux lignes au plus comptés sur l'image, reflet lisible mais léger (la carte d'origine reste nettement plus présente que son reflet), lignes du sol perceptibles sans être une grille, lustre visible sur la capture du milieu, aucun italique, rien de collant. Un agent vérificateur indépendant relit les captures 1440 et WebKit 390 parce que la page est publique. Trois tours au plus, puis livraison avec la liste de ce qui reste.

Ajustements permis pendant la boucle, sans rouvrir le devis : `object-position` des quatre photos, `--pl-horizon` par point de rupture, opacité de la copie entre 0,45 et 0,7, opacité des lignes du sol entre 0,03 et 0,06.

---

## 11. Risques

- **R1, l'autre passe dans `ArtsPage.tsx`.** Conflit d'édition possible. Parade : relire juste avant, remplacer par ancres, `git diff` limité aux blocs cités avant de commiter, aucun `stash`, un seul commit qui ne contient que les fichiers de cette vague.
- **R2, remontage de `PatronageSection`.** Elle reste déclarée dans `ArtsPage` : ouvrir le menu Famille la remonte, relance son `scrollTo` et fait repartir le flottement des paliers. Le menu, lui, n'est plus touché puisque `MenuMecene` vit au niveau module. Sortir `PatronageSection` du corps d'`ArtsPage` réglerait le problème, mais ce déplacement dépasse cette vague ; nous le notons pour la suivante.
- **R3, coût du reflet sous WebKit mobile.** Sept objets, donc jusqu'à quatorze couches animées sur la page des paliers. Si la mesure 11 ou 12 échoue, le repli s'ajoute au CSS : `@media (hover:none){.pl-reflet-flotte,.pl-ombre{animation:none}.pl-scene{--_flou:0px}}`. La carte flotte encore, le reflet reste en place et net, et l'effet de sol tient. Aucune autre dégradation n'est permise avant d'avoir mesuré.
- **R4, la photo du musée.** `kamy museum.png` montre elle-même un sol qui réfléchit, ce qui aurait bien servi la carte, mais ses 565 px de haut donneraient une image floue. Nous prenons `kamy inside.jpg` de la même série. Si Alex tient au musée, il faut une source d'au moins 1400 px de haut.
- **R5, les avantages des paliers.** Nous avons traduit fidèlement ce que le code affiche déjà en ligne, sans rien ajouter, avec une exception : « Corporate Tax Receipt » disparaît des deux langues. Le vault (`10_projects/fmm/05-partenaires/strategie-commandites.md`) rappelle qu'aucun reçu officiel de don ne se promet sans le statut d'organisme de bienfaisance enregistré, et rien n'indique que le Salon l'ait ; traduire la ligne en français l'aurait en plus exposée au public québécois. Les autres avantages (mur des fondateurs, conciergerie, 10 % de rabais, souper privé) restent publiés comme avant, mais aucun n'est confirmé dans le vault : Alex les valide, et c'est lui qui dit si le reçu revient.
- **R6, photo du Café.** Photo libre d'Unsplash, pas le lieu. Elle reste jusqu'à ce qu'une photo du café du Salon existe.
- **R7, texte en miroir.** Le reflet montre le surtitre et le titre à l'envers, flous et pâles, comme sur un vrai sol laqué. Si la boucle verdict juge que cela brouille la lecture à 390, ramener l'opacité de la copie à 0,45 avant toute autre retouche.
- **R8, `inert` et types.** Couvert à la section 5.
- **R9, double chargement d'image.** La copie demande la même URL que la carte, servie par le cache ; la mesure 16 et l'onglet réseau de Playwright doivent montrer une seule requête par image.

---

## 12. Hors périmètre

Le héros de `PatronageSection` (titre Cinzel, bouton émeraude), les textes de la bannière « Don partagé » (seules ses couleurs changent, section 7), les onglets Artiste, Projet et Au-delà de l'argent, le Hub à deux panneaux, les actions des boutons « Rejoindre le cercle », le Catalogue et la Fiscalité. Aucun déploiement dans cette vague : le constructeur livre le commit et les captures, et le déploiement suit la règle du dépôt.
