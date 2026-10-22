# Devialet : applications hors FreeStore — 22 octobre 2026

## Question et périmètre

Installer Atlas et garder un point de lancement après un reboot du Player,
sans abonnement Free, sans PC permanent et sans nouvel équipement. Une
installation lançable à la télécommande et un démarrage automatique sont deux
résultats distincts. Aucun des deux n'est encore établi par cette recherche.
Le lancement développeur, la vidéo et le relais après ce lancement sont déjà
prouvés dans [le relevé précédent](2026-10-22-devialet-rea-startup.md).

L'utilisateur n'a pas accès aux identifiants administrateur de sa box de
logement. Son interface publique répond, mais aucune authentification, aucun
mot de passe par défaut et aucun changement de configuration n'ont été tentés.
La piste routeur n'est pas une solution établie.

## Dépôts communautaires vérifiés

### freebox-tool

Dépôt : [aminekun90/freebox-tool](https://github.com/aminekun90/freebox-tool),
commit `c50b70c2569d8443f9a6a6325e392d969217099f`.
Le [bilan de l'auteur](https://github.com/aminekun90/freebox-tool/blob/c50b70c2569d8443f9a6a6325e392d969217099f/ETAT-DES-LIEUX.md)
porte sur un Devialet hors abonnement. Son lanceur utilise exactement le SDK
`debug_qml_app`, déjà fonctionnel ici. Les pistes root/Android/mode test sont
présentées comme des recherches ; aucune installation persistante autonome
aboutie n'est démontrée dans les documents publics examinés. Le répertoire
firmware publié contient seulement un README et un .gitkeep.

Les conclusions de l'auteur sur les protections natives ne sont pas des
observations de notre Player. Aucun de ses outils, fuzzers, captures avec
interception réseau, scripts de flash ou images modifiées n'a été exécuté.
Le clone conservé est une source à lire, pas un logiciel installé.

### ReDeFin

Dépôt : [laborantine/ReDeFin](https://github.com/laborantine/ReDeFin), README
vérifié au commit `e1642f158f72ef0861a93689a25f70e7e549e1d3`.
Le [README fixé](https://github.com/laborantine/ReDeFin/blob/e1642f158f72ef0861a93689a25f70e7e549e1d3/README.md)
mentionne une méthode alternative de test pour les Devialet sans abonnement,
à demander à l'auteur. Elle n'y est pas décrite ; rien ne démontre qu'elle
installe durablement l'app plutôt que d'utiliser le lancement SDK.
Aucun message n'a été envoyé à l'auteur.

Le paquet public stable 1.0 a été téléchargé depuis
[la release](https://github.com/laborantine/ReDeFin/releases/tag/v1.0_stable),
tag associé à `0b5eabccc4c1c95895fd97bea03e0fc7bd17afcc` :

- fichier : ReDeFin-stable_1.0_final.fbxqml ;
- taille : 1 082 432 octets ;
- SHA-256 : `e0c45f66c18808d3a0262cc3fa4b4f680b304293cfe824a62a63f41b4d0c5a5b` ;
- format observé : gzip de TAR, 91 membres, 4 141 731 octets décompressés ;
- manifeste : entrée main.qml, default=true, net_lan requis et net_wan optionnel.

Extraction bornée, refus des chemins traversants/liens/fichiers spéciaux.
Aucun code de ce paquet n'a été exécuté sur Windows ou sur le Player.
Le format distribuable ne constitue pas une preuve d'installation hors Store.
L'[issue 57](https://github.com/laborantine/ReDeFin/issues/57) confirme que les
sources sont distribuées dans les paquets des releases.

## REA : paquet distribué et limites QML

Analyse du contenu extrait par analyze_javascript_application : parent
`ev_9a167fb355612cebbb54055460b3a68e8f6efea0d7413c7a1420fd963e9a56e4`,
vue `ev_96de59be3fe1e1f81f768bafc3910d8f22a51440bcb442d9c6fb4a63bbc4aecd`.
Les 29 JS échouent initialement au parseur à cause des directives QML ; les
fichiers QML ne sont pas assimilables à des modules JavaScript ordinaires.
Aucune absence de mécanisme ne se déduit du nombre nul de résultats.

Une copie dérivée remplace uniquement les lignes .pragma/.import par des
lignes vides. Les correspondances et SHA-256 par fichier sont conservés dans
.local/research/redefin-normalization.json. Cette transformation supprime la
sémantique des imports QML et ne prouve aucune résolution à l'exécution.
Après un échec de transfert ENOSPC, corrigé par suppression de notre propre
téléchargement incomplet, la nouvelle analyse termine : 29 JS parsés, aucun
échec syntaxique, 141 433 nœuds AST visités. Couverture sémantique partielle
et tronquée, 8 719 inconnues ; pas de conclusion d'exhaustivité.
Parent `ev_2264326010bb15727841d32d42503a94f26a7cc4c8b847ea647be233a779544d`,
vue `ev_92685c5e992c5ef14b1a06126886a6b8eb82ec27ae0c803cff9bcc9772f0bc63`.
Le résumé compact est conservé ; aucun export massif du graphe n'est nécessaire.

## Nouvelle provenance firmware officielle

FINDINGS.md du dépôt freebox-tool fournit les chemins publics d'artefacts OTA.
Deux HEAD sur fbx-firmware.proxad.net répondent 200 : boot1_42.20 (8 388 608
octets) et image-fbx7hd_bank1_1.5.26 (137 306 112 octets). Aucun identifiant de
client, MAC de tiers ou manifeste individuel n'a été envoyé au service.

Le téléchargement complet du système 1.5.26 a échoué par manque d'espace. Le
fichier incomplet créé par ce travail a été vérifié puis supprimé. Il n'a pas
été analysé comme une image complète, ni envoyé au Player. La suite utilise
seulement deux réponses HTTP Range 206 : en-tête de 4 Kio et premier échantillon
rootfs de 64 Kio, avec vérification des plages et longueurs.

L'interprétation candidate du format issue du parseur public donne :

| Région | Offset | Octets | Type brut | Flags bruts |
| --- | ---: | ---: | ---: | ---: |
| kernel | 4096 | 5965080 | 0 | 5 |
| qcom-dtbs | 5971968 | 56952 | 3 | 5 |
| rootfs | 6029312 | 131276800 | 1 | 1 |

SHA-256 en-tête : `7049b94dd699fcc3168a304a1499950876b860090d14325a052f31be9c459074`.
SHA-256 échantillon rootfs : `6e3d281015d0ab67bd2357ab22dabf030f7baa9941ad68782cd68534d319a370`.
Entropie mesurée : 7,9974 bits/octet. Cela est compatible avec un contenu chiffré
ou compressé ; ce seul échantillon ne démontre ni l'algorithme ni le chiffrement
de tout le système. Aucun code natif App/installateur ni script de boot n'est
récupéré par cette lecture. Le nom/version du fichier HTTP ne constitue pas une
attestation cryptographique de son identité avec le firmware installé.

Ces preuves remplacent le manque de chemin public identifié lors de la passe
précédente ; elles ne résolvent pas l'accès au code natif utile.

## Tests directs d'ouverture de notre paquet

Paquet minimal fabriqué par nous : manifeste fr.trano.localinstallprobe, main.qml
avec un écran de diagnostic, aucun réseau, aucune écriture ni service embarqué.
Le lanceur temporaire vérifie Freebox v7, ne sert qu'au Player 192.168.0.30, et
appelle App.urlOpen sur une URL HTTP privée contenant une archive .fbxqml,
Content-Type application/octet-stream. Il ferme le serveur et relance le relais
permanent en sortie. Aucun paquet tiers n'est lancé.

L'utilisateur observe le menu : Webapp dev runtime, Navigateur web,
Mes téléchargements. Le premier choix affiche « Désolé, cette application n'est
pas disponible. Veuillez réessayer ultérieurement ». Aucun GET du paquet n'est
observé pour cet essai. Cela ne prouve pas l'impossibilité de toute installation.

L'exemple officiel qmlapps_examples/samples/deeplink_launcher/main.qml utilise
application/vnd.freebox.app-dev avec des URL de pages web. Le choix Webapp dev
runtime ne prouve donc pas qu'un installateur .fbxqml a été trouvé. Un test HTML
avec ce type exact a été exécuté dans une fenêtre séparée de 180 secondes.
L'utilisateur a observé un écran noir, puis appuyé sur Retour. Aucun GET de
page.html ni callback JavaScript n'a été observé. Le fichier HTML avait une
couleur de fond CSS invalide dans le diagnostic ; cela aurait limité la lecture
du texte blanc si la page avait chargé, mais aucun chargement HTTP n'est ici
établi. Cet essai ne prouve ni fonctionnement du runtime ni cause de l'échec.
L'app reste lancée par le SDK au départ ; il ne s'agit pas d'une installation.

Pour Mes téléchargements, l'utilisateur observe un écran de chargement durable,
sans écran d'installation. La photo du menu précise « Télécharger », non
« Installer ». Aucun GET de atlas-test.fbxqml ne parvient au serveur pendant
la fenêtre complète de 180 secondes. Les captures et le retour utilisateur ne
prouvent donc ni téléchargement du paquet ni installation.

Sources visuelles fournies par l'utilisateur : erreur WebApp et chargement
Mes téléchargements dans les deux photos 87019E62-D202-4F1F-AE88-F0E20023224B ;
menu Choix de l'application dans la photo 81D56D1E-6F11-4632-9234-CB8802BC1482.
Ces photos privées ne sont pas copiées dans Git.

Un autre résultat de recherche, Re-OpenFreebox/revolution-v6, est vérifié sur
[son dépôt primaire](https://github.com/Re-OpenFreebox/revolution-v6) : seulement
README et licence, statut early stages. Il ne livre pas un installateur Devialet.
Ne pas reprendre comme acquis les descriptions plus ambitieuses de tiers.

La recherche reste bornée aux sources et artefacts publics cités et aux essais
explicitement décrits.
Une confirmation physique, un point de lancement retrouvé après reboot et un
relancement effectif seront nécessaires avant d'affirmer une installation
persistante. Le démarrage automatique exigera une preuve supplémentaire.

## Résultat et suite utile

Aucune installation persistante sans FreeStore n'a été établie par ces essais.
Les deux choix testés et le format officiel WebApp n'ont pas chargé notre
contenu. On ne peut pas déduire une impossibilité générale de ces résultats.
La méthode alternative évoquée par l'auteur de ReDeFin reste une information
externe manquante. La question précise à lui poser serait : cette méthode
fonctionne-t-elle sans abonnement et sans PC une fois l'app lancée, et laisse-t-elle
un raccourci utilisable après un reboot, ou utilise-t-elle debug_qml_app ?
Aucun message externe n'a été envoyé et aucune réponse de l'auteur n'est supposée.

Les scripts temporaires et les petits paquets de diagnostic restent dans .local
comme preuves reproductibles de la recherche ; les archives tierces et les
échantillons firmware y sont conservés hors Git. Le téléchargement firmware
incomplet a été supprimé. Le worktree reste nécessaire à cette recherche non
intégrée ; il n'est pas supprimé. Les photos ne sont pas publiées.

## Vérification et remise en état

Les serveurs temporaires ont terminé et fermé leurs ports 3013/3016. Le premier
relancement accepté par le SDK n'a pas produit d'observation : lecteur 503. Un
retour à l'accueil puis le redémarrage du seul conteneur trano-lan-gateway ont
été nécessaires. Le lancement immédiatement après ce redémarrage n'a pas été
confirmé ; après vérification du manifeste public HTTP 200, le lancement suivant
a rétabli un lecteur HTTP 200 : Freebox v7, reachable=true, controlEnabled=false,
observation âgée de 1,6 seconde. La production Trano n'a pas été redémarrée.

Vérifications : syntaxe Python des deux scripts temporaires, liens locaux des
trois docs modifiées et git diff --check. Aucun code de production n'est modifié
par cette passe ; la suite complète de tests applicatifs n'est pas relancée.
L'installation persistante et l'autostart restent non résolus.

## Suite : le navigateur classique fonctionne

La [recherche sur les raccourcis et widgets](2026-10-22-devialet-raccourcis-widgets.md)
établit ensuite que App.urlOpen avec text/html ouvre le navigateur, dont le
JavaScript, les touches et les signets fonctionnent. Les échecs WebApp DEV Runtime
et Mes téléchargements décrits ici ne doivent donc pas être généralisés à tous
les moteurs. Aucun accès au signet après reboot sans lancement SDK n'est établi.
