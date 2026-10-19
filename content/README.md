# Contenus pédagogiques

Ce dossier est la source des packs d’exercices de la plateforme. `catalog.json` déclare la révision et les packs inclus. Les types et compétences suivent le schéma canonique de `packages/core`.

Après modification :

```sh
npm run catalog:import
npm run catalog:validate
```

L’import met à jour `packages/catalog/catalog.json`, copie embarquée par les deux interfaces et le serveur. La CI vérifie que cette copie correspond exactement aux packs sources. Les contenus et les écrans sont donc livrés dans le même dépôt et le même commit.

Les exemples actuels CE1/sixième ne couvrent pas les programmes et ne constituent pas un diagnostic scolaire.
