# Passation du 16 septembre 2026 (session lesalondesinconnus-de → relève)

La session Claude Code qui travaillait ici a frappé sa limite Anthropic en plein milieu de la vague 5 du plan écosystème. Voici exactement où elle en était, dans ses propres mots.

## Tâche en cours
La vague 5 refait `www.lesalondesinconnus.com/centre-arts` façon Fortiche : `components/centre-arts/CentreArtsPage.tsx`, `contenu.ts`, `useRevelations.ts`, selon le devis `vague5-centre-arts.md` (voir `~/Documents/Onyx/10_projects/salon-des-inconnus/plan-ecosysteme-2026-09-16.md` et les devis dans le scratchpad de la session d'origine s'ils sont encore accessibles).

## Déjà fait et vérifié en ligne
Les domaines et la garde « jamais web.app », l'en-tête et le vrai pied de page, le collant Vexel sur le parc, la passe de performance, la réparation de l'inscription des membres (règles Firestore déployées), le plancher luisant de `/mecene`.

## Ce qui reste, dans l'ordre
1. Le code de la vague 5 est écrit et déjà commité par autosave (commit `445d94c`), `tsc` passe, mais **le site sert encore l'ancien bundle** (`index-BsuG1oG_.js`). Il faut `npm run build`.
2. Déployer : `npx firebase deploy --only hosting:le-salon-des-inconnus,hosting:inconnus-auberge --project le-salon-des-inconnus`.
3. Capturer `/centre-arts` à 1440 et 390 px, regarder les captures avant de dire que c'est fait (RÈGLE -5 d'Alex : jamais affirmer sans avoir regardé).
4. Ensuite seulement, passer à la vague 7 (espace membre, lots 1 à 8), détaillée dans `vague7-espace-membre.md`.
5. La vague 4 (bureau aux trois livres) attend le OK d'Alex sur les crédits Higgsfield : ne pas y toucher sans ce OK.

## État fragile, à respecter absolument
- `components/SiteFooter.tsx` est modifié et NON commité (une prop `sansH1`, changement légitime, à garder, jamais à écraser avec un `git checkout`).
- Ne jamais retirer le bloc « À propos » du pied de page.
- Ne jamais mettre de réécriture `**` dans `firebase.json` : une vraie page 404 en dépend.
- Ne rien publier de `vexel-site` : ce dépôt appartient à une autre session (relève parallèle en cours là aussi).
