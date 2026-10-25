# Séances, notions et cartes de mémorisation

Le parcours de Maurice comporte 1 103 QCM expliqués, regroupés en 77 thèmes et compétences : **67 notions transférables** et **113 cartes de mémorisation**. Plusieurs formulations peuvent tester une même carte ; elles partagent alors son calendrier.

## Choisir la bonne unité de révision

Une notion représente une méthode ou une distinction réutilisable : accorder le verbe avec son sujet, différencier a/as/à, lire une légende ou confronter des sources. Les anciens groupes trop larges ont été remplacés par des identifiants plus précis. Les accords du groupe nominal, du verbe et du participe passé avec être ont notamment trois calendriers distincts.

Une carte représente une connaissance particulière : le synonyme d’un mot, le sens d’une expression, une orthographe lexicale, une date ou un lieu. Réussir le synonyme de « joyeux » ne repousse pas la révision du contraire de « généreux ». Les méthodes de formation des mots et de déduction du sens à partir d’indices restent des notions. Les homophones lexicaux sont suivis par mot ; les homophones grammaticaux restent suivis par distinction.

## Composer une séance

L’enfant choisit une matière ou toutes les matières. Le moteur prend en priorité les erreurs et les révisions dues, puis introduit de nouvelles notions et cartes. Les nouvelles notions tournent entre ateliers ; les nouvelles cartes tournent entre thèmes. Les objectifs sont alternés pendant la séance.

La sélection vise environ douze réponses initiales. Elle propose jusqu’à trois notions lorsqu’il existe aussi des cartes, ou quatre notions sinon. Le budget tient compte du nombre de variantes nécessaires : une notion qui demande six variantes coûte six réponses initiales, pas trois. Les places restantes accueillent des cartes.

Une notion est suffisamment travaillée pour la journée lorsque :

- au moins trois contextes distincts ont été réussis dès leur première présentation du jour ;
- toutes ses variantes requises ont été vérifiées, par exemple a, as **et** à, ou COD **et** COI ;
- les erreurs ont été corrigées et au moins deux contextes nouveaux ont été réussis après la dernière erreur.

Si une notion possède plus de trois variantes, chacune doit être représentée. Les petites activités historiques d’Ondine conservent leur cible adaptée à leur réserve disponible.

Le sélecteur privilégie les variantes manquantes et les contextes encore inédits. Deux consignes portant sur la même phrase ne sont pas deux preuves indépendantes. Plusieurs questions sur un même texte ou un même plan ne remplacent pas un transfert à un autre contexte. Pour la conjugaison, le verbe demandé fait partie du contexte : « vous faites » et « vous voyiez » ne sont pas le même exercice, même si les deux consignes comportent « Vous ___ ».

Une erreur revient après au moins trois autres réponses. Sa simple correction ne constitue pas une nouvelle preuve de transfert sur la journée. Les anciens exemples peuvent être réutilisés à une révision ultérieure ; il n’est pas demandé d’épuiser la banque.

## Bornes et calendrier

La séance s’arrête lorsque ses objectifs sont remplis, après **24 réponses**, après **12 minutes de temps de réponse cumulé**, ou lorsque les notions restantes atteignent **8 réponses par notion et par journée française**. Le temps de lecture du corrigé entre deux questions n’entre pas dans ce cumul. L’enfant peut aussi terminer volontairement ; chaque réponse est conservée.

Une seule révision FSRS est calculée par notion et par journée (Europe/Paris), puis recalculée au fil des réponses :

- preuves suffisantes sans erreur : note 3, prochaine échéance entre le lendemain et 60 jours ;
- preuves suffisantes après erreur : note 2, reprise le lendemain ;
- travail incomplet ou erreur non résolue : note 1, reprise le lendemain, avec poursuite possible aujourd’hui dans les limites prévues.

Une notion suffisamment travaillée ne revient plus dans les autres séances de la journée. Pour une carte, une réussite termine l’objectif du jour. Un échec reste programmé pour le lendemain même après correction. Plusieurs formulations d’une même carte ne créent ni plusieurs calendriers ni plusieurs révisions FSRS le même jour.

## Historique et suivi parent

Les réponses brutes immuables et les anciennes versions de catalogue sont conservées. Chaque réponse reste corrigée avec son catalogue d’origine. Ses identifiants de module et de question permettent ensuite de la rattacher à la compétence actuelle, plus précise. On ne réutilise pas un ancien identifiant de compétence pour lui donner un autre sens.

Cette répartition ne transforme pas trois anciens accords du verbe en preuves sur les autres accords. Les intervalles sont reconstruits avec les critères de variété actuels ; une ancienne validation trop large peut donc redevenir une notion à consolider. Le groupe chevauchant mon/m’ont/ton/t’ont a été réparti entre mon/m’ont et le calendrier existant de ton/t’ont.

Les deux interfaces utilisent les mêmes projections. Le parent voit les réponses et les variantes restant à vérifier. « Exemples variés réussis » décrit des observations sur une journée, sans certifier une maîtrise scolaire. Les QCM ne mesurent pas la production écrite autonome. Aucun score client dérivé n’est écrit comme autorité dans Firestore.

## Métadonnées de contenu

- `skills[].variants` déclare les distinctions indispensables ; `variantId` rattache chaque question de notion à l’une d’elles.
- `contextId` peut regrouper explicitement des situations. Le texte support et la phrase cible permettent également de reconnaître les contextes partagés, même sans cette métadonnée.
- `reviewMode: "question"` active la mémorisation par carte. `reviewId` référence une question canonique de la même compétence lorsque plusieurs formulations testent une même connaissance. Sans `reviewId`, la carte garde son identifiant de question.

Le contrat refuse les variantes inconnues ou absentes et les références de carte invalides. Les tests vérifient aussi la présence de plusieurs contextes par variante, la possibilité de terminer chaque notion et la conservation du sens des questions publiées.

## Lecture musicale d’Ondine

La lecture commence par do3, ré3, mi3. Deux réussites consécutives sur chaque note introduite débloquent fa3, sol3, puis do3 en main gauche, si2, la2, sol2 et fa2. Les anciennes notes restent mêlées aux nouvelles ; une erreur revient après deux autres réponses. Les séances conservent leurs bornes de 24 réponses et 12 minutes.

Le corrigé affiche et prononce seulement le nom de la note. L’activité externe « Les petites notes · Piano » conserve son suivi et ses droits propres ; ses résultats micro ne sont pas importés dans ce hub.
