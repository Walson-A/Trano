# Atlas TV — fiche animé et navigation

## Parcours et références

Walson demande la fiche Atlas PC : saisons/épisodes, personnages/doubleurs,
animés liés et similaires. Sources lues : `FicheAnime.tsx`, `EpisodesAnime.tsx`,
`AnimesNetflix.tsx`, `HistoriqueAnimes.tsx`, DTO `LifeOS/src/api/animes.ts`.
Référence de navigation : [nouvelle expérience TV Netflix](https://about.netflix.com/en/news/unveiling-our-innovative-new-tv-experience),
avec accès en haut. Le verre et les tokens sont ceux de notre scène QML,
sans attribuer nos valeurs à Apple ou Netflix.

`DetailView.qml` remplace le simple résumé dans l’hôte publié. Recherche et
historique ouvrent directement une fiche ; Retour restitue requête/sélection.
Depuis le héros, Retour conserve rangée, carte et bouton Plus d’infos. Le banc
autonome du héros garde son aperçu de résumé.

L’en-tête adapte sa hauteur au titre, puis viennent saisons, épisodes,
De la même histoire, Personnages et voix, Dans le même esprit et À propos.
Les sections vides sont omises. Trois épisodes sont visibles avec numéro,
durée/état vu ; titre et résumé suivent la sélection. VOSTFR/VF sont explicites.
Le bouton Épisodes rejoint leur rangée. Les fenêtres de quarante épisodes
entourent le prochain épisode, avec pages précédente/suivante. Le backend
confirme `debut` inclusif base 1 et `nombre` plafonné à 200 ; `total` concerne
l’entrée AniList, pas toute la franchise.

Ouvrir une saison ou une recommandation empile une fiche ; Retour conserve
position, langue et sélection. La pile est limitée à douze fiches. Les listes
horizontales n’instancient que le voisinage visible. Haut/Bas parcourent les
sections, et À propos accepte le défilement des longs résumés. Focus/défilement
réutilisent 160/200 ms, avec réduction des mouvements ; pas d’entrée décorative
de chaque section.

## Contrats et erreurs

Routes fermées existantes : `catalog/detail`, `detail-extras`, `episodes`,
`episode-extras`. Une génération rejette les réponses d’une autre fiche et
l’identité retournée doit correspondre à la demande. Les compléments des
épisodes ne remplacent ni leur numéro, ni `vu`, ni les coordonnées FrAnime.
Pas de permission backend ajoutée. Une fiche non reliée reste consultable
sans simuler une identité AniList de lecture.

Le numéro choisi est envoyé à la lecture existante. Retour du lecteur
restitue fiche/épisode. Échec ou annulation rend le focus à la fiche ; une
erreur n’est plus cachée dans le héros derrière elle. Une durée native positive
reste nécessaire avant reprise temporelle et télémétrie. Les traces SDK sont
limitées aux identités catalogue, nombre d’épisodes, présence des pistes,
durée et pas de recherche ; aucune URL ni aucun jeton/code télécommande.

Accueil/Recherche partagent désormais une surface alignée avec le héros ;
l’identité à droite utilise l’avatar et protège le contraste du pseudo.
Pas d’onglet Ma liste inactif. La recherche a trois cartes par ligne et montre
les vrais titres du héros avant la saisie. Chercher rejoint les résultats,
le délai de frappe ne vole pas le focus. Le profil lit `history.profil.avatar`,
puis `home.compte.avatar`, avec initiale en repli. Sa transformation au-delà
de l’historique/statistiques reste à cadrer, sans réglages/comptes factices.

Le transport maîtrisé couvre bannières/affiches AniList. Avatars, portraits et
vignettes utilisent les URL canoniques du DTO : en cas de refus CDN, initiale,
visuel du titre ou emplacement explicite. Aucun proxy d’URL arbitraire ajouté.
Leur affichage natif reste à confirmer ; backend informé de cette limite.

## Revue et vérifications

Le banc charge les vrais composants et fixtures PC Frieren 154587/182255,
avec API/décodeur simulés ; aucune progression réelle écrite. Images de fiche
et portraits sont téléchargés depuis leurs URL exactes. Les vignettes absentes
se replient sur le visuel de l’animé ; pas d’image empruntée à un autre titre.
La recherche du banc utilise une réponse de fixture pour le test de réponse
tardive, pas une preuve de pertinence de la requête affichée.

Captures revues : [accueil](2026-10-28-atlas-tv-detail/home.png),
[recherche](2026-10-28-atlas-tv-detail/search.png),
[profil](2026-10-28-atlas-tv-detail/profile.png),
[fiche](2026-10-28-atlas-tv-detail/detail-top.png),
[épisodes](2026-10-28-atlas-tv-detail/detail-episodes.png),
[personnages](2026-10-28-atlas-tv-detail/detail-cast.png),
[similaires](2026-10-28-atlas-tv-detail/detail-recommendations.png).
Corrections issues des captures : hauteur du titre, barre de vu au bas de la
vignette, contraste du pseudo, ancienne image retirée au changement de fiche,
attente effective du décodage avant capture.

Contrôles réussis : épisode canonique 3 VF, retour à la fiche, saison/Retour,
rejet d’une fiche tardive ou d’une identité erronée, erreur de résolution
visible, recherche/Retour, profil, sessions/rotation et restrictions des
chemins médias ; dix captures du héros avec limites/rangées et interruption
du focus. Ces contrôles ne valident pas le décodage Devialet ou le design final.

Lecture réelle de métadonnées serveur via `anime/episodes` : 21507 est
Mob Psycho 100 (12 épisodes, troisième VF non vu), 114535 est To Your Eternity
(20 épisodes). Le backend confirme le transport public des deux cibles VF ;
image, son français, durée et recherche native restent à vérifier.
Le bouton iPhone reste prévu dans un build distinct avec Carte.
