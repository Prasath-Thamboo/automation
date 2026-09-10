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
| `tests/parcours-sur-mesure.spec.ts` | questionnaire → fiche de poste → devis relu et envoyé → acceptation en ligne horodatée → **mission + facture générées** | « un devis accepté génère automatiquement une mission et une facture » |
| `tests/rgpd-compte.spec.ts` | export RGPD (JSON) + suppression de compte (double confirmation, déconnexion) depuis le web | « l'export et la suppression de compte fonctionnent réellement — depuis le web » |
| `tests/isolation-multi-tenant.spec.ts` | deux organisations cloisonnées ; accès non authentifié refusé | « aucune donnée d'une organisation n'est accessible depuis une autre » |
| `tests/accessibilite.spec.ts` | axe-core WCAG 2.1 A+AA sur 10 pages publiques + « Mon équipe » ; échoue sur `serious`/`critical` | « utilisable au clavier et lisible en contraste AA » |
| `tests/securite.spec.ts` | en-têtes de sécurité (web + API), pas de `X-Powered-By`, espace client `noindex` | §9.4 en-têtes de sécurité |
| `tests/vitrine.spec.ts` | pages publiques : chargent, un seul `h1`, `lang=fr`, sans jargon rendu | « le mot agent / LLM / prompt … n'apparaît nulle part » |

## À compléter (suite du Lot 11)

- Poser des `data-testid` sur les 4 écrans « premier jour » puis les piloter par
  l'UI plutôt que par l'API (parcours MVP, étape 7).
- e2e mobile (Maestro) — cf. `apps/mobile`.
- Audit sécurité (revue + durcissement résiduel), monitoring/alertes, perf,
  `DEPLOYMENT.md`.
