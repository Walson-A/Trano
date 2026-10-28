# Accueil à rangées et limite audio native

## Direction demandée

Après validation des images et bandes-annonces servies par le backend dans
`hero-168278b`, Walson demande plusieurs lignes de catalogue visibles, plutôt
qu'un choix entre les onglets « À reprendre » et « À la une ».

L'accueil conserve le héros adapté du PC. Les deux onglets disparaissent.
La première ligne reprend `rangees[id=reprendre]` si elle existe ; la deuxième
montre `home.hero` sous « À la une ». Suivent les rangées non vides réellement
fournies par l'engine, dans leur ordre et avec leurs titres. Aucune catégorie
fictive « tendance » n'est ajoutée pour remplir l'écran.

Le héros suit la carte sélectionnée dans la ligne active : titre, image,
bande-annonce et cible de lecture gardent leur identité. Pas de rotation
aléatoire. L'adaptateur serveur, les jetons limités et les cibles AniList sont
conservés. `selectMode` reste un point d'entrée interne pour le lancement/banc ;
il ne représente plus deux onglets dans l'interface.

## Composition et navigation

La composition garde l'image dominante, le titre à gauche et les actions,
avec une hauteur de héros réduite de 60 unités logiques. La première ligne
commence à 380 ; son voisin est déjà perceptible en bas du viewport 720p.
Chaque `MediaRow.qml` mesure 252 unités, avec titre et rail horizontal.
Les composants de cartes, verre, images et focus existants sont réutilisés.

- Bas depuis les actions entre dans la ligne active ; Bas/Haut passent ensuite
  d'une ligne à l'autre. Haut depuis la première ligne revient aux actions.
- Chaque ligne conserve son index horizontal par identifiant de rangée.
- Gauche/Droite gardent le défilement déterministe existant ; atteindre la
  première carte ramène immédiatement au début, sans appui supplémentaire.
- Retour depuis les cartes revient aux actions du héros. La fiche de détail
  et le lecteur conservent leur propre Retour.
- Les bornes haute/basse sont stables. La sélection est ajustée si la liste
  change ou si une rangée disparaît ; les rangées vides ne sont pas affichées.

Les mouvements de focus et de défilement restent interrompables, avec les
durées/courbes du composant existant. Le mode réduit supprime les animations.
Les deux ListView virtualisent les composants visibles, sans cache de delegates
hors écran ; la préparation des fichiers image reste une tâche distincte du
cache serveur à deux requêtes. Un Timer attaché à chaque ligne annule son
alignement si la ligne est détruite, évitant un callback de contexte périmé.

## Vérifications et revue locale

`preview-atlas-tv-hero.py` passe en mode normal et réduit : dix captures,
reprise canonique 13/VF, détail/Retour, titre long, 1080p, sans reprises,
interruption du focus, bornes horizontales, ordre des vraies catégories,
mémoire de la troisième rangée et bornes verticales. La première adaptation
du banc devait rechercher les rails dans l'arbre visuel des ListView imbriquées.
Les warnings d'incubation observés avec cache de delegates ont disparu après
suppression de ce cache. Les exécutions finales n'ont pas de TypeError ni de
binding loop relevé. `test-atlas-tv-live.py` conserve le parcours hôte/lecteur,
les reprises, le suivi simulé, l'identité des previews et la file d'images.

Revue des vrais composants : [accueil](2026-10-28-atlas-tv-rows/home.png),
[ligne sélectionnée](2026-10-28-atlas-tv-rows/row-memory.png),
[résultats](2026-10-28-atlas-tv-rows/verification.json).
Les captures montrent une bande-annonce désactivée dans le banc Windows ;
aucune fluidité TV ou validation esthétique finale n'en est déduite.
L'essai natif de cette nouvelle disposition reste à faire après publication.

## Sourdine : constat physique prioritaire

Sur `hero-168278b`, Walson confirme images et bandes-annonces, ainsi que la
lisibilité du bouton « Son coupé / Son activé ». Il confirme aussi que le son
reste audible au démarrage malgré `MediaPlayer.muted=true` et `volume=0`.
Les propriétés vérifiées dans le banc simulé ne prouvent donc pas la sourdine
sur ce backend natif. Ce défaut reste ouvert.

La source publique historique libfbxqml expose `VideoPlayer.mute` via MMS.
Un essai borné utilisant `fbx.media 1.0` a été lancé avec le SDK officiel :
le runtime répond **module fbx.media is not installed** avant construction de
la scène. Aucun test audio n'a donc eu lieu avec ce module. Seuls stdout/stderr
de notre application ont été lus, sans se connecter au port du debugger QML,
sans shell, accès administrateur ou changement du volume système.
Le serveur HTTP temporaire a été arrêté et la famille diagnostic révoquée.
La première restauration SDK a été refusée ; une relance ultérieure est
acceptée et Walson confirme qu'Atlas TV est affiché. La cause du refus temporaire
n'est pas établie.

Une variante de bande-annonce sans piste audio est proposée au backend pour
garantir le silence indépendamment des commandes Qt. L'original doit rester
disponible pour l'activation du son ; aucune variante n'est présentée comme
livrée ici. ffmpeg est présent sur le PC, absent du PATH serveur lors du contrôle.
Il ne faut ni modifier le volume global pour simuler la sourdine, ni déclarer
le défaut résolu sur la seule base des valeurs QML.

Le trajet vidéo serveur de l'épisode de référence en VO a été validé par la
conversation backend. Les cibles réelles de reprise sont en VF et restent en
échec chez leurs lecteurs : cette limite distincte n'est pas corrigée par les
rangées ou le contrôle sonore. Aucun événement de visionnage réel n'est envoyé
par les bancs de ce lot.
