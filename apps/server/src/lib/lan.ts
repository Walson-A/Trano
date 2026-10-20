import { readFileSync } from 'node:fs';
import { isIPv4 } from 'node:net';
import { ID_RE, isPrivateIPv4, parseCommand } from '../../../../packages/lan/src/config.ts';
import { LanError, MEDIA_ACTIONS } from '../../../../packages/lan/src/types.ts';
import type { MediaDevice } from '../../../../packages/lan/src/types.ts';

export interface RelayTarget {
  id: string;
  name: string;
  url: string;
  token: string;
}
export interface RelayInventory {
  id: string;
  name: string;
  online: boolean;
  controlEnabled: boolean;
  devices: MediaDevice[];
  error: string | null;
}

/** Whitelist the public DTO: a future relay field must not accidentally expose its config. */
function publicDevice(input: unknown): MediaDevice {
  if (!input || typeof input !== 'object') throw new LanError('Appareil du relais invalide.');
  const d = input as Record<string, unknown>;
  const s = d.state as Record<string, unknown> | undefined;
  const text = (value: unknown, max = 200): string | null => typeof value === 'string' ? value.slice(0, max) : null;
  if (typeof d.id !== 'string' || !ID_RE.test(d.id) || typeof d.reachable !== 'boolean' ||
      (d.kind !== 'samsung' && d.kind !== 'freebox-player') ||
      typeof d.host !== 'string' || !isPrivateIPv4(d.host) || !s || typeof s !== 'object' ||
      !Array.isArray(d.capabilities) || !Array.isArray(d.transports)) throw new LanError('Appareil du relais invalide.');
  return {
    id: d.id, name: text(d.name, 100) ?? d.id, kind: d.kind, host: d.host, model: text(d.model, 100),
    reachable: d.reachable, observedAt: text(d.observedAt, 40) ?? '',
    state: {
      volume: typeof s.volume === 'number' && Number.isFinite(s.volume) && s.volume >= 0 && s.volume <= 100 ? s.volume : null,
      muted: typeof s.muted === 'boolean' ? s.muted : null,
      playback: ['playing', 'paused', 'stopped'].includes(String(s.playback)) ? s.playback as MediaDevice['state']['playback'] : 'unknown',
    },
    capabilities: d.capabilities.filter((a): a is MediaDevice['capabilities'][number] => MEDIA_ACTIONS.includes(a as never)),
    transports: d.transports.filter((value): value is string => typeof value === 'string' && ['upnp', 'spotify_connect', 'airplay', 'samsung_remote'].includes(value)),
    setupRequired: d.setupRequired === 'remote_code' || d.setupRequired === 'samsung_pairing' ? d.setupRequired : null,
    error: text(d.error),
  };
}

export function parseRelayTargets(input: unknown): RelayTarget[] {
  if (!Array.isArray(input) || input.length > 8) throw new LanError('Configuration des relais invalide.', 500);
  const ids = new Set<string>();
  return input.map((row): RelayTarget => {
    if (!row || typeof row !== 'object') throw new LanError('Configuration des relais invalide.', 500);
    const { id, name, url, token } = row as Record<string, unknown>;
    if (typeof id !== 'string' || !ID_RE.test(id) || ids.has(id) ||
        typeof name !== 'string' || !name.trim() || name.length > 100 ||
        typeof url !== 'string' || typeof token !== 'string' || token.length < 32 || token.length > 256 || /\s/.test(token)) {
      throw new LanError('Configuration des relais invalide.', 500);
    }
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new LanError('Adresse de relais invalide.', 500); }
    const octets = parsed.hostname.split('.').map(Number);
    const tailscale = isIPv4(parsed.hostname) && octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127;
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.search || parsed.hash || parsed.pathname !== '/' ||
        !(isPrivateIPv4(parsed.hostname) || parsed.hostname === '127.0.0.1' || tailscale)) {
      throw new LanError('Le relais doit avoir une URL LAN, locale ou Tailscale, sans chemin ni identifiants.', 500);
    }
    ids.add(id);
    return { id, name: name.trim(), url: parsed.origin, token };
  });
}

export function loadRelayTargets(): RelayTarget[] {
  const file = process.env.TRANO_LAN_RELAYS_FILE;
  if (!file) return [];
  try { return parseRelayTargets(JSON.parse(readFileSync(file, 'utf8'))); }
  catch (error) {
    if (error instanceof LanError) throw error;
    throw new LanError('Fichier de configuration des relais absent ou illisible.', 500);
  }
}

async function relayRequest(target: RelayTarget, path: string, body?: unknown): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(target.url + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${target.token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const reader = response.body?.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 262144) throw new Error('Réponse excessive.');
          chunks.push(value);
        }
      } finally { await reader.cancel().catch(() => {}); }
    }
    if (!response.ok) {
      // Never forward arbitrary error text or URLs from another network.
      if (response.status === 403) throw new LanError('Relais en lecture seule ou accès refusé.', 403);
      if (response.status === 404) throw new LanError('Appareil absent du relais.', 404);
      if (response.status === 409) throw new LanError('Configuration de l’appareil à compléter sur le relais.', 409);
      if (response.status === 422) throw new LanError('Action non supportée par cet appareil.', 422);
      throw new LanError(`Relais indisponible ou accès refusé (HTTP ${response.status}).`);
    }
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Réponse invalide.');
    return result as Record<string, unknown>;
  } catch (error) {
    if (error instanceof LanError) throw error;
    throw new LanError('Relais injoignable ou réponse invalide.');
  }
}

export async function listLocalDevices(targets: RelayTarget[] = loadRelayTargets()): Promise<{ relays: RelayInventory[] }> {
  return { relays: await Promise.all(targets.map(async (target): Promise<RelayInventory> => {
    try {
      const data = await relayRequest(target, '/v1/devices');
      if (typeof data.controlEnabled !== 'boolean' || !Array.isArray(data.devices) || data.devices.length > 32 ||
          data.devices.some((device) => !device || typeof device.id !== 'string' || !ID_RE.test(device.id) || typeof device.reachable !== 'boolean')) {
        throw new LanError('Inventaire du relais invalide.');
      }
      return { id: target.id, name: target.name, online: true, controlEnabled: data.controlEnabled, devices: data.devices.map(publicDevice), error: null };
    } catch (error) {
      return { id: target.id, name: target.name, online: false, controlEnabled: false, devices: [], error: error instanceof LanError ? error.message : 'Relais injoignable.' };
    }
  })) };
}

export async function controlLocalMedia(relayId: unknown, deviceId: unknown, input: unknown, targets: RelayTarget[] = loadRelayTargets()): Promise<{ ok: true; message: string }> {
  if (typeof relayId !== 'string' || !ID_RE.test(relayId) || typeof deviceId !== 'string' || !ID_RE.test(deviceId)) throw new LanError('Identifiant relais ou appareil invalide.', 400);
  const command = parseCommand(input);
  const target = targets.find((r) => r.id === relayId);
  if (!target) throw new LanError('Relais non configuré.', 404);
  const result = await relayRequest(target, `/v1/devices/${deviceId}/commands`, command);
  if (result.ok !== true) throw new LanError('Le relais n’a pas confirmé la transmission.');
  return { ok: true, message: 'Commande transmise au relais ; relire l’état avec lister_appareils_locaux.' };
}
