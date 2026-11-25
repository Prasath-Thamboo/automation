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
| Restaurant | `packages/n8n-flows/flows/restaurateur.workflow.json` | `/webhook/velekya-restaurateur` |
| Garage automobile | `packages/n8n-flows/flows/garagiste.workflow.json` | `/webhook/velekya-garagiste` |
| Salon de coiffure | `packages/n8n-flows/flows/salon-de-coiffure.workflow.json` | `/webhook/velekya-salon-de-coiffure` |
| Agence immobilière | `packages/n8n-flows/flows/agence-immobiliere.workflow.json` | `/webhook/velekya-agence-immobiliere` |
| Artisan du bâtiment | `packages/n8n-flows/flows/artisan-batiment.workflow.json` | `/webhook/velekya-artisan-batiment` |

Modifier un flux : édite `src/<métier>.ts`, puis
`pnpm -F @velekya/n8n-flows build:flows` et committe le JSON régénéré. Un test
échoue si le JSON n'est pas à jour. Ne modifie jamais le code directement dans
n8n : il serait écrasé au prochain import.

**Mise en place (une fois par instance n8n)** :

1. n8n → Credentials → **Header Auth**, nommé `Velekya — X-Velekya-Token` :
   Name = `X-Velekya-Token`, Value = la valeur de `N8N_TOKEN` côté API
   (`dev-n8n-token` en local).
2. Workflows → **Import from File** → `<métier>.workflow.json`. Sur le nœud
   « Message reçu », sélectionne la clé créée à l'étape 1. **Active** le flux.
3. Back-office → Métiers → le métier → **Flux n8n générique** : colle l'URL de
   production (`<N8N_BASE_URL>/webhook/velekya-<métier>`). Les boutons par
   défaut du métier sont déjà semés par `pnpm db:seed`.
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
Prix : transmis sans chiffre (`asksPrice`, commun aux six flux). Seule la
demande d'un humain est interceptée par l'API avant le flux.

### Flux « Restaurant »

Il lit `establishment`, `specifics` (`capacite`, `horaires`, `carte`,
`groupes_max` — saisis au « premier jour »), `instructions` et les boutons.
Le cahier de réservations n'est pas consulté : une réservation est **notée**
et le restaurant la confirme.

| Le client… | Le flux |
|---|---|
| demande une table | note la réservation dès qu'il a **jour + heure + nombre de personnes**, sur plusieurs messages si besoin (« ce soir » → « 4 » → « 20h »), une question à la fois, en heure de Paris → `appointment` **`propose`**. Demande ensuite le nom (« À quel nom ? ») sauf s'il est déjà donné (« au nom de Durand ») |
| est plus nombreux que `groupes_max` (à défaut `capacite`) | **transmet** au restaurant |
| demande pour aujourd'hui alors que le bouton `complet` est allumé | répond « complet aujourd'hui » et propose un autre jour |
| signale une allergie en réservant | réservation notée, allergie reprise dans le résumé |
| demande si un plat est sans gluten, végétarien… | **transmet** (jamais de garantie), sauf consigne du patron qui y répond |
| annule, modifie, veut la liste d'attente | **transmet** (avec le souhait : jour, heure, nombre) |
| privatisation, mariage, séminaire | **transmet** |
| se plaint (malade, déçu, remboursement) | **transmet**, sans discuter |
| demande horaires, adresse, carte | répond depuis la fiche (lien de la carte s'il y en a un), sinon transmet |
| paiement, tickets resto, à emporter, remise | **transmet** (sauf consigne du patron) |
| autre chose | consigne du patron si elle correspond, sinon **transmet** |

Boutons : `reservations` coupé → chaque demande est transmise ; `complet`
(éteint par défaut, **seul `true` compte**) → « complet aujourd'hui » pour les
demandes du jour, à éteindre le lendemain.

### Flux « Garage automobile »

Il lit `establishment`, `specifics` (`prestations`, `horaires`, `vehicule_pret`,
`marques` — saisis au « premier jour »), `instructions` et les boutons. Le
planning de l'atelier n'est pas consulté : un dépôt de véhicule est **noté**
et le garage le confirme. Jamais de diagnostic, de prix ni de délai.

| Le client… | Le flux |
|---|---|
| signale un danger (plus de freins, fumée, odeur d'essence, voyant rouge, surchauffe, accident) | **transmet** en priorité + consigne « ne roulez pas » (et 112 si danger immédiat) |
| a un véhicule immobilisé (ne démarre plus, crevaison, dépannage) | **transmet**, le garage rappelle |
| demande un rendez-vous | note le dépôt dès qu'il a **jour + heure**, sur plusieurs messages si besoin, en heure de Paris → `appointment` **`propose`**, motif repris (prestation nommée, sinon la panne décrite), rappel de la carte grise. Demande ensuite « Pour quelle intervention ? » si le motif manque |
| décrit une panne (bruit, voyant, fuite, vibrations, démarrage difficile) | pose **une** question de préparation (couleur du voyant, type de bruit…), puis propose le dépôt |
| demande « vous faites les pneus ? », « vous prenez les Dacia ? » | répond oui si c'est dans `prestations` / `marques` (ou « toutes marques »), sinon **transmet** (absent ≠ non) |
| demande un véhicule de prêt | répond depuis `vehicule_pret` (oui / non), sinon transmet |
| demande un devis | **transmet** (véhicule et intervention repris), demande marque, nom du véhicule, année et kilométrage s'ils manquent |
| demande un délai, où en est la réparation, si la voiture est prête | **transmet** |
| annule, déplace, se plaint | **transmet** (avec le nouveau créneau souhaité) |
| demande horaires, adresse, documents à apporter | répond depuis la fiche, sinon transmet |
| paiement, autre chose | consigne du patron si elle correspond, sinon **transmet** |

Boutons : `rendez_vous` coupé → chaque demande est transmise ;
`atelier_complet` (éteint par défaut, **seul `true` compte**) → pour une
demande sans date ou dans la semaine en cours, il répond « complet cette
semaine » et propose à partir du lundi suivant ; à éteindre le lundi.
Les messages qui parlent de prix (« devis », « combien », « tarif ») sont
transmis comme demande de devis, sauf s'ils demandent aussi un rendez-vous.

### Flux « Salon de coiffure »

Il lit `establishment`, `specifics` (`prestations` — une par ligne, avec durée
et tarif affiché —, `coiffeurs`, `horaires`, `instagram`), `instructions` et les
boutons. L'agenda n'est pas consulté : un rendez-vous est **noté** et le salon
le confirme.

| La cliente… | Le flux |
|---|---|
| demande un rendez-vous | le note dès qu'il a **prestation + jour + heure**, sur plusieurs messages, une question à la fois → `appointment` **`propose`** ; coiffeur demandé repris (`coiffeurs`). Demande ensuite le nom, et un numéro si le canal ne le donne pas (Instagram, formulaire, email) — le numéro reste dans la conversation, jamais dans le carnet de bord |
| est une nouvelle cliente | réservation notée avec la mention ; bouton `nouvelles_clientes` coupé → réponse polie « pas de nouvelles clientes » |
| demande « vous faites les balayages ? », une durée, la liste des prestations | répond depuis `prestations` (la ligne saisie), sinon **transmet** (absent ≠ non) |
| demande un conseil (couleur, coupe, allergie, cheveux abîmés) | **transmet** au coiffeur |
| signale une réaction après une couleur (brûlure, démangeaisons) | consignes (rincer, pharmacien / médecin, 15 si gonflement) + **transmet** en priorité |
| annule, déplace, veut la liste d'attente | **transmet** (avec le nouveau créneau souhaité) |
| se plaint, demande une remise, parle mariage ou coiffure à domicile | **transmet** |
| demande horaires, adresse, l'équipe, le compte Instagram | répond depuis la fiche, sinon transmet |

### Flux « Agence immobilière »

Il lit `establishment`, `specifics` (`secteur`, `agents`, `questions_quali`),
`instructions` et les boutons. Il ne connaît **pas** le portefeuille de biens :
disponibilité, caractéristiques et adresse d'un bien restent au conseiller.

| Le contact… | Le flux |
|---|---|
| veut visiter un bien | pose **une fois** les questions de qualification (`questions_quali` si renseignées ; sinon budget + accord de principe pour un achat, situation + garant + date pour une location), puis demande jour + heure → `appointment` **`propose`** avec budget / financement / situation dans le résumé ; enfin nom (+ numéro selon le canal). Questions sautées si déjà répondues dans le message |
| demande si le bien est toujours disponible | fait confirmer par le conseiller, et enchaîne sur la visite |
| demande l'adresse d'un bien | « communiquée à la confirmation de la visite » — jamais avant |
| demande surface, étage, charges, DPE… | **transmet** au conseiller (sauf consigne du patron) |
| veut faire une offre, négocier | **transmet** |
| pose une question de financement (prêt, taux, frais de notaire) | **transmet**, jamais d'avis |
| veut vendre, louer, faire estimer son bien | note la demande pour un conseiller + demande type de bien, commune et surface |
| annule, déplace, se plaint | **transmet** |
| demande secteur, conseillers, horaires, adresse de l'agence | répond depuis la fiche |

Boutons : `visites` coupé → chaque demande de visite est transmise ;
`qualification` coupée → la visite est notée sans questions.

### Flux « Artisan du bâtiment »

Il lit `establishment`, `specifics` (`specialites`, `zone`, `urgences` ;
`rythme_relance` sert au flux planifié de relance des devis), `instructions` et
les boutons.

| Le client… | Le flux |
|---|---|
| sent le gaz | **URGENT** : ne rien allumer, quitter les lieux, Urgence Sécurité Gaz 0 800 47 33 33 / 112 + transmet |
| signale étincelles, fils à nu, effondrement | **URGENT** : couper le courant / s'éloigner, 18 / 112 + transmet |
| a une fuite, plus d'eau chaude, une porte claquée… | **URGENT** : transmet tout de suite (+ « coupez l'arrivée d'eau ») et demande nom, adresse, numéro. `urgences` = non → dit honnêtement que l'entreprise ne fait pas de dépannage |
| demande des travaux | une question à la fois : nature → **commune** → **délai souhaité** → passage pour le **métré** (jour + heure → `appointment` **`propose`**) → nom + adresse exacte du chantier. Hors des `specialites` : noté mais signalé au patron |
| accepte un devis (« bon pour accord ») | **transmet** comme une bonne nouvelle ; hésitation / refus transmis aussi |
| demande une date de démarrage, une durée de chantier | **transmet**, jamais d'engagement |
| signale une malfaçon | **transmet**, jamais d'avis technique |
| demande « vous faites le carrelage ? », la zone, les horaires | répond depuis la fiche (absent ≠ non → transmet) |

Boutons : `rendez_vous` coupé → la demande complète (nature, commune, délai) est
transmise sans proposer de passage ; `carnet_plein` (éteint par défaut, **seul
`true` compte**) → il prévient que les délais de démarrage sont plus longs.

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

- Un message qui demande **un humain** n'est jamais envoyé au flux : le moteur
  à règles l'escalade.
- **Prix** et **urgence** : jamais envoyés à un flux **sur mesure** (moteur à
  règles). Un flux **générique de métier** (`workflowScope: "metier"`,
  `packages/n8n-flows`, testé) les reçoit et répond avec ses propres consignes
  (gaz, freins, douleur…) ; si sa réponse à une urgence n'est pas une escalade,
  l'API escalade quand même. En cas d'échec du flux, urgence et prix gardent la
  réponse dédiée du moteur à règles. (Assoupli le 2026-11-25 : le garde-fou
  global faisait perdre les consignes de sécurité des flux.)
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
