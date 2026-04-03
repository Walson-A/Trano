# Architecture & Guidelines

## Stack Technique

- **Framework :** React 18 + TypeScript
- **Build :** Vite
- **Styles :** Tailwind CSS v4 (via `@tailwindcss/vite`)
- **State :** Zustand (`src/core/store/useAppStore.ts`)
- **Domotique :** Home Assistant via WebSocket (`home-assistant-js-websocket`)

## Arborescence `src/`

### 1. `src/core/` (Infrastructure)
Logique globale indépendante de l'interface.
- `store/useAppStore.ts` : State global UI (thème, navigation) via Zustand. Ne gère PAS les données HA.

### 2. `src/context/` (Providers React)
- `HAContext.tsx` : Provider WebSocket Home Assistant. Expose `useHA()` qui retourne `{ connection, entities, status, error }`.

### 3. `src/lib/` (Utilitaires techniques)
- `ha.ts` : Fonction `connectHA()` — crée la connexion WebSocket avec un token long-lived.

### 4. `src/hooks/` (Hooks métier)
- `useHAAdapter.ts` : Transforme les entités HA brutes en objets `Device` typés utilisables par les vues.

### 5. `src/ui/` (Design System)
Composants visuels "bêtes" (Dumb Components).
**Règle absolue :** Un composant `ui/` ne doit **jamais** importer `HAContext` ni connaître Home Assistant.
- `Modal/Modal.tsx` : Modale réutilisable avec backdrop blur.

### 6. `src/components/` (Composants partagés)
Composants réutilisables pouvant consommer du contexte.
- `Topbar.tsx` : Barre supérieure (horloge, météo, system status, actions).
- `Sidebar.tsx` : Navigation latérale avec onglets.
- `DeviceCard.tsx` : Carte d'appareil domotique.

### 7. `src/features/` (Logique Métier)
Couche "Smart" : l'interface rencontre la donnée HA.
- `Weather/` : Widget météo + modale prévisions (hourly/daily).
- `System/` : Indicateur de connexion HA avec diagnostics.

### 8. `src/views/` (Écrans)
Assemblage des composants et features en vues complètes.
- `Dashboard.tsx` : Accueil avec résumé météo, conso, sécurité + favoris.
- `FloorPlan.tsx` : Vue plan de la maison.
- `Rooms.tsx` : Vue par pièces.
- `Energy.tsx` : Vue énergie/consommation.

### 9. `src/types.ts` & `src/data.ts`
- `types.ts` : Types partagés (`Device`, `User`, `DeviceType`, etc.).
- `data.ts` : Données mock (utilisateurs). Les devices viennent de HA.

## Configuration

Les entity IDs et credentials HA sont dans `.env.local` (voir `.env.example`).
