/** Reuse an existing pinned pairing without sending a remote key. */
import { loadConfig } from '../src/config.ts';
import { readDevice } from '../src/devices.ts';
import { samsungRemote } from '../src/samsung-remote.ts';
const [file, id] = process.argv.slice(2);
if (!file || !id) throw new Error('Usage: samsung-auth-check.mjs <private config> <TV id>');
const tv = loadConfig(file).devices.find((d) => d.id === id && d.kind === 'samsung');
if (!tv?.mac) throw new Error('Une TV Samsung avec MAC épinglée est requise.');
const state = await readDevice(tv);
if (!state.reachable || state.error) throw new Error('Identité Samsung non vérifiée ; aucune connexion authentifiée tentée.');
try {
  await samsungRemote(tv, undefined, { authenticationOnly: true });
  console.log(JSON.stringify({ deviceId: tv.id, pairedAuthenticationAccepted: true, keySent: false }));
} catch (error) {
  console.log(JSON.stringify({ deviceId: tv.id, pairedAuthenticationAccepted: false, keySent: false, error: error.message }));
  process.exitCode = 1;
}
