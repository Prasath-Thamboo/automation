# @tando/e2e — tests end-to-end (Lot 11)

Playwright, navigateur réel, pile complète. Couvre les parcours critiques du §11
du cahier des charges.

## Prérequis

```bash
pnpm db:up                     # postgres, redis, minio, mailpit
pnpm db:migrate:deploy
pnpm db:seed                   # 6 métiers publiés (dont « dentiste »)
pnpm --filter @tando/e2e pw:install   # navigateurs Playwright (une fois)
```

## Lancer

```bash
# Option A — la pile tourne déjà (pnpm dev) : Playwright la réutilise
pnpm --filter @tando/e2e test:e2e

# Option B — à partir des builds
pnpm build
pnpm --filter @tando/e2e test:e2e
```

Variables (défauts entre parenthèses) : `WEB_URL` (`http://localhost:3000`),
`API_URL` (`http://localhost:3333`), `MAILPIT_URL` (`http://localhost:8025`).

`test:e2e:ui` ouvre le mode interactif ; `report` rouvre le dernier rapport HTML.

## Contenu

| Fichier | Parcours | Critère §11 |
|---|---|---|
| `tests/parcours-mvp.spec.ts` | landing → fiche dentiste → connexion → souscription → employé virtuel *au travail* | « le parcours complet … passe en test » |
| `tests/isolation-multi-tenant.spec.ts` | deux organisations cloisonnées ; accès non authentifié refusé | « aucune donnée d'une organisation n'est accessible depuis une autre » |
| `tests/vitrine.spec.ts` | pages publiques : chargent, un seul `h1`, `lang=fr`, sans jargon rendu | « le mot agent / LLM / prompt … n'apparaît nulle part » |

## À compléter (suite du Lot 11)

- Poser des `data-testid` sur les 4 écrans « premier jour » puis les piloter par
  l'UI plutôt que par l'API.
- Parcours « sur mesure » : questionnaire → devis → acceptation horodatée →
  mission + facture générées (`PAYMENT_PROVIDER=fake`).
- Export RGPD et suppression de compte depuis le web.
- Accessibilité : passe `@axe-core/playwright` sur les pages clés.
- e2e mobile (Maestro) — cf. `apps/mobile`.
