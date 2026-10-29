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

Le contrôle natif reste en cours : HLS chargé, durée et position disponibles,
mais les indicateurs Qt hasVideo/hasAudio/seekable ne remontent pas encore dans
la première sonde. Ne pas annoncer ce candidat comme publié ou comme lecture
native validée sur cette seule base. Aucun progrès de visionnage n'est envoyé.
