# Atlas sur la télévision : base réutilisable et premier parcours

Direction corrigée après nouveau retour humain : [menus attachés à la barre](research/2026-10-28-atlas-tv-player-menus.md).
Walson rejette la disparition du chrome au profit d'un grand panneau. La barre
reste visible et les choix rapides s'ouvrent au-dessus de leur bouton. Le code
est raccordé aux capacités réelles ; publication et validation TV restent séparées.

Dernière passe : [proposition visuelle du lecteur TV](research/2026-10-28-atlas-tv-player-proposal.md),
séparée de l'app publiée et en attente de revue humaine. La barre PC transposée
est rejetée ; volume matériel, timeline et choix réels source/lecteur/qualité
définissent la nouvelle direction.

La passe [lecteur et sorties vidéo exclusives](research/2026-10-28-atlas-tv-player.md)
a reçu la confirmation humaine image/son dans l'hôte complet. Pause/reprise et
seek restent à confirmer visuellement après refonte. Navigation
commune Accueil/Recherche/Profil et total d’épisodes visible ; Retour suit la
fiche précédente. Les mentions historiques ci-dessous ne valident pas ce lot.

Passe courante : [vraie fiche animé et navigation](research/2026-10-28-atlas-tv-detail.md),
adaptées du PC, avec saisons/épisodes, personnages/doubleurs et recommandations.
Recherche et historique rejoignent cette fiche ; les retours gardent leur
contexte. Banc contrôlé, nouvelle réception native encore à vérifier.

## Cadrage du 26 octobre 2026

Passe suivante du 28 octobre : [Recherche et Profil adaptés du PC](research/2026-10-28-atlas-tv-search-profile.md),
clavier télécommande, vrais DTO et retours mémorisés. Le paquet embarque ses
icônes pour leur disponibilité au-delà du bootstrap. La récidive de l'état
sonore affiché reste suivie lors de l'essai natif.

Direction actualisée le 28 octobre après essai : [plusieurs rangées sous le héros](research/2026-10-28-atlas-tv-rows-and-audio.md),
avec les vraies catégories du catalogue et la mémorisation de chaque ligne.
Les onglets « À reprendre / À la une » sont retirés de cette itération.
Les images et bandes-annonces du service sont confirmées par Walson ;
l'état initial du son et les épisodes VF restent à corriger. Walson précise
que la bascule fonctionne et veut le son activé dès l'ouverture.

Raccordement du 28 octobre : [hôte QML du contrat serveur](research/2026-10-28-atlas-tv-live-host.md),
sessions limitées, catalogue, bandes-annonces et lecteur avec temps/barre.
Le banc reste distinct. Le paquet est publié et Walson confirme le héros avec
le catalogue réel sur le Player ; le lancement téléphone PC éteint et la
nouvelle lecture native d'épisode restent à valider.

Travail courant : [héros QML adapté de l’écran PC](research/2026-10-26-atlas-tv-hero.md),
limité à cette composition et à sa sélection. Les premiers brouillons d’accueil
ne sont pas la base retenue. Les captures et le test de cycle des previews
ne constituent pas une validation esthétique de Walson.

Itération suivante : [composition et mouvement Apple TV / Netflix](research/2026-10-27-atlas-tv-focus-motion.md),
sur le même héros, avec focus de carte, marges et transitions interrompables.
L’aperçu animé du vrai QML complète les images fixes ; aucun niveau de fluidité
TV ou qualité finale n’est déduit de sa seule existence.

Le produit s'appelle **Atlas TV**. Les animés ouvrent le premier parcours ;
l'interface doit pouvoir accueillir ensuite films, séries, vidéos YouTube et
musique. Avant de construire l'interface, Walson demande une étude de références :
[captures, analyse et hypothèses de direction](research/2026-10-26-atlas-tv-streaming-references.md).
Cette étude ne valide ni une interface finale ni le lancement depuis téléphone.

Walson privilégie Apple TV pour le rendu et Netflix pour la sélection, puis demande
un essai de carte dans l'esprit Red Bull TV. Une [scène QML et l'étude des
composants de projets Freebox](research/2026-10-26-atlas-tv-qml-design-scene.md)
permettent de comparer le verre translucide avec et sans flou. Ce banc n'est pas
le catalogue Atlas TV ni une preuve d'installation permanente.

Le relais permanent reste un objectif non résolu : les essais du 23 octobre
montrent que Netflix détruit la session QML, y compris sans fenêtre et lors d'une
ouverture depuis son icône. Voir [le diagnostic](research/2026-10-23-devialet-netflix-background.md).
Une application Atlas TV au premier plan ne garantit donc pas un relais actif
pendant l'utilisation des autres applications.

## Demande de Walson, 21 octobre 2026

L'application du Player ne doit pas être un relais à usage unique. Elle doit
pouvoir accueillir Atlas sur grand écran, notamment le parcours des animés déjà
utilisé sur PC : choisir, reprendre et lancer rapidement un épisode avec la
télécommande. Le relais permanent reste prioritairement hébergé sur le Devialet,
qui demeure au logement lorsque le PC est emporté.

Une interface Atlas TV n'est pas encore livrée. Après la mire H264 muette du
22 octobre, un [vrai épisode de To Your Eternity en VOSTFR](research/2026-10-26-atlas-tv-real-anime-playback.md)
a été résolu sur le serveur et lu directement sur le Devialet le 26 octobre.
Walson confirme image, son, pause/reprise, avance et recul. Le diagnostic ne
dessinait pas de barre de progression : elle reste à construire avec le lecteur.
Cet essai ne valide ni tous les flux et pistes de sous-titres, ni le lancement
complet PC éteint, ni la distribution permanente d'une application TV.

Une [vraie bande-annonce YouTube](research/2026-10-26-atlas-tv-trailer-playback.md)
est également visible et audible sur le lecteur QML natif. Le fichier progressif
360p a été lu intégralement depuis un serveur LAN de diagnostic ; la diffusion
directe CDN a échoué en cours de lecture. Transport stable depuis le serveur
permanent, HD et intégration au héros restent à vérifier.

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

## Priorité matérielle confirmée le 22 octobre

Walson utilise le Devialet pour le son et demande de concentrer le travail sur ce
Player. Les essais Samsung sont arrêtés ; sa connexion Wi-Fi est intermittente.
Le changement de source TV reste une possibilité secondaire. La piste Tizen
ci-dessous conserve le contexte de recherche et ne constitue pas un chantier actif.
Le contrôle Accueil du Devialet est maintenant confirmé à l'écran, ainsi qu'un
nouvel inventaire du relais reçu après cette commande. Le redémarrage automatique
du Player reste à résoudre ; le premier essai vidéo est décrit ci-dessous.

## Choix du moteur à établir par une vraie lecture

Deux surfaces sont possibles, sans confondre leur rôle :

- **Application QML sur le Devialet, affichée par HDMI** : elle peut héberger le
  relais et l'interface Atlas. La lecture de la mire H264 est maintenant vérifiée
  sur ce Player avec QtMultimedia. Les objets privés
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
types QtMultimedia sont disponibles. Ce premier import ne constituait pas une
lecture ; l'essai du 22 octobre ci-dessous apporte cette preuve pour la seule mire.

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


## Première lecture matérielle — 22 octobre 2026

Le diagnostic video-probe.qml utilise MediaPlayer et VideoOutput (QtMultimedia
5.0), avec muted=true et une sortie à proportions conservées. Il termine après
24 secondes. Son média synthétique est une mire H264 Constrained Baseline,
1280×720, yuv420p, 25 images/s, douze secondes, sans piste audio. ffprobe impose
une seule piste H264 sans audio et au plus vingt secondes avant tout lancement.

Deux essais ont parcouru 0 à 12000 ms, avec hasVideo=true et fin de média sans
signal d'erreur. Walson a confirmé avoir vu l'image lors du second essai. Les
positions seules n'étaient pas considérées comme une preuve du rendu à l'écran.
Le serveur HTTP temporaire a été fermé après chaque essai. Aucun épisode, compte,
source de streaming, son, sous-titre ou recherche temporelle n'a été testé.

Pour reproduire avec ffmpeg et ffprobe installés, générer un fichier temporaire
hors Git puis lancer explicitement le diagnostic :

    ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=25 -t 12 -an -c:v libx264 -profile:v baseline -level 3.1 -pix_fmt yuv420p -movflags +faststart .local/atlas-tv-test.mp4
    python -B packages/lan/scripts/devialet-check.py --player <IPv4 Player> --bind <IPv4 PC> --video-file .local/atlas-tv-test.mp4 --launch

Ce mode ne contacte pas la Samsung et ne sert que le média explicitement choisi
au Player sélectionné. Il prend en charge les requêtes HTTP Range simples pour
le lecteur ; les plages multiples ou impossibles sont refusées. Le diagnostic
est une preuve de moteur vidéo, pas une interface Atlas TV validée visuellement.
Le fichier généré est supprimable après le test et peut être régénéré avec cette commande.
