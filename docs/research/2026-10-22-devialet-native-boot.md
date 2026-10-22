# Devialet : analyse native du chargeur avec REA

## Résultat et portée

Le chargeur natif a été décompilé avec REA 6.4.0 et Ghidra 12.1.4 sous Linux.
Le traitement du noyau et du DTB, les demandes d'authentification à une TA et
la transmission de l'initrd au noyau sont observés dans le code. Aucun mécanisme
d'installation de Tailscale, d'enregistrement d'application ou d'autostart du
relais n'a été trouvé dans le périmètre analysé. Ce chargeur n'est pas le
lanceur d'applications du Player : ces observations ne prouvent pas une
impossibilité globale du firmware.

Le Player n'a reçu ni firmware modifié ni commande de flash ou de recovery.
L'analyse est statique, sur des fichiers téléchargés séparément. Le relais
permanent est observé en ligne à la fin : lecteur HTTP 200, Devialet accessible,
controlEnabled=false. Cela vérifie sa disponibilité actuelle, pas sa survie à
un redémarrage.

## Acquisition officielle et limites de provenance

Les trois fichiers ont été récupérés intégralement depuis l'hôte de firmware
Free, sans identifiant client. Les SHA-256 suivants sont calculés localement :

| Artefact | Octets | SHA-256 |
| --- | ---: | --- |
| [boot1_42.20](http://fbx-firmware.proxad.net/firmwares/fbx7hd/files/boot1/boot1_42.20) | 8 388 608 | f238c63931e01d385d8fc42b60e99a9c3fc0c4ca52f51984af4526b51ad5f81f |
| [boot0_42.20+bank0_1.2](http://fbx-firmware.proxad.net/firmwares/fbx7hd/files/boot0+bank0/boot0_42.20+bank0_1.2) | 28 819 456 | 8db32a298660d13e39a78bcb52f27d6f60b6cb01ceaf2ed525f0ca0487512412 |
| [image-fbx7hd_bank1_1.5.26](http://fbx-firmware.proxad.net/firmwares/fbx7hd/files/bank1/image-fbx7hd_bank1_1.5.26) | 137 306 112 | e5c27042f33f215cebdd390ab8827e456144f52b3f0ecb9508aa1daead253186 |

Le téléchargement HTTP et le nom 1.5.26 ne constituent pas une attestation
cryptographique d'identité avec les octets installés sur le Player. Les
signatures des fichiers n'ont pas été vérifiées. Contrairement à la passe
précédente, l'image bank1 est désormais complète ; son acquisition ne signifie
pas que son système de fichiers a été déchiffré ou extrait.

Les candidats ELF de boot1 ont été découpés par signatures ELF, validation des
en-têtes ARM little-endian et bornes des segments/sections. Ce n'est pas un
décodage de la table BOOTCHN. Treize candidats sont conservés dans l'inventaire.

## Modèle d'analyse et reproductibilité

Le candidat à l'offset 0x523000 de boot1, long de 120 280 octets, contient le
chargeur SNAP. SHA-256 original :
092c624d82e2e28be1bdb7eac0d2ac4a0acc7d07a35b8c0543075687be9c0fca.
Son en-tête est ELF64 mais annonce EM_ARM (40), alors que le code à son entrée
0x9fa00000 commence par une instruction AArch64 B et que la décompilation ARM64
produit les flux cohérents détaillés ci-dessous.

L'import original sous Linux a échoué : « No load spec found ». Une copie
d'analyse change uniquement les deux octets e_machine à l'offset 18, de 2800 à
b700 (EM_AARCH64, 183). Son SHA-256 est
94ded3d4eced644897ae50ab8b3fbe2e3858de20e7bed9df4ca1f655ee2a7663.
Cette copie sert exclusivement à la décompilation ; elle n'a été ni exécutée
ni envoyée au Player. L'original reste intact. Les Evidence ci-dessous portent
sur ce modèle dérivé, et non sur un ELF original annoncé correctement ARM64.

Ghidra importe le segment de code 0x9fa00000–0x9fa1a5d8 : 378 procédures et
431 chaînes. Le segment PT_NULL à 0x9fa1b000 n'est pas chargé comme mémoire de
données ; les valeurs initiales des globals ne sont donc pas toutes disponibles.
Les appels indirects non résolus et les choix du décompilateur restent des
limites. Le provider Windows disponible refusait les ELF ; le passage au
provider Linux a permis la vraie décompilation native.

L'environnement temporaire utilise un conteneur sans réseau, sans privilèges,
sans port ni socket Docker monté, avec entrées en lecture seule et sorties
d'analyse séparées. Ghidra vient de sa
[distribution officielle 12.1.4](https://github.com/NationalSecurityAgency/ghidra/releases/tag/Ghidra_12.1.4_build),
dont le SHA-256 téléchargé est
ddac49f903da9d5bac833e5cc79395098b9c33cfd3279be5f31bd00387d2d4db.
Les binaires du firmware n'ont pas été exécutés comme programmes Linux.

## Flux observés dans le chargeur

### Chargement de l'image : 0x9fa09aa0

La procédure contrôle le magic 0x3658382b, la version 2, les bornes, le nombre
d'entrées et le CRC de l'en-tête. Elle recherche séparément le noyau (type 0),
le DTB (type 3) et le rootfs (type 1). Hors du mode de test, elle exige les
indicateurs de signature du noyau et du DTB. Le mode de test dans ce code ne
prouve pas qu'un utilisateur puisse y accéder sur son appareil.

Pour les composants marqués signés, elle appelle 0x9fa0acdc avant copie ou
décompression. Elle prépare le DTB avec notamment fbx,serialinfo, fbx,boot-mode,
fbx,bootchain-bank et fbx,bootchain-version. Le rootfs est transmis par les
propriétés linux,initrd-start et linux,initrd-end, sans décodage du système de
fichiers dans cette procédure. Le transfert final va vers le noyau.

Evidence : ev_90786884715f59c45e5f271040245ca4224dea121ff749860057563d2d9bf2c5.

### Enveloppe SKRY : 0x9fa0acdc

Cette procédure copie 0x154 octets d'en-tête, contrôle le magic SKRY, la version
3, l'offset et la taille du contenu, une taille maximale de 0x1800000 et un
numéro de clé inférieur à 4. Elle confie ensuite les buffers à 0x9fa089a0.
Ces contrôles ne suffisent pas à identifier l'algorithme cryptographique.

Evidence : ev_80d2eb5934a2009a5074f1bcdba9ec8813c3a06837bdb22175a1455fcc729fe4.

### Provisionnement et authentification : 0x9fa089a0

Au premier appel, la procédure ouvre ufs3:fbxboot_provision et en transmet un
bloc de 0xa8 octets avec une commande 2. Elle contrôle le retour de la TA,
avec le message « TA declined fbxboot blob ». Pour traiter le contenu SKRY,
elle prépare une commande 1 avec les buffers d'entrée/sortie, le numéro de
clé et plusieurs pointeurs dans l'en-tête. Le message d'échec indique
« unable to authenticate data ».

La procédure 0x9fa088c0 construit le transport avec les constantes 0x70000001
et 0x885, contrôle l'alignement des buffers sur 0x800 octets et appelle
0x9fa0124c. Cette dernière effectue des reprises lorsque 0x9fa01120 renvoie
0xfffffff0. Le corps de 0x9fa01120 n'a pas été décompilé pendant cette passe :
la chaîne complète jusqu'à une instruction de moniteur sécurisé n'est donc pas
une preuve acquise ici. Les messages et échanges avec la TA sont observés ;
son implémentation et ses clés ne sont pas récupérées.

Evidence : ev_a294ba97bdf2a20ddc760d2ebee0e6d8b5cab5d18525067ca86c5df2b5c352a8,
ev_aecaea9f0c4895d0397db66a4baf629fae7172e4cfde2ddbad2c237aada3c81f,
ev_be8d3ec5253266775f15378b504584c47e8f65c347fe4481686881aa58844211.

## Ce que cela ne résout pas

L'inspection du bank0 retrouve un imagetag à l'offset 0x800000 et les entrées
noyau, DTB et rootfs. Le début du rootfs présente une forte entropie, environ
7,997 bits/octet sur 64 Kio, sans magic de système de fichiers reconnu dans
l'échantillon. Cette mesure seule ne démontre ni AES ni même un chiffrement.
Les indicateurs d'entrée observés ne sont pas des indicateurs de chiffrement.

Nous n'avons pas extrait le système de fichiers 1.5.26 ni retrouvé son init,
son lanceur d'applications ou son mécanisme d'enregistrement persistant.
L'installation de Tailscale nécessiterait encore un moyen d'exécuter et de
conserver un programme natif, puis de le relancer au boot. Les échanges du
chargeur avec une TA ne fournissent pas ce moyen. Modifier une image au hasard
ne découle pas de ces observations.

La piste exploitable suivante exige donc un artefact userland lisible ou une
interface persistante du runtime démontrée. Un signet de navigateur et un
lancement SDK restent insuffisants, comme documenté dans
[raccourcis et widgets](2026-10-22-devialet-raccourcis-widgets.md).

## Conservation des preuves

Les fichiers, dérivations, inventaires et réponses REA restent hors Git dans
.local/research/native-20261022/ du worktree feat/local-network. L'export contient
10 Evidence ; « unknowns=0 » décrit cet export, pas une connaissance complète
du firmware. Le snapshot sauvegarde l'analyse pour une reprise sans dépendre
du conteneur temporaire.

| Preuve | SHA-256 |
| --- | --- |
| remote-evidence/native-evidence-bundle.json | 1142a6f04ad729fa5873852e59ce4b0f9dfa3b7069f840505b55263b115c87c0 |
| remote-evidence/snapl-analysis-snapshot.json | 85228e10c18b61d44a3e289c91e43660fc9606e76049b0037c297e4d2f72c799 |

Les empreintes des deux exports copiés ont été comparées aux fichiers serveur.
Le conteneur d'analyse a été fermé après export ; son image dédiée et son
répertoire serveur ont été supprimés après vérification des chemins et de
l'identité de l'image. Les images de base Docker que le moteur n'a pas accepté
de retirer sans forcer sont conservées ; aucun nettoyage global n'a été lancé.
Le worktree et ses preuves sont conservés pour poursuivre cette recherche
encore non résolue.

## Suite : tentative de récupération du userland

À la demande de Walson, une passe distincte a visé les fichiers qui démarrent
les services et les applications. Deux voies ont été vérifiées : extraction
des zones rootfs officielles avec REA, et lecture des sources GPL publiées
par Free. Aucun fichier du système installé n'a été récupéré par ces voies.

### Extraction réelle avec REA et Unblob

Les entrées rootfs ont été découpées sans transformation depuis les images
précédentes. Les offsets restent ceux des images complètes, pas des adresses
mémoire du Player :

| Entrée | Offset source | Longueur | SHA-256 de l'entrée |
| --- | ---: | ---: | --- |
| bank1 1.5.26 | 6 029 312 | 131 276 800 | d7f0f135f417a1099f01a39e03188d2f08a14184f18e68b853b0b97d4a5642ef |
| bank0 1.2, dans boot0+bank0 | 12 054 528 | 16 764 928 | b486db1d3913bb4d20b1d904352b44494a6bdd1ee07fc5c64979d8f49f026822 |

L'image bank1 complète dépasse la limite d'entrée de 128 Mio de cette version
de REA. Le découpage explicite de son entrée rootfs, inférieur à cette limite,
préserve ses octets et son origine dans derivations.json.

REA 6.4.0 a réellement appelé Unblob 26.6.4 sous Linux, avec une profondeur de
3, une limite de 200 Mio de sortie et 1 000 entrées. Les deux appels ont terminé
sans erreur ni diagnostic : zéro fichier, zéro chunk reconnu, zéro octet
publié. Le champ coverage=complete signifie ici que la passe configurée a
terminé ; il ne signifie pas que le firmware a été reconstruit ou décodé.
Les formats non pris en charge et les règles de filtrage restent des limites.
Le sandbox Unblob était actif ; aucun code du firmware n'a été exécuté.

Evidence bank0 :
ev_d6c37b62ba706cfe601083b23baa89f5e0baa2e9663b1d18634f46fa747666a4.
Evidence bank1 :
ev_526d25d80d16aa235dac796e0072c74d0666983f0cb642b1221cffcfcda4f079.

Une recherche complémentaire sur l'intégralité des deux entrées n'a trouvé
aucun magic ELF, SquashFS, cpio newc/crc, XZ, Zstandard, UBI ou UBIFS de la liste
testée. Les huit candidats gzip (sept dans bank1, un dans bank0) échouent tous
à la validation : six ont des bits réservés invalides, deux un CRC d'en-tête
incorrect. Ces recherches sont des diagnostics bornés, pas une preuve que les
zones sont chiffrées ni une identification de leur algorithme.

### Sources officielles : indices sur init, sans scripts de lancement

L'[index GPL Player Delta](https://floss.freebox.fr/freebox_player_delta/)
consulté ne propose pas de paquet 1.5.26 ; la dernière version listée est
[1.5.3](https://floss.freebox.fr/freebox_player_delta/1.5.3/). Ces sources sont
une référence historique, pas une observation du firmware installé.

Le [patch Linux 4.4.302 officiel](https://floss.freebox.fr/freebox_player_delta/1.5.3/linux/linux-4.4.302-fbx.patch)
est conservé intégralement : 36 714 100 octets, SHA-256
d8ea46a441f51020cacd347906643b7902871b69dc6bcc65614ed2d2f01ad27c.
Dans init/initramfs.c, il ajoute un appel conditionnel à fbx_decrypt_initrd
avant écriture de /initrd.image. Le Makefile mentionne fbx_decrypt_initrd.o et
rc4.o, mais leurs implémentations ne figurent pas dans ce patch.

La configuration livrée dans le même patch désactive CONFIG_FBX_DECRYPT_INITRD,
laisse CONFIG_INITRAMFS_SOURCE vide et impose une ligne de boot NFS sur
eth0.41. Cela suggère une configuration de développement. On ne peut donc
déduire de ces noms ni RC4 actif sur le Player ni le schéma du rootfs 1.5.26.
Le hook observé est dans init/initramfs.c, contrairement au chemin init/main.c
mentionné dans certaines notes communautaires.

Deux patches BusyBox 1.21.0 publiés par Free concernent
[la transmission de POWER_ACTION aux scripts d'arrêt](https://floss.freebox.fr/freebox_player_delta/1.5.3/busybox/13.pass_power_action_to_init_handler.patch)
et [ASKFIRST sur les terminaux](https://floss.freebox.fr/freebox_player_delta/1.5.3/busybox/22.init_ask_first_only_tty.patch).
Ils établissent des modifications du code init distribué dans les sources,
sans démontrer que BusyBox est le PID 1 du firmware 1.5.26. L'index et les
patches consultés ne fournissent ni les scripts de démarrage du Player ni le
lanceur propriétaire d'applications. Une analyse REA de ces sources disponibles
n'ajouterait pas de preuve sur les binaires réellement installés.

### État et conservation

La troisième étape du boot reste non résolue : nous n'avons ni /etc/inittab,
ni scripts init.d, ni binaire du lanceur provenant du Player. Les lectures QML
de métadonnées déjà tentées restent infructueuses ; elles n'ont pas été répétées
avec les mêmes paramètres. Cette passe n'a pas modifié le Player.

Pour poursuivre, il manque une interface de lecture du système installé ou une
image userland décodable avec sa transformation documentée. Une nouvelle
extraction identique avec les mêmes outils ne résoudrait pas ce manque.
Il n'y a toujours aucun autostart installé ni preuve d'impossibilité absolue.

Les Evidence sont conservées sous
.local/research/native-20261022/userland-inputs/rea-evidence/ ; l'export
rootfs-evidence-bundle.json compte deux Evidence et son SHA-256 est
9f19582f1dfd83d80383314d3cae530045e54f34fc4a81b9d1093a304f1ddf98.
Les dérivations, diagnostics gzip et recette d'environnement sont conservés à
côté. Les index, patches et provenances GPL sont sous
.local/research/native-userland-sources-20261022/. Les copies rootfs restent
disponibles pour une reprise avec une méthode différente.

Le conteneur d'extraction, son image dédiée et son répertoire serveur ont été
supprimés après comparaison de l'export local et distant. Le worktree et les
preuves locales sont conservés pour la recherche en cours. Le relais permanent
a été vérifié après extraction : HTTP 200, Devialet accessible,
controlEnabled=false. Aucun redémarrage du Player n'a été effectué.

## Suite : accès en lecture et identification des composants protégés

Une nouvelle sonde a levé une ambiguïté des essais QML précédents : ils
masquaient la cause de l'échec de création de FolderListModel. Un composant
minimal sans propriétés optionnelles a été essayé en versions 2.0 et 2.1.
Dans les deux cas le runtime répond explicitement que le module
Qt.labs.folderlistmodel n'est pas installé. Ce résultat concerne ce runtime,
pas l'ensemble des possibilités d'accès du système.

Le contrôle positif XHR lit notre propre source HTTP : statut 200, 2 847
caractères. Les lectures fixes file:///etc/inittab et
file:///proc/self/mountinfo retournent statut 0 et longueur 0. Cela ne permet
pas de distinguer interdiction, absence du fichier, espace de noms isolé ou
backend non disponible. Le contrôle HTTP n'est pas un contrôle positif du
backend file. Aucun contenu système n'a été récupéré.

Six rapports POST réellement reçus par le serveur de diagnostic ont été
conservés dans runtime.har, puis inspectés hors ligne avec REA :
ev_065cba6c15d61483bd59f70c83be29e93c77a03538ef498df268a4601197c3ff.
Le HAR conserve uniquement ces rapports, pas les transactions file internes
au Player. Les URL ne sont pas rejouées ; l'attribution d'exécution par REA
reste inconnue. L'identité du test vient de notre lancement SDK et du serveur
récepteur, limité à l'IP du Player. Aucun changement persistant n'a été demandé.

### Table de partitions de boot1 et métadonnées UIE

Une analyse structurée complémentaire du fichier boot1_42.20 retrouve une
table GPT à l'offset 4 096 : révision 1, en-tête de 92 octets, 12 entrées de
128 octets. Les CRC de l'en-tête et de la table sont valides. Les entrées à
l'offset 8 192 utilisent des secteurs de 4 096 octets. Cette validation ajoute
des noms établis aux candidats ELF auparavant découpés par simple signature :

| Partition GPT | Offset dans boot1 | Candidat ELF déjà conservé |
| --- | ---: | --- |
| fbxboot | 0x619000 | component_00619000_arm64.elf |
| fbxta | 0x629000 | component_00629000_arm64.elf |

Ce sont les noms référencés par le chargeur ; cela identifie les artefacts
présents dans cette image, sans prouver leurs octets sur le Player installé.
Les CRC établissent la cohérence de la table, pas sa signature ou son origine
cryptographique. Ce parsing est un diagnostic Python indépendant, pas une
décompilation REA supplémentaire.

Dans chacun des deux ELF, l'offset 10 760 contient un en-tête 0x514d5349 suivi
à +16 d'un en-tête 0x51554945. Leurs champs correspondent aux structures
Qualcomm UIE décrites dans le
[code SecTools publié dans un miroir](https://github.com/David112x/android-firmware-qti-sdm660/blob/master/common/sectools/sectools/features/isc/encryption_service/unified/encryption_params_header.py)
et son [en-tête de section](https://github.com/David112x/android-firmware-qti-sdm660/blob/master/common/sectools/sectools/features/isc/encryption_service/unified/encryption_params_section_hdr.py) :
une section, version 1.0, taille 192 octets, algorithme 1, mode 1, type de clé
racine 1 et identifiant 0. Les bornes, valeurs réservées et magics sont contrôlés.
Les sources du miroir ont été lues, jamais exécutées ; leurs empreintes sont
conservées. Leur provenance et leur plateforme ne sont pas attestées comme
identiques au firmware Freebox.

La présence de ces paramètres et les segments exécutables à forte entropie
étayent l'identification de composants protégés au format UIE. Aucun segment
n'a été déchiffré, aucune clé récupérée, aucune authentification cryptographique
validée. Décompiler les octets opaques comme des instructions AArch64 ne
donnerait pas leur code réel. Cette protection est distincte de SKRY et du
rootfs brut : elle ne démontre pas leur propre algorithme de chiffrement.

Une inspection des payloads SKRY 1.5.26 confirme par ailleurs leurs bornes à
l'offset +600, version 3 et numéro de clé 0, pour le noyau et le DTB. Retirer
simplement cet en-tête ne révèle pas un début gzip, XZ ou DTB standard ; ce
n'est pas une méthode de décodage obtenue.

### Recherche du déchiffreur dans d'autres sources officielles

Deux patches supplémentaires ont été acquis avec une limite de 64 Mo chacun :
[Delta 1.0.14, Linux 4.4.194](https://floss.freebox.fr/freebox_player_delta/1.0.14/linux/linux-4.4.194-fbx.patch)
et [Révolution 1.3.34.1, Linux 6.4](https://floss.freebox.fr/freebox_player/1.3.34.1/linux/linux-6.4-fbx.patch).
Ils référencent le déchiffreur mais ne contiennent pas son implémentation.
Leurs configurations publiées désactivent CONFIG_FBX_DECRYPT_INITRD ; aucune
clé utilisable n'a été obtenue. Le Kconfig Révolution propose RC4 ou ChaCha20,
sans établir lequel, le cas échéant, serait utilisé sur le Devialet 1.5.26.
Un droit gw_explorer des exemples SDK concerne le Freebox Server et ne fournit
pas de lecture du système local du Player.

### Résultat de cette passe

Les composants sécurisés exacts sont maintenant identifiés dans l'image et
leur enveloppe de protection est mieux caractérisée. Il manque encore un moyen
de lecture du système installé ou les éléments permettant de décoder les
composants requis. Ni les scripts de démarrage ni le lanceur d'applications
ne sont récupérés ; aucun autostart n'est installé.

Les preuves, sources et dérivations restent dans
.local/read-access-pass-20261022/. Le serveur de diagnostic a été fermé après
le test. Le relais permanent a été relancé et observé par le lecteur serveur :
HTTP 200, Devialet accessible, controlEnabled=false. Aucune ressource serveur
temporaire supplémentaire n'a été créée pour cette passe. Worktree et preuves
sont conservés pour la recherche non résolue.

La [passe suivante sur le chargement des trustlets](2026-10-22-devialet-trustlets-load.md)
trace avec REA l'appel SMC, le traitement UIE et l'origine de la clé dans le
code TrustZone. Elle distingue ces observations statiques de l'essai réel de
lecture du diagnostic local et de la récupération encore non réalisée du code.
