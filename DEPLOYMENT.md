# Déploiement — Tando

Monorepo Turborepo/pnpm. Trois livrables : **API** (`apps/api`, NestJS),
**web** (`apps/web`, Next.js 15), **mobile** (`apps/mobile`, Expo — voir
`apps/mobile/store/README.md`, hors de ce document).

À lire avec `SECURITY.md` et le §9.4 du cahier des charges.

## 1. Services managés (région UE)

| Service | Usage | Contrainte |
|---|---|---|
| PostgreSQL 16 | base primaire | **région UE**, chiffrement au repos activé, sauvegardes |
| Redis 7 | files BullMQ (`mail`, `billing`, `push`, `quote-lifecycle`, …) | UE, persistance activée |
| Stockage S3-compatible | documents (factures/devis HTML, exports RGPD) | **région UE**, bucket privé |
| SMTP | emails transactionnels (lien magique, devis, factures) | fournisseur UE |

Aucune donnée client ne doit transiter hors UE.

## 2. Variables d'environnement (production)

Injectées par la plateforme (pas de fichier `.env` en prod). Référence complète
et valeurs de dev : `.env.example`. Points d'attention en production :

| Variable | Valeur prod |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Postgres managé UE (`sslmode=require`) |
| `REDIS_URL` | Redis managé UE (`rediss://`) |
| `SESSION_SECRET` | **≥ 32 caractères aléatoires** (`openssl rand -hex 32`), secret unique |
| `API_URL` / `WEB_ORIGIN` / `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_API_URL` | URLs HTTPS réelles ; `WEB_ORIGIN` = origine(s) exacte(s) du site |
| `API_DOCS_ENABLED` | **non défini** (⇒ `/api/docs` fermée) — ou `false` |
| `RATE_LIMIT_DISABLED` | **non défini / `false`** (le démarrage échoue si `true` en prod) |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_TTL_SECONDS` | ajuster selon la charge (défaut 120 / 60 s) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `MAIL_FROM` | SMTP réel (`SMTP_SECURE=true` si port 465) |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_FORCE_PATH_STYLE` | stockage objet UE |
| `PAYMENT_PROVIDER` | `stripe` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | clés live ; endpoint webhook = `POST /api/v1/webhooks/payments` |
| `VAT_RATE_PCT` | taux de TVA applicable (défaut 20) |
| `SELLER_NAME` / `SELLER_LEGAL` / `SELLER_ADDRESS` | **identité vendeur réelle** (figée dans chaque facture) — cf. §5 |
| `BILLING_PROVIDER` | `out-of-app` (Stripe hors application, décision Lot 9) |
| `BILLING_MANAGE_URL` / `BILLING_MANAGE_HINT` | URL de gestion du contrat côté web |
| `ASSISTANT_RUNTIME` | `rules` (défaut) |
| `INBOUND_SECRET` | secret fort (protège `POST /api/v1/inbound/:publicId`) |
| `PUSH_ENABLED` | `true` |
| `EXPO_PUSH_URL` / `EXPO_ACCESS_TOKEN` | API Expo Push (jeton d'accès recommandé) |
| `MOBILE_DEEP_LINK_SCHEME` | `tando` |

`docker-compose.yml` et les variables `*_HOST_PORT` ne servent **qu'au
développement local**.

## 3. Build

Prérequis : Node ≥ 22, pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm build            # turbo : packages ^build puis apps/api (prisma generate + nest build) et apps/web (next build)
```

Artefacts : `apps/api/dist/`, `apps/web/.next/`. `@tando/types` et `@tando/ui`
sont compilés vers `dist/` ; les autres packages sont consommés en source
(le runtime doit embarquer tout le monorepo, pas seulement `apps/*/dist`).

## 4. Migrations

À chaque déploiement, **avant** de démarrer la nouvelle version de l'API :

```bash
pnpm --filter @tando/api exec prisma migrate deploy
```

`prisma migrate deploy` n'applique que des migrations existantes (pas de
génération, pas de reset). Ne **jamais** lancer `migrate reset` ou `db push` en
production. Pas de `db:seed` en production.

## 5. Démarrage

```bash
# API (port = API_PORT, défaut 3333) — traite aussi les workers BullMQ in-process
node apps/api/dist/main.js

# Web (port 3000)
pnpm --filter @tando/web start
```

- L'API a besoin de `trust proxy` (déjà activé) : la placer derrière un reverse
  proxy / load balancer qui termine le TLS et transmet `X-Forwarded-*`.
- Réponses JSON compressées (`compression`) — si le proxy compresse déjà, c'est
  inoffensif.
- `enableShutdownHooks` est actif : envoyer `SIGTERM` pour un arrêt propre
  (drain des files).
- Les jobs répétables (résumé quotidien push, cycle de vie des devis, abonnement
  mensuel) sont réenregistrés au démarrage — un seul jeu d'instances API suffit ;
  si plusieurs, BullMQ dédoublonne par `jobId`.

## 6. Avant la première mise en ligne — `[À COMPLÉTER]`

- **`packages/copy/src/legal.ts`** (`legalIdentity`) : raison sociale, forme
  juridique, capital, SIREN, RCS, TVA intracommunautaire, siège social, directeur
  de publication, hébergeur, médiateur conso.
- **`packages/copy/src/site.ts`** : téléphone du support.
- **`packages/copy/src/offers.ts`** : prix définitifs (sinon repris du §7).
- **`SELLER_NAME` / `SELLER_LEGAL` / `SELLER_ADDRESS`** (env) : identité vendeur
  figée dans les factures.
- `security@tando.fr` : créer l'adresse (cf. `SECURITY.md`).
- Registre des traitements, politique de confidentialité relue, DPA type,
  bandeau cookies conforme CNIL (déjà en place, à valider juridiquement).

## 7. Observabilité & alertes

### Sondes
| Endpoint | Usage | Réponse |
|---|---|---|
| `GET /api/v1/health/live` | **liveness** (le process répond) — ne touche aucune dépendance | 200 `{ status, uptimeSeconds }` |
| `GET /api/v1/health` | **readiness** (base + Redis) | 200 si sain, **503** si dégradé (corps `{ status:"degraded", checks }`) |

Brancher la liveness sur le redémarrage d'instance, la readiness sur le retrait
du load balancer + une alerte.

### Journaux
- **Une ligne par requête** (`RequestLoggerMiddleware`) : `MÉTHODE chemin -> statut durée`.
  Chemin seul, jamais la query string (jetons). `warn` si ≥ 400 ou lent, `error`
  si ≥ 500. `REQUEST_LOG_ENABLED`, `SLOW_REQUEST_MS` (1000).
- **5xx** : `HttpExceptionFilter` journalise le message + la stack en `error`.
- **Crash non géré** : `unhandledRejection` / `uncaughtException` → `error`
  (+ `exit(1)` pour le second).
- **Files BullMQ** : échecs journalisés en `warn` ; `removeOnFail` conserve les
  jobs échoués pour inspection ; `attempts` + backoff exponentiel.
- Rediriger stdout/stderr vers un agrégateur (JSON via la plateforme si possible).

### Alertes recommandées
- readiness `/health` en 503 plus de N minutes ;
- taux de 5xx > seuil (depuis les lignes `error` du logger de requêtes) ;
- taux de requêtes `(lent)` en hausse ;
- pic d'échecs de jobs BullMQ ;
- échec du webhook de paiement (`POST /webhooks/payments` — déjà journalisé,
  idempotent via `webhook_events`).

### Différé
Métriques Prometheus `/metrics`, tracing distribué / APM. Le schéma Prisma est
déjà largement indexé (jetons `@unique`, `@@index` sur `organizationId` /
`status` / clés composites des listes).

## 8. CI

`.github/workflows/ci.yml` : job `verify` (lint / typecheck / test / build) +
job `e2e` (services docker + Playwright, upload du rapport) + bloc `e2e-mobile`
commenté (Maestro, à activer au 1er build EAS). Le CD (build image, migrations,
déploiement) est à câbler selon la plateforme cible.

## 9. Rollback

- Code : redéployer l'artefact précédent.
- Base : les migrations Prisma ne sont pas réversibles automatiquement. Prévoir
  une restauration depuis sauvegarde ; écrire des migrations rétrocompatibles
  (ajout de colonnes nullable, pas de suppression immédiate).
