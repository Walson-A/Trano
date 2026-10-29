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

Le paquet `hero-discovery-bea83d08cae6` est publié : 30 fichiers, 315 286 octets.
Il compose le visuel approuvé, le défaut VOSTFR et le [raccord HLS](2026-10-29-atlas-tv-hls.md).
Le manifeste des fichiers et le commit source produit `6a061c9419e12038561cfe4cad43cb308b732e4f`
sont dans [package.json](2026-10-29-atlas-tv-search-vostfr-live/package.json).

Lors du contrôle de publication, l’engine exécute `39b06f89da3799951eb6bdf8e6f24327fdab0904`,
descendant du backend HLS `5b5ac6c3`. Le gateway conserve son SHA-256
`4883e4c50e0e37344e18a8df5584abf1f71cde3fae214ded049cd56ff7434462`.
Le [reçu de publication](2026-10-29-atlas-tv-search-vostfr-live/publication.json)
confirme la disponibilité et la carte complète des hashes. L’engine n’a pas été
redémarré. Le contrôle indépendant de l’autre chat retrouve ces 30 hashes et
la capacité HLS, avec le même EpisodePlayer que celui testé nativement.

Le [lancement](2026-10-29-atlas-tv-search-vostfr-live/launch.json) a été accepté
par le SDK ; le Player a demandé les nouveaux QML, scripts et polices.
Ce reçu ne constitue pas une capture physique de cette nouvelle composition.
Aucun épisode ni progrès de visionnage n’a été déclenché par ce lancement.

## Contrôles et revue

- L’hôte complet passe [avec HLS](2026-10-29-atlas-tv-search-vostfr-live/verification-hls.json)
  et [sans cette capacité](2026-10-29-atlas-tv-search-vostfr-live/verification-legacy.json).
  Les requêtes négocient HLS uniquement lorsqu’il est annoncé ; la langue
  initiale reste VO et le choix VF explicite passe aussi.
- Le contrôle complémentaire vérifie que le vrai loader active six colonnes.
  La [capture Recherche](2026-10-29-atlas-tv-search-vostfr-live/search.png) montre
  quatre titres, car cette réponse simulée en contient quatre ; la géométrie
  reste à six colonnes. Le [banc découverte](2026-10-29-atlas-tv-search-compact/review.html)
  conserve le catalogue de démonstration plus rempli déjà validé.
- La [fiche à l’ouverture](2026-10-29-atlas-tv-search-vostfr-live/detail-default-vostfr.png)
  affiche VOSTFR et la langue sélectionnée. La
  [fiche après choix explicite VF](2026-10-29-atlas-tv-search-vostfr-live/detail-top.png)
  confirme que cette option reste disponible. Cadrage, actions et affiches sont
  conservés ; ce lot ne redessine pas les cartes d’épisodes.
- La [session réelle](2026-10-29-atlas-tv-search-vostfr-live/verification-session.json)
  passe ses sept requêtes HTTP jetables : rotation concurrente unique, runtime
  non fiable rejeté, chemins média fermés. Aucun compte n’est utilisé.

Un passage supplémentaire du banc a échoué lors d’une pause envoyée juste après
un changement de qualité. L’attente ne contrôlait que le nouvel identifiant et
Playing ; elle attend désormais aussi la reprise restaurée et la fin du changement,
comme les autres parcours transactionnels. Le passage suivant réussit, avec
diagnostics d’état ajoutés à l’assertion. Aucun défaut natif ni correction du
lecteur produit n’est déduit de cet échec du banc.

Les fichiers de préparation et les exports intermédiaires de ce lot sont retirés
après conservation des preuves. Le paquet serveur actif et son backup de retour
arrière restent en place ([contrôle](2026-10-29-atlas-tv-search-vostfr-live/cleanup.json)).
Le worktree partagé feat/local-network est conservé
pour les prochains lots et ses deux travaux non suivis préexistants ; les caches
communs d’affiches, de polices et du runtime Qt ne sont pas supprimés.

Les actions Ma liste, notes et métadonnées de diffusion restent des lots distincts
décrits dans le [suivi](../atlas-tv-todo.md), avec un contrat backend à préparer.
