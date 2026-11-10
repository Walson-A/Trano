# Atlas TV : Top 10, note sans avis, position envoyée — 10 novembre 2026

Trois demandes de Walson, après la [passe de parité](2026-11-09-atlas-tv-parite.md).

## Note visible, avis jamais

Décision : **la note s'affiche sur la TV, l'avis écrit non.** L'engine retire déjà
`moi.avis` de toutes les réponses TV (`library::private_text_out`, inchangé). Côté
QML, le chemin d'affichage ajouté le 9 novembre est retiré de « Mon suivi » : il n'y a
plus aucun endroit où un avis pourrait apparaître, même si une réponse le portait.

La note est visible :

- sur la fiche, bouton « Ta note · 8 » (inchangé) ;
- dans « Mon suivi », en grand ;
- **dans Ma liste**, en pastille « ★ 7,2 » sur chaque affiche notée, lisible sans
  focus (avant, seulement dans la ligne d'état de l'affiche ciblée).

Le banc vérifie que la note est dans le bouton de la fiche, que la pastille existe dans
Ma liste, et qu'aucun texte visible de l'écran ne contient l'avis d'une entrée qui en
porte un.

## Le Top 10 du moment

Repris de l'accueil LifeOS (`LifeOS/docs/animes-ui.md`, `CarteAnime` forme `top10`) :
le rang en très grand, l'affiche portrait devant. Ce que la TV change pour le canapé :

- **taille** : chiffre de 200 px pour une affiche de 134 × 200, au lieu de 150 px pour
  150 de large sur PC ; à 3 m, le rang se lit avant le titre ;
- **contour épais** (≈ 3 px, copies décalées du chiffre : `Text.Outline` n'en fait qu'un),
  intérieur couleur du fond comme sur le PC ; gris au repos, **blanc au focus** — le
  rang suit le focus comme l'affiche ;
- le chiffre passe **12 px** sous l'affiche (`-mr-3` du PC) ; « 10 » a sa case élargie
  (214 au lieu de 150, comme 150/92 sur le PC) et seul il se resserre ;
- la rangée défile à la croix comme les autres, le héros suit l'animé ciblé, et ses dix
  cartes sont toutes créées pour que la dixième se cale exactement au bord droit ;
- les affiches sont demandées au cache d'illustrations (`posterWanted` → `artworks.request`).

La rangée est celle que `catalog/home` compose déjà (`id`/`forme` `top10`,
`anime/ecrans.rs`) : aucun changement engine.

## Démarrer à une position envoyée

« Envoyer sur la TV » en plein épisode, depuis le PC ou le téléphone, passe par les
intentions de lecture. Le contrat est côté engine (`2f90c747`,
`Atlas/engine/docs/anime.md` § « Envoyer sur la TV, en pleine lecture ») :
`selection.position_ms` devient **`intent.start_ms`** dans `/tv/v1/launch-intents/next`.
C'est un entier, au plus 12 h, et il est **absent** quand il n'y a pas de position.

Ce que fait la TV :

- présent, il **passe avant `media_resume`**, qui peut avoir jusqu'à 10 s de retard. La TV
  démarre l'épisode exactement là (`resumeOverride` de `launchRequested`/`resolvePlayback`) ;
- si ce même épisode, dans la même version, joue déjà sur la TV, elle **saute** à la position
  (écart > 3 s) sans rouvrir de flux, puis acquitte ;
- absent (ou `null`, toléré), rien ne change : la reprise vient de `media_resume` ;
- négatif, décimal ou au-delà de 12 h : l'intention est refusée comme invalide.

Le premier récepteur, publié le 10 novembre sous le nom provisoire `position_ms`, attendait le
contrat. Il lit `start_ms` depuis `hero-envoi-*`.

Le banc conversation le vérifie. Pour le même épisode, la TV saute en place sans nouveau flux.
Pour un autre épisode, elle résout puis démarre à 421 000 ms, alors que le faux API propose une
reprise à 120 000 ms.

## L'accueil mis à plat (engine `743fa4c0`)

L'engine change les rangées de `anime/accueil` (donc de `catalog/home`) pour les trois écrans :
règles dans `Atlas/engine/docs/anime.md` § rangées. La TV garde son ordre : « À reprendre »
d'abord, puis « À la une » (le héros), puis les rangées de l'engine dans leur ordre.

- **« +N » sur les cartes de Reprendre** : `nouveaux` (épisodes sortis et pas vus d'une série
  encore diffusée) en pastille blanche en haut à droite de l'image, 18 px gras, lisible à 3 m.
  Reprendre accueille aussi les séries en pause ; la rangée `nouveaux` n'existe plus.
- **« Sortis cette semaine »** (`sortis`) : chaque carte porte `sortie {episode, le}` (`le` en
  secondes) ; sous le titre, « Ép. 7 · il y a 2 h », « hier », « il y a 3 j ».
- **Lancer sans Franime** : une carte de Reprendre sans `a_lancer` (Franime n'a pas l'épisode)
  se lance par `anilist_id` et **`moi.progression + 1`**, plus par l'épisode 1. Le bouton du héros
  dit « Reprendre · Ép. 6 » et la carte « Épisode 6 ». Une entrée terminée, ou dont la
  progression atteint le total connu, garde le départ à l'épisode 1. La fiche le faisait déjà.
- `ajouts`, `populaires` et `deja_vus` disparaissent sans code : la TV affiche les rangées
  qu'on lui donne.

Banc `--parity` (scénarios 1c et 1d) : l'accueil du banc est converti à la nouvelle forme
(`nouveaux` fondue dans Reprendre, carte en pause sans `a_lancer` à la progression 5, `sortis`
après le Top 10), puis vérifiés : pastille « +3 », sous-titre « Épisode 6 », cible
`{numero: 6}`, bouton « Reprendre · Ép. 6 », ordre des rangées, quatre libellés de sortie.
Captures `avant-reprendre-nouveaux`, `apres-reprendre-nouveaux`, `avant-sortis`, `apres-sortis`
(les cartes de Sortis n'ont pas d'images au banc : ses fixtures n'en ont pas pour ces titres).

## Publication — 10 novembre 2026, sur accord de Walson

Paquet `hero-top10-a3032f0` (43 fichiers, 467 467 octets), construit depuis `a3032f0`,
empreintes comparées sur le serveur, puis `publish-atlas-tv-ui.py` (attendu
`hero-parite-36023f9`, gateway inchangé `bdb1dd1b…`). Contrôle public : release active,
`preferences: true`, `Top10Card.qml` présent. Mémoire du serveur à 8 Go disponibles avant
et après, VM `haos` en marche. Rien n'a été lancé sur le Player.

**Accueil mis à plat publié le même jour**, sur accord de Walson : paquet `hero-accueil-8623e87`
(43 fichiers, 469 942 octets, depuis `8623e87`, qui contient aussi `0f472fa` des versions),
attendu `hero-versions-lancement-0f472fa`, gateway inchangé `bdb1dd1b…`, engine `743fa4c0`
noté comme backend. Contrôle public : release active, `preferences: true`. 9 Go disponibles
avant et après, VM `haos` en marche ; un déploiement engine (`919baafd`) compilait alors sur le
runner GitHub, pas sur le serveur. Rien n'a été lancé sur le Player.

**Lecture de `start_ms` publiée le même jour**, sur accord de Walson : paquet
`hero-envoi-5ad6090` (43 fichiers, 469 887 octets), attendu `hero-accueil-8623e87`, gateway
inchangé `bdb1dd1b…`, engine `aca4d2f8` (contient le contrat `2f90c747`). Contrôle public :
release active. 8 à 9 Go disponibles, VM `haos` en marche. Rien n'a été lancé sur le Player.

## Banc

Le banc complet échouait par moments, base comprise : le diagnostic montre
`activeFocusItem` nul au moment de la touche — une autre fenêtre du PC prenait
l'activation et la touche simulée partait dans le vide. `test-atlas-tv-live.py`
réactive désormais la fenêtre avant chaque touche simulée.

Captures dans [`2026-11-10-atlas-tv-top10-note-position/`](2026-11-10-atlas-tv-top10-note-position/) :
`avant-top10` (`c638f73`, cartes paysage sans rang), `apres-top10`, `apres-top10-dix`,
`apres-ma-liste-notes`, `apres-mon-suivi-sans-avis`. Affiches du banc :
`--poster-assets` (affiches AniList locales).
