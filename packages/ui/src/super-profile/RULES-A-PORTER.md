# Règles à porter dans firestore.rules et storage.rules

Ce que le Profil Pro (bâtisseur A2) demande aux fichiers de règles, prêt à
coller par l'intégration. Rien ici n'est appliqué tout seul : `firestore.rules`
et `storage.rules` sont hors du périmètre d'A2 par consigne du brief, donc ces
blocs attendent la passe de montage.

Un mot sur `superProfile/config` avant les blocs : le brief (section 9) dit
« lisible publiquement seulement si enabled », mais la section 5.7 précise le
mécanisme réel et il prime ici, parce que c'est lui qui rend l'état « en pause »
possible côté page publique : *« la règle de superProfile/config continue de
laisser lire »*. Le contrôle sur `enabled` se fait donc dans `ProfilProPage`
(côté application), pas dans la règle elle-même, exactement comme aujourd'hui.
Seule l'écriture change : elle accepte `proEnabled` en plus de `maestroEnabled`.

## firestore.rules

### 1. `members/{userId}/superProfile/{docId}`, remplace le bloc existant

```js
// Le Profil Pro (proEnabled) ou l'ancien Maestro (maestroEnabled, gardé comme
// synonyme pour ne rien casser) débloquent l'écriture. La lecture reste
// publique sans condition : c'est ProfilProPage qui refuse d'afficher une
// page dont `enabled` est faux, la règle elle-même ne le sait pas.
match /superProfile/{docId} {
  allow read: if true;
  allow write: if request.auth != null
               && request.auth.uid == userId
               && exists(/databases/$(database)/documents/members/$(userId)/admin/flags)
               && (get(/databases/$(database)/documents/members/$(userId)/admin/flags).data.proEnabled == true
                   || get(/databases/$(database)/documents/members/$(userId)/admin/flags).data.maestroEnabled == true);
}
```

### 2. `members/{userId}/agenda/{docId}`, bloc neuf, à ajouter dans `match /members/{userId}`

```js
// L'agenda de CET artiste : lecture publique (le calendrier public en a
// besoin avant même la connexion), écriture par le propriétaire seulement.
match /agenda/{docId} {
  allow read:  if true;
  allow write: if request.auth != null && request.auth.uid == userId;
}
```

### 3. `usernames/{slug}`, remplace la condition `create` du bloc existant

```js
match /usernames/{slug} {
  allow read:   if true;
  allow create: if request.auth != null
                && request.auth.uid == request.resource.data.uid
                && exists(/databases/$(database)/documents/members/$(request.auth.uid)/admin/flags)
                && (get(/databases/$(database)/documents/members/$(request.auth.uid)/admin/flags).data.proEnabled == true
                    || get(/databases/$(database)/documents/members/$(request.auth.uid)/admin/flags).data.maestroEnabled == true);
  allow update: if request.auth != null
                && resource.data.uid == request.auth.uid
                && request.resource.data.uid == request.auth.uid;
  allow delete: if request.auth != null
                && (resource.data.uid == request.auth.uid || isAdmin());
}
```

### 4. `rendezvousPro/{rdvId}` et `occupationsPro/{rdvId}`, blocs neufs, au niveau racine

Port du patron `rendezvous`/`occupations` d'un chantier précédent, avec `artisteUid`
en plus puisqu'un agenda existe par artiste plutôt qu'un seul par site.

```js
match /rendezvousPro/{rdvId} {
  allow read: if isAdmin()
              || (request.auth != null && resource.data.uid == request.auth.uid)
              || (request.auth != null && resource.data.artisteUid == request.auth.uid);
  allow create: if isAdmin()
                || (request.auth != null
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.statut == 'demande'
                    && request.resource.data.creePar == 'client'
                    && request.resource.data.debut > request.time
                    && request.resource.data.keys().hasOnly(
                         ['artisteUid','uid','nom','courriel','debut','fin','duree','statut','salle','note','creePar','createdAt','updatedAt']));
  // La personne qui a réservé n'annule que la sienne ; l'artiste confirme,
  // termine, annule et note en privé les siens.
  allow update: if isAdmin()
                || (request.auth != null
                    && resource.data.uid == request.auth.uid
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['statut','updatedAt'])
                    && request.resource.data.statut == 'annule')
                || (request.auth != null
                    && resource.data.artisteUid == request.auth.uid
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['statut','noteAdmin','updatedAt']));
  allow delete: if isAdmin();
}

// Miroir sans donnée personnelle : lisible par tous, même avant la connexion,
// pour que le calendrier public retire les créneaux déjà pris.
match /occupationsPro/{rdvId} {
  allow read: if true;
  allow create: if isAdmin()
                || (request.auth != null
                    && request.resource.data.debut is timestamp
                    && request.resource.data.fin is timestamp
                    && request.resource.data.fin > request.resource.data.debut
                    && request.resource.data.keys().hasOnly(['artisteUid','debut','fin'])
                    && getAfter(/databases/$(database)/documents/rendezvousPro/$(rdvId)).data.uid == request.auth.uid
                    && getAfter(/databases/$(database)/documents/rendezvousPro/$(rdvId)).data.artisteUid == request.resource.data.artisteUid
                    && getAfter(/databases/$(database)/documents/rendezvousPro/$(rdvId)).data.debut == request.resource.data.debut
                    && getAfter(/databases/$(database)/documents/rendezvousPro/$(rdvId)).data.fin == request.resource.data.fin);
  allow delete: if isAdmin()
                || (request.auth != null && get(/databases/$(database)/documents/rendezvousPro/$(rdvId)).data.uid == request.auth.uid)
                || (request.auth != null && get(/databases/$(database)/documents/rendezvousPro/$(rdvId)).data.artisteUid == request.auth.uid);
  allow update: if isAdmin();
}
```

### 5. `domaines/{hostname}`, bloc neuf, au niveau racine

```js
// hostname (en minuscules, sans protocole ni chemin) est l'id du document.
// Lecture publique : c'est ce qui permet à la racine du site de résoudre un
// domaine personnel vers le bon Profil Pro. `verifie` n'est posé à true que
// par l'admin, une fois le domaine réellement branché dans la console Firebase.
match /domaines/{hostname} {
  allow read: if true;
  allow create: if request.auth != null
                && request.resource.data.uid == request.auth.uid
                && request.resource.data.verifie == false
                && request.resource.data.keys().hasOnly(['uid','slug','creeLe','verifie']);
  allow update: if isAdmin()
                || (request.auth != null
                    && resource.data.uid == request.auth.uid
                    && request.resource.data.uid == request.auth.uid
                    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['slug']));
  allow delete: if isAdmin() || (request.auth != null && resource.data.uid == request.auth.uid);
}
```

### 6. `abonnementsPro/{userId}`, bloc neuf, au niveau racine

```js
// Lecture par le propriétaire (et l'admin) seulement ; écriture par les
// Cloud Functions (Admin SDK) seulement, qui ignorent cette règle de toute
// façon. Aucune porte client, ni en création ni en mise à jour.
match /abonnementsPro/{userId} {
  allow read:  if isAdmin() || (request.auth != null && request.auth.uid == userId);
  allow write: if false;
}
```

## storage.rules

Rien à ajouter. `members/{userId}/superProfile/{allPaths=**}` existe déjà
(lecture publique, écriture propriétaire, image seulement, 25 Mo) et couvre
déjà les deux nouveaux sous-chemins du Profil Pro : `superProfile/oeuvres/*`
(`oeuvreStoragePath`) et `superProfile/livres/*` (`couvertureLivreStoragePath`),
puisque `{allPaths=**}` descend dans n'importe quel sous-dossier.

## Où coller

Les blocs 1 et 2 remplacent/complètent la section `match /members/{userId}`
existante de `firestore.rules`. Le bloc 3 remplace le bloc `usernames`
existant. Les blocs 4, 5 et 6 s'ajoutent au niveau racine, près des autres
collections top-level (`friendships`, `publicRoster`, etc.). Rien à changer
dans `storage.rules`.
