# Publication sur les stores (Lot 9)

Tout ce qui sert à soumettre `@tando/mobile` sur l'App Store et Google Play.

| Fichier | Contenu |
|---|---|
| `listing-fr.md` | Nom, sous-titre, descriptions, mots-clés, catégories, URL, plan des captures |
| `app-privacy.md` | Réponses « App Privacy » (App Store Connect) |
| `data-safety.md` | Réponses « Sécurité des données » (Play Console) |
| `review-notes.md` | Notes pour l'équipe de revue (compte de démo, modèle B2B sans achat intégré, suppression de compte) |

## Décision produit (Lot 9) — facturation

**Stripe hors application.** L'abonnement se souscrit et se règle sur le web ;
l'app mobile n'encaisse rien et n'affiche aucun lien de paiement cliquable sur
iOS. Seuil de repli : une abstraction `BillingProvider`
(`apps/api/src/billing/subscription/`) permettrait de brancher un achat intégré
(RevenueCat) plus tard sans toucher au reste. Env : `BILLING_PROVIDER=out-of-app`,
`BILLING_MANAGE_URL`, `BILLING_MANAGE_HINT`.

## Ce qui est fait

- **Suppression de compte dans l'app** : « Mon compte » → « Fermer le compte »
  (`app/(app)/compte.tsx` → `POST /me/account/delete`). Export RGPD sur le même
  écran (`GET /me/account/export`, partagé via la feuille de partage système).
- **État du contrat dans l'app** : `GET /me/billing` → `app/(app)/compte.tsx`.
  Texte de renvoi vers le web, sans lien sur iOS.
- **Icône + écran de lancement** : visuels *provisoires* générés par
  `assets/generate-placeholders.mjs` (aplat marque, sans texte). Déclarés dans
  `app.json` (`icon`, `splash`, `android.adaptiveIcon`, icône de notification).
- **`app.json`** : `version` 1.0.0, `buildNumber` / `versionCode` 1,
  `usesNonExemptEncryption: false`, App Group `group.fr.tando.app`
  (entitlement + `privacyManifests` User Defaults `CA92.1` pour le widget).
- **`eas.json`** : profils `submit` `preview` et `production` (TestFlight /
  piste interne Play), avec identifiants en `[À COMPLÉTER]`.
- **Pont widget** : `src/widget-bridge.ts` publie l'état de l'équipe vers le
  conteneur partagé (no-op tant que la cible native n'est pas compilée). Appelé
  depuis `app/(app)/equipe.tsx`.

## À faire avant soumission (hors environnement de dev)

- [ ] **Identité Apple/Google** : renseigner `ios.appleTeamId` (`app.json`),
      `submit.*.ios.appleId` / `ascAppId` / `appleTeamId` et
      `submit.*.android.serviceAccountKeyPath` (`eas.json`).
- [ ] **`extra.eas.projectId`** (`app.json`) : ID du projet EAS réel.
- [ ] **Visuels définitifs** : remplacer `assets/icon.png`,
      `assets/adaptive-icon.png`, `assets/splash-icon.png`,
      `assets/notification-icon.png` par l'identité de marque (pas de robot,
      pas de déclinaison du logo — §Marque).
- [ ] **Captures d'écran** FR sur build `preview` (voir `listing-fr.md`).
- [ ] **Cible native du widget** : ajouter `@bacons/apple-targets` (iOS) + le
      module Android, exposer le module natif `TandoWidgetBridge`
      (`targets/pause-widget/README.md`), compiler au 1er build EAS.
- [ ] **`credentials/play-service-account.json`** : clé de compte de service
      Google Play (non versionnée — voir `.gitignore`).
- [ ] **Boîte e-mail de revue** : préparer l'accès au lien magique pour l'équipe
      App Review (`review-notes.md`).
- [ ] Premier `eas build --profile preview` (iOS + Android), test interne
      TestFlight / Play, puis `eas submit --profile production`.
