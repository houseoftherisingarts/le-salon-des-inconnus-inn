# Espaces : direction de design (source unique, 28 septembre 2026)

Ce document fixe le design des « espaces » : le moteur commun qui sert le Profil Pro des artistes à 80 $ (Creator Studio) et les Vexel Space à 80 ou 100 $ (organismes, boutique, conférencier, auteur, festival). Le plan d'affaires et les décisions d'Alex vivent dans `~/Documents/Onyx/10_projects/vexel/plan-vexel-space-2026-09-28.md`. Ce qui n'est pas ici ne se dessine pas; ce qui y est se bâtit gabarit par gabarit, dans l'ordre de la section 6.

## 1. Ce qui ne bouge jamais

- Un espace publié est un vrai site qui défile en pleine largeur : hero plein écran, puis des sections indépendantes, sans colonne centrée dans le vide, sans bloc posé sur un rectangle de couleur, sans dégradé plat en guise de fond.
- Jamais d'italique. L'accent vient de la couleur d'accent du thème et du poids.
- Un titre display tient sur deux lignes au plus, à 1440 comme à 390; on raccourcit le texte, jamais la police.
- Coins arrondis de 15 px, verre translucide (`bg-black/40 backdrop-blur-md border-white/15` sur fond sombre, l'inverse sur fond clair), profondeur par le flou et le halo, jamais par une ombre portée dure.
- Chaque espace porte le collant Vexel en foil au pied de page, une page 404 propre, le titre, la description, l'image de partage, l'Open Graph et le JSON-LD de sa catégorie.
- `prefers-reduced-motion` coupe l'élément wow et les entrées animées; le contenu reste lisible tel quel.
- Les icônes sont des SVG (Lucide déjà présent dans le monorepo), jamais des emojis.
- Le texte public est en français, sans repli anglais, sauf la version anglaise choisie par la personne dans son atelier.

## 2. Les jetons de thème

Aujourd'hui le canon du Salon est écrit en dur dans chaque section de `packages/ui/src/super-profile/templates` (environ cent cinquante couleurs hexadécimales réparties dans trente fichiers, mesuré le 28 septembre). Le premier geste du chantier est de les remplacer par des variables CSS posées sur la racine du gabarit, et de ne plus jamais écrire une couleur en dur dans une section.

Variables, préfixe `--es-` (espace) :

| Jeton | Rôle |
|---|---|
| `--es-bg` | fond de page |
| `--es-bg-2` | fond des cartes et des bandes secondaires |
| `--es-ink` | texte principal |
| `--es-ink-2` | texte secondaire (opacité 0,72 de l'encre) |
| `--es-accent` | couleur d'accent : boutons, filets actifs, eyebrows, halo |
| `--es-accent-ink` | texte posé sur l'accent |
| `--es-line` | filets et bordures (accent à 0,28) |
| `--es-glass` | fond du verre (fond à 0,40) |
| `--es-glow` | halo derrière le hero et le lecteur (accent à 0,35) |
| `--es-font-display` | police des titres |
| `--es-font-label` | police des eyebrows et des étiquettes en capitales |
| `--es-font-body` | police du corps |
| `--es-radius` | 15px |

Le registre vit dans `packages/ui/src/super-profile/themes.ts` : pour chaque famille de gabarit, une liste de palettes (`id`, `nom`, `sombre: boolean`, les jetons de couleur) et une liste de paires de polices (`id`, `nom`, display, label, body, poids). La configuration de l'espace garde `theme.palette`, `theme.fonts` et `theme.accent` (couleur libre, hex validé, qui remplace `--es-accent` et recalcule `--es-line` et `--es-glow`). La palette par défaut de chaque famille du Creator Studio est « Salon », identique au canon actuel, pour qu'aucun profil existant ne change d'un pixel à la livraison.

Les polices se chargent par Google Fonts en `display=swap`, seulement la paire choisie, jamais les trois. Le pied de page et le collant Vexel gardent leurs couleurs propres (le collant est en foil irisé, quel que soit le thème).

## 3. L'ordre et l'allumage des sections

`config.sections` reste le dictionnaire d'allumage. On ajoute `config.ordre: SectionId[]`, la liste ordonnée des sections; les identifiants absents s'ajoutent à la suite dans l'ordre par défaut du gabarit, et le hero et le pied de page ne bougent jamais. Dans l'atelier, chaque section a deux flèches (monter, descendre) à côté de son interrupteur; pas de glisser-déposer.

Nouveaux identifiants de section pour le moteur : `boutique` (produits avec prix et lien de paiement), `galerie` (photos libres), `infolettre` (courriel vers une fonction), `equipe`, `evenements`, `programme`, `billets`, `partenaires`, `benevoles`, `dons`, `conferences`, `temoignages`, `extraits`, `series`, `tarifs`. Chaque gabarit déclare ses sections disponibles et son ordre par défaut; l'atelier ne montre que celles-là.

## 4. L'atelier : les fonctions communes

Sans toucher au code, la personne règle : le nom, l'accroche, la présentation; le portrait ou le logo, la bannière (photo ou courte vidéo mp4 sans son, 20 Mo au plus, en boucle); la palette (cinq ou six par gabarit), la couleur d'accent libre, la paire de polices (trois par gabarit); l'ordre et l'allumage des sections; le contenu de chaque section; les produits (nom, description, prix, photo, lien de paiement Stripe, Square ou Zeffy, trente au plus); les liens (https seulement, dix au plus); le formulaire de contact; le titre, la description et l'image de partage; le domaine personnel; la langue (FR, EN, ou les deux); l'aperçu avant publication; publier ou dépublier; éteindre l'élément wow.

Deux cartes fixes en bas de chaque page de l'atelier : « Brancher Stripe avec Alex » (80 $ une fois, un appel en tête-à-tête; paiement Stripe ponctuel puis fiche `assistances/{uid}` et courriel à Alex) et « Passer à un vrai site Vexel » (à partir de 300 $ par mois, spécial 2026, 350 $ ensuite; le bouton ouvre le compte Vexel avec le dossier prérempli).

Les images passent en webp dans le navigateur avant l'envoi (recette `versWebp` du dépôt du festival, `src/firebase/photosPubliques.ts`). Les pistes audio se déposent telles quelles (mp3, m4a, wav, ogg, flac, 30 Mo au plus, douze au plus).

## 5. Deux maisons, deux chromes

- Creator Studio (artistes) : le rendu public et l'atelier gardent le chrome du Salon (Prata, Cinzel, Lato, or antique `#c5a059`, crème `#f3e5ab`, noir chaud `#050505`). Pied de page « Porté par Le Salon des Inconnus » plus le collant Vexel.
- Vexel Space (application `vexel-space`) : l'atelier et les pages de compte suivent le canon Vexel v3 (noir et blanc pur `#050505` / `#f5f5f5`, Merriweather en display, Outfit en corps et pour les chiffres en `tabular-nums`, accents par opacité, iridescent du collant pour les moments de fête : bienvenue, publication, paiement réussi). Le rendu public de l'espace porte le thème choisi par la personne, jamais le chrome Vexel. Pied de page : collant Vexel seul.

## 6. Les huit gabarits

Chaque gabarit se livre complet : sections, fonctions de métier, palettes, paires de polices, élément wow, deux espaces témoins publics sous `/apercu/<gabarit>` (contenu de démonstration dans `apercus.ts`, accessible sans compte, `noindex`), captures regardées à 1440 et 390 par la boucle de verdict. Les références citées viennent de la recherche du 28 septembre; on les ouvre avant le premier pixel, on n'en copie rien.

### 6.1 Musicien (Creator Studio, 80 $) : le premier, il paie le moteur

Existe : `MusicienTemplate.tsx`, sections Écoute (liens Spotify, Bandcamp, YouTube), Dates, Presse, Bio, Contact, Liens, Pied. Références : paulkalkbrenner.net, michaelgatt.com, arstraumur.music.

Sections et ordre par défaut : hero, écoute (pistes déposées et liens de plateformes), dates, boutique (albums, marchandise, billets par lien), presse, bio, galerie, contact, liens, pied.

Palettes (six) :
| id | nom | fond | fond 2 | encre | accent | sombre |
|---|---|---|---|---|---|---|
| salon | Salon | #050505 | #0f0d0a | #f3e5ab | #c5a059 | oui |
| scene | Scène | #07070b | #111118 | #f5f5f5 | #ff5c39 | oui |
| neon | Néon | #050507 | #0d0d16 | #eef0ff | #19e6d2 | oui |
| bois | Bois | #1b1410 | #261c16 | #f1e6d2 | #d9a05b | oui |
| vinyle | Vinyle | #f2ebdf | #e9dfcd | #161412 | #b8312f | non |
| brume | Brume | #eef1f4 | #e2e7ec | #14181d | #2f6f8f | non |

Paires de polices (trois) : `salon` Prata / Cinzel / Lato (défaut); `affiche` Anton / Outfit / Outfit; `chaleur` Fraunces 500 / Manrope 600 capitales / Manrope.

Wow : le lecteur collant. Dès qu'une piste joue, une barre de verre se pose en bas de l'écran (titre, lecture, piste suivante, temps, forme d'onde fine) et suit tout le défilement sans couper la lecture; le hero de scène, plein écran, porte un halo `--es-glow` derrière le nom dont l'intensité bat sur l'amplitude de la piste (Web Audio `AnalyserNode` sur l'élément audio; si l'analyse échoue faute de CORS, le halo bat sur un tempo fixe de 96 à la minute). Une seule piste joue à la fois sur toute la page (recette `audioExclusif.ts` du dépôt du festival). `prefers-reduced-motion` fige le halo.

### 6.2 Peintre et artiste visuel (Creator Studio, 80 $; sert sculpteur, artisan, numérique)

Existe : `PeintreTemplate.tsx`, mur d'œuvres, expositions, atelier, bio. Références : havananguyen.com, nicksheehy.com, amberma.com.

Sections : hero, œuvres (mur), boutique (œuvres à vendre par lien, ruban « vendu »), expositions, atelier, bio, presse, contact, liens, pied.

Palettes : salon (défaut), `galerie` blanc cassé #f7f4ee / encre #1a1815 / accent #1a1815; `lin` #efe9dd / #2b2520 / #8c5a3c; `ardoise` #101214 / #ecebe6 / #d9c6a2; `terre` #1d1512 / #f0e4d4 / #c26a3d; `sauge` #e9ede6 / #1f2621 / #4c7a5c.

Paires : salon (défaut); `galerie` Cormorant Garamond 500 / Manrope capitales / Manrope; `moderne` Syne 700 / Syne capitales / Work Sans.

Wow : l'œuvre se révèle sous le curseur (masque radial qui suit la souris sur le mur, `RevealWaveImage` existant à réemployer) et, au clic, se pose à l'échelle dans une pièce : une photo de salon neutre avec un mur où l'œuvre s'affiche à ses dimensions réelles (largeur et hauteur en cm dans la fiche), avec un canapé de référence à 180 cm.

### 6.3 Photographe (Creator Studio, 80 $)

Existe : `PhotoTemplate.tsx` en mosaïque, `InteractivePhotoStack`. Références : almostreal.me, meiwensee.com.

Sections : hero (photo plein écran), séries (chaque série a son titre, sa description et sa mosaïque), tarifs (séances, forfaits), rendez-vous (module existant), bio, presse, contact, liens, pied.

Palettes : salon (défaut), `noir` #0a0a0a / #f5f5f5 / #f5f5f5; `blanc` #fbfbfb / #111111 / #111111; `sepia` #14100d / #ecdcc6 / #c79a6b; `argent` #e8e8ea / #1b1b1f / #5b6b7b; `nuit` #0b0f14 / #e6edf3 / #7fb3d5.

Paires : salon (défaut); `editorial` Playfair Display 500 / Manrope capitales / Manrope; `net` Archivo 600 / Archivo capitales / Archivo.

Wow : la mosaïque plein écran se révèle au passage (chaque photo entre en fondu et léger zoom quand elle arrive dans la fenêtre) et chaque série se lit en défilement horizontal au défilement vertical (section épinglée, translation horizontale liée au scroll; sur mobile, une bande à un seul défileur, jamais deux).

### 6.4 Boutique (Vexel Space, 100 $)

Références : unimaticwatches.com, tillysveaas.co.uk. Sections : hero, vitrine (produits en grille, filtres par collection), collections, histoire, points de vente (liste et carte par lien), infolettre, contact, liens, pied.

Palettes : `craie` #f6f3ee / #1b1a18 / #1b1a18; `encre` #101010 / #f4f1ea / #d9b26f; `terracotta` #f1e4d8 / #2c1e17 / #b8552d; `olive` #eef0e6 / #1f261d / #55683f; `minuit` #0d1220 / #eef1f7 / #c9a86a; `rose` #f9eef0 / #2a1d21 / #b4405a.

Paires : `maison` Fraunces 500 / Manrope capitales / Manrope; `net` Outfit 600 / Outfit capitales / Outfit; `luxe` Cormorant Garamond 500 / Manrope capitales / Manrope.

Wow : l'étagère. Les produits vedettes se posent sur une étagère 3D en défilement (`project_vexel_shelf_3d`, dépôt `~/Documents/Websites/vexel-site`, à réemployer), et chaque carte produit joue une courte vidéo au survol quand la personne en a déposé une.

### 6.5 Auteur (Vexel Space, 100 $; l'écrivain du Creator Studio a le même gabarit à 80 $)

Existe : `EditorialTemplate.tsx`, section Livres. Références : helenhoang.com, jenniferegan.com, ljrossauthor.com. Sections : hero, livres (couverture, résumé, liens d'achat par libraire), extraits (à lire dans la page), événements et salons, presse, infolettre, bio, contact, liens, pied.

Palettes : salon (défaut au Creator Studio), `papier` #f4efe6 / #1e1a16 / #8a2f2a; `nuit` #12100e / #efe7d8 / #c8a25c; `bleu` #0f1a2b / #e9eef6 / #d7b56d; `kraft` #e7dcc8 / #2a2118 / #3f5a3a; `gris` #f1f1f1 / #141414 / #141414.

Paires : `lettre` Cormorant Garamond 500 / Manrope capitales / Libre Baskerville; `roman` Playfair Display 500 / Manrope capitales / Manrope; `net` Fraunces 500 / Outfit capitales / Outfit.

Wow : le livre s'ouvre au défilement. La section Extraits est un livre à plat dont les pages tournent à mesure que l'on défile (patron des pages à l'encre du Grimoire du festival, `reference_grimoire_pages_homographie`), le texte de l'extrait posé sur la page.

### 6.6 Conférencier (Vexel Space, 100 $)

Port de Krystine et de Xena. Références : sallyhogshead.com, brittanyhodak.com. Sections : hero (bande démo), conférences (sujets, durée, public), calendrier, demande de réservation (formulaire vers courriel), témoignages, extraits vidéo, presse, livres ou ressources, contact, liens, pied.

Palettes : `scene` #0b0b0d / #f5f5f5 / #e63946; `sable` #f5efe3 / #1c1a17 / #b2733c; `marine` #0e1626 / #eef2f8 / #f2c14e; `ivoire` #faf7f1 / #1a1a1a / #1a1a1a; `forêt` #0f1a14 / #e9efe9 / #c9a86a.

Paires : `voix` Merriweather 500 / Outfit capitales / Outfit; `impact` Anton / Outfit capitales / Work Sans; `classe` Playfair Display 500 / Manrope capitales / Manrope.

Wow : la bande démo plein écran au chargement (vidéo muette en boucle, sous-titres en surimpression), puis les sujets de conférence en feuilles collantes qui s'empilent au défilement (sticky stacking cards).

### 6.7 OBNL (Vexel Space, 80 $)

Port de l'Union paysanne et du festival. Références : unicef.org.au, rainforesttrust.org. Sections : hero, mission, impact (chiffres), équipe, dons (lien Zeffy ou Stripe), devenir bénévole (formulaire), événements, partenaires, rapports (PDF déposés), contact, liens, pied.

Palettes : `terre` #f3efe7 / #1f1c18 / #3f6b4a; `ciel` #eef4f8 / #14202b / #2b6f9e; `soleil` #fff7e8 / #2a2116 / #d98a2b; `ardoise` #1c2126 / #eceff2 / #e0b357; `prune` #f6f0f4 / #2a1a25 / #7b3b6b.

Paires : `clair` Lexend 600 / Lexend capitales / Source Sans 3; `chaleur` Fraunces 500 / Manrope capitales / Manrope; `net` Outfit 600 / Outfit capitales / Outfit.

Wow : les chiffres d'impact se comptent à l'écran quand la section arrive (compteur `tabular-nums`, 1,2 s, ease-out) et une carte du territoire (image déposée par l'organisme, ou fond de carte neutre) où les points d'action s'allument un à un.

### 6.8 Festival (Vexel Space, 100 $; 80 $ si OBNL)

Port du site du festival, le plus riche. Références : superlocaldesign.com, lagolago.nl/en, spatial-festival.program.studio. Sections : hero (compte à rebours), programme et horaire (par jour, par scène), billets (liens), carte du site (image déposée avec repères), partenaires, bénévoles, exposants (appel et liste), galerie, infos pratiques, contact, liens, pied.

Palettes : `nuit` #0a0a0f / #f2f2f5 / #ff4d6d; `parchemin` #f1e7d2 / #241b12 / #8a1c1c; `forêt` #0f1a14 / #eaf0ea / #d9a05b; `électrique` #0b0e1a / #f0f3ff / #4dd0e1; `sable` #f6efe2 / #1d1a16 / #d16a2f.

Paires : `affiche` Anton / Outfit capitales / Outfit; `médiéval` Cinzel 600 / Cinzel capitales / Lato; `fête` Bricolage Grotesque 700 / Bricolage Grotesque capitales / Work Sans.

Wow : compte à rebours cinématique dans le hero (jours, heures, minutes en gros chiffres `tabular-nums`, fond vidéo ou photo qui respire) et l'horaire en scène : une grille par jour qui se filtre d'un geste (jour, scène), les blocs qui glissent en place.

## 7. Comment on vérifie

À chaque gabarit : `node ~/.claude/skills/boucle-verdict/scripts/audit.mjs <url> <dossier>` sur les deux espaces témoins publiés, à 1440 et 390 et aux positions de défilement utiles; un vérificateur Sonnet regarde les captures et rend la liste des fautes; trois tours au plus, puis on livre ou on nomme ce qui reste. Grille : pleine largeur, aucun élément qui en cache un autre, titres sur deux lignes au plus, lecteur et vidéos dans la page, texte lisible sur chaque fond, wow visible et coupé par `prefers-reduced-motion`.
