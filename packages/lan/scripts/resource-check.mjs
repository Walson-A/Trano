/** Short, read-only measurement of this relay process, not a long-duration memory guarantee. */
import { loadConfig } from '../src/config.ts';
import { createRelayServer } from '../src/server.ts';

const config = loadConfig(process.argv[2] ?? '');
if (config.allowControl) throw new Error('Le relevé exige la lecture seule.');
const relay = createRelayServer(config);
const memory = () => {
  const { rss, heapUsed, external } = process.memoryUsage();
  return { rssMiB: +(rss / 1048576).toFixed(1), heapUsedMiB: +(heapUsed / 1048576).toFixed(1), externalMiB: +(external / 1048576).toFixed(1) };
};
try {
  await new Promise((resolve, reject) => { relay.once('error', reject); relay.listen(0, '127.0.0.1', resolve); });
  const idle = memory();
  const start = performance.now();
  const cpuStart = process.cpuUsage();
  const url = 'http://127.0.0.1:' + relay.address().port + '/v1/devices';
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + config.token } });
  if (!response.ok) throw new Error('Lecture impossible.');
  const snapshot = await response.json();
  const cpu = process.cpuUsage(cpuStart);
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), nodeVersion: process.version,
    devices: snapshot.devices.length, controlEnabled: snapshot.controlEnabled,
    idle, afterOneInventory: memory(), inventoryWallMs: Math.round(performance.now() - start),
    cpuMs: +((cpu.user + cpu.system) / 1000).toFixed(1),
    scope: 'One short read-only run on this Windows PC; no long-duration or Home Assistant comparison.',
  }, null, 2));
} finally {
  relay.closeAllConnections();
  await new Promise((resolve) => relay.close(resolve));
}
