# Menu Épisodes : retrouver sa place et les épisodes vus

## Demande et contrat

Pendant Classroom of the Elite, Walson demande de reconnaître les épisodes
déjà vus et d’ouvrir le menu sur l’épisode en cours, plutôt qu’au début de la
saison. Walson reporte d’abord l’essai : le travail reste alors local. Après
les tests, il demande explicitement de publier et redémarrer immédiatement ;
la publication peut donc reprendre. Aucun épisode réel n’est lancé par le banc.

Le menu lit déjà le numéro de lecture canonique et le champ `vu` fourni par
`/tv/v1/catalog/episodes`. Aucun nouvel accès serveur ni contrat backend n’est
nécessaire. Un numéro inférieur à l’épisode courant ne prouve pas qu’il a été vu.
Le badge apparaît seulement pour `vu === true`, jamais sur un épisode à venir.
Un indicateur absent ou faux reste sans badge. L’épisode courant garde son
bandeau « En lecture » et sa progression réelle ; un épisode déjà vu porte
« ✓ Vu » et un trait de complétion discret. Une relecture peut porter les deux
informations. Aucun visionnage n’est enregistré par l’ouverture du menu.

## Défilement et chargement

L’ancienne liste demandait de contenir la carte suivante et ne garantissait
pas le centrage après apparition ou reconstruction du modèle. Elle demande
maintenant de centrer la carte sélectionnée, après changement de sélection,
modèle, nombre de cartes, visibilité ou largeur. La sélection du numéro courant
est fixée avant la publication des lignes, ce qui évite de précharger d’abord
les premières vignettes d’une saison quand l’épisode courant est éloigné.

L’ouverture calcule toujours la bonne page de 40 épisodes ; le bouton
« En lecture » et la réouverture reviennent au numéro courant. Naviguer dans
le menu ne relance pas le flux et ne modifie pas sa position. Le comportement
de Retour, les choix de langue/source/qualité et le lecteur vidéo sont conservés.

## Vérification

Le banc utilise les vrais composants QML avec une API et un décodeur simulés.
Une fixture explicitement synthétique de 85 épisodes couvre l’épisode 11,
l’épisode 53 sur la deuxième page, des états vus vrais/faux/absents, le
rafraîchissement de métadonnées et d’images, la réouverture et le retour à la
lecture courante. Elle ne modifie aucun compte et n’est jamais distribuée.

La capture avant utilise les deux composants exacts du commit `642241f`.
L’écart au centre observé pour l’épisode 11 est de 157 px dans ce scénario ;
il ne reproduit pas nécessairement le retour à l’épisode 1 signalé sur la TV.
Les résultats et captures sont conservés dans `2026-10-31-atlas-tv-episode-context/`.
Les scénarios passent : écart au centre de 0 px contre 157 px avant, état vu
explicite et position de lecture conservée. La revue des captures 1280×720
confirme la lisibilité du badge, la distinction du focus et de « En lecture »
et les cartes voisines visibles. La validation physique de cette passe reste
à faire après publication.
