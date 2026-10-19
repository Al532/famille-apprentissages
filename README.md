# Les petits chemins — plateforme d’apprentissage familiale

Socle modulaire pour deux interfaces : les enfants apprennent, les parents suivent les résultats. Les classes initiales sont le CE1 et la sixième ; les profils ne sont pas limités à ces niveaux.

## Deux dépôts, deux responsabilités

| Dépôt | Contenu |
| --- | --- |
| `famille-apprentissages` (celui-ci) | Applications enfants et parents, contrats de données, moteur de révision, correction, Firebase, tests et documentation. |
| `famille-exercices` | Packs pédagogiques JSON, versions des contenus et validation. |

Les deux interfaces appartiennent au même dépôt pour évoluer avec les mêmes contrats et le même catalogue. Elles produisent deux sites indépendants. Aucun projet Firebase réel ni hébergement n’est créé par ce squelette.

## Essayer en local

Node.js 22 ou 24 ; Java 21 recommandé pour les tests Firebase (17 fonctionne avec le CLI verrouillé actuel).

```sh
npm ci
npm run dev
```

Ouvrir l’adresse affichée. Le lien **Voir le suivi parent** permet de consulter sur la même origine les réponses du mode démo. Un changement d’origine (port, navigateur, appareil) utilise un autre stockage local. Les deux profils de démonstration sont prédéfinis. Aucun compte ni accès à une base de données n’est nécessaire à ce mode.

```sh
npm run dev:parents
npm run catalog:validate
npm run check
npm test
npm run build
npm run test:rules
```

`dev:parents` lance l’interface parent seule, sur un autre port : ce port ne partage donc pas les données locales du premier. En mode Firebase les deux sites partagent bien la même base.

## Ce qui fonctionne déjà

- QCM, réponses numériques et cartes mémoire avec autoévaluation.
- Deux petits ateliers de démonstration CE1 / sixième.
- Planification FSRS et sélection des révisions dues, puis des nouvelles questions.
- Résultats par enfant, atelier et compétence ; distinction entre correction objective et autoévaluation.
- Application parent générique : toute nouvelle compétence déclarée apparaît sans nouvel écran à programmer.
- Mode Firebase câblé : Auth, écoute Firestore, correction et écritures via une fonction serveur transactionnelle.
- Déduplication des réponses, isolation des familles et des profils, export administratif JSON.
- Builds séparés enfants / parents et CI commune.

Le contenu de départ n’est ni un diagnostic scolaire ni une couverture du programme. Les exercices musicaux, l’analyse micro, un véritable bilan initial et l’import Anki restent des extensions à ajouter.

## Activer Firebase

Lire [la configuration](docs/firebase.md) puis [l’architecture](docs/architecture.md). Copier `.env.example` en `.env.local`, créer le projet et ses comptes, provisionner les droits, puis déployer. Ne jamais mettre de compte de service dans le navigateur ou le dépôt.

## Ajouter du contenu

Cloner `famille-exercices` à côté de ce dépôt. Après modification et validation des packs :

```sh
npm run catalog:import -- ../famille-exercices
npm run catalog:validate
npm run check
npm test
npm run build
```

Relire le diff de `packages/catalog/catalog.json`, committer puis publier les deux interfaces et le serveur dans la même livraison. Le catalogue est une copie versionnée embarquée : le fonctionnement quotidien ne dépend pas d’un accès à GitHub. Les règles d’évolution sont détaillées dans [le guide des modules](docs/modules.md).

## État de livraison

Les sources sont hébergées dans deux dépôts **privés** : [famille-apprentissages](https://github.com/Al532/famille-apprentissages) et [famille-exercices](https://github.com/Al532/famille-exercices). Le projet Firebase et le déploiement réel restent à configurer. Aucun secret ni identifiant de projet réel n’est inclus.
