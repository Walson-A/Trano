# Devialet : recherche REA d'un lancement après reboot

## Question et état matériel

Trouver un mécanisme qui relance le relais sur le Player après reboot, sans PC.
Le vrai reboot précédent du fbx7hd-delta, firmware 1.5.26, n'a pas restauré
l'application de développement. La passerelle Linux est permanente ; le processus
agent du Player reste la pièce manquante au démarrage. Aucun autostart n'est livré
par cette recherche.

## Services du seul Player identifié

Le nouveau diagnostic devialet-service-probe.py exige --inspect et vérifie d'abord
l'identité Spotify : status 101, marque Freebox, modèle Freebox v7. Un changement
d'identité arrête les contrôles avant les connexions TCP ou requêtes d'API. Aucun
code télécommande ni jeton de contrôle n'est utilisé ou envoyé.

Un contrôle TCP de 21 ports explicites du seul Player a trouvé ouverts 80, 8080,
32980, 32981 et 32983. Les trois derniers correspondent aux ports du diagnostic
QML déjà connus ; une connexion TCP ne prouve pas un service d'administration.
Aucune authentification, clé distante, commande SDK ou écriture système n'a été
effectuée par ce diagnostic. Ce n'est pas un inventaire complet de tous les ports.

| Requête | Résultat observé |
| --- | --- |
| GET port 80 /api_version | HTTP 404 |
| GET port 80 /pub/devel | HTTP 200, erreur JSON-RPC -32600 |
| POST port 80 /pub/devel, rpc.discover | HTTP 200, erreur -32601 |
| POST port 80 /pub/devel, system.listMethods | HTTP 200, erreur -32601 |
| GET port 8080 / | HTTP 404 |
| GET port 8080 /api_version | HTTP 404 |

Ces refus excluent seulement ces opérations précises. Ils ne constituent ni une
liste des méthodes natives ni une preuve que le port 8080 ne sert aucune autre
route. Les requêtes de découverte n'ont pas lancé debug_qml_app.

Les captures HAR sont produites par le diagnostic urllib, avec corps conservés,
en-têtes sélectionnés et redirections refusées. Ce ne sont pas des transactions
de navigateur. Les premières captures annotaient HTTP/1.1 sans relever la version
de réponse ; le diagnostic relève maintenant la version effectivement rapportée
par http.client. Cette limite des premières captures n'affecte pas les statuts et
corps observés. Les fichiers privés restent ignorés par Git :

- .local/rea-services-20261022/http.har et services.json ;
- .local/rea-services-20261022-8080/http.har et services.json.

## Opérations REA réellement exécutées

La capture de processus REA a refusé de démarrer sur Windows : son adaptateur ne
vérifie pas encore le nettoyage des descendants sur cet hôte. Aucun processus
cible n'a été lancé par cette opération. Aucune réinstallation ne contourne cette
limite ; les preuves suivantes utilisent des opérations disponibles.

| Evidence REA | Opération et portée |
| --- | --- |
| ev_6eece155e81dec735f051dbb77bb9b44f5a4747b330c961c89af6b1209a85f6d | inspect_web_network_capture, les quatre transactions port 80 |
| ev_fe245356d536056b3476bb78c4a7afe3619c71e0bddda3ccde2628d849036ca2 | inspect_web_network_capture, les deux GET port 8080 |
| ev_b0bddd40aac576a34bc2674f8267e9fc5fa578d6b679d5904ed14bd0f46bcf8c | analyze_javascript_application, bibliothèque officielle extraite |
| ev_417e492f8a0513117e40989f9bbfa696421df8fdf87224ba4a8dde162bbee341 | vue résumé de cette analyse statique |

Les quatre enregistrements ont été exportés dans
.local/rea-devialet-startup-evidence-20261022.json (2 238 617 octets). L'export est
conservé comme preuve utile. La lecture REA des HAR est hors ligne : elle ne
recontacte pas les URL et n'établit pas d'attribution à une exécution de navigateur.

## Archive officiellement distribuée

La page [Freebox-Qt](https://dev.freebox.fr/freebox-qt/) fournit une bibliothèque
QML indépendante de l'architecture, sans exécutable. L'archive
[libfbxqml.txz](https://dev.freebox.fr/freebox-qt/libfbxqml.txz) a été téléchargée
sans exécution : 720 884 octets, Last-Modified du 8 novembre 2016, SHA-256
704163a6aa3d11168a999b25d682160dc1092d18e2ce9ac62e273776892409c0.
Extraction bornée et sans liens : 486 membres, 1 055 596 octets décompressés.
Archive, arbre extrait et provenance sont sous .local/research/official-libfbxqml-20161108*.

L'analyse REA a recensé 31 fichiers JavaScript, dont 24 échecs de parsing :
plusieurs utilisent les directives .import/.pragma de QML. Couverture partielle,
24 inconnues applicatives et 409 inconnues sémantiques. Le graphe ne permet donc
pas de conclure à l'absence de fonctions. Une recherche textuelle complémentaire
n'a identifié ni wrapper de boot ni implémentation native Shell. L'exemple de
reboot dans freeboxos_auth.js concerne le Server FreeboxOS, pas le démarrage du
Player. L'archive de 2016 n'est pas le runtime natif du firmware 1.5.26.

Les DLL/.so publiées pour QtCreator sur PC n'ont pas été présentées comme des
binaires du Player ni analysées pour inventer un comportement de son firmware.

## Autres vérifications ciblées

La sonde boot-probe.qml a essayé de créer FolderListModel via
Qt.labs.folderlistmodel 2.1 pour examiner uniquement les noms des entrées de
/etc/init.d et /usr/lib/qt5/qml, sans récursion ni lecture de contenus. La création
demandée a échoué ; aucun répertoire n'a été listé. Cela ne précise pas si le
module, sa version ou une dépendance manque. Les quatre lectures de métadonnées
OS précédentes restent également infructueuses. Le serveur de diagnostic a été
fermé et le relais permanent relancé ; preuve dans .local/boot-directory-evidence.json.

L'exemple officiel screensaver n'ajoute pas d'enregistrement système dans son
SettingsClient : il utilise Settings pour la couleur du logo. Son manifeste
déclare une entrée screensaver ; cela ne démontre pas son installation ni son
lancement au boot. Le packager QtCreator produit un gzip de TAR avec extension
.fbxqml. Ce format ne prouve pas l'existence d'un installateur local autorisé sur
le Player. Aucune installation devinée, modification de boot, root ou flash n'a
été tentée.

## Ce qui permettrait d'avancer

Il manque toujours un mécanisme natif persistant démontré, ou l'artefact natif
exact permettant de retrouver ce mécanisme. La recherche REA ne fournit pas
actuellement une solution d'autostart.

Une seconde architecture satisferait l'absence de PC : un équipement déjà présent
sur le LAN, capable d'exécuter une tâche, relancerait le SDK au retour du Player.
Walson a été interrogé sur son accès administrateur à la box de son logement.
La capacité réelle de ce routeur reste à vérifier ; aucun accès administrateur
ni changement de routeur n'a été effectué. Ne pas proposer de publier l'API
développeur non authentifiée du Player sur Internet pour contourner ce manque.

## Reproduction

    python -B packages/lan/scripts/devialet-service-probe.py .local/relay.json devialet --output .local/nouvelle-preuve --inspect
    python -B packages/lan/scripts/devialet-service-probe.py .local/relay.json devialet --output .local/nouvelle-preuve-8080 --inspect --http-port 8080
    python -B packages/lan/test/service_probe_test.py

Le mode 8080 effectue seulement les deux GET, sans RPC ni nouveau contrôle TCP.
Le diagnostic refuse d'écraser les fichiers de preuve existants. Trois tests
isolés vérifient l'activation explicite du diagnostic, le refus d'une identité
différente et le mode alternatif GET seul sans fuite du code de contrôle.


Validation finale : trois tests de la sonde de services et trois tests du
contrôleur de diagnostic passent ; syntaxe Python, liens locaux et git diff
--check vérifiés. Les tests à fixtures temporaires ont nécessité l'accès au
répertoire temporaire Windows ; leur exécution restreinte avait échoué avant
toute opération réseau. Aucun dossier de fixture résiduel n'a été retrouvé dans
le chemin de l'erreur. Le relais permanent est de nouveau observé en ligne,
controlEnabled=false, avec une observation âgée de 0,2 seconde. Les captures,
l'archive officielle et l'export REA sont conservés comme preuves ; aucun serveur
de test du PC n'est laissé actif par ces diagnostics.

## Suite : installation hors Store

La [passe suivante](2026-10-22-devialet-apps-sans-freestore.md) vérifie les dépôts
freebox-tool et ReDeFin, analyse un paquet distribué avec REA, identifie un
chemin public du firmware 1.5.26 et teste les gestionnaires d'ouverture du
Player avec notre propre archive. Elle distingue installation persistante,
lancement manuel sans PC et démarrage automatique.
