# Réseau de l'appartement — constat du 20 octobre 2026

## Périmètre et preuves

Investigation demandée par Walson sur ses appareils dans sa résidence étudiante.
Le PC est connecté en Ethernet au profil Windows `Numericable-49b8`,
adresse `192.168.0.26/24`, passerelle `192.168.0.1`. Le Wi-Fi du PC est
déconnecté. La page publique de la passerelle affiche `Mon Modem` et
l'identifiant logiciel `FAST3286_NCC`.

Cela établit la présence d'une passerelle locale ; cela ne prouve pas toute
l'architecture amont de la résidence ni la propriété de chaque adresse du LAN.
Une découverte ICMP bornée au /24, puis SSDP/mDNS, a été faite sans accès
administrateur à la box et sans modification des appareils.

| Cible | Observation directe | Limite |
| --- | --- | --- |
| `192.168.0.31` | API Samsung : `UE43TU7125KXXC`, Tizen, réseau wireless ; UPnP répond | Pas de commande physique validée |
| `192.168.0.30` | mDNS : `fbx7hd-delta`, nom `chambre` ; Spotify : Freebox / Freebox v7 | Télécommande sans code : HTTP 403 |
| `192.168.0.5` | Serveur DLNA Twonky, `MonServeurDLNA` | Pas attribué au Devialet |
| `192.168.0.33` | Répond au ping | Identité inconnue ; aucun contrôle établi |

Le lien PC → télévision Wi-Fi répond ; le réseau n'isole donc pas ces deux
appareils pour les protocoles observés. Cela ne généralise pas à tous les
clients de la résidence.

## Samsung

Réponses observées :
- `GET :8001/api/v2/` : identité Samsung SmartTV ;
- `GET :9197/dmr` : description du lecteur ;
- descriptions `RenderingControl_1.xml` et `AVTransport_1.xml` ;
- SOAP `GetVolume` : `0` ; `GetMute` : faux.

Le niveau lu est celui rapporté par la TV à l'instant du test. Ce n'est pas
une preuve sur le son réellement audible depuis une autre sortie.
Les actions annoncées incluent SetVolume, SetMute, Play, Pause, Stop,
Next et Previous. Une annonce ne prouve pas l'exécution.
L'état du transport est inconnu pendant le contrôle de bout en bout ;
il n'a pas été remplacé par une valeur supposée.

Deux essais limités SetVolume ont ensuite renvoyé le niveau **déjà à zéro**,
après vérification du volume 0 et de la sourdine désactivée. Ils ont été
refusés (HTTP 500). Le second, avec diagnostic détaillé, établit **UPnP 501**
à `2026-10-20T13:36:09Z`. La relecture confirme volume 0 et sourdine
désactivée, sans modification des réglages sonores.

Cette preuve invalide une affirmation « volume contrôlable via UPnP »
sur ce modèle dans son état actuel. La configuration locale passe au mode
Samsung avec appairage WSS : `setupRequired: "samsung_pairing"`, sans
commande annoncée tant que le jeton et l'empreinte ne sont pas configurés.
Le code de ce parcours est testé contre une TV simulée avec TLS, y compris
le refus d'un certificat différent avant l'envoi du jeton. Aucun appairage
ni aucune touche Samsung n'ont été envoyés à la TV réelle.

## Devialet

Les réponses mDNS relient l'adresse .30 à `Freebox-Player.local`, modèle
`fbx7hd-delta`. AirPlay est annoncé sur le port 7000 et RAOP sur 5000.
Le port Spotify Zeroconf découvert est 56071 à cet instant.

`GET :56071/zc?action=getInfo&version=2.10.0` répond avec succès :
nom `chambre`, marque `Freebox`, modèle `Freebox v7`.
`GET :7000/server-info` répond aussi, avec le modèle de compatibilité
`AppleTV3,2`. Ce n'est pas une Apple TV physique.

`GET /pub/remote_control`, sans code ni touche, répond HTTP 403.
L'existence de l'interface est observée ; la validité d'un code et l'effet
des touches restent à vérifier sur place. Aucun code n'a été deviné et
aucune touche, activation Spotify ou session AirPlay n'a été envoyée.

## Preuve de la solution Trano

Le nouveau programme de découverte retrouve la Samsung et le Player,
sans avertissement, depuis l'interface .26.

Le script `live-check.mjs` a ensuite :
1. démarré un relais temporaire en lecture seule ;
2. démarré les routes MCP/REST du serveur Trano avec SQLite en mémoire ;
3. retiré les variables Home Assistant du processus de test ;
4. listé les nouveaux outils et appelé `lister_appareils_locaux` ;
5. obtenu l'identité et l'état réel des deux appareils ;
6. vérifié le refus d'une action invalide avant tout envoi à un appareil ;
7. fermé les services temporaires.

La lecture observée à `2026-10-20T13:21:22Z` donne les deux appareils
joignables, volume TV 0, sourdine TV fausse, état de lecture inconnu,
et configuration `remote_code` attendue pour le Player.

Le script `remote-check.mjs` a ensuite ouvert un relais temporaire sur
l'IPv4 Tailscale du PC et utilisé l'accès SSH **déjà existant** au compte
`trano` de `tranoserver` pour faire une lecture. Le serveur de la maison
a obtenu les deux appareils joignables et leurs modèles, avec
`controlEnabled: false`. Aucun fichier ni service distant n'a été modifié.
Le relais a été arrêté à la fin.

Cette preuve valide le chemin serveur distant → PC → appareils du logement.
Elle ne constitue pas un déploiement du nouveau serveur Trano ni un test
physique des commandes.

La relecture finale à `2026-10-20T13:37:35Z` conserve les deux appareils
joignables. Le Samsung attend `samsung_pairing`, le Player `remote_code`,
et le relais conserve `controlEnabled: false`. Le test distant a de nouveau
confirmé la lecture de ces deux modèles avec cette configuration finale.

Un relevé court à `2026-10-20T13:39:23Z`, Node 24.13 sur ce PC Windows :
79,9 Mio RSS au repos, 86,2 Mio après une lecture des deux appareils,
75 ms de durée murale, 124 ms CPU cumulées entre threads. Ces chiffres
portent sur ce seul essai, pas sur un fonctionnement prolongé.

## Outils

REA et Wireshark/TShark sont déjà présents. Le pilote Npcap 1.78 est actif et
configuré pour un accès administrateur. L'échec initial NpcapHelper était lié
au contexte d'exécution restreint ; la liste des interfaces est lisible hors
du bac à sable. Aucune capture n'a été lancée.

L'investigation a été résolue par les annonces réseau, les interfaces publiques
et la lecture du code de Trano : pas de décompilation REA nécessaire à ce stade.
Nmap et mitmproxy n'ont pas été installés, car ils n'étaient pas nécessaires.

## Ce qui reste à faire avec Walson

Vérifications de code terminées : 29 tests automatiques sur Windows, typage de tous les
workspaces (`npm run lint`), build web (`npm run build`) et contrôle du diff.
Les mêmes 28 tests passent sur Linux dans un conteneur temporaire fondé sur
l'image existante de Trano, sans réseau externe et sans volume de production.
Le dossier et le conteneur temporaires sont supprimés après exécution.
Le build émet des avertissements sur la taille des bundles et les cibles du
plugin legacy ; il réussit. Une nouvelle image a ensuite été construite avec le
Dockerfile modifié : les 29 tests y passent, son démarrage et les routes santé
et LAN répondent en HTTP 200. Le conteneur de test était isolé, sans réseau ni
volume de production, avec une racine en lecture seule. Son conteneur, son image
et ses fichiers temporaires ont été supprimés ; l'identifiant de l'image du
conteneur de production est resté inchangé. Le contexte Docker exclut `.local/`.

Le travail est isolé sur `feat/local-network`, base `8694729`.
Les deux modifications préexistantes de `deploy/README.md` et
`deploy/home-assistant.md` dans le checkout `dev` sont préservées.
Les configurations et relevés privés restent dans le dossier ignoré `.local/`
du worktree ; aucun jeton de fonctionnement n'est ajouté au diff.
La configuration locale écoute, lorsqu'on lance le relais, uniquement sur
l'IPv4 Tailscale du PC. Le fichier privé `.local/relays-server.json` est préparé
pour le futur branchement, mais n'a pas été installé sur le serveur.
Walson a explicitement autorisé le commit et le push sur `feat/local-network`.
Cette branche ne déclenche pas le workflow de publication, réservé à `main`
ou à un lancement manuel. Le worktree est conservé pour les essais du Player
et l'appairage ; aucun déploiement de production n'est effectué à ce stade.

- Confirmer physiquement les cibles, accepter l'appairage Samsung puis tester
  une touche limitée. UPnP SetVolume est refusé : ne pas le présenter comme validé.
- Obtenir le code de télécommande réseau du Player et tester sa validité.
- Identifier le téléphone ; sa présence réseau ne donne pas un contrôle iOS.
- Poursuivre le relais permanent sur le Devialet, choisi par Walson ; le PC
  sert aux diagnostics et au prototype Node, pas d'hôte permanent retenu.
- Configurer et déployer le connecteur sur le serveur après cette revue.
- Ajouter les appareils locaux aux vues web/mobile si ce parcours est retenu.

## Relais sur le Devialet : preuve d'exécution QML

Walson a confirmé le mode développeur activé et autorisé le lancement d'un
diagnostic temporaire sur le Player. Le code du plugin officiel indique
`POST /pub/devel`, JSON-RPC `debug_qml_app`, avec `manifest_url`, `entry_point`
et `wait`. Un simple GET avait seulement établi la présence d'un parseur JSON-RPC.

Deux diagnostics ont ensuite utilisé cette méthode, avec un serveur HTTP
temporaire sur le PC, accessible seulement à l'IP du Player. Le manifeste et
le QML sont servis sans secrets ; le programme effectue uniquement une lecture
de la Samsung et des signaux de présence, puis appelle `Qt.quit()` automatiquement.
Le premier essai dure 45 secondes ; le second deux minutes.

Résultats observés le 20 octobre 2026 vers 14 h UTC :

- L'API de lancement retourne les ports `qml_port`, `stdout_port`, `stderr_port`.
- Le programme envoie `started`, avec `Qt.platform.os` égal à `linux`.
- Une requête exécutée par le Player vers la Samsung retourne HTTP 200 et
  `UE43TU7125KXXC`. Elle ne transite pas par le relais Node.
- Le Player envoie des signaux toutes les cinq secondes.
- Pendant le second essai, Walson confirme voir l'accueil du Devialet après
  Retour ; les signaux continuent ensuite. Aucun événement de touche n'est
  reçu par le diagnostic et `visible` reste vrai : l'identification de l'écran
  repose sur son observation, pas sur cette propriété QML.

Cela établit l'exécution de notre code sur ce Player et l'accès direct à la TV,
avec un premier indice de maintien après retour à l'accueil. Cela n'établit pas
un service durable, son démarrage après coupure, sa survie à la veille ou sa
coexistence avec une lecture prolongée. Le mode de développement charge les
fichiers depuis le PC ; aucune installation permanente n'a été réalisée.
Node et Tailscale ne sont pas démontrés disponibles sur ce firmware. Le relais
Node existant ne peut donc pas être présenté comme déployable tel quel ici.
Une liaison autonome du Player au serveur distant reste à concevoir et tester.

Un essai supplémentaire charge un programme d'une minute, puis ferme le serveur
HTTP de ses fichiers après environ douze secondes. Les journaux du Player
montrent ensuite de nouvelles lectures HTTP 200 de la TV, toutes les cinq
secondes. Les seuls liens conservés avec le PC sont les sockets de lecture
des journaux du SDK ; aucun appel applicatif au PC n'est programmé dans cet essai.
Cela valide la poursuite d'exécution après retrait du serveur de fichiers,
pas un fonctionnement après extinction effective du PC. Les sockets sont
fermées à la fin de l'observation et le programme s'arrête par minuterie.

Les journaux de ce dernier essai signalent aussi l'impossibilité de créer un
contexte graphique pour le backend `intelce`, alors que le JavaScript et les
lectures réseau continuent. Le rendu du diagnostic et l'identification de son
premier plan ne sont donc pas validés. Il faut vérifier séparément la coexistence
avec une utilisation réelle du Player. Une première tentative de collecte des
journaux a échoué sur l'encodage de la console Windows ; elle a été corrigée
avant le nouvel essai, sans modification du firmware.

Sources officielles lues directement, sans exécuter leur code :

- [SDK Player](https://dev.freebox.fr/sdk/player.html) : applications QML et
  distribution FreeStore ; ce parcours ne garantit pas un service de fond.
- [Plugin QtCreator, `remoteqml.cc`](https://github.com/fbx/freebox-qtcreator-plugin/blob/18f4d2c9e4ef8d8351b6ffee3bd3f2699f92294f/remote/remoteqml.cc)
  et [constantes](https://github.com/fbx/freebox-qtcreator-plugin/blob/18f4d2c9e4ef8d8351b6ffee3bd3f2699f92294f/remote/remoteconstants.hh) : méthode et URL de lancement.
- [Exemple HTTP](https://github.com/fbx/qmlapps_examples/tree/1ccd9eeffca7d6d435bdfb1232a2380323abbbc6/samples/http) : manifeste, permission réseau et application QML.
- [libfbxqml Application](https://github.com/fbx/libfbxqml/blob/5ed909ecffa5dcd31c69e2f56a4f70125577ed3f/fbx/application/application.qml) : fenêtre par défaut en plein écran.

Les scripts ponctuels et journaux des diagnostics restent dans `.local/`,
hors Git et du contexte Docker. Aucune modification de firmware ni installation
de paquet système n'a été effectuée sur le Player.

## Diagnostic reproductible des capacités réseau

Le diagnostic `packages/lan/scripts/devialet-check.py` et son application
`packages/lan/devialet/probe.qml` reproduisent une vérification courte sans
Qt installé sur le PC. La commande exige `--launch`, des adresses privées
explicites et n'exécute aucune commande multimédia. Les ressources sont servies
sur un chemin temporaire aléatoire, seulement à l'IP du Player ; le lanceur ne
suit pas de redirection HTTP. L'application se ferme par minuterie, le serveur
temporaire est ensuite arrêté. Le script n'écrit aucune configuration du Player.

Exécution réelle du 20 octobre 2026, après les essais précédents :

| Vérification exécutée sur le Player | Résultat observé | Limite |
| --- | --- | --- |
| Création `QtWebSockets 1.0; WebSocket { active: false }` | Objet créé | Pas encore de connexion WS/WSS |
| Création `QtWebSockets 1.0; WebSocketServer { listen: false }` | Objet créé | Aucun port ouvert |
| Import `QtQuick.LocalStorage 2.0` | Import réussi | Aucune base créée, persistance non testée |
| GET identité Samsung | HTTP 200 | Lecture seule |
| GET `https://example.com/` | HTTP 200 | Une destination HTTPS publique testée |
| GET `/health` de l'adresse HTTPS habituelle du serveur | Statut QML zéro | Cause non distinguée entre DNS, routage et TLS |

Le lanceur reçoit le signal `started`, trois signaux de présence et dix rapports
au total ; il termine normalement et ferme le serveur temporaire.
La vérification syntaxique Python et l'aide CLI réussissent aussi.

La configuration Tailscale du serveur a été lue, sans modification : le proxy
HTTPS 443 pointe vers l'engine local sur 7777. Aucun nouveau proxy ni accès
Funnel n'a été activé. Il ne faut pas rendre ce proxy existant public pour
résoudre le besoin du relais. Une solution à préparer est une passerelle
séparée, à authentification dédiée, recevant une connexion sortante du Player
et accessible à Trano côté serveur. Son exposition et son déploiement ne sont
pas réalisés. Le démarrage autonome du Player reste une question distincte.

Références supplémentaires :

- [Qt WebSockets QML](https://doc.qt.io/qt-6/qtwebsockets-qmlmodule.html) pour
  les types client/serveur ; la disponibilité de l'import 1.0 sur le Player
  provient du test réel, pas de cette documentation Qt 6.
- [Tailscale Funnel](https://tailscale.com/docs/features/tailscale-funnel)
  pour le principe d'un accès depuis Internet ; cette possibilité n'est pas
  activée par l'investigation.

## Agent QML et passerelle : chaîne réelle sur le LAN

La passerelle `packages/lan/src/gateway.ts` et l'agent
`packages/lan/devialet/agent.qml` sont implémentés en lecture seule. Les
listeners sont séparés : l'un sert le WebSocket et les fichiers de démarrage
protégés, l'autre l'API de lecture pour Trano avec un jeton différent. Le Player
s'authentifie dans son premier message, puis publie un inventaire toutes les
cinq secondes. Une observation expire au bout de vingt secondes ; une connexion
fermée invalide immédiatement le cache lorsque sa fermeture est observée.

L'essai `devialet-agent-check.mjs` a réellement lancé cet agent sur le Player,
avec une durée de vingt secondes et une passerelle temporaire sur le PC. Les
lectures HTTP et SOAP GetVolume/GetMute étaient exécutées par le Player, puis
les données ont traversé le WebSocket et le véritable adaptateur LAN de Trano :

| Appareil | Identité reçue dans Trano | État reçu |
| --- | --- | --- |
| TV | UE43TU7125KXXC, MAC configurée vérifiée, joignable | volume 0, sourdine fausse, lecture inconnue |
| Player | Freebox v7, marque Freebox vérifiée via Spotify, joignable | volume, sourdine et lecture inconnus |

`controlEnabled` est faux et les capacités de commande sont vides. À l'arrêt
automatique de l'agent, l'adaptateur signale le relais indisponible, sans conserver
un faux état en ligne. Le script confirme `timedAgentExitObserved`,
`staleStateHidden` et `temporaryGatewayClosed`. Aucun service n'est resté lancé.
Cet essai utilise des jetons aléatoires éphémères et un WebSocket **sans TLS sur
le LAN** ; il ne valide pas WSS depuis le logement vers le serveur distant.

La passerelle refuse les identifiants de rôle incorrects, les changements de
MAC, les séquences rejouées et les observations périmées. Le listener destiné
à l'agent n'expose pas l'inventaire et n'embarque pas le jeton du lecteur dans
le QML. Les tests couvrent ces frontières et le passage par l'adaptateur réel.
Le premier test de déconnexion a révélé une attente incorrecte de fermeture
synchrone entre les deux extrémités ; le contrôle tient maintenant compte de
l'état du socket et le test attend la propagation effective de la fermeture.

Validation après intégration : **34 tests passent sur Windows et Linux**,
typage de tous les workspaces réussi. Les tests Linux utilisent une copie des
sources dans un conteneur isolé fondé sur l'image de production existante,
sans réseau externe ni volume de production ; leur conteneur et leurs fichiers
temporaires sont supprimés. Aucun nouveau bundle web n'est nécessaire à ces
changements de relais. Guide de configuration et limites :
[relais Devialet](../devialet-relay.md).

Un script de test distant borné est préparé pour le prochain passage WSS. Sa
syntaxe locale et celle du programme distant embarqué ont été vérifiées, ainsi
que son mode plan sans réseau. La CLI Funnel présente sur le serveur confirme
les options `--bg` et `--https`. L'essai public n'a pas été exécuté : il nécessite
l'accord explicite de Walson pour rendre un point d'entrée dédié temporairement
joignable depuis Internet. Le parcours proposé n'ouvre pas le proxy Atlas 443
et ne déploie pas le nouveau serveur Trano.

## Sources de protocole

- [Samsung Smart TV — Home Assistant](https://www.home-assistant.io/integrations/samsungtv/)
  pour la distinction API locale et appairage.
- [Spotify Zeroconf](https://developer.spotify.com/documentation/commercial-hardware/implementation/guides/zeroconf)
  pour la lecture d'identité.
- [Freebox Player Delta — implémentation Homebridge](https://github.com/securechicken/homebridge-freebox-player-delta)
  pour la forme de l'API de télécommande et ses limites. Aucun code GPL n'a
  été incorporé : le connecteur est une implémentation des requêtes observées
  et du protocole référencé.
- [SamsungTVWS — protocole de connexion](https://github.com/xchwarze/samsung-tv-ws-api/blob/master/samsungtvws/connection.py)
  pour la négociation et les événements de la télécommande. Le connecteur
  implémente les messages du protocole ; aucun code de cette bibliothèque
  n'a été incorporé.


## Suite du 21 octobre : préparation sans interrompre la TV

Walson a autorisé l'ouverture du point d'entrée distant et demandé trente minutes
sans tests sur la TV ou le Player. La reprise de ces essais n'est pas autorisée
avant le 21 octobre 2026 à 20:25:36 UTC. Il souhaite également une application TV
Atlas réutilisable, notamment pour retrouver son parcours d'animés du PC.

Les changements préparés pendant cette pause sont :

- Séparation du relais non visuel RelayAgent.qml et de son hôte SDK. La fin
  d'un diagnostic est un signal, pas une sortie imposée à une future interface.
  La nouvelle composition attend encore son essai sur le Player.
- Libération des anciennes connexions authentifiées sans observation depuis
  vingt secondes, pour que le Player puisse se reconnecter après une coupure.
  Une connexion encore fraîche ne peut pas être remplacée par un second client.
- Refus d'annoncer un test distant réussi si les appareils ne sont pas tous
  identifiés, si la liaison tombe trop tôt, si l'arrêt attendu n'est pas observé
  ou si un seul contrôle de nettoyage manque ou échoue.
- Sept simulations Python sans réseau vérifient ces échecs. Un échec du nettoyage
  Funnel ne doit pas empêcher le nettoyage indépendant du conteneur et des fichiers.
- Préparation d'un diagnostic QtMultimedia sans source et sans autoplay ; il
  n'a pas été exécuté pendant l'utilisation de la télévision.

Le mode serveur seul a réellement démarré le runtime de la passerelle sur Linux,
sans contacter le Player et sans publier de Funnel. Le manifeste, l'hôte QML
et le composant ont été servis correctement ; le jeton de lecture privée ne
figure pas dans les sources envoyées à l'agent. L'inventaire sans agent a renvoyé
503. Le rapport final confirme la suppression du conteneur
trano-devialet-trial-47786210042a et de ses fichiers, sans changement du proxy 443.

Les contrats Atlas des animés ont été lus dans le code PC et dans le ref local
origin/dev de l'engine. Cela prépare le portage sans prétendre que les appels
Tauri, la résolution de flux sur PC ou le proxy localhost fonctionnent sur une TV.
Voir [la direction Atlas TV](../atlas-tv-direction.md).


Validation hors ligne de cette suite : 36 tests Node réussis sur Windows et
Linux, sept simulations Python réussies et typage des workspaces réussi.
Les liens relatifs des documents sont relus. Aucun essai sur la TV ou le
Player n'a été lancé pendant la pause demandée. La lecture et le rendu vidéo
sur la future application Atlas TV ne sont pas validés.

## Reprise après la pause du 21 octobre

Les tests matériels ont repris après 20:25:36 UTC. Le premier lancement
modulaire n’a reçu aucun inventaire : l’import QML distant exigeait qmldir.
Après ajout de cet index protégé et de l’import local, le vrai Player a publié
vers le véritable adaptateur Trano : Samsung UE43TU7125KXXC, volume 0, sourdine
fausse, et identité Freebox v7 via Spotify. L’arrêt de diagnostic, l’invalidation
des états et la fermeture de la passerelle temporaire ont été vérifiés.

Le diagnostic optionnel a créé MediaPlayer et VideoOutput (QtMultimedia 5.0),
sans source ni lecture. QtWebSockets client/serveur et l’import
QtQuick.LocalStorage fonctionnent également. Aucun codec, rendu, son,
sous-titre ou recherche temporelle n’est établi par ce test.

Après connexion de Walson à la console Tailscale, l’attribut Funnel a été
enregistré pour la seule IPv4 du serveur ; sa réception a été vérifiée.
Le compte Linux a refusé la modification Serve. Un helper Docker temporaire,
avec les droits Docker existants, a pu ouvrir puis refermer la seule route 8443.
Le proxy privé 443 et son état Funnel sont restés inchangés.

Ce premier essai public n’a pas confirmé le lancement SDK ni reçu d’agent.
Google DNS renvoyait NXDOMAIN alors que MagicDNS répondait avec l’IP privée.
Le script attend désormais le DNS public avant le lancement et conserve des
erreurs expurgées. Un précontrôle a aussi identifié des sockets TIME_WAIT,
sans écoute concurrente ni conteneur restant : le bind de vérification utilise
maintenant SO_REUSEADDR.

## Passage WSS distant réel du 21 octobre

Après propagation, le résolveur public a renvoyé des IPv4 de relais Funnel
(et non l’IP Tailscale privée). Le SDK a accepté le manifeste HTTPS distant.
Le vrai Player a ensuite ouvert WSS vers le serveur chez les parents et
l’API privée de la passerelle a reçu les deux appareils identifiés :

- Samsung UE43TU7125KXXC, joignable, volume 0, sourdine fausse, lecture inconnue.
- Freebox v7, joignable, volume et sourdine inconnus, lecture inconnue.

Le contrôle reste désactivé et les capacités de commande vides. Le PC ne
servait ni les fichiers QML, ni la passerelle, ni les lectures des appareils ;
il transmettait le lancement SDK et observait SSH. Cela démontre le transport
distant sans relais sur PC, mais pas un essai PC physiquement éteint ni une
installation persistante ou un retour automatique après reboot.

L’essai s’est terminé avec un code de sortie nul. L’arrêt attendu de l’agent
a été observé ; le rapport confirme la suppression de Funnel 8443, des deux
conteneurs temporaires et des fichiers privés. Le proxy 443 est inchangé.
Le conteneur principal de cet essai était trano-devialet-trial-e56ef02f40cf.

Validation de cette suite : 36 tests Node réussis sur Windows et Linux,
11 simulations Python réussies, typage des workspaces réussi, syntaxe du
programme distant et liens documentaires vérifiés. Aucun bundle web n’a changé.
Le worktree de feature et sa configuration privée sont conservés pour la suite :
installation persistante, reprise après redémarrage, appairage et contrôle,
puis interface Atlas TV et lecture vidéo restent à réaliser.

## Reprise autonome et conditionnement dédié

Un premier essai de reprise a été arrêté avant tout agent : le SDK refusait
le manifeste avec « Connection closed » malgré une réponse DNS publique.
Le test vérifie désormais un échange HTTPS réel vers une IPv4 publique,
certificat et nom du serveur validés, avant de solliciter le Player. Aucune
information secrète n’est transmise pendant ce contrôle.

L’essai suivant a démarré une seule fois le Player puis redémarré uniquement
son conteneur temporaire de passerelle. Le Player s’est reconnecté sans relance
du SDK et a renvoyé les deux identités et les états Samsung. L’arrêt minuté,
la suppression de 8443, du conteneur trano-devialet-trial-281bd74157ad et de ses
fichiers, ainsi que la préservation du proxy 443, ont été vérifiés.

L’image dédiée et Compose ont été construits et testés séparément sans appareil
ni publication Internet. Le premier build a identifié deux avis ws ; le lockfile
a été mis à jour uniquement sur ws vers 8.22.0. Le worktree possède maintenant ses
propres dépendances ; la jonction précédente a été retirée sans toucher à sa cible.
L’image corrigée a démarré, servi tous les assets protégés et refusé l’accès
privé sans jeton. Sans agent, elle renvoie 503. Sa vie de processus est vérifiée
séparément de la présence d’appareils. Mesures et limites :
[conditionnement dédié](../devialet-gateway-deployment.md).

Les bancs Linux et d’essai public montent maintenant le ws verrouillé plutôt
que celui de l’ancienne image de production. Les 36 tests passent sur Windows
et Linux avec ws 8.22.0 ; seize simulations Python couvrent aussi la reprise,
l’absence de reprise, la réponse DNS sans HTTPS prêt et le nettoyage.

La reprise matérielle a ensuite été répétée avec ws 8.22.0 réellement chargé :
le rapport annonce cette version, le premier inventaire, le redémarrage de la
passerelle puis le nouvel inventaire complet. L’arrêt attendu et tous les
contrôles de nettoyage ont réussi, conteneur temporaire
trano-devialet-trial-0ec27a1792b7 supprimé. Le typage de tous les workspaces
réussit également. Ces essais ne constituent pas un redémarrage du Player
ni une validation de sa veille ou de son installation persistante.

## Appairage Samsung avec Walson présent

Après accord de disponibilité de Walson, la commande pair a réellement reçu
et stocké localement le jeton et le certificat de la Samsung, sans touche.
La réutilisation de cet appairage a été vérifiée ensuite par une sonde
authenticationOnly : connexion acceptée, aucune touche envoyée.
Deux tests automatiques couvrent cette sonde et son refus de paramètres
ambigus ; les 38 tests passent sur Windows et Linux avec ws 8.22.0.

La première tentative de sourdine n’a pas confirmé de transmission. Après
la sonde authentifiée, une seconde touche a été transmise sans erreur du
connecteur, mais GetMute est resté faux. Aucun changement physique ni aucune
restauration à l’écran ne sont déduits de cette valeur. L’observation de Walson
est demandée avant toute autre bascule. Le relais sauvegardé reste en lecture
seule et le QML ne reçoit ni jeton Samsung ni code de télécommande.

La validation du diagnostic livré samsung-auth-check.mjs a ensuite expiré
avec « Télécommande Samsung sans réponse », sans touche envoyée. L’appairage
enregistré et une réutilisation antérieure sont établis ; leur disponibilité
continue ne l’est pas. Aucune nouvelle paire, réinitialisation de jeton ou
nouvelle bascule n’a été tentée après ce constat.


## 22 octobre — contrôle Devialet et essai après Accueil

Priorité explicite de Walson : Devialet ; abandon des essais Samsung. La saisie du
code local a nécessité une réouverture du formulaire après expiration ; aucune
récupération du POST d'erreur du navigateur n'a été effectuée. La nouvelle saisie
a été enregistrée et seule sa présence a été inspectée.

Identité Spotify vérifiée : status 101, marque Freebox, modèle Freebox v7. La
commande HTTP home a réussi ; Walson a confirmé le retour effectif à l'accueil.
Essai devialet-agent-check.mjs --launch --home : inventaire du seul Player,
commande home acceptée, nouvel inventaire après 8540 ms, arrêt minuté observé,
état périmé masqué, passerelle temporaire fermée. Pas de preuve de reboot ou de
PC éteint ; aucune lecture vidéo supplémentaire. Aucun service permanent déployé.

Validation : 39 tests Node passent sur Windows et dans le conteneur Linux isolé ;
TypeScript LAN passe. Les commandes npm ont d'abord échoué à lancer leur shell
Git Bash (3221225794) ; les mêmes outils ont réussi par invocation Node directe.
Deux tests Python du formulaire vérifient le refus des entrées non autorisées,
la confidentialité du code fictif, la conservation des autres réglages et le refus
d'écraser une modification concurrente. Les fichiers et conteneur du test Linux
ont été supprimés par le script ; aucun volume de production n'a été monté.


## 22 octobre — service sans processus PC et première image vidéo

La recherche de démarrage s'est limitée aux sources officielles publiées du SDK,
aux exemples QML et aux préférences de libfbxqml ; les références exactes sont
consignées dans devialet-relay.md. Aucun contrat de boot/autostart n'y a été
établi. Le manifeste default=true ne signifie pas un lancement système. La piste
screensaver nécessite une installation et n'est pas une preuve de persistance.
Aucun reboot, root ou changement de firmware du Player n'a été effectué.

Deux diagnostics de lecture ont servi une mire locale synthétique H264 Constrained
Baseline 1280×720, 25 i/s, douze secondes, sans audio. MediaPlayer et VideoOutput
ont signalé hasVideo=true, une progression jusqu'à 12000 ms et EndOfMedia sans
signal d'erreur. Après le second essai, Walson a confirmé « j'ai vu ». Le rendu
image est donc établi pour cette mire ; ni le son, ni les sources anime, ni les
sous-titres ne le sont. Les deux serveurs temporaires ont été fermés.

Le service trano-lan-gateway a ensuite été installé à part sur le serveur Linux,
sous /home/trano/trano-lan-gateway, sans volume ni changement du conteneur Trano.
Image dédiée sha256:4fe8fdf8d4e996a193b6472cc703eba190f9403d7f704e84a4bb9bd3db2a08ce.
Secrets générés après build hors de son contexte ; source sans code télécommande.
Funnel 8443 est publié vers le seul listener agent, avec DNS public et TLS testés ;
le lecteur reste 127.0.0.1:3015 authentifié. Le proxy privé 443 et l'image Trano
ont été comparés à leur état précédent et sont inchangés.

Lancement SDK initial depuis le LAN, puis inventaire Freebox v7 reçu depuis le
Player avec lifetimeMs=0. Redémarrage du seul conteneur passerelle : nouvel
inventaire reçu sans relancement du SDK. Nouvelle commande Accueil acceptée,
puis inventaires encore reçus après les observateurs. Statut Docker healthy,
politique unless-stopped, services docker et tailscaled enabled. Le relais reste
volontairement démarré. Le PC ne sert aucun fichier et n'héberge aucun processus
relais dans ce parcours ; son extinction physique n'a pas été réalisée.

La récupération après reboot/fermeture de l'application du Player reste non
résolue. Le serveur distant n'a pas d'accès entrant au LAN étudiant pour lancer
le SDK à sa place. La reprise automatique du conteneur serveur ne doit pas être
présentée comme un hook de démarrage sur le Devialet. La configuration du lecteur
LAN de Trano en production n'a pas été changée.

Les nouveaux tests Python couvrent les plages HTTP de la mire et l'exclusion des
secrets/appareils ambigus de l'installation (quatre tests). Les seize simulations
existantes de panne ont d'abord échoué sur le nettoyage des fichiers temporaires
dans l'environnement Windows restreint ; leur relance avec accès approprié au
dossier temporaire a réussi : seize tests passent. Aucun code du diagnostic
distant existant n’a été changé pour obtenir ce résultat.


## 22 octobre — inspection ciblée du démarrage, firmware 1.5.26

Nouvelle sonde startup-probe.qml : noms des 21 membres natifs App seulement,
modèle/firmware lus via Device selon le contrat public. Résultat matériel :
fbx7hd-delta / 1.5.26. Le canal shellRequest/shellResponse existe, mais aucune
commande de boot n'est documentée dans Shell ; aucune méthode devinée ni écriture
de réglage n'a été tentée. Les deux diagnostics ont fermé leur serveur temporaire,
puis le relais permanent a été relancé avec succès.

Ports TCP 22 et 5555 : connexion impossible sur le seul Player. Le catalogue FLOSS
officiel ne lie pas 1.5.26 ; son URL exacte renvoie 404. Il n'y a pas d'artefact
natif du firmware sélectionné pour une analyse REA. Les preuves documentaires et
leurs limites sont dans .local/research/official-devialet-docs-2026-10-22/.

Une observation serveur de dix minutes a été armée avant de demander à Walson un
vrai redémarrage depuis le menu système. Elle ne relance pas l'application et
sépare connexion de l'agent et identité du Player, car un port Spotify peut changer
au reboot. Le résultat du reboot est consigné ci-dessous ; ne pas confondre cela avec
les essais Accueil ou le redémarrage de la passerelle précédents.

Trois tests du diagnostic passent, dont le refus d'un lancement sans --launch et
d'options incompatibles. git diff --check est vérifié avant livraison.


## 22 octobre — reboot confirmé, absence de reprise automatique

Walson a confirmé le retour de l'accueil après son redémarrage système. Perte
observée de l'agent à 23:46:02 UTC le 21 octobre, soit 01:46:02 le 22 octobre à
Paris. Aucun retour de l'agent avant la fin de l'observation, aucun appel de
lancement pendant celle-ci. Le port HTTP du Player était à nouveau joignable.
La relance manuelle du SDK, après confirmation de l'accueil, a réussi.

La sonde --boot-layout a essayé quatre lectures fixes de métadonnées OS/init,
sans écriture ni collecte des fichiers bruts : process_identity, kernel, init et
os. Toutes ont signalé readable=false ; cause non établie (chemin absent ou
lecture refusée/indisponible). Le serveur temporaire a été fermé. Relance du
relais acceptée, puis inventaire Freebox v7 confirmé avec observation âgée de
1,5 seconde. L'observateur de reboot est terminé ; seul le service permanent
reste volontairement actif. Aucun flash/root ni changement système n'a été fait.

Le démarrage automatique du relais de développement est donc réfuté pour cet
essai réel. Aucun mécanisme alternatif de boot n'est encore établi avec les
accès disponibles. Le nouveau mode refuse lui aussi le lancement sans --launch
et les autres modes simultanés ; les trois tests du diagnostic passent.
