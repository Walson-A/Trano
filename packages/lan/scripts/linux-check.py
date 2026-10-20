"""Run the LAN tests in an isolated copy of Trano's existing Linux image.
Only selected source files and public TLS test fixtures are sent; no .env or local config.
Requires local Python 3 and existing SSH access. Does not build or deploy an image.
"""
import io
import json
from pathlib import Path
import shlex
import subprocess
import sys
import tarfile

if len(sys.argv) != 2:
    raise SystemExit("Usage: python packages/lan/scripts/linux-check.py user@tranoserver")
target = sys.argv[1]
if not target or target.startswith("-") or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.@:-" for c in target):
    raise SystemExit("Invalid SSH target")
root = Path(__file__).resolve().parents[3]
archive = io.BytesIO()
count = 0
with tarfile.open(fileobj=archive, mode="w:gz") as bundle:
    for folder in ["packages/lan", "packages/shared/src", "apps/server/src"]:
        for path in sorted((root / folder).rglob("*")):
            if not path.is_file() or path.is_symlink() or any(p in {"node_modules", ".local", "__pycache__", "data"} for p in path.relative_to(root).parts):
                continue
            if path.stat().st_size > 1_048_576:
                raise SystemExit("Source unexpectedly large")
            bundle.add(path, arcname=path.relative_to(root).as_posix(), recursive=False)
            count += 1
remote = r"""
import json, os, pathlib, shutil, subprocess, sys, tarfile, tempfile, uuid
root=pathlib.Path(tempfile.mkdtemp(prefix="trano-lan-check-")).resolve()
name="trano-lan-check-"+uuid.uuid4().hex[:12]
try:
    with tarfile.open(fileobj=sys.stdin.buffer,mode="r|gz") as archive:
        size=0
        for member in archive:
            size+=member.size
            if not member.isfile() or member.size>1048576 or size>8388608:
                raise RuntimeError("Invalid source archive")
            path=(root/member.name).resolve()
            if root not in path.parents:
                raise RuntimeError("Source path outside temporary directory")
            path.parent.mkdir(parents=True,exist_ok=True)
            source=archive.extractfile(member)
            with source, open(path,"wb") as output:
                shutil.copyfileobj(source,output)
    os.symlink("/app/node_modules",root/"node_modules",target_is_directory=True)
    image=subprocess.check_output(["docker","inspect","--format","{{.Image}}","trano"],text=True).strip()
    print(json.dumps({"isolatedImage":image,"sourceTemporary":True,"productionVolumesMounted":False,"externalNetwork":False}),flush=True)
    run=subprocess.run(["docker","run","--rm","--name",name,"--network","none","--read-only",
        "--cap-drop","ALL","--security-opt","no-new-privileges",
        "--user",str(os.getuid())+":"+str(os.getgid()),"--tmpfs","/tmp:rw,nosuid,nodev,size=64m",
        "-v",str(root)+":/project:ro","--entrypoint","node",image,
        "--test","/project/packages/lan/test/*.test.mjs"],timeout=45)
    code=run.returncode
finally:
    subprocess.run(["docker","rm","-f",name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10)
    if root.parent==pathlib.Path(tempfile.gettempdir()).resolve() and root.name.startswith("trano-lan-check-"):
        shutil.rmtree(root)
    else:
        raise RuntimeError("Temporary path validation failed")
print(json.dumps({"testExitCode":code,"temporaryFilesRemoved":True,"temporaryContainerRemoved":True}),flush=True)
raise SystemExit(code)
"""
print(json.dumps({"sourceFiles": count, "containsRuntimeSecrets": False}), flush=True)
result = subprocess.run(
    ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", "-o", "StrictHostKeyChecking=yes",
     target, "python3 -c " + shlex.quote(remote)],
    input=archive.getvalue(),
    timeout=65,
)
raise SystemExit(result.returncode)
