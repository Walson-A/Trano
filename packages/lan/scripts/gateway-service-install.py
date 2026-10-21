"""Install the isolated read-only gateway on an explicitly selected Linux server.

Requires authorized Docker administration and Funnel 8443 publication. No Player
launch, boot hook, production restart, or Trano configuration change is performed.
Existing service directories, container names and listeners are never replaced.
"""
import argparse
import io
import ipaddress
import json
from pathlib import Path
import re
import shlex
import subprocess
import tarfile

REMOTE = r'''
import json, os, pathlib, secrets, shutil, socket, subprocess, sys, tarfile, time, urllib.error, urllib.request
root = pathlib.Path.home() / 'trano-lan-gateway'
name = 'trano-lan-gateway'
image = 'trano-lan-gateway:standalone'
created = False
published = False
success = False
before = None
production = None

def run(args, timeout=20):
    return subprocess.check_output(args, stderr=subprocess.PIPE, timeout=timeout, text=True).strip()
def status():
    return json.loads(run(['tailscale', 'serve', 'status', '--json']))
def route443(value):
    return {'tcp':value.get('TCP',{}).get('443'), 'web':{k:v for k,v in value.get('Web',{}).items() if k.endswith(':443')},
            'allow':{k:v for k,v in value.get('AllowFunnel',{}).items() if k.endswith(':443')}}
def funnel(arguments):
    if arguments not in (['--bg','--https=8443','http://127.0.0.1:3014'], ['--https=8443','off']):
        raise RuntimeError('Unsupported Funnel operation')
    return run(['docker','run','--rm','--name',name+'-funnel-admin','--network','none','--read-only','--cap-drop','ALL',
                '--security-opt','no-new-privileges','--user','0:0',
                '--mount','type=bind,src=/usr/bin/tailscale,dst=/usr/local/bin/tailscale,readonly',
                '--mount','type=bind,src=/var/run/tailscale/tailscaled.sock,dst=/var/run/tailscale/tailscaled.sock',
                '--entrypoint','/usr/local/bin/tailscale',image,'funnel']+arguments)
def request(path, token=None):
    headers = {'Authorization':'Bearer '+token} if token else {}
    try:
        with opener.open(urllib.request.Request(path,headers=headers),timeout=3) as r:
            return r.status,r.read(262144)
    except urllib.error.HTTPError as r:
        return r.code,r.read(262144)
try:
    before=status()
    if root.exists() or run(['docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}']):
        raise RuntimeError('An existing installation must be reviewed before modification')
    if ('8443' in before.get('TCP',{}) or any(k.endswith(':8443') for k in before.get('Web',{}))
        or any(k.endswith(':8443') and v for k,v in before.get('AllowFunnel',{}).items())):
        raise RuntimeError('The dedicated route is already occupied')
    if subprocess.run(['docker','image','inspect',image],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode == 0:
        raise RuntimeError('An existing image tag must not be replaced')
    for port in (3014,3015):
        with socket.socket() as s:
            s.bind(('127.0.0.1',port))
    production=run(['docker','inspect','--format','{{.Image}}','trano'])
    root.mkdir(mode=0o700)
    created=True
    source=root/'source'
    with tarfile.open(fileobj=sys.stdin.buffer,mode='r|gz') as archive:
        size=0
        for member in archive:
            size+=member.size
            destination=(source/member.name).resolve()
            if not member.isfile() or size>8388608 or member.size>1048576 or source not in destination.parents:
                raise RuntimeError('Invalid source archive')
            destination.parent.mkdir(parents=True,exist_ok=True)
            with archive.extractfile(member) as incoming,open(destination,'wb') as output:
                shutil.copyfileobj(incoming,output)
    setup=json.loads((source/'setup.json').read_text())
    run(['docker','build','--tag',image,'--file',str(source/'packages/lan/Dockerfile'),str(source)],timeout=200)
    config={'readerToken':secrets.token_hex(32),'agentToken':secrets.token_hex(32),'bootstrapToken':secrets.token_hex(32),
            'publicBaseUrl':'https://'+setup['hostname']+':8443','readerHost':'127.0.0.1','readerPort':3015,
            'agentHost':'127.0.0.1','agentPort':3014,'devices':setup['devices']}
    private=root/'gateway.json'
    private.touch(mode=0o600,exist_ok=False)
    private.write_text(json.dumps(config))
    private.chmod(0o400)
    run(['docker','run','-d','--name',name,'--restart','unless-stopped','--init','--network','host',
         '--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
         '--user',str(os.getuid())+':'+str(os.getgid()),'--memory','96m','--cpus','0.25','--pids-limit','32',
         '--label','fr.trano.role=standalone-readonly-gateway',
         '--mount','type=bind,src='+str(private)+',dst=/run/secrets/gateway.json,readonly',image])
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    deadline=time.monotonic()+15
    while True:
        try:
            if request('http://127.0.0.1:3014/')[0]==404:break
        except OSError:pass
        if time.monotonic()>deadline:raise RuntimeError('Gateway startup timed out')
        time.sleep(.3)
    assert request('http://127.0.0.1:3015/v1/devices')[0]==401
    assert request('http://127.0.0.1:3015/v1/devices',config['readerToken'])[0]==503
    for asset in ('manifest.json','agent.qml','RelayAgent.qml','qmldir'):
        code,body=request('http://127.0.0.1:3014/bootstrap/'+config['bootstrapToken']+'/'+asset)
        assert code==200 and config['readerToken'].encode() not in body
    # No diagnostic lifetime is configured: the normal bootstrap uses lifetimeMs=0.
    assert b'"lifetimeMs":0' in request('http://127.0.0.1:3014/bootstrap/'+config['bootstrapToken']+'/agent.qml')[1]
    published=True
    funnel(['--bg','--https=8443','http://127.0.0.1:3014'])
    after=status()
    assert route443(before)==route443(after)
    assert any(k.endswith(':8443') and v for k,v in after.get('AllowFunnel',{}).items())
    assert production==run(['docker','inspect','--format','{{.Image}}','trano'])
    (root/'deployment.json').write_text(json.dumps({'container':name,'image':image,'productionImage':production,
                                                  'existing443':route443(before),'playerBootConfigured':False}))
    success=True
    print(json.dumps({'gatewayInstalled':True,'container':name,'restartPolicy':'unless-stopped','directory':str(root),
                      'funnel8443Published':True,'readerPrivate':True,'diagnosticLifetimeMs':0,
                      'productionImageUnchanged':True,'existing443Unchanged':True,'playerBootConfigured':False}),flush=True)
except Exception as error:
    print(json.dumps({'installationFailed':type(error).__name__}),flush=True)
finally:
    if created and not success:
        clean=True
        if published:
            try:
                current=status()
                own=current.get('Web',{}).get(setup['hostname']+':8443',{}).get('Handlers',{}).get('/',{}).get('Proxy')=='http://127.0.0.1:3014'
                if own:funnel(['--https=8443','off'])
                elif '8443' in current.get('TCP',{}):clean=False
            except Exception:clean=False
        try:
            found=run(['docker','ps','-a','--filter','name=^/'+name+'$','--format','{{.Names}}'])
            if found:
                owned=run(['docker','inspect','--format','{{index .Config.Labels "fr.trano.role"}}',name])=='standalone-readonly-gateway'
                if owned:run(['docker','rm','-f',name])
                else:clean=False
        except Exception:clean=False
        if clean:
            try:
                subprocess.run(['docker','image','rm',image],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=20)
                clean=subprocess.run(['docker','image','inspect',image],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=10).returncode!=0
                if root.parent==pathlib.Path.home() and root.name=='trano-lan-gateway':shutil.rmtree(root)
                clean=clean and not root.exists()
            except Exception:clean=False
        try:
            final=status()
            clean=clean and route443(before)==route443(final) and '8443' not in final.get('TCP',{})
        except Exception:clean=False
        print(json.dumps({'failedInstallationRolledBack':clean}),flush=True)
raise SystemExit(0 if success else 1)
'''


def selected_player(config):
    players = [d for d in config['devices'] if d.get('kind') == 'freebox-player']
    if len(players) != 1:
        raise ValueError('Exactly one explicit Player is required')
    player = players[0]
    address = ipaddress.IPv4Address(player['host'])
    if not any(address in ipaddress.IPv4Network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')):
        raise ValueError('An RFC1918 Player address is required')
    if type(player.get('spotifyPort')) is not int or not 1 <= player['spotifyPort'] <= 65535:
        raise ValueError('The discovered Spotify port is required')
    return {key: player[key] for key in ('id', 'name', 'kind', 'host', 'spotifyPort')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('relay_config', type=Path)
    parser.add_argument('ssh_target')
    parser.add_argument('hostname')
    parser.add_argument('--install', action='store_true')
    args = parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.@:-]+', args.ssh_target):
        parser.error('Explicit SSH target required')
    if not re.fullmatch(r'[a-z0-9-]+\.[a-z0-9-]+\.ts\.net', args.hostname):
        parser.error('Explicit Tailscale hostname required')
    player = selected_player(json.loads(args.relay_config.read_text(encoding='utf-8')))
    if not args.install:
        print(json.dumps({'planOnly': True, 'directory': '~/trano-lan-gateway', 'funnelPort': 8443,
                          'privateReaderPort': 3015, 'playerBootConfigured': False, 'productionModified': False}))
        return
    root = Path(__file__).resolve().parents[3]
    paths = [Path(n) for n in ('package.json', 'package-lock.json', 'apps/server/package.json', 'apps/web/package.json',
                              'packages/shared/package.json', 'packages/lan/package.json', 'packages/lan/Dockerfile',
                              'packages/lan/scripts/gateway-health.mjs')]
    for folder in ('src', 'devialet'):
        paths.extend(sorted((Path('packages/lan') / folder).rglob('*')))
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode='w:gz') as bundle:
        for path in paths:
            if (root / path).is_file() and not (root / path).is_symlink():
                bundle.add(root / path, arcname=path.as_posix(), recursive=False)
        data = json.dumps({'hostname': args.hostname, 'devices': [player]}).encode()
        member = tarfile.TarInfo('setup.json')
        member.size = len(data)
        bundle.addfile(member, io.BytesIO(data))
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=8', '-o', 'StrictHostKeyChecking=yes',
                             args.ssh_target, 'python3 -c ' + shlex.quote(REMOTE)], input=archive.getvalue(), timeout=260)
    raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
