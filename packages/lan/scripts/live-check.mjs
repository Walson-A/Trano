/** Optional read-only integration proof against real, configured devices. Never part of npm test. */
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import Fastify from 'fastify';
import { loadConfig } from '../src/config.ts';
import { createRelayServer } from '../src/server.ts';

const file = process.argv[2];
if (!file) throw new Error('Usage: node packages/lan/scripts/live-check.mjs <configuration locale>');
const config = loadConfig(file);
if (config.allowControl) throw new Error('La vérification live exige allowControl=false.');
const temp = mkdtempSync(join(tmpdir(), 'trano-lan-live-'));
const relay = createRelayServer(config);
const app = Fastify();
let report;
try {
  await new Promise((resolve, reject) => { relay.once('error', reject); relay.listen(0, '127.0.0.1', resolve); });
  const relaysFile = join(temp, 'relays.json');
  writeFileSync(relaysFile, JSON.stringify([{ id: 'apartment', name: 'Appartement', url: 'http://127.0.0.1:' + relay.address().port, token: config.token }]));
  process.env.TRANO_LAN_RELAYS_FILE = relaysFile;
  process.env.TRANO_MCP_TOKEN = randomBytes(32).toString('hex');
  process.env.TRANO_DB_PATH = ':memory:';
  delete process.env.TRANO_HA_URL;
  delete process.env.TRANO_HA_TOKEN;
  const { lanRoutes } = await import('../../../apps/server/src/routes/lan.ts');
  const { mcpRoutes } = await import('../../../apps/server/src/routes/mcp.ts');
  lanRoutes(app); mcpRoutes(app);
  const headers = { authorization: 'Bearer ' + process.env.TRANO_MCP_TOKEN, accept: 'application/json, text/event-stream' };
  const request = (method, params) => app.inject({
    method: 'POST', url: '/api/mcp', headers,
    payload: { jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) },
  });
  const decode = (response) => {
    if (response.statusCode !== 200) throw new Error('MCP HTTP ' + response.statusCode);
    if (response.headers['content-type']?.includes('text/event-stream')) {
      const data = response.body.split('\n').filter((line) => line.startsWith('data: ')).map((line) => line.slice(6)).join('\n');
      return JSON.parse(data);
    }
    return response.json();
  };
  const listed = decode(await request('tools/list'));
  const localTools = listed.result.tools.filter((t) => t.name.includes('_local') || t.name.endsWith('_locaux'));
  const read = decode(await request('tools/call', { name: 'lister_appareils_locaux', arguments: {} }));
  const inventory = JSON.parse(read.result.content[0].text);
  if (!inventory.relays[0]?.online || !inventory.relays[0].devices.length) throw new Error('Inventaire réel inaccessible.');
  const first = inventory.relays[0].devices[0];
  // Invalid action: rejected before the driver, even if its read-only gate were broken.
  const refused = await app.inject({
    method: 'POST', url: '/api/lan/relays/apartment/devices/' + first.id + '/commands', headers,
    payload: { action: 'verify_read_only' },
  });
  report = {
    checkedAt: new Date().toISOString(), homeAssistantConfigured: false,
    mcpTools: localTools.map(({ name, annotations }) => ({ name, annotations })),
    inventory,
    invalidCommandRefused: refused.statusCode === 400,
    applianceCommandsSent: 0,
  };
  if (!report.invalidCommandRefused) throw new Error('La validation de commande a échoué.');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await app.close();
  relay.closeAllConnections();
  await new Promise((resolve) => relay.close(resolve));
  rmSync(temp, { recursive: true, force: true });
}
