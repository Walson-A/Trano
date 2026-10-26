"""Serve only the design scene and an explicit illustration to one owned Player."""
import argparse
import http.server
import ipaddress
import json
import pathlib
import secrets
import threading
import urllib.request

def lan_ip(value):
    address = ipaddress.IPv4Address(value)
    if not any(address in ipaddress.IPv4Network(net) for net in ('10.0.0.0/8','172.16.0.0/12','192.168.0.0/16')):
        raise argparse.ArgumentTypeError('An explicit RFC1918 address is required')
    return str(address)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--player', required=True, type=lan_ip)
    parser.add_argument('--bind', required=True, type=lan_ip)
    parser.add_argument('--artwork', required=True, type=pathlib.Path)
    parser.add_argument('--port', type=int, default=3013)
    parser.add_argument('--launch', action='store_true', help='Required; replaces the current Player application')
    args = parser.parse_args()
    if not args.launch:
        parser.error('--launch is required; this interrupts the current Player application')
    if not 1024 <= args.port <= 65535:
        parser.error('Choose a TCP port between 1024 and 65535')
    if not args.artwork.is_file() or not 0 < args.artwork.stat().st_size <= 8*1024*1024:
        parser.error('Select a local JPEG of at most 8 MiB')
    illustration = args.artwork.read_bytes()
    if not illustration.startswith(b'\xff\xd8\xff'):
        parser.error('The illustration must be a JPEG')
    source = pathlib.Path(__file__).resolve().parent.parent/'devialet/design-scene'
    files = {name:(source/name).read_bytes() for name in ('Scene.qml','player.qml','manifest.json','qmldir')}
    files['artwork.jpg'] = illustration
    nonce = secrets.token_urlsafe(24)
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *_): pass
        def do_GET(self):
            if self.client_address[0] != args.player:
                self.send_error(403); return
            name = self.path.removeprefix('/'+nonce+'/')
            if not self.path.startswith('/'+nonce+'/') or name not in files:
                self.send_error(404); return
            data = files[name]
            self.send_response(200)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Content-Type', 'image/jpeg' if name.endswith('.jpg') else 'application/json' if name.endswith('.json') else 'text/plain; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
            print('Scene asset delivered:',name,flush=True)
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*_args,**_kwargs): return None
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    server = http.server.ThreadingHTTPServer((args.bind,args.port), Handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    try:
        url = f'http://{args.bind}:{server.server_port}/{nonce}/manifest.json'
        body = json.dumps({'jsonrpc':'2.0','id':'atlas-design-scene','method':'debug_qml_app',
                          'params':{'manifest_url':url,'entry_point':'main','wait':False}}).encode()
        request = urllib.request.Request(f'http://{args.player}/pub/devel',data=body,headers={'Content-Type':'application/json'})
        with opener.open(request,timeout=8) as response:
            reply=json.load(response)
        if reply.get('error') or not reply.get('result'):
            raise RuntimeError('The Player did not accept the SDK launch')
        print('Player accepted scene launch; awaiting visual confirmation. Server closes in 180 seconds.',flush=True)
        threading.Event().wait(180)
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
        print('Temporary scene server closed',flush=True)

if __name__ == '__main__': main()
