# Moteur n8n (Lot 13)

Avec `ASSISTANT_RUNTIME=n8n`, l'API délègue chaque message d'un client final à un
workflow n8n. Implémentation : `apps/api/src/assistants/runtime/n8n.runtime.ts`.

Le patron ne voit jamais n8n (§2) : il gère « son employé » dans l'app. n8n reste
un outil interne de l'équipe Tando.

```
Client final (SMS, email, WhatsApp, formulaire…)
  → API Tando : canaux, conversation, garde-fous
  → n8n : workflow du métier (POST JSON)
  → réponse | rendez-vous | escalade
  → API : remise par le canal, carnet de bord, notification au patron
```

## Un workflow par métier

`N8N_WEBHOOK_URL` peut contenir `{workflow}`, remplacé par le slug du métier
(`dentiste`, `garage`, `restaurant`…) ou par `sur-mesure` pour un assistant issu
d'un devis. Exemple : `https://n8n.tando.fr/webhook/tando-{workflow}` donne un
nœud Webhook de chemin `tando-dentiste`, un autre `tando-garage`, etc.

Sans `{workflow}`, une seule URL reçoit tout ; le champ `workflow` du corps
permet alors d'aiguiller (nœud Switch).

Ne crée **pas** un workflow par client : la fiche de poste, les infos de
l'établissement et les consignes arrivent dans la requête. Le workflow du métier
s'en sert pour construire ses instructions.

## Requête (API → n8n)

`POST`, en-tête `X-Tando-Token: <N8N_TOKEN>` (à vérifier par le nœud Webhook,
authentification « Header Auth »).

```json
{
  "version": 1,
  "workflow": "dentiste",
  "channel": "sms",
  "text": "Vous êtes ouverts samedi ?",
  "assistant": {
    "id": "…",
    "name": "Léa",
    "role": "votre assistante",
    "professionSlug": "dentiste",
    "jobDescription": { "summary": "…", "tasks": ["…"], "hours": "…", "limits": ["…"], "tone": "…" },
    "establishment": { "name": "…", "address": "…", "openingHours": "…" },
    "specifics": { "parking": "…" }
  },
  "instructions": ["Consignes données par le patron (« le former »)"],
  "history": [{ "author": "client", "text": "…" }, { "author": "assistant", "text": "…" }]
}
```

La requête ne contient aucune coordonnée du client final (numéro, email). Ces
données restent chiffrées dans l'API.

## Réponse attendue (n8n → API)

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

## Garde-fous côté API (non contournables)

- Un message qui parle de **prix**, d'**urgence** ou demande **un humain**
  n'est jamais envoyé à n8n : le moteur à règles l'escalade.
- Si la réponse est **invalide**, si n8n répond en **erreur** ou dépasse
  `N8N_TIMEOUT_MS` (15 s par défaut), le message est **transmis au patron**. Le
  client reçoit un accusé de réception.

Côté workflow, garde la même règle : en cas de doute, renvoie `escalate`.

## Structure conseillée d'un workflow

1. **Webhook** : `POST`, chemin `tando-<métier>`, Header Auth `X-Tando-Token`,
   réponse « Using Respond to Webhook node ».
2. **Code** : construit les instructions du modèle depuis `assistant`,
   `instructions` et `history`.
3. **AI Agent** (ou appel direct au modèle), avec une sortie structurée qui
   impose le schéma ci-dessus. Outils propres au métier si besoin (agenda…).
4. **Respond to Webhook** : renvoie l'objet JSON.

## En local

```bash
pnpm n8n:up                 # n8n sur http://localhost:5678 (profil docker « n8n »)
```

Puis, dans `.env` :

```
ASSISTANT_RUNTIME=n8n
N8N_WEBHOOK_URL=http://localhost:5678/webhook/tando-{workflow}
N8N_TOKEN=dev-n8n-token
```

Pour tester sans canal réel : la fenêtre d'essai de la fiche assistant
(`POST /me/assistants/:id/simulate`).

## Production

L'instance n8n doit être **hébergée dans l'UE**, car elle reçoit les messages des
clients finaux. Le fournisseur de modèle utilisé dans les workflows doit aussi
être couvert par le registre RGPD. `N8N_TOKEN` est obligatoire (contrôlé au
démarrage de l'API).
