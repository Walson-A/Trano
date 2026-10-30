"""Review actual Hero rows with an explicit PC snapshot and local images; no API/media."""
import argparse, importlib.util, json, os, pathlib, sys, tempfile

p=argparse.ArgumentParser(description=__doc__)
for name in ['qt-path','snapshot','assets','regular','bold','evidence']:
    p.add_argument('--'+name,type=pathlib.Path,required=True)
p.add_argument('--observe-only',action='store_true')
p.add_argument('--reduced-motion',action='store_true')
a=p.parse_args();sys.path.insert(0,str(a.qt_path.resolve()))
dll=os.add_dll_directory(str(a.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QPointF,QByteArray,QObject,Qt,qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication,QFontDatabase
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow,QQuickItem
from PyQt5.QtTest import QTest
from PyQt5 import sip

messages=[];qInstallMessageHandler(lambda k,c,m:messages.append(m))
app=QGuiApplication([])
for font in [a.regular,a.bold]:
    fid=QFontDatabase.addApplicationFontFromData(QByteArray(font.read_bytes()));assert fid>=0
family=QFontDatabase.applicationFontFamilies(fid)[0]
snapshot=json.loads(a.snapshot.read_text(encoding='utf-8-sig'))
art={}
for path in a.assets.glob('*-banner.jpg'):
    art[path.stem.split('-')[0]]={'banner':path.resolve().as_uri(),'card':path.resolve().as_uri()}
for card in snapshot.get('hero',[])+[c for row in snapshot.get('rangees',[]) for c in row.get('cartes',[])]:
    card['banniere']=art.get(str(card.get('anilist_id')),{}).get('banner','')
    card['affiche']=card['banniere']
a.evidence=a.evidence.resolve();a.evidence.mkdir(parents=True,exist_ok=False)
spec=importlib.util.spec_from_file_location('pack',pathlib.Path(__file__).with_name('package-atlas-tv-hero.py'))
pack=importlib.util.module_from_spec(spec);spec.loader.exec_module(pack)
measurements=[];requests=[]
with tempfile.TemporaryDirectory(prefix='home-browse-',dir=a.evidence.parent) as tmp:
    root=pathlib.Path(tmp);pack.build(root/'bundle',a.regular,a.bold)
    engine=QQmlApplicationEngine();context=engine.rootContext()
    for key,value in {'testHome':snapshot,'testArt':art,'testFamily':family,'testReduced':a.reduced_motion}.items():context.setContextProperty(key,value)
    engine.loadData(b'''import QtQuick 2.15
import QtQuick.Window 2.2
import "bundle"
Window { width:1280;height:720;visible:true
 Hero {id:hero;objectName:'hero';family:testFamily;homeData:testHome;artworkMap:testArt;previewEnabled:false;libraryEnabled:true;reducedMotion:testReduced
  scale:Math.min(parent.width/1280,parent.height/720);transformOrigin:Item.TopLeft
 }
}''',QUrl.fromLocalFile(str(root/'bench.qml')))
    assert engine.rootObjects(),messages
    window=engine.rootObjects()[0];hero=window.findChild(QObject,'hero')
    hero.playRequested.connect(lambda media,target:requests.append(target.toVariant()))
    def visual(item,name):
        if item.objectName()==name:return item
        for child in item.childItems():
            found=visual(child,name)
            if found:return found
    def at(name):
        found=visual(hero,name);assert found is not None,name;return found
    def point(item):return item.mapToItem(hero,QPointF(0,0))
    def key(value):QTest.keyClick(window,value);QTest.qWait(260)
    def capture(name):
        assert window.grabWindow().save(str(a.evidence/(name+'.png')))
        title=at('heroTitle');rails=at('heroRows')
        measurements.append({'case':name,'row':hero.property('selectedRow'),'index':hero.property('selectedIndex'),'zone':hero.property('zone'),
                             'titleTop':point(title).y(),'rowsTop':point(rails).y(),'rowsHeight':rails.height()})
    QTest.qWait(600);window.requestActivate();hero.forceActiveFocus();QTest.qWait(100)
    capture('arrival')
    info=at('heroInfo');assert info.isVisible()
    key(Qt.Key_Right);assert hero.property('actionIndex')==1
    key(Qt.Key_Down);capture('browse-resume')
    if not a.observe_only:
        caption=visual(at('heroCard0'),'cardSubtitle')
        assert caption.property('text')=='Épisode 13' and caption.isVisible()
    key(Qt.Key_Down);capture('browse-featured')
    if not a.observe_only:
        assert not info.isVisible(),'Hero actions compete with focused cards'
        assert point(at('heroTitle')).y()>=112,'Compact title touches navigation'
        assert 210<=point(at('heroRows')).y()<=224
        # Read actual title labels in both rows, not just the viewport bounds.
        current=hero.property('selectedRow')
        first=at('heroCard0');second=at('row'+str(current+1)+'Card0')
        assert first.property('focused') is True and first.property('selected') is True
        assert second.property('focused') is False and second.property('selected') is False,'Inactive row looks selected'
        for card in [first,second]:
            label=visual(card,'cardTitle');assert label is not None
            assert point(label).y()>=0 and point(label).y()+label.height()<=720,(label.property('text'),point(label).y(),label.height())
    # A rapid reversal must retarget the native translation without teleporting.
    if not a.observe_only and not a.reduced_motion:
        hero.setProperty('zone','actions');QTest.qWait(40)
        middle=point(at('heroRows')).y();assert 222<middle<380,middle
        hero.setProperty('zone','rail')
        assert abs(point(at('heroRows')).y()-middle)<1,'Interrupted browsing transition snapped'
        QTest.qWait(260);assert abs(point(at('heroRows')).y()-222)<.5
    # Row identity/position survives browsing away and coming back.
    for _ in range(3):key(Qt.Key_Right)
    selected=hero.property('selectedIndex');key(Qt.Key_Down);key(Qt.Key_Up)
    assert hero.property('selectedIndex')==selected
    capture('browse-selection')
    hero.selectRow(3);QTest.qWait(350);capture('browse-two-full-rows')
    hero.selectRow(1);QTest.qWait(350)
    # First/last cards remain fully reachable without an extra key to align.
    for _ in range(12):key(Qt.Key_Right)
    for _ in range(12):key(Qt.Key_Left)
    rail=at('heroRail');assert abs(rail.property('contentX')-rail.property('originX'))<.5
    before=rail.property('contentX');key(Qt.Key_Left);assert abs(rail.property('contentX')-before)<.5
    # OK restores the same remembered action, not an unexpected launch.
    key(Qt.Key_Return);assert hero.property('zone')=='actions' and hero.property('actionIndex')==1
    assert not requests
    assert info.isVisible();capture('back-to-actions')
    key(Qt.Key_Down);key(Qt.Key_Escape)
    assert hero.property('zone')=='actions' and hero.property('actionIndex')==1
    assert not requests
    # Actual title identity and canonical VO target remain unchanged.
    key(Qt.Key_Left);key(Qt.Key_Return)
    assert requests and requests[-1]['numero']>0 and requests[-1]['vf'] is False
    hero.setProperty('zone','rail');QTest.qWait(300)
    rows=hero.property('rows').toVariant()
    for _ in range(len(rows)+1):key(Qt.Key_Down)
    assert hero.property('selectedRow')==len(rows)-1
    if not a.observe_only:
        label=visual(at('heroCard0'),'cardTitle')
        assert point(label).y()+label.height()<=720,'Last row clipped at lower bound'
    capture('last-row')
    for _ in range(len(rows)+1):key(Qt.Key_Up)
    assert hero.property('zone')=='nav'
    hero.setProperty('zone','rail');QTest.qWait(300)
    window.resize(1920,1080);QTest.qWait(400);capture('browse-1080p');window.resize(1280,720)
    # Refresh without a resume row, then a title longer than one compact line.
    other=json.loads(json.dumps(snapshot));other['rangees']=[r for r in other['rangees'] if r['id']!='reprendre']
    hero.setProperty('homeData',other);hero.selectRow(0);hero.choose(0);QTest.qWait(400);capture('without-resume')
    other['hero'][0]['titre']='The Magical Revolution of the Reincarnated Princess and the Genius Young Lady'
    hero.setProperty('homeData',other);QTest.qWait(400);capture('long-title')
    if not a.observe_only:
        assert point(at('heroTitle')).y()>=112
        assert at('heroTitle').property('text')==other['hero'][0]['titre'],'Refreshed same-identity title stayed stale'
    hero.setProperty('zone','actions');QTest.qWait(300);capture('long-title-actions')
    if not a.observe_only:assert point(at('heroTitle')).y()>=112 and at('heroInfo').isVisible()
    bad=[m for m in messages if any(word in m for word in ['TypeError','ReferenceError','Unable to assign','Cannot assign','Binding loop'])]
    assert not bad,bad
    result={'validated':not a.observe_only,'scope':'actual Hero QML, explicit PC snapshot/local images; no decoder, server or Devialet validation',
            'reducedMotion':a.reduced_motion,'cases':measurements,'playTarget':requests[-1],'errors':bad}
    (a.evidence/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    window.close();sip.delete(engine)
print(json.dumps(result,ensure_ascii=False))
