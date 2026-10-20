# Firebase gratuit — mise en service Spark

Cette application utilise uniquement Firebase Authentication (Google et e-mail/mot de passe), Firestore Standard et des fichiers statiques sur GitHub Pages. Aucun compte Cloud Billing, aucune Cloud Function, aucun service payant n’est nécessaire.

## Ce qui se synchronise

Chaque réponse est enregistrée dans `families/{familyId}/learners/{learnerId}/attempts/{uuid}` : réponse brute, référence exacte du catalogue, durée déclarée, compte émetteur et horodatage serveur Firestore. Une transaction rend les nouvelles tentatives d’envoi idempotentes. Aucun score, compteur ou état FSRS calculé par un enfant n’est stocké comme autorité.

Les interfaces enfant et parent recalculent les corrections, les compétences et les révisions à partir de ce même historique. Les anciens catalogues sont conservés dans `packages/catalog/archive.json` par `npm run catalog:import`. Il faut incrémenter la révision avant de changer un contenu publié. Une réponse impossible à interpréter reste conservée et le suivi est explicitement signalé comme partiel.

Les règles contrôlent l’identité, la famille, le profil, le format des champs et la date serveur ; elles interdisent le remplacement et la suppression des réponses par les navigateurs. Les corrections sont calculées dans le navigateur : l’outil n’atteste pas qu’un enfant a répondu sans aide et ne constitue pas une évaluation scolaire certifiée. Les corrigés font déjà partie du contenu pédagogique livré au navigateur.

## Quotas, absence de paiement et déconnexion

Conserver le projet sur **Spark** et ne lui associer aucun compte de facturation. Au 20 octobre 2026, Firestore offre 1 Gio de stockage, 50 000 lectures, 20 000 écritures et 20 000 suppressions par jour. Les quotas gratuits sont limités ; une limite atteinte entraîne des erreurs ou une interruption du service concerné, sans facturation automatique sur Spark. Vérifier l’onglet Utilisation si une erreur `resource-exhausted` apparaît. Les connexions Google et e-mail n’utilisent ni SMS ni service d’IA.

Une séance écrit un document par réponse. Une première connexion relit l’historique accessible ; le parent n’écoute que sa famille. Les mises à jour temps réel sont limitées aux profils et réponses. Pour une famille et des séances courtes, ces quotas laissent une marge, mais la gratuité ne signifie pas une capacité illimitée.

Une nouvelle réponse n’est annoncée comme enregistrée qu’après confirmation Firestore. Hors connexion, la réponse en cours peut être réessayée avec son même identifiant ; aucun repli silencieux vers la démonstration. Ne pas fermer la page avant cette confirmation. Une file durable de réponses hors ligne n’est pas implémentée. Le calendrier de révision utilise l’heure serveur des réponses ; le choix des questions à revoir utilise l’horloge de l’appareil.

Sources officielles : [Spark et Blaze](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [quotas Firestore](https://firebase.google.com/docs/firestore/quotas), [transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

## 1. Préparer le projet

- Projet dédié existant : `famille-apprentissages-minel`, sans facturation activée.
- Firestore `(default)` Standard en `europe-west1` (Belgique), mode production.
- Activer Authentication : Google et Adresse e-mail/Mot de passe.
- Enregistrer une application web ; recopier ses valeurs publiques depuis `.env.example` dans `.env.local`.
- Autoriser `al532.github.io` dans Authentication > Paramètres > Domaines autorisés. Autoriser `localhost` uniquement pour un essai local voulu.
- Ne jamais placer une clé de compte de service ou un mot de passe dans `VITE_*`, dans le dépôt ou dans GitHub Actions.

## 2. Déployer les règles avant de publier le site connecté

Après connexion normale au CLI Firebase avec le compte propriétaire :

```sh
npm ci
npm run catalog:validate
npm run check
npm test
npm run build
npm run build:pages
npm run test:rules
npx firebase deploy --only firestore:rules,firestore:indexes --project famille-apprentissages-minel
```

Cette configuration ne contient plus de déploiement `functions`. Les droits initiaux restent fermés tant que le premier parent n’est pas confirmé par l’administrateur.

## 3. Activer le premier parent, une seule fois

1. Ouvrir `/parents/` et choisir « Se connecter avec Google ». Le compte Auth est créé, mais il n’a encore aucun droit sur les données.
2. L’interface affiche l’UID de ce compte. Dans la console Firebase administrateur, créer un document `access/{UID_EXACT}` contenant uniquement deux champs texte : `familyId` = un identifiant de famille choisi, et `role` = `parent`.
3. Cliquer « Actualiser mes droits » dans l’application. Le parent peut maintenant créer les profils et suivre sa famille.

Ne jamais créer le premier accès parent depuis le navigateur public de l’application. Les règles refusent tout auto-attribution ou modification de droits parent, y compris par un compte parent existant. Aucun UID réel ni nom d’enfant ne doit être committé.

## 4. Créer les comptes enfants

Dans l’espace parent, ouvrir « Ajouter un enfant à ma famille », saisir prénom, classe, identifiant au format e-mail et un nouveau mot de passe d’au moins 12 caractères. C’est le parent qui choisit et saisit le mot de passe dans l’interface ; le conserver dans un gestionnaire de mots de passe. Le compte secondaire utilisé pendant la création n’interrompt pas la connexion du parent. Les mots de passe ne passent pas par Firestore.

Le profil et le rattachement `access/{UID_ENFANT}` sont créés dans un même lot validé par les règles. Un profil correspond à un seul compte. Le parent ne peut pas promouvoir un autre compte parent ni déplacer un compte déjà associé à une autre famille. Un enfant ne peut lire et alimenter que son propre historique ; il ne peut lister les profils des autres.

Une adresse technique sans boîte mail peut servir d’identifiant. Dans ce cas, la récupération par e-mail ne sera pas possible : le propriétaire du projet pourra remplacer le mot de passe depuis la console Authentication. Une création Auth et un lot Firestore ne sont pas une transaction unique ; si le lot échoue, l’application tente de supprimer le compte Auth tout juste créé. Si cette compensation échoue aussi, elle signale l’association à terminer dans la console.

Administration locale facultative : `npm run provision -- famille PARENT_UID [ENFANT_UID:ID:Prénom:Classe ...]`, avec ADC configurées hors dépôt et `GCLOUD_PROJECT` défini. Les comptes doivent déjà exister. Cette commande ne crée ni compte de facturation ni Cloud Function. Pour un projet vierge, la création du seul document parent dans la console est plus simple.

## 5. Publication GitHub Pages

Renseigner les quatre variables publiques `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` dans les variables Actions du dépôt. La CI construit et publie `/enfants/` et `/parents/` ensemble après validation. Le code peut être public ; les données sont protégées par Auth et les règles.

Sans ces variables, le site reste en démonstration locale. Ne pas activer `VITE_USE_EMULATORS` dans une publication. Le fichier `.env.local` n’est jamais committé.

## Vérifications

`npm run test:rules` démarre un émulateur Firestore sur `demo-famille`, sans joindre le projet réel. Les tests couvrent l’isolation des familles et enfants, le refus d’auto-attribution parent, les profils liés atomiquement, le refus des scores et dates arbitraires, l’immutabilité et la déduplication entre deux clients. Un parent reçoit la nouvelle réponse par écoute temps réel et reconstruit le même suivi que l’enfant.

Pour essayer l’interface avec les services locaux : `npm run emulators` (Java 21), configurer `VITE_USE_EMULATORS=true`, créer les comptes depuis l’interface d’émulation puis le document d’accès parent. Aucune donnée locale de démonstration n’est importée automatiquement dans la famille réelle.

## Export et conservation

`GCLOUD_PROJECT=... npm run export:family -- famille` utilise les identifiants administrateur locaux et exporte notamment les réponses brutes. Les fichiers `exports/` sont exclus de Git. Les anciennes collections de résultats sont exportées par compatibilité mais ne sont pas consommées par le mode Spark. Aucun ancien résultat réel n’existait lors de la préparation du projet.

Les sauvegardes Firestore gérées et la restauration à un instant donné ne font pas partie de ce dispositif gratuit. Prévoir des exports locaux à la demande. Une suppression de données se fait par l’administrateur de la console, après accord de l’utilisateur ; les navigateurs de l’application ne peuvent pas effacer l’historique.
