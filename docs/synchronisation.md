# Sauvegarde locale et synchronisation

Une réponse est d’abord validée avec le catalogue versionné et écrite dans une file locale persistante du navigateur. La séance continue dès cette écriture, sans attendre Firebase. Seules les réponses brutes et leur date locale provisoire sont stockées ; correction, suivi et calendrier sont recalculés.

La file est isolée par compte Firebase et famille. Un enregistrement indépendant par UUID évite que deux onglets remplacent leurs files respectives. L’envoi en arrière-plan utilise la transaction existante : une réponse ne peut être créée qu’une fois, avec les règles d’accès inchangées et un horodatage serveur. Une nouvelle tentative reprend le même UUID. La copie locale n’est retirée qu’après réception de la réponse confirmée dans l’historique Firebase. L’historique confirmé prime sur la copie provisoire pour éviter les doubles comptes.

L’envoi reprend toutes les 20 secondes, au retour du réseau, au retour dans l’application et après une nouvelle réponse. Une attente réseau de plus de 15 secondes libère le traitement en arrière-plan ; la réponse reste dans la file. Les réponses sont envoyées dans l’ordre local. Les parents ne voient que les réponses synchronisées ; l’appareil enfant utilise aussi sa file provisoire pour continuer son parcours. L’heure définitive du suivi partagé est l’heure d’enregistrement par Firebase et peut différer de l’heure provisoire après une coupure.

Un indicateur affiche le nombre de réponses en attente. Un refus de droits reste signalé, sans supprimer les réponses. Si le stockage local est indisponible ou plein, la réponse n’est pas annoncée comme enregistrée : l’enfant peut réessayer.

Limites : le navigateur doit pouvoir conserver ses données. Effacer les données du site supprime les réponses non synchronisées. L’envoi ne fonctionne pas application fermée : il reprend lors de sa prochaine ouverture avec le même compte. Cette file ne rend pas possible une première connexion hors ligne ni le chargement intégral de l’application sans réseau.
