# Widget « mise en pause » (§6bis, point 6)

But : mettre l'employé virtuel en pause / le remettre au travail **en deux
tapotements**, depuis l'écran d'accueil, sans ouvrir l'app.

## État : scaffold

Le widget est une **cible native** (iOS WidgetKit en Swift, Android Glance /
RemoteViews en Kotlin). Elle se compile via un build EAS — impossible à vérifier
dans l'environnement de dev headless. Le câblage natif est fait au **Lot 9**
(publication stores), en même temps que l'icône, l'écran de lancement et les
premiers builds EAS.

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
