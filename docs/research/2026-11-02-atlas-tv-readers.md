# Lecteurs TV : refus récents et débit annoncé

Le registre du backend `d995f771` est déployé, mais `supported` ne garantit
pas qu'un fichier soit encore disponible. Le menu conserve le lecteur
réellement en cours et masque les entrées non prises en charge.

Les erreurs déterminées (`source_missing`, `source_denied`, `format_unsupported`,
`reader_unsupported`, `reader_unavailable`) sont mémorisées en RAM pour l'AniList,
l'épisode, la langue, la source et l'identifiant exacts. TTL : cinq minutes pour
un fichier absent, une minute sinon. Un succès enlève ce refus. Un timeout ou
une panne générale ne masque pas un lecteur. Mémoire bornée, sans URL fournisseur.
Un lecteur inconnu n'est pas certifié disponible.

Qualité reprend facultativement `bitrate_kbps` avec « Débit annoncé ». Cela
aide à comparer deux résolutions identiques, sans mesurer la qualité visuelle
ni garantir le meilleur encodage. Aucune estimation pour les sources sans débit.

Vérifications : `test-reader-policy.cjs` (portée, expiration, succès, lecteur
actif, timeout et débit invalide) ; banc complet `test-atlas-tv-live.py --hls
--episode-shelf --detail-preview --conversation-launch` réussi, API et décodeur
simulés. Revue des menus Source et Qualité à 1280×720 : barre conservée, focus
et état en lecture distincts, Retour inchangé. Paquet fermé de 41 fichiers.
Réception physique et livraison restent à consigner après publication.
