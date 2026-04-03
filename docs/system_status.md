# Feature : System Status

Le composant `SystemStatus` (`src/features/System/SystemStatus.tsx`) monitore l'état de santé de la connexion HA.

## Fonctionnalités
- **Indicateur de connexion :** Badge vert (connecté) ou rouge (déconnecté) dans la topbar.
- **Mesure de latence :** Ping WebSocket HA toutes les 5 secondes.
- **Infos version :** Affiche la version Home Assistant via `haConfig`.
- **Origine de connexion :** Identifie si la connexion est locale ou externe.
- **Reconnexion :** Bouton pour forcer un refresh en cas de désynchronisation.

## Architecture
- **Composant :** `src/features/System/SystemStatus.tsx`
- **Dépendance :** `HAContext` pour la communication WebSocket.
- **Style :** Tailwind CSS, popover avec backdrop blur.
