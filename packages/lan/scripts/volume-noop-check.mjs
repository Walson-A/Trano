/** A single idempotent Samsung write; never changes the saved control gate. */
import { loadConfig } from '../src/config.ts';
import { readDevice, commandDevice } from '../src/devices.ts';

const [file, id] = process.argv.slice(2);
if (!file || !id) throw new Error('Usage: node volume-noop-check.mjs <config> <id TV>');
const config = loadConfig(file);
const tv = config.devices.find((d) => d.id === id && d.kind === 'samsung');
if (!tv?.mac) throw new Error('Une télévision Samsung avec MAC épinglée est requise.');
if (tv.samsungControl === 'remote') throw new Error('Ce diagnostic est réservé au mode UPnP ; aucun appel effectué en mode télécommande.');
const before = await readDevice(tv);
if (!before.reachable || before.error || before.state.volume !== 0 || before.state.muted !== false) {
  throw new Error('Essai non effectué : il exige un volume déjà à zéro et une sourdine déjà désactivée.');
}
let error = null;
try { await commandDevice(tv, { action: 'volume_set', volume: 0 }); }
catch (caught) { error = caught instanceof Error ? caught.message : 'Écriture refusée.'; }
const after = await readDevice(tv);
if (!after.reachable || after.error || after.state.volume !== 0 || after.state.muted !== false) throw new Error('Le contrôle après écriture ne confirme pas le même état ; aucune autre commande envoyée.');
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(), deviceId: tv.id, model: after.model,
  action: 'volume_set', requestedVolume: 0,
  before: { volume: before.state.volume, muted: before.state.muted },
  after: { volume: after.state.volume, muted: after.state.muted },
  savedControlEnabled: config.allowControl,
  successfulIdempotentWrite: error === null,
  error,
}, null, 2));
if (error) process.exitCode = 1;
