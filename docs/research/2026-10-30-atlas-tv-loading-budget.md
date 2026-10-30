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
inutiles. Le quota amont n’est pas augmenté. Les mesures après déploiement et
la référence exacte du backend seront ajoutées à la livraison.

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
Une erreur remplace le squelette par une reprise explicite ; ce traitement ne
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
et le [sélecteur du lecteur](2026-10-30-atlas-tv-loading-budget/followup-upcoming-player.png)
emploient un repère compact, le visuel de série déjà connu assombri et la date
confirmée. Pas de lecture ni de progression fictive sur le futur. Le calendrier
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
  cinq squelettes, aucune donnée inventée, Retry-After respecté, réponse de
  Recherche ignorée après fermeture, complément annulé avant envoi ou chargé
  quand on reste sur la fiche.
- [Session HTTP locale](2026-10-30-atlas-tv-loading-budget/session-verification.json) :
  sept requêtes, une seule rotation concurrente, runtime non fiable refusé et
  chemins médias fermés. Le réseau loopback du bac restreint refusait les
  connexions ; le même test passe hors de ce bac, sans aucun compte.

Ces tests ne mesurent ni le rendu physique du Devialet ni une longue navigation
sur le service réel. La saturation amont reste possible et doit être présentée
comme telle, sans écran de chargement indéfini.
