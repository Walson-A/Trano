"""One-time loopback form to save an owned Player's remote code without chat or argv."""
import argparse
import http.server
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
import time
import urllib.parse

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("config", type=Path)
    parser.add_argument("device_id")
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--resume-nonce")
    args = parser.parse_args()
    if args.port != 0 and not 1024 <= args.port <= 65535:
        parser.error("Invalid loopback port")
    if args.resume_nonce and (not args.port or not re.fullmatch(r"[A-Za-z0-9_-]{32,64}", args.resume_nonce)):
        parser.error("Resuming requires the exact prior loopback port and nonce")
    config_path = args.config.resolve()
    original = config_path.read_bytes()
    config = json.loads(original.decode("utf-8"))
    devices = [d for d in config["devices"] if d["id"] == args.device_id and d["kind"] == "freebox-player"]
    if len(devices) != 1:
        parser.error("An explicit configured Freebox Player is required")
    nonce = args.resume_nonce or secrets.token_urlsafe(32)
    route = "/" + nonce
    finished = False
    origin = ""
    page = """<!doctype html><html lang="fr"><meta charset="utf-8">
<title>Code du Devialet</title><style>
body{font:17px system-ui;max-width:520px;margin:70px auto;padding:24px;background:#17191c;color:#f5f5f5}
input,button{font:inherit;padding:12px;border-radius:8px;border:1px solid #777;display:block;margin:20px 0}
input{width:90%;background:#26292d;color:white}button{cursor:pointer;background:#eee;color:#111}
p{line-height:1.6;color:#ccc}</style><h1>Code du Devialet</h1>
<p>Saisis le code télécommande réseau affiché sur ton Player.
Il sera enregistré dans le fichier privé du relais sur ce PC.</p>
<form method="post" action="SAVE"><label for="code">Code télécommande réseau</label>
<input id="code" name="code" type="password" inputmode="numeric" pattern="[0-9]{4,16}"
minlength="4" maxlength="16" autocomplete="off" required autofocus>
<button type="submit">Enregistrer le code</button></form>
<p>Cette page se ferme automatiquement après quinze minutes.</p></html>""".replace("SAVE", route + "/save").encode("utf-8")

    class Handler(http.server.BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(3)
        def log_message(self, *_):
            pass
        def allowed(self):
            return self.client_address[0] == "127.0.0.1" and self.headers.get("Host") == origin.removeprefix("http://")
        def send_page(self, status, body):
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "same-origin")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(body)
        def do_GET(self):
            if not self.allowed() or self.path != route or finished:
                self.send_error(404); return
            self.send_page(200, page)
        def do_POST(self):
            nonlocal finished
            if not self.allowed() or self.path != route + "/save" or finished or self.headers.get("Origin") not in (origin, "null"):
                # An opaque native form origin still requires the secret route and exact loopback Host.
                self.send_error(403); return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 256 or self.headers.get_content_type() != "application/x-www-form-urlencoded":
                    raise ValueError()
                form = urllib.parse.parse_qs(self.rfile.read(length).decode("ascii"), strict_parsing=True)
                value = form.get("code", [])
                if set(form) != {"code"} or len(value) != 1 or not re.fullmatch(r"[0-9]{4,16}", value[0]):
                    raise ValueError()
            except (ValueError, UnicodeError):
                self.send_error(400); return
            if config_path.read_bytes() != original:
                self.send_page(409, "Configuration modifiée pendant la saisie. Relancer le formulaire.".encode("utf-8")); return
            devices[0]["remoteCode"] = value[0]
            temporary = None
            try:
                with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=config_path.parent, prefix=".freebox-code-", suffix=".tmp", delete=False) as output:
                    temporary = Path(output.name)
                    os.chmod(temporary, 0o600)
                    json.dump(config, output, ensure_ascii=False, indent=2)
                    output.write("\n")
                os.replace(temporary, config_path)
            finally:
                if temporary and temporary.exists(): temporary.unlink()
            self.send_page(200, "<!doctype html><meta charset=utf-8><h1>Code enregistré</h1><p>Tu peux fermer cet onglet.</p>".encode("utf-8"))
            finished = True

    with http.server.HTTPServer(("127.0.0.1", args.port), Handler) as server:
        server.timeout = 1
        origin = "http://127.0.0.1:" + str(server.server_port)
        print(json.dumps({"localConfigurationUrl": origin + route}), flush=True)
        deadline = time.monotonic() + 900
        while not finished and time.monotonic() < deadline:
            server.handle_request()
    print(json.dumps({"remoteCodeConfigured": finished, "deviceId": args.device_id, "temporaryServerClosed": True}), flush=True)
    if not finished: raise SystemExit(1)

if __name__ == "__main__":
    main()
