# Les petits chemins — apprentissage en famille

Un seul dépôt pour le hub des enfants, son espace parent, les contenus pédagogiques et le socle Firebase. Les profils initiaux correspondent au CE1 et à la sixième ; les niveaux restent ouverts.

## Organisation

| Emplacement | Rôle |
| --- | --- |
| `apps/web` | Interfaces enfants et parents, construites avec les mêmes contrats. |
| `content` | Packs pédagogiques et manifeste du catalogue. |
| `packages/core` | Validation, évaluation, projections de progression et répétition espacée FSRS. |
| `packages/catalog` | Copie embarquée du catalogue, vérifiée contre les packs sources par la CI. |
| `functions` et `infra` | API Firebase transactionnelle et règles d’accès aux données. |
| `docs` | Architecture, ajout de modules et mise en service. |

Le site dispose d’une page d’accueil et de deux sous-pages : `/enfants/` et `/parents/`. Une seule livraison les met à jour ensemble. Le dépôt `famille-exercices`, créé lors du socle initial, reste un historique de départ ; les nouveaux contenus s’éditent ici, dans `content/`.

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

`npm run build` prépare les deux interfaces pour Firebase Hosting et le backend. `npm run build:pages` produit `dist/pages`, avec l’accueil et les sous-pages enfants/parents aux bons chemins GitHub Pages.

La CI vérifie le catalogue, les types, le moteur, les builds et les règles Firestore. La publication Pages se lance ensuite sur `main` lorsque le dépôt est éligible : dépôt public, ou variable `PAGES_ENABLED=true` pour un dépôt privé bénéficiant d’une offre compatible. Voir [la configuration Pages](docs/github-pages.md).

## Firebase et état du projet

Le projet Firebase réel reste à créer et à configurer. Copier `.env.example` en `.env.local` puis suivre [la mise en service](docs/firebase.md). L’authentification détermine les rôles et la famille ; le serveur évalue et enregistre les réponses. Le chemin `/parents/` organise le site, les droits Firebase protègent les données.

Les QCM, réponses numériques et flashcards fonctionnent, avec deux petits ateliers d’exemple. Ce contenu n’est ni un diagnostic scolaire ni une couverture du programme. L’import Anki, les parcours musicaux et l’analyse micro restent des modules à développer.

[Architecture](docs/architecture.md) · [Modules](docs/modules.md) · [Firebase](docs/firebase.md) · [GitHub Pages](docs/github-pages.md)
