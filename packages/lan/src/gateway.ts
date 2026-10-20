import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import type { EventEmitter } from 'node:events';
import { isIPv4 } from 'node:net';
import { parseConfig, isPrivateIPv4 } from './config.ts';
import { tokenMatches } from './server.ts';
import { LanError } from './types.ts';
import type { DeviceConfig, MediaDevice } from './types.ts';

export interface GatewayConfig {
  readerToken: string;
  agentToken: string;
  bootstrapToken: string;
  publicBaseUrl: string;
  readerHost: string;
  readerPort: number;
  agentHost: string;
  agentPort: number;
  devices: DeviceConfig[];
}
interface AgentSocket extends EventEmitter {
  readyState: number;
  send(text: string): void;
  close(code?: number): void;
  terminate(): void;
}
interface WsServer extends EventEmitter {
  close(callback?: () => void): void;
  clients: Set<AgentSocket>;
}
const WebSocketServer = createRequire(import.meta.url)('ws').WebSocketServer as new (options: object) => WsServer;

function secret(value: unknown): value is string { return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value); }
function equal(a: string, b: string): boolean {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
function localHost(host: unknown): host is string {
  if (typeof host !== 'string' || !isIPv4(host)) return false;
  const [a, b] = host.split('.').map(Number);
  return host === '127.0.0.1' || isPrivateIPv4(host) || (a === 100 && b >= 64 && b <= 127);
}
export function parseGatewayConfig(input: unknown, allowHttpForTest = false): GatewayConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LanError('Configuration passerelle invalide.', 400);
  const raw = input as Record<string, unknown>;
  if (![raw.readerToken, raw.agentToken, raw.bootstrapToken].every(secret) ||
      new Set([raw.readerToken, raw.agentToken, raw.bootstrapToken]).size !== 3) throw new LanError('Trois jetons hexadécimaux distincts de 64 caractères sont requis.', 400);
  let url: URL;
  try { url = new URL(String(raw.publicBaseUrl)); } catch { throw new LanError('URL publique invalide.', 400); }
  if ((url.protocol !== 'https:' && !(allowHttpForTest && url.protocol === 'http:' && localHost(url.hostname))) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new LanError('Une origine HTTPS sans chemin ni identifiants est requise.', 400);
  const readerHost = raw.readerHost ?? '127.0.0.1'; const agentHost = raw.agentHost ?? '127.0.0.1';
  if (!localHost(readerHost) || !localHost(agentHost)) throw new LanError('Écoute locale, LAN ou Tailscale explicite requise.', 400);
  const reader = parseConfig({ token: raw.readerToken, listenHost: readerHost, port: raw.readerPort ?? 3015, devices: raw.devices });
  const agent = parseConfig({ token: raw.agentToken, listenHost: agentHost, port: raw.agentPort ?? 3014, devices: [] });
  if (reader.devices.length < 1 || reader.devices.length > 8) throw new LanError('Un à huit appareils explicites sont requis.', 400);
  const devices = reader.devices.map((d): DeviceConfig => {
    if (d.kind === 'samsung' && !d.mac) throw new LanError('La MAC Samsung doit être épinglée.', 400);
    if (d.kind === 'freebox-player' && !d.spotifyPort) throw new LanError('Le port Spotify découvert du Player est requis.', 400);
    // No control credential is embedded in the QML bootstrap.
    return { id: d.id, name: d.name, kind: d.kind, host: d.host,
      ...(d.kind === 'samsung' ? { mac: d.mac, port: d.port } : { spotifyPort: d.spotifyPort }) };
  });
  return { readerToken: raw.readerToken as string, agentToken: raw.agentToken as string, bootstrapToken: raw.bootstrapToken as string,
    publicBaseUrl: url.origin, readerHost, readerPort: reader.port, agentHost, agentPort: agent.port, devices };
}

export function loadGatewayConfig(path: string): GatewayConfig {
  try { return parseGatewayConfig(JSON.parse(readFileSync(path, 'utf8'))); }
  catch (error) { if (error instanceof LanError) throw error; throw new LanError('Configuration passerelle illisible ou JSON invalide.', 400); }
}
function json(reply: ServerResponse, status: number, value: unknown): void {
  reply.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  reply.end(JSON.stringify(value));
}

/** Read-only gateway. The Internet-facing listener never serves the reader API. */
export function createAgentGateway(input: GatewayConfig, options: { allowHttpForTest?: boolean; agentLifetimeMs?: number; now?: () => number } = {}) {
  const config = parseGatewayConfig(input, options.allowHttpForTest);
  const now = options.now ?? (() => performance.now());
  const lifetime = options.agentLifetimeMs ?? 0;
  if (!Number.isInteger(lifetime) || lifetime < 0 || lifetime > 3600000) throw new Error('Durée de diagnostic invalide.');
  const template = readFileSync(new URL('../devialet/agent.qml', import.meta.url), 'utf8');
  let current: AgentSocket | null = null;
  let snapshot: MediaDevice[] | null = null;
  let receivedAt = -Infinity;
  const fresh = () => current?.readyState === 1 && snapshot !== null && now() - receivedAt < 20000;
  const reader = createServer((req, reply) => {
    if (req.headers.origin) { json(reply, 403, { error: 'Accès navigateur refusé.' }); return; }
    if (!tokenMatches(req.headers.authorization, config.readerToken)) { json(reply, 401, { error: 'Accès refusé.' }); return; }
    if (req.method === 'POST') { json(reply, 403, { error: 'Agent Devialet en lecture seule.' }); return; }
    if (req.method !== 'GET' || !['/v1/devices', '/v1/health'].includes(req.url ?? '')) { json(reply, 404, { error: 'Route inconnue.' }); return; }
    if (!fresh()) { json(reply, 503, { error: 'Agent déconnecté ou observation périmée.' }); return; }
    json(reply, 200, req.url === '/v1/devices' ? { controlEnabled: false, devices: snapshot } : { status: 'ok', controlEnabled: false, deviceCount: snapshot!.length });
  });
  const agent = createServer((req, reply) => {
    if (req.headers.origin || req.method !== 'GET') { json(reply, 403, { error: 'Accès refusé.' }); return; }
    const match = /^\/bootstrap\/([a-f0-9]{64})\/(manifest.json|agent.qml)$/i.exec(req.url ?? '');
    if (!match || !equal(match[1], config.bootstrapToken)) { json(reply, 404, { error: 'Route inconnue.' }); return; }
    if (match[2] === 'manifest.json') {
      json(reply, 200, { name: 'Trano relais', identifier: 'fr.trano.lanagent', description: 'Relais des appareils du logement', capabilities: { net_wan: 'required' }, entryPoints: { main: { file: 'agent.qml', default: true } } });
      return;
    }
    const runtime = { url: config.publicBaseUrl.replace(/^http/, 'ws') + '/agent', token: config.agentToken, devices: config.devices, lifetimeMs: lifetime };
    reply.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    reply.end(template.replace('__TRANO_AGENT_CONFIG__', JSON.stringify(runtime)));
  });
  for (const server of [reader, agent]) { server.requestTimeout = 5000; server.headersTimeout = 5000; server.maxConnections = 16; }
  const wss = new WebSocketServer({ server: agent, path: '/agent', maxPayload: 32768, perMessageDeflate: false,
    verifyClient: (info: { origin: string; req: { url: string } }) => !info.origin && info.req.url === '/agent' && wss.clients.size < 4 });
  wss.on('connection', (socket: AgentSocket) => {
    let authenticated = false; let sequence = 0; let rateStart = now(); let messages = 0;
    const deadline = setTimeout(() => socket.terminate(), 2000);
    deadline.unref();
    socket.on('error', () => {});
    socket.on('close', () => { clearTimeout(deadline); if (current === socket) { current = null; snapshot = null; receivedAt = -Infinity; } });
    socket.on('message', (buffer: Buffer, binary: boolean) => {
      try {
        if (binary) throw new Error();
        if (now() - rateStart > 10000) { rateStart = now(); messages = 0; }
        if (++messages > 12) throw new Error();
        const data = JSON.parse(buffer.toString('utf8'));
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error();
        if (!authenticated) {
          if (data.type !== 'hello' || typeof data.token !== 'string' || !equal(data.token, config.agentToken) || current) throw new Error();
          authenticated = true; current = socket; clearTimeout(deadline); socket.send(JSON.stringify({ type: 'ready' })); return;
        }
        if (data.type !== 'inventory' || !Number.isSafeInteger(data.sequence) || data.sequence <= sequence ||
            !Array.isArray(data.devices) || data.devices.length !== config.devices.length) throw new Error();
        const seen = new Set<string>();
        const next = config.devices.map((device): MediaDevice => {
          const row = data.devices.find((r: Record<string, unknown>) => r?.id === device.id);
          if (!row || seen.has(row.id) || typeof row.reachable !== 'boolean') throw new Error();
          seen.add(row.id);
          if (row.reachable && device.kind === 'samsung' && row.mac !== device.mac) throw new Error();
          if (row.reachable && device.kind === 'freebox-player' && row.brand !== 'Freebox') throw new Error();
          return { id: device.id, name: device.name, kind: device.kind, host: device.host,
            model: row.reachable && typeof row.model === 'string' ? row.model.slice(0, 100) : null,
            reachable: row.reachable, observedAt: new Date().toISOString(),
            state: { volume: row.reachable && device.kind === 'samsung' && Number.isInteger(row.volume) && row.volume >= 0 && row.volume <= 100 ? row.volume : null,
              muted: row.reachable && device.kind === 'samsung' && typeof row.muted === 'boolean' ? row.muted : null, playback: 'unknown' },
            capabilities: [], transports: !row.reachable ? [] : device.kind === 'freebox-player' ? ['spotify_connect'] :
              (Number.isInteger(row.volume) || typeof row.muted === 'boolean') ? ['upnp'] : [],
            setupRequired: null, error: row.reachable ? null : 'Identité non vérifiée ou appareil injoignable.' };
        });
        sequence = data.sequence; snapshot = next; receivedAt = now();
        socket.send(JSON.stringify({ type: 'accepted', sequence }));
      } catch { socket.close(1008); }
    });
  });
  const close = async () => {
    for (const socket of wss.clients) socket.terminate();
    await Promise.all([new Promise<void>((resolve) => wss.close(() => resolve())), ...[reader, agent].map((server) => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }))]);
  };
  return { reader, agent, close };
}
