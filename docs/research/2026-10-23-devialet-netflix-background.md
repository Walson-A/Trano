# Devialet : relais pendant Netflix

## Résultat et portée

Le test demandé par Walson observe une perte de disponibilité du relais après
l'ouverture de Netflix sur son Devialet. Walson confirme ensuite la lecture
avec image et son. Le serveur ne reçoit pas de reprise du relais pendant la
fenêtre observée. Cette passe teste le programme actuel et une transition réelle ;
elle ne prouve pas qu'aucune forme de coexistence ne soit possible sur ce firmware.

Les mesures seules ne distinguent pas fermeture du processus, suspension,
fermeture de la connexion par le runtime ou autre cause locale. Aucun diagnostic
du processus système ni lecture de mémoire n'est effectué. Un fonctionnement
après Retour à l'accueil, observé antérieurement, ne suffisait pas à établir
ce fonctionnement pendant une application vidéo native.

## Protocole et chronologie

Le relais était déjà actif ; aucune relance SDK n'est nécessaire pour obtenir
la ligne de base. Le lecteur privé de la passerelle confirme HTTP 200 et
`devialet reachable=true`. Quatre mesures distantes successives avant Netflix
retournent des `observedAt` différents, espacés d'environ cinq secondes : les
résultats ne proviennent pas seulement d'un inventaire ancien mis en cache.

Toutes les heures suivantes sont en UTC, le 23 octobre 2026 (ajouter deux heures
pour l'heure de Paris à cette date) :

| Événement | Heure UTC | Observation |
| --- | --- | --- |
| Première mesure serveur | 01:10:33.646 | HTTP 200, observation Player 01:10:30.236 |
| Dernière mesure disponible avant Netflix | 01:10:49.139 | HTTP 200, observation Player 01:10:45.236 |
| Commande télécommande `netflix` | 01:10:50.370 | Requête HTTP 200, sans preuve visuelle par cette seule réponse |
| Première mesure indisponible | 01:10:54.141 | HTTP 503, aucune observation retournée |
| Confirmation de Walson enregistrée | 01:14:03.903 | « Netflix est en lecture, image et son OK » |
| Dernière mesure serveur | 01:20:34.850 | HTTP 503, aucune reprise observée |

La date exacte du démarrage de la vidéo n'est pas mesurée : la confirmation
de Walson atteste qu'elle est en cours au moment de son message.

La fenêtre totale dure 601,204 secondes et contient 121 mesures : quatre HTTP
200 avant la commande, puis 117 HTTP 503, sans erreur de mesure. Les 79 mesures
postérieures à l'enregistrement de la confirmation utilisateur sont toutes
HTTP 503 ; elles couvrent environ six minutes et demie après cette confirmation.
L'intervalle maximal entre deux mesures est de 5,483 secondes. Le serveur n'a
donc pas simplement conservé un état indisponible que personne n'aurait réinterrogé.

Le lecteur n'affirme pas que le Player s'est éteint : il retourne HTTP 503 si
la session agent n'est plus active ou si les observations dépassent vingt
secondes. L'indisponibilité est ici observée moins de quatre secondes après
la commande, alors que la dernière observation était récente. Cela est
compatible avec une perte de session ; ce n'est pas une attestation de mort
du processus QML. Le lecteur valide aussi la séquence croissante des inventaires.

Deux contrôles indépendants après la perte du relais bornent l'interprétation :
le service d'identité du Player répond HTTP 200, statut 101, marque Freebox ;
le conteneur `trano-lan-gateway` est `running`, démarré le 22 octobre à
01:22:46.169946477Z, avec zéro redémarrage Docker. La passerelle n'a donc pas
été recréée ou redémarrée pendant cette transition. Ces contrôles ne mesurent
pas la connexion Internet du processus QML après l'ouverture de Netflix.

## Preuves et conséquences

La surveillance interroge le lecteur privé par SSH, dans le conteneur existant,
toutes les cinq secondes. Elle enregistre seulement les dates, statuts HTTP,
présence et âge de l'observation Devialet. Aucun secret, titre de film ou contenu
Netflix n'est collecté. Aucun nouveau serveur, port exposé, conteneur ou service
permanent n'est créé.

Scripts et preuves restent hors Git dans `.local/netflix-background-20261023/` :
`monitor.py`, `open-netflix.py`, `samples.jsonl`, `launch.json` et
`user-observation.json`, ainsi que `controls.json`, `summary.json` et l'index
d'empreintes `evidence-index.json`. Le code télécommande est lu depuis le fichier privé
existant et n'est ni affiché ni ajouté aux preuves.

Le processus de surveillance et sa commande SSH terminent avec un code de sortie
nul. Netflix est laissé en lecture ; aucun ordre de retour à l'accueil ni de
relance du relais n'est envoyé après la mesure. L'état final observé du relais
est indisponible, alors que le conteneur passerelle reste en service. Les preuves
et le worktree sont conservés pour la suite ; aucun serveur temporaire ne reste
à arrêter.

Un bouton sur le téléphone pourrait encore servir au lancement manuel d'Atlas TV.
Il ne résout pas, à lui seul, la continuité d'un relais pendant Netflix. Cette
continuité et la reprise après reboot restent deux exigences indépendantes.
