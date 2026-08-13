# Feature : System Status

Le composant `SystemStatus` (`src/features/System/SystemStatus.tsx`) monitore l'état de santé de la connexion HA.

## Fonctionnalités
- **Indicateur de connexion :** Badge vert (connecté) ou rouge (déconnecté) dans la topbar.
- **Mesure de latence :** Ping WebSocket HA toutes les 5 secondes.
- **Infos version :** Affiche la version Home Assistant via `haConfig`.
- **Origine de connexion :** Identifie si la connexion est locale ou externe.
- **Reconnexion :** Bouton pour forcer un refresh en cas de désynchronisation.
- **Mise à jour HA disponible :** pastille ambre sur le badge de la topbar, et
  la ligne « Version » du popover passe en ambre avec le numéro visé.

## Mise à jour de Home Assistant

Depuis le 2026-08-13, HA tourne **en conteneur** sur le serveur de la maison
(voir `deploy/home-assistant.md`). Sans Supervisor, il **ne sait pas se mettre à
jour lui-même** : la commande est `~/homeassistant/maj.sh`, en SSH. Trano ne
peut donc pas proposer un bouton « mettre à jour » — il ne peut que **prévenir**,
et c'est tout ce qu'il fait.

La détection s'appuie sur l'intégration **Version** de HA (source *Docker Hub*),
qui publie deux entités : un `binary_sensor` de `device_class: update` — il dit
s'il existe plus récent, **la comparaison est faite par HA** — et un `sensor`
portant le numéro de la dernière version publiée.

`useHaUpdate()` cible le **`device_class`**, pas un `entity_id` en dur : celui-ci
dérive du titre de l'entrée de configuration, donc du nom que HA lui a donné. Le
numéro est ensuite retrouvé sur le `sensor` de même préfixe, validé par un motif
`^\d{4}\.\d+` (format des versions HA). Si l'intégration Version n'est pas
installée, `available` reste `false` et **rien ne s'affiche** — aucune régression
sur une instance qui ne l'a pas.

## Architecture
- **Composant :** `src/features/System/SystemStatus.tsx`
- **Dépendance :** `HAContext` pour la communication WebSocket (`connection`,
  `status` et `entities`).
- **Style :** Tailwind CSS, popover avec backdrop blur.
