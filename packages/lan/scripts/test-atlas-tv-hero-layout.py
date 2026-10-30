"""Real Hero/navigation geometry, local pixels and explicit synthetic boundary text; no API."""
import argparse, importlib.util, json, os, pathlib, sys, tempfile

p=argparse.ArgumentParser(description=__doc__)
for arg in ['qt-path','regular','bold','image','avatar','evidence']:
    p.add_argument('--'+arg,type=pathlib.Path,required=True)
p.add_argument('--observe-only',action='store_true',help='Archive the pre-change geometry without claiming validation')
a=p.parse_args();sys.path.insert(0,str(a.qt_path.resolve()))
dll=os.add_dll_directory(str(a.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QPointF,QByteArray,QObject,qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication,QFontDatabase
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow,QQuickItem
from PyQt5.QtTest import QTest
from PyQt5 import sip

messages=[];qInstallMessageHandler(lambda k,c,m:messages.append(m))
app=QGuiApplication([])
for font in [a.regular,a.bold]:
    font_id=QFontDatabase.addApplicationFontFromData(QByteArray(font.read_bytes()));assert font_id>=0
family=QFontDatabase.applicationFontFamilies(font_id)[0]
a.evidence=a.evidence.resolve();a.evidence.mkdir(parents=True,exist_ok=False)
spec=importlib.util.spec_from_file_location('pack',pathlib.Path(__file__).with_name('package-atlas-tv-hero.py'))
pack=importlib.util.module_from_spec(spec);spec.loader.exec_module(pack)
rows=[]
with tempfile.TemporaryDirectory(prefix='hero-layout-',dir=a.evidence.parent) as tmp:
    root=pathlib.Path(tmp);pack.build(root/'bundle',a.regular,a.bold)
    engine=QQmlApplicationEngine()
    engine.rootContext().setContextProperty('testFamily',family)
    engine.loadData(b'''import QtQuick 2.15
import QtQuick.Window 2.2
import "bundle"
Window {width:1280;height:720;visible:true
 Hero {id:hero;objectName:'hero';family:testFamily;previewEnabled:false;reducedMotion:true;libraryEnabled:true
  function showCase(value){homeData=value;selectRow(0);choose(0);displayedMedia=selected;}
 }
}''',QUrl.fromLocalFile(str(root/'bench.qml')))
    assert engine.rootObjects(),messages
    window=engine.rootObjects()[0];hero=window.findChild(QObject,'hero')
    def visual(item,name):
        if item.objectName()==name:return item
        for child in item.childItems():
            result=visual(child,name)
            if result:return result
    cases=[('short','Frieren','noslow',a.avatar.resolve().as_uri()),
           ('long','The Magical Revolution of the Reincarnated Princess and the Genius Young Lady','A',a.avatar.resolve().as_uri()),
           ('profile-long','The Summer Hikaru Died','Un pseudo volontairement très long pour vérifier sa limite','')]
    for name,title,pseudo,avatar in cases:
        card={'anilist_id':114535,'titre':title,'banniere':a.image.resolve().as_uri(),'affiche':a.avatar.resolve().as_uri(),
              'resume':'Deux jeunes femmes se rencontrent et partagent une aventure qui bouleversera leur monde et leur manière de voir la magie.',
              'score':83,'annee':2023,'format':'TV','genres':['Aventure','Fantastique','Drame']}
        hero.setProperty('avatar',avatar)
        hero.showCase({'hero':[card],'rangees':[],'compte':{'pseudo':pseudo}})
        QTest.qWait(350)
        title_item=visual(hero,'heroTitle');profile=visual(hero,'profileEntry')
        top=title_item.mapToItem(hero,QPointF(0,0)).y()
        play=visual(hero,'heroPlay');button_top=play.mapToItem(hero,QPointF(0,0)).y()
        row={'case':name,'titleTop':top,'titleLines':title_item.property('lineCount'),'buttonTop':button_top,'profileWidth':profile.width()}
        if not a.observe_only:
            assert top>=112 and button_top+play.height()<=350.1,row
            assert profile.x()+profile.width()<=1216.1,row
            text=visual(profile,'profileName');photo=visual(profile,'profileAvatar')
            gap=photo.x()-(text.x()+text.width())
            assert abs(gap-12)<.1 and photo.width()==photo.height()==36,(row,gap)
            assert abs(text.y()+text.height()/2-photo.y()-photo.height()/2)<=.5,(row,text.y(),text.height(),photo.y(),photo.height())
            assert profile.width()<=260 and (name!='long' or profile.width()<=110),row
        assert window.grabWindow().save(str(a.evidence/(name+'.png')))
        rows.append(row)
    bad=[m for m in messages if any(x in m for x in ['TypeError','ReferenceError','Cannot assign','Unable to assign'])]
    assert not bad,bad
    (a.evidence/'verification.json').write_text(json.dumps({'validated':not a.observe_only,'scope':'real QML; local images and synthetic boundary strings; no backend/native claim','cases':rows},indent=2),encoding='utf-8')
    window.close();sip.delete(engine)
print(json.dumps({'validated':not a.observe_only,'cases':rows}))
