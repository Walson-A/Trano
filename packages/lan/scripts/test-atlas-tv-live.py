"""Render the actual host/player with explicit fake API/media adapters; no account/network."""
import argparse
import importlib.util
import json
import os
import pathlib
import shutil
import sys
import tempfile
import traceback
import time

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path',type=pathlib.Path,required=True)
parser.add_argument('--snapshot',type=pathlib.Path,required=True)
parser.add_argument('--assets',type=pathlib.Path,required=True)
parser.add_argument('--regular',type=pathlib.Path,required=True)
parser.add_argument('--bold',type=pathlib.Path,required=True)
parser.add_argument('--evidence',type=pathlib.Path,required=True)
parser.add_argument('--history',type=pathlib.Path,help='Explicit PC history fixture for profile/navigation checks')
parser.add_argument('--detail-assets',type=pathlib.Path,help='Exact canonical image downloads with sources.json; never distributed')
parser.add_argument('--video-frame',type=pathlib.Path,help='Explicit still used behind the mock decoder for contrast review')
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
history_path=args.history or args.snapshot.parent/'historique.json'
history=json.loads(history_path.read_text(encoding='utf-8-sig'))
details={}
episode_sets={}
detail_images=json.loads((args.detail_assets/'sources.json').read_text(encoding='utf-8')) if args.detail_assets else {}
for identity in [154587,182255]:
    details[str(identity)]=json.loads((args.snapshot.parent/('fiche-'+str(identity)+'.json')).read_text(encoding='utf-8-sig'))
    episode_sets[str(identity)]=json.loads((args.snapshot.parent/('episodes-'+str(identity)+'.json')).read_text(encoding='utf-8-sig'))
def localize(value):
    if isinstance(value,dict):
        if value.get('anilist_id') and value.get('titre'):
            exact=detail_images.get(value.get('banniere',''))
            poster=detail_images.get(value.get('affiche',''))
            value['banniere']=(args.detail_assets/exact).resolve().as_uri() if exact else ''
            value['affiche']=(args.detail_assets/poster).resolve().as_uri() if poster else value['banniere']
        for key,item in list(value.items()):
            if key in ('image','vignette','avatar') and isinstance(item,str) and item.startswith('https:'):
                exact=detail_images.get(item)
                value[key]=(args.detail_assets/exact).resolve().as_uri() if exact else ''
            else:localize(item)
    elif isinstance(value,list):
        for item in value:localize(item)
localize(details);localize(episode_sets);localize(history)
for event in history.get('activite',[]):
    card=event.get('carte')
    if not card:continue
    image=args.assets/(str(card['anilist_id'])+'-banner.jpg')
    card['banniere']=image.resolve().as_uri() if image.exists() else ''
    card['affiche']=card['banniere']
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
    (media/'VideoOutput.qml').write_text('import QtQuick 2.15\nItem { enum Mode { PreserveAspectFit, PreserveAspectCrop } property var source; property int fillMode;Image {anchors.fill:parent;source:benchmarkVideoFrame;fillMode:Image.PreserveAspectFit} }')
    (media/'MediaPlayer.qml').write_text('''import QtQuick 2.15
Item {
 enum State { StoppedState, PlayingState, PausedState }
 enum Status { NoMedia=1, LoadedMedia=3, Buffered=6, EndOfMedia=7 }
 property int playbackState:0
 property int status:1
 property url source
 property real volume:1
 property real playbackRate:1
 property bool muted:false
 property bool hasVideo:true
 property bool hasAudio:true
 property bool seekable:true
 property int duration:1500095
 property int position:0
 signal error(int error)
 function play() {status=6;if(playbackState===2){playbackState=1;return;}duration=0;playbackState=1;position=1;Qt.callLater(function(){duration=1500095;position=1000;}); }
 function pause() { playbackState=2; }
 function stop() { playbackState=0; }
 function seek(value) {position=value;if(playbackState===1){playbackState=2;status=4;Qt.callLater(function(){status=6;});}}
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
 property var pendingSearches:[]
 property bool delayDetails:false
 property var pendingDetails:[]
 property bool failNextPlayback:false
 signal homeLoaded()
 signal unavailable()
 signal apiCalled(string path,var body)
 function start(url) { home=benchmarkHome; state='ready'; homeLoaded(); }
 function api(path,body,timeout,done) {
  apiCalled(path,body);
  if(path==='/tv/v1/previews') { pendingPreview=done; return; }
  if(path==='/tv/v1/artworks') { pendingArtworks=pendingArtworks.concat([done]); return; }
  if(path==='/tv/v1/catalog/search') { pendingSearches=pendingSearches.concat([done]); return; }
  if(path==='/tv/v1/catalog/history') { Qt.callLater(function(){done(200,benchmarkHistory);});return; }
  if(path==='/tv/v1/catalog/detail') { if(delayDetails){pendingDetails=pendingDetails.concat([done]);return;}Qt.callLater(function(){var value=benchmarkDetails[String(body.anilist_id)];done(value ? 200 : 404,value || {});});return; }
  if(path==='/tv/v1/catalog/episodes') { Qt.callLater(function(){var value=benchmarkEpisodes[String(body.anilist_id)];done(value ? 200 : 404,value || {});});return; }
  if(path==='/tv/v1/playbacks') {if(failNextPlayback){failNextPlayback=false;Qt.callLater(function(){done(503,{});});return;}Qt.callLater(function(){done(200,{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',reader_id:'e'.repeat(64),stream:{path:'/tv/v1/episode-media/'+'a'.repeat(64)},resume:{position_ms:120000}});});}
  else Qt.callLater(function(){done(200,{});});
 }
 function mediaUrl(path,kind) { return apiOrigin+path; }
 function finishPreview(id,key) { var done=pendingPreview; pendingPreview=null; done(200,{kind:'trailer',anilist_id:id,youtube_id:key,path:'/tv/v1/preview-media/'+'b'.repeat(64),expires_at:Date.now()/1000+900}); }
 function finishArtwork(index,id,kind) { pendingArtworks[index](200,{anilist_id:id,kind:kind,path:'/tv/v1/artwork-media/'+'c'.repeat(64),expires_at:Date.now()/1000+900}); }
 function featuredOnly() { state='connecting'; artworkEnabled=false; var value=JSON.parse(JSON.stringify(benchmarkHome)); value.rangees=[]; home=value; artworkEnabled=true; state='ready'; homeLoaded(); }
 function finishSearch(index) {pendingSearches[index](200,{resultats:benchmarkHome.hero.slice(index,index+4)});}
 function finishDetail(index,identity) {pendingDetails[index](200,benchmarkDetails[String(identity)]);}
}''')
    engine=QQmlApplicationEngine();engine.addImportPath(str(root))
    engine.rootContext().setContextProperty('benchmarkHome',snapshot)
    engine.rootContext().setContextProperty('benchmarkHistory',history)
    engine.rootContext().setContextProperty('benchmarkDetails',details)
    engine.rootContext().setContextProperty('benchmarkEpisodes',episode_sets)
    engine.rootContext().setContextProperty('benchmarkVideoFrame',args.video_frame.resolve().as_uri() if args.video_frame else '')
    engine.load(QUrl.fromLocalFile(str(bundle/'live.qml')))
    assert engine.rootObjects(),messages
    window=engine.rootObjects()[0]
    hero=window.findChild(QObject,'atlasHero');session=window.findChild(QObject,'tvSession');screen=window.findChild(QObject,'tvScreen')
    calls=[];session.apiCalled.connect(lambda path,body:calls.append((path,body.toVariant())))
    def spin(predicate):
        deadline=time.monotonic()+3
        while not predicate() and time.monotonic()<deadline:QTest.qWait(25)
        assert predicate(),'Expected UI/API state did not settle'
    args.evidence.mkdir(parents=True,exist_ok=False)
    def check():
        try:
            window.requestActivate();hero.forceActiveFocus(Qt.OtherFocusReason);hero.setProperty('previewEnabled',False)
            assert hero.property('muted') is False and window.findChild(QObject,'heroSound').property('label')=='Son activé'
            icons=window.findChildren(QObject,'iconPixels')
            assert len(icons)>=7 and not list(bundle.glob('icon-*.png'))
            assert all(str(icon.property('source').toString()).startswith('data:image/png;base64,') for icon in icons),'An icon still depends on a bootstrap request'
            spin(lambda:all(icon.property('status')==1 for icon in icons))
            key=hero.property('selected').toVariant()['bande_annonce']
            hero.setProperty('trailerSources',{key:'https://test.invalid/preview.mp4'});hero.setProperty('previewEnabled',True);hero.startPreview();QTest.qWait(80)
            assert len(window.findChildren(QObject,'trailerVideoOutput'))==1, 'The preview owns the output before an episode opens'
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Down)
            assert hero.property('actionIndex')==1 and window.findChild(QObject,'heroInfo').property('selected') is True
            assert window.findChild(QObject,'heroPlay').property('whiteSurface') is False
            QTest.keyClick(window,Qt.Key_Up)
            assert hero.property('actionIndex')==1 and window.findChild(QObject,'heroInfo').property('focused') is True
            QTest.keyClick(window,Qt.Key_Left)
            assert hero.property('selected').toVariant()['a_lancer']['numero']==13
            QTest.keyClick(window,Qt.Key_Return)
            QTimer.singleShot(400,playing)
        except Exception as error: messages.append(traceback.format_exc());app.exit(1)
    def playing():
        try:
            targets=[body for path,body in calls if path=='/tv/v1/playbacks']
            assert targets==[{'anilist_id':hero.property('selected').toVariant()['anilist_id'],'episode':13,'lang':'vf','exclude_readers':[]}],targets
            assert screen.property('playbackId')=='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
            player=window.findChild(QObject,'episodeLoader').property('item')
            spin(lambda:player.property('playing') is True)
            assert len(window.findChildren(QObject,'episodeVideoOutput'))==1 and not window.findChildren(QObject,'trailerVideoOutput'), 'Only the episode owns a video output'
            assert window.grabWindow().save(str(args.evidence/'episode-controls.png'))
            QTest.keyClick(window,Qt.Key_Return) # pause
            QTest.keyClick(window,Qt.Key_Right) # seek +10s
            QTest.qWait(300) # coalesced seek commits after a burst of remote keys
            assert player.property('playing') is False
            QTest.keyClick(window,Qt.Key_Return);spin(lambda:player.property('playing') is True)
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Right)
            spin(lambda:player.property('positionMs')==150000 and player.property('playing') is True)
            QTest.keyClick(window,Qt.Key_Up)
            assert window.grabWindow().save(str(args.evidence/'player-focus.png'))
            for _ in range(5):QTest.keyClick(window,Qt.Key_Right)
            QTest.keyClick(window,Qt.Key_Return)
            assert player.property('zone')=='rates'
            assert window.grabWindow().save(str(args.evidence/'player-speed.png'))
            QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Return)
            assert player.property('rate')==1.5 and player.property('zone')=='toolbar'
            QTest.keyClick(window,Qt.Key_Back) # return to hero, not quit
            QTimer.singleShot(400,returned)
        except Exception as error: messages.append(traceback.format_exc());app.exit(1)
    def returned():
        try:
            assert screen.property('playbackId')==''
            assert not window.findChildren(QObject,'episodeVideoOutput'), 'Closing the episode must release its video output'
            assert hero.property('activeFocus')
            events=[body for path,body in calls if path.endswith('/progress')]
            assert [e['seq'] for e in events]==list(range(1,len(events)+1))
            assert any(e['state']=='paused' for e in events) and events[-1]['state']=='stopped',events
            assert any(e['position_ms']==130000 for e in events),events
            assert window.grabWindow().save(str(args.evidence/'hero-return.png'))
            bad=[m for m in messages if any(s in m for s in ['Error','is not defined','Unable to assign','Cannot assign','failed'])]
            assert not bad,bad
            audio=window.findChild(QObject,'trailerMedia')
            assert audio.property('muted') is False and abs(audio.property('volume')-.35)<.001
            hero.setProperty('muted',True)
            assert audio.property('muted') is True and audio.property('volume')==0
            hero.setProperty('muted',False)
            # An unavailable banner must show this title's poster, not retain the preceding title.
            front=window.findChild(QObject,'heroBanner');art=front.parent().parent()
            art.setProperty('requestedSource',QUrl.fromLocalFile(str(root/'missing-banner.jpg')))
            QTest.qWait(150)
            assert art.property('usingFallback') is True and front.property('status')==1
            # Late trailer A must never replace the selected trailer B.
            hero.setProperty('previewEnabled',False)
            hero.setProperty('trailerSources',{}) # remove the explicit video-ownership setup
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
            hero.choose(0);session.featuredOnly();QTest.qWait(80)
            warmed=[body for path,body in calls if path=='/tv/v1/artworks'][3:]
            assert len(warmed)==2 and {v['kind'] for v in warmed}=={'banner','poster'}
            assert all(v['anilist_id']==snapshot['hero'][0]['anilist_id'] for v in warmed)
            # Drive search with the same directional keys as the TV remote.
            session.setProperty('artworkEnabled',False);hero.setProperty('zone','actions');hero.forceActiveFocus(Qt.OtherFocusReason)
            QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Return)
            search=window.findChild(QObject,'atlasSearch')
            assert screen.property('panel')=='search' and search.property('activeFocus')
            for _ in range(5):QTest.keyClick(window,Qt.Key_Right)
            QTest.keyClick(window,Qt.Key_Return) # F
            QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Return) # R
            spin(lambda:len([c for c in calls if c[0]=='/tv/v1/catalog/search'])==1)
            assert search.property('query')=='FR'
            QTest.keyClick(window,Qt.Key_A)
            spin(lambda:len([c for c in calls if c[0]=='/tv/v1/catalog/search'])==2)
            assert search.property('query')=='FRa'
            session.finishSearch(0)
            assert search.property('results').toVariant()==[], 'Stale search response was shown'
            session.finishSearch(1);QTest.qWait(80)
            assert search.property('results').toVariant()[0]['anilist_id']==snapshot['hero'][1]['anilist_id']
            QTest.keyClick(window,Qt.Key_Right)
            assert search.property('zone')=='results'
            QTest.qWait(200)
            assert window.grabWindow().save(str(args.evidence/'search.png'))
            QTest.keyClick(window,Qt.Key_Return);QTest.qWait(80)
            assert screen.property('panel')=='detail'
            detail=window.findChild(QObject,'atlasDetail')
            assert detail.property('media').toVariant()['anilist_id']==snapshot['hero'][1]['anilist_id']
            QTest.keyClick(window,Qt.Key_Escape)
            assert screen.property('panel')=='search' and search.property('query')=='FRa'
            QTest.keyClick(window,Qt.Key_Escape);QTest.qWait(80)
            context_value=hero.property('contextRow')
            assert screen.property('panel')=='' and (context_value is None or context_value.toVariant() is None)
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return);QTest.qWait(80)
            profile=window.findChild(QObject,'atlasProfile')
            assert screen.property('panel')=='profile' and profile.property('state')=='ready', {'panel':screen.property('panel'),'profileState':profile.property('state'),'heroZone':hero.property('zone'),'nav':hero.property('navIndex')}
            assert profile.property('pseudo')==history['profil']['pseudo']
            assert profile.metric('moyenne')==(str(round(history['chiffres']['moyenne'])/10).replace('.',',')+' / 10')
            QTest.qWait(400)
            assert window.grabWindow().save(str(args.evidence/'profile.png'))
            QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Return);QTest.qWait(80)
            assert screen.property('panel')=='detail'
            QTest.keyClick(window,Qt.Key_Escape);QTest.qWait(80)
            assert screen.property('panel')=='profile'
            QTest.keyClick(window,Qt.Key_Escape);QTest.qWait(80)
            assert screen.property('panel')=='' and hero.property('navIndex')==1
            QTest.keyClick(window,Qt.Key_Left);QTest.keyClick(window,Qt.Key_Return)
            assert screen.property('panel')=='search'
            search.setProperty('zone','nav');search.setProperty('navIndex',0)
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
            assert screen.property('panel')=='profile'
            profile.setProperty('zone','nav');profile.setProperty('navIndex',1)
            QTest.keyClick(window,Qt.Key_Left);QTest.keyClick(window,Qt.Key_Left);QTest.keyClick(window,Qt.Key_Return);QTest.qWait(80)
            assert screen.property('panel')=='' and hero.property('navIndex')==2
            # Real PC fiche/episode DTOs, exact identities, season stack and remote playback.
            screen.openDetail(details['154587']['carte'])
            spin(lambda:detail.property('episodeState')=='ready')
            assert detail.property('detail').toVariant()['carte']['anilist_id']==154587
            assert detail.property('episodes').toVariant()[0]['numero']==1
            detail.setProperty('zone','language');detail.setProperty('languageIndex',1);detail.setProperty('french',True)
            QTest.keyClick(window,Qt.Key_Left)
            assert detail.property('french') is True, 'Focus must not change the chosen language'
            QTest.keyClick(window,Qt.Key_Return);QTest.keyClick(window,Qt.Key_Return)
            assert detail.property('french') is False, 'OK selects VOSTFR; pressing twice must not toggle it'
            QTest.keyClick(window,Qt.Key_Right)
            assert detail.property('french') is False
            QTest.keyClick(window,Qt.Key_Return)
            assert detail.property('french') is True and 'VF' in window.findChild(QObject,'detailPlay').property('label')
            detail.setProperty('zone','actions')
            spin(lambda:any(i.property('status')==1 and str(i.property('source').toString())==details['154587']['carte']['banniere'] for i in detail.findChildren(QObject,'heroBanner')))
            QTest.qWait(300)
            assert window.grabWindow().save(str(args.evidence/'detail-top.png'))
            detail.setProperty('zone','episodes');detail.setProperty('episodeIndex',2);detail.scrollToZone();QTest.qWait(300)
            assert window.grabWindow().save(str(args.evidence/'detail-episodes.png'))
            detail.setProperty('french',True)
            before=len([body for path,body in calls if path=='/tv/v1/playbacks'])
            QTest.keyClick(window,Qt.Key_Return);QTest.qWait(200)
            launches=[body for path,body in calls if path=='/tv/v1/playbacks']
            assert len(launches)==before+1 and launches[-1]['anilist_id']==154587 and launches[-1]['episode']==3 and launches[-1]['lang']=='vf',launches
            episode_player=window.findChild(QObject,'episodeLoader').property('item')
            spin(lambda:episode_player.property('playing') is True)
            window.findChild(QObject,'episodeMedia').error.emit(1)
            assert episode_player.property('failure')
            QTest.keyClick(window,Qt.Key_Return);QTest.qWait(200)
            assert [body for path,body in calls if path=='/tv/v1/playbacks'][-1]['exclude_readers']==['e'*64], 'Retry excludes only the failed canonical reader'
            QTest.keyClick(window,Qt.Key_Back);QTest.qWait(100)
            assert screen.property('panel')=='detail' and detail.property('activeFocus') and detail.property('episodeIndex')==2
            session.setProperty('failNextPlayback',True)
            QTest.keyClick(window,Qt.Key_Return);QTest.qWait(100)
            assert screen.property('playbackId')=='' and not screen.property('resolving') and detail.property('activeFocus')
            assert detail.property('extrasError')=='Cet épisode est indisponible pour le moment.'
            detail.setProperty('zone','cast');detail.scrollToZone();QTest.qWait(300)
            assert window.grabWindow().save(str(args.evidence/'detail-cast.png'))
            detail.setProperty('zone','recommendations');detail.scrollToZone();QTest.qWait(300)
            assert window.grabWindow().save(str(args.evidence/'detail-recommendations.png'))
            detail.visit(details['182255']['carte']);spin(lambda:detail.property('episodeState')=='ready')
            assert detail.property('card').toVariant()['anilist_id']==182255
            QTest.keyClick(window,Qt.Key_Back);QTest.qWait(100)
            assert detail.property('card').toVariant()['anilist_id']==154587 and detail.property('episodeIndex')==2 and detail.property('zone')=='recommendations', {'id':detail.property('card').toVariant()['anilist_id'],'episodeIndex':detail.property('episodeIndex'),'zone':detail.property('zone'),'focus':detail.property('activeFocus'),'panel':screen.property('panel'),'stack':detail.property('stack').toVariant()}
            detail.setProperty('zone','seasons');detail.setProperty('seasonIndex',1);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:detail.property('episodeState')=='ready')
            assert detail.property('card').toVariant()['anilist_id']==182255
            QTest.keyClick(window,Qt.Key_Back);QTest.qWait(80)
            assert detail.property('card').toVariant()['anilist_id']==154587, 'Back after a real season selection must restore the preceding season'
            QTest.keyClick(window,Qt.Key_Back);QTest.qWait(80)
            assert screen.property('panel')=='' and hero.property('actionIndex')==1
            QTest.keyClick(window,Qt.Key_Back)
            assert screen.property('exitVisible') is True and screen.property('exitChosen') is False
            assert window.grabWindow().save(str(args.evidence/'exit-dialog.png'))
            QTest.keyClick(window,Qt.Key_Back)
            assert screen.property('exitVisible') is False
            QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Return)
            assert screen.property('exitVisible') is False and window.isVisible()
            session.setProperty('delayDetails',True)
            screen.openDetail(details['154587']['carte'])
            detail.visit(details['182255']['carte'])
            session.finishDetail(0,154587)
            assert detail.property('state')=='loading' and detail.property('media').toVariant()['anilist_id']==182255
            session.finishDetail(1,154587) # wrong identity must not become the second season
            assert detail.property('state')=='error'
            QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Back);QTest.qWait(80)
            later_bad=[m for m in messages if any(s in m for s in ['ReferenceError','TypeError','Unable to assign','Cannot assign'])]
            assert not later_bad,later_bad
            (args.evidence/'verification.json').write_text(json.dumps({'passed':True,'scope':'real QML host/UI with fake API and fake decoder; no native playback claim','canonicalEpisode':13,'lang':'vf','defaultSoundOnAndLabelled':True,'infoSelectionPreserved':True,'search':{'remoteKeyboard':True,'staleIgnored':True,'selectionAndBack':True},'profile':{'publicProfileWithoutOAuth':True,'statsScaleChecked':True,'selectionAndBack':True},'lateTrailerDoesNotChangeSelection':True,'silentGainZero':True,'bannerErrorUsesPoster':True,'artworkQueue':{'maxConcurrent':2,'identityChecked':True,'deduplicated':True,'capabilityRequired':True,'warmWithoutResume':True},'events':events},indent=2),encoding='utf-8')
            app.quit()
        except Exception as error: messages.append(traceback.format_exc());app.exit(1)
    QTimer.singleShot(600,check);QTimer.singleShot(25000,lambda:app.exit(2))
    code=app.exec_()
    window.close();sip.delete(engine)
    if code: raise AssertionError(messages)
    print(json.dumps({'passed':True,'scope':'host, canonical target, resume, pause/seek/back, progress sequence; mocked decoder/API'}))
