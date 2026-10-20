# Appareils locaux sans Home Assistant

Trano peut joindre un second logement grâce à un relais léger sur un ordinateur
connecté au réseau de ce logement. Le serveur Trano conserve sa connexion Home
Assistant pour la maison familiale ; les lecteurs du second logement ont leurs
propres identifiants de relais et d'appareil.

```text
Oby / assistant Trano
  → serveur Trano : lister_appareils_locaux / controler_media_local
    → Tailscale + jeton : relais Node 24 sur le PC de l'appartement
      → Samsung : API REST + UPnP
      → Freebox Player Delta : télécommande réseau avec son code
```

Le package `packages/lan` utilise Node 24 et la petite bibliothèque WebSocket
`ws`, déjà présente dans les dépendances de Trano.
Le relais ne lance ni VM ni instance Home Assistant. Son fonctionnement exige
que le PC reste allumé, connecté au logement et joignable par le serveur.
Aucun service de démarrage automatique n'est installé par ces commandes.

### Hôte permanent souhaité : le Player Devialet

Walson souhaite héberger le relais sur son Player, qui reste au logement lorsque
le PC est emporté. Le programme Node décrit ci-dessous reste un prototype
fonctionnel sur ordinateur ; il n'est pas installé sur le Player.

Le mode développeur du Devialet est activé, confirmé par Walson. Un diagnostic
QML temporaire lancé par l'API officielle `debug_qml_app` a effectivement tourné
sur le Player : il a lu directement l'identité de la Samsung en HTTP 200 et
envoyé des signaux de présence au PC. Le Player peut donc exécuter notre propre
code applicatif et joindre la TV, sans Home Assistant.

Pendant un second essai de deux minutes, Walson a indiqué être revenu à l'accueil
du Devialet avec Retour ; les signaux ont continué après cette indication.
C'est un premier résultat favorable au fonctionnement après retour à l'accueil,
observé sur une courte durée. La propriété QML `visible` restait vraie : elle
ne permet donc pas à elle seule de déterminer quelle interface est au premier plan.

Un autre essai a fermé le serveur de fichiers du PC après le chargement : le
programme du Player a continué à lire la TV. Cela établit que ces fichiers ne
sont pas nécessaires en continu à ce programme déjà chargé. Le PC est resté
allumé pour observer les journaux ; le départ réel du PC n'a pas été testé.

Cela ne valide pas encore un service permanent : maintien en arrière-plan,
veille, redémarrage automatique, installation indépendante du PC, connexion
sécurisée au serveur distant et contrôle Samsung restent à vérifier. Le SDK
public fournit QML ; il ne démontre pas la disponibilité de Node ou de Tailscale
sur ce Player. Le lancement de développement charge le manifeste depuis un
serveur temporaire sur le PC. Ne pas annoncer le relais autonome comme livré.
Sources et résultats : [relevé terrain](research/2026-10-20-local-network.md).

Un diagnostic reproductible est disponible pour un Player appartenant à
l'utilisateur, dont le mode développeur est activé :

```powershell
python packages/lan/scripts/devialet-check.py --player <IPv4-Player> --samsung <IPv4-TV> --bind <IPv4-PC> --launch
```

`--launch` est obligatoire : ce test exécute une application QML temporaire et
peut interrompre l'écran en cours. Elle s'arrête après environ seize secondes.
Les adresses doivent être des IPv4 privées explicites ; aucun scan n'est lancé.
Le serveur de fichiers temporaire accepte seulement le Player indiqué et ferme
à la fin. Python 3 suffit côté PC. Aucune installation Qt n'y est nécessaire.

Le test vérifie l'existence des modules WebSocket client/serveur sans ouvrir de
socket WebSocket, l'import du module LocalStorage sans créer de base, une lecture
HTTP de la TV et une requête HTTPS publique. `--server-url https://<serveur>/health`
ajoute une requête sans authentification à un serveur choisi ; aucun contenu de
réponse ni secret n'est rapporté. Un statut zéro ne distingue pas DNS, routage et TLS.

Sur le Devialet testé, les deux modules WebSocket et l'import LocalStorage sont
disponibles ; la lecture Samsung et le HTTPS public retournent 200. La requête
vers l'adresse HTTPS privée actuelle du serveur de la maison retourne zéro.
Cela ne valide ni une session WebSocket, ni une base persistante, ni une liaison
distante prête à l'emploi. La prochaine étape est un agent QML avec connexion
sortante vers une passerelle dédiée, accessible en HTTPS depuis le logement.
La liaison distante reste à mettre en service ; aucun accès public n'a été
ouvert sur le serveur par ces diagnostics.

La passerelle et l'agent QML en lecture seule sont maintenant implémentés et
testés ensemble sur le LAN. Voir [leur guide](devialet-relay.md) pour la
configuration, les secrets distincts, le test réel et la mise en service
distante qui reste à valider. L'exposition HTTPS distante n'est pas activée.

## Découvrir les appareils

Depuis la racine du dépôt :

```powershell
npm run lan -- interfaces
npm run lan -- discover --interface <IPv4-locale-du-PC>
```

La découverte dure quelques secondes. Elle envoie des requêtes SSDP et mDNS
sur l'interface choisie, filtre les réponses sur son sous-réseau, et reconnaît
les Samsung et Freebox Player par leur identité annoncée. Elle ne lance aucun
balayage de ports, ne capture aucun trafic applicatif et n'envoie aucune touche.

Un Wi-Fi de résidence peut isoler les appareils : un SSID personnel ne suffit
pas à prouver que tout le sous-réseau appartient au logement. Vérifier la box
et l'appartenance des appareils avant d'étendre une investigation. Un appareil
absent de cette découverte n'est pas nécessairement absent du Wi-Fi.

## Configuration locale

Copier `packages/lan/config.example.json` dans `.local/relay.json`, générer
un vrai jeton avec `npm run --silent lan -- token`, puis renseigner les appareils
issus de la découverte. Le jeton d'exemple est volontairement refusé.

```json
{
  "token": "<jeton aléatoire d’au moins 32 caractères>",
  "listenHost": "127.0.0.1",
  "port": 3012,
  "allowControl": false,
  "devices": [
    {
      "id": "tv",
      "name": "Télévision",
      "kind": "samsung",
      "host": "192.168.50.10",
      "samsungControl": "remote",
      "mac": "<MAC renvoyée par la découverte>"
    },
    {
      "id": "devialet",
      "name": "Devialet",
      "kind": "freebox-player",
      "host": "192.168.50.20",
      "spotifyPort": 56071
    }
  ]
}
```

Les adresses et le port Spotify sont des exemples à remplacer. Pour la Samsung,
la MAC permet de refuser une commande si son adresse DHCP a été réattribuée
à une autre télévision. Réserver les adresses dans la box si cette fonction
est disponible ; après un redémarrage du Player, redécouvrir son port Spotify.

Le dossier `.local/` est ignoré par Git. Il contient des secrets lorsqu'il
héberge cette configuration : ne pas l'inclure dans une archive publique.

### Télévision Samsung

La lecture interroge l'identité sur le port 8001, les capacités UPnP, le volume,
la sourdine et le transport multimédia sur le port 9197 par défaut.
Les commandes disponibles sont dérivées des actions annoncées, pas du modèle.

Le transport UPnP décrit le lecteur DLNA : son état ne représente pas forcément
l'application TV courante, une entrée HDMI ou l'alimentation de la télévision.
Une valeur non disponible reste `null` / `unknown`. Les actions réseau annoncées
ne prouvent pas que chaque application de la TV les accepte.

La TV observée accepte les lectures, mais refuse SetVolume avec HTTP 500 /
UPnP 501, même en renvoyant le niveau déjà à zéro. Ses actions annoncées ne
suffisent donc pas à valider son contrôle. La configuration locale utilise
`samsungControl: "remote"` : les commandes restent absentes de l'inventaire
avec `setupRequired: "samsung_pairing"` jusqu'à l'appairage.

Sur place, TV allumée, avec sa MAC renseignée :

```powershell
npm run lan -- pair --config .local/relay.json --device tv
```

Accepter « Trano » sur la TV. La commande n'envoie aucune touche ; elle écrit
le jeton Samsung et l'empreinte du certificat dans le fichier local, puis il
faut redémarrer le relais. Le mode lecture seule reste inchangé.
La connexion suivante utilise WSS (8002 par défaut) et vérifie cette empreinte
**avant** l'envoi du jeton. Le certificat auto-signé n'est accepté que pour
cette connexion ; aucune vérification TLS globale n'est désactivée.

La télécommande préparée expose volume relatif, sourdine par bascule,
lecture, pause, arrêt et bascule d'alimentation. Une touche transmise n'est
pas une preuve que l'application courante l'a exécutée. L'appairage et ces
touches restent à vérifier sur la vraie télévision ; aucun essai d'appairage
n'a été lancé pendant l'absence de Walson.

Le mode `samsungControl: "upnp"` (défaut historique) reste disponible pour
les télévisions qui exécutent réellement ces actions. Il n'y a aucun
basculement automatique entre les protocoles après une erreur.

### Freebox Player Delta / Devialet

Sur le Player observé, déclaré hors abonnement par Walson, la présence réseau
et l'identité Spotify répondent.
Cela ne réactive aucun service TV associé à un abonnement.

Le contrôle passe par l'API de télécommande réseau du Player, avec le code
obtenu dans ses réglages de télécommande réseau. Renseigner `remoteCode` dans
la configuration locale uniquement. Ne pas essayer des codes au hasard.

Sans code : `setupRequired: "remote_code"`, aucune commande annoncée.
Avec code : volume relatif, lecture/pause et bascule d'alimentation.
`power_toggle` inverse l'état ; le relais ne le présente jamais comme un
allumer/éteindre déterministe. La présence d'un code ne prouve pas sa validité :
le Player peut encore refuser l'appel.

Le volume absolu et l'état de lecture du Player restent inconnus. Un port TCP
ouvert prouve seulement qu'un service répond. L'annonce AirPlay
`AppleTV3,2` est une identité de compatibilité, pas le modèle physique.

## Lire, servir, commander

```powershell
npm run lan -- inspect --config .local/relay.json
npm run lan -- serve --config .local/relay.json
```

Le mode par défaut est **lecture seule**. Pour un usage distant, remplacer
`listenHost` par l'IPv4 Tailscale de ce PC. Laisser le relais sur Tailscale ;
aucune redirection de port Internet n'est requise.

Après revue des appareils et validation sur place, poser `allowControl: true`
et redémarrer le relais. Pour un essai explicite depuis le PC :

```powershell
npm run lan -- control --config .local/relay.json --device tv --action volume_down
npm run lan -- control --config .local/relay.json --device devialet --action volume_down
```

Ces deux commandes ont des effets physiques. Le succès indique la transmission
acceptée par l'API, pas nécessairement un changement visible de lecture.

## Brancher le serveur Trano

Créer un fichier privé sur le serveur, hors du dépôt et de la base :

```json
[
  {
    "id": "apartment",
    "name": "Appartement",
    "url": "http://<IPv4-Tailscale-du-PC>:3012",
    "token": "<même jeton que dans la configuration locale>"
  }
]
```

Définir `TRANO_LAN_RELAYS_FILE` avec le chemin absolu du fichier.
En conteneur, monter ce fichier en lecture seule et utiliser son chemin
**dans le conteneur**. Le jeton n'est jamais envoyé au frontend.

Extrait à ajouter au service Compose lors de la mise en service :

```yaml
environment:
  TRANO_LAN_RELAYS_FILE: /run/trano/lan-relays.json
volumes:
  - ./config/lan-relays.json:/run/trano/lan-relays.json:ro
```

Les outils communs à l'assistant Trano et à Oby sont :
- `lister_appareils_locaux` : lieux, appareils, disponibilité, états et capacités ;
- `controler_media_local` : `relais`, `appareil`, `action`, et selon l'action
  `volume` ou `muted`.

Ces outils fonctionnent même sans `TRANO_HA_URL` / `TRANO_HA_TOKEN`.
Une panne d'un relais n'efface pas les autres lieux et n'est pas présentée
comme « appareils éteints ». Sans fichier configuré, la liste des relais est vide.

Les mêmes opérations existent en REST, protégées par le jeton
`TRANO_MCP_TOKEN` :
- `GET /api/lan/devices` ;
- `POST /api/lan/relays/:relayId/devices/:deviceId/commands`.

Le frontend web et l'app mobile continuent à afficher les appareils Home
Assistant. Ce travail ajoute les connecteurs, l'API et les outils des assistants ;
il n'ajoute pas encore les lecteurs locaux à leurs cartes d'appareils.

## Vérifier

```powershell
npm run test:lan
npm run lint
node packages/lan/scripts/live-check.mjs .local/relay.json
node packages/lan/scripts/remote-check.mjs .local/relay.json <user@serveur-Trano> <IPv4-Tailscale-du-PC>
python packages/lan/scripts/linux-check.py <user@serveur-Trano>
```

Les tests automatiques utilisent des appareils de simulation isolés.
Les scripts `live-check` et `remote-check` exigent la lecture seule, ouvrent des serveurs
temporaires puis les ferment. Le test local appelle les vrais outils MCP
sans Home Assistant et lit les vrais appareils configurés. Le test distant
utilise une connexion SSH préexistante pour envoyer uniquement une lecture
depuis le serveur ; il n'y installe rien et n'en modifie aucune configuration.
Il nécessite Python 3 sur ce serveur. Aucun jeton n'apparaît dans ses arguments
de processus ni dans son résultat.

Le script `linux-check.py` copie uniquement les sources et les certificats
publics de simulation dans un dossier temporaire du serveur. Il lance les
tests dans un conteneur jetable issu de l'image déjà utilisée par Trano :
pas de réseau externe, pas de volume de production, racine en lecture seule.
Il supprime ensuite son conteneur et ses fichiers. Un premier passage de 28 tests
a réussi dans cet environnement Linux ; ce script ne construit pas d'image.
La validation finale comporte 29 tests sur Windows et dans une nouvelle image
construite avec le Dockerfile modifié. Son démarrage, sa route de santé et son API
LAN ont également été vérifiés dans un conteneur isolé, puis les ressources
temporaires supprimées. Le conteneur de production n'a pas été remplacé.

Le script distinct `volume-noop-check.mjs` est un diagnostic d'écriture
explicite réservé au mode UPnP, volume déjà à zéro et sourdine désactivée.
Ce n'est pas un test de lecture : il a établi le refus UPnP 501 de cette TV,
sans changement du volume ni de la sourdine. Il n'est pas lancé par les tests.

## Validation terrain du 20 octobre 2026

Voir [le relevé de l'investigation](research/2026-10-20-local-network.md).

Un relevé court du seul processus relais sur ce PC Windows donne environ
80 Mio de mémoire résidente au repos et 86 Mio après une lecture des deux
appareils (75 ms pour cette lecture). Ce n'est ni une mesure prolongée ni
une comparaison mesurée avec Home Assistant. Reproduction :
`node packages/lan/scripts/resource-check.mjs .local/relay.json`.
