/**
 * ⚙️ CONFIGURATION ÉNERGIE
 * Modifiez ces IDs pour correspondre à vos entités Home Assistant.
 * Retrouvez les IDs dans HA → Paramètres → Appareils & Services → Entités
 */
export const ENERGY_ENTITIES = {
  // ☀️ Production solaire
  solarPowerNow:    'sensor.solar_power',          // Puissance instantanée (W)
  solarEnergyToday: 'sensor.solar_energy_today',   // Production du jour (kWh)

  // 🔋 Batterie
  batteryPercent:   'sensor.battery_soc',          // Niveau de charge (%)
  batteryPower:     'sensor.battery_power',        // Puissance (W, + = charge, - = décharge)

  // ⚡ Réseau électrique
  gridPower:        'sensor.grid_power',           // Puissance réseau (W, + = import, - = export)
  gridImportToday:  'sensor.grid_import_today',    // Import du jour (kWh)
  gridExportToday:  'sensor.grid_export_today',    // Export du jour (kWh)

  // 🏠 Consommation maison
  homePower:        'sensor.home_power',           // Puissance consommée instantanément (W)
  homeEnergyToday:  'sensor.home_energy_today',    // Consommation du jour (kWh)
};
