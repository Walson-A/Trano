# API du serveur Trano

Base : même origine que l'app (`/api/...`). Toutes les réponses sont en JSON.
Types de référence dans `packages/shared/src/index.ts`.

## Santé & config

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/health` | `{ status: 'ok', uptime }` |
| GET | `/api/config` | Config HA pour le frontend : `{ haUrl, haToken, weatherEntity }`. Remplie par les variables `TRANO_HA_*` (le `.env` du conteneur en prod). |

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

## Surcharges d'appareils

Surcharges personnalisées d'appareils (renommage, assignation de pièce, masquage, position floor plan), synchronisées sur tous les écrans.

| Méthode | Route | Corps | Description |
|---|---|---|---|
| GET | `/api/device-overrides` | — | Toutes les surcharges (`Record<entityId, DeviceOverride>`) |
| PUT | `/api/device-overrides/:entityId` | `{ displayName?, roomId?, hidden?, position? }` | Créer ou mettre à jour (UPSERT) |
| DELETE | `/api/device-overrides/:entityId` | — | Supprimer la surcharge (retour aux valeurs HA) |

`DeviceOverride` : `{ displayName?, roomId?, hidden?, position?: { x, y } }`.

## WebSocket `/api/ws`

Sync temps réel entre les écrans de la maison. Le serveur n'envoie que des
messages d'invalidation :

```json
{ "type": "changed", "topic": "profiles" | "shopping" | "rooms" | "device-overrides" }
```

Le client refetche le topic concerné (`connectTranoWs()` dans
`apps/web/src/lib/api.ts`, reconnexion automatique avec backoff et refetch global au rétablissement du réseau via `onReconnect`).

## Maison `/api/house`

L'état de la maison en un objet, pour un **client d'application** (premier
consommateur : le widget Maison de LifeOS).

| Méthode | Route | Corps / query | Description |
|---|---|---|---|
| GET | `/api/house` | `?profile=<id>` (optionnel) | `{ energie, meteo, favoris[], allumes[], total_appareils, profil_connu }`. `favoris` = les entités favorites du profil, dans **leur ordre**, résolues avec leur état et leur pièce ; un favori absent de HA est simplement omis. |
| POST | `/api/house/device` | `{ entity_id, action }` | `turn_on` / `turn_off` / `toggle`. `403` si le domaine est refusé (serrures, alarme), `502` si HA est injoignable. |

`profil_connu: false` distingue « aucun profil demandé » de « profil sans
favori » — sans quoi un client ne peut pas savoir s'il doit proposer un choix.

Les garde-fous sont ceux de `lib/ha.ts` (`controlDevice`) : entity_id validé,
domaines autorisés, serrures et alarme exclues. Cette route ne les réécrit pas.

> **Pourquoi cette route en plus de `/api/mcp`** : un outil MCP renvoie du JSON
> sérialisé dans une chaîne, dans une trame SSE — la bonne forme pour un LLM, la
> mauvaise pour un widget qui veut un objet typé toutes les dix secondes. Deux
> protocoles, une seule couche métier dessous.

## Serveur MCP `/api/mcp`

Les outils domotiques servis à **Oby** en JSON-RPC MCP (streamable-HTTP,
stateless), protégés par `Authorization: Bearer <TRANO_MCP_TOKEN>` — sans cette
variable la route répond `503`. `GET`/`DELETE` répondent `405` : le serveur ne
tient aucune session.

Dix outils exposés (lecture + pilotage des appareils) ; les courses,
l'interphone et la Freebox restent hors de portée d'Oby. Détail complet,
raisons et branchement côté engine : **[`docs/mcp_oby.md`](mcp_oby.md)**.

## Base de données

SQLite via `node:sqlite` (module intégré à Node ≥ 22.5, aucune dépendance
native). Fichier unique `TRANO_DB_PATH`, mode WAL. Quatre tables : `profiles`,
`shopping_items`, `rooms` et `device_overrides` (schéma dans `apps/server/src/db.ts`). Sauvegarde =
copie du fichier ; en production c'est le volume Docker `trano-data`, monté
sur `/data`, qui la porte.
