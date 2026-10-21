# Atlas sur la télévision : base réutilisable et premier parcours

## Demande de Walson, 21 octobre 2026

L'application du Player ne doit pas être un relais à usage unique. Elle doit
pouvoir accueillir Atlas sur grand écran, notamment le parcours des animés déjà
utilisé sur PC : choisir, reprendre et lancer rapidement un épisode avec la
télécommande. Le relais permanent reste prioritairement hébergé sur le Devialet,
qui demeure au logement lorsque le PC est emporté.

Cette direction ne signifie pas qu'une interface TV ou la lecture vidéo sont
déjà livrées. Les essais précédents établissent l'exécution QML et les lectures
réseau ; ils n'établissent ni le rendu vidéo, ni les codecs, ni la distribution
permanente d'une application TV.

## Séparation mise en place

Le composant packages/lan/devialet/RelayAgent.qml est sans interface : il porte
la connexion réseau et les observations des appareils. Il ne capte aucune touche,
n'affiche aucun écran et ne quitte pas l'application qui l'héberge.

Le fichier agent.qml est seulement l'hôte SDK minimal. Il lui fournit sa
configuration et traite la fin d'un diagnostic temporaire. Une future application
Atlas TV pourra embarquer le même composant à côté de son interface, de sa
navigation et de son lecteur. Cette séparation est implémentée ; elle ne rend
pas l'agent indépendant des limites de durée de vie imposées par le firmware.

Les secrets de domotique restent distincts d'une future connexion à Atlas pour
les données des animés. Le listener public du relais ne devient pas un proxy
générique vers l'engine et ne reçoit pas sa clé principale.

## Ce que le PC permet de réutiliser

Lecture directe des sources Atlas sur atelier, commit local
09e96514eee9fc943e62a1a8e37dc84ac541ab47, et de la documentation engine dans le
ref local origin/dev, commit e2dfdd86a21a9a24630266ea13e6be033fabd6f1.
Ces références sont des états de dépôt, pas une vérification du déploiement.

| Élément existant | Source consultée | Réutilisation TV |
| --- | --- | --- |
| Accueil, fiches, épisodes, recherche, historique | LifeOS/src/api/animes.ts, LifeOS/docs/animes-ui.md | Reprendre les DTO et les identifiants ; adapter le transport actuellement fondé sur work_rpc via Tauri |
| Choix du prochain épisode et de la langue | LifeOS/src/components/animes/lecture.ts | Conserver la cible calculée par l'engine, sans nouvelle correspondance approximative de titres côté TV |
| Lancement d'un épisode | LifeOS/src/hooks/useAnimeLauncher.ts | Garder la distinction entre cible, résolution du flux et lecture réellement commencée ; les appels Rust/Tauri ne sont pas portables tels quels |
| Clé de reprise indépendante du fournisseur | LifeOS/src/hooks/useAnimeLauncher.ts, LifeOS/docs/animes-ui.md | Conserver l'identité AniList/épisode pour éviter deux progressions séparées entre PC et TV |
| Signalement à 80 %, absence de recul et note de fin | Atlas/engine/docs/anime.md sur origin/dev | Réutiliser la décision de l'engine ; ne pas réimplémenter les écritures AniList dans la TV |

Le navigateur embarqué, les appels Tauri, le résolveur Rust et le proxy
obystream.localhost appartiennent au PC. Une TV sans ce PC ne peut pas les
utiliser comme s'ils étaient un service permanent. Il faudra une API dédiée
sur le serveur et un chemin de lecture compatible avec le matériel, avec des
permissions limitées et des identifiants propres à la TV.

## Choix du moteur à établir par une vraie lecture

Deux surfaces sont possibles, sans confondre leur rôle :

- **Application QML sur le Devialet, affichée par HDMI** : elle peut héberger le
  relais et l'interface Atlas. Le SDK public décrit QtMultimedia, mais aucune
  lecture vidéo n'a encore été vérifiée sur ce Player. Les objets privés
  fbx.media ne sont pas une dépendance publique garantie.
- **Application Tizen sur la Samsung** : Samsung documente AVPlay pour la vidéo,
  les flux adaptatifs et les sous-titres. Cela exige un parcours d'installation
  propre à la TV, encore non réalisé. Le Devialet conserve son rôle de relais
  permanent même lorsque la TV s'éteint.

La première piste conserve le travail déjà exécuté sur le Player. Le choix
définitif attend un test d'image, de son, de recherche temporelle et de sous-titres
sur le matériel réel. L'avertissement de backend graphique observé pendant les
diagnostics QML reste à résoudre ; un import de module réussi ne suffit pas.

L’option --media de devialet-check.py a réellement créé MediaPlayer sans source
et sans autoplay, ainsi que VideoOutput, après la pause du 21 octobre. Les deux
types QtMultimedia sont disponibles. Aucune vidéo, sortie audio, recherche
temporelle ou piste de sous-titres n’a été testée.

## Premier parcours à rendre concret

1. Sur l'accueil Atlas TV, retrouver « Reprendre » avec le même épisode que sur PC.
2. Ouvrir la fiche ou lancer directement l'épisode depuis la télécommande.
3. Voir un état distinct pour la recherche du flux, son chargement et la lecture.
4. Utiliser pause, reprise, avance/recul et langue ou sous-titres réellement disponibles.
5. Revenir à la fiche puis à l'accueil sans perdre le focus ni déclencher la sortie de l'application.
6. Retrouver la même progression sur PC ; ne jamais marquer vu sur la seule ouverture d'une fiche.

Le premier test de lecture doit employer un média de démonstration connu, puis
un contenu accessible à l'utilisateur, pour distinguer les limites du moteur
vidéo de celles de la résolution des sources. Mesurer le délai réel avant
d'affirmer que le lancement est rapide. Aucun écran ne sera validé sur sa seule
compilation : il devra être vu aux dimensions d'usage et piloté à la télécommande.

## Références matérielles

- [SDK Player Freebox](https://dev.freebox.fr/sdk/player.html) : QML et QtMultimedia.
- [Bibliothèque Freebox](https://dev.freebox.fr/sdk/libfbxqml/) : distinction entre API publique et API restreinte.
- [Samsung, lecture AVPlay](https://developer.samsung.com/smarttv/develop/guides/multimedia/media-playback/using-avplay.html) : moteur natif et formats de lecture.
- [Samsung, flux adaptatifs](https://developer.samsung.com/smarttv/develop/guides/multimedia/adaptive-streaming.html) : HLS/DASH et contraintes à vérifier sur le modèle.
