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
Walson confirme ensuite l’image dans les trois vues de l’application complète.
Le cadrage de la fiche et les erreurs transitoires restent à corriger.

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

Un contrôle supplémentaire retire Trailer.qml et EpisodePlayer.qml du banc
après le bootstrap, puis rejoue tous les scénarios. Ils passent : les Component
conservent le code compilé nécessaire à la recréation des objets, sans relire
ces fichiers. Cela teste le cache de composants Qt du banc, pas une expiration
HTTP réellement attendue sur la TV.

## Version complète en contrôle

La release **hero-native-lifecycle-00ca5c573eed**, 40 fichiers et 405125 octets,
est publiée depuis `e542b92` sur `feat/local-network`. Le prévol confirme
hero-restore-video-3493b637e5cb avant son remplacement, l’engine
`39cfb1c3e1af9c88e90730b78a0f0c6a8e902917` et le gateway au SHA256
`3fe9b6eacd5baac82f110448439261962d7f2ff2f9b1eb389ed5c5cd39ea95c4`.
L’engine et le gateway ne sont pas modifiés par ce lot.

Le SDK accepte le lancement `f21b122a3ac3349e614b5e2a8639dea1` de l’application
normale. Aucun épisode réel n’est lancé. **Walson confirme les images dans le
héros, la fiche et le plein écran.** Il signale un mauvais cadrage en haut à
gauche dans la fiche, une timeline peu fluide et des fausses indisponibilités
lors des avances/reculs ou du passage en plein écran. Cette réception valide
la présence des images, pas encore la qualité de ces interactions.
Voir [publication](2026-10-31-atlas-tv-native-lifecycle/publication.json),
[paquet](2026-10-31-atlas-tv-native-lifecycle/package.json) et
[lancement](2026-10-31-atlas-tv-native-lifecycle/launch.json).
