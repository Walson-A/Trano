# Atlas TV — raccord HLS

Base visuelle : commit 44bfc40, paquet actif hero-discovery-6f378d98928e.
Ce lot fonctionnel ne reprend aucune proposition de densité ou de cadrage.

Le runtime annonce capabilities.hls. TvSession mémorise ce booléen strict ;
live.qml et PlayerMenu demandent alors accept_hls:true sur lecture, lecteurs et
qualités. Le menu accepte les qualités combinées MP4 et HLS. Sans la capacité,
les requêtes historiques restent inchangées et le menu conserve le MP4.
La forme racine du ticket vidéo et les commandes du lecteur sont conservées.

Le banc de l'hôte complet passe avec et sans --hls : reprise, pause, seek,
choix strict source/lecteur/qualité, annulation, événements tardifs et erreurs.
Le décodeur et l'API de ce banc sont simulés ; ce résultat ne certifie pas le
décodage Devialet. Les captures du menu ont été relues à 1280 × 720.

Le candidat hero-hls-b5ffce396fc7 conserve 27 fichiers du paquet 6f octet pour
octet. Seuls TvSession.qml, PlayerMenu.qml et live.qml changent. Les différences
de fins de ligne des checkouts Windows ne doivent pas republier d'autres assets.

Backend dev 5b5ac6c3, gateway SHA-256
4883e4c50e0e37344e18a8df5584abf1f71cde3fae214ded049cd56ff7434462 :
trois cas HTTPS canoniques vérifiés, playlists/segments/qualité/révocation.
Les preuves serveur sont dans Atlas/docs/research/atlas-tv-hls-2026-10-29.md.

Le contrôle natif du vrai EpisodePlayer est réussi : vidéo et audio présents,
seekable et started vrais, aucune erreur, durée 1 560 009 ms. La position avance
713 → 1 712 ms, reste à 1 712 pendant une pause de 1 750 ms, reprend à 2 817 puis
passe à 18 346 ms après un seek de quinze secondes. Les getters natifs sont lus
au moment de chaque événement ; les bindings de télémétrie initiaux restaient
à faux et ne constituaient pas un défaut du lecteur produit. Aucun changement
d'EpisodePlayer n'est nécessaire pour HLS.

La sonde conserve le composant réel, avec seulement une instrumentation de
lecture et le son coupé. Aucun signal progress n'est branché à l'API. L'appareil
de diagnostic est révoqué et l'app normale est relancée dans finally. Les images
sur le téléviseur n'ont pas fait l'objet d'une capture visuelle distante.

REA capture_process_scenario est indisponible pour un processus Windows natif
car son adaptateur ne garantit pas le nettoyage des descendants. La sonde a donc
été exécutée par le shell standard ; ces résultats ne sont pas une Evidence REA.
La syntaxe QML a été vérifiée avec le décodeur simulé du banc : le plugin
QtMultimedia Windows de ce banc n'est pas chargeable. Seul le test Devialet
ci-dessus certifie ici le comportement natif observé.

Résultat assaini : [2026-10-29-atlas-tv-hls-native.json](2026-10-29-atlas-tv-hls-native.json).
Publication du raccord coordonnée avec la session front après ce feu vert.

Comparaison visuelle du menu à 1280 × 720, dans le banc avec API et vidéo
simulées : [MP4 historique](2026-10-29-atlas-tv-hls-legacy-quality.png),
[qualités HLS négociées](2026-10-29-atlas-tv-hls-player-quality.png).
Composition, actions, lisibilité et position du menu conservées. Ces captures
ne sont pas des images du téléviseur ni une preuve de décodage.
