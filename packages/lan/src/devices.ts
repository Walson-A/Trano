import { createConnection } from 'node:net';
import { LanError } from './types.ts';
import type { DeviceConfig, MediaAction, MediaCommand, MediaDevice } from './types.ts';
import { parseCommand } from './config.ts';
import { samsungRemote, SAMSUNG_REMOTE_KEYS } from './samsung-remote.ts';

export type Fetcher = typeof fetch;

async function responseText(response: Response): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 262144) throw new LanError('Réponse appareil trop volumineuse.');
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  } finally {
    await reader.cancel().catch(() => {});
  }
}

export async function request(url: string, init: RequestInit = {}, fetcher: Fetcher = fetch): Promise<string> {
  try {
    const res = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(3000) });
    const text = await responseText(res);
    if (!res.ok) {
      const code = xmlValue(text, 'errorCode');
      throw new LanError(`L’appareil a refusé la requête (HTTP ${res.status}${code && /^\d{1,5}$/.test(code) ? '; UPnP ' + code : ''}).`);
    }
    return text;
  } catch (error) {
    if (error instanceof LanError) throw error;
    // Never expose a URL: a Freebox command URL contains its remote code.
    throw new LanError('Appareil injoignable ou délai de réponse dépassé.');
  }
}

export function xmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp('<(?:[\\w.-]+:)?' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?' + tag + '>'));
  return match ? match[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&') : null;
}

const SAMSUNG_ACTIONS: Record<string, MediaAction> = {
  SetVolume: 'volume_set', SetMute: 'mute_set', Play: 'play', Pause: 'pause',
  Stop: 'stop', Next: 'next', Previous: 'previous',
};
const FREEBOX_KEYS: Partial<Record<MediaAction, string>> = {
  volume_up: 'vol_inc', volume_down: 'vol_dec', play_pause: 'play',
  power_toggle: 'power',
  home: 'home', back: 'red', up: 'up', down: 'down', left: 'left', right: 'right', select: 'ok',
};

async function samsungIdentity(d: DeviceConfig, fetcher: Fetcher): Promise<{ model: string | null }> {
  const result = JSON.parse(await request(`http://${d.host}:8001/api/v2/`, {}, fetcher));
  const device = result?.device;
  if (!device || device.type !== 'Samsung SmartTV') throw new LanError('L’adresse ne répond pas comme une télévision Samsung.');
  if (d.mac && String(device.wifiMac ?? '').toLowerCase() !== d.mac) throw new LanError('L’identité de la télévision a changé : vérifie son adresse DHCP.');
  return { model: typeof device.modelName === 'string' ? device.modelName : null };
}

async function soap(d: DeviceConfig, service: 'RenderingControl' | 'AVTransport', action: string, values: Record<string, string | number>, fetcher: Fetcher): Promise<string> {
  const args = Object.entries({ InstanceID: 0, ...values }).map(([key, value]) => `<${key}>${value}</${key}>`).join('');
  const namespace = `urn:schemas-upnp-org:service:${service}:1`;
  const response = await request(`http://${d.host}:${d.port ?? 9197}/upnp/control/${service}1`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset="utf-8"', SOAPAction: `"${namespace}#${action}"` },
    body: `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:${action} xmlns:u="${namespace}">${args}</u:${action}></s:Body></s:Envelope>`,
  }, fetcher);
  if (/<(?:[\w.-]+:)?Fault[\s>]/.test(response)) throw new LanError('Commande UPnP refusée par l’appareil.');
  return response;
}

function integerOrNull(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const number = Number(value);
  return number >= 0 && number <= 100 ? number : null;
}

function tcpReachable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    const finish = (value: boolean) => { socket.destroy(); resolve(value); };
    socket.setTimeout(1500);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
  });
}

export async function readDevice(d: DeviceConfig, fetcher: Fetcher = fetch): Promise<MediaDevice> {
  const result: MediaDevice = {
    id: d.id, name: d.name, kind: d.kind, host: d.host, model: null,
    reachable: false, observedAt: new Date().toISOString(),
    state: { volume: null, muted: null, playback: 'unknown' },
    capabilities: [], transports: [], setupRequired: null, error: null,
  };
  try {
    if (d.kind === 'samsung') {
      result.model = (await samsungIdentity(d, fetcher)).model;
      result.reachable = true;
      const documents = await Promise.all([
        request(`http://${d.host}:${d.port ?? 9197}/RenderingControl_1.xml`, {}, fetcher).catch((error) => { if (d.samsungControl !== 'remote') throw error; return ''; }),
        request(`http://${d.host}:${d.port ?? 9197}/AVTransport_1.xml`, {}, fetcher).catch(() => ''),
      ]);
      // Capabilities come from the device, never from an optimistic model list.
      const names = documents.flatMap((xml) => [...xml.matchAll(/<action\b[^>]*>([\s\S]*?)<\/action>/g)].map((m) => xmlValue(m[1], 'name')));
      result.capabilities = Object.entries(SAMSUNG_ACTIONS).filter(([key]) => names.includes(key)).map(([, value]) => value);
      result.transports = documents.some(Boolean) ? ['upnp'] : [];
      const [volume, muted, transport] = await Promise.all([
        names.includes('GetVolume') ? soap(d, 'RenderingControl', 'GetVolume', { Channel: 'Master' }, fetcher).then((xml) => integerOrNull(xmlValue(xml, 'CurrentVolume'))).catch(() => null) : null,
        names.includes('GetMute') ? soap(d, 'RenderingControl', 'GetMute', { Channel: 'Master' }, fetcher).then((xml) => xmlValue(xml, 'CurrentMute')).catch(() => null) : null,
        names.includes('GetTransportInfo') ? soap(d, 'AVTransport', 'GetTransportInfo', {}, fetcher).then((xml) => xmlValue(xml, 'CurrentTransportState')).catch(() => null) : null,
      ]);
      result.state.volume = volume;
      result.state.muted = muted === '1' ? true : muted === '0' ? false : null;
      result.state.playback = transport === 'PLAYING' ? 'playing' : transport === 'PAUSED_PLAYBACK' ? 'paused' : transport === 'STOPPED' ? 'stopped' : 'unknown';
      if (d.samsungControl === 'remote') {
        result.setupRequired = d.samsungToken && d.samsungFingerprint256 ? null : 'samsung_pairing';
        result.capabilities = result.setupRequired ? [] : Object.keys(SAMSUNG_REMOTE_KEYS) as MediaAction[];
        if (!result.setupRequired) result.transports.push('samsung_remote');
      }
    } else {
      // A TCP response is reachability, never evidence of the player's power/playback state.
      result.reachable = await tcpReachable(d.host, d.port ?? 80);
      if (!result.reachable) throw new LanError('Freebox Player injoignable.');
      result.setupRequired = d.remoteCode ? null : 'remote_code';
      result.capabilities = d.remoteCode ? Object.keys(FREEBOX_KEYS) as MediaAction[] : [];
      if (d.spotifyPort) {
        try {
          const info = JSON.parse(await request(`http://${d.host}:${d.spotifyPort}/zc?action=getInfo&version=2.10.0`, {}, fetcher));
          if (info.status === 101 && info.brandDisplayName === 'Freebox') {
            result.model = typeof info.modelDisplayName === 'string' ? info.modelDisplayName : null;
            result.transports.push('spotify_connect');
          }
        } catch { /* Optional advertised service may have moved after a reboot. */ }
      }
    }
  } catch (error) {
    result.error = error instanceof LanError ? error.message : 'Réponse appareil non reconnue.';
    result.capabilities = [];
  }
  return result;
}

export async function commandDevice(d: DeviceConfig, input: unknown, fetcher: Fetcher = fetch): Promise<void> {
  const command: MediaCommand = parseCommand(input);
  if (d.kind === 'freebox-player') {
    if (!d.remoteCode) throw new LanError('Code télécommande requis dans la configuration locale du relais.', 409);
    const key = FREEBOX_KEYS[command.action];
    if (!key) throw new LanError('Action non supportée par la télécommande Freebox.', 422);
    const url = new URL(`http://${d.host}:${d.port ?? 80}/pub/remote_control`);
    url.searchParams.set('code', d.remoteCode);
    url.searchParams.set('key', key);
    await request(url.href, {}, fetcher);
    return;
  }
  const state = await readDevice(d, fetcher);
  if (!state.reachable || state.error) throw new LanError(state.error ?? 'Télévision injoignable.');
  if (state.setupRequired === 'samsung_pairing') throw new LanError('Appairage Samsung sur place requis.', 409);
  if (!state.capabilities.includes(command.action)) throw new LanError('Action non annoncée par cette télévision.', 422);
  if (d.samsungControl === 'remote') {
    await samsungRemote(d, command.action);
    return;
  }
  switch (command.action) {
    case 'volume_set': await soap(d, 'RenderingControl', 'SetVolume', { Channel: 'Master', DesiredVolume: command.volume! }, fetcher); return;
    case 'mute_set': await soap(d, 'RenderingControl', 'SetMute', { Channel: 'Master', DesiredMute: command.muted ? 1 : 0 }, fetcher); return;
    case 'play': await soap(d, 'AVTransport', 'Play', { Speed: 1 }, fetcher); return;
    case 'pause': await soap(d, 'AVTransport', 'Pause', {}, fetcher); return;
    case 'stop': await soap(d, 'AVTransport', 'Stop', {}, fetcher); return;
    case 'next': await soap(d, 'AVTransport', 'Next', {}, fetcher); return;
    case 'previous': await soap(d, 'AVTransport', 'Previous', {}, fetcher); return;
    default: throw new LanError('Action non supportée.', 422);
  }
}
