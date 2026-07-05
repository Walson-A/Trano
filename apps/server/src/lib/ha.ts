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

const CONTROLLABLE_DOMAINS = new Set(['light', 'switch', 'fan', 'media_player', 'cover']);
const ENTITY_RE = /^[a-z_]+\.[a-z0-9_]+$/;

/** Rend un template Jinja côté HA (POST /api/template). Renvoie le texte. */
export async function haTemplate(template: string): Promise<string> {
  const url = HA_URL();
  const token = HA_TOKEN();
  if (!url || !token) throw new Error('Home Assistant non configuré côté serveur');
  const res = await fetch(`${url}/api/template`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ template }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HA template ${res.status}`);
  return res.text();
}

export async function controlDevice(
  entityId: string,
  action: 'turn_on' | 'turn_off' | 'toggle'
): Promise<string> {
  if (!ENTITY_RE.test(entityId)) return `Refusé : entity_id invalide "${entityId}".`;
  const domain = entityId.split('.')[0];
  if (!CONTROLLABLE_DOMAINS.has(domain)) {
    return `Refusé : le domaine "${domain}" n'est pas contrôlable par l'assistant (autorisés : lumières, prises, ventilateurs, lecteurs, volets ; les serrures et l'alarme sont exclues par sécurité).`;
  }
  // Les volets utilisent open/close plutôt que turn_on/turn_off
  const service =
    domain === 'cover'
      ? action === 'turn_on'
        ? 'open_cover'
        : action === 'turn_off'
          ? 'close_cover'
          : 'toggle'
      : action;
  await haFetch(`/api/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify({ entity_id: entityId }),
  });
  return `OK, ${service} appelé sur ${entityId}.`;
}

/** Appareils contrôlables avec leur pièce (area HA), via template tojson. */
export async function listControllableDevices(): Promise<
  Array<{ entity_id: string; nom: string; etat: string; piece: string | null }>
> {
  const tpl = `
{% set out = namespace(items=[]) %}
{% for s in states.light + states.switch + states.fan + states.media_player + states.cover %}
{% if s.state != 'unavailable' %}
{% set out.items = out.items + [{'entity_id': s.entity_id, 'nom': s.name, 'etat': s.state, 'piece': area_name(s.entity_id)}] %}
{% endif %}
{% endfor %}
{{ out.items | tojson }}`.trim();
  try {
    return JSON.parse(await haTemplate(tpl));
  } catch {
    // Repli sans les pièces si le template échoue
    const states = (await haFetch('/api/states')) as HAState[];
    return states
      .filter((s) => CONTROLLABLE_DOMAINS.has(s.entity_id.split('.')[0]) && s.state !== 'unavailable')
      .map((s) => ({
        entity_id: s.entity_id,
        nom: (s.attributes.friendly_name as string) ?? s.entity_id,
        etat: s.state,
        piece: null,
      }));
  }
}

/** Détail complet d'un appareil : état, pièce, attributs utiles. */
export async function getDeviceInfo(entityId: string): Promise<Record<string, unknown>> {
  if (!ENTITY_RE.test(entityId)) return { erreur: `entity_id invalide "${entityId}"` };
  const tpl = `
{% set e = '${entityId}' %}
{% if states[e] is not none %}
{{ {'entity_id': e, 'nom': state_attr(e, 'friendly_name'), 'etat': states[e].state, 'piece': area_name(e), 'attributs': states[e].attributes} | tojson }}
{% else %}
null
{% endif %}`.trim();
  const out = JSON.parse(await haTemplate(tpl));
  return out ?? { erreur: `Appareil "${entityId}" introuvable` };
}

/** Météo détaillée (entité weather + prévisions si présentes). */
export async function getWeatherDetail(): Promise<Record<string, unknown>> {
  const states = (await haFetch('/api/states')) as HAState[];
  const w = states.find((s) => s.entity_id.startsWith('weather.'));
  if (!w) return { erreur: 'Aucune entité météo' };
  const a = w.attributes;
  return {
    etat: w.state,
    temperature: a.temperature,
    ressenti: a.apparent_temperature ?? null,
    humidite: a.humidity ?? null,
    vent_kmh: a.wind_speed ?? null,
    pression: a.pressure ?? null,
  };
}

/** Bilan énergétique détaillé pour le LLM (production, batteries, réseau). */
export async function getEnergyDetail(): Promise<Record<string, unknown>> {
  const states = (await haFetch('/api/states')) as HAState[];
  const byId = new Map(states.map((s) => [s.entity_id, s]));
  const num = (id: string, factor = 1) => {
    const v = parseFloat(byId.get(id)?.state ?? '');
    return Number.isNaN(v) ? null : v * factor;
  };

  const solarSources = {
    envoy_W: num('sensor.envoy_122237060306_production_d_electricite_actuelle', 1000),
    zendure_W: num('sensor.hyper_2000_solar_input_power'),
    jardin_W: (() => {
      const v = num('sensor.shellyemg3_dcb4d9c5664c_energy_meter_0_puissance');
      return v == null ? null : -v; // négatif = injection
    })(),
  };
  const solaireTotal_W = Math.round(
    (solarSources.envoy_W ?? 0) + (solarSources.zendure_W ?? 0) + Math.max(0, solarSources.jardin_W ?? 0)
  );
  const gridW = num('sensor.shellypro3em_ac15187b3e18_puissance');

  return {
    solaire_total_W: solaireTotal_W,
    solaire_par_source_W: solarSources,
    reseau_W: gridW,
    reseau_sens: gridW == null ? null : gridW < 0 ? 'export vers EDF (surplus)' : 'import depuis EDF (à éviter)',
    batteries: [
      { nom: 'Hyper 2000', charge_pct: num('sensor.hyper_2000_electric_level'), puissance_W: num('sensor.hyper_2000_bat_in_out') },
      { nom: 'AB2000X', charge_pct: num('sensor.ab2000x_17378_soc_level'), puissance_W: num('sensor.ab2000x_17378_power') },
      { nom: 'Jardin', charge_pct: num('sensor.thony_battery_state_of_charge'), puissance_W: num('sensor.thony_battery_power') },
    ],
    production_kWh: {
      aujourdhui: num('sensor.envoy_122237060306_production_d_energie_du_jour'),
      sept_jours: num('sensor.envoy_122237060306_production_d_energie_des_sept_derniers_jours'),
      total_MWh: num('sensor.envoy_122237060306_production_d_energie_totale'),
    },
  };
}

// Couleurs FR → noms CSS acceptés par HA (color_name)
const COLOR_MAP: Record<string, string> = {
  rouge: 'red', bleu: 'blue', vert: 'green', jaune: 'yellow', orange: 'orange',
  violet: 'purple', rose: 'pink', blanc: 'white', turquoise: 'turquoise',
  cyan: 'cyan', magenta: 'magenta', or: 'gold', doré: 'gold', chaud: 'orange', froid: 'white',
};

/** Règle une lumière : luminosité (%) et/ou couleur (nom FR ou anglais). */
export async function setLight(entityId: string, brightnessPct?: number, color?: string): Promise<string> {
  if (!ENTITY_RE.test(entityId) || !entityId.startsWith('light.')) {
    return `Refusé : "${entityId}" n'est pas une lumière.`;
  }
  const body: Record<string, unknown> = { entity_id: entityId };
  if (typeof brightnessPct === 'number') body.brightness_pct = Math.max(0, Math.min(100, Math.round(brightnessPct)));
  if (color) body.color_name = COLOR_MAP[color.toLowerCase()] ?? color.toLowerCase();
  await haFetch('/api/services/light/turn_on', { method: 'POST', body: JSON.stringify(body) });
  const bits = [
    typeof brightnessPct === 'number' ? `luminosité ${body.brightness_pct}%` : null,
    color ? `couleur ${color}` : null,
  ].filter(Boolean);
  return `OK, ${entityId} réglée (${bits.join(', ') || 'allumée'}).`;
}

/** Liste les scènes HA. */
export async function listScenes(): Promise<Array<{ entity_id: string; nom: string }>> {
  const states = (await haFetch('/api/states')) as HAState[];
  return states
    .filter((s) => s.entity_id.startsWith('scene.'))
    .map((s) => ({ entity_id: s.entity_id, nom: (s.attributes.friendly_name as string) ?? s.entity_id }));
}

/** Active une scène. */
export async function activateScene(entityId: string): Promise<string> {
  if (!ENTITY_RE.test(entityId) || !entityId.startsWith('scene.')) return `Refusé : "${entityId}" n'est pas une scène.`;
  await haFetch('/api/services/scene/turn_on', { method: 'POST', body: JSON.stringify({ entity_id: entityId }) });
  return `Scène ${entityId} activée.`;
}

/** Pilote la Freebox : wifi on/off, redémarrage. */
export async function controlFreebox(action: 'wifi_on' | 'wifi_off' | 'reboot'): Promise<string> {
  if (action === 'reboot') {
    await haFetch('/api/services/button/press', { method: 'POST', body: JSON.stringify({ entity_id: 'button.reboot_freebox' }) });
    return 'Redémarrage de la Freebox lancé.';
  }
  const service = action === 'wifi_on' ? 'turn_on' : 'turn_off';
  await haFetch(`/api/services/switch/${service}`, { method: 'POST', body: JSON.stringify({ entity_id: 'switch.freebox_wifi' }) });
  return `Wi-Fi Freebox ${action === 'wifi_on' ? 'activé' : 'coupé'}.`;
}

/** Lecture ponctuelle : puissance réseau (W, +import/-export) et SOC batterie (%). */
export async function readGridAndBattery(): Promise<{ gridW: number | null; soc: number | null }> {
  const states = (await haFetch('/api/states')) as HAState[];
  const byId = new Map(states.map((s) => [s.entity_id, s]));
  const num = (id: string) => {
    const v = parseFloat(byId.get(id)?.state ?? '');
    return Number.isNaN(v) ? null : v;
  };
  return {
    gridW: num('sensor.shellypro3em_ac15187b3e18_puissance'),
    soc: num('sensor.hyper_2000_electric_level'),
  };
}

/** Notification vers un service notify HA (téléphones via app compagnon). */
export async function notifyPhone(service: string, title: string, message: string): Promise<void> {
  await haFetch(`/api/services/notify/${service}`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      message,
      data: { push: { sound: { name: 'default', critical: 1, volume: 1.0 } } },
    }),
  });
}
