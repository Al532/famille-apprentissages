# Installer Les petits chemins

L’application reste une webapp, accessible avec les mêmes adresses et comptes. Chaque espace peut s’installer séparément :

- Enfants : <https://al532.github.io/famille-apprentissages/enfants/>
- Parents : <https://al532.github.io/famille-apprentissages/parents/>

Sur Android, ouvrir l’adresse dans Chrome puis toucher **Installer l’app**. Si la proposition du navigateur n’est pas encore disponible, ouvrir le menu ⋮ puis **Installer l’application** ou **Ajouter à l’écran d’accueil**. Dans un navigateur intégré à une messagerie, ouvrir d’abord le lien dans Chrome.

Sur iPhone/iPad, ouvrir l’adresse dans Safari, choisir **Partager → Ajouter à l’écran d’accueil**, et laisser **Ouvrir comme app** activé lorsqu’il est proposé. Sur ordinateur, utiliser l’icône d’installation dans la barre d’adresse d’un navigateur compatible.

L’installation ouvre l’espace choisi dans une fenêtre autonome. Les comptes et droits Firebase restent identiques. Il faut créer les comptes enfants dans l’espace parent avant leur connexion. Les réponses synchronisées se retrouvent après connexion au même compte.

## Connexion et mises à jour

Une connexion Internet reste nécessaire pour ouvrir les ateliers synchronisés. Une fois la séance ouverte, les réponses sont sauvegardées sur l’appareil et synchronisées automatiquement en arrière-plan. La séance continue pendant une coupure réseau. Une ouverture entièrement hors connexion peut encore afficher la page **Réessayer**. Voir [la sauvegarde et la synchronisation](synchronisation.md).

Le bouton **Mettre à jour l’app** apparaît quand une nouvelle version du service worker est prête. Terminer la saisie en cours avant de l’utiliser : ce bouton recharge la page. Les réponses déjà sauvegardées dans la file locale restent conservées. Aucun rechargement automatique n’est imposé pendant une séance.

## Livraison et périmètre du cache

`scripts/pwa.ts`, appelé par Vite pour chaque espace, produit le manifeste, le service worker et la page hors connexion. Les chemins s’adaptent au préfixe GitHub Pages ou à une publication à la racine. Les icônes PNG de 192 et 512 pixels sont incluses, avec un dessin centré adapté au masquage Android.

Les installations enfants et parents ont des identifiants, périmètres et caches séparés. Le cache contient uniquement des fichiers statiques explicitement listés. Les requêtes Firebase, les authentifications Google, les réponses utilisateur et les autres sites ne sont pas interceptés. Les navigations demandent toujours le HTML actuel au réseau. Les anciens caches du même espace sont retirés à l’activation ; les autres caches et les données de connexion ne sont pas effacés.

Les tests `tests/pwa.test.ts` couvrent les périmètres, le renouvellement du cache, l’exclusion des API et le comportement hors connexion. `npm run build:pages` inclut ces fichiers dans les deux sous-pages ; ils ne nécessitent ni service payant ni infrastructure supplémentaire.
