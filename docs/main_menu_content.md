# Main Menu Card Definitions

To make the dashboard truly "Tesla-like", each card must prioritize the most relevant information based on the state of the home.

## 1. Hero Cards (Large)

### A. Climate & Room Focus (The "Cockpit")
- **Primary Data**: Current Temperature (`sensor.room_temp`).
- **Status Area**: Climate mode (Heating/Cooling/Idle) + Active presets.
- **Direct Controls**: 
    - Temperature setpoint adjustment (+/- or slider).
    - Main Light toggle (with dimming info).
- **Secondary**: Blinds position.

### B. Energy Dashboard
- **Primary Visual**: Live Power Flow (Grid vs Solar).
- **Metrics**: 
    - Instant Consumption (`sensor.shelly_total_power`).
    - Solar Yield (`sensor.solar_production`).
    - Battery SOC (`sensor.battery_state_of_charge`).
- **Graph**: Last 24h consumption trend.

### C. Weather & Forecast
- **Primary Data**: Current Temp + Condition Icon.
- **Status Area**: Next 3 hours forecast summary.
- **Details**: Sunrise/Sunset, Rain probability.

## 2. At a Glance (Small Squares)
These cards should only show information that requires attention.
- **Lights**: "X Lights On" (Tap to turn all off in that zone).
- **Security**: Current Alarm state (Green = Disarmed, Amber = Armed).
- **Appliances**: Status of dishwasher/washing machine (Time remaining).
- **Safety**: Water leaks or Smoke detectors status.

## 3. Quick Scenes (Macros)
Single-tap scene triggers.
- **Je pars (Leave Home)**: Turns off all lights, stops media, arms security.
- **Mode Cinéma**: Dims lights to 5%, closes blinds, starts TV/Apple TV.
- **Bonne Nuit (Good Night)**: Similar to 'Je pars' but keeps internal alarm active.

## 4. Room Grid (Navigation cards)
- **Title**: Room Name.
- **Sub-status**: "Lights On", "22.5°C", or "Motion Detected".
- **Visuals**: Dynamic icon color based on lighting (Amber if on).
- **Optional**: Camera preview (Entryway/Garden) if motion is detected.
