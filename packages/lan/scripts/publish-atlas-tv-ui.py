"""Run on the configured Linux gateway: atomically publish only an immutable QML bundle."""
import argparse
import fcntl
import hashlib
import json
import os
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.request


def atomic_write(path, data):
    fd, name = tempfile.mkstemp(prefix='.ui-publish-', dir=path.parent)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'wb') as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.replace(name, path)
        directory = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=pathlib.Path, required=True)
    parser.add_argument('--release', required=True)
    parser.add_argument('--expected-release', required=True)
    parser.add_argument('--expected-server-sha', required=True)
    parser.add_argument('--backend-commit', required=True)
    args = parser.parse_args()
    if not re.fullmatch(r'hero-[a-z0-9-]{1,64}', args.release):
        parser.error('An explicit immutable hero release name is required')
    if not re.fullmatch(r'[a-f0-9]{40}', args.backend_commit):
        parser.error('An explicit verified backend commit is required')
    root = args.root.resolve(strict=True)
    bundle = (root / args.release).resolve(strict=True)
    if bundle.parent != root or bundle.is_symlink():
        raise ValueError('Bundle must be a direct directory under the gateway root')
    config_path, server = root / 'config.json', root / 'server.mjs'
    server_sha = hashlib.sha256(server.read_bytes()).hexdigest()
    if server_sha != args.expected_server_sha:
        raise ValueError('Gateway changed; refusing to publish')
    files = {}
    size = 0
    for path in bundle.iterdir():
        if path.is_symlink() or not path.is_file() or not re.fullmatch(r'[A-Za-z0-9_.-]+', path.name):
            raise ValueError('Only simple immutable assets are allowed')
        data = path.read_bytes()
        size += len(data)
        files[path.name] = hashlib.sha256(data).hexdigest()
    if not 0 < len(files) <= 64 or size > 16*1024*1024:
        raise ValueError('Invalid bundle size')
    with (root / '.upgrade.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = config_path.read_bytes()
        config = json.loads(before)
        if config.get('releaseId') != args.expected_release:
            raise ValueError('Another release is active; refusing to overwrite')
        updated = dict(config, releaseId=args.release, bundleDir=str(bundle), files=files)
        candidate = root / ('.candidate-'+args.release+'.json')
        backup = root / ('config-before-'+args.release+'.json')
        if backup.exists() or candidate.exists():
            raise ValueError('A publication with this name already exists')
        atomic_write(candidate, json.dumps(updated).encode())
        try:
            validation = subprocess.run(['node', '--input-type=module', '-e',
                "import{readFileSync}from'node:fs';const{loadRelease}=await import(process.argv[1]);loadRelease(JSON.parse(readFileSync(process.argv[2],'utf8')));",
                server.as_uri(), str(candidate)], capture_output=True, timeout=20)
            if validation.returncode:
                raise ValueError('Gateway rejected the candidate bundle')
            if config_path.read_bytes() != before:
                raise ValueError('Configuration changed during validation')
            atomic_write(backup, before)
            try:
                atomic_write(config_path, candidate.read_bytes())
                subprocess.run(['docker', 'restart', 'atlas-tv-launch'], check=True, capture_output=True, timeout=30)
                opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                verified = False
                for _ in range(30):
                    try:
                        request = urllib.request.Request('http://127.0.0.1:'+str(updated.get('port', 3016))+'/tv/v1/availability', headers={'Authorization':'Bearer '+updated['phoneToken']})
                        with opener.open(request, timeout=2) as response:
                            available = json.load(response)
                        verified = available.get('releaseId') == args.release and available.get('files') == files
                        if verified:
                            break
                    except Exception:
                        pass
                    time.sleep(.25)
                if not verified:
                    raise RuntimeError('New release did not become available')
                evidence_path = root / 'evidence.json'
                evidence = json.loads(evidence_path.read_bytes())
                evidence.update(releaseId=args.release, files=files, serverSha256=server_sha,
                    backendCommit=args.backend_commit, localAvailability=True, phoneTested=False,
                    pcOffTested=False, uiPreviousRelease=args.expected_release)
                atomic_write(evidence_path, json.dumps(evidence, indent=2).encode())
            except Exception:
                atomic_write(config_path, before)
                subprocess.run(['docker', 'restart', 'atlas-tv-launch'], check=True, capture_output=True, timeout=30)
                raise
        finally:
            candidate.unlink(missing_ok=True)
    print(json.dumps({'releaseId':args.release, 'files':len(files), 'bytes':size,
        'availabilityVerified':True, 'serverSha256':server_sha, 'engineRestarted':False}))


if __name__ == '__main__':
    main()
