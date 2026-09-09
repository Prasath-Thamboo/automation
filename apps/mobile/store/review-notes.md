# Notes pour la revue (App Review / Play review) — Lot 9

À coller dans le champ « Notes » d'App Store Connect et de la Play Console.

## Compte de démonstration

```
E-mail : patron@demo.tando.local
Connexion : lien magique par e-mail (channel "mobile" → tando://verifier?token=).
En environnement de test, le lien magique est disponible sur la boîte de
démonstration fournie séparément (Mailpit / adresse de revue).
```

Si l'équipe de revue ne peut pas recevoir l'e-mail : fournir un lien magique
pré-généré valable 24 h via le back-office, ou un jeton de session de test.

## Modèle économique — pas d'achat intégré

Tando est un **service professionnel B2B** : une entreprise souscrit un
abonnement pour doter son activité d'un « employé virtuel » (accueil
téléphonique, prise de rendez-vous). L'abonnement :

- est **souscrit et payé sur le web** (`tando.fr`), avec facture conforme
  (TVA, mentions légales) — nécessaire pour une dépense professionnelle ;
- n'est **jamais vendu ni proposé à l'achat dans l'application** ;
- l'application **n'affiche aucun lien de paiement** (sur iOS, l'écran « Mon
  compte » ne montre qu'un texte : « Gérez votre contrat sur tando.fr », sans
  lien cliquable).

L'application est un **outil de gestion** d'un service acquis ailleurs (cf.
règle App Store 3.1.3(b), services multi-plateformes). Elle ne débloque aucune
fonctionnalité numérique consommée dans l'app contre paiement.

Une abstraction `BillingProvider` est en place côté serveur : si un achat
intégré devait être ajouté plus tard, il passerait par elle sans changer le
reste du produit.

## Suppression du compte dans l'app (App Store 5.1.1(v))

« Mon équipe » → « Mon compte » → section « Fermer le compte » → « Fermer
définitivement le compte ». Double confirmation, puis `POST /me/account/delete` :
ferme l'organisation, met fin au contrat, révoque les sessions. L'export des
données est proposé sur le même écran.

## Permissions

- **Face ID / biométrie** : reverrouillage de l'espace au retour au premier plan.
- **Micro + reconnaissance vocale** : dictée des réponses et des consignes. La
  transcription est faite par l'OS ; aucun audio n'est transmis à Tando.
- **Notifications** : escalades, souci de paiement, résumé quotidien — réglables
  au détail, avec heures de silence.

## Widget « mise en pause »

Widget d'écran d'accueil (WidgetKit / Glance) : affiche l'état de l'employé
virtuel et permet de le mettre en pause via un lien profond
`tando://(app)/equipe?do=pause`. Aucune donnée personnelle affichée hors « au
travail / en pause ».
