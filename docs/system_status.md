# Feature : System Status (Diagnostic & Connectivité)

Le composant `SystemStatus` (dans `src/features/System/`) fournit un tableau de bord minimaliste pour monitorer l'état de santé technique du dashboard.

## Fonctionnalités
- **Indicateur de Connexion :** Icône dynamique (Wifi/WifiOff) changeant selon l'état du WebSocket HA.
- **Mesure de Latence :** Effectue un `ping()` sur l'instance Home Assistant toutes les 5 secondes pour mesurer le temps de réponse (en ms).
- **Informations Version :** Affiche la version actuelle de Home Assistant via le `haConfig`.
- **Origine de Connexion :** Identifie si le dashboard est connecté via l'URL locale ou externe.
- **Action de Récupération :** Bouton "Forcer la Reconnexion" qui rafraîchit l'interface en cas de désynchronisation.

## Architecture FSD
- **Feature :** `src/features/System/SystemStatus.jsx`
- **Styles :** `src/features/System/SystemStatus.css`
- **Dépendance :** Utilise `HAContext` pour la communication directe avec le WebSocket.

## UI/UX
- Utilise le **Glassmorphism** avec un flou de 30px pour se détacher du fond sans masquer totalement les données arrière.
- Animation `slide-down` pour une apparition fluide depuis l'icône mère.
