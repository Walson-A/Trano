import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { loadConfig } from './config.ts';
import { samsungRemote } from './samsung-remote.ts';
import { discover } from './discovery.ts';
import { readDevice, commandDevice } from './devices.ts';
import { createRelayServer } from './server.ts';
import { createAgentGateway, loadGatewayConfig } from './gateway.ts';

export async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  if (command === 'token') { console.log(randomBytes(32).toString('hex')); return; }
  if (command === 'interfaces') {
    console.log(JSON.stringify(Object.entries(networkInterfaces()).flatMap(([name, list]) =>
      (list ?? []).filter((i) => !i.internal && i.family === 'IPv4').map((i) => ({ name, address: i.address, cidr: i.cidr }))), null, 2));
    return;
  }
  if (command === 'gateway') {
    const index = rest.indexOf('--config');
    if (index < 0 || !rest[index + 1]) throw new Error('gateway requiert --config <fichier privé>.');
    const config = loadGatewayConfig(rest[index + 1]);
    const gateway = createAgentGateway(config);
    try {
      await new Promise<void>((resolve, reject) => { gateway.reader.once('error', reject); gateway.reader.listen(config.readerPort, config.readerHost, resolve); });
      await new Promise<void>((resolve, reject) => { gateway.agent.once('error', reject); gateway.agent.listen(config.agentPort, config.agentHost, resolve); });
    } catch {
      await gateway.close(); throw new Error('Impossible de démarrer la passerelle : vérifie les adresses et les ports.');
    }
    console.log('Passerelle QML démarrée, lecture seule. Aucun agent lancé et aucun accès public configuré.');
    const stop = () => { void gateway.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    return;
  }
  if (command === 'discover') {
    const index = rest.indexOf('--interface');
    if (index < 0 || !rest[index + 1]) throw new Error('discover requiert --interface <IPv4 locale>.');
    console.log(JSON.stringify(await discover(rest[index + 1]), null, 2));
    return;
  }
  if (command === 'inspect' || command === 'serve' || command === 'control' || command === 'pair') {
    const index = rest.indexOf('--config');
    const path = index >= 0 ? rest[index + 1] : process.env.TRANO_LAN_CONFIG;
    if (!path) throw new Error('Fichier requis : --config <chemin> ou TRANO_LAN_CONFIG.');
    const config = loadConfig(path);
    if (command === 'pair') {
      const original = readFileSync(path, 'utf8');
      const current = loadConfig(path);
      const index = rest.indexOf('--device');
      const id = index < 0 ? undefined : rest[index + 1];
      const device = current.devices.find((d) => d.id === id && d.kind === 'samsung');
      if (!device?.mac) throw new Error('Appairage : --device <id Samsung> avec MAC épinglée requis.');
      const state = await readDevice(device);
      if (!state.reachable || state.error) throw new Error('Identité Samsung non vérifiée : aucun appairage lancé.');
      console.log('Accepte « Trano » sur la télévision. Aucune touche ne sera envoyée.');
      const credentials = await samsungRemote(device, undefined, { pairing: true });
      if (readFileSync(path, 'utf8') !== original) throw new Error('La configuration a été modifiée pendant l’appairage ; aucune écriture effectuée.');
      device.samsungControl = 'remote';
      device.samsungToken = credentials.token;
      device.samsungFingerprint256 = credentials.fingerprint256;
      const temporary = path + '.pair-' + randomBytes(6).toString('hex') + '.tmp';
      let created = false;
      try {
        writeFileSync(temporary, JSON.stringify(current, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); created = true;
        renameSync(temporary, path); created = false;
      } finally { if (created) unlinkSync(temporary); }
      console.log('Appairage enregistré localement, sans afficher le jeton. Redémarre le relais pour le prendre en compte.');
      return;
    }
    if (command === 'control') {
      if (!config.allowControl) throw new Error('Relais en lecture seule : active allowControl explicitement dans la configuration.');
      const flag = (key: string) => { const i = rest.indexOf(key); return i < 0 ? undefined : rest[i + 1]; };
      const id = flag('--device');
      const device = config.devices.find((d) => d.id === id);
      if (!device) throw new Error('Appareil non configuré : --device <id> requis.');
      const volume = flag('--volume');
      const muted = flag('--muted');
      if (muted !== undefined && muted !== 'true' && muted !== 'false') throw new Error('--muted attend true ou false.');
      await commandDevice(device, {
        action: flag('--action'),
        ...(volume !== undefined ? { volume: Number(volume) } : {}),
        ...(muted !== undefined ? { muted: muted === 'true' } : {}),
      });
      console.log('Commande transmise. Relis l’état avec inspect ; un accusé de réception ne prouve pas un changement de lecture.');
      return;
    }
    if (command === 'inspect') {
      console.log(JSON.stringify({ controlEnabled: config.allowControl, devices: await Promise.all(config.devices.map((d) => readDevice(d))) }, null, 2));
      return;
    }
    const server = createRelayServer(config);
    server.on('error', () => { console.error('Impossible de démarrer le relais : vérifie l’adresse et le port.'); process.exitCode = 1; });
    server.listen(config.port, config.listenHost, () => console.log(`Relais Trano : http://${config.listenHost}:${config.port} — ${config.allowControl ? 'commandes autorisées' : 'lecture seule'}`));
    const stop = () => { server.close(); server.closeAllConnections(); };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    return;
  }
  console.log('Trano LAN — Node 24, relais local et télécommande Samsung\n' +
    '  interfaces                         Afficher les interfaces du PC\n' +
    '  discover --interface <IPv4>         Découverte SSDP/mDNS en lecture seule\n' +
    '  token                              Générer un jeton aléatoire\n' +
    '  gateway --config <fichier>          Passerelle pour agent QML Devialet (lecture seule)\n' +
    '  inspect --config <fichier>          Lire les appareils configurés\n' +
    '  pair --config <fichier> --device <id TV>    Appairer Samsung, validation sur la télévision\n' +
    '  control --config <fichier> --device <id> --action <action> [--volume <0-100>] [--muted true|false]\n' +
    '  serve --config <fichier>            Démarrer le relais authentifié\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { console.error(error instanceof Error ? error.message : 'Erreur relais.'); process.exitCode = 1; });
}
