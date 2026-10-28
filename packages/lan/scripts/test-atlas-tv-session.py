"""Exercise the real Qt5 session over disposable HTTP; never reads account credentials."""
import argparse
import http.server
import json
import os
import pathlib
import sys
import tempfile
import threading

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path', type=pathlib.Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.qt_path.resolve()))
dll = os.add_dll_directory(str(args.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl, QTimer, QObject, qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtNetwork import QNetworkProxy
from PyQt5 import sip

calls=[]
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_): pass
    def answer(self, value):
        data=json.dumps(value).encode()
        self.send_response(200)
        self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',str(len(data)))
        self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        calls.append(('GET', self.path, None))
        self.answer({'protocol':1,'apiOrigin':origin,'activation':{'code':'tv_pair_'+'1'*64}})
    def do_POST(self):
        body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        calls.append(('POST',self.path,self.headers.get('Authorization')))
        if self.path.endswith('/refresh'):
            assert body=={'refresh_token':'tv_refresh_'+'2'*64}
            self.answer({'access_token':'tv_access_'+'3'*64,'refresh_token':'tv_refresh_'+'4'*64,'expires_in':900})
        else:
            assert self.headers.get('Authorization') in ['Bearer tv_access_'+'1'*64, 'Bearer tv_access_'+'3'*64]
            self.answer({'hero':[],'rangees':[],'complements_a_charger':False})

server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
origin='http://127.0.0.1:'+str(server.server_port)
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
messages=[]
qInstallMessageHandler(lambda kind,context,value: messages.append(value))
app=QGuiApplication([])
QNetworkProxy.setApplicationProxy(QNetworkProxy(QNetworkProxy.NoProxy))
engine=QQmlApplicationEngine()
source=pathlib.Path(__file__).resolve().parent.parent/'devialet/hero'
engine.rootContext().setContextProperty('testOrigin',origin)
engine.loadData(('''import QtQuick 2.15
import "%s"
Item {
    property int callbacks:0
    property bool finished:false
    TvSession { id:s; objectName:"session"; onHomeLoaded: {
        s.expiresAt=0;
        s.api('/tv/v1/catalog/home',{},3000,root.done);
        s.api('/tv/v1/catalog/home',{},3000,root.done);
    } }
    id:root
    function check(ok,why) { if(!ok) { console.error(why); Qt.quit(); } }
    function done(status,value) {
        check(status===200 && Array.isArray(value.hero),'Authenticated request failed');
        callbacks++;
        if(callbacks!==2) return;
        check(s.mediaUrl('/tv/v1/episode-media/'+'a'.repeat(64),'episode')===testOrigin+'/tv/v1/episode-media/'+'a'.repeat(64),'Episode path rejected');
        check(s.mediaUrl('https://untrusted.example/video','episode')==='','External media accepted');
        check(s.mediaUrl('/tv/v1/preview-media/'+'a'.repeat(64)+'?x=1','trailer')==='','Query accepted');
        // HTTP runtime must fail closed before any activation POST.
        s.start(testOrigin+'/runtime.json');
    }
    Connections { target:s; function onUnavailable() { root.finished=true; Qt.quit(); } }
    Component.onCompleted: {
        s.apiOrigin=testOrigin;
        check(s.credentials({access_token:'tv_access_'+'1'.repeat(64),refresh_token:'tv_refresh_'+'2'.repeat(64),expires_in:900}),'Credentials rejected');
        s.loadHome();
    }
}''' % source.as_uri()).encode(), QUrl.fromLocalFile(str(source/'session-test.qml')))
QTimer.singleShot(10000,lambda:app.exit(2))
code=app.exec_()
try:
    assert code==0 and engine.rootObjects() and engine.rootObjects()[0].property('finished'), {'messages':messages,'calls':calls,'state':engine.rootObjects()[0].findChild(QObject,'session').property('state') if engine.rootObjects() else None}
    assert sum(c[1].endswith('/refresh') for c in calls)==1, 'Concurrent requests rotated twice'
    assert not any(c[1].endswith('/activate') for c in calls), 'Untrusted runtime activated'
    assert not any('Error' in m or 'failed' in m or 'accepted' in m or 'rejected' in m for m in messages),messages
    print(json.dumps({'passed':True,'httpRequests':len(calls),'singleRotationForConcurrentCalls':True,'untrustedRuntimeRejected':True,'closedMediaPaths':True}))
finally:
    sip.delete(engine); server.shutdown();server.server_close();thread.join(timeout=3)
