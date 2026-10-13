# Livraison multi-logement — 13 octobre 2026

## Version installée

- Lot initial : `9e48f64ae2fdcbd8001d627e5b804fa5e1cacc42` sur `main`.
- Correctif des anciennes pièces HA : `40c0b612c68423df614cd9b1c7d965a42152db96`.
- Version publiée par la CI : **Trano 1.2.34**, commit de version `aa55e4c`.
- [Workflow initial](https://github.com/Walson-A/Trano/actions/runs/38426238593)
  et [workflow final](https://github.com/Walson-A/Trano/actions/runs/38427743774) :
  publication et déploiement réussis, étape de redémarrage réellement exécutée.
- Image installée :
  `sha256:5b04c4548914028701ab6499950f2289c9fc9737772810b3df2babb9f247b964`.

Les empreintes Git des sources `homes.ts`, `routes/homes.ts`, `shopping.ts`,
`db.ts`, du client partagé `api.ts` et de `ha.ts` dans le conteneur ont été comparées
aux blobs du commit livré : elles correspondent. La version installée ne se
déduit donc pas du seul résultat vert de la CI.

## Vérifications réelles

La sauvegarde préalable par l’API Trano a répondu `ok: true`, « sauvegarde
vérifiée » ; sa copie hors site a été déposée. L’affectation de `light.led_tele`
à `apartment` a ensuite été faite par l’API, sans écriture directe dans SQLite.

- Appartement configuré par le HA commun ; LED Télé est présente seulement dans
  ses appareils et absente de ceux de `main`.
- Le profil qui la portait déjà en favori conserve ce favori dans l’appartement,
  y compris après le redémarrage du correctif.
- Une commande à LED Télé adressée à `main` répond 404 ; la même cible dans
  `apartment` reçoit un acquittement.
- Les commandes de réglage ont été acquittées en renvoyant les valeurs actuelles
  de luminosité et couleur. L’état et les réglages relus ont été conservés.
- L’ancienne pièce « Chambre Parents » n’est plus renvoyée pour l’appartement.
- Les listes de courses de chaque logement ont été lues séparément ; elles sont
  vides lors de cette vérification. Aucun article réel n’a été ajouté pour le test.

Les **six tests serveur ont aussi passé dans l’image finale installée**, avec
base temporaire et appels HA/Tuya simulés ; le processus de test n’utilise pas
la base vivante. Ils couvrent en particulier l’envoi atomique sans doublon,
les commandes croisées refusées et la reprise des favoris.

## Interface et limites de la preuve

TypeScript, les builds Trano et Atlas, les tests du client/espaces Atlas et la
[revue des vrais composants dans le banc](review.md) ont passé. La grande vue
embarquée et sa synchronisation de logement ont été testées dans ce banc.
La réception native du clavier et de la région WebView2 n’est pas déduite de ces
captures navigateur.

L’ouverture du site installé dans un nouveau navigateur Codex atteint son
onboarding ; son enregistrement comme appareil supplémentaire n’a pas été
autorisé par la revue automatique, donc n’a pas été soumis. Cette limite ne
modifie ni le déploiement, ni l’affectation, ni les clients Atlas déjà enregistrés.
Le connecteur Tuya direct reste facultatif ; aucun projet cloud supplémentaire
n’a été créé pour la voie retenue, qui conserve le HA familial et son lien Tuya.

## Réglage effectif confirmé

Une variation de luminosité d’un point a été envoyée via Trano, puis la nouvelle valeur a été relue dans l’état publié par la lampe. La valeur initiale a ensuite été restaurée et vérifiée ; état d’allumage et couleur sont restés identiques. Cette vérification complète les simples acquittements des commandes.
