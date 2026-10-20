import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { readDevice, commandDevice } from './devices.ts';
import { ID_RE, parseCommand, parseConfig } from './config.ts';
import { LanError } from './types.ts';
import type { RelayConfig, MediaDevice } from './types.ts';

export function tokenMatches(header: string | undefined, token: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const given = Buffer.from(header.slice(7));
  const wanted = Buffer.from(token);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
export interface Driver {
  read: typeof readDevice;
  command: typeof commandDevice;
}

function json(reply: ServerResponse, status: number, value: unknown): void {
  reply.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  reply.end(JSON.stringify(value));
}

async function bodyOf(request: IncomingMessage): Promise<unknown> {
  if (!request.headers['content-type']?.startsWith('application/json')) throw new LanError('Content-Type application/json requis.', 415);
  if (Number(request.headers['content-length']) > 4096) { request.resume(); throw new LanError('Requête trop volumineuse.', 413); }
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 4096) throw new LanError('Requête trop volumineuse.', 413);
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new LanError('JSON invalide.', 400); }
}

/** No discovery, persistence, polling or appliance command happens on startup. */
export function createRelayServer(input: RelayConfig, driver: Driver = { read: readDevice, command: commandDevice }) {
  const config = parseConfig(input);
  const byId = new Map(config.devices.map((d) => [d.id, d]));
  let active = 0;
  const server = createServer(async (req, reply) => {
    // Server-to-server API: a website cannot turn the local relay into a browser proxy.
    if (req.headers.origin) { json(reply, 403, { error: 'Accès navigateur direct refusé.' }); return; }
    if (!tokenMatches(req.headers.authorization, config.token)) { json(reply, 401, { error: 'Jeton relais invalide.' }); return; }
    if (active >= 8) { json(reply, 429, { error: 'Relais occupé.' }); return; }
    active++;
    try {
      if (req.method === 'GET' && req.url === '/v1/health') {
        json(reply, 200, { status: 'ok', controlEnabled: config.allowControl, deviceCount: config.devices.length });
        return;
      }
      if (req.method === 'GET' && req.url === '/v1/devices') {
        const devices: MediaDevice[] = await Promise.all(config.devices.map((d) => driver.read(d)));
        json(reply, 200, { controlEnabled: config.allowControl, devices });
        return;
      }
      const match = req.url?.match(/^\/v1\/devices\/([a-z][a-z0-9_-]{0,47})(\/commands)?$/);
      if (!match || !ID_RE.test(match[1])) { json(reply, 404, { error: 'Route relais inconnue.' }); return; }
      const device = byId.get(match[1]);
      if (!device) { json(reply, 404, { error: 'Appareil non configuré.' }); return; }
      if (req.method === 'GET' && !match[2]) {
        json(reply, 200, { controlEnabled: config.allowControl, device: await driver.read(device) });
        return;
      }
      if (req.method === 'POST' && match[2]) {
        if (!config.allowControl) throw new LanError('Relais en lecture seule : allowControl est désactivé.', 403);
        const body = await bodyOf(req);
        await driver.command(device, parseCommand(body));
        // Do not pretend the device state changed just because it accepted a key.
        json(reply, 200, { ok: true, message: 'Commande transmise ; relire l’état de l’appareil.' });
        return;
      }
      json(reply, 405, { error: 'Méthode non autorisée.' });
    } catch (error) {
      json(reply, error instanceof LanError ? error.status : 500, {
        error: error instanceof LanError ? error.message : 'Erreur du relais local.',
      });
    } finally { active--; }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 5_000;
  server.maxHeadersCount = 40;
  return server;
}
