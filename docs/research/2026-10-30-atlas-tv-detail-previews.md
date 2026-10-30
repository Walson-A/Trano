# Fiche : bande-annonce automatique et plein écran

**Réception native en échec :** Walson signale du son sans image et rejette les
commandes du plein écran spécifique. Les captures de banc ci-dessous ne
validaient pas le matériel. La [reprise du lecteur et le diagnostic](2026-10-30-atlas-tv-trailer-repair.md)
remplacent ce parcours ; cette page conserve le compte rendu du premier lot.

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

## Publication et lancement

Le paquet **hero-detail-preview-390d8b68e685**, 38 fichiers et 386264 octets,
est publié par CAS depuis hero-membership-5541d3b5f6e2. Il contient l’accueil
accepté et le code de fiche du commit ed9caf6d2a71c74919ef17d879d31f24ecbdd1d6.
La disponibilité confirme les empreintes exactes du paquet. Le gateway garde
son SHA256 9aff6df6cb928627931116a6b05b60273b9b6c78c2c2d160d44a7a657f645b12 ;
l’engine servi lors de la publication est 9a24539c351f0c2a912b45d7262642051e3f0e5b.
Aucun redémarrage d’engine ni changement de server.mjs dans ce lot.

Walson confirme avoir rallumé le Devialet et être disponible pour tester.
Le lancement d9f8907883c45c271bb428e0bef4c782 est accepté par le SDK ; le Player
demande 35 assets, dont TvPreviews.qml, DetailView.qml et Trailer.qml.
Cela ne prouve pas l’image ni le son : la question de réception native est
envoyée et son résultat reste distinct. Aucun épisode réel n’est lancé par nous.
Voir [publication](2026-10-30-atlas-tv-detail-previews/publication.json),
[paquet](2026-10-30-atlas-tv-detail-previews/package.json) et
[reçu SDK](2026-10-30-atlas-tv-detail-previews/launch.json).
