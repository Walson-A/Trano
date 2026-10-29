# UI/UX & Design System

## Lecteur TV : proposition raccordée et publiée

Le [lecteur intégré](research/2026-10-29-atlas-tv-player-live.md) reprend les zones
retenues et le sélecteur enrichi dans la vraie app. Retour masque la barre avant
de sortir, les menus utilisent les contrats réels et les vignettes passent par
des capacités d'image d'épisode. Banc complet et session HTTP passent ; paquet
`hero-player-914ca56735ce` disponible publiquement, SDK accepté et fichiers servis.
La réception visuelle/native reste distincte et attend le retour de Walson.

## Lecteur TV : sélecteur d'épisodes enrichi

Walson apprécie la composition et demande une navigation des épisodes inspirée
de Netflix. Le [sélecteur QML](research/2026-10-28-atlas-tv-episode-selector.md)
réutilise les vraies métadonnées PC : vignettes, titres et durées. Ouverture sur
l'épisode en cours, accès rapide à celui-ci et Retour sans perte de lecture.
Six captures et 21 assertions sur banc isolé ; aucun raccordement natif ou
lancement TV n'est déduit de cette revue.

## Lecteur TV : proposition après recherche

Le [lecteur à zones distinctes](research/2026-10-28-atlas-tv-transport-proposal.md)
sépare identité, réglages nommés et épisodes, avec une timeline stable. Le carnet
montre dix-huit états du QML isolé, dont préparation, annulation, erreur et
contraste sur blanc. Dix-sept assertions de parcours passent sur le banc ;
aucun décodeur, serveur ou SDK n'est appelé. La composition attend la revue de
Walson avant intégration et essai natif ; aucune qualité finale n'est déduite
du succès technique du banc.

## Lecteur TV : recherche sur les layouts et la cognition

L'[étude du 28 octobre](research/2026-10-28-premium-player-layouts.md) compare
Apple TV et la variante Netflix observée, distingue les parcours documentés
d'Infuse/Disney+/HBO des géométries réellement vues, et conserve les sources.
Les recommandations de reconnaissance, focus, priorisation et annulation sont
séparées des preuves expérimentales et des hypothèses pour Atlas. La prochaine
composition doit distinguer Épisodes des réglages, nommer Source et garder
Source/Qualité accessibles. Aucun nouveau rendu ou essai TV n'est validé par
cette recherche.

## Lecteur TV : proposition d'ensemble à partir de Netflix

Le [nouveau carnet de revue](research/2026-10-28-atlas-tv-netflix-proposal.md)
présente treize états d'une scène QML séparée : commandes compactes à icônes,
légende au focus, progression plus présente et même grammaire pour les menus.
Source, langue, qualité, épisodes, saisons et erreur sont montrés dans le même
lecteur. Les exemples ne sont pas un catalogue vivant. La scène n'est pas
intégrée ou lancée sur TV ; Walson doit d'abord juger cette composition complète.

## Lecteur TV : menus attachés à la barre

**Rendu rejeté à son tour par Walson**, qui ne le juge pas au niveau Netflix.
Le socle fonctionnel `0785838` reste sur la branche ; il n'est pas publié.
L'ancrage corrigé n'est pas une validation de l'esthétique. La revue détaillée
ci-dessous conserve les preuves et les points à reprendre.

Walson rejette les grands panneaux qui faisaient disparaître la barre. Le
[lecteur raccordé](research/2026-10-28-atlas-tv-player-menus.md) conserve le
chrome et ouvre de petites listes au-dessus de ses boutons. Source/lecteur,
Qualité réelle, Version et Épisodes partagent cette grammaire. Les changements
préparent le flux sans quitter l'épisode et conservent position et intention.
Revue de captures intégrées et banc fonctionnel distincts de la validation TV ;
cette correction n'est pas encore publiée.

## Lecteur TV : proposition séparée en revue

La [nouvelle étude QML](research/2026-10-28-atlas-tv-player-proposal.md)
présente une timeline dominante, le retour pause centré et des panneaux
Épisodes, Source/lecteur, Version et Qualité. Huit captures sont revues sur
image fixe ; aucune intégration ou validation native n'est déduite de ce banc.
Le volume reste exclusivement géré par le Devialet. Les choix de qualité
seront ceux des variantes réelles du backend ; la proposition n'est pas publiée.

## Lecteur TV : barre actuelle rejetée

Image/son sont confirmés dans l’hôte complet, mais Walson rejette la transposition
du chrome PC. Le [contrat de parcours TV](atlas-tv-player-contract.md) fixe les
priorités avant recodage : timeline à la télécommande, retour lecture/pause
centré, pas de volume logiciel/±10, épisodes et réglages en surimpression,
choix réels source/lecteur, VF/VOSTFR et qualité. Les captures de la première
barre restent historiques ; elles ne doivent pas être propagées comme référence.

## Atlas TV — lecteur et navigation commune

Le [lecteur adapté du PC](research/2026-10-28-atlas-tv-player.md) reprend son
chrome et ses icônes, avec position demandée distincte de la position rapportée,
barre et menus utilisables à la télécommande. Les instructions permanentes
sont retirées. Les sorties vidéo preview/épisode sont instanciées exclusivement ;
image/son ont été confirmés sur un lecteur isolé puis dans l’hôte complet.
La barre de cette passe est rejetée ; pause/reprise et seek restent à confirmer
visuellement sur le Player après la refonte.
L’en-tête est partagé entre Accueil, Recherche et Profil. Le total d’épisodes
est visible et Retour suit réellement les fiches/saisons précédentes.

## Atlas TV — fiche et navigation

Après réception native, Walson signale une confusion fiche/accueil et de langue,
ainsi qu’une fermeture accidentelle. La fiche prend une affiche distincte,
les langues séparent focus et choix confirmé, Accueil porte son état de page,
le profil suit la largeur du pseudo. Retour remonte la fiche et la sortie est
explicite avec Rester par défaut. Cette passe est contrôlée sur banc et reste
en revue native ; le premier affichage fonctionnel n’est pas une validation UX.

La [fiche animé](research/2026-10-28-atlas-tv-detail.md) reprend le parcours PC :
saisons/épisodes, personnages et doubleurs, relations et recommandations.
Les retours conservent le contexte. Accueil/Recherche partagent l’en-tête ;
identité et avatar sont à droite. Trois résultats par ligne en recherche.
Captures de vrais composants revues avec API/décodeur simulés ; réception
native et validation esthétique restent distinctes. Le profil reste pour ce
lot une consultation historique/statistiques, avec photo et repli explicite.

## Atlas TV — Recherche et Profil

Les [accès Recherche et Profil](research/2026-10-28-atlas-tv-search-profile.md)
complètent l'en-tête du héros à droite. Clavier à la télécommande, résultats
latéraux et profil AniList réutilisent les cartes et contrôles existants.
Chaque Retour conserve son contexte. Les captures du vrai banc ont été revues ;
le son activé est réappliqué au premier catalogue, avec diagnostic natif limité.
Les icônes du paquet sont intégrées au composant et ne dépendent plus d'un
chargement de PNG après expiration du ticket.

## Atlas TV — rangées demandées après essai du 28 octobre

L'[accueil à rangées](research/2026-10-28-atlas-tv-rows-and-audio.md) remplace
les onglets supérieurs : reprise, sélection à la une et catégories réelles.
Le héros suit la carte active ; la position de chaque ligne est mémorisée.
La ligne suivante est perceptible dès l'accueil. Cartes, verre et courbes
existants sont conservés ; captures et navigation sont revues dans le banc.
Images, previews et rangées du service ont une confirmation humaine. Walson
précise que la bascule sonore fonctionne ; l'état initial doit annoncer
« Son activé ». Les actions mémorisées restent distinctes du focus courant.

## Atlas TV — raccordement du 28 octobre 2026

L'[hôte serveur](research/2026-10-28-atlas-tv-live-host.md) conserve la composition
du héros et ajoute au lecteur titre, barre, temps/durée et rappel des touches.
Retour revient au héros. Les captures du banc ont été examinées avec API et
décodeur simulés : elles ne valident pas la vidéo native ni un design final.
Après publication, Walson confirme l'affichage sur TV mais relève des images
absentes et une sourdine incohérente. Le repli bannière vers affiche et le gain
nul sont ajoutés ; le transport serveur des illustrations reste à raccorder.
Le chargeur d'illustrations est désormais préparé, avec une capacité serveur
explicite et une file à deux requêtes. Son affichage natif attend le backend.
Le bouton son porte « Son coupé » / « Son activé » après le retour de Walson
sur son carré ambigu. Les icônes existantes sont servies en PNG transparents.

## Expérimentation Atlas TV — 26 octobre 2026

Le design TV est étudié séparément du tableau de bord domotique décrit ci-dessous.
La [Recherche du 29 octobre](research/2026-10-29-atlas-tv-discovery.md) privilégie
l’exploration sans titre : filtres visibles, grille d’affiches, aperçu du titre
ciblé, clavier à la demande et contexte conservé au retour d’une fiche. Le
composant réel est [raccordé et publié](research/2026-10-29-atlas-tv-discovery-live.md).
L’itération suivante doit montrer davantage de résultats simultanés et adapter
les actions de bibliothèque PC/mobile à la télécommande.
La passe12vignettes a été rejetée ; [le comparatif suivant](research/2026-10-29-atlas-tv-library-density.md)
conserve le format des affiches et propose six grandes cartes, en revue seulement.
La [passe d’en-tête compact](research/2026-10-29-atlas-tv-search-compact.md) retire
l’accroche, resserre les commandes et rend 54 px au catalogue sans réduire les affiches.

La [scène QML](research/2026-10-26-atlas-tv-qml-design-scene.md) compare une carte
paysage, un focus blanc et un panneau translucide avec flou optionnel. Elle suit
la direction demandée Apple TV / Netflix, avec une étude Red Bull TV, sans
constituer un design final validé ni imposer ces composants aux écrans existants.

Le [héros TV adapté du PC](research/2026-10-26-atlas-tv-hero.md) conserve ensuite
la composition réelle de l’écran animés, avec la sélection d’une liste pilotant
le grand visuel. Les modes À reprendre/À la une, le focus et la preview native
sont séparés du transport backend. Ce prototype est en revue ; ses captures ne
valident ni un catalogue vivant ni la direction finale de Walson.

La [passe de mouvement du 27 octobre](research/2026-10-27-atlas-tv-focus-motion.md)
approfondit Apple TV/Netflix : carte ciblée agrandie et surélevée, translation
interrompable de la rangée, fondu court du héros, marges pour le focus et icônes
PC réutilisées. Les captures, un aperçu animé et les contrôles d’interruption/
mouvements réduits sont conservés ; la fluidité perçue sur le Devialet reste
à juger avec Walson. Les durées Atlas ne sont pas attribuées à Apple ou Netflix.

Interface premium, minimaliste, optimisée pour tablettes tactiles et écrans OLED.

## 1. Palette de Couleurs

L'interface supporte Dark et Light mode (toggle manuel).

**Dark Mode :**
- Fond principal : `#111111`
- Surfaces : `zinc-800/50` avec bordures `zinc-800`
- Texte : `zinc-100` / `zinc-400`

**Light Mode :**
- Fond principal : `zinc-50`
- Surfaces : `white` avec bordures `zinc-200`
- Texte : `zinc-900` / `zinc-500`

**Accents monochromatiques :**
- Lumières : Amber (`amber-500`)
- Énergie : Emerald (`emerald-500`)
- Météo : Couleurs conditionnelles (sun `#fbbf24`, rain `#3b82f6`, cloud `#94a3b8`)
- Sécurité : Red (`red-500`)
- Température : Orange (`orange-500`)

## 2. Styling

- **Framework :** Tailwind CSS v4 avec `@theme` pour les variables custom.
- **Arrondis :** `rounded-2xl` / `rounded-3xl` sur les cartes et boutons.
- **Backdrop blur :** Utilisé sur la topbar (`backdrop-blur-md`) et les modales.
- **Transitions :** `transition-all` avec `active:scale-95` / `active:scale-90` pour le feedback tactile.

## 3. Typographie

- Police : **Inter** (importée via Google Fonts dans `index.css`).
- Hiérarchie : `font-extrabold` pour les valeurs, `font-semibold` pour les labels, `font-medium` pour le secondaire.

## 4. Layout

- Sidebar fixe à gauche (navigation par onglets).
- Topbar sticky avec horloge, météo live, status système, actions.
- Zone principale scrollable avec padding responsive (`p-4 sm:p-6 lg:p-12`).

## 5. Composants Clés

- **StatusCard :** Icône colorée + label + valeur, hover scale.
- **DeviceCard :** Carte d'appareil avec toggle, état visuel on/off.
- **Modal :** Overlay sombre + backdrop blur, centré, fermeture par X ou clic extérieur.
# Raccord fonctionnel HLS Atlas TV

Le HLS négocié conserve la composition du lecteur et de ses menus. Les qualités
MP4/HLS partagent le même choix de résolution ; aucun libellé de protocole ne
s'ajoute au parcours. Voir `research/2026-10-29-atlas-tv-hls.md` pour les contrôles
et la distinction entre banc simulé et décodage natif.
