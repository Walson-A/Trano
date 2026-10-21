"""Explicit 16-second QML runtime probe on an owned Freebox Player; no media control."""
import argparse
import http.server
import ipaddress
import json
import pathlib
import secrets
import threading
import time
import urllib.parse
import urllib.request


def private_ipv4(value):
    try:
        address = ipaddress.IPv4Address(value)
    except ipaddress.AddressValueError as error:
        raise argparse.ArgumentTypeError('A valid IPv4 address is required.') from error
    ranges = ('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16')
    if not any(address in ipaddress.IPv4Network(network) for network in ranges):
        raise argparse.ArgumentTypeError('An explicit RFC1918 IPv4 address is required.')
    return str(address)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--player', required=True, type=private_ipv4)
    parser.add_argument('--samsung', required=True, type=private_ipv4)
    parser.add_argument('--bind', required=True, type=private_ipv4)
    parser.add_argument('--server-url', default='')
    parser.add_argument('--port', type=int, default=3013)
    parser.add_argument('--media', action='store_true', help='Probe QtMultimedia types without loading or playing a video.')
    parser.add_argument('--launch', action='store_true', help='Required: may interrupt the Player display.')
    args = parser.parse_args()
    if not args.launch:
        parser.error('--launch is required; the QML application may interrupt the Player display.')
    if not 1024 <= args.port <= 65535:
        parser.error('--port must be between 1024 and 65535.')
    if args.server_url:
        try:
            url = urllib.parse.urlsplit(args.server_url)
            valid_url = (url.scheme == 'https' and url.hostname and not url.username and not url.password
                         and not url.query and not url.fragment and url.port in (None, 443))
        except ValueError:
            valid_url = False
        if not valid_url:
            parser.error('--server-url must be an HTTPS URL without credentials, query or fragment.')

    nonce = secrets.token_urlsafe(24)
    base = f'http://{args.bind}:{args.port}/{nonce}'
    config = {'reportUrl': base + '/report', 'samsungUrl': f'http://{args.samsung}:8001/api/v2/', 'serverUrl': args.server_url, 'mediaProbe': args.media}
    source = pathlib.Path(__file__).resolve().parent.parent / 'devialet' / 'probe.qml'
    qml = source.read_text(encoding='utf-8').replace('__TRANO_PROBE_CONFIG__', json.dumps(config))
    manifest = {'name': 'Trano diagnostic reseau', 'identifier': 'fr.trano.runtimeprobe',
                'description': 'Diagnostic temporaire en lecture seule', 'capabilities': {'net_wan': 'required'},
                'entryPoints': {'main': {'file': 'probe.qml', 'default': True}}}
    reports = []

    class Handler(http.server.BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(3)

        def log_message(self, *_):
            pass

        def do_GET(self):
            if self.client_address[0] != args.player:
                self.send_error(403)
                return
            content = {f'/{nonce}/manifest.json': json.dumps(manifest).encode(),
                       f'/{nonce}/probe.qml': qml.encode()}.get(self.path)
            if content is None:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)

        def do_POST(self):
            if self.client_address[0] != args.player or self.path != f'/{nonce}/report':
                self.send_error(403)
                return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 4096:
                    raise ValueError('Invalid body size')
                report = json.loads(self.rfile.read(length))
                if not isinstance(report, dict):
                    raise ValueError('Invalid report')
            except (ValueError, UnicodeError):
                self.send_error(400)
                return
            if len(reports) >= 64:
                self.send_error(429)
                return
            reports.append(report)
            print(json.dumps(report, ensure_ascii=True), flush=True)
            self.send_response(204)
            self.end_headers()

    # Network targets and reports are explicit. No scan, persistent install or remote command.
    server = http.server.ThreadingHTTPServer((args.bind, args.port), Handler)
    server.timeout = 2
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    try:
        rpc = {'jsonrpc': '2.0', 'id': 'trano-probe', 'method': 'debug_qml_app',
               'params': {'manifest_url': base + '/manifest.json', 'entry_point': 'main', 'wait': False}}
        request = urllib.request.Request(f'http://{args.player}/pub/devel', data=json.dumps(rpc).encode(),
                                         headers={'Content-Type': 'application/json'})
        with opener.open(request, timeout=20) as response:
            result = json.loads(response.read(65536))
        if 'error' in result:
            raise RuntimeError('Player rejected the diagnostic: ' + json.dumps(result['error']))
        print(json.dumps({'launchAccepted': 'result' in result}), flush=True)
        deadline = time.monotonic() + 19
        while time.monotonic() < deadline:
            time.sleep(0.25)
        if not any(report.get('event') == 'started' for report in reports):
            raise RuntimeError('No startup report received; application execution is unverified.')
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        print(json.dumps({'temporaryHttpServerClosed': True, 'reportCount': len(reports)}), flush=True)


if __name__ == '__main__':
    main()
