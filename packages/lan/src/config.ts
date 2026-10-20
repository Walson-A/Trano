import { readFileSync } from 'node:fs';
import { isIPv4 } from 'node:net';
import { MEDIA_ACTIONS, LanError } from './types.ts';
import type { DeviceConfig, MediaCommand, RelayConfig } from './types.ts';

export const ID_RE = /^[a-z][a-z0-9_-]{0,47}$/;

export function isPrivateIPv4(value: string): boolean {
  if (!isIPv4(value)) return false;
  const [a, b] = value.split('.').map(Number);
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LanError('Objet JSON attendu.', 400);
  return value as Record<string, unknown>;
}
function port(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 65535) throw new LanError('Port invalide.', 400);
  return value as number;
}

export function parseConfig(input: unknown): RelayConfig {
  const raw = object(input);
  if (typeof raw.token !== 'string' || raw.token.length < 32 || raw.token.length > 256 || /\s/.test(raw.token)) {
    throw new LanError('Un jeton local de 32 à 256 caractères sans espaces est requis.', 400);
  }
  const listenHost = raw.listenHost ?? '127.0.0.1';
  if (typeof listenHost !== 'string' || !isIPv4(listenHost)) throw new LanError('listenHost doit être une IPv4.', 400);
  if (raw.allowControl !== undefined && typeof raw.allowControl !== 'boolean') throw new LanError('allowControl doit être un booléen.', 400);
  if (!Array.isArray(raw.devices) || raw.devices.length > 32) throw new LanError('devices doit contenir au maximum 32 appareils.', 400);
  const seen = new Set<string>();
  const devices = raw.devices.map((input): DeviceConfig => {
    const d = object(input);
    if (typeof d.id !== 'string' || !ID_RE.test(d.id) || seen.has(d.id)) throw new LanError('Identifiant local invalide ou dupliqué.', 400);
    seen.add(d.id);
    if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 100) throw new LanError('Nom appareil invalide.', 400);
    if (d.kind !== 'samsung' && d.kind !== 'freebox-player') throw new LanError('Type appareil non supporté.', 400);
    if (typeof d.host !== 'string' || !isPrivateIPv4(d.host)) throw new LanError('Seules les IPv4 LAN privées explicites sont acceptées.', 400);
    if (d.remoteCode !== undefined && (d.kind !== 'freebox-player' || typeof d.remoteCode !== 'string' || !/^\d{4,16}$/.test(d.remoteCode))) throw new LanError('Code télécommande Freebox invalide.', 400);
    if (d.mac !== undefined && (d.kind !== 'samsung' || typeof d.mac !== 'string' || !/^(?:[\da-f]{2}:){5}[\da-f]{2}$/i.test(d.mac))) throw new LanError('MAC Samsung invalide.', 400);
    if (d.samsungControl !== undefined && (d.kind !== 'samsung' || !['upnp', 'remote'].includes(String(d.samsungControl)))) throw new LanError('Mode Samsung invalide.', 400);
    if (d.samsungPort !== undefined && (d.kind !== 'samsung' || !Number.isInteger(d.samsungPort) || (d.samsungPort as number) < 1 || (d.samsungPort as number) > 65535)) throw new LanError('Port Samsung invalide.', 400);
    if (d.samsungToken !== undefined && (d.kind !== 'samsung' || typeof d.samsungToken !== 'string' || !/^[A-Za-z0-9._~-]{1,512}$/.test(d.samsungToken))) throw new LanError('Jeton Samsung invalide.', 400);
    if (d.samsungFingerprint256 !== undefined && (d.kind !== 'samsung' || typeof d.samsungFingerprint256 !== 'string' || !/^(?:[\da-f]{2}:){31}[\da-f]{2}$/i.test(d.samsungFingerprint256))) throw new LanError('Empreinte Samsung invalide.', 400);
    return {
      id: d.id, name: d.name.trim(), kind: d.kind, host: d.host,
      port: port(d.port, d.kind === 'samsung' ? 9197 : 80),
      ...(d.remoteCode !== undefined ? { remoteCode: d.remoteCode as string } : {}),
      ...(d.spotifyPort !== undefined ? { spotifyPort: port(d.spotifyPort, 0) } : {}),
      ...(d.mac !== undefined ? { mac: (d.mac as string).toLowerCase() } : {}),
      ...(d.samsungControl !== undefined ? { samsungControl: d.samsungControl as DeviceConfig['samsungControl'] } : {}),
      ...(d.samsungPort !== undefined ? { samsungPort: d.samsungPort as number } : {}),
      ...(d.samsungToken !== undefined ? { samsungToken: d.samsungToken as string } : {}),
      ...(d.samsungFingerprint256 !== undefined ? { samsungFingerprint256: d.samsungFingerprint256 as string } : {}),
    };
  });
  return { token: raw.token, listenHost, port: port(raw.port, 3012), allowControl: raw.allowControl === true, devices };
}

export function loadConfig(path: string): RelayConfig {
  try { return parseConfig(JSON.parse(readFileSync(path, 'utf8'))); }
  catch (error) {
    if (error instanceof LanError) throw error;
    // SyntaxError can include the malformed JSON, including a token or remote code.
    throw new LanError('Configuration locale absente, illisible ou JSON invalide.', 400);
  }
}

export function parseCommand(input: unknown): MediaCommand {
  const raw = object(input);
  if (!MEDIA_ACTIONS.includes(raw.action as never)) throw new LanError('Action multimédia inconnue.', 400);
  const action = raw.action as MediaCommand['action'];
  const allowed = new Set(['action', ...(action === 'volume_set' ? ['volume'] : action === 'mute_set' ? ['muted'] : [])]);
  if (Object.keys(raw).some((k) => !allowed.has(k))) throw new LanError('Argument non attendu pour cette action.', 400);
  if (action === 'volume_set' && (typeof raw.volume !== 'number' || !Number.isFinite(raw.volume) || raw.volume < 0 || raw.volume > 100)) throw new LanError('volume doit être compris entre 0 et 100.', 400);
  if (action === 'mute_set' && typeof raw.muted !== 'boolean') throw new LanError('muted doit être un booléen.', 400);
  return { action, ...(action === 'volume_set' ? { volume: Math.round(raw.volume as number) } : {}), ...(action === 'mute_set' ? { muted: raw.muted as boolean } : {}) };
}
