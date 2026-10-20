/** Explicit temporary QML agent -> gateway -> Trano read-only proof on the user's LAN. */
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { loadConfig } from '../src/config.ts';
import { createAgentGateway } from '../src/gateway.ts';
import { listLocalDevices } from '../../../apps/server/src/lib/lan.ts';

const [file, bind, launch] = process.argv.slice(2);
if (!file || !bind || launch !== '--launch') throw new Error('Usage: node devialet-agent-check.mjs <relay.json> <IPv4 locale> --launch (peut interrompre le Player).');
if (!Object.values(networkInterfaces()).flat().some((i) => i?.address === bind && !i.internal)) throw new Error('Interface locale requise.');
const source = loadConfig(file);
if (source.allowControl) throw new Error('La preuve exige une configuration en lecture seule.');
const player = source.devices.find((d) => d.kind === 'freebox-player');
if (!player) throw new Error('Player configuré requis.');
const token = () => randomBytes(32).toString('hex');
const config = { readerToken: token(), agentToken: token(), bootstrapToken: token(),
  publicBaseUrl: `http://${bind}:3014`, agentHost: bind, agentPort: 3014,
  readerHost: '127.0.0.1', readerPort: 3015, devices: source.devices };
const gateway = createAgentGateway(config, { allowHttpForTest: true, agentLifetimeMs: 20000 });
try {
  await new Promise((resolve, reject) => { gateway.agent.once('error', reject); gateway.agent.listen(3014, bind, resolve); });
  await new Promise((resolve, reject) => { gateway.reader.once('error', reject); gateway.reader.listen(0, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${gateway.reader.address().port}`;
  const response = await fetch(`http://${player.host}/pub/devel`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'trano-agent-check', method: 'debug_qml_app',
      params: { manifest_url: `${config.publicBaseUrl}/bootstrap/${config.bootstrapToken}/manifest.json`, entry_point: 'main', wait: false } }) });
  if (!response.ok || !(await response.json()).result) throw new Error('Lancement du diagnostic non confirmé par le Player.');
  const target = [{ id: 'apartment', name: 'Appartement', url, token: config.readerToken }];
  let proved = false;
  let disconnected = false;
  const until = performance.now() + 26000;
  while (performance.now() < until) {
    const result = await listLocalDevices(target);
    const relay = result.relays[0];
    if (relay.online && !proved) {
      if (relay.controlEnabled || relay.devices.some((d) => d.capabilities.length)) throw new Error('Commandes indûment activées.');
      if (!relay.devices.every((d) => d.reachable)) throw new Error('Identité d’au moins un appareil non vérifiée par le Player.');
      proved = true;
      console.log(JSON.stringify({ devialetAgentToTrano: true, transport: 'WebSocket LAN temporaire, sans TLS', controlEnabled: false,
        devices: relay.devices.map((d) => ({ id: d.id, model: d.model, reachable: d.reachable, state: d.state })) }));
    }
    if (proved && !relay.online) { disconnected = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!proved) throw new Error('Aucun inventaire QML complet reçu.');
  if (!disconnected) throw new Error('Arrêt automatique de l’agent non observé.');
  console.log(JSON.stringify({ timedAgentExitObserved: true, staleStateHidden: true }));
} finally {
  await gateway.close();
  console.log(JSON.stringify({ temporaryGatewayClosed: true }));
}
