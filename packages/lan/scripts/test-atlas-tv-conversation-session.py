"""Real TvSession, disposable HTTP and fake credentials: refresh only next/ack."""
import argparse,http.server,json,os,pathlib,sys,threading

p=argparse.ArgumentParser(description=__doc__);p.add_argument('--qt-path',type=pathlib.Path,required=True);p.add_argument('--evidence',type=pathlib.Path,required=True);args=p.parse_args()
sys.path.insert(0,str(args.qt_path.resolve()));dll=os.add_dll_directory(str(args.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QTimer,qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtNetwork import QNetworkProxy
from PyQt5 import sip
calls=[]
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self,*_):pass
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers['Content-Length'])));auth=self.headers.get('Authorization','');calls.append(self.path)
        status=200;value={}
        if self.path.endswith('/refresh'):
            number=3 if body['refresh_token']=='tv_refresh_'+'2'*64 else 5
            value={'access_token':'tv_access_'+str(number)*64,'refresh_token':'tv_refresh_'+str(number+1)*64,'expires_in':900}
        elif self.path.endswith('/library-update') or '22222222-2222-' in self.path or auth=='Bearer tv_access_'+'1'*64:status=401
        else:value={'intent':None} if self.path.endswith('/next') else {'state':'accepted'}
        data=json.dumps(value).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
messages=[];qInstallMessageHandler(lambda kind,context,value:messages.append(value));app=QGuiApplication([]);QNetworkProxy.setApplicationProxy(QNetworkProxy(QNetworkProxy.NoProxy));engine=QQmlApplicationEngine()
engine.rootContext().setContextProperty('testOrigin','http://127.0.0.1:'+str(server.server_port));source=pathlib.Path(__file__).resolve().parent.parent/'devialet/hero'
qml='''import QtQuick 2.15
import "SOURCE"
Item {
 id:root;property bool finished:false;property int callbacks:0;property bool expectedFailure:false;property bool receiverDone:false;property bool mutationDone:false
 function check(ok,why){if(!ok){console.error(why);Qt.quit();}}
 function finish(){if(receiverDone && mutationDone){finished=true;Qt.quit();}}
 function credentials(s){s.apiOrigin=testOrigin;check(s.credentials({access_token:'tv_access_'+'1'.repeat(64),refresh_token:'tv_refresh_'+'2'.repeat(64),expires_in:900}),'Fixture credentials failed');}
 TvSession {id:s;onUnavailable:{root.check(root.expectedFailure,'Premature authentication failure');root.receiverDone=true;root.finish();}}
 TvSession {id:m;onUnavailable:{root.mutationDone=true;root.finish();}}
 function done(status,value){
  check(status===200,'Receiver retry failed: '+status);callbacks++;
  if(callbacks!==2)return;
  check(s.accessToken==='tv_access_'+'3'.repeat(64),'Concurrent unauthorized calls rotated twice');expectedFailure=true;
  s.conversationApi('/tv/v1/launch-intents/22222222-2222-2222-2222-222222222222/ack',{state:'accepted'},3000,function(code){check(code===401,'Repeated unauthorized not rejected');});
 }
 Component.onCompleted:{
  credentials(s);credentials(m);
  s.conversationApi('/tv/v1/library-remove',{},3000,function(code){check(code===400,'Mutation admitted to replay transport');});
  s.conversationApi('/tv/v1/launch-intents/next',{},3000,done);
  s.conversationApi('/tv/v1/launch-intents/11111111-1111-1111-1111-111111111111/ack',{state:'accepted'},3000,done);
  m.api('/tv/v1/library-update',{},3000,function(code){check(code===401,'Mutation unauthorized fixture failed');});
 }
}'''.replace('SOURCE',source.as_uri())
try:
    engine.loadData(qml.encode(),QUrl.fromLocalFile(str(source/'conversation-session-test.qml')));QTimer.singleShot(10000,lambda:app.exit(2));code=app.exec_()
    assert code==0 and engine.rootObjects() and engine.rootObjects()[0].property('finished'),messages
    assert calls.count('/tv/v1/session/refresh')==2,calls
    assert calls.count('/tv/v1/launch-intents/next')==2,calls
    assert calls.count('/tv/v1/library-update')==1 and not any(path.endswith('/library-remove') for path in calls),calls
    assert calls.count('/tv/v1/launch-intents/11111111-1111-1111-1111-111111111111/ack')==2,calls
    assert calls.count('/tv/v1/launch-intents/22222222-2222-2222-2222-222222222222/ack')==2,calls
    assert not messages,messages
    result={'passed':True,'scope':'real Qt HTTP transport; fake credentials only','concurrent401SingleRotation':True,'nextAndAckRetriedOnce':True,'second401FailsClosed':True,'ordinaryMutationNotReplayed':True,'replayTransportRejectsMutationPath':True,'temporaryServerClosed':True}
    args.evidence.parent.mkdir(parents=True,exist_ok=True);args.evidence.write_text(json.dumps(result,indent=2),encoding='utf-8');print(json.dumps(result))
finally:sip.delete(engine);server.shutdown();server.server_close();thread.join(timeout=3)
