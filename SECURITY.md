# Sécurité — Tando

État de la posture de sécurité et audit du Lot 11. Se lit avec le §9.4 du cahier
des charges (`prompt-claude-code-tando.md`).

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
  accès réservé au rôle `admin` (personnel Tando).
- **Prouvé par test** : `e2e/tests/isolation-multi-tenant.spec.ts` (un client ne
  peut ni lire ni agir sur l'employé virtuel d'un autre ; accès non authentifié
  refusé).

### Entrées & sorties
- **Validation stricte** : tout corps de requête passe par un schéma Zod
  (`ZodValidationPipe`). Source de vérité des formes : `@tando/types`.
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
- **Prouvé par test** : `e2e/tests/securite.spec.ts`.

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
  logs applicatifs masquent les adresses (`st***@tando.fr`).

### Documents comptables
- Factures / avoirs **jamais modifiés** : numérotation séquentielle inaltérable,
  correction par avoir. Soft delete (`deletedAt`) ailleurs.

### RGPD dans le produit (§9.4)
- Export complet et suppression de compte **depuis le web** (`/mon-equipe/compte`)
  **et le mobile** (`app/(app)/compte.tsx`). Suppression à double confirmation,
  réservée au titulaire, invalide session navigateur + jeton d'API.
- **Prouvé par test** : `e2e/tests/rgpd-compte.spec.ts`.

### Secrets
- `.env`, `.env.local`, `.env.*.local`, `apps/mobile/credentials/` sont
  git-ignorés. Seuls les `*.env.example` sont versionnés. Aucun `.env` suivi.

### Doc OpenAPI
- `/api/docs` : ouverte hors production, **fermée en production** par défaut
  (`API_DOCS_ENABLED` pour forcer). `env.test.ts` couvre la résolution.

## Dette suivie / à faire

| Sujet | État | Piste |
|---|---|---|
| **CSP complète côté web** | en-têtes de base seulement | CSP stricte avec nonce par requête (middleware Next), passer `frame-ancestors 'none'`, `script-src 'self' 'nonce-…'` |
| **Durées de conservation + purge automatique** (§9.4) | non implémenté | colonnes de rétention configurables + job BullMQ de purge (assessments abandonnés, magic links, sessions expirées, logs anciens) |
| **Hébergement UE + chiffrement au repos** | responsabilité infra | Postgres/Redis/S3 managés en région UE, chiffrement au repos activé — voir `DEPLOYMENT.md` |
| **Scan de secrets en CI** | absent | `gitleaks` en job CI |
| **Registre des traitements, DPA type** | hors code | documents juridiques à produire |
| **Identité légale** | `[À COMPLÉTER]` | `packages/copy/src/legal.ts`, `SELLER_*` — cf. `DEPLOYMENT.md` |
| **En-têtes sur build EAS mobile** | n/a (app native) | vérifier ATS iOS / `usesCleartextTraffic` Android au build |

## Signaler une vulnérabilité

Écrire à `security@tando.fr` (à créer). Ne pas ouvrir d'issue publique.
