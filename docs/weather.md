# Weather Module

## Overview
Le module météo (`src/features/Weather/`) affiche les conditions actuelles et les prévisions via l'intégration météo de Home Assistant.

## Configuration

L'entity ID est configurable via `.env.local` :
```
VITE_HA_WEATHER_ENTITY=weather.forecast_home
```
Par défaut : `weather.forecast_home`.

## Composants

### `WeatherWidget.tsx`
- Widget compact dans la topbar : icône + température + condition en français.
- Gestion des états dégradés :
  - **Connexion en cours :** affiche "Connexion..."
  - **HA déconnecté :** affiche "HA déconnecté"
  - **Entité introuvable :** affiche "Entité introuvable"
  - **Entité `unavailable`/`unknown` :** affiche "Non disponible"
- Exporte `WeatherIcon` (icônes Lucide par condition) et `WEATHER_MAPPING` (labels FR).
- Clic ouvre le `WeatherModal`.

### `WeatherModal.tsx`
- Modale de prévisions détaillées.
- Fetche les forecasts `hourly` et `daily` via `connection.sendMessagePromise` (service `weather.get_forecasts`).
- Timeline horizontale scrollable pour les prévisions horaires.
- Liste verticale pour les prochains jours.

## Intégration HA
- Fonctionne avec n'importe quelle intégration météo HA (Met.no, OpenWeatherMap, etc.).
- Nécessite que l'entité expose `temperature`, `humidity`, `wind_speed`, `pressure` dans ses attributs.
- Les forecasts utilisent l'API service call HA 2024.4+ (`get_forecasts` avec `return_response`).
