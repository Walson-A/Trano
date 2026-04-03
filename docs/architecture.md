# Architecture & Guidelines

## Stack Technique

- **Framework :** React 18 + TypeScript
- **Build :** Vite
- **Styles :** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **State :** Zustand (`useAppStore` pour l'UI, `useConfigStore` pour la persistance)
- **Domotique :** Home Assistant via WebSocket (`home-assistant-js-websocket`)
- **Persistance :** IndexedDB via Zustand persist (fallback localStorage)
- **Animations :** Motion (framer-motion)

## Arborescence `src/`

### 1. `src/config/` (Configuration)
- `rooms.ts` : Source unique de vérité pour les pièces (nom, étage, icône) et le mapping HA areas → pièces Trano (`HA_AREA_TO_ROOM`).

### 2. `src/core/store/` (State Management)
- `useAppStore.ts` : State UI (thème, navigation). Ne gère PAS les données HA.
- `useConfigStore.ts` : Overrides utilisateur persistés en IndexedDB (renommage d'appareils, assignation de pièces, masquage, positions floor plan).

### 3. `src/context/` (Providers React)
- `HAContext.tsx` : Provider WebSocket HA. Expose `useHA()` → `{ connection, entities, status, error }`.

### 4. `src/lib/` (Utilitaires techniques)
- `ha.ts` : Fonction `connectHA()` — crée la connexion WebSocket avec un token long-lived.

### 5. `src/hooks/` (Hooks métier)
- `useHAAdapter.ts` : Adaptateur HA → Trano. Fetch les registries HA (areas, entity registry, device registry), résout les pièces et noms, retourne des `Device[]` typés.

### 6. `src/ui/` (Design System)
Composants visuels "bêtes" (Dumb Components).
**Règle absolue :** Un composant `ui/` ne doit **jamais** importer `HAContext`.
- `Modal/Modal.tsx` : Modale réutilisable avec backdrop blur.

### 7. `src/components/` (Composants partagés)
- `Topbar.tsx` : Horloge, météo, system status, actions.
- `Sidebar.tsx` : Navigation latérale.
- `DeviceCard.tsx` : Carte d'appareil domotique.

### 8. `src/features/` (Logique Métier)
- `Weather/` : Widget météo + modale prévisions.
- `System/` : Indicateur de connexion HA.

### 9. `src/views/` (Écrans)
- `Dashboard.tsx` : Accueil (résumé, favoris).
- `FloorPlan.tsx` : Plan de la maison.
- `Rooms.tsx` : Vue par pièces (accordion).
- `Energy.tsx` : Énergie/consommation.

### 10. `src/types.ts`
Types partagés : `Device`, `DeviceState`, `DeviceType`, `DeviceOverride`, `RoomConfig`, `User`, etc.

## Résolution des données

### Pièce d'un appareil (par priorité)
1. **Override Trano** (`useConfigStore.deviceOverrides[entityId].roomId`)
2. **HA Area** (via `config/area_registry/list` + `config/entity_registry/list`)
3. **null** (non assigné)

### Nom d'un appareil (par priorité)
1. **Override Trano** (`deviceOverrides[entityId].displayName`)
2. **HA friendly_name** (`entity.attributes.friendly_name`)
3. **entity_id** (fallback)

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

## Configuration

Variables d'environnement dans `.env.local` (voir `.env.example`) :
- `VITE_HA_URL` : URL de l'instance HA
- `VITE_HA_TOKEN` : Long-lived access token
- `VITE_HA_WEATHER_ENTITY` : Entity ID météo
