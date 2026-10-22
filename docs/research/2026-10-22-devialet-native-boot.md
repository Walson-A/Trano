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
