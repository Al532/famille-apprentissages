# Architecture de la plateforme

Un dépôt contient le site enfants, le suivi parent, les contenus et le moteur partagé. Une livraison met à jour les deux interfaces et les contrats ensemble. GitHub Pages héberge l’accueil, `/enfants/` et `/parents/`.

## Mode gratuit Spark

Firebase Authentication identifie les comptes. Firestore stocke les documents d’accès, les profils et les réponses brutes. Aucun appel Cloud Functions, aucun calcul serveur payant et aucun compte Cloud Billing n’est requis.

- `access/{uid}` : `familyId`, `role` (`parent` ou `learner`) et `learnerId` pour un enfant.
- `families/{familyId}/learners/{id}` : prénom, classe et UID du compte enfant.
- `families/{familyId}/learners/{id}/attempts/{uuid}` : tentative versionnée, UID émetteur et date serveur.

Le premier parent est confirmé par l’administrateur dans la console. Un parent peut ensuite créer un compte enfant et son profil lié, sans changer sa propre session. Les rattachements et profils sont écrits ensemble ; aucun compte ne peut s’attribuer le rôle parent.

Les règles Firestore limitent la lecture à la famille et au rôle. Un enfant ne voit que son profil et son historique. Seul son compte peut ajouter ses réponses ; personne ne peut les remplacer, les supprimer depuis l’application ou fournir un compteur de réussite. Chaque réponse est idempotente grâce à son UUID et une transaction Firestore.

## Calcul partagé du suivi

Les deux interfaces écoutent les réponses et appliquent le moteur `packages/core` : correction, projection des compétences et FSRS par notion et par jour pour les règles et raisonnements, ou par carte et par jour pour les repères factuels. Voir [les séances par notion](seances-concepts.md). Le tri utilise l’horodatage serveur, puis l’UUID pour départager deux dates identiques. Les résultats et cartes calculés restent en mémoire, sans colonne de score fournie par l’enfant dans la base.

Chaque tentative identifie sa révision et sa version de module. Le catalogue actif et les versions archivées sont livrés ensemble ; une mise à jour ne change donc pas le sens d’une ancienne réponse. Les références inconnues sont conservées et signalées dans le suivi partiel.

C’est un suivi familial d’entraînement : la durée et la réponse sont déclarées par l’appareil, les corrigés lui sont accessibles et le système ne certifie pas les conditions de passation. La sécurité des données repose sur Auth et les règles, pas sur le choix d’un prénom ou le chemin `/parents/`.

## Hors connexion et quotas

Les erreurs de synchronisation sont visibles. Une réponse non confirmée ne devient pas un résultat local prétendument partagé ; elle peut être réessayée sans doublon tant que la page reste ouverte. Aucun import automatique du mode démonstration.

Le forfait Spark borne l’usage gratuit. Dépasser un quota peut interrompre le service ; cela n’active pas de paiement à l’usage. L’historique est chargé à la connexion et écouté ensuite. Le coût en lectures augmente avec l’historique et le nombre de nouvelles connexions : surveiller Utilisation pour rester dans les quotas documentés.

Voir [la mise en service et ses limites](firebase.md).
