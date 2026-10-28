"""Render the actual host/player with explicit fake API/media adapters; no account/network."""
import argparse
import importlib.util
import json
import os
import pathlib
import shutil
import sys
import tempfile

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path',type=pathlib.Path,required=True)
parser.add_argument('--snapshot',type=pathlib.Path,required=True)
parser.add_argument('--assets',type=pathlib.Path,required=True)
parser.add_argument('--regular',type=pathlib.Path,required=True)
parser.add_argument('--bold',type=pathlib.Path,required=True)
parser.add_argument('--evidence',type=pathlib.Path,required=True)
args=parser.parse_args()
sys.path.insert(0,str(args.qt_path.resolve()))
dll=os.add_dll_directory(str(args.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QTimer,QObject,Qt,QByteArray,qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication,QFontDatabase
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow
from PyQt5.QtTest import QTest
from PyQt5 import sip

spec=importlib.util.spec_from_file_location('pack',pathlib.Path(__file__).with_name('package-atlas-tv-hero.py'))
pack=importlib.util.module_from_spec(spec);spec.loader.exec_module(pack)
snapshot=json.loads(args.snapshot.read_text(encoding='utf-8-sig'))
for card in snapshot['hero']+[c for r in snapshot['rangees'] for c in r['cartes']]:
    path=args.assets/(str(card['anilist_id'])+'-banner.jpg')
    card['banniere']=path.resolve().as_uri() if path.exists() else ''
    card['affiche']=card['banniere']
messages=[]
qInstallMessageHandler(lambda kind,context,value:messages.append(value))
app=QGuiApplication([])
args.evidence.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='atlas-tv-live-',dir=args.evidence.parent.resolve()) as temporary:
    root=pathlib.Path(temporary);bundle=root/'bundle'
    pack.build(bundle,args.regular,args.bold)
    # The Windows bench registers font bytes just like the existing hero bench.
    for font in [args.regular,args.bold]:
        assert QFontDatabase.addApplicationFontFromData(QByteArray(font.read_bytes()))>=0
    path=bundle/'live.qml'
    path.write_text(path.read_text(encoding='utf-8').replace('source: "regular.ttf"','source: ""').replace('source: "bold.ttf"','source: ""'),encoding='utf-8')
    fbx=root/'fbx/application';fbx.mkdir(parents=True)
    (fbx/'qmldir').write_text('module fbx.application\nApplication 1.0 Application.qml\n')
    (fbx/'Application.qml').write_text('import QtQuick 2.15\nimport QtQuick.Window 2.2\nWindow { width:1280; height:720; visible:true }')
    # This suite checks host focus/identity/UI, not hardware decoding or upstream resolution.
    media=root/'TestMedia';media.mkdir()
    (media/'qmldir').write_text('module TestMedia\nMediaPlayer 5.0 MediaPlayer.qml\nVideoOutput 5.0 VideoOutput.qml\n')
    (media/'VideoOutput.qml').write_text('import QtQuick 2.15\nItem { enum Mode { PreserveAspectFit, PreserveAspectCrop } property var source; property int fillMode }')
    (media/'MediaPlayer.qml').write_text('''import QtQuick 2.15
Item {
 enum State { StoppedState, PlayingState, PausedState }
 enum Status { NoMedia, LoadedMedia, EndOfMedia }
 property int playbackState:0
 property int status:1
 property url source
 property real volume:1
 property bool muted:false
 property bool hasVideo:true
 property bool hasAudio:true
 property bool seekable:true
 property int duration:1500095
 property int position:0
 signal error(int error)
 function play() { playbackState=1; position=1000; }
 function pause() { playbackState=2; }
 function stop() { playbackState=0; }
 function seek(value) { position=value; }
}''')
    for name in ['EpisodePlayer.qml','Trailer.qml']:
        path=bundle/name
        path.write_text(path.read_text(encoding='utf-8').replace('import QtMultimedia 5.0','import TestMedia 5.0'),encoding='utf-8')
    (bundle/'TvSession.qml').write_text('''import QtQuick 2.15
Item {
 property string state:"connecting"
 property string message:""
 property string accessToken:"test"
 property bool artworkEnabled:false
 property var home:({})
 property string apiOrigin:"https://test.invalid"
 property var pendingPreview:null
 property var pendingArtworks:[]
 signal homeLoaded()
 signal unavailable()
 signal apiCalled(string path,var body)
 function start(url) { home=benchmarkHome; state='ready'; homeLoaded(); }
 function api(path,body,timeout,done) {
  apiCalled(path,body);
  if(path==='/tv/v1/previews') { pendingPreview=done; return; }
  if(path==='/tv/v1/artworks') { pendingArtworks=pendingArtworks.concat([done]); return; }
  if(path==='/tv/v1/playbacks') Qt.callLater(function(){done(200,{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',stream:{path:'/tv/v1/episode-media/'+'a'.repeat(64)},resume:{position_ms:120000}});});
  else Qt.callLater(function(){done(200,{});});
 }
 function mediaUrl(path,kind) { return apiOrigin+path; }
 function finishPreview(id,key) { var done=pendingPreview; pendingPreview=null; done(200,{kind:'trailer',anilist_id:id,youtube_id:key,path:'/tv/v1/preview-media/'+'b'.repeat(64),expires_at:Date.now()/1000+900}); }
 function finishArtwork(index,id,kind) { pendingArtworks[index](200,{anilist_id:id,kind:kind,path:'/tv/v1/artwork-media/'+'c'.repeat(64),expires_at:Date.now()/1000+900}); }
}''')
    engine=QQmlApplicationEngine();engine.addImportPath(str(root))
    engine.rootContext().setContextProperty('benchmarkHome',snapshot)
    engine.load(QUrl.fromLocalFile(str(bundle/'live.qml')))
    assert engine.rootObjects(),messages
    window=engine.rootObjects()[0]
    hero=window.findChild(QObject,'atlasHero');session=window.findChild(QObject,'tvSession');screen=window.findChild(QObject,'tvScreen')
    calls=[];session.apiCalled.connect(lambda path,body:calls.append((path,body.toVariant())))
    args.evidence.mkdir(parents=True,exist_ok=False)
    def check():
        try:
            window.requestActivate();hero.forceActiveFocus(Qt.OtherFocusReason);hero.setProperty('previewEnabled',False)
            assert hero.property('selected').toVariant()['a_lancer']['numero']==13
            QTest.keyClick(window,Qt.Key_Return)
            QTimer.singleShot(400,playing)
        except Exception as error: messages.append(str(error));app.exit(1)
    def playing():
        try:
            targets=[body for path,body in calls if path=='/tv/v1/playbacks']
            assert targets==[{'anilist_id':hero.property('selected').toVariant()['anilist_id'],'episode':13,'lang':'vf','exclude_readers':[]}],targets
            assert screen.property('playbackId')=='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
            assert window.grabWindow().save(str(args.evidence/'episode-controls.png'))
            QTest.keyClick(window,Qt.Key_Return) # pause
            QTest.keyClick(window,Qt.Key_Right) # seek +10s
            QTest.keyClick(window,Qt.Key_Back) # return to hero, not quit
            QTimer.singleShot(400,returned)
        except Exception as error: messages.append(str(error));app.exit(1)
    def returned():
        try:
            assert screen.property('playbackId')==''
            assert hero.property('activeFocus')
            events=[body for path,body in calls if path.endswith('/progress')]
            assert [e['seq'] for e in events]==list(range(1,len(events)+1))
            assert any(e['state']=='paused' for e in events) and events[-1]['state']=='stopped',events
            assert any(e['position_ms']==130000 for e in events),events
            assert window.grabWindow().save(str(args.evidence/'hero-return.png'))
            bad=[m for m in messages if any(s in m for s in ['Error','is not defined','Unable to assign','Cannot assign','failed'])]
            assert not bad,bad
            audio=window.findChild(QObject,'trailerMedia')
            assert audio.property('muted') is True and audio.property('volume')==0
            hero.setProperty('muted',False)
            assert audio.property('muted') is False and abs(audio.property('volume')-.35)<.001
            hero.setProperty('muted',True)
            # An unavailable banner must show this title's poster, not retain the preceding title.
            front=window.findChild(QObject,'heroBanner');art=front.parent().parent()
            art.setProperty('requestedSource',QUrl.fromLocalFile(str(root/'missing-banner.jpg')))
            QTest.qWait(150)
            assert art.property('usingFallback') is True and front.property('status')==1
            # Late trailer A must never replace the selected trailer B.
            hero.setProperty('previewEnabled',False)
            hero.selectMode('featured');hero.choose(0)
            first=hero.property('selected').toVariant()
            screen.preview()
            hero.choose(1)
            selected=hero.property('selected').toVariant()
            assert selected['bande_annonce']!=first['bande_annonce']
            session.finishPreview(first['anilist_id'],first['bande_annonce'])
            assert hero.property('selected').toVariant()['anilist_id']==selected['anilist_id']
            assert first['bande_annonce'] not in hero.property('trailerSources').toVariant()
            session.finishPreview(selected['anilist_id'],selected['bande_annonce'])
            assert selected['bande_annonce'] in hero.property('trailerSources').toVariant()
            cache=window.findChild(QObject,'artworkCache');session.setProperty('artworkEnabled',True)
            for identity in [1001,1002,1003,1001]: cache.request({'anilist_id':identity},'banner',False)
            assert cache.property('active')==2 and len([c for c in calls if c[0]=='/tv/v1/artworks'])==2
            session.finishArtwork(0,9999,'banner') # reject mismatched identity
            assert '1001' not in cache.property('sources').toVariant()
            session.finishArtwork(1,1002,'banner');session.finishArtwork(2,1003,'banner')
            assert cache.property('active')==0
            cache.request({'anilist_id':1002},'banner',False) # cache hit
            cache.request({'anilist_id':1001},'banner',False) # failure backoff
            session.setProperty('artworkEnabled',False);cache.request({'anilist_id':1004},'banner',False)
            assert len([c for c in calls if c[0]=='/tv/v1/artworks'])==3
            assert '1002' in cache.property('sources').toVariant()
            (args.evidence/'verification.json').write_text(json.dumps({'passed':True,'scope':'real QML host/UI with fake API and fake decoder; no native playback claim','canonicalEpisode':13,'lang':'vf','lateTrailerDoesNotChangeSelection':True,'silentGainZero':True,'bannerErrorUsesPoster':True,'artworkQueue':{'maxConcurrent':2,'identityChecked':True,'deduplicated':True,'capabilityRequired':True},'events':events},indent=2),encoding='utf-8')
            app.quit()
        except Exception as error: messages.append(str(error));app.exit(1)
    QTimer.singleShot(600,check);QTimer.singleShot(10000,lambda:app.exit(2))
    code=app.exec_()
    window.close();sip.delete(engine)
    if code: raise AssertionError(messages)
    print(json.dumps({'passed':True,'scope':'host, canonical target, resume, pause/seek/back, progress sequence; mocked decoder/API'}))
