/** Explicit physical check: one mute toggle, then restore only an observed changed state. */
import { loadConfig } from '../src/config.ts';
import { readDevice, commandDevice } from '../src/devices.ts';

const [file, id, execute] = process.argv.slice(2);
if (!file || !id || execute !== '--execute') throw new Error('Usage: samsung-mute-check.mjs <private config> <TV id> --execute');
const config = loadConfig(file);
const tv = config.devices.find((d) => d.id === id && d.kind === 'samsung');
if (!tv?.mac || tv.samsungControl !== 'remote' || !tv.samsungToken || !tv.samsungFingerprint256) {
  throw new Error('Télévision Samsung appairée avec MAC et certificat épinglés requise.');
}
const before = await readDevice(tv);
if (!before.reachable || before.error || typeof before.state.muted !== 'boolean') {
  throw new Error('État initial de sourdine non vérifié : aucune commande envoyée.');
}
let commandsSent = 0;
let changed = false;
let restored = false;
let commandTransmitted = false;
let restoreTransmitted = false;
let commandError = null;
let restoreError = null;
let after = null;
const delay = () => new Promise((resolve) => setTimeout(resolve, 500));
async function observe(wanted) {
  for (let i = 0; i < 8; i++) {
    const state = await readDevice(tv);
    if (state.reachable && !state.error && state.state.muted === wanted) return state;
    await delay();
  }
  return null;
}
try {
  commandsSent++;
  try { await commandDevice(tv, { action: 'mute_toggle' }); commandTransmitted = true; } catch (error) { commandError = error.message; }
  changed = Boolean(await observe(!before.state.muted));
} finally {
  const current = await readDevice(tv);
  if (current.reachable && !current.error && typeof current.state.muted === 'boolean') {
    if (current.state.muted !== before.state.muted) {
      commandsSent++;
      try { await commandDevice(tv, { action: 'mute_toggle' }); restoreTransmitted = true; } catch (error) { restoreError = error.message; }
    }
    after = await observe(before.state.muted);
    restored = Boolean(after);
  }
  console.log(JSON.stringify({
    deviceId: tv.id, model: before.model, commandsSent, commandTransmitted, restoreTransmitted, commandError, restoreError,
    originalMuted: before.state.muted, muteChangeObservedViaApi: changed,
    apiMuteEqualsOriginal: restored, finalMuted: after?.state.muted ?? null,
    savedControlEnabled: config.allowControl,
  }, null, 2));
  if (!changed || !restored) process.exitCode = 1;
}
