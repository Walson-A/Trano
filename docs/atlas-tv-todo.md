# Atlas TV — suites demandées par Walson

Demandes du 29 octobre 2026 à conserver pour **après la passe visuelle en cours**.
Ce document décrit le travail restant, pas des fonctions déjà livrées. L’état du
chantier courant est dans [la direction TV](atlas-tv-direction.md).

## Bibliothèque et suivi personnel

- Ajouter à Ma liste depuis une fiche, montrer l’état confirmé et permettre de
  gérer proprement le statut. Réutiliser les données et règles du PC/mobile.
- Préparer la note sur 10 par demi-point, sa modification et son retrait ; gérer
  progression, enregistrement, erreur et annulation à la télécommande.
- Partager le moi confirmé par le backend et l’identité AniList, sans liste
  parallèle locale ni succès fictif. Ne pas confondre le statut personnel
  « En cours/Terminé » avec le statut de diffusion de la série.
- La route appareil TV de modification de bibliothèque manque encore. Le RPC
  propriétaire ne doit pas être exposé directement au Player.

[Audit PC/mobile et parcours proposé](research/2026-10-29-atlas-tv-library-density.md).
Les avis privés et leur saisie sont une étape distincte.

## VOSTFR par défaut

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

Point de code déjà relevé : DetailView.qml initialise french à false, mais sa
fonction open le remplace à partir de a_lancer.vf ou, à défaut, de franime.vf.
La disponibilité d’une VF peut donc devenir le choix initial de la fiche ; elle
ne représente pas une préférence explicite de Walson. Vérifier les autres points
d’entrée avant de corriger cette seule ligne.

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
- Compteur explicite du type « 5 épisodes sortis sur 12 annoncés » quand ces deux
  nombres sont confirmés, plutôt qu’un simple « 12 épisodes » trompeur.
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

Ces points sont enregistrés pour la suite, sans élargir le lot d’en-tête visuel
ou le lot HLS en cours dans l’autre chat. Leur analyse backend et leur mise en
œuvre auront leurs propres contrats et vérifications. Les cas ci-dessus doivent
être conservés même si le titre exact du signalement n’est pas encore retrouvé.
