"""Bounded native EpisodePlayer probe of an explicit local trailer; no account/progress."""
import argparse,hashlib,http.server,ipaddress,json,pathlib,re,secrets,threading,time,urllib.request


def lan(value):
    address=ipaddress.IPv4Address(value)
    if not address.is_private or address.is_loopback:raise argparse.ArgumentTypeError('Explicit private LAN address required')
    return str(address)


def run(args):
    clip=args.video.read_bytes()
    if not 0<len(clip)<32*1024*1024:raise ValueError('Expected a bounded explicit MP4')
    files={p.name:p.read_bytes() for p in args.bundle.iterdir() if p.is_file()}
    if len(files)>48 or sum(map(len,files.values()))>16*1024*1024:raise ValueError('Unexpected bundle')
    source=files['EpisodePlayer.qml'].decode('utf-8').replace('\r\n','\n')
    marker='    function clock(ms)'
    assert source.count(marker)==1
    source=source.replace(marker,"    function nativeSnapshot(){return {video:media.hasVideo,audio:media.hasAudio,status:media.status,error:media.error,position:media.position,duration:media.duration,playing:player.playing};}\n"+marker)
    files['EpisodePlayer.qml']=source.encode()
    if args.layout_compare or args.single_trailer:
        text=files['Trailer.qml'].decode('utf-8').replace('\r\n','\n')
        text=text.replace('    signal observed(var observation)',"    function nativeSnapshot(){return {video:media.hasVideo,audio:media.hasAudio,status:media.status,error:media.error,position:media.position,duration:media.duration,playing:preview.playing,ready:preview.ready,state:media.playbackState,playingEnum:MediaPlayer.PlayingState,rawPlaying:media.playbackState===MediaPlayer.PlayingState};}\n    signal observed(var observation)")
        files['Trailer.qml']=text.encode()
        text=files['Hero.qml'].decode('utf-8').replace('\r\n','\n').replace('    property var homeData:', '    readonly property var nativePreview:preview.item\n    property var homeData:',1)
        assert 'readonly property var nativePreview' in text;files['Hero.qml']=text.encode()
    manifest=json.loads(files['manifest.json']);manifest['entryPoints']['main']['file']='native-probe.qml';files['manifest.json']=json.dumps(manifest).encode()
    nonce=secrets.token_urlsafe(24);records=[];requested=set();done=threading.Event();start=time.monotonic()
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self,*_):pass
        def allowed(self):return self.client_address[0]==args.player and not self.headers.get('Origin')
        def do_GET(self):
            if not self.allowed() or not self.path.startswith('/'+nonce+'/'):self.send_error(403);return
            name=self.path[len(nonce)+2:]
            if name=='trailer.mp4':
                lo,hi,status=0,len(clip)-1,200
                if self.headers.get('Range'):
                    match=re.fullmatch(r'bytes=(\d+)-(\d*)',self.headers['Range'])
                    if not match:self.send_error(416);return
                    lo=int(match[1]);hi=min(hi,int(match[2])) if match[2] else hi;status=206
                    if lo>hi or lo>=len(clip):self.send_error(416);return
                requested.add('trailer.mp4');data=clip[lo:hi+1]
                self.send_response(status);self.send_header('Content-Type','video/mp4');self.send_header('Accept-Ranges','bytes')
                if status==206:self.send_header('Content-Range',f'bytes {lo}-{hi}/{len(clip)}')
            elif name in files:
                requested.add(name);data=files[name];self.send_response(200);self.send_header('Content-Type','application/json' if name.endswith('.json') else 'application/octet-stream')
            else:self.send_error(404);return
            self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.end_headers()
            try:self.wfile.write(data)
            except (BrokenPipeError,ConnectionResetError):pass
        def do_POST(self):
            if not self.allowed() or self.path!='/'+nonce+'/events':self.send_error(403);return
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=2048:self.send_error(413);return
            value=json.loads(self.rfile.read(length))
            allowed={'video','audio','status','error','position','duration','playing','clock','finished','phase','heroVideo','heroPosition','detailVideo','detailAudio','detailPosition','detailStatus','detailReady','heroPresent','ready','state','playingEnum','rawPlaying'}
            if set(value)-allowed or len(records)>=40 or not all(isinstance(v,(int,float,bool)) for v in value.values()):self.send_error(400);return
            records.append(dict(value,elapsedMs=round((time.monotonic()-start)*1000)))
            self.send_response(204);self.send_header('Content-Length','0');self.end_headers()
            if value.get('finished'):done.set()
    server=http.server.ThreadingHTTPServer((args.bind,0),Handler);server.daemon_threads=True
    base=f'http://{args.bind}:{server.server_port}/{nonce}/'
    files['native-probe.qml']=('''import QtQuick 2.15
import fbx.application 1.0
Application {
 id:root
 property int ticks:0
 function report(last){var value=player.nativeSnapshot();value.clock=Date.now();value.finished=last;var xhr=new XMLHttpRequest();xhr.open('POST',ENDPOINT);xhr.setRequestHeader('Content-Type','application/json');xhr.send(JSON.stringify(value));}
 Item {id:probeTransport;property bool readersEnabled:false;property bool variantsEnabled:false;property bool hlsEnabled:false;property bool artworkEnabled:false;property bool airingEnabled:false;function api(path,body,timeout,done){done(503,{});}}
 EpisodePlayer {id:player;anchors.fill:parent;title:'Re:ZERO';chapter:'Bande-annonce · diagnostic vidéo';transport:probeTransport;onProgress:{} }
 Timer {interval:2000;repeat:true;running:true;onTriggered:{root.ticks++;root.report(root.ticks>=10);if(root.ticks>=10){stop();player.retire();}}}
 Component.onCompleted:player.play(MEDIA,true)
}
'''.replace('ENDPOINT',json.dumps(base+'events')).replace('MEDIA',json.dumps(base+'trailer.mp4'))).encode()
    if args.layout_compare:
        files['native-probe.qml']=('''import QtQuick 2.15
import fbx.application 1.0
Application {
 id:root;property int ticks:0;property int phase:0
 FontLoader {id:regular;source:'regular.ttf'}
 property var card:({anilist_id:21355,titre:'Re:ZERO · diagnostic vidéo',bande_annonce:'vFfXjuVA1Jk',banniere:'',affiche:'',synopsis:'Comparaison du même fichier sur les lecteurs natifs.'})
 function report(last){var h=hero.nativePreview ? hero.nativePreview.nativeSnapshot() : null,d=detail.nativeSnapshot();var value={phase:phase,finished:last,heroPresent:!!h,heroVideo:!!h && h.video,heroPosition:h ? h.position : 0,detailVideo:d.video,detailAudio:d.audio,detailPosition:d.position,detailStatus:d.status,detailReady:detail.videoReady};var xhr=new XMLHttpRequest();xhr.open('POST',ENDPOINT);xhr.setRequestHeader('Content-Type','application/json');xhr.send(JSON.stringify(value));}
 Item {id:probeTransport;property bool readersEnabled:false;property bool variantsEnabled:false;property bool hlsEnabled:false;property bool artworkEnabled:false;property bool airingEnabled:false;function api(path,body,timeout,done){done(503,{});}}
 Item {width:1280;height:720;scale:Math.min(parent.width/1280,parent.height/720);transformOrigin:Item.TopLeft
  Hero {id:hero;anchors.fill:parent;family:regular.name || 'sans-serif';keepPreviewLoaded:true;homeData:({hero:[root.card],rangees:[]});onTrailerRequested:{var sources={};sources[root.card.bande_annonce]=MEDIA;trailerSources=sources;}}
  EpisodePlayer {id:detail;x:0;y:0;width:1280;height:root.phase===1 ? 308 : 720;visible:root.phase>0;trailerMode:true;inlinePreview:root.phase===1;title:'Re:ZERO';chapter:'Diagnostic natif';family:regular.name || 'sans-serif';transport:probeTransport;onProgress:{}}
  Rectangle {x:0;y:308;width:1280;height:412;visible:root.phase===1;color:'#090a0d'}
  Rectangle {x:700;y:18;width:550;height:48;radius:8;z:100;color:'#ee111111';Text {anchors.centerIn:parent;color:'white';font.pixelSize:20;text:['1/5 · Héros','2/5 · Fiche','3/5 · Plein écran','4/5 · Héros masqué','5/5 · Premier lecteur libéré'][root.phase]}}
 }
 Timer {interval:2000;repeat:true;running:true;onTriggered:{
  root.ticks++;root.report(root.ticks>=30);
  if(root.ticks===6){root.phase=1;hero.previewEnabled=false;detail.play(MEDIA,true);}
  if(root.ticks===12){root.phase=2;detail.reveal();detail.forceActiveFocus();}
  if(root.ticks===18){root.phase=3;hero.visible=false;}
  if(root.ticks===24){root.phase=4;hero.keepPreviewLoaded=false;detail.retire();Qt.callLater(function(){detail.play(MEDIA,true);});}
  if(root.ticks>=30){stop();detail.retire();}
 }}
}
'''.replace('ENDPOINT',json.dumps(base+'events')).replace('MEDIA',json.dumps(base+'trailer.mp4'))).encode()
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    if args.single_trailer:
        files['native-probe.qml']=('''import QtQuick 2.15
import fbx.application 1.0
Application {
 id:root;property int ticks:0;property int phase:0
 Item {width:1280;height:720;scale:Math.min(parent.width/1280,parent.height/720);transformOrigin:Item.TopLeft
  Rectangle {anchors.fill:parent;color:'#090a0d'}
  Loader {id:preview;width:1280;height:root.phase===0 ? 620 : root.phase===1 ? 308 : 720;source:'Trailer.qml';onLoaded:{item.fitFrame=false;item.play(MEDIA);}}
  Rectangle {x:0;y:308;width:1280;height:412;color:'#090a0d';visible:root.phase===1}
  Rectangle {x:640;y:20;width:600;height:48;radius:8;color:'#dd151515';Text {anchors.centerIn:parent;color:'white';font.pixelSize:20;text:['1/3 · Lecteur du héros','2/3 · Même lecteur, format fiche','3/3 · Même lecteur, plein écran'][root.phase]}}
 }
 Timer {interval:2000;repeat:true;running:true;onTriggered:{
  root.ticks++;if(preview.item){var value=preview.item.nativeSnapshot();value.phase=root.phase;value.finished=root.ticks>=18;var xhr=new XMLHttpRequest();xhr.open('POST',ENDPOINT);xhr.setRequestHeader('Content-Type','application/json');xhr.send(JSON.stringify(value));}
  if(root.ticks===6)root.phase=1;if(root.ticks===12)root.phase=2;if(root.ticks>=18)stop();
 }}
}
'''.replace('ENDPOINT',json.dumps(base+'events')).replace('MEDIA',json.dumps(base+'trailer.mp4'))).encode()
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*_):return None
    try:
        opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
        body={'jsonrpc':'2.0','id':'atlas-trailer-native','method':'debug_qml_app','params':{'manifest_url':base+'manifest.json','entry_point':'main','wait':False}}
        req=urllib.request.Request('http://'+args.player+'/pub/devel',data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
        with opener.open(req,timeout=10) as response:reply=json.load(response)
        assert reply.get('result') and not reply.get('error'),'SDK rejected probe'
        duration=36 if args.single_trailer else 60 if args.layout_compare else 20
        print(json.dumps({'sdkAccepted':True,'nativeProbeStarted':True,'durationSeconds':duration}),flush=True)
        done.wait(duration+15)
        result={'sdkAccepted':True,'mediaRequested':'trailer.mp4' in requested,'requestedFiles':sorted(requested),'events':records,'videoSha256':hashlib.sha256(clip).hexdigest(),'progressWritten':False,'physicalPictureConfirmed':False}
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)
    result['temporaryServerClosed']=True
    args.evidence.write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result),flush=True)


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--player',type=lan,required=True);p.add_argument('--bind',type=lan,required=True)
    p.add_argument('--bundle',type=pathlib.Path,required=True);p.add_argument('--video',type=pathlib.Path,required=True);p.add_argument('--evidence',type=pathlib.Path,required=True)
    p.add_argument('--layout-compare',action='store_true',help='Compare the actual Hero and EpisodePlayer with the same explicit clip for 60 seconds')
    p.add_argument('--single-trailer',action='store_true',help='One unchanged Hero Trailer instance, only its dimensions change, for 36 seconds')
    run(p.parse_args())
