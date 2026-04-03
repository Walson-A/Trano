# Weather Module

## Overview
The Weather Module, located in `src/features/Weather`, provides a quick weather glance widget and a detailed weather forecast modal.

## Components

### `WeatherWidget.tsx`
- Displays the current weather status (icon, temperature, condition) as a compact widget.
- Clicking the widget opens the `WeatherModal`.

### `WeatherModal.tsx`
- A premium modal displaying comprehensive forecasting with `backdrop-blur-2xl`.
- Fetches detailed `hourly` and `daily` forecasts simultaneously via the `get_forecasts` service call when the modal opens.
- Features:
  - **Horizontal Timeline:** A draggable, hardware-accelerated timeline showing the hourly forecasts for the current day ("Aujourd'hui").
  - **Daily Accordion Items:** A vertical list of future days, which can be expanded to reveal their respective local hourly timelines. 
- **Performance Optimizations:** Uses `useRef` for drag state to prevent React re-renders, and pure CSS `transform: translateZ(0)` combined with `will-change: transform` to ensure fluid 60fps scrolling on touchscreens and trackpads without paint lags.

## Home Assistant Integration
- Requires a weather entity (default: `weather.forecast_maison`).
- Pulls current attributes (temperature, condition) directly from the context.
- Uses `connection.sendMessagePromise` dynamically to fetch standard HA `hourly` and `daily` forecast data (since HA 2024.4 deprecated native attribute arrays).
