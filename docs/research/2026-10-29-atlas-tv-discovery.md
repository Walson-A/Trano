# Recherche Atlas TV : trouver quoi regarder

Le 29 octobre, Walson demande un écran pour découvrir des animés, filtrer et
parcourir le catalogue sans connaître un titre. Les épisodes restent hors de ce
chantier. Le lecteur récemment publié a reçu une appréciation globale positive
sur le Devialet ; cela ne vaut pas validation individuelle de chaque fournisseur
ou commande.

Le [carnet de revue](2026-10-29-atlas-tv-discovery/review.html) présente le vrai
composant QML `DiscoveryView.qml`, séparé du `SearchView.qml` actuellement chargé.
Le loader, le paquet publié et le service serveur ne changent pas dans ce lot.
La nouvelle composition attend la revue de Walson avant intégration native.

## Ce que les références apportent

| Source consultée | Observation ou recommandation | Application proposée à Atlas |
| --- | --- | --- |
| [Apple TV, Search](https://support.apple.com/guide/tv/search-atvb8f84a271/27/tvos/27) | Le guide permet de descendre vers les catégories sans saisir de recherche. Parcours documenté, pas inspection d’un écran tvOS natif. | Arriver sur un catalogue, pas sur un clavier obligatoire. |
| [Netflix, Category Hub](https://about.netflix.com/en/news/a-one-stop-shop-to-find-all-your-favorite-categories-on-netflix) | Annonce de 2022 : entrée par genres et collections. L’illustration consultée est une image promotionnelle, pas une capture de l’interface actuelle. | Des critères reconnaissables comme portes d’entrée. Ne pas attribuer à Atlas la personnalisation décrite par Netflix. |
| [Crunchyroll, catalogue populaire](https://www.crunchyroll.com/fr/videos/popular) | Page publique réellement ouverte dans le navigateur : grille d’affiches verticales, tri et filtre regroupés, métadonnées et synopsis présents dans les cartes. Une bannière de nouvelles conditions occupe le haut ; elle n’a pas été acceptée. Pas d’inspection de son app TV. | Affiches de catalogue et aperçu informatif. Adapter aux flèches plutôt que recopier la grille web à la souris. |
| [NN/g, recognition versus recall](https://www.nngroup.com/articles/recognition-and-recall/) | Rendre les options identifiables réduit la nécessité de se souvenir d’un nom. | Montrer les genres et les visuels avant de demander un titre. |
| [NN/g, applying filters](https://www.nngroup.com/articles/applying-filters/) | Le choix entre mise à jour immédiate et validation dépend de l’intention, du coût et des interruptions. | Un format ou une année s’applique avec OK ; plusieurs genres forment un brouillon validé ensemble. Aucun rafraîchissement pendant leur sélection. |
| [NN/g, information scent](https://www.nngroup.com/articles/information-scent/) | Des indices concrets permettent de juger l’intérêt d’une destination. | Synopsis, année, format et genres du titre ciblé, sans devoir ouvrir chaque fiche. |

Ces principes sont des références d’ergonomie, pas la preuve expérimentale que
ce layout est optimal ou qu’il augmentera le temps passé dans Atlas. L’objectif
est de faciliter un choix qui plaît à Walson ; aucune mécanique de rétention
artificielle, aucun classement personnel inventé.

## Contrat de composition et de télécommande

- Recherche par titre disponible en haut ; clavier ouvert à la demande. La
  saisie reste un brouillon jusqu’à Rechercher, Retour l’annule.
- Genres, Format, Année, Diffusion et Tri restent visibles. Dix-huit genres
  canoniques, au plus trois cumulés : tous doivent être présents. Les coches
  indiquent le choix ; le blanc indique uniquement le focus.
- Quatre affiches verticales par rangée. Bas fait défiler ; une barre discrète
  situe la rangée dans la page. La rangée ciblée reste entièrement lisible.
- À droite, aperçu du titre ciblé : image, titre, année, format, nombre d’épisodes
  ou durée de film si disponible, genres et début du synopsis. Pas de second
  décodeur vidéo ni de bande-annonce déclenchée à chaque flèche.
- OK remet la carte sélectionnée au parcours de fiche existant. Revenir conserve
  critères, page, index et défilement dans la même instance du composant.
- Vingt-quatre résultats par page, puis Voir la suite. Précédente retrouve
  l’index mémorisé. Le nombre total du catalogue n’est pas inventé.
- Un filtre ouvert se ferme avec Retour sans appliquer son brouillon. Un autre
  Retour depuis la recherche peut retrouver l’accueil. Le lecteur ne change pas.
- Focus immédiat, agrandissement discret sur 160 ms, désactivé en mouvements
  réduits. Aucun mouvement d’entrée décoratif ni changement de focus pendant
  qu’un utilisateur choisit encore ses critères.

## Contrat backend préparé, non présenté comme livré

L’autre chat backend a confirmé le contrat suivant et réalise son lot séparé.
Son état de déploiement n’est pas validé par ce document.

```json
POST /tv/v1/catalog/search
{"q":"zero","genres":["Fantasy"],"format":"TV","annee":2016,"statut":"FINISHED","tri":"notes","page":1}

{"resultats":["cartes canoniques"],"page":1,"has_next_page":false}
```

Tous les critères sauf page sont facultatifs. Sans q, exploration ; sans tri,
tendances sans q et pertinence avec q. Genres anglais connus, sept formats,
cinq statuts, année numérique, page 1 à 1000 et taille fixe 24. Le sélecteur
d’années propose de l’année suivante à 1940 ; le service accepte 1900 à 2100.
Le sous-ensemble UI est une décision de navigation, pas une limite du moteur.
Le tri et les filtres précèdent la pagination côté source ; l’écran ne filtre
jamais la liste d’accueil pour simuler une exploration réelle.

Les réponses périmées ou reçues après fermeture sont ignorées. Une panne garde
les critères et permet de réessayer ; une page vide reste vide. Le composant
refuse un ancien résultat sans les métadonnées de pagination au lieu d’en
fabriquer. Aucune personnalisation, aucun « masquer les vus » tant qu’une
sémantique et une jointure correctes avant pagination ne sont pas disponibles.

Avant publication : attendre le backend testé/déployé, contrôler le contrat
vivant, raccorder le loader et le paquet, mettre à jour le test complet de
SearchView puis refaire la revue sur Devialet. Le banc de ce lot ne remplace
aucune de ces étapes.

## Preuves et limites

Le [rapport du banc](2026-10-29-atlas-tv-discovery/review.json) conserve **32
contrôles réussis**, 17 captures à 1280 × 720 et zéro erreur QML observée, sur
PyQt/Qt **5.15.2 desktop**. Le Player précédemment mesuré est en Qt 5.15.19 ;
la fluidité, le focus et le rendu natifs de ce nouvel écran restent à tester.

Les 48 cartes sont un assemblage de vrais fixtures du banc Atlas PC
(`accueil`, `historique`, deux fiches), avec les affiches correspondantes mises
en cache pour le banc. Ce n’est ni un classement vivant ni un service personnel.
Le transport du banc est explicitement simulé et n’appelle aucun serveur. Les
images manquantes, résumés anglais et anciens libellés de fixture ne sont pas
corrigés artificiellement dans les données. Aucun compte, jeton ou historique
brut n’est ajouté au paquet ni au dépôt.

Revue visuelle : comparaison avec l’écran précédent, focus carte/filtre,
défilement, retour de fiche, menu genres et autres filtres, critères combinés,
clavier, résultats par titre, page suivante, résultat vide, chargement et panne.
Corrections après capture : rangée sélectionnée alignée sans titre coupé, focus
unique dans les menus/clavier, libellé de tri non tronqué, métadonnées de film
au singulier, absence de vieilles affiches derrière l’erreur. Une ligne finale
incomplète est accessible avec Bas ; aucune flèche gauche supplémentaire n’est
nécessaire pour recaler la grille.

Reproduire avec des cartes localisées et les polices explicites :

```powershell
python -B packages/lan/scripts/preview-atlas-tv-discovery.py --qt-path .local/atlas-tv-qml-runtime --cards .local/atlas-tv-discovery-20261029/cards.json --regular .local/atlas-tv-home-20261026/DMSans-400.ttf --bold .local/atlas-tv-home-20261026/DMSans-700.ttf --captures .local/discovery-review-new
```

Le script s’arrête après les assertions. Les caches d’images et les polices de
banc restent locaux pour les prochaines itérations ; seules les preuves utiles
sont conservées dans ce dossier de revue. Aucun serveur de test n’est démarré.
