# Atlas TV : parcourir les épisodes dans le lecteur

Walson apprécie la composition du lecteur et demande d'améliorer l'accès à la
liste d'épisodes, dans l'esprit de la navigation Netflix. La composition
identité/réglages/timeline est conservée. Ce retour ne vaut pas validation du
lecteur natif ou des variantes réelles.

[Voir les six états du sélecteur](2026-10-28-atlas-tv-episode-selector/review.html).

## Données réutilisées et périmètre

La lecture de `LifeOS/src/components/animes/EpisodesAnime.tsx`,
`LifeOS/src/banc/animes/episodes-154587.json` et `LifeOS/docs/animes-ui.md`
confirme les métadonnées déjà utilisées sur PC : titre, durée, vignette Kitsu et
état vu. Le banc fournit les 28 épisodes de Frieren, avec les titres dans leur
langue source, sans traduction inventée. Les 28 vignettes publiques ont été
récupérées et réduites à 480×270 maximum pour le banc (environ 1 Mo avec le fond).

[Fixture et provenance](2026-10-28-atlas-tv-episode-selector/fixture.json) :
source du banc, URL de chaque image, empreinte de l'original et de la copie.
L'arrière-plan est une **illustration de la série**, pas une capture d'épisode
ni une nouvelle preuve de lecture native. Aucune API Kitsu de métadonnées ou
route de production n'est présentée comme vérifiée par ces fichiers.

La scène de proposition reste isolée : `hero/`, le paquet du Devialet et la
configuration serveur ne sont pas modifiés. Aucune commande SDK ni lecture TV.

## Composition et parcours

`EpisodeShelf.qml` est un composant de contenu : cartes avec vignette, numéro,
durée et titre sur deux lignes. Le blanc encadre la cible de la télécommande ;
« En lecture » et la petite progression indiquent le contenu actuel. La liste
compte explicitement les épisodes. Saison reste dans l'en-tête.

- L'ouverture rejoint l'épisode réellement joué, pas systématiquement le premier.
- Gauche/Droite parcourt les cartes sans remplacer le média. Quand c'est possible,
  le prochain épisode reste perceptible à droite de la cible.
- Haut rejoint l'en-tête ; Droite rejoint « En lecture », puis OK ramène le
  focus à l'épisode actuel sans le relancer. L'accès reste utile loin dans la liste.
- OK sur une autre carte prépare son épisode ; l'épisode actuel ne change qu'au
  succès explicite. Retour annule cette préparation.
- Retour ferme la liste vers Épisodes. Le Retour suivant masque la barre,
  sans modifier épisode/position. Le retour à la fiche reste la responsabilité
  de l'hôte natif, absent de ce banc.
- Une vignette absente laisse le titre, la durée et le numéro accessibles. Pas
  d'image d'une autre scène présentée comme si elle était celle de l'épisode.

Il s'agit d'une adaptation aux priorités d'Atlas et à ses données, sans nouvelle
affirmation sur un layout universel de Netflix. Le composant ne résout aucun flux
et ne traduit pas ses métadonnées en identité source. Le raccordement devra
utiliser les identités canoniques du contrat TV, indépendamment des numéros visibles.

## Revue et vérification

Les six captures du vrai QML sont examinées en 1280×720 : ouverture, épisode
actuel, fin de saison, absence d'images, préparation et liste fermée. Les grandes
cartes de numéros sont remplacées quand de vraies vignettes sont fournies ; les
titres ont deux lignes, l'épisode suivant reste visible près de la fin et le
fond illustré couvre la scène sans bandes noires. La préparation retrouve une
surface compacte, en gardant la barre visible.

Le [rapport](2026-10-28-atlas-tv-episode-selector/review.json) conserve six états et
21 assertions, dont l'ouverture sur le contenu joué, la navigation sans lancement,
le raccourci vers l'épisode actuel et les deux Retour sans perte de position.
Le [banc sans métadonnées](2026-10-28-atlas-tv-episode-selector/baseline-review.json)
conserve aussi ses 18 états / 17 assertions ; ces
contrôles ne valident pas un flux, une saison de production ou un décodeur.

```powershell
python -B packages/lan/scripts/preview-atlas-tv-transport.py --qt-path .local/atlas-tv-qml-runtime --frame docs/research/2026-10-28-atlas-tv-episode-selector/assets/series-backdrop.jpg --regular .local/atlas-tv-home-20261026/DMSans-400.ttf --bold .local/atlas-tv-home-20261026/DMSans-700.ttf --episodes-fixture docs/research/2026-10-28-atlas-tv-episode-selector/fixture.json --captures .local/atlas-tv-episodes-review
```

La scène continue d'utiliser des exemples pour les positions, les saisons et
les choix de sources/qualités. Le DTO des épisodes et le transport des images
devront être raccordés au service réel ; cette revue ne promet pas que tous les
animés possèdent déjà les mêmes métadonnées. La lisibilité et les interactions à
distance de canapé restent à recevoir sur Devialet après intégration.
