# Une seule instance vidéo pour les bandes-annonces

## Réception et diagnostic

Walson confirme Mob Psycho animé dans le héros, puis audio sans image dans sa
fiche et en plein écran, parfois suivi de Bande-annonce indisponible. Re:ZERO
échoue aussi dans la fiche. Il demande de réutiliser le chemin du héros plutôt
que de multiplier les parcours de lecture.

Le diagnostic SDK borné réutilise le même MP4 réel Re:ZERO, SHA256
`44d6e0815645ff5c129fa728d5cbe1be96167bbba3e2315a531dc93bc75d22cc`,
sur les composants Hero et EpisodePlayer. Trente relevés sont collectés sur
soixante secondes. Dans le second lecteur, les données brutes indiquent vidéo,
audio et position croissante, mais videoReady reste faux. Masquer le héros puis
libérer son objet et rejouer le second ne rétablit pas cette propriété.
Walson n’a pas vu la première étape ; il confirme le noir avec audio pour les
quatre autres. Aucun succès physique n’est déduit des positions ou de hasVideo.
Le serveur temporaire est fermé. Aucun épisode ni progression n’est écrit.

Ces observations n’établissent ni une panne de codec, ni une limite matérielle
précise. Elles invalident le précédent parcours de preview par EpisodePlayer.
La référence positive reste le rendu du héros confirmé par Walson.

## Chemin partagé

Hero expose maintenant son instance Trailer existante. La fiche et son plein
écran pilotent **ce même objet et son même MediaPlayer**, sans autre décodeur
de bande-annonce. Le parent de la surface ne change pas. Le cadrage et les
dimensions suivent le mode ; les textes, les rangées et les dégradés propres
à l’accueil sont cachés pendant la fiche. La fiche conserve ses propres visuels
de secours et dégradés. En plein écran, elle laisse la surface vidéo apparaître
et les commandes sont superposées.

TrailerPlayer est seulement un contrôleur de télécommande et de commandes
PlayerControls déjà utilisées : il ne contient ni MediaPlayer ni VideoOutput.
Pause au centre, position proposée puis confirmée, Retour par couches et erreur
avec reprise restent applicables. Le passage fiche/plein écran conserve source,
position et instance VideoOutput. Le défilement et le départ d’un épisode
libèrent la source. Un lecteur sans source n’envoie pas un stop susceptible
d’interférer avec la lecture d’épisode. Le composant reste préchargé pour la
durée de vie du bootstrap ; aucun fichier QML ne doit être rechargé après son TTL.

La résolution reste celle du backend : référence YouTube de la saison AniList,
préparation MP4 canonique, grant temporaire partagé. La sélection de format,
les caches, les identités et les règles de saison ne sont pas changés ici.
Aucune bande-annonce d’une autre saison n’est inventée en cas d’absence.
Le consommateur Oby est conservé et testé ; aucune intention réelle n’est envoyée.

## Vérifications

Hôte QML complet passé en HLS et MP4 avec suivi, chargements, retraits,
bandes-annonces et intentions Oby simulées. Le scénario MP4 vérifie en plus
l’identité exacte de l’objet partagé, l’unique MediaPlayer de bande-annonce et
la conservation du VideoOutput en plein écran. Le décodage est simulé dans
ce banc ; les captures ne prouvent pas l’image matérielle.

La revue des vrais composants en 1280×720 conserve le fond de fiche et le
lecteur accepté, notamment le titre, le contraste, la timeline et la pause au
centre. Les preuves sont dans `2026-10-31-atlas-tv-shared-preview/`.
La réception native de cette nouvelle architecture reste à confirmer après
publication, sur un titre dont le héros fonctionne.
