# Séances et révisions par notion

Le système est **hybride** : une notion (`moduleId` + `skillId`) pour les règles et raisonnements ; une carte (`moduleId` + `exerciseId`) pour les repères factuels. Le français utilise des notions ; l’histoire-géographie distingue les deux modes jusque dans un même thème. Les identifiants publiés restent stables. Maurice dispose de **859 QCM**, répartis en 56 groupes thématiques : **50 notions** avec des réserves de questions (au moins 12 chacune) et **89 repères factuels** espacés individuellement. Les 197 questions d’histoire-géographie regroupent 108 situations de compréhension et ces 89 repères.

L’exemple de fractions a quitté le catalogue actif ; ses réponses historiques restent interprétables avec les catalogues archivés. L’atelier CE1 d’Ondine reste disponible.

## Composer une séance

L’enfant choisit Français, Histoire-géographie ou Toutes les matières. Le moteur retient des notions et/ou des repères dus ou nouveaux, pour environ douze réponses initiales : quatre notions en français, ou deux notions et six repères en histoire-géographie lorsque les deux sont disponibles. Une séance toutes matières propose habituellement trois notions et trois repères. Le nombre s’adapte aux contenus disponibles. Les erreurs non récupérées sont prioritaires. Une séance mélangée répartit le travail entre les matières disponibles et alterne les objectifs ; les différents ateliers fournissent les nouvelles notions à tour de rôle.

Une notion est suffisamment travaillée pour la journée après trois contextes distincts réussis à leur première présentation du jour. Après une erreur :

- la question erronée revient après au moins trois autres réponses ; elle doit être réussie ;
- la réussite de cette correction ne compte pas comme une première réussite sur un nouveau contexte ;
- deux nouveaux contextes doivent être réussis après la dernière erreur, avec toujours trois premières réussites distinctes au total.

Les questions inédites sont choisies avant les questions déjà réussies. Les erreurs à reprendre constituent l’exception. Quand la réserve est épuisée, les exemples les moins récemment vus servent de recours ; une même question ne suit pas immédiatement sa propre réponse. `contextId` permet de regrouper plusieurs questions qui partagent une même situation : elles ne constituent pas trois preuves indépendantes.

La séance habituelle comporte environ 12 réponses si les objectifs sont immédiatement réussis. Elle s’allonge en fonction des difficultés, jusqu’à **24 réponses**, **12 minutes de temps de réponse cumulé**, ou **8 réponses par notion et par journée française**. Ces bornes évitent une séance sans fin. Il n’est pas nécessaire de traiter toute la banque. L’enfant peut aussi terminer volontairement. Les réponses sont enregistrées individuellement ; une interruption conserve les preuves et les erreurs, même si la sélection exacte de la séance n’est pas restaurée.

## Repères factuels en histoire-géographie

Chaque question concernée porte `reviewMode: "question"`. Exemples : dates des guerres, capitales et fleuves, grandes périodes et noms des principaux symboles. Les autres questions de français et d’histoire-géographie utilisent `concept`, par défaut. Les questions factuelles n’entrent pas dans les preuves de compréhension d’une notion, même si elles appartiennent au même thème.

Une réponse correcte termine l’objectif de cette carte pour la séance. Une erreur attend son explication puis un réessai après trois autres réponses. Si nécessaire, de nouvelles cartes intercalaires évitent un réessai immédiat. Un échec reste programmé pour le lendemain même après correction. FSRS est calculé une seule fois par carte et par journée française : répéter sa correction ne crée pas plusieurs jours de mémorisation. Les cartes réussies attendent leur propre échéance ; les nouveaux repères tournent entre thèmes.

## Calendrier commun enfant / parent

`projectConcepts` reconstruit un état FSRS par notion depuis les réponses brutes déjà corrigées avec leur catalogue d’origine. Les réponses d’une même journée (fuseau Europe/Paris) produisent **une seule révision FSRS**, recalculée au fil des réponses, plutôt qu’un renforcement artificiel à chaque carte.

- Preuves suffisantes, sans erreur : note FSRS 3 ; prochaine échéance entre le lendemain et 60 jours.
- Preuves suffisantes après erreur : note 2 et reprise le lendemain.
- Travail incomplet ou erreur non résolue : note 1 et reprise le lendemain ; la séance peut continuer aujourd’hui tant que la limite quotidienne n’est pas atteinte.

Un ancien résultat reste rattaché à ses identifiants de notion. Aucun effacement, changement de droits ou migration d’écriture Firestore n’est nécessaire. Les anciennes projections de cartes restent disponibles pour la compatibilité de l’historique ; le sélecteur utilise les états de notion et les états des repères factuels prévus par le mode de chaque question. Aucun score dérivé de client n’est stocké comme vérité dans Firestore.

## Interface

La séance occupe le viewport utile, avec prise en compte des zones de sécurité des téléphones et de la PWA. Un débordement exceptionnel reste défilable, notamment pour une longue explication ou une grande taille de police. Une bonne réponse affiche un signe de réussite puis passe automatiquement à la suivante après 650 ms. Une mauvaise réponse affiche le corrigé et attend « J’ai compris ». En cas d’échec d’enregistrement, seul le réessai de la même tentative est proposé, sans doublon.

Le suivi parent présente les notions, les exemples rencontrés, les réponses observées et l’échéance. « Exemples variés réussis » décrit des preuves sur une journée, pas une maîtrise scolaire certifiée. Les QCM ne prouvent pas à eux seuls une capacité de rédaction ou de production autonome. Les paramètres sont des choix pédagogiques initiaux, pas un dispositif validé de diagnostic scolaire.
