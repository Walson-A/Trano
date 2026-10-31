# Restauration du héros et création des lecteurs à la demande

## Retour utilisateur et restauration

La release hero-shared-trailer-148e925d020e régresse : Walson ne voit plus
l’image du héros, seulement le son. L’assistant rétablit immédiatement les
39 fichiers exacts de hero-conversation-3493b637e5cb, vérifiés par leurs
empreintes, sous hero-restore-video-3493b637e5cb. Le SDK accepte le lancement
966568de6c469e555bbb9e6f01ee5d17. **Walson confirme le retour de l’image sur
le héros de Mob Psycho.** Cette restauration ne corrige pas la fiche.

Les contrôles du lot précédent ne suffisaient pas : un seul lecteur *de
bande-annonce* existait, mais un EpisodePlayer avec son MediaPlayer était
encore instancié et invisible dès le démarrage de l’application.

## Diagnostic resserré, confirmé physiquement

Le test suivant charge les fichiers exacts du paquet restauré et le même MP4
Re:ZERO vérifié par SHA256. Il instancie seulement Trailer.qml via son Loader
habituel. Un même MediaPlayer et un même VideoOutput passent successivement
de 1280×620 à 1280×308 puis 1280×720 ; ni source, ni parent, ni lecteur ne change.
Les dix-huit relevés donnent PlayingState=1, ready=true, vidéo/audio présents,
erreur nulle et position de 1766 à 35765 ms, sans retour au début.
**Walson confirme l’image dans les trois étapes.** Le redimensionnement seul
n’explique donc pas le défaut de la fiche.

Un essai LAN de l’interface complète est aussi tenté. Sa télémétrie ne montre
aucun flux lancé ni passage en fiche pendant sa fenêtre : il ne constitue pas
une validation vidéo. L’application normale est remise ensuite. Le retour
« toujours rien dans la fiche » est conservé comme échec ; le changement de
version pendant le test rend sa chronologie ambiguë. Les contrôles suivants
doivent garder une seule version à l’écran jusqu’au retour de Walson.

## Intégration candidate

Le parcours héros/fiche/plein écran garde une seule instance Trailer. Le
lecteur d’épisode n’est plus créé à l’accueil : son code est référencé par
un Component au bootstrap, puis son objet est créé uniquement lorsqu’un
playback existe. Inversement, le lecteur de preview est libéré pendant un
épisode. Les factories Loader par URL et le stop du composant Trailer
reprennent le comportement de la version dont le héros est confirmé.

Les composants de l’accueil gardent leurs parents et coordonnées d’origine.
Ils sont masqués individuellement pendant la fiche, sans l’Item intermédiaire
introduit par la version rejetée. La surface vidéo reste au même parent ;
la fiche et le plein écran superposent leurs contenus et commandes. Aucun
nouveau format vidéo, fournisseur, grant ou réglage sonore n’est introduit.

Ces changements appliquent le cas natif positif à l’intégration, sans prétendre
avoir prouvé une limite matérielle ou une cause interne du firmware.
La réception physique de l’application complète reste nécessaire.

## Vérifications

Hôte complet passé en MP4 et HLS avec API/décodeur simulés : intentions Oby,
suivi, chargements, retrait, épisodes et previews. Le banc vérifie l’absence
d’episodeMedia pendant les previews, l’identité du Trailer partagé et la
conservation de la surface en plein écran. Les scénarios Oby acquièrent le
lecteur courant après sa création, au lieu de supposer un objet permanent.
Les passages aux épisodes et les callbacks tardifs restent couverts sans
compte ni épisode réel.

Les captures des vrais composants sont revues en 1280×720 pour conserver la
composition acceptée. Elles ne valident pas le décodeur matériel. Les preuves
sont dans `2026-10-31-atlas-tv-native-lifecycle/`.
