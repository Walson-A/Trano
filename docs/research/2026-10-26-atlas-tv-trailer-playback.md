# Atlas TV — bande-annonce réelle sur le Devialet

## Périmètre

Walson confirme que l’aperçu du héros doit être une **bande-annonce**, jamais
un extrait de l’épisode à reprendre. L’épisode ne part qu’après Lecture/Reprendre.
Le héros reprend la composition des animés d’Atlas PC et suit l’animé sélectionné
dans la liste. Sans bande-annonce exploitable, conserver son image et ses actions.

Le test du 26 octobre porte sur la même bande-annonce que le héros PC de
**To Your Eternity** : identifiant YouTube `0S0ty44JPao`, durée 60 secondes.
La référence vient du vrai composant et de son instantané de banc dans
`LifeOS/src/banc/animes/accueil.json`, pas d’une recherche approximative.

## Résolution et première lecture

Sur le serveur permanent, **yt-dlp 2026.10.21**, téléchargé depuis son dépôt
officiel et comparé à sa somme SHA-256 officielle, résout la vidéo avec
`--js-runtimes node`. La première tentative sans ce runtime ne fournissait
pas le format demandé ; cela ne démontrait pas l’indisponibilité de la vidéo.

Le format progressif **18** fournit un MP4 **360p**, H264 `avc1.42001E` et AAC
`mp4a.40.2`. Les variantes HD annoncées séparent audio et vidéo. Aucun assemblage
HD ni transcodage n’a été réalisé dans ce test.

Une lecture Range limitée côté serveur répond 206, `video/mp4`. Le SDK lance
ensuite un diagnostic QML natif sur le Devialet, avec `MediaPlayer` et
`VideoOutput`, son activé au volume interne 35 %. Le Player télécharge directement
la source CDN YouTube ; le PC sert uniquement le QML et reçoit les mesures.
Walson confirme les **images en mouvement et le son**, affichés en plein écran.

La télémétrie montre une durée de **60 000 ms**, `hasVideo: true`,
`hasAudio: true`, puis une position maximale observée de **38 481 ms** avant
un événement d’erreur de code **1** et remise à zéro. La première version du
diagnostic ne relevait pas son texte : la cause exacte n’est pas établie.
Cette lecture directe ne peut donc pas être considérée comme stable sur une
bande-annonce entière malgré la confirmation de l’image et du son.

## Isolation du transport

Le serveur télécharge ensuite le fichier entier : HTTP 200,
**2 374 127 octets reçus sur 2 374 127 annoncés**. Le même fichier est servi
temporairement par le PC, avec réponses Range, au seul Player identifié, pour
isoler son décodage de l’accès direct au CDN. Ce montage de diagnostic ne valide
pas l’hébergement permanent sans PC.

Ce second essai atteint **60 000 / 60 000 ms**, puis le statut **7 (EndOfMedia)**,
sans événement d’erreur. Les mesures conservent audio et vidéo présents pendant
la lecture. Cela confirme le décodage complet de ce fichier sur le Player et
renforce l’hypothèse d’un problème de transport CDN dans le premier essai ; la
cause exacte de son erreur n’est toutefois pas mesurée.

## Conséquences pour le héros et le backend

- L’iframe YouTube utilisée par le héros React n’est pas nécessaire à cet essai
  natif : le Devialet a effectivement montré et joué une vraie bande-annonce.
- La qualité finale sur grand écran reste à établir en HD. Le succès d’un MP4
  progressif 360p ne prouve ni lecture des variantes séparées ni synchronisation
  audio/vidéo, ni décodage de tous les codecs proposés par YouTube.
- Une résolution de bande-annonce est distincte de la résolution d’un épisode.
  Les liens signés doivent rester éphémères, hors Git et hors des logs.
- Le futur backend doit permettre une diffusion stable depuis le serveur
  permanent ; la lecture directe de ce CDN reste insuffisamment fiable dans
  l’essai. Cache/remux et transport restent à choisir et tester, sans dépendre
  du PC. Aucun nouvel endpoint de preview n’a été déployé.
- L’aperçu intégré au héros, ses superpositions, le passage image/vidéo,
  l’arrêt de la bande-annonce précédente et le changement d’animé restent à
  vérifier. Le plein écran de diagnostic ne valide pas ces comportements.

Les essais n’envoient aucun secret engine au Player et n’écrivent aucun suivi
AniList. Les mesures assainies sont conservées dans
`2026-10-26-atlas-tv-trailer-playback.json` ; elles excluent les liens signés,
les secrets et les tickets de lancement.
Le serveur temporaire LAN a été fermé et les fichiers temporaires PC/serveur,
y compris la vidéo et le résolveur téléchargé, supprimés après vérification de
leurs chemins. Les services permanents Atlas TV et relais restent inchangés.
