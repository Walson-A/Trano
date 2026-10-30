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
à nouveau sélectionné. HTTP401 invalide la session, sans rejeu après refresh.

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
Il chevauchait donc la navigation (boutons entre y=24 et76).

Le titre reste sur deux lignes au maximum, à48px avec une interligne de50.
Un titre sur deux lignes limite le résumé à une ligne ; les espacements sont12px
et l’emplacement des boutons reste y=298–350. Le haut du titre long passe à116,
sous la zone de navigation98 avec18px de respiration. Un titre court commence
à142 et garde deux lignes de résumé. Pas de déplacement des rangées ou des CTA.

Le bloc à droite est le bouton Profil : pseudo et avatar. Sa largeur est
naturelle entre96 et260, au lieu d’imposer130 à un pseudo d’une lettre.
Les marges sont16, le vide entre texte et avatar12, l’avatar36×36 circulaire
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
  sous y112, boutons à298, bord droit conservé, gap12, avatar carré et centrage
  vertical à un demi-pixel près (arrondi Qt), pseudos courts et longs.
- [Retrait](2026-10-30-atlas-tv-removal-header/removal-verification.json) : capacité
  absente, consentement, annulation/Retour, doublon pendant l’envoi, absence
  canonique, conflit, réponses perdues appliquées et non appliquées, révision
  manquante après édition, entrée non confirmée incapable de supprimer.
- [Host QML](2026-10-30-atlas-tv-removal-header/verification.json),
  [suivi](2026-10-30-atlas-tv-removal-header/follow-up-verification.json),
  [chargements](2026-10-30-atlas-tv-removal-header/loading-verification.json) :
  parcours précédent conservé, API/compte/décodeur simulés. Même suite en
  [MP4](2026-10-30-atlas-tv-removal-header/mp4-verification.json), avec
  [retrait](2026-10-30-atlas-tv-removal-header/mp4-removal-verification.json).
- [57 règles Node](2026-10-30-atlas-tv-removal-header/policy-verification.json) et
  [session HTTP locale](2026-10-30-atlas-tv-removal-header/session-verification.json)
  (sept requêtes, rotation concurrente unique, runtime non fiable refusé).

Aucun animé du compte réel n’est retiré pour ces tests. La réception physique
de ces trois changements reste à confirmer après publication. Les preuves de
déploiement seront ajoutées quand le backend et le gateway annoncent le contrat.
