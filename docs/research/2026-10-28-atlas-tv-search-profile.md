# Atlas TV : Recherche, Profil et ressources durables

## Demande et périmètre

Walson confirme l'accueil à rangées, puis demande Recherche et Profil comme
sur PC. Sources lues : `AnimesNetflix.tsx` (en-tête), `RechercheAnimes.tsx`,
`HistoriqueAnimes.tsx`, les DTO `LifeOS/src/api/animes.ts` et leurs instantanés
de banc. L'adaptation réutilise les cartes, les contrôles, le verre et les
identités existants ; elle ne crée pas un deuxième catalogue.

Deux accès sont placés en haut à droite du héros. Haut depuis ses actions
rejoint cette navigation ; Gauche/Droite choisissent Recherche/Profil ; Bas
revient à l'action mémorisée. Les icônes Recherche, Profil et Retour viennent
du même paquet lucide-react 0.575.0 ISC déjà utilisé par Atlas.

## Recherche

`SearchView.qml` fournit un clavier à six colonnes, utilisable avec flèches/OK,
plus Espace, Effacer et Chercher. Un clavier physique peut aussi saisir du texte.
La grille latérale reçoit les vrais `CarteAnime` de `POST /tv/v1/catalog/search`
avec `{q}` ; deux caractères minimum et délai de 550 ms, comme le principe PC.
Les recherches successives ont une génération : une ancienne réponse ne peut
pas remplacer la requête actuelle. Absence de résultats et erreur sont visibles,
sans données inventées. L'utilisateur peut réessayer avec Chercher.

Depuis la dernière colonne du clavier, Droite rejoint les résultats. Gauche
depuis leur première colonne revient au clavier. OK choisit une carte et
retrouve le héros avec ses actions/preview pour cette identité exacte. Le
contexte temporaire contient les vrais résultats ; Retour revient à leur
grille, avec requête et sélection conservées. Retour depuis Recherche restitue
la rangée d'accueil mémorisée. Les labels contenant la requête sont en texte brut.

## Profil

`ProfileView.qml` réutilise `POST /tv/v1/catalog/history {page:1}` et l'identité
AniList de `home.compte`. Un profil public avec pseudo fonctionne même lorsque
`compte.connecte=false` : comme sur PC, ce booléen OAuth ne rend pas les données
publiques inaccessibles. Sans compte/pseudo, la page invite à le connecter
dans Atlas ; elle n'invente pas de comptes TV ou de méthode de connexion.

La page montre pseudo/initiale, nombres d'animés et d'épisodes, temps en heures,
note moyenne convertie de l'échelle sur 100 vers 10, puis les titres de l'activité
récente, dédupliqués par identité en conservant leur ordre. Une carte revient
au héros ; Retour restitue le profil. Le profil est consultatif, sans changement
de compte, note, statut ou écriture AniList. Le chargement et l'échec sont explicites.

## Expiration du bootstrap et icônes

Le ticket de fichiers expire après dix minutes. Charger un autre PNG d'icône
pour la première fois ensuite pouvait donc échouer, même si le composant QML
était déjà en mémoire. Cette fragilité est compatible avec le carré signalé
par Walson ; aucun log du Player ne permet d'en faire l'unique cause établie.

Le packageur inclut maintenant les sept PNG sous forme de données dans la
copie de `Icon.qml`. Aucun PNG séparé n'est requis pour changer d'icône après
expiration. Le banc du paquet vérifie que chaque Image lit une URI `data:image/png`
et est décodée, alors que le paquet ne contient aucun `icon-*.png`. Les SVG/PNG
sources et leur licence restent au dépôt. Le banc source utilise encore ses
PNG locaux. Recherche et Profil sont chargés au bootstrap et conservés en
mémoire pour la même raison, comme les lecteurs déjà préchargés.

## Son et reprise

Le paquet 5e992e3, dont le serveur confirme `muted=false`, a été demandé par
le Player ; Walson signale néanmoins de nouveau « Son coupé ». La nouvelle
passe réapplique explicitement le son activé au démarrage et au premier
catalogue chargé, puis conserve les choix de l'utilisateur. Trois traces SDK
limitées à l'état sonore et au focus permettent de distinguer état initial
et bascule ; elles ne contiennent ni URL ni jeton. Le comportement natif de
cette correction reste à confirmer après publication. Pas de variante vidéo
silencieuse ou d'installation FFmpeg pour ce défaut d'affichage.

Le lecteur attend aussi une durée native positive avant de consommer la reprise,
car la position peut commencer avant les métadonnées. Un `duration_ms=0` annoncé
par le résolveur n'est pas une durée de visionnage. La télémétrie attend déjà
`media.duration>0` et un vrai début de lecture ; aucune écriture de progression
réelle n'est faite par les bancs.

## Vérifications

- `test-atlas-tv-live.py` : vrais hôte/écrans, API et décodeur simulés explicitement,
  avec les instantanés PC. Saisie FR puis FRa par télécommande/clavier, attente
  des vraies requêtes, rejet de la réponse tardive, choix/Retour ; profil public
  sans OAuth, conversion des statistiques, carte/Retour ; son initial et
  Plus d'infos mémorisé ; icônes intégrées décodées ; reprise lorsque la durée
  arrive tard ; séquences de progression et file d'images.
- Banc du héros : dix captures, focus interrompable, rangées, limites et
  mémoire des positions, 1080p, absence de reprises. `git diff --check`.
- Lecture réelle sur le serveur, via les mêmes méthodes RPC que l'adaptateur
  TV fermé : `anime/recherche {q:Frieren}` donne six résultats ;
  `anime/historique {page:1}` donne profil/statistiques et quarante activités.
  Cela valide les formes de données, pas encore l'usage natif des deux écrans.

Revue des captures de vrais composants :
[accueil](2026-10-28-atlas-tv-navigation/home.png),
[recherche](2026-10-28-atlas-tv-navigation/search.png),
[profil](2026-10-28-atlas-tv-navigation/profile.png),
[résultats](2026-10-28-atlas-tv-navigation/verification.json).
Les résultats de la recherche dans ces images sont une réponse de fixture
pour tester les retours tardifs, pas une assertion sur la requête affichée.
Le profil et ses illustrations reprennent l'instantané PC. Aucune qualité
finale ou équivalence Netflix n'est déduite de ces captures.

La lecture VF et le bouton iPhone restent des chantiers distincts : résolution
chez les hébergeurs côté backend, et build natif mobile prévu avec Carte.
