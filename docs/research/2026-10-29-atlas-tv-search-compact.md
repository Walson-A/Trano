# Recherche : six grandes affiches, en-tête resserré

Walson retient les six grandes affiches et demande d’appliquer les améliorations
discutées : supprimer la phrase d’accroche, resserrer le titre et les filtres,
garder le titre complet de la sélection et un focus évident. Ce lot reste un
aperçu avant publication au moment des mesures ci-dessous. Après validation,
le loader réel l’active dans la [livraison suivante](2026-10-29-atlas-tv-search-vostfr-live.md),
avec VOSTFR par défaut et le raccord HLS. Les mesures historiques de ce document
n’incluaient aucun changement de SDK, service ou paquet serveur.

Le [comparatif du vrai QML](2026-10-29-atlas-tv-search-compact/review.html) conserve
la passe précédente à six affiches pour comparaison. Les deux captures utilisent
les mêmes fixtures PC localisées. Ce ne sont ni des images de génération ni des
captures de l’écran physique du Player.

## Composition

| Élément en mode six affiches | Avant | Après |
| --- | --- | --- |
| Titre Recherche | y110,40px | y102,32px |
| Phrase d’accroche | Affichée | Masquée |
| Champ de recherche | y119,h60 | y98,h52 |
| Ligne des filtres | y214,h48 | y164,h46 |
| Titre ciblé et métadonnées | y277 | y222 |
| Grille | y310,h350 | y256,h404 |
| Image utile d’une affiche | 166×234 | 166×234 |

Le catalogue récupère 54 px de hauteur dans le référentiel 1280×720, sans réduire
les cartes ni leur texte. La première rangée garde six affiches verticales.
La rangée suivante devient plus visible, sans annoncer douze résultats entiers.
Le titre ciblé reste au-dessus de la grille ; le résumé complet s’ouvre avec OK.
La pagination reste 24, les options et les durées de focus restent identiques.

Les menus sont rattachés à la nouvelle position des filtres. Les états vide et
erreur sont recentrés dans la largeur réelle du catalogue ; le clavier conserve
son cadrage. Le mode quatre affiches, encore utilisé par l’hôte publié lors de
ce lot, conserve ses positions précédentes.

## Revue et vérifications

Les 32 contrôles du [banc découverte](2026-10-29-atlas-tv-search-compact/review.json)
passent : filtres et annulation, clavier, données tardives, pagination, retour de
fiche, rangée incomplète et mouvements réduits. Le rapport inclut les dimensions
mesurées de la grille, plutôt qu’une assertion de géométrie qui recopierait le
code. Les 18 captures 1280×720 conservent les principaux états.

Revue visuelle : affiches et titre ciblé lisibles ; rangée suivante visible ;
pas de chevauchement entre navigation, titre, recherche, filtres et grille ;
menus ancrés ; carte ciblée entière après défilement. Les cartes ne sont pas
déclarées optimales sur la seule base de ces tests ; le jugement de Walson et
la lisibilité depuis le canapé restent nécessaires.

Le [banc de l’hôte complet](2026-10-29-atlas-tv-search-compact/integrated-verification.json)
passe au second passage ; son API et son décodeur sont simulés. Le premier
passage a échoué à l’assertion d’ouverture d’une fiche depuis Recherche, sans
erreur QML correspondante. Des diagnostics de focus/état ont été ajoutés à cette
assertion ; l’échec n’a pas été reproduit et sa cause n’est pas établie. Aucune
correction fonctionnelle du Player n’est prétendue sur cette base.
Le lot n’ajoute ni appel backend,
ni écriture de bibliothèque, ni HLS. L’étude des actions PC/mobile reste dans
le [document précédent](2026-10-29-atlas-tv-library-density.md).

Reproduction :

```powershell
python -B packages/lan/scripts/preview-atlas-tv-discovery.py --qt-path .local/atlas-tv-qml-runtime --cards .local/atlas-tv-discovery-20261029/cards.json --regular .local/atlas-tv-home-20261026/DMSans-400.ttf --bold .local/atlas-tv-home-20261026/DMSans-700.ttf --captures .local/search-compact-new --dense
```

Les exports intermédiaires du lot sont supprimés après copie des preuves. Le
worktree feat/local-network et les caches communs d’affiches/polices sont conservés
pour la revue. Les travaux non suivis préexistants devialet/tv/ et
preview-atlas-tv-home.py sont préservés. Aucun serveur de test permanent n’est lancé.
