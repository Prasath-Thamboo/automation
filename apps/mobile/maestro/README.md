# Tests end-to-end mobile — Maestro (Lot 11)

Parcours critiques de `apps/mobile` sur appareil réel / émulateur. Complète les
tests Playwright web (`e2e/`).

> Ces flows **ne tournent pas en CI headless** : ils exigent un émulateur Android
> ou un simulateur iOS avec l'app installée. À câbler au premier build EAS.

## Prérequis

1. **Maestro** installé : `curl -Ls "https://get.maestro.mobile.dev" | bash`
2. **L'app installée** sur l'émulateur/simulateur :
   - dev client : `pnpm --filter @tando/mobile ios` / `android`, ou
   - build EAS `preview` installé (`eas build -p android --profile preview`)
3. **La pile back-end joignable depuis l'appareil** :
   ```bash
   pnpm db:up && pnpm db:migrate:deploy && pnpm db:seed
   pnpm --filter @tando/api start          # :3333
   ```
   Depuis un émulateur Android, l'hôte est `10.0.2.2` ; depuis un simulateur iOS,
   `localhost`. L'app lit `EXPO_PUBLIC_API_URL` — la faire pointer vers la même
   adresse que `MAESTRO_API_URL`.
4. **Variables d'environnement** :
   | Variable | Exemple (émulateur Android) |
   |---|---|
   | `MAESTRO_API_URL` | `http://10.0.2.2:3333` |
   | `MAESTRO_MAILPIT_URL` | `http://10.0.2.2:8025` |
   | `MAESTRO_TEST_EMAIL` | `e2e-mobile@tando.local` |

## Lancer

```bash
export MAESTRO_API_URL=http://10.0.2.2:3333
export MAESTRO_MAILPIT_URL=http://10.0.2.2:8025
export MAESTRO_TEST_EMAIL=e2e-mobile@tando.local

pnpm --filter @tando/mobile test:e2e         # = maestro test maestro/flows
# ou un seul parcours :
maestro test apps/mobile/maestro/flows/00-connexion.yaml
```

## Flows

| Fichier | Parcours | Critère |
|---|---|---|
| `flows/00-connexion.yaml` | email → lien magique (`tando://verifier?token=`) → « Aujourd'hui » | connexion mobile de bout en bout |
| `flows/10-aujourdhui.yaml` | écran « Aujourd'hui » (ce qu'il a fait / à valider / à venir) + navigation par onglets | §6bis canal principal |
| `flows/20-escalade.yaml` | « À valider » → ouvrir une question → réponse rapide en un tap → « c'est envoyé » | « escalade traitée en < 15 s, d'une seule main » (enregistre `escalade-15s`) |
| `flows/30-pause-reprise.yaml` | « Mon équipe » → mettre en pause → remettre au travail | pause / reprise |

`common/login.yaml` : sous-parcours de connexion réutilisé (via `runFlow`).
`scripts/magic-token.js` : demande le lien magique à l'API et lit le jeton dans
Mailpit (`runScript`, expose `output.magicToken`).

## Données de test

- `00` et `10` fonctionnent avec un compte neuf (créé à la volée par le lien
  magique — une organisation vide).
- `20-escalade` : le cas nominal exige **une escalade ouverte**. Sans elle, la
  flow valide l'état vide. Pour semer une escalade : souscrire un employé virtuel,
  l'activer, puis `POST /api/v1/me/assistants/:id/simulate` avec un message hors
  périmètre (ex. une question de prix) — l'assistant escalade.
- `30-pause-reprise` : exige **un employé virtuel au travail** (souscription +
  « premier jour » terminés). Sans lui, la flow valide juste l'écran.

## CI

Job à ajouter quand un build EAS `preview` est disponible : runner avec
`reactivecircus/android-emulator-runner`, installer Maestro, télécharger l'APK,
`maestro test`. Voir le bloc commenté dans `.github/workflows/ci.yml`.
