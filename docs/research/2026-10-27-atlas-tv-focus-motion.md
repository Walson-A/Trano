# Atlas TV — focus, composition et mouvement

## Références examinées et décisions

Walson demande une passe de design fondée sur Apple TV et Netflix, avec une
attention particulière aux cartes qui grandissent et à la fluidité. La structure
du héros PC reste la base ; aucun nouveau parcours de bibliothèque n’est inventé.

- [Apple — focus et sélection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/) :
  distinction entre viser un élément et l’activer, profondeur du focus TV et
  espace nécessaire autour des composants agrandis. Retenu : une seule carte
  surélevée, sans déformer la grille ni masquer ses voisines.
- [Apple — composition](https://developer.apple.com/design/human-interface-guidelines/layout) :
  lecture à distance et bords sûrs. Retenu : des marges pour la carte agrandie,
  y compris à la dernière position, et des titres qui ne touchent plus le bas.
- [Apple — principes tvOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-tvos/) :
  contenu immersif et mouvement discret au service du focus. Retenu : un grand
  visuel continu, avec des contrôles qui gardent une hiérarchie claire.
- [Netflix — interface TV annoncée en mai 2025](https://www.netflix.com/tudum/articles/netflix-new-tv-layout) :
  informations de décision accessibles pendant la navigation et présentation
  plus ample du titre ciblé. La capture officielle déjà conservée a été relue
  à grande taille. Retenu : une carte ciblée immédiatement reconnaissable et
  les informations du héros disponibles sans ouvrir une fiche.
- [Apple TV — capture historique de décembre 2023](https://www.apple.com/newsroom/2023/12/redesigned-apple-tv-app-elevates-the-viewing-experience/) :
  capture relue pour l’image dominante, les cartes paysage et les contrôles
  translucides. Sa barre latérale n’est pas reprise.

La [transcription WWDC23 sur le focus](https://developer.apple.com/videos/play/wwdc2023/10162/)
complète le rôle du focus comme indication de la cible d’action. Les captures
ne permettent pas de mesurer les vitesses d’Apple ou Netflix : les durées ci-dessous
sont des choix Atlas, pas des valeurs attribuées à ces produits.

Les effets attendus sont des hypothèses de conception : une différence nette
entre sélection et focus facilite le repérage ; des actions stables évitent de
chercher leur nouvel emplacement ; le coalescement des changements rapides
évite un défilement de textes illisibles. Aucun gain psychologique quantifié
n’est affirmé. La revue TV reste nécessaire.

## Implémentation de la passe

Les cartes disposent de cases stables, avec une image plus grande et arrondie.
La carte sous le focus passe à **1,07×**, s’élève de quatre unités et reçoit une
ombre. Les voisines restent à leur place. En quittant la rangée pour les actions,
le dernier titre reste sélectionné mais perd son élévation. Une bordure légère
préserve cette distinction. La marge droite protège aussi la dernière carte.

La liste anime sa translation, sans rétablir la plage de suivi automatique qui
causait le décalage de 198 pixels. Le retour au premier titre garde la cible zéro.
Les Behaviors QML repartent de la valeur courante lorsqu’une nouvelle cible arrive.

Le héros attend une sélection stabilisée très brièvement, puis renouvelle ses
informations et fond l’illustration entrante sur la dernière image chargée. Une
navigation rapide ne met pas en file toutes les œuvres traversées. La preview
reste distincte : son délai de 900 ms et son transport ne sont pas accélérés
artificiellement par le mouvement des cartes. L’affichage vidéo vérifie que la
clé de preview correspond à l’œuvre affichée avant de la montrer.

La composition est resserrée : synopsis limité à deux lignes, actions remontées,
rangée et titres entièrement visibles dans le cadre d’usage, zone de lecture
assombrie sur les images claires. Les doubles contours des boutons sont retirés.
Si seule une petite affiche est disponible, le fond reprend le repli flouté du
PC au lieu d’exposer ses pixels agrandis.
Lorsqu’un autre contrôle reçoit le focus, le bouton de lecture perd sa surface
blanche : deux actions voisines ne doivent pas paraître ciblées à la fois.
Les symboles typographiques Play/Info/Son sont remplacés par les SVG Lucide déjà
utilisés dans Atlas PC (0.575.0, licence ISC copiée avec les quatre fichiers).

## Réglage du mouvement

La skill `animate` est appliquée aux primitives natives QML. Sa restriction
générique des raccourcis clavier ne remplace pas la demande explicite d’animation
du focus TV. Il s’agit ici du retour visuel de navigation à la télécommande.
Les propriétés animées sont l’échelle, une transformation de translation,
l’opacité, la couleur des contrôles et la translation de la rangée.

| Mouvement | Durée | But |
| --- | --- | --- |
| Focus des cartes et contrôles | 160 ms | Indiquer immédiatement la cible |
| Couleur de contrôle / stabilisation du titre | 120 ms | Réponse rapide, filtrage des passages fugitifs |
| Translation de la rangée | 200 ms | Conserver la continuité spatiale |
| Illustration / apparition vidéo | 240 ms | Relier l’image à la nouvelle œuvre |

La courbe de sortie forte `(0.23, 1, 0.32, 1)` vient de la skill ; elle est
centralisée avec les durées dans `Motion.js`. Sur Qt Quick 5.15, la constante QML
est **Easing.Bezier**, vérifiée dans le runtime, avec la liste des six valeurs
de `bezierCurve`. `Easing.BezierSpline` renvoyait une valeur indéfinie dans ce
runtime et a été écarté. Voir la [documentation Qt 5.15](https://doc.qt.io/archives/qt-5.15/qml-qtquick-propertyanimation.html).

`reducedMotion` désactive les changements d’échelle, élévations et transitions
de position. Le montage Player accepte cette préférence dans les données de
session ; le banc a `--reduced-motion`. Aucune détection d’un réglage système
Devialet n’a été établie : l’hôte doit fournir la préférence.

## Vérification et preuves

Le banc Windows rend les vrais composants. Les contrôles couvrent huit états,
la reprise exacte 13/VF, la fiche/retour, le titre long, les extrémités de rangée,
1080p et l’absence de reprise. Une passe distincte couvre les mouvements réduits.
Les contrôles de bindings n’acceptent plus les avertissements « Unable to assign ».

Un contrôle d’interruption relève une taille intermédiaire, change la propriété
publique de sélection avant la fin du mouvement, vérifie l’absence de saut
instantané puis la convergence vers la taille de repos. L’envoi clavier est testé
dans les parcours ; la propriété est changée directement pour la mesure
avant/après afin que la pompe d’événements de QTest ne fasse pas avancer le rendu
entre ces deux relevés. Ce contrôle ne mesure pas la latence d’une télécommande.

Les captures ont révélé un rognage dû au premier montage du masque de carte ;
il a été remplacé par un masque explicite, puis recapturé. Le texte long,
les angles, la carte ciblée et le retour à gauche ont été relus dans la nouvelle
composition. Les preuves et l’aperçu WebP sont dans `2026-10-27-atlas-tv-motion/`.
L’aperçu est capturé dans une vraie fenêtre QML ; ses durées suivent les intervalles
de capture. Il ne prouve pas une cadence native de 60 images par seconde.

Un essai SDK borné sur le Devialet charge les nouveaux composants, SVG, polices
et bannières, puis une preview 360p de Re:ZERO avec audio/vidéo détectés et temps
qui avance. L’arrêt de la preview lors d’une autre sélection est observé. La
question de revue du mouvement a été présentée à Walson : une métrique de lecture
ne valide ni fluidité perçue ni rendu du focus et de la superposition vidéo.
Le voile de lisibilité et le repli d’affiche ont encore été ajustés après le
lancement de cet essai ; ces ajustements sont relus sur les captures PC,
pas confirmés sur la TV. Le rendu final intégré reste à juger par Walson.

Le catalogue du banc reste un instantané. Les autres previews, la HD, le
transport permanent sans PC et le raccordement des actions de lecture restent
des chantiers distincts. Cette passe ne revendique pas un niveau final Netflix.

Les deux bancs finaux se terminent avec un code zéro. Le moteur QML du banc
Windows est détruit explicitement avant la fin du processus pour libérer les
ressources graphiques. Les serveurs d’essai sont arrêtés ; le fichier vidéo
temporaire et les essais de rendu intermédiaires ont été supprimés. Les six
bannières d’entrée et le runtime du banc sont conservés pour poursuivre la revue.
