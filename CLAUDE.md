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
  - **Prêt à l'emploi** : `/employes-virtuels/[slug]/souscrire` (connexion requise ;
    `?suite=` ramène le client après login) → `Subscription` (essai gratuit, sans frais de
    mise en service) + `Assistant`.
  - **Sur mesure** : l'assistant est créé à la volée depuis la mission acceptée (Lot 3)
    à la première visite de « Mon équipe ».
  - **Premier jour (§5.2)** : `/mon-equipe/assistants/[id]/premier-jour`, 4 écrans
    (informations · spécificités du métier depuis le schéma du modèle · comment il vous
    joint · essai) → « Il peut commencer » → assistant `au_travail`, mission `en_service`,
    email, activité de démonstration générée (remplacée par le moteur au Lot 6).
  - **Fiche assistant** : carnet de bord (conversations résumées), à valider (escalades
    répondues en ligne), le former (consignes versionnées), ses horaires, pause / reprise.
  - **Mon compte** : coordonnées, membres, contrat, résiliation, **export RGPD** et
    **suppression de compte** depuis le produit (§9.4).
- **Lot 6 — Runtime : fait.**
  - `AssistantRuntime` (interface) dans `apps/api/src/assistants/runtime/`. Le produit ne
    dépend jamais d'un fournisseur de modèle. Deux implémentations : `rules` (défaut, à
    base de règles, sans LLM) et `fake` (tests) — choix par `ASSISTANT_RUNTIME`.
  - Capacités MVP : **répondre aux questions courantes** (horaires, adresse, accueil, +
    consignes du patron par recouvrement de mots-clés) et **prendre un rendez-vous**
    (détection d'intention + résolution de créneau → `appointments`). Le reste est stubbé
    en escalade.
  - Garde-fous structurels : prix, urgence, demande d'un humain, ou toute demande non
    cadrée → **escalade** (l'assistant n'invente pas). Chaque tour est journalisé
    (`runtime.replied` / `runtime.escalated`).
  - `POST /me/assistants/:id/simulate` : essai depuis l'espace client (fenêtre de chat,
    premier jour + fiche). `POST /inbound/:publicId` (jeton `INBOUND_SECRET`) : arrivée
    des demandes — les vrais canaux seront branchés au Lot 7.
  - L'activation d'un assistant fait passer quelques premières demandes dans le moteur
    (remplace l'ancienne activité de démonstration figée).
- **Lot 7 — Application mobile, socle : fait.**
  - `apps/mobile` (Expo SDK 52, Expo Router 4). Session : jeton d'API dans
    `expo-secure-store` ; `AuthProvider` (`src/auth.tsx`) expose
    `status: loading | signedOut | locked | unlocked`. Verrou biométrique
    (`expo-local-authentication`, `src/biometric.ts`) : re-verrouillage quand l'app
    revient au premier plan (`AppState`).
  - Connexion par lien magique `channel: "mobile"` → `tando://verifier?token=`
    (`app/verifier.tsx`). `app/index.tsx` : saisie e-mail → « lien envoyé » ;
    redirige vers `(app)` si une session valide existe déjà.
  - Navigation `(app)` en onglets : **Aujourd'hui** (`GET /me/today` — nouveau :
    ce qu'il a fait aujourd'hui / cette semaine, escalades ouvertes, prochains
    rendez-vous, l'équipe), **Carnet de bord** (conversations résumées, filtre par
    assistant, détail `conversation/[id]`), **Mon équipe** (état, pause / reprise,
    déconnexion). `src/use-query.ts` : rechargement à l'affichage de l'écran et à
    chaque retour dessus (`useFocusEffect`), pull-to-refresh.
  - `src/theme.ts` dérive du thème partagé `@tando/ui-native` (tokens
    `@tando/config`). `eas.json` : profils development / preview / production
    (`EXPO_PUBLIC_API_URL` par profil). `app.json` : plugin biométrie, deep links
    `tando://` + `applinks:tando.fr`.
  - Nouveau côté API : `GET /me/today` → `TodaySummary` (`@tando/types`),
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
    (`src/notifications.ts` → `useNotificationRouting`) ; `tando://(app)/equipe?do=pause`
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
- Lots 9 → 11 : voir `prompt-claude-code-tando.md` §10.

### Notes Lot 8

- **Notifications push** : pas de dépendance à `expo-server-sdk` — un `fetch`
  vers l'API Expo Push suffit (APNs/FCM gérés par Expo). En dev/CI, garder
  `PUSH_ENABLED=false` : les jobs sont créés puis ignorés.
- **Résumé quotidien** : un seul job répétable (`daily-summary-tick`, cron
  `0 * * * *`) ; à chaque heure, on n'envoie qu'aux utilisateurs dont l'heure
  locale == `dailySummaryHour`. Pas de colonne « déjà envoyé » : la cadence
  horaire suffit, `jobId` par jour en filet de sécurité.
- **Copy mobile** : `packages/copy/src/mobile.ts` (exports `mobile*`). Passe le
  test anti-jargon comme le reste de `@tando/copy`.
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
- Vérif du bundle en environnement headless : `pnpm -F @tando/mobile exec expo
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
