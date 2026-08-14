# Déployer Trano

Trano tourne comme **conteneur Docker sur le serveur de la maison**, à côté de
l'engine Oby. L'image est fabriquée par GitHub Actions et publiée sur GHCR : le
serveur ne compile rien, il télécharge.

> **La VM Home Assistant de la Freebox, c'est fini.** Trano y a d'abord tourné
> comme add-on HAOS ; la VM est plafonnée à 1 Go et Trano y étouffait Home
> Assistant (commit `71afd18`). Tout est parti sur le serveur de la maison, et
> **la piste add-on est abandonnée** — ne pas la ressusciter sans raison neuve.
>
> Ce qui en reste dans le dépôt, et pourquoi : `addon/trano/config.yaml` sert
> encore de **compteur de version** (la CI l'incrémente et s'en sert comme tag
> d'image), et `repository.yaml` est le fichier que lisait la boutique HA. Le
> jour où on remplace le compteur, les deux peuvent partir.

> **Depuis le 2026-08-13, Home Assistant a suivi.** La VM de la Freebox ne
> répondait plus (port ouvert, aucune réponse HTTP) ; HA tourne désormais en
> conteneur sur le serveur, à côté de Trano, sur **http://192.168.1.65:8123**.
> Pourquoi un conteneur et pas une VM HA OS, et ce qu'il reste à faire :
> [`home-assistant.md`](home-assistant.md).

## Le serveur de la maison

```
~/trano/
  docker-compose.yml   image ghcr.io/walson-a/trano:latest, port 3001, volume trano-data
  .env                 les secrets (jamais dans git)
```

`docker-compose.yml` :

```yaml
services:
  trano:
    image: ghcr.io/walson-a/trano:latest
    container_name: trano
    restart: unless-stopped
    ports:
      - "3001:3001"
    # Le conteneur tourne sous `trano` (uid 1000), PAS root. Docker lance en root
    # par défaut ; ici on s'aligne sur l'utilisateur de l'engine Oby, pour que
    # tout ce que Trano écrit lui appartienne — c'est ce qui rend le dépôt de la
    # sauvegarde chez Oby possible sans bricolage de permissions.
    user: "1000:1000"
    environment:
      # Sans ça le conteneur tourne en UTC, et la passe de sauvegarde de 01:30
      # s'exécute en réalité à 03:30 heure de Paris. Même raison que le `TZ` de
      # l'unité systemd de l'engine Oby.
      TZ: Europe/Paris
      # Dépôt de la sauvegarde du jour chez Oby, qui l'emporte chiffrée sur Drive.
      TRANO_OBY_BACKUP_DIR: /oby-backups
    env_file: .env
    volumes:
      - trano-data:/data
      # Le dossier des sauvegardes quotidiennes d'Oby. Rien d'autre de sa maison
      # n'est monté : ni les bases vivantes, ni `config/` (qui porte ses secrets).
      - /var/lib/oby/backups/daily:/oby-backups

volumes:
  trano-data:
```

> ⚠️ **Le volume s'appelle `trano_trano-data`, pas `trano-data`.** Compose préfixe
> par le nom du projet. Une commande visant `trano-data` ne touche donc pas la vraie
> base : Docker crée silencieusement un volume vide de ce nom et opère dessus.
> Erreur commise le 2026-08-14, qui a laissé Trano en lecture seule trois minutes.

## Sauvegardes de la base

Depuis le 2026-08-14, le serveur sauvegarde `trano.db` **tout seul**, une fois par
jour (`apps/server/src/lib/backup.ts`) : `quick_check` → copie à chaud par l'Online
Backup API → **relecture de la copie pour la vérifier** → `wal_checkpoint` →
rotation 7 quotidiens / 4 hebdomadaires.

- Les copies vivent dans `/data/backups/` — **le même volume que la base**. Elles
  protègent d'une fausse manœuvre ou d'une migration ratée, **pas** de la perte du
  volume. D'où le dépôt chez Oby ci-dessous.
- Chaque fichier est **une base complète et autonome**. Restaurer :
  `docker compose stop`, remplacer `/data/trano.db` par le fichier voulu, supprimer
  les `/data/trano.db-wal` et `-shm` de l'ancienne base, `docker compose up -d`.
- État : `GET /api/backup/status`. Déclenchement manuel avant une migration :
  `POST /api/backup/run`.
- Réglages : `TRANO_BACKUP_TIME` (défaut `01:30`, **heure locale** — d'où le `TZ`
  ci-dessus) et `TRANO_BACKUP_DIR` (défaut `/data/backups`).

### Le hors-site, offert par Oby

L'engine Oby tourne sur la même machine et pousse chaque nuit un coffre chiffré
(tar → age → Google Drive), avec canari anti-échec silencieux et drill de
restauration mensuel. Sa sélection ramasse **tout `*.db`** trouvé dans son dossier
du jour — pas une liste figée. Trano y dépose donc sa copie (`TRANO_OBY_BACKUP_DIR`)
juste après l'avoir vérifiée, à 01:30, soit avant la passe d'Oby de 02:00.

Résultat : sauvegarde chiffrée hors site, sans OAuth, sans passphrase, sans une
ligne de code côté Oby.

> ⚠️ **C'est un couplage implicite, pas un contrat.** Le jour où quelqu'un durcit
> `backup_cloud/mod.rs::database_entries` en liste explicite — ce qui serait une
> amélioration raisonnable côté Oby — **le hors-site de Trano s'arrêterait sans un
> mot**. Le garde-fou : le champ `offsite` de `GET /api/backup/status` doit dire
> « déposé ». C'est aussi documenté dans `Atlas/engine/docs/backup_cloud.md`.

> Une base dont le `quick_check` échoue **n'est jamais sauvegardée** : sa dernière
> copie saine est conservée. Vérifié en corrompant volontairement une copie de
> travail — la sauvegarde de la veille a survécu.

> **Piège de diagnostic** : l'image Alpine n'embarque pas `tzdata`, donc
> `docker exec trano date` affiche **UTC** même avec `TZ=Europe/Paris`. Ça ne veut
> pas dire que le réglage est inopérant : **Node a son propre ICU** et respecte bien
> `TZ`. Vérifié en réel — `date` disait 23:09 UTC pendant que Node répondait
> `getHours() = 1:09` et `toLocaleDateString = 2026-08-14`. C'est Node qui décide de
> l'heure des sauvegardes, pas le shell.

`.env` :

| Variable | Valeur |
|---|---|
| `TRANO_HA_URL` | l'instance Home Assistant — `http://192.168.1.65:8123` depuis le 2026-08-13 (voir [`home-assistant.md`](home-assistant.md)) |
| `TRANO_HA_TOKEN` | token longue durée HA (Profil → Sécurité → Créer un token) |
| `TRANO_WEATHER_ENTITY` | `weather.forecast_home` |
| `TRANO_OPENROUTER_KEY` | clé OpenRouter, pour l'assistant des écrans |
| `TRANO_OPENROUTER_MODEL` | optionnel, sinon le modèle par défaut |
| `TRANO_DB_PATH` | `/data/trano.db` |
| `TRANO_MCP_TOKEN` | jeton du serveur MCP servi à Oby — absent, la route est fermée (voir [`docs/mcp_oby.md`](../docs/mcp_oby.md)) |

## Mettre à jour

**Une fusion sur `main` déploie, sans rien taper.**
`.github/workflows/publish-image.yml` fait les deux moitiés :

1. `publish` — build du frontend, image amd64 + arm64, tags `:<version>` et
   `:latest` sur GHCR, puis incrément de la version recommité avec `[skip ci]`.
2. `deploy` — rejoint le tailnet, se connecte en SSH au serveur et lance
   `docker compose pull && docker compose up -d`, puis **vérifie** que
   `/api/health` répond avant de se déclarer vert.

> Le second job existe parce que **rien ne tire l'image tout seul** sur le
> serveur : ni watchtower, ni timer, ni cron (vérifié le 2026-08-08). Sans lui,
> une livraison publie une image que personne n'installe — et on croit avoir
> déployé.

⚠️ **Seule `main` déclenche la CI.** Une livraison sur `dev` ne publie rien et
ne déploie rien ; c'est voulu, mais ça se confond facilement avec « poussé donc
en ligne ».

Si les secrets de déploiement manquent (`TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`,
`TRANO_DEPLOY_SSH_KEY`), le job `deploy` **se saute proprement** en écrivant un
avertissement : l'image est publiée, le serveur n'est pas à jour. Le rattrapage
manuel — c'est aussi la manœuvre à connaître quand le tailnet est en panne :

```bash
cd ~/trano && docker compose pull && docker compose up -d
```

Les données (profils, courses) survivent : elles vivent dans le volume
`trano-data`, monté sur `/data`, hors du conteneur.

## Utiliser

Sur n'importe quel appareil de la maison : **http://\<serveur\>:3001**.
Ajoutez le site à l'écran d'accueil des téléphones et tablettes pour un
lancement plein écran façon application.

## Écran mural : vieil iPad (iOS 12)

Le build inclut un bundle « legacy » qui fonctionne sur Safari 12
(iPad Air 1, iPad mini 2/3…). Mise en place :

1. Sur l'iPad, ouvrez Safari → `http://<serveur>:3001/?kiosk`
   (le paramètre `?kiosk` active un rafraîchissement automatique chaque
   nuit à 4h, pour purger la mémoire des vieux Safari).
2. Partager → **Sur l'écran d'accueil** → ouvrez l'icône Trano créée :
   l'app se lance en plein écran, sans barre Safari.
3. **Réglages → Luminosité et affichage → Verrouillage auto → Jamais.**
4. **Réglages → Accessibilité → Accès guidé** : activez, définissez un code.
   Ouvrez Trano, puis **triple-clic sur le bouton principal → Démarrer** :
   l'iPad est verrouillé sur Trano (impossible d'en sortir sans le code).
   Dans les options d'Accès guidé, laissez « Verrouillage auto : Jamais ».
5. Branchez l'iPad sur secteur en permanence. Évitez de le coller contre
   un mur sans aération : les vieilles batteries n'aiment pas la chaleur.

Limites connues sur iOS 12 : quelques espacements plus serrés et des
effets de flou absents — l'interface reste entièrement fonctionnelle.

## Faire tourner l'image ailleurs

L'image publiée est une image Docker ordinaire :

```bash
docker run -d --name trano -p 3001:3001 \
  -v trano-data:/data \
  -e TRANO_HA_URL=http://192.168.1.65:8123 \
  -e TRANO_HA_TOKEN=votre_token \
  ghcr.io/walson-a/trano:latest
```

Pour la reconstruire localement, compilez d'abord le frontend
(`npm run build` — le `Dockerfile` attend `apps/web/dist` déjà présent),
puis `docker build -t trano .`.

## Visibilité de l'image

Home Assistant comme Docker téléchargent l'image **sans identifiants** : elle
doit rester lisible publiquement. Le dépôt étant public, GHCR l'a publiée
publiquement. Si un jour un `docker compose pull` échoue sur une erreur
d'authentification, c'est que le paquet est repassé en privé : page du dépôt →
colonne de droite, section **Packages** → **trano** → **Package settings** →
*Danger Zone* → **Change visibility** → **Public**.

## Déploiement automatique (secrets de la CI)

La CI publie l'image à chaque livraison sur `main`, mais **ne déploie sur le
serveur que si trois secrets sont posés** dans le dépôt Trano (Settings →
Secrets and variables → Actions). Sans eux l'étape se saute proprement en
rappelant la commande manuelle.

| Secret | Où l'obtenir |
|---|---|
| `TS_OAUTH_CLIENT_ID` | Console Tailscale → Trust credentials → nouveau client OAuth |
| `TS_OAUTH_SECRET` | idem — **affiché une seule fois** |
| `TRANO_DEPLOY_SSH_KEY` | clé privée ed25519 dédiée (voir ci-dessous) |

**Pourquoi Tailscale** : le runner GitHub est sur Internet, le serveur est
derrière la Freebox sans adresse publique. Le runner rejoint donc le tailnet le
temps du déploiement. Scope nécessaire : **`auth_keys` en écriture**, avec le
tag **`tag:ci`** (obligatoire pour ce scope).

**Pourquoi une clé SSH dédiée** — et pas celle d'Oby, dont le workflow déploie
sur la même machine : pour pouvoir **couper le déploiement de Trano sans toucher
au sien**. Sa publique est dans les `authorized_keys` du serveur sous le
commentaire `github-actions-deploy-trano`.

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy-trano" -f ~/.ssh/trano_deploy -N ""
```

> ⚠️ Les secrets GitHub sont en **écriture seule** : une fois enregistrés,
> personne ne peut les relire, pas même leur auteur. On ne peut donc pas les
> recopier depuis un autre dépôt — il faut les valeurs d'origine, ou en
> regénérer. Et une clé privée collée **sans son retour à la ligne final** fait
> échouer la CI avec un message peu parlant.
