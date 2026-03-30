# Onglet Énergie — Documentation

## Vue d'ensemble

L'onglet Énergie affiche en temps réel la production solaire, l'état de la batterie et le flux de puissance entre les sources et la consommation maison.

---

## Structure

```
src/
├── features/Energy/
│   ├── config.js           ← ⚙️ IDs des entités HA (à modifier)
│   ├── SolarCard.jsx/css   ← Production solaire
│   ├── BatteryCard.jsx/css ← État et puissance de la batterie
│   ├── PowerFlowCard.jsx/css ← Diagramme de flux (SVG animé)
│   └── EnergyStatsRow.jsx/css ← Statistiques journalières
└── pages/Energy/
    ├── EnergyView.jsx      ← Assemblage de la vue
    └── EnergyView.css      ← Layout CSS Grid
```

---

## Configuration des entités

Toutes les entités sont centralisées dans `src/features/Energy/config.js`.
**Modifier ce fichier** pour correspondre à vos appareils Home Assistant.

| Clé | Entité par défaut | Description |
|---|---|---|
| `solarPowerNow` | `sensor.solar_power` | Puissance solaire instantanée (W) |
| `solarEnergyToday` | `sensor.solar_energy_today` | Production du jour (kWh) |
| `batteryPercent` | `sensor.battery_soc` | Niveau de charge (%) |
| `batteryPower` | `sensor.battery_power` | Puissance batterie (W, + = charge, − = décharge) |
| `gridPower` | `sensor.grid_power` | Puissance réseau (W, + = import, − = export) |
| `gridImportToday` | `sensor.grid_import_today` | Import réseau du jour (kWh) |
| `gridExportToday` | `sensor.grid_export_today` | Export réseau du jour (kWh) |
| `homePower` | `sensor.home_power` | Consommation maison instantanée (W) |
| `homeEnergyToday` | `sensor.home_energy_today` | Consommation du jour (kWh) |

---

## Composants

### SolarCard
- Affiche la puissance solaire instantanée (W/kW)
- Badge de statut : En production / Nuageux / Nuit / Hors ligne
- Production totale du jour (kWh)
- Glow ambiant animé quand la production est active

### BatteryCard
- Jauge circulaire SVG (arc 270°) affichant le pourcentage de charge
- Couleur dynamique : rouge < 20%, ambre < 50%, vert ≥ 50%
- Badge : En charge / Décharge / En veille / Hors ligne
- Puissance instantanée (avec signe + ou −)

### PowerFlowCard
- Diagramme SVG avec 4 nœuds : Solaire, Maison, Batterie, Réseau
- Lignes de flux animées (tirets en mouvement) selon la direction du courant
- Couleurs : vert pour l'énergie propre, rouge pour l'import réseau, ambre pour la décharge batterie
- Valeurs en temps réel sur chaque nœud

### EnergyStatsRow
- 4 tuiles de statistiques journalières : Production, Consommation, Export réseau, Import réseau

---

## Conventions d'implémentation

- Utilise `useHA()` depuis `src/context/HAContext.jsx` pour les données en temps réel
- Vanilla CSS uniquement (variables CSS depuis `src/core/theme/index.css`)
- Tous les composants dans `src/features/Energy/` sont des "Smart Components" (importent HAContext)
- L'assemblage final est dans `src/pages/Energy/EnergyView.jsx`
- Quand une entité est introuvable (`entities[id] === undefined`), afficher `'--'` sans erreur
