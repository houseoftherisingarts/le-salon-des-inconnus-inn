# Branchements du Salon des Inconnus

Les clés, comptes et réglages externes dont le site a besoin pour fonctionner,
avec l'endroit exact où chacun se pose. Rien ici n'est un secret : les valeurs
vivent dans Firebase Secret Manager ou dans `.env.local`, jamais dans le dépôt.

## Camping du festival (`/camping`)

Quatre emplacements vendus 115 $ pour la fin de semaine du Festival médiéval de
Montpellier. Tout est branché depuis le 9 septembre 2026 et l'argent entre dans
le compte Stripe du Salon, `acct_1QblkjKKPSkaQESf`.

| Quoi | Identifiant ou emplacement |
|---|---|
| Produit Stripe | `prod_VEKnvBB5HwhA1L` |
| Prix, 115,00 CAD | `price_1UDs8SKKPSkaQESfbjDOCRU6` |
| Lien de paiement, limité à 4 | `plink_1UDs8bKKPSkaQESfJSFbZnbZ` |
| Adresse du lien | https://buy.stripe.com/9B6fZidfgfDX3Si4Oc4sE00 |
| Endpoint webhook | `we_1UDs93KKPSkaQESfUt7jh2WX` |
| Secret de signature | Secret Manager → `STRIPE_WEBHOOK_SECRET`, version 1 |
| Compteur des emplacements vendus | Firestore → `config/camping.vendus` |
| Réservations encaissées | Firestore → `events/camping-fmm-2026/reservations/{sessionId}` |
| Avis par courriel à chaque vente | Secret Manager → `ZOHO_USER`, `ZOHO_PASS` |

Le webhook répond à cette adresse, et elle est fixe :

```
https://us-central1-le-salon-des-inconnus.cloudfunctions.net/stripeCampingWebhook
```

Deux choses méritent d'être retenues avant d'y toucher.

Le compte Stripe du Salon sert aussi Vexel et Montpellois, et Stripe envoie
chaque `checkout.session.completed` à tous les endpoints du compte. La fonction
filtre donc sur `session.payment_link`, et cette constante vit dans
`functions/src/index.ts` sous le nom `CAMPING_PAYMENT_LINK`. Un nouveau lien de
paiement demande de changer cette constante en même temps.

Le garde-fou contre une cinquième vente n'est pas le compteur mais le réglage
`restrictions[completed_sessions][limit]` du lien lui-même, réglé à quatre.
Même si la fonction tombait, Stripe refuserait la cinquième transaction.

Le banc d'essai du webhook tourne contre l'émulateur Firestore, sans toucher à
la production. Il couvre la signature, la fenêtre de rejeu, le filtre par lien,
l'écriture de la réservation, le rejeu d'un même paiement et le plafond de
quatre :

```bash
export JAVA_HOME=/usr/local/opt/openjdk@21
export PATH="$JAVA_HOME/bin:$PATH"
cd functions && npm run build && npm run test:camping
```

Pour la prochaine édition, les dates, le nombre de places et le prix vivent dans
le bloc `CAMPING` en haut de `components/CampingPage.tsx`, et un nouveau lien de
paiement se colle dans Firestore `config/camping.lienStripe` sans redéploiement.

## Le reste du site

| Quoi | Où |
|---|---|
| Square (paiements du Ceilidh et des billets de spectacle) | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, plus `VITE_SQUARE_APP_ID` et `VITE_SQUARE_LOCATION_ID` |
| HostAway (disponibilités, calendrier, prix) | Secret Manager → `HOSTAWAY_API_KEY`, `HOSTAWAY_ACCOUNT_ID` |
| Zoho SMTP (tous les avis envoyés à Alex) | Secret Manager → `ZOHO_USER`, `ZOHO_PASS` |
| Gemini | `.env.local` → `VITE_GEMINI_API_KEY` |
| Firebase (client) | `.env.local` → les sept `VITE_FIREBASE_*` |
