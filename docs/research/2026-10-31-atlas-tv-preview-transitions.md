# Bandes-annonces : cadrage, transitions et timeline

## Retour de la vraie TV

La release `hero-native-lifecycle-00ca5c573eed` affiche enfin les images dans
le héros, la fiche et le plein écran, confirmé par Walson. La fiche cadre
cependant la vidéo en haut à gauche. Avances/reculs et passage en plein écran
peuvent afficher « Bande-annonce indisponible », alors que Réessayer fonctionne.
La présence des images est validée ; ces interactions ne le sont pas encore.

## Corrections limitées au parcours existant

Un seul Trailer/MediaPlayer/VideoOutput reste utilisé dans les trois vues.
Son parent reste identique et EpisodePlayer reste créé uniquement à la demande.
Le crop de la fiche est calculé depuis le ratio source : surface conservant
ses proportions, centrée dans un viewport découpé. Le Loader est laissé sans
taille imposée, car sa taille explicite écrasait la hauteur calculée du contenu.
Héros et plein écran conservent leurs dimensions et leur mode d’affichage.
La propriété sourceRect et les modes de cadrage sont documentés dans le
[code Qt Multimedia 5.15](https://github.com/qt/qtmultimedia/blob/5.15/src/qtmultimediaquicktools/qdeclarativevideooutput.cpp) ;
leur comportement sur ce firmware doit être confirmé physiquement.

Le délai de démarrage est armé avant play puis contrôlé après son retour.
Une vidéo déjà prête n’est jamais retirée par un ancien délai. La fiche compare
l’identité AniList + YouTube avant de relancer une préparation : une mise à
jour du suivi ou des métadonnées conserve source et position. Le passage en
plein écran conserve également la source ; il ne prépare pas une seconde vidéo.

NoError ne devient plus une erreur de lecture. Une erreur positive persistante
reste visible après 1,5 s ; une reprise effective de la position l’annule.
Pendant un seek, sa résolution attend la cible, avec une borne de 8 s. L’état
vidéo déjà observé est conservé pendant le buffering, sans prétendre détecter
les pixels réellement affichés. Les vrais échecs invalident toujours le grant
et le bouton Réessayer conserve son parcours existant.

La timeline conserve la dernière cible pendant un seek asynchrone, y compris
si une nouvelle commande arrive avant son achèvement. Le curseur et la
progression suivent cette cible avec un mouvement retargetable de 120 ms ;
les chiffres donnent immédiatement la position demandée. Le titre et son
sous-titre s’effacent pendant la proposition pour éviter que la bulle horaire
ne les recouvre. Les mouvements
réduits désactivent cette interpolation. La composition du lecteur d’épisode
et les règles de Retour sont préservées.

## Vérification et revue

Les scénarios de l’hôte QML utilisent une API et un décodeur simulés, sans compte
ni épisode réel. Ils couvrent les rafraîchissements de fiche, NoError, erreurs
passagères en avance et recul, erreurs persistantes, seek asynchrone avec
plusieurs cibles, délai tardif sur une vidéo prête et conservation de la surface
en plein écran. Les parcours épisodes, suivi, recherche, retrait, navigation et
intentions Oby restent couverts. Le test HLS retire aussi les deux fichiers de
composants après bootstrap, pour contrôler leur recréation depuis le cache Qt.
Ce n’est pas une preuve d’expiration HTTP sur le Devialet.

Les captures des vrais composants en 1280×720 sont revues : titre et pause
centrale lisibles, vidéo de fond à ratio conservé, contraste de fiche et
curseur sans retour à l’ancienne position au commit. L’image de banc est
explicitement une image fixe ; elle ne valide ni fluidité native ni décodage.

Preuves retenues dans `2026-10-31-atlas-tv-preview-transitions/`.
La réception physique du nouveau cadrage et des seeks reste en attente.
Une seule version doit être laissée affichée jusqu’au retour de Walson.
