import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { parseGatewayConfig, createAgentGateway } from '../src/gateway.ts';
import { listLocalDevices } from '../../../apps/server/src/lib/lan.ts';

const WebSocket = createRequire(import.meta.url)('ws');
const TV = { id: 'tv', name: 'Télévision', kind: 'samsung', host: '192.168.50.10', mac: 'aa:bb:cc:dd:ee:ff' };
const INPUT = { readerToken: 'a'.repeat(64), agentToken: 'b'.repeat(64), bootstrapToken: 'c'.repeat(64),
  publicBaseUrl: 'https://gateway.example.invalid:8443', devices: [TV] };
const ROW = { id: 'tv', reachable: true, mac: TV.mac, model: 'Fixture TV', volume: 0, muted: false };
const auth = { Authorization: 'Bearer ' + INPUT.readerToken };
async function start(t, now) {
  const gateway = createAgentGateway(INPUT, { now });
  t.after(() => gateway.close());
  await new Promise((resolve) => gateway.reader.listen(0, '127.0.0.1', resolve));
  await new Promise((resolve) => gateway.agent.listen(0, '127.0.0.1', resolve));
  return { ...gateway, read: 'http://127.0.0.1:' + gateway.reader.address().port,
    public: 'http://127.0.0.1:' + gateway.agent.address().port };
}
async function connect(base) {
  const ws = new WebSocket(base.replace('http', 'ws') + '/agent');
  await once(ws, 'open');
  return ws;
}
async function send(ws, data) {
  const message = once(ws, 'message'); ws.send(JSON.stringify(data));
  return JSON.parse((await message)[0].toString());
}
async function authenticate(base) {
  const ws = await connect(base);
  assert.deepEqual(await send(ws, { type: 'hello', token: INPUT.agentToken }), { type: 'ready' });
  return ws;
}

test('gateway requires distinct credentials, HTTPS, pinned identities and local listeners', () => {
  assert.equal(parseGatewayConfig(INPUT).readerHost, '127.0.0.1');
  for (const changes of [ { agentToken: INPUT.readerToken }, { readerToken: 'weak' },
    { publicBaseUrl: 'http://example.com' }, { publicBaseUrl: 'https://x.invalid/path' },
    { agentHost: '0.0.0.0' }, { readerHost: '8.8.8.8' }, { devices: [{ ...TV, mac: undefined }] },
    { devices: [{ id: 'p', name: 'Player', kind: 'freebox-player', host: '192.168.50.11' }] } ]) {
    assert.throws(() => parseGatewayConfig({ ...INPUT, ...changes }));
  }
});

test('public listener exposes neither inventory nor reader credential; bootstrap is private', async (t) => {
  const g = await start(t);
  assert.equal((await fetch(g.public + '/v1/devices', { headers: auth })).status, 404);
  assert.equal((await fetch(g.public + '/bootstrap/' + 'd'.repeat(64) + '/agent.qml')).status, 404);
  const response = await fetch(g.public + '/bootstrap/' + INPUT.bootstrapToken + '/agent.qml');
  const qml = await response.text();
  assert.equal(response.status, 200);
  assert.ok(qml.includes(INPUT.agentToken));
  assert.ok(!qml.includes(INPUT.readerToken));
  assert.ok(!qml.includes('__TRANO_AGENT_CONFIG__'));
  const component = await fetch(g.public + '/bootstrap/' + INPUT.bootstrapToken + '/RelayAgent.qml');
  assert.equal(component.status, 200);
  const componentSource = await component.text();
  assert.ok(!componentSource.includes(INPUT.agentToken));
  assert.ok(!componentSource.includes(INPUT.readerToken));
  assert.equal((await fetch(g.public + '/bootstrap/' + 'd'.repeat(64) + '/RelayAgent.qml')).status, 404);
  const directory = await fetch(g.public + '/bootstrap/' + INPUT.bootstrapToken + '/qmldir');
  assert.equal(directory.status, 200);
  assert.equal((await directory.text()).trim(), 'RelayAgent RelayAgent.qml');
  assert.equal((await fetch(g.public + '/bootstrap/' + 'd'.repeat(64) + '/qmldir')).status, 404);
  assert.equal((await fetch(g.read + '/v1/devices')).status, 401);
  assert.equal((await fetch(g.read + '/v1/devices', { headers: auth })).status, 503);
});

test('authenticated agent feeds the real Trano adapter and never authorizes a media action', async (t) => {
  const g = await start(t);
  const ws = await authenticate(g.public);
  assert.deepEqual(await send(ws, { type: 'inventory', sequence: 1, devices: [{ ...ROW, token: 'must-not-leak', capabilities: ['power_toggle'] }] }), { type: 'accepted', sequence: 1 });
  const result = await listLocalDevices([{ id: 'apartment', name: 'Appartement', url: g.read, token: INPUT.readerToken }]);
  const relay = result.relays[0];
  assert.equal(relay.online, true); assert.equal(relay.controlEnabled, false);
  assert.equal(relay.devices[0].state.volume, 0); assert.equal(relay.devices[0].state.muted, false);
  assert.deepEqual(relay.devices[0].capabilities, []);
  assert.ok(!JSON.stringify(result).includes('must-not-leak'));
  assert.equal((await fetch(g.read + '/v1/devices/tv/commands', { method: 'POST', headers: auth, body: '{}' })).status, 403);
  const closed = once(ws, 'close'); ws.close(); await closed;
  let status = 200;
  for (let i = 0; i < 20 && status === 200; i++) {
    status = (await fetch(g.read + '/v1/devices', { headers: auth })).status;
    if (status === 200) await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(status, 503);
});

test('alive socket does not keep stale observations online', async (t) => {
  let time = 0;
  const g = await start(t, () => time);
  const ws = await authenticate(g.public);
  await send(ws, { type: 'inventory', sequence: 1, devices: [ROW] });
  time = 20001;
  assert.equal((await fetch(g.read + '/v1/devices', { headers: auth })).status, 503);
});

test('wrong token, MAC change and replayed sequence terminate the agent', async (t) => {
  const g = await start(t);
  const bad = await connect(g.public); let closed = once(bad, 'close');
  bad.send(JSON.stringify({ type: 'hello', token: INPUT.readerToken }));
  assert.equal((await closed)[0], 1008);
  const changed = await authenticate(g.public); closed = once(changed, 'close');
  changed.send(JSON.stringify({ type: 'inventory', sequence: 1, devices: [{ ...ROW, mac: '00:00:00:00:00:00' }] }));
  assert.equal((await closed)[0], 1008);
  const ws = await authenticate(g.public);
  await send(ws, { type: 'inventory', sequence: 1, devices: [ROW] });
  closed = once(ws, 'close'); ws.send(JSON.stringify({ type: 'inventory', sequence: 1, devices: [ROW] }));
  assert.equal((await closed)[0], 1008);
});

test('an authenticated reconnect replaces a half-open stale agent without reusing its inventory', async (t) => {
  let time = 0;
  const g = await start(t, () => time);
  const first = await authenticate(g.public);
  await send(first, { type: 'inventory', sequence: 1, devices: [ROW] });
  const firstClosed = once(first, 'close');
  time = 20001;
  const replacement = await authenticate(g.public);
  await firstClosed;
  assert.equal((await fetch(g.read + '/v1/devices', { headers: auth })).status, 503);
  await send(replacement, { type: 'inventory', sequence: 1, devices: [{ ...ROW, volume: 17 }] });
  const result = await (await fetch(g.read + '/v1/devices', { headers: auth })).json();
  assert.equal(result.devices[0].state.volume, 17);
});

test('a second agent cannot evict a still-fresh authenticated connection', async (t) => {
  const g = await start(t);
  const first = await authenticate(g.public);
  await send(first, { type: 'inventory', sequence: 1, devices: [ROW] });
  const contender = await connect(g.public);
  const closed = once(contender, 'close');
  contender.send(JSON.stringify({ type: 'hello', token: INPUT.agentToken }));
  assert.equal((await closed)[0], 1008);
  await send(first, { type: 'inventory', sequence: 2, devices: [ROW] });
  assert.equal((await fetch(g.read + '/v1/devices', { headers: auth })).status, 200);
});
