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
