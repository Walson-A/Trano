"""Run the actual QML hero against an explicit Atlas PC snapshot, no account writes."""
import argparse,json,pathlib,sys,os,time
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path',type=pathlib.Path,required=True)
parser.add_argument('--snapshot',type=pathlib.Path,required=True)
parser.add_argument('--assets',type=pathlib.Path,required=True)
parser.add_argument('--captures',type=pathlib.Path)
parser.add_argument('--font',type=pathlib.Path,action='append',default=[])
parser.add_argument('--reduced-motion',action='store_true')
parser.add_argument('--motion-export',type=pathlib.Path,help='Animated WebP of the actual QML window; requires Pillow')
args=parser.parse_args();sys.path.insert(0,str(args.qt_path.resolve()))
dll_directory=os.add_dll_directory(str(args.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QTimer,Qt,QObject,QByteArray,qInstallMessageHandler,QT_VERSION_STR
from PyQt5.QtGui import QGuiApplication,QFontDatabase,QImage
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
for k,v in {'benchmarkHome':snapshot,'benchmarkArtwork':artwork,'benchmarkFamily':family,'benchmarkTrailers':{},'benchmarkPreview':False,'benchmarkReducedMotion':args.reduced_motion}.items():context.setContextProperty(k,v)
engine.load(QUrl.fromLocalFile(str(pathlib.Path(__file__).resolve().parent.parent/'devialet/hero/desktop.qml')))
if not engine.rootObjects():raise RuntimeError('Hero QML failed to load')
window=engine.rootObjects()[0];hero=window.findChild(QObject,'atlasHero');requests=[]
def visual(name):
 stack=[window.contentItem()]
 while stack:
  item=stack.pop()
  if item.objectName()==name:return item
  stack.extend(item.childItems())
 raise RuntimeError('Visual item not found: '+name)
hero.playRequested.connect(lambda media,target:requests.append(target.toVariant()))
motion_samples=[]
if args.captures:
 QTimer.singleShot(20000,lambda:app.exit(2))
 args.captures.mkdir(parents=True,exist_ok=True)
 def shot(name):
  if not window.grabWindow().save(str(args.captures/(name+'.png'))):raise RuntimeError('Capture failed')
 def after(fn):QTimer.singleShot(500,fn)
 def initial():
  window.requestActivate();hero.forceActiveFocus()
  assert hero.property('mode')=='resume'
  shot('01-reprendre')
  QTest.keyClick(window,Qt.Key_Return)
  assert requests and requests[0]['numero']==13 and requests[0]['vf'] is True, 'Resume action failed: '+str(requests)
  QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
  assert hero.property('mode')=='featured'
  QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Right)
  after(selected)
 def selected():
  assert hero.property('selectedIndex')==1
  shot('02-selection-rezero')
  if args.reduced_motion:
   assert abs(visual('heroCard1').property('surfaceScale')-1)<0.001
   selected_detail();return
  (args.captures/'motion').mkdir(exist_ok=True)
  shot('motion/00-start')
  QTest.keyClick(window,Qt.Key_Right)
  QTimer.singleShot(40,motion_mid)
 def motion_mid():
  scale=float(visual('heroCard2').property('surfaceScale'))
  assert 1<scale<=1.071,'Focus must grow progressively'
  motion_samples.append({'phase':'enter','scale':scale})
  motion_reverse()
 def motion_reverse():
  before=float(visual('heroCard2').property('surfaceScale'))
  assert before<1.0695,'Reversal must be tested before the animation settles'
  # Set the same public selection property directly so QTest's key-event pump
  # cannot advance the renderer between the before/after interruption samples.
  hero.setProperty('selectedIndex',1)
  after_scale=float(visual('heroCard2').property('surfaceScale'))
  assert abs(before-after_scale)<0.005,'Reversal snapped instead of retargeting'
  motion_samples.append({'phase':'reverse','before':before,'after':after_scale})
  QTimer.singleShot(40,motion_return)
 def motion_return():
  scale=float(visual('heroCard2').property('surfaceScale'))
  assert 1<=scale<=motion_samples[-1]['before']+0.001
  motion_samples.append({'phase':'return','scale':scale})
  shot('motion/03-return')
  QTimer.singleShot(180,motion_done)
 def motion_done():
  assert hero.property('selectedIndex')==1
  assert abs(visual('heroCard2').property('surfaceScale')-1)<0.001
  assert abs(visual('heroCard1').property('surfaceScale')-1.07)<0.001
  shot('motion/04-settled');selected_detail()
 def selected_detail():
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
  QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Right)
  after(rail_end)
 def rail_end():
  rail=hero.findChild(QObject,'heroRail')
  assert hero.property('selectedIndex')==len(snapshot['hero'])-1
  shot('07-fin-liste')
  for _ in range(len(snapshot['hero'])-1):QTest.keyClick(window,Qt.Key_Left)
  after(rail_start)
 def rail_start():
  rail=hero.findChild(QObject,'heroRail')
  assert hero.property('selectedIndex')==0
  before=float(rail.property('contentX'))
  origin=float(rail.property('originX'))
  print(json.dumps({'railFirstContentX':before,'railOriginX':origin}),flush=True)
  assert abs(before-origin)<0.5,'First selection did not restore the beginning of the rail'
  shot('08-retour-debut')
  QTest.keyClick(window,Qt.Key_Left)
  after(lambda:rail_extra_left(before))
 def rail_extra_left(before):
  rail=hero.findChild(QObject,'heroRail')
  assert abs(float(rail.property('contentX'))-before)<0.5,'An extra Left shifted the rail'
  window.resize(1920,1080);after(large)
 def large():
  shot('05-1080p')
  without_resume=json.loads(json.dumps(snapshot));without_resume['rangees']=[r for r in without_resume['rangees'] if r['id']!='reprendre']
  hero.setProperty('homeData',without_resume);hero.setProperty('selectedIndex',0)
  hero.setProperty('mode','featured');after(no_resume)
 def no_resume():
  shot('06-sans-reprise')
  bad=[m for m in messages if any(s in m for s in ('ReferenceError','TypeError','Binding loop','Cannot assign','Unable to assign','is not a type','Failed to create'))]
  result={'qt':QT_VERSION_STR,'captures':8,'source':'actual Hero.qml + explicit PC snapshot','playTarget':requests[0], 'railReturn':'first selection aligns with origin; extra Left does not move the rail','reducedMotion':args.reduced_motion,'focusMotion':motion_samples,'errors':bad,'devialetValidated':False}
  (args.captures/'verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
  print(json.dumps(result),flush=True)
  if args.motion_export and not bad:
   window.resize(960,540);hero.setProperty('homeData',snapshot);hero.setProperty('mode','featured');hero.setProperty('selectedIndex',0);hero.setProperty('zone','rail')
   QTimer.singleShot(600,record_motion)
  else:app.exit(1 if bad else 0)
 frames=[];frame_times=[];record_start=[0];next_event=[0]
 sequence=[(350,1),(950,2),(1030,1),(1550,4),(2100,5),(2650,0)]
 def record_motion():
  record_start[0]=time.monotonic();capture_frame()
 def capture_frame():
  from PIL import Image
  elapsed=int((time.monotonic()-record_start[0])*1000)
  while next_event[0]<len(sequence) and elapsed>=sequence[next_event[0]][0]:
   hero.setProperty('selectedIndex',sequence[next_event[0]][1]);next_event[0]+=1
  img=window.grabWindow().convertToFormat(QImage.Format_RGBA8888)
  pixels=img.bits();pixels.setsize(img.byteCount())
  frames.append(Image.frombytes('RGBA',(img.width(),img.height()),bytes(pixels)))
  frame_times.append(int((time.monotonic()-record_start[0])*1000))
  if elapsed<3200:QTimer.singleShot(8,capture_frame)
  else:
   durations=[max(20,b-a) for a,b in zip(frame_times,frame_times[1:])]+[500]
   args.motion_export.parent.mkdir(parents=True,exist_ok=True)
   frames[0].save(args.motion_export,format='WEBP',save_all=True,append_images=frames[1:],duration=durations,loop=0,quality=85,method=4)
   args.motion_export.with_suffix('.json').write_text(json.dumps({'frames':len(frames),'capturedElapsedMs':frame_times[-1],'sequence':sequence,'note':'Real QML captures, duration reflects capture intervals; not a native TV frame-rate measurement'},indent=2),encoding='utf-8')
   app.quit()
 QTimer.singleShot(1800,initial)
exit_code=app.exec_()
window.close()
from PyQt5 import sip
sip.delete(engine)
sys.exit(exit_code)
