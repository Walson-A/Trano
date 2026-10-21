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
import ipaddress, json, os, pathlib, re, secrets, shutil, signal, socket, ssl, subprocess, sys, tarfile, tempfile, time, urllib.request, uuid
root = pathlib.Path(tempfile.mkdtemp(prefix="trano-devialet-trial-")).resolve()
name = "trano-devialet-trial-" + uuid.uuid4().hex[:12]
funnel_requested = False
before = None
def status():
    return json.loads(subprocess.check_output(["tailscale", "serve", "status", "--json"], text=True, timeout=8))
def run(args, timeout=15):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True)
    except subprocess.CalledProcessError as error:
        # No credentials or approval URLs may escape through command diagnostics.
        detail = re.sub(r"https?://[^\s]+", "[redacted-url]", error.stderr or "")
        detail = re.sub(r"[A-Fa-f0-9]{64}", "[redacted-token]", detail)
        print(json.dumps({"commandFailed": args[:2], "exitCode": error.returncode, "detail": detail[:1200]}), flush=True)
        raise RuntimeError("Remote command failed") from None
def funnel(arguments):
    allowed = (["--bg", "--https=8443", "http://127.0.0.1:3014"], ["--https=8443", "off"])
    if arguments not in allowed:
        raise RuntimeError("Only the dedicated trial Funnel route is allowed")
    if not setup.get("dockerFunnelAdmin"):
        return run(["tailscale", "funnel"] + arguments)
    # Explicit opt-in: existing Docker administration, with no persistent operator grant.
    return run(["docker", "run", "--rm", "--name", name+"-funnel", "--network", "none",
                "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--user", "0:0",
                "--mount", "type=bind,src=/usr/bin/tailscale,dst=/usr/local/bin/tailscale,readonly",
                "--mount", "type=bind,src=/var/run/tailscale/tailscaled.sock,dst=/var/run/tailscale/tailscaled.sock",
                "--entrypoint", "/usr/local/bin/tailscale", image, "funnel"] + arguments)
def public_https_ready(address, hostname, port):
    # Connect to a public DNS answer while verifying the intended TLS hostname.
    # No bootstrap token or agent credential is sent during readiness checks.
    context = ssl.create_default_context()
    with socket.create_connection((address, port), timeout=3) as connection:
        with context.wrap_socket(connection, server_hostname=hostname) as secure:
            secure.sendall(("GET / HTTP/1.1\r\nHost: "+hostname+":"+str(port)+"\r\nConnection: close\r\n\r\n").encode("ascii"))
            status = secure.recv(256).split(b"\r\n", 1)[0].split()
            return len(status) >= 2 and status[0].startswith(b"HTTP/") and status[1] == b"404"
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
            check.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
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
         "--mount", "type=bind,src="+str(root)+",dst=/run/trano-lan,readonly",
         "--mount", "type=bind,src="+str(root/"runtime-ws")+",dst=/app/node_modules/ws,readonly", "--entrypoint", "node", image, "/run/trano-lan/entry.mjs"])
    actual_ws = run(["docker", "exec", name, "node", "-p", "require('ws/package.json').version"]).stdout.strip()
    if actual_ws != setup.get("wsVersion"):
        raise RuntimeError("The gateway did not load the locked ws runtime")
    print(json.dumps({"gatewayWsVersion": actual_ws}), flush=True)
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
    if setup.get("preflightOnly") is True:
        # Validate the actual mounted runtime and bootstrap without launching a Player or opening Funnel.
        base = "http://127.0.0.1:3014/bootstrap/" + config["bootstrapToken"] + "/"
        with opener.open(base + "manifest.json", timeout=2) as response:
            manifest_data = json.loads(response.read(32768))
        if manifest_data.get("entryPoints", {}).get("main", {}).get("file") != "agent.qml":
            raise RuntimeError("Bootstrap manifest is invalid")
        with opener.open(base + "agent.qml", timeout=2) as response:
            host_qml = response.read(262144).decode()
        with opener.open(base + "RelayAgent.qml", timeout=2) as response:
            core_qml = response.read(262144).decode()
        with opener.open(base + "qmldir", timeout=2) as response:
            qml_directory = response.read(32768).decode()
        if "RelayAgent RelayAgent.qml" not in qml_directory.splitlines():
            raise RuntimeError("Remote QML directory index is missing")
        if config["agentToken"] not in host_qml or config["readerToken"] in host_qml or config["readerToken"] in core_qml:
            raise RuntimeError("Bootstrap credential separation failed")
        private_status = None
        request = urllib.request.Request("http://127.0.0.1:3015/v1/devices", headers={"Authorization":"Bearer "+config["readerToken"]})
        try:
            with opener.open(request, timeout=2): pass
        except urllib.error.HTTPError as response:
            private_status = response.code
        if private_status != 503:
            raise RuntimeError("Private reader invented an online agent")
        print(json.dumps({"gatewayRuntimeReady": True, "bootstrapAssetsVerified": True, "unstartedAgentUnavailable": True,
                          "funnelPublished": False, "playerLaunched": False}), flush=True)
    else:
        funnel_requested = True
        funnel(["--bg", "--https=8443", "http://127.0.0.1:3014"])
        dns_wait = setup.get("publicDnsWaitSeconds", 0)
        if dns_wait:
            public_origin = urllib.parse.urlsplit(config["publicBaseUrl"])
            hostname = public_origin.hostname
            print(json.dumps({"waitingForPublicEndpoint": True, "maximumSeconds": dns_wait}), flush=True)
            deadline = time.monotonic() + dns_wait
            dns_reported = False
            while True:
                try:
                    with opener.open("https://dns.google/resolve?name="+hostname+"&type=A", timeout=4) as response:
                        dns = json.loads(response.read(32768))
                    addresses = [row["data"] for row in dns.get("Answer", []) if row.get("type") == 1 and ipaddress.ip_address(row["data"]).is_global]
                except (OSError, ValueError):
                    addresses = []
                if addresses and not dns_reported:
                    print(json.dumps({"publicDnsReady": True}), flush=True)
                    dns_reported = True
                ready = False
                for address in addresses[:3]:
                    try:
                        ready = public_https_ready(address, hostname, public_origin.port or 443)
                    except OSError:
                        pass
                    if ready: break
                if ready:
                    print(json.dumps({"publicHttpsReady": True}), flush=True)
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError("Public HTTPS endpoint is not ready; no Player launched")
                time.sleep(10)
        manifest = config["publicBaseUrl"] + "/bootstrap/" + config["bootstrapToken"] + "/manifest.json"
        print(json.dumps({"publicTrialReady": True, "bootstrapUrl": manifest}), flush=True)
        proved = False; disconnected = False; first_seen = None
        restarted = False; recovering = False; recovered = False; recovery_until = None
        until = time.monotonic() + 100
        while time.monotonic() < until:
            request = urllib.request.Request("http://127.0.0.1:3015/v1/devices", headers={"Authorization":"Bearer "+config["readerToken"]})
            try:
                with opener.open(request, timeout=2) as response:
                    inventory = json.loads(response.read(32768))
                if inventory.get("controlEnabled") is not False or not isinstance(inventory.get("devices"), list):
                    raise RuntimeError("Gateway read-only contract is not verified")
                rows = inventory["devices"]
                expected = {device["id"] for device in setup["devices"]}
                complete = len(rows) == len(expected) and {row.get("id") for row in rows} == expected and all(
                    row.get("reachable") is True and isinstance(row.get("model"), str) and row["model"] and row.get("capabilities") == [] for row in rows)
                if complete and recovering:
                    recovering = False; recovered = True
                    print(json.dumps({"remoteWssRecovered": True, "controlEnabled": inventory["controlEnabled"],
                                      "devices":[{"id":d["id"],"model":d["model"],"reachable":d["reachable"],"state":d["state"]} for d in rows]}), flush=True)
                if complete and not proved:
                    proved = True; first_seen = time.monotonic()
                    print(json.dumps({"remoteWssInventory": True, "controlEnabled": inventory["controlEnabled"],
                                      "devices":[{"id":d["id"],"model":d["model"],"reachable":d["reachable"],"state":d["state"]} for d in inventory["devices"]]}), flush=True)
                if proved and setup.get("restartGateway") and not restarted and time.monotonic() - first_seen >= 10:
                    # Only this trial's generated container; never the production container.
                    run(["docker", "restart", "--time", "3", name])
                    restarted = True; recovering = True; recovery_until = time.monotonic() + 20
                    print(json.dumps({"trialGatewayRestarted": True}), flush=True)
            except urllib.error.HTTPError as error:
                if error.code == 503 and recovering:
                    pass
                elif error.code == 503 and proved:
                    if time.monotonic() - first_seen < 45:
                        raise RuntimeError("Agent disconnected before the expected diagnostic end")
                    disconnected = True; break
                if error.code != 503:
                    raise RuntimeError("Private reader refused the trial")
            except OSError:
                if not recovering:
                    raise
            if recovering and time.monotonic() >= recovery_until:
                raise RuntimeError("Player did not reconnect after the temporary gateway restart")
            time.sleep(1)
        print(json.dumps({"agentReported": proved, "timedAgentExitObserved": disconnected, "trialGatewayRestarted": restarted, "remoteWssRecovered": recovered}), flush=True)
        if not proved: raise RuntimeError("No complete verified inventory received over remote WSS")
        if not disconnected: raise RuntimeError("Expected agent disconnect was not observed")
        if setup.get("restartGateway") and not (restarted and recovered):
            raise RuntimeError("Gateway restart and Player recovery are unverified")
except Exception as error:
    detail = re.sub(r"https?://[^\s]+", "[redacted-url]", str(error))
    detail = re.sub(r"[A-Fa-f0-9]{64}", "[redacted-token]", detail)
    print(json.dumps({"remoteFailure": type(error).__name__, "detail": detail[:600]}), flush=True)
    raise
finally:
    removed_funnel = not funnel_requested
    unchanged_443 = None; removed_container = False; removed_files = False
    try:
        if funnel_requested:
            current = status()
            handlers = [value.get("Handlers", {}).get("/", {}).get("Proxy") for key,value in current.get("Web", {}).items() if key.endswith(":8443")]
            if handlers == ["http://127.0.0.1:3014"]:
                funnel(["--https=8443", "off"])
                cleaned = status()
                removed_funnel = "8443" not in cleaned.get("TCP", {}) and not any(key.endswith(":8443") for key in cleaned.get("Web", {})) and not any(key.endswith(":8443") and enabled for key,enabled in cleaned.get("AllowFunnel", {}).items())
            elif not handlers:
                removed_funnel = "8443" not in current.get("TCP", {}) and not any(
                    key.endswith(":8443") and enabled for key,enabled in current.get("AllowFunnel", {}).items())
    except Exception:
        pass  # Continue independent cleanup and report the unverified Funnel state.
    try:
        subprocess.run(["docker", "rm", "-f", name, name+"-funnel"], capture_output=True, timeout=10)
        remaining = run(["docker", "ps", "-a", "--filter", "name=^/"+name+"(-funnel)?$", "--format", "{{.Names}}"])
        removed_container = not remaining.stdout.strip()
    except Exception:
        pass
    try:
        after = status() if before is not None else None
        unchanged_443 = before is not None and before.get("TCP", {}).get("443") == after.get("TCP", {}).get("443") and \
            {k:v for k,v in before.get("Web", {}).items() if k.endswith(":443")} == {k:v for k,v in after.get("Web", {}).items() if k.endswith(":443")} and \
            {k:v for k,v in before.get("AllowFunnel", {}).items() if k.endswith(":443")} == {k:v for k,v in after.get("AllowFunnel", {}).items() if k.endswith(":443")}
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
    if not (removed_funnel and removed_container and removed_files and unchanged_443 is True):
        raise RuntimeError("Trial cleanup or preservation of the existing HTTPS service is unverified")
'''


def verify_trial_reports(reports, returncode, launch_error, expected_ids, expected_restart=False):
    """A successful SSH exit alone is never proof of successful cleanup."""
    if returncode or launch_error:
        raise RuntimeError('Remote trial failed; inspect cleanup reports before retrying.')
    inventory = next((row for row in reports if row.get('remoteWssInventory') is True), None)
    outcome = next((row for row in reversed(reports) if 'agentReported' in row), None)
    cleanup = next((row for row in reversed(reports) if 'trialFunnelRemoved' in row), None)
    if not inventory or inventory.get('controlEnabled') is not False:
        raise RuntimeError('No verified read-only remote inventory.')
    devices = inventory.get('devices')
    if (not isinstance(devices, list) or len(devices) != len(expected_ids)
            or {d.get('id') for d in devices} != set(expected_ids)
            or not all(d.get('reachable') is True and isinstance(d.get('model'), str) and d['model'] for d in devices)):
        raise RuntimeError('Complete configured device identities were not verified.')
    if not outcome or outcome.get('agentReported') is not True or outcome.get('timedAgentExitObserved') is not True:
        raise RuntimeError('Expected end of the temporary agent is unverified.')
    if expected_restart:
        recovery = next((row for row in reports if row.get('remoteWssRecovered') is True and 'devices' in row), None)
        if not outcome.get('trialGatewayRestarted') or not outcome.get('remoteWssRecovered') or not recovery:
            raise RuntimeError('Gateway restart and Player recovery are unverified.')
        devices = recovery.get('devices')
        if (recovery.get('controlEnabled') is not False or not isinstance(devices, list)
                or len(devices) != len(expected_ids) or {d.get('id') for d in devices} != set(expected_ids)
                or not all(d.get('reachable') is True and isinstance(d.get('model'), str) and d['model'] for d in devices)):
            raise RuntimeError('Recovered inventory is incomplete or unverified.')
    required = ('trialFunnelRemoved', 'temporaryFilesRemoved', 'temporaryContainerRemoved', 'existingHttps443Unchanged')
    if not cleanup or not all(cleanup.get(key) is True for key in required):
        raise RuntimeError('Cleanup or preservation of the existing HTTPS service is unverified.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('relay_config', type=pathlib.Path)
    parser.add_argument('ssh_target')
    parser.add_argument('server_name')
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument('--execute-public-trial', action='store_true')
    modes.add_argument('--server-preflight', action='store_true', help='Validate the isolated server runtime without publishing Funnel or contacting the Player.')
    parser.add_argument('--docker-funnel-admin', action='store_true', help='Use existing Docker administration for only the dedicated Funnel 8443 commands; no persistent operator grant.')
    parser.add_argument('--public-dns-wait-seconds', type=int, default=600, help='Wait up to 600 seconds for public DNS and verified HTTPS before launching the Player.')
    parser.add_argument('--restart-gateway', action='store_true', help='Restart only the temporary gateway after ten seconds of verified inventory and require autonomous Player recovery.')
    args = parser.parse_args()
    if args.server_preflight and args.restart_gateway:
        parser.error('Gateway restart belongs to a public trial, not the server-only preflight')
    if not 0 <= args.public_dns_wait_seconds <= 600:
        parser.error('Public DNS wait must be between 0 and 600 seconds')
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
    plan = {'publicTrial': args.execute_public_trial, 'serverPreflight': args.server_preflight, 'endpoint': 'https://' + args.server_name + ':8443',
            'agentListener': '127.0.0.1:3014', 'privateReader': '127.0.0.1:3015', 'agentLifetimeSeconds': 60,
            'maximumObservationSeconds': 100, 'productionVolumesMounted': False, 'existing443Modified': False, 'dockerFunnelAdmin': args.docker_funnel_admin, 'restartGateway': args.restart_gateway, 'publicDnsWaitSeconds': args.public_dns_wait_seconds,
            'cleanup': 'dedicated Funnel 8443, named temporary container, private temporary sources and credentials'}
    print(json.dumps(plan), flush=True)
    if not args.execute_public_trial and not args.server_preflight:
        print('Dry run only. Explicit owner approval is required before publication.')
        return

    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    if args.execute_public_trial:
        with opener.open(f'http://{player["host"]}:{player["spotifyPort"]}/zc?action=getInfo&version=2.10.0', timeout=3) as response:
            info = json.loads(response.read(65536))
        if info.get('status') != 101 or info.get('brandDisplayName') != 'Freebox':
            raise RuntimeError('Player identity is not verified; no publication attempted')
    root = pathlib.Path(__file__).resolve().parents[1]
    repository = root.parents[1]
    runtime_ws = repository / "node_modules/ws"
    locked_ws = json.loads((repository/"package-lock.json").read_text(encoding="utf-8"))["packages"]["node_modules/ws"]["version"]
    if json.loads((runtime_ws/"package.json").read_text(encoding="utf-8"))["version"] != locked_ws:
        raise RuntimeError("Install the locked local dependencies before the trial")
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode='w:gz') as bundle:
        for folder in ('src', 'devialet'):
            for path in sorted((root / folder).rglob('*')):
                if path.is_file() and not path.is_symlink():
                    bundle.add(path, arcname='lan/' + path.relative_to(root).as_posix(), recursive=False)
        bundle.add(root / 'package.json', arcname='lan/package.json', recursive=False)
        for path in sorted(runtime_ws.rglob('*')):
            if path.is_file() and not path.is_symlink() and 'node_modules' not in path.relative_to(runtime_ws).parts:
                if path.stat().st_size > 1048576: raise RuntimeError("Unexpected ws runtime file")
                bundle.add(path, arcname='runtime-ws/' + path.relative_to(runtime_ws).as_posix(), recursive=False)
        payload = json.dumps({'wsVersion': locked_ws, 'publicBaseUrl': plan['endpoint'], 'devices': devices, 'preflightOnly': args.server_preflight, 'dockerFunnelAdmin': args.docker_funnel_admin, 'restartGateway': args.restart_gateway, 'publicDnsWaitSeconds': args.public_dns_wait_seconds}).encode()
        entry = tarfile.TarInfo('setup.json'); entry.size = len(payload)
        bundle.addfile(entry, io.BytesIO(payload))
    process = subprocess.Popen(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=3', '-o', 'StrictHostKeyChecking=yes',
                                args.ssh_target, 'python3 -c ' + shlex.quote(REMOTE)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    process.stdin.write(archive.getvalue()); process.stdin.close()
    launch_error = None
    reports = []
    for line in process.stdout:
        report = json.loads(line)
        if not isinstance(report, dict):
            raise RuntimeError('Invalid trial report.')
        manifest = report.pop('bootstrapUrl', None)
        reports.append(report)
        print(json.dumps(report), flush=True)
        if manifest:
            body = {'jsonrpc': '2.0', 'id': 'trano-remote-trial', 'method': 'debug_qml_app',
                    'params': {'manifest_url': manifest, 'entry_point': 'main', 'wait': False}}
            request = urllib.request.Request(f'http://{player["host"]}/pub/devel', data=json.dumps(body).encode(), headers={'Content-Type':'application/json'})
            try:
                with opener.open(request, timeout=10) as response:
                    result = json.loads(response.read(65536))
                if not result.get('result'): raise RuntimeError('SDK launch not accepted: ' + str(result.get('error', 'no result')))
                print(json.dumps({'sdkLaunchAccepted': True}), flush=True)
            except Exception as error:
                detail = re.sub(r'https?://[^\s]+', '[redacted-url]', str(error))
                detail = re.sub(r'[A-Fa-f0-9]{64}', '[redacted-token]', detail)
                print(json.dumps({'sdkLaunchAccepted': False, 'detail': detail[:600]}), flush=True)
                launch_error = 'Player launch not confirmed; remote trial is waiting for its cleanup deadline.'
                print(launch_error, flush=True)
    process.wait(timeout=30)
    # Keep the remote traceback out of default output: only explicit evidence determines success.
    if args.server_preflight:
        ready = next((row for row in reports if row.get('gatewayRuntimeReady') is True), None)
        if process.returncode or not ready or ready.get('bootstrapAssetsVerified') is not True or ready.get('playerLaunched') is not False or ready.get('funnelPublished') is not False:
            raise RuntimeError('Server preflight was not verified.')
        cleanup = reports[-1] if reports else {}
        if not all(cleanup.get(key) is True for key in ('trialFunnelRemoved', 'temporaryFilesRemoved', 'temporaryContainerRemoved', 'existingHttps443Unchanged')):
            raise RuntimeError('Server preflight cleanup is unverified.')
    else:
        verify_trial_reports(reports, process.returncode, launch_error, [d['id'] for d in devices], expected_restart=args.restart_gateway)


if __name__ == '__main__':
    main()
