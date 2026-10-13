# Plusieurs logements, une famille

Contrat du 13 octobre 2026 : Walson utilise Tuya Smart à l’appartement ; chez ses
parents, Home Assistant réunit plusieurs comptes. Chaque logement garde ses
appareils et sa liste de courses. Les profils de la famille restent communs.
L’envoi des courses est choisi, jamais automatique.

## Voie retenue : le Home Assistant familial

Après vérification en lecture seule du serveur le 13 octobre 2026, Home Assistant
est en version 2026.10.1 et Tuya est chargé. Walson confirme que **LED Télé** a été
déplacée chez lui depuis la maison familiale ; l’entité `light.led_tele` est déjà
remontée et allumée. Il n’est donc pas nécessaire de créer un projet cloud Tuya
pour ce logement : conserver le lien existant, puis affecter cette entité à
`apartment` avec l’API ou le choix d’appareils. Cette inspection n’a envoyé aucune
commande matérielle et l’affectation n’est effective qu’après déploiement.

L’intégration Tuya officielle est **Cloud Push** : les ampoules de l’appartement
et le HA des parents doivent accéder à Internet, pas au même LAN. Pour un autre
compte : ajouter une entrée Tuya dans HA, saisir le code utilisateur de l’app
Tuya Smart et scanner le QR. Aucun Home Assistant à installer dans l’appartement.
[Parcours officiel HA/Tuya](https://www.home-assistant.io/integrations/tuya/).

Sans fichier privé, `apartment` utilise désormais `haSource: "main"`. Le choix des
entités est en SQLite (`home_devices`), avec exclusivité par source HA : les
appareils affectés à l’appartement disparaissent des listes et des commandes de
main, y compris dans le frontend HA historique et les outils MCP. La famille reste
commune, mais son HA ne signifie plus que tous ses appareils sont au même endroit.
Lors de la première affectation d’un appareil déjà favori dans main, chaque profil
concerné retrouve ce favori dans le logement destinataire. Les autres favoris sont
conservés ; modifier à nouveau la même affectation ne rétablit pas un favori retiré
explicitement dans ce logement.
Les anciennes pièces HA ne sont pas reprises pour l’appartement : un appareil
déplacé peut encore y porter « Chambre Parents ». Son logement est confirmé, mais
sa pièce reste non renseignée dans Trano tant qu’un rangement propre à ce logement
n’a pas été défini. Les pièces de la maison familiale restent intactes.
Les scènes Tuya ne déclarant pas leurs membres, une scène non affectée n’est plus
proposée lorsque le HA sert plusieurs logements ; ne pas présumer son périmètre.

La grande vue utilise l’API Trano si le WebSocket HA local n’est pas accessible
depuis le réseau de l’appartement. Les commandes et courses restent disponibles
par le serveur familial accessible via Tailscale. Plan, énergie détaillée et
réglages historiques restent dans le parcours HA local connecté.

## Usage

Le sélecteur de la barre supérieure choisit le logement contrôlé. Le choix est
local à chaque écran et persiste ; `?home=apartment` permet à Atlas de viser
explicitement l’appartement. Le widget transmet aussi le logement à chaque
commande. Le changement de logement ferme les fiches et abandonne les brouillons.
Une réponse ancienne ne doit jamais remplir la liste du nouveau logement.

`main` conserve l’installation historique, ses pièces, son plan, son énergie et
ses favoris. Les autres logements ont une vue d’appareils issue du serveur :
état, allumer/éteindre, intensité et couleurs déclarées par le connecteur, favoris
par couple logement/profil. Les fonctions non disponibles restent absentes.
Aucun appareil fictif ne remplace une connexion absente.

Dans Courses, sélectionner les articles à acheter et le logement destinataire,
puis Envoyer. La source reste intacte. Le destinataire reçoit une copie à acheter,
avec quantité/catégorie/auteur, sans récurrence. Le serveur refuse toute la sélection
si un article manque ; les tentatives répétées n’ajoutent pas de doublon. Une copie
déjà envoyée et achetée n’est pas recréée : ajouter un nouvel article source pour
un nouveau besoin. Le destinataire peut supprimer la copie et autoriser un nouvel envoi.

## Connecteurs

`TRANO_HOMES_FILE` désigne un fichier JSON privé du serveur. Sans fichier, deux
logements sont proposés : `main` (HA historique via `TRANO_HA_*`) et `apartment`
(même HA, appareils à affecter). Garder les identifiants stables, notamment `main`. Ne pas
committer ce fichier ni le servir au navigateur.

Exemple à compléter dans la configuration privée :

```json
[
  { "id": "main", "name": "Maison familiale", "provider": "ha" },
  {
    "id": "apartment", "name": "Appartement", "provider": "ha", "haSource": "main"
  }
]
```

Un autre logement HA peut déclarer `haUrl` et `haToken` côté serveur. Ses commandes
REST utilisent un contexte asynchrone propre à la requête : aucune mutation d’une
variable globale HA. Les pièces/plan/énergie détaillée restent propres à `main` ;
ce lot ne généralise pas les pièces ni les géofences à tous les logements.

### Alternative : Tuya direct, sans dépendance au HA familial

Le connecteur direct reste une alternative optionnelle (`provider: "tuya"`, champ
`tuya` contenant `region`, `clientId`, `secret`, `uid`, `deviceIds`). Il n’est pas
nécessaire pour LED Télé ; ne pas demander de clés ou d’abonnement pour cette voie HA.

1. Dans [Tuya Developer Platform](https://platform.tuya.com), créer un projet
   **Smart Home** dans le centre de données du compte (ne pas deviner la région).
2. Autoriser les services requis et vérifier que le service IoT Core est actif.
3. Dans Devices → Link App Account, afficher le QR et le scanner avec **Tuya Smart**.
4. Relever UID, Client ID et Client Secret directement dans la configuration privée.
5. Choisir explicitement les IDs des appareils de l’appartement. La liste du compte
   peut contenir d’autres logements : ils ne sont jamais ajoutés automatiquement.
6. Monter le fichier en lecture seule dans le conteneur, définir `TRANO_HOMES_FILE`,
   redémarrer Trano et vérifier `/api/homes`, puis l’état d’une lampe réelle avant
   son premier pilotage. L’autorisation QR se fait sur la plateforme Tuya ; Trano
   ne propose pas encore un appairage QR embarqué.

Exemple Compose : `./config/homes.json:/run/trano/homes.json:ro`, avec
`TRANO_HOMES_FILE=/run/trano/homes.json` dans le `.env` non versionné. Le fichier doit
être lisible par l’UID 1000 du conteneur. La configuration de connecteur n’est pas
dans SQLite : sa sauvegarde privée doit être prévue séparément des sauvegardes DB.

Sources officielles consultées le 13 octobre 2026 :
[autorisation du compte et clés](https://developer.tuya.com/en/docs/developer/apply-cloud-api-key?id=Kff30z8sv62ah),
[signature HMAC](https://developer.tuya.com/en/docs/iot/singnature?id=Ka43a5mtx1gsc),
[SDK API officiel](https://github.com/tuya/tuya-cloud-sdk-go),
[codes de lumière](https://developer.tuya.com/en/docs/iot/dj?id=K9i5ql6yir2oy),
[conditions et quotas](https://developer.tuya.com/en/docs/iot/membership-service?id=K9m8k45jwvg9j).
L’accès cloud dépend du service actif et de ses quotas ; l’essai peut expirer.
Vérifier les conditions du compte réel avant activation, sans promettre un accès
gratuit permanent. Les lectures sont mutualisées pendant deux minutes ; un petit
délai de rafraîchissement après commande permet de suivre la confirmation.

L’adaptateur reconnaît les booléens `switch_led`, `switch`, `switch_1`, les bornes
des fonctions d’intensité et `colour_data_v2` lorsqu’un état HSV exploitable existe.
Un appareil inconnu ou une serrure n’obtient pas un interrupteur par déduction.
Les scènes et la température en kelvins Tuya ne sont pas exposées : les bornes
physiques des ampoules ne sont pas connues. Pas de transformation inventée.

## API et données

- `GET /api/homes` : id, nom, provider, configured ; aucun secret.
- `GET /api/homes/:id/candidates` : appareils disponibles de sa source HA.
- `PUT /api/homes/:id/devices` : `{ entityIds }`, affectation explicite et exclusive.
  Pour main, une entité non affectée reste historique ; vider la sélection d’un
  logement supplémentaire rend ces appareils à main.
- `/api/house`, `/api/house/device`, `/api/house/light`, `/api/house/scene` :
  `?home_id=…` ; défaut historique `main`. L’état confirme `home_id` et contient
  aussi `appareils`, `favorite_ids`, `refresh_seconds`. Les scènes sont HA seulement.
- `PUT /api/homes/:id/favorites` : `{ profileId, favorites }` pour les logements
  supplémentaires ; les favoris de main restent dans le profil historique.
- Toutes les routes `/api/shopping` acceptent `?home_id=…`, y compris PATCH/DELETE.
- `POST /api/shopping/send?home_id=source` : `{ targetHomeId, itemIds }` ; réponse
  `{ added, alreadySent }`.
- MCP : `lister_logements`, puis `home_id` dans les outils. Sans ce champ, `main`.
  Les courses restent hors de la liste blanche d’Oby. L’assistant intégré reste
  visible seulement à la maison familiale dans ce lot.

Migration additive : `shopping_items.home_id DEFAULT 'main'`, `source_item_id`,
index d’envoi unique, tables `home_favorites` et `home_devices`. Les sauvegardes SQLite existantes
incluent les nouvelles tables. Les anciennes données ne sont ni copiées ni effacées.

Les profils sont un choix d’usage, pas des identités authentifiées. Ce lot utilise
l’accès familial privé existant ; il n’installe pas les droits d’un produit public
multi-utilisateur. À terme : identités, appartenance à une famille et autorisations
par logement, puis géofence par logement. L’app native Trano reste sur `main` tant
que son sélecteur n’est pas livré ; l’ancien client ne reçoit plus toutes les courses.

## Vérification et livraison

`node --test apps/server/tests/multi-home.test.mjs`, `npm run lint`, `npm run build`.
Le banc navigateur est `apps/web/tests/multi-home-browser.mjs` (Playwright/Edge),
avec fixtures explicitement isolées, jamais des données de repli de l’app.
Voir [la revue visuelle](reviews/multi-home/review.md).

Le code préparé dans `feat/multi-home-release`, basé sur le main actuel, n’est
pas une preuve de déploiement. Avant publication, déclencher la sauvegarde SQLite
par `POST /api/backup/run` et vérifier son résultat. Le workflow de `main` publie
une image puis tente son déploiement ; vérifier le job et le commit installé,
puis affecter LED Télé à `apartment` et vérifier son favori repris. Son compte
Tuya est déjà relié au HA familial : aucun nouvel appairage n’est nécessaire.
Pas d’essai matériel annoncé avant la vérification après livraison.

Livraison vérifiée : **Trano 1.2.34**, lot `9e48f64` et correctif `40c0b61`.
LED Télé est affectée à l’appartement, son favori existant est repris et les
commandes à la maison familiale sont refusées pour cette cible.
[Preuves du déploiement et limites](reviews/multi-home/deployment.md).
