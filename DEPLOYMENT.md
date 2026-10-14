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
| `ASSISTANT_RUNTIME` | `rules` (défaut) ou `n8n` |
| `N8N_BASE_URL` | origine de l'instance n8n (ex. `https://n8n.tando.fr`) : l'adresse du flux de chaque employé (back-office → Pilotage) doit s'y trouver. Instance **hébergée dans l'UE** (messages des clients finaux) |
| `N8N_TOKEN` | si `n8n` : **obligatoire**, secret fort partagé dans les deux sens (en-tête `X-Tando-Token`) : vérifié par les nœuds Webhook, présenté par les flux à `/api/v1/n8n/*` |
| `N8N_TIMEOUT_MS` | délai max d'un tour (défaut 15000) ; au-delà → escalade |
| `CHANNEL_SECRET_KEY` | **obligatoire** (`openssl rand -base64 32`) — chiffre adresses de réponse et jetons Meta ; la changer rend illisibles les données déjà chiffrées |
| `CHANNELS_DELIVERY` | `live` |
| `INBOUND_EMAIL_DOMAIN` | domaine de réception (ex. `in.tando.fr`), MX pointé vers Brevo |
| `BREVO_INBOUND_TOKEN` | secret fort, repris dans l'URL du webhook Brevo |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | compte Twilio live |
| `TWILIO_WEBHOOK_BASE_URL` | URL publique de l'API telle que Twilio l'appelle (signature) |
| `META_APP_SECRET` / `META_VERIFY_TOKEN` | application Meta (WhatsApp + Instagram) |
| `PUSH_ENABLED` | `true` |
| `EXPO_PUSH_URL` / `EXPO_ACCESS_TOKEN` | API Expo Push (jeton d'accès recommandé) |
| `MOBILE_DEEP_LINK_SCHEME` | `tando` |

`docker-compose.yml` et les variables `*_HOST_PORT` ne servent **qu'au
développement local**.

### Canaux de réception (Lot 12)

Sans secret configuré en production, le webhook correspondant répond 403.

| Fournisseur | À configurer chez lui |
|---|---|
| **Brevo** (email) | Domaine `INBOUND_EMAIL_DOMAIN` en « Inbound parsing », MX vers Brevo ; webhook `POST https://<api>/api/v1/channels/email/brevo?token=<BREVO_INBOUND_TOKEN>`. Réponses envoyées par le SMTP (`SMTP_*` = relais Brevo) depuis l'adresse de l'assistant : le domaine de réception doit être authentifié (SPF / DKIM) pour l'envoi. |
| **Twilio** (SMS + appels) | Acheter un numéro FR (dossier réglementaire Twilio requis). Sur le numéro : « A message comes in » → `POST …/api/v1/channels/twilio/sms` ; « A call comes in » → `POST …/api/v1/channels/twilio/voice`. Puis back-office → client → Canaux : raccorder le numéro en `sms` et `telephone` (renvoi d'appel facultatif vers le patron). |
| **Meta** (WhatsApp + Instagram) | Application Meta (entreprise vérifiée, revue d'application pour `whatsapp_business_messaging` / `instagram_manage_messages`). Webhook : `https://<api>/api/v1/channels/meta`, jeton de vérification `META_VERIFY_TOKEN`, abonnement aux champs `messages`. Par client : back-office → Canaux, `phone_number_id` (WhatsApp) ou id du compte pro (Instagram) + jeton d'accès longue durée (system user). |

Limites connues : WhatsApp et Instagram n'autorisent une réponse libre que dans
les **24 h** suivant le dernier message du client (au-delà, la remise est
marquée en échec). Les appels ne sont pas encore traités à la voix : renvoi vers
le patron, sinon message vocal + SMS de reprise par écrit.

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
