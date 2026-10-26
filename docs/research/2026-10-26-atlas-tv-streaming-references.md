# Atlas TV — références de streaming avant conception

Recherche du 26 octobre 2026. Aucun écran produit construit à cette étape.

## Brief retenu

Le nom est **Atlas TV**. Les animés sont le premier contenu, mais l'interface
doit pouvoir accueillir films, séries, vidéos YouTube et musique. Walson demande
d'étudier des références avant de dessiner l'application. Le lancement depuis
téléphone ou PC reste un parcours à construire et vérifier séparément.

## Méthode et limites

Sept références visuelles examinées à partir des captures publiées par leurs
éditeurs ; Plex et Crunchyroll complètent la recherche documentaire. Les captures
anciennes restent datées : elles illustrent un mécanisme, pas nécessairement
l'interface actuelle. Aucun compte de streaming ni lecture de contenu requis.
Stremio et Jellyfin apportent le point de vue communautaire et des bibliothèques
personnelles ; cela ne suppose aucun ajout de source ou extension de streaming.

Les constats décrivent les images. Les recommandations Atlas sont des hypothèses
de conception, pas des performances d'usage mesurées. Une capture ne prouve ni la
qualité de la navigation complète ni la compatibilité avec le Devialet.

La planche locale `atlas-tv-references.html` rassemble les sept captures en grand,
agrandissables, leurs liens et les annotations. Elle est autonome, avec les images
intégrées ; les images tierces ne sont pas ajoutées au dépôt. Le manifeste local
`.local/atlas-tv-reference-research-20261026/assets.json` conserve URL et SHA-256.
Les quatre planches statiques ont été ouvertes et relues : captures entières,
annotations lisibles et aucun texte coupé. L'ouverture de l'HTML local dans le
navigateur intégré a été refusée par sa politique d'URL ; ses interactions
d'agrandissement ne sont donc pas présentées comme testées. Aucun serveur de
prévisualisation n'a été lancé pour contourner cette restriction.

## Accueil et navigation

### Netflix — TV, annonce du 7 mai 2025

[Présentation officielle](https://about.netflix.com/en/news/unveiling-our-innovative-new-tv-experience)
et [explication de la navigation](https://www.netflix.com/tudum/articles/netflix-new-tv-layout).

**Observé :** navigation en haut ; la carte sélectionnée devient un grand format
paysage avec contour clair, entourée d'affiches plus étroites. Les informations
de décision apparaissent sous la rangée.

**Retenir :** une sélection reconnaissable et des informations avant l'ouverture
d'une fiche. **Éviter :** agrandir chaque carte au point de perdre les voisines.
**Tester :** réserver une zone d'information stable et comparer avec une carte
qui grandit, sans déplacer le focus ni déclencher la lecture automatiquement.

### Apple TV — TV, référence historique du 11 décembre 2023

[Présentation officielle](https://www.apple.com/newsroom/2023/12/redesigned-apple-tv-app-elevates-the-viewing-experience/).

**Observé :** barre latérale avec libellés, accueil commun, rangée Up Next avec
progression et indication de l'épisode suivant. La barre ouverte masque une
partie de l'illustration principale.

**Retenir :** annoncer précisément ce que « Reprendre » lancera. **Éviter :**
copier les nombreuses entrées commerciales et partenaires. **Tester :** une
navigation courte Accueil / Bibliothèque / Recherche, sans sections futures vides.
La page web publique connectée comme visiteur était promotionnelle ; elle n'est
pas utilisée comme preuve du fonctionnement d'une bibliothèque authentifiée.

### Disney+ — illustration d'article révisé le 9 janvier 2026

[Présentation officielle](https://www.disneyplus.com/explore/articles/disney-plus-app-redesign-new-features).

**Observé :** grand visuel, titre et action à gauche ; rail latéral et onglets
de services en haut ; première rangée de contenus au bas de l'écran.

**Retenir :** une image forte et une action principale distincte. **Éviter :**
laisser un contenu promotionnel repousser la reprise hors du premier écran.
**Tester :** un accueil centré sur l'activité personnelle avec découverte en
seconde intention. La capture comporte des services américains : ce n'est pas
une preuve de l'interface française ni de sa disponibilité sur le Player.

### Stremio — Android TV, référence historique du 25 août 2023

[Refonte publiée par l'équipe](https://blog.stremio.com/stremio-brand-update-app-redesign/).

**Observé :** rail d'icônes, informations sur l'œuvre en haut, affiches en bas,
contour clair de sélection. Le titre visible est tronqué ; certains textes sont
petits et peu contrastés.

**Retenir :** l'association illustration / résumé / sélection dans le même
écran. **Éviter :** titre illisible à distance, filtres techniques permanents et
navigation uniquement iconographique. **Tester :** titre complet de l'élément
sélectionné, métadonnées réduites au choix réel : épisode, durée, langue.

## Bibliothèque et coexistence des médias

### Jellyfin — disposition Modern, publication 12.0 du 7 septembre 2026

[Annonce et captures officielles](https://jellyfin.org/posts/jellyfin-release-12.0/).

**Observé :** catégories Movies / Music / Playlists / Shows, progression sur
Continue Watching et séparation de Next Up. L'exemple clairsemé réserve beaucoup
d'espace aux grandes tuiles de catégories.

**Retenir :** distinguer un contenu commencé d'un prochain épisode à découvrir.
**Éviter :** remplir le premier écran de raccourcis de bibliothèques au détriment
du contenu. **Tester :** une reprise commune, puis des présentations par type.
La publication précise que Modern concerne bureau/mobile ; le mode TV conserve
sa disposition. Cette capture sert à l'organisation des contenus, pas comme
référence de focus TV.

[Plex, médias personnels](https://www.plex.tv/your-media/) et
[documentation de l'interface](https://support.plex.tv/articles/200484203-interface-overview/)
complètent cette question : sources et bibliothèques peuvent être organisées
sans confondre film, épisode et morceau. La documentation détaillée a renvoyé
403 lors de l'ouverture ; aucune capture Plex n'est présentée comme inspectée.

[Crunchyroll, refonte Roku du 17 octobre 2025](https://www.crunchyroll.com/news/announcements/2025/10/17/crunchyroll-roku-living-room-experience-redesign)
est pertinent pour la watchlist et les collections d'animés. Pas de capture
exploitable extraite pendant cette passe : référence documentaire uniquement.

## Lecture et musique

### YouTube — TV, comparaison publiée le 13 mars 2024

[Article de l'équipe de design](https://blog.youtube/news-and-events/designing-a-richer-youtube-experience-for-your-tvs/).

**Observé :** la comparaison avant/après déplace la vidéo dans une zone réduite
lorsqu'un panneau d'information est ouvert ; les textes ne couvrent plus son
bord droit.

**Retenir :** consulter une information sans la superposer à l'image utile.
**Éviter :** reproduire commentaires, achats et nombreuses actions dans le
lecteur d'animés initial. **Tester :** un panneau bref épisodes / audio /
sous-titres, puis retour immédiat au plein écran et au contrôle précédent.
La disposition réduite est une hypothèse à vérifier sur le moteur vidéo réel.

### Spotify — TV, référence historique du 9 novembre 2023

[Présentation officielle](https://newsroom.spotify.com/2023-11-09/find-your-favorite-audio-more-easily-with-the-redesigned-spotify-on-tv-experience/).

**Observé :** illustration et titre du morceau à gauche, file d'attente verticale
à droite avec pochettes carrées et artistes. La musique a son propre écran de
lecture, plutôt qu'une grille d'affiches de films.

**Retenir :** lecture en cours et file d'attente distinctes. **Éviter :** imposer
les saisons/épisodes à la musique ou afficher beaucoup de petits textes à distance.
**Tester plus tard :** pochettes carrées, titre/artiste et accès à la file ; ne pas
implémenter une rubrique musique vide dans la première version.

## Direction proposée pour Atlas TV, à juger sur des écrans ensuite

1. **Arriver sur sa reprise.** Montrer l'œuvre, la progression et la prochaine
   cible exacte. Garder la découverte accessible sans défilement promotionnel.
2. **Un cadre commun, des contenus adaptés.** Accueil, Bibliothèque et Recherche
   stables ; affiche pour l'œuvre, vignette pour l'épisode ou la vidéo, pochette
   pour l'album. Distinguer type de média, genre et fournisseur.
3. **Choisir avant de lire.** Le focus révèle l'information ; OK active. Retour
   retrouve la carte et la position précédentes. Pas de lecture au simple focus.
4. **Préserver l'identité Atlas.** Reprendre les mécanismes utiles, sans copier
   une marque, son catalogue, sa palette ou son organisation commerciale.
5. **Rester honnête sur la disponibilité.** Une cible d'épisode, sa langue et
   son état de résolution précèdent la lecture ; ne pas promettre qu'un flux
   fonctionne avant validation sur le Devialet.

Deux compositions à comparer lors de la phase suivante : **reprise d'abord**
(activité personnelle visible immédiatement) et **découverte cinématographique**
(œuvre mise en avant, reprise encore visible). La préférence proposée va à la
première pour le lancement quotidien rapide demandé par Walson.

## Contrat de la prochaine revue

Comparer les deux compositions avec le même contenu, puis vérifier : reprise
d'un épisode, ouverture d'une fiche, choix d'une saison/langue, recherche et
retour du lecteur. Observer à la distance réelle la lisibilité du titre, le
focus et le nombre de déplacements. Inclure chargement, bibliothèque vide,
réseau indisponible et flux non lisible. Aucun de ces tests produit n'a été
réalisé par cette étude de références.

Les règles [Apple focus/selection](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/)
complètent la revue : la sélection à la télécommande doit rester compréhensible
et stable. Leur implémentation tvOS ne vaut pas compatibilité technique Devialet.
