import { createHash, createHmac } from 'node:crypto';
import type { HomeConfig } from './homes.ts';
import type { ControllableDevice } from './ha.ts';

type TuyaConfig = NonNullable<HomeConfig['tuya']>;
interface DP { code: string; value: unknown }
interface FunctionDP { code: string; type: string; values: string }
interface Device { id: string; name: string; online: boolean; status: DP[] }
const endpoints = { eu: 'https://openapi.tuyaeu.com', us: 'https://openapi.tuyaus.com', cn: 'https://openapi.tuyacn.com', in: 'https://openapi.tuyain.com' };
const sessions = new Map<string, { token?: string; expires?: number; pending?: Promise<string> }>();
const snapshots = new Map<string, { until: number; pending: Promise<ControllableDevice[]> }>();
const specifications = new Map<string, { until: number; functions: FunctionDP[] }>();
const settlingUntil = new Map<string, number>();

export function tuyaSignature(clientId: string, secret: string, token: string, time: string, method: string, path: string, body: string): string {
  const hash = createHash('sha256').update(body).digest('hex');
  const stringToSign = `${method}\n${hash}\n\n${path}`;
  return createHmac('sha256', secret).update(clientId + token + time + stringToSign).digest('hex').toUpperCase();
}
function config(home: HomeConfig): TuyaConfig {
  const c = home.tuya;
  if (!c?.clientId || !c.secret || !c.uid || !c.deviceIds.length) {
    throw new Error('Tuya à connecter : autoriser le compte Tuya Smart puis affecter les appareils à ce logement.');
  }
  return c;
}
const keyOf = (c: TuyaConfig) => createHash('sha256').update(JSON.stringify(c)).digest('hex');
async function signed<T>(c: TuyaConfig, token: string, method: string, path: string, payload?: unknown): Promise<T> {
  const body = payload === undefined ? '' : JSON.stringify(payload);
  const t = String(Date.now());
  const res = await fetch(endpoints[c.region] + path, { method,
    headers: { client_id: c.clientId, access_token: token, t, sign_method: 'HMAC-SHA256',
      sign: tuyaSignature(c.clientId, c.secret, token, t, method, path, body), 'Content-Type': 'application/json' },
    body: body || undefined, signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Tuya ne répond pas (${res.status}).`);
  const data = await res.json() as { success: boolean; result: T; code?: number };
  if (!data.success) {
    if (data.code === 1010 || data.code === 1011) sessions.delete(keyOf(c));
    throw new Error(`Accès Tuya refusé (${data.code ?? 'inconnu'}). Vérifier l’autorisation, la région et la validité du service cloud.`);
  }
  return data.result;
}
async function tokenFor(c: TuyaConfig): Promise<string> {
  const key = keyOf(c);
  const session = sessions.get(key) ?? {};
  sessions.set(key, session);
  if (session.token && (session.expires ?? 0) > Date.now()) return session.token;
  if (!session.pending) {
    session.pending = signed<{ access_token: string; expire_time: number }>(c, '', 'GET', '/v1.0/token?grant_type=1')
      .then(result => {
        if (!result.access_token || !Number.isFinite(result.expire_time)) throw new Error('Réponse Tuya invalide.');
        session.token = result.access_token;
        session.expires = Date.now() + Math.max(0, result.expire_time - 60) * 1000;
        return result.access_token;
      }).finally(() => { session.pending = undefined; });
  }
  return session.pending;
}
async function call<T>(c: TuyaConfig, method: string, path: string, payload?: unknown): Promise<T> {
  return signed<T>(c, await tokenFor(c), method, path, payload);
}
async function functionsFor(c: TuyaConfig, id: string): Promise<FunctionDP[]> {
  const key = keyOf(c) + id;
  const hit = specifications.get(key);
  if (hit && hit.until > Date.now()) return hit.functions;
  const result = await call<{ functions: FunctionDP[] }>(c, 'GET', `/v1.0/devices/${encodeURIComponent(id)}/functions`);
  const functions = result.functions ?? [];
  specifications.set(key, { until: Date.now() + 3600_000, functions });
  return functions;
}
function bounds(dp: FunctionDP | undefined): { min: number; max: number } | null {
  if (!dp || dp.type !== 'Integer') return null;
  try {
    const b = JSON.parse(dp.values);
    return Number.isFinite(b.min) && Number.isFinite(b.max) && b.max > b.min ? b : null;
  } catch { return null; }
}
export function mapTuyaDevice(device: Device, functions: FunctionDP[]): ControllableDevice | null {
  const values = Object.fromEntries(device.status.map(dp => [dp.code, dp.value]));
  const light = functions.some(dp => dp.code === 'switch_led' && dp.type === 'Boolean');
  const switchCode = light ? 'switch_led' : ['switch', 'switch_1'].find(code => functions.some(dp => dp.code === code && dp.type === 'Boolean'));
  if (!switchCode) return null;
  const bright = functions.find(dp => dp.code === 'bright_value_v2' || dp.code === 'bright_value');
  const range = bounds(bright);
  let color: { h: number; s: number; v: number } | null = null;
  try {
    const raw = values.colour_data_v2;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object' && ['h', 's', 'v'].every(k => Number.isFinite(parsed[k]))) color = parsed;
  } catch { /* Unknown color format: do not claim it is supported. */ }
  const pct = values.work_mode === 'colour' && color ? Math.round(color.v / 10) : range && bright && typeof values[bright.code] === 'number'
    ? Math.round((values[bright.code] as number) / range.max * 100) : null;
  return { entity_id: `${light ? 'light' : 'switch'}.tuya_${device.id}`, nom: device.name,
    etat: device.online ? (values[switchCode] === true ? 'on' : 'off') : 'unavailable', piece: null,
    lumiere: light ? { luminosite_pct: pct, reglable: Boolean(range),
      couleur: functions.some(dp => dp.code === 'colour_data_v2' && dp.type === 'Json') && Boolean(color),
      blanc_reglable: false, hs: color ? [color.h, color.s / 10] : null,
      kelvin: null, kelvin_min: 2200, kelvin_max: 6500, mode: values.work_mode === 'colour' ? 'hs' : 'white' } : null };
}
async function loadDevices(c: TuyaConfig): Promise<ControllableDevice[]> {
  const all = await call<Device[]>(c, 'GET', `/v1.0/users/${encodeURIComponent(c.uid)}/devices`);
  const devices: ControllableDevice[] = [];
  // Only explicitly assigned devices, even if the linked account includes the parents' home.
  for (const device of all.filter(device => c.deviceIds.includes(device.id))) {
    const mapped = mapTuyaDevice(device, await functionsFor(c, device.id));
    if (mapped) devices.push(mapped);
  }
  return devices;
}
export async function tuyaDevices(home: HomeConfig): Promise<ControllableDevice[]> {
  const c = config(home), key = keyOf(c);
  const hit = snapshots.get(key);
  if (hit && hit.until > Date.now()) return hit.pending;
  const pending = loadDevices(c).catch(error => { snapshots.delete(key); throw error; });
  snapshots.set(key, { pending, until: Date.now() + ((settlingUntil.get(key) ?? 0) > Date.now() ? 250 : 120_000) });
  return pending;
}
export async function tuyaControl(home: HomeConfig, entity: string, action: string, settings?: { brightness_pct?: number; hs_color?: [number, number]; kelvin?: number }): Promise<string> {
  const c = config(home);
  const device = (await tuyaDevices(home)).find(device => device.entity_id === entity);
  if (!device) throw new Error('Appareil absent de ce logement.');
  if (device.etat === 'unavailable') throw new Error('Appareil hors ligne.');
  const id = entity.replace(/^(light|switch)\.tuya_/, '');
  const functions = await functionsFor(c, id);
  const switchCode = entity.startsWith('light.') ? 'switch_led' : ['switch', 'switch_1'].find(code => functions.some(dp => dp.code === code))!;
  const commands: DP[] = [{ code: switchCode, value: settings ? true : action === 'turn_on' || (action === 'toggle' && device.etat !== 'on') }];
  if (action === 'toggle' && !settings) {
    const status = await call<DP[]>(c, 'GET', `/v1.0/devices/${encodeURIComponent(id)}/status`);
    const switchState = status.find(dp => dp.code === switchCode);
    if (typeof switchState?.value !== 'boolean') throw new Error('État de l’interrupteur inconnu.');
    commands[0].value = !switchState.value;
  }
  if (settings) {
    if (!entity.startsWith('light.')) throw new Error('Cet appareil n’est pas une lumière.');
    if (settings.kelvin !== undefined) throw new Error('Le réglage en kelvins n’est pas déclaré par cette ampoule Tuya.');
    if (settings.brightness_pct !== undefined) {
      const bright = functions.find(dp => dp.code === 'bright_value_v2' || dp.code === 'bright_value');
      const range = bounds(bright);
      if (!range || !bright) throw new Error('Intensité non réglable.');
      if (settings.brightness_pct === 0) commands[0].value = false;
      else if (device.lumiere?.mode === 'hs' && device.lumiere.hs && !settings.hs_color) {
        commands.push({ code: 'colour_data_v2', value: JSON.stringify({ h: device.lumiere.hs[0], s: Math.round(device.lumiere.hs[1] * 10), v: Math.max(10, Math.round(settings.brightness_pct * 10)) }) });
      } else commands.push({ code: bright.code, value: Math.max(range.min, Math.round(settings.brightness_pct / 100 * range.max)) });
    }
    if (settings.hs_color) {
      if (!device.lumiere?.couleur) throw new Error('Couleur non réglable.');
      const mode = functions.find(dp => dp.code === 'work_mode');
      if (mode) commands.push({ code: 'work_mode', value: 'colour' });
      commands.push({ code: 'colour_data_v2', value: JSON.stringify({ h: Math.round(settings.hs_color[0]), s: Math.round(settings.hs_color[1] * 10), v: Math.max(10, Math.round((settings.brightness_pct ?? device.lumiere.luminosite_pct ?? 100) * 10)) }) });
    }
  }
  const accepted = await call<boolean>(c, 'POST', `/v1.0/devices/${encodeURIComponent(id)}/commands`, { commands });
  if (!accepted) throw new Error('Commande refusée par Tuya.');
  snapshots.delete(keyOf(c));
  settlingUntil.set(keyOf(c), Date.now() + 3000);
  return 'Commande envoyée à Tuya.';
}
