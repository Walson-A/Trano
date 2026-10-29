"""Bounded muted native probe of the actual EpisodePlayer; no progress endpoint.

stdin contains only {apiOrigin,path}, a diagnostic server-issued HLS capability.
The caller must revoke that diagnostic device and restore the normal app in its
finally block. No owner/access/refresh credential belongs in this process.
"""
import argparse
import http.server
import ipaddress
import json
import pathlib
import re
import secrets
import threading
import time
import urllib.request


def lan(value):
    address=ipaddress.IPv4Address(value)
    if not any(address in ipaddress.IPv4Network(v) for v in ['10.0.0.0/8','172.16.0.0/12','192.168.0.0/16']):
        raise argparse.ArgumentTypeError('Explicit RFC1918 address required')
    return str(address)


def run(args, capability):
    if capability.get('apiOrigin')!=args.origin or not re.fullmatch(r'/tv/v1/episode-media/[a-f0-9]{64}',capability.get('path','')):
        raise ValueError('Expected a closed diagnostic media capability')
    names={p.name:p.read_bytes() for p in args.bundle.iterdir() if p.is_file()}
    if len(names)>40 or sum(map(len,names.values()))>16*1024*1024 or 'EpisodePlayer.qml' not in names:
        raise ValueError('Expected the real bounded Atlas bundle')
    episode=names['EpisodePlayer.qml'].decode('utf-8').replace('\r\n','\n')
    marker="id:media;objectName:'episodeMedia';volume:1"
    if episode.count(marker)!=1:raise ValueError('Native player instrumentation anchor changed')
    episode=episode.replace(marker,marker.replace('volume:1','volume:0;muted:true'))
    episode=episode.replace("id:player\n", "id:player\n    function probeSnapshot(){return {video:media.hasVideo,audio:media.hasAudio,seekable:media.seekable,started:player.started,status:media.status,error:media.error};}\n    readonly property bool probeVideo:media.hasVideo\n    readonly property bool probeAudio:media.hasAudio\n    readonly property bool probeSeekable:media.seekable\n    readonly property int probeStatus:media.status\n    readonly property int probeError:media.error\n",1)
    if 'property bool probeVideo' not in episode:raise ValueError('Native player anchor changed')
    names['EpisodePlayer.qml']=episode.encode()
    manifest=json.loads(names['manifest.json'])
    manifest['entryPoints']['main']['file']='probe.qml'
    names['manifest.json']=json.dumps(manifest).encode()
    nonce=secrets.token_urlsafe(24)
    done=threading.Event();records=[];requested=set()
    started=time.monotonic()
    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self,*_):pass
        def allowed(self):return self.client_address[0]==args.player and not self.headers.get('Origin')
        def do_GET(self):
            if not self.allowed():self.send_error(403);return
            name=self.path.removeprefix('/'+nonce+'/')
            if not self.path.startswith('/'+nonce+'/') or name not in names:self.send_error(404);return
            data=names[name];requested.add(name)
            self.send_response(200);self.send_header('Content-Length',str(len(data)));self.send_header('Content-Type','application/json' if name.endswith('.json') else 'text/plain' if name.endswith('.qml') else 'application/octet-stream');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
        def do_POST(self):
            if not self.allowed() or self.path!='/'+nonce+'/events':self.send_error(403);return
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=4096:self.send_error(413);return
            try:
                value=json.loads(self.rfile.read(length))
                if set(value)-{'phase','position','duration','playing','video','audio','seekable','started','status','error','ok','finished'}:raise ValueError('Unexpected telemetry')
                if not all(isinstance(v,(bool,int,float,str)) and len(str(v))<100 for v in value.values()):raise ValueError('Invalid telemetry')
                if len(records)>=100:raise ValueError('Telemetry limit')
                records.append({**value,'elapsed_ms':round((time.monotonic()-started)*1000)})
                self.send_response(204);self.send_header('Content-Length','0');self.end_headers()
                if value.get('finished'):done.set()
            except (ValueError,TypeError):self.send_error(400)
    server=http.server.ThreadingHTTPServer((args.bind,args.port),Handler);server.daemon_threads=True
    endpoint=f'http://{args.bind}:{server.server_port}/{nonce}/events'
    media=capability['apiOrigin']+capability['path']
    qml='''import QtQuick 2.15
import fbx.application 1.0
Application {
 id:root
 property int phase:0
 property double stamp:0
 property int base:0
 property int target:0
 property bool finished:false
 function report(label,ok,last){
  var info=player.probeSnapshot();
  var data={phase:label,position:player.positionMs,duration:player.durationMs,playing:player.playing,video:info.video,audio:info.audio,seekable:info.seekable,started:info.started,status:info.status,error:info.error,ok:ok,finished:last};
  var xhr=new XMLHttpRequest();xhr.open('POST',ENDPOINT);xhr.setRequestHeader('Content-Type','application/json');xhr.send(JSON.stringify(data));
 }
 function finish(ok){if(finished)return;finished=true;report('complete',ok,true);player.retire();}
 Item {id:probeTransport;property bool readersEnabled:false;property bool variantsEnabled:false;property bool hlsEnabled:true;property bool artworkEnabled:false;function api(path,body,timeout,done){done(503,{});}}
 EpisodePlayer {id:player;anchors.fill:parent;title:'Atlas · contrôle HLS';chapter:'Contrôle technique silencieux';transport:probeTransport;current:({media:{anilist_id:154587},target:{numero:1,vf:false},choice:{}});onProgress:{} }
 Timer {interval:250;repeat:true;running:!root.finished;onTriggered:{
  if(player.failure || player.probeError){root.finish(false);return;}
  var now=Date.now();
  if(root.phase===0 && player.playing && player.positionMs>0 && player.durationMs>0){root.base=player.positionMs;root.stamp=now;root.phase=1;root.report('loaded',true,false);}
  else if(root.phase===1 && player.positionMs>root.base+750){root.report('advancing',true,false);player.toggle();root.stamp=now;root.base=player.positionMs;root.phase=2;}
  else if(root.phase===2 && now-root.stamp>1500){var paused=!player.playing && Math.abs(player.positionMs-root.base)<300;root.report('paused',paused,false);if(!paused){root.finish(false);return;}player.toggle();root.stamp=now;root.base=player.positionMs;root.phase=3;}
  else if(root.phase===3 && player.playing && player.positionMs>root.base+750){root.report('resumed',true,false);root.target=Math.min(player.durationMs-3000,player.positionMs+15000);player.proposedMs=root.target;player.commitSeek();root.phase=4;root.stamp=now;}
  else if(root.phase===4 && player.playing && now-root.stamp>1000 && player.positionMs>root.target+500 && player.positionMs<root.target+5000){root.report('seeked',true,false);root.finish(true);}
 }}
 Timer {interval:55000;running:true;onTriggered:root.finish(false)}
 Component.onCompleted:player.play(MEDIA,true)
}
'''.replace('ENDPOINT',json.dumps(endpoint)).replace('MEDIA',json.dumps(media))
    names['probe.qml']=qml.encode()
    if args.prepare_only:
        args.prepare_only.mkdir(parents=True,exist_ok=False)
        for name,data in names.items():(args.prepare_only/name).write_bytes(data)
        server.server_close()
        return {'passed':True,'native':False,'prepared':True}
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*_):return None
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
    try:
        plan={'jsonrpc':'2.0','id':'atlas-hls-native','method':'debug_qml_app','params':{'manifest_url':f'http://{args.bind}:{server.server_port}/{nonce}/manifest.json','entry_point':'main','wait':False}}
        request=urllib.request.Request(f'http://{args.player}/pub/devel',data=json.dumps(plan).encode(),headers={'Content-Type':'application/json'})
        with opener.open(request,timeout=8) as response:reply=json.load(response)
        if reply.get('error') or not reply.get('result'):
            error=reply.get('error') or {}
            return {'native':True,'passed':False,'sdk_accepted':False,'sdk_error_code':error.get('code') if isinstance(error,dict) else None,'requested_files':sorted(requested),'events':records,'progress_written':False}
        done.wait(65)
        success=bool(records and records[-1].get('finished') and records[-1].get('ok'))
        return {'native':True,'muted':True,'actual_component':'EpisodePlayer.qml','sdk_accepted':True,'passed':success,'requested_files':sorted(requested),'events':records,'progress_written':False}
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)


if __name__=='__main__':
    import sys
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--player',type=lan,required=True);parser.add_argument('--bind',type=lan,required=True);parser.add_argument('--port',type=int,default=0);parser.add_argument('--bundle',type=pathlib.Path,required=True);parser.add_argument('--origin',required=True);parser.add_argument('--prepare-only',type=pathlib.Path,help='Write an instrumented local fixture without launching the SDK');args=parser.parse_args()
    try:
        result=run(args,json.load(sys.stdin));print(json.dumps(result));raise SystemExit(0 if result['passed'] else 1)
    except Exception as error:print(json.dumps({'passed':False,'error_type':type(error).__name__}));raise SystemExit(1)
