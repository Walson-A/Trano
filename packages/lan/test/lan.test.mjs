import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseConfig, parseCommand, loadConfig } from '../src/config.ts';
import { readDevice, commandDevice, xmlValue } from '../src/devices.ts';
import { parseMdns, readDnsName } from '../src/discovery.ts';
import { createRelayServer } from '../src/server.ts';
import { parseRelayTargets, listLocalDevices, controlLocalMedia } from '../../../apps/server/src/lib/lan.ts';

const TOKEN = 'a'.repeat(64);
const TV = { id: 'tv', name: 'Télévision', kind: 'samsung', host: '192.168.50.10' };
const CONFIG = { token: TOKEN, listenHost: '127.0.0.1', port: 3012, allowControl: false, devices: [TV] };
const headers = { Authorization: 'Bearer ' + TOKEN };
const snapshot = { id: 'tv', name: 'Télévision', kind: 'samsung', host: TV.host, model: 'Fixture',
  reachable: true, observedAt: new Date().toISOString(), state: { volume: 12, muted: false, playback: 'unknown' },
  capabilities: ['volume_set'], transports: ['upnp'], setupRequired: null, error: null };

async function listen(t, server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); });
  return 'http://127.0.0.1:' + server.address().port;
}
function samsungFetch({ identity = {}, extraActions = [], failRead = false, faultWrite = false } = {}) {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    calls.push({ url, ...init });
    if (url.includes('/api/v2/')) return Response.json({ device: { type: 'Samsung SmartTV', modelName: 'FixtureTV', wifiMac: 'aa:bb:cc:dd:ee:ff', ...identity } });
    if (url.endsWith('.xml')) return new Response('<scpd><actionList>' + ['GetVolume', 'SetVolume', 'GetMute', 'SetMute', 'GetTransportInfo', ...extraActions].map((a) => '<action><name>' + a + '</name></action>').join('') + '</actionList></scpd>');
    const action = init.headers?.SOAPAction ?? '';
    if (action.includes('#GetVolume')) return new Response(failRead ? '<Fault/>' : '<CurrentVolume>12</CurrentVolume>');
    if (action.includes('#GetMute')) return new Response('<CurrentMute>0</CurrentMute>');
    if (action.includes('#GetTransportInfo')) return new Response('<CurrentTransportState>STOPPED</CurrentTransportState>');
    return new Response(faultWrite ? '<s:Fault><faultcode>500</faultcode></s:Fault>' : '<ok/>');
  };
  return { fetcher, calls };
}

test('configuration excludes arbitrary hosts, duplicates, bad ports and weak tokens', () => {
  assert.equal(parseConfig(CONFIG).allowControl, false);
  for (const host of ['example.com', '127.0.0.1', '169.254.169.254', '8.8.8.8', '192.168.50.10/path']) {
    assert.throws(() => parseConfig({ ...CONFIG, devices: [{ ...TV, host }] }));
  }
  assert.throws(() => parseConfig({ ...CONFIG, token: 'short' }));
  assert.throws(() => parseConfig({ ...CONFIG, devices: [TV, TV] }));
  assert.throws(() => parseConfig({ ...CONFIG, port: 70000 }));
  assert.throws(() => parseConfig({ ...CONFIG, devices: [{ ...TV, remoteCode: '1234' }] }));
});
test('command validation rejects non-finite values, missing booleans and unused arguments', () => {
  for (const input of [{ action: 'volume_set', volume: -1 }, { action: 'volume_set', volume: Infinity },
    { action: 'mute_set', muted: 'false' }, { action: 'play', volume: 50 }, { action: 'shell' },
    { action: 'play', url: 'http://evil/' }, null]) assert.throws(() => parseCommand(input));
  assert.deepEqual(parseCommand({ action: 'volume_set', volume: 12.6 }), { action: 'volume_set', volume: 13 });
});
test('Samsung reads actual values and never invokes setter during inspection', async () => {
  const { fetcher, calls } = samsungFetch({ extraActions: ['Play', 'Pause'] });
  const state = await readDevice(TV, fetcher);
  assert.equal(state.model, 'FixtureTV');
  assert.deepEqual(state.state, { volume: 12, muted: false, playback: 'stopped' });
  assert.ok(state.capabilities.includes('pause'));
  assert.equal(calls.some((c) => /#Set|#Play|#Pause/.test(c.headers?.SOAPAction ?? '')), false);
});
test('Samsung unknown reads stay null rather than becoming zero', async () => {
  const { fetcher } = samsungFetch({ failRead: true });
  assert.equal((await readDevice(TV, fetcher)).state.volume, null);
});
test('unreachable devices have unknown state and no pretend capabilities', async () => {
  const state = await readDevice(TV, async () => { throw new Error('network'); });
  assert.equal(state.reachable, false);
  assert.equal(state.state.volume, null);
  assert.equal(state.state.playback, 'unknown');
  assert.deepEqual(state.capabilities, []);
});
test('DHCP identity mismatch prevents every command', async () => {
  const { fetcher, calls } = samsungFetch();
  await assert.rejects(commandDevice({ ...TV, mac: '00:00:00:00:00:01' }, { action: 'volume_set', volume: 20 }, fetcher), /identité/);
  assert.equal(calls.length, 1);
});
test('Samsung commands encode the exact UPnP arguments and reject unadvertised actions', async () => {
  const { fetcher, calls } = samsungFetch();
  await commandDevice(TV, { action: 'volume_set', volume: 17 }, fetcher);
  const set = calls.find((c) => c.headers?.SOAPAction?.includes('#SetVolume'));
  assert.ok(set.body.includes('<DesiredVolume>17</DesiredVolume>'));
  assert.ok(set.body.includes('<Channel>Master</Channel>'));
  await assert.rejects(commandDevice(TV, { action: 'power_toggle' }, fetcher), /non annoncée/);
});
test('HTTP 200 carrying a SOAP Fault is not reported as successful control', async () => {
  const { fetcher } = samsungFetch({ faultWrite: true });
  await assert.rejects(commandDevice(TV, { action: 'mute_set', muted: true }, fetcher), /UPnP refusée/);
});
test('Freebox requires a code and never invents an absolute volume capability', async () => {
  const player = { id: 'player', name: 'Player', kind: 'freebox-player', host: '192.168.50.20' };
  let calls = 0;
  await assert.rejects(commandDevice(player, { action: 'volume_up' }, async () => { calls++; }), /Code télécommande/);
  assert.equal(calls, 0);
  await assert.rejects(commandDevice({ ...player, remoteCode: '12345678' }, { action: 'volume_set', volume: 20 }), /non supportée/);
});
test('Freebox command has a fixed endpoint and failures never reveal its code', async () => {
  const player = { id: 'player', name: 'Player', kind: 'freebox-player', host: '192.168.50.20', remoteCode: '12345678' };
  let requested;
  await commandDevice(player, { action: 'volume_up' }, async (url) => { requested = new URL(url); return new Response(''); });
  assert.equal(requested.pathname, '/pub/remote_control');
  assert.equal(requested.searchParams.get('key'), 'vol_inc');
  await assert.rejects(commandDevice(player, { action: 'power_toggle' }, async () => { throw new Error('secret ' + player.remoteCode); }),
    (e) => !e.message.includes(player.remoteCode));
});
test('XML values support namespaces and escape sequences', () => {
  assert.equal(xmlValue('<u:CurrentVolume>12</u:CurrentVolume>', 'CurrentVolume'), '12');
  assert.equal(xmlValue('<a>A &amp; B</a>', 'a'), 'A & B');
});
test('hostile DNS compression and truncated responses are bounded', () => {
  assert.throws(() => readDnsName(Buffer.from([0xc0, 0]), 0));
  assert.deepEqual(parseMdns(Buffer.alloc(3), '192.168.50.1'), []);
  const malicious = Buffer.alloc(14); malicious.writeUInt16BE(0x8000, 2); malicious.writeUInt16BE(1, 6); malicious[12] = 0xc0; malicious[13] = 12;
  assert.deepEqual(parseMdns(malicious, '192.168.50.1'), []);
});
test('relay authenticates reads, blocks browser origins and starts read-only', async (t) => {
  let commands = 0;
  const url = await listen(t, createRelayServer(CONFIG, { read: async () => snapshot, command: async () => { commands++; } }));
  assert.equal((await fetch(url + '/v1/devices')).status, 401);
  assert.equal((await fetch(url + '/v1/devices', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  assert.equal((await fetch(url + '/v1/devices', { headers: { ...headers, Origin: 'https://evil.example' } })).status, 403);
  const inventory = await (await fetch(url + '/v1/devices', { headers })).json();
  assert.equal(inventory.controlEnabled, false);
  assert.equal(JSON.stringify(inventory).includes(TOKEN), false);
  assert.equal((await fetch(url + '/v1/devices/tv/commands', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{"action":"play"}' })).status, 403);
  assert.equal(commands, 0);
});
test('relay validates bodies before its driver and addresses only configured devices', async (t) => {
  const commands = [];
  const url = await listen(t, createRelayServer({ ...CONFIG, allowControl: true }, { read: async () => snapshot, command: async (d, body) => { commands.push({ d, body }); } }));
  const post = (path, body) => fetch(url + path, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body });
  assert.equal((await post('/v1/devices/tv/commands', '{"action":"mute_set","muted":"false"}')).status, 400);
  assert.equal((await post('/v1/devices/other/commands', '{"action":"play"}')).status, 404);
  assert.equal((await post('/v1/devices/tv/commands', 'x'.repeat(5000))).status, 413);
  assert.equal((await post('/v1/devices/tv/commands', '{"action":"volume_set","volume":18}')).status, 200);
  assert.deepEqual(commands.map((c) => c.body), [{ action: 'volume_set', volume: 18 }]);
});
test('remote relay configuration rejects public endpoints, URL credentials and path injection', () => {
  const row = { id: 'apartment', name: 'Appartement', url: 'http://127.0.0.1:3012', token: TOKEN };
  assert.equal(parseRelayTargets([row])[0].id, 'apartment');
  assert.equal(parseRelayTargets([{ ...row, url: 'http://100.64.224.9:3012' }]).length, 1);
  for (const url of ['http://8.8.8.8', 'http://user:pass@127.0.0.1', 'file:///etc/passwd', 'http://127.0.0.1/admin', 'http://example.com']) {
    assert.throws(() => parseRelayTargets([{ ...row, url }]));
  }
});
test('Trano bridge reads and controls through the authenticated relay without HA', async (t) => {
  const received = [];
  const url = await listen(t, createRelayServer({ ...CONFIG, allowControl: true }, { read: async () => snapshot, command: async (device, command) => { received.push({ id: device.id, command }); } }));
  const targets = [{ id: 'apartment', name: 'Appartement', url, token: TOKEN }];
  const list = await listLocalDevices(targets);
  assert.equal(list.relays[0].name, 'Appartement');
  assert.equal(list.relays[0].devices[0].model, 'Fixture');
  assert.equal((await controlLocalMedia('apartment', 'tv', { action: 'volume_set', volume: 22 }, targets)).ok, true);
  assert.deepEqual(received, [{ id: 'tv', command: { action: 'volume_set', volume: 22 } }]);
  await assert.rejects(controlLocalMedia('apartment', '../tv', { action: 'play' }, targets), /invalide/);
});
test('Trano isolates failures between relays and does not leak relay tokens', async (t) => {
  const url = await listen(t, createRelayServer(CONFIG, { read: async () => snapshot, command: async () => {} }));
  const result = await listLocalDevices([
    { id: 'good', name: 'Appartement', url, token: TOKEN },
    { id: 'bad', name: 'Autre lieu', url, token: 'b'.repeat(64) },
  ]);
  assert.equal(result.relays[0].online, true);
  assert.equal(result.relays[1].online, false);
  assert.deepEqual(result.relays[1].devices, []);
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});
test('Fastify exposes authenticated LAN routes with HA absent', async (t) => {
  const { default: Fastify } = await import('fastify');
  const { lanRoutes } = await import('../../../apps/server/src/routes/lan.ts');
  const dir = mkdtempSync(join(tmpdir(), 'trano-lan-'));
  const file = join(dir, 'relays.json');
  writeFileSync(file, '[]');
  const oldToken = process.env.TRANO_MCP_TOKEN;
  const oldFile = process.env.TRANO_LAN_RELAYS_FILE;
  process.env.TRANO_MCP_TOKEN = TOKEN;
  process.env.TRANO_LAN_RELAYS_FILE = file;
  const app = Fastify(); lanRoutes(app);
  t.after(async () => {
    await app.close(); rmSync(dir, { recursive: true, force: true });
    if (oldToken === undefined) delete process.env.TRANO_MCP_TOKEN; else process.env.TRANO_MCP_TOKEN = oldToken;
    if (oldFile === undefined) delete process.env.TRANO_LAN_RELAYS_FILE; else process.env.TRANO_LAN_RELAYS_FILE = oldFile;
  });
  assert.equal((await app.inject('/api/lan/devices')).statusCode, 401);
  const response = await app.inject({ url: '/api/lan/devices', headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { relays: [] });
  assert.equal((await app.inject({ method: 'POST', url: '/api/lan/relays/missing/devices/tv/commands', headers, payload: { action: 'play' } })).statusCode, 404);
  delete process.env.TRANO_MCP_TOKEN;
  assert.equal((await app.inject({ url: '/api/lan/devices', headers })).statusCode, 503);
});

test('malformed local configuration never prints a secret snippet', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'trano-lan-config-'));
  const file = join(dir, 'bad.json');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(file, '{"token":"sensitive-value-that-must-not-appear" broken');
  assert.throws(() => loadConfig(file), (e) => !e.message.includes('sensitive-value'));
});
test('Trano strips undeclared secret fields from relay inventories', async (t) => {
  const server = createServer((_req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ controlEnabled: false, devices: [{ ...snapshot, remoteCode: 'private-code', token: TOKEN }] }));
  });
  const url = await listen(t, server);
  const result = await listLocalDevices([{ id: 'apartment', name: 'Appartement', url, token: TOKEN }]);
  assert.equal(result.relays[0].online, true);
  assert.equal(JSON.stringify(result).includes('private-code'), false);
  assert.equal(JSON.stringify(result).includes(TOKEN), false);
});
test('MCP declares the local tools and runs an HA-free read and a refused command', async (t) => {
  process.env.TRANO_DB_PATH = ':memory:';
  const { default: Fastify } = await import('fastify');
  const { mcpRoutes } = await import('../../../apps/server/src/routes/mcp.ts');
  const oldFile = process.env.TRANO_LAN_RELAYS_FILE;
  const oldToken = process.env.TRANO_MCP_TOKEN;
  delete process.env.TRANO_LAN_RELAYS_FILE;
  process.env.TRANO_MCP_TOKEN = TOKEN;
  const app = Fastify(); mcpRoutes(app);
  t.after(async () => {
    await app.close();
    if (oldFile === undefined) delete process.env.TRANO_LAN_RELAYS_FILE; else process.env.TRANO_LAN_RELAYS_FILE = oldFile;
    if (oldToken === undefined) delete process.env.TRANO_MCP_TOKEN; else process.env.TRANO_MCP_TOKEN = oldToken;
  });
  const call = async (method, params) => {
    const response = await app.inject({ method: 'POST', url: '/api/mcp', headers: { ...headers, Accept: 'application/json, text/event-stream' },
      payload: { jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) } });
    assert.equal(response.statusCode, 200);
    return response.headers['content-type'].includes('text/event-stream')
      ? JSON.parse(response.body.split('\n').find((line) => line.startsWith('data: ')).slice(6))
      : response.json();
  };
  const tools = (await call('tools/list')).result.tools;
  assert.equal(tools.find((t) => t.name === 'lister_appareils_locaux').annotations.readOnlyHint, true);
  assert.equal(tools.find((t) => t.name === 'controler_media_local').annotations.readOnlyHint, false);
  const result = await call('tools/call', { name: 'lister_appareils_locaux', arguments: {} });
  assert.deepEqual(JSON.parse(result.result.content[0].text), { relays: [] });
  const refused = await call('tools/call', { name: 'controler_media_local', arguments: { relais: 'missing', appareil: 'tv', action: 'play' } });
  assert.match(refused.result.content[0].text, /Relais non configuré/);
  assert.equal(refused.result.isError, true);
});
