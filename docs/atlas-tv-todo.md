# Atlas TV — suites demandées par Walson

Demandes du 29 octobre 2026 à conserver pour **après la passe visuelle en cours**.
Ce document conserve les critères demandés et distingue leur livraison du reste
à faire. L’état courant est dans [la direction TV](atlas-tv-direction.md).

## Bibliothèque et suivi personnel

[Livraison Ma liste / notes / calendrier](research/2026-10-29-atlas-tv-library-airing.md)
par hero-library-60a7cb562ecd : ajout PLANNING, statuts, note sur 10 et retrait de
note, annulation, conflits et erreurs, grille privée à six affiches et filtres.
Le backend expose les routes appareil fermées ; aucun RPC propriétaire n’est
transmis au Player. Restent les avis privés, le retrait complet d’une entrée et
une éventuelle édition explicite de progression. Les critères ci-dessous sont
conservés pour les régressions.

- Ajouter à Ma liste depuis une fiche, montrer l’état confirmé et permettre de
  gérer proprement le statut. Réutiliser les données et règles du PC/mobile.
- Préparer la note sur 10 par demi-point, sa modification et son retrait ; gérer
  progression, enregistrement, erreur et annulation à la télécommande.
- Partager le moi confirmé par le backend et l’identité AniList, sans liste
  parallèle locale ni succès fictif. Ne pas confondre le statut personnel
  « En cours/Terminé » avec le statut de diffusion de la série.
- Les routes appareil fermées utilisent la révision canonique. Le RPC propriétaire
  ne doit pas être exposé directement au Player.

[Audit PC/mobile et parcours proposé](research/2026-10-29-atlas-tv-library-density.md).
Les avis privés et leur saisie sont une étape distincte.

## VOSTFR par défaut

Correctif [publié sur la TV](research/2026-10-29-atlas-tv-search-vostfr-live.md)
dans bea83d08cae6 : héros Lecture/Reprendre et ouverture d’une fiche demandent VO,
sans transformer la disponibilité VF en préférence. La VF explicite est conservée.
Le banc couvre ces deux entrées et la langue du lecteur ; ce lot ne change pas
les préférences des clients PC/mobile. Le diagnostic et les critères ci-dessous
sont conservés pour les régressions.

Walson rapporte que la TV lui propose la VF par défaut, alors qu’il préfère
nettement la VOSTFR. La VF doit rester disponible comme choix explicite.

- VOSTFR par défaut à l’arrivée, dans la fiche et au lancement sans choix explicite.
- Vérifier aussi les raccourcis Lecture/Reprendre, les cibles a_lancer et le
  passage à l’épisode/saison suivants : un défaut VF ne doit pas revenir par
  une autre entrée du parcours.
- Afficher la langue effectivement demandée et obtenue. Une indisponibilité
  VOSTFR ne justifie pas une bascule silencieuse vers la VF.
- Examiner la règle de préférence mémorisée et sa portée PC/téléphone/TV avant
  de généraliser. Aucun réglage ou historique n’est modifié par cette note.

Diagnostic avant correctif : DetailView.qml initialisait french à false, mais sa
fonction open le remplaçait à partir de a_lancer.vf ou, à défaut, de franime.vf.
La disponibilité d’une VF peut donc devenir le choix initial de la fiche ; elle
ne représentait pas une préférence explicite de Walson. Le héros présentait le
même défaut ; les deux chemins sont corrigés et testés.

## Diffusion des séries et disponibilité des épisodes

Cas utilisateur à reproduire : animé coréen adapté d’un webtoon, titre remémoré
partiellement comme « Gear… ». La fiche annonçait 12 épisodes, tous cliquables,
alors que seulement 5 étaient sortis. Les suivants échouaient à la lecture sans
indication qu’ils étaient à venir ; leurs dates n’étaient pas affichées.
Le titre exact reste à retrouver, sans attribuer ce signalement à un autre animé.

Trois informations doivent être distinctes :

1. **Total annoncé** de la saison, parfois inconnu ou prévisionnel.
2. **Épisodes déjà diffusés**, issus d’un calendrier ou de métadonnées fiables.
3. **Épisodes disponibles à la lecture** chez les sources, pour la langue choisie.

Critères attendus :

- Série : état À venir/En diffusion/Terminée lorsqu’il est connu ; ne pas déduire
  cet état du statut personnel dans Ma liste.
- Titre « 12 épisodes », accompagné discrètement de « 5 diffusés sur 12 » si la
  diffusion est incomplète et les nombres confirmés ; aucune répétition si terminée.
- Épisode futur connu : repère À venir, date/heure si connues et aucune commande
  de lecture active qui lance une résolution vouée à l’échec. Pas de marque Vu
  ou de progression écrite par sa simple sélection.
- Épisode diffusé mais absent d’une source ou d’une langue : indiquer cette
  indisponibilité distinctement ; ne pas l’appeler « pas encore sorti ».
- Dates issues de données fiables, présentées dans le fuseau de l’utilisateur.
  Si elles manquent, dire « Date non annoncée » ou « Diffusion à confirmer ».
  Ne pas inventer un calendrier hebdomadaire à partir d’un numéro d’épisode.
- Métadonnées incomplètes : ne pas conclure automatiquement qu’un épisode n’est
  pas diffusé simplement parce qu’un fournisseur ne le liste pas.
- La fiche, le sélecteur d’épisodes du lecteur et les actions Lecture/Suivant
  doivent partager le même état, actualisé sans perdre le focus.

Exemple d’acceptation : pour 12 annoncés/5 diffusés, les épisodes 1–5 présentent leur
disponibilité réelle ; 6–12 sont identifiés comme futurs si le calendrier le
confirme. Le sixième affiche sa date connue ou son incertitude. Si le sixième
est ensuite diffusé mais sans VF, la VOSTFR peut devenir jouable sans présenter
la VF comme disponible. Aucun essai ne doit ajouter artificiellement de progression.

## Ordre et coordination

La composition visuelle et le VOSTFR ont été livrés après validation, avec le
lot HLS de l’autre chat. Ma liste, notes et diffusion ont ensuite été raccordés
au backend et publiés dans hero-library-60a7cb562ecd, avec les tests de conflit,
de relecture après timeout et de futurs bloqués. Le backend FrAnime manuel est
composé dans la même interface. La réception physique reste à faire. Les cas
ci-dessus restent les critères de régression ; le titre exact « Gear… » n’a pas
été identifié et aucun calendrier fictif n’est présenté comme son calendrier.

## Chargements — 30 octobre 2026

La saturation du limiteur AniList pouvait dépasser la deadline des routes. Le
backend corrige l’admission et partage les lectures minimales ; la TV diffère
les compléments non essentiels de 1200 ms, annule ceux non envoyés au départ
et interrompt le préchargement des affiches d’accueil pendant les panneaux.
La réutilisation privée de cinq secondes est un opt-in de lecture normale ;
les vérifications après conflit ou réponse perdue restent fraîches.
Voir [preuves et limites](research/2026-10-30-atlas-tv-loading-budget.md). La
rapidité sur le Devialet est confirmée par Walson ; la latence sur une longue
session reste à vérifier.

## Retirer un animé — 30 octobre 2026

Le retrait réel d’une entrée AniList est distinct du statut Abandonné. Le client
TV utilise la capacité library_remove et une révision de retrait dédiée ; une
réponse perdue impose une lecture fraîche, sans rejeu automatique. Le panneau
annonce la perte du suivi AniList et la conservation de l’historique local.
[Contrat, états et livraison](research/2026-10-30-atlas-tv-removal-header.md).

Le lot est publié dans hero-membership-5541d3b5f6e2 ; les preuves de retrait
restent simulées, aucun animé réel n’a été supprimé pour la livraison.

## Accueil et rangées — proposition du 30 octobre 2026

Walson choisit l’accueil pour la nouvelle passe. La [proposition QML et son
carnet](research/2026-10-30-atlas-tv-home-browse.md) présentent le grand héros
à l’arrivée et deux rangées lisibles pendant l’exploration, avec mémoire du
focus et du numéro de reprise. Le lecteur validé reste inchangé. Walson accepte
le grand héros à l’arrivée puis sa réduction pendant la navigation. Il demande
les [bandes-annonces de fiche](research/2026-10-30-atlas-tv-detail-previews.md),
automatiques en fond et accessibles en plein écran. Bancs passés, paquet
hero-detail-preview-390d8b68e685 publié et relancé par SDK. La réception physique
est suivie séparément dans le rapport dédié.
