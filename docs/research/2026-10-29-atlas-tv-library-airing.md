# Atlas TV — Ma liste, note et épisodes à venir

Lot demandé par Walson après validation de la Recherche à six affiches. Il conserve
le lecteur et les cartes existants, avec les composants QML réels et les mêmes
polices, images verticales et repères de focus. Le contrat a été arrêté avec le
[backend](https://github.com/Walson-A/Atlas/blob/2ca91d5d44b122a9a418e7d5a1169ae3e537cf58/docs/research/atlas-tv-library-2026-10-29.md).

## Parcours

- **Ma liste** rejoint Accueil et Recherche lorsque le runtime annonce library.
  La grille à six affiches réutilise DiscoveryView, avec un filtre de statut
  personnel et 24 titres/page. Le retour de fiche conserve ce contexte. Si une
  modification vide la dernière page, la pagination rejoint une page encore valide.
- La fiche propose **+ Ma liste** pour une absence confirmée : l’action ajoute
  explicitement en PLANNING. Une carte publique avec moi:null n’est jamais utilisée
  comme preuve d’absence ; la lecture privée doit d’abord réussir.
- Une entrée déjà présente ouvre **Mon suivi**. Son statut confirmé figure aussi
  sur le bouton de la fiche ; **Noter** ouvre directement la note. Le panneau
  latéral garde le titre et le contexte visibles, avec six statuts, une note
  sur 10 et Enregistrer/Annuler. Le fond sombre, les boutons existants et la
  bordure blanche du focus gardent une hiérarchie commune avec le lecteur.
- Les flèches préparent une note par demi-point ; OK rejoint Enregistrer. Une
  note existante comme 7,2 reste intacte hors édition. Retirer la note envoie null.
  Le focus dans la grille ne sélectionne pas à lui seul un autre statut.
- Retour ferme seulement le panneau et abandonne un brouillon non envoyé. Après
  Enregistrer, la requête peut finir en arrière-plan si le panneau a été fermé.
  Une erreur conserve le brouillon. Après conflit ou réponse perdue, Vérifier
  relit le suivi : aucune mutation n’est automatiquement rejouée.

Les réponses moi font foi. Les patches TV omettent la progression lorsqu’elle
n’est pas modifiée ; cela ne garantit pas qu’AniList n’ajustera jamais lui-même
ce champ lors d’un changement de statut. Le panneau montre la progression
actuellement confirmée. Si le statut, la présence ou la progression changent,
l’accueil est relu pour
renouveler les cibles de reprise, en conservant le titre et la rangée ciblés.
Les compléments d’une ancienne lecture d’accueil ne remplacent pas une lecture
plus récente. Les avis privés et le retrait complet d’une entrée ne font pas
partie de cette première version.

## Épisodes

EpisodePolicy est partagé par la fiche, le menu et le lanceur. Le compteur
distingue annoncé et diffusé : « 5 épisodes sortis sur 12 annoncés », ou une
incertitude explicite quand ces données manquent. Le menu et le pied du lecteur
utilisent le même résumé, lié à la série effectivement en lecture.

Un futur confirmé reste focusable pour lire sa date, sans image ni icône de
lecture qui le présenteraient comme disponible. OK ne prépare aucun flux. Les
compléments tardifs moins certains ne peuvent pas le réactiver. Si son instant
prévu est passé, l’action relit d’abord le calendrier ; elle ne lance pas une
vidéo par déduction. Une date au jour seule ne fournit pas cette preuve.

Le libellé de date du serveur utilise le fuseau configuré. Le fallback conserve
l’offset explicite, sans convertir dans le fuseau inconnu du boîtier. Date absente :
« Date à confirmer ». Un état inconnu n’est pas renommé « À venir ». La présence
FrAnime VF seule ne détermine plus la possibilité de jouer chez les autres sources.

Le serveur bloque les futurs avant toute résolution, y compris les appels directs
à playbacks/readers/variants. Le client traite episode_not_aired, hors plage et
calendrier indisponible distinctement. Un changement refusé conserve l’épisode
actuel et sa vidéo ; aucune progression n’est ajoutée par la sélection d’un futur.

## Contrat et limites

Les capacités library et airing sont des booléens stricts. Les trois routes privées
library, library-entry et library-update utilisent le credential appareil existant,
sans jeton propriétaire dans le Player. Identité, présence, édition et révision
sont validées ; la réponse d’écriture doit aussi reprendre le UUID envoyé.
Ce UUID sert à la corrélation, sans promesse d’exécution distante exactement une fois.
Après relecture, seuls les champs réellement édités restent dans le brouillon :
une note ne rétablit pas un statut ancien modifié sur PC. Le cache privé de suivi
est volatil et vidé à la révocation de session.

## Revue et vérifications

Captures 1280×720 du vrai QML, avec **API, compte et décodeur de banc simulés** :

- [Fiche et ses quatre actions](2026-10-29-atlas-tv-library-airing/followup-detail.png).
- [Mon suivi et la note 7,2](2026-10-29-atlas-tv-library-airing/followup-rating.png).
- [Conflit, brouillon conservé](2026-10-29-atlas-tv-library-airing/followup-conflict.png).
- [Futur dans la fiche](2026-10-29-atlas-tv-library-airing/followup-upcoming-detail.png).
- [Futur ciblé dans le lecteur](2026-10-29-atlas-tv-library-airing/followup-upcoming-player.png).
- [Ma liste](2026-10-29-atlas-tv-library-airing/followup-library.png).

Le calendrier 12/5 et les notes de ces captures sont des scénarios synthétiques,
pas des affirmations sur Frieren ni le titre « Gear… » non identifié par Walson.
Aucune fixture ni adaptation de banc n’est distribuée dans le paquet produit.

Les [45 règles de domaine](2026-10-29-atlas-tv-library-airing/domain-verification.json)
passent. L’hôte complet passe [avec HLS](2026-10-29-atlas-tv-library-airing/hls-follow-up-verification.json)
et [sans HLS](2026-10-29-atlas-tv-library-airing/legacy-follow-up-verification.json),
avec les anciens parcours du lecteur. La session réelle passe aussi ses sept
requêtes HTTP jetables. Les tests n’écrivent pas dans un compte réel.

Revue visuelle : actions de fiche dans la largeur disponible ; panneau lisible
avec distinction entre statut choisi et focus ; progression actuelle explicite ;
compteur et date visibles ; aucune icône Play sur les futurs. La revue a révélé
un focus retenu par un éditeur invisible et une sélection de lecteur hors écran
après reconstruction du modèle d’images : les deux comportements sont corrigés
et vérifiés dans le banc. Les chaînes UTF-8 des fixtures sont écrites explicitement
pour ne pas confondre un défaut d’encodage de test avec une police manquante.

Le [contrat réel](2026-10-29-atlas-tv-library-airing/real-contract.json) est aussi
validé par LibraryPolicy sur une réponse réelle du gateway : page de 24 éléments,
entrée compatible, absence d’avis privés. Le diagnostic est révoqué dans finally ;
aucune mutation ni commande du Player n’est émise par ce contrôle.

La publication de l’interface et son reçu SDK seront consignés après composition
du paquet. Les captures de banc ne remplacent pas une observation physique de la TV.

## Choix manuel FrAnime coordonné

Le backend ajoute FrAnime aux lecteurs canoniques existants. La TV reconnaît la
source `franime`, son reader_id opaque et le libellé « FrAnime · Sendvid » dans
le lecteur courant. Aucune URL ni coordonnée de fournisseur n’est transmise par
le client. Une qualité unique Originale conserve aussi l’option Automatique :
le choix explicite reste distinct et envoie son variant_id pour les reprises
strictes. Les autres sources restent admises, et un ancien paquet ignore les
lignes de source inconnue sans rejeter le reste du catalogue. Les nouveaux
contrôles du banc couvrent ce choix en MP4 et HLS. Sa publication est coordonnée
après le signal du backend, avec le lot Ma liste et diffusion.

[Menu Source](2026-10-29-atlas-tv-library-airing/followup-franime-source.png) et
[choix Originale](2026-10-29-atlas-tv-library-airing/followup-franime-quality.png)
dans le banc QML, avec lecteur simulé.
