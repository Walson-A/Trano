/**
 * Entités réseau/Freebox remontées par l'intégration Freebox de HA
 * (découvertes le 2026-07-03). La Freebox Delta est déjà appairée à HA —
 * pas besoin d'appairage direct à l'API Freebox pour ces fonctions.
 */
export const FREEBOX = {
  wifiSwitch: 'switch.freebox_wifi',
  rebootButton: 'button.reboot_freebox',
  downloadSpeed: 'sensor.freebox_download_speed', // valeur en Mo/s côté HA
  uploadSpeed: 'sensor.freebox_upload_speed',
  externalIp: 'sensor.freebox_v7_r1_ip_externe',
  missedCalls: 'sensor.freebox_missed_calls',
  diskFreePct: 'sensor.freebox_free_space',
  wanStatus: 'binary_sensor.freebox_v7_r1_etat_du_reseau_etendu_wan',
};

/**
 * Téléphones de la famille joignables via l'app compagnon HA.
 * `service` = service notify côté HA. La sonnerie utilise une notification
 * critique iOS (sonne même en silencieux).
 */
export const PHONES = [
  { label: 'iPhone de Walson', service: 'mobile_app_iphone_de_walson' },
  { label: 'iPhone Renew', service: 'mobile_app_iphonerenew' },
];
