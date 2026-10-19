# Mise en service Firebase

## Projet et région

1. Créer un projet Firebase dédié à la famille ; choisir la région Firestore avant de créer la base. Une région européenne est le choix prévu.
2. Activer Firebase Authentication : Google pour le parent, e-mail / mot de passe pour les profils enfants. Les enfants peuvent utiliser des identifiants techniques créés par le parent, sans boîte mail personnelle ; conserver les identifiants dans un gestionnaire de mots de passe.
3. Créer Firestore en mode production. Les fonctions sont configurées en `europe-west1`. Cloud Functions peut nécessiter un projet avec facturation activée ; vérifier le plan Firebase avant tout déploiement. Les appels de démonstration n’activent aucun service payant.
4. Enregistrer une application web (ou deux) et renseigner les variables de `.env.local` depuis `.env.example`.
5. Ajouter les domaines des deux sites à la liste des domaines autorisés de Firebase Auth.

La configuration web Firebase est publique ; les clés de compte de service sont des secrets et ne doivent jamais figurer dans `VITE_*` ou Git.

## Attribution des droits

Le parent se connecte une première fois avec Google pour créer son compte Auth. Ce compte reste sans accès aux données tant que ses droits ne sont pas attribués. Créer les deux comptes enfants dans Firebase Auth, puis noter leurs UID.

Le script d’administration utilise les Application Default Credentials, configurées en dehors du dépôt. Aucun secret n’est passé en argument.

```sh
export GCLOUD_PROJECT=VOTRE_PROJET
npm run provision -- famille PARENT_UID ENFANT_UID_1:maurice:Maurice:6e ENFANT_UID_2:ondine:Ondine:CE1
```

Ces valeurs sont des exemples. `parentUid` et les UID enfants doivent être réels. Les comptes sont indépendants ; le choix d’un prénom dans l’interface n’accorde jamais de droits supplémentaires. Un enfant connecté ne reçoit que son propre profil. L’espace parent vérifie le rôle et la base applique également l’isolation.

Les custom claims sont écrites uniquement par le script serveur. La réexécution sur la même famille est possible. Le script refuse de déplacer un compte d’une autre famille. Ce n’est pas une transaction entre Auth et Firestore : après un incident, le relancer pour terminer le provisionnement. Reconnecter ensuite les comptes.

## Vérification sans projet réel

```sh
npm ci
npm run check
npm test
npm run test:rules
```

La commande de règles démarre un émulateur Firestore sur `demo-famille`, valide les accès parent/enfant, le refus des écritures directes et la déduplication du serveur. Elle ne déploie rien.

Pour tester toute la chaîne Auth / fonctions / navigateur, utiliser `npm run emulators`, créer les comptes via l’interface d’émulation, appliquer le script avec `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` et `GCLOUD_PROJECT=demo-famille`. Configurer les variables web pour ce projet de démonstration, avec `VITE_USE_EMULATORS=true`.

## Hébergement des deux interfaces

Firebase Hosting est préparé comme option de déploiement des deux sites. Tout hébergeur de fichiers statiques convient également ; le backend reste Firebase.

Après authentification du CLI Firebase et création de deux sites Hosting :

```sh
npx firebase target:apply hosting enfants ID_SITE_ENFANTS --project VOTRE_PROJET
npx firebase target:apply hosting parents ID_SITE_PARENTS --project VOTRE_PROJET
npm run build
npx firebase deploy --only firestore,functions,hosting --project VOTRE_PROJET
```

Renseigner le même projet dans les deux builds. Ne jamais déployer avec `VITE_USE_EMULATORS=true`. Le code du site peut être public sans rendre les données publiques : Auth et les règles protègent les lectures, la fonction vérifie chaque écriture. Choisir l’audience de l’hébergement séparément si un accès au site lui-même doit être limité.

Un déploiement automatique par GitHub Actions pourra utiliser Workload Identity Federation après création du projet. La CI actuelle n’inclut aucun identifiant et n’effectue pas de déploiement de production.

## Export et exploitation

```sh
export GCLOUD_PROJECT=VOTRE_PROJET
npm run export:family -- famille
```

Les fichiers `exports/` sont exclus de Git. Ils contiennent les données personnelles ; ne pas les joindre aux dépôts de code. Prévoir sauvegardes Firestore, budgets/alertes et politique de rétention lors de la mise en service réelle.

La protection App Check peut être ajoutée au navigateur et imposée à la fonction après configuration du fournisseur. L’authentification et la validation des rôles fonctionnent déjà sans cette protection complémentaire.
