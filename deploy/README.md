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
    env_file: .env
    volumes:
      - trano-data:/data

volumes:
  trano-data:
```

`.env` :

| Variable | Valeur |
|---|---|
| `TRANO_HA_URL` | l'instance Home Assistant (ex. `http://192.168.1.158:8123`) |
| `TRANO_HA_TOKEN` | token longue durée HA (Profil → Sécurité → Créer un token) |
| `TRANO_WEATHER_ENTITY` | `weather.forecast_home` |
| `TRANO_OPENROUTER_KEY` | clé OpenRouter, pour l'assistant des écrans |
| `TRANO_OPENROUTER_MODEL` | optionnel, sinon le modèle par défaut |
| `TRANO_DB_PATH` | `/data/trano.db` |
| `TRANO_MCP_TOKEN` | jeton du serveur MCP servi à Oby — absent, la route est fermée (voir [`docs/mcp_oby.md`](../docs/mcp_oby.md)) |

## Mettre à jour

La CI publie l'image à chaque fusion sur `main`
(`.github/workflows/publish-image.yml` : build du frontend, image amd64 + arm64,
tags `:<version>` et `:latest`, puis incrément de la version recommité avec
`[skip ci]`). Côté serveur :

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
  -e TRANO_HA_URL=http://192.168.1.158:8123 \
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
