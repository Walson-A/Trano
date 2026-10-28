"""Bounded LAN hero review on one explicit Player. Snapshot, artwork and trailers are explicit test inputs."""
import argparse,http.server,ipaddress,json,pathlib,re,secrets,threading,time,urllib.request

def lan(value):
 address=ipaddress.IPv4Address(value)
 if not any(address in ipaddress.IPv4Network(n) for n in ('10.0.0.0/8','172.16.0.0/12','192.168.0.0/16')):raise argparse.ArgumentTypeError('RFC1918 IPv4 required')
 return str(address)

def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--player',type=lan,required=True);p.add_argument('--bind',type=lan,required=True)
 p.add_argument('--snapshot',type=pathlib.Path,required=True);p.add_argument('--assets',type=pathlib.Path,required=True)
 p.add_argument('--regular',type=pathlib.Path,required=True);p.add_argument('--bold',type=pathlib.Path,required=True)
 p.add_argument('--trailer',nargs=2,action='append',default=[],metavar=('YOUTUBE_ID','MP4_FILE'))
 p.add_argument('--evidence',type=pathlib.Path,required=True);p.add_argument('--launch',action='store_true')
 p.add_argument('--port',type=int,default=3013);p.add_argument('--seconds',type=int,default=180)
 p.add_argument('--exercise',action='store_true',help='Switch Re:ZERO -> first title -> Re:ZERO automatically to observe preview lifecycle')
 p.add_argument('--initial-anime',type=int,help='Open an explicit anime from the benchmark hero list')
 args=p.parse_args()
 if not args.launch:p.error('--launch is required; this replaces the current Player application')
 if not 1024<=args.port<=65535 or not 30<=args.seconds<=300:p.error('Invalid port or trial duration')
 source=pathlib.Path(__file__).resolve().parent.parent/'devialet/hero'
 files={name:(source/name).read_bytes() for name in ('Hero.qml','HeroButton.qml','Trailer.qml','FocusCard.qml','HeroArtwork.qml','Icon.qml','Motion.js','MediaRow.qml','player.qml','manifest.json','qmldir')}
 for name in ('play','info','volume-2','volume-x'): files['icons/'+name+'.png']=(source/'icons'/(name+'.png')).read_bytes()
 files['regular.ttf']=args.regular.read_bytes();files['bold.ttf']=args.bold.read_bytes()
 snapshot=json.loads(args.snapshot.read_text(encoding='utf-8-sig'))
 nonce=secrets.token_urlsafe(24);base=f'http://{args.bind}:{args.port}/{nonce}/'
 artwork={};trailers={};events=[];stop=threading.Event()
 for file in args.assets.glob('*-banner.jpg'):
  if not re.fullmatch(r'\d+-banner\.jpg',file.name):continue
  if file.stat().st_size>8*1024*1024:p.error('Artwork exceeds 8 MiB')
  files[file.name]=file.read_bytes();artwork[file.stem.split('-')[0]]={'banner':base+file.name,'card':base+file.name}
 for identifier,file in args.trailer:
  if not re.fullmatch(r'[\w-]{11}',identifier):p.error('Invalid trailer id')
  path=pathlib.Path(file)
  if not 0<path.stat().st_size<=25*1024*1024:p.error('Trailer exceeds 25 MiB')
  name=identifier+'.mp4';files[name]=path.read_bytes();trailers[identifier]=base+name
 files['session.json']=json.dumps({'home':snapshot,'artwork':artwork,'trailers':trailers,'reportUrl':base+'report','initialAnime':args.initial_anime}).encode()
 def save():
  args.evidence.parent.mkdir(parents=True,exist_ok=True)
  args.evidence.write_text(json.dumps({'source':'explicit PC snapshot, not live catalogue','events':events},indent=2),encoding='utf-8')
 # Quit the review at its deadline; this is not a production lifecycle.
 files['player.qml']=files['player.qml'].replace(b'Application {',('Application { Timer { interval: '+str(args.seconds*1000)+'; running: true; onTriggered: Qt.quit() }').encode(),1)
 if args.exercise:
  files['player.qml']=files['player.qml'].replace(b'Application {',b'''Application {
   Timer { interval: 5000; running: true; onTriggered: { hero.selectMode('featured'); hero.choose(1); hero.zone='rail'; } }
   Timer { interval: 22000; running: true; onTriggered: hero.choose(0) }
   Timer { interval: 28000; running: true; onTriggered: hero.choose(1) }
  ''',1)
 class Handler(http.server.BaseHTTPRequestHandler):
  def log_message(self,*_):pass
  def do_GET(self):
   name=self.path.removeprefix('/'+nonce+'/')
   if self.client_address[0]!=args.player or not self.path.startswith('/'+nonce+'/') or name not in files:self.send_error(404);return
   b=files[name];start=0;end=len(b)-1;partial=False
   if name.endswith('.mp4') and self.headers.get('Range'):
    m=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers['Range'])
    if not m:self.send_error(416);return
    start=int(m[1]);end=min(end,int(m[2])) if m[2] else end;partial=True
    if start>end:self.send_error(416);return
   self.send_response(206 if partial else 200)
   self.send_header('Content-Type','video/mp4' if name.endswith('.mp4') else 'application/json' if name.endswith('.json') else 'image/jpeg' if name.endswith('.jpg') else 'application/octet-stream')
   self.send_header('Accept-Ranges','bytes');self.send_header('Cache-Control','no-store')
   if partial:self.send_header('Content-Range',f'bytes {start}-{end}/{len(b)}')
   self.send_header('Content-Length',str(max(0,end-start+1)));self.end_headers()
   try:self.wfile.write(b[start:end+1])
   except (BrokenPipeError,ConnectionResetError):pass
   if not name.endswith('.mp4'):print('Player requested '+name,flush=True)
  def do_POST(self):
   if self.client_address[0]!=args.player or self.path!='/'+nonce+'/report':self.send_error(404);return
   n=int(self.headers.get('Content-Length','0'))
   if not 0<n<=4096:self.send_error(413);return
   try:value=json.loads(self.rfile.read(n))
   except ValueError:self.send_error(400);return
   # QML emits status/numeric telemetry and known IDs only, never source URLs.
   safe={k:v for k,v in value.items() if k in ('event','id','status','code','positionMs','hasVideo','hasAudio','anilist_id') and isinstance(v,(str,int,float,bool))}
   events.append(safe);save();print(json.dumps(safe),flush=True);self.send_response(204);self.end_headers()
 server=http.server.ThreadingHTTPServer((args.bind,args.port),Handler);server.daemon_threads=True
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 try:
  opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
  body={'jsonrpc':'2.0','id':'atlas-hero','method':'debug_qml_app','params':{'manifest_url':base+'manifest.json','entry_point':'main','wait':False}}
  with opener.open(urllib.request.Request(f'http://{args.player}/pub/devel',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'}),timeout=10) as r:reply=json.load(r)
  if reply.get('error') or not reply.get('result'):raise RuntimeError('Player rejected the launch')
  print('Hero SDK launch accepted; visual confirmation required',flush=True)
  stop.wait(args.seconds+5)
 finally:
  server.shutdown();server.server_close();thread.join(timeout=3);save();print('Temporary hero server closed',flush=True)
if __name__=='__main__':main()
