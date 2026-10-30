# Atlas TV — retrait de Ma liste, titre du héros et profil

## Parcours et contrat de retrait

Dans la fiche, le bouton de suivi ouvre Mon suivi. « Retirer de Ma liste »,
au niveau de cette section, ne se confond pas avec le statut Abandonné.
La flèche Haut depuis la première ligne des statuts rejoint cette action.
Le panneau de confirmation décrit la suppression de l’entrée AniList avec
sa note, sa progression et ses notes personnelles. L’historique Atlas reste
conservé ; une nouvelle lecture effective pourra recréer un suivi.

Annuler est sélectionné initialement. Retour ferme seulement la confirmation,
puis un autre Retour ferme le suivi. Les répétitions automatiques de OK sont
ignorées. Une commande répétée pendant l’envoi ne produit pas un second retrait.
La confirmation bloque les clics vers les contrôles sous-jacents.

Le runtime doit annoncer strictement capabilities.library_remove === true.
Le corps POST /tv/v1/library-remove contient exactement anilist_id,
removal_revision (hex64 minuscule), request_id. Ni ID interne AniList, ni patch
de statut/note, ni confirm:true ne sont envoyés. Seule une entrée présente,
éditable et removable:true avec une révision de retrait valide peut être retirée.
Le serveur revalide son état frais et lie la révision à l’entrée précise.

Si une réponse d’édition ne fournit pas une nouvelle révision de retrait, le
client relit l’entrée sans reuse_recent avant de permettre le retrait. Une entrée
non confirmée présente « Vérifier mon suivi » ; elle ne devient pas supprimable
par hypothèse. Une réponse 409 ou perdue garde un état explicite. La vérification
est fraîche et ne renvoie jamais la suppression. Si elle confirme l’absence,
celle-ci se propage à la fiche, au héros et à l’invalidation de Ma liste. Si
l’entrée existe toujours, un nouveau consentement est nécessaire, avec Annuler
à nouveau sélectionné. Même si la vérification échoue puis que le panneau est
fermé et rouvert, le retrait en attente interdit reuse_recent : cette reprise
reste une lecture fraîche. HTTP401 invalide la session, sans rejeu après refresh.

Revue à 1280×720 des composants QML réels, avec compte et API **simulés** :
[action dans le suivi](2026-10-30-atlas-tv-removal-header/remove-entry.png),
[confirmation](2026-10-30-atlas-tv-removal-header/remove-confirmation.png),
[réponse perdue](2026-10-30-atlas-tv-removal-header/remove-uncertain.png),
[état fraîchement vérifié](2026-10-30-atlas-tv-removal-header/remove-rechecked.png).
L’action de retrait est alignée sur l’en-tête Ma liste ; la confirmation utilise
le même panneau, un fond opaque lisible, des conséquences explicites et deux
actions stables en bas. Les données privées du banc sont synthétiques.

## Collision du titre et profil

Le bloc du héros était ancré par son bas à y=350. Avec deux lignes de titre,
deux lignes de résumé et ses espacements, son haut remontait à y=58 :
[avant](2026-10-30-atlas-tv-removal-header/before-long.png),
[mesure](2026-10-30-atlas-tv-removal-header/before-verification.json).
Il chevauchait donc la navigation (boutons entre y=24 et 76).

Le titre reste sur deux lignes au maximum, à 48 px avec une interligne de 50.
Un titre sur deux lignes limite le résumé à une ligne ; les espacements sont 12 px
et l’emplacement des boutons reste y=298–350. Le haut du titre long passe à 116,
sous la zone de navigation 98 avec 18 px de respiration. Un titre court commence
à 142 et garde deux lignes de résumé. Pas de déplacement des rangées ou des CTA.

Le bloc à droite est le bouton Profil : pseudo et avatar. Sa largeur est
naturelle entre 96 et 260, au lieu d’imposer 130 à un pseudo d’une lettre.
Les marges sont 16, le vide entre texte et avatar 12, l’avatar 36×36 circulaire
avec PreserveAspectCrop. Le texte long s’élide sans repousser le bord droit.
Le masque utilise les dimensions de l’image ; le pictogramme Profil prend le
relais si elle manque. Le nom accessible désigne le profil concerné.

[Titre long corrigé](2026-10-30-atlas-tv-removal-header/header-long.png),
[court](2026-10-30-atlas-tv-removal-header/header-short.png),
[pseudo long / avatar absent](2026-10-30-atlas-tv-removal-header/header-profile-long.png).
Ces captures de limites utilisent des chaînes synthétiques et des pixels locaux
indépendants : elles vérifient la composition, pas une association de médias réelle.

## Vérifications et limites

- [Géométrie](2026-10-30-atlas-tv-removal-header/header-verification.json) : titre
  sous y=112, boutons à 298, bord droit conservé, gap 12, avatar carré et centrage
  vertical à un demi-pixel près (arrondi Qt), pseudos courts et longs.
- [Retrait](2026-10-30-atlas-tv-removal-header/removal-verification.json) : capacité
  absente, consentement, annulation/Retour, doublon pendant l’envoi, absence
  canonique, conflit, réponses perdues appliquées et non appliquées, révision
  manquante après édition, entrée non confirmée incapable de supprimer,
  vérification échouée puis panneau rouvert toujours relu fraîchement.
- [Host QML](2026-10-30-atlas-tv-removal-header/verification.json),
  [suivi](2026-10-30-atlas-tv-removal-header/follow-up-verification.json),
  [chargements](2026-10-30-atlas-tv-removal-header/loading-verification.json) :
  parcours précédent conservé, API/compte/décodeur simulés. Même suite en
  [MP4](2026-10-30-atlas-tv-removal-header/mp4-verification.json), avec
  [retrait](2026-10-30-atlas-tv-removal-header/mp4-removal-verification.json).
- [57 règles Node](2026-10-30-atlas-tv-removal-header/policy-verification.json) et
  [session HTTP locale](2026-10-30-atlas-tv-removal-header/session-verification.json)
  (sept requêtes, rotation concurrente unique, runtime non fiable refusé).

Aucun animé du compte réel n’est retiré pour ces tests. Après publication,
Walson confirme sur le Devialet : « Le bouton et la confirmation fonctionnent,
le haut est propre ». La question de réception demandait d’ouvrir la confirmation
puis de faire Retour, ainsi que de vérifier un titre long et le bloc Profil.
Le bouton, la confirmation, son retour et le haut de l’écran sont donc reçus
positivement. Ce retour ne prouve pas une suppression AniList réelle.

## Publication et ménage

Le [paquet](2026-10-30-atlas-tv-removal-header/package.json)
hero-membership-5541d3b5f6e2 contient 37 fichiers / 374764 octets, construits depuis
c060e744d10ca3de6832f050f7bc1e13a866bf47. Aucun banc, média local ou identifiant
n’est distribué. Le [précontrôle indépendant](2026-10-30-atlas-tv-removal-header/preflight.json)
vérifie l’engine réellement servi 9a24539c351f0c2a912b45d7262642051e3f0e5b
(CI 40988549084 réussie côté backend) et le gateway SHA
9aff6df6cb928627931116a6b05b60273b9b6c78c2c2d160d44a7a657f645b12.
Les capacités library_remove et library_read_cache sont annoncées strictement.

La [publication UI](2026-10-30-atlas-tv-removal-header/publication.json) remplace
seulement hero-loading-5fe5d213c956, vérifie les empreintes et ne redémarre pas
l’engine. Le [reçu SDK](2026-10-30-atlas-tv-removal-header/launch.json) confirme
l’acceptation et 34 ressources demandées. Le runtime effectif, lu en mémoire avant
le SDK, expose les deux capacités. Aucun épisode ni retrait d’entrée n’est lancé.
Le téléchargement ne prouve pas le rendu physique ni une mutation AniList réelle.

[Nettoyage](2026-10-30-atlas-tv-removal-header/cleanup.json) : les deux transferts
distants sont retirés après vérification des empreintes ; le bundle actif et son
rollback privé 0600 sont conservés. Les exports et paquets intermédiaires locaux
sont supprimés après archivage des preuves. Aucun serveur de test du lot ne
reste actif. Le worktree partagé, les caches Qt/fonts/images communs et les deux
éléments non suivis préexistants sont préservés pour la suite TV. Le futur
lancement depuis Oby n’est pas inclus dans ce lot ni dans sa validation.
