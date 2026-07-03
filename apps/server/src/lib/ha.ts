/**
 * Client REST Home Assistant côté serveur (pour les tools de l'assistant).
 * En production (add-on), HA est joignable via les options de l'add-on.
 */

const HA_URL = () => process.env.TRANO_HA_URL?.replace(/\/$/, '') ?? null;
const HA_TOKEN = () => process.env.TRANO_HA_TOKEN ?? null;

export function haConfigured(): boolean {
  return Boolean(HA_URL() && HA_TOKEN());
}

async function haFetch(path: string, init?: RequestInit): Promise<unknown> {
  const url = HA_URL();
  const token = HA_TOKEN();
  if (!url || !token) throw new Error('Home Assistant non configuré côté serveur (TRANO_HA_URL / TRANO_HA_TOKEN)');

  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HA ${res.status} sur ${path}`);
  return res.json();
}

interface HAState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

/**
 * Photographie compacte de la maison pour le LLM : uniquement l'utile,
 * jamais le dump brut des ~800 entités.
 */
export async function getHouseSnapshot(): Promise<Record<string, unknown>> {
  const states = (await haFetch('/api/states')) as HAState[];
  const byId = new Map(states.map((s) => [s.entity_id, s]));

  const num = (id: string) => {
    const v = parseFloat(byId.get(id)?.state ?? '');
    return Number.isNaN(v) ? null : v;
  };

  const lightsOn = states
    .filter((s) => s.entity_id.startsWith('light.') && s.state === 'on')
    .map((s) => (s.attributes.friendly_name as string) ?? s.entity_id);

  const mediaPlaying = states
    .filter((s) => s.entity_id.startsWith('media_player.') && s.state === 'playing')
    .map((s) => (s.attributes.friendly_name as string) ?? s.entity_id);

  const presence = states
    .filter((s) => s.entity_id.startsWith('device_tracker.') && s.attributes.source_type === 'gps')
    .map((s) => ({
      name: ((s.attributes.friendly_name as string) ?? s.entity_id).replace(/ Battery.*/i, ''),
      at_home: s.state === 'home',
    }));

  const weather = states.find((s) => s.entity_id.startsWith('weather.'));

  const gridW = num('sensor.shellypro3em_ac15187b3e18_puissance');
  const solarKw = num('sensor.envoy_122237060306_production_d_electricite_actuelle');
  const solarZendureW = num('sensor.hyper_2000_solar_input_power');

  return {
    heure: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
    meteo: weather
      ? { etat: weather.state, temperature: weather.attributes.temperature }
      : null,
    energie: {
      reseau_W: gridW,
      commentaire_reseau: gridW == null ? null : gridW < 0 ? 'export vers EDF (bien)' : 'import depuis EDF (à éviter)',
      solaire_W: solarKw == null && solarZendureW == null ? null : Math.round((solarKw ?? 0) * 1000 + (solarZendureW ?? 0)),
      batterie_pct: num('sensor.hyper_2000_electric_level'),
      production_du_jour_kWh: num('sensor.envoy_122237060306_production_d_energie_du_jour'),
    },
    lumieres_allumees: lightsOn,
    lecture_en_cours: mediaPlaying,
    presence,
    wifi_freebox: byId.get('switch.freebox_wifi')?.state ?? null,
    appels_manques: num('sensor.freebox_missed_calls'),
  };
}

const CONTROLLABLE_DOMAINS = new Set(['light', 'switch', 'fan', 'media_player']);

export async function controlDevice(entityId: string, action: 'turn_on' | 'turn_off' | 'toggle'): Promise<string> {
  const domain = entityId.split('.')[0];
  if (!CONTROLLABLE_DOMAINS.has(domain)) {
    return `Refusé : le domaine "${domain}" n'est pas contrôlable par l'assistant (autorisés : lumières, prises, ventilateurs, lecteurs).`;
  }
  await haFetch(`/api/services/${domain}/${action}`, {
    method: 'POST',
    body: JSON.stringify({ entity_id: entityId }),
  });
  return `OK, service ${action} appelé sur ${entityId}.`;
}

/** Liste compacte des appareils contrôlables (pour que le LLM connaisse les entity_id) */
export async function listControllableDevices(): Promise<Array<{ entity_id: string; nom: string; etat: string }>> {
  const states = (await haFetch('/api/states')) as HAState[];
  return states
    .filter((s) => CONTROLLABLE_DOMAINS.has(s.entity_id.split('.')[0]) && s.state !== 'unavailable')
    .map((s) => ({
      entity_id: s.entity_id,
      nom: (s.attributes.friendly_name as string) ?? s.entity_id,
      etat: s.state,
    }));
}
