# Architecture & Guidelines

## Vue d'ensemble

Trano est un **monorepo npm workspaces** composé de trois paquets :

```
apps/web          Frontend React (l'interface)
apps/server       Serveur Trano (Fastify + SQLite) — profils, courses, config
packages/shared   Types TypeScript partagés entre web et server
```

**Répartition des rôles :**
- Le **navigateur** parle directement à Home Assistant en WebSocket pour le
  temps réel domotique (états, commandes).
- Le **serveur Trano** est la source de vérité pour tout ce qui est partagé
  entre les membres de la famille : profils, liste de courses. Il sert aussi
  le build du frontend en production et fournira les ponts Freebox et IA.
- La **sync temps réel** entre écrans passe par le WebSocket du serveur
  (`/api/ws`) : messages d'invalidation → les clients refetchent.

## Stack Technique

- **Frontend :** React 18 + TypeScript, Vite, Tailwind CSS v4, Zustand, Motion
- **Backend :** Fastify 5 + `node:sqlite` (SQLite intégré à Node, zéro
  dépendance native — crucial pour l'image Docker ARM64 de la Freebox)
- **Domotique :** Home Assistant via WebSocket (`home-assistant-js-websocket`)
- **Déploiement :** add-on HAOS sur la VM Freebox Delta (voir `deploy/README.md`)

## `apps/server/`

- `src/index.ts` : bootstrap Fastify, routes, fichiers statiques (prod), fallback SPA.
- `src/db.ts` : ouverture SQLite + schéma (`profiles`, `shopping_items`).
  Chemin de la base : `TRANO_DB_PATH` (défaut `apps/server/data/trano.db`,
  `/data/trano.db` dans l'add-on).
- `src/routes/profiles.ts` / `src/routes/shopping.ts` : API REST (voir `docs/server_api.md`).
- `src/ws.ts` : broadcast d'invalidation vers tous les clients connectés.

## `packages/shared/`

Types consommés par les deux apps : `Profile`, `ShoppingItem`,
`SHOPPING_CATEGORIES`, messages WS. Importés via `@trano/shared`
(sources TS directement, pas de build).

## Arborescence `apps/web/src/`

### 1. `config/`
- `rooms.ts` : Source unique de vérité pour les pièces (nom, étage, icône) et le mapping HA areas → pièces Trano (`HA_AREA_TO_ROOM`).

### 2. `core/store/`
- `useAppStore.ts` : State UI (thème, navigation). Ne gère PAS les données HA.
- `useConfigStore.ts` : Overrides utilisateur persistés en IndexedDB (renommage d'appareils, assignation de pièces, masquage, positions floor plan).
- `useProfileStore.ts` : Profils (chargés depuis le serveur) + profil actif de CET appareil (persisté localStorage). Hook `useActiveProfile()`.
- `useShoppingStore.ts` : Liste de courses, avec mise à jour optimiste pour le cocher/décocher.

### 3. `context/`
- `HAContext.tsx` : Provider WebSocket HA. Expose `useHA()` → `{ connection, entities, status, error }`.

### 4. `lib/`
- `ha.ts` : `connectHA()` — connexion WebSocket avec token long-lived.
- `api.ts` : Client REST du serveur Trano + `connectTranoWs()` (reconnexion auto).
- `runtimeConfig.ts` : Résolution de la config HA — variables `VITE_` en dev,
  `/api/config` en production. **Ne jamais figer URL/token HA au build.**

### 5. `hooks/`
- `useHAAdapter.ts` : Adaptateur HA → Trano. Fetch les registries HA (areas, entity registry, device registry), résout les pièces et noms, retourne des `Device[]` typés.

### 6. `ui/` (Design System)
Composants visuels "bêtes" (Dumb Components).
**Règle absolue :** Un composant `ui/` ne doit **jamais** importer `HAContext`.
- `Modal/Modal.tsx` : Modale réutilisable avec backdrop blur.

### 7. `components/`
- `Topbar.tsx` : Horloge, météo, system status, actions.
- `Sidebar.tsx` : Navigation latérale + profil actif (retour à l'écran de sélection).
- `DeviceCard.tsx` : Carte d'appareil domotique.

### 8. `features/`
- `Weather/` : Widget météo + modale prévisions.
- `System/` : Indicateur de connexion HA.
- `Profiles/` : Écran de sélection façon Netflix (`ProfileGate`) + éditeur (`ProfileEditor`).

### 9. `views/`
- `Dashboard.tsx` : Accueil (résumé, favoris du profil actif).
- `FloorPlan.tsx` : Plan de la maison.
- `Rooms.tsx` : Vue par pièces (accordion).
- `Shopping.tsx` : Liste de courses partagée.
- `Energy.tsx` : Énergie — temps réel + historique, 100 % données HA réelles (voir `docs/energy.md`).
- `Settings.tsx` : Réglages — état des systèmes, gestion des appareils (renommer, assigner une pièce, masquer). Inaccessible aux profils enfants.

### 10. `types.ts`
Types locaux au frontend : `Device`, `DeviceState`, `DeviceType`, `DeviceOverride`, `RoomConfig`.
Les types partagés (profils, courses) vivent dans `@trano/shared`.

## Résolution des données

### Pièce d'un appareil (par priorité)
1. **Override Trano** (`useConfigStore.deviceOverrides[entityId].roomId`)
2. **HA Area** (via `config/area_registry/list` + `config/entity_registry/list`)
3. **null** (non assigné)

### Nom d'un appareil (par priorité)
1. **Override Trano** (`deviceOverrides[entityId].displayName`)
2. **HA friendly_name** (`entity.attributes.friendly_name`)
3. **entity_id** (fallback)

### Config HA (par priorité)
1. **Dev :** `VITE_HA_URL` / `VITE_HA_TOKEN` (`.env.local` dans `apps/web/`)
2. **Prod :** `GET /api/config` du serveur (rempli par les options de l'add-on)

### Types d'appareils supportés

| Domain HA | Type Trano | Contrôles |
|---|---|---|
| `light` | `light` | on/off, brightness |
| `switch` | `switch` | on/off |
| `climate` | `climate` | temp cible, mode |
| `lock` | `lock` | lock/unlock |
| `media_player` | `media` | play/pause, volume |
| `cover` | `cover` | open/close |
| `fan` | `fan` | on/off |
| `sensor` / `binary_sensor` | `sensor` | lecture seule |
| `camera` | `camera` | stream |

## Développement

```bash
npm install        # à la racine (workspaces)
npm run dev        # lance web (:3000) + server (:3001) ensemble
npm run build      # build de production du frontend
npm run lint       # tsc --noEmit sur tous les workspaces
```

Le proxy Vite redirige `/api` (HTTP et WS) vers le serveur en dev.

## Configuration

Variables d'environnement :

| Variable | Où | Description |
|---|---|---|
| `VITE_HA_URL` / `VITE_HA_TOKEN` / `VITE_HA_WEATHER_ENTITY` | `apps/web/.env.local` | Connexion HA en dev |
| `TRANO_HA_URL` / `TRANO_HA_TOKEN` / `TRANO_WEATHER_ENTITY` | env serveur (prod) | Exposées au frontend via `/api/config` |
| `TRANO_PORT` / `TRANO_HOST` | env serveur | Écoute (défaut `3001` / `0.0.0.0`) |
| `TRANO_DB_PATH` | env serveur | Chemin SQLite (défaut `apps/server/data/trano.db`) |
