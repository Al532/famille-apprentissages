# Ajouter ou faire évoluer un atelier

## Ajouter des questions de types connus

1. Modifier ou créer un pack dans `content/packs`.
2. Déclarer ses compétences avec des identifiants stables ; chaque question référence une ou plusieurs de ces compétences.
3. Utiliser `choice`, `number`, `text` ou `flashcard`. Pour un QCM, la bonne réponse doit être présente dans `options`. `text` demande une réponse courte exacte ; préciser dans la consigne les mots possibles ou le verbe à conjuguer. Les apostrophes droites/courbes, la casse et les espaces sont normalisés, mais les accents restent significatifs (`a` ≠ `à`).
4. Incrémenter la version du module et la révision du catalogue. Ne pas changer la signification d’un identifiant existant : une question ou une compétence différente reçoit un nouvel identifiant. Les états de révision existants se rattachent à ces identifiants stables.
5. Exécuter `npm run catalog:import`, valider puis livrer ensemble les deux interfaces et le serveur depuis ce même dépôt.

Les niveaux sont des étiquettes ouvertes (`CE1`, `6e`, etc.) et ne limitent pas le système à ces deux classes. Le profil de l’enfant détermine le catalogue de départ, pas ses capacités réelles.

Le champ facultatif `passage` affiche un texte de lecture distinct de la question. `explanation` fournit la correction après chaque réponse. Le filtre de compétence permet de travailler un point précis, en conservant les mêmes identifiants et états FSRS que dans le parcours mélangé. L’ordre des nouvelles questions peut entrelacer les compétences dans le pack ; les révisions dues gardent la priorité.

Le parcours de français de consolidation CM2 → 6e est décrit dans [francais-6e.md](francais-6e.md).

## Ajouter un nouveau type (micro, dictée, jeu…)

Faire une seule PR dans la plateforme avec :

- un schéma de consigne et de réponse versionné ;
- un renderer enfant accessible et adapté au téléphone ;
- un évaluateur serveur ou une politique explicite si l’évaluation dépend d’une mesure locale ;
- une sortie compatible avec le suivi commun, ou un nouveau contrat compatible avec les anciens événements ;
- des tests couvrant les résultats et leur lecture dans le suivi parent ;
- un exemple de contenu et la documentation du module.

Le tableau parent actuel affiche automatiquement les compétences et compteurs communs. Si le nouveau module mesure une autre dimension (justesse en cents, temps de lecture, généralisation à une autre octave…), conserver cette mesure séparément du taux de réussite et définir sa présentation dans la même PR.

## Exercices musicaux envisagés

Un module peut préciser instrument, transposition et cible sonore, sans rendre le catalogue entier dépendant du son. Pour le piano, distinguer nom de note, hauteur exacte et généralisation à une autre octave. Pour la trompette en si bémol, stocker explicitement note écrite et hauteur attendue. L’analyse peut rester locale, en envoyant uniquement la mesure utile au résultat ; aucun enregistrement micro n’est requis par l’architecture.

Les applications musicales existantes ne sont pas importées par ce socle. Leur intégration future passera par un adaptateur qui émet le contrat commun, avec les mêmes identifiants, versions et droits.
