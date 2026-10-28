# Héros Atlas TV : raccordement au serveur

## État du 28 octobre

`hero/live.qml` consomme le contrat média préparé par la conversation backend
Atlas. `player.qml` reste le banc visuel, avec entrées explicites. Les tests
locaux Qt 5.15.2 passent ; ils ne certifient ni la lecture native Qt 5.15.19,
ni le lancement iPhone PC éteint, ni la publication de ce paquet. La livraison
serveur et sa validation matérielle doivent être relevées séparément.

## Parcours et droits

Le téléphone prépare `/tv/v1/app/launches` et transmet la commande SDK au Player.
Le Player télécharge `runtime.json` à côté du manifeste. `TvSession.qml` exige
la même origine HTTPS que le paquet, consomme une fois `activation.code` sur
`/tv/v1/session/activate`, puis conserve les seuls jetons TV en mémoire.
Aucune clé engine, aucun JWT propriétaire ou compte dans le paquet. Le
renouvellement via `/tv/v1/session/refresh` est unique pour les appels concurrents.
Une réponse de rotation perdue impose un nouveau lancement depuis le téléphone,
sans réutiliser automatiquement le refresh consommé.

- `catalog/home` et `home-extras` : DTO Atlas existants, sans catalogue embarqué.
- `previews` : identité AniList sélectionnée ; identité YouTube retournée
  vérifiée ; chemin fermé `/tv/v1/preview-media/:ticket` de la même origine.
  Une réponse tardive ne change pas la sélection. Refus : image conservée,
  nouvel essai espacé d'une minute. Cache mémoire borné à seize entrées.
- `playbacks` : numéro canonique `a_lancer.numero`, jamais la coordonnée
  fournisseur `a_lancer.episode`. Sans reprise, une carte AniList commence
  à l'épisode 1. Franime sans identité AniList reste explicitement indisponible.
  Le lecteur accepte `stream.path` sous `/tv/v1/episode-media/:ticket`, aucune
  URL fournisseur arbitraire. Busy/erreur ne relance pas automatiquement le SDK.
- `playbacks/:id/progress` : séquence croissante, uniquement après position
  vidéo réelle ; ensuite toutes les quinze secondes et après pause, seek,
  arrêt, fin ou erreur. Le backend décide de la persistance et du seuil à 80 %.
  Les tests de ce lot n'envoient rien au compte AniList.

Le lecteur applique la reprise temporelle et affiche titre, temps courant,
durée et barre. OK : pause/reprise ; Gauche/Droite : 10 secondes ; Retour :
héros. Contrôles masqués après quatre secondes de lecture. Fin et erreur
explicites. La fiche complète, les pistes/sous-titres et le choix manuel du
lecteur restent hors de ce lot. Une résolution peut durer plusieurs dizaines
de secondes ; un refus YouTube ou hébergeur reste possible.

## Distribution

`package-atlas-tv-hero.py` fabrique un dossier neuf, sans réseau ni secret.
Les deux polices sont des entrées explicites ; leurs licences sont incluses.
Les quatre SVG existants sont aplatis en `icon-*.svg`, avec adaptation de leur
seule référence dans la copie de `Icon.qml`. Le manifeste de sortie vise
`live.qml`, avec `qmldir` et tous les composants. Pas de snapshot ni vidéo du
banc. Le gateway conserve son allowlist plate.

Le bootstrap expire après dix minutes. Le lecteur et le composant de preview
sont donc chargés au démarrage et gardés en mémoire pendant un épisode.
Les tickets média et jetons TV ont leur propre durée. Ce lot ne change pas
la destruction du runtime par Netflix et ne promet aucun relais permanent.

## Vérifications et revue

- `test-atlas-tv-session.py` : vrai contrôleur QML et HTTP jetable, faux jetons ;
  home authentifié, une seule rotation pour deux appels concurrents, refus d'un
  runtime HTTP avant activation, chemins média fermés.
- `test-atlas-tv-live.py` : vrais composants/hôte/lecteur, API et décodeur
  explicitement simulés ; épisode canonique 13/VF, reprise 2:00, pause,
  avance 2:10, retour au héros, séquences et réponse tardive de bande-annonce.
- Banc historique : huit captures, reprise, mouvement interrompable et retour
  à la première carte sans appui supplémentaire. `git diff --check`.

Captures examinées : [contrôles](2026-10-28-atlas-tv-live/episode-controls.png),
[héros après Retour](2026-10-28-atlas-tv-live/hero-return.png),
[résultats](2026-10-28-atlas-tv-live/verification.json). Le noir derrière les
contrôles est le décodeur simulé, pas une preuve de vidéo native. La composition
et le focus du héros sont conservés ; le rendu n'est pas déclaré final.

```powershell
python -B packages/lan/scripts/test-atlas-tv-session.py --qt-path <PyQt5-local>
python -B packages/lan/scripts/test-atlas-tv-live.py --qt-path <PyQt5-local> --snapshot <accueil-PC.json> --assets <images> --regular <regular.ttf> --bold <bold.ttf> --evidence <dossier-neuf>
python -B packages/lan/scripts/package-atlas-tv-hero.py --output <paquet-neuf> --regular <regular.ttf> --bold <bold.ttf>
```

## Espace disque

C: a atteint zéro octet libre. Une seule copie dérivée de notre recherche,
`.local/research/native-20261022/userland-inputs/bank1-rootfs.bin`, a été retirée
après comparaison intégrale à l'image originale conservée
`image-fbx7hd_bank1_1.5.26` : offset 6 029 312, longueur 131 276 800,
SHA-256 `d7f0f135f417a1099f01a39e03188d2f08a14184f18e68b853b0b97d4a5642ef`.
Elle se reconstruit par extraction de cette plage. Original et preuves conservés ;
aucun fichier d'une autre conversation supprimé par ce travail.
