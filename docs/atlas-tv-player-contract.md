# Lecteur Atlas TV — contrat de parcours avant refonte

Ce contrat suit le rejet humain de la barre PC transposée en QML. La lecture
image/son fonctionne dans l’app complète ; son interface n’est pas validée.
Il s’agit du cadrage du prochain écran, pas de fonctionnalités déjà livrées.

## Références regardées

- [Netflix : réglages audio/sous-titres sur TV](https://help.netflix.com/en/node/372).
  Retenir l’accès au menu pendant la lecture et le retour dans cette lecture.
- [Captures du test de lecteur TV Netflix, juillet 2026](https://www.whats-on-netflix.com/news/first-look-netflix-new-tv-video-player-redesign/).
  Référence visuelle observée : titre et actions regroupés au-dessus de la
  timeline, vidéo dominante, options en surimpression. C’est un test présenté
  par un site indépendant, pas une garantie de rendu universel de Netflix.
- `LifeOS/src/components/player/ObyPlayer.tsx`, `MenuBarre.tsx` et
  `useLecteursAnime.ts` : distinguer choix demandé et flux réellement joué ;
  conserver position/état pendant un changement de source. Reprendre les
  fonctions utiles, avec une interaction adaptée à la télécommande.

## Grammaire du lecteur

Après revue de la première proposition, Walson précise que **la barre ne doit
pas disparaître à l'ouverture d'un réglage**. Qualité et Version sont de petites
listes attachées à leur bouton ; Source/lecteur et Épisodes gardent ce contexte.
Le [raccordement et ses captures](research/2026-10-28-atlas-tv-player-menus.md)
remplacent les grandes surfaces de la première étude.

En lecture sans interaction, seule la vidéo est visible. Le HUD donne le
titre, le numéro/titre de l’épisode, une timeline large, le temps courant
et le temps restant. Lecture/pause donne un retour centré. Le volume reste
celui du Devialet/télécommande ; aucun bouton de volume logiciel. Pas de
boutons ±10 ou de consignes de touches permanentes.

Les actions utiles sont Épisodes, Version, Source/lecteur et Qualité.
L’habillage vient après cette hiérarchie : contraste sur image claire/sombre,
une seule cible de focus lisible, mêmes panneaux et mêmes retours.

| État | Flèches / OK | Retour |
| --- | --- | --- |
| Lecture | OK pause/reprise ; Haut/Bas affiche le HUD | Revenir à la fiche |
| Timeline | Gauche/Droite déplace un curseur avec temps cible ; OK confirme | Annuler la position proposée |
| Rangée d’actions | Gauche/Droite choisit ; OK ouvre son panneau | Revenir à la vidéo |
| Panneau | Choisir une option réelle ; OK confirme | Fermer le panneau sans quitter l’épisode |

Le curseur proposé reste distinct du temps effectivement rapporté. On ne
fabrique pas de miniature vidéo : sans vraies images d’aperçu, on garde le
temps cible et le repère sur la barre. L’état Lecture/Pause antérieur est
conservé à la validation ou à l’annulation d’un déplacement.

## Changer de contenu sans perdre la lecture

Épisodes ouvre une liste sur la vidéo, avec saison, nombre total, épisode
en cours et progression. Le simple accès au panneau ne ferme plus le lecteur.
Choisir l’épisode en cours referme le panneau. Choisir un autre épisode
prépare son flux ; le changement ne se produit qu’après résolution réussie.
Retour annule cette préparation et conserve le contenu précédent.

Les changements de source, lecteur, version et qualité suivent la même
transaction : mémoriser position/intention, préparer le flux choisi sans
publier de fausse progression, puis remplacer l’unique sortie vidéo quand
il est prêt. Échec ou annulation laisse retrouver la lecture précédente.
La valeur demandée et celle réellement jouée restent distinctes jusqu’au succès.

## Source, lecteur, version et qualité

Source désigne le site (ex. Voiranime). Lecteur désigne l’hébergeur proposé
par ce site (ex. YourUpload/Mail.ru). Les choix viennent des références
canoniques pour l’identité/épisode/langue ; pas d’URL saisie par la TV.

Le backend prépare `/tv/v1/readers` et un `reader_id` opaque exact. Un choix
explicite sera strict : aucun autre lecteur lancé silencieusement. Le mode
automatique reste identifiable. Une nouvelle langue/épisode recharge ses
choix ; les identifiants d’un autre épisode ne sont pas réutilisés. Les
sources non portables ne deviennent pas des boutons actifs fictifs.

Version présente VF/VOSTFR selon les sources connues. Une sélection prépare
la même identité d’épisode à la même position. On ne prétend pas sélectionner
une piste de sous-titres indépendante lorsque ceux-ci sont incrustés au flux VO.

Qualité doit proposer **les variantes réellement fournies** : identifiant de
format, définition et compatibilité connus. Une qualité ne se déduit pas du
nom FHD1 ou HD du lecteur. Si le fournisseur ne donne qu’un MP4, on ne fabrique
pas des options 480p/720p/1080p. La conversation backend vérifie les formats
progressifs et HLS, leur transport TV et un contrat de choix de variante fermé.
Ce point demandé comme prioritaire reste à réaliser, pas à masquer derrière
une fausse liste ou à déclarer impossible sans examiner les extracteurs.

Le backend a depuis relevé deux variantes MP4 pour certaines cibles Mail.ru
(360p/1080p pour 114535/1 VO, 360p/720p pour 5630/2 VF) et un seul fichier sans
définition pour YourUpload 21507/3 VF. Le contrat `/tv/v1/variants` prépare
un `variant_id` opaque lié à l'identité, langue, source et lecteur ; sa livraison
reste en préflight au dernier échange. Ces exemples ne deviennent jamais un
fallback codé dans le menu. Voir la [proposition QML et ses limites](research/2026-10-28-atlas-tv-player-proposal.md).

## Critères de revue avant nouvel essai TV

Comparer les vrais composants QML dans leurs états lecture, pause, timeline,
Épisodes, Version, Source/lecteur et Qualité. Vérifier la composition 16:9 à
distance de canapé, le focus à chaque transition et le contraste clair/sombre.
Les panneaux ne doivent jamais quitter l’épisode à leur simple ouverture.
La validation fonctionnelle native reste séparée du jugement visuel de Walson.
