# Flux n8n (Lots 13-14)

Modèle : **un flux n8n par client**. Le client décrit son besoin, l'équipe Tando
construit son flux, le branche dans le back-office, puis déclare les **boutons**
que le client pourra actionner. Le client ne voit jamais le flux (§2) : sur le
web et dans l'app, il voit « Ce qu'il fait pour vous » et des interrupteurs.

```
Client final (SMS, email, WhatsApp, formulaire…)
  → API Tando : canaux, conversation, garde-fous
  → flux n8n du client (POST JSON, avec l'état de ses boutons)
  → réponse | rendez-vous | escalade
  → API : remise par le canal, carnet de bord, notification au patron

Flux planifié (relances, rappels…)
  → GET  /api/v1/n8n/assistants/:id/state       (pause ? boutons ?)
  → … travail …
  → POST /api/v1/n8n/assistants/:id/activity    (carnet de bord)
  → POST /api/v1/n8n/assistants/:id/escalations (question au patron)
```

## Mise en place d'un client

1. Construis le flux dans n8n, à partir d'un flux existant si le métier s'y
   prête (duplique-le).
2. Back-office → Clients → le client → **Pilotage** de l'employé :
   - colle l'URL **de production** du nœud Webhook ;
   - déclare les boutons : une **clé** lue par le flux (`relance_devis`) et un
     **libellé client** (« Il relance les devis sans réponse »). Les libellés
     sont refusés s'ils contiennent du jargon (§2).
3. Le client finit son « premier jour » ; l'employé passe au travail.

Tant qu'aucun flux n'est branché, l'employé répond avec le moteur à règles.
Les flux ne sont appelés que si `ASSISTANT_RUNTIME=n8n`.

## 1. Messages entrants (API → flux)

`POST` sur l'URL branchée, en-tête `X-Tando-Token: <N8N_TOKEN>` (à vérifier par
le nœud Webhook, authentification « Header Auth »).

```json
{
  "version": 2,
  "channel": "sms",
  "text": "Vous êtes ouverts samedi ?",
  "assistant": {
    "id": "…",
    "name": "Léa",
    "role": "votre assistante",
    "professionSlug": "dentiste",
    "workflowUrl": "https://n8n.tando.fr/webhook/…",
    "jobDescription": { "summary": "…", "tasks": ["…"], "hours": "…", "limits": ["…"], "tone": "…" },
    "establishment": { "name": "…", "address": "…", "openingHours": "…" },
    "specifics": {}
  },
  "instructions": ["Consignes données par le patron (« le former »)"],
  "switches": { "rendez_vous": true, "relance_devis": false },
  "history": [{ "author": "client", "text": "…" }, { "author": "assistant", "text": "…" }]
}
```

La requête ne contient aucune coordonnée du client final (numéro, email). Ces
données restent chiffrées dans l'API.

**Respecte les boutons** : si `switches.rendez_vous` vaut `false`, le flux ne
prend pas de rendez-vous et répond par `escalate`.

### Réponse attendue (flux → API)

Un nœud « Respond to Webhook » renvoie **un** objet JSON, parmi trois formes :

```jsonc
// Répondre
{ "kind": "reply", "text": "Oui, de 9h à 12h.", "capability": "questions", "summary": "Il a donné les horaires du samedi." }

// Prendre un rendez-vous (slotISO : date ISO 8601 ou null)
{ "kind": "appointment", "text": "C'est noté jeudi 14h.", "summary": "Il a pris un rendez-vous.",
  "slotISO": "2026-10-15T12:00:00.000Z", "status": "confirme" }   // ou "propose"

// Transmettre au patron
{ "kind": "escalate", "question": "Ce que lit le patron", "context": "…",
  "ackText": "Ce que lit le client tout de suite", "summary": "…" }
```

Limites : `text` et `question` font de 1 à 1600 caractères, `summary` de 1 à
300. `summary` alimente le carnet de bord : écris-le dans le vocabulaire client,
sans jargon.

### Garde-fous côté API (non contournables)

- Un message qui parle de **prix**, d'**urgence** ou demande **un humain**
  n'est jamais envoyé au flux : le moteur à règles l'escalade.
- Si la réponse est **invalide**, si le flux répond en **erreur** ou dépasse
  `N8N_TIMEOUT_MS` (15 s par défaut), le message est **transmis au patron**. Le
  client reçoit un accusé de réception.
- Un employé **en pause** ne reçoit rien : l'API garde les messages et les
  transmet au patron.

## 2. Flux planifiés (flux → API)

Un flux qui tourne seul (déclencheur « Schedule ») connaît l'`assistantId` de son
client (affiché sur la page Pilotage). Tous les appels portent l'en-tête
`X-Tando-Token: <N8N_TOKEN>` ; sans lui, réponse 403.

**Avant d'agir**, lis l'état :

```
GET /api/v1/n8n/assistants/:id/state
→ { "assistantId": "…", "name": "Léa", "working": true, "state": "au_travail",
    "switches": { "relance_devis": true }, "establishment": { … } }
```

Si `working` vaut `false` (en pause, ou pas encore au travail) ou si le bouton
concerné est coupé, le flux s'arrête là.

**Après avoir agi**, rends compte :

```
POST /api/v1/n8n/assistants/:id/activity
{ "summary": "Il a relancé 3 devis sans réponse." }

POST /api/v1/n8n/assistants/:id/escalations
{ "question": "Le devis DEV-… a été refusé, que faire ?", "context": "…", "summary": "…" }
```

`activity` ajoute une ligne « Travail planifié » au carnet de bord. `escalations`
crée une question « à valider » et prévient le patron par email et notification.

## En local

```bash
pnpm n8n:up                 # n8n sur http://localhost:5678 (profil docker « n8n »)
```

Puis, dans `.env` :

```
ASSISTANT_RUNTIME=n8n
N8N_BASE_URL=http://localhost:5678
N8N_TOKEN=dev-n8n-token
```

Pour tester sans canal réel : la fenêtre d'essai de la fiche assistant.

## Production

L'instance n8n doit être **hébergée dans l'UE**, car elle reçoit les messages des
clients finaux. Le fournisseur de modèle utilisé dans les flux doit aussi être
couvert par le registre RGPD. `N8N_TOKEN` est obligatoire (contrôlé au démarrage
de l'API) ; renseigne `N8N_BASE_URL` pour que seules des adresses de ton instance
puissent être branchées.
