# Devialet : firmware et applications préchargées

## Question et résultat

Retrouver le composant qui enregistre et lance les applications, pour permettre
au relais Atlas de revenir après un reboot sans PC. La piste complémentaire est
de comprendre l'intégration d'une application préchargée comme Netflix.
Cette passe est statique : aucun lancement sur la TV, aucune modification du
firmware, aucun accès aux comptes, aucun serveur de test laissé en fonctionnement.

Le lanceur propriétaire n'est toujours pas récupéré. La consultation REA réutilise
une vraie décompilation antérieure du chargeur de démarrage ; elle ne constitue
pas une nouvelle décompilation du système des applications. L'inventaire brut
complémentaire des images confirme les limites ci-dessous. Aucun enregistrement
Atlas ni démarrage automatique n'a été installé.

## REA : reprise du flux de chargement existant

La vue REA `ev_facc12db07e57139bdcf5965a430510532b53de0b7a8b2229b12e8c8bdf7fe38`
reprend intégralement les 11 789 unités UTF-16 du pseudocode de `0x9fa09aa0`,
Evidence parent
`ev_90786884715f59c45e5f271040245ca4224dea121ff749860057563d2d9bf2c5`.
L'identité de la copie d'analyse et ses limites sont décrites dans
[l'analyse native](2026-10-22-devialet-native-boot.md).

Le code retrouve les entrées kernel, DTB et rootfs. Il traite les enveloppes du
noyau et du DTB avant leur éventuelle décompression, puis transmet les bornes du
rootfs au noyau par `linux,initrd-start/end`. Ce flux termine par le transfert au
noyau ; il ne décrit pas l'enregistrement d'une application utilisateur.
La vue porte sur du code statique, sans observation de son exécution actuelle.

Le provider Windows actuellement disponible ne permet pas l'analyse native ARM
ELF ni le scanner firmware Linux. Aucun nouvel import natif ne lui est présenté
comme réussi ; la vue conservée permet de reprendre l'analyse Linux précédente
sans réinstaller son environnement ni rejouer la même décompilation.

## Inventaire brut complémentaire des images conservées

Les SHA-256 des trois images complètes correspondent aux valeurs précédemment
publiées dans l'analyse native. Le script local en lecture seule
`.local/research/firmware-launcher-pass-20261023/inventory.py` produit
`inventory.json`. Il n'exécute aucun octet du firmware et ne modifie pas les images.

La taille déclarée de bank1 correspond exactement aux 137 306 112 octets du
fichier : aucun suffixe supplémentaire ne constitue un paquet d'application
facilement séparé après l'image. La table décrit toujours trois entrées :

| Entrée | Offset | Taille | Observation brute |
| --- | ---: | ---: | --- |
| kernel | 4 096 | 5 965 080 | SKRY version 3, offset contenu 600, taille contenu 5 964 480 |
| qcom-dtbs | 5 971 968 | 56 952 | SKRY version 3, offset contenu 600, taille contenu 56 352 |
| rootfs | 6 029 312 | 131 276 800 | Même empreinte que l'entrée déjà soumise à Unblob |

Les champs SKRY ci-dessus sont décodés en big-endian et restent dans les bornes
des partitions ; aucune signature n'est vérifiée. Aucun magic gzip, XZ, Zstd,
trame LZ4, ELF ou Image ARM64 de la liste testée n'est trouvé dans les entrées
kernel et DTB. Ce résultat ne prouve pas leur algorithme de transformation ni
l'absence d'un autre format ; il ne permet pas de les traiter comme un noyau
déjà extrait. Les sept candidats gzip du rootfs sont ceux déjà invalidés lors
de la passe précédente : aucune extraction identique n'est relancée.

Une recherche ASCII insensible à la casse sur les trois images complètes ne
trouve pas les littéraux `fbxqmlviewer`, `qfbxapp`, `netflix`, `/etc/inittab` ou
`/sbin/init`. Les trois résultats pour `applications` dans boot0/boot1 sont
`keyblob->teeParams.allApplications`, `KM_TAG_ALL_APPLICATIONS should not be
present during begin` et `pKM_TAG_ALL_APPLICATIONS`, pas un catalogue d'accueil.
L'absence de littéraux dans un contenu opaque ou compressé n'est pas une preuve
d'absence des fonctions recherchées.

## Ce qu'une application comme Netflix peut nous apprendre

Un administrateur Free explique le 24 mars 2025 que Disney+ possède une partie
dynamique mise à jour par Disney, comme Netflix :
[FS#40074](https://dev.freebox.fr/bugs/task/40074). Cette source renseigne leur
architecture générale ; elle ne fournit ni leur paquet Devialet, ni leur
déclaration dans l'accueil, ni une inscription de démarrage accessible à Atlas.
Extraire seulement l'interface dynamique ne suffirait donc pas à établir ce contrat.

Le [serveur DIAL de référence publié par Netflix](https://github.com/Netflix/dial-reference/blob/master/server/dial_server.c)
contient une liste d'applications et `DIAL_register_app`, une fonction C interne
qui leur associe des callbacks. Les requêtes de lancement consultent cette liste
et renvoient une erreur pour un nom inconnu ; ce code n'expose pas un installateur
HTTP d'applications arbitraires. Son
[README](https://github.com/Netflix/dial-reference#running-the-dial-server)
demande à la plateforme de lancer le serveur après initialisation du réseau.
Il dépend ainsi d'une intégration au démarrage plutôt que de la fournir à Atlas.
Ce code est une référence publique, pas une attestation de l'implémentation Free.

Aucun binaire, manifeste ou registre de lancement Netflix spécifique au Devialet
n'a été obtenu par ces recherches. Il manque toujours un artefact userland lisible
ou un contrat d'installation persistant vérifié. Les deux résultats à démontrer
restent distincts : un point de lancement manuel après reboot, puis une exécution
automatique du relais. Leur faisabilité n'est pas démontrée, sans preuve
d'impossibilité absolue non plus.
