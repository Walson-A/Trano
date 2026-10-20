/** Explicit SDK launch. Reads credentials from a private file, never from command arguments. */
import { loadGatewayConfig } from '../src/gateway.ts';
import { request } from '../src/devices.ts';

const [file, deviceId, launch] = process.argv.slice(2);
if (!file || !deviceId || launch !== '--launch') throw new Error('Usage: node launch-devialet-agent.mjs <gateway.json privé> <id Player> --launch (peut interrompre le Player).');
const config = loadGatewayConfig(file);
const player = config.devices.find((d) => d.id === deviceId && d.kind === 'freebox-player');
if (!player) throw new Error('Player explicitement configuré requis.');
const info = JSON.parse(await request(`http://${player.host}:${player.spotifyPort}/zc?action=getInfo&version=2.10.0`));
if (info?.status !== 101 || info.brandDisplayName !== 'Freebox') throw new Error('Identité du Player non vérifiée ; aucun lancement effectué.');
let result;
try {
  result = JSON.parse(await request(`http://${player.host}/pub/devel`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'trano-agent', method: 'debug_qml_app',
      params: { manifest_url: config.publicBaseUrl + '/bootstrap/' + config.bootstrapToken + '/manifest.json', entry_point: 'main', wait: false } }),
  }));
} catch { throw new Error('Lancement non confirmé ; consulter la passerelle sans afficher son URL secrète.'); }
if (!result?.result || result.error) throw new Error('Le Player n’a pas confirmé le lancement.');
console.log('Lancement accepté par le SDK. Vérifier ensuite la réception des observations par la passerelle ; aucun démarrage après reboot n’est configuré.');
