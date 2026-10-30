# Fiche : bande-annonce automatique et plein écran

Walson accepte le héros compact pendant l’exploration, avec grand héros et vidéo
à l’arrivée. Il demande une bande-annonce automatique dans la fiche et un moyen
de la regarder en plein écran. Ce lot prépare la publication de ces deux parcours ;
les reçus et la réception native seront ajoutés séparément. Aucun consommateur
Oby conversation_launch n’est ajouté ici.

## Parcours

Une fiche restée en haut pendant 900 ms résout sa bande-annonce. Son image reste
visible jusqu’à la présence d’une vidéo dont la position dépasse 400 ms. Une
absence ou un échec conserve le visuel de cette œuvre. Le défilement sous l’en-tête,
Mon suivi, la fermeture et la préparation d’un épisode arrêtent la preview.

Bande-annonce est à droite de l’en-tête, sans tasser les actions existantes.
Haut depuis les actions rejoint Retour ; Droite rejoint ce nouveau bouton.
OK ouvre le plein écran. Le même Trailer/MediaPlayer change de surface sans
réinitialiser la source ni la position. Fit conserve l’image entière en plein
écran ; Crop remplit le fond de fiche. Le son suit la préférence de l’accueil.

OK met en pause/reprend ; Gauche/Droite déplacent de dix secondes. Le plein écran
montre une identité discrète, une commande centrale, la position et la durée.
Retour masque les commandes, puis retrouve la fiche ; pendant préparation/erreur,
il retrouve directement la fiche. La fin de la vidéo retrouve aussi la fiche.
Pas de volume système ni de menus épisodes/source/qualité pour une bande-annonce.

## Transport et cycle vidéo

TvPreviews partage les résolutions et le cache du héros et de la fiche sur
POST /tv/v1/previews, sans nouvelle route. Identité AniList + identifiant YouTube
confirmés, type trailer, expiration finie et chemin fermé par TvSession sont
obligatoires. Le cache garde seize grants ; deux demandes simultanées maximum,
huit callbacks par identité et une minute de recul après échec. Jetons et grants
restent en mémoire. Une session invalidée rejette les réponses de l’ancien epoch.

Une réponse tardive peut réchauffer son cache ; la génération de la fiche et sa
visibilité lui interdisent d’ouvrir un lecteur après Retour ou une autre saison.
La preview est arrêtée avant la résolution d’un épisode. Le VideoOutput devient
inactif puis Qt détruit l’objet de manière différée ; le banc attend cette
destruction avant de compter les objets. Les bandes-annonces n’écrivent aucune
progression et ne créent aucune session d’épisode.

## Vérifications et limites

Banc complet passé en HLS et MP4, avec suivi, chargements, retrait et nouveaux
scénarios : cache partagé, sortie unique, plein écran sans redémarrage,
pause/reprise/seek, Retour, défilement, mauvaise identité, réponse tardive,
métadonnées absentes et invalidation. L’épisode utilisé pour vérifier la sortie
exclusive est simulé ; aucun compte ni épisode réel n’est lancé par ces tests.

Les captures du [fond](2026-10-30-atlas-tv-detail-previews/detail-trailer-background.png),
du [plein écran](2026-10-30-atlas-tv-detail-previews/detail-trailer-fullscreen.png)
et du [repli image](2026-10-30-atlas-tv-detail-previews/detail-trailer-unavailable.png)
montrent les vrais composants. La frame et la durée sont celles du décodeur
de banc, pas une vraie bande-annonce de Frieren. Le mock respecte Fit/Crop.
La revue a corrigé une coupure verticale du fond et vérifié titre, contraste,
place des actions et commandes plein écran. Les résultats
[HLS](2026-10-30-atlas-tv-detail-previews/detail-preview-verification.json) et
[MP4](2026-10-30-atlas-tv-detail-previews/mp4-preview-verification.json) ne valident
pas le décodeur matériel. Le rendu, le son et la conservation de vidéo pendant
le changement de surface restent à confirmer sur le Devialet.
