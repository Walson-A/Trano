<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Trano

L'interface virtuelle de la famille : domotique (Home Assistant), profils
façon Netflix, liste de courses partagée — et bientôt énergie solaire,
Freebox et assistant IA. Interface premium, minimaliste, optimisée
tablettes et écrans OLED. Hébergée à la maison, sur la Freebox.

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

En production, ces valeurs viennent des options de l'add-on (voir
[Déploiement](deploy/README.md)).

## Lancement

```bash
npm run dev     # web sur :3000 + serveur sur :3001
```

## Déploiement sur la Freebox

Trano tourne comme add-on Home Assistant dans la VM HAOS de la Freebox
Delta : guide complet dans [deploy/README.md](deploy/README.md).

## Documentation

- [Architecture](docs/architecture.md)
- [API du serveur](docs/server_api.md)
- [Module Énergie](docs/energy.md)
- [Assistant IA](docs/assistant.md)
- [Profils](docs/profiles.md)
- [Liste de courses](docs/shopping.md)
- [Design System](docs/design_concept.md)
- [Module Météo](docs/weather.md)
- [System Status](docs/system_status.md)
- [Contenu Menu Principal](docs/main_menu_content.md)
