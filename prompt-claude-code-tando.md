# Prompt Claude Code — Tando, la plateforme d'employés virtuels (MVP complet)

> Copier-coller l'intégralité de ce fichier dans Claude Code, à la racine d'un dossier vide.
> Les sections marquées `[À COMPLÉTER]` sont à personnaliser avant envoi (prix, coordonnées légales).

---

## 0. Rôle et cadre de travail

Tu es un architecte / développeur full-stack senior. Tu vas construire avec moi, de zéro, un produit SaaS complet (site public + application client + back-office). Tu travailles par étapes, tu ne codes jamais toute l'application d'un coup.

**Méthode imposée :**

1. Commence par me proposer un **plan d'implémentation** (arborescence du monorepo, modèle de données, découpage en lots). Tu attends ma validation avant d'écrire du code.
2. Ensuite, livre **lot par lot** (voir §10 Roadmap). À la fin de chaque lot : ce qui a été fait, comment le lancer, ce qui reste.
3. Écris un `CLAUDE.md` à la racine dès le lot 0, contenant les conventions du projet, le vocabulaire produit (§2) et les règles de code. Tu le mets à jour à chaque lot.
4. Tu poses des questions quand une décision produit est ambiguë. Tu ne pars pas sur une hypothèse silencieuse.
5. Aucun code mort, aucun fichier « exemple », aucun TODO laissé sans ticket. Tout ce que tu écris doit tourner.

---

## 1. La marque

Le produit s'appelle **Tando**. Ce nom est fixé : il s'écrit toujours ainsi, avec une majuscule initiale, jamais en capitales, jamais accompagné d'un suffixe (pas de « Tando AI », pas de « Tando App », pas de « TandoBot »).

La baseline officielle, à utiliser telle quelle partout où le nom a besoin d'être expliqué — balise title, fiches stores, signature d'email, en-tête de devis :

> **Tando — votre employé virtuel, 24h/24, 7j/7.**

Le nom ne décrit pas le produit, et c'est volontaire : c'est la baseline qui explique, jamais le nom. N'écris donc jamais de formule du type « Tando, la plateforme d'agents IA ». Décliner le nom en verbe (« tandoiser ») ou en nom commun (« un tando ») est interdit.

Le domaine de référence est `tando.fr`, avec `tando.com` en redirection. Les identifiants techniques (paquets, bases, variables d'environnement) utilisent le préfixe `tando-` / `TANDO_`.

Éléments d'identité à produire en même temps que le lot 1 : un logotype simple en texte, une icône carrée dérivée de la première lettre, une palette de deux couleurs plus des neutres, et une typographie unique déclinée en trois graisses. Rien de plus pour le MVP — pas de mascotte, pas de robot, pas de dégradé violet.

---

## 1bis. Le produit en une phrase

Une plateforme qui permet à n'importe quelle petite entreprise (restaurant, cabinet dentaire, garage, salon, agence immobilière, artisan…) d'avoir **un employé virtuel disponible 24h/24, 7j/7**, qui répond aux clients, prend les rendez-vous, gère les demandes courantes et fait gagner du temps au patron.

Le produit se compose d'un **site public**, d'une **application web**, d'un **back-office** et d'une **application mobile iOS et Android** (voir §6bis) — le mobile est le canal principal d'usage quotidien, pas un bonus.

Deux façons d'en obtenir un :

- **Voie A — Sur mesure.** Le client décrit son besoin via un questionnaire guidé. Il reçoit un **devis détaillé** (périmètre, tâches couvertes, délai, prix). S'il accepte, l'employé virtuel est conçu à la main pour lui, puis facturé.
- **Voie B — Prêt à l'emploi.** Un catalogue d'employés virtuels déjà construits, par métier (« l'assistant du dentiste », « l'assistant du restaurateur », …). Le client choisit son métier, s'abonne, et son assistant est actif en quelques minutes.

---

## 2. VOCABULAIRE — RÈGLE ABSOLUE

C'est la contrainte la plus importante du projet. Nos clients ne sont **pas** des gens de la tech.

**Interdit dans toute interface visible par le client** (landing, app, emails, devis, factures) :

> agent IA, agent, LLM, prompt, modèle, token, workflow, orchestration, RAG, embedding, fine-tuning, API, intégration, automatisation, pipeline, IA générative, chatbot.

**À utiliser à la place :**

| Au lieu de… | On dit… |
|---|---|
| Agent IA | **votre employé virtuel**, **votre assistant** |
| Déployer / provisionner | **mettre au travail**, **embaucher** |
| Configurer | **former votre assistant** |
| Prompt / instructions système | **la fiche de poste** |
| Capacités / tools | **ce qu'il sait faire** |
| Onboarding | **le premier jour** |
| Dashboard | **le tableau de bord** ou **son carnet de bord** |
| Logs / historique d'exécution | **ce qu'il a fait aujourd'hui** |
| Abonnement / plan | **son contrat** |
| Désactiver | **le mettre en pause** |

La métaphore filée est celle de **l'embauche d'un collaborateur** : on décrit le poste, on le forme, il travaille, il rend des comptes. On tient cette métaphore de bout en bout sans jamais la rompre.

La marque suit la même règle : on écrit « Tando », jamais « l'IA de Tando », « le moteur Tando » ni « la technologie Tando ». Tando prépare des employés virtuels, point.

Côté code, base de données et documentation technique, on utilise le vocabulaire technique normal. La règle ne concerne que ce que le client lit. Prévois un fichier `packages/copy/glossary.ts` qui centralise les termes clients, pour qu'aucune chaîne « technique » ne fuite dans l'UI.

---

## 3. Cibles

| Persona | Douleur | Ce que l'employé virtuel fait pour lui |
|---|---|---|
| Restaurateur | Le téléphone sonne pendant le service, réservations perdues | Répond aux appels et messages, prend les réservations, donne les horaires, la carte, les allergènes |
| Dentiste / praticien | Secrétariat saturé, rendez-vous annulés au dernier moment | Prend et déplace les rendez-vous, rappelle les patients, filtre les urgences |
| Garagiste | Devis à faire le soir après la fermeture | Qualifie la panne, propose un créneau, prépare le devis |
| Agent immobilier | Trop de demandes non qualifiées | Qualifie les acheteurs, planifie les visites, relance |
| Artisan / TPE | Pas de secrétariat du tout | Répond, note les demandes, relance les devis en attente |
| Salon de coiffure / esthétique | Réservations par téléphone et Instagram, no-shows | Réserve, confirme, rappelle |

Le point commun : **une personne seule ou une petite équipe, qui perd du temps sur des tâches répétitives et qui rate du chiffre d'affaires quand personne ne répond.**

---

## 4. Fonctionnalité 1 — L'employé virtuel sur mesure (devis → facture)

### 4.1 Le questionnaire de besoin

Un parcours guidé, une question par écran, avec barre de progression, sauvegarde automatique et reprise possible (lien magique par email). Ton : conversationnel, phrases courtes, aucun jargon. 12 à 18 questions maximum, adaptatives (les questions suivantes dépendent des réponses précédentes).

Étapes du questionnaire :

1. **Votre activité** — secteur (liste + « autre »), taille de l'équipe, ville, site web éventuel.
2. **Votre problème** — « Qu'est-ce qui vous fait perdre le plus de temps aujourd'hui ? » (choix multiples illustrés + champ libre).
3. **Les canaux** — par où vos clients vous contactent : téléphone, WhatsApp, email, Instagram, formulaire du site, sur place.
4. **Les tâches à confier** — sélection multiple de tâches formulées en langage humain (« répondre au téléphone quand je ne peux pas », « prendre les rendez-vous », « relancer les devis », « répondre aux questions habituelles », « préparer les commandes fournisseurs »…).
5. **Le volume** — combien de demandes par jour / par semaine (fourchettes, jamais un champ numérique libre).
6. **Vos outils actuels** — présenté comme « avec quoi il devra travailler ? » : agenda (Google/Outlook/papier), logiciel de caisse ou de gestion, outil de réservation, tableur, rien.
7. **Vos horaires** — quand doit-il travailler (toujours / heures d'ouverture / hors ouverture uniquement).
8. **Ce qu'il ne doit jamais faire** — les limites (ex. « ne jamais donner un prix », « ne jamais confirmer une urgence médicale »).
9. **Le ton** — comment il doit parler à vos clients (3 exemples de messages à choisir, pas des adjectifs abstraits).
10. **Vos coordonnées** — nom, entreprise, email, téléphone, et quand vous rappeler.

À la fin, un **récapitulatif reformulé en langage clair** : « Voici l'employé qu'on va vous préparer », sous forme de fiche de poste lisible, que le client peut corriger avant d'envoyer.

### 4.2 Le devis

Le devis est **généré automatiquement en brouillon** à partir des réponses, puis **relu et validé par moi (admin)** avant envoi. Jamais d'envoi automatique.

Moteur de chiffrage (à implémenter dans `apps/api/src/quotes/pricing/`, configurable en base, pas en dur) :

- un **socle** selon la formule (voir §7),
- des **modules** par tâche sélectionnée (chaque tâche a un coût de mise en place et un poids d'usage),
- un **coefficient de volume** (fourchette de demandes/mois),
- un **coût de connexion** par outil à raccorder,
- une **complexité** ajustable à la main par l'admin (facteur 0,8 à 2,0 avec commentaire obligatoire).

Le devis PDF/HTML contient : le récapitulatif de la fiche de poste en langage clair, la liste de ce que l'assistant saura faire (formulée en bénéfices : « il prendra vos rendez-vous et les mettra dans votre agenda »), ce qui est **explicitement hors périmètre**, le délai de mise en service, les frais de mise en place, l'abonnement mensuel, la durée d'engagement, les CGV. Numérotation `DEV-AAAA-NNNN`.

Statuts : `brouillon → en_relecture → envoyé → vu → accepté | refusé | expiré` (expiration à 30 jours, relance automatique à J+7 et J+21).

Acceptation en ligne : le client clique « J'accepte », saisit son nom, coche les CGV → horodatage, IP, hash du contenu accepté conservés (valeur probante). Génération d'un PDF signé.

### 4.3 De l'acceptation à la facture

Acceptation → création automatique d'une **mission** (statut `à_préparer`) dans mon back-office, avec la fiche de poste, les réponses au questionnaire et une checklist de mise en service.

Facturation : facture d'acompte / de mise en place à l'acceptation, puis abonnement mensuel récurrent. Paiement par Stripe (carte + SEPA). Numérotation séquentielle inaltérable `FAC-AAAA-NNNN`, mentions légales françaises complètes, TVA configurable, export comptable CSV/FEC. **Aucune facture n'est jamais modifiée ni supprimée** : uniquement des avoirs.

Livraison : quand la mission passe à `en_service`, le client reçoit un email « Votre employé virtuel a pris son poste » et voit son assistant apparaître dans son espace.

---

## 5. Fonctionnalité 2 — Le catalogue d'employés virtuels prêts à l'emploi

Des assistants déjà construits, un par métier. Le client choisit, personnalise le minimum, et c'est actif.

### 5.1 Le catalogue

Page `/employes-virtuels` : une grille de cartes métier (illustration, nom, une phrase de bénéfice, prix à partir de). Filtres par secteur et par besoin.

Fiche métier `/employes-virtuels/[slug]` (ex. `/employes-virtuels/dentiste`), structure imposée :

1. **« Voici Léa, votre assistante de cabinet dentaire »** — prénom, photo/illustration, une phrase.
2. **Sa journée type** — timeline horaire concrète (« 7h30 : elle répond au premier patient qui veut décaler son rendez-vous… »).
3. **Ce qu'elle sait faire** — 6 à 8 puces en langage bénéfice.
4. **Ce qu'elle ne fait pas** — 3 puces, honnêteté assumée, ça rassure.
5. **Démonstration** — une conversation jouable directement dans la page (pré-scriptée pour le MVP, aucune inscription requise).
6. **Ce qu'elle vous fait gagner** — estimation d'heures/mois, calculée à partir de 2 curseurs (nombre de patients/jour, appels/jour).
7. **Son contrat** — prix, ce qui est inclus, résiliation.
8. **CTA** — « Mettre Léa au travail » + « Je veux quelque chose de plus précis » (bascule vers le sur-mesure).

Métiers du MVP : dentiste, restaurateur, garagiste, salon de coiffure, agence immobilière, artisan du bâtiment. Le catalogue est piloté en base (table `professions` + `assistant_templates`), pas en dur dans le code : je dois pouvoir ajouter un métier sans déploiement.

### 5.2 Mise en service en 5 minutes

Après souscription, un mini-parcours de **« premier jour »**, 4 écrans maximum :

1. Vos informations (nom de l'établissement, adresse, horaires d'ouverture).
2. Vos spécificités (3 à 5 questions propres au métier — pour le dentiste : types de soins, urgences acceptées ou non, praticiens).
3. Comment il vous joint (email, téléphone, où arrivent les demandes).
4. Essai en direct : le client teste son assistant, valide, et clique « Il peut commencer ».

Chaque template définit ses propres questions de personnalisation (schéma JSON stocké en base, rendu par un formulaire générique côté front).

---

## 6. Espace client (« Mon équipe »)

- **Mon équipe** — la liste de mes employés virtuels, avec leur état (au travail / en pause / en formation).
- **Fiche d'un assistant** :
  - *Son carnet de bord* : ce qu'il a fait aujourd'hui / cette semaine, en phrases lisibles (« il a pris 4 rendez-vous, répondu à 17 messages, transmis 2 demandes urgentes »).
  - *À valider* : les demandes qu'il n'a pas su traiter seul et qu'il remonte au patron.
  - *Le former* : corriger ses réponses, ajouter une consigne (« quand on demande le parking, réponds qu'il y en a un derrière le bâtiment »). Chaque consigne ajoutée est versionnée.
  - *Ses horaires* et *le mettre en pause*.
- **Mes documents** — devis, factures, contrat, téléchargeables.
- **Mon compte** — coordonnées, moyen de paiement, résiliation, export et suppression de mes données (RGPD).
- **Parler à un humain** — bouton visible partout. C'est un argument commercial, pas un aveu de faiblesse.

Multi-utilisateurs : une organisation, plusieurs membres, rôles `owner` / `member`.

---

## 6bis. Application mobile iOS et Android

**C'est là que le client vivra le produit au quotidien.** Un restaurateur ne va pas ouvrir un ordinateur portable entre deux services : il regarde son téléphone. L'application mobile n'est donc pas une version réduite du web, c'est le canal principal.

### Principe

- **Une seule base de code React Native + Expo (TypeScript)**, publiée sur l'App Store et le Play Store. Expo Router pour la navigation, EAS Build / EAS Submit pour les builds et les livraisons, EAS Update pour les correctifs sans repasser par la validation des stores.
- Elle consomme **exactement la même API NestJS** que le web (`/api/v1`), avec les types partagés depuis `packages/types`. Aucune logique métier dupliquée.
- Les textes clients viennent de `packages/copy` — la règle de vocabulaire du §2 s'applique à l'identique.
- Les composants purement visuels partagés vont dans `packages/ui-native` (séparé de `packages/ui`, qui reste web). On ne cherche pas à partager les composants entre web et mobile à tout prix : on partage les types, les appels API, la copy et les règles métier.

### Ce que l'application mobile fait

1. **Connexion sans mot de passe** — lien magique par email + `expo-secure-store` pour le jeton, biométrie (Face ID / empreinte) pour rouvrir l'app. Nos utilisateurs oublient leurs mots de passe : c'est le chemin par défaut, pas une option.
2. **Écran d'accueil « Aujourd'hui »** — en une seule vue, sans scroll : ce que votre employé a fait aujourd'hui, ce qui vous attend, ce qu'il n'a pas su traiter.
3. **À valider (escalades)** — le cœur de l'app. Une demande que l'assistant n'a pas su traiter arrive en **notification push**, le patron l'ouvre, répond en un tapotement ou dicte sa réponse, et l'assistant reprend la main. Objectif : traiter une escalade en moins de 15 secondes, d'une main.
4. **Le carnet de bord** — l'historique des conversations et des actions, filtrable, en langage clair.
5. **Le former** — ajouter une consigne en langage naturel, au clavier **ou à la voix** (dictée native). « Quand on demande le parking, dis qu'il y en a un derrière le bâtiment. »
6. **Le mettre en pause / le remettre au travail** — accessible en deux tapotements maximum, y compris depuis un widget d'écran d'accueil.
7. **Ses horaires** — modifiables rapidement (fermeture exceptionnelle, congés).
8. **Mes documents** — devis et factures consultables et partageables (feuille de partage native).
9. **Souscription** — parcours d'abonnement conforme aux règles des stores (voir ci-dessous).
10. **Parler à un humain** — appel ou message, en un tapotement.

Le questionnaire de devis sur mesure et le back-office **ne sont pas** dans l'app mobile : le questionnaire reste web (ouvert dans un navigateur in-app depuis l'app si besoin), le back-office est web uniquement.

### Contraintes mobiles à respecter

- **Notifications push** (Expo Notifications + APNs/FCM) : escalade urgente, résumé quotidien optionnel, échec de paiement. Réglages de notification granulaires et respect des heures de silence choisies par le client. Jamais de push marketing.
- **Mode hors ligne partiel** : le carnet de bord et les escalades récentes sont lisibles hors connexion (cache local), les actions sont mises en file et rejouées à la reconnexion. Un bandeau clair indique l'état de connexion.
- **Paiements et règles des stores** : Apple et Google exigent l'achat intégré pour du contenu numérique consommé dans l'app. Notre abonnement est un service à destination d'entreprises (B2B), ce qui relève normalement de l'exception « biens et services physiques / hors app » — **mais ce point doit être tranché avant le lot mobile**. Implémente donc la souscription derrière une abstraction `BillingProvider` avec deux implémentations possibles (Stripe web hors app / achat intégré via RevenueCat), et signale-moi ce choix comme un point de décision explicite plutôt que de le trancher seul.
- **Confidentialité des stores** : fiches App Privacy (Apple) et Data Safety (Google) à produire, avec les justificatifs. Suppression de compte accessible **depuis l'application** (exigence Apple), pas seulement depuis le web.
- **Accessibilité native** : Dynamic Type / taille de police système respectée, VoiceOver et TalkBack, contrastes AA, cibles tactiles 44pt minimum. Nos utilisateurs ont souvent plus de 45 ans : ne fige jamais une taille de police.
- **Performance perçue** : démarrage à froid sous 2 secondes, écrans squelettes, aucune roue qui tourne sans contexte.
- **Deep links** (`app://` + universal links / app links) : une notification ou un email ouvre directement le bon écran.
- **Tests** : Detox ou Maestro sur les parcours critiques (connexion, traitement d'une escalade, mise en pause). Builds de prévisualisation EAS sur chaque PR.

### Livraison sur les stores

Prévoir dès le lot mobile : comptes développeur Apple et Google, identité de l'app (nom affiché **Tando**, sous-titre « Votre employé virtuel », icône, écran de lancement), captures d'écran localisées FR, textes de fiche store rédigés avec le vocabulaire du §2 (jamais « agent IA »), politique de confidentialité en ligne, et une piste de test (TestFlight / test interne Play) avant la publication.

---

## 7. Offres

`[À COMPLÉTER — ajuster les prix]`

| | **Prêt à l'emploi** | **Sur mesure** | **Sur mesure +** |
|---|---|---|---|
| Mise en service | 0 € | à partir de 890 € | sur devis |
| Par mois | 89 €/mois | à partir de 199 €/mois | sur devis |
| Assistants inclus | 1 | 1 | plusieurs |
| Demandes/mois | 300 | 1 000 | illimité |
| Formation | Autonome | Faite avec vous | Faite avec vous + suivi mensuel |
| Support | Email 48h | Email 24h | Téléphone + interlocuteur dédié |
| Essai | 14 jours | — | — |

Le prix affiché est **mensuel, TTC, sans engagement**, et la page tarifs répond explicitement à « et si je veux arrêter ? ».

---

## 8. Landing page — textes rédigés

Structure et contenu à intégrer tels quels (retouches mineures autorisées, mais **ne pas réintroduire de jargon**).

### Hero

> # Recrutez un employé qui ne dort jamais.
>
> Tando vous prépare un employé virtuel qui répond à vos clients, prend vos rendez-vous et gère vos demandes. 24h/24, 7j/7, week-ends compris. Sans contrat de travail, sans charges, sans arrêt maladie.
>
> **[ Découvrir mon futur employé ]**  ·  [ Voir un exemple en 2 minutes ]
>
> *Mis au travail en 5 minutes. Sans engagement.*

Visuel : pas de robot, pas de cerveau bleu, pas de circuits imprimés. Un vrai commerçant, dans son commerce, détendu, pendant que le travail se fait.

### Le problème

> ## Pendant que vous travaillez, votre téléphone travaille contre vous.
>
> Un client appelle pendant le coup de feu : il raccroche et appelle le concurrent.
> Un message Instagram arrive à 22h : vous y répondez à 7h, il est trop tard.
> Un devis attend une relance depuis trois semaines : vous n'avez jamais eu le temps.
>
> **Ce ne sont pas des petites choses. C'est du chiffre d'affaires qui part ailleurs.**

### La solution en 3 étapes

> ## Comme une embauche. En beaucoup plus simple.
>
> **1. Vous décrivez le poste.** Quelques questions simples sur votre métier et ce qui vous prend du temps. Pas de vocabulaire compliqué, promis.
>
> **2. On vous le prépare.** Soit vous choisissez un employé déjà formé à votre métier, soit on en construit un exactement pour vous. Vous recevez un devis clair avant tout engagement.
>
> **3. Il prend son poste.** Il répond, il note, il réserve, il relance. Vous le suivez depuis votre téléphone, et vous pouvez le corriger d'un mot.

Ajouter une section « Depuis votre poche » avec les badges App Store et Google Play (à n'afficher qu'une fois l'app réellement publiée) :

> ## Il travaille. Vous gardez la main, depuis votre poche.
>
> Quand il ne sait pas répondre, vous recevez une notification. Vous lisez, vous répondez d'un mot, il reprend le travail. Le reste du temps, il ne vous dérange pas.
>
> *Application gratuite, incluse. iPhone et Android.*

### Les deux voies

> ### Il existe déjà quelqu'un pour votre métier
> Dentiste, restaurateur, garagiste, coiffeur, agent immobilier, artisan. On a déjà formé un employé virtuel pour votre métier. Il connaît vos habitudes, vos questions récurrentes, votre rythme.
> **[ Voir les employés disponibles ]**
>
> ### Votre besoin est particulier
> Vous avez une organisation à vous, des outils à vous, des règles à vous. On construit votre employé sur mesure. Vous répondez à quelques questions, vous recevez un devis précis, et vous décidez.
> **[ Décrire mon besoin ]**

### Rassurance

> ## Vos questions, nos réponses.
>
> **« Et s'il dit une bêtise à un client ? »** Vous fixez ses limites dès le départ. Ce dont il n'est pas sûr, il ne l'invente pas : il vous le transmet.
>
> **« Je ne suis pas à l'aise avec l'informatique. »** Vous n'aurez rien à installer. Si vous savez envoyer un message, vous savez le piloter.
>
> **« Mes données ? »** Elles restent en France, chez un hébergeur français, et ne servent à rien d'autre qu'à vous. Vous pouvez tout exporter ou tout effacer quand vous voulez.
>
> **« Et si je veux arrêter ? »** Vous arrêtez. Un clic, aucune pénalité, aucun préavis.
>
> **« Il remplace mon secrétariat ? »** Non. Il prend le travail que personne n'a le temps de faire. Votre équipe garde ce qui a de la valeur : le contact humain.

### CTA final

> ## Votre prochain employé est disponible tout de suite.
> Pas d'entretien, pas de période d'essai, pas de charges. Juste du travail en moins pour vous.
> **[ Commencer maintenant ]**  ·  *Sans carte bancaire.*

Le nom Tando apparaît dans le hero, dans le pied de page et dans la barre de navigation — pas davantage. Le reste de la page parle du client, pas de la marque.

### Ton d'écriture, règles

- Le **vous** partout, jamais le « nous » corporate.
- Phrases courtes. Une idée par phrase.
- Aucun superlatif technologique (« révolutionnaire », « de pointe », « propulsé par l'IA de dernière génération »).
- Aucun pourcentage inventé, aucun faux témoignage, aucun logo client fictif. Si on n'a pas de preuve, on n'en met pas.
- Les bénéfices sont exprimés en **temps gagné** et en **clients qui ne partent pas**, jamais en fonctionnalités.

---

## 9. Technique

### 9.1 Stack imposée

- **Monorepo Turborepo + pnpm.**
- `apps/web` — **Next.js 15+ (App Router, TypeScript)** : landing, catalogue, questionnaire, espace client. Tailwind CSS + shadcn/ui. Rendu serveur pour tout le contenu public (SEO local prioritaire).
- `apps/api` — **NestJS (TypeScript)** : API REST versionnée `/api/v1`, validation par `class-validator`/Zod, documentation OpenAPI générée.
- `apps/mobile` — **React Native + Expo (TypeScript)**, iOS et Android, une seule base de code. Expo Router, EAS Build/Submit/Update, Expo Notifications, `expo-secure-store`. Voir §6bis pour le périmètre fonctionnel et les contraintes.
- `apps/admin` — back-office (peut être une section protégée de `apps/web` si tu juges que c'est plus sain ; propose et justifie).
- **PostgreSQL + Prisma**, migrations versionnées.
- `packages/ui` (web), `packages/ui-native` (mobile), `packages/config`, `packages/types` (types partagés générés depuis l'API, consommés par le web **et** le mobile), `packages/api-client` (client HTTP typé partagé web/mobile), `packages/copy` (tous les textes clients, centralisés — voir §2).
- **Redis** + BullMQ pour les jobs (emails, relances de devis, génération PDF).
- Stripe (paiements + abonnements), Resend ou équivalent (emails transactionnels), stockage objet S3-compatible (documents, PDF).
- Auth : email + lien magique en priorité (nos clients oublient leurs mots de passe), mot de passe en option, sessions httpOnly. Pas de dépendance à un fournisseur d'identité tiers propriétaire.
- Tests : Vitest (unitaire), Playwright (parcours web critiques : questionnaire → devis → acceptation → paiement), Maestro ou Detox (parcours mobile critiques).
- Docker Compose pour le développement. CI GitHub Actions : lint, typecheck, tests, build web + API, build de prévisualisation EAS pour le mobile.

**L'API est le contrat unique.** Web, mobile et back-office consomment la même API versionnée. Toute règle métier vit dans `apps/api` : si une logique doit être réécrite dans l'app mobile, c'est qu'elle est au mauvais endroit.

### 9.2 Modèle de données (à affiner dans ton plan)

`organizations`, `users`, `memberships`, `professions`, `assistant_templates`, `assistant_template_versions`, `needs_assessments` (le questionnaire, réponses en JSONB), `job_descriptions` (la fiche de poste, versionnée), `quotes`, `quote_line_items`, `quote_acceptances`, `missions`, `assistants`, `assistant_instructions` (les consignes ajoutées par le client, versionnées), `conversations`, `messages`, `escalations` (ce qu'il remonte au patron), `subscriptions`, `invoices`, `invoice_line_items`, `credit_notes`, `payments`, `pricing_rules`, `audit_logs`.

Règles : soft delete partout sauf sur les documents comptables (immuables), `organization_id` sur toute table métier avec isolation systématique en base (Row Level Security ou garde applicative centralisée — pas de filtrage laissé à la main de chaque requête), horodatages UTC, `audit_logs` sur toute action sensible (accès aux données client, changement de prix, envoi de devis).

### 9.3 Couche « employé virtuel »

Isole toute la logique du moteur derrière une interface `AssistantRuntime` dans `apps/api/src/assistants/runtime/`, avec une implémentation par défaut et une implémentation `fake` pour les tests et les démos de la landing. Le reste de l'application ne doit jamais dépendre d'un fournisseur de modèle en particulier — je dois pouvoir en changer sans toucher au produit.

Un assistant = une fiche de poste (contexte métier + consignes du template + consignes ajoutées par le client) + une liste de capacités activées + des garde-fous (ce qu'il ne doit jamais faire) + une politique d'escalade (quand il passe la main à l'humain). Quand il n'est pas sûr, il **escalade**, il n'invente pas. Cette règle est structurelle, pas un réglage.

Pour le MVP : les capacités « prendre un rendez-vous » et « répondre aux questions courantes » suffisent. Le reste est stubbé derrière l'interface.

### 9.4 Sécurité, RGPD, conformité

Non négociable, à traiter dès le lot 0 :

- Hébergement **UE** (France de préférence), donnée client jamais transférée hors UE.
- Chiffrement au repos des données personnelles sensibles, TLS partout, secrets hors du dépôt.
- Registre des traitements, politique de confidentialité, CGU/CGV, bandeau cookies conforme CNIL (refus aussi simple que l'acceptation), DPA type pour les clients professionnels.
- Droits RGPD implémentés **dans le produit**, pas par email : export complet et suppression depuis « Mon compte ».
- Durées de conservation configurables et purge automatique.
- Rate limiting, protection CSRF, en-têtes de sécurité, validation stricte de toute entrée, journalisation sans données personnelles en clair.
- Mentions légales complètes et facturation conforme à la réglementation française (numérotation séquentielle, mentions obligatoires, inaltérabilité).

### 9.5 Accessibilité et ergonomie

Nos utilisateurs ont 45 ans en moyenne, consultent depuis leur téléphone, souvent debout, souvent pressés.

- **Mobile-first strict.** Tout doit être utilisable d'une main.
- Corps de texte 16px minimum, contrastes AA, cibles tactiles 44px minimum.
- Aucun écran vide sans explication ni action proposée.
- Chaque message d'erreur dit **quoi faire**, jamais ce qui a techniquement échoué.
- Le questionnaire doit être terminable en moins de 4 minutes.
- Pas de dark pattern : la résiliation est aussi visible que la souscription.

---

## 10. Roadmap — lots de livraison

**Lot 0 — Fondations.** Monorepo (avec l'emplacement `apps/mobile` déjà prévu), Docker Compose, Prisma + schéma initial, auth par lien magique, design system (tokens partagés web/mobile, composants de base), `packages/types` et `packages/api-client`, `CLAUDE.md`, CI. Livrable : `pnpm dev` démarre tout, on peut se connecter.

**Lot 1 — Vitrine.** Landing avec les textes du §8, page tarifs, FAQ, mentions légales, CGV, cookies. SEO technique et SEO local. Livrable : site public déployable.

**Lot 2 — Catalogue.** Modèle `professions` / `assistant_templates`, liste et fiches métier, démo pré-scriptée jouable, back-office pour créer un métier sans déploiement. 6 métiers seedés.

**Lot 3 — Devis sur mesure.** Questionnaire adaptatif avec sauvegarde et reprise, génération de la fiche de poste en langage clair, moteur de chiffrage configurable, devis PDF, relecture admin, envoi, acceptation en ligne horodatée.

**Lot 4 — Paiement et facturation.** Stripe (paiement unique + abonnement), webhooks idempotents, factures conformes, avoirs, espace documents client, export comptable.

**Lot 5 — Espace client et mise en service.** « Mon équipe », parcours « premier jour » du prêt à l'emploi, carnet de bord, escalades, formation de l'assistant, pause et résiliation.

**Lot 6 — Runtime.** `AssistantRuntime`, capacités « rendez-vous » et « questions courantes », politique d'escalade, journalisation, garde-fous.

**Lot 7 — Application mobile, socle.** `apps/mobile` sous Expo, navigation, connexion par lien magique + biométrie, écran « Aujourd'hui », carnet de bord, mise en pause, consommation de `packages/api-client`. Livrable : build de prévisualisation EAS installable sur un iPhone et un Android.

**Lot 8 — Application mobile, le cœur.** Escalades avec notifications push (APNs + FCM), réponse en un tapotement, dictée vocale pour les consignes, mode hors ligne partiel avec file d'actions, deep links, widget de mise en pause, réglages de notification.

**Lot 9 — Publication sur les stores.** `BillingProvider` (Stripe hors app / RevenueCat selon la décision prise), suppression de compte dans l'app, fiches App Privacy et Data Safety, icône, écran de lancement, captures et textes de fiche store en français, TestFlight et test interne Play, puis soumission.

**Lot 10 — Back-office.** Pilotage des missions, des devis, des prix, des templates, des clients. Tableau de bord d'activité.

**Lot 11 — Durcissement.** Tests end-to-end web (Playwright) et mobile (Maestro/Detox) des parcours critiques, audit de sécurité, performance, accessibilité (web et native), monitoring et alertes, documentation de déploiement.

---

## 11. Critères d'acceptation du MVP

- Un restaurateur qui ne connaît rien à l'informatique comprend la page d'accueil en moins de 30 secondes et sait quoi faire ensuite.
- Le mot « agent », « IA générative », « prompt » ou « LLM » n'apparaît **nulle part** dans une interface client. Ajoute un test automatisé qui échoue si un terme de la liste noire apparaît dans `packages/copy` ou dans le JSX de `apps/web`.
- Le questionnaire se termine en moins de 4 minutes sur mobile, et une session interrompue est récupérable.
- Un devis accepté génère automatiquement une mission et une facture, sans intervention manuelle.
- Aucune donnée d'une organisation n'est accessible depuis une autre — prouvé par un test.
- Le parcours complet « je découvre la landing → je choisis le dentiste → je paie → mon assistant est actif » passe en test Playwright.
- L'export et la suppression de compte fonctionnent réellement — depuis le web **et** depuis l'application mobile.
- Tout le produit est utilisable au clavier et lisible en contraste AA ; l'app mobile est utilisable avec VoiceOver et TalkBack et respecte la taille de police du système.
- Une escalade envoyée en notification push est traitée depuis le téléphone, d'une seule main, en moins de 15 secondes — mesuré sur un vrai appareil.
- L'application mobile fonctionne sur iOS et Android depuis **une seule base de code**, et une règle métier n'y est jamais réécrite.
- Un build de prévisualisation EAS est installable sur un appareil réel à la fin de chaque lot mobile.

---

## 12. Ce que tu ne dois pas faire

- Ne pas inventer de témoignages clients, de logos, de chiffres de performance ou de labels de conformité.
- Ne pas promettre dans l'interface une capacité qui n'est pas implémentée.
- Ne pas coupler le produit à un fournisseur de modèle : tout passe par `AssistantRuntime`.
- Ne pas mettre les prix, les métiers ou les textes en dur dans les composants.
- Ne pas livrer un lot sans savoir le lancer et le tester.
- Ne pas ajouter de dépendance lourde sans me demander.
- Ne pas livrer l'app mobile sous forme de simple WebView du site : c'est une vraie application native, avec ses notifications, son mode hors ligne et ses codes.
- Ne pas dupliquer une règle métier entre `apps/web` et `apps/mobile` : elle vit dans l'API.
- Ne pas produire de code « générique impressionnant » : je préfère peu de code, lisible, qui marche.
- Ne pas décliner la marque : pas de « Tando AI », pas de sous-marque, pas de mascotte, pas de logo robot.

---

## 13. Informations à me demander avant de démarrer

`[À COMPLÉTER par moi ou à demander]`

- Identité visuelle (couleurs, typo) ou carte blanche.
- Prix définitifs des trois formules.
- Statut juridique, SIRET, adresse et mentions légales.
- Métiers exacts à lancer en premier, et priorité entre eux.
- Hébergeur cible et budget d'infrastructure mensuel.
- Comptes développeur Apple (99 $/an) et Google Play (25 $ une fois) : déjà ouverts ou à créer ?
- Décision sur la facturation mobile : abonnement hors app (Stripe) ou achat intégré (voir §6bis) ?
- Y a-t-il déjà des clients ou des prospects identifiés à interroger avant de figer le questionnaire ?

---

**Commence par le plan (§0, point 1). N'écris aucun code avant que je l'aie validé.**
