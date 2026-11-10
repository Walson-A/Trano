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

« Envoyer vers la TV » en plein épisode, depuis le PC ou le téléphone, passera par les
intentions de lecture (`/tv/v1/launch-intents/next`). **Champ attendu : `position_ms`**,
entier facultatif, de 0 à 86 400 000, à côté de `anilist_id`, `episode` et `lang`.

- présent, il **passe avant `media_resume`** : la TV démarre l'épisode exactement là ;
- si ce même épisode joue déjà sur la TV, elle **saute** à la position (écart > 3 s) sans
  rouvrir de flux ;
- absent ou `null`, rien ne change (reprise de `media_resume`) ;
- négatif, décimal ou au-delà de 24 h : l'intention est refusée comme invalide.

Le banc conversation le vérifie : même épisode → saut en place, sans nouveau flux ;
autre épisode → résolution puis départ à 421 000 ms alors que le faux API propose
120 000 ms. Côté engine, l'intention ne porte pas encore ce champ : le contrat reste à
écrire par la session PC (`Atlas/engine/docs/atlas-tv.md` § conversation).

## Banc

Le banc complet échouait par moments, base comprise : le diagnostic montre
`activeFocusItem` nul au moment de la touche — une autre fenêtre du PC prenait
l'activation et la touche simulée partait dans le vide. `test-atlas-tv-live.py`
réactive désormais la fenêtre avant chaque touche simulée.

Captures dans [`2026-11-10-atlas-tv-top10-note-position/`](2026-11-10-atlas-tv-top10-note-position/) :
`avant-top10` (`c638f73`, cartes paysage sans rang), `apres-top10`, `apres-top10-dix`,
`apres-ma-liste-notes`, `apres-mon-suivi-sans-avis`. Affiches du banc :
`--poster-assets` (affiches AniList locales).
