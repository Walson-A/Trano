"""Explicit read-only protocol probe of one identified owned Player, with local HAR evidence.

No SDK launch, remote key, settings write, credential submission or LAN scan.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import datetime
import http.client
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import time
import urllib.error
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('config', type=Path)
    parser.add_argument('device_id')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--http-port', type=int, choices=(80, 8080), default=80,
                        help='8080 inspects only its root and API metadata by GET; no RPC or repeated TCP checks.')
    args = parser.parse_args()
    if not args.inspect:
        parser.error('--inspect is required for the explicit selected-device network probe')
    config = json.loads(args.config.read_text(encoding='utf-8'))
    devices = [d for d in config['devices'] if d.get('id') == args.device_id and d.get('kind') == 'freebox-player']
    if len(devices) != 1:
        parser.error('Exactly one configured Player is required')
    device = devices[0]
    address = ipaddress.IPv4Address(device['host'])
    if not any(address in ipaddress.IPv4Network(n) for n in ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')):
        parser.error('Only an explicit RFC1918 Player is supported')
    host = str(address)
    spotify_port = device.get('spotifyPort')
    if type(spotify_port) is not int or not 1 <= spotify_port <= 65535:
        parser.error('The discovered Spotify port is required')
    destination = args.output.resolve()
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    if any((destination / name).exists() for name in ('http.har', 'services.json')):
        parser.error('Evidence already exists; choose a new output directory')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    with opener.open(f'http://{host}:{spotify_port}/zc?action=getInfo&version=2.10.0', timeout=3) as response:
        identity = json.loads(response.read(65536))
    if identity.get('status') != 101 or identity.get('brandDisplayName') != 'Freebox' or identity.get('modelDisplayName') != 'Freebox v7':
        raise RuntimeError('Selected host identity does not match the Player; no probes performed')
    print(json.dumps({'playerIdentityVerified': True}), flush=True)

    ports = [21, 22, 23, 80, 443, 2222, 2323, 5555, 8000, 8001, 8022, 8080, 8081, 8443,
             9000, 9090, 10000, 20000, 32980, 32981, 32983]
    if args.http_port == 8080:
        ports = []
    def tcp(port):
        try:
            with socket.create_connection((host, port), timeout=1):
                return port
        except OSError:
            return None
    with ThreadPoolExecutor(max_workers=4) as pool:
        opened = [port for port in pool.map(tcp, ports) if port is not None]
    print(json.dumps({'selectedTcpPorts': len(ports), 'openPorts': opened, 'otherHostsContacted': False}), flush=True)
    entries = []
    probes = [('GET', '/api_version', None), ('GET', '/pub/devel', None),
              ('POST', '/pub/devel', {'jsonrpc': '2.0', 'id': 'read-only-discovery', 'method': 'rpc.discover', 'params': {}}),
              ('POST', '/pub/devel', {'jsonrpc': '2.0', 'id': 'read-only-list', 'method': 'system.listMethods', 'params': {}})]
    if args.http_port == 8080:
        probes = [('GET', '/', None), ('GET', '/api_version', None)]
    for method, path, payload in probes:
        body = json.dumps(payload).encode() if payload else None
        headers = {'Content-Type': 'application/json'} if body else {}
        url = f'http://{host}:{args.http_port}{path}'
        start = time.monotonic()
        started = datetime.datetime.now(datetime.timezone.utc).isoformat()
        request = urllib.request.Request(url, data=body, headers=headers, method=method)
        try:
            response = opener.open(request, timeout=3)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            data = response.read(65537)
            if len(data) > 65536:
                raise RuntimeError('Response exceeded the evidence bound')
            status = response.code
            content_type = response.headers.get('Content-Type', '')
            response_version = 'HTTP/1.0' if response.version == 10 else 'HTTP/1.1' if response.version == 11 else ''
        duration = (time.monotonic() - start) * 1000
        entry = {'startedDateTime': started, 'time': duration,
                 'request': {'method': method, 'url': url, 'httpVersion': 'HTTP/1.1',
                             'headers': [{'name': k, 'value': v} for k, v in headers.items()],
                             'queryString': [], 'cookies': [], 'headersSize': -1, 'bodySize': len(body or b'')},
                 'response': {'status': status, 'statusText': http.client.responses.get(status, ''), 'httpVersion': response_version,
                              'headers': [{'name': 'Content-Type', 'value': content_type}], 'cookies': [],
                              'content': {'size': len(data), 'mimeType': content_type, 'encoding': 'base64',
                                          'text': base64.b64encode(data).decode()},
                              'redirectURL': '', 'headersSize': -1, 'bodySize': len(data)},
                 'cache': {}, 'timings': {'send': 0, 'wait': duration, 'receive': 0}}
        if body:
            entry['request']['postData'] = {'mimeType': 'application/json', 'text': body.decode()}
        entries.append(entry)
        summary = {'method': method, 'path': path, 'rpcMethod': payload['method'] if payload else None,
                   'status': status, 'contentType': content_type}
        try:
            decoded = json.loads(data)
            if isinstance(decoded, dict):
                summary['jsonKeys'] = sorted(k for k in decoded if re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]{0,40}', k))[:30]
                if isinstance(decoded.get('error'), dict) and type(decoded['error'].get('code')) is int:
                    summary['rpcErrorCode'] = decoded['error']['code']
        except (ValueError, UnicodeError):
            pass
        print(json.dumps(summary), flush=True)
    har = {'log': {'version': '1.2', 'creator': {'name': 'Atlas explicit Player probe', 'version': '1'},
                   '_coverage': 'Controlled urllib requests; selected headers only; no browser attribution; no redirects or credentials.',
                   'entries': entries}}
    for name, value in [('http.har', har), ('services.json', {'host': host, 'identity': 'Freebox v7', 'portsTested': ports, 'portsOpen': opened})]:
        with (destination / name).open('x', encoding='utf-8') as output:
            os.chmod(destination / name, 0o600)
            json.dump(value, output)
    print(json.dumps({'localEvidenceWritten': True, 'sdkLaunched': False, 'settingsChanged': False}), flush=True)


if __name__ == '__main__':
    main()
