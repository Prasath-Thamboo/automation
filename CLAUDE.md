# Tando — guide du dépôt

Plateforme d'**employés virtuels** pour très petites entreprises (restaurant, cabinet
dentaire, garage, salon, agence immobilière, artisan…). Voir `prompt-claude-code-tando.md`
pour le cahier des charges complet et la roadmap (§10).

## Règle absolue — vocabulaire client (§2 du cahier des charges)

Tout ce que **le client lit** (landing, application, emails, devis, factures) suit la
métaphore de **l'embauche d'un collaborateur**, sans jamais la rompre.

**Interdit dans une interface cliente :** agent IA, agent, LLM, prompt, modèle, token,
workflow, orchestration, RAG, embedding, fine-tuning, API, intégration, automatisation,
pipeline, IA générative, chatbot.

**À la place :** voir `packages/copy/src/glossary.ts`. Exemples : « votre employé virtuel »,
« sa fiche de poste », « son carnet de bord », « le former », « le mettre en pause »,
« son contrat », « ce qu'il a fait aujourd'hui ».

- Tous les libellés clients vivent dans **`@tando/copy`**. Aucune chaîne « en dur » dans
  l'UI web ou mobile.
- Le back-office et le code (DB, docs techniques) utilisent le vocabulaire technique normal.
- Un test échoue si un terme interdit apparaît dans `packages/copy` ou `apps/web`
  (`packages/copy/src/blacklist.test.ts`).

## Marque

**Tando** — toujours avec une majuscule initiale, jamais en capitales, jamais suivi d'un
suffixe (pas de « Tando AI », « Tando App »…). Baseline officielle :
**« Tando — votre employé virtuel, 24h/24, 7j/7. »**
On ne décline pas la marque (pas de « l'IA de Tando », pas de mascotte, pas de logo robot).
Identifiants techniques : préfixe `@tando/` (paquets), `tando` (DB), `TANDO_` (env non
préfixées `NEXT_PUBLIC_`/`EXPO_PUBLIC_`).

## Structure du monorepo

```
apps/
  api/     NestJS — API REST /api/v1, contrat unique (web + mobile + back-office). Prisma, BullMQ.
  web/     Next.js 15 (App Router) — landing, catalogue, questionnaire, espace client,
           back-office sur /admin (rôle protégé).
  mobile/  Expo (React Native) — iOS + Android, une seule base de code. Canal principal
           d'usage quotidien (voir §6bis). Squelette au Lot 0.
packages/
  types/       Schémas Zod partagés (contrat). Source de vérité des formes de données.
  api-client/  Client HTTP typé, consommé par web ET mobile. Aucune règle métier.
  copy/        Tous les textes clients + garde anti-jargon (§2).
  ui/          Composants web (React 19).
  ui-native/   Thème + composants mobile (React Native).
  config/      Tokens de design, preset Tailwind, configs ESLint/TS partagées.
```

**L'API est le contrat unique.** Toute règle métier vit dans `apps/api`. Si une logique
doit être réécrite dans `apps/mobile`, c'est qu'elle est au mauvais endroit.

## Démarrer en local

Prérequis : Node ≥ 22, pnpm 11, Docker.

```bash
pnpm install
cp .env.example .env            # ajuster SESSION_SECRET
pnpm db:up                      # postgres, redis, minio, mailpit (docker compose)
pnpm db:migrate:deploy          # applique les migrations Prisma
pnpm db:seed                    # compte de démo : patron@demo.tando.local
pnpm dev                        # api (:3333) + web (:3000)
```

- Emails de dev : mailpit sur http://localhost:8025 (le lien magique y arrive).
- Doc OpenAPI : http://localhost:3333/api/docs
- Mobile : `pnpm --filter @tando/mobile dev` (Expo). `EXPO_PUBLIC_API_URL` doit pointer
  vers l'IP de la machine sur un appareil réel.

### Commandes

| Commande | Effet |
|---|---|
| `pnpm dev` | api + web en watch |
| `pnpm build` / `pnpm lint` / `pnpm typecheck` / `pnpm test` | via Turborepo, tout le workspace |
| `pnpm db:up` / `pnpm db:down` | services Docker |
| `pnpm db:migrate` | crée + applique une migration (dev) |
| `pnpm db:migrate:deploy` | applique les migrations existantes |
| `pnpm db:seed` / `pnpm db:studio` | seed / Prisma Studio |

## Conventions de code

- **TypeScript strict partout.** `noUncheckedIndexedAccess` actif : indexer un tableau
  peut renvoyer `undefined`, gère-le.
- **Zod = source de vérité.** Les types partagés sont inférés depuis les schémas de
  `@tando/types`. L'API valide les entrées avec (voir `ZodValidationPipe`).
- **Erreurs orientées action (§9.5).** Tout message d'erreur destiné au client dit *quoi
  faire*, jamais le détail technique. Forme normalisée `ApiError`
  (`{ statusCode, error, message, fields? }`) — voir `apps/api/src/common/http-exception.filter.ts`.
- **Multi-organisation.** Toute table métier porte `organizationId`. L'isolation passe par
  `forOrganization()` (`apps/api/src/prisma/tenant.ts`), jamais par un filtre ajouté à la
  main dans chaque requête.
- **Documents comptables immuables.** Jamais de update/delete sur factures/avoirs : on émet
  un avoir. Soft delete (`deletedAt`) ailleurs.
- **Audit.** Toute action sensible passe par `AuditService.record()` (sans donnée
  personnelle en clair).
- **Auth.** Lien magique par email en priorité. Web : cookie httpOnly posé par le serveur
  Next à partir du jeton renvoyé par `/auth/verify`. Mobile : jeton en `expo-secure-store`,
  envoyé en `Authorization: Bearer`. Jetons stockés uniquement hashés (SHA-256).
- **Packages partagés.** `@tando/types` et `@tando/ui` sont compilés vers `dist/`
  (`pnpm build` via Turborepo, tâche `^build`). Les autres sont consommés en source.
- **Pas de couplage à un fournisseur de modèle.** Le moteur « employé virtuel » sera isolé
  derrière `AssistantRuntime` (Lot 6). Rien d'autre ne dépend d'un fournisseur.
- Décorateurs NestJS : garder des imports de **valeur** (pas `import type`) pour tout ce qui
  est injecté (contrainte `emitDecoratorMetadata`). La règle `consistent-type-imports` est
  désactivée dans `apps/api`.

## Décisions prises (Lot 0)

- **Back-office = section `/admin` de `apps/web`** (pas d'app séparée) : même déploiement,
  même client API.
- **Isolation multi-tenant** par garde applicative (extension Prisma), pas de RLS Postgres
  pour le MVP.
- **Emails** : nodemailer → SMTP (mailpit en dev). Envoyés via la file BullMQ `mail`.
- **`@types/react`** épinglé en 19.0.x pour tout le monorepo (`pnpm-workspace.yaml` →
  `overrides`) sinon Next et RN chargent deux namespaces React globaux incompatibles.
- **Facturation mobile** : à trancher au Lot 9, derrière une abstraction `BillingProvider`
  (Stripe hors app vs RevenueCat). Ne pas trancher seul.

## État de la roadmap

- **Lot 0 — Fondations : fait.** Monorepo, Docker Compose, Prisma + schéma initial
  (organisations, users, memberships, magic_links, sessions, audit_logs), auth par lien
  magique (API + web + squelette mobile), design tokens, `packages/*`, CI. `pnpm dev`
  démarre tout, la connexion par lien magique fonctionne de bout en bout.
- **Lot 1 — Vitrine : fait.** Landing avec les textes du §8 (hero, problème, solution,
  « depuis votre poche », les deux voies, rassurance, CTA final), `/tarifs` (§7, prix
  provisoires dans `@tando/copy/offers`), `/faq` (+ données structurées FAQPage),
  `/mentions-legales`, `/cgv`, `/confidentialite`, `/cookies` (identité de l'éditeur en
  `[À COMPLÉTER]` — à renseigner avant mise en ligne), bandeau cookies CNIL. Pages relais
  `/employes-virtuels` (Lot 2), `/questionnaire` (Lot 3), `/contact`. SEO : `metadata` +
  canoniques, `sitemap.ts`, `robots.ts`, `app/icon.svg`, `opengraph-image`, JSON-LD
  Organization. Polices : Inter + Bricolage Grotesque via `next/font`. Tout en Tailwind
  (preset `@tando/config`), mobile-first, texte 16px min, cibles 44px.
- **Lot 2 — Catalogue : fait.** Modèle `professions` / `assistant_templates` /
  `assistant_template_versions` (contenu de fiche versionné en JSON, validé par
  `templateContentSchema`). API publique `GET /catalog/professions` (+ filtres secteur /
  besoin) et `GET /catalog/professions/:slug`. Back-office `/admin` (rôle `admin`, garde
  `AdminGuard` + layout qui `notFound()` sinon) : créer un métier, éditer la fiche section
  par section, enregistrer en brouillon, publier (archive la version précédente), masquer,
  supprimer — sans redéploiement. Web : `/employes-virtuels` (grille + filtres),
  `/employes-virtuels/[slug]` (fiche §5.1 en 8 parties, démo jouable pré-scriptée, curseurs
  de gain). 6 métiers seedés et publiés. Le personnel Tando se connecte avec
  `staff@tando.fr` (membre `admin` d'une organisation interne « Tando »).
- Lots 3 → 11 : voir `prompt-claude-code-tando.md` §10.

### Notes Lot 2

- Le back-office (`apps/web/app/admin/**`) utilise le vocabulaire technique normal (§2) :
  il est **exclu** du test anti-jargon (`packages/copy/src/blacklist.test.ts`).
- Types du catalogue : interfaces écrites à la main dans `packages/types/src/catalog.ts`
  (schémas Zod annotés `z.ZodType<...>`), pour éviter que `z.infer` sur des structures
  profondes ne produise des types géants (erreur TS2719 aux frontières de paquets).
- `apps/api` : arrêter le serveur avant `pnpm build` / `prisma generate` — sinon la DLL
  du moteur Prisma est verrouillée sous Windows (EPERM).

### À renseigner avant mise en ligne du site public (Lot 1)

`packages/copy/src/legal.ts` (`legalIdentity`) : raison sociale, forme juridique, capital,
SIREN, RCS, TVA intracom, siège social, directeur de publication, hébergeur, médiateur
conso. `packages/copy/src/site.ts` : téléphone du support. `packages/copy/src/offers.ts` :
prix définitifs (sinon repris tels quels du §7).
