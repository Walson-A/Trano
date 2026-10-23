# Devialet : relais pendant Netflix

## Résultat et portée

Le test demandé par Walson observe une perte de disponibilité du relais après
l'ouverture de Netflix sur son Devialet. Walson confirme ensuite la lecture
avec image et son. Le serveur ne reçoit pas de reprise du relais pendant la
fenêtre observée. Cette passe teste le programme actuel et une transition réelle ;
elle ne prouve pas qu'aucune forme de coexistence ne soit possible sur ce firmware.

Les mesures de cette première passe ne distinguent pas fermeture du processus, suspension,
fermeture de la connexion par le runtime ou autre cause locale. Aucun diagnostic
du processus système ni lecture de mémoire n'est effectué. Un fonctionnement
après Retour à l'accueil, observé antérieurement, ne suffisait pas à établir
ce fonctionnement pendant une application vidéo native.

## Protocole et chronologie

Le relais était déjà actif ; aucune relance SDK n'est nécessaire pour obtenir
la ligne de base. Le lecteur privé de la passerelle confirme HTTP 200 et
`devialet reachable=true`. Quatre mesures distantes successives avant Netflix
retournent des `observedAt` différents, espacés d'environ cinq secondes : les
résultats ne proviennent pas seulement d'un inventaire ancien mis en cache.

Toutes les heures suivantes sont en UTC, le 23 octobre 2026 (ajouter deux heures
pour l'heure de Paris à cette date) :

| Événement | Heure UTC | Observation |
| --- | --- | --- |
| Première mesure serveur | 01:10:33.646 | HTTP 200, observation Player 01:10:30.236 |
| Dernière mesure disponible avant Netflix | 01:10:49.139 | HTTP 200, observation Player 01:10:45.236 |
| Commande télécommande `netflix` | 01:10:50.370 | Requête HTTP 200, sans preuve visuelle par cette seule réponse |
| Première mesure indisponible | 01:10:54.141 | HTTP 503, aucune observation retournée |
| Confirmation de Walson enregistrée | 01:14:03.903 | « Netflix est en lecture, image et son OK » |
| Dernière mesure serveur | 01:20:34.850 | HTTP 503, aucune reprise observée |

La date exacte du démarrage de la vidéo n'est pas mesurée : la confirmation
de Walson atteste qu'elle est en cours au moment de son message.

La fenêtre totale dure 601,204 secondes et contient 121 mesures : quatre HTTP
200 avant la commande, puis 117 HTTP 503, sans erreur de mesure. Les 79 mesures
postérieures à l'enregistrement de la confirmation utilisateur sont toutes
HTTP 503 ; elles couvrent environ six minutes et demie après cette confirmation.
L'intervalle maximal entre deux mesures est de 5,483 secondes. Le serveur n'a
donc pas simplement conservé un état indisponible que personne n'aurait réinterrogé.

Le lecteur n'affirme pas que le Player s'est éteint : il retourne HTTP 503 si
la session agent n'est plus active ou si les observations dépassent vingt
secondes. L'indisponibilité est ici observée moins de quatre secondes après
la commande, alors que la dernière observation était récente. Cela est
compatible avec une perte de session ; ce n'est pas une attestation de mort
du processus QML. Le lecteur valide aussi la séquence croissante des inventaires.

Deux contrôles indépendants après la perte du relais bornent l'interprétation :
le service d'identité du Player répond HTTP 200, statut 101, marque Freebox ;
le conteneur `trano-lan-gateway` est `running`, démarré le 22 octobre à
01:22:46.169946477Z, avec zéro redémarrage Docker. La passerelle n'a donc pas
été recréée ou redémarrée pendant cette transition. Ces contrôles ne mesurent
pas la connexion Internet du processus QML après l'ouverture de Netflix.

## Preuves et conséquences

La surveillance interroge le lecteur privé par SSH, dans le conteneur existant,
toutes les cinq secondes. Elle enregistre seulement les dates, statuts HTTP,
présence et âge de l'observation Devialet. Aucun secret, titre de film ou contenu
Netflix n'est collecté. Aucun nouveau serveur, port exposé, conteneur ou service
permanent n'est créé.

Scripts et preuves restent hors Git dans `.local/netflix-background-20261023/` :
`monitor.py`, `open-netflix.py`, `samples.jsonl`, `launch.json` et
`user-observation.json`, ainsi que `controls.json`, `summary.json` et l'index
d'empreintes `evidence-index.json`. Le code télécommande est lu depuis le fichier privé
existant et n'est ni affiché ni ajouté aux preuves.

Le processus de surveillance et sa commande SSH terminent avec un code de sortie
nul. Netflix est laissé en lecture ; aucun ordre de retour à l'accueil ni de
relance du relais n'est envoyé après la mesure. L'état final observé du relais
est indisponible, alors que le conteneur passerelle reste en service. Les preuves
et le worktree sont conservés pour la suite ; aucun serveur temporaire ne reste
à arrêter.

Un bouton sur le téléphone pourrait encore servir au lancement manuel d'Atlas TV.
Il ne résout pas, à lui seul, la continuité d'un relais pendant Netflix. Cette
continuité et la reprise après reboot restent deux exigences indépendantes.

## Diagnostics supplémentaires : destruction de la session QML

Trois sondes supplémentaires instrumentent notre propre application : compteur
de deux secondes, `Qt.application.state`, état actif/visible de la fenêtre,
séquence croissante du relais, `Component.onDestruction` et, pour la variante
avec fenêtre, `Window.closing`. Les deux flux SDK `stdout_port` et `stderr_port`
sont lus jusqu'à leur fin. Ces ports viennent de la réponse de lancement : aucun
port de débogage supposé ni processus Netflix n'est inspecté. Les jetons et le
code télécommande sont retirés des journaux avant leur écriture sur disque.

### Fenêtre Application puis Netflix

L'application normale utilise le même `RelayAgent.qml` que le relais permanent.
Après la commande d'accueil à 01:27:07.365 UTC, elle devient inactive
(`Qt.application.state=2`, `active=false`) ; ses compteurs et séquences du relais
continuent. Le lecteur distant confirme HTTP 200 et présence du Devialet pendant
cette phase. La propriété `visible` reste vraie : elle ne prouve toujours pas
une présence au premier plan.

La commande Netflix est acceptée à 01:27:32.438. À 01:27:32.466, notre journal
SDK contient `Component.onDestruction` avec le compteur 25 et la séquence relais
11. Les deux flux se terminent à 01:27:32.476–477. Aucun événement `closing`
n'est observé. Un dernier rapport réseau arrive dans les millisecondes de la
transition ; aucun compteur ne continue ensuite. Le lecteur distant retourne
HTTP 503. Une commande d'accueil à 01:28:52 ne provoque pas de reprise avant
la fin de l'observation, puis le relais est explicitement relancé.

Ce résultat montre le démontage de notre arborescence QML et la fin de ses flux,
pas une simple suspension des minuteries avec une application intacte. Il ne
fournit ni code de sortie natif, ni signal POSIX, ni fonction précise du lanceur
qui a demandé cet arrêt. Aucun `Qt.quit()` de la sonde n'est programmé à cet
instant : sa minuterie de fin est à 175 secondes, l'arrêt arrive vers 50 secondes.

### Relais sans fenêtre

Une seconde variante remplace `fbx.application.Application` par un `Item`
invisible, sans fenêtre, avec le même relais et des rapports toutes les deux
secondes. Elle démarre réellement, se connecte et atteint la séquence 11.
La commande Netflix à 01:31:19.657 est suivie de `Component.onDestruction`
à 01:31:19.680, puis de la fin des deux flux à 01:31:19.693. Aucun rapport
continu ne suit. Le retour à l'accueil à 01:32:09 ne relance pas cette sonde.
Son serveur temporaire est fermé et la relance du relais permanent est acceptée.
Masquer ou supprimer la fenêtre ne constitue donc pas le correctif recherché
dans les conditions de cet essai. Ce root `Item` est une variante diagnostique,
pas une nouvelle forme d'application FreeStore officiellement validée.

### Ouverture manuelle depuis l'icône

La troisième sonde conserve la variante sans fenêtre. Le relais est observé
actif côté serveur après la commande d'accueil. Aucune commande réseau Netflix
n'est envoyée dans cette variante : Walson ouvre Netflix depuis son icône et
confirme l'affichage. Le dernier compteur reçu est 22 à 01:33:39.478 ; la
destruction QML est journalisée à 01:33:40.509 et les deux flux se terminent
à 01:33:40.532–533. Le lecteur distant confirme HTTP 503 après la confirmation.
L'heure exacte du geste de Walson n'est pas mesurée par le collecteur.

La commande réseau dédiée n'est donc pas nécessaire pour reproduire l'arrêt.
Les observations sont compatibles avec une décision de cycle de vie du Player
lors du lancement de Netflix ; elles n'identifient pas encore la règle native
exacte, ses exceptions ou une possibilité de service indépendant.

## Contrats vérifiés et limites du correctif

La [documentation officielle du manifeste](https://dev.freebox.fr/sdk/manifest.html)
et celle d'[Application](https://dev.freebox.fr/sdk/libfbxqml/pub/application/application.html)
ne donnent aucune option de service résident ou de maintien après changement
d'application dans les contrats examinés. Les pages sont conservées avec leurs
empreintes dans `.local/qml-background-contract-20261023/`. Le parseur officiel
QtCreator accepte `uiFlavor: multi|classic`, mais n'en établit pas les effets
sur le cycle de vie ; les ressources `multi/` de libfbxqml sont des variantes
d'interface. Cette valeur n'est pas présentée comme une permission de multitâche.

Dans les [sources Qt 5.15 de QQuickWindow](https://github.com/qt/qtdeclarative/blob/5.15/src/quick/items/qquickwindow.cpp),
un événement normal de fermeture passe par `closing` et son état `accepted`.
Refuser une telle fermeture est une possibilité de Qt, mais aucun événement
correspondant n'est observé ici. Il ne serait pas fondé de livrer ce changement
comme solution à une destruction qui ne passe pas par ce signal observé.
`quitOnLastWindowClosed` est un réglage C++ de QGuiApplication, sans exposition
QML établie dans le SDK étudié ; la variante sans fenêtre s'arrête elle aussi.

Les [Timer QML](https://github.com/qt/qtdeclarative/blob/5.15/src/qml/types/qqmltimer.cpp)
dépendent de l'horloge d'animation, mais le renderloop standard prévoit un
timer lorsque les fenêtres sont occultées. `fbx.async.StableTimer` reste une
sous-classe de Timer. Aucun de ces mécanismes ne maintient une arborescence QML
après sa destruction. Les sources Qt amont ne sont pas une attestation du code
natif exact de Free 1.5.26/Qt 5.15.19.

## Inspection REA et conservation

Le HAR de la première sonde reprend 31 rapports réellement reçus par notre
serveur HTTP ; les enregistrements 0 et 30 sont projetés par REA, après lecture
de l'ensemble du fichier. Evidence :
`ev_0ee1faa4ceffa6ec19016dda04eb3a2ac3a912bf472bd36f32da621132b99b2a`.
SHA-256 du HAR :
`1632f7abcf906fe3040cb3ad6948dc2456d421b68622bc43ee1dec5e0a87121f`.

Il s'agit d'un export assaini du collecteur, pas d'une interception réseau de
Netflix. L'URL contient un segment de remplacement pour le nonce ; les dates
sont celles de réception et les durées réseau ne sont pas mesurées. Les événements
de contrôle et de fin des flux sont joints explicitement comme métadonnées
`_attachedProcessEvents`, pas comme contenu HTTP observé. REA préserve ces champs
et annonce `runtime_attribution=unknown` : l'attribution à notre sonde vient du
lancement contrôlé et du collecteur, pas d'une observation native indépendante
par REA. Aucun binaire du lanceur Free n'a été obtenu ou nouvellement décompilé.

Les sources, événements, résumés et l'Evidence exportée sont conservés hors Git
dans `.local/netflix-lifecycle-20261023/`,
`.local/netflix-lifecycle-headless-20261023/` et
`.local/netflix-lifecycle-manual-20261023/`. Les trois processus de diagnostic
terminent avec un code nul et leurs trois relances SDK sont acceptées. Le port
HTTP temporaire 3013 est ensuite vérifié fermé ; le lecteur privé confirme
HTTP 200, `devialet reachable=true`, `controlEnabled=false`. Le relais permanent
est donc de nouveau disponible après les diagnostics. Aucun changement du code du relais
permanent ni correctif d'arrière-plan n'est livré sur la base de ces seuls essais.
