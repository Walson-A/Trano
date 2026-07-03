# API du serveur Trano

Base : même origine que l'app (`/api/...`). Toutes les réponses sont en JSON.
Types de référence dans `packages/shared/src/index.ts`.

## Santé & config

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | `{ status: 'ok', uptime }` |
| GET | `/api/config` | Config HA pour le frontend : `{ haUrl, haToken, weatherEntity }`. Remplie par les variables `TRANO_HA_*` (options de l'add-on en prod). |

> `/api/config` expose le token HA à tout appareil du réseau local — c'est
> assumé : l'app est réservée au LAN de la maison, comme l'était le token
> compilé dans le build auparavant.

## Profils

| Méthode | Route | Corps | Description |
|---|---|---|---|
| GET | `/api/profiles` | — | Tous les profils |
| POST | `/api/profiles` | `{ name, avatar?, color?, roomIds?, isKid? }` | Créer (201) |
| PATCH | `/api/profiles/:id` | champs partiels (dont `favorites`) | Modifier |
| DELETE | `/api/profiles/:id` | — | Supprimer (204) |

`Profile` : `{ id, name, avatar (emoji), color (hex), roomIds (string[]),
isKid, favorites (entity_ids), createdAt }`.

## Liste de courses

| Méthode | Route | Corps | Description |
|---|---|---|---|
| GET | `/api/shopping` | — | Tous les articles (réactive au passage les récurrents dus) |
| POST | `/api/shopping` | `{ title, category?, quantity?, authorId?, recurrenceDays? }` | Créer (201) |
| PATCH | `/api/shopping/:id` | champs partiels + `{ status, boughtBy }` | Modifier / cocher |
| DELETE | `/api/shopping/:id` | — | Supprimer (204) |

Catégories : `alimentaire`, `maison`, `hygiene`, `vetements`, `loisirs`, `autre`.

### Cycle de vie d'un article récurrent

1. Création avec `recurrenceDays` (ex. 7).
2. `PATCH { status: 'bought', boughtBy }` → le serveur pose `boughtAt` et
   `nextDue = maintenant + recurrenceDays`.
3. À l'échéance, l'article repasse automatiquement en `todo` (vérifié à
   chaque `GET /api/shopping` + toutes les 15 min côté serveur).

Les transitions `todo ⇄ bought` sont **entièrement gérées côté serveur** —
le client n'envoie que l'intention.

## WebSocket `/api/ws`

Sync temps réel entre les écrans de la maison. Le serveur n'envoie que des
messages d'invalidation :

```json
{ "type": "changed", "topic": "profiles" | "shopping" }
```

Le client refetche le topic concerné (`connectTranoWs()` dans
`apps/web/src/lib/api.ts`, reconnexion automatique avec backoff).

## Base de données

SQLite via `node:sqlite` (module intégré à Node ≥ 22.5, aucune dépendance
native). Fichier unique `TRANO_DB_PATH`, mode WAL. Deux tables : `profiles`
et `shopping_items` (schéma dans `apps/server/src/db.ts`). Sauvegarde =
copie du fichier ; dans l'add-on HAOS, `/data` est inclus dans les
sauvegardes automatiques de Home Assistant.
