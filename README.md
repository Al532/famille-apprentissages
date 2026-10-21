# Les petits chemins — apprentissage en famille

Un seul dépôt pour le hub des enfants, son espace parent, les contenus pédagogiques et le socle Firebase. Les profils initiaux correspondent au CE1 et à la sixième ; les niveaux restent ouverts.

## Organisation

| Emplacement | Rôle |
| --- | --- |
| `apps/web` | Interfaces enfants et parents, construites avec les mêmes contrats. |
| `content` | Packs pédagogiques et manifeste du catalogue. |
| `packages/core` | Validation, évaluation, projections de progression et répétition espacée FSRS. |
| `packages/catalog` | Copie embarquée du catalogue, vérifiée contre les packs sources par la CI. |
| `infra` | règles d’accès aux réponses synchronisées (Spark, sans serveur payant). |
| `docs` | Architecture, ajout de modules et mise en service. |

Le site dispose d’une page d’accueil et de deux sous-pages : `/enfants/` et `/parents/`. Une seule livraison les met à jour ensemble. Le dépôt `famille-exercices`, créé lors du socle initial, reste un historique de départ ; les nouveaux contenus s’éditent ici, dans `content/`.

Les espaces enfants et parents sont des webapps installables séparément (PWA), avec leur icône et une fenêtre autonome. Ouvrir l’espace voulu puis choisir **Installer l’app**, ou utiliser le menu d’installation du navigateur. Les ateliers synchronisés nécessitent une connexion Internet. Voir [l’installation](docs/installation.md).

## Essayer en local

Node.js 22 ou 24 ; Java 21 recommandé pour l’émulateur Firebase.

```sh
npm ci
npm run dev
```

Sans configuration Firebase, le mode démonstration fonctionne dans le navigateur. Le lien **Voir le suivi parent** permet de consulter les résultats locaux sur la même origine. Un autre port, navigateur ou appareil utilise un autre stockage local.

## Ajouter des exercices

Modifier les packs de `content/packs` et leur manifeste `content/catalog.json`, incrémenter leurs versions puis exécuter :

```sh
npm run catalog:import
npm run catalog:validate
```

Committer packs et catalogue embarqué ensemble. La validation refuse une livraison où ces deux représentations divergent. Une nouvelle compétence apparaît automatiquement dans le suivi parent. Un nouveau type d’activité ajoute son renderer et son évaluateur dans la même plateforme ; voir [le guide des modules](docs/modules.md).

## Vérifier et construire

```sh
npm run check
npm test
npm run build
npm run build:pages
npm run test:rules
```

`npm run build` prépare les deux interfaces pour Firebase Hosting (aucun backend payant). `npm run build:pages` produit `dist/pages`, avec l’accueil et les sous-pages enfants/parents aux bons chemins GitHub Pages.

La CI vérifie le catalogue, les types, le moteur, les builds et les règles Firestore. La publication Pages se lance ensuite sur `main` lorsque le dépôt est éligible : dépôt public, ou variable `PAGES_ENABLED=true` pour un dépôt privé bénéficiant d’une offre compatible. Voir [la configuration Pages](docs/github-pages.md).

## Firebase et état du projet

Le projet Firebase réel est créé ; le mode synchronisé utilise uniquement Spark, sans compte de facturation. Copier `.env.example` en `.env.local` puis suivre [la mise en service](docs/firebase.md). L’authentification et les documents d’accès protégés déterminent les rôles et la famille. Firestore conserve les réponses brutes immuables ; les deux interfaces recalculent les corrections, le suivi et les révisions. Le chemin `/parents/` organise le site, les droits Firebase protègent les données.

Les séances de Maurice reposent sur la répétition espacée **par notion ou par repère factuel**, avec 56 thèmes et 859 QCM expliqués en français et histoire-géographie. L’enfant choisit une matière ou toutes. Une séance associe quelques notions à comprendre et/ou des repères à mémoriser, alterne les exemples, reprend les erreurs après d’autres questions et s’arrête après un travail suffisant (24 réponses ou 12 minutes de temps de réponse au maximum). Les bonnes réponses passent automatiquement ; les erreurs attendent la lecture du corrigé. L’exemple de fractions a été retiré du parcours actif, avec conservation de son historique. L’atelier CE1 existant reste disponible. Voir [le moteur des séances](docs/seances-concepts.md), [le français](docs/francais-6e.md) et [l’histoire-géographie](docs/histoire-geographie.md).

Ce contenu n’est ni un diagnostic scolaire ni une couverture intégrale du programme : l’expression orale, la fluidité de lecture et la rédaction longue ne sont pas évaluées. L’import Anki, les parcours musicaux et l’analyse micro restent des modules à développer.

[Architecture](docs/architecture.md) · [Modules](docs/modules.md) · [Firebase](docs/firebase.md) · [GitHub Pages](docs/github-pages.md)
