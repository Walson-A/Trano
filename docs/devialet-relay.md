# Relais QML sur le Freebox Player Devialet

Le Player peut héberger le code qui lit les appareils du logement. La passerelle
Node tourne sur un serveur permanent et reçoit une connexion sortante du Player.
Le PC sert encore au lancement initial du SDK, mais n'héberge plus les fichiers
ni la passerelle du relais laissé en fonctionnement le 22 octobre. La passerelle
est un service séparé sur le serveur permanent ; Trano en production reste inchangé.
Le démarrage au boot du Player n'est pas configuré.

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
secondes et l'inventaire est devenu indisponible. Cet essai LAN ne validait pas WSS. Un essai suivant, le 21 octobre, a réellement
reçu les deux identités et les lectures Samsung sur le serveur distant par
WSS public. Le code de lecture tournait sur le Player, la passerelle sur Linux ;
le PC lançait le SDK et observait le test. L’arrêt minuté, la suppression de
Funnel 8443, des conteneurs et des fichiers privés ont été vérifiés, sans changer
le proxy 443. Aucun arrêt physique du PC, reboot,
réveil ou démarrage automatique du Player n’a encore été testé.

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
secondes, ou une connexion fermée, rend le relais indisponible. Une connexion TCP
restée ouverte mais sans observations est libérée, afin de permettre la reconnexion
du même Player après une coupure réseau.

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

Walson a autorisé les essais publics le 21 octobre. L’attribut Funnel a été
accordé au seul serveur. Les essais utilisent puis referment exclusivement 8443.
Le parcours complet doit être vérifié avant une mise en service permanente.
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
attend le DNS public pendant au plus dix minutes, puis lance un agent d’une
minute et observe pendant au plus cent secondes. Il demande
ensuite la suppression de son Funnel, de son conteneur et de ses fichiers, en
vérifiant et rapportant séparément chaque résultat. Un changement concurrent du
proxy 8443 empêche sa suppression automatique pour préserver le travail d'autrui.
Un échec de nettoyage doit être traité à partir de ce rapport, sans annoncer
l'essai terminé. Walson a autorisé ce test le 21 octobre 2026. Il a également demandé de ne pas
solliciter la TV pendant trente minutes, jusqu'au 21 octobre à 20:25:36 UTC
(22:25:36 à Paris). La pause a été respectée ; les essais publics ont repris après son expiration.

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


## Vérifier le serveur sans solliciter le Player

Commande de précontrôle, sans lancement sur le Player :

    python packages/lan/scripts/remote-devialet-trial.py .local/relay.json <user@serveur> <nom-Tailscale.ts.net> --server-preflight

Le mode --server-preflight démarre uniquement le runtime de la passerelle dans
son conteneur temporaire. Il ne contacte pas le Player, ne lance aucun QML et
n'active pas Funnel. Il vérifie les fichiers de démarrage et l'indisponibilité
correcte de l'inventaire tant qu'aucun agent n'est connecté, puis contrôle le
nettoyage et la préservation du proxy 443.

Ce mode a été exécuté avec succès le 21 octobre sur le vrai serveur Linux :
manifest et deux fichiers QML accessibles avec le secret de démarrage, séparation
des secrets vérifiée, inventaire sans agent en HTTP 503. Le conteneur et les
fichiers temporaires ont été supprimés ; le proxy 443 est resté inchangé.

Les simulations de pannes du script distant s'exécutent sans réseau :

    python -B packages/lan/test/remote_trial_test.py

Elles couvrent le nettoyage partiel, les erreurs de lecture de configuration
Funnel, les appareils non identifiés, l'absence d'arrêt attendu et la perte
précoce de liaison. Un code de sortie SSH nul ne suffit pas : les preuves de
lecture et chacun des contrôles de nettoyage doivent être présents et vrais.

## Préparer Atlas TV

Le relais est maintenant séparé en composant non visuel RelayAgent.qml et hôte
SDK minimal agent.qml. La passerelle sert les deux fichiers et leur index qmldir sur le chemin de
démarrage protégé. L’import distant de RelayAgent exige cet index. Le composant ne décide pas de quitter son application hôte :
il signale seulement la fin d'un diagnostic, que l'hôte peut traiter.

La direction pour une application Atlas TV réutilisable, dont les animés,
est documentée dans [atlas-tv-direction.md](atlas-tv-direction.md). La séparation
est faite dans le code et a été retestée sur le vrai Player après correction
de l’index qmldir. Les lectures ont traversé l’adaptateur Trano, puis l’arrêt
et l’invalidation des états ont été vérifiés. L’interface TV reste à construire ; une mire vidéo a ensuite été vérifiée le
22 octobre, voir atlas-tv-direction.md.

## Administration temporaire de Funnel

L’autorisation du tailnet ne remplace pas les droits locaux du daemon. Le
compte Linux peut lire l’état mais la modification Serve a été refusée.
L’option explicite --docker-funnel-admin utilise les droits Docker existants
pour deux commandes fixes : ouvrir 8443 vers 127.0.0.1:3014, puis fermer 8443.
Elle ne crée pas d’opérateur Tailscale permanent.

Le helper monte le binaire Tailscale de l’hôte et son socket daemon, utilise
l’image immuable existante, sans réseau de conteneur ni volume de production.
L’accès administrateur au socket reste puissant : cette option exige l’accord
d’administrer le point d’entrée. Les deux conteneurs portent des noms réservés
à l’essai ; leur suppression est vérifiée. Les erreurs sont bornées, URL et
jetons hexadécimaux de 64 caractères masqués.

Le contrôle des ports accepte les sockets TIME_WAIT d’un essai fini tout en
refusant une écoute concurrente. Le DNS est vérifié par un résolveur public
en HTTPS avant le lancement du Player : une réponse MagicDNS privée ne
constitue pas une preuve d’accès depuis le logement.

## Vérifier une reconnexion autonome

Ajouter --restart-gateway à un essai public pour redémarrer uniquement son
conteneur temporaire, dix secondes après le premier inventaire complet.
Le Player n’est lancé qu’une fois. Le test exige ensuite un nouvel inventaire
complet reçu après le redémarrage, dans les vingt secondes, puis l’arrêt
minuté habituel de l’agent et tous les contrôles de nettoyage. Un inventaire
incomplet, une reprise manquante ou une déconnexion trop précoce font échouer
le test. Le conteneur de production n’est jamais une cible de redémarrage.

Avant de proposer le lancement SDK, le contrôle de disponibilité utilise une
IPv4 publique annoncée par le DNS, établit TLS en vérifiant le nom du serveur
avec le magasin de certificats système, puis exige la réponse HTTP 404
attendue sur la racine du listener agent. Il ne transmet aucun jeton. Une
réponse DNS positive seule ne garantit pas que la route Funnel est déjà prête.
Ce contrôle ne garantit pas le DNS ou le chemin réseau propre au Player.

## Image dédiée pour le serveur permanent

Le [guide de conditionnement et de mise en service](devialet-gateway-deployment.md)
décrit le service Linux isolé, ses limites de ressources, la configuration privée
et le contrôle de build reproductible. Les diagnostics du 21 octobre n’avaient
pas installé de service permanent ; l’installation du 22 octobre est décrite ci-dessous. Pour les tests Linux et les essais publics, installer les
dépendances verrouillées avec npm ci : les scripts montent une copie du runtime
ws correspondant au lockfile dans leur conteneur temporaire, vérifient sa version
et préservent les dépendances de l’image de production.


## Code privé et navigation du Devialet — 22 octobre 2026

Le code télécommande réseau a été saisi dans un formulaire local à usage unique,
puis enregistré uniquement dans la configuration privée du PC. Il n'est ni dans
Git, ni dans le bootstrap QML, ni dans les journaux. Pour refaire cette saisie :

    python -B packages/lan/scripts/freebox-code-setup.py .local/relay.json devialet

Ouvrir l'URL locale affichée et saisir le code dans le champ masqué. Le formulaire
expire après quinze minutes et se ferme après une sauvegarde. Il préserve les
autres appareils et le réglage allowControl ; une modification concurrente de la
configuration empêche la sauvegarde. Le message de confirmation ne contient pas
le code. Vérification avec une configuration jetable :

    python -B packages/lan/test/freebox_code_test.py

Le pilote accepte désormais les actions fixes home, back, up, down, left, right
et select, en plus des actions existantes. Les clés Freebox correspondantes sont
home, red, up, down, left, right et ok. Une clé arbitraire reste refusée. Leur
présence dans le pilote ne constitue pas une validation matérielle de chaque touche.

La touche home a été envoyée au Player identifié comme Freebox v7 ; Walson a
confirmé le retour à l'accueil du Devialet. Un second essai a lancé le relais,
envoyé home, puis reçu un nouvel inventaire après 8,54 secondes. L'agent a ensuite
terminé son diagnostic minuté ; les observations périmées ont été masquées et les
listeners temporaires fermés. Commande reproductible, pouvant interrompre l'écran :

    node packages/lan/scripts/devialet-agent-check.mjs .local/relay.json <IPv4 locale> --launch --home

Cette variante ne contacte que le Player, vérifie son identité avant la touche et
n'active pas le contrôle dans la configuration sauvegardée. La passerelle reste
en lecture seule. Cela prouve une continuité courte après Accueil, pas un service
installé, un démarrage après reboot ni une autonomie vérifiée PC éteint.


## Service laissé en fonctionnement — 22 octobre 2026

Le service séparé trano-lan-gateway est installé sur le serveur permanent, sous
/home/trano/trano-lan-gateway. Le QML et son manifeste sont servis par ce serveur
via Funnel 8443 ; l'API de lecture reste sur 127.0.0.1:3015, avec son propre jeton.
Seul le Devialet est configuré pour cet essai prolongé. Le bootstrap normal donne
lifetimeMs=0 : aucune minuterie de diagnostic ne termine l'application.

Après le lancement initial depuis le LAN, un inventaire Freebox v7 a été reçu.
La passerelle a été redémarrée seule, puis le Player s'est reconnecté et a fourni
un nouvel inventaire sans autre appel de lancement. Les observations ont continué
après la commande Accueil et après la fin des observateurs temporaires. Aucun
serveur HTTP, WebSocket ou processus relais du PC ne participe à cette chaîne.
Le PC n'a pas été physiquement éteint durant cette vérification.

Le conteneur est healthy, avec restart=unless-stopped ; Docker et tailscaled sont
activés au démarrage du serveur. Ce réglage couvre le côté serveur, pas le Player.
L'image du conteneur Trano et le proxy privé 443 sont restés identiques.
Administration, installation reproductible et fichiers conservés :
[service dédié](devialet-gateway-deployment.md).

### Limite de démarrage du Player

La recherche dans les clones officiels est bornée aux contrats publiés :

- freebox-qtcreator-plugin, commit 18f4d2c9e4ef8d8351b6ffee3bd3f2699f92294f :
  remote/remoteqml.cc transmet manifest_url, entry_point et wait à debug_qml_app ;
  src/runcontrol.cc démarre le serveur HTTP puis lance explicitement l'application.
  fileformat/manifest.cc gère file, uiFlavor, default et urlHandler. Aucun contrat
  de boot/autostart n'y a été trouvé ; default désigne l'entrée principale.
- qmlapps_examples, commit 1ccd9eeffca7d6d435bdfb1232a2380323abbbc6 : l'exemple
  samples/screensaver comporte une entrée screensaver, mais quitte à l'interaction.
  Cela ne prouve ni un lancement au boot ni un service permanent.
- libfbxqml/fbx/application/settings.js conserve des préférences propres à
  l'application ; cela ne configure pas le démarrage global du Player.

Le [SDK officiel](https://dev.freebox.fr/sdk/player.html) décrit les tests locaux
et la distribution FreeStore via FreeFactory. Une publication ou installation
n'est pas une preuve d'autostart. Certaines pages détaillées ont expiré pendant
la recherche ; l'absence de contrat trouvé n'est pas une preuve d'impossibilité
absolue dans le firmware.

Après reboot ou arrêt de l'application sur le Devialet, il faut encore un nouvel
appel SDK depuis son LAN. Le serveur distant ne dispose pas d'une route entrante
vers ce logement et ne peut donc pas relancer spontanément son adresse privée.
Aucun hook firmware, root, flash ou reboot du Player n'a été réalisé. Le relais
peut fonctionner sans processus sur le PC après lancement ; sa récupération après
reboot reste non résolue.


### Inspection native du firmware installé — 22 octobre, étape suivante

Le diagnostic --startup-api a lu Device.model=fbx7hd-delta et
Device.firmwareVersion=1.5.26 via le singleton public fbx.system 1.0. Il a ensuite
énuméré les noms des membres App, sans lire leurs valeurs ni App.settings :
accountId, context, contextChanged, currentUrl, currentUrlChanged, logicalFactor,
notifyUser, objectName, objectNameChanged, profileId, setRemoteMapping,
setRemoteMetadata, settings, settingsChanged, settingsSaved, settingsStatus,
settingsStatusChanged, shellRequest, shellResponse, urlOpen, urlOpenWithCheckpoint.

La présence de shellRequest/shellResponse indique un canal natif ; elle ne donne
ni sa liste de commandes ni un droit de modifier le démarrage. Aucun appel
interne deviné n'a été exécuté. Le [contrat Shell public](https://dev.freebox.fr/sdk/libfbxqml/pub/async/shell.html)
documente Shell.request et les opérations gw_authz_query/parental_code_validate,
pas une commande de boot. Le [contrat Device](https://dev.freebox.fr/sdk/libfbxqml/pub/system/device.html)
documente les deux propriétés de modèle/firmware utilisées.

Le diagnostic est temporaire et peut remplacer l'application en cours. Pour
lancer cette inspection puis remettre le relais, utiliser les commandes avec le
fichier privé déjà préparé ; ne pas laisser le Player sans relance du relais :

    python -B packages/lan/scripts/devialet-check.py --player <IPv4 Player> --bind <IPv4 PC> --startup-api --launch
    node packages/lan/scripts/launch-devialet-agent.mjs .local/gateway-standalone.json devialet --launch

Les deux inspections matérielles ont été suivies d'une relance acceptée du relais.
Un contrôle TCP limité aux ports 22 et 5555 du seul Player n'a reçu aucune
connexion ; cela n'est pas un inventaire complet des services. Sur le PC, les
IPv6 observées hors Tailscale étaient uniquement link-local ; cela ne décrit
pas à lui seul toutes les adresses du Player.

L'[index FLOSS officiel](https://floss.freebox.fr/) consulté publie six versions
Player Delta allant de 1.0.2 à 1.5.3, pas de lien 1.5.26 ni de runtime propriétaire.
L'URL exacte freebox_player_delta/1.5.26/index.html répond 404. Ce résultat borné
ne prouve pas qu'aucun artefact n'existe ailleurs. Les sources historiques BusyBox
et Linux ne donnent pas les scripts de boot ni le code natif App de ce Player.
Sans cet artefact, aucune analyse binaire REA du firmware n'est annoncée.

Les pages officielles consultées et leur provenance sont conservées hors Git
sous .local/research/official-devialet-docs-2026-10-22/. Le relevé natif borné est
dans .local/startup-api-evidence.json. Un vrai reboot manuel a ensuite été observé, avec le résultat décrit ci-dessous.


### Reboot réel et accès aux informations de boot

Walson a déclenché un vrai redémarrage du Player, puis confirmé le retour de son
accueil. La passerelle a observé la perte de l'agent le 22 octobre à 01:46:02,
heure de Paris. Aucun appel SDK n'a été envoyé pendant la mesure. L'observateur
s'est terminé sans retour de l'agent ; le Player répondait pourtant de nouveau
sur son port HTTP. Après la confirmation de l'accueil, un lancement SDK manuel
a rétabli le relais. Cela établit que le relais de développement actuel ne
reprend pas automatiquement sur ce firmware après ce reboot.

Une sonde supplémentaire --boot-layout a ensuite tenté des lectures en mémoire
de quatre chemins fixes : /proc/self/status, /proc/version, /etc/inittab et
/etc/os-release. Elle ne transmet que des résumés bornés (UID/GID, version noyau,
exécutables init, identifiant OS), jamais les fichiers bruts, réglages ou données
utilisateur. Les quatre lectures ont renvoyé readable=false. Ce résultat ne
permet pas de distinguer une restriction du moteur d'une absence de ces chemins.
Aucune écriture de fichier ou de configuration système n'a été tentée.

Le serveur temporaire s'est fermé et le relais permanent a été relancé. Une
nouvelle observation Freebox v7, âgée de 1,5 seconde, a confirmé sa restauration.
Le relevé borné de cette sonde est conservé dans .local/boot-layout-evidence.json.

Le blocage restant est l'absence de mécanisme persistant démontré et d'accès aux
informations natives de démarrage avec les interfaces disponibles. Une reconnexion
WSS et le redémarrage automatique du conteneur serveur ne résolvent pas l'absence
de processus agent après le boot du Player. La suite utile exige une preuve sur
le runtime natif exact ou un mécanisme d'installation/lancement système établi ;
aucune impossibilité absolue du firmware n'est affirmée.
