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
| Lien de paiement, limité à 2 | `plink_1UDs8bKKPSkaQESfJSFbZnbZ` |
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

Le garde-fou contre une vente de trop n'est pas le compteur mais le réglage
`restrictions[completed_sessions][limit]` du lien lui-même. Deux emplacements
sont partis au téléphone le 9 septembre 2026, donc la limite est descendue de
quatre à deux, et la constante `dejaPris` du bloc `CAMPING` porte le même
chiffre côté page. Ces deux nombres bougent ensemble : une place vendue hors
ligne monte `dejaPris` de un et fait descendre la limite Stripe d'autant.

```bash
curl -s https://api.stripe.com/v1/payment_links/plink_1UDs8bKKPSkaQESfJSFbZnbZ \
  -u "$STRIPE_SECRET_KEY:" -d "restrictions[completed_sessions][limit]=2"
```

La fiche du Salon sur la page Hébergement du site du festival mène droit à
`/camping` et annonce le nombre d'emplacements restants. Ce nombre y est écrit
en dur (`src/pages/HebergementPage.tsx`, `LODGINGS[0]`), parce que le site du
festival ne lit pas le Firestore du Salon.

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

## Profil Pro du Creator Studio (`/{slug}` et `functions/src/profilPro.ts`)

L'abonnement à 100 $ CAD par mois qui débloque la page d'artiste, la prise de
rendez-vous et le back-office. Trois fonctions, aucun SDK Stripe installé : la
même méthode que `stripeCampingWebhook` plus haut, une authentification Basic
sur la clé secrète et des appels `fetch` directs vers `api.stripe.com`.

| Quoi | Identifiant ou emplacement |
|---|---|
| Fonction d'ouverture du paiement | `creerAbonnementProfilPro` (onCall) |
| Fonction de webhook | `webhookProfilPro` (onRequest) |
| Fonction du portail client | `portailProfilPro` (onCall) |
| Clé secrète Stripe | Secret Manager → `STRIPE_SECRET_KEY` |
| Secret de signature du webhook | Secret Manager → `STRIPE_WEBHOOK_PRO_SECRET` (posé après la création de l'endpoint, voir plus bas) |
| Avis de bienvenue par courriel | Secret Manager → `ZOHO_USER`, `ZOHO_PASS` (déjà posés pour le reste du site) |
| Abonnements | Firestore → `abonnementsPro/{uid}` |
| Drapeau qui débloque la page | Firestore → `members/{uid}/admin/flags.proEnabled` (`maestroEnabled` reste accepté comme synonyme) |
| Agenda de chaque artiste | Firestore → `members/{uid}/agenda/config` |
| Rendez-vous | Firestore → `rendezvousPro/{id}` et son miroir public `occupationsPro/{id}` |
| Domaine personnel réservé | Firestore → `domaines/{hostname}` |

Le webhook n'est pas encore créé côté Stripe au moment d'écrire ces lignes : la
marche à suivre, une seule fois, après le premier déploiement des fonctions :

```bash
firebase deploy --only functions:creerAbonnementProfilPro,functions:webhookProfilPro,functions:portailProfilPro
```

puis, dans le tableau de bord Stripe (Developers → Webhooks), un nouvel
endpoint sur l'adresse que le déploiement affiche pour `webhookProfilPro`
(le patron est `https://us-central1-le-salon-des-inconnus.cloudfunctions.net/webhookProfilPro`),
avec les trois événements `checkout.session.completed`,
`customer.subscription.updated` et `customer.subscription.deleted`. Le secret
de signature que Stripe donne à cet instant se pose avec :

```bash
firebase functions:secrets:set STRIPE_WEBHOOK_PRO_SECRET
```

Le compte Stripe du Salon sert plusieurs projets à la fois et Stripe envoie
chaque événement à tous les endpoints du compte. Le filtre ici n'est pas un
identifiant de lien de paiement (il n'y a pas de lien fixe : chaque abonnement
ouvre sa propre session Checkout) mais `metadata.projet`, posé sur le client,
la session ET l'abonnement Stripe eux-mêmes, sous la valeur `creator-studio-pro`.
Un événement qui ne porte pas cette métadonnée repart en succès sans être
traité, exactement comme le camping ignore ce qui n'est pas son propre lien.

### Le nom de domaine personnel d'un artiste

Le branchement d'un domaine que l'artiste possède déjà est un geste manuel
d'Alex dans la console Firebase du projet `le-salon-des-inconnus`, section
Hosting → Ajouter un domaine personnalisé, sur le site `inconnus-salon`. C'est
cette console, et seulement elle, qui produit les enregistrements DNS exacts
(un enregistrement A et un enregistrement TXT de validation) à donner à
l'artiste pour son registraire : ils n'existent qu'une fois le domaine ajouté
là, personne ne peut les deviner ni les préparer à l'avance. Une fois le
domaine ajouté dans la console et les enregistrements propagés (24 à 48 heures
en général), poser `verifie: true` sur le document `domaines/{hostname}`
correspondant dans Firestore referme la boucle côté application.

## Le reste du site

| Quoi | Où |
|---|---|
| Square (paiements du Ceilidh et des billets de spectacle) | `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, plus `VITE_SQUARE_APP_ID` et `VITE_SQUARE_LOCATION_ID` |
| HostAway (disponibilités, calendrier, prix) | Secret Manager → `HOSTAWAY_API_KEY`, `HOSTAWAY_ACCOUNT_ID` |
| Zoho SMTP (tous les avis envoyés à Alex) | Secret Manager → `ZOHO_USER`, `ZOHO_PASS` |
| Gemini | `.env.local` → `VITE_GEMINI_API_KEY` |
| Firebase (client) | `.env.local` → les sept `VITE_FIREBASE_*` |
