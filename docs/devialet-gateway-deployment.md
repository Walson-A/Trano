# Héberger durablement la passerelle Devialet

Le conditionnement dédié évite de compiler le frontend et d’embarquer le serveur
Trano pour faire tourner la passerelle. Il ne lance pas le Player, ne publie pas
Funnel et ne modifie pas le conteneur Trano existant. Le service permanent n’est
pas encore mis en production ; le build et un démarrage isolé ont été vérifiés.

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
