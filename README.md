# Trano

L'interface virtuelle de la famille : domotique (Home Assistant), profils
façon Netflix, liste de courses partagée, énergie solaire, Freebox et
assistant IA. Interface premium, minimaliste, optimisée tablettes et écrans
OLED. Hébergée à la maison, sur le serveur familial.

## Structure

Monorepo npm workspaces :

| Paquet | Rôle |
|---|---|
| `apps/web` | Frontend React (Vite, Tailwind v4, Zustand, Motion) |
| `apps/server` | Serveur Trano : Fastify + SQLite — profils, courses, config, WebSocket temps réel |
| `packages/shared` | Types TypeScript partagés |

## Installation

**Prérequis :** Node.js 22.5+ (le serveur utilise `node:sqlite`)

```bash
npm install
```

## Configuration (dev)

Copier `apps/web/.env.example` vers `apps/web/.env.local` et remplir :

| Variable | Description |
|---|---|
| `VITE_HA_URL` | URL de l'instance Home Assistant |
| `VITE_HA_TOKEN` | Long-lived access token HA |
| `VITE_HA_WEATHER_ENTITY` | Entity ID météo (ex: `weather.forecast_home`) |

En production, ces valeurs viennent du `.env` du conteneur (voir
[Déploiement](deploy/README.md)).

## Lancement

```bash
npm run dev     # web sur :3000 + serveur sur :3001
```

## Déploiement

Trano tourne comme conteneur Docker sur le serveur de la maison, à côté de
l'engine Oby : guide complet dans [deploy/README.md](deploy/README.md).
La piste add-on Home Assistant sur la Freebox est abandonnée (VM 1 Go).

## Documentation

- [Architecture](docs/architecture.md)
- [API du serveur](docs/server_api.md)
- [Module Énergie](docs/energy.md)
- [Assistant IA](docs/assistant.md)
- [Serveur MCP pour Oby](docs/mcp_oby.md)
- [Profils](docs/profiles.md)
- [Liste de courses](docs/shopping.md)
- [Design System](docs/design_concept.md)
- [Module Météo](docs/weather.md)
- [System Status](docs/system_status.md)
- [Contenu Menu Principal](docs/main_menu_content.md)
