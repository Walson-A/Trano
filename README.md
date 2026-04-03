<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Trano

Dashboard domotique connecté à Home Assistant. Interface premium, minimaliste, optimisée tablettes et écrans OLED.

## Stack

- React 18 + TypeScript
- Tailwind CSS v4
- Vite
- Zustand (state UI)
- Home Assistant WebSocket API

## Installation

**Prérequis :** Node.js 18+

```bash
npm install
```

## Configuration

Copier `.env.example` vers `.env.local` et remplir :

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `VITE_HA_URL` | URL de l'instance Home Assistant |
| `VITE_HA_TOKEN` | Long-lived access token HA |
| `VITE_HA_WEATHER_ENTITY` | Entity ID météo (ex: `weather.forecast_home`) |

## Lancement

```bash
npm run dev
```

## Documentation

- [Architecture](docs/architecture.md)
- [Design System](docs/design_concept.md)
- [Module Météo](docs/weather.md)
- [System Status](docs/system_status.md)
- [Contenu Menu Principal](docs/main_menu_content.md)
