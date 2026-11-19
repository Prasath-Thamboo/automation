# Sécurité — Velekya

État de la posture de sécurité et audit du Lot 11. Se lit avec le §9.4 du cahier
des charges (`prompt-claude-code-velekya.md`).

## En place

### Authentification & sessions
- **Lien magique** par email (canal `web` ou `mobile`). Aucun mot de passe.
- Jetons de lien magique et de session **stockés hashés** (SHA-256), jamais en clair.
- TTL configurables : `MAGIC_LINK_TTL_SECONDS` (900), `SESSION_TTL_SECONDS` (30 j).
- Web : cookie `httpOnly`, `SameSite=Lax`, `Secure` en production, posé côté
  serveur Next à partir du jeton renvoyé par `/auth/verify` (origines web et API
  distinctes). Mobile : jeton en `expo-secure-store`, envoyé en `Authorization: Bearer`.
- Réponse identique que l'adresse soit connue ou non (`/auth/magic-link`) — pas
  de fuite d'existence de compte.

### Isolation multi-organisation
- Toute table métier porte `organizationId`. L'isolation passe par
  `forOrganization()` (extension Prisma, `apps/api/src/prisma/tenant.ts`), jamais
  par un filtre ajouté à la main.
- Le back-office (`/admin/**`, `AdminGuard`) lit en travers des organisations —
  accès réservé au rôle `admin` (personnel Velekya).
- **Prouvé par test** : `e2e/tests/isolation-multi-tenant.spec.ts` (un client ne
  peut ni lire ni agir sur l'employé virtuel d'un autre ; accès non authentifié
  refusé).

### Entrées & sorties
- **Validation stricte** : tout corps de requête passe par un schéma Zod
  (`ZodValidationPipe`). Source de vérité des formes : `@velekya/types`.
- Erreurs orientées action (`ApiError` normalisée) — le client reçoit *quoi
  faire*, jamais la trace technique.

### Limitation de débit
- Garde globale `ThrottlerGuard` : `RATE_LIMIT_MAX` requêtes /
  `RATE_LIMIT_TTL_SECONDS` par IP (défaut 120 / 60 s).
- Bornes plus strictes sur les points sensibles : `/auth/magic-link` (5/min),
  `/auth/verify` (10/min), `/quotes/:n/accept` & `/refuse` (10/min),
  `/assessments` (5/min), `/inbound/:publicId` (60/min).
- `RATE_LIMIT_DISABLED` (coupe-circuit e2e/dev) est **refusé au démarrage si
  `NODE_ENV=production`** (`env.ts`, `superRefine`).

### En-têtes de sécurité
- **API** : `helmet()` (dont `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: no-referrer`, `X-DNS-Prefetch-Control`, HSTS),
  `X-Frame-Options: DENY`, `x-powered-by` retiré. CORS restreint à
  `WEB_ORIGIN`, `credentials: true`.
- **Web** (`apps/web/next.config.ts`) : `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
  (caméra/micro/géoloc/topics désactivés), `X-DNS-Prefetch-Control: off`,
  `poweredByHeader: false`.
- **CSP web à nonce** (Lot 18, `apps/web/middleware.ts` + `lib/csp.ts`) : nonce
  aléatoire par requête, `script-src 'self' 'nonce-…' 'strict-dynamic'`,
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` (+ Stripe
  Checkout), `connect-src` limité à l'API, `frame-ancestors 'none'` (`*` pour
  `/formulaire/*` seulement), `upgrade-insecure-requests` en production.
  `style-src` garde `'unsafe-inline'` (attributs `style` de React). Coût
  assumé : toutes les pages sont rendues à la demande (`connection()` dans
  `app/layout.tsx`), plus de pages statiques.
- **Prouvé par test** : `e2e/tests/securite.spec.ts` (dont nonce différent à
  chaque requête et aucune violation au chargement), `apps/web/lib/csp.test.ts`.

### CSRF
- L'API n'a **pas d'authentification ambiante** (jeton Bearer explicite) → non
  exposée au CSRF.
- Le web utilise un cookie de session mais les mutations passent par des **Server
  Actions Next** (contrôle d'origine intégré) et le cookie est `SameSite=Lax`.

### Journalisation & audit
- `AuditService.record()` pour toute action sensible. Journal **immuable** (jamais
  d'`update`), un échec d'écriture n'interrompt pas la requête.
- **`metadata` sans donnée personnelle en clair** — audit des 20 sites d'appel :
  uniquement des identifiants, slugs, numéros, montants, compteurs, hashs. Les
  logs applicatifs masquent les adresses (`st***@velekya.fr`).
- **Journal des requêtes** (`RequestLoggerMiddleware`) : méthode + **chemin
  seul**, jamais la query string (elle porte des jetons : devis, lien magique).

### Documents comptables
- Factures / avoirs **jamais modifiés** : numérotation séquentielle inaltérable,
  correction par avoir. Soft delete (`deletedAt`) ailleurs.

### RGPD dans le produit (§9.4)
- Export complet et suppression de compte **depuis le web** (`/mon-equipe/compte`)
  **et le mobile** (`app/(app)/compte.tsx`). Suppression à double confirmation,
  réservée au titulaire, invalide session navigateur + jeton d'API.
- **Prouvé par test** : `e2e/tests/rgpd-compte.spec.ts`.
- **Durées de conservation + purge automatique** (Lot 18, `apps/api/src/retention/`) :
  passage quotidien à 03:00 (file BullMQ `maintenance`), durées réglables
  (`RETENTION_*`, en jours). Liens magiques (7 j après expiration), sessions
  (30 j après expiration / révocation), questionnaires abandonnés (90 j),
  prospects non convertis (3 ans), événements de webhook (90 j), jetons push
  désactivés (30 j), activité des comptes actifs — conversations, escalades
  traitées, rendez-vous passés, questions d'aide (2 ans, `0` = conservée).
  **Compte supprimé** : après 30 j de grâce, employés et toute leur activité,
  missions, questions d'aide et jetons effacés ; utilisateurs sans autre
  entreprise anonymisés ; organisation renommée « Compte supprimé »
  (`purgedAt`). **Jamais purgés** : factures, avoirs, paiements (10 ans,
  identité client figée dedans), devis acceptés et preuve d'acceptation,
  journal d'audit (sans donnée personnelle en clair). Chaque passage est
  tracé (`retention.purged`, compteurs seuls).

### Secrets
- `.env`, `.env.local`, `.env.*.local`, `apps/mobile/credentials/` sont
  git-ignorés. Seuls les `*.env.example` sont versionnés. Aucun `.env` suivi.
- **Scan de secrets en CI** (Lot 18) : job `secrets` — gitleaks sur tout
  l'historique, configuration `.gitleaks.toml` (règles par défaut + liste
  blanche limitée aux valeurs de développement documentées).

### Doc OpenAPI
- `/api/docs` : ouverte hors production, **fermée en production** par défaut
  (`API_DOCS_ENABLED` pour forcer). `env.test.ts` couvre la résolution.

### Canaux de réception (Lot 12)

- Webhooks authentifiés : signature HMAC-SHA1 Twilio (`X-Twilio-Signature`,
  URL publique + paramètres), HMAC-SHA256 Meta (`X-Hub-Signature-256` sur le
  corps brut), jeton secret dans l'URL pour Brevo (qui ne signe pas).
  Comparaisons à temps constant. Sans secret en production : 403.
- Dédoublonnage des évènements rejoués (`webhook_events`, `<fournisseur>:<id>`).
- Adresses de réponse des clients finaux (numéro, email, identifiant Meta) et
  jetons d'accès Meta chiffrés AES-256-GCM (`CHANNEL_SECRET_KEY`) ; la
  conversation n'est indexée que par un hash. Exclues de l'export RGPD.
- **Rotation de clé** (Lot 19) : valeurs préfixées par la version de clé
  (`v<N>.`), trousseau `CHANNEL_SECRET_KEY` + `CHANNEL_SECRET_KEY_PREVIOUS`,
  rechiffrement automatique en tâche de fond — procédure dans `DEPLOYMENT.md` §10.
- Formulaire public : débit limité par IP (15 messages / min), piège à robots,
  seule route du site autorisée en cadre (`frame-ancestors *`).
- Emails entrants : réponses automatiques, listes, rebonds, indésirables et
  boucles (nos propres domaines) ignorés. SMS « STOP » jamais traités.

## Dette suivie / à faire

| Sujet | État | Piste |
|---|---|---|
| **CSP : `style-src 'unsafe-inline'`** | assumé | passer les styles inline en classes si on veut le retirer |
| **Durées de conservation** | durées par défaut, à valider | faire valider les durées (`RETENTION_*`) par un juriste / DPO ; logs applicatifs (stdout) : rétention côté hébergeur |
| **Hébergement UE + chiffrement au repos** | responsabilité infra | Postgres/Redis/S3 managés en région UE, chiffrement au repos activé — voir `DEPLOYMENT.md` |
| **Registre des traitements, DPA type** | hors code | documents juridiques à produire |
| **Identité légale** | `[À COMPLÉTER]` | `packages/copy/src/legal.ts`, `SELLER_*` — cf. `DEPLOYMENT.md` |
| **En-têtes sur build EAS mobile** | n/a (app native) | vérifier ATS iOS / `usesCleartextTraffic` Android au build |

## Signaler une vulnérabilité

Écrire à `security@velekya.fr` (à créer). Ne pas ouvrir d'issue publique.
