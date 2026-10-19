# Consignes de contribution

- Réponses et interface en français ; noms de code cohérents et simples.
- Garder enfants, parents, backend et contrats dans une même livraison compatible.
- Toute nouvelle activité doit produire un résultat versionné lisible dans l’espace parent.
- Aucun accès à une famille par simple choix d’un prénom ; droits uniquement via Auth / serveur.
- Ne jamais envoyer un score client faisant autorité ; valider et corriger côté serveur.
- Ne pas modifier la signification des identifiants de compétences ou de questions déjà publiés.
- Ne pas écrire de secrets, données d’enfants, exports ou médias micro dans Git.
- Vérifications : `npm run catalog:validate`, `npm run check`, `npm test`, `npm run build`, `npm run test:rules`.
- Documenter les limites réelles ; ne pas appeler un taux de réussite une maîtrise scolaire.
