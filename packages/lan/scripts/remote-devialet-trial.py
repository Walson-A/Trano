"""Prepare, or explicitly execute, a bounded WSS trial via a dedicated Funnel 8443.
The execute flag publishes an Internet listener: obtain the owner's approval first.
No production Trano/Atlas configuration or volume is modified.
"""
import argparse
import io
import ipaddress
import json
import pathlib
import re
import shlex
import subprocess
import tarfile
import urllib.request

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None

REMOTE = r'''
import json, os, pathlib, secrets, shutil, signal, socket, subprocess, sys, tarfile, tempfile, time, urllib.request, uuid
root = pathlib.Path(tempfile.mkdtemp(prefix="trano-devialet-trial-")).resolve()
name = "trano-devialet-trial-" + uuid.uuid4().hex[:12]
funnel_requested = False
before = None
def status():
    return json.loads(subprocess.check_output(["tailscale", "serve", "status", "--json"], text=True, timeout=8))
def run(args, timeout=15):
    return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True)
def interrupted(*_):
    raise RuntimeError("Trial interrupted")
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs): return None
signal.signal(signal.SIGTERM, interrupted)
signal.signal(signal.SIGHUP, interrupted)
try:
    with tarfile.open(fileobj=sys.stdin.buffer, mode="r|gz") as archive:
        size = 0
        for member in archive:
            size += member.size
            destination = (root / member.name).resolve()
            if not member.isfile() or member.size > 1048576 or size > 4194304 or root not in destination.parents:
                raise RuntimeError("Invalid trial archive")
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as source, open(destination, "wb") as output:
                shutil.copyfileobj(source, output)
    setup = json.loads((root / "setup.json").read_text())
    before = status()
    if "8443" in before.get("TCP", {}) or any(key.endswith(":8443") for key in before.get("Web", {})):
        raise RuntimeError("Port 8443 already configured; existing configuration preserved")
    for port in (3014, 3015):
        with socket.socket() as check:
            check.bind(("127.0.0.1", port))
    image = run(["docker", "inspect", "--format", "{{.Image}}", "trano"]).stdout.strip()
    if not image.startswith("sha256:"):
        raise RuntimeError("Production image identity unavailable")
    config = dict(setup, readerToken=secrets.token_hex(32), agentToken=secrets.token_hex(32), bootstrapToken=secrets.token_hex(32),
                  readerHost="127.0.0.1", readerPort=3015, agentHost="127.0.0.1", agentPort=3014)
    config_file = root / "gateway.json"
    config_file.write_text(json.dumps(config)); config_file.chmod(0o600)
    entry = root / "entry.mjs"
    entry.write_text("import {loadGatewayConfig,createAgentGateway} from '/app/packages/lan/src/gateway.ts';\n"
                    "const c=loadGatewayConfig('/run/trano-lan/gateway.json');\n"
                    "const g=createAgentGateway(c,{agentLifetimeMs:60000});\n"
                    "g.reader.listen(c.readerPort,c.readerHost);g.agent.listen(c.agentPort,c.agentHost);\n"
                    "process.on('SIGTERM',()=>g.close());\n")
    run(["docker", "run", "-d", "--rm", "--name", name, "--network", "host", "--read-only", "--cap-drop", "ALL",
         "--security-opt", "no-new-privileges", "--user", str(os.getuid())+":"+str(os.getgid()),
         "--mount", "type=bind,src="+str(root/"lan")+",dst=/app/packages/lan,readonly",
         "--mount", "type=bind,src="+str(root)+",dst=/run/trano-lan,readonly", "--entrypoint", "node", image, "/run/trano-lan/entry.mjs"])
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    until = time.monotonic() + 8
    while True:
        try:
            with opener.open("http://127.0.0.1:3014/", timeout=1): pass
        except urllib.error.HTTPError as response:
            if response.code == 404: break
        except OSError:
            pass
        if time.monotonic() > until: raise RuntimeError("Temporary gateway did not start")
        time.sleep(0.2)
    funnel_requested = True
    run(["tailscale", "funnel", "--bg", "--https=8443", "http://127.0.0.1:3014"])
    manifest = config["publicBaseUrl"] + "/bootstrap/" + config["bootstrapToken"] + "/manifest.json"
    print(json.dumps({"publicTrialReady": True, "bootstrapUrl": manifest}), flush=True)
    proved = False; disconnected = False; first_seen = None
    until = time.monotonic() + 100
    while time.monotonic() < until:
        request = urllib.request.Request("http://127.0.0.1:3015/v1/devices", headers={"Authorization":"Bearer "+config["readerToken"]})
        try:
            with opener.open(request, timeout=2) as response:
                inventory = json.loads(response.read(32768))
            if not proved:
                proved = True; first_seen = time.monotonic()
                print(json.dumps({"remoteWssInventory": True, "controlEnabled": inventory["controlEnabled"],
                                  "devices":[{"id":d["id"],"model":d["model"],"reachable":d["reachable"],"state":d["state"]} for d in inventory["devices"]]}), flush=True)
        except urllib.error.HTTPError as error:
            if error.code == 503 and proved and time.monotonic() - first_seen > 10:
                disconnected = True; break
        time.sleep(1)
    print(json.dumps({"agentReported": proved, "timedAgentExitObserved": disconnected}), flush=True)
    if not proved: raise RuntimeError("No inventory received over remote WSS")
finally:
    removed_funnel = False
    unchanged_443 = None; removed_container = False; removed_files = False
    try:
        if funnel_requested:
            current = status()
            handlers = [value.get("Handlers", {}).get("/", {}).get("Proxy") for key,value in current.get("Web", {}).items() if key.endswith(":8443")]
            if handlers == ["http://127.0.0.1:3014"]:
                run(["tailscale", "funnel", "--https=8443", "off"])
                cleaned = status()
                removed_funnel = "8443" not in cleaned.get("TCP", {}) and not any(key.endswith(":8443") for key in cleaned.get("Web", {})) and not any(key.endswith(":8443") and enabled for key,enabled in cleaned.get("AllowFunnel", {}).items())
            elif not handlers:
                removed_funnel = True
    except Exception:
        pass  # Continue independent cleanup and report the unverified Funnel state.
    try:
        subprocess.run(["docker", "rm", "-f", name], capture_output=True, timeout=10)
        remaining = run(["docker", "ps", "-a", "--filter", "name=^/"+name+"$", "--format", "{{.Names}}"])
        removed_container = not remaining.stdout.strip()
    except Exception:
        pass
    try:
        after = status() if before is not None else None
        unchanged_443 = before is not None and before.get("TCP", {}).get("443") == after.get("TCP", {}).get("443") and \
            {k:v for k,v in before.get("Web", {}).items() if k.endswith(":443")} == {k:v for k,v in after.get("Web", {}).items() if k.endswith(":443")}
    except Exception:
        pass
    if root.parent == pathlib.Path(tempfile.gettempdir()).resolve() and root.name.startswith("trano-devialet-trial-"):
        try:
            shutil.rmtree(root); removed_files = True
        except OSError:
            pass
    print(json.dumps({"trialFunnelRemoved": removed_funnel, "temporaryFilesRemoved": removed_files, "temporaryContainerRemoved": removed_container,
                      "existingHttps443Unchanged": unchanged_443, "trialContainer": name,
                      "remainingTemporaryDirectory": None if removed_files else str(root)}), flush=True)
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('relay_config', type=pathlib.Path)
    parser.add_argument('ssh_target')
    parser.add_argument('server_name')
    parser.add_argument('--execute-public-trial', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.@:-]+', args.ssh_target):
        parser.error('Invalid SSH target')
    if not re.fullmatch(r'[a-z0-9-]+\.[a-z0-9-]+\.ts\.net', args.server_name):
        parser.error('An explicit verified Tailscale DNS name is required')
    original = json.loads(args.relay_config.read_text(encoding='utf-8'))
    if original.get('allowControl') is not False:
        parser.error('An explicitly read-only relay configuration is required')
    devices = []
    for row in original['devices']:
        address = ipaddress.IPv4Address(row['host'])
        if not any(address in ipaddress.IPv4Network(cidr) for cidr in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')):
            parser.error('Only explicit private device addresses are allowed')
        devices.append({key: row[key] for key in ('id', 'name', 'kind', 'host', 'mac', 'port', 'spotifyPort') if key in row})
    player = next((row for row in devices if row['kind'] == 'freebox-player'), None)
    if not player or not player.get('spotifyPort'):
        parser.error('A configured Player with discovered Spotify port is required')
    plan = {'publicTrial': args.execute_public_trial, 'endpoint': 'https://' + args.server_name + ':8443',
            'agentListener': '127.0.0.1:3014', 'privateReader': '127.0.0.1:3015', 'agentLifetimeSeconds': 60,
            'maximumObservationSeconds': 100, 'productionVolumesMounted': False, 'existing443Modified': False,
            'cleanup': 'dedicated Funnel 8443, named temporary container, private temporary sources and credentials'}
    print(json.dumps(plan), flush=True)
    if not args.execute_public_trial:
        print('Dry run only. Explicit owner approval is required before publication.')
        return

    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(f'http://{player["host"]}:{player["spotifyPort"]}/zc?action=getInfo&version=2.10.0', timeout=3) as response:
        info = json.loads(response.read(65536))
    if info.get('status') != 101 or info.get('brandDisplayName') != 'Freebox':
        raise RuntimeError('Player identity is not verified; no publication attempted')
    root = pathlib.Path(__file__).resolve().parents[1]
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode='w:gz') as bundle:
        for folder in ('src', 'devialet'):
            for path in sorted((root / folder).rglob('*')):
                if path.is_file() and not path.is_symlink():
                    bundle.add(path, arcname='lan/' + path.relative_to(root).as_posix(), recursive=False)
        bundle.add(root / 'package.json', arcname='lan/package.json', recursive=False)
        payload = json.dumps({'publicBaseUrl': plan['endpoint'], 'devices': devices}).encode()
        entry = tarfile.TarInfo('setup.json'); entry.size = len(payload)
        bundle.addfile(entry, io.BytesIO(payload))
    process = subprocess.Popen(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=yes',
                                args.ssh_target, 'python3 -c ' + shlex.quote(REMOTE)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    process.stdin.write(archive.getvalue()); process.stdin.close()
    launch_error = None
    for line in process.stdout:
        report = json.loads(line)
        manifest = report.pop('bootstrapUrl', None)
        print(json.dumps(report), flush=True)
        if manifest:
            body = {'jsonrpc': '2.0', 'id': 'trano-remote-trial', 'method': 'debug_qml_app',
                    'params': {'manifest_url': manifest, 'entry_point': 'main', 'wait': False}}
            request = urllib.request.Request(f'http://{player["host"]}/pub/devel', data=json.dumps(body).encode(), headers={'Content-Type':'application/json'})
            try:
                with opener.open(request, timeout=10) as response:
                    result = json.loads(response.read(65536))
                if not result.get('result'): raise RuntimeError('SDK launch not accepted')
                print(json.dumps({'sdkLaunchAccepted': True}), flush=True)
            except Exception:
                launch_error = 'Player launch not confirmed; remote trial is waiting for its cleanup deadline.'
                print(launch_error, flush=True)
    process.wait(timeout=30)
    if process.returncode or launch_error:
        # The remote traceback contains no secret URL or credential; keep it out of default output.
        raise SystemExit('Remote trial failed; inspect cleanup reports before retrying.')


if __name__ == '__main__':
    main()
