# Lecteur TV — proposition après rejet de la barre PC

Cette proposition QML est séparée du paquet publié. Elle permet à Walson de
juger la composition avant raccordement aux flux réels. Le volume appartient
au Devialet ; Source/lecteur et Qualité sont prioritaires. Le
[contrat de parcours](../atlas-tv-player-contract.md) décrit les interactions
à intégrer, pas des fonctions déjà livrées.

## Direction et références

Vidéo dominante, titre en bas à gauche, actions groupées au-dessus d'une
timeline large. DM Sans existante, blanc `#f6f6f7` pour le focus, texte secondaire
`#b2b6c3`, surface translucide `#ed181b23`, séparation `#25ffffff`. Le panneau
sert au choix et au contraste, sans prétendre flouter la sortie vidéo native.

La disposition reprend les observations du [test TV Netflix de juillet 2026](https://www.whats-on-netflix.com/news/first-look-netflix-new-tv-video-player-redesign/)
et le principe des [options pendant la lecture](https://help.netflix.com/en/node/372).
Le premier est une référence visuelle indépendante sur un test de Netflix,
pas une spécification de tous ses lecteurs. Les fonctions et la distinction
choix/flux joué sont aussi comparées au vrai `MenuBarre.tsx` d'Atlas PC.

## Captures du vrai QML d'étude

- [Lecture](2026-10-28-atlas-tv-player-proposal/hud.png) : titre, épisode,
  quatre actions, temps courant/restant ; aucun volume ou bouton ±10.
- [Focus des actions](2026-10-28-atlas-tv-player-proposal/actions.png).
- [Pause](2026-10-28-atlas-tv-player-proposal/pause.png) : retour au centre.
- [Timeline](2026-10-28-atlas-tv-player-proposal/timeline.png) : temps proposé
  distinct de la position jouée, sans inventer de miniatures.
- [Source et lecteur](2026-10-28-atlas-tv-player-proposal/source.png) : deux
  colonnes, mode demandé Automatique distinct de Mail.ru actuellement joué.
- [Qualité](2026-10-28-atlas-tv-player-proposal/quality.png) et
  [Version](2026-10-28-atlas-tv-player-proposal/version.png) : listes compactes,
  focus blanc distinct de la marque du choix confirmé.
- [Épisodes](2026-10-28-atlas-tv-player-proposal/episodes.png) : panneau latéral,
  saison et total visibles, épisode en lecture identifiable. Aucun retour à
  la fiche à la simple ouverture de ce panneau.

Le fond est explicitement une image extraite de la bande-annonce de test,
pas une capture d'épisode décodé. Les temps, la saison et les options sont des
exemples de présentation. Cette étude ne contacte aucun compte, média ou API.
Elle n'est pas importée par le constructeur du paquet de production.

## Revue effectuée et limites

Huit états capturés à 1280×720 dans Qt Quick 5.15.2 sur PC. Les premières
options occupaient un panneau trop large et vide : remplacées par des listes
compactes. Le focus Épisodes monopolisait l'écran initial : la timeline est
maintenant la cible principale. Le retour pause est centré dans l'image.
Le total d'épisodes reste visible pendant la navigation de liste.

Ces captures vérifient composition, contraste et différence focus/choix ;
elles ne valident ni télécommande, défilement, animation, transparence sur
vidéo native, ni la transaction de changement de flux. Les signaux d'action
restent ceux d'une étude visuelle ; aucun bouton n'est annoncé fonctionnel
sur la TV. La direction attend la revue de Walson avant généralisation.

## Raccordement à faire

La conversation backend prépare des identifiants fermés `reader_id` et
`variant_id`, avec `capabilities.readers` et `capabilities.variants`. Au dernier
échange, cette livraison est encore en préflight : ne pas confondre le contrat
avec une fonctionnalité déployée. Les options de production viendront de ces
réponses pour l'épisode et la langue courants.

Formats réellement relevés côté backend : Mail.ru 114535/1 VO propose 360p et
1080p ; 5630/2 VF propose 360p et 720p. YourUpload 21507/3 VF ne déclare qu'un
MP4 sans définition et sera nommé Originale. Ces observations ne garantissent
pas leur disponibilité future ou la lecture de chaque variante sur Devialet.
Le nom FHD1 ne suffit pas à déduire une qualité.

L'intégration devra conserver la position et l'intention de lecture pendant
un choix de version/source/qualité, préparer le nouveau flux avant remplacement,
et laisser revenir à la lecture en cas d'échec/annulation. Elle devra aussi
tester les erreurs, les listes longues et les retours sans fermer l'épisode.

## Reproduire la revue

Depuis la racine du worktree Trano :

```powershell
python -B packages/lan/scripts/preview-atlas-tv-player-design.py --qt-path .local/atlas-tv-qml-runtime --frame .local/atlas-tv-live-20261028/player-frame.jpg --font .local/atlas-tv-home-20261026/DMSans-400.ttf --font .local/atlas-tv-home-20261026/DMSans-700.ttf --captures .local/atlas-tv-live-20261028/player-proposal-new
```

Le dossier de captures doit être nouveau. Le script charge les vrais composants
d'étude, capture les huit états et échoue sur les erreurs QML principales.
Ce contrôle de rendu ne remplace pas les tests d'intégration et l'essai natif.
