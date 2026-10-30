# Bandes-annonces : réception native et reprise du lecteur

## Échec observé

Sur `hero-detail-preview-390d8b68e685`, Walson signale l’absence de bande-annonce
dans la fiche, du son sans image en plein écran sur Re:ZERO et des commandes
non conformes au lecteur précédemment accepté. Le bouton de pause du lecteur
spécifique était placé trop bas. Les tests du décodeur simulé de ce premier lot
ne validaient ni la surface vidéo matérielle, ni cette composition.

Cette réception remplace toute supposition de réussite native du
[premier lot](2026-10-30-atlas-tv-detail-previews.md).

## Disponibilité : référence et vidéo lisible sont distinctes

L’audit en lecture seule réalisé côté backend porte sur 149 titres uniques de
l’accueil et de ses compléments : 141 possèdent une référence YouTube valide,
8 n’en possèdent pas. **94,6 % est un taux de référencement**, pas de lecture
réussie. Huit références ont alors un média frais en cache ; 133 ne sont pas
préparées, ce qui ne démontre pas leur indisponibilité.

La source canonique est `carte.bande_annonce`, issue du trailer YouTube AniList.
Le backend initial exige le format progressif YouTube 18. Son absence peut faire
échouer une vidéo pourtant référencée. Le backend ajoute le repli vers un
autre MP4 progressif H264/AAC borné dans le commit
`39cfb1c3e1af9c88e90730b78a0f0c6a8e902917`, vérifié réellement servi au prévol.
Son taux de lecture réel reste à mesurer séparément. Aucune extraction massive
n’est lancée ici.

Le serveur borne aussi le cache à seize fichiers et protège ceux couverts par
des tickets valides quinze minutes. Après de nombreuses consultations, un
`preview_cache_busy` reste possible. La file client ci-dessous ne supprime pas
cette limite serveur ; une évolution coordonnée des tickets reste à examiner.

## Sortie vidéo et commandes

La fiche réutilise maintenant **EpisodePlayer**, avec un mode bande-annonce.
Son parent reste la racine de l’application : plus de changement de parent
entre le Flickable et le plein écran. Seules ses dimensions, son cadrage et ses
commandes changent. Le fond de fiche laisse apparaître la vidéo derrière son
en-tête quand elle est prête ; son contenu et ses dégradés gardent leur place.
Une absence, une préparation ou une erreur conserve le visuel connu.

Le plein écran reprend la composition validée du lecteur, sa timeline avec
position proposée puis confirmée par OK, sa pause réellement centrée et son
Retour par couches. Retour masque la barre puis retrouve la fiche. Une
préparation ou une erreur permet de retrouver directement la fiche. L’ouverture
et la fermeture du plein écran gardent source et position. Les menus réservés
aux épisodes sont masqués. La préférence sonore de l’accueil est conservée.

Le mode bande-annonce interdit les écritures de progression. Il ne crée pas
de playback d’épisode. Le défilement, le suivi, Retour, un changement de fiche
et la résolution d’un épisode libèrent la sortie. Un grant qui échoue dans le
lecteur est invalidé ; une reprise explicite peut en obtenir un nouveau.
Le lecteur d’épisode conserve ses valeurs et son comportement par défaut.

## Préparations et cible courante

Au lieu de renvoyer immédiatement une erreur à la troisième demande, TvPreviews
garde deux préparations actives et au plus deux en attente. Les abonnements
annulables de l’accueil et de la fiche suppriment les attentes devenues obsolètes.
Une préparation déjà active peut seulement réchauffer le cache si son écran
est quitté. Les générations et l’identité empêchent son résultat d’ouvrir
une vidéo sur une autre œuvre. Aucun préchargement de toutes les cartes.

Cache partagé, seize grants, huit abonnés par identité, validation stricte du
chemin, de l’identité AniList/YouTube et de l’expiration restent applicables.
Les grant et jetons restent en mémoire. Une invalidation de session rejette
les réponses de l’ancien epoch.

## Vérifications

Le banc du véritable hôte QML couvre MP4 et HLS, le suivi personnel et les
épisodes, avec transport et décodeur simulés. Il vérifie aussi la file, son
annulation, le cache partagé, le parent racine stable, la sortie unique, le
plein écran sans redémarrage, pause/reprise, proposition/confirmation du seek,
Retour, la position du feedback de pause, l’invalidation d’un grant en erreur,
les réponses tardives, une mauvaise identité et l’absence de métadonnées.
Il contrôle que les bandes-annonces ne créent ni session ni progression.

Les captures montrent les vrais composants avec une frame de banc, et ne sont
pas une preuve de lecture réelle de Frieren. La revue vérifie le titre, le
contraste derrière le texte, les actions de fiche, le cadrage, la timeline et
la pause au centre. Aucun épisode réel n’est lancé par les tests de ce lot.

Un diagnostic SDK borné a fait lire le MP4 réel de Re:ZERO dans EpisodePlayer
à la racine pendant vingt secondes. Les dix relevés indiquent vidéo et audio,
statut Buffered, erreur nulle, durée 100147 ms et position de 1879 à 19878 ms.
Le fichier est H264 Main niveau 3.0, 640×360, AAC-LC ; SHA256
`44d6e0815645ff5c129fa728d5cbe1be96167bbba3e2315a531dc93bc75d22cc`.
Le serveur temporaire a été fermé, puis l’application normale restaurée.
Ces relevés **ne prouvent pas l’image affichée** : la confirmation physique
de la nouvelle composition reste nécessaire après publication.

Les preuves bornées et captures de cette passe sont conservées dans
`2026-10-30-atlas-tv-trailer-repair/`. Aucun consommateur Oby n’est ajouté ici.

## Publication de la correction

La release **hero-trailer-root-2f6ddaaf5671**, 38 fichiers et 387994 octets,
est publiée depuis le commit `8efcdd2`, poussé sur `feat/local-network`.
La publication vérifie la release précédente et les empreintes du gateway avant
de changer le paquet. La disponibilité confirme les 38 empreintes exactes.
Le gateway reste au SHA256
`3fe9b6eacd5baac82f110448439261962d7f2ff2f9b1eb389ed5c5cd39ea95c4` ;
l’engine vérifié au prévol est `39cfb1c3e1af9c88e90730b78a0f0c6a8e902917`.
Cette publication UI ne redémarre pas l’engine.

Le lancement SDK `d33aa56aa9b1482f7b964c3b4ae79d2a` est accepté et le Player
demande 35 assets, dont EpisodePlayer, PlayerControls, DetailView et TvPreviews.
Aucun épisode n’est lancé. La question de réception physique du fond puis du
plein écran Re:ZERO est envoyée ; **l’image native reste non confirmée**.
Voir [publication](2026-10-30-atlas-tv-trailer-repair/publication.json),
[paquet](2026-10-30-atlas-tv-trailer-repair/package.json) et
[reçu SDK](2026-10-30-atlas-tv-trailer-repair/launch.json).
