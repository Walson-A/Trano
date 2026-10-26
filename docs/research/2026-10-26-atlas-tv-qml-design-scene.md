# Atlas TV — composants QML et scène de design

## Demande et direction

Le 26 octobre, Walson demande de rechercher comment d'autres applications Freebox
construisent leurs interfaces, puis de réaliser une petite scène QML dans l'esprit
Red Bull TV. Apple TV reste la référence précédente pour le verre translucide.
Cette scène est un banc visuel explicite, pas un catalogue ou un lecteur livré.

Composition : image dominante, carte paysage sélectionnable, panneau de détail
translucide. Palette : fond ardoise `#10171e`, blanc `#fafafa`, texte secondaire
`#d4dde4`, surface bleue `#243546`, bordure blanche translucide. Police : Segoe UI
sur le banc Windows ; sa présence sur le Player n'est pas garantie. Aucun asset
de marque Red Bull ni code d'application tiers n'est incorporé.

## Sources effectivement lues

| Source | Fichier / observation | Ce qu'on en déduit, et sa limite |
| --- | --- | --- |
| [Exemples officiels Free](https://github.com/fbx/qmlapps_examples) | `samples/stack/main.qml`, `samples/rss_video/video_item.qml` | Hôte `fbx.application`, navigation via `fbx.ui.page`, cartes composées d'Image/Text QtQuick 2.4 ; un kit web n'est pas nécessaire. Les exemples ne prouvent pas tous les modules disponibles sur notre Player. |
| [ReDeFin](https://github.com/laborantine/ReDeFin) | `qml/components/GlassCircleButton.qml` | Le composant QtQuick 2.15 construit son verre avec transparence, rectangles et dégradés ; ses commentaires indiquent le remplacement de FastBlur/DropShadow pour alléger le rendu. C'est une décision de ce projet, pas une mesure comparative sur notre Devialet. |
| ReDeFin | `qml/pages/LibraryPosterCard.qml`, `qml/pages/HomeBackdrop.qml` | Cartes personnalisées sans QtQuick Controls ; plafond de décodage des fonds, qualité et flou demandés au serveur d'images, temporisation des changements. L'avertissement de défilement vise notamment la Révolution, pas une mesure sur le Devialet. |
| [ShaderToy de Free](https://github.com/fbx/qml-shadertoy) | `ShaderRenderPass.qml` | Utilise ShaderEffect et des entrées textures. Montre une voie de personnalisation graphique ; ne garantit pas qu'un shader quelconque soit fluide ou supporté sur tous les firmwares. |
| [Retour du responsable design Red Bull TV](https://www.charles-axel.com/red-bull-tv) | Étude historique 2014–2016, section TV | Conception pour six commandes et usage à distance ; prototypes et tests physiques. La lecture automatique de leur chaîne linéaire n'est pas reprise dans Atlas. Le téléchargement direct de leurs illustrations a renvoyé 403 ; aucune capture actuelle Red Bull n'est présentée comme inspectée en plein format. |

Les sources QML complètes ont été lues directement, conformément à la skill REA
qui privilégie la lecture normale quand le code est disponible. Aucun outil de
décompilation ni accès système supplémentaire n'a été nécessaire. Les copies et
SHA-256 sont conservés dans `.local/qml-design-research-20261026/` ; aucun code
GPL de ReDeFin n'a été copié dans la scène originale Atlas.

**Correction de l'explication précédente :** une bibliothèque de composants QML
peut être incluse avec l'application. La restriction concerne les modules natifs
absents du firmware et la compatibilité de leurs API, pas la possibilité de créer
une interface personnalisée. Nous ne concluons pas que toute bibliothèque QML
externe est compatible : ses imports et son coût doivent être examinés.

## Implémentation du banc

- `packages/lan/devialet/design-scene/Scene.qml` : composant commun, uniquement
  QtQuick 2.4 dans sa base. Carte, sélection, détail et verre sans flou. Deux
  FocusScope se passent le focus avec gauche/droite ; le panneau porte une vraie
  action de détail. Retour ferme le détail et restitue le focus à la carte, puis
  un second Retour appelle Qt.quit dans l'hôte de démonstration.
- `desktop.qml` : hôte Window pour PC ; `player.qml` : hôte Application Free.
  `manifest.json` et `qmldir` décrivent le paquet temporaire.
- Le flou est optionnel : chargement différé de QtGraphicalEffects 1.0, FastBlur
  et OpacityMask, texture du seul panneau à demi-résolution. Le chargement réussi
  n'est pas une preuve du rendu ni des performances. Sans module, la base reste
  utilisable. Bas ou G compare les deux traitements.
- `packages/lan/scripts/preview-atlas-tv.py` : banc Qt 5 avec capture des vrais
  composants et vérification d'OK/Retour et de la comparaison de sélection.
- `packages/lan/scripts/try-atlas-tv-player.py` : lancement SDK explicite. Sert
  seulement cinq fichiers en mémoire à l'IPv4 du Player sélectionné, par un
  chemin aléatoire, pendant 180 secondes. Aucun accès arbitraire au disque, aucune
  capture réseau ni authentification Atlas. Le serveur s'arrête à la fin.

L'illustration de montagne est un décor de démonstration, pas une œuvre du
catalogue. Source : [photo Unsplash](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=85&fit=crop).
Elle est fournie par chemin local, hors Git. Les illustrations AniList et du
portfolio Red Bull ont refusé leur téléchargement ; elles ne sont pas utilisées.

## Vérifications du 26 octobre

Le banc PC utilise PyQt5 5.15.11 et Qt **5.15.2** installés dans un dossier isolé,
pas le Qt **5.15.19** du Player. Quatre captures QML ont été obtenues : carte,
détail, comparaison de sélection et verre flouté. OK ouvre le détail, Retour le
  ferme, droite/gauche déplacent le focus entre carte et panneau. Le flou est réellement visible sur
la capture PC. Les premières captures ont révélé deux défauts de contours : image
rectangulaire dans une sélection arrondie, puis flou débordant les coins du
panneau. Correction : contour de carte rectangulaire et masque arrondi du flou.

### Essai physique et retour de Walson

Le Player a accepté le lancement SDK et demandé manifest, hôte, qmldir, Scene.qml
et photographie. Le premier hôte sans import de répertoire explicite n'avait
chargé que le manifest et l'hôte ; l'ajout de `import "."` et de `qmldir` a permis
la récupération du composant. Walson a ensuite confirmé la scène et le bon rendu
du flou sur sa télévision. Il a constaté l'absence de sélection à droite : ce
panneau était alors purement informatif. La correction lui donne une action réelle,
un FocusScope et un contour blanc. Cette correction est vérifiée dans le banc PC
et renvoyée sur le Player ; Walson confirme ensuite la sélection du panneau et
le fonctionnement du détail à la télécommande. Les serveurs temporaires des
essais se sont arrêtés normalement.

La sortie par Retour confirmée par Walson correspond à Qt.quit, volontaire dans
ce banc. Il n'embarque pas RelayAgent : aucun comportement en arrière-plan du
relais ne peut être déduit de cet essai. Le rendu du flou est confirmé, pas sa
fluidité sous charge, pendant une vidéo ou avec une grille entière.

L'essai offscreen/software ne produisait pas de capture exploitable ; le rendu
Windows normal a été utilisé. Aucun chiffre de fluidité ou de consommation GPU
n'est affirmé. Une ouverture/désactivation complète par Netflix, un lancement
après reboot ou une vraie lecture média ne font pas partie de ce banc.

Reproduction PC (Python 3.11 et runtime Qt isolé) :

```powershell
uv pip install --python <python.exe> --target .local/atlas-tv-qml-runtime PyQt5==5.15.11
python packages/lan/scripts/preview-atlas-tv.py --qt-path .local/atlas-tv-qml-runtime --artwork <illustration.jpg> --capture-dir .local/atlas-tv-captures
```

Essai matériel, après s'être placé sur le LAN du Player :

```powershell
python packages/lan/scripts/try-atlas-tv-player.py --player <IPv4-Player> --bind <IPv4-PC> --artwork <illustration.jpg> --launch
```

La scène du test est chargée depuis le PC. Ce chemin de développement n'est pas
la distribution finale autonome d'Atlas TV et ne résout pas le démarrage après
reboot. Avant généralisation : confirmer le rendu sur le Player, la police de
remplacement, la lecture à distance et le coût du flou, puis décider du traitement
de verre conservé. Le niveau de design final reste à juger avec Walson.
