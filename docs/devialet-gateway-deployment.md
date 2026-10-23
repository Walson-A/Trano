# Héberger durablement la passerelle Devialet

Le conditionnement dédié évite de compiler le frontend et d’embarquer le serveur
Trano pour faire tourner la passerelle. Il ne lance pas le Player, ne publie pas
Funnel et ne modifie pas le conteneur Trano existant. Une passerelle séparée est
maintenant installée et laissée en service depuis le 22 octobre ; les instructions
Compose restent une méthode alternative, à ne pas superposer à cette installation.

## Préparer la configuration privée

Partir du contrat décrit dans [devialet-relay.md](devialet-relay.md) et du fichier
packages/lan/gateway.example.json. Remplacer les trois secrets, l’origine HTTPS
et les appareils par les valeurs vérifiées du logement. Conserver ce fichier
hors Git et du contexte de build, lisible uniquement par le compte choisi.

Le service utilise le réseau hôte Linux afin de respecter les adresses
d’écoute explicites. Pour Funnel, agentHost reste 127.0.0.1. readerHost reste
127.0.0.1 si le lecteur est sur l’hôte ; une IPv4 Tailscale explicite peut être
nécessaire pour un lecteur dans un autre conteneur. Ne pas choisir 0.0.0.0.
La passerelle refuse les écoutes publiques indifférenciées.

## Construire et lancer sur Linux

Depuis un checkout contenant cette version, avec le fichier privé déjà rempli :

    export TRANO_GATEWAY_CONFIG="$HOME/.config/trano-lan/gateway.json"
    export TRANO_GATEWAY_UID="$(id -u)"
    export TRANO_GATEWAY_GID="$(id -g)"
    docker compose -f deploy/lan-gateway.compose.yaml config --quiet
    docker compose -f deploy/lan-gateway.compose.yaml build
    docker compose -f deploy/lan-gateway.compose.yaml up -d
    docker compose -f deploy/lan-gateway.compose.yaml ps

TRANO_GATEWAY_IMAGE peut sélectionner une image préalablement construite et
vérifiée. Le nom de projet Compose est trano-lan-gateway, distinct de Trano.
Le fichier privé doit appartenir à l’UID/GID configuré ; son absence est une
erreur, jamais une invitation à créer un dossier ou une configuration par défaut.

Le service est en lecture seule, sans capacité Linux additionnelle, avec une
limite de mémoire de 96 Mio, un tas Node de 48 Mio, 32 processus et 0,25 CPU.
Sa politique unless-stopped demande à Docker de le reprendre après une panne
du processus ou un redémarrage du daemon. Aucun reboot du serveur n’a été testé.

Le contrôle Docker mesure la vie du processus : les deux écoutes doivent
répondre et le lecteur doit reconnaître son jeton. Il accepte HTTP 503 lorsque
le Player est absent. Cet état reste indisponible dans l’API de Trano ;
le statut healthy du conteneur ne prouve aucune présence d’appareil.

## Publier puis démarrer le Player

Vérifier qu’aucun autre service n’utilise 8443 et conserver le proxy privé 443.
Après autorisation de publication, configurer uniquement Funnel 8443 vers
127.0.0.1:3014, suivant [le guide du relais](devialet-relay.md).
Le lecteur 3015 reste privé et exige son propre jeton.

Lancer ensuite le Player depuis son LAN avec launch-devialet-agent.mjs et le
fichier privé, sans afficher son URL de démarrage. Le mode normal n’a aucune
minuterie de diagnostic. La reconnexion après redémarrage de la passerelle a
été observée sur le vrai Player, mais un démarrage automatique après reboot du
Player reste non établi. La présence durable dans ses menus ou sa veille et
le fonctionnement PC physiquement éteint restent à vérifier.

La disponibilité du relais pendant une autre application ne doit pas être
supposée : le [test Netflix du 23 octobre](research/2026-10-23-devialet-netflix-background.md)
observe une perte de liaison juste après la commande d'ouverture, sans reprise
pendant la lecture confirmée par Walson. Le conteneur serveur reste actif ; son
état `healthy` ne remplace pas la réception d'observations fraîches du Player.

Pour arrêter uniquement ce service :

    docker compose -f deploy/lan-gateway.compose.yaml down

Refermer séparément la route Funnel 8443 après vérification de sa destination.
Ne pas réinitialiser toute la configuration Serve/Funnel de la machine.

## Reproduire la vérification sans publier de relais

    python -B packages/lan/scripts/gateway-image-check.py user@serveur

Ce contrôle construit une image portant un tag aléatoire, valide Compose,
démarre un conteneur temporaire borné et vérifie le démarrage, les fichiers QML
protégés, HTTP 401 sans jeton, HTTP 503 sans agent et la vie du processus.
Il ne lance aucun Player, ne contacte aucun appareil et n’active pas Funnel.
Les secrets sont générés après le build, hors de son contexte.
Le conteneur, son tag d’image et ses fichiers privés sont supprimés et contrôlés.
Le cache partagé de build Docker reste conservé ; aucun nettoyage global des
images ou caches du serveur n’est exécuté.

Le 21 octobre 2026, l’image avec ws 8.22.0 a passé ce contrôle sur Linux :
Node v24.22.1, taille rapportée par docker image inspect de 63 144 989 octets,
mémoire observée entre 28 et 66 Mio selon le relevé, sous une limite de 96 Mio.
Le build final après ajout de la sonde Samsung rapporte 63 145 097 octets.
Ces mesures ne
prouvent ni un pic maximal ni une charge prolongée. Le nettoyage et l’identité
inchangée de l’image de production ont été vérifiés.

## Dépendance WebSocket

La base Node est épinglée au digest observé pendant le build vérifié.
Le lockfile utilise ws 8.22.0. Cette mise à jour corrige les avis
[épuisement mémoire par fragments](https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p)
et [mémoire non initialisée](https://github.com/websockets/ws/security/advisories/GHSA-58qx-3vcg-4xpx)
identifiés pendant le premier build. L’audit npm limité au runtime de cette
passerelle ne signale plus de vulnérabilité au moment du contrôle.
L’installation complète du dépôt signale 21 autres avis dans son environnement
plus large ; ils doivent être traités dans leur périmètre avant une livraison
globale. Aucun correctif automatique ou changement de version majeur n’a été
appliqué aux autres dépendances.


## Installation séparée réalisée le 22 octobre 2026

La passerelle est désormais installée sur le serveur permanent, indépendamment
du conteneur Trano :

| Élément | État observé |
| --- | --- |
| Conteneur | trano-lan-gateway |
| Image | trano-lan-gateway:standalone |
| Identité d'image | sha256:4fe8fdf8d4e996a193b6472cc703eba190f9403d7f704e84a4bb9bd3db2a08ce |
| Dossier privé | /home/trano/trano-lan-gateway, mode 700 |
| Configuration | gateway.json, mode 400 ; trois secrets générés sur le serveur après le build |
| Entrée publique | Funnel 8443 vers 127.0.0.1:3014 |
| Lecture | 127.0.0.1:3015, jeton distinct |
| Redémarrage | unless-stopped ; services docker et tailscaled enabled |
| Player | Devialet seul, QML sans durée de vie artificielle |

Le fichier deployment.json conserve l'identité du Trano préexistant et l'état du
proxy 443 pour les contrôles. Le sous-dossier source est le contexte de build
conservé ; il ne contient aucun code télécommande ni jeton. La configuration
privée n'entre pas dans le build. Le service utilise les mêmes limites que Compose :
96 Mio, 0,25 CPU, 32 PID, utilisateur du propriétaire, racine en lecture seule,
capacités retirées et no-new-privileges. Le socket Tailscale n'est pas monté dans
le service : seul le helper administratif éphémère de publication l'a utilisé.

L'installation reproductible refuse de remplacer un dossier, conteneur, image
ou port existant. Le premier appel affiche un plan ; --install effectue le build,
les contrôles et la publication de la seule route 8443 :

    python -B packages/lan/scripts/gateway-service-install.py .local/relay.json user@serveur nom.tailnet.ts.net
    python -B packages/lan/scripts/gateway-service-install.py .local/relay.json user@serveur nom.tailnet.ts.net --install

L'autorisation de publier ce point d'entrée et d'administrer Docker est requise ;
elle a été donnée par Walson pour cette installation. En cas d'échec, le script
retire uniquement ses propres ressources ; un nettoyage non confirmé est signalé.
Il ne faut pas le relancer pour mettre à jour l'installation existante : réviser
explicitement cette mise à jour et préserver les secrets.

La configuration de lancement privée est conservée sur le PC dans
.local/gateway-standalone.json, ignorée par Git. Elle permet le lancement SDK
initial via launch-devialet-agent.mjs ; aucun fichier de ce PC n'est servi au
Player. Le transfert de configuration n'a affiché aucun secret.

Contrôles réels : inventaire Freebox v7, redémarrage du seul conteneur passerelle,
reconnexion du Player sans relancement, nouveaux inventaires après Accueil et
après les observateurs temporaires. Le service est healthy et reste démarré.
L'image du Trano existant et sa route 443 n'ont pas changé. Aucun redémarrage du
serveur ou du Player n'a été effectué ; unless-stopped n'est pas un hook de boot
pour le Player. L'intégration de ce lecteur dans la configuration de production
Trano n'a pas été effectuée.

Pour arrêter ce service précis sans toucher à Trano :

    docker stop trano-lan-gateway

Conserver les fichiers privés et la branche pendant les travaux de démarrage du
Player et d'Atlas TV. Une désinstallation doit aussi retirer spécifiquement la
route Funnel 8443, après vérification de sa destination ; ne pas réinitialiser
Serve/Funnel globalement.
