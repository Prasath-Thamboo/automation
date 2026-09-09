# Google Play — Data safety (Lot 9)

Réponses au formulaire « Sécurité des données » de la Play Console. Mêmes faits
que `app-privacy.md`, format Google. Fiche interne, vocabulaire technique.

## Résumé

- **Collecte de données** : oui (voir tableau).
- **Partage de données avec des tiers** : non.
- **Chiffrement en transit** : oui (HTTPS/TLS pour tous les appels API).
- **L'utilisateur peut demander la suppression des données** : oui — dans l'app
  (« Mon compte » → « Fermer définitivement le compte ») et sur le web.
- **Engagement Play Families** : sans objet (app professionnelle, pas destinée
  aux enfants).

## Données collectées / partagées

| Donnée                         | Collectée | Partagée | Facultative | Finalité                         |
|--------------------------------|-----------|----------|-------------|----------------------------------|
| Adresse e-mail                 | Oui       | Non      | Non         | Gestion du compte, connexion     |
| Nom                            | Oui       | Non      | Oui         | Fonctionnalités de l'app         |
| ID pour notifications push     | Oui       | Non      | Non         | Notifications (fonctionnalité)   |
| Messages in-app (consignes, réponses aux escalades) | Oui | Non | Non | Fonctionnalités de l'app |
| Contenu audio                  | Non (transcription faite par l'appareil ; seul le texte est envoyé) | — | — | — |
| Position                       | Non       | —        | —           | —                                |
| Informations financières       | Non       | —        | —           | —                                |
| Activité dans l'app / analytics| Non       | —        | —           | —                                |
| Identifiants publicitaires     | Non       | —        | —           | —                                |

## Pratiques de sécurité

- Données chiffrées en transit (TLS).
- Jetons de session stockés dans le trousseau sécurisé de l'appareil
  (`expo-secure-store`), jamais en clair.
- L'utilisateur peut demander la suppression de son compte et de ses données
  depuis l'application.
- Aucune donnée vendue. Aucun SDK publicitaire, aucun SDK d'analyse tiers.
