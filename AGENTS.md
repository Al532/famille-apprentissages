# Consignes de contribution

- Réponses et interface en français ; noms de code cohérents et simples.
- Garder enfants, parents, backend et contrats dans une même livraison compatible.
- Toute nouvelle activité doit produire un résultat versionné lisible dans l’espace parent.
- Aucun accès à une famille par simple choix d’un prénom ; droits via Auth et documents access protégés par les règles Firestore. Le premier parent est configuré uniquement par un administrateur.
- Mode Spark demandé le 20 octobre 2026 : aucun serveur payant, aucune Cloud Function. Synchroniser uniquement les réponses brutes immuables horodatées par Firestore ; recalculer corrections, statistiques et FSRS dans chaque interface avec le catalogue versionné. Ne jamais accepter un score client stocké comme autorité. Les règles valident le format et les droits ; le suivi familial ne certifie pas les conditions réelles de réponse.
- Ne pas modifier la signification des identifiants de compétences ou de questions déjà publiés.
- Ne pas écrire de secrets, données d’enfants, exports ou médias micro dans Git.
- Vérifications : `npm run catalog:validate`, `npm run check`, `npm test`, `npm run build`, `npm run test:rules`.
- Documenter les limites réelles ; ne pas appeler un taux de réussite une maîtrise scolaire.
