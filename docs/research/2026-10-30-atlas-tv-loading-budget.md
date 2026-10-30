# Atlas TV — admission des lectures et chargements

## Cause et portée

Le correctif des images du lot précédent traite de vrais défauts de cache et de
reprise. Il n’explique pas les attentes simultanées signalées dans les fiches,
Recherche et Ma liste. Le diagnostic backend observe un limiteur AniList de
25 appels/minute pouvant attendre 60 secondes, au-delà des deadlines des routes
de 35–40 secondes. Les erreurs étaient alors masquées en catalog_unavailable ou
upstream_timeout. Une fiche isolée redevenue rapide ne suffit pas à exclure ce
défaut lors d’une navigation soutenue. Ce constat ne prouve pas une panne de la
connexion Internet de Walson.

Le backend passe à une admission immédiate et un refus 429 anilist_busy avec
error.details.retry_after, plutôt qu’une attente destinée à expirer. Il partage
les lectures publiques et minimales privées et réduit les enrichissements
inutiles. Le quota amont n’est pas augmenté. Le moteur ec1216adc4e3f0f6c3f633f5b1a7a6fd5ff8ce5b
a été vérifié réellement servi après le workflow 40981766771. Le
[diagnostic backend](2026-10-30-atlas-tv-loading-budget/backend-measures.json),
révoqué après lecture seule, mesure : Death Note détail/épisodes 718/717 ms,
My Hero Academia 291/289 ms, One Piece 659/658 ms. Les neuf lectures TV ont
coûté huit départs AniList, avec douze cache hits et aucun refus ni attente
résiduelle. Ma liste (24 cartes) prend 293 ms ; Recherche Death Note 170 ms.
Une lecture privée normale réutilisée prend 22 ms ; sa vérification explicite
fraîche 156 ms, avec un départ privé supplémentaire effectivement mesuré.
Cela vérifie un petit parcours réel, pas une session soutenue.

## Contrat client

- Les compléments de fiche/épisodes attendent 1200 ms. Quitter ou masquer la fiche
  arrête ceux non envoyés. Un retour peut reprendre les compléments manquants ;
  une requête déjà envoyée garde son identité/génération, sans fusion tardive
  dans une autre fiche. Une erreur de complément ne bloque pas le contenu prêt.
- L’accueil ne précharge plus ses affiches pendant un panneau. Les requêtes déjà
  parties ne sont pas présentées comme annulées côté serveur.
- TvLibrary.ensure peut envoyer reuse_recent:true seulement si le runtime annonce
  capabilities.library_read_cache === true. Le serveur autorise alors une lecture
  minimale récente de cinq secondes. Le cache local confirmé reste à trente secondes.
- load explicite, conflit, réponse perdue et présence inconnue omettent l’opt-in :
  vérification fraîche, aucune mutation rejouée automatiquement, aucun brouillon
  écrasé. Le client ancien reste frais par défaut.
- RequestState borne un retry_after numérique à 300 secondes et ne montre aucun
  message arbitraire amont. Recherche/Ma liste empêchent la répétition prématurée
  du même corps ; de nouveaux critères peuvent demander une autre lecture.

## États et revue visuelle

Après 160 ms, un squelette statique remplit le véritable emplacement vide. Il
ne contient aucun titre, statut ou résultat inventé, ne reçoit pas le focus et
ne maintient ni scintillement ni shader. Les données connues restent visibles.
Après quatre secondes, Recherche/Ma liste indiquent que le chargement se prolonge.
Un visuel sans source dont les reprises sont terminées cesse aussi d’afficher
un squelette : il indique son indisponibilité. Une erreur de lecture remplace
le squelette par une reprise explicite ; ce traitement ne
prétend pas accélérer l’amont.

Revue des vrais composants QML à 1280×720, API/compte/décodeur **simulés** :
[Recherche](2026-10-30-atlas-tv-loading-budget/loading-search.png),
[Ma liste](2026-10-30-atlas-tv-loading-budget/loading-library.png),
[profil](2026-10-30-atlas-tv-loading-budget/loading-profile.png),
[épisodes](2026-10-30-atlas-tv-loading-budget/loading-episodes.png),
[suivi](2026-10-30-atlas-tv-loading-budget/loading-followup.png),
[refus temporaire](2026-10-30-atlas-tv-loading-budget/loading-busy.png).
Les formes respectent les colonnes et les zones de contenu existantes. Les
filtres, la navigation et Retour restent disponibles ; les formes ne simulent
pas de cartes sélectionnables. Le délai évite un flash lors des lectures rapides.

La [fiche prête](2026-10-30-atlas-tv-loading-budget/loading-ready-detail.png)
porte seulement « 12 épisodes ». Une petite ligne « 5 diffusés sur 12 » apparaît
quand utile ; une saison entièrement diffusée porte simplement « 9 épisodes ».
Le [futur dans la fiche](2026-10-30-atlas-tv-loading-budget/followup-upcoming-detail.png)
emploie un repère compact, le visuel de série déjà connu assombri et la date
confirmée. Le [sélecteur du lecteur](2026-10-30-atlas-tv-loading-budget/followup-upcoming-player.png)
garde ce repère et sa date, sans inventer une vignette d’épisode futur. Pas de lecture ni de progression fictive sur le futur. Le calendrier
12/5 du banc est synthétique et n’est attribué à aucun titre réel.

## Vérifications

- [53 règles sans réseau](2026-10-30-atlas-tv-loading-budget/policy-verification.json) :
  certitude de diffusion, compteurs complets/partiels, retry borné, état personnel.
- [Banc réel QML](2026-10-30-atlas-tv-loading-budget/verification.json) avec API et
  décodeur simulés : lecture, pause/reprise, seek, Retour et identité canonique.
  Le même parcours passe en [MP4 sans négociation HLS](2026-10-30-atlas-tv-loading-budget/legacy-verification.json),
  y compris les [retards](2026-10-30-atlas-tv-loading-budget/legacy-loading-verification.json).
- [Suivi](2026-10-30-atlas-tv-loading-budget/follow-up-verification.json) : conflit,
  réponse perdue, relectures fraîches sans reuse_recent, cache normal opt-in,
  brouillon conservé, futurs bloqués et compléments incapables de les débloquer.
- [Retards et admission](2026-10-30-atlas-tv-loading-budget/loading-verification.json) :
  cinq squelettes, visuel absent sorti du chargement, aucune donnée inventée,
  Retry-After respecté, réponse de
  Recherche ignorée après fermeture, complément annulé avant envoi ou chargé
  quand on reste sur la fiche.
- [Session HTTP locale](2026-10-30-atlas-tv-loading-budget/session-verification.json) :
  sept requêtes, une seule rotation concurrente, runtime non fiable refusé et
  chemins médias fermés. Le réseau loopback du bac restreint refusait les
  connexions ; le même test passe hors de ce bac, sans aucun compte.

Ces tests ne mesurent ni le rendu physique du Devialet ni une longue navigation
sur le service réel. La saturation amont reste possible et doit être présentée
comme telle, sans écran de chargement indéfini.

## Publication vérifiée

Le [paquet](2026-10-30-atlas-tv-loading-budget/package.json)
hero-loading-5fe5d213c956 provient du commit source
868a6e318dfd8806c5a79e361c5666763e69b76d : 37 fichiers, 368182 octets, sans banc
ni identifiants. Le [précontrôle indépendant](2026-10-30-atlas-tv-loading-budget/preflight.json)
constate l’engine d0e7d0026d453ac1f1c260c2408405abfa703dbd alors servi :
le travail Carte a été déployé après les mesures ec1216ad, avec le correctif TV
conservé. Les mesures précédentes ne sont pas réattribuées à ce nouveau binaire.

Le gateway canonique 60197fa3eb26bfa47bb66fb48d6d459e05d754b6 annonce désormais
library_read_cache:true dans availability et runtime ; son SHA servi est
b620248f501686a6afd3b7e29c1440ddf7becb1e38c60dd480c0041e8a76698a. Ce
raccord est nécessaire : le bit n’était pas lu depuis config.capabilities.
La [publication UI](2026-10-30-atlas-tv-loading-budget/publication.json) valide
ce SHA, remplace seulement hero-artwork-20a862cdc84a et ne redémarre pas l’engine.

Le [reçu de lancement](2026-10-30-atlas-tv-loading-budget/launch.json) confirme
le SDK accepté et 34 ressources demandées, dont RequestState.js et
LoadingSkeleton.qml. Le runtime effectif, lu en mémoire avant ce lancement,
annonce strictement library_read_cache:true. Aucun épisode n’est démarré
automatiquement. Le téléchargement ne prouve pas le rendu physique ni une
longue session : la réception de Walson est demandée et reste en attente.

[Nettoyage](2026-10-30-atlas-tv-loading-budget/cleanup.json) : les deux transferts
distants sont retirés après vérification des empreintes ; le bundle actif et son
rollback privé 0600 restent disponibles. Les exports et paquets intermédiaires
locaux sont retirés après archivage des preuves. Aucun serveur de test du lot
ne reste actif. Le worktree partagé, les caches Qt/fonts/images communs et les
deux éléments non suivis préexistants sont conservés pour la suite TV.
