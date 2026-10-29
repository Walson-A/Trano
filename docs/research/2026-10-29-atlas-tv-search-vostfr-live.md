# Atlas TV — Recherche validée et VOSTFR par défaut

Walson a validé la composition à six grandes affiches et l’en-tête compact.
Le loader réel active maintenant ce mode, avec les mêmes filtres et la même
pagination. Les captures de référence restent dans la
[revue du vrai QML](2026-10-29-atlas-tv-search-compact/review.html).

## Langue initiale

Le héros conserve les coordonnées et le numéro de reprise fournis par le backend,
mais demande la VOSTFR. Il copie `a_lancer` avant de modifier `vf`, sans changer
le DTO du catalogue. Une disponibilité `franime.vf` ne devient plus un choix VF.

Une nouvelle fiche commence aussi en VOSTFR. La sélection explicite de la VF
reste possible ; elle est transmise telle quelle au lecteur. Les menus du
lecteur et son passage à l’épisode suivant conservent la langue choisie. Aucun
réglage PC/mobile, historique personnel ou repli interlangue n’est ajouté.

Le banc de l’hôte contrôle la reprise à l’épisode 13 en VO, l’immutabilité du
DTO, la disponibilité VF sans choix automatique, le défaut de la fiche et un
lancement VF explicite. Son API et son décodeur sont simulés : ce contrôle ne
prétend pas observer une lecture native sur la TV.

## Livraison

La composition est préparée pour publication après intégration du lot HLS de
l’autre chat. Les identifiants et contrôles de la livraison serveur seront
consignés ici après publication. Les actions Ma liste, notes et métadonnées de
diffusion restent des lots distincts décrits dans le [suivi](../atlas-tv-todo.md).
