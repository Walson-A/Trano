"""Run the actual QML hero against an explicit Atlas PC snapshot, no account writes."""
import argparse,json,pathlib,sys,os
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path',type=pathlib.Path,required=True)
parser.add_argument('--snapshot',type=pathlib.Path,required=True)
parser.add_argument('--assets',type=pathlib.Path,required=True)
parser.add_argument('--captures',type=pathlib.Path)
parser.add_argument('--font',type=pathlib.Path,action='append',default=[])
args=parser.parse_args();sys.path.insert(0,str(args.qt_path.resolve()))
dll_directory=os.add_dll_directory(str(args.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QTimer,Qt,QObject,QByteArray,qInstallMessageHandler,QT_VERSION_STR
from PyQt5.QtGui import QGuiApplication,QFontDatabase
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow
from PyQt5.QtTest import QTest
messages=[]
def message(kind,context,value):messages.append(value);print('Qt: '+value,flush=True)
qInstallMessageHandler(message)
app=QGuiApplication([]);family='Segoe UI'
for path in args.font:
 fid=QFontDatabase.addApplicationFontFromData(QByteArray(path.read_bytes()))
 families=QFontDatabase.applicationFontFamilies(fid)
 if not families:raise RuntimeError('Font unavailable')
 family=families[0]
snapshot=json.loads(args.snapshot.read_text(encoding='utf-8-sig'))
artwork={}
for p in args.assets.glob('*-banner.jpg'):
 artwork[p.stem.split('-')[0]]={'banner':QUrl.fromLocalFile(str(p.resolve())).toString(),'card':QUrl.fromLocalFile(str(p.resolve())).toString()}
engine=QQmlApplicationEngine();context=engine.rootContext()
for k,v in {'benchmarkHome':snapshot,'benchmarkArtwork':artwork,'benchmarkFamily':family,'benchmarkTrailers':{},'benchmarkPreview':False}.items():context.setContextProperty(k,v)
engine.load(QUrl.fromLocalFile(str(pathlib.Path(__file__).resolve().parent.parent/'devialet/hero/desktop.qml')))
if not engine.rootObjects():raise RuntimeError('Hero QML failed to load')
window=engine.rootObjects()[0];hero=window.findChild(QObject,'atlasHero');requests=[]
hero.playRequested.connect(lambda media,target:requests.append(target.toVariant()))
if args.captures:
 QTimer.singleShot(20000,lambda:app.exit(2))
 args.captures.mkdir(parents=True,exist_ok=True)
 def shot(name):
  if not window.grabWindow().save(str(args.captures/(name+'.png'))):raise RuntimeError('Capture failed')
 def after(fn):QTimer.singleShot(400,fn)
 def initial():
  assert hero.property('mode')=='resume'
  shot('01-reprendre')
  QTest.keyClick(window,Qt.Key_Return)
  assert requests and requests[0]['numero']==13 and requests[0]['vf'] is True
  QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
  assert hero.property('mode')=='featured'
  QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Right)
  after(selected)
 def selected():
  assert hero.property('selectedIndex')==1
  shot('02-selection-rezero')
  QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
  assert hero.property('detailOpen')
  after(detail)
 def detail():
  shot('03-infos');QTest.keyClick(window,Qt.Key_Escape)
  assert not hero.property('detailOpen')
  QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Right)
  after(long_title)
 def long_title():
  assert hero.property('selectedIndex')==3
  title=hero.findChild(QObject,'heroTitle')
  assert not title.property('truncated'),'Title truncated'
  shot('04-titre-long')
  window.resize(1920,1080);after(large)
 def large():
  shot('05-1080p')
  without_resume=json.loads(json.dumps(snapshot));without_resume['rangees']=[r for r in without_resume['rangees'] if r['id']!='reprendre']
  hero.setProperty('homeData',without_resume);hero.setProperty('selectedIndex',0)
  hero.setProperty('mode','featured');after(no_resume)
 def no_resume():
  shot('06-sans-reprise')
  bad=[m for m in messages if any(s in m for s in ('ReferenceError','TypeError','Binding loop','Cannot assign','is not a type','Failed to create'))]
  result={'qt':QT_VERSION_STR,'captures':6,'source':'actual Hero.qml + explicit PC snapshot','playTarget':requests[0], 'errors':bad,'devialetValidated':False}
  (args.captures/'verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
  print(json.dumps(result),flush=True);app.exit(1 if bad else 0)
 QTimer.singleShot(1800,initial)
sys.exit(app.exec_())
