"""Explicit temporary QML runtime or silent-video probe on an owned Freebox Player."""
import argparse
import http.server
import ipaddress
import json
import pathlib
import re
import secrets
import subprocess
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


def video_range(header, size):
    """Only one bounded byte range; suffix and open-ended requests are supported."""
    if header is None:
        return 0, size - 1, 200
    match = re.fullmatch(r'bytes=(\d*)-(\d*)', header)
    if not match or not any(match.groups()):
        raise ValueError('Invalid range')
    first, last = match.groups()
    if first:
        start = int(first)
        end = min(int(last), size - 1) if last else size - 1
    else:
        length = int(last)
        if length == 0:
            raise ValueError('Invalid range')
        start, end = max(0, size - length), size - 1
    if start > end or start >= size:
        raise ValueError('Unsatisfiable range')
    return start, end, 206


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--player', required=True, type=private_ipv4)
    parser.add_argument('--samsung', type=private_ipv4)
    parser.add_argument('--bind', required=True, type=private_ipv4)
    parser.add_argument('--server-url', default='')
    parser.add_argument('--port', type=int, default=3013)
    media = parser.add_mutually_exclusive_group()
    media.add_argument('--media', action='store_true', help='Probe QtMultimedia types without loading or playing a video.')
    media.add_argument('--video-file', type=pathlib.Path, help='Play one H264 MP4, at most 20 seconds, without audio. Requires ffprobe.')
    media.add_argument('--startup-api', action='store_true', help='Read only native App member names; never reads settings values or calls a setter.')
    parser.add_argument('--launch', action='store_true', help='Required: may interrupt the Player display.')
    args = parser.parse_args()
    if not args.launch:
        parser.error('--launch is required; the QML application may interrupt the Player display.')
    if not 1024 <= args.port <= 65535:
        parser.error('--port must be between 1024 and 65535.')
    if not args.video_file and not args.startup_api and not args.samsung:
        parser.error('--samsung is required for the network probe; video/startup modes only contact the Player.')
    video = None
    if args.video_file:
        if not args.video_file.is_file() or not 0 < args.video_file.stat().st_size <= 16 * 1024 * 1024:
            parser.error('Video must be an explicit local file of at most 16 MiB.')
        metadata = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(args.video_file)], timeout=15))
        streams = metadata.get('streams', [])
        if len(streams) != 1 or streams[0].get('codec_type') != 'video' or streams[0].get('codec_name') != 'h264' or not 0 < float(metadata['format']['duration']) <= 20:
            parser.error('A single H264 video stream, no audio, and a duration of at most 20 seconds are required.')
        video = args.video_file.read_bytes()
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
    config = {'reportUrl': base + '/report', 'samsungUrl': f'http://{args.samsung}:8001/api/v2/', 'serverUrl': args.server_url, 'mediaProbe': args.media, 'videoUrl': base + '/test.mp4'}
    source = pathlib.Path(__file__).resolve().parent.parent / 'devialet' / ('startup-probe.qml' if args.startup_api else 'video-probe.qml' if video else 'probe.qml')
    qml = source.read_text(encoding='utf-8').replace('__TRANO_PROBE_CONFIG__', json.dumps(config))
    manifest = {'name': 'Trano diagnostic reseau', 'identifier': 'fr.trano.runtimeprobe',
                'description': 'Diagnostic temporaire en lecture seule', 'capabilities': {'net_wan': 'required'},
                'entryPoints': {'main': {'file': 'probe.qml', 'default': True}}}
    reports = []
    video_requests = []

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
            if video and self.path == f'/{nonce}/test.mp4':
                try:
                    start, end, status = video_range(self.headers.get('Range'), len(video))
                except ValueError:
                    self.send_response(416)
                    self.send_header('Content-Range', f'bytes */{len(video)}')
                    self.end_headers()
                    return
                video_requests.append({'status': status, 'start': start, 'end': end})
                self.send_response(status)
                self.send_header('Content-Type', 'video/mp4')
                self.send_header('Accept-Ranges', 'bytes')
                self.send_header('Content-Length', str(end - start + 1))
                self.send_header('Cache-Control', 'no-store')
                if status == 206:
                    self.send_header('Content-Range', f'bytes {start}-{end}/{len(video)}')
                self.end_headers()
                try:
                    self.wfile.write(video[start:end + 1])
                except (BrokenPipeError, ConnectionResetError):
                    pass
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
        deadline = time.monotonic() + (7 if args.startup_api else 28 if video else 19)
        while time.monotonic() < deadline:
            time.sleep(0.25)
        if not any(report.get('event') == 'started' for report in reports):
            raise RuntimeError('No startup report received; application execution is unverified.')
        if video:
            progress = [r.get('positionMs', 0) for r in reports if r.get('event') == 'video_tick']
            result = {'videoRequested': bool(video_requests), 'positionAdvanced': max(progress, default=0) >= 2000,
                      'maxPositionMs': max(progress, default=0), 'physicalPictureConfirmed': False}
            print(json.dumps(result), flush=True)
            if not result['videoRequested'] or not result['positionAdvanced']:
                raise RuntimeError('Video playback is not established; inspect module/backend reports.')
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        print(json.dumps({'temporaryHttpServerClosed': True, 'reportCount': len(reports)}), flush=True)


if __name__ == '__main__':
    main()
