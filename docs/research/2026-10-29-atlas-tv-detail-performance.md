# Atlas TV — ouverture des fiches et suivi

Walson a confirmé les nouveaux boutons sur le vrai Devialet, mais jugé l’ouverture
très lente et le libellé transitoire « Mon suivi » confus. Cette réception ne
valide pas l’ergonomie : le présent lot corrige la chaîne de lecture du client.

## Ce qui est mesuré

Le [backend](https://github.com/Walson-A/Atlas/blob/80c6308481cfd71503cc111a7e06b291a4cb2f49/docs/research/atlas-tv-latency-2026-10-29.md)
a chronométré engine, gateway et HTTPS sur plusieurs titres. Aucun goulot de
plusieurs secondes n’a été reproduit ; le moteur observé est 36746c75, gateway 1b6e3daa,
sans nouveau cache privé ni déploiement.

Le [probe natif](2026-10-29-atlas-tv-detail-performance/native-timing.json)
utilise le vrai TvSession sur le Devialet, avec trois lectures simultanées puis
le même passage à chaud sur AniList 154587 :

| Route | Premier passage | Chaud |
| --- | ---: | ---: |
| Détail | 771 ms | 360 ms |
| Épisodes | 772 ms | 353 ms |
| Suivi personnel | 446 ms | 408 ms |

Toutes les réponses sont 200. Le probe mesure le transport natif et le parsing,
pas le temps de composition d’une fiche complète ni les autres titres. Le paquet
de mesure est servi temporairement au seul Player, avec credential appareil
échéant en RAM ; aucune clé propriétaire ne quitte le serveur. Diagnostic révoqué,
serveur PC fermé, aucune vidéo ni mutation du compte.

## Changements client

Avant, le détail précédait les épisodes et le suivi, puis le panneau relisait
encore le suivi. Ces requêtes partent maintenant en parallèle. Les épisodes
préchargés ne sont exposés qu’après alignement avec l’identité et la page de la
fiche canonique ; un retour ou un changement de titre invalide les callbacks.
La même page n’est pas redemandée au retour du détail.

Le synopsis déjà reçu dans la carte est affiché immédiatement en texte brut.
resume_fr est un indicateur, jamais le texte du synopsis. Les boutons neutres
« Ma liste… » et « Note… » attendent la réponse privée : ils ne prétendent pas
que le titre est absent ni présent avant sa confirmation.

TvLibrary réutilise pendant 30 s maximum, en RAM, les états present/absent confirmés
et leurs révisions. Une présence inconnu est relue à la prochaine ouverture. Les
requêtes identiques en cours sont mutualisées ; un panneau avec une donnée encore
fraîche s’ouvre immédiatement. Expiration ou recul de l’horloge imposent une
relecture. Le cache reste borné à 120 entrées et se vide à la perte de session.

Un conflit ou un timeout ne réutilise pas ce cache : Vérifier mon suivi effectue
une nouvelle lecture, sans replay automatique de la mutation. Aucune lecture
commencée avant une sauvegarde ne peut servir à cette vérification : l’écriture
requiert ready et bloque les lectures pendant saving. Le CAS serveur reste frais.
Le calendrier, les futurs bloqués, la langue et le décodeur ne sont pas assouplis.

## Vérifications et limites

Le banc QML complet, API/compte/décodeur simulés, vérifie les réponses retardées,
la neutralité de l’état privé, le suivi prêt avant le détail, l’absence de double
lecture, la prélecture des épisodes, l’expiration et l’inconnu qui redevient connu.
Les contrôles précédents de conflit/timeout, Ma liste, calendrier et FrAnime sont
conservés. Les preuves finales et le reçu de publication sont ajoutés ci-dessous.

La mesure native n’a pas reproduit toute la lenteur rapportée. Cette livraison
supprime des attentes vérifiées dans le client ; elle ne promet pas un temps
constant sur tous les titres ou réseaux. Le ressenti global après correction
reste à confirmer sur la TV.

[Chargement neutre](2026-10-29-atlas-tv-detail-performance/followup-loading.png),
[fiche prête](2026-10-29-atlas-tv-detail-performance/followup-detail.png),
[panneau de suivi](2026-10-29-atlas-tv-detail-performance/followup-rating.png) :
revue des vrais composants à 1280×720. Les dimensions et le focus sont conservés.
Les états synthétiques et le décodeur simulé sont propres au banc.

Vérifications finales [HLS](2026-10-29-atlas-tv-detail-performance/hls-follow-up-verification.json)
et [MP4](2026-10-29-atlas-tv-detail-performance/legacy-follow-up-verification.json)
réussies, dont l’inconnu relu à l’ouverture suivante et le recul d’horloge.
Un scénario de banc a d’abord échoué sur une variable Python `reads` réutilisée
comme compteur ; son nom est corrigé et les deux suites finales passent.
Une première revue a également révélé le flag resume_fr affiché au lieu du
synopsis ; le client n’utilise désormais que la chaîne resume et le banc le vérifie.

## Publication

La release [hero-detail-0b0a6c8a1416](2026-10-29-atlas-tv-detail-performance/package.json),
35 fichiers / 348228 octets, est issue du commit 8afb4f7867ed42e6a0d7eb02dba9b260b8ec45ad.
Le [précontrôle](2026-10-29-atlas-tv-detail-performance/preflight.json) vérifie
le moteur réellement actif 36746c754539e7d990e29092bd917b41dc11b13d, le gateway
1b6e3daa4bd74abd7db137a924df86a1f0eba0c76ed2602544ea0b778cd67134 et l’ancienne
release 60a7cb562ecd. La [publication](2026-10-29-atlas-tv-detail-performance/publication.json)
modifie le bundle QML, vérifie sa disponibilité et ne redémarre pas l’engine.
Le [reçu SDK](2026-10-29-atlas-tv-detail-performance/launch.json) confirme la
relance standard, sans démarrage d’épisode ; le rendu et la rapidité de cette
version complète restent à confirmer physiquement par Walson.

Les transferts distants du lot sont retirés après contrôle des empreintes ; le
bundle actif et son rollback privé 0600 sont conservés. Les exports temporaires
locaux sont supprimés après archivage. Aucun serveur de test persistant ne reste.
Le worktree partagé et les caches communs sont conservés pour les suites TV, avec
les deux éléments non suivis préexistants laissés intacts.

[Reçu de nettoyage](2026-10-29-atlas-tv-detail-performance/cleanup.json).

## Réception utilisateur

Walson confirme que les fiches sont beaucoup plus rapides, puis signale des
affiches bloquées pour Apothecary Diaries S3 et Devilman. Cette amélioration de
rapidité ne validait pas toute la chaîne des images ; le
[correctif de cache et reprise](2026-10-30-atlas-tv-artwork.md) traite ce second lot.
