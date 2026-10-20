# Relais QML sur le Freebox Player Devialet

Le Player peut héberger le code qui lit les appareils du logement. La passerelle
Node tourne sur un serveur permanent et reçoit une connexion sortante du Player.
Le PC sert actuellement à lancer les essais ; il n'est pas l'hôte souhaité du
relais. Ce parcours est expérimental et n'est pas déployé en production.

```text
Samsung / identité Spotify du Player
  ← lectures HTTP et GetVolume / GetMute exécutés par agent.qml sur le Devialet
    → connexion WebSocket sortante authentifiée
      → passerelle Node sur serveur permanent
        ← API de lecture privée, jeton distinct
          ← connecteur LAN de Trano → outils des assistants
```

L'essai terrain a parcouru cette chaîne sur le LAN : les lectures sont exécutées
sur le vrai Devialet et l'adaptateur réel de Trano reçoit les deux identités,
le volume et la sourdine de la TV. La passerelle était temporairement sur le PC,
avec des jetons de test aléatoires et sans TLS. L'agent s'est fermé après vingt
secondes et l'inventaire est devenu indisponible. Ce test ne valide pas encore
la liaison distante WSS, la veille, le redémarrage du Player ou le départ du PC.

## Préparer la passerelle

Copier `packages/lan/gateway.example.json` dans un fichier privé hors Git.
Remplacer les trois jetons par trois sorties distinctes de `npm run --silent lan -- token`.
L'exemple est refusé tant qu'ils ne sont pas remplacés.

- `readerToken` : accès du serveur Trano à l'API privée de la passerelle.
- `agentToken` : authentification du Player sur sa connexion WebSocket.
- `bootstrapToken` : protection du téléchargement initial du manifeste et du QML.

Le SDK prend une URL de manifeste sans en-tête d'authentification personnalisé.
Le chemin `/bootstrap/<bootstrapToken>/manifest.json` est donc une **URL secrète**.
Ne pas la mettre dans Git, les journaux, une capture partagée ou une commande
visible dans les arguments des processus. Le QML téléchargé contient le jeton
de l'agent, jamais celui de l'API privée. Révoquer ces deux secrets si le chemin
de démarrage est divulgué. Les réponses ne doivent pas être mises en cache.

`devices` contient seulement des appareils explicitement identifiés : MAC épinglée
pour Samsung, port Spotify découvert pour le Player. Le port Spotify peut changer
après un redémarrage ; le relais ne doit alors pas inventer une identité.
Les codes de télécommande et jetons Samsung ne sont pas embarqués dans cet agent.

`publicBaseUrl` doit être une origine HTTPS, sans chemin, query ni identifiants.
L'agent utilise son équivalent WSS sur `/agent`. Les deux écoutes Node sont
distinctes et privées par défaut :

| Écoute | Défaut | Contenu |
| --- | --- | --- |
| `agentHost:agentPort` | `127.0.0.1:3014` | WebSocket de l'agent et fichiers de démarrage protégés |
| `readerHost:readerPort` | `127.0.0.1:3015` | API `/v1/devices`, `/v1/health`, jeton `readerToken` |

Le listener destiné à Internet ne sert jamais l'API de lecture de Trano.
Les origines de navigateur sont refusées. Les identifiants de connexion de
l'agent sont envoyés dans le premier message WebSocket, pas dans son URL.
Le Player publie toutes les cinq secondes ; une observation de plus de vingt
secondes, ou une connexion fermée, rend le relais indisponible.

Depuis un checkout et ses dépendances déjà installées, Node 24 :

```sh
npm run lan -- gateway --config /chemin/prive/gateway.json
```

Cette commande ne lance pas le Player et ne configure aucun proxy public.
Les seuls endpoints publiables sont ceux du listener `agentPort`. Le lecteur
privé peut écouter sur une IPv4 Tailscale explicite si Trano est dans un conteneur
et doit joindre l'hôte. Son fichier de relais utilise alors cette IPv4 et
`readerToken`, suivant [le guide LAN](local-network.md#brancher-le-serveur-trano).

## Mise en service distante à revoir avant exécution

Le serveur existant possède un proxy HTTPS 443 vers l'engine Atlas sur 7777.
Il faut conserver son accès privé. La proposition est un **point d'entrée séparé
sur 8443**, dirigé uniquement vers `127.0.0.1:3014`, par exemple via Tailscale
Funnel. Cela rendrait le listener de l'agent joignable depuis Internet avec TLS ;
les secrets resteraient obligatoires et la lecture de Trano resterait privée.

Aucun Funnel n'a été activé pour cette feature. Avant mise en service : revoir
la configuration exacte, vérifier les restrictions du tailnet, préparer un
service isolé et sa suppression, puis obtenir l'accord pour cette publication.
Ne pas activer Funnel sur le proxy 443 existant.

Un essai distant borné est préparé dans
`packages/lan/scripts/remote-devialet-trial.py`. Sans option d'exécution, il
affiche uniquement son plan, sans connexion réseau :

```powershell
python packages/lan/scripts/remote-devialet-trial.py .local/relay.json <user@serveur> <nom-Tailscale.ts.net>
```

L'option `--execute-public-trial` n'est à utiliser **qu'après accord explicite
pour la publication**. Le script refuse un port 8443 déjà configuré et des ports
locaux déjà occupés, puis utilise un conteneur jetable et l'image immuable déjà
présente. Il monte uniquement ses propres sources et secrets temporaires, aucun
volume de production. Il expose uniquement le listener agent via Funnel 8443,
lance un agent d'une minute et observe pendant au plus cent secondes. Il demande
ensuite la suppression de son Funnel, de son conteneur et de ses fichiers, en
vérifiant et rapportant séparément chaque résultat. Un changement concurrent du
proxy 8443 empêche sa suppression automatique pour préserver le travail d'autrui.
Un échec de nettoyage doit être traité à partir de ce rapport, sans annoncer
l'essai terminé. Le script et son plan ont été vérifiés ; le test public n'a
pas encore été exécuté.

Le lancement du Player utilise ensuite `debug_qml_app`, avec l'URL secrète du
manifeste hébergé sur le serveur permanent et `wait: false`. Le SDK public ne
fournit pas ici de mécanisme de démarrage automatique vérifié. Une application
déjà chargée continue sans son serveur de fichiers ; cela ne garantit pas son
retour après reboot. Le mode développeur doit être activé sur le Player.

Le lanceur lit les secrets dans le fichier privé, vérifie l'identité Spotify
du Player configuré, puis transmet l'URL dans le corps HTTP, sans l'afficher :

```sh
node packages/lan/scripts/launch-devialet-agent.mjs /chemin/prive/gateway.json devialet --launch
```

Il doit être exécuté depuis le LAN du Player, une fois la passerelle prête.
Un lancement accepté par le SDK ne prouve pas la réception d'observations.

## Limites fonctionnelles

L'agent actuel est en lecture seule. Il n'implémente aucune commande multimédia,
ne promet aucune capacité de contrôle et conserve les états de lecture inconnus.
Le contrôle Samsung avec certificat auto-signé et appairage reste à porter et
tester dans QML. Le connecteur Node existant n'établit pas que ce contrôle est
disponible sur le Player. Le frontend et le mobile n'affichent pas encore les
lecteurs locaux dans leurs cartes.

La fenêtre QML est issue du SDK Freebox ; les essais ont montré un avertissement
de backend graphique. La coexistence prolongée avec les menus et médias du
Player reste à vérifier, même si le JavaScript et les lectures réseau fonctionnent.

## Vérifications

```powershell
npm run test:lan
npm run lint
node packages/lan/scripts/devialet-agent-check.mjs .local/relay.json <IPv4-PC> --launch
```

Le dernier script lance un diagnostic physique temporaire et peut interrompre
l'affichage du Player. Il exige une configuration de relais en lecture seule,
utilise des jetons éphémères, arrête l'agent par minuterie et ferme ses serveurs.
Il ne configure ni TLS, ni service permanent, ni accès public. Il lit les vrais
appareils et passe par le vrai adaptateur de Trano ; les tests automatiques
séparés utilisent des fixtures.

Les preuves et limites terrain sont dans le
[relevé du 20 octobre](research/2026-10-20-local-network.md).
