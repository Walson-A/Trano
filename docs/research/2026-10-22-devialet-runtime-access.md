# Devialet : débogueur QML et lecture native ciblée

## Résultat et objectif restant

Le Player possédé par Walson, fbx7hd-delta 1.5.26 hors abonnement, accepte une
connexion réelle à son débogueur QML. Un autre backend, XmlListModel, permet
effectivement de lire un fichier XML local : /etc/fonts/fonts.conf. Ces deux
résultats ne fournissent pas encore le code déchiffré, le rootfs complet, les
scripts de démarrage ou un mécanisme de relance du relais après reboot.

Le relais permanent fonctionne à nouveau après les diagnostics. Le serveur
retourne HTTP 200, devialet reachable=true et controlEnabled=false. Aucun
Tailscale natif ni autostart n'a été installé sur le Player.

## Débogueur : connexion réelle, portée limitée

Le résultat de debug_qml_app fournit trois ports, stdout, stderr et QML. Leur
affectation n'est pas fixe : le lancement mesuré renvoie respectivement 32983,
32980 et 32981. Un premier essai utilisant une affectation supposée a échoué ;
il ne constitue pas une preuve d'absence du débogueur. Les essais suivants
utilisent uniquement le port retourné par le SDK.

Le protocole est établi à partir des sources primaires de
[QmlDebugConnection QtCreator 4.8](https://github.com/qt-creator/qt-creator/blob/4.8/src/libs/qmldebug/qmldebugconnection.cpp),
[QPacketProtocol](https://github.com/qt-creator/qt-creator/blob/4.8/src/libs/qmldebug/qpacketprotocol.cpp)
et du [serveur Qt 5.12](https://github.com/qt/qtdeclarative/blob/5.12/src/plugins/qmltooling/qmldbg_server/qqmldebugserver.cpp).
Chaque paquet porte une longueur little-endian incluant son en-tête de quatre
octets ; le contenu utilise QDataStream, QString UTF-16 big-endian. La version
de flux négociée sur le Player est 12. La liste vide de services dans le hello
permet de recevoir l'inventaire avant d'en activer un.

Le Player annonce neuf services : DebugMessages, QmlInspector, V8Debugger,
CanvasFrameRate, EngineControl, NativeQmlDebugger, QmlPreview, QmlDebugger et
DebugTranslation. Seul QmlDebugger est ensuite activé pour LIST_ENGINES et
LIST_OBJECTS. Aucun breakpoint, évaluation de code par le débogueur, lecture de
propriété ou changement d'application système n'est demandé.

Un premier inventaire, interrogé trop tôt, ne renvoyait aucun objet. L'essai
retenu attend le POST de démarrage de notre application avant les requêtes.
Il trouve un moteur, id 0, et un objet Window nommé
AtlasReadOnlyDebugInventory, dont la source est notre probe.qml HTTP. Les trois
contextes et l'objet sont décodés intégralement, sans octets restants. Cela
n'établit pas un accès au moteur de l'accueil ou à des processus voisins.

Le mot NativeQmlDebugger ne signifie pas débogueur de mémoire native : les
[commandes de l'implémentation Qt](https://github.com/qt/qtdeclarative/blob/5.12/src/plugins/qmltooling/qmldbg_nativedebugger/qqmlnativedebugservice.cpp)
concernent les cadres, variables et expressions JavaScript. Aucun lecteur de
mémoire arbitraire n'y a été identifié. Les contextes opaques n'ont pas été
forgés. QmlPreview reçoit des fichiers du client et peut réclamer une ressource
au client ; ce contrat ne constitue pas une exportation des fichiers du Player.
Ces limites viennent du source de référence, sans attestation binaire de chaque
service installé.

## Lecture locale : une preuve positive avec XmlListModel

Les essais sont des applications QML temporaires, avec chemins fixes, serveur
HTTP lié à l'adresse LAN du PC et récepteur limité à l'adresse du Player. Ils
se terminent par Qt.quit ; le serveur ferme ses sockets et le relais permanent
est relancé après chaque essai.

| Essai réel | Résultat | Ce qu'il établit |
| --- | --- | --- |
| Qt.labs.settings 1.1 | module non installé | Le backend QSettings testé est indisponible |
| QtQuick.LocalStorage 2.0, import seul | disponible, aucune base ouverte | Disponibilité du module, sans lecture de fichier |
| QtQuick.XmlListModel 2.0, XML inline | Ready, count=1, valeur control | Contrôle positif du lecteur et des rôles |
| file:///etc/fonts/fonts.conf, query /fontconfig | Ready, count=1 | Lecture native de ce document dans l'espace de fichiers du processus |
| Même fichier, rôle XQuery | /usr/share/fonts, conf.d, /usr/share/fonts/cache | Extraction effective de texte XML local |
| Même fichier via XHR | statut 0, longueur 0 | Échec XHR malgré la lecture positive par XmlListModel |
| Configurations D-Bus fixes, /proc/version, chemin qmldir supposé | Ready, count=0 | Aucun résultat positif ; absence, permissions et traitement du contenu restent indéterminés |

Les chemins D-Bus essayés sont /etc/dbus-1/system.conf,
/usr/share/dbus-1/system.conf et /etc/dbus-1/session.conf. Le chemin qmldir essayé
est /usr/lib/qt5/qml/fbx/application/qmldir ; sa présence n'est pas établie.
/proc/version n'est pas du XML. Aucun résultat count=0 ne doit être présenté
comme une lecture réussie, une preuve de fichier absent ou une preuve de chroot.

Dans le [source exact Qt 5.12.0](https://github.com/qt/qtxmlpatterns/blob/v5.12.0/src/imports/xmllistmodel/qqmlxmllistmodel.cpp#L1064),
XmlListModel ouvre les sources locales par QFile en lecture seule. Ce chemin
est distinct de XHR. Le source traite aussi un échec d'ouverture comme un buffer
vide, ce qui explique la limite des résultats négatifs. Une lecture positive
de fonts.conf ne prouve pas l'accès à la racine complète, ni aux périphériques
mémoire ou aux buffers TrustZone.

Deux extensions envisagées sont écartées par les sources, sans test hasardeux :

- fn:unparsed-text appartient à la factory XSLT20 ; le modèle utilise par défaut
  XQuery10 avec la factory XPath20. Il ne fournit donc pas un lecteur de texte
  arbitraire par cette fonction dans le contrat examiné.
- Le [chargeur AccelTree](https://github.com/qt/qtxmlpatterns/blob/v5.12.0/src/xmlpatterns/acceltree/qacceltreeresourceloader.cpp#L240)
  ignore DTD et références d'entités et n'installe pas de résolveur externe.
  Aucune sonde d'entité externe n'a été lancée.

LocalStorage impose un nom de fichier dérivé du MD5 du nom de base et peut créer
répertoire et métadonnées avant les requêtes SQL. Le
[source Qt](https://github.com/qt/qtdeclarative/blob/5.12/src/imports/localstorage/plugin.cpp)
ne fournit pas une ouverture arbitraire de chemin en lecture seule. Aucune base
inconnue n'a été ouverte ; aucune extension SQLite ou écriture système tentée.

## Autres interfaces examinées

Qt.application.arguments[0] révèle /usr/bin/fbxqmlviewer. Le nom de l'application
est celui de notre manifeste, sa version est dev : ce n'est pas la version Qt.
Les autres arguments n'ont pas été exportés. App.context n'énumère aucune clé.
Qt.labs.platform 1.0 est absent.

QtWebEngine 1.0 et QtWebView 1.1 sont absents. L'import QtWebKit 3.0 échoue avec
un conflit de namespace déjà utilisé pour l'enregistrement des types ; ce
résultat est distinct d'un module non installé. Aucune vue web n'a été créée.

Une vérification supplémentaire par Qt.createComponent confirme que
/usr/lib/qt5/qml/QtWebKit/qmldir est lisible : le parseur QML signale un token
inattendu à la ligne 1, résultat attendu pour ce format non QML. Trois autres
emplacements conventionnels retournent No such file or directory. Les seuls
arguments supplémentaires exportés sont les noms de switches -d, -e, -p ;
aucun chemin d'import n'est trouvé par la liste d'options ciblée.

Le code Qt explique le conflit par des types de même namespace/majeure déjà
enregistrés. Un essai fondé sur ce source héberge uniquement dans notre app un
répertoire HTTP relatif QtWebKit, avec qmldir contenant module QtWebKit, sans
plugin. L'import versionné relatif "QtWebKit" 3.0 tente alors de réutiliser les
types existants, sans remplacer de fichier système ni activer QmlPreview.
Le Player refuse explicitement le composant : WebView not allowed. Le message
diffère du conflit de plugin mais ne donne toujours pas de vue exploitable.
La cause exacte de cette restriction native n'est pas décompilée ; aucune
capability non documentée ou modification du registre de types n'est tentée.

Une découverte SSDP unicast vers le seul Player retrouve un MediaRenderer.
Les trois descriptions SCPD retournent HTTP 200 : ConnectionManager annonce
quatre actions de connexion, AVTransport quatorze actions de lecture et
RenderingControl quatre actions volume/sourdine. Aucun ContentDirectory ni
action d'export de fichiers n'est annoncé dans ces descriptions. Aucune action
de lecture ou de volume n'a été exécutée pendant cet inventaire.

Les sources SDK consultées ne donnent pas de chemin XML de registre d'apps.
fbx.application.Settings agit sur App.settings, par application/profil ;
Store.Directory est un catalogue HTTP et Explorer une pile de navigation.
Le Shell public documente l'autorisation FreeboxOS et le contrôle parental ;
le [Shell privé](https://dev.freebox.fr/sdk/libfbxqml/priv/async/shell.html)
documente vod_ticket_create. Aucun contrat de fichier ou de boot n'en découle.

Le patch GPL de référence expose une console série de développement, mais
aucun shell disponible sur notre Player n'est établi. Son profil USB est host,
KGDB est désactivé et les opérations qseecom examinées n'offrent pas read/mmap.
Cette configuration publiée n'atteste pas le noyau installé 1.5.26. Le
[projet communautaire Devialet consulté](https://github.com/EricBlanquer/freebox-devialet-hack)
reste au repérage de pads UART ; il ne fournit pas de journal démontrant un
shell, un dump ou un EDL fonctionnel. Aucun démontage, flash ou essai électrique
n'a été réalisé ici.

## Preuves, limites et prochain verrou

Les captures et scripts sont conservés hors Git sous
.local/low-level-access-20261022/. L'index evidence-index.json inventorie
59 fichiers avec taille et SHA-256 ; son empreinte est
74af2df45de9157d54d9a3220cbc8b1c79685f1d259c435996c752cdb28ce04f.
Les sous-dossiers debug-run-2, settings-probe, xml-probe, xml-probe-2,
xml-probe-3, runtime-paths, web-module-imports, webkit-module-paths et webkit-reuse
distinguent les essais.
Les sources Qt de référence sont conservées sous
.local/research/qml-debug-primary-20261022/.

Les HAR contiennent les POST réellement reçus par notre récepteur, pas une
capture des appels QFile internes ou du protocole TCP du débogueur. L'inspection
du HAR Settings par REA a été rejetée par l'approbation automatique, qui a cité
un risque d'exposition de métadonnées réseau au connecteur. Elle n'a pas été
contournée : les rapports sont analysés localement. Aucun nouvel identifiant
Evidence REA n'est revendiqué pour cette passe. Les Evidence natives antérieures
restent dans le [relevé du chargement des trustlets](2026-10-22-devialet-trustlets-load.md).

Le débogueur QML et la lecture XML ciblée sont donc établis ; l'accès aux buffers
décryptés et aux fichiers de démarrage reste non résolu. Il manque une interface
de lecture native plus générale, un chemin de configuration de démarrage
identifié et accessible, ou un mécanisme persistant d'installation démontré.
Les sources examinées ne permettent pas de sélectionner actuellement l'un de
ces chemins. Cela ne prouve pas une impossibilité absolue du firmware.

Les serveurs temporaires sont fermés et le débogueur déconnecté. Le worktree et
ses preuves sont conservés pour poursuivre ; les checkouts et processus des
autres travaux sont préservés. Cette passe ne change aucun code livré.
