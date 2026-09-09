# Widget « mise en pause » (§6bis, point 6)

But : mettre l'employé virtuel en pause / le remettre au travail **en deux
tapotements**, depuis l'écran d'accueil, sans ouvrir l'app.

## État : pont JS en place, cible native à compiler

Le widget est une **cible native** (iOS WidgetKit en Swift, Android Glance /
RemoteViews en Kotlin). Elle se compile via un build EAS — impossible à vérifier
dans l'environnement de dev headless.

Fait au Lot 9 :

- **Pont JS** : `apps/mobile/src/widget-bridge.ts` — `syncWidget(team)` publie
  l'état de l'équipe (`label` + `working`) dans le conteneur partagé via le
  module natif optionnel `TandoWidgetBridge`, avec repli sur le cache local
  quand le module est absent. Appelé depuis `app/(app)/equipe.tsx` à chaque
  état d'équipe reçu.
- **Entitlement App Group** `group.fr.tando.app` déclaré dans
  `app.json > ios.entitlements` + manifeste de confidentialité User Defaults.
- **Copy** : `mobileWidget` dans `@tando/copy`.

Reste à faire au 1er build EAS : ajouter `@bacons/apple-targets` (iOS) + le
plugin Android, implémenter le module natif `TandoWidgetBridge`
(`set(group, key, value)`) et les vues du widget, câbler l'entitlement côté
Android (`SharedPreferences`).

## Mécanique prévue

1. **Donnée partagée.** L'app écrit l'état de l'équipe (nom + `state` du 1er
   assistant, ou un agrégat « au travail / en pause ») dans un conteneur
   partagé :
   - iOS : App Group `group.fr.tando.app` → `UserDefaults(suiteName:)`.
   - Android : `SharedPreferences` du package, lues par le `GlanceAppWidget`.
   L'écriture se fait dans `src/widget-bridge.ts` (à ajouter au Lot 9) après
   chaque `pause` / `resume` / `today`.
2. **Affichage.** Une ligne : « Au travail » / « En pause » + un bouton.
3. **Action.** Le bouton ouvre un deep link :
   - `tando://(app)/equipe?do=pause` / `?do=resume`
   L'app traite le paramètre au démarrage (`app/(app)/equipe.tsx`), appelle
   `api.me.pauseAssistant` / `resumeAssistant`, puis met à jour la donnée
   partagée. (Une action « background » sans ouverture d'app viendra plus tard ;
   le MVP ouvre l'app une fraction de seconde.)

## Plugin de build

Ajouter au Lot 9 `@bacons/apple-targets` (iOS) + un plugin Android maison ou
`expo-apple-targets` équivalent, déclarés dans `app.json > plugins`, avec
l'entitlement App Group des deux côtés (`ios.entitlements` +
`app.json > ios.appleTeamId`).

Textes du widget : `mobileWidget` dans `@tando/copy` (`packages/copy/src/mobile.ts`).
