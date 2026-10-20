import { createSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';
import { isIPv4 } from 'node:net';
import { request } from './devices.ts';
import { LanError } from './types.ts';
import { isPrivateIPv4 } from './config.ts';

interface MdnsRecord {
  source: string;
  name: string;
  type: 'PTR' | 'SRV' | 'TXT' | 'A';
  target?: string;
  port?: number;
  address?: string;
  info?: Record<string, string>;
}
export interface DiscoveryResult {
  interfaceAddress: string;
  scannedSubnet: string;
  ssdp: Array<{ host: string; server: string; service: string; location: string }>;
  mdns: MdnsRecord[];
  devices: Array<{ host: string; kind: 'samsung' | 'freebox-player'; name: string; model: string | null; mac?: string; spotifyPort?: number }>;
  warnings: string[];
}

function ipNumber(ip: string): number {
  return ip.split('.').reduce((value, octet) => ((value << 8) | Number(octet)) >>> 0, 0);
}
function encodeName(name: string): Buffer {
  return Buffer.concat([...name.split('.').map((part) => Buffer.concat([Buffer.from([Buffer.byteLength(part)]), Buffer.from(part)])), Buffer.from([0])]);
}

export function readDnsName(data: Buffer, start: number): { name: string; end: number } {
  const parts: string[] = [];
  const seen = new Set<number>();
  let position = start;
  let end: number | undefined;
  for (let steps = 0; steps < 128; steps++) {
    if (position >= data.length || seen.has(position)) throw new Error('Nom DNS invalide.');
    seen.add(position);
    const length = data[position++];
    if ((length & 192) === 192) {
      if (position >= data.length) throw new Error('Pointeur DNS tronqué.');
      end ??= position + 1;
      position = ((length & 63) << 8) | data[position];
      continue;
    }
    if (!length) return { name: parts.join('.'), end: end ?? position };
    if (length > 63 || position + length > data.length) throw new Error('Label DNS invalide.');
    parts.push(data.subarray(position, position + length).toString('utf8'));
    position += length;
  }
  throw new Error('Nom DNS trop profond.');
}

const TXT_KEYS = new Set(['model', 'am', 'manufacturer', 'product', 'version', 'cpath', 'deviceid']);
export function parseMdns(data: Buffer, source: string): MdnsRecord[] {
  if (data.length < 12 || data.length > 65535 || !(data.readUInt16BE(2) & 0x8000)) return [];
  const qd = data.readUInt16BE(4);
  const count = data.readUInt16BE(6) + data.readUInt16BE(8) + data.readUInt16BE(10);
  if (qd > 128 || count > 512) return [];
  let pos = 12;
  const records: MdnsRecord[] = [];
  try {
    for (let i = 0; i < qd; i++) pos = readDnsName(data, pos).end + 4;
    for (let i = 0; i < count; i++) {
      const owner = readDnsName(data, pos);
      pos = owner.end;
      const type = data.readUInt16BE(pos);
      const length = data.readUInt16BE(pos + 8);
      pos += 10;
      const end = pos + length;
      if (end > data.length) throw new Error('Record DNS tronqué.');
      if (type === 12) {
        records.push({ source, name: owner.name, type: 'PTR', target: readDnsName(data, pos).name });
      } else if (type === 33 && length >= 7) {
        records.push({ source, name: owner.name, type: 'SRV', port: data.readUInt16BE(pos + 4), target: readDnsName(data, pos + 6).name });
      } else if (type === 1 && length === 4) {
        records.push({ source, name: owner.name, type: 'A', address: [...data.subarray(pos, end)].join('.') });
      } else if (type === 16) {
        const info: Record<string, string> = {};
        let p = pos;
        while (p < end) {
          const n = data[p++];
          if (p + n > end) throw new Error('TXT DNS tronqué.');
          const entry = data.subarray(p, p + n).toString('utf8'); p += n;
          const sep = entry.indexOf('=');
          const key = entry.slice(0, sep).toLowerCase();
          if (sep > 0 && TXT_KEYS.has(key)) info[key] = entry.slice(sep + 1);
        }
        records.push({ source, name: owner.name, type: 'TXT', info });
      }
      pos = end;
    }
    return records;
  } catch { return []; }
}

/** Explicit local interface only; discovery never traverses the upstream residence network. */
export async function discover(interfaceAddress: string, durationMs = 4500): Promise<DiscoveryResult> {
  const iface = Object.values(networkInterfaces()).flat().find((i) => i?.address === interfaceAddress && !i.internal && i.family === 'IPv4');
  if (!isPrivateIPv4(interfaceAddress) || !iface) throw new LanError('Choisis une IPv4 privée portée par une interface locale active.', 400);
  const mask = ipNumber(iface.netmask);
  const subnet = (ipNumber(interfaceAddress) & mask) >>> 0;
  const within = (ip: string) => isIPv4(ip) && ((ipNumber(ip) & mask) >>> 0) === subnet;
  const result: DiscoveryResult = {
    interfaceAddress, scannedSubnet: [24, 16, 8, 0].map((shift) => (subnet >>> shift) & 255).join('.') + '/' + (iface.cidr?.split('/')[1] ?? 'unknown'),
    ssdp: [], mdns: [], devices: [], warnings: [],
  };
  const sockets = [createSocket('udp4'), createSocket('udp4')];
  const keys = new Set<string>();
  const add = <T>(list: T[], record: T) => {
    const key = JSON.stringify(record);
    if (list.length < 256 && !keys.has(key)) { keys.add(key); list.push(record); }
  };
  try {
    await Promise.all(sockets.map((socket) => new Promise<void>((resolve, reject) => {
      socket.once('error', reject);
      socket.bind(0, interfaceAddress, () => {
        socket.removeListener('error', reject);
        socket.on('error', (error) => result.warnings.push(error.message));
        socket.setMulticastInterface(interfaceAddress);
        resolve();
      });
    })));
    const [ssdp, mdns] = sockets;
    ssdp.setMulticastTTL(1);
    mdns.setMulticastTTL(255);
    ssdp.on('message', (buffer, remote) => {
      if (!within(remote.address) || buffer.length > 32768) return;
      const lines = buffer.toString('utf8').split('\r\n');
      if (!/^HTTP\/1\.[01] 200\b/.test(lines[0])) return;
      const headers = Object.fromEntries(lines.slice(1).filter((line) => line.includes(':')).map((line) => {
        const sep = line.indexOf(':');
        return [line.slice(0, sep).toLowerCase(), line.slice(sep + 1).trim()];
      }));
      // Locations are evidence only: never fetch arbitrary URLs from advertisements.
      add(result.ssdp, { host: remote.address, server: headers.server ?? '', service: headers.st ?? '', location: headers.location ?? '' });
    });
    const queried = new Set<string>();
    const query = (name: string, type = 12) => {
      const key = name + type;
      if (queried.has(key) || queried.size > 32) return;
      queried.add(key);
      const header = Buffer.alloc(12); header.writeUInt16BE(1, 4);
      const question = Buffer.alloc(4); question.writeUInt16BE(type); question.writeUInt16BE(0x8001, 2);
      mdns.send(Buffer.concat([header, encodeName(name), question]), 5353, '224.0.0.251');
    };
    mdns.on('message', (buffer, remote) => {
      if (!within(remote.address)) return;
      for (const record of parseMdns(buffer, remote.address)) {
        add(result.mdns, record);
        if (record.type === 'PTR' && record.target?.endsWith('._airplay._tcp.local')) {
          query(record.target.replace('._airplay._tcp.local', '._device-info._tcp.local'), 255);
        }
      }
    });
    ssdp.send(Buffer.from('M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ssdp:all\r\n\r\n'), 1900, '239.255.255.250');
    for (const type of ['_services._dns-sd._udp', '_airplay._tcp', '_raop._tcp', '_spotify-connect._tcp', '_device-info._tcp', '_companion-link._tcp']) query(type + '.local');
    await new Promise((resolve) => setTimeout(resolve, Math.max(1000, Math.min(durationMs, 10_000))));
  } finally {
    for (const socket of sockets) { try { socket.close(); } catch { /* Not bound after an early error. */ } }
  }
  const samsungHosts = [...new Set(result.ssdp.filter((r) => /samsung/i.test(r.server)).map((r) => r.host))].slice(0, 32);
  await Promise.all(samsungHosts.map(async (host) => {
    try {
      const info = JSON.parse(await request(`http://${host}:8001/api/v2/`));
      if (info.device?.type === 'Samsung SmartTV') result.devices.push({
        host, kind: 'samsung', name: String(info.device.name ?? 'Télévision Samsung'),
        model: typeof info.device.modelName === 'string' ? info.device.modelName : null,
        ...(typeof info.device.wifiMac === 'string' ? { mac: info.device.wifiMac.toLowerCase() } : {}),
      });
    } catch { result.warnings.push(`Identité Samsung non lisible sur ${host}.`); }
  }));
  const players = new Set(result.mdns.filter((r) => r.type === 'TXT' && /^fbx\d+hd/i.test(r.info?.model ?? '')).map((r) => r.source));
  for (const host of players) {
    const identity = result.mdns.find((r) => r.source === host && r.type === 'TXT' && /^fbx\d+hd/i.test(r.info?.model ?? ''));
    const airplay = result.mdns.find((r) => r.source === host && r.type === 'PTR' && r.name === '_airplay._tcp.local');
    const spotify = result.mdns.find((r) => r.source === host && r.type === 'SRV' && r.name.endsWith('._spotify-connect._tcp.local'));
    result.devices.push({
      host, kind: 'freebox-player', name: airplay?.target?.replace('._airplay._tcp.local', '') ?? 'Freebox Player',
      model: identity?.info?.model ?? null, ...(spotify?.port ? { spotifyPort: spotify.port } : {}),
    });
  }
  return result;
}
