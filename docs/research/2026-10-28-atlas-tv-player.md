# Atlas TV — lecture native et contrôles adaptés du PC

## Symptôme et expérience discriminante

Dans `hero-c85c2ae`, Walson entend Mob Psycho 100 et Eden of the East sans
image, et signale une reprise après pause défaillante. Les résolutions et
durées positives ne sont donc pas une preuve de rendu.

La conversation backend compare trois fichiers : Mob 21507/3 VF (H.264 Main
4.0 1080p, MP3), Eden 5630/2 VF (H.264 High 3.1 720p, AAC) et la VO précédemment
validée 114535/1 (H.264 High 4.0 1080p, AAC). Les frames se décodent sur PC,
les Range répondent correctement. Cela ne certifie pas le décodeur Freebox.
Preuve backend : commit Atlas `883aaa25`, puis confirmation humaine documentée
dans `4da17d6c`, `docs/research/atlas-tv-native-codecs-2026-10-28.md`.

Un premier paquet sans Hero/Trailer reçoit HTTP 502 pour Mob : aucun flux
démarré, donc aucune conclusion sur son rendu. Le second, avec Eden 5630/2 VF,
résout HTTP 200 et joue avec une durée native de 1 352 351 ms. **Walson confirme
image et son.** Deux commandes +10 s et une pause apparaissent dans les traces,
mais il ne valide pas visuellement les sauts ou la reprise.

Sources et traces : [hôte isolé](2026-10-28-atlas-tv-player/single-player.qml),
[échec Mob](2026-10-28-atlas-tv-player/native-single-mob.json),
[lecture Eden](2026-10-28-atlas-tv-player/native-single-eden.json).
L’essai isolé s’arrête après 45 s et ne relie aucun événement `progress` à
l’API : pas d’écriture de visionnage. Les credentials restent limités au
runtime TV, sans clé propriétaire sur le Player ni URL source journalisée.

## Sorties exclusives et intentions du lecteur

L’hôte complet conservait deux objets VideoOutput, même après arrêt de la
preview. C’est un candidat au conflit de rendu ; l’essai isolé ne prouve pas
à lui seul cette cause (il retire aussi le reste du montage visuel).
Chaque lecteur conserve maintenant son composant préchargé mais instancie
sa sortie vidéo seulement pendant la présence d’une source. Stop vide cette
source et détruit sa sortie. Le banc commence avec une preview effective,
ouvre un épisode, vérifie une seule sortie épisode et aucune preview, puis
vérifie la libération de la sortie épisode à la fermeture. La disponibilité
après expiration du ticket de fichiers ne dépend pas d’une nouvelle requête
de composant : les factories sont définies dans les QML déjà chargés.

Le temps annoncé, le temps demandé et l’intention Lecture/Pause sont séparés,
comme dans `ObyPlayer.tsx`. Un groupe d’appuis de seek est fusionné sur 220 ms,
avec position cible visible ; la barre principale reste sur la position
rapportée. Une pause pendant le rechargement du seek ne change pas l’intention
de lecture : après Buffered, une reprise bornée est appliquée si nécessaire.
Une pause explicitement demandée reste une pause. Le chargement initial attend
toujours une durée positive avant d’appliquer la reprise temporelle.

## Adaptation du lecteur Atlas PC

Sources examinées : `LifeOS/src/components/player/ObyPlayer.tsx` (chrome,
transport, intentions), `MenuBarre.tsx`, `PlayerRemote.tsx`, banc
`mainLecteur.tsx` et `LifeOS/docs/oby-player-system.md`. Aucun code LifeOS changé.

`PlayerControls.qml` reprend titre, timeline, temps/durée, lecture/pause,
sauts 10 s, volume/mute et menu de vitesse. L’accès Épisodes restitue la fiche.
Les consignes permanentes de touches sont retirées. La barre disparaît après
2,5 s de lecture sans interaction et reste affichée pendant pause/menu/focus.
Les icônes sont celles de Lucide 0.575.0 déjà utilisées sur PC, exportées en PNG
intégrés au paquet avec la licence existante, sans glyphes dépendants des fontes.

La télécommande garde OK et Gauche/Droite pour les gestes directs ; Haut
rejoint la barre, les flèches choisissent un contrôle. Le menu de vitesse
reste ouvert jusqu’au choix/Retour. Les vitesses utilisent la propriété Qt
`playbackRate` disponible dans le SDK ; leur effet natif reste à confirmer.

Les variantes de qualité/hébergeur et pistes séparées du lecteur PC ne sont
pas exposées par le contrat TV courant. Pas de menu factice. Le suivant/
précédent entre saisons et l’enchaînement restent aussi à raccorder proprement.
La TV est déjà plein écran ; l’incrustation desktop n’est pas portée.

## Retours de navigation pris en compte

L’en-tête `TvNavigation.qml` est désormais **le même composant** sur Accueil,
Recherche et Profil ; il ne se transforme plus en bouton Retour à l’ouverture
de Recherche. Page active et focus restent distincts. Le total d’épisodes est
visible dans le titre de la section. Après le retour de Walson, Retour revient
directement à la fiche/saison précédente, au lieu de remonter dans la même
page. La confirmation de sortie avec Rester par défaut est conservée.

## Revue et limites

[Lecteur](2026-10-28-atlas-tv-player/controls.png),
[vitesse](2026-10-28-atlas-tv-player/speed.png),
[recherche](2026-10-28-atlas-tv-player/search.png),
[fiche](2026-10-28-atlas-tv-player/detail.png).
Ces captures proviennent des vrais composants avec API/décodeur simulés ;
le fond vidéo est une image extraite explicitement de notre bande-annonce de
test, pas une vidéo décodée ni une assertion sur l’épisode affiché. Elles
permettent de juger le contraste et les menus, pas le rendu natif.

Le banc simule un seek qui passe en pause/Stalled avant Buffered, vérifie la
reprise de l’intention, la fusion de deux +10 s en une cible +20 s, une pause
qui reste une pause, le menu 1,5×, les sorties exclusives et leur libération.
Il vérifie aussi les gestes réels de changement de saison/Retour et le passage
Recherche → Profil → Accueil dans l’en-tête commun. Les sessions et restrictions
de transport restent celles du contrôleur existant.

Reste à vérifier sur l’hôte complet : image/son avec les sorties exclusives,
pause/reprise, position réelle après seek et vitesse. Le succès du single-player
n’est pas présenté comme une validation de cette correction ou du design final.
