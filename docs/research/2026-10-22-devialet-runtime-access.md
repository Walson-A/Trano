# Devialet : débogueur QML et lecture native ciblée

## Version Qt mesurée, demande de version uniquement

Le débogueur du Player annonce **Qt 5.15.19**. La réponse brute reçue est :

    this is not V8, this is V4 in Qt 5.15.19

Cette mesure remplace les suppositions de version issues des autres appareils
ou des références de source. Les sources Qt 5.12 utilisées dans les analyses
précédentes restent des références de protocole et d'implémentation ; elles ne
sont pas une attestation du code exact livré sur ce Player. La version annoncée
ne décrit pas les éventuelles modifications spécifiques de Free.

L'application de diagnostic est temporaire. Seul le service V8Debugger est
activé après le hello d'inventaire. Le décodage de tous les paquets sortants de
ce service confirme exactement deux messages : connect avec objet vide, puis
v8request contenant seq=1, type=request, command=version. Aucun autre ordre
de débogage, évaluation de code, lecture de propriété ou breakpoint n'est envoyé.
La réponse version porte success=true.

Les quatre fichiers de preuve sont conservés sous
.local/qt-version-pass-20261022/, avec leur index d'empreintes. SHA-256 de
evidence-index.json :
20317a8f55b97f3114f3ed2299401aa87c7d5e9a48f5574f0d2d2c3f0f08d5f4.
Le débogueur et le serveur HTTP temporaire sont fermés. Le relais est relancé
puis vérifié depuis le serveur : HTTP 200, devialet reachable=true,
controlEnabled=false. Cette interrogation n'installe rien et ne démontre aucun
mécanisme de démarrage automatique.

## Écran de veille : exécution et présence dans le menu

Deux essais temporaires reprennent le contrat de l'exemple officiel Free :
une entrée `settings` par défaut et une entrée `screensaver`. Le second reste
observable jusqu'à trois minutes, avec arrêt anticipé contrôlé. Walson voit
l'application en arrière-plan pendant qu'il vérifie le menu, mais aucun
« Atlas test ecran de veille » : seuls AKTU, Freebox et le lien FreeStore sont
visibles. Le FreeStore ouvert est vide et demande un redémarrage du Server.
Ce message ne prouve aucune installation Atlas en attente.

Les deux journaux reçoivent `started` pour `settings`, puis `home_requested`.
Aucun lancement de l'entrée `screensaver` n'est observé. Le SDK accepte donc
l'exécution, sans inscription constatée dans le sélecteur. Les serveurs HTTP
temporaires sont fermés et le relais permanent est relancé après les essais.
La vérification finale du lecteur serveur retourne HTTP 200,
`devialet reachable=true`, `controlEnabled=false`.
Preuves locales : `.local/lifecycle-pass-20261022/`, notamment
`observation-2/reports.json` et `user-observation.json`.

L'[exemple officiel](https://github.com/fbx/qmlapps_examples/tree/master/samples/screensaver)
ne contient pas d'appel d'enregistrement : son manifeste expose les deux entrées,
et ses réglages ne conservent que la couleur. Le
[lanceur SDK](https://github.com/fbx/freebox-qtcreator-plugin/blob/master/remote/remoteqml.cc)
transmet `manifest_url`, `entry_point` et `wait` à `debug_qml_app` sans opération
d'installation. Déclarer `screensaver` et lancer `settings` ne suffit donc pas
dans les conditions testées.

Le code qui construit la liste système n'a pas été récupéré. La recherche dans
`libfbxqml`, l'archive officielle 2016, les exemples et le plugin QtCreator ne
trouve pas son modèle de catalogue. Le débogueur précédemment interrogé ne
montre que le moteur de notre application, pas celui des réglages. REA confirme
qu'aucune cible native n'est actuellement ouverte ; les anciennes extractions
des deux rootfs n'avaient publié aucun fichier exploitable. Aucun de ces faits
ne permet de prétendre inspecter en direct le menu système.

L'hypothèse d'un catalogue d'applications installées reste plausible, mais les
filtres exacts (profil, origine, identifiant, rafraîchissement) sont inconnus.
Aucun enregistrement persistant ni lancement après reboot n'est établi. Un
écran de veille lancé après inactivité ne garantirait d'ailleurs pas, à lui seul,
un relais disponible dès le démarrage ou pendant toute utilisation de la TV.

Les [sources publiques Qt 5.15](https://github.com/qt/qtbase/blob/5.15/src/gui/kernel/qsessionmanager.cpp)
décrivent `QSessionManager` comme une interface
vers le gestionnaire de session de la plateforme. Les préférences de relance
sont des indications ; le backend générique ne crée pas d'inscription persistante.
La version 5.15.19 annoncée par le Player ne constitue donc pas un mécanisme
d'autostart. Il s'agit de sources de référence, pas du binaire Free attesté.

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

## Suite : recherche d'une configuration de lancement par la voie XML

La lecture de fonts.conf ne permet pas de supposer que le lancement des apps
est lui-même configuré en XML. La recherche supplémentaire dans les sources
SDK, les exemples, le plugin QtCreator et les publications GPL Delta ne trouve
aucun chemin XML de registre d'applications ou de démarrage. Les manifestes
d'apps publiés sont en JSON ; leur présence ne vaut pas installation persistante.

La [publication GPL Delta 1.5.3](https://floss.freebox.fr/freebox_player_delta/1.5.3/)
référence BusyBox 1.21.0 et des patches de init/init.c. Le
[source amont exact](https://github.com/mirror/busybox/blob/1_21_0/init/init.c)
définit /etc/init.d/rcS comme script par défaut et ouvre /etc/inittab. Ce sont
donc deux candidats précis, mais de format texte, avec une limite de version
et de configuration : ils ne sont pas attestés sur le firmware installé 1.5.26.

Le test sur le Player utilise Qt.createComponent pour demander la lecture de
ces chemins fixes. Aucun composant n'est instancié. Les fichiers témoins connus
provoquent des erreurs de syntaxe QML à la ligne 1, ce qui confirme leur lecture
sans exécuter leur contenu. Les chemins de démarrage retournent, eux :

| Chemin | Réponse du lecteur natif |
| --- | --- |
| /etc/inittab | No such file or directory |
| /etc/init.d/rcS | No such file or directory |
| /etc/fonts/fonts.conf | Expected token numeric literal, ligne 1 |
| /usr/lib/qt5/qml/QtWebKit/qmldir | Expected token {, ligne 1 |

Cela établit la visibilité de ces chemins dans le contexte du processus QML,
pas la structure complète de la racine du Player. Une absence dans ce contexte
ne prouve pas l'absence du fichier dans un autre espace de fichiers du système.

Le rôle XML lit ensuite tous les éléments include de fonts.conf, avec leurs
attributs : un seul élément, conf.d, prefix vide et ignore_missing=yes. Il s'agit
d'un répertoire de configuration des polices, pas d'une référence au lanceur.
Le premier essai comportait des points-virgules invalides entre les objets
XmlRole ; cette lecture XML a échoué à la compilation. Le second essai corrige
uniquement cette syntaxe et fournit le résultat ci-dessus. Les deux captures
restent distinctes ; les tests de chemins natifs ont répondu dans les deux.

L'étude du lecteur exclut aussi deux méthodes d'inventaire, sans les tester
inutilement sur le Player :

- [CollectionFN Qt 5.12](https://github.com/qt/qtxmlpatterns/blob/5.12/src/xmlpatterns/functions/qsequencegeneratingfns.cpp)
  retourne une erreur pour une collection par défaut ou une URI explicite ;
  collection() n'est pas un inventaire de répertoire.
- [QNetworkReplyFileImpl](https://github.com/qt/qtbase/blob/5.12/src/network/access/qnetworkreplyfileimpl.cpp)
  refuse les répertoires. doc(file:///dossier/) ne fournit pas leur contenu.
  QResource::children existe en C++, sans exposition établie dans ces API QML.

Deux patches officiels supplémentaires sont conservés : 28.ns.patch ajoute des
outils nsenter/unshare et 29.tar_chroot.patch une option chroot à tar. Cela
documente des possibilités de construction de namespaces, sans prouver que notre
application est lancée de cette façon. Un contrôle supplémentaire, toujours sans
instanciation, obtient File is empty pour /proc/version et /proc/self/mountinfo.
Il ne récupère aucun contenu et ne prouve pas que ces fichiers virtuels sont
réellement vides. Les trois chemins /proc/1/root/etc/inittab,
/proc/1/root/etc/init.d/rcS et /proc/1/root/etc/fonts/fonts.conf retournent
No such file or directory. Aucun accès à la racine de PID 1 n'en découle.

Une recherche ASCII ciblée des noms terminant en .xml dans les trois images
officielles déjà conservées ne trouve aucun candidat. Elle ne décode pas les
zones protégées et ne prouve pas qu'aucun fichier XML n'existe après chargement.
À titre de contrôle d'une autre voie possible sans PC permanent, ipconfig ne
montre pas d'IPv6 globale sur le PC ; ce seul constat ne détermine ni l'adresse
du Player ni sa joignabilité entrante. Aucune route distante nouvelle n'est créée.

Les preuves de cette suite restent hors Git dans .local/xml-startup-pass-20261022/,
.local/xml-startup-pass-20261022-corrected/ et .local/xml-startup-pass-20261022-proc/.
L'index du dossier corrected conserve 20 fichiers avec taille et SHA-256 ;
empreinte f07d7d5c864b81ec03d7ae48349dcf5002746bc51ab88b18b9f9cf219f114064.
Ces résultats viennent des diagnostics directs et des sources, sans nouvelle
inspection du HAR par REA et sans nouvel identifiant Evidence revendiqué.

Le bilan de cette piste est donc négatif pour l'autostart : aucune configuration
de lancement n'a été récupérée. Le lecteur XML ne remplace pas un accès général
aux fichiers texte et ne fournit ni listing ni écriture de configuration. La
suite réclame une autre capacité de lecture native ou une interface persistante
de lancement identifiée ; aucun mécanisme de boot ne peut être déduit des seules
références de polices. Aucun fichier système du Player n'a été modifié.

## Reprise du 23 octobre : relais actif et contrat de reprise inconnu

Une nouvelle interrogation du lecteur privé de la passerelle retourne HTTP 200,
`devialet reachable=true`, `controlEnabled=false`, sans nouvel appel de lancement
SDK. Cela confirme la disponibilité au moment de ce contrôle, pas une continuité
sans interruption ni une restauration après reboot. Preuve locale :
`.local/resume-20261023/gateway-health.txt`.

La fonction `App.urlOpenWithCheckpoint` est présente dans l'inventaire natif
antérieur (`.local/startup-api-evidence.json`). Une recherche ciblée dans les
exemples officiels, la bibliothèque QML distribuée, le plugin QtCreator et le
paquet ReDeFin déjà extrait ne trouve ni sa signature ni son implémentation.
Les occurrences de checkpoint de lecture vidéo de ReDeFin sont des fonctions
propres au lecteur, pas des appels à cette méthode native. Aucun appel à cette
méthode inconnue n'est effectué et aucune restauration après reboot n'en est
déduite.

La documentation publique de Shell décrit des demandes d'autorisation au Server
et la validation parentale, pas un registre de lancement. La documentation de
Settings décrit des données conservées entre sessions, pas un ordonnanceur.
Ces interfaces ne fournissent donc pas, dans les contrats examinés, la pièce
manquante du démarrage autonome. Aucun nouvel essai d'écran de veille, changement
système ou accès administrateur n'est réalisé pendant cette reprise.

## Suite du 23 octobre : métadonnées et séparation du runtime Freebox

Deux diagnostics réels, chacun borné à quinze secondes, ont été exécutés sur le
seul Player identifié. Le premier lit seulement les descripteurs JavaScript de
`App.urlOpen` et `App.urlOpenWithCheckpoint`, sans appeler ces méthodes. Les deux
renvoient une fonction native, `length=0`, nom vide et aucun nom propre ; la
représentation est `function() { [native code] }`. Ces valeurs ne sont pas une
signature C++ ni une preuve que la méthode accepte zéro argument.

Le second lit le type de `App.context` : il s'agit d'une chaîne, dont le contenu
n'est pas lu. Aucun membre du contexte n'est parcouru. `Qt.application.version`
vaut `dev`, conformément au mode développeur. Aucun registre, réglage ou état de
reprise n'est ainsi découvert. Les journaux et scripts sont conservés dans
`.local/checkpoint-metadata-20261023/` et `.local/app-context-20261023/`.
Les deux serveurs temporaires sont fermés. Le premier rétablissement du relais
a échoué ; les relancements suivants sont acceptés et une vérification privée
finale confirme HTTP 200, `devialet reachable=true`, `controlEnabled=false`.

Une piste de source plus précise est trouvée dans les archives officielles de
Qt livrées avec l'ancien Player Delta 1.0.7 :

- [QtDeclarative vendor](https://floss.freebox.fr/packages/qtdeclarative-v5.9.7-46-gd425e7edb.tar.gz),
  23 352 215 octets, SHA-256
  `9c384d994afbf9aca86222c4c66268563cc9a6390ab9200e66a15d1de655bb90`.
  L'inventaire et la recherche des 9 167 fichiers réguliers ne retrouvent pas
  `urlOpenWithCheckpoint` ni le runtime natif App. Une comparaison au tag Qt
  v5.9.7 constate notamment des changements de stockage WebSQL et de sauvegarde
  Settings ; ces changements ne sont pas des mécanismes de lancement.
- [QtWayland vendor](https://floss.freebox.fr/packages/qtwayland-v5.9.7-39-gdcb693e5.tar.gz),
  477 489 octets, SHA-256
  `6b2059658d5b9035921853a4269410e7d1a9d903a368b8bbff5b897e7bdb3a42`.
  Le plugin `qwayland-fbx-egl` dépend de `qfbxapp-client`. Dans
  `qfbxservices.cpp:17–34`, il transmet les ouvertures de documents et URL à
  `QFbxAppClient::shellRequest` avec la méthode `url_open` et les champs `url`
  et `media_type`. Son retour `true` est inconditionnel et ne prouve pas que
  le shell a effectivement ouvert l'URL.

Cette dépendance identifie un composant natif séparé à rechercher, mais son
implémentation et son en-tête `QFbxAppClient.hh` manquent. L'index public
`https://floss.freebox.fr/packages/`, lu intégralement dans la limite prévue,
ne comporte aucun lien contenant `qfbx`, `app-client` ou `fbxapp`. Aucun nom de
paquet n'est deviné ni aucune commande Shell inconnue envoyée au Player.
Preuves : `.local/vendor-qt-20261023/` et
`.local/vendor-wayland-20261023/`. Ces sources Qt 5.9 ne sont pas le binaire
Qt 5.15.19 observé ; aucun contrat d'autostart actuel n'en est déduit.

L'inventaire public des treize dépôts de l'organisation fbx permet aussi de
vérifier le [lanceur officiel fbx-qml-run](https://github.com/fbx/freebox-dev-utils/blob/1f510a3f3179215aadea4e858d323f2b73c338ce/bin/fbx-qml-run).
Il utilise lui aussi `debug_qml_app`, un serveur HTTP local et les trois
paramètres connus. Aucune option d'installation persistante ne s'y trouve.
Le code local QtCreator utilise directement `qmlscene`, sans simulateur natif
Freebox distinct dans ce chemin. Aucun de ces scripts tiers n'a été exécuté.

## Qfbxapp-client : vérification étendue et identité du runtime actuel

Un diagnostic temporaire exécuté sur le Devialet actuel observe le nom de classe
`fbx::QmlApp` en convertissant uniquement l'objet `App` de notre application en
chaîne, puis en ne conservant que le nom de classe. L'adresse et l'éventuel nom
d'objet ne sont ni transmis ni conservés. `Qt.application.version` vaut `dev`.
Aucune commande Shell inconnue, lecture de préférences ou modification de
configuration n'est effectuée. Le serveur temporaire est fermé. Le premier
relancement du relais a échoué ; un relancement explicite suivant est accepté,
puis le lecteur privé serveur confirme HTTP 200, `devialet reachable=true`,
`controlEnabled=false`. Preuve :
`.local/qfbxapp-followup-20261023/runtime/reports.json`.

Ce nom est une observation directe du runtime courant. Son rattachement au
`QFbxAppClient` des anciennes sources Wayland reste une inférence : aucun lien
binaire entre ces deux classes n'est établi.

Les recherches complémentaires de sources officielles donnent :

| Artefact lu, sans exécution | Résultat utile et limite |
| --- | --- |
| [QtBase vendor 5.9.7-36](https://floss.freebox.fr/packages/qtbase-v5.9.7-36-geb9200542b.tar.gz), 58 986 940 octets | Les 20 881 fichiers réguliers ne contiennent pas le client recherché. Le gestionnaire de session générique ne crée pas d'inscription persistante. |
| [QtWebKit vendor 5.5.1-231](https://floss.freebox.fr/packages/qtwebkit-v5.5.1-231-gd572e72ea42.tar.gz), 53 227 762 octets | Aucun des noms du client recherché. Le wrapper Qt utilise `wayland/freebox.h` pour importer des surfaces vidéo, sans contrat de lancement observé. |
| [QtWayland vendor 5.9.9-42](https://floss.freebox.fr/packages/qtwayland-v5.9.9-42-gb6c7baac.tar.gz), 477 936 octets | Les six fichiers du plugin Freebox, sa configuration et ses protocoles sont identiques à la version 5.9.7-39 déjà examinée. Le client reste une dépendance externe sans implémentation publiée dans ce paquet. |
| Index SDK Sphinx `searchindex.js` et `objects.inv` | 142 documents indexés et 790 entrées d'inventaire ; aucun contrat `qfbxapp`, `QmlApp`, `checkpoint`, `screensaver` ou `autostart` retrouvé dans ces index. Cela n'exclut pas une API native non documentée. |
| Catalogues officiels Player Révolution 1.3.29.1 et 1.3.34.1 | Aucun lien vers un artefact nommé qfbx/fbxqml/qmlapp/rootfs/firmware. Aucun firmware d'autre modèle n'est téléchargé ni aucune URL de paquet devinée. |

Les recherches de code GitHub n'apportent pas de définition pertinente pour
`QFbxAppClient`, `qfbxapp`, `qfbxapp-client.pc`, `urlOpenWithCheckpoint` ou
`fbx::QmlApp`. Elles portent sur les résultats indexés et accessibles des
branches par défaut, pas sur tout code existant. Les archives Qt historiques
ne sont pas une attestation du Qt 5.15.19 installé sur ce Player.

Les archives, inventaires, extraits, comparaisons et empreintes sont conservés
sous `.local/qfbxapp-followup-20261023/`. SHA-256 des trois archives ci-dessus,
dans l'ordre :

- `d76f0bbfd8fc308b99409dca9434d55353abe44ca1931016c5b306522fc162dd` ;
- `b55456a48f6ed5acc742cede581db12a6e918bd8baad7926d83ab5dcd7a982d6` ;
- `29bc69fc17109abd56a757e4dd8444e7c6b33d0307625246aabb282dbf9be46e`.

La prochaine analyse native requiert toujours le client ou le runtime réel,
son interface documentée, ou une procédure d'installation persistante attestée.
Aucun binaire de ce composant n'a été obtenu à ouvrir dans REA. Ce manque
n'établit pas une impossibilité absolue dans le firmware, mais aucun mécanisme
d'autostart ne peut être présenté comme démontré à partir de ces éléments.
La [question publique autorisée à ReDeFin](https://github.com/laborantine/ReDeFin/issues/92)
distingue explicitement le test SDK, un lancement manuel persistant et le
lancement automatique après reboot.

## Lecture ciblée sur le Player : exécutable accessible, octets non exportés

Une sonde réelle borne son accès à cinq chemins fixes, sans récursion et sans
instancier de composant. `Qt.createComponent` reçoit du contenu pour le chemin
d'exécutable précédemment mesuré `/usr/bin/fbxqmlviewer`, puis signale une erreur
de syntaxe. Le témoin `/etc/fonts/fonts.conf` donne aussi une erreur de parsing,
et le chemin témoin volontairement inexistant donne « not found ». Ce résultat
est compatible avec l'ouverture du fichier par le chargeur, mais ne récupère
pas ses octets et n'en mesure ni le format ni les dépendances.

Les chemins `/usr/lib/libqfbxapp-client.so` et
`/usr/lib/libqfbxapp-client.so.0` sont seulement deux candidats de nom, pas un
SONAME déduit du pkg-config. Ils retournent « not found » dans le contexte de
notre application. Cela n'exclut pas un autre nom, une liaison statique ou une
autre arborescence. L'essai XHR avec `responseType=arraybuffer` sur
`/usr/bin/fbxqmlviewer` retourne statut 0, longueur 0 et aucun octet d'en-tête.
Aucun binaire n'est exporté. Preuves :
`.local/player-file-access-20261023/reports.json` et les deux sources de la sonde.
Le serveur temporaire est fermé ; le relais est relancé et le lecteur privé
serveur confirme HTTP 200, `devialet reachable=true`, `controlEnabled=false`.

Les contrats publics Qt 5.15 ont aussi été vérifiés : `Qt.include` compile et
exécute un script, sans en retourner les octets ; QML Preview reçoit les fichiers
du client vers le Player et ne fournit pas un export inverse ; les commandes
V4 examinées ne fournissent pas de lecteur de fichiers natifs. Les ressources
`qrc:` et `QResource::data()` C++ ne constituent pas une API QML générale de
lecture du système. Sources et provenance :
`.local/readonly-qt-contract-20261023/`. Aucun de ces mécanismes n'est détourné.

Une autre voie ordinaire est préparée, sans lancement à ce stade : une page du
navigateur natif proposant un sélecteur HTML de fichier, `FileReader`, puis un
transfert vers le PC limité au fichier nommé `fbxqmlviewer`, avec en-tête ELF et
une taille maximale de 32 Mio. Le récepteur n'accepte que le Player identifié,
ne sert aucun répertoire et refuse d'écraser une capture existante. Ce test
requiert une sélection explicite sur la TV ; il ne suppose pas que le sélecteur
expose `/usr/bin` et ne contourne pas le refus du module WebView SDK.
La disponibilité de Walson près de la TV est demandée avant de l'ouvrir.
Préparation locale : `.local/player-file-picker-20261023/`.
