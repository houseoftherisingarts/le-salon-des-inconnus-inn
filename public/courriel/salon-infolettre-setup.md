# Mise en route de l'infolettre du Salon des Inconnus

Ce plan réplique pour le Salon le procédé rodé le 26 août 2026 pour le FMM
(voir la mémoire `reference_infolettre_zoho_process`). Le compte Zoho est
distinct (alex@lesalondesinconnus.com), la liste est distincte, le design
est distinct. Rien n'a été envoyé ni configuré côté Zoho : ce document est
un plan, pas une exécution.

## a. Activer Zoho Campaigns pour le compte du Salon

Le compte alex@lesalondesinconnus.com n'a pas encore d'organisation Zoho
Campaigns (Zoho a répondu « You are not a part of any Campaigns service
orgs » à la tentative de self-client). Il faut d'abord visiter
`campaigns.zohocloud.ca` connecté à ce compte : Zoho crée alors une
organisation d'essai gratuite automatiquement. C'est un geste dans le
navigateur, donc réservé à Alex (cette session n'y touche pas).

Une fois l'organisation créée, le scope `ZohoCampaigns.*` du self-client
fonctionnera. Vérifier au passage que le centre de données choisi est bien
Canada (`.zohocloud.ca`) : un compte ouvert sur un autre centre de données
donne `invalid_client` au moment d'échanger le jeton.

## b. Le self-client OAuth

Une fois Campaigns activé :

1. `api-console.zohocloud.ca` → Self Client → Generate Code.
2. Scope exact : `ZohoCampaigns.campaign.ALL,ZohoCampaigns.contact.ALL`
3. Description : `Infolettre Salon des Inconnus`
4. Durée : 10 minutes (le temps d'échanger le code contre un jeton).
5. Échange à `https://accounts.zohocloud.ca/oauth/v2/token` pour obtenir
   un access token et un refresh token. Le refresh token se garde (ex.
   `~/.salon_zoho_refresh`, sur le modèle de `~/.fmm_zoho_refresh`) pour
   re-miner des jetons sans redéranger Alex.

## c. La liste de contacts du Salon

**Source réelle trouvée dans le code du site**, pas à inventer : le repo
Salon a déjà un constructeur d'audience infolettre dans l'admin, dans
`components/admin/NewsletterSection.tsx`. Il combine, dédoublonne et
exporte les courriels de quatre sources Firestore :

| Source | Collection | Activée par défaut |
|---|---|---|
| Inscriptions (`registrations`) | `events/{id}` | ✅ oui |
| Billets vendus (`showTickets`) | `events/ceilidh-mai-2026/showTickets` | ✅ oui |
| WWOOFers (`wwoofers`) | `wwoofers/{uid}` | ⬜ non |
| Affiliés acceptés (`affiliates`) | statut `accepted` | ⬜ non |

Le composant offre trois sorties : copier-coller (pour un champ BCC),
téléchargement CSV, ou un lien `mailto:` (plafonné à 60 adresses, la
plupart des clients de courriel refusant une URL plus longue). Pour Zoho
Campaigns, la sortie utile est le **CSV**.

**Étape pour Alex** : ouvrir l'admin du site (`lesalondesinconnus.com/admin`
→ la section Newsletter), choisir les sources à inclure (`registrations` +
`showTickets` couvrent déjà les gens qui ont un lien réel avec la maison),
télécharger le CSV. Rien dans ce CSV n'est encore dans Zoho : c'est le
point de départ de l'étape d import (point d ci-dessous).

Aucune autre liste de diffusion Salon n'existe dans le vault (pas de
Mailchimp, pas d'export Hostaway des invités passés préparé pour un envoi
de masse, pas de liste Zeffy séparée). Le procès-verbal du conseil du
18 juillet note d'ailleurs qu'un mécanisme de capture de courriel avait
été proposé (Machiavelli) puis mis de côté pour la revue d'août
(Drucker) : il n'existe donc toujours pas de formulaire d'inscription
dédié sur le site public. **À confirmer avec Alex** : veut-il élargir la
première liste avec les anciens invités Hostaway (ceux qui n'ont pas
réservé via Airbnb, pour respecter les conditions d'utilisation
d'Airbnb, cf `feedback_no_private_codes_public` et l'historique de la
réactivation de juin), ou partir seulement des quatre sources déjà
prêtes dans l'admin.

## d. Les étapes d'envoi (une fois Campaigns activé et la liste importée)

1. **Import des contacts.** `POST /api/v1.1/addlistsubscribersinbulk`
   avec `listkey` + `emailids` en liste séparée par des virgules (pas de
   JSON, Zoho le refuse). Puis, dans l'interface, **Contacts → Import
   Contacts → Skip duplicates + Add to Topic = <le sujet de la
   campagne>** (sans ce rattachement au sujet, les contacts importés
   par API sont exclus de l'envoi, « Contacts not associated with the
   topic »).
2. **Contenu.** `createCampaign` refuse l'import de contenu sur un
   compte d'essai. Passer par l'interface : Create Email Campaign →
   Import HTML, en fournissant `infolettre-premiere-lettre.html` de ce
   dossier. Les images (`salon-logo-opaque.png`,
   `salon-photo-principale.jpg`) sont déjà référencées en URLs absolues
   sur le domaine live (`lesalondesinconnus.com/courriel/...`), à
   condition que ce dossier soit déployé sur le site avant l'envoi (voir
   note de déploiement ci-dessous). Si Zoho les laisse tomber malgré
   tout, repasser en ZIP à plat (les mêmes trois fichiers, aucun
   sous-dossier).
3. **Test avant tout envoi.** Test Email à alex@lesalondesinconnus.com
   (dropdown → Add Test Email Address → Create, puis Send), pour
   confirmer que le logo et la photo s'affichent avant de songer à
   envoyer à qui que ce soit d'autre.
4. **Bouton PDF.** Le courriel a déjà son bouton « Télécharger la lettre
   en PDF », qui pointe vers `infolettre-premiere-lettre.pdf` (généré
   par `make_infolettre_salon_pdf.py`, déjà rendu dans ce dossier).
5. **Envoi réel.** Review and Launch → Send Now. Le premier envoi passe
   par « Under Review » (conformité Zoho) avant de partir seul.

## Ce qui bloque, côté Alex

- Visiter `campaigns.zohocloud.ca` connecté au compte du Salon (crée
  l'organisation d'essai).
- Générer le self-client une fois l'organisation active (étape b).
- Décider quelles sources inclure dans la liste et télécharger le CSV
  depuis l'admin du site (étape c) ; dire si les anciens invités
  Hostaway rejoignent la liste.
- Approuver le brouillon de copie (`infolettre-premiere-lettre-brouillon.md`)
  avant tout envoi test.
- Déployer le site (`firebase deploy --only hosting:le-salon-des-inconnus`)
  pour que les images du courriel répondent aux URLs live avant l'envoi
  du test à alex@.

Aucun de ces gestes n'a été fait par cette session : ni navigateur, ni
Zoho, ni déploiement, comme demandé.
