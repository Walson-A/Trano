# Accueil Atlas TV : héros et exploration des rangées

## Périmètre et état de livraison

Walson choisit « L’accueil et ses rangées » pour cette passe, après validation
du retrait de Ma liste et du haut de l’écran. La proposition modifie les vrais
composants QML, avec une revue avant publication sur le Devialet. Elle ne change
pas le lecteur, les routes backend ni le lancement depuis le téléphone.

**Proposition acceptée puis publiée** dans hero-detail-preview-390d8b68e685,
avec les [bandes-annonces de fiche](2026-10-30-atlas-tv-detail-previews.md).
Walson précise et accepte le mode compact uniquement pendant la navigation,
avec grand héros et bande-annonce à l’arrivée. La réception native de ce paquet
reste distincte. Les captures utilisent un
instantané explicite du banc PC, des images locales et aucune lecture vidéo.
Les visuels absents du cache du banc sont présentés comme indisponibles ; ce
résultat ne diagnostique pas le service d’images en production.

## Constat et décision

Le héros gardait tout le haut de l’écran pendant l’exploration : à 720p, une
rangée complète et le début des images de la suivante étaient visibles. La
sélection dans une ligne inactive gardait aussi un contour, ce qui devient
ambigu dès que deux lignes sont entièrement exposées.

Le grand héros est conservé à l’arrivée et pour Lecture/Plus d’infos. En entrant
dans les cartes, le titre et les métadonnées deviennent le contexte compact
de l’œuvre ciblée ; le synopsis, les actions et la commande sonore se retrouvent
en remontant vers les actions. Le viewport des rangées commence à 222 au lieu
de 380, avec 498 unités de hauteur au lieu de 340. Les cartes conservent leurs
images 238 × 134, leurs titres et leur focus existants. Deux rangées peuvent
être lues jusqu’au bas des titres, sans réduire la taille des images.

La rangée active reçoit seule le repère de sélection ; les autres mémorisent
leur index sans conserver un contour concurrent. Le voile vertical du fond
renforce le contraste sous les titres des cartes. Le premier rendu ne le
renforçait pas assez sur une illustration claire : il a été corrigé et recapturé.

Dans À reprendre, « Épisode N » indique la cible canonique connue. La barre
basée sur progression/total de la série est retirée des cartes d’accueil : elle
ne représentait pas la position à l’intérieur de l’épisode. Aucun pourcentage
ni temps restant n’est inventé. « VF disponible » distingue la disponibilité
de la VF du lancement qui reste en VOSTFR par défaut.

Un rafraîchissement du même identifiant met également à jour le texte du héros ;
le précédent raccourci de transition gardait l’ancien objet affiché.

## Navigation et mouvement

- Bas depuis les actions ouvre l’exploration ; Bas/Haut parcourent les vraies
  rangées du backend, dans le même ordre qu’avant.
- Chaque rangée conserve sa position horizontale. Revenir à la première carte
  recale le rail immédiatement, sans appui Gauche supplémentaire.
- OK depuis une carte retrouve les actions du titre sélectionné et l’action
  mémorisée. Il ne lance pas automatiquement un épisode.
- Retour depuis les cartes retrouve aussi les actions, sans quitter l’app.
- Le héros, son image et sa bande-annonce suivent toujours le même titre.
  Le délai et les règles d’identité du lecteur de preview ne sont pas changés.

Les translations natives QML et le voile utilisent le jeton scroll existant,
200 ms, courbe de sortie `(0.23, 1, 0.32, 1)`. Le but est la continuité spatiale
lors du passage entre présentation et exploration, sans ajouter une animation
à chaque changement de rangée. Une inversion en cours repart de la position
courante. Le mode réduit applique les positions sans transition ; le focus
existant conserve son comportement réduit. Aucune nouvelle bibliothèque.

## Références et portée de leur interprétation

La [direction de mouvement existante](2026-10-27-atlas-tv-focus-motion.md)
reste la base Atlas. La [présentation officielle de Netflix du 7 mai 2025](https://www.netflix.com/tudum/articles/netflix-new-tv-layout)
a été relue pour les informations de décision pendant l’exploration et la
navigation supérieure. Elle ne prescrit ni cette géométrie ni cette durée :
le mode compact est une proposition Atlas à faire juger par Walson.

La page Apple Focus and selection a été consultée ; son contenu dynamique
et son export Markdown n’ont pas pu être relus par l’outil web de ce lot.
Aucune nouvelle conclusion n’est attribuée à cette page.

## Revue et vérifications

Le [carnet avant/après](2026-10-30-atlas-tv-home-browse/review.html) montre les
captures des vrais composants, en distinguant la proposition de la version TV.
La revue porte sur le contexte du héros, la lisibilité des deux rangées, les
titres longs, le contraste et l’unicité du focus, en 720p et 1080p.

`test-atlas-tv-home-browse.py` couvre les deux compositions, la mémoire des
rangées, les bornes horizontales et verticales, le retour aux actions sans
lecture, la reprise canonique en VO, la mise à jour du même titre et une
inversion pendant la transition. Il est exécuté en mode normal et réduit.
Le banc d’en-tête contrôle toujours les titres longs et l’alignement du profil.
Le banc complet HLS avec suivi vérifie les parcours intégrés ; son transport
et son décodeur sont explicitement simulés, sans compte ni progression réelle.

Les preuves finales sont jointes au carnet. Ces contrôles ne valident pas la
fluidité du Devialet, la superposition vidéo matérielle avec le nouveau voile
ou une réception esthétique humaine. Ces trois points restent à observer après
la revue de la proposition et un éventuel essai TV.
