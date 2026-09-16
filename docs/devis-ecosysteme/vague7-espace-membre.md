# Devis · Vague 7 · L'espace membre du Salon des Inconnus

Rédigé le 16 septembre 2026, en lecture seule sur les deux dépôts. Destiné à un agent constructeur qui l'exécute lot par lot.

Dépôt du Salon : `R = "/Users/lesalondesinconnus/Documents/Websites/le-salon-des-inconnus-inn-section-v.08 (5)"` (tous les chemins ci-dessous sont relatifs à R sauf mention).
Dépôt de référence : `K = "/Users/lesalondesinconnus/Documents/Websites/Krystine Main"` (lu, jamais copié tel quel : rien au nom de Krystine ne passe dans R).

Demande d'Alex, mot pour mot : « l'espace membres du salon des inconnus est laid, refais le completement comme krystine. avec ces fonctions, backend etc. Lier les admin backend avec vexel (basculer entre vexel et le salon des inconnus admin en 1 clic). Dans l'espace membre, il y a : devenir membre de la communauté artistique : avec lien vers creator studio ». La bascule admin est livrée (vague 3, `components/AdminShell.tsx:42` `BasculeAdmin`) et sort du périmètre.

---

## 0. Ce que la lecture du code a trouvé et qui change le devis

Quatre constats commandent l'ordre des lots, et le premier est un bris en production qu'il faut réparer avant de bâtir quoi que ce soit.

1. **La création de fiche membre par `AuthModal` est refusée par les règles depuis le 12 septembre.** `components/AuthModal.tsx:90-109` (`createMemberProfile`) écrit `uid`, `membershipType`, `isAdmin`, `phone`, `createdAt`, `consentDate` et `consentVersion` dans `members/{uid}`, alors que `firestore.rules:44-60` (`membreValide`, posé dans l'autosave `250fed3` du 12 septembre) n'accepte que `displayName, email, photoURL, banniereURL, bio, discipline, ville, liens, provider, joinedAt, lastSeenAt`. Toute nouvelle inscription par la pastille échoue donc au choix du type de membre, et `ProfilePage.tsx:101` (mise à jour du téléphone) échoue de la même façon. Le même `hasOnly` bloque aussi `ensureMember` (`reseau/auth.ts:42`, fusion) sur toute fiche ancienne qui porte déjà `isAdmin` ou `phone`, si bien que `lastSeenAt` ne bouge plus pour ces membres. À confirmer sur l'émulateur au lot 0 (cas R-01 à R-05), puis sur la console en lisant les règles déployées.
   **Piège de la réparation :** `isAdmin` ne vient pas seulement de la création. `App.tsx:547` et `App.tsx:590` chargent `memberProfile` tel quel depuis le document, et trois écrans lisent ce champ : `MemberPanel.tsx:136` (l'entrée Admin du menu d'Alex), `PublicProfilePage.tsx:778` (pastille Admin sur la fiche publique) et `AdminCRM.tsx:649,1461`. Retirer `isAdmin` des fiches sans calculer ce drapeau ailleurs fait disparaître l'entrée Admin du menu d'Alex. Le lot 0 le calcule donc à partir du jeton (`user.email` en minuscules dans la liste admin ET `user.emailVerified`) dans l'App, et à partir du champ `email` de la fiche pour les deux écrans qui regardent un autre membre, ce qui exige de borner `email` dans la règle (5.1 a).
2. **La photo de profil de `ProfilePage` vise un chemin Storage fermé.** `ProfilePage.tsx:120` écrit `members/{uid}/avatar`, que `storage.rules` ne couvre pas (seuls `members/{uid}/profil/**`, `mur/**`, `videos/**` et `superProfile/**` existent), si bien que la règle par défaut refuse. Le nouvel espace passe par `packages/ui/src/reseau/images.ts` et `members/{uid}/profil/avatar.jpg`, qui fonctionnent.
3. **`members/{uid}` est lisible par tout membre connecté** (`firestore.rules:84`). Le téléphone et les préférences ne doivent donc jamais y vivre : ils vont dans une sous-collection privée `members/{uid}/prive/*`.
4. **Hostaway ne cherche pas par courriel.** La documentation publique (`GET /v1/reservations`, https://hostaway.github.io/api/) décrit `match` comme une recherche « by guest name or reservation ID », et l'objet réservation porte `guestEmail`, `listingMapId`, `arrivalDate`, `departureDate`, `status` (`pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `ownerStay`), `totalPrice`, `currency`, `numberOfGuests`, `channelName`, `reservationId`, `confirmationCode` et `guestPortalUrl`. La fonction `mesSejours` lit donc une fenêtre de dates et filtre `guestEmail` côté serveur. Les réservations Airbnb et Booking portent souvent un courriel relais ou vide : d'où la fonction `lierSejour`, qui rattache un séjour par son code de confirmation et sa date d'arrivée. Attention au choix des filtres : le journal de l'API (entrée du 21 août 2026) précise que `dateType`, `startDate` et `endDate` sont servis par « the new reservations list query, which is enabled per account ». Rien ne dit que ce compte l'a, et sans elle ces trois paramètres sont ignorés, ce qui renverrait tout l'historique. Les fonctions utilisent donc les filtres classiques `arrivalStartDate`, `arrivalEndDate`, `departureStartDate`, `departureEndDate` (documentés sur hostaway.github.io/api), et la pagination par `afterId` (ajoutée le 31 mars 2026, `offset` étant déprécié).

Autres faits mesurés qui servent plus bas :

- L'en-tête `SiteHeader` n'est monté que sur `INN`, `INN_TEST3` et `INN_RESERVE_CINE` (`App.tsx:729`). Son écouteur de défilement lit n'importe quel conteneur en capture (`SiteHeader.tsx:142-156`), il peut donc être monté sur `/compte` sans rien changer. Sa hauteur réelle est **56 px** (`SiteHeader.tsx:583`, `style={{ height: '56px' }}`), `fixed` en `z-[109]`.
- `App.tsx:363` : `isStandalonePage` ne liste que `COFFRE`, `DOWNLOAD`, `SUPER_PROFILE` et les vues d'arts. Sans `COMPTE` dans cette liste, l'écran de chargement précharge les photos de l'auberge (`INITIAL_ASSETS`) et `useIdlePreloader` tire `DEFERRED_ASSETS` : le budget de 1,2 Mo du premier écran mobile est perdu d'avance.
- `handleNavigation` (`App.tsx:369-383`) pousse `VIEW_PATHS[vue]` et compare `pathname` seulement : il ne sait pas porter `?onglet=`, et un clic vers un autre onglet depuis `/compte` ne pousserait rien. Il faut un petit `naviguerCompte(onglet, sous?, conv?)` à côté.
- Les vues `MY_PROFILE` et `MESSAGING` sont appelées ailleurs que dans `MemberPanel` : `PublicProfilePage.tsx:429,485`, `ProfilePage.tsx:409`, `CeilidhPage.tsx:2968`. Les rediriger seulement dans `pathToView` laisse ces boutons pousser `/profil` et `/messages` en navigation interne.
- `events/ceilidh-mai-2026/registrations` n'est pas lu que par le compteur : `CeilidhPage.tsx:218-221` et `CeilidhShared.tsx:2585` s'y abonnent **sans connexion** pour les équipes, la ligne du temps et le décompte des chambres. Ce qui fuit, c'est le champ `email`, écrit par `CeilidhPage.tsx:1776,2710`, `CeilidhShared.tsx:1725,1895` et `ProfilePage.tsx:1128`. Les mêmes pages publient aussi `carpools.driverEmail` et `needs.createdByEmail` en lecture publique.
- `createShowTicketPayment` est une fonction **v1** (`functions.https.onCall`, `index.ts:89`) sans transaction, et l'admin supprime des billets depuis le navigateur (`AdminCRM.tsx:987`). Un compteur incrémenté dans la fonction dériverait à la première suppression.
- Les déclencheurs Firestore existants sont tous en v1 (`functions.runWith(RUNTIME_WITH_SMTP).firestore.document(...)`, `index.ts:171,302`), les appelables récents en v2. Le dépôt n'a pas de `firestore.indexes.json`.
- `AuthModal.tsx` porte 23 occurrences de `#d4af37`, `MemberPanel.tsx` 20, `MessagingPage.tsx` 14, `ProfilePage.tsx` 6 (dont le coupon `COMMUNAUTE`, ligne 737). La couleur `gold` par défaut de `tailwind.config.js` vaut aussi `#d4af37` : `text-gold`, `bg-gold` et `border-gold` sont interdits dans les nouveaux fichiers (`gold-muted` vaut `#c5a059`).
- `BadgesUI.tsx:54` affiche un tiret cadratin à l'écran (« Vos badges — choisissez-en cinq à exposer au plus ») dans `SelecteurBadges`, que l'onglet Profil réemploie.
- `packages/ui` est aussi bâti dans `apps/salon` (site `inconnus-salon`, qui importe `RESERVED_SLUGS` et `PageMembre`) : toute retouche à `reseau/` ou `usernames.ts` se redéploie aussi sur ce site.
- `firebase.json` : `www.lesalondesinconnus.com` est servi par le site `le-salon-des-inconnus` (commentaire du bloc), et `inconnus-auberge` en est le miroir. La réécriture `^/[a-z0-9][a-z0-9-]{1,30}[a-z0-9]/?$` couvre déjà `/compte`, `/profil` et `/messages` : aucune entrée de réécriture à ajouter, la vraie 404 du 16 septembre reste intacte. Le patron d'en-tête `X-Robots-Tag` existe déjà pour `/invitation`.
- Le dépôt a déjà ses outils de vérification : `scripts/qa/captures-studio.mjs` (captures 1440 et 390, compte témoin par `TEMOIN_EMAIL`/`TEMOIN_PW`, débordement, tirets longs, italiques), `scripts/qa/firestore-rest.mjs` (lecture et écriture par le jeton gcloud du propriétaire) et `scripts/qa/servir-salon.mjs` (sert un `dist` avec les en-têtes et réécritures de `firebase.json`). Le devis les réemploie au lieu d'en écrire d'autres.
- `/compte` n'est pas dans `RESERVED_SLUGS` (`packages/ui/src/super-profile/usernames.ts:23`) et serait intercepté par le répartiteur de Profil Pro si la vue n'était pas déclarée dans `VIEW_PATHS` avant `extractSlug` (`App.tsx:283-297`).
- Les billets du Ceilidh vivent dans `events/ceilidh-mai-2026/showTickets/{uid}` (écrits par `createShowTicketPayment`, `functions/src/index.ts:89-158`), les contributions dans `events/ceilidh-mai-2026/contributions/{auto}` avec `uid` (`index.ts:62-73`, aucune règle, donc lecture client refusée), les inscriptions dans `events/ceilidh-mai-2026/registrations/{uid}`, et les places de camping dans `events/camping-fmm-2026/reservations/{sessionStripe}` avec `courriel` et sans uid (`index.ts:1001-1030`, aucune règle).
- `showTickets` et `registrations` sont en lecture publique (`firestore.rules:373` et `468`), courriels compris. Ce trou préexiste à la vague et se referme au lot 3 (voir risques).
- Le réseau social existant fournit `friendships` (`reseau/amities.ts`), `conversations` avec `members[]` (`reseau/dms.ts`, `components/MessagingPage.tsx`), la cloche `notifications/{uid}/items` (`reseau/notifications.ts`, `reseau/Cloche.tsx`), les badges `badges/{uid}` (`reseau/badges.ts`) et `signalements` (modération du mur). Les noms `conversations`, `signalements` et `badges` sont pris : les nouvelles collections portent d'autres noms.
- `ProfilePage.tsx` porte des fonctions qu'aucune liste n'a nommées mais qui ne doivent pas disparaître : le code promo `COMMUNAUTE` (ligne 706-742), le programme d'affiliation `affiliateRequests` (744-846), le dé D20 hebdomadaire `rollWeeklyD20` (848-998) et le panneau « Mon Ceilidh » `MyCeilidhPanel` (1077-1346). Ils déménagent tous dans le nouvel espace.
- L'admin liste les membres par `orderBy('createdAt','desc')` (`AdminCRM.tsx:639`), ce qui exclut en silence chaque fiche créée par la porte du Creator Studio (`reseau/auth.ts` écrit `joinedAt`, jamais `createdAt`).
- Canon mesuré dans le code livré aujourd'hui : `font-prata` défini dans `index.css:17`, `font-cinzel` et `font-lato` dans `tailwind.config.js:38-43`, or `#c5a059` et crème `#f3e5ab` sur `SiteFooter.tsx` et `CentreArtsCommunauteSection.tsx`, fond `#050505`. `MemberPanel.tsx` et `MessagingPage.tsx` tournent encore sur `#d4af37`, qui disparaît de ces deux fichiers.
- Un accès Admin SDK sans clé existe déjà comme patron : `_vexel-base/scripts/qa/admin-shot.mjs` et la mémoire `reference_capture_admin_vraies_donnees` (jeton signé par IAM `signJwt` sur le compte de service `appspot`, rôle `roles/iam.serviceAccountTokenCreator` posé puis retiré). Les identifiants ADC de `houseoftherisingarts@gmail.com` sont présents sur la machine.

---

## 1. Routes

| Adresse | Vue | Comportement |
|---|---|---|
| `/compte` | `COMPTE` (nouvelle) | L'espace membre. Onglet par défaut : `profil`. |
| `/compte?onglet=<id>` | `COMPTE` | Ouvre l'onglet `<id>` parmi `profil, sejours, billets, communaute, artistique, vivre-ici, parrainage, preferences, aide`. Un id inconnu retombe sur `profil`. Changer d'onglet fait `history.replaceState` (jamais `pushState`, pour que le bouton Retour quitte la page). |
| `/compte?onglet=communaute&sous=<amis\|messages\|notifications>` | `COMPTE` | Sous-onglet de Communauté. `&conv=<id>` ouvre une conversation. |
| `/compte?parrain=<CODE>` | `COMPTE` | Retient le code en `sessionStorage` (`salon-code-parrain`) puis le réclame une fois connecté. |
| `/profil` | redirige vers `/compte` | `pathToView` reste une fonction pure et rend `COMPTE` pour `/profil` ; un `useEffect` de l'App fait le `replaceState('/compte')` au montage. `handleNavigation('MY_PROFILE')` est aliasé vers `COMPTE`, pour que les boutons de `PublicProfilePage.tsx:485` et d'ailleurs arrivent au bon endroit. `ProfilePage.tsx` reste dans le dépôt, n'est plus monté, et ne se supprime qu'avec l'accord d'Alex. |
| `/messages` | redirige vers `/compte?onglet=communaute&sous=messages` | Même patron : `pathToView('/messages')` rend `COMPTE`, et `handleNavigation('MESSAGING')` (appelé par `PublicProfilePage.tsx:429`, `ProfilePage.tsx:409`, `CeilidhPage.tsx:2968`) devient `naviguerCompte('communaute', 'messages', activeConversationId)`. |
| `/admin` | inchangé | La fiche membre s'ouvre dans l'onglet Membres. |

Fichiers touchés pour les routes :

- `App.tsx` : ajouter `'COMPTE'` à `ViewState` (ligne 192), `COMPTE: '/compte'` à `VIEW_PATHS` (200), `/profil` et `/messages` vers `COMPTE` dans `pathToView` (283, sans effet de bord) avec le `replaceState` dans un effet, l'alias `MY_PROFILE`/`MESSAGING` → `COMPTE` dans `handleNavigation` (369), la fonction `naviguerCompte(onglet, sous?, conv?)` qui fait `pushState` avec la requête, `COMPTE` dans `isStandalonePage` (363) pour que ni `INITIAL_ASSETS` ni `DEFERRED_ASSETS` ne se chargent, le montage de `SiteHeader` sur `COMPTE` (729), et le montage lazy de `EspaceMembrePage` dans le même patron que la vue `ADMIN` (conteneur `h-screen overflow-y-auto overscroll-contain`, `App.tsx:1016`). `handleStartDM` (603) navigue désormais vers `/compte?onglet=communaute&sous=messages&conv=<id>`. Enfin `isAdmin` est calculé dans l'écouteur d'authentification (547) et dans `getRedirectResult` (590) à partir de `user.email` et `user.emailVerified`, puis posé sur l'objet `memberProfile`, au lieu d'être lu dans le document.
- `components/SiteHeader.tsx` : ajouter `'COMPTE'` au type `ViewState` local (lignes 13-16).
- `packages/ui/src/super-profile/usernames.ts:23` : ajouter `'compte'` à `RESERVED_SLUGS`. Avant le déploiement, lire `usernames/compte` avec `node scripts/qa/firestore-rest.mjs get usernames/compte` : s'il existe, arrêter et le signaler à Alex. La règle `usernames` ne connaît pas la liste réservée ; comme `VIEW_PATHS` passe avant `extractSlug`, un slug `compte` créé plus tard serait seulement inatteignable, sans casser la page.
- `config/seo.config.ts` : entrée `COMPTE` dans `PAGE_META` (titre « Votre espace · Le Salon des Inconnus » / « Your space · Le Salon des Inconnus ») et `COMPTE: 'noindex, nofollow'` dans `ROBOTS_OVERRIDES` (ligne 209). `SeoViewKey` (`seo.content.ts:48`) est un `Extract` fermé : `COMPTE` n'y entre pas et n'exige aucun `SEO_CONTENT`.
- `firebase.json` : pas de `Disallow` dans `robots.txt` (un robot bloqué ne lit jamais le `noindex` et peut garder l'adresse nue dans l'index). À la place, un en-tête `X-Robots-Tag: noindex, nofollow` sur `/compte`, `/profil` et `/messages`, copié du bloc `/invitation`, dans les deux sites `le-salon-des-inconnus` et `inconnus-auberge`, placé avant le bloc `**`.
- `components/MemberPanel.tsx` : connecté, la pastille mène à `/compte` (au lieu de `MY_PROFILE`), et le menu devient : Votre espace, Messages (`/compte?onglet=communaute&sous=messages`), Vos séjours, Vos billets, Devenir membre de la communauté artistique (`/creator`), Vivre et travailler ici (`/compte?onglet=vivre-ici`), Politique de confidentialité, Déconnexion. Chaque entrée qui vise un onglet n'apparaît qu'à partir du lot qui bâtit cet onglet (même tableau filtré que la rangée d'onglets), sinon « Vos séjours » ouvrirait le Profil entre le lot 1 et le lot 4. `#d4af37` remplacé par `#c5a059` partout dans le fichier. `isAdmin` (ligne 136) lit l'objet calculé par l'App.

---

## 2. Architecture des composants

Nouveau dossier `components/compte/`, chaque fichier sous 500 lignes (consigne du `CLAUDE.md` du dépôt).

```
components/compte/
  EspaceMembrePage.tsx        coquille : porte, bannière, avatar, onglets, grille contenu + rail, pied de page
  Banniere.tsx                bannière pleine largeur + choix de photo (catalogue réel ou photo personnelle)
  OngletsMembre.tsx           rangée d'onglets (role=tablist, clavier, défilement horizontal)
  RailMembre.tsx              colonne de droite : carte Parrainage, carte Communauté artistique, raccourci Aide
  onglets/
    OngletProfil.tsx          MonProfilForm (réemployé) + coordonnées privées + type de membre + vitrine de badges
    OngletSejours.tsx         mesSejours + lierSejour + code COMMUNAUTE + dé D20 (déplacé)
    OngletBillets.tsx         mesBillets + MyCeilidhPanel (déplacé)
    OngletCommunaute.tsx      sous-onglets Amis / Messages / Notifications
    OngletArtistique.tsx      carte « Devenir membre de la communauté artistique » + état Creator Studio
    OngletVivreIci.tsx        état des candidatures + CommunityMembershipSection + lien wwoofing
    OngletParrainage.tsx      code, lien, filleuls + programme d'affiliation (déplacé)
    OngletPreferences.tsx     langue, courriels, suppression du compte
    OngletAide.tsx            conversation avec l'équipe + signalement de problème technique
  donnees/
    sejours.ts                appels httpsCallable mesSejours / lierSejour, types
    billets.ts                appel httpsCallable mesBillets, types
    soutien.ts                soutien/{uid} : suivre, envoyer, marquer lu
    problemes.ts              problemesTechniques : envoi + capture Storage
    parrainage.ts             codesParrain / parrainages (porté de K/src/firebase/parrainage.ts, renommé)
    preferences.ts            members/{uid}/prive/preferences et /coordonnees
    creatorStudio.ts          lecture artistProfile/profile + admin/flags + abonnementsPro
  deplaces/
    CouponCommunaute.tsx      JSX de ProfilePage.tsx:706-742 + copyCoupon (173-182), #d4af37 → #c5a059
    AffiliationPanneau.tsx    JSX de ProfilePage.tsx:744-846 + état et requestAffiliate (140-172)
    DeHebdomadaire.tsx        JSX de ProfilePage.tsx:848-998 + état, appel rollWeeklyD20 et compte à rebours (183-270)
    MonCeilidhPanneau.tsx     composant MyCeilidhPanel, ProfilePage.tsx:1069-1346 + lecture des inscriptions et du billet (52-90)
components/admin/
  FicheMembre.tsx             fiche complète d'un membre (tiroir plein écran dans AdminCRM)
  SoutienSection.tsx          boîte des conversations d'aide + signalements techniques
packages/ui/src/reseau/
  ListeAmis.tsx               extrait du bloc « amis » de ProfilSocial.tsx (lignes ~104-175), ProfilSocial l'importe
```

Les trois premiers blocs ne sont pas des composants aujourd'hui : ce sont des morceaux de JSX qui vivent sur l'état et les fonctions de `ProfilePage`. Chaque fichier de `deplaces/` emporte donc son état et son appel, et reçoit `user`, `memberProfile` et `language` en props. `ProfilePage.tsx` n'est pas retouché pour importer ces fichiers (il n'est plus monté après le lot 1, et le remanier ne sert qu'à risquer une régression) ; il garde sa copie jusqu'à l'accord d'Alex. Toute occurrence de `#d4af37` et de la classe `gold` par défaut dans ces fichiers passe à `#c5a059`. L'invite « voyage temporel » du dé n'a pas d'italique à retirer : le mot `italic` de la ligne 911 est dans un commentaire.

`MessagingPage.tsx` reçoit une prop `integre?: boolean`. Intégrée, elle ne rend ni son en-tête (lignes 264-276) ni `min-h-screen`, et sa hauteur devient `h-[min(720px,calc(100svh-220px))]` au lieu de `calc(100vh - 57px)`. Sous 768 px, la liste et la conversation s'affichent une à la fois avec un bouton « Retour aux conversations ». `#d4af37` y devient `#c5a059`. `MessagingPage.tsx:181` lit la collection `members` au complet (`getDocs`) pour le sélecteur de nouvelle conversation : en mode intégré, cette lecture n'a lieu qu'à l'ouverture du sélecteur, jamais au montage, parce qu'elle grossit avec chaque membre et se paie en entier sur mobile.

Avant de toucher `packages/ui/src/reseau/` et `packages/ui/src/super-profile/`, lancer `ListAgents` et `git pull` : une autre passe écrit dans le Creator Studio aujourd'hui, et `ListeAmis.tsx` se fait en un commit isolé.

### 2.1 La coquille (`EspaceMembrePage.tsx`)

Structure, de haut en bas :

1. `SiteHeader` (monté par App).
2. **Porte non connectée**, quand `user` est null : section pleine hauteur (`min-h-[100svh]`) sur la photo de la maison en fond, servie par les dérivés `compte/maison-{960,1600,2400}.webp` de 2.4 et jamais par le JPEG source de 971 Ko (`object-cover`, voile `linear-gradient(90deg, rgba(10,8,8,.92) 0%, rgba(10,8,8,.7) 45%, rgba(10,8,8,.2) 100%)`), texte aligné à gauche dans la gouttière du site (jamais une carte centrée dans le vide), bouton qui ouvre `AuthModal`. `AuthModal.tsx` passe au lot 1 de `#d4af37` à `#c5a059` (23 occurrences), parce que c'est le premier écran que la porte ouvre et que la mesure de 9.2 le trouverait. Cas d'un compte connecté sans fiche `members/{uid}` (inscription abandonnée au choix du type) : la coquille s'affiche quand même et l'onglet Profil ouvre le choix du type de membre d'`AuthModal`, au lieu de rendre une page vide comme `App.tsx:975` le fait pour `ProfilePage`.
3. **Bannière** (`Banniere.tsx`) pleine largeur, `h-[240px] sm:h-[300px] lg:h-[clamp(320px,30vw,440px)]`, voile du bas `linear-gradient(to top, rgba(10,8,8,.9) 0%, rgba(10,8,8,.35) 45%, transparent 100%)`.
4. **Bandeau d'identité** posé sur le bas de la bannière : avatar qui la chevauche (`w-28 h-28 lg:w-36 lg:h-36`, `-mb-14 lg:-mb-[72px]` (Tailwind 3.4 n'a pas de `-mb-18`, la classe serait ignorée en silence), anneau `ring-4 ring-[#0a0808]`, bordure `1px #c5a059/60`), nom en Prata `clamp(1.9rem,3.2vw,3rem)` sur une seule ligne (`truncate`), sous-ligne Lato 14 px `text-neutral-300` (type de membre · ville), et à droite sur desktop « Espace admin » (si admin) et « Déconnexion » en pastilles Cinzel 13 px, la taille des pastilles de l'en-tête (`PILL`, `SiteHeader.tsx:168`).
5. **Rangée d'onglets** (`OngletsMembre.tsx`) collée sous l'en-tête pendant le défilement du haut de page (`sticky top-[56px]`, la hauteur mesurée de l'en-tête, pas au bas de l'écran), fond `bg-[#0a0808]/85 backdrop-blur-md`, bordure basse `border-[#c5a059]/15`.
6. **Grille** `grid gap-8 px-4 sm:px-6 md:px-12 lg:px-20 pt-10 pb-24 xl:grid-cols-[minmax(0,1fr)_340px]`, pleine largeur, sans `max-w` ni `mx-auto`. La colonne de gauche porte l'onglet actif, la colonne de droite porte `RailMembre`. Le rail s'ouvre à `xl` et non à `lg` : à 1024 px, la colonne de contenu tomberait sous 500 px et la messagerie à deux panneaux n'y tient pas. Sous `xl`, le rail passe sous le contenu. Sur l'onglet Communauté, le rail disparaît et la messagerie prend toute la largeur.
7. **Pied de page** : `SiteFooter` avec `viewKey` rendu optionnel (`SiteFooter.tsx:110`), et le bloc `SeoBlock` sauté quand `viewKey` est absent, pour qu'aucun texte de référencement d'une autre page n'apparaisse sur une page privée. Rien ne colle au bas de l'écran.

Surface de carte commune (canon Creator Studio) : `rounded-[15px] border border-white/15 bg-black/40 backdrop-blur-md p-5 sm:p-7 lg:p-9`. Surtitre de carte : Cinzel 12 px (la taille du surtitre de `CentreArtsCommunauteSection.tsx:72`), `uppercase tracking-[0.35em] text-[#c5a059]`, filet `h-px w-10 bg-[#c5a059]` devant. Titre de carte : Prata `clamp(1.6rem,2.4vw,2.25rem)`, `text-[#f3e5ab]`, `leading-[1.1]`, deux lignes au plus comptées à 390 px. Corps : Lato 16 px, `leading-[1.75] text-neutral-200`. Bouton principal : `rounded-full bg-[#c5a059] text-[#0a0808] font-cinzel font-bold uppercase text-[12px] tracking-[0.18em] min-h-[48px] px-6`, survol `bg-[#d4b06a]`. Bouton secondaire : `rounded-full border border-[#c5a059]/55 bg-[#0a0808]/55 text-[#f3e5ab]`. Focus visible partout : `focus-visible:ring-2 focus-visible:ring-[#f3e5ab] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0808]`. Fond de page `#0a0808`. Aucune italique, aucun `#d4af37`, aucune classe `gold` sans suffixe (elle vaut `#d4af37`). L'onglet Profil réemploie `SelecteurBadges` : son libellé `BadgesUI.tsx:54` perd son tiret cadratin au lot 1 (« Vos badges : choisissez-en cinq au plus à exposer » / « Your badges: pick up to five to show »).

### 2.2 Les onglets

| id | Libellé FR | Libellé EN | Contenu |
|---|---|---|---|
| `profil` | Profil | Profile | voir 5.3 |
| `sejours` | Vos séjours | Your stays | voir 5.4 |
| `billets` | Vos billets | Your tickets | voir 5.5 |
| `communaute` | Communauté | Community | voir 5.6, pastille du nombre de non-lus (messages + demandes d'amis + notifications) |
| `artistique` | Communauté artistique | Artistic community | voir 5.7 |
| `vivre-ici` | Vivre ici | Live here | voir 5.8 |
| `parrainage` | Parrainage | Referrals | voir 5.9 |
| `preferences` | Préférences | Preferences | voir 5.10 |
| `aide` | Aide | Help | voir 5.11, pastille quand l'équipe a répondu et que le membre n'a pas lu |

Chaque onglet se charge en `React.lazy` pour que la page ne paie que l'onglet ouvert.

### 2.3 Comportements

- **Clavier** : `role="tablist"` sur la rangée, `role="tab"` et `aria-selected` sur chaque bouton, `aria-controls` vers `role="tabpanel"`. Flèche gauche et droite passent à l'onglet voisin (en boucle), Début et Fin vont au premier et au dernier, et l'onglet activé défile dans la rangée (`scrollIntoView({ inline: 'nearest', block: 'nearest' })`). Le focus arrive sur le panneau au changement par clic, jamais au chargement de la page.
- **Défilement** : la rangée d'onglets défile horizontalement (`overflow-x-auto snap-x`, barre masquée), avec un fondu de 32 px sur le bord droit quand du contenu dépasse. Changer d'onglet ramène le haut du panneau sous la rangée collée (`scrollTo` du conteneur, `behavior: 'smooth'` sauf mouvement réduit).
- **Survol** : cartes `transition-colors duration-200`, bordure qui passe à `border-[#c5a059]/40`. Avatar : voile `bg-[#0a0808]/55` et le mot « Changer » en Cinzel.
- **Mouvement réduit** : l'apparition des panneaux (fondu 180 ms + translation 8 px, `framer-motion` déjà installé) et le zoom lent de la bannière (1,04 à 1 en 1,6 s) disparaissent sous `prefers-reduced-motion: reduce` (`motion-reduce:` en Tailwind, `useReducedMotion` en framer-motion).
- **Performance mobile** : bannières en WebP à trois largeurs (`-960`, `-1600`, `-2400`) avec `srcset` et `sizes="100vw"`, `fetchpriority="high"` sur la bannière seulement, `loading="lazy"` et `decoding="async"` partout ailleurs. Aucun WebGL, aucune capture de la molette. `MessagingPage` et `CommunityMembershipSection` ne se chargent qu'à l'ouverture de leur onglet.
- **Langue** : la prop `language` de l'App gouverne ; la préférence `langue` du membre, si posée, s'applique une fois au premier chargement de `/compte` par `onToggleLanguage` quand elle diffère.

### 2.4 Bannières, vraies photos seulement

Photos mesurées aujourd'hui avec `sips`, toutes prises au Salon, aucune générée. Les fichiers dont le nom contient « banana » ou « upscale » sont écartés d'office (retouche générée ou agrandissement).

| clé | Source (sous `public/media/`) | Taille réelle | Libellé FR / EN |
|---|---|---|---|
| `maison` (défaut) | `Auberge photos/Maison main.jpg` | 2800 × 1310 | La maison / The house |
| `yourte` | `Auberge photos/yourte coucher de soleil.jpg` | 2800 × 1136 | La yourte au couchant / The yurt at sunset |
| `drone` | `inn/golden drone copy.jpg` | 2800 × 1575 | Vue du ciel / From above |
| `bus` | `Auberge photos/bus foyer.jpg` | 2800 × 1575 | Le bus / The bus |
| `jardins` | `Auberge photos/jardins auberge.jpg` | 2800 × 2100 | Les jardins / The gardens |
| `hemerocales` | `Auberge photos/hemerocales auberge.jpg` | 3000 × 2250 | Les hémérocalles / The daylilies |

Les dérivés WebP se produisent une fois avec `cwebp` (installé dans `/usr/local/bin` ; `sharp` n'est pas dans `node_modules`) dans `public/media/compte/<clé>-{960,1600,2400}.webp`, qualité 78, et se commitent. La photo personnelle passe par `reseau/images.ts` (redimensionnée côté client) vers `members/{uid}/profil/banniere.jpg` et le champ `banniereURL` déjà permis par `membreValide`. Le choix d'une photo du catalogue s'écrit dans `members/{uid}/prive/preferences.banniere` (clé), jamais dans le document public.

---

## 3. Données Firestore

Légende de la colonne « Qui écrit » : **M** = le membre depuis le navigateur, **A** = l'admin depuis le navigateur (`isAdmin()`), **F** = une fonction Cloud par l'Admin SDK (contourne les règles).

### 3.1 Collections existantes réemployées sans changement de forme

| Chemin | Usage dans l'espace |
|---|---|
| `members/{uid}` | identité publique (nom, photo, bannière perso, bio, discipline, ville, liens) |
| `members/{uid}/admin/flags` | `isArtist`, `proEnabled`, `maestroEnabled`, `featureCreatorStudio` : lecture propriétaire |
| `members/{uid}/artistProfile/profile` | `onboardingV1Completed`, présence d'un profil Creator Studio |
| `abonnementsPro/{uid}` | état de l'abonnement Profil Pro |
| `usernames/{slug}` | adresse publique du Profil Pro (requête `where('uid','==',uid)`) |
| `friendships/{a_b}` | amis |
| `conversations/{id}` + `messages` | messages entre membres |
| `notifications/{uid}/items` | cloche |
| `badges/{uid}` | vitrine |
| `communityApplications/{uid}`, `wwoofers/{uid}` | Vivre ici |
| `affiliateRequests/{uid}`, `d20Rolls/{uid}` | déplacés dans Parrainage et Séjours |
| `events/ceilidh-mai-2026/registrations/{uid}` | Mon Ceilidh |

### 3.2 Champs ajoutés à `members/{uid}` (réparation du lot 0)

| Champ | Type | Qui écrit | Borne |
|---|---|---|---|
| `uid` | string | M (création) | égal à l'id du document |
| `membershipType` | string | M | l'un de `voyageur, artiste, membre-communaute, resident, woofer` |
| `createdAt` | timestamp | M (création seulement) | `request.time` à la création, inchangé ensuite |
| `consentDate` | string | M | ≤ 40 caractères |
| `consentVersion` | string | M | ≤ 10 caractères |
| `email` (existant, désormais borné) | string | M | vide ou égal à `request.auth.token.email`, ≤ 200 |

`isAdmin` et `phone` ne s'écrivent plus jamais dans `members/{uid}`. `AuthModal.createMemberProfile` calcule `isAdmin` en mémoire pour l'objet rendu à l'App, l'App fait de même à chaque chargement de fiche (voir 1, `App.tsx`), et `PublicProfilePage.tsx:778` comme `AdminCRM.tsx:649` le déduisent du champ `email` de la fiche, que la règle empêche désormais d'usurper. Le téléphone s'écrit dans `members/{uid}/prive/coordonnees`. `onNewMember` (`index.ts:318`) perd sa ligne Téléphone, qui n'était remplie que pour une connexion par numéro, ce que la porte n'offre pas.

Un script unique `scripts/migrer-fiches-membres.mjs` s'appuie sur `scripts/qa/firestore-rest.mjs` (jeton gcloud du propriétaire, aucune clé, aucun rôle IAM à poser). En mode `--essai`, il liste **toutes** les fiches dont une clé sort de la nouvelle liste `hasOnly`, pas seulement `phone` et `isAdmin`, parce qu'une seule clé inconnue suffit à figer la fiche. En mode `--appliquer`, il déplace `phone` vers `prive/coordonnees.telephone`, retire `isAdmin`, et laisse intactes les autres clés inconnues, qui remontent à Alex dans le rapport du lot au lieu d'être effacées.

### 3.3 Nouvelles collections

**`members/{uid}/prive/coordonnees`**

| Champ | Type | Qui écrit | Borne |
|---|---|---|---|
| `telephone` | string | M, A | ≤ 40, `^[0-9 +().-]*$` |
| `majLe` | timestamp | M, A | `request.time` |

**`members/{uid}/prive/preferences`**

| Champ | Type | Qui écrit | Borne |
|---|---|---|---|
| `langue` | string | M | `FR` ou `EN` |
| `banniere` | string | M | l'une des clés de 2.4 ou `photo` |
| `courrielReponseEquipe` | bool | M | défaut `true` |
| `courrielNouveauMessage` | bool | M | défaut `false` |
| `majLe` | timestamp | M | `request.time` |

Lecture : propriétaire et admin. Écriture : propriétaire (`hasOnly` sur ces champs) et admin.

**`sejours/{uid}`** (état serveur des séjours d'un membre)

| Champ | Type | Qui écrit |
|---|---|---|
| `derniereLecture` | timestamp | F |
| `reservationsLiees` | array<number> (id Hostaway, ≤ 50) | F |
| `essaisLiaison` | map `{ jour: 'AAAA-MM-JJ', n: number }` | F |

Lecture : propriétaire et admin. Écriture : personne depuis le navigateur. Les séjours eux-mêmes ne sont jamais recopiés dans Firestore : ils se lisent en direct dans Hostaway à chaque ouverture de l'onglet.

**`soutien/{uid}`** (une conversation par membre avec l'équipe)

| Champ | Type | Qui écrit | Borne |
|---|---|---|---|
| `uid` | string | M (création) | = id |
| `nom`, `courriel` | string | M (création) | ≤ 120 / ≤ 200 |
| `dernierMessage` | string | F | ≤ 300 |
| `dernierMessageLe` | timestamp | F | |
| `dernierAuteur` | string | F | `membre` ou `equipe` |
| `luParMembreLe` | timestamp | M | seul champ que le membre met à jour |
| `luParEquipeLe` | timestamp | A | |
| `statut` | string | A | `ouvert`, `resolu` |
| `creeLe` | timestamp | M (création) | `request.time` |

**`soutien/{uid}/messages/{id}`**

| Champ | Type | Qui écrit | Borne |
|---|---|---|---|
| `auteur` | string | M (`membre`), A (`equipe`) | |
| `texte` | string | M, A | 1 à 4000 |
| `creeLe` | timestamp | M, A | `request.time` |

Création seulement, aucune modification ni suppression par le membre.

**`problemesTechniques/{id}`**

| Champ | Type | Qui écrit | Borne |
|---|---|---|---|
| `uid`, `nom`, `courriel` | string | M | uid = auth, ≤ 120, ≤ 200 |
| `texte` | string | M | 1 à 4000 |
| `page` | string | M | ≤ 300 |
| `capture`, `capturePath` | string | M | ≤ 500, chemin sous `problemes/{uid}/` |
| `agent` | string | M | ≤ 300 |
| `ecran` | string | M | ≤ 20 |
| `statut` | string | M (création : `nouveau`), A | `nouveau`, `en_cours`, `resolu` |
| `vexel` | string | F | `transmis`, `echec`, `absent` |
| `cree` | timestamp | M | `request.time` |

**`codesParrain/{CODE}`** : `{ uid, creeLe }`. Lecture par tout membre connecté (le code ne se réclame qu'après la création du compte, et une lecture publique livrerait l'uid de chaque parrain à n'importe qui), création par M avec `uid == auth.uid` et un code de 6 à 10 caractères `[A-Z0-9]`, modification et suppression par A.

**`parrainages/{filleulUid}`** : `{ parrainUid, code, filleulNom, creeLe }` écrits par M à la création (jamais pour soi-même, `filleulNom` ≤ 120, `creeLe == request.time`), puis `valide: bool` et `valideLe` écrits par F. Lecture : le filleul, le parrain (`resource.data.parrainUid == auth.uid`) et A. La réclamation du code retenu en `sessionStorage` se fait dans un effet de l'App au changement d'utilisateur, et non dans `AuthModal` seulement, pour couvrir aussi la porte du Creator Studio (`reseau/auth.ts`) et le retour de redirection Google (`App.tsx:583`).

**`members/{parrainUid}`.`filleuls`** : pas de nouveau champ public. Le compteur vit dans `parrainagesCompte/{parrainUid}` `{ n, majLe }`, écrit par F, lu par le propriétaire et A.

### 3.4 Index

Aucun index composite n'est créé, à une condition : une requête qui filtre sur un champ ne trie jamais sur un autre. `parrainages where parrainUid ==` (le parrain) et `problemesTechniques where uid ==` (le membre, et la fiche admin) se trient donc côté client. Le filtre sur `uid` n'est pas facultatif pour le membre : sans lui, la règle de lecture de `problemesTechniques` refuse la requête entière. Restent des tris sur un seul champ sans filtre (`soutien orderBy dernierMessageLe`, `problemesTechniques orderBy cree` pour l'admin, `soutien/{uid}/messages orderBy creeLe`) et une égalité double sans tri (`parrainages where parrainUid == X and valide == true`, servie par la fusion des index simples). La pastille « fils non lus » de l'admin (`dernierMessageLe > luParEquipeLe`) compare deux champs d'un même document : elle se calcule côté client sur les 100 fils chargés. Le dépôt n'a pas de `firestore.indexes.json` ; s'il en faut un malgré tout, il se crée et se référence dans `firebase.json`.

---

## 4. Fonctions Cloud

Les fonctions appelables sont en 2e génération, région par défaut (`us-central1`), comme `getHostawayAvailability`. Les déclencheurs Firestore et Auth suivent le patron déjà déployé du fichier, en 1re génération (`functions.runWith({ secrets: [...] }).firestore.document(...).onCreate`, comme `onNewMember`, `index.ts:302`) : ce patron lit les secrets par `process.env`, comme `smtpTransport`, et n'a pas la contrainte de région Eventarc des déclencheurs v2, que la base du Salon n'a jamais eu à satisfaire. Chaque secret est déclaré dans le tableau `secrets` **de la fonction qui l'appelle**, même quand la lecture se fait dans un module importé (mémoire `feedback_secret_declare_sur_la_fonction_appelante`). Un secret déclaré qui n'existe pas dans Secret Manager **fait échouer le déploiement** : une fonction ne déclare un secret qu'une fois celui-ci posé.

Réorganisation préalable, sans changement de comportement :

- `functions/src/hostaway.ts` (nouveau) : déménagement de `HOSTAWAY_API_KEY`, `HOSTAWAY_ACCOUNT_ID`, `HOSTAWAY_BASE`, `ALLOWED_LISTINGS`, `getHostawayToken`, `isValidDate` (`index.ts:391-440`) et `addDays` (`index.ts:477`). `HOSTAWAY_BASE` devient `process.env.HOSTAWAY_BASE_TEST ?? 'https://api.hostaway.com/v1'`, lu seulement quand `FUNCTIONS_EMULATOR === 'true'`, pour que les tests de 5.3 puissent pointer vers un serveur local sans qu'une variable d'environnement de production puisse détourner le jeton. `index.ts` les importe. Ajout de `NOMS_CHAMBRES` : `345789 L'Écrivaine / The Writer`, `345790 La Musicienne / The Musician`, `345792 La Cinéaste / The Filmmaker`, `345787 L'Amphithéâtre / The Amphitheatre`, `345791 L'Auberge Complète / The Whole Inn`, `345786 La Ger (Yourte) / The Ger (Yurt)`, `563826 La Méditante / The Meditator`, `559483 La Bergère / The Shepherdess`, `345788 Le Bus / The Bus` (tiré de `constants.ts:39-196`).
- `functions/src/courriel.ts` (nouveau) : déménagement de `smtpTransport`, `notifyAlex` et `line` depuis `index.ts:170-205`, plus `envoyerAuMembre(courriel, sujet, texte)` sur le même transport Zoho.
- Après ce déménagement, redéployer uniquement les fonctions qui les importent et vérifier `getHostawayQuote` sur la page d'accueil (réservation en direct) avant de continuer.

### 4.1 `mesSejours` · `onCall`

- Fichier : `functions/src/espaceMembre.ts`.
- Options : `{ secrets: [HOSTAWAY_API_KEY, HOSTAWAY_ACCOUNT_ID], cors: true, maxInstances: 5, timeoutSeconds: 30 }`.
- Entrée : `{ uidCible?: string }` (seulement pour l'admin).
- Sécurité :
  1. `request.auth` obligatoire, sinon `unauthenticated`.
  2. `request.auth.token.email_verified === true` et `email` présent, sinon `failed-precondition` avec le code `courriel-non-verifie`. Le courriel vient **du jeton**, jamais de l'entrée.
  3. `uidCible` n'est accepté que si le jeton est admin (même liste et même `email_verified` que `isAdmin()` des règles) ; le courriel cible se lit alors par `getAuth().getUser(uidCible)` et doit être vérifié lui aussi.
  4. Limite : si `sejours/{uid}.derniereLecture` date de moins de 20 secondes et que l'appelant n'est pas admin, `resource-exhausted`.
- Travail : lire `GET {HOSTAWAY_BASE}/reservations?departureStartDate=<aujourd'hui − 730 j>&departureEndDate=<aujourd'hui + 540 j>&limit=100` en suivant `afterId` (id de la dernière réservation de la page) jusqu'à 10 pages au plus, sans `sortOrder` pour ne pas mêler un tri à la pagination par curseur. Au début du lot 4, un seul appel de contrôle compare le `count` avec et sans le filtre de dates : s'ils sont égaux, le filtre est ignoré par ce compte et la fenêtre se fait côté serveur sur `departureDate`. Si la dixième page est pleine, la fonction journalise `mesSejours: historique tronqué` plutôt que de se taire. La liste complète se garde dans une variable de module 5 minutes (partagée entre membres, jamais renvoyée telle quelle). Retenir les réservations dont `guestEmail.trim().toLowerCase()` égale le courriel du jeton, plus celles dont l'id est dans `sejours/{uid}.reservationsLiees`. Écarter `ownerStay` et tout `listingMapId` absent de `ALLOWED_LISTINGS`. Écrire `derniereLecture`.
- Sortie :
```ts
{ sejours: Array<{
    id: number; chambreFR: string; chambreEN: string; listingId: number;
    arrivee: string; depart: string; nuits: number; voyageurs: number;
    statut: 'pending'|'confirmed'|'checked_in'|'checked_out'|'cancelled';
    canal: string; total: number | null; devise: string;
    code: string | null; portail: string | null; lie: boolean }>,
  lu: string /* ISO */ }
```
  Aucun autre champ Hostaway ne sort (ni nom, ni téléphone, ni adresse du voyageur). Pour une réservation retenue par liaison (`lie: true`) et non par le courriel, `total` et `portail` sortent à `null` : le portail du voyageur donne accès à la réservation d'une autre personne, et un code de confirmation se partage entre compagnons de voyage.
- Erreurs Hostaway : journaliser le statut, rendre `unavailable` avec le message `hostaway-indisponible`.

### 4.2 `lierSejour` · `onCall`

- Même fichier, mêmes secrets et mêmes gardes 1 et 2.
- Entrée : `{ code: string (4 à 40, [A-Za-z0-9-]), arrivee: 'AAAA-MM-JJ' }`.
- Limite : 5 essais par membre par jour civil (fuseau `America/Toronto`), compteur `sejours/{uid}.essaisLiaison`, puis `resource-exhausted`.
- Travail : lire `GET {HOSTAWAY_BASE}/reservations?arrivalStartDate=<arrivee>&arrivalEndDate=<arrivee>&limit=100`, écarter côté serveur toute réservation dont `arrivalDate` diffère (garde contre un filtre ignoré), trouver la réservation dont `confirmationCode` ou `channelReservationId` ou `reservationId` égale le code (sans égard à la casse). Absente : incrémenter le compteur, rendre `{ lie: false }` (même réponse que pour un code faux, pour ne rien révéler). Trouvée : vérifier qu'elle n'est pas déjà liée à un autre membre (requête `sejours where reservationsLiees array-contains id`, refus `already-exists`), l'ajouter à `reservationsLiees` (50 au plus), rendre `{ lie: true }`.

### 4.3 `mesBillets` · `onCall`

- Options : `{ cors: true, maxInstances: 5 }`, aucun secret.
- Gardes : auth obligatoire ; le courriel vérifié n'est exigé que pour la partie camping.
- Travail (Admin SDK) : `events/ceilidh-mai-2026/showTickets/{uid}`, `events/ceilidh-mai-2026/registrations/{uid}`, `events/ceilidh-mai-2026/contributions where uid == uid`, et `events/camping-fmm-2026/reservations where courriel in [<courriel vérifié tel quel>, <en minuscules>]` (le webhook recopie le courriel saisi dans Stripe sans le normaliser, `index.ts:1007`). Les montants sont stockés en cents (`amountCents`, `montantCents`) et sortent divisés par 100.
- Sortie :
```ts
{ spectacles: Array<{ evenement: 'ceilidh-mai-2026'; type: 'single'|'weekend'; soirs: string[]; code: string; montant: number; le: string }>,
  inscriptions: Array<{ evenement: 'ceilidh-mai-2026'; equipes: string[] /* teams[].teamId, une inscription porte plusieurs équipes */; le: string | null }>,
  contributions: Array<{ evenement: 'ceilidh-mai-2026'; montant: number; le: string }>,
  camping: Array<{ evenement: 'camping-fmm-2026'; montant: number; le: string }> }
```
  La structure est une liste par type pour qu'un prochain événement s'ajoute par une ligne dans la fonction.

### 4.4 `parrainageFilleul` · déclencheur v1 `firestore.document('parrainages/{filleulUid}').onCreate`

- Fichier : `functions/src/parrainage.ts`. Aucun secret. Le port de Krystine est en v2 (`onDocumentCreated`) : seule l'enveloppe change, le corps reste le même.
- Porté de `K/functions/src/parrainage.ts:44-83` en gardant le mécanisme et en retirant ce qui est propre à Krystine (niskas, formations, cadeaux, accès à vie, module gamification) :
  1. Refuser si `parrainUid` manque ou égale le filleul.
  2. Refuser (et supprimer le document) si le compte Auth du filleul a plus de 48 heures.
  3. Poser `valide: true, valideLe` sur le document.
  4. Compter `parrainages where parrainUid == X and valide == true` et écrire `parrainagesCompte/{X}`.
  5. Écrire une notification dans `notifications/{X}/items` de type `parrainage` (texte : « {nom} a rejoint le Salon grâce à votre invitation. » / « {nom} joined the Salon through your invitation. »). La notification porte `deUid: filleulUid`, `lu: false` et `cree`, la forme que `reseau/notifications.ts` sait afficher. La règle des notifications ne change pas (5.1 d) : la lecture n'y filtre pas le type, et l'écriture vient de l'Admin SDK. Seul le type TypeScript `TypeNotification` (`notifications.ts:21`) s'élargit à `'parrainage'`.
- Aucune récompense n'est posée : le Salon n'en a défini aucune, et en inventer serait une promesse que personne n'a faite. Le compteur est prêt pour le jour où Alex en fixera une (voir la question groupée à la fin).

### 4.5 `onMessageSoutien` · déclencheur v1 `firestore.document('soutien/{uid}/messages/{id}').onCreate`

- Fichier : `functions/src/soutien.ts`.
- Options : `functions.runWith(RUNTIME_WITH_SMTP)` (exporté de `courriel.ts`).
- Travail : écrire `soutien/{uid}` en `set(..., { merge: true })` et jamais en `update`, parce que la règle laisse le membre créer un message sans que le document parent existe (`dernierMessage` tronqué à 300, `dernierMessageLe`, `dernierAuteur`, `statut: 'ouvert'` si l'auteur est le membre). Si l'auteur est `membre` : `notifyAlex('Espace membre : message de {nom}', ...)` avec le lien `https://www.lesalondesinconnus.com/admin` et la section Aide. Si l'auteur est `equipe` et que `members/{uid}/prive/preferences.courrielReponseEquipe` n'est pas `false` : `envoyerAuMembre` au courriel Auth vérifié du membre (texte en 6.12). Ne jamais lever d'erreur : un courriel raté ne casse pas le message.

### 4.6 `onProblemeTechnique` · déclencheur v1 `firestore.document('problemesTechniques/{id}').onCreate`

- Même fichier. Options : `functions.runWith({ secrets: ['ZOHO_USER', 'ZOHO_PASS', 'VEXEL_CLE_SALON'] })` si le secret existe, sinon `RUNTIME_WITH_SMTP` seul ; la clé se lit par `process.env.VEXEL_CLE_SALON`.
- Travail : `notifyAlex('Problème technique signalé par {nom}', ...)`, puis `POST https://us-central1-vexel-integrations.cloudfunctions.net/recevoirDemande` avec `{ client: 'salon', cle: VEXEL_CLE_SALON.value(), type: 'bug', auteurNom, auteurCourriel, texte, page: 'https://www.lesalondesinconnus.com' + page, capture, agent, ecran }` (même forme que `K/src/components/client/ProblemeTechnique.tsx:170-185`, mais depuis le serveur pour que la clé ne soit jamais dans le paquet du navigateur). Écrire `vexel: 'transmis' | 'echec'`, ou `absent` quand `process.env.VEXEL_CLE_SALON` est vide.
- Prérequis à vérifier par lecture seule dans `vexel-integrations` : l'existence du document `clients/salon` et de son champ `cle` (`vexel-site/functions/src/recevoirDemande.ts:142-146`). Absent, le secret ne se pose pas et la fonction se déploie **sans le déclarer** (un secret déclaré mais inexistant fait échouer `firebase deploy`) : elle écrit alors `absent`, et Alex reçoit l'avertissement par courriel comme pour tout signalement. Le jour où `clients/salon` existe, `firebase functions:secrets:set VEXEL_CLE_SALON`, ajout du nom dans `secrets`, redéploiement de cette seule fonction.

### 4.7 `onMessageEntreMembres` · déclencheur v1 `firestore.document('conversations/{convId}/messages/{id}').onCreate`

- Même fichier `soutien.ts`. Options : `functions.runWith(RUNTIME_WITH_SMTP)`. L'auteur est le champ `uid` du message (la règle `firestore.rules:282` l'exige égal à l'appelant).
- Travail : pour chaque membre de la conversation autre que l'auteur, si `prive/preferences.courrielNouveauMessage === true` et qu'aucun courriel ne lui a été envoyé pour cette conversation dans les 60 dernières minutes (l'horodatage vit dans `members/{uid}/prive/envois`, map `{ [convId]: timestamp }` écrite par F et fermée au navigateur par la règle par défaut ; il n'est surtout pas posé sur `conversations/{convId}`, que tout membre de la conversation peut réécrire en entier selon `firestore.rules:272`), envoyer le courriel 6.12. Le texte du message n'est jamais recopié dans le courriel.

### 4.8 Fonctions existantes touchées

- `onNewMember` (`index.ts:302`) : inchangée, elle recommencera à se déclencher dès que la création de fiche passera les règles.
- `createShowTicketPayment` : inchangée. Le compteur public du Ceilidh vient d'un nouveau déclencheur (4.11), pas d'une ligne ajoutée dans cette fonction, qui n'a pas de transaction et ne voit pas les suppressions faites depuis l'admin.
- Aucune autre fonction existante ne change de comportement.

### 4.10 `nettoyerCompteSupprime` · déclencheur v1 `auth.user().onDelete`

- Fichier : `functions/src/espaceMembre.ts`. Aucun secret.
- Pourquoi : `deleteMemberData` (`AuthModal.tsx:111`) n'efface que `members/{uid}` puis le compte Auth. Le téléphone de `prive/coordonnees`, le fil `soutien/{uid}`, `sejours/{uid}`, les codes et parrainages et les images Storage resteraient, alors que le texte 6.10 promet l'effacement.
- Travail : `recursiveDelete` de `members/{uid}` (sous-collections comprises), suppression de `soutien/{uid}` et ses messages, `sejours/{uid}`, `parrainages/{uid}`, `parrainagesCompte/{uid}`, des `codesParrain where uid == uid`, des `problemesTechniques where uid == uid`, `notifications/{uid}/items`, et des préfixes Storage `members/{uid}/profil/` et `problemes/{uid}/`. Les messages envoyés à d'autres membres restent, comme le dit le texte.
- Côté navigateur, `deleteUser` rend `auth/requires-recent-login` quand la session est vieille : l'onglet Préférences rouvre alors la connexion d'`AuthModal` puis relance la suppression (texte en 6.10).

### 4.11 `compterPlacesCeilidh` · déclencheur v1 `firestore.document('events/ceilidh-mai-2026/showTickets/{id}').onWrite`

- Fichier : `functions/src/espaceMembre.ts`. Aucun secret.
- Travail : recompter la collection (20 documents au plus) et écrire `config/ceilidhPlaces { vendus, majLe }`. Un recomptage plutôt qu'un incrément, pour que les suppressions de l'admin (`AdminCRM.tsx:987`) se reflètent. `config/{docId}` est déjà en lecture publique (`firestore.rules:65`), le patron de `config` du camping.

### 4.9 Déploiement par lot

`firebase deploy --only functions:mesSejours,functions:lierSejour` et ainsi de suite, jamais `--only functions` en entier. Secrets à poser avant : `VEXEL_CLE_SALON` (lot 6, seulement si `clients/salon` existe, voir 4.6). `HOSTAWAY_*` et `ZOHO_*` existent déjà.

---

## 5. Règles Firestore et Storage à fusionner

Principe : chaque bloc s'ajoute ou élargit l'existant, et rien n'est remplacé. `isAdmin()` (avec `email_verified`), `isCuratedArtist()`, `isSignedIn()`, `isSelf()`, `lienValide()` et `membreValide()` restent les seules définitions. Chaque bloc s'insère à l'endroit indiqué, avec son commentaire en français.

### 5.1 Firestore

**a. Élargir `membreValide` (lignes 44-60)** pour accepter les champs de la porte d'`AuthModal`, avec leurs bornes :

```
function membreValide(d) {
  return d.keys().hasOnly([
           'displayName', 'email', 'photoURL', 'banniereURL', 'bio',
           'discipline', 'ville', 'liens', 'provider', 'joinedAt', 'lastSeenAt',
           'uid', 'membershipType', 'createdAt', 'consentDate', 'consentVersion'
         ])
    && (!('uid' in d) || d.uid == request.auth.uid)
    && (!('membershipType' in d) || d.membershipType in ['voyageur', 'artiste', 'membre-communaute', 'resident', 'woofer'])
    && (!('consentDate' in d) || (d.consentDate is string && d.consentDate.size() <= 40))
    && (!('consentVersion' in d) || (d.consentVersion is string && d.consentVersion.size() <= 10))
    && (!('displayName' in d) || (d.displayName is string && d.displayName.size() <= 120))
    // Le courriel de la fiche sert désormais à reconnaître l'admin sur la fiche
    // publique : il ne peut valoir que celui du jeton, ou rien.
    && (!('email' in d) || d.email == '' || d.email == request.auth.token.email)
    && ...les bornes existantes de bio, discipline, ville et liens, inchangées...;
}
```

Et dans `match /members/{userId}` (ligne 89), séparer `create` et `update` pour que `createdAt` ne bouge plus après la création :

```
allow create: if isAdmin()
              || (isSelf(userId) && membreValide(request.resource.data)
                  && (!('createdAt' in request.resource.data)
                      || request.resource.data.createdAt == request.time));
allow update: if isAdmin()
              || (isSelf(userId) && membreValide(request.resource.data)
                  && request.resource.data.get('createdAt', null) == resource.data.get('createdAt', null));
allow delete: if isAdmin() || isSelf(userId);
```

`get('createdAt', null)` des deux côtés ferme aussi le cas d'une fiche sans `createdAt` (créée par le Creator Studio) à laquelle un membre ajouterait une date choisie pour remonter en tête de la liste admin.

Correction d'un fait : la suppression par soi-même **ne fonctionne pas aujourd'hui**. Sous `allow write`, une suppression évalue `membreValide(request.resource.data)` alors que `request.resource` est nul, ce qui refuse ; `deleteMemberData` (`AuthModal.tsx:113`) échoue donc en silence avant `deleteUser`. Le `allow delete` explicite ci-dessus la répare, et le cas R-09 b la garde.

**b. Sous-collection privée, à l'intérieur de `match /members/{userId}`** :

```
// Coordonnées et préférences : jamais sur le document public, qui est
// lisible par tout membre connecté.
match /prive/coordonnees {
  allow read:  if isSelf(userId) || isAdmin();
  allow write: if isAdmin()
               || (isSelf(userId)
                   && request.resource.data.keys().hasOnly(['telephone', 'majLe'])
                   && (!('telephone' in request.resource.data)
                       || (request.resource.data.telephone is string
                           && request.resource.data.telephone.size() <= 40
                           && request.resource.data.telephone.matches('^[0-9 +().-]*$'))));
}
match /prive/preferences {
  allow read:  if isSelf(userId) || isAdmin();
  allow write: if isAdmin()
               || (isSelf(userId)
                   && request.resource.data.keys().hasOnly(['langue', 'banniere', 'courrielReponseEquipe', 'courrielNouveauMessage', 'majLe'])
                   && (!('langue' in request.resource.data) || request.resource.data.langue in ['FR', 'EN'])
                   && (!('banniere' in request.resource.data) || request.resource.data.banniere in ['maison', 'yourte', 'drone', 'bus', 'jardins', 'hemerocales', 'photo'])
                   && (!('courrielReponseEquipe' in request.resource.data) || request.resource.data.courrielReponseEquipe is bool)
                   && (!('courrielNouveauMessage' in request.resource.data) || request.resource.data.courrielNouveauMessage is bool));
}
```

**c. Nouvelles collections, à ajouter après le bloc `abonnementsPro` (ligne 670)** :

```
// ── Espace membre · séjours (état serveur, jamais écrit par le navigateur)
match /sejours/{uid} {
  allow read:  if isSelf(uid) || isAdmin();
  allow write: if false;
}

// ── Espace membre · la conversation avec l'équipe
match /soutien/{uid} {
  allow read: if isSelf(uid) || isAdmin();
  allow create: if isSelf(uid)
                && request.resource.data.keys().hasOnly(['uid', 'nom', 'courriel', 'creeLe'])
                && request.resource.data.uid == uid
                && request.resource.data.nom is string && request.resource.data.nom.size() <= 120
                && request.resource.data.courriel is string && request.resource.data.courriel.size() <= 200;
  allow update: if isAdmin()
                || (isSelf(uid)
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['luParMembreLe']));
  allow delete: if isAdmin();

  match /messages/{mid} {
    allow read: if isSelf(uid) || isAdmin();
    allow create: if request.resource.data.keys().hasOnly(['auteur', 'texte', 'creeLe'])
                  && request.resource.data.texte is string
                  && request.resource.data.texte.size() > 0
                  && request.resource.data.texte.size() <= 4000
                  && request.resource.data.creeLe == request.time
                  && ((isSelf(uid) && request.resource.data.auteur == 'membre')
                      || (isAdmin() && request.resource.data.auteur == 'equipe'));
    allow update, delete: if isAdmin();
  }
}

// ── Espace membre · signalement de problème technique
match /problemesTechniques/{id} {
  allow read: if isAdmin() || (isSignedIn() && resource.data.uid == request.auth.uid);
  allow create: if isSignedIn()
                && request.resource.data.uid == request.auth.uid
                && request.resource.data.keys().hasOnly(['uid', 'nom', 'courriel', 'texte', 'page', 'capture', 'capturePath', 'agent', 'ecran', 'statut', 'cree'])
                && request.resource.data.texte is string
                && request.resource.data.texte.size() > 0
                && request.resource.data.texte.size() <= 4000
                && request.resource.data.statut == 'nouveau'
                && (!('capturePath' in request.resource.data)
                    || request.resource.data.capturePath.matches('^(problemes/' + request.auth.uid + '/.*)?$'));
  allow update, delete: if isAdmin();
}

// ── Espace membre · parrainage (mécanisme porté, sans récompense)
match /codesParrain/{code} {
  allow read: if isSignedIn();
  allow create: if isSignedIn()
                && code.matches('^[A-Z0-9]{6,10}$')
                && request.resource.data.keys().hasOnly(['uid', 'creeLe'])
                && request.resource.data.uid == request.auth.uid
                && request.resource.data.creeLe == request.time;
  allow update, delete: if isAdmin();
}
match /parrainages/{filleulUid} {
  allow read: if isSelf(filleulUid) || isAdmin()
              || (isSignedIn() && resource.data.parrainUid == request.auth.uid);
  allow create: if isSelf(filleulUid)
                && request.resource.data.keys().hasOnly(['parrainUid', 'code', 'filleulNom', 'creeLe'])
                && request.resource.data.parrainUid is string
                && request.resource.data.parrainUid != request.auth.uid
                && request.resource.data.filleulNom is string
                && request.resource.data.filleulNom.size() <= 120
                && request.resource.data.creeLe == request.time
                && exists(/databases/$(database)/documents/codesParrain/$(request.resource.data.code))
                && get(/databases/$(database)/documents/codesParrain/$(request.resource.data.code)).data.uid == request.resource.data.parrainUid;
  allow update, delete: if isAdmin();
}
match /parrainagesCompte/{uid} {
  allow read: if isSelf(uid) || isAdmin();
  allow write: if false;
}
```

**d. Cloche (ligne 325)** : la liste des types créés par un client reste `['commentaire', 'vote', 'badge']` (la notification `parrainage` est écrite par la fonction). Aucun changement de règle ; seul `reseau/notifications.ts` élargit son type TypeScript à `'parrainage'` pour l'afficher.

**e. Fermer la fuite des courriels du Ceilidh (lignes 373 et 468)** : lot 3. Les deux collections ne se traitent pas de la même façon, parce qu'elles ne servent pas la même chose.

- `showTickets` : lecture réduite au propriétaire et à l'admin. L'id du document est l'uid de l'acheteur (`index.ts:141`), ce qui suffit à la lecture de son propre billet (`ProfilePage.tsx:80`) et à l'admin (`AdminCRM.tsx:597`). Le compteur public de `CeilidhPage.tsx:3333` lit `config/ceilidhPlaces`, recompté par 4.11.
```
match /showTickets/{ticketId} {
  allow read:   if isSelf(ticketId) || isAdmin();
  allow delete: if isAdmin();
  allow write:  if false;
}
```
- `registrations` : la lecture publique **reste**. `CeilidhPage.tsx:218` et `CeilidhShared.tsx:2585` s'y abonnent sans connexion pour les équipes, la ligne du temps et le décompte des chambres ; la passer à `isSignedIn()` viderait ces sections pour tout visiteur, et l'`onSnapshot` refusé ne s'en remettrait pas. C'est le champ `email` qui disparaît : les quatre écritures (`CeilidhPage.tsx:1776,2710`, `CeilidhShared.tsx:1725,1895`) cessent de le poser, la règle d'écriture le refuse en séparant `allow create, update: if (request.auth.uid == regId || isAdmin()) && !('email' in request.resource.data)` de `allow delete: if request.auth.uid == regId || isAdmin()` (une suppression n'a pas de `request.resource`), un script `scripts/purger-courriels-ceilidh.mjs` (sur `firestore-rest.mjs`, `--essai` puis `--appliquer`) retire le champ des inscriptions existantes, et la liste de courriels de `AdminCRM.tsx:993` prend le courriel dans la fiche `members/{uid}` que l'admin charge déjà.
- Même classe de fuite, hors de cette vague : `carpools.driverEmail` et `needs.createdByEmail` (lecture publique) servent à `isAdminEmail` dans `CeilidhShared.tsx:440,1246`. Nommé dans les risques, pas corrigé ici.

### 5.2 Storage

À ajouter avant le bloc « Default-deny » (ligne 125) :

```
// ── Espace membre · capture jointe à un signalement technique
match /problemes/{userId}/{fichier} {
  allow read:  if (request.auth != null && request.auth.uid == userId) || isAdmin();
  allow write: if request.auth != null
               && request.auth.uid == userId
               && isImage()
               && under10MB();
  allow delete: if isAdmin();
}
```

L'avatar et la bannière passent par `members/{userId}/profil/**`, déjà couvert (lignes 73-80). Le chemin `members/{uid}/avatar` de l'ancienne `ProfilePage` n'est pas ouvert : l'ancienne page n'est plus montée.

### 5.3 Cas de test émulateur

Nouveau fichier `tests/rules.espace.test.mjs`, même harnais que `tests/rules.reseau.test.mjs` (jetons simulés par `mockUserToken`, aucun paquet ajouté), lancé par :

```
PATH="$(brew --prefix openjdk)/bin:$PATH" npx firebase emulators:exec \
  --only firestore,storage --project demo-espace \
  "node tests/rules.reseau.test.mjs && node tests/rules.espace.test.mjs && node tests/storage.espace.test.mjs"
```

Identités : `A` (membre vérifié), `B` (autre membre vérifié), `ADMIN` (`alex@lesalondesinconnus.com`, `email_verified: true`), `FAUX_ADMIN` (même courriel, `email_verified: false`), `ANON`.

| # | Cas | Attendu |
|---|---|---|
| R-01 | A crée `members/A` avec la forme exacte d'`AuthModal` (uid, email, displayName, membershipType `voyageur`, photoURL, createdAt serverTimestamp, consentDate, consentVersion) | OK |
| R-02 | A crée `members/A` avec `isAdmin: true` | refus |
| R-03 | A crée `members/A` avec `phone` | refus |
| R-04 | A crée `members/A` avec `membershipType: 'admin'` | refus |
| R-05 | A met à jour `members/A` en changeant `createdAt` | refus |
| R-06 | A met à jour `members/A` avec la forme de `reseau/auth.ensureMember` (displayName, email, photoURL, provider, lastSeenAt) | OK |
| R-07 | A écrit `members/B` | refus |
| R-08 | Les cas existants de `rules.reseau.test.mjs` | tous verts, sans modification |
| R-09 | A crée `members/A` avec `email: 'alex@lesalondesinconnus.com'` (jeton `a@example.com`) | refus |
| R-09 b | A supprime `members/A` | OK (refusé aujourd'hui) |
| R-09 c | A crée `members/A` avec `createdAt` fixé au 1er janvier 2020 | refus |
| R-09 d | A met à jour une fiche sans `createdAt` en y ajoutant `createdAt` | refus |
| R-10 | A écrit `members/A/prive/coordonnees` `{ telephone: '819 555-0101' }` | OK |
| R-11 | B lit `members/A/prive/coordonnees` | refus |
| R-12 | ADMIN lit `members/A/prive/coordonnees` | OK |
| R-13 | FAUX_ADMIN lit `members/A/prive/coordonnees` | refus |
| R-14 | A écrit `prive/preferences` `{ langue: 'DE' }` | refus |
| R-15 | A écrit `prive/preferences` avec un champ `role` | refus |
| R-20 | A écrit `sejours/A` | refus |
| R-21 | A lit `sejours/A` ; B lit `sejours/A` | OK ; refus |
| R-30 | A crée `soutien/A` puis un message `auteur: 'membre'` | OK |
| R-31 | A crée un message `auteur: 'equipe'` dans `soutien/A` | refus |
| R-32 | B lit `soutien/A/messages` | refus |
| R-33 | ADMIN crée un message `auteur: 'equipe'` dans `soutien/A` | OK |
| R-34 | FAUX_ADMIN crée un message `auteur: 'equipe'` | refus |
| R-35 | A met `statut: 'resolu'` sur `soutien/A` | refus |
| R-36 | A met `luParMembreLe` sur `soutien/A` | OK |
| R-37 | A crée un message de 4001 caractères | refus |
| R-40 | A crée `problemesTechniques` avec `uid: A`, `statut: 'nouveau'` | OK |
| R-41 | A crée avec `uid: B` | refus |
| R-42 | A crée avec `statut: 'resolu'` | refus |
| R-43 | A crée avec `capturePath: 'problemes/B/x.png'` | refus |
| R-44 | B lit le signalement de A | refus |
| R-50 | A crée `codesParrain/ABC123` `{ uid: A }` ; B crée `codesParrain/XYZ789` `{ uid: A }` | OK ; refus |
| R-51 | B crée `parrainages/B` `{ parrainUid: A, code: 'ABC123' }` | OK |
| R-52 | A crée `parrainages/A` `{ parrainUid: A }` | refus |
| R-53 | B crée `parrainages/B` avec un code qui appartient à un autre que `parrainUid` | refus |
| R-54 | A lit `parrainages/B` (A est le parrain) ; un tiers lit `parrainages/B` | OK ; refus |
| R-55 | B met `valide: true` sur `parrainages/B` | refus |
| R-56 | A écrit `parrainagesCompte/A` | refus |
| R-60 | ANON lit `events/ceilidh-mai-2026/showTickets/X` (après le lot 3) | refus |
| R-61 | ANON lit `config/ceilidhPlaces` | OK |
| R-62 | ANON lit la collection `events/ceilidh-mai-2026/registrations` | OK (la page publique en dépend) |
| R-63 | A écrit `registrations/A` avec `email` ; sans `email` | refus ; OK |
| R-64 | A lit `showTickets/A` ; B lit `showTickets/A` | OK ; refus |
| R-65 | B lit `codesParrain/ABC123` connecté ; ANON le lit | OK ; refus |
| S-01 | A dépose `problemes/A/1.png` image 1 Mo | OK |
| S-02 | A dépose `problemes/B/1.png` | refus |
| S-03 | A dépose `problemes/A/1.pdf` | refus |
| S-04 | B lit `problemes/A/1.png` ; ADMIN le lit | refus ; OK |

Les tests des fonctions (`mesSejours`, `lierSejour`, `parrainageFilleul`) se font sur l'émulateur Functions avec une variable `HOSTAWAY_BASE_TEST` pointant vers un petit serveur local qui rend un jeu de réservations fictif (`tests/fixtures/hostaway-reservations.json` : un courriel qui correspond, un courriel en majuscules, une réservation `ownerStay`, une annulée, une sur une annonce hors liste). Cas attendus : filtre exact, casse ignorée, `ownerStay` et annonce inconnue exclues, réservation liée rendue avec `total` et `portail` à `null`, arrivée différente écartée même si le serveur factice ignore le filtre de dates, jeton non vérifié refusé, `uidCible` refusé à un non-admin, cinquième essai de liaison accepté et sixième refusé, liaison déjà prise refusée, filleul de plus de 48 h effacé.

---

## 6. Textes intégraux

Dans les tableaux, « nuit / nuits » veut dire singulier à 1 et pluriel au-delà, calculé dans le code. Tous les textes sont tirés de faits déjà écrits dans le code (`CentreArtsCommunauteSection.tsx`, `SiteHeader.tsx:117-118`, `ProfilePage.tsx:706-742`, `CommunityPage.tsx`, `AuthModal.tsx:65-71`) ou décrivent ce que la page fait réellement. Aucun prix, aucune récompense, aucune promesse de délai. Vouvoiement, « nous », aucun tiret cadratin, aucune italique. Les titres de carte tiennent en deux lignes à 390 px avec la taille de 2.1 (à vérifier sur capture, jamais dans le code).

### 6.1 Porte (non connecté)

| Clé | FR | EN |
|---|---|---|
| surtitre | Espace membre | Members' space |
| titre | Votre espace au Salon | Your space at the Salon |
| texte | Vos réservations et vos billets vous attendent ici, avec les gens rencontrés au Salon et une ligne directe vers l'équipe quand vous avez besoin de nous. | Your bookings and tickets are waiting for you here, together with the people you met at the Salon and a direct line to the team whenever you need us. |
| bouton | Se connecter | Sign in |
| sous-bouton | Le compte se crée en une minute, au même endroit, avec Google ou avec votre courriel. | Your account takes a minute to create, right here, with Google or with your email. |

### 6.2 Coquille

| Clé | FR | EN |
|---|---|---|
| bannière, sans photo perso | Bienvenue chez vous | Welcome home |
| avatar, survol | Changer | Change |
| avatar, aria | Changer ma photo | Change my photo |
| bouton bannière | Changer la bannière | Change the banner |
| panneau bannière, titre | Choisir une bannière | Choose a banner |
| panneau bannière, texte | Ces photos ont toutes été prises au Salon. Vous pouvez aussi mettre la vôtre. | Every one of these photos was taken at the Salon. You can also use your own. |
| panneau bannière, bouton photo | Mettre ma photo | Use my photo |
| espace admin | Espace admin | Admin space |
| déconnexion | Déconnexion | Sign out |
| rangée d'onglets, aria | Sections de votre espace | Sections of your space |

### 6.3 Profil

| Clé | FR | EN |
|---|---|---|
| surtitre | Profil | Profile |
| titre | Ce que les autres voient de vous | What others see of you |
| texte | Votre nom, votre photo, votre bio et vos liens apparaissent sur votre fiche de membre, que seuls les membres connectés peuvent lire. | Your name, photo, bio and links appear on your member page, which only signed-in members can read. |
| (le formulaire `MonProfilForm` garde ses libellés actuels) | | |
| carte privée, surtitre | Coordonnées privées | Private details |
| carte privée, texte | Votre numéro de téléphone reste entre vous et l'équipe du Salon, et aucun autre membre ne le voit. | Your phone number stays between you and the Salon team, and no other member can see it. |
| champ | Téléphone | Phone |
| bouton | Enregistrer | Save |
| confirmation | C'est enregistré. | Saved. |
| erreur | L'enregistrement n'a pas passé. Réessayez dans un instant. | That didn't save. Try again in a moment. |
| type de membre, libellé | Type d'adhésion | Membership type |
| (valeurs : libellés existants de `AuthModal.tsx:65-71`) | | |
| badges, surtitre | Vos badges | Your badges |
| badges, vide | Vos badges apparaîtront ici à mesure que l'équipe vous les décernera. | Your badges will appear here as the team awards them. |

### 6.4 Vos séjours

| Clé | FR | EN |
|---|---|---|
| surtitre | Vos séjours | Your stays |
| titre | Vos nuits chez nous | Your nights with us |
| texte | Nous retrouvons vos réservations grâce au courriel de votre compte, {courriel}. Une réservation faite par Airbnb ou Booking porte souvent un autre courriel : vous pouvez alors la rattacher avec son code de confirmation. | We find your bookings through your account email, {email}. A booking made through Airbnb or Booking often carries a different email, and you can then attach it with its confirmation code. |
| chargement | Nous consultons le registre des réservations… | Checking the booking register… |
| section à venir | À venir | Upcoming |
| section passés | Déjà vécus | Past stays |
| carte, dates | Du {arrivee} au {depart} · {nuits} nuit / nuits | {arrival} to {departure} · {nights} night / nights |
| carte, voyageurs | {n} voyageur / voyageurs | {n} guest / guests |
| carte, canal | Réservé par {canal} | Booked through {channel} |
| carte, total | Total : {montant} | Total: {amount} |
| carte, code | Code : {code} | Code: {code} |
| statut confirmed | Confirmé | Confirmed |
| statut pending | En attente | Pending |
| statut checked_in | Sur place | Checked in |
| statut checked_out | Terminé | Completed |
| statut cancelled | Annulé | Cancelled |
| bouton portail | Ouvrir le portail du voyageur | Open the guest portal |
| bouton réserver | Réserver un autre séjour | Book another stay |
| vide | Nous ne trouvons encore aucun séjour à votre courriel. Si vous avez réservé ailleurs, rattachez votre réservation juste en dessous. | We haven't found a stay under your email yet. If you booked elsewhere, attach your booking just below. |
| courriel non vérifié | Votre courriel doit être confirmé avant que nous puissions chercher vos séjours. Nous venons de vous renvoyer le lien de confirmation. | Your email needs to be confirmed before we can look up your stays. We have just sent you the confirmation link again. |
| erreur | Le registre des réservations ne répond pas pour l'instant. Revenez dans quelques minutes. | The booking register isn't answering right now. Come back in a few minutes. |
| lier, surtitre | Rattacher une réservation | Attach a booking |
| lier, champ code | Code de confirmation | Confirmation code |
| lier, champ date | Date d'arrivée | Arrival date |
| lier, bouton | Rattacher | Attach |
| lier, succès | Votre séjour est rattaché à votre compte. | Your stay is now attached to your account. |
| lier, échec | Nous ne trouvons aucune réservation avec ce code à cette date. Vérifiez les deux et réessayez. | We can't find a booking with that code on that date. Check both and try again. |
| lier, limite | Vous avez fait plusieurs essais aujourd'hui. Écrivez-nous dans l'onglet Aide et nous le rattacherons pour vous. | You've made several attempts today. Write to us in the Help tab and we'll attach it for you. |
| lier, déjà pris | Cette réservation est déjà rattachée à un autre compte. Écrivez-nous dans l'onglet Aide. | This booking is already attached to another account. Write to us in the Help tab. |
| coupon | (textes actuels de `ProfilePage.tsx:706-742`, conservés tels quels) | |
| dé | (textes actuels de `ProfilePage.tsx:848-998`, conservés, italique retiré) | |

Le bouton « Réserver un autre séjour » mène à l'accueil sur l'ancre de réservation existante.

### 6.5 Vos billets

| Clé | FR | EN |
|---|---|---|
| surtitre | Vos billets | Your tickets |
| titre | Spectacles et soirées | Shows and evenings |
| texte | Vos billets de spectacle, vos inscriptions et vos contributions aux événements du Salon se retrouvent ici. | Your show tickets, your registrations and your contributions to Salon events all end up here. |
| billet, type single | Billet spectacle | Show ticket |
| billet, type weekend | Passe fin de semaine | Weekend pass |
| billet, événement ceilidh | Grand Ceilidh de Mai 2026 | Grand Ceilidh, May 2026 |
| billet, soirs | Soirs : {soirs} | Nights: {nights} |
| billet, code | Code d'entrée : {code} | Entry code: {code} |
| inscription | Inscrit au Ceilidh · équipe {equipe} | Registered for the Ceilidh · team {team} |
| contribution | Contribution de {montant} au Ceilidh | {amount} contribution to the Ceilidh |
| camping | Emplacement de camping · Festival médiéval 2026 | Campsite · Medieval Festival 2026 |
| vide | Aucun billet pour l'instant. Les prochains événements s'annoncent sur la page Événements. | No tickets yet. Upcoming events are announced on the Events page. |
| bouton vide | Voir les événements | See events |
| Mon Ceilidh | (textes actuels de `MyCeilidhPanel`, conservés) | |

### 6.6 Communauté

| Clé | FR | EN |
|---|---|---|
| surtitre | Communauté | Community |
| titre | Vos gens au Salon | Your people at the Salon |
| sous-onglet amis | Amis | Friends |
| sous-onglet messages | Messages | Messages |
| sous-onglet notifications | Notifications | Notifications |
| amis (libellés actuels de `ProfilSocial`, conservés dans `ListeAmis`) | | |
| messages, retour mobile | Retour aux conversations | Back to conversations |
| notifications, vide | Rien de neuf pour l'instant. | Nothing new for now. |
| notifications, tout lire | Tout marquer comme lu | Mark all as read |
| notification parrainage | {nom} a rejoint le Salon grâce à votre invitation. | {name} joined the Salon through your invitation. |
| lien mur | Voir le mur du studio | See the studio wall |

### 6.7 Communauté artistique

| Clé | FR | EN |
|---|---|---|
| surtitre | Centre d'arts et communauté | Arts centre & community |
| titre (sans profil) | Devenir membre de la communauté artistique | Join the artistic community |
| texte | Au-delà des chambres, la Maison Favier abrite un centre d'artistes où se croisent des artistes en résidence, des musiciens et des entrepreneurs. Les artistes y trouvent le Creator Studio, un espace de travail pour bâtir leur profil et publier leurs écrits. | Beyond the rooms, Maison Favier houses an artists' centre where artists in residence cross paths with musicians and entrepreneurs. Artists find the Creator Studio there, a workspace to build their profile and publish their writing. |
| bouton (sans profil) | Entrer au Creator Studio | Enter the Creator Studio |
| lien secondaire | Découvrir le centre d'arts | Discover the arts centre |
| titre (avec profil) | Votre atelier au Creator Studio | Your workshop in the Creator Studio |
| état, profil commencé | Votre profil d'artiste est commencé | Your artist profile is started |
| état, profil complété | Votre profil d'artiste est complété | Your artist profile is complete |
| état, artiste reconnu (suite) | l'équipe a confirmé votre statut d'artiste du Salon | the team has confirmed your status as a Salon artist |
| état, Profil Pro actif (suite) | votre Profil Pro est en ligne à l'adresse {adresse} | your Pro Profile is live at {address} |
| bouton (avec profil) | Retourner à l'atelier | Back to the workshop |

« Centre d'arts et communauté » et « Entrer au Creator Studio » reprennent mot pour mot `CentreArtsCommunauteSection.tsx:75,113`. Le texte de la carte condense la phrase des lignes 86-95 de ce fichier sans rien y ajouter.

États : aucun document `artistProfile/profile` = sans profil ; document présent et `onboardingV1Completed !== true` = commencé ; `true` = complété ; `flags.isArtist` = reconnu ; `flags.proEnabled || flags.maestroEnabled` avec un `usernames` trouvé = Profil Pro actif. Les états vrais se fondent en **une seule phrase** et ne s'empilent jamais en lignes séparées, parce que trois phrases courtes bâties pareil, l'une sous l'autre, donnent exactement la cadence que la RÈGLE -6 bannit : premier état, puis « , » entre les suivants et « et » devant le dernier, point final. Exemple complet : « Votre profil d'artiste est complété, l'équipe a confirmé votre statut d'artiste du Salon et votre Profil Pro est en ligne à l'adresse lesalondesinconnus.com/{slug}. »

Visuel de la carte : pleine largeur de la colonne, photo `centre-arts/tournage-manoir-{960,1600,2400}.webp` (déjà servie en WebP) à gauche sur desktop (`lg:grid-cols-[1.1fr_1fr]`) et en haut sur mobile, `aspect-[4/3] lg:aspect-auto`, `object-cover`. C'est l'unique aplat d'emphase de l'espace : fond `bg-[#1a1208]`, bordure `border-[#c5a059]/40`.

### 6.8 Vivre ici

| Clé | FR | EN |
|---|---|---|
| surtitre | Vivre ici | Live here |
| titre | Vivre et travailler au Salon | Live and work at the Salon |
| texte | Deux portes existent pour rester plus longtemps : la place de membre résident de la communauté, et le wwoofing pour un séjour bénévole plus court. | Two doors lead to a longer stay: the resident member place in the community, and wwoofing for a shorter volunteer stay. |
| candidature communauté, état | Votre candidature à la communauté : {statut} | Your community application: {status} |
| candidature wwoofing, état | Votre candidature de wwoofer : {statut} | Your wwoofer application: {status} |
| (valeurs de statut : celles déjà affichées par `CommunityMembershipSection` et `WwoofingPage`) | | |
| bouton communauté | Remplir la candidature | Fill in the application |
| lien wwoofing | Plutôt un séjour bénévole plus court ? Voir le wwoofing | Prefer a shorter volunteer stay? See wwoofing |

Le lien wwoofing reprend mot pour mot `CommunityPage.tsx:57`. Le formulaire s'ouvre en montant `CommunityMembershipSection` avec `autoOpen`.

### 6.9 Parrainage

| Clé | FR | EN |
|---|---|---|
| surtitre | Parrainage | Referrals |
| titre | Invitez quelqu'un au Salon | Invite someone to the Salon |
| texte | Chaque personne qui crée son compte avec votre lien apparaît dans votre liste. | Everyone who creates an account through your link shows up in your list. |
| code, libellé | Votre code | Your code |
| lien, libellé | Votre lien d'invitation | Your invitation link |
| bouton copier | Copier le lien | Copy the link |
| copié | Lien copié | Link copied |
| bouton partager (si `navigator.share`) | Partager | Share |
| liste, titre | Vos invités | Your guests |
| liste, vide | Personne encore. Votre lien fonctionne dès maintenant. | No one yet. Your link works right now. |
| liste, ligne | {nom} · depuis le {date} | {name} · since {date} |
| invité par | Votre invitation est venue du code {code}. | Your invitation came through code {code}. |
| affiliation | (textes actuels de `ProfilePage.tsx:744-846`, conservés) | |
| rail, titre | Invitez quelqu'un | Invite someone |
| rail, compteur | {n} invité / invités | {n} guest / guests |

### 6.10 Préférences

| Clé | FR | EN |
|---|---|---|
| surtitre | Préférences | Preferences |
| titre | Comme vous l'aimez | The way you like it |
| langue | Langue de votre espace | Language of your space |
| courriel équipe | Recevoir un courriel quand l'équipe vous répond | Get an email when the team replies |
| courriel messages | Recevoir un courriel quand un membre vous écrit (une fois l'heure au plus) | Get an email when a member writes to you (at most once an hour) |
| confidentialité | Lire la politique de confidentialité | Read the privacy policy |
| suppression, titre | Supprimer mon compte | Delete my account |
| suppression, texte | Votre fiche et votre compte seront effacés. Vos messages déjà envoyés à d'autres membres restent dans leurs conversations. | Your member page and your account will be erased. Messages you already sent to other members remain in their conversations. |
| suppression, confirmation | Tapez SUPPRIMER pour confirmer | Type DELETE to confirm |
| suppression, reconnexion | Pour protéger votre compte, reconnectez-vous une dernière fois avant la suppression. | To protect your account, sign in one last time before deleting it. |
| suppression, bouton | Supprimer définitivement | Delete permanently |

La suppression réemploie `deleteMemberData` d'`AuthModal.tsx:111`, exportée pour l'occasion.

### 6.11 Aide

| Clé | FR | EN |
|---|---|---|
| surtitre | Aide | Help |
| titre | Écrivez-nous | Write to us |
| texte | Ce fil va directement à l'équipe du Salon. Nous répondons ici, et un courriel vous prévient de la réponse tant que l'option reste cochée dans vos préférences. | This thread goes straight to the Salon team. We answer here, and an email lets you know about the reply as long as the option stays ticked in your preferences. |
| champ | Votre message | Your message |
| bouton | Envoyer | Send |
| vide | Aucun message pour l'instant. Posez votre question, peu importe le sujet. | No messages yet. Ask your question, whatever it's about. |
| auteur équipe | L'équipe du Salon | The Salon team |
| auteur membre | Vous | You |
| erreur | Le message n'est pas parti. Réessayez dans un instant. | The message didn't go through. Try again in a moment. |
| signalement, surtitre | Problème technique | Technical problem |
| signalement, titre | Quelque chose ne fonctionne pas | Something isn't working |
| signalement, texte | Décrivez ce que vous faisiez et ce qui s'est passé. Une capture d'écran nous aide beaucoup. | Describe what you were doing and what happened. A screenshot helps us a lot. |
| signalement, joindre | Joindre une capture | Attach a screenshot |
| signalement, trop gros | L'image dépasse 10 Mo. | The image is larger than 10 MB. |
| signalement, pas image | Ce fichier n'est pas une image. | This file isn't an image. |
| signalement, bouton | Envoyer le signalement | Send the report |
| signalement, envoyé | Merci. Le signalement est entre nos mains. | Thank you. The report is in our hands. |
| rail, titre | Une question ? | A question? |
| rail, bouton | Écrire à l'équipe | Write to the team |

### 6.12 Courriels envoyés par les fonctions

Expéditeur : `"Le Salon des Inconnus" <ZOHO_USER>`. Les courriels aux membres partent en HTML avec leur version texte (`html` et `text` dans `sendMail`), jamais en texte brut seul : en-tête au logo servi depuis `https://www.lesalondesinconnus.com/media/logo.png`, un bouton « Ouvrir mon espace » / « Open my space » vers l'adresse complète en `https://`, et cette même adresse recopiée en clair sous le bouton pour les clients de courriel qui bloquent les liens (mémoire `feedback_courriel_jamais_pave_de_texte`). Le gabarit se regarde à 1440 et à 390 px, puis images bloquées, avant le premier envoi d'essai. Les avertissements à Alex (`notifyAlex`) restent en texte comme les autres du fichier.

`onMessageSoutien`, réponse de l'équipe :
- Sujet FR : « L'équipe du Salon vous a répondu » / EN : « The Salon team has replied »
- Corps FR : « Bonjour {prénom}, l'équipe du Salon des Inconnus a répondu à votre message. Vous pouvez lire la réponse et poursuivre la conversation dans votre espace : https://www.lesalondesinconnus.com/compte?onglet=aide »
- Corps EN : « Hello {firstName}, the Salon des Inconnus team has replied to your message. You can read the answer and continue the conversation in your space: https://www.lesalondesinconnus.com/compte?onglet=aide »

`onMessageEntreMembres` :
- Sujet FR : « {nom} vous a écrit au Salon » / EN : « {name} wrote to you at the Salon »
- Corps FR : « Bonjour {prénom}, {nom} vous a envoyé un message. Il vous attend dans votre espace : https://www.lesalondesinconnus.com/compte?onglet=communaute&sous=messages »
- Corps EN : « Hello {firstName}, {name} sent you a message. It's waiting in your space: https://www.lesalondesinconnus.com/compte?onglet=communaute&sous=messages »

La langue suit `prive/preferences.langue`, FR par défaut. Pied : « Pour ne plus recevoir ces courriels, décochez l'option dans vos préférences. » / « To stop these emails, untick the option in your preferences. »

Avertissements vers Alex (`notifyAlex`) : en français seulement, forme des autres avertissements du fichier (`line('Nom', …)`, lien vers l'admin).

Tous les textes de 6.1 à 6.12 passent `python3 ~/.claude/skills/voix-alex/scripts/verifier.py` avant le commit du lot qui les pose (extraire les chaînes dans un fichier temporaire du scratchpad).

---

## 7. Admin : la fiche membre

`components/admin/FicheMembre.tsx`, ouverte par un clic sur une ligne de l'onglet Membres (`AdminCRM.tsx:1409`). Elle s'affiche en tiroir plein écran au-dessus du contenu de `AdminShell` (portail, `fixed inset-0 z-[80]`, `Escape` ferme, focus piégé), jamais en fenêtre centrée étroite. Le bandeau de témoins est en `z-[250]` (`CookieBanner.tsx:78`) : le tiroir ajoute `padding-bottom: var(--bandeau-temoins, 0px)` à son contenu, comme le pied de page, pour que le bas de la fiche ne passe pas dessous.

Correctif préalable dans `AdminCRM.tsx:639` : lire `members` sans `orderBy` (ou avec `limit(1000)`) et trier côté client sur `createdAt ?? joinedAt`, pour que les fiches créées par le Creator Studio apparaissent. Dans le même bloc, `isAdmin` (ligne 649) se déduit de `email` et non plus du champ retiré par la migration.

Contenu de la fiche, en colonnes sur desktop (`lg:grid-cols-[360px_minmax(0,1fr)]`) :

- **Colonne identité** : bannière et avatar en petit, nom, courriel Auth, type de membre, date d'arrivée, téléphone (`prive/coordonnees`), préférences, badges (avec `PanneauAdminBadges` déjà exporté par `reseau`), drapeaux existants (Artiste, Café, Mécène, Studio, Maestro) réemployés de la ligne, et le bouton « Voir son espace ».
- **Colonne activité**, en sections :
  - Séjours : appel `mesSejours({ uidCible })`, liste identique à celle du membre, plus un champ « Rattacher un séjour pour ce membre » qui appelle `lierSejour` en admin (ajouter `uidCible` admin à `lierSejour`, mêmes gardes que 4.1, sans limite d'essais).
  - Billets : appel `mesBillets({ uidCible })` (même garde admin que 4.1.3).
  - Communauté : nombre d'amis et de demandes en attente. Les messages privés entre membres ne s'affichent pas : la règle `conversations` les réserve à leurs membres et elle reste ainsi.
  - Creator Studio : les mêmes états que 6.7.
  - Vivre ici : les deux candidatures avec leur statut et un lien vers leur onglet.
  - Parrainage : son code, ses invités, qui l'a invité.
  - Aide : le fil `soutien/{uid}` complet, avec un champ de réponse (`auteur: 'equipe'`), un bouton « Marquer résolu » et la pose de `luParEquipeLe` à l'ouverture.
  - Signalements techniques : ceux dont `uid` correspond, avec capture et statut modifiable.
- **« Voir son espace »** : monte `EspaceMembrePage` avec `vueAdmin={{ uid }}` dans le tiroir. Ce mode lit le membre ciblé au lieu du compte connecté, remplace chaque bouton d'écriture par un texte inerte « Lecture seule », appelle les fonctions avec `uidCible`, et affiche en tête un bandeau « Vous regardez l'espace de {nom} » avec un bouton « Fermer ». Le sous-onglet Messages y montre « Les messages entre membres restent privés. »

Nouvelle section `soutien` dans `AdminCRM` (`SectionId`, ligne 64), placée dans les audiences Hôtel et Communauté, libellée « Aide aux membres », avec pastille du nombre de fils où `dernierAuteur == 'membre'` et `dernierMessageLe > luParEquipeLe`. `SoutienSection.tsx` liste les fils (`soutien orderBy dernierMessageLe desc limit 100`) et, dans un second onglet, les `problemesTechniques` par date.

---

## 8. Lots de construction

Chaque lot se construit, se teste, se déploie et se vérifie en ligne seul, puis se commite sur `main` (branche unique). Un agent lourd à la fois. `git pull` et `ListAgents` au début de chaque lot. Aucun lot ne dit « livré » sans ses captures regardées (section 9).

### Lot 0 · Réparer la porte d'inscription (règles + AuthModal)

Fichiers : `firestore.rules` (5.1 a et b), `components/AuthModal.tsx` (plus de `isAdmin` ni de `phone` dans l'écriture ; téléphone vers `prive/coordonnees` ; export de `deleteMemberData`), `App.tsx:547,590` (`isAdmin` calculé depuis le jeton), `components/MemberPanel.tsx:136`, `components/PublicProfilePage.tsx:778` et `components/AdminCRM.tsx:649` (`isAdmin` déduit, plus lu dans la fiche), `components/ProfilePage.tsx:92-104` (téléphone vers `prive/coordonnees`, pour que l'ancienne page ne casse pas pendant la transition), `tests/rules.espace.test.mjs` (R-01 à R-15), `scripts/migrer-fiches-membres.mjs`.
Déploiement, dans cet ordre : (1) hébergement (`hosting:le-salon-des-inconnus,hosting:inconnus-auberge`), pour que le code qui n'écrit plus `isAdmin` et qui calcule le drapeau soit en ligne avant tout le reste ; les règles actuelles refusent déjà l'ancienne forme, donc rien ne régresse pendant l'intervalle. (2) `firebase deploy --only firestore:rules`. (3) migration en `--essai`, lecture de la liste complète des clés hors liste, puis `--appliquer`. Déployer les règles seules, comme le prévoyait la première version, laissait l'`AuthModal` en ligne écrire `isAdmin` et l'inscription restait cassée.
Vérification : R-01 à R-15, R-09 à R-09 d et R-08 verts sur l'émulateur ; en ligne, inscription complète d'un compte témoin par courriel (voir 9.1) jusqu'au choix du type de membre, document `members/{uid}` présent sans `isAdmin`, courriel « Nouvelle adhésion » reçu par Alex ; après la migration, capture du menu de la pastille avec le compte admin (lot 7, jeton IAM) où l'entrée Admin est toujours là.

### Lot 1 · La route `/compte`, la coquille et l'onglet Profil

Fichiers : `App.tsx`, `SiteHeader.tsx`, `MemberPanel.tsx`, `AuthModal.tsx` (couleurs), `packages/ui/src/reseau/BadgesUI.tsx:54` (tiret cadratin), `usernames.ts`, `seo.config.ts`, `firebase.json` (en-têtes `X-Robots-Tag`), `SiteFooter.tsx` (`viewKey` optionnel), `components/compte/EspaceMembrePage.tsx`, `Banniere.tsx`, `OngletsMembre.tsx`, `RailMembre.tsx` (cartes Communauté artistique et Aide en simple lien pour l'instant), `onglets/OngletProfil.tsx`, `donnees/preferences.ts`, `public/media/compte/*.webp`. Les onglets pas encore bâtis ne s'affichent pas (la liste des onglets est un tableau filtré par lot).
Déploiement : hébergement seulement, sur les deux sites qui servent `dist` (`firebase deploy --only hosting:le-salon-des-inconnus,hosting:inconnus-auberge` ; le premier est celui de `www.lesalondesinconnus.com` selon le commentaire de `firebase.json`), puis `apps/salon` rebâti et `hosting:inconnus-salon`, parce que `RESERVED_SLUGS` et `BadgesUI` y sont aussi importés.
Vérification : `/compte` déconnecté montre la porte ; connecté, profil éditable, photo et bannière changées puis relues après rechargement ; `/profil` aboutit sur `/compte`, et le bouton « Mon profil » de `/membre/<uid>` aussi ; `/compte` ne tombe pas sur le Profil Pro ; `meta robots` vaut `noindex, nofollow` et `curl -I https://www.lesalondesinconnus.com/compte` montre `X-Robots-Tag` et le statut 200 ; `/compte/nimporte` reçoit toujours la vraie 404 ; l'écran de chargement de `/compte` ne télécharge aucune photo de l'auberge (liste des ressources).

### Lot 2 · Communauté et Communauté artistique

Fichiers : `packages/ui/src/reseau/ListeAmis.tsx` (+ `ProfilSocial.tsx` qui l'importe, + export dans `reseau/index.ts`), `components/MessagingPage.tsx` (`integre`, couleurs), `onglets/OngletCommunaute.tsx`, `onglets/OngletArtistique.tsx`, `donnees/creatorStudio.ts`, `App.tsx` (`handleStartDM`, redirection `/messages`).
Déploiement : hébergement des deux sites `dist`, puis `apps/salon` rebâti et `hosting:inconnus-salon` (même `ProfilSocial`). `ListeAmis.tsx` en commit isolé après `ListAgents` et `git pull`.
Vérification : deux comptes témoins (9.1) deviennent amis, s'écrivent, la cloche et la pastille s'allument ; la carte artistique mène à `/creator` ; l'état « commencé » s'affiche pour un compte qui a ouvert le Creator Studio sans finir l'accueil ; le mur et le profil social du Creator Studio fonctionnent toujours (capture de `/creator`).

### Lot 3 · Vos billets (fonction + fermeture des lectures publiques)

Fichiers : `functions/src/espaceMembre.ts` (`mesBillets`, `compterPlacesCeilidh` de 4.11), `functions/src/index.ts` (exports seulement, `createShowTicketPayment` inchangée), `firestore.rules` (5.1 e), `CeilidhPage.tsx:3333` (compteur lu dans `config/ceilidhPlaces`) et les quatre écritures d'inscription sans `email` (`CeilidhPage.tsx:1776,2710`, `CeilidhShared.tsx:1725,1895`), `AdminCRM.tsx:993` (courriel pris dans la fiche membre), `components/compte/deplaces/MonCeilidhPanneau.tsx` (sans `email` non plus), `onglets/OngletBillets.tsx`, `donnees/billets.ts`, scripts `scripts/initialiser-ceilidh-places.mjs` (un recomptage initial, puisque le déclencheur n'agit qu'à la prochaine écriture) et `scripts/purger-courriels-ceilidh.mjs`.
Ordre de déploiement : fonctions, script d'initialisation, hébergement, purge en `--essai` puis `--appliquer`, et règles en dernier (pour que la page en ligne ne lise jamais `showTickets` fermé ni n'écrive un `email` refusé).
Vérification : R-60 à R-64 ; un compte témoin avec un billet factice écrit par script en admin dans l'émulateur ; en ligne, onglet vide propre pour le compte témoin ; `/ceilidh` déconnecté affiche toujours son compteur **et** ses équipes et sa ligne du temps (capture 1440 et 390 avant et après les règles) ; une lecture REST anonyme de `registrations` ne contient plus aucun champ `email`.

### Lot 4 · Vos séjours (Hostaway)

Fichiers : `functions/src/hostaway.ts`, `functions/src/index.ts` (imports), `functions/src/espaceMembre.ts` (`mesSejours`, `lierSejour`), `firestore.rules` (`sejours`), `onglets/OngletSejours.tsx`, `donnees/sejours.ts`, `deplaces/CouponCommunaute.tsx`, `deplaces/DeHebdomadaire.tsx`, `tests/fixtures/hostaway-reservations.json`.
Déploiement : `--only functions:getHostawayAvailability,functions:getHostawayCalendar,functions:getHostawayQuote,functions:getRoomSuggestions,functions:mesSejours,functions:lierSejour`, puis règles, puis hébergement.
Vérification : appel de contrôle du filtre de dates (4.1) consigné dans le rapport du lot avant d'écrire l'onglet ; tests de fonctions sur l'émulateur (4.1, 4.2) ; en ligne, la réservation en direct de l'accueil rend toujours un prix (régression du déménagement) ; le compte de test voit l'état vide et le message de liaison ; `mesSejours` appelé avec `uidCible` par un compte non admin rend `permission-denied` ; la réponse réseau ne contient aucun champ hors du contrat 4.1.

### Lot 5 · Vivre ici et Parrainage

Fichiers : `functions/src/parrainage.ts`, `firestore.rules` (`codesParrain`, `parrainages`, `parrainagesCompte`), `donnees/parrainage.ts`, `onglets/OngletVivreIci.tsx`, `onglets/OngletParrainage.tsx`, `deplaces/AffiliationPanneau.tsx`, `RailMembre.tsx` (carte parrainage), `App.tsx` (réclamation du code retenu, dans l'effet de changement d'utilisateur), `reseau/notifications.ts` (type `parrainage`).
Déploiement : règles, fonction, hébergement des deux sites `dist` et de `inconnus-salon` (`notifications.ts` est dans `packages/ui`).
Vérification : R-50 à R-56 et R-65 ; la réclamation passe aussi pour un compte ouvert par la porte du Creator Studio ; en ligne, le compte de test A copie son lien, le compte de test B s'inscrit par ce lien, B apparaît chez A, la notification arrive à A ; un troisième compte créé plus de 48 h avant ne compte pas (vérifié sur l'émulateur seulement).

### Lot 6 · Préférences et Aide

Fichiers : `functions/src/courriel.ts` (déménagement de `smtpTransport`, `notifyAlex`, `line` et `RUNTIME_WITH_SMTP`, plus le gabarit HTML de 6.12), `functions/src/soutien.ts` (`onMessageSoutien`, `onProblemeTechnique`, `onMessageEntreMembres`), `functions/src/espaceMembre.ts` (`nettoyerCompteSupprime` de 4.10), `firestore.rules` (`soutien`, `problemesTechniques`, préférences déjà posées au lot 0), `storage.rules` (5.2), `tests/storage.espace.test.mjs`, `onglets/OngletPreferences.tsx`, `onglets/OngletAide.tsx`, `donnees/soutien.ts`, `donnees/problemes.ts`.
Déploiement : règles Firestore et Storage, fonctions, hébergement. Le secret `VEXEL_CLE_SALON` se pose seulement si `clients/salon` existe dans `vexel-integrations`.
Vérification : R-30 à R-44, S-01 à S-04 ; après le déménagement de `courriel.ts`, un avertissement existant (une candidature de wwoofer de test sur l'émulateur) part toujours ; en ligne, le compte témoin écrit à l'équipe et Alex reçoit l'avertissement ; une réponse admin (écrite par `firestore-rest.mjs` pour ne pas toucher la session d'Alex) déclenche le courriel au compte témoin, dont l'envoi se constate dans les journaux de la fonction (`sendMail` accepté) puisque les boîtes des témoins n'existent pas ; le gabarit HTML se regarde dans la boîte d'Alex par un envoi d'essai à son adresse ; un signalement avec capture apparaît dans Firestore avec `vexel` renseigné ; un troisième compte témoin, créé puis supprimé depuis l'onglet Préférences, ne laisse rien derrière lui (`prive/coordonnees`, `soutien`, Storage).

### Lot 7 · Admin : fiche membre et Aide aux membres

Fichiers : `components/admin/FicheMembre.tsx`, `components/admin/SoutienSection.tsx`, `components/AdminCRM.tsx` (correctif de la requête, clic sur la ligne, section `soutien`), `EspaceMembrePage.tsx` (mode `vueAdmin`), `functions/src/espaceMembre.ts` (`uidCible` sur `mesBillets` et `lierSejour`).
Déploiement : fonctions touchées, hébergement.
Vérification : captures de l'admin avec le vrai compte admin par jeton IAM (9.1, étape 2), fiche du compte de test ouverte, réponse d'aide envoyée depuis la fiche, « Voir son espace » en lecture seule sans aucun bouton d'écriture actif, membres du Creator Studio présents dans la liste.

### Lot 8 · Ménage et fermeture

Retirer l'ancien menu « Mes Événements » et le raccourci Ceilidh de `MemberPanel` s'ils font doublon avec Vos billets, supprimer le compte de test et ses données (9.1 fin), mettre à jour la note du vault `10_projects/salon-des-inconnus/` et le journal du jour, entrée au ledger `improvements-ledger.md` pour la réparation de `membreValide` (portée : tout site qui a posé un `hasOnly` sur une fiche membre). `ProfilePage.tsx` reste dans le dépôt jusqu'à l'accord d'Alex.

---

## 9. Plan de vérification

### 9.1 Session de test sans toucher au compte d'Alex

Deux comptes dédiés, créés et détruits par script, jamais le compte d'Alex pour les vues de membre.

1. `scripts/qa/comptes-test.mjs creer` : avec le jeton gcloud déjà présent (`houseoftherisingarts@gmail.com`, propriétaire du projet, le même que `scripts/qa/firestore-rest.mjs`) et l'en-tête `x-goog-user-project: le-salon-des-inconnus`, appel Identity Toolkit admin `POST https://identitytoolkit.googleapis.com/v1/projects/le-salon-des-inconnus/accounts` pour `qa-espace-a@lesalondesinconnus.com` et `qa-espace-b@lesalondesinconnus.com` (plus un `qa-espace-c` jetable au lot 6), `emailVerified: true`, `displayName: "Essai A"` / `"Essai B"`, mot de passe aléatoire rangé dans `scratchpad/temoins.env` (`TEMOIN_EMAIL`, `TEMOIN_PW`), la convention que `captures-studio.mjs` lit déjà, jamais dans le dépôt. Les uid sortent dans `scratchpad/qa-uids.json`. Ces boîtes n'existent pas chez Zoho : aucun courriel envoyé aux témoins ne se lit, il se constate dans les journaux.
2. **Lots 0 et 7 seulement** (capture du menu admin après la migration, puis l'admin) : rôle `roles/iam.serviceAccountTokenCreator` posé sur `le-salon-des-inconnus@appspot.gserviceaccount.com` pour le compte gcloud, 60 s de propagation, jeton personnalisé signé par `iamcredentials signJwt` pour l'uid admin d'Alex (lu par Identity Toolkit, jamais son mot de passe), rôle retiré tout de suite. Patron exact : `_vexel-base/scripts/qa/admin-shot.mjs` et la mémoire `reference_capture_admin_vraies_donnees`. Les témoins n'en ont pas besoin : ils se connectent par leur mot de passe, ce qui évite de toucher à l'IAM à chaque lot.
3. Captures : `scripts/qa/captures-studio.mjs` reçoit des scénarios `compte-<onglet>` (adresse `/compte?onglet=<onglet>`, connexion par le formulaire courriel d'`AuthModal`, clics de sous-onglets) plutôt qu'un nouveau script ; il mesure déjà le débordement horizontal, les lignes du titre, les tirets longs et les italiques. Deux cibles : le build servi par `scripts/qa/servir-salon.mjs` étendu d'un argument de site (`le-salon-des-inconnus` et `dist`), pour que les réécritures, la vraie 404 et les en-têtes de `firebase.json` soient ceux de la production, puis le site en ligne après déploiement. `npx vite preview` ne rejoue ni les réécritures ni les en-têtes, et l'import de `firebase/auth` « tel que Vite le sert » n'existe que sur le serveur de développement : c'est la raison du formulaire. Le jeton admin du lot 7 passe, lui, par `npx vite` (dev) et `import('/firebase.ts')`, le module du dépôt (il n'y a pas de `src/lib/firebase.ts` ici). Captures 1440 × 900 et 390 × 844, positions 0, milieu et bas, relevé des erreurs de console et des réponses ≥ 400 vers `googleapis` et `cloudfunctions`. Le mobile passe aussi sous WebKit (`playwright.webkit`), parce que les pièges du filtre et du verrou de défilement ne se voient que là.
4. Les données des séjours affichées en capture viennent d'un fixture : `page.route('**/mesSejours', …)` rend `{ result: <fixture> }` avec des chambres réelles et des dates inventées clairement fictives (voyageur « Essai A »). Aucune vraie réservation d'un vrai voyageur n'apparaît jamais dans une capture.
5. Fin du chantier : `scripts/qa/comptes-test.mjs detruire` supprime les comptes Auth témoins, ce qui déclenche `nettoyerCompteSupprime` (4.10), puis vérifie par `firestore-rest.mjs` et efface ce qui resterait : `members/{uid}` et ses sous-collections, `friendships`, `conversations` où ils figurent, `notifications/{uid}`, `soutien/{uid}`, `problemesTechniques` et `problemes/{uid}/` dans Storage, `codesParrain` et `parrainages` qui les touchent, `sejours/{uid}`. Le script affiche ce qu'il va effacer et s'arrête si un document ne porte pas l'un des deux uid.

### 9.2 Grille de lecture de chaque capture

Pour chaque onglet, 1440 et 390, regardée avec la grille du skill `boucle-verdict`, puis relue par un agent vérificateur indépendant (Sonnet) qui reçoit les images et cette grille :

- Pleine largeur : aucun bloc principal centré avec du vide sur les côtés à 1440 ; la gouttière à 390 fait 16 px.
- Aucun élément qui en cache un autre (avatar sur le nom, pastille sur un libellé d'onglet, rangée collée sur un titre).
- Chaque titre en Prata compte deux lignes au plus, compté sur l'image à 390 px.
- Aucune italique (`font-style: italic` calculé), aucun jaune `#d4af37` (mesure : `getComputedStyle` sur `color`, `background-color`, `border-color`, `fill` et `stroke` de tous les éléments, recherche de `rgb(212, 175, 55)`, y compris avec la pastille de `SiteHeader` ouverte et `AuthModal` ouvert sur la porte), aucune section collée au bas de l'écran. `grep -rn "d4af37\|text-gold\b\|bg-gold\b\|border-gold\b" components/compte` rend zéro ligne.
- Aucun tiret cadratin visible : `innerText` de la page sans `—` (mesure déjà faite par `captures-studio.mjs`).
- Texte lisible sur chaque bannière (contraste du nom mesuré sur la zone de la photo, cible 4,5:1).
- Rangée d'onglets : l'onglet actif est visible sans défilement manuel à 390.
- Clavier : parcours Tab, flèches, Début et Fin enregistré en vidéo courte Playwright et regardé.
- Mouvement réduit : capture avec `reducedMotion: 'reduce'`, aucune animation en cours.
- Poids : premier écran de `/compte` à 390 sous 1,2 Mo transférés (mesure `performance.getEntriesByType('resource')`), bannière servie en WebP de 960 px.

Trois tours au plus par lot ; ce qui reste après le troisième se nomme dans le rapport du lot.

### 9.3 Captures attendues par lot

| Lot | Captures |
|---|---|
| 0 | `AuthModal` choix du type de membre puis retour sans erreur (390, 1440) |
| 1 | porte déconnectée ; profil ; panneau des bannières ; `/profil` → `/compte` |
| 2 | Amis avec une demande ; Messages liste et conversation (et le retour mobile) ; Notifications ; Communauté artistique dans ses états sans profil et commencé ; `/creator` inchangé |
| 3 | Billets vide ; `/ceilidh` déconnecté avec compteur |
| 4 | Séjours avec fixture (à venir, passés, annulé) ; vide ; liaison réussie et refusée ; accueil avec prix en direct |
| 5 | Vivre ici ; Parrainage avec un invité ; rail |
| 6 | Préférences ; Aide avec un échange ; signalement envoyé |
| 7 | admin liste Membres ; fiche du compte de test ; « Voir son espace » ; Aide aux membres |

---

## 10. Risques

| Risque | Effet | Parade |
|---|---|---|
| `membreValide` déployé sans que l'inscription par la pastille ait été testée | les inscriptions échouent depuis le 12 septembre | lot 0 d'abord ; R-01 reproduit la forme exacte d'`AuthModal` |
| Une autre session écrit dans `packages/ui/src/reseau` ou `creator-studio` | conflit ou écrasement | `ListAgents` + `git pull` avant chaque lot ; `ListeAmis.tsx` en commit isolé ; message à la session qui tient `CreatorStudioShell.tsx` si besoin |
| Airbnb et Booking masquent le courriel du voyageur | onglet Séjours vide pour beaucoup de clients | `lierSejour` par code et date ; message clair ; l'équipe peut rattacher depuis la fiche admin |
| Le parcours de 10 pages Hostaway ralentit l'appel | attente de plusieurs secondes | cache de module 5 min, fenêtre de dates bornée, état de chargement textuel ; mesurer le temps réel au lot 4 et réduire la fenêtre passée à 18 mois si l'appel dépasse 6 s |
| `lierSejour` utilisé pour deviner des codes | fuite d'une réservation d'autrui | 5 essais par jour, code ET date exacts, réponse identique en cas d'échec, sortie limitée aux champs de 4.1 |
| Déménagement de `hostaway.ts` casse la réservation de l'accueil | perte de ventes | redéploiement ciblé et vérification du prix en direct avant la suite du lot 4 |
| Fermeture de la lecture de `showTickets` et purge des courriels de `registrations` | compteur de `/ceilidh` cassé ; équipes et ligne du temps vides pour un visiteur si `registrations` était fermé | `showTickets` seul se ferme, compteur `config/ceilidhPlaces` recompté par 4.11 ; `registrations` reste public sans `email` ; captures déconnectées de `/ceilidh` avant et après les règles |
| Courriels encore publics dans `carpools.driverEmail` et `needs.createdByEmail` | même fuite que celle du Ceilidh, sur deux autres collections | hors de cette vague ; parade proposée pour un lot à part : un booléen `createdByAdmin` posé à l'écriture remplace `isAdminEmail(...Email)` (`CeilidhShared.tsx:440,1246`), puis même purge |
| Retrait d'`isAdmin` des fiches par la migration | l'entrée Admin disparaît du menu d'Alex, la pastille Admin des fiches publiques aussi | drapeau calculé depuis le jeton dans l'App et depuis `email` borné par la règle, déployé **avant** la migration (ordre du lot 0) |
| `dateType`/`startDate`/`endDate` ignorés par un compte Hostaway sans la nouvelle requête | `mesSejours` lit tout l'historique, `lierSejour` compare le code à des réservations d'autres dates | filtres classiques `arrival*`/`departure*`, contrôle du `count` au lot 4, filtre de dates répété côté serveur |
| Suppression de compte partielle | le téléphone et le fil d'aide d'un membre parti restent, contre le texte affiché | `nettoyerCompteSupprime` (4.10) et vérification avec un témoin jetable au lot 6 |
| Secret `VEXEL_CLE_SALON` déclaré avant d'exister | `firebase deploy` échoue et bloque tout le lot 6 | la fonction ne le déclare qu'une fois posé (4.6) |
| Membres existants avec `phone`, `isAdmin` ou une autre clé hors liste sur leur fiche | toute mise à jour par le membre échoue (`hasOnly`), `ensureMember` compris | migration du lot 0 juste après les règles, liste complète des clés hors liste en `--essai` |
| `SiteHeader` monté sur `COMPTE` se superpose à la bannière | nom ou avatar caché | nom et avatar posés au bas de la bannière, loin des 56 px de l'en-tête, rangée d'onglets en `sticky top-[56px]` ; en-tête opaque dès 10 px de défilement (comportement de la vague 3) |
| Clé Vexel du Salon absente | signalements non transmis à l'oreille de Vexel | champ `vexel: 'absent'`, avertissement d'Alex par courriel quand même |
| Photos de bannière lourdes, ou préchargement de l'accueil | premier écran mobile lent | WebP en trois largeurs, porte comprise, seule la bannière en priorité haute, `COMPTE` dans `isStandalonePage`, mesure 9.2 |
| Compte de test oublié | données fictives visibles dans l'admin | script `detruire` au lot 8, vérification que la liste Membres ne les montre plus |
| Suppression de `ProfilePage.tsx` trop tôt | perte d'une fonction oubliée | le fichier reste jusqu'à l'accord d'Alex ; les quatre fonctions nommées au 0 déménagent d'abord |

---

## 11. Ce qui attend Alex, une seule fois, à la fin

Tout le devis s'exécute sans réponse. Deux points restent à sa discrétion et ne bloquent aucun lot : la récompense éventuelle d'un parrainage (le compteur `parrainagesCompte` est prêt, rien n'est promis dans les textes), et l'accord pour retirer `components/ProfilePage.tsx` une fois le nouvel espace en ligne.

Sources consultées pour Hostaway : [Hostaway Public API Reference](https://hostaway.github.io/api/) et [api.hostaway.com/documentation](https://api.hostaway.com/documentation) (journal du 21 août 2026 pour `dateType`, du 31 mars 2026 pour `afterId`).

---

## 12. Relecture adversariale du 16 septembre 2026

Le devis a été relu contre le code livré le jour même (dernier commit `81e29d1`), et corrigé en place ; la version d'avant vit dans `avant-vague7-espace-membre.md`. Ce qui a changé, en résumé : le lot 0 déploie l'hébergement avant les règles et calcule `isAdmin` ailleurs que dans la fiche ; `registrations` garde sa lecture publique et perd ses courriels au lieu d'être fermé ; le compteur du Ceilidh vient d'un déclencheur et non d'une transaction qui n'existe pas ; Hostaway passe aux filtres classiques ; les déclencheurs suivent le patron v1 du fichier ; la suppression de compte efface vraiment ; l'en-tête mesure 56 px ; les courriels aux membres partent en HTML ; les captures réemploient `captures-studio.mjs` et `servir-salon.mjs` ; plusieurs textes perdent leur genre imposé, leur pluriel fixe ou leur anaphore.
