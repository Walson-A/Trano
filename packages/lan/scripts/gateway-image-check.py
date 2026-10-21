"""Build and verify a disposable gateway image on an explicitly selected Linux host.
No Player launch, Funnel publication or production configuration changes.
"""
import argparse
import io
from pathlib import Path
import re
import shlex
import subprocess
import tarfile

REMOTE = r"""
import json, os, pathlib, secrets, shutil, socket, subprocess, sys, tarfile, tempfile, time, urllib.request, urllib.error, uuid
root = pathlib.Path(tempfile.mkdtemp(prefix="trano-gateway-build-")).resolve()
source = root / "source"
name = "trano-gateway-check-" + uuid.uuid4().hex[:12]
image = "trano-lan-gateway-check:" + uuid.uuid4().hex
code = 1
before = None
def run(args, **kwargs):
    return subprocess.run(args, check=True, timeout=kwargs.pop("timeout", 15), **kwargs)
def inspect():
    return subprocess.check_output(["docker", "inspect", "--format", "{{.Image}}", "trano"], text=True, timeout=8).strip()
def request(url, token=None):
    headers = {"Authorization": "Bearer "+token} if token else {}
    try:
        with opener.open(urllib.request.Request(url, headers=headers), timeout=2) as response:
            return response.status, response.read(262144)
    except urllib.error.HTTPError as response:
        return response.code, response.read(262144)
try:
    with tarfile.open(fileobj=sys.stdin.buffer, mode="r|gz") as archive:
        size = 0
        for member in archive:
            size += member.size
            destination = (source / member.name).resolve()
            if not member.isfile() or size > 8388608 or member.size > 1048576 or source not in destination.parents:
                raise RuntimeError("Invalid build archive")
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.extractfile(member) as incoming, open(destination, "wb") as output:
                shutil.copyfileobj(incoming, output)
    before = inspect()
    for port in (3016, 3017):
        with socket.socket() as check:
            check.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            check.bind(("127.0.0.1", port))
    run(["docker", "build", "--tag", image, "--file", str(source/"packages/lan/Dockerfile"), str(source)], timeout=180)
    # Generate secrets only after the image is built, outside its build context.
    config = {"readerToken":secrets.token_hex(32), "agentToken":secrets.token_hex(32), "bootstrapToken":secrets.token_hex(32),
              "publicBaseUrl":"https://gateway.example.invalid:8443", "readerHost":"127.0.0.1", "readerPort":3017,
              "agentHost":"127.0.0.1", "agentPort":3016,
              "devices":[{"id":"fixture-tv", "name":"Offline test fixture", "kind":"samsung", "host":"192.168.50.10", "mac":"aa:bb:cc:dd:ee:ff"}]}
    private = root / "gateway.json"
    private.write_text(json.dumps(config)); private.chmod(0o400)
    env = dict(os.environ, TRANO_GATEWAY_CONFIG=str(private), TRANO_GATEWAY_IMAGE=image,
               TRANO_GATEWAY_UID=str(os.getuid()), TRANO_GATEWAY_GID=str(os.getgid()))
    run(["docker", "compose", "-f", str(source/"deploy/lan-gateway.compose.yaml"), "config", "--quiet"], env=env)
    run(["docker", "run", "-d", "--rm", "--name", name, "--network", "host", "--read-only", "--cap-drop", "ALL",
         "--security-opt", "no-new-privileges", "--user", str(os.getuid())+":"+str(os.getgid()),
         "--memory", "96m", "--cpus", "0.25", "--pids-limit", "32",
         "--mount", "type=bind,src="+str(private)+",dst=/run/secrets/gateway.json,readonly", image], capture_output=True)
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    until = time.monotonic()+10
    while True:
        try:
            if request("http://127.0.0.1:3016/")[0] == 404: break
        except OSError: pass
        if time.monotonic() >= until: raise RuntimeError("Gateway startup deadline exceeded")
        time.sleep(0.2)
    assert request("http://127.0.0.1:3017/v1/devices")[0] == 401
    status, data = request("http://127.0.0.1:3017/v1/devices", config["readerToken"])
    assert status == 503 and "error" in json.loads(data)
    assert request("http://127.0.0.1:3016/v1/devices", config["readerToken"])[0] == 404
    bootstrap = "http://127.0.0.1:3016/bootstrap/"+config["bootstrapToken"]+"/"
    for asset in ("manifest.json", "agent.qml", "RelayAgent.qml", "qmldir"):
        status, data = request(bootstrap+asset)
        assert status == 200 and config["readerToken"].encode() not in data
        if asset == "qmldir": assert b"RelayAgent RelayAgent.qml" in data
    run(["docker", "exec", name, "node", "packages/lan/scripts/gateway-health.mjs"], capture_output=True)
    version = subprocess.check_output(["docker", "exec", name, "node", "--version"], text=True, timeout=8).strip()
    size = int(subprocess.check_output(["docker", "image", "inspect", "--format", "{{.Size}}", image], text=True, timeout=8))
    memory = subprocess.check_output(["docker", "stats", "--no-stream", "--format", "{{.MemUsage}}", name], text=True, timeout=8).strip()
    print(json.dumps({"dedicatedGatewayImageBuilt":True, "nodeVersion":version, "imageBytes":size, "memoryUsage":memory,
                      "composeValidated":True, "bootstrapAssetsVerified":True, "privateReaderUnauthorized":401,
                      "unstartedPlayerUnavailable":503, "processLivenessVerified":True,
                      "playerContacted":False, "funnelPublished":False, "productionVolumesMounted":False}), flush=True)
    code = 0
except Exception as error:
    # Exception bodies or command lines can contain URLs; report only the category.
    print(json.dumps({"gatewayImageCheckFailed":type(error).__name__}), flush=True)
finally:
    removed_container = False; removed_image = False; removed_files = False; unchanged = False
    try:
        subprocess.run(["docker", "rm", "-f", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        removed_container = not subprocess.check_output(["docker","ps","-a","--filter","name=^/"+name+"$","--format","{{.Names}}"],text=True,timeout=8).strip()
    except Exception: pass
    try:
        subprocess.run(["docker","image","rm",image],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=15)
        removed_image = subprocess.run(["docker","image","inspect",image],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=8).returncode != 0
    except Exception: pass
    try: unchanged = before is not None and inspect() == before
    except Exception: pass
    if root.parent == pathlib.Path(tempfile.gettempdir()).resolve() and root.name.startswith("trano-gateway-build-"):
        try: shutil.rmtree(root); removed_files = True
        except OSError: pass
    print(json.dumps({"temporaryContainerRemoved":removed_container,"temporaryImageRemoved":removed_image,
                      "temporaryFilesRemoved":removed_files,"productionImageUnchanged":unchanged}),flush=True)
    if not all((removed_container,removed_image,removed_files,unchanged)): code = 1
raise SystemExit(code)
"""

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ssh_target")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.@:-]+", args.ssh_target):
        parser.error("An explicit SSH target is required")
    root = Path(__file__).resolve().parents[3]
    paths = [Path(name) for name in (
        "package.json", "package-lock.json", "apps/server/package.json", "apps/web/package.json",
        "packages/shared/package.json", "packages/lan/package.json", "packages/lan/Dockerfile",
        "packages/lan/scripts/gateway-health.mjs", "deploy/lan-gateway.compose.yaml")]
    for folder in ("src", "devialet"):
        paths.extend(sorted((Path("packages/lan")/folder).rglob("*")))
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w:gz") as bundle:
        for path in paths:
            absolute = root/path
            if absolute.is_file() and not absolute.is_symlink():
                bundle.add(absolute, arcname=path.as_posix(), recursive=False)
    result = subprocess.run(["ssh","-o","BatchMode=yes","-o","ConnectTimeout=8","-o","StrictHostKeyChecking=yes",
                             args.ssh_target,"python3 -c "+shlex.quote(REMOTE)], input=archive.getvalue(), timeout=240)
    raise SystemExit(result.returncode)

if __name__ == "__main__":
    main()
