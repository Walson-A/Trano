# Atlas TV — lecture réelle d’un animé sur le Devialet

## Résultat matériel

Le 26 octobre 2026, Walson confirme sur sa TV l’image et le son de **To Your
Eternity, saison 1, épisode 1 en VOSTFR**, puis la pause/reprise, l’avance et le
recul à la télécommande. Retour ferme cette application de diagnostic. Ce
résultat remplace la seule mire H264 muette comme preuve de lecture réelle.

Le Player connu est un Freebox v7 Devialet, firmware 1.5.26, Qt 5.15.19.
Son identité Spotify a été revérifiée avant le lancement. Le lecteur natif
`QtMultimedia.MediaPlayer` avec `VideoOutput` détecte vidéo et audio, une durée
de **1 500 095 ms** et `seekable: true`. Les mesures montrent les transitions
lecture/pause et les sauts de position demandés par la télécommande, sans
événement d’erreur pendant la réception des observations.

Walson signale l’absence de barre de progression et de position visible lors
des sauts. Le diagnostic n’en dessinait aucune ; position et durée sont bien
disponibles. Une vraie interface de lecture devra les afficher. Cette validation
fonctionnelle ne valide pas le design du lecteur ni de l’accueil Atlas TV.

## Chemin effectivement essayé

1. Le connecteur Atlas authentifié retrouve le titre dans le catalogue réel.
2. Sur le serveur permanent, l’API RPC de l’engine exécute
   `anime/source/decouvrir` avec l’identité AniList **114535**, épisode **1**,
   langue **vo**, puis `anime/source/lecteurs` avec les coordonnées exactes
   retournées. Aucun rapprochement approximatif de titre n’est ajouté.
3. Un script temporaire côté serveur résout le lecteur `FHD1` de la source
   `voiranime` avec **yt-dlp 2026.10.21**. L’outil provient du dépôt officiel
   yt-dlp ; son SHA-256 est comparé au fichier officiel de sommes avant exécution.
   Ce résolveur de test n’est pas une nouvelle route déployée d’Atlas TV.
4. Le flux résolu est un **MP4 annoncé 1080p**, durée métadonnées 1 500 s.
   Une requête Range limitée depuis le serveur répond 206, `video/mp4`, avec
   un en-tête MP4 valide. Ni résolution de sortie HDMI ni codecs précis n’ont
   été mesurés : 1080p est la qualité annoncée par le résolveur.
5. Le PC envoie `debug_qml_app` et sert temporairement le manifeste, le QML
   et la réception des mesures. Le **Devialet télécharge directement le flux
   vidéo distant** : ni transcodage, ni capture d’écran, ni relais vidéo PC.
6. L’application QML utilise le lecteur natif avec le son activé, à volume
   interne 35 %. OK alterne pause/lecture, Gauche/Droite demandent des sauts de
   dix secondes, Retour quitte. Un arrêt automatique borne l’essai à trois
   minutes. Aucune écriture de progression AniList n’est appelée.

L’authentification de l’engine a été utilisée en mémoire sur le serveur après
autorisation explicite de Walson. Ni clé principale ni JWT propriétaire n’ont
été transmis au Player. Les preuves conservées excluent les URL de flux signées,
les secrets et les tickets de lancement.

## Échecs de source distingués du lecteur

Un premier essai de résolution de Frieren, épisode 1 (AniList 154587), n’a pas
produit de flux exploitable : lecteur Mail.ru en 404, deux lecteurs non pris
en charge par cet extracteur, connexion au lecteur VOE refusée. Aucun de ces
échecs ne venait du décodeur du Devialet. Le choix de To Your Eternity permet
ensuite le test matériel avec une source effectivement résolue par le serveur.

## Limites et prochain raccordement

- Cet essai prouve un épisode MP4 avec image, son et navigation temporelle,
  pas tous les hébergeurs, HLS, pistes audio ou sous-titres séparés. La VOSTFR
  sélectionnée ne démontre pas un sélecteur de pistes de sous-titres.
- Le PC est resté allumé pour lancer et observer l’essai. Le chemin vidéo ne
  passe pas par lui ; le lancement complet téléphone/PC éteint reste à tester
  avec le service Atlas TV et le client mobile existants.
- Le service Atlas TV déployé fournit le lancement d’un paquet QML. Les routes
  catalogue/résolution de lecture/session longue ne sont pas livrées par ce test.
  La résolution actuellement disponible sur Atlas PC vit dans son backend
  natif Tauri ; il reste à raccorder une résolution côté serveur à l’application TV.
- Le test ne valide ni bande-annonce YouTube dans le héros, ni flou superposé à
  la vidéo, ni relais persistant derrière Netflix, ni démarrage au reboot.

La suite utile est de raccorder ce chemin de lecture au backend Atlas TV, puis
de construire les contrôles visibles (temps courant, durée, progression,
pause et retour). Le héros conserve comme base les vrais composants animés
d’Atlas PC ; cette preuve ne justifie aucune refonte autonome de l’accueil.
