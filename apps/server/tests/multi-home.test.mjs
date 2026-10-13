import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import Fastify from 'fastify';

const dir = mkdtempSync(join(tmpdir(), 'trano-multi-home-'));
process.env.TRANO_DB_PATH = join(dir, 'test.db');
process.env.TRANO_HOMES_FILE = join(dir, 'homes.json');
const homes = [
  { id: 'main', name: 'Maison familiale', provider: 'ha', haUrl: 'https://ha.test', haToken: 'main-token' },
  { id: 'apartment', name: 'Appartement', provider: 'tuya', tuya: { region: 'eu', clientId: 'test-client', secret: 'test-secret', uid: 'test-user', deviceIds: ['aptlamp'] } },
  { id: 'other', name: 'Autre HA', provider: 'ha', haUrl: 'https://other.test', haToken: 'other-token', entityIds: ['light.shared'] },
  { id: 'shared', name: 'Appartement HA commun', provider: 'ha', haSource: 'main' },
];
writeFileSync(process.env.TRANO_HOMES_FILE, JSON.stringify(homes));
const { db } = await import('../src/db.ts');
const { homeScope, homeRoutes } = await import('../src/routes/homes.ts');
const { shoppingRoutes } = await import('../src/routes/shopping.ts');
const { houseRoutes } = await import('../src/routes/house.ts');
const { runTool } = await import('../src/lib/tools.ts');
const { mapTuyaDevice } = await import('../src/lib/tuya.ts');

const commands = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url);
  if (u.hostname.endsWith('.test')) {
    const expected = u.hostname === 'ha.test' ? 'main-token' : 'other-token';
    assert.equal(init.headers.Authorization, `Bearer ${expected}`);
    if (u.pathname === '/api/template') return new Response(JSON.stringify({ appareils: [{ entity_id: 'light.shared', nom: expected, etat: 'on', piece: 'Salon', attributs: { supported_color_modes: ['brightness'], brightness: 128 } }], scenes: [] }));
    if (u.pathname === '/api/states') return Response.json([]);
    commands.push({ home: u.hostname, payload: JSON.parse(init.body) });
    return Response.json([]);
  }
  assert.equal(u.hostname, 'openapi.tuyaeu.com');
  assert.match(init.headers.sign, /^[A-F0-9]{64}$/);
  if (u.pathname === '/v1.0/token') return Response.json({ success: true, result: { access_token: 'cloud-token', expire_time: 3600 } });
  assert.equal(init.headers.access_token, 'cloud-token');
  if (u.pathname.endsWith('/functions')) return Response.json({ success: true, result: { functions: [
    { code: 'switch_led', type: 'Boolean', values: '{}' }, { code: 'bright_value_v2', type: 'Integer', values: '{"min":10,"max":1000}' },
  ] } });
  if (u.pathname.endsWith('/commands')) { commands.push({ home: 'tuya', payload: JSON.parse(init.body) }); return Response.json({ success: true, result: true }); }
  return Response.json({ success: true, result: [
    { id: 'aptlamp', name: 'Lampe appart', online: true, status: [{ code: 'switch_led', value: true }, { code: 'bright_value_v2', value: 500 }] },
    { id: 'parentslamp', name: 'Autre logement', online: true, status: [] },
  ] });
};
const app = Fastify();
homeRoutes(app);
app.register(async scoped => { homeScope(scoped); shoppingRoutes(scoped); houseRoutes(scoped); });
await app.ready();
const request = async (method, url, payload) => app.inject({ method, url, payload });
const create = async (home, title) => (await request('POST', `/api/shopping?home_id=${home}`, { title })).json();

test('logements publics sans secrets et logement inconnu refusé', async () => {
  const result = await request('GET', '/api/homes');
  assert.equal(result.statusCode, 200);
  assert.equal(result.json().length, 4);
  assert.doesNotMatch(result.body, /test-secret|main-token|clientId|haUrl/);
  assert.equal((await request('GET', '/api/shopping?home_id=unknown')).statusCode, 400);
});
test('courses isolées, écriture croisée refusée, envoi choisi atomique et idempotent', async () => {
  const main = await create('main', 'Pain');
  const apt = await create('apartment', 'Lait');
  assert.deepEqual((await request('GET', '/api/shopping')).json().map(i => i.title), ['Pain']);
  assert.deepEqual((await request('GET', '/api/shopping?home_id=apartment')).json().map(i => i.title), ['Lait']);
  assert.equal((await request('DELETE', `/api/shopping/${main.id}?home_id=apartment`)).statusCode, 404);
  assert.equal((await request('PATCH', `/api/shopping/${main.id}?home_id=apartment`, { status: 'bought' })).statusCode, 404);
  const invalid = await request('POST', '/api/shopping/send?home_id=apartment', { targetHomeId: 'main', itemIds: [apt.id, main.id] });
  assert.equal(invalid.statusCode, 404);
  assert.equal((await request('GET', '/api/shopping')).json().length, 1);
  const payload = { targetHomeId: 'main', itemIds: [apt.id] };
  assert.deepEqual((await request('POST', '/api/shopping/send?home_id=apartment', payload)).json(), { added: 1, alreadySent: 0 });
  assert.deepEqual((await request('POST', '/api/shopping/send?home_id=apartment', payload)).json(), { added: 0, alreadySent: 1 });
  assert.equal((await request('GET', '/api/shopping?home_id=apartment')).json()[0].id, apt.id);
});
test('contextes HA concurrents isolés malgré les mêmes entity_id', async () => {
  const responses = await Promise.all(['main', 'other'].map(home => request('GET', `/api/house?home_id=${home}`)));
  assert.deepEqual(responses.map(res => res.json().appareils[0].nom), ['main-token', 'other-token']);
  await request('POST', '/api/house/device?home_id=other', { entity_id: 'light.shared', action: 'turn_off' });
  assert.equal(commands.at(-1).home, 'other.test');
});
test('Tuya affectation explicite, commande et variations sans repli HA', async () => {
  const state = (await request('GET', '/api/house?home_id=apartment')).json();
  assert.deepEqual(state.appareils.map(d => d.entity_id), ['light.tuya_aptlamp']);
  assert.equal(state.appareils[0].lumiere.luminosite_pct, 50);
  assert.equal((await request('POST', '/api/house/device?home_id=apartment', { entity_id: 'light.shared' })).statusCode, 404);
  assert.equal((await request('POST', '/api/house/light?home_id=apartment', { entity_id: 'light.tuya_aptlamp', brightness_pct: 75 })).statusCode, 200);
  assert.deepEqual(commands.at(-1).payload.commands, [{ code: 'switch_led', value: true }, { code: 'bright_value_v2', value: 750 }]);
  assert.equal((await request('POST', '/api/house/light?home_id=apartment', { entity_id: 'light.tuya_aptlamp', brightness_pct: 101 })).statusCode, 400);
  const before = commands.length;
  assert.match(await runTool('controler_appareil', { home_id: 'unknown', entity_id: 'light.shared', action: 'turn_off' }, { profile: null }), /Erreur/);
  assert.equal(commands.length, before);
  assert.match(await runTool('lister_appareils', { home_id: 'apartment' }, { profile: null }), /aptlamp/);
});
test('appareils Tuya hors ligne et fonctions inconnues restent honnêtes', () => {
  const mapped = mapTuyaDevice({ id: 'offline', name: 'Éteinte', online: false, status: [] }, [{ code: 'switch_led', type: 'Boolean', values: '{}' }]);
  assert.equal(mapped.etat, 'unavailable');
  assert.equal(mapped.lumiere.reglable, false);
  assert.equal(mapTuyaDevice({ id: 'lock', name: 'Serrure', online: true, status: [] }, []), null);
});
test('HA commun : affectation puis exclusion de main et refus des commandes croisées', async () => {
  db.prepare('INSERT INTO profiles (id, name, favorites) VALUES (?, ?, ?)').run('moving-profile', 'Profil du banc', '["light.shared"]');
  assert.equal((await request('GET', '/api/house?home_id=shared')).json().appareils.length, 0);
  assert.equal((await request('PUT', '/api/homes/shared/devices', { entityIds: ['light.missing'] })).statusCode, 400);
  assert.equal((await request('PUT', '/api/homes/shared/devices', { entityIds: ['light.shared'] })).statusCode, 200);
  assert.equal((await request('GET', '/api/house?home_id=shared&profile=moving-profile')).json().favoris[0].entity_id, 'light.shared');
  assert.equal((await request('PUT', '/api/homes/shared/favorites', { profileId: 'moving-profile', favorites: [] })).statusCode, 200);
  assert.equal((await request('PUT', '/api/homes/shared/devices', { entityIds: ['light.shared'] })).statusCode, 200);
  assert.deepEqual((await request('GET', '/api/house?home_id=shared&profile=moving-profile')).json().favoris, []);
  assert.equal((await request('GET', '/api/house?home_id=main')).json().appareils.length, 0);
  assert.equal((await request('GET', '/api/house?home_id=shared')).json().appareils[0].nom, 'main-token');
  assert.equal((await request('POST', '/api/house/device?home_id=main', { entity_id: 'light.shared', action: 'turn_off' })).statusCode, 404);
  const before = commands.length;
  assert.match(await runTool('regler_lumiere', { home_id: 'main', entity_id: 'light.shared', luminosite: 50 }, { profile: null }), /Refusé/);
  assert.equal(commands.length, before);
  assert.equal((await request('POST', '/api/house/device?home_id=shared', { entity_id: 'light.shared', action: 'turn_off' })).statusCode, 200);
});
test.after(async () => {
  await app.close(); db.close(); globalThis.fetch = realFetch;
  const rel = relative(resolve(tmpdir()), resolve(dir));
  assert.ok(!rel.startsWith('..') && rel.startsWith('trano-multi-home-'));
  rmSync(dir, { recursive: true, force: true });
});
