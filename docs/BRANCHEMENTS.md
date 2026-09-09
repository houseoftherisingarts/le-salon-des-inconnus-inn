# Branchements — Le Salon des Inconnus

Les clés, comptes et réglages externes dont le site a besoin pour fonctionner,
avec l'endroit exact où chacun se pose. Rien ici n'est un secret : les valeurs
vivent dans Firebase Secret Manager ou dans `.env.local`, jamais dans le dépôt.

## Camping du festival (`/camping`)

Quatre emplacements vendus 115 $ pour la fin de semaine du Festival médiéval de
Montpellier. L'argent entre dans le compte Stripe du Salon des Inconnus.

| Quoi | Où | État |
|---|---|---|
| Lien de paiement Stripe (115,00 CAD, limite de 4 paiements) | Firestore → `config/camping.lienStripe` | à créer |
| Secret de signature du webhook Stripe | Secret Manager → `STRIPE_WEBHOOK_SECRET` | à créer |
| Compteur des emplacements vendus | Firestore → `config/camping.vendus` | écrit par la fonction |
| Réservations encaissées | Firestore → `events/camping-fmm-2026/reservations/{sessionId}` | écrit par la fonction |
| Avis par courriel à chaque vente | Secret Manager → `ZOHO_USER`, `ZOHO_PASS` | déjà en place |

Adresse du webhook, fixe et connue d'avance :

```
https://us-central1-le-salon-des-inconnus.cloudfunctions.net/stripeCampingWebhook
```

Mise en place, dans cet ordre :

1. Stripe → **Payment links** → nouveau lien à 115,00 CAD, et dans les options
   avancées, **Limit the number of payments** réglé à **4**. C'est ce réglage
   qui empêche une cinquième vente même si tout le reste tombe.
2. Stripe → **Developers → Webhooks** → nouvel endpoint sur l'adresse ci-dessus,
   événement `checkout.session.completed`. Stripe donne alors un secret de
   signature qui commence par `whsec_`.
3. ```bash
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
   firebase deploy --only functions:stripeCampingWebhook
   ```
4. Firestore → collection `config` → document `camping` → champ `lienStripe`
   (chaîne) avec l'adresse du lien de paiement. La page l'attrape en direct,
   sans redéploiement.

Pour la prochaine édition, tout ce qui change vit dans le bloc `CAMPING` en haut
de `components/CampingPage.tsx` : les dates, le nombre de places et le prix.

## Le reste du site

| Quoi | Où |
|---|---|
| Square (paiements du Ceilidh et des billets de spectacle) | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, plus `VITE_SQUARE_APP_ID` et `VITE_SQUARE_LOCATION_ID` |
| HostAway (disponibilités, calendrier, prix) | Secret Manager → `HOSTAWAY_API_KEY`, `HOSTAWAY_ACCOUNT_ID` |
| Zoho SMTP (tous les avis envoyés à Alex) | Secret Manager → `ZOHO_USER`, `ZOHO_PASS` |
| Gemini | `.env.local` → `VITE_GEMINI_API_KEY` |
| Firebase (client) | `.env.local` → les sept `VITE_FIREBASE_*` |
