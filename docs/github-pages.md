# GitHub Pages

Un seul site contient trois entrées : l’accueil, `enfants/` et `parents/`. La source des contenus et celle des interfaces appartiennent au même dépôt.

## Éligibilité et activation

GitHub affiche actuellement « Upgrade or make this repository public to enable Pages » pour ce dépôt privé. La publication reste donc en attente d’un choix : rendre le dépôt de la plateforme public, ou utiliser une offre compatible avec Pages sur dépôts privés. Aucun changement de visibilité ou achat n’est effectué par les scripts.

Le dépôt `famille-exercices` n’a pas besoin de Pages : ses packs sont maintenant inclus dans `content/` au sein de la plateforme.

Une fois le dépôt éligible, sélectionner **Settings → Pages → Source → GitHub Actions**, puis lancer le workflow **Plateforme et contrats** depuis l’onglet Actions. Les prochaines mises à jour de `main` seront publiées après réussite de tous les contrôles. Pour un dépôt privé sur une offre compatible, définir en plus la variable de dépôt `PAGES_ENABLED=true`.

## Build et chemins

```sh
npm run build:pages
```

Le build produit `dist/pages/index.html`, `dist/pages/enfants/` et `dist/pages/parents/`. La variable `GITHUB_PAGES_BASE` règle le préfixe public, par défaut `/famille-apprentissages`. Le workflow utilise le préfixe fourni par `actions/configure-pages`.

Les liens d’accueil et les assets respectent ce préfixe. Les builds Firebase et le développement local gardent leur chemin de base `/`.

## Données et connexion

Pages sert les fichiers statiques. Firebase continue de gérer l’authentification et les données ; les fonctions doivent être déployées séparément dans le projet Firebase.

Sans variables Firebase, le site reste une démonstration locale. Les résultats ne sont alors pas partagés entre appareils. Pour activer la connexion, définir les variables de dépôt `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` et éventuellement `VITE_FIREBASE_REGION`, puis relancer le workflow. Ces paramètres web sont publics ; aucun secret serveur ne doit utiliser ce préfixe.

Ajouter le domaine Pages aux domaines autorisés de Firebase Auth. L’accès à la page parent et celui aux statistiques sont distincts : les règles Firestore et les rôles serveur protègent les données, même si les fichiers du site sont publics.

Sources : [workflows Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [déploiement Vite](https://vite.dev/guide/static-deploy.html).
