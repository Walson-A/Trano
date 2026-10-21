import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:https';
import { X509Certificate } from 'node:crypto';
import { createRequire } from 'node:module';
import { samsungRemote } from '../src/samsung-remote.ts';
import { readDevice } from '../src/devices.ts';

const { WebSocketServer } = createRequire(import.meta.url)('ws');
const key = readFileSync(new URL('./fixtures/tls-key.pem', import.meta.url));
const cert = readFileSync(new URL('./fixtures/tls-cert.pem', import.meta.url));
const fingerprint = new X509Certificate(cert).fingerprint256;
const TOKEN = 'fixture-pairing-token';

async function television(t, { authorized = true, invalidMessages = [] } = {}) {
  const server = createServer({ key, cert });
  const wss = new WebSocketServer({ server });
  const requests = [];
  const commands = [];
  wss.on('connection', (socket, req) => {
    requests.push(new URL(req.url, 'https://fixture.invalid'));
    for (const message of invalidMessages) socket.send(message);
    socket.send(JSON.stringify(authorized
      ? { event: 'ms.channel.connect', data: { token: TOKEN } }
      : { event: 'ms.channel.unauthorized' }));
    socket.on('message', (message) => commands.push(JSON.parse(message.toString())));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const socket of wss.clients) socket.terminate();
    wss.close(); server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  return { device: { id: 'tv', name: 'Fixture', kind: 'samsung', host: '127.0.0.1', samsungPort: server.address().port },
    requests, commands };
}
test('explicit Samsung pairing receives a token and certificate without sending any key', async (t) => {
  const fixture = await television(t);
  const result = await samsungRemote(fixture.device, undefined, { pairing: true, timeoutMs: 2000 });
  assert.equal(result.token, TOKEN);
  assert.equal(result.fingerprint256, fingerprint);
  assert.equal(fixture.requests[0].searchParams.has('token'), false);
  assert.equal(Buffer.from(fixture.requests[0].searchParams.get('name'), 'base64').toString(), 'Trano');
  assert.deepEqual(fixture.commands, []);
});

test('Samsung ignores malformed and non-object messages before a valid authorization event', async (t) => {
  const fixture = await television(t, { invalidMessages: ['not-json', 'null', 'true', '12', '[]'] });
  const result = await samsungRemote(fixture.device, undefined, { pairing: true, timeoutMs: 2000 });
  assert.equal(result.token, TOKEN);
  assert.deepEqual(fixture.commands, []);
});
test('paired Samsung remote sends one fixed key after authenticating with the pinned certificate', async (t) => {
  const fixture = await television(t);
  await samsungRemote({ ...fixture.device, samsungToken: TOKEN, samsungFingerprint256: fingerprint },
    'volume_down', { timeoutMs: 2000 });
  assert.equal(fixture.requests[0].searchParams.get('token'), TOKEN);
  assert.equal(fixture.commands.length, 1);
  assert.deepEqual(fixture.commands[0], { method: 'ms.remote.control', params: {
    Cmd: 'Click', DataOfCmd: 'KEY_VOLDOWN', Option: 'false', TypeOfRemote: 'SendRemoteKey',
  } });
});
test('a changed TLS certificate is rejected before the HTTP upgrade can leak the Samsung token', async (t) => {
  const fixture = await television(t);
  await assert.rejects(samsungRemote({ ...fixture.device, samsungToken: TOKEN, samsungFingerprint256: '00:'.repeat(31) + '00' },
    'volume_up', { timeoutMs: 2000 }), /certificat|refusée/);
  assert.equal(fixture.requests.length, 0);
  assert.deepEqual(fixture.commands, []);
});
test('Samsung pairing denial never sends a command and does not silently retry', async (t) => {
  const fixture = await television(t, { authorized: false });
  await assert.rejects(samsungRemote(fixture.device, undefined, { pairing: true, timeoutMs: 2000 }), /Autorisation/);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.commands.length, 0);
});
test('unpaired Samsung control and arbitrary keys are refused before connecting', async () => {
  const device = { id: 'tv', name: 'Fixture', kind: 'samsung', host: '127.0.0.1', samsungPort: 1 };
  await assert.rejects(samsungRemote(device, 'volume_up'), /Appairage/);
  await assert.rejects(samsungRemote({ ...device, samsungToken: TOKEN, samsungFingerprint256: fingerprint }, 'factory_reset'), /Appairage/);
});
test('Samsung remote mode does not advertise working controls until pairing is configured', async () => {
  const fetcher = async (url, init) => {
    if (url.includes('/api/v2/')) return Response.json({ device: { type: 'Samsung SmartTV', modelName: 'FixtureTV' } });
    if (url.endsWith('.xml')) return new Response('<scpd><action><name>SetVolume</name></action></scpd>');
    return new Response('');
  };
  const result = await readDevice({ id: 'tv', name: 'Fixture', kind: 'samsung', host: '192.168.50.10', samsungControl: 'remote' }, fetcher);
  assert.equal(result.reachable, true);
  assert.equal(result.setupRequired, 'samsung_pairing');
  assert.deepEqual(result.capabilities, []);
});

test('Samsung remote read survives an unavailable UPnP renderer without inventing state', async () => {
  const result = await readDevice({
    id: 'tv', name: 'Fixture', kind: 'samsung', host: '192.168.50.10', samsungControl: 'remote',
    samsungToken: TOKEN, samsungFingerprint256: fingerprint,
  }, async (url) => {
    if (url.includes('/api/v2/')) return Response.json({ device: { type: 'Samsung SmartTV', modelName: 'FixtureTV' } });
    return new Response('', { status: 503 });
  });
  assert.equal(result.reachable, true);
  assert.equal(result.error, null);
  assert.equal(result.state.volume, null);
  assert.ok(result.capabilities.includes('volume_down'));
  assert.equal(result.capabilities.includes('volume_set'), false);
  assert.deepEqual(result.transports, ['samsung_remote']);
});

test('an authenticated pairing probe reuses the pinned token without sending any key', async (t) => {
  const fixture = await television(t);
  const result = await samsungRemote({ ...fixture.device, samsungToken: TOKEN, samsungFingerprint256: fingerprint },
    undefined, { authenticationOnly: true, timeoutMs: 2000 });
  assert.equal(result.token, TOKEN);
  assert.equal(fixture.requests[0].searchParams.get('token'), TOKEN);
  assert.deepEqual(fixture.commands, []);
});
test('an authentication-only probe rejects a key or pairing flag before any connection', async () => {
  const device = { id: 'tv', name: 'Fixture', kind: 'samsung', host: '127.0.0.1', samsungPort: 1 };
  await assert.rejects(samsungRemote(device, 'mute_toggle', { authenticationOnly: true }), /sans commande/);
  await assert.rejects(samsungRemote(device, undefined, { authenticationOnly: true, pairing: true }), /sans commande/);
});
