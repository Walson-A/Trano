# Lecteur Atlas TV — proposition d'ensemble à partir de Netflix

## Contrat de cette étude

Proposition QML indépendante du paquet publié. Walson demande de voir le lecteur
complet, menus compris, **avant tout lancement sur la TV**. Aucun appel au SDK,
au serveur ou au résolveur média dans ce lot. Le socle `0785838` reste inchangé.

Références examinées : les [captures du test de lecteur Netflix de juillet 2026](https://www.whats-on-netflix.com/news/first-look-netflix-new-tv-video-player-redesign/)
pour la composition et les menus bas, puis l'[aide officielle Netflix](https://help.netflix.com/en/node/372)
pour l'accès aux langues depuis les contrôles TV. Les premières sont les
captures d'un test publiées par un tiers, pas le rendu universel de Netflix.
Le lecteur Atlas PC est relu pour ses fonctions et ses états de sélection.

## Plan avant construction

- Couleurs : vidéo d'abord ; noir `#000000`, surface de menu `#ed0c0c0f`,
  blanc de focus `#f7f7f8`, texte secondaire `#c5c5ca`, rail `#5b5b60` et
  tampon `#929296`. Pas d'accent rouge Netflix attribué à Atlas.
- Typographie : DM Sans existante ; titre 42, épisode 21, options 20 et état
  secondaire 16. Pas de faux logo d'animé ou de nouveau titre de produit.
- Composition : axe gauche de 64 px ; titre/épisode au-dessus d'un groupe de
  commandes compact ; quatre icônes, sans quatre larges boutons textuels ;
  une seule légende contextuelle au focus. Timeline de 6 px sur toute la largeur,
  poignée plus présente, temps alignés aux extrémités.
- Menus : même ancrage au-dessus de la commande, même fond et même ligne de
  sélection. Une seule surface de focus blanche ; le choix actif est une coche.
  La rangée de commandes et la timeline restent présentes. Le titre seul cède
  sa place au menu pour ne pas passer derrière les options.
- Épisodes : même lecteur, total visible, saison accessible et lignes avec
  image/titre/durée quand ces métadonnées existent. Pas de faux aperçu au seek.

```text
                 vidéo

   Titre
   Saison / épisode
   [épisodes] [langue] [source] [qualité]
   légende de la seule commande ciblée
   ━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   écoulé                                restant
```

La différence avec les passes rejetées doit être structurelle : hiérarchie de
lecture et groupe de commandes, puis menus qui prolongent ce groupe. Recolorer
les anciens boutons ou ajouter du flou ne suffirait pas. La proposition doit
être jugée dans les états lecture, pause, timeline, quatre menus et erreur.

## Carnet complet et revue

[Ouvrir les treize états du lecteur](2026-10-28-atlas-tv-netflix-proposal/review.html).
Le carnet montre les captures du vrai QML de proposition ; il ne simule pas le
lecteur en HTML. La version rejetée est accessible dans le même carnet.

- [Lecture](2026-10-28-atlas-tv-netflix-proposal/hud.png),
  [focus](2026-10-28-atlas-tv-netflix-proposal/focus.png),
  [pause](2026-10-28-atlas-tv-netflix-proposal/pause.png),
  [timeline](2026-10-28-atlas-tv-netflix-proposal/timeline.png).
- [Qualité](2026-10-28-atlas-tv-netflix-proposal/quality.png),
  [fichier unique Originale](2026-10-28-atlas-tv-netflix-proposal/quality-original.png),
  [langue](2026-10-28-atlas-tv-netflix-proposal/language.png),
  [source](2026-10-28-atlas-tv-netflix-proposal/source.png).
- [Épisodes](2026-10-28-atlas-tv-netflix-proposal/episodes.png),
  [saisons](2026-10-28-atlas-tv-netflix-proposal/seasons.png),
  [chargement](2026-10-28-atlas-tv-netflix-proposal/loading.png),
  [erreur](2026-10-28-atlas-tv-netflix-proposal/error.png),
  [vidéo seule](2026-10-28-atlas-tv-netflix-proposal/video.png).

Les treize captures sont examinées à 1280×720 : mêmes axes, dimensions de
commande et états de focus ; texte des menus contenu dans leur surface ;
coche indépendante du focus ; menu lié à son déclencheur ; actions/timeline
restant visibles ; sortie de l'erreur par réessai ou changement de source.
Le titre se retire seulement pendant le menu, sans effacer le reste du lecteur.

Le fond est l'image fixe extraite de notre bande-annonce de test, identique au
fond de la passe précédente. Aucun décodage vidéo n'est revendiqué. Temps,
saisons, épisodes et choix sont des **exemples explicites d'étude** ; le passage
Source → Qualité unique illustre le contrat, pas une disponibilité sur un vrai
épisode. Les libellés d'épisodes restent simples ici ; il n'y a pas de vignette
ou de titre d'épisode fabriqués. Une tentative d'utiliser les vignettes du banc
PC a donné des réponses non décodables puis HTTP 403 ; elle n'a pas été poursuivie.

Les sept icônes sont dérivées des nœuds SVG du paquet Lucide React **0.575.0**
déjà utilisé par Atlas PC, rendues en PNG 96×96 par QtSvg pour éviter de dépendre
de glyphes de fonte. Leur licence ISC complète est jointe dans `icons/LICENSE`.
DM Sans provient des fontes existantes du banc Atlas TV.

## Vérification et limites

Le script `packages/lan/scripts/preview-atlas-tv-netflix.py` capture les treize
états, échoue sur les erreurs QML principales et parcourt au clavier : ouverture
et choix qualité, annulation/validation de timeline, fermeture du menu Épisodes,
navigation de saison sans changer l'épisode joué et choix de source après erreur.
[Résultat](2026-10-28-atlas-tv-netflix-proposal/review.json).
Les chemins du carnet et la syntaxe de son script sont contrôlés séparément.

```powershell
python -B packages/lan/scripts/preview-atlas-tv-netflix.py --qt-path .local/atlas-tv-qml-runtime --frame .local/atlas-tv-live-20261028/player-frame.jpg --regular .local/atlas-tv-home-20261026/DMSans-400.ttf --bold .local/atlas-tv-home-20261026/DMSans-700.ttf --captures .local/atlas-tv-netflix-new
```

Ce lot ne modifie aucun composant `hero/`, le constructeur du paquet ou la
configuration serveur. Il n'est pas intégré, publié ou lancé sur le Devialet.
La lecture réelle, les choix réseau et le rendu/rythme à distance restent à
valider après la revue de Walson. Les captures et le succès du banc ne sont pas
présentés comme une validation esthétique de sa part.
