# Recherche raccordée et publiée sur le Devialet

Walson a demandé de publier la proposition pour essayer les filtres et la
navigation. Release active vérifiée : **hero-discovery-6f378d98928e**, 30 fichiers,
313463 octets. Le SDK accepte la relance ; 27 ressources sont demandées, dont
DiscoveryView.qml et Discovery.js. Ce relevé ne prouve pas à lui seul le rendu
ni chaque geste natif. Walson a ensuite donné une appréciation positive et relevé
la faible densité des quatre affiches visibles ; les filtres restent à confirmer
individuellement sur sa télécommande.

## Raccordement et vérifications

Le loader réel utilise DiscoveryView, la session TV authentifiée et ArtworkCache.
Le paquet embarque ses dépendances et son entrée qmldir. La navigation depuis
Recherche rejoint les filtres ; un retour de fiche retrouve critères et index
sans nouveau chargement du catalogue. Retour maintenu ne traverse pas plusieurs
niveaux. Les ressources sont préchargées au démarrage, avant expiration du ticket.
Le lecteur, les épisodes et la résolution de lecture ne sont pas modifiés.

La suite de l’hôte complet passe : recherche vide, genre canonique, clavier,
réponse périmée ignorée, pagination avec critères, fiche et retour, puis les
régressions lecteur/profil/épisodes. API et décodeur y sont explicitement simulés.
Les affiches exactes et la police distribuée sont utilisées au banc, sans être
confondues avec une capture matérielle. Le banc découverte passe 32 contrôles ;
la session HTTP jetable passe ses sept requêtes, dont rotation et chemins fermés.

Avant publication, six requêtes réelles sur le gateway et AniList passent sur le
runtime **8f5b8acf2957b033b11c4ae10aab8d1dacc8b5c1**, built2026-10-29T17:21:47Z :
exploration24, popularité24+24 identités distinctes, Action ET Romance/film/terminé/
notes24, films2001/24 et Frieren6 sans page suivante. L’affiche poster est reçue
en JPEG, HTTP200,126905octets. Le diagnostic est révoqué à la fin. Ce contrôle
utilise le gateway loopback et ses vrais services, pas un nouveau test HTTPS
depuis le Devialet ; la précédente preuve backend couvrait ce transport public.

Après bascule : hashes de tous les fichiers conformes ; seule la configuration
releaseId/bundleDir/files change. server.mjs garde le SHA256
837a0035d128ae1a918e796c2d63bd828914fa82e9408f44d4d69a2ac057d7b7.
Le helper de publication sous verrou/CAS garde un backup0600, vérifie le vrai
loadRelease et la disponibilité, et peut restaurer l’ancienne configuration.
Seul atlas-tv-launch redémarre ; aucun restart engine, épisode lancé ou progression.

Preuves : [release](2026-10-29-atlas-tv-discovery-live/release.json),
[hôte complet](2026-10-29-atlas-tv-discovery-live/verification.json),
[capture intégrée](2026-10-29-atlas-tv-discovery-live/search.png),
[SDK](2026-10-29-atlas-tv-discovery-live/native-launch.json),
[publication](2026-10-29-atlas-tv-discovery-live/deployment.json).
La capture intégrée simule la réponse réseau ; elle ne prétend pas que ses titres
correspondent à la requête utilisée pour éprouver le focus.

## Suite demandée et ménage

La page compte 24 résultats mais la composition n’en montre que quatre en entier.
Walson demande d’examiner ce compromis et les actions liste/notation du PC/mobile.
Une grille plus dense et les écritures de bibliothèque sont une itération suivante,
pas des fonctions insinuées par cette première publication.

Les deux fichiers de transfert serveur sont retirés. Le paquet actif, le backup
privé et l’ancienne release restent sous /home/trano/.local/share/atlas-tv/scene-b77800f/
pour rollback. Les preuves ci-dessus restent versionnées. Le worktree feat/local-network
et les caches d’images/polices nécessaires au banc restent pour l’itération.
Les deux travaux préexistants devialet/tv/ et preview-atlas-tv-home.py sont préservés.
