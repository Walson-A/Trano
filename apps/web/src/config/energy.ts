/**
 * Cartographie des entités énergie de la maison (découverte le 2026-07-03).
 *
 * Installation réelle :
 * - Solaire principal : Enphase Envoy (micro-onduleurs)
 * - Batterie : Zendure Hyper 2000 + pack AB2000X (entrées PV dédiées)
 * - Système secondaire "Thony" au jardin (PV + batterie)
 * - Compteur réseau : Shelly Pro 3EM (négatif = export vers EDF)
 *
 * Toutes les puissances sont converties en W, les énergies en kWh.
 * `invert: true` si la convention de signe d'une batterie s'avère inversée
 * (attendu : positif = décharge vers la maison).
 */

interface PowerSource {
  id: string;
  /** Facteur de conversion vers W (kW → 1000) */
  factor?: number;
  invert?: boolean;
}

interface EnergyStat {
  id: string;
  /** Facteur de conversion vers kWh (MWh → 1000, Wh → 0.001) */
  factor?: number;
  /**
   * true = capteur de puissance (W) : l'énergie est reconstituée depuis la
   * moyenne horaire des statistiques HA (mean × durée), pas depuis `change`.
   */
  meanPower?: boolean;
  invert?: boolean;
}

export const ENERGY_LIVE = {
  /** Production solaire instantanée (sommée) */
  solar: [
    { id: 'sensor.envoy_122237060306_production_d_electricite_actuelle', factor: 1000 }, // kW
    { id: 'sensor.hyper_2000_solar_input_power' },
    { id: 'sensor.thony_pv_power' },
    // Shelly EM Gen3 meter 0 : supposé mesurer l'injection du système jardin
    // (valeur négative observée = production). À confirmer avec Papa.
    { id: 'sensor.shellyemg3_dcb4d9c5664c_energy_meter_0_puissance', invert: true },
  ] as PowerSource[],

  /** Compteur réseau : positif = import EDF, négatif = export */
  grid: { id: 'sensor.shellypro3em_ac15187b3e18_puissance' } as PowerSource,

  /** Batteries : positif = décharge vers la maison */
  battery: [
    { id: 'sensor.hyper_2000_bat_in_out' },
    { id: 'sensor.thony_battery_power' },
  ] as PowerSource[],

  /** Niveaux de charge — le premier sert d'affichage principal */
  batterySoc: [
    { id: 'sensor.hyper_2000_electric_level', label: 'Hyper 2000' },
    { id: 'sensor.ab2000x_17378_soc_level', label: 'AB2000X' },
    { id: 'sensor.thony_battery_state_of_charge', label: 'Jardin' },
  ],

  /** Prises/appareils avec mesure de puissance individuelle */
  deviceMeters: [
    { id: 'sensor.shellyplugsg3_d885ac1ebaa8_puissance', label: 'Prise Shelly' },
  ],
};

/**
 * Compteurs cumulatifs pour l'historique (API recorder/statistics_during_period,
 * champ `change` par période).
 */
export const ENERGY_STATS = {
  solar: [
    { id: 'sensor.envoy_122237060306_production_d_energie_totale', factor: 1000 }, // MWh
    { id: 'sensor.hyper_2000_aggr_solar' },
    // sensor.thony_total_energy est VOLONTAIREMENT exclu : l'intégration
    // jardin est instable et produit des sauts fantômes (+15 kWh observé).
    // La production jardin est reconstituée depuis le Shelly EM Gen3 local
    // (moyenne de puissance, négatif = injection). À valider avec Papa.
    { id: 'sensor.shellyemg3_dcb4d9c5664c_energy_meter_0_puissance', meanPower: true, invert: true },
  ] as EnergyStat[],
  gridImport: [{ id: 'sensor.shellypro3em_ac15187b3e18_energie' }] as EnergyStat[],
  gridExport: [{ id: 'sensor.shellypro3em_ac15187b3e18_energie_restituee' }] as EnergyStat[],
  batteryCharge: [{ id: 'sensor.hyper_2000_aggr_charge' }] as EnergyStat[],
  batteryDischarge: [{ id: 'sensor.hyper_2000_aggr_discharge' }] as EnergyStat[],
  /** Moyenne (%) — pour la courbe batterie */
  batterySoc: 'sensor.hyper_2000_electric_level',
};

/** Lit une puissance en W depuis les entités HA (0 si indisponible) */
export function readPowerW(
  entities: Record<string, { state: string } | undefined>,
  source: PowerSource
): number {
  const raw = parseFloat(entities[source.id]?.state ?? '');
  if (Number.isNaN(raw)) return 0;
  const w = raw * (source.factor ?? 1);
  return source.invert ? -w : w;
}
