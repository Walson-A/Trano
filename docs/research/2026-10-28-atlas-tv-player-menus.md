# Lecteur Atlas TV — menus attachés à la barre

## État après nouvelle revue humaine : rendu rejeté

Walson répond à la capture corrigée : « tu trouve ça assez bien? netflix ne
sortirais jamais ça ». Le socle raccordé `0785838` est testé au banc et poussé,
mais **son rendu est rejeté et le paquet n'est pas publié**. Aucun nouvel essai
SDK n'a été lancé. La présence de listes ancrées corrige une interaction,
elle ne valide pas la composition ou le niveau esthétique demandé.

Nouvelle comparaison des vraies captures du [test de lecteur Netflix de juillet
2026](https://www.whats-on-netflix.com/news/first-look-netflix-new-tv-video-player-redesign/)
avec notre QML complet : Netflix regroupe ses commandes en une rangée compacte,
avec des silhouettes distinctes et une action textuelle saillante ; notre rangée
étale quatre libellés dans des largeurs fixes. La progression Netflix est plus
présente, avec une poignée plus lisible ; notre contrôle principal reste fin
alors que les surfaces grises des réglages attirent le regard. Les menus rapides
ont maintenant le bon ancrage, mais leur traitement générique et la concurrence
de plusieurs surfaces n'établissent pas encore une hiérarchie de lecteur.

Ces observations sont une critique visuelle de ces captures, pas une règle
universelle attribuée à Netflix. Le titre-logo de Stranger Things dans la
référence participe aussi à l'identité ; cela ne justifie pas de fabriquer des
logos pour les animés. La prochaine étude doit comparer la composition complète
lecture, focus, menu et timeline avec le même contenu, avant tout nouvel essai TV.

Un parcours fonctionnel reste également ouvert avant livraison : depuis une
erreur média, proposer un autre lecteur doit rester accessible. Le code courant
limite encore ce panneau à Réessayer et conserve les choix stricts. Ne pas
présenter les tests de retry comme la validation de ce parcours alternatif.

## Correction après la revue de Walson

La [première proposition](2026-10-28-atlas-tv-player-proposal.md) séparait trop
les réglages de la lecture : son chrome disparaissait et les grands panneaux
donnaient l'impression d'une seconde fenêtre. Walson rejette explicitement ce
parcours. Cette étude n'est plus la direction à généraliser.

La barre reste maintenant visible pendant le choix. Qualité et Version ouvrent
une petite liste au-dessus de leur bouton, avec un seul focus dans la liste et
un repère sur le bouton d'origine. Source/lecteur utilise une liste unique :
automatique global, automatique par site et lecteurs identifiés par leur site.
Épisodes garde saison et total au-dessus d'une liste défilante.
Le volume reste exclusivement celui du Devialet. Aucun contrôle ±10 n'est ajouté.

La timeline distingue le temps joué du curseur proposé. Gauche/Droite déplace
ce curseur ; OK confirme, Retour annule. OK sans déplacement pause/reprend, avec
retour visuel centré. Haut rejoint les actions depuis la timeline ; les menus
se ferment par Retour sans fermer l'épisode.

## Raccordement réel du contrôleur

`PlayerMenu.qml` consomme les routes `/tv/v1/readers` et `/tv/v1/variants`,
uniquement quand le runtime annonce leurs capacités. Les réponses doivent
correspondre à l'identité, l'épisode, la langue et, pour les variantes, au
site/lecteur demandés. Les listes bornées ne contiennent que les identifiants
opaques et les libellés ; aucune URL fournisseur ne quitte le serveur.

Le menu ne code aucune résolution en dur : les définitions affichées viennent
du catalogue courant. Le backend `b6df239c`, dont la conversation backend a
vérifié le processus et le workflow `40752982686`, expose ces choix. Elle a
également sondé les deux familles Mob 21507/3 VF (YourUpload Originale) et Eden
5630/2 VF (Mail.ru, 360p explicitement), sans SDK ni progression. Ces sondes
ne valident pas l'interface ou le décodage natif du présent paquet.

Le remplacement est transactionnel : conserver la vidéo pendant le POST de
préparation ; en cas de succès, signaler l'arrêt de l'ancienne session sous
son identité, puis installer le nouveau flux et remettre sa séquence à zéro.
Pour la même identité/épisode, lire la position et l'intention pause/lecture
au moment du remplacement. Un autre épisode utilise sa reprise serveur.
Annulation, réponse tardive ou échec laisse le flux précédent en place.

Vérification complémentaire par la conversation backend dans `playback.rs`
sur `b6df239c` : enregistrer une session préparée ne modifie pas `media_resume`.
Seul un événement valide hors `error` prend la main selon l'ordre des sessions.
Une préparation annulée sans progression ne bloque donc pas la sauvegarde du
flux ancien. Cette lecture du prédicat n'est pas présentée comme un nouveau
test natif ou un test dédié d'annulation côté engine.

Un choix explicite reste strict. Après erreur média, Réessayer conserve
site/reader/variant avec `force_refresh:true` et n'exclut pas ce lecteur.
En automatique, un HEAD 401 renouvelle le ticket sans accuser le fournisseur ;
seul un ticket encore valide ou une erreur upstream confirmée peut ajouter
le lecteur échoué aux exclusions. Position zéro et huit exclusions récentes
restent pris en compte. Pas de boucle de relance automatique du SDK.

## Revue du vrai composant dans l'app complète

- [Barre](2026-10-28-atlas-tv-player-menus/episode-controls.png)
- [Focus des actions](2026-10-28-atlas-tv-player-menus/player-focus.png)
- [Timeline](2026-10-28-atlas-tv-player-menus/player-timeline.png)
- [Qualité ancrée](2026-10-28-atlas-tv-player-menus/player-quality.png)
- [Qualité indisponible et réessai](2026-10-28-atlas-tv-player-menus/player-quality-error.png)
- [Source/lecteur](2026-10-28-atlas-tv-player-menus/player-source.png)
- [Version](2026-10-28-atlas-tv-player-menus/player-version.png)
- [Épisodes](2026-10-28-atlas-tv-player-menus/player-episodes.png)

Ce sont les composants du paquet complet, à 1280×720 sur Qt Quick 5.15.2 PC.
API et décodeur sont simulés explicitement ; le fond reste une image de notre
bande-annonce de test. Les options 360p/1080p de ce banc sont des fixtures de
contrat, pas une disponibilité annoncée sur l'épisode affiché.

Les listes ont une hauteur de lignes entière pour éviter les textes coupés.
La barre ne cède plus son focus à un deuxième bouton pendant qu'une option
est ciblée. Les contrôles de cette barre répondent immédiatement au clavier,
sans transition de couleur qui rendrait le texte momentanément illisible.
Le titre seul s'efface pendant le menu pour ne pas passer sous les options ;
les actions et la timeline restent visibles. Après validation/annulation du
curseur, la lecture retrouve son masquage automatique sans Retour supplémentaire.
Pas d'effet de flou du décodeur revendiqué à partir d'une capture fixe.

## Vérifications et limites

Le banc complet `test-atlas-tv-live.py` vérifie : pause après seek ; curseur
non appliqué avant OK ; annulation ; préparation retardée et réponse tardive
ignorée ; source/reader/variant stricts ; maintien de l'ancien flux après
échec ; qualité et version changées en pause à position conservée ; même
épisode refermant le menu sans POST ; parcours des saisons sans quitter la
vidéo ; absence de capacité donnant un état indisponible ; retries stricts
sur HEAD 401/200 ; puis les régressions recherche/profil/fiche et Retour.
[Résultat du banc](2026-10-28-atlas-tv-player-menus/verification.json).

`test-atlas-tv-session.py` passe aussi : sept requêtes HTTP locales, rotation
unique pour deux appels concurrents, runtime non fiable rejeté, chemins média
fermés et HEAD sans Bearer ; un ticket 401 n'efface pas la session appareil.
`git diff --check` est exécuté avant commit.

La correction de disposition est montrée à Walson avant lancement TV. Ce lot
n'est pas encore publié au moment de cette note. La pause/reprise, le seek
réel, les changements de flux et leur rendu sur le Devialet restent à vérifier
avec lui. La cause exacte du 502 historique n'est pas établie ; la récupération
testée ne promet pas la disponibilité future de tous les fournisseurs.
