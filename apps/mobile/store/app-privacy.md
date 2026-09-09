# App Store — App Privacy (Lot 9)

Réponses au questionnaire « App Privacy » d'App Store Connect. Fondées sur ce que
l'application **envoie et reçoit réellement** (voir `apps/api` et
`packages/api-client`). Le vocabulaire ici est technique : fiche interne, jamais
vue par le client.

## Suivi (tracking)

**Non.** L'application ne suit pas les utilisateurs entre apps ou sites, ne
partage aucune donnée avec des courtiers, n'intègre ni SDK publicitaire ni SDK
d'analyse tiers. `NSPrivacyTracking` = false, `NSPrivacyTrackingDomains` vide.

## Données collectées

| Type (catégorie Apple)            | Collectée | Liée à l'identité | Usage                        | Suivi |
|-----------------------------------|-----------|-------------------|------------------------------|-------|
| Adresse e-mail (Contact Info)     | Oui       | Oui               | Fonctionnement de l'app, authentification | Non |
| Nom (Contact Info)                | Oui       | Oui               | Fonctionnement de l'app      | Non   |
| Contenu utilisateur (Customer Support / Other User Content) : consignes, réponses aux escalades | Oui | Oui | Fonctionnement de l'app | Non |
| Identifiant d'appareil pour notifications (Identifiers → Device ID) : jeton push Expo/APNs | Oui | Oui | Fonctionnement de l'app (notifications) | Non |
| Identifiants de diagnostic / plantage | Non    | —                 | —                            | —     |
| Localisation                      | Non       | —                 | —                            | —     |
| Contacts, photos, calendrier de l'appareil | Non | —              | —                            | —     |
| Données financières / de paiement | Non (l'app n'encaisse rien ; paiement géré sur le web) | — | — | — |
| Données d'usage / analytics       | Non       | —                 | —                            | —     |

## Détail par donnée

- **E-mail** : saisi à la connexion par lien magique. Sert à identifier le compte
  et à envoyer le lien. Stocké côté serveur ; jamais partagé.
- **Nom** : affiché dans l'espace, modifiable depuis « Mon compte ».
- **Consignes et réponses aux escalades** : saisies (clavier ou dictée) par le
  patron, transmises à l'API, rattachées à l'employé virtuel de l'organisation.
- **Jeton de notification** : enregistré via `POST /me/push-tokens` pour envoyer
  les alertes (escalade, souci de paiement, résumé quotidien). Désactivé
  automatiquement s'il devient invalide ; supprimé à la déconnexion.
- **Dictée vocale** : la reconnaissance vocale est faite par le système
  d'exploitation (`expo-speech-recognition`). Tando ne reçoit que le **texte**
  transcrit, comme si l'utilisateur l'avait tapé. Aucun enregistrement audio
  n'est envoyé ni conservé.

## Suppression du compte

Exigence App Store 5.1.1(v) : la suppression est accessible **dans
l'application**, écran « Mon compte » → « Fermer définitivement le compte »
(`POST /me/account/delete`). Elle ferme l'organisation, met fin au contrat et
révoque les sessions.

## Manifeste de confidentialité (PrivacyInfo.xcprivacy)

Déclaré dans `app.json > ios.privacyManifests` :

- API à raison d'accès : **User Defaults** — motif `CA92.1` (accès aux
  préférences du groupe d'app par le widget « mise en pause »).
- Aucune autre API à raison d'accès requise (pas de `FileTimestamp`,
  `SystemBootTime`, `DiskSpace` côté code applicatif).
