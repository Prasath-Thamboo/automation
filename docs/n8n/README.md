# Flux n8n (Lots 13-16)

Deux modèles coexistent :

- **Prêt à l'emploi (Lot 16)** : **un flux générique par métier**, partagé par
  tous les clients de ce métier. Chaque appel porte les données du client
  (établissement, spécificités, consignes, boutons, historique) : le flux ne
  stocke rien et sert des dizaines de clients en parallèle, chacun avec ses
  propres données. Voir « Flux générique d'un métier » plus bas.
- **Sur mesure (Lot 14)** : **un flux n8n par client**.

Ordre de résolution à chaque message : flux propre de l'employé → flux
générique de son métier → moteur à règles.

Sur mesure : Le client décrit son besoin, l'équipe Velekya
construit son flux, le branche dans le back-office, puis déclare les **boutons**
que le client pourra actionner. Le client ne voit jamais le flux (§2) : sur le
web et dans l'app, il voit « Ce qu'il fait pour vous » et des interrupteurs.

```
Client final (SMS, email, WhatsApp, formulaire…)
  → API Velekya : canaux, conversation, garde-fous
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

## Flux générique d'un métier (prêt à l'emploi)

1. Construis un flux par métier (`dentiste`, `restaurant`…). Il doit lire
   **tout** ce qui est propre au client dans la requête (`assistant.establishment`,
   `assistant.specifics`, `instructions`, `switches`) — jamais de donnée client
   en dur dans le flux.
2. Back-office → Métiers → le métier → **Flux n8n générique** : colle l'URL du
   webhook et déclare les **boutons par défaut** (`clé | libellé | aide | on`),
   créés pour chaque nouvel employé de ce métier.
3. Le client souscrit seul depuis la fiche (essai gratuit `CATALOG_TRIAL_DAYS`),
   fait son « premier jour » : son employé passe aussitôt par ce flux.

`assistant.workflowScope` vaut `"metier"` (flux partagé) ou `"client"` (flux
propre). `assistant.id` identifie le client pour les rappels vers l'API.

**Flux planifiés partagés** : liste les employés servis, puis traite chacun.

```
GET /api/v1/n8n/professions/:slug/assistants   (X-Velekya-Token)
→ { "assistants": [{ "assistantId", "name", "working", "state", "switches", "establishment" }] }
```

Ne traite que ceux où `working` est vrai, en respectant leurs `switches`, puis
rends compte par `/n8n/assistants/:id/activity|escalations`. Un employé qui a
reçu un flux propre n'apparaît plus dans cette liste.

## Flux prêts à importer (`packages/n8n-flows`)

La logique de chaque flux métier est écrite en TypeScript et testée dans
`packages/n8n-flows/src` (`common.ts` + un fichier par métier). Un script la
compile dans le nœud **Code** d'un flux importable :

```
Message reçu (Webhook, Header Auth)  →  Logique <métier> (Code)  →  Réponse (Respond to Webhook)
```

| Métier | Fichier à importer | Chemin du webhook |
|---|---|---|
| Cabinet dentaire | `packages/n8n-flows/flows/dentiste.workflow.json` | `/webhook/velekya-dentiste` |

Modifier un flux : édite `src/<métier>.ts`, puis
`pnpm -F @velekya/n8n-flows build:flows` et committe le JSON régénéré. Un test
échoue si le JSON n'est pas à jour. Ne modifie jamais le code directement dans
n8n : il serait écrasé au prochain import.

**Mise en place (une fois par instance n8n)** :

1. n8n → Credentials → **Header Auth**, nommé `Velekya — X-Velekya-Token` :
   Name = `X-Velekya-Token`, Value = la valeur de `N8N_TOKEN` côté API
   (`dev-n8n-token` en local).
2. Workflows → **Import from File** → `dentiste.workflow.json`. Sur le nœud
   « Message reçu », sélectionne la clé créée à l'étape 1. **Active** le flux.
3. Back-office → Métiers → Cabinet dentaire → **Flux n8n générique** : colle
   l'URL de production (`<N8N_BASE_URL>/webhook/velekya-dentiste`). Les boutons
   par défaut (`rendez_vous`, `nouveaux_patients`) sont déjà semés par
   `pnpm db:seed`.
4. Côté API : `ASSISTANT_RUNTIME=n8n`.

### Flux « Cabinet dentaire »

Il lit `establishment`, `specifics` (`praticiens`, `types_soins`, `urgences`,
`logiciel_agenda` — saisis au « premier jour »), `instructions` et les boutons.
Aucun fournisseur de modèle : tout est déterministe, et en cas de doute il
transmet au cabinet.

| Le patient… | Le flux |
|---|---|
| a mal, une dent cassée, une joue gonflée… | **transmet** tout de suite (+ rappel du 15) ; précise au cabinet s'il accepte les urgences |
| pose une question médicale (médicament, « est-ce normal ») | **transmet** au praticien, jamais de conseil |
| veut annuler / déplacer un rendez-vous | **transmet** (avec le nouveau créneau souhaité) |
| demande un rendez-vous | note la demande, sur plusieurs messages si besoin (« jeudi » puis « 10h »), en heure de Paris → `appointment` **`propose`** : le cabinet confirme, l'agenda n'est pas consulté. Praticien demandé repris ; nouveau patient : rappel carte Vitale ; Doctolib proposé si c'est l'agenda du cabinet |
| demande horaires, adresse, parking, praticiens | répond depuis la fiche, sinon transmet |
| demande « vous faites les implants ? » | répond oui si le soin figure dans `types_soins`, sinon **transmet** (absent ≠ non) |
| parle mutuelle, carte Vitale, remboursement | **transmet** (sauf consigne du patron qui y répond) |
| autre chose | consigne du patron si elle correspond, sinon **transmet** |

Boutons : `rendez_vous` coupé → chaque demande de rendez-vous est transmise ;
`nouveaux_patients` coupé → réponse polie « pas de nouveaux patients ».
Prix, urgences explicites et demande d'un humain n'arrivent jamais au flux
(garde-fous de l'API).

## 1. Messages entrants (API → flux)

`POST` sur l'URL branchée, en-tête `X-Velekya-Token: <N8N_TOKEN>` (à vérifier par
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
    "workflowUrl": "https://n8n.velekya.fr/webhook/…",
    "workflowScope": "metier",
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
`X-Velekya-Token: <N8N_TOKEN>` ; sans lui, réponse 403.

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
