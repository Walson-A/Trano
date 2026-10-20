/** Read-only proof from the existing Trano server to this PC over Tailscale. */
import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { loadConfig } from '../src/config.ts';
import { createRelayServer } from '../src/server.ts';

const [file, sshTarget, bindAddress] = process.argv.slice(2);
if (!file || !sshTarget || !bindAddress) throw new Error('Usage: node remote-check.mjs <config> <user@serveur> <IPv4 Tailscale locale>');
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.@:-]+$/.test(sshTarget)) throw new Error('Cible SSH invalide.');
const config = loadConfig(file);
if (config.allowControl) throw new Error('La vérification distante exige allowControl=false.');
if (!Object.values(networkInterfaces()).flat().some((i) => i?.address === bindAddress && !i.internal)) throw new Error('Adresse absente des interfaces du PC.');
const relay = createRelayServer({ ...config, listenHost: bindAddress });
try {
  await new Promise((resolve, reject) => { relay.once('error', reject); relay.listen(0, bindAddress, resolve); });
  const settings = Buffer.from(JSON.stringify({ url: 'http://' + bindAddress + ':' + relay.address().port, token: config.token })).toString('base64');
  const python = [
    'import urllib.request, json, base64',
    's=json.loads(base64.b64decode("' + settings + '"))',
    'req=urllib.request.Request(s["url"]+"/v1/devices",headers={"Authorization":"Bearer "+s["token"]})',
    'try:',
    '  with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req,timeout=8) as r: data=json.loads(r.read(262144))',
    '  print(json.dumps({"remoteRead":True,"controlEnabled":data["controlEnabled"],"devices":[{"id":d["id"],"model":d["model"],"reachable":d["reachable"]} for d in data["devices"]]}))',
    'except Exception as e:',
    '  print(json.dumps({"remoteRead":False,"error":str(e)}))',
    '  raise SystemExit(1)',
  ].join('\n');
  const child = spawn('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=yes', sshTarget, 'python3', '-'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (b) => { stdout += b.toString(); });
  child.stderr.on('data', (b) => { stderr += b.toString(); });
  const timer = setTimeout(() => child.kill(), 20_000);
  child.stdin.end(python);
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); }).finally(() => clearTimeout(timer));
  if (stdout.trim()) console.log(stdout.trim());
  if (code !== 0) { if (stderr.trim()) console.error(stderr.trim()); process.exitCode = 1; }
} finally {
  relay.closeAllConnections();
  await new Promise((resolve) => relay.close(resolve));
}
