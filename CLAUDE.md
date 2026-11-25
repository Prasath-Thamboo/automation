# Velekya — guide du dépôt

Plateforme d'**employés virtuels** pour très petites entreprises (restaurant, cabinet
dentaire, garage, salon, agence immobilière, artisan…). Voir `prompt-claude-code-velekya.md`
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

- Tous les libellés clients vivent dans **`@velekya/copy`**. Aucune chaîne « en dur » dans
  l'UI web ou mobile.
- Le back-office et le code (DB, docs techniques) utilisent le vocabulaire technique normal.
- Un test échoue si un terme interdit apparaît dans `packages/copy` ou `apps/web`
  (`packages/copy/src/blacklist.test.ts`).

## Marque

**Velekya** — toujours avec une majuscule initiale, jamais en capitales, jamais suivi d'un
suffixe (pas de « Velekya AI », « Velekya App »…). Baseline officielle :
**« Velekya — votre employé virtuel, 24h/24, 7j/7. »**
On ne décline pas la marque (pas de « l'IA de Velekya », pas de mascotte, pas de logo robot).
Identifiants techniques : préfixe `@velekya/` (paquets), `velekya` (DB), `VELEKYA_` (env non
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
  n8n-flows/   Flux n8n génériques des métiers (logique testée → JSON importable).
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
pnpm db:seed                    # compte de démo : patron@demo.velekya.local
pnpm dev                        # api (:3333) + web (:3000)
```

- Emails de dev : mailpit sur http://localhost:8025 (le lien magique y arrive).
- Doc OpenAPI : http://localhost:3333/api/docs
- Mobile : `pnpm --filter @velekya/mobile dev` (Expo). `EXPO_PUBLIC_API_URL` doit pointer
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
  `@velekya/types`. L'API valide les entrées avec (voir `ZodValidationPipe`).
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
- **Packages partagés.** `@velekya/types` et `@velekya/ui` sont compilés vers `dist/`
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
- **Facturation mobile** (tranché au Lot 9) : **Stripe hors application**. L'abonnement se
  souscrit et se règle sur le web ; l'app mobile n'encaisse rien et n'affiche aucun lien de
  paiement cliquable sur iOS. Abstraction `BillingProvider`
  (`apps/api/src/billing/subscription/`) : seul `out-of-app` est implémenté ; `revenuecat`
  (achat intégré) reste réservé derrière la même interface.

## État de la roadmap

- **Lot 0 — Fondations : fait.** Monorepo, Docker Compose, Prisma + schéma initial
  (organisations, users, memberships, magic_links, sessions, audit_logs), auth par lien
  magique (API + web + squelette mobile), design tokens, `packages/*`, CI. `pnpm dev`
  démarre tout, la connexion par lien magique fonctionne de bout en bout.
- **Lot 1 — Vitrine : fait.** Landing avec les textes du §8 (hero, problème, solution,
  « depuis votre poche », les deux voies, rassurance, CTA final), `/tarifs` (§7, prix
  provisoires dans `@velekya/copy/offers`), `/faq` (+ données structurées FAQPage),
  `/mentions-legales`, `/cgv`, `/confidentialite`, `/cookies` (identité de l'éditeur en
  `[À COMPLÉTER]` — à renseigner avant mise en ligne), bandeau cookies CNIL. Pages relais
  `/employes-virtuels` (Lot 2), `/questionnaire` (Lot 3), `/contact`. SEO : `metadata` +
  canoniques, `sitemap.ts`, `robots.ts`, `app/icon.svg`, `opengraph-image`, JSON-LD
  Organization. Polices : Inter + Bricolage Grotesque via `next/font`. Tout en Tailwind
  (preset `@velekya/config`), mobile-first, texte 16px min, cibles 44px.
- **Lot 2 — Catalogue : fait.** Modèle `professions` / `assistant_templates` /
  `assistant_template_versions` (contenu de fiche versionné en JSON, validé par
  `templateContentSchema`). API publique `GET /catalog/professions` (+ filtres secteur /
  besoin) et `GET /catalog/professions/:slug`. Back-office `/admin` (rôle `admin`, garde
  `AdminGuard` + layout qui `notFound()` sinon) : créer un métier, éditer la fiche section
  par section, enregistrer en brouillon, publier (archive la version précédente), masquer,
  supprimer — sans redéploiement. Web : `/employes-virtuels` (grille + filtres),
  `/employes-virtuels/[slug]` (fiche §5.1 en 8 parties, démo jouable pré-scriptée, curseurs
  de gain). 6 métiers seedés et publiés. Le personnel Velekya se connecte avec
  `staff@velekya.fr` (membre `admin` d'une organisation interne « Velekya »).
- **Lot 3 — Devis sur mesure : fait.** Questionnaire de besoin (§4.1) adaptatif, une
  question par écran, barre de progression, sauvegarde à chaque écran, reprise par lien
  magique (`/questionnaire`, `/questionnaire/reprendre`) — parcours anonyme, jeton de
  reprise en `localStorage`. Fiche de poste en langage clair générée depuis les réponses
  (`GET /assessments/current/preview`), corrigeable par le client avant envoi. Moteur de
  chiffrage configurable en base (`pricing_rules` : socle par formule + modules par tâche +
  coefficient de volume + coût de connexion par outil + facteur de complexité admin 0,8-2,0
  avec commentaire obligatoire). Devis numéroté `DEV-AAAA-NNNN`, statuts
  brouillon → en_relecture → envoye → vu → accepte | refuse | expire. Back-office
  `/admin/devis` : relire, ajuster, **envoyer** (jamais automatique). Devis vu par le client
  sur `/devis/[number]?token=` (+ document imprimable `GET /quotes/:number/document`),
  acceptation en ligne **horodatée** (nom, IP, hash SHA-256 du contenu accepté). À
  l'acceptation : compte client créé (organisation + `owner`) et **mission** `a_preparer`
  (§4.3). Relances J+7 / J+21 et expiration J+30 via BullMQ (file `quote-lifecycle`).
- **Lot 4 — Paiement et facturation : fait.** À l'acceptation d'un devis : `Subscription`
  + facture de mise en service. Fournisseur de paiement derrière `PaymentProvider`
  (`PAYMENT_PROVIDER=fake` en dev/CI, `stripe` en prod ; SDK chargé paresseusement).
  Webhook `POST /webhooks/payments` idempotent (`webhook_events`). Factures
  `FAC-AAAA-NNNN`, avoirs `AV-AAAA-NNNN`, numérotation séquentielle inaltérable ;
  **une facture n'est jamais modifiée** — seul son statut / ses horodatages de
  paiement bougent, une erreur se corrige par un avoir. TVA configurable
  (`VAT_RATE_PCT`). Espace documents client (`/mon-equipe/documents` + document HTML
  imprimable par facture). Abonnement mensuel récurrent via BullMQ (file `billing`).
  Back-office `/admin/factures` : liste, avoir, export comptable CSV et FEC. Identité
  vendeur figée dans chaque facture (`SELLER_*`, `[À COMPLÉTER]`).
- **Lot 5 — Espace client et mise en service : fait.**
  - Modèle : `assistants`, `assistant_instructions` (versionnées), `conversations`,
    `messages`, `escalations`.
  - **Embauche** : sur mesure, l'assistant est créé à la volée depuis la mission acceptée (Lot 3) ; prêt à l'emploi, par souscription en libre-service (Lot 16)
    à la première visite de « Mon équipe ».
  - **Premier jour (§5.2)** : `/mon-equipe/assistants/[id]/premier-jour`, 4 écrans
    (informations · spécificités du métier depuis le schéma du modèle · comment il vous
    joint · essai) → « Il peut commencer » → assistant `au_travail`, mission `en_service`,
    email.
  - **Fiche assistant** : carnet de bord (conversations résumées), à valider (escalades
    répondues en ligne), le former (consignes versionnées), ses horaires, pause / reprise.
  - **Mon compte** : coordonnées, membres, contrat, résiliation, **export RGPD** et
    **suppression de compte** depuis le produit (§9.4).
- **Lot 6 — Runtime : fait.**
  - `AssistantRuntime` (interface) dans `apps/api/src/assistants/runtime/`. Le produit ne
    dépend jamais d'un fournisseur de modèle. Implémentations : `rules` (défaut, à
    base de règles, sans LLM) et `n8n` (Lot 13) — choix par `ASSISTANT_RUNTIME`.
  - Capacités MVP : **répondre aux questions courantes** (horaires, adresse, accueil, +
    consignes du patron par recouvrement de mots-clés) et **prendre un rendez-vous**
    (détection d'intention + résolution de créneau → `appointments`). Le reste est stubbé
    en escalade.
  - Garde-fous structurels : prix, urgence, demande d'un humain, ou toute demande non
    cadrée → **escalade** (l'assistant n'invente pas). Chaque tour est journalisé
    (`runtime.replied` / `runtime.escalated`).
  - `POST /me/assistants/:id/simulate` : essai depuis l'espace client (fenêtre de chat,
    premier jour + fiche). Les vraies demandes arrivent par les canaux (Lot 12).
- **Lot 7 — Application mobile, socle : fait.**
  - `apps/mobile` (Expo SDK 52, Expo Router 4). Session : jeton d'API dans
    `expo-secure-store` ; `AuthProvider` (`src/auth.tsx`) expose
    `status: loading | signedOut | locked | unlocked`. Verrou biométrique
    (`expo-local-authentication`, `src/biometric.ts`) : re-verrouillage quand l'app
    revient au premier plan (`AppState`).
  - Connexion par lien magique `channel: "mobile"` → `velekya://verifier?token=`
    (`app/verifier.tsx`). `app/index.tsx` : saisie e-mail → « lien envoyé » ;
    redirige vers `(app)` si une session valide existe déjà.
  - Navigation `(app)` en onglets : **Aujourd'hui** (`GET /me/today` — nouveau :
    ce qu'il a fait aujourd'hui / cette semaine, escalades ouvertes, prochains
    rendez-vous, l'équipe), **Carnet de bord** (conversations résumées, filtre par
    assistant, détail `conversation/[id]`), **Mon équipe** (état, pause / reprise,
    déconnexion). `src/use-query.ts` : rechargement à l'affichage de l'écran et à
    chaque retour dessus (`useFocusEffect`), pull-to-refresh.
  - `src/theme.ts` dérive du thème partagé `@velekya/ui-native` (tokens
    `@velekya/config`). `eas.json` : profils development / preview / production
    (`EXPO_PUBLIC_API_URL` par profil). `app.json` : plugin biométrie, deep links
    `velekya://` + `applinks:velekya.fr`.
  - Nouveau côté API : `GET /me/today` → `TodaySummary` (`@velekya/types`),
    méthode `AssistantService.today()`, client `api.me.today()`.
- **Lot 8 — Application mobile, le cœur : fait.**
  - **À valider** : onglet dédié (`app/(app)/valider.tsx` + `valider/[id].tsx`),
    réponses rapides toutes prêtes, réponse libre au clavier **ou à la voix**,
    envoi en un tapotement. Alimenté par `GET /me/today` (`openEscalations`).
  - **Notifications push** (`expo-notifications`, APNs/FCM via Expo) : modèle
    `PushToken`, file BullMQ `push` + `PushWorker`, client Expo Push maison
    (`apps/api/src/notifications/expo-push.ts`, pas de SDK). Déclenchées à
    l'escalade (`RuntimeService`, si `notify`), à l'échec de paiement
    (`BillingService.markPaymentFailed`) et par un résumé quotidien (job
    répétable horaire → `PushService.runDailySummaryTick`). Jetons morts
    (`DeviceNotRegistered`) désactivés automatiquement.
  - **Réglages** (`app/(app)/reglages.tsx`) : escalades / résumé quotidien
    (+ heure) / échec de paiement, **heures de silence** (fenêtre qui peut
    passer minuit, calcul dans le fuseau de l'appareil —
    `apps/api/src/notifications/quiet-hours.ts`). Modèle `NotificationPreference`
    (défauts si absent), `GET`/`PUT /me/notification-preferences`.
  - **Dictée vocale** (`expo-speech-recognition`, `src/voice.ts` +
    `DictateField`) pour la réponse d'escalade et « Le former »
    (`app/(app)/former/[assistantId].tsx`). Repli clavier si l'appareil ne sait
    pas faire.
  - **Hors ligne partiel** : `use-query.ts` gagne une option `cache` (lecture de
    la dernière réponse hors connexion, badge « dernière version reçue ») ;
    `src/offline-queue.ts` met en file les actions (réponse d'escalade, pause /
    reprise, consigne) et les rejoue dans l'ordre à la reconnexion
    (`src/net.ts` via NetInfo) ; `ConnectivityBanner` global.
  - **Deep links** : une notification route vers le bon écran via `data.screen`
    (`src/notifications.ts` → `useNotificationRouting`) ; `velekya://(app)/equipe?do=pause`
    déclenche la mise en pause (widget / notification).
  - **Widget de mise en pause** : scaffold + plan dans
    `apps/mobile/targets/pause-widget/README.md`. Cible native (WidgetKit /
    Glance) → câblée au premier build EAS du Lot 9.
  - Nouveau côté API : file `push`, `NotificationsModule` (global),
    `PushService` / `NotificationPrefsService`, routes `/me/push-tokens`,
    `/me/push-tokens/remove`, `/me/notification-preferences`. Types
    `packages/types/src/notifications.ts` ; client `api.me.registerPushToken` /
    `removePushToken` / `notificationPrefs` / `updateNotificationPrefs`.
  - Env : `PUSH_ENABLED` (false = ne contacte pas Expo), `EXPO_PUSH_URL`,
    `EXPO_ACCESS_TOKEN`.
- **Lot 9 — Publication sur les stores : fait.**
  - **Décision facturation** : Stripe hors application (voir « Décisions prises »).
    Abstraction `BillingProvider` (`apps/api/src/billing/subscription/` :
    `billing-provider.ts`, `out-of-app-billing.provider.ts`,
    `billing-provider.module.ts` — `@Global()`). `BILLING_PROVIDER=out-of-app`
    (défaut) ; `revenuecat` lève une erreur explicite au démarrage. Env :
    `BILLING_PROVIDER`, `BILLING_MANAGE_URL`, `BILLING_MANAGE_HINT`.
  - Nouveau côté API : `GET /me/billing` → `MobileBillingView`
    (`{ subscription, manage: { url, hint } }`), `AccountService.billingView()`.
    Types `packages/types/src/billing.ts` (`BillingManageHandoff`,
    `MobileBillingView`) ; client `api.me.billing()`.
  - **Mobile — Mon compte** : `app/(app)/compte.tsx` (onglet caché, lien depuis
    « Mon équipe »). Coordonnées (nom éditable), personnes de l'entreprise, état
    du contrat (texte de renvoi vers le web, **aucun lien cliquable sur iOS**),
    export RGPD (`GET /me/account/export` → feuille de partage système),
    **fermeture du compte** (`POST /me/account/delete`, double confirmation,
    titulaire uniquement) — exigence App Store 5.1.1(v). Copy : `mobileAccount`
    dans `@velekya/copy`.
  - **Pont widget** : `apps/mobile/src/widget-bridge.ts` — `syncWidget(team)`
    publie `{ label, working }` vers le module natif optionnel
    `VelekyaWidgetBridge` (repli cache local si absent). Appelé depuis
    `app/(app)/equipe.tsx`. Cible native à compiler au 1er build EAS.
  - **`app.json`** : `version` 1.0.0, `buildNumber`/`versionCode` 1, `icon` +
    `splash` (visuels provisoires générés par `assets/generate-placeholders.mjs`),
    `android.adaptiveIcon`, icône de notification, `usesNonExemptEncryption:false`,
    App Group `group.fr.velekya.app` (entitlement + `privacyManifests` User Defaults
    `CA92.1`). **`eas.json`** : profils `submit` `preview` / `production`
    (TestFlight + piste interne Play), identifiants en `[À COMPLÉTER]`.
  - **Fiches store** : `apps/mobile/store/` (`listing-fr.md`, `app-privacy.md`,
    `data-safety.md`, `review-notes.md`, `README.md` avec la checklist de
    pré-soumission). `apps/mobile/credentials/` est git-ignoré.
- **Lot 10 — Back-office : fait.**
  - Module transversal `AdminModule` (`apps/api/src/admin/`), tous les
    contrôleurs sous `@UseGuards(AdminGuard)`. Le catalogue, les devis et les
    factures gardent leurs propres contrôleurs `admin-*` (Lots 2/3/4).
  - **Tableau de bord** : `GET /admin/dashboard` → `AdminDashboard`
    (`AdminDashboardService`, agrégats en lecture seule sans donnée
    personnelle) : devis par statut + taux d'acceptation + 30 jours glissants,
    MRR / abonnements actifs / factures impayées, missions par statut,
    assistants par état, clients (total / avec abonnement / nouveaux 30 j),
    escalades ouvertes. Helpers testés `acceptanceRatePct` / `tally`.
  - **Missions** : `GET /admin/missions` (filtre `?status=`),
    `GET/PATCH /admin/missions/:id` — statut
    (`a_preparer` → `en_preparation` → `en_service` | `annulee`) et check-list
    de préparation (JSON validé par `updateMissionSchema`). Audit sur chaque
    modification.
  - **Prix** : `GET/POST/PATCH/DELETE /admin/pricing-rules` — CRUD du barème
    (`pricing_rules`, relu par `PricingService` à chaque devis). `kind` ∈
    `socle|module|volume|outil`, `key` unique par `kind`. Audit sur les
    mutations.
  - **Clients** : `GET /admin/clients` (liste cross-tenant : membres,
    assistants, statut d'abonnement, escalades ouvertes),
    `GET /admin/clients/:id` (fiche : contrat, équipe, 5 dernières factures,
    5 dernières escalades). Lecture transverse assumée (staff Velekya), gardée
    par `AdminGuard` — pas de `forOrganization()`, comme les `admin-*`
    existants.
  - Web : nav `/admin` remaniée (Tableau de bord · Missions · Devis · Métiers ·
    Prix · Clients · Factures) ; pages `/admin`, `/admin/missions[/[id]]`,
    `/admin/prix`, `/admin/clients[/[id]]`. Server actions avec `guard()`
    (rôle `admin`) + `safeParse` Zod + `revalidatePath`.
  - Contrat : `packages/types/src/admin.ts` (schémas Zod + interfaces à la
    main), méthodes `api.admin.dashboard() / missions / pricing / clients` dans
    `@velekya/api-client`.
- **Lot 11 — Durcissement : fait.**
  - **e2e web** : paquet `@velekya/e2e` (Playwright). `playwright.config.ts` 2
    projets (chromium = tout ; mobile/Pixel5 = vitrine seulement), `webServer`
    démarre api+web (reuseExistingServer hors CI), `globalSetup` vérifie
    API+Mailpit. Fixtures (`fixtures/velekya.ts`) : `requestMagicToken` (lien
    magique via l'API Mailpit), `apiLogin` (Bearer), `webLogin` (cookie
    httpOnly). Specs : `parcours-mvp` (landing → fiche dentiste →
    questionnaire → devis accepté → « au travail »), `parcours-sur-mesure` (questionnaire →
    devis relu et **envoyé** par le back-office → acceptation en ligne
    horodatée → **mission + facture** auto), `isolation-multi-tenant` (2 orgs
    cloisonnées + accès anonyme refusé), `rgpd-compte` (export JSON +
    suppression double confirmation), `accessibilite` (`@axe-core/playwright`,
    WCAG 2.1 A+AA, échoue sur `serious`/`critical`), `securite` (en-têtes),
    `vitrine` (pas de jargon rendu), `perf` (sondes + budgets). **48 tests**.
    `turbo run test:e2e` + job CI `e2e` (services docker + rapport).
  - **e2e mobile** : `apps/mobile/maestro/` (Maestro) — `config.yaml`,
    `scripts/magic-token.js` (runScript), `common/login.yaml`, 4 flows
    (connexion, aujourd'hui, escalade « < 15 s », pause/reprise). `testID`
    ajouté sur le champ email. `pnpm -F @velekya/mobile test:e2e`. Job CI
    `e2e-mobile` **commenté** (émulateur + APK EAS requis). Voir
    `apps/mobile/maestro/README.md`.
  - **Sécurité** (voir `SECURITY.md`) : API `helmet({frameguard:{action:"deny"}})`
    + `x-powered-by` off ; en-têtes web via `next.config.ts` (HSTS, nosniff,
    X-Frame-Options DENY, Referrer-Policy, Permissions-Policy) + `poweredByHeader:
    false` ; `/api/docs` **fermée en production** (`API_DOCS_ENABLED`, helper
    `shouldServeApiDocs`) ; rate limiting déjà configurable (`RATE_LIMIT_*`,
    `skipIf`, refusé si `NODE_ENV=production`). Audit : socle solide, aucune faille
    critique ; dette suivie (CSP web à nonce, durées de conservation + purge auto,
    hébergement UE infra, scan secrets CI).
  - **Observabilité** : `GET /health` → **503 si dégradé** (readiness),
    `GET /health/live` (liveness, sans dépendance) ; `RequestLoggerMiddleware`
    (une ligne par requête, chemin seul, `warn` si lent/≥400, `error` si ≥500 ;
    `REQUEST_LOG_ENABLED`, `SLOW_REQUEST_MS`) ; handlers `unhandledRejection` /
    `uncaughtException` dans `main.ts`.
  - **Perf** : `compression` sur l'API ; schéma Prisma déjà largement indexé
    (constat) ; budgets de latence en e2e (`perf.spec.ts`).
  - **Doc** : `SECURITY.md` (posture + audit + dette) et `DEPLOYMENT.md`
    (services managés UE, variables d'env prod, build → `migrate deploy` →
    start, observabilité & alertes, rollback) à la racine.
  - `docker-compose.yml` : ports hôte surchargeables (`${*_HOST_PORT:-…}`) pour
    cohabiter avec d'autres stacks locales.

- **Lot 12 — Canaux de réception : fait.**
  - Module `ChannelsModule` (`apps/api/src/channels/`). Modèle `ChannelEndpoint`
    (`channel_endpoints` : `kind` formulaire|email|sms|telephone|whatsapp|instagram,
    `address` normalisée, unique par `kind`, `status` en_attente|actif|desactive,
    `settings` JSON `display`/`forwardTo`, `secretEnc`). `Conversation` gagne
    `endpointId`, `replyToEnc` (adresse de réponse chiffrée AES-256-GCM,
    `SecretBox`), `threadMeta` (sujet / Message-ID email). `Message` gagne
    `delivery` (en_attente|envoye|echec), `providerRef`, `deliveryError`. Valeur
    `sms` ajoutée à `ConversationChannel`.
  - **Flux** : webhook fournisseur → parseur pur (`providers/*.ts`, testés) →
    `ChannelsService` (dédoublonnage `webhook_events`) → `RuntimeService.receive()`
    → réponses marquées `en_attente` → file BullMQ `channel-out` →
    `ChannelDeliveryService` → `ChannelSender` du canal. La **réponse du patron à
    une escalade repart vers le client** par le même canal
    (`EscalationsService.answer`). Assistant en pause : le message est gardé,
    accusé de réception envoyé, remonté au patron (escalade).
  - **Formulaire** (créé d'office) : `GET/POST /channels/form/:publicId`
    (public, 15/min/IP, piège à robots). Page web `/formulaire/[publicId]`,
    sans habillage (`HideWhenEmbedded`), seule route autorisée en cadre
    (`next.config.ts`). Réponse immédiate à l'écran ; suite par email si laissé.
  - **Email / Brevo** (adresse créée d'office : `<nom>-xxxx@INBOUND_EMAIL_DOMAIN`) :
    `POST /channels/email/brevo?token=`. Filtres : auto-réponses, listes,
    rebonds, indésirables, boucles. Réponse par SMTP depuis l'adresse de
    l'assistant, dans le fil (`Re:` + `In-Reply-To`).
  - **SMS + appels / Twilio** : `POST /channels/twilio/sms|voice|voice/after-dial`
    (signature `X-Twilio-Signature`, pas de SDK). Appel : renvoi vers le patron si
    `forwardTo`, sinon message vocal + **SMS de reprise par écrit** (mobile
    uniquement, même fil que les SMS) ; numéro masqué / pas de SMS → escalade
    « à rappeler ». « STOP » ignoré.
  - **WhatsApp + Instagram / Meta** : `GET/POST /channels/meta` (vérification
    `hub.*`, signature `X-Hub-Signature-256` sur le corps brut). Jeton d'accès par
    canal, chiffré. Fenêtre de 24 h de Meta → remise en échec au-delà.
  - Client : `GET /me/assistants/:id/channels` → section « Comment vos clients le
    joignent » sur la fiche (coordonnées + code du formulaire à copier). Copy :
    `channelPlace`, `channelLabels`, `channelsCopy`, `publicForm` (`@velekya/copy`).
  - Back-office : `GET/POST /admin/assistants/:id/channels`,
    `PATCH/DELETE /admin/channels/:id` (audit) ; page
    `/admin/clients/[id]/canaux/[assistantId]`.
  - Env : `CHANNEL_SECRET_KEY` (obligatoire en prod), `CHANNELS_DELIVERY`
    (`fake`|`live`), `INBOUND_EMAIL_DOMAIN`, `BREVO_INBOUND_TOKEN`,
    `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WEBHOOK_BASE_URL`,
    `META_APP_SECRET` / `META_VERIFY_TOKEN` / `META_GRAPH_URL`. Hors prod, des
    secrets de dev s'appliquent (`channelWebhookSecrets()`). Voir `DEPLOYMENT.md`.

- **Lot 13 — Moteur n8n : fait.**
  - `N8nRuntime` (`apps/api/src/assistants/runtime/n8n.runtime.ts`), 3e
    implémentation d'`AssistantRuntime`, choisie par `ASSISTANT_RUNTIME=n8n`.
    `POST` JSON vers le flux de l'employé (Lot 14), en-tête `X-Velekya-Token`
    (`N8N_TOKEN`), délai `N8N_TIMEOUT_MS`.
    Réponse validée par Zod (`n8nReplySchema` : reply | appointment | escalate).
  - Garde-fous gardés côté API : prix / urgence / humain → moteur à règles, sans
    appel n8n ; réponse invalide, erreur ou délai dépassé → escalade.
  - `RuntimeAssistant` gagne `professionSlug`. Aucune coordonnée du client final
    n'est envoyée à n8n.
  - Contrat + structure de workflow : `docs/n8n/README.md`. Local :
    `pnpm n8n:up` (service `n8n`, profil docker `n8n`, port 5678).
  - Env : `N8N_TOKEN` (obligatoire en prod si `n8n`), `N8N_TIMEOUT_MS`.

- **Lot 13 bis — Nettoyage : fait.** Modèle retenu : le client décrit son besoin,
  l'équipe Velekya construit **son** flux n8n, le client le pilote avec des boutons
  (Lot 14). Supprimé : souscription en libre-service (`/employes-virtuels/[slug]/souscrire`,
  `POST /me/catalog/subscribe`, `CatalogSubscribeService`,
  `BillingService.startCatalogSubscription`), colonne `professions.trialDays`
  (migration `20261014100000_drop_trial_days`), ancien point d'entrée
  `POST /inbound/:publicId` + `INBOUND_SECRET`, moteur `fake`, activité de
  démonstration à l'activation (`seedInitialActivity`), dépendances
  `@nestjs/testing` / `axe-core` (e2e) inutilisées. Le catalogue reste une
  **vitrine** : son appel à l'action mène au questionnaire. Fixtures e2e
  `submitAssessment` / `staffSendsQuote` / `hireViaQuote` / `activateAssistant`.
  - ~~Textes à revoir~~ : redevenus cohérents avec le Lot 16 (libre-service +
    essai de 14 jours) et le Lot 21 (les 6 métiers ont leur flux) — relus le
    2026-11-25, aucun changement nécessaire.

- **Lot 14 — Un flux n8n par client, piloté par boutons : fait.**
  - Modèle : `Assistant.workflowUrl` (webhook du flux de ce client) +
    `AssistantSwitch` (`assistant_switches` : `key` lue par le flux, `label` /
    `help` vus par le client, `enabled`, `position` ; unique par
    (`assistantId`, `key`)). Migration `20261014120000_assistant_switches`.
  - Moteur : `N8nRuntime` appelle `assistant.workflowUrl` (corps `version: 2`
    avec `switches: { clé: bool }`) ; sans flux branché → moteur à règles.
    `ASSISTANT_RUNTIME=n8n` reste l'interrupteur global (dev/CI : `rules`).
  - Back-office : `GET/PATCH /admin/assistants/:id/setup` (URL du flux, vérifiée
    par `assertAllowedUrl` : https en prod, origine `N8N_BASE_URL` si
    renseignée), `POST /admin/assistants/:id/switches`,
    `PATCH/DELETE /admin/switches/:id` (audit). Page
    `/admin/clients/[id]/pilotage/[assistantId]` ; les libellés passent le
    filtre anti-jargon (`findJargon`) dans l'action serveur.
  - Client : `switches` dans `AssistantCard` (donc équipe + fiche) ;
    `POST /me/assistants/:id/switches/:key { enabled }` (audit
    `assistant.switch_changed`). Web : section « Ce qu'il fait pour vous » de la
    fiche (`SwitchList`, `role="switch"`). Mobile : interrupteurs sous chaque
    employé dans « Mon équipe ». Copy : `switchesCopy`.
  - Flux planifiés : `N8nController` (`/n8n/assistants/:id/state | activity |
    escalations`), jeton `X-Velekya-Token` (`n8nToken()` : `N8N_TOKEN`, ou
    `dev-n8n-token` hors prod). `RuntimeService.reportFromWorkflow()` →
    carnet de bord « Travail planifié » / escalade notifiée.
  - Env : `N8N_WEBHOOK_URL` supprimée → `N8N_BASE_URL` (facultative).
  - e2e `pilotage.spec.ts`. Contrat complet : `docs/n8n/README.md`.

- **Lot 15 — Aide au patron « Une question ? » : fait.**
  - Modèle : `HelpArticle` (`help_articles` : `slug` unique, `question`,
    `keywords[]`, `answer`, `action` = renvoi aucune|equipe|documents|compte|reglages|carnet,
    `published`, `position` — contenu global, éditable sans redéploiement) et
    `HelpRequest` (`help_requests`, par organisation : `status`
    repondue|sans_reponse|transmise|traitee, `helpful`, `staffAnswer`).
    Migration `20261016100000_help_desk`. 19 réponses semées
    (`prisma/seed-data/help.ts`).
  - Moteur : `help-matcher.ts` (pur, testé, sans fournisseur de modèle) —
    recouvrement de racines (question ×1, mot-clé ×2, expression-clé +3).
    Répond si score ≥ 3 (ou question courte entièrement couverte) **et** fiche
    seule en tête ; sinon pistes (« Vous cherchez peut-être… ») et bouton
    « Transmettre à l'équipe Velekya ». Jamais de réponse inventée.
  - API : `GET /me/help`, `POST /me/help/ask` (`articleId` facultatif = question
    proposée choisie), `POST /me/help/requests/:id/feedback|transmit` (email
    interne vers `HELP_DESK_EMAIL`, défaut `MAIL_FROM`). Back-office
    `/admin/help/articles` (CRUD) et `/admin/help/requests[?status=]`,
    `POST /admin/help/requests/:id/answer` → email au client + push
    (`PushService.notifyHelpAnswered`, `data.screen = "help"`). Audit sur
    transmission, réponse et mutations. Export RGPD : `helpRequests`.
  - Web : onglet « Une question ? » (`/mon-equipe/aide`), lien depuis « Mon
    équipe » ; back-office `/admin/aide` (à traiter · trous dans la base · base
    de réponses avec compteurs servie / jugée inutile · déjà répondues), textes
    passés au filtre anti-jargon. Mobile : écran `aide` (lien depuis « Mon
    équipe », notification → écran). Copy : `helpCopy`, `clientNav.help`.
  - Le test anti-jargon scanne désormais aussi `apps/api/prisma/seed-data`
    (catalogue corrigé : « pour un agent » → « pour un conseiller de l'agence »).

- **Lot 16 — Prêt à l'emploi générique (89 €) : fait.** Revient en partie sur
  le Lot 13 bis : le catalogue redevient souscriptible en libre-service.
  - Modèle : `Profession.workflowUrl` (flux n8n **générique du métier**, partagé
    par tous ses clients) + `Profession.defaultSwitches` (JSON
    `[{key,label,help,enabled}]`, boutons créés à chaque embauche) ;
    `Subscription.trialEndsAt`. Migration `20261019100000_catalog_generic_flow`.
  - Moteur : `RuntimeService` résout le flux **employé → métier → règles** ;
    `RuntimeAssistant.workflowScope` = `client` | `metier` | null (envoyé au flux).
    Multi-clients : chaque appel porte les données du client, le flux ne stocke
    rien. Flux planifiés partagés : `GET /n8n/professions/:slug/assistants`
    (`N8nProfessionsController`, jeton `X-Velekya-Token`).
  - Souscription : `POST /me/catalog/subscribe { slug }` →
    `CatalogSubscribeService` (idempotent ; **un seul contrat ouvert par
    organisation** → 409 sinon) → `BillingService.startCatalogSubscription`
    (essai `CATALOG_TRIAL_DAYS`, défaut 14 ; première facture mensuelle à la fin
    de l'essai via la file `billing`) → employé créé depuis la fiche publiée
    (nom, rôle, tâches, limites) → premier jour. `trialDays` exposé dans la
    fiche publique.
  - Essai sans carte ; la 1re facture se règle depuis « Mes documents », ou est
    prélevée si le client a enregistré une carte (Lot 22).
  - Web : fiche métier → « Essayer X 14 jours gratuitement » →
    `/employes-virtuels/[slug]/souscrire` (connexion requise, `?suite=`) ; le
    questionnaire reste en appel secondaire. Essai affiché dans « Mes documents »,
    « Mon compte » (web + mobile). Back-office : section « Flux n8n générique »
    sur `/admin/metiers/[id]` (`GET/PATCH /admin/professions/:id/workflow`, URL
    vérifiée par `assertAllowedUrl`, libellés au filtre anti-jargon). Copy :
    `subscribeCopy`. CGV : clause de paiement alignée sur l'essai.
  - Doc : `docs/n8n/README.md` (« Flux générique d'un métier »). e2e
    `pret-a-l-emploi.spec.ts` (2 tests) ; `parcours-mvp` suit le nouveau CTA.

- **Lot 17 — Premier flux métier : cabinet dentaire : fait.**
  - Paquet `@velekya/n8n-flows` (`packages/n8n-flows`) : logique des flux
    génériques en TypeScript testé (`src/common.ts` : contrat, texte, dates en
    heure de Paris ; `src/dentiste.ts`), compilée par `src/build.ts` dans le nœud
    Code d'un flux importable `flows/dentiste.workflow.json` (Webhook Header Auth
    → Code → Respond to Webhook). `pnpm -F @velekya/n8n-flows build:flows`
    régénère ; un test échoue si le JSON n'est pas à jour, un autre exécute le
    code du nœud tel que n8n le ferait.
  - Sans fournisseur de modèle : douleur / question médicale / annulation /
    déplacement / mutuelle → transmis ; rendez-vous notés en `propose` (le
    cabinet confirme) ; horaires, adresse, praticiens, soins proposés depuis la
    fiche et les spécificités du premier jour. Détail : `docs/n8n/README.md`.
  - Boutons par défaut du métier semés (`CatalogSeed.defaultSwitches` →
    `rendez_vous`, `nouveaux_patients`).
  - Landing : « pas de période d'essai » retiré (contredisait l'essai de 14 j).

- **Lot 18 — Durcissement 2 (dette technique) : fait.**
  - **Durées de conservation + purge** (§9.4) : `RetentionModule`
    (`apps/api/src/retention/`) — `retention-policy.ts` (pur : durées →
    dates limites), `RetentionService.run()`, planifiée par `MaintenanceWorker`
    (job répétable `0 3 * * *` sur la nouvelle file BullMQ `maintenance`, `jobId` fixe). Purge
    liens magiques, sessions, questionnaires abandonnés, prospects non
    convertis, événements de webhook, jetons push désactivés, activité ancienne
    des comptes actifs. Compte supprimé → après le délai de grâce : employés
    (cascade : activité, canaux, boutons), missions, aide, jetons effacés ;
    utilisateurs sans autre entreprise anonymisés (`supprime-<id>@invalid.velekya`) ;
    organisation renommée, `Organization.purgedAt` (migration
    `20261119100000_retention`). Jamais purgés : factures, avoirs, paiements,
    devis acceptés + preuve d'acceptation, journal d'audit. Env `RETENTION_*`.
  - **CSP web à nonce** : `apps/web/middleware.ts` (désormais sur toutes les
    pages, garde des zones connectées conservée) + `lib/csp.ts` (testé).
    `connection()` dans `app/layout.tsx` → **toutes les pages rendues à la
    demande**. `/formulaire/*` : `frame-ancestors *` via la CSP du middleware.
  - **Scan de secrets** : job CI `secrets` (binaire gitleaks 8.21.2 épinglé,
    historique complet) + `.gitleaks.toml`.
  - **`data-testid` « premier jour »** (`pj-*`, conteneur `premier-jour`) ;
    `parcours-mvp` pilote désormais les 4 écrans par l'interface.

- **Lot 19 — Rotation de `CHANNEL_SECRET_KEY` : fait.**
  - `secret-box.ts` : trousseau versionné (`Keyring`, `channelKeyring(env)`),
    format `v<N>.<iv>.<tag>.<chiffré>` — les valeurs `v1.` existantes restent
    lues avec la clé 1 (pas de migration de données). Env
    `CHANNEL_SECRET_KEY_VERSION` (défaut 1), `CHANNEL_SECRET_KEY_PREVIOUS`
    (`1:base64,…`). Configuration incohérente → l'API refuse de démarrer.
  - `ChannelKeyRotationService` (`channels/key-rotation.service.ts`) : rechiffre
    `conversations.replyToEnc` et `channel_endpoints.secretEnc` par lots
    (curseur sur `id`, `updateMany` conditionnel = pas d'écrasement), audit
    `channels.key_rotated`, log « Rechiffrement terminé ».
  - **`MaintenanceModule`** (`src/maintenance/`) : seul worker de la file
    `maintenance` (`retention` 03:00 + `rekey` au démarrage et toutes les
    heures). `RetentionModule` ne fait plus que fournir `RetentionService`.
  - Procédure : `DEPLOYMENT.md` §10. Tests : `secret-box.test.ts` (7, dont
    lecture du format historique), `key-rotation.service.test.ts` (3).
  - Vérifié : turbo 30/30, e2e 57/57. Rotation réelle non jouée sur la base de
    dev (couverte par les tests avec vrai chiffrement).

- **Lot 20 — Flux métier : restaurant : fait.**
  - `packages/n8n-flows/src/restaurateur.ts` (+ tests) → `flows/restaurateur.workflow.json`,
    webhook `/webhook/velekya-restaurateur`. Même gabarit que le dentiste.
  - Réservation notée en `propose` dès jour + heure + nombre (sur plusieurs
    messages, une question à la fois), puis « À quel nom ? ». Groupe au-delà de
    `groupes_max` (sinon `capacite`), allergies / régimes, annulation,
    modification, liste d'attente, privatisation, réclamation, paiement, à
    emporter, remise → transmis. Horaires (`horaires`), adresse, carte (`carte`)
    depuis la fiche.
  - Boutons semés : `reservations` (allumé) et `complet` (éteint ; seul `true`
    compte → « complet aujourd'hui » pour les demandes du jour).
  - Test « flux généré à jour / s'exécute comme dans n8n » déplacé dans
    `build.test.ts`, joué pour **chaque** flux de `FLOWS`.
  - Non importé dans n8n à ce stade ; boutons semés seulement pour les
    nouvelles embauches (absents = défauts du flux, donc sans effet).

- **Lot 21 — Flux métier : garage, salon, agence, artisan : fait.** Les 6 métiers
  du catalogue ont leur flux générique (`FLOWS` dans `build.ts`). Détail par
  métier : `docs/n8n/README.md`.
  - `packages/n8n-flows/src/garagiste.ts` (+ tests) → `flows/garagiste.workflow.json`,
    webhook `/webhook/velekya-garagiste`. Même gabarit que les précédents.
  - Danger sur la route (freins, fumée, essence, voyant rouge, surchauffe,
    accident) → transmis en priorité + « ne roulez pas » ; véhicule immobilisé →
    transmis, à rappeler. Dépôt noté en `propose` dès jour + heure, motif repris
    (prestation, sinon panne décrite), puis « Pour quelle intervention ? » s'il
    manque. Panne décrite → une question de préparation (jamais de diagnostic).
    Prestations / marques / véhicule de prêt depuis la fiche (absent ≠ non →
    transmis). Devis, délai, avancement, annulation, déplacement, réclamation →
    transmis. Spécificités : `prestations`, `horaires`, `vehicule_pret`, `marques`.
  - Boutons semés : `rendez_vous` (allumé) et `atelier_complet` (éteint ; seul
    `true` compte → « complet cette semaine », propose le lundi suivant).
  - Test anti-jargon : les `*.test.ts(x)` / `*.spec.ts(x)` ne sont plus scannés
    (faux positif « api.velekya.fr » dans `csp.test.ts`).
  - **Salon de coiffure** (`coiffure.ts`, webhook `velekya-salon-de-coiffure`) :
    rendez-vous noté dès prestation + jour + heure, coiffeur repris, nom (+ numéro
    si le canal ne le donne pas, jamais dans le résumé) ; conseils, réaction après
    couleur (consignes santé), remise, mariage → transmis. Boutons `rendez_vous`,
    `nouvelles_clientes`.
  - **Agence immobilière** (`agence.ts`, webhook `velekya-agence-immobiliere`) :
    qualification posée une seule fois (achat : budget + financement ; location :
    situation + garant ; ou `questions_quali`), puis visite notée ; adresse d'un
    bien jamais avant confirmation ; offre, financement, détail d'un bien →
    transmis ; estimation notée pour un conseiller. `slotOf()` ignore « le 3
    pièces », surfaces et budgets. Boutons `visites`, `qualification`.
  - **Artisan du bâtiment** (`artisan.ts`, webhook `velekya-artisan-batiment`) :
    gaz / électricité / bâti → URGENT + consignes ; dépannage → transmis tout de
    suite (respecte `urgences` = non) ; travaux : nature → commune → délai →
    métré → coordonnées, état relu dans la conversation (`factsOf`) ; devis
    accepté → transmis comme bonne nouvelle. Boutons `rendez_vous`, `carnet_plein`.
  - 193 tests `n8n-flows`. **Validé dans le n8n 1.80 local** (2026-11-25) : les
    6 flux importés (`import:workflow`, clé Header Auth `velekyaToken01`) et
    actifs ; 403 sans jeton ; scénarios types OK par appel direct des webhooks
    (pas rejoué de bout en bout via l'API, contrat identique au dentiste).
  - **`testID` mobiles** (dette Lot 11/18 soldée) : `onglet-*` (via
    `tabBarButtonTestID`), `btn-recevoir-lien`, `escalade-item`,
    `reponse-rapide-<n>`, `btn-envoyer-reponse`, `btn-pause` / `btn-reprendre`,
    `etat-employe`, `interrupteur-<clé>`, `btn-deconnexion`. Les flows Maestro
    ciblent ces id plutôt que les libellés.

- **Lot 22 — Carte enregistrée et prélèvement automatique : fait.**
  - Modèle `SavedCard` (`saved_cards` : `setupRef` unique, `customerRef`,
    `methodRef`, `brand`, `last4`, `expMonth`/`expYear`, `status`
    en_attente|active|retiree). Migration `20261125100000_saved_cards`. Jamais de
    numéro de carte : références du fournisseur + de quoi afficher.
  - `PaymentProvider` gagne (facultatifs) `startCardSetup`, `completeCardSetup`,
    `chargeSavedCard`, `detachCard` ; `WebhookOutcome.result` gagne
    `setup_succeeded` (+ `setupRef`). `fake` : carte « Visa 4242 » confirmée sur
    place, prélèvement toujours réussi. `stripe` : Checkout `mode: "setup"`, puis
    PaymentIntent `off_session` + `confirm` (clé d'idempotence par facture,
    `metadata.automatic = "1"`) ; refus (`authentication_required`, carte
    expirée…) → échec avec raison lisible, jamais d'exception.
  - `BillingService` : `startCardSetup` / `confirmFakeCardSetup` /
    `completeCardSetup` (idempotent ; la nouvelle carte remplace l'ancienne,
    détachée) / `removeSavedCard`. `runMonthlyBilling` prélève la carte active ;
    échec → `markPaymentFailed` (facture impayée, email + push, le client règle
    depuis « Mes documents ») ; `processing` → webhook. Un évènement de webhook
    sans correspondance est acquitté (plus de renvoi en boucle). Audit
    `saved_card.added|removed` sans donnée de carte.
  - Routes `POST /me/saved-card/setup | /:ref/confirm (fake) | /remove`,
    titulaire ou admin. `DocumentsBundle.savedCard`. Suppression de compte →
    carte retirée ; export RGPD → `savedCards` ; purge → lignes effacées.
  - Web : section « Prélèvement automatique » de `/mon-equipe/documents`
    (`saved-card.tsx`, retour `?carte=ok|annule`). Copy `savedCardCopy`. CGV :
    clause de paiement réécrite. **Mobile : rien** (aucun moyen de paiement dans
    l'app, décision Lot 9).
  - Tests : `saved-card.test.ts` (14), e2e `prelevement.spec.ts` (2). Env Stripe :
    voir `DEPLOYMENT.md` (évènements `payment_intent.*` à ajouter au webhook).
  - Vérifié : turbo 30/30, API 153 tests, e2e 59/59. Non testé contre un vrai
    compte Stripe (mode test à faire avant mise en ligne).

### Notes Lot 18

- **e2e 57/57** contre la pile (migration appliquée). La CSP a révélé que
  `/employes-virtuels/[slug]` (`generateStaticParams`) tombait en 500
  (`DYNAMIC_SERVER_USAGE`) → passée en `force-dynamic`. **Aucune page ne doit
  redevenir statique / ISR** tant que la CSP est à nonce. `aide.spec.ts` vise
  l'échange en cours (`data-testid="help-turn"`), la réponse figurant aussi
  dans l'historique.
- gitleaks pas lancé en local (le job CI fera le premier passage — ajuster
  `.gitleaks.toml` si faux positif).
- Vérifié : `turbo run lint typecheck test build` vert (30 tâches, 132 tests
  API dont 6 `retention`, 6 tests web `csp`).
- Durées par défaut = proposition (CNIL : prospects 3 ans) → à faire valider.
- Restent en dette : Maestro en CI (1er build EAS), `style-src 'unsafe-inline'`
  (Next et React posent des attributs `style` en ligne ; risque faible, scripts
  déjà sous nonce). `testID` mobile : soldé au Lot 21.

### Notes Lot 17

- **Validé dans un vrai n8n 1.80** (2026-11-19) : import CLI
  (`n8n import:credentials` puis `import:workflow` — ce dernier attend un
  **tableau** ; ajouter l'`id` de la clé Header Auth dans le nœud Webhook avant
  import), `update:workflow --active=true` + redémarrage. 403 sans jeton,
  18 scénarios patients OK, et bout en bout API (`ASSISTANT_RUNTIME=n8n`) →
  formulaire public → n8n → rendez-vous / escalade en base.
- Corrigé à cette occasion : « c'est où ? » non reconnu comme une question
  d'adresse ; et **un rendez-vous pris en plusieurs messages créait une ligne
  `appointments` par message** (`RuntimeService.persist` complète désormais le
  rendez-vous sans date en cours de la conversation — vaut aussi pour le moteur
  à règles).
- Les 6 métiers ont leur flux (Lots 17, 20, 21). Reste : étape « modèle de langage »
  facultative pour les questions libres (choix du fournisseur, hébergé UE).

### Notes Lot 16

- **Non exécuté contre la pile** (Docker éteint) : migration non appliquée,
  e2e non lancés. `pnpm build` d'`apps/api` échoue en EPERM tant que `pnpm dev`
  tourne (verrou Prisma, cf. Notes Lot 2) — `nest build` seul passe.
- Vérifié : lint + typecheck + test verts (126 tests API dont 4
  `catalog-subscribe`), build web OK.
- ~~Textes à revoir~~ : « pas de période d'essai » retiré de la landing au Lot 17.

### Notes Lot 15

- **Non exécuté contre la pile** (Docker Desktop éteint) : migration non
  appliquée, e2e `aide.spec.ts` (2 tests) écrit mais pas lancé. À faire :
  `pnpm db:up && pnpm db:migrate:deploy && pnpm db:seed`, puis la suite e2e.
- Vérifié : `turbo run lint typecheck test build` vert (27 tâches, 122 tests
  API dont 18 du matcher), bundle `expo export --platform ios` OK.
- Les routes typées Expo (`.expo/types/router.d.ts`, ignoré par git) se
  régénèrent au prochain `expo start` avec l'écran `aide`.

### Notes Lot 14

- La validation anti-jargon des libellés de boutons est faite côté web
  (l'API ne dépend pas de `@velekya/copy`, consommé en source).
- e2e `pilotage.spec.ts` **non exécuté** (Docker Desktop éteint lors du lot).

### Notes Lot 13

- ~~Workflows n8n pas encore construits~~ : les 6 flux génériques métier sont
  dans `packages/n8n-flows` (Lots 17, 20, 21). Un flux `sur-mesure` reste propre
  à chaque client (construit par l'équipe, Lot 14).
- Pas d'e2e contre un vrai n8n : les tests unitaires (`n8n.runtime.test.ts`)
  simulent `fetch`.

### Notes Lot 12

- Migration `20261008100000_channel_endpoints`. JSON du body parser porté à 2 Mo
  (emails Brevo) ; le corps brut reste conservé (signatures).
- Les canaux par défaut (formulaire + email) sont créés **paresseusement**
  (`ChannelsService.ensureDefaults`) à la première lecture des canaux.
- e2e `canaux.spec.ts` (3 tests : formulaire + cloisonnement + cadrage, email
  Brevo + relais de la réponse du patron via Mailpit, Twilio SMS/appel + Meta
  WhatsApp raccordés par le back-office) — signatures réelles, envois `fake`.
- **Non testable ici** : vrais comptes Twilio / Brevo / Meta (numéro FR,
  domaine MX, vérification d'entreprise et revue d'app Meta). Pas de
  conversation vocale (appel → renvoi ou SMS). Pas de messages modèles
  WhatsApp (au-delà de 24 h).
- ~~En `pnpm dev`, Next échouait à compiler `@velekya/types` (« Cannot use 'import.meta' outside a module »)~~ — **corrigé** : le lien pnpm vers `packages/types/dist` (CommonJS) est hors de `node_modules`, Next y injectait le rechargement à chaud. `apps/web/next.config.ts` fait pointer `@velekya/types` vers ses sources TS (alias webpack) ; l'API garde `dist/`.

### Notes Lot 11

- **e2e non exécutés en CI headless pour le mobile** : Maestro exige un
  émulateur/simulateur + l'app installée. Authoring fait ; exécution au 1er
  build EAS `preview`.
- L'onboarding « premier jour » (4 écrans) est finalisé **par l'API** dans
  `parcours-mvp` (pas encore de `data-testid` sur ces écrans — dette).
- Suite e2e = 48 tests, ~21 s ; nécessite la pile (`pnpm db:up` + api + web).
  `RATE_LIMIT_DISABLED=true` en local/CI e2e (auth répétée).

### Notes Lot 10

- **Isolation multi-tenant** : le back-office lit et écrit en travers des
  organisations (par conception). L'accès est gardé par `AdminGuard`
  (rôle `admin`) ; on n'applique pas `forOrganization()`, cohérent avec
  `admin-quotes` / `admin-billing` / `admin-catalog`.
- **Immutabilité comptable** respectée : Lot 10 ne modifie ni factures ni
  avoirs. Les `pricing_rules` sont de la configuration (CRUD complet) ; les
  missions n'exposent que statut + check-list.
- **Types du back-office** : interfaces écrites à la main dans
  `packages/types/src/admin.ts` (schémas `z.ZodType<...>` annotés), même raison
  qu'au Lot 2 — éviter les types géants de `z.infer` aux frontières de paquets.
- `apps/web/app/admin/**` reste **exclu** du test anti-jargon (§2, note Lot 2).
- Vérifs : `turbo run build lint typecheck test` vert (26 tâches, 0 cache) ;
  49 tests API dont `admin-dashboard.service.test.ts` (4). Smoke test HTTP
  bout-à-bout des 11 lots OK (33 requêtes). Pas de migration Prisma.

### Notes Lot 9

- **Pas de dépendance native ajoutée.** `requireOptionalNativeModule` vient de
  `expo` (pas de `expo-modules-core` en dep directe). `expo-splash-screen` non
  installé → écran de lancement via la clé `splash` héritée d'`app.json` (encore
  supportée en SDK 52). Export de données mobile via `Share` de React Native
  (pas de `expo-file-system`/`expo-sharing`).
- **Visuels d'app provisoires** : `assets/generate-placeholders.mjs` (encodeur
  PNG maison, aucune dépendance) — aplats marque sans texte, à remplacer avant
  soumission (`store/README.md`).
- **Pas d'achat intégré** : justifié dans `store/review-notes.md` (service B2B,
  abonnement acquis sur le web, règle App Store 3.1.3(b)). L'app ne doit jamais
  gagner d'écran de souscription ni de lien de paiement iOS.
- **`GET /me/billing`** relit l'abonnement via `BillingService.documentsFor()`
  (pas de nouvelle requête Prisma) + `manageHandoff()` du fournisseur.
- Bundle vérifié en headless : `pnpm -F @velekya/mobile exec expo export
  --platform ios` (1121 modules, OK). `turbo run lint typecheck test build`
  reste vert (26 tâches, 45 tests API).

### Notes Lot 8

- **Notifications push** : pas de dépendance à `expo-server-sdk` — un `fetch`
  vers l'API Expo Push suffit (APNs/FCM gérés par Expo). En dev/CI, garder
  `PUSH_ENABLED=false` : les jobs sont créés puis ignorés.
- **Résumé quotidien** : un seul job répétable (`daily-summary-tick`, cron
  `0 * * * *`) ; à chaque heure, on n'envoie qu'aux utilisateurs dont l'heure
  locale == `dailySummaryHour`. Pas de colonne « déjà envoyé » : la cadence
  horaire suffit, `jobId` par jour en filet de sécurité.
- **Copy mobile** : `packages/copy/src/mobile.ts` (exports `mobile*`). Passe le
  test anti-jargon comme le reste de `@velekya/copy`.
- **Dépendances natives** (`expo-notifications`, `expo-speech-recognition`,
  `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`,
  `expo-device`) : le bundle `expo export` (iOS + Android) résout tout ; l'envoi
  réel des notifications et la dictée ne se testent que sur appareil / build EAS.

### Notes Lot 7

- **pnpm + Expo/Metro** : `.npmrc` passe de `node-linker=isolated` à
  `node-linker=hoisted` — Metro ne sait pas résoudre les dépendances transitives
  sous le layout isolé de pnpm. `apps/mobile/metro.config.js` garde la recherche
  hiérarchique (pas de `disableHierarchicalLookup`) et active
  `unstable_enablePackageExports` (les `packages/*` exposent leurs entrées via le
  champ `exports`). Ce changement de layout a été revalidé : `turbo run lint
  typecheck test build` reste vert sur les 26 tâches.
- Vérif du bundle en environnement headless : `pnpm -F @velekya/mobile exec expo
  export --platform ios` (pas de simulateur / build EAS ici). Le vrai test des
  parcours mobiles (Maestro) arrive au Lot 11.
- `@babel/runtime` et `@expo/metro-runtime` ajoutés en dépendances directes de
  `apps/mobile` (requis par `expo-router` au bundling, absents en isolé).

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
