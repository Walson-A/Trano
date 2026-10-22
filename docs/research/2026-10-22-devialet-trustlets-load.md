# Devialet : chargement de fbxboot et fbxta

## Résultat

REA/Ghidra a retrouvé le chemin de chargement et le traitement UIE dans les
composants natifs du bootchain officiel. Le chargeur lit les deux images,
appelle le moniteur sécurisé et reçoit un identifiant. Le code TrustZone
retrouvé lit une clé de départ hors des segments du fichier, déballe deux
niveaux de clés et traite les segments sélectionnés avec un IV propre à chaque
segment. Cela décrit du code statique, pas une capture de son exécution sur le
Player 1.5.26.

Aucune clé réelle, aucun code déchiffré de fbxboot/fbxta et aucun fichier du
système installé n'ont été récupérés. L'autostart reste non résolu. Le code
du chargeur sécurisé analysé ici ne doit pas être confondu avec le code des
deux applications protégées qu'il charge.

## Cibles et analyse

Les fichiers viennent de boot1_42.20, déjà acquis dans la
[passe native précédente](2026-10-22-devialet-native-boot.md). La table GPT
à CRC valides identifie fbxboot et fbxta aux offsets 0x619000 et 0x629000.
Leurs métadonnées correspondent à UIE ; leurs segments ne sont pas déchiffrés.

Deux cibles différentes ont été analysées avec REA 6.4.0 / Ghidra 12.1.4 sous
Linux, sans réseau ni exécution des images :

- SNAP : copie d'analyse ARM64 du composant à 0x523000, SHA-256
  94ded3d4eced644897ae50ab8b3fbe2e3858de20e7bed9df4ca1f655ee2a7663.
  Seul e_machine est corrigé dans cette copie, comme documenté précédemment.
  Le snapshot existant a été réimporté.
- TrustZone : ELF original à 0x29c000, SHA-256
  390a2b75035312eb70c074819872d0ee28848f7f4110575e75f7d67fed1b98c7.
  Son en-tête ARM64 n'a pas été modifié. Ses adresses d'analyse appartiennent
  aux espaces décrits par l'ELF, sans attestation de la cartographie du Player.

Les imports, branches, appels et instructions sont observés par Ghidra. Les
noms FUN_* sont produits par l'analyse ; ce ne sont pas les symboles originaux.
Certains types/retours du pseudocode sont imparfaits : les fonctions UIE
présentées comme void alors qu'elles utilisent un résultat en sont un exemple.
Les appels indirects non résolus et les valeurs de mémoire non fournies restent
des limites.

## Du chargeur au moniteur sécurisé

| Procédure SNAP | Observation | Evidence REA |
| --- | --- | --- |
| 0x9fa08594 | Crée le contexte, charge fbxboot puis fbxta, garde leurs identifiants. | ev_f0f777059f778ef4c43322fbe8d418b91d1a64b0c8f7ff5da86115aa8bf2ad20 |
| 0x9fa08660 | Ouvre ufsboot:%s, lit l'image, transmet son tampon avec la commande 0x72000101, récupère app_id et libère le tampon. | ev_75d2cb69e1d864813bfc5868b2119a05ff58b904d4b67c36d76689abba786387 |
| 0x9fa01120 | Prépare les registres et récupère les résultats du transport sécurisé. | ev_3016c21866be64224b5e46ad84bc385e9873b4878ecfd26808547bb08b6333c4 |
| 0x9fa15ba8 | Contient l'instruction smc 0x0 à 0x9fa15bd0. | ev_30af15ecd972c73cf7490c4f6d312199a0d105931672725241e683a54a884f67 |

La chaîne 0x9fa0124c → 0x9fa01120 → 0x9fa15ba8 complète le transport déjà
retrouvé. Aucun déchiffrement logiciel local n'est visible dans la fonction
SNAP de chargement ; elle confie le traitement à l'appel sécurisé.

La fonction 0x9fa0a52c traite par ailleurs ufs3:fbxserial et utilise fbxta
pour ces données. Cela ne fournit ni accès général aux fichiers ni interface
de lecture du code de l'application sécurisée.

## Traitement UIE retrouvé dans TrustZone

| Procédure | Observation | Evidence REA |
| --- | --- | --- |
| 0x1c0839e4 | Valide magic 0x514d5349, nombre de sections et versions, puis initialise le traitement des clés UIE. | ev_7f749f10764745658a5ab5a81b82c3d947d6abb512e6ac91769ce9bc95d409f1 |
| 0x1c0275c0 | Analyse l'ELF et les métadonnées, obtient 16 octets de clé, construit le contexte UIE et poursuit l'authentification. | ev_9fb53f7a24ba192aee0daf4943f788cf88cfd7868562b9315ce3775e68079628 |
| 0x1c083bbc | Deux appels successifs de déballage de clés, avec une clé intermédiaire de 16 octets ensuite écrasée. | ev_37db0e14db83f0515ba0693707fb1c26a63122e2bffd752a2017ba1fac3a9335 |
| 0x1c08498c | Selon une configuration lue, copie quatre mots depuis 0x786150 ou 0x786160. | ev_1bead503d6e7f02936cfcfdc90d4f45f89c56fd21f63c8015b12c43e03cfa4f6 |
| 0x1c083f60 | Sélectionne les sections protégeant un segment d'après les bitmaps et appelle leur transformation. | ev_8701c7e0eabe1be4949cdc27b6ffc485a1005f9bb8564bf74efdca45acee8415 |
| 0x1c084104 | Dérive un IV à partir de la base et du numéro de segment ; transmet le même tampon en entrée et sortie. | ev_d1a063e0110ea37589cba296fae80fd25baa37b07d7e6861bad32607dd664ff6 |
| 0x1c0845ac | Configure la primitive de segments avec le mode numérique 6, la clé et l'IV, puis traite les buffers. | ev_dc80a5cae371e915672b97e43317c62b6922af28eb0d7865fd1d110f59443b60 |

La routine de clés est appelée avec le sélecteur 1 par 0x1c0839cc. Les deux
plages qu'elle lit ne sont pas couvertes par les octets des segments de l'ELF.
Le DTS MSM8998 publié par Free, qcom/msm8998-sde.dtsi, nomme qfprom_physical la
plage 0x780000 de longueur 0x621c, qui les contient. L'attribution à une clé
matérielle QFPROM est donc étayée par le code et cette référence de plateforme,
sans lecture des registres réels ni vérification des conditions actives au boot.
Ce constat ne démontre pas si la clé est unique par appareil ou partagée.

Le déballage utilise une primitive configurée en mode numérique 4 et des clés
de 16 octets. Le traitement de segments utilise le mode 6. Ces valeurs sont
cohérentes avec les modes CCM et CTS de la
[référence SecTools examinée](https://github.com/David112x/android-firmware-qti-sdm660/blob/master/common/sectools/sectools/features/isc/encryption_service/unified/encryption_params_section_hdr.py) ; les
noms d'algorithmes restent une interprétation des constantes et de l'API, pas
un déchiffrement validé sur les images cibles. Les faits robustes sont les
tailles, les appels successifs et la provenance mémoire de la clé de départ.

La transformation des segments peut être effectuée en place dans un tampon.
Sa provenance complète et ses permissions mémoire au moment précis de cette
opération n'ont pas été retracées jusqu'au bout. Il serait donc excessif de
conclure que toute copie plaintext est toujours exclusivement en RAM sécurisée,
ou qu'elle reste disponible dans un tampon Linux lisible après le chargement.
La routine Macchiato 0x1c077534, aussi trouvée par un message de déchiffrement,
n'est pas présentée comme le déchiffreur UIE de fbxboot/fbxta.

## Lecture après chargement : source et essai réel

Le [patch Linux officiel Delta 1.5.3](https://floss.freebox.fr/freebox_player_delta/1.5.3/linux/linux-4.4.302-fbx.patch)
documente un autre chemin de chargement,
depuis Linux : qseecom importe le tampon ION, appelle QSEOS_APP_START_COMMAND,
garde nom/id/refcount et libère le handle ION. Il assemble aussi des entrées
app.mdt/app.bNN via request_firmware. La déclaration secapp-region est séparée.
Les opérations de fichier de /dev/qseecom exposent open/release/ioctl, sans
read ou mmap dans ce pilote publié. Cela ne prouve pas l'absence de toute autre
interface sur le firmware 1.5.26 et ne remplace pas le chemin SNAP observé.

Une interface de diagnostic apparaît dans le même patch : tzdbg sous debugfs.
La sonde a ciblé uniquement les snapshots boot et general, sans lire le journal
qsee_log qui peut attendre de nouveaux messages. Résultat sur le Player :

- contrôle HTTP de notre propre source : statut 200, 1 233 caractères ;
- file:///sys/kernel/debug/tzdbg/boot : statut 0, longueur 0 ;
- file:///sys/kernel/debug/tzdbg/general : statut 0, longueur 0.

Ces résultats ne distinguent pas montage absent, permissions, espace de noms
ou restriction du backend file. Les quatre rapports reçus sont inspectés par
REA hors ligne : ev_c96d555fbab1089504f6f3f32279746075c8c8e097af973657ec516f9d1f0a5c.
Le HAR contient les POST de diagnostic, pas une capture des lectures internes.
L'attribution runtime de REA reste inconnue ; le lancement et la restriction
IP du récepteur établissent le contexte de notre essai contrôlé.

Un premier lancement a repris l'ancienne sonde à cause d'un chemin mal remplacé.
Il ne compte pas comme test TrustZone. Le chemin a été corrigé avant les quatre
rapports ci-dessus. Cette erreur a remplacé le HAR brut de la passe antérieure
par un nouvel essai équivalent ; son Evidence REA originale et ses champs sont
toujours conservés. capture-lineage.json documente les empreintes et les faits
originaux reconstruits, sans prétendre avoir restauré ses octets initiaux.

## Conservation, vérifications et limite restante

Les preuves et recettes sont sous .local/load-trustlets-pass-20261022/.
L'archive retained-native-evidence.tar.gz contient 93 fichiers réguliers, dont
les réponses, trois exports et les snapshots. SHA-256 :
3b2e3dd6204d6302918059f3466cfc0999f8f5ae9292c94405ce8afef6d2f53d.
Chaque membre a été vérifié par rapport au manifeste et à son empreinte.
Les exports ont des Evidence qui se recouvrent ; leurs comptes ne s'additionnent
pas comme des tests indépendants. Les sources GPL et la dérivation QFPROM sont
également conservées, avec leurs limites de version.

Les deux sessions REA sont fermées. L'image et le dossier serveur temporaires
ont été supprimés après contrôle de leur identité et de l'archive copiée. Le
serveur HTTP de diagnostic est fermé. Le relais permanent a été relancé et
vérifié : lecteur HTTP 200, Devialet accessible, controlEnabled=false.
Le worktree et les preuves locales restent nécessaires pour poursuivre.

La récupération effective du code ou du rootfs réclame encore une interface
autorisée de lecture du tampon pertinent, ou les éléments de décodage réels.
Ni le SDK QML testé ni le pilote source examiné ne fournissent cette lecture
dans le périmètre établi. Aucun dump de mémoire sécurisé, flash, root ou
changement de sécurité du Player n'a été effectué.
