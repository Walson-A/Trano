# Atlas TV : contenu, transport et réglages séparés

Proposition suivant l'[étude des lecteurs](2026-10-28-premium-player-layouts.md).
Walson autorise sa construction après cette recherche, en conservant sa demande
de voir le lecteur complet et ses menus avant un essai sur la TV.

[Ouvrir le lecteur et ses dix-huit états](2026-10-28-atlas-tv-transport-proposal/review.html).
Ce sont des captures de composants QML, pas un lecteur simulé en CSS.

## Audit et plan de composition

La précédente composition `710cc4b` était compacte, mais les quatre icônes
rapprochaient des fonctions de nature différente et la légende unique imposait
de déplacer le focus pour comprendre Source. Les anciennes listes et les
cartes d'épisodes trop hautes ne constituent pas une référence validée.

Cette passe reprend la séparation fonctionnelle d'Apple, sans prétendre copier
ses gestes Siri Remote. Le transport reste adapté aux flèches et à OK.

- Identité du contenu à gauche ; trois réglages nommés à droite ; timeline sur
  la largeur ; accès Épisodes distinct sous celle-ci.
- Palette : vidéo, noir `#000000`, surface `#1b1c21`, blanc `#f5f5f7`, texte
  secondaire `#c6c6ce`. Le fond des choix est légèrement translucide et flouté,
  mais le contraste repose surtout sur la surface sombre et le dégradé du HUD.
- Typographie : DM Sans déjà utilisée dans le banc ; titre 34, identité 20,
  commandes 18, valeur 15, choix 20. Les tailles sont celles de la scène 1280×720.
- Les icônes PNG et leur traitement QtGraphicalEffects proviennent de la
  proposition précédente, avec sa licence Lucide conservée ; pas de glyphe de
  fonte ou de nouvel emblème. L'image fixe est la même image de bande-annonce.
- Menus ancrés au réglage ; le titre, la timeline et la rangée ne bougent pas.
  La surface claire marque seulement le focus ; une coche marque l'état actif.
- Les épisodes utilisent une rangée compacte avec total visible. Sans vrais
  titres/vignettes dans cette étude, des cartes d'image vides n'ont pas de raison
  d'être. Les métadonnées ne sont pas fabriquées pour enrichir les captures.
- Le focus et les menus répondent immédiatement. Aucune animation décorative
  n'est ajoutée aux commandes répétées. Le coût et la fluidité du flou sur
  Devialet ne sont pas validés par une capture desktop.

```text
                   vidéo
                         [petit menu du réglage]
  Identité du contenu        Version    Source      Qualité
  Saison / épisode           VOSTFR     Mail.ru     1080p
  ━━━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  écoulé                                         restant
  Épisodes     saison et nombre total
```

## Parcours représentés

La scène isolée `packages/lan/devialet/design-player/transport/PlayerPreview.qml`
expose les transitions sans appeler l'API, le résolveur, le SDK ou le décodeur.
Les sources, formats, temps et saisons sont **des exemples d'étude**, pas des
choix de production ou un fallback quand le réseau est indisponible.

- Haut rejoint les réglages, Gauche/Droite choisit le réglage, OK l'ouvre.
  La commande ciblée reste mémorisée après un détour vertical.
- Depuis les réglages, Bas rejoint la timeline, puis Bas l'accès Épisodes.
  Depuis la timeline, Gauche/Droite prépare un déplacement, OK le confirme.
  Retour annule ; partir de la timeline annule aussi une proposition non validée.
- Ouvrir un choix ne le confirme pas. Une préparation garde l'état actif ;
  son succès explicite met à jour la valeur, son échec la conserve. Retour ou
  Annuler revient aux choix, puis Retour revient à la commande d'origine.
- Épisodes conserve le contenu joué et sa progression pendant le parcours
  d'une autre saison. Les flèches parcourent les épisodes ; Haut rejoint la
  saison. La rangée revient à son début sans appui supplémentaire.
- L'erreur propose Réessayer et Changer de source ; la position est conservée.
  Ouvrir Source rend les réglages visibles, même après l'erreur.
- Dans ce banc, Retour hors menu masque les commandes ; le retour à la fiche
  appartient à l'hôte de lecture et n'est pas réimplémenté ou revendiqué ici.

## Revue visuelle et corrections

Les captures sont examinées en 1280×720. Deux passes intermédiaires ont permis
de corriger les grandes cases d'épisodes sans métadonnées, le retrait des
réglages après une erreur et le texte résiduel sous une préparation d'épisode.
Le dégradé est renforcé après contrôle sur fond blanc.

La revue conserve : identité/réglages séparés ; absence de texte derrière les
menus ; valeurs actuelles stables ; focus distinct de la coche ; centre exact
du retour pause ; total d'épisodes et position de la rangée ; lisibilité des
menus et du titre sur un fond blanc. La galerie donne accès à l'ancienne
composition pour comparer sur le même fond.

Cette revue n'est pas une validation esthétique de Walson. Le peu de métadonnées
d'épisodes limite encore la richesse du sélecteur ; le temps de parcours vers
un épisode éloigné reste à juger sur la vraie télécommande. Les tailles de
valeur secondaire doivent être évaluées à la distance réelle du canapé.

## Vérifications et portée

Le [rapport du banc](2026-10-28-atlas-tv-transport-proposal/review.json) conserve
la version Qt desktop, dix-huit captures et dix-sept assertions de parcours.
Il distingue l'absence d'erreurs QML d'une validation du média natif.

```powershell
python -B packages/lan/scripts/preview-atlas-tv-transport.py --qt-path .local/atlas-tv-qml-runtime --frame .local/atlas-tv-live-20261028/player-frame.jpg --regular .local/atlas-tv-home-20261026/DMSans-400.ttf --bold .local/atlas-tv-home-20261026/DMSans-700.ttf --captures .local/atlas-tv-transport-review
```

Utiliser un dossier de captures neuf. Les assertions couvrent notamment les
préparations échouées/annulées, le retour au déclencheur, le seek validé/annulé,
la conservation de pause/position, le fichier à qualité unique, le parcours
des saisons, la rangée d'épisodes et l'accès Source après erreur. Un vrai
changement média n'est jamais déduit de ces valeurs de banc.

Aucune modification de `hero/`, de la construction du paquet ou de la
configuration du serveur. Aucune publication ou ouverture sur le Devialet.
L'intégration aux variantes réelles, l'unique sortie vidéo, les annulations
réseau et la réception native restent un lot distinct après revue.
