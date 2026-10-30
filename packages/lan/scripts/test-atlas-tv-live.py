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
parser.add_argument('--hls',action='store_true',help='Exercise negotiated HLS requests and quality menus with the fake decoder')
parser.add_argument('--follow-up',action='store_true',help='Exercise library writes and the explicit 12 announced/5 aired fixture; no account')
parser.add_argument('--qt-path',type=pathlib.Path,required=True)
parser.add_argument('--snapshot',type=pathlib.Path,required=True)
parser.add_argument('--assets',type=pathlib.Path,required=True)
parser.add_argument('--regular',type=pathlib.Path,required=True)
parser.add_argument('--bold',type=pathlib.Path,required=True)
parser.add_argument('--evidence',type=pathlib.Path,required=True)
parser.add_argument('--history',type=pathlib.Path,help='Explicit PC history fixture for profile/navigation checks')
parser.add_argument('--detail-assets',type=pathlib.Path,help='Exact canonical image downloads with sources.json; never distributed')
parser.add_argument('--episode-fixture',type=pathlib.Path,help='Exact public episode images for the full-host bench only')
parser.add_argument('--video-frame',type=pathlib.Path,help='Explicit still used behind the mock decoder for contrast review')
parser.add_argument('--poster-assets',type=pathlib.Path,help='Exact AniList-id-poster.jpg images for portrait catalog cards; never distributed')
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
episode_images={}
if args.episode_fixture:
    images=json.loads(args.episode_fixture.read_text(encoding='utf-8'))
    episode_images[str(images['anilist_id'])]={str(row['numero']):(args.episode_fixture.parent/row['vignette']).resolve().as_uri() for row in images['episodes']}

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
    poster=args.poster_assets/(str(card['anilist_id'])+'-poster.jpg') if args.poster_assets else None
    card['affiche']=poster.resolve().as_uri() if poster and poster.is_file() else card['banniere']
for card in snapshot['hero']+[c for r in snapshot['rangees'] for c in r['cartes']]:
    path=args.assets/(str(card['anilist_id'])+'-banner.jpg')
    card['banniere']=path.resolve().as_uri() if path.exists() else ''
    poster=args.poster_assets/(str(card['anilist_id'])+'-poster.jpg') if args.poster_assets else None
    card['affiche']=poster.resolve().as_uri() if poster and poster.is_file() else card['banniere']
messages=[]
qInstallMessageHandler(lambda kind,context,value:messages.append(value))
app=QGuiApplication([])
args.evidence.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='atlas-tv-live-',dir=args.evidence.parent.resolve()) as temporary:
    root=pathlib.Path(temporary);bundle=root/'bundle'
    pack.build(bundle,args.regular,args.bold)
    # The Windows bench registers font bytes just like the existing hero bench.
    for font in [args.regular,args.bold]:
        font_id=QFontDatabase.addApplicationFontFromData(QByteArray(font.read_bytes()))
        assert font_id>=0
    family=QFontDatabase.applicationFontFamilies(font_id)[0]
    path=bundle/'live.qml'
    path.write_text(path.read_text(encoding='utf-8').replace('source: "regular.ttf"','source: ""').replace('source: "bold.ttf"','source: ""').replace("regular.name || 'sans-serif'",json.dumps(family)),encoding='utf-8')
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
 property bool readersEnabled:true
 property bool variantsEnabled:true
 property bool hlsEnabled:benchmarkHlsEnabled
 property bool libraryEnabled:false
 property bool libraryReadCacheEnabled:true
 property bool airingEnabled:false
 property bool followupAiring:false
 property bool franimeEnabled:false
 property bool rejectNextUnaired:false
 property var libraryEntries:({})
 property string libraryFailure:''
 property bool delayLibrary:false
 property var pendingLibrary:[]
 property int libraryMutations:0
 property int libraryRevision:0
 property int homeReloads:0
 property bool trimLibrary:false
 property bool delayPlaybacks:false
 property var pendingPlaybacks:[]
 property int playbackCount:0
 property var home:({})
 property string apiOrigin:"https://test.invalid"
 property var pendingPreview:null
 property var pendingArtworks:[]
 property var pendingSearches:[]
 property bool delayCollections:false
 property var pendingCollections:[]
 property bool extrasEnabled:false
 property bool delayDetails:false
 property var pendingDetails:[]
 property bool failNextPlayback:false
 property bool failNextVariants:false
 property bool wrongEpisodeArtwork:false
 property int mediaHeadStatus:200
 signal homeLoaded()
 signal unavailable()
 signal apiCalled(string path,var body)
 function start(url) { home=benchmarkHome; state='ready'; homeLoaded(); }
 function loadHome(){homeReloads++;Qt.callLater(function(){homeLoaded();});}
 function api(path,body,timeout,done) {
  apiCalled(path,body);
  if(delayCollections && ['/tv/v1/library','/tv/v1/catalog/history'].indexOf(path)>=0){pendingCollections=pendingCollections.concat([{path:path,body:body,done:done}]);return;}
  if(path==='/tv/v1/library-entry'){if(delayLibrary){pendingLibrary=pendingLibrary.concat([{body:body,done:done}]);return;}Qt.callLater(function(){done(200,libraryEntry(body.anilist_id));});return;}
  if(path==='/tv/v1/library-update'){Qt.callLater(function(){
   var entry=libraryEntry(body.anilist_id),mode=libraryFailure;libraryFailure='';
   if(mode==='conflict'){entry.moi.statut='PAUSED';entry.moi.note=9;entry.revision='conflict-'+(++libraryRevision);seedLibrary(body.anilist_id,entry);done(409,{error:{code:'entry_conflict'}});return;}
   var next=JSON.parse(JSON.stringify(entry));next.presence='present';next.moi=next.moi || {statut:'PLANNING',note:null,progression:0};['statut','note','progression'].forEach(function(k){if(Object.prototype.hasOwnProperty.call(body,k))next.moi[k]=body[k];});if(mode==='adjust_progress')next.moi.progression=12;next.revision='saved-'+(++libraryRevision);next.request_id=body.request_id;seedLibrary(body.anilist_id,next);libraryMutations++;
   done(mode==='timeout' ? 0 : 200,mode==='timeout' ? {} : next);
  });return;}
  if(path==='/tv/v1/library'){Qt.callLater(function(){var cards=benchmarkLibraryCards.filter(function(c){return !body.statut || c.moi.statut===body.statut;});if(trimLibrary)cards=cards.slice(0,24);done(200,{resultats:cards.slice((body.page-1)*24,body.page*24),page:body.page,total:cards.length,has_next_page:cards.length>body.page*24,presence_connue:true});});return;}
  if(followupAiring && path==='/tv/v1/catalog/episode-extras'){Qt.callLater(function(){done(200,{anilist_id:body.anilist_id,episodes:[{numero:6,titre:'Complément public tardif',diffusion:{etat:'inconnu',date:null},lancable:true}]});});return;}
  if(path==='/tv/v1/previews') { pendingPreview=done; return; }
  if(path==='/tv/v1/artworks' && body.kind==='episode') {var image=benchmarkEpisodeImages[String(body.anilist_id)],url=image && image[String(body.episode)];Qt.callLater(function(){done(url ? 200 : 404,{anilist_id:body.anilist_id,episode:wrongEpisodeArtwork ? body.episode+1 : body.episode,kind:'episode',path:url || '',expires_at:Date.now()/1000+900});});return;}
  if(path==='/tv/v1/artworks') { pendingArtworks=pendingArtworks.concat([done]); return; }
  if(path==='/tv/v1/catalog/search') { pendingSearches=pendingSearches.concat([{done:done,body:body}]); return; }
  if(path==='/tv/v1/catalog/history') { Qt.callLater(function(){done(200,benchmarkHistory);});return; }
  if(path==='/tv/v1/catalog/detail') { if(delayDetails){pendingDetails=pendingDetails.concat([done]);return;}Qt.callLater(function(){var value=benchmarkDetails[String(body.anilist_id)];if(value && extrasEnabled){value=JSON.parse(JSON.stringify(value));value.complements_a_charger=true;}done(value ? 200 : 404,value || {});});return; }
  if(path==='/tv/v1/catalog/episodes') { Qt.callLater(function(){var value=followupAiring ? upcomingEpisodes(body.anilist_id) : benchmarkEpisodes[String(body.anilist_id)];done(value ? 200 : 404,value || {});});return; }
  if(path==='/tv/v1/readers') {Qt.callLater(function(){done(200,{anilist_id:body.anilist_id,episode:body.episode,lang:body.lang,readers:(franimeEnabled ? [{reader_id:'c'.repeat(64),source:'franime',provider:'franime',label:'Sendvid',supported:true}] : []).concat([{reader_id:'e'.repeat(64),source:'voiranime',provider:'mail',label:'Mail.ru FHD1',supported:true},{reader_id:'f'.repeat(64),source:'anime-sama',provider:'yourupload',label:'YourUpload',supported:true},{reader_id:'d'.repeat(64),source:'voiranime',provider:'other',label:'Incompatible',supported:false}]),limitations:['franime_browser_required']});});return;}
  if(path==='/tv/v1/variants') {if(failNextVariants){failNextVariants=false;Qt.callLater(function(){done(502,{});});return;}Qt.callLater(function(){done(200,{anilist_id:body.anilist_id,episode:body.episode,lang:body.lang,source:body.source,reader_id:body.reader_id,variants:body.source==='franime' ? [{variant_id:'3'.repeat(64),label:'Originale',container:hlsEnabled ? 'hls' : 'mp4'}] : [{variant_id:'1'.repeat(64),label:'360p',height:360,container:hlsEnabled ? 'hls' : 'mp4'},{variant_id:'2'.repeat(64),label:'1080p',height:1080,container:'mp4'}]});});return;}
  if(path==='/tv/v1/playbacks') {if(rejectNextUnaired){rejectNextUnaired=false;Qt.callLater(function(){done(409,{error:{code:'episode_not_aired',retryable:false,details:{episode:body.episode,diffusion:{etat:'a_venir',date:null}}}});});return;}if(failNextPlayback){failNextPlayback=false;Qt.callLater(function(){done(502,{});});return;}if(delayPlaybacks){pendingPlaybacks=pendingPlaybacks.concat([{body:body,done:done}]);return;}Qt.callLater(function(){answerPlayback(body,done);});}

  else Qt.callLater(function(){done(200,{});});
 }
 function answerPlayback(body,done){playbackCount++;done(200,{id:'aaaaaaaa-aaaa-aaaa-aaaa-'+('000000000000'+playbackCount).slice(-12),anilist_id:body.anilist_id,episode:body.episode,lang:body.lang,source:body.source || 'voiranime',reader:body.source==='franime' ? 'Sendvid' : body.reader_id==='f'.repeat(64) ? 'YourUpload' : 'Mail.ru FHD1',reader_id:body.reader_id || 'e'.repeat(64),variant_id:body.variant_id || null,quality:body.variant_id ? {label:body.variant_id==='3'.repeat(64) ? 'Originale' : body.variant_id==='1'.repeat(64) ? '360p' : '1080p'} : null,stream:{path:'/tv/v1/episode-media/'+'a'.repeat(64)},resume:{position_ms:120000}});}
 function finishPlayback(index){var pending=pendingPlaybacks[index];answerPlayback(pending.body,pending.done);}
 function mediaUrl(path,kind) { if(kind==='artwork' && /^\/tv\/v1\/artwork-media\/[a-f0-9]{64}$/.test(path))return benchmarkArtworkGrant;return kind==='artwork' && path.indexOf('file:')===0 ? path : apiOrigin+path; }
 function inspectEpisode(path,done) {var status=mediaHeadStatus;Qt.callLater(function(){done(status,null);});}
 function finishPreview(id,key) { var done=pendingPreview; pendingPreview=null; done(200,{kind:'trailer',anilist_id:id,youtube_id:key,path:'/tv/v1/preview-media/'+'b'.repeat(64),expires_at:Date.now()/1000+900}); }
 function finishArtwork(index,id,kind) { pendingArtworks[index](200,{anilist_id:id,kind:kind,path:'/tv/v1/artwork-media/'+'c'.repeat(64),expires_at:Date.now()/1000+900}); }
 function featuredOnly() { state='connecting'; artworkEnabled=false; var value=JSON.parse(JSON.stringify(benchmarkHome)); value.rangees=[]; home=value; artworkEnabled=true; state='ready'; homeLoaded(); }
 function failSearch(index){pendingSearches[index].done(429,{error:{code:'anilist_busy',details:{retry_after:3}}});}
 function finishCollection(index){var p=pendingCollections[index];p.done(200,p.path==='/tv/v1/library' ? {resultats:benchmarkLibraryCards.slice(0,24),page:p.body.page,has_next_page:false,total:24,presence_connue:true} : benchmarkHistory);}
 function finishSearch(index) {var p=pendingSearches[index];p.done(200,{resultats:benchmarkHome.hero.slice(index%2,index%2+4),page:p.body.page,has_next_page:p.body.page===1});}
 function finishDetail(index,identity) {pendingDetails[index](200,benchmarkDetails[String(identity)]);}
 function finishLibrary(index){var pending=pendingLibrary[index];pending.done(200,libraryEntry(pending.body.anilist_id));}
 function libraryEntry(id){return JSON.parse(JSON.stringify(libraryEntries[String(id)] || {anilist_id:id,presence:'present',revision:'initial',editable:true,moi:{statut:'CURRENT',note:7.2,progression:5}}));}
 function seedLibrary(id,value){var next={};Object.keys(libraryEntries).forEach(function(k){next[k]=libraryEntries[k];});next[String(id)]=JSON.parse(JSON.stringify(value));libraryEntries=next;}
 function seedLibraryJson(id,text){seedLibrary(id,JSON.parse(text));}
 function upcomingEpisodes(id){var year=new Date().getFullYear()+1,rows=[];for(var n=1;n<=12;n++)rows.push({numero:n,titre:n<=5 ? 'Épisode '+n : '',vu:n<5,duree:n<=5 ? 24 : null,diffusion:{etat:n<=5 ? 'diffuse' : 'a_venir',date:n===6 ? {iso:year+'-01-03T20:00:00+01:00',precision:'instant',source:'anilist',libelle:'03/01/'+year+' à 20:00',fuseau:'Europe/Paris'} : null},lancable:n<=5});return {anilist_id:id,total:12,borne_connue:12,diffusion:{total_annonce:12,diffuses:5,statut:'RELEASING'},episodes:rows,complements_a_charger:true};}
}''',encoding='utf-8')
    engine=QQmlApplicationEngine();engine.addImportPath(str(root))
    engine.rootContext().setContextProperty('benchmarkHlsEnabled',args.hls)
    # Healthy fake grants use explicit local pixels; failure/retry cases have their own image bench.
    engine.rootContext().setContextProperty('benchmarkArtworkGrant',next(args.assets.glob('*-banner.jpg')).resolve().as_uri())
    engine.rootContext().setContextProperty('benchmarkHome',snapshot)
    library_cards=[];library_ids=set()
    for card in snapshot['hero']+[c for row in snapshot.get('rangees',[]) for c in row.get('cartes',[])]:
        if card.get('anilist_id') in library_ids:continue
        library_ids.add(card.get('anilist_id'));copy=dict(card);copy['moi']={'statut':['PLANNING','CURRENT','COMPLETED','PAUSED','DROPPED','REPEATING'][len(library_cards)%6],'note':7.2,'progression':5};library_cards.append(copy)
    engine.rootContext().setContextProperty('benchmarkLibraryCards',library_cards)
    engine.rootContext().setContextProperty('benchmarkHistory',history)
    engine.rootContext().setContextProperty('benchmarkDetails',details)
    engine.rootContext().setContextProperty('benchmarkEpisodes',episode_sets)
    engine.rootContext().setContextProperty('benchmarkEpisodeImages',episode_images)
    engine.rootContext().setContextProperty('benchmarkVideoFrame',args.video_frame.resolve().as_uri() if args.video_frame else '')
    engine.load(QUrl.fromLocalFile(str(bundle/'live.qml')))
    assert engine.rootObjects(),messages
    window=engine.rootObjects()[0]
    hero=window.findChild(QObject,'atlasHero');session=window.findChild(QObject,'tvSession');screen=window.findChild(QObject,'tvScreen')
    calls=[];session.apiCalled.connect(lambda path,body:calls.append((path,body.toVariant())))
    def visual_items(item):
        result=[]
        for child in item.childItems():
            result.append(child)
            result.extend(visual_items(child))
        return result
    def episode_thumbnails():
        return [item for item in visual_items(window.contentItem()) if item.objectName()=='episodeThumbnail']
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
            assert hero.property('selected').toVariant()['a_lancer']['vf'] is True
            fallback=hero.target({'anilist_id':154587,'franime':{'titre':'Frieren','saison':1,'episode':1,'vf':True}}).toVariant()
            assert fallback['numero']==1 and fallback['vf'] is False, 'VF availability must not choose the initial language'
            QTest.keyClick(window,Qt.Key_Return)
            QTimer.singleShot(400,playing)
        except Exception as error: messages.append(traceback.format_exc());app.exit(1)
    def playing():
        try:
            targets=[body for path,body in calls if path=='/tv/v1/playbacks']
            expected={'anilist_id':hero.property('selected').toVariant()['anilist_id'],'episode':13,'lang':'vo','exclude_readers':[]}
            if args.hls:expected['accept_hls']=True
            assert targets==[expected],targets
            assert hero.property('selected').toVariant()['a_lancer']['vf'] is True, 'Default VO must not mutate the backend resume hint'
            assert screen.property('playbackId')=='aaaaaaaa-aaaa-aaaa-aaaa-000000000001'
            player=window.findChild(QObject,'episodeLoader').property('item')
            spin(lambda:player.property('playing') is True)
            assert player.property('positionMs')==120000, 'Absolute resume must not add the first native position'
            assert len(window.findChildren(QObject,'episodeVideoOutput'))==1 and not window.findChildren(QObject,'trailerVideoOutput'), 'Only the episode owns a video output'
            assert window.grabWindow().save(str(args.evidence/'episode-controls.png'))
            QTest.keyClick(window,Qt.Key_Return) # pause
            QTest.qWait(350);assert player.property('playing') is False, 'A finished seek must not override a later explicit pause'
            QTest.keyClick(window,Qt.Key_Back)
            assert not player.property('controlsVisible') and screen.property('playbackId') and not player.property('playing'), 'Back also hides the HUD while paused'
            QTest.keyClick(window,Qt.Key_Right)
            assert player.property('controlsVisible') and player.property('proposedMs')==-1, 'First arrow reveals controls without seeking'
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Right)
            assert player.property('positionMs')==120000 and player.property('proposedMs')==140000, {k:player.property(k) for k in ['positionMs','proposedMs','zone','controlsVisible','started','failure','menuOpened']}
            assert window.grabWindow().save(str(args.evidence/'player-timeline.png'))
            QTest.keyClick(window,Qt.Key_Back)
            assert player.property('positionMs')==120000 and player.property('proposedMs')==-1, 'Back cancels seek without changing media'
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
            assert player.property('positionMs')==130000 and player.property('playing') is False
            QTest.keyClick(window,Qt.Key_Return);spin(lambda:player.property('playing') is True)
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:player.property('positionMs')==150000 and player.property('playing') is True)
            QTest.keyClick(window,Qt.Key_Up)
            assert player.property('zone')=='actions'
            assert window.grabWindow().save(str(args.evidence/'player-focus.png'))
            # Actual quality catalog and strict transactional change.
            for _ in range(3):QTest.keyClick(window,Qt.Key_Right)
            QTest.keyClick(window,Qt.Key_Return)
            menu=window.findChild(QObject,'playerMenu');spin(lambda:menu.property('state')=='ready' and len(menu.property('entries').toVariant())==3)
            assert window.grabWindow().save(str(args.evidence/'player-quality.png'))
            old_id=screen.property('playbackId');session.setProperty('delayPlaybacks',True)
            QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Return)
            assert screen.property('resolving') and screen.property('playbackId')==old_id and player.property('playing')
            assert window.findChild(QObject,'episodeVideoOutput'), 'Preparing a choice retains the old output'
            request=[body for path,body in calls if path=='/tv/v1/playbacks'][-1]
            assert request['source']=='voiranime' and request['reader_id']=='e'*64 and request['variant_id']=='1'*64
            QTest.keyClick(window,Qt.Key_Back);session.finishPlayback(0);QTest.qWait(50)
            assert screen.property('playbackId')==old_id and player.property('positionMs')==150000, 'Late canceled resolution must not replace playback'
            session.setProperty('delayPlaybacks',False)
            player.openMenu('quality');spin(lambda:menu.property('state')=='ready')
            QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:screen.property('playbackId')!=old_id and player.property('playing') and player.property('resumed') and not player.property('restoreAfterSeek') and not player.property('changing'))
            assert player.property('positionMs')==150000 and screen.property('pendingPlayback').toVariant()['qualityLabel']=='360p'
            assert player.property('zone')=='actions' and player.property('controlIndex')==2, 'A completed quality change restores its trigger focus'
            # A quality switch made while paused preserves both time and intent.
            player.setProperty('zone','surface');QTest.keyClick(window,Qt.Key_Return)
            assert not player.property('wantsPlaying'), {k:player.property(k) for k in ['zone','activeFocus','playing','resumed','restoreAfterSeek','changing','retrying','menuOpened','controlsVisible','wantsPlaying']}
            old_id=screen.property('playbackId');player.openMenu('quality');spin(lambda:menu.property('state')=='ready')
            QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:screen.property('playbackId')!=old_id and player.property('resumed'))
            assert player.property('positionMs')==150000 and not player.property('playing')
            player.setProperty('zone','surface');QTest.keyClick(window,Qt.Key_Return);spin(lambda:player.property('playing'))
            # An explicit quality remains strict even after an upstream/media failure.
            for head_status in [401,200]:
                session.setProperty('mediaHeadStatus',head_status)
                window.findChild(QObject,'episodeMedia').error.emit(1)
                QTest.keyClick(window,Qt.Key_Return)
                spin(lambda:not screen.property('resolving') and not player.property('failure') and player.property('resumed') and player.property('playing'))
                retry=[body for path,body in calls if path=='/tv/v1/playbacks'][-1]
                assert retry['source']=='voiranime' and retry['reader_id']=='e'*64 and retry['variant_id']=='2'*64 and retry['force_refresh'] is True and retry['exclude_readers']==[], retry
            spin(lambda:player.property('playing'))
            window.findChild(QObject,'episodeMedia').error.emit(1)
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
            menu=window.findChild(QObject,'playerMenu');spin(lambda:menu.property('state')=='ready' and menu.property('kind')=='source')
            assert player.property('failure') and window.findChild(QObject,'episodeVideoOutput'), 'Another source is reachable without tearing down the failed session'
            assert window.grabWindow().save(str(args.evidence/'player-error-source.png'))
            QTest.keyClick(window,Qt.Key_Back);QTest.keyClick(window,Qt.Key_Left);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:player.property('playing') and player.property('resumed') and not player.property('restoreAfterSeek') and not player.property('failure'))
            player.openMenu('source');spin(lambda:menu.property('state')=='ready' and len(menu.property('sources').toVariant())==3)
            source_entries=menu.property('entries').toVariant()
            menu.setProperty('index',next(i for i,e in enumerate(source_entries) if e['readerId']=='f'*64))
            assert window.grabWindow().save(str(args.evidence/'player-source.png'))
            old_id=screen.property('playbackId');session.setProperty('failNextPlayback',True)
            QTest.keyClick(window,Qt.Key_Return);spin(lambda:not screen.property('resolving'))
            assert screen.property('playbackId')==old_id and player.property('playing') and menu.property('opened')
            assert menu.property('message')=='Ce flux est indisponible pour le moment.'
            QTest.keyClick(window,Qt.Key_Return) # acknowledge failure, keep choices
            QTest.keyClick(window,Qt.Key_Return);spin(lambda:screen.property('playbackId')!=old_id and player.property('playing'))
            request=[body for path,body in calls if path=='/tv/v1/playbacks'][-1]
            assert request['source']=='anime-sama' and request['reader_id']=='f'*64 and 'variant_id' not in request
            # A catalog failure offers a retry inside the same anchored menu.
            session.setProperty('failNextVariants',True);player.openMenu('quality')
            spin(lambda:menu.property('state')=='error')
            assert menu.property('retryAllowed') is True and player.property('playing')
            assert window.grabWindow().save(str(args.evidence/'player-quality-error.png'))
            QTest.keyClick(window,Qt.Key_Return);spin(lambda:menu.property('state')=='ready')
            QTest.keyClick(window,Qt.Key_Back)
            # Old runtimes expose a real unavailable state, never hardcoded choices.
            session.setProperty('variantsEnabled',False);before=len(calls)
            player.openMenu('quality')
            assert menu.property('state')=='error' and not menu.property('entries').toVariant() and len(calls)==before
            QTest.keyClick(window,Qt.Key_Back);session.setProperty('variantsEnabled',True)
            player.setProperty('zone','surface');QTest.keyClick(window,Qt.Key_Back)
            assert screen.property('playbackId') and not player.property('controlsVisible'), 'First Back hides controls without leaving playback'
            QTest.keyClick(window,Qt.Key_Back)
            QTimer.singleShot(400,returned)
        except Exception as error: messages.append(traceback.format_exc());app.exit(1)
    def returned():
        try:
            assert screen.property('playbackId')==''
            assert not window.findChildren(QObject,'episodeVideoOutput'), 'Closing the episode must release its video output'
            assert hero.property('activeFocus')
            events=[body for path,body in calls if path.endswith('/progress')]
            by_session={}
            for path,body in calls:
                if path.endswith('/progress'):by_session.setdefault(path,[]).append(body['seq'])
            assert all(seq==list(range(1,len(seq)+1)) for seq in by_session.values()), by_session
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
            spin(lambda:art.property('usingFallback') is True and front.property('status')==1)
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
            search=window.findChild(QObject,'atlasDiscovery')
            assert screen.property('panel')=='search' and search.property('activeFocus')
            assert search.property('denseLayout') is True and search.property('columns')==6, 'The real loader must enable the approved poster layout'
            spin(lambda:len([c for c in calls if c[0]=='/tv/v1/catalog/search'])==1)
            assert [c[1] for c in calls if c[0]=='/tv/v1/catalog/search'][-1]=={'page':1}
            session.finishSearch(0)
            assert search.property('state')=='ready' and search.property('zone')=='filters'
            QTest.keyClick(window,Qt.Key_Return)
            for _ in range(4):QTest.keyClick(window,Qt.Key_Down)
            QTest.keyClick(window,Qt.Key_Return) # Fantasy draft
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return) # Apply
            spin(lambda:len([c for c in calls if c[0]=='/tv/v1/catalog/search'])==2)
            assert [c[1] for c in calls if c[0]=='/tv/v1/catalog/search'][-1]=={'genres':['Fantasy'],'page':1}
            session.finishSearch(1)
            QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Return)
            assert search.property('overlay')=='keyboard'
            QTest.keyClick(window,Qt.Key_F);QTest.keyClick(window,Qt.Key_R)
            for _ in range(4):QTest.keyClick(window,Qt.Key_Down)
            QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
            assert search.property('query')=='fr'
            search.openKeyboard();QTest.keyClick(window,Qt.Key_A)
            search.submitQuery()
            assert search.property('query')=='fra'
            assert len([c for c in calls if c[0]=='/tv/v1/catalog/search'])==4
            before=search.property('results').toVariant()
            session.finishSearch(2)
            assert search.property('results').toVariant()==before and search.property('state')=='loading', 'Stale search response was shown'
            session.finishSearch(3);QTest.qWait(80)
            assert search.property('results').toVariant()[0]['anilist_id']==snapshot['hero'][1]['anilist_id']
            assert search.property('zone')=='results'
            search.goPage(1)
            assert [c[1] for c in calls if c[0]=='/tv/v1/catalog/search'][-1]=={'genres':['Fantasy'],'q':'fra','page':2}
            session.finishSearch(4);assert search.property('page')==2
            search.goPage(-1);session.finishSearch(5)
            assert search.property('page')==1 and search.property('resultIndex')==0
            QTest.qWait(200)
            assert window.grabWindow().save(str(args.evidence/'search.png'))
            QTest.keyClick(window,Qt.Key_Return);QTest.qWait(80)
            assert screen.property('panel')=='detail', {'panel':screen.property('panel'),'searchFocus':search.property('activeFocus'),'zone':search.property('zone'),'state':search.property('state'),'overlay':search.property('overlay'),'exitVisible':screen.property('exitVisible')}
            detail=window.findChild(QObject,'atlasDetail')
            assert detail.property('media').toVariant()['anilist_id']==snapshot['hero'][1]['anilist_id']
            QTest.keyClick(window,Qt.Key_Escape)
            assert screen.property('panel')=='search' and search.property('query')=='fra' and search.property('filters').toVariant()['genres']==['Fantasy']
            assert search.property('zone')=='results' and len([c for c in calls if c[0]=='/tv/v1/catalog/search'])==6, 'Detail return lost search context or refreshed unnecessarily'
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
            assert detail.property('french') is False and detail.property('languageIndex')==0
            assert 'VOSTFR' in window.findChild(QObject,'detailPlay').property('label'), 'New detail defaults to VOSTFR even when VF exists'
            QTest.qWait(150)
            assert window.grabWindow().save(str(args.evidence/'detail-default-vostfr.png'))
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
            try:
                spin(lambda:any(i.property('status')==1 and str(i.property('source').toString())==details['154587']['carte']['banniere'] for i in detail.findChildren(QObject,'heroBanner')))
            except AssertionError:
                raise AssertionError({'expected':details['154587']['carte']['banniere'],'images':[{k:str(i.property(k)) for k in ['status','source','opacity']} for i in detail.findChildren(QObject,'heroBanner')],'artworkSources':cache.property('sources').toVariant()})
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
            menu=window.findChild(QObject,'playerMenu');old_id=screen.property('playbackId')
            episode_player.openMenu('episodes');spin(lambda:menu.property('state')=='ready' and menu.property('total')==28)
            assert len(menu.property('entries').toVariant())==28
            if args.episode_fixture:
                session.setProperty('artworkEnabled',True);menu.warmEpisodes()
                try:
                    spin(lambda:any(image.property('status')==1 for image in episode_thumbnails()))
                except AssertionError:
                    cache=window.findChild(QObject,'episodeArtworkCache')
                    raise AssertionError({'images':[(str(image.property('source').toString()),image.property('status')) for image in episode_thumbnails()], 'cache':cache.property('sources').toVariant(), 'entries':cache.property('entries').toVariant(),'active':cache.property('active'),'calls':[body for path,body in calls if path=='/tv/v1/artworks' and body.get('kind')=='episode']})
            if args.episode_fixture:
                cache=window.findChild(QObject,'episodeArtworkCache')
                session.setProperty('wrongEpisodeArtwork',True);cache.request(154587,20)
                spin(lambda:cache.property('active')==0)
                assert '154587:20' not in cache.property('sources').toVariant(), 'A ticket for the wrong episode is rejected'
                session.setProperty('wrongEpisodeArtwork',False)
            assert window.grabWindow().save(str(args.evidence/'player-episodes.png'))
            assert menu.property('index')==2, 'Episode selector opens on the current episode'
            QTest.keyClick(window,Qt.Key_Right)
            assert screen.property('playbackId')==old_id and menu.property('index')==3
            QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Right);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:menu.property('state')=='ready' and menu.property('index')==2)
            assert screen.property('playbackId')==old_id, 'Jump to current does not restart it'
            assert window.grabWindow().save(str(args.evidence/'player-episodes-current.png'))
            before_playbacks=len([1 for path,body in calls if path=='/tv/v1/playbacks'])
            QTest.keyClick(window,Qt.Key_Return) # current episode just closes the overlay
            assert not menu.property('opened') and screen.property('playbackId')==old_id
            assert len([1 for path,body in calls if path=='/tv/v1/playbacks'])==before_playbacks
            episode_player.setProperty('zone','surface');QTest.keyClick(window,Qt.Key_Return)
            assert not episode_player.property('wantsPlaying')
            episode_player.openMenu('version');assert window.grabWindow().save(str(args.evidence/'player-version.png'))
            QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:screen.property('playbackId')!=old_id and episode_player.property('resumed'))
            assert episode_player.property('playing') is False and episode_player.property('positionMs')==120000
            assert screen.property('pendingPlayback').toVariant()['target']['vf'] is False
            # Opening/browsing a different season never tears down the episode.
            old_id=screen.property('playbackId');episode_player.openMenu('episodes')
            spin(lambda:menu.property('state')=='ready' and len(menu.property('seasons').toVariant())==2)
            menu.setProperty('column','header');QTest.keyClick(window,Qt.Key_Return)
            assert menu.property('kind')=='seasons'
            QTest.keyClick(window,Qt.Key_Down);QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:menu.property('state')=='ready' and menu.property('episodeCard').toVariant()['anilist_id']==182255)
            assert screen.property('playbackId')==old_id and not episode_player.property('playing')
            QTest.keyClick(window,Qt.Key_Back)
            episode_player.setProperty('zone','surface');QTest.keyClick(window,Qt.Key_Return)
            spin(lambda:episode_player.property('playing'))
            window.findChild(QObject,'episodeMedia').setProperty('position',0)
            window.findChild(QObject,'episodeMedia').error.emit(1)
            assert episode_player.property('failure')
            QTest.keyClick(window,Qt.Key_Return);QTest.qWait(200)
            assert [body for path,body in calls if path=='/tv/v1/playbacks'][-1]['exclude_readers']==['e'*64], 'Retry excludes only the failed canonical reader'
            spin(lambda:episode_player.property('playing') is True)
            assert episode_player.property('resumeMs')==0 and episode_player.property('positionMs')<2000, 'Explicit position zero must override an older backend resume'
            previous=[format(i,'064x') for i in range(1,9)]
            pending=screen.property('pendingPlayback').toVariant();pending['excluded']=previous;screen.setProperty('pendingPlayback',pending)
            window.findChild(QObject,'episodeMedia').error.emit(1);QTest.keyClick(window,Qt.Key_Return);QTest.qWait(200)
            assert [body for path,body in calls if path=='/tv/v1/playbacks'][-1]['exclude_readers']==previous[1:]+['e'*64], 'Keep the eight most recent failed readers'
            spin(lambda:episode_player.property('playing') is True)
            session.setProperty('mediaHeadStatus',401)
            window.findChild(QObject,'episodeMedia').error.emit(1);QTest.keyClick(window,Qt.Key_Return);QTest.qWait(200)
            assert [body for path,body in calls if path=='/tv/v1/playbacks'][-1]['exclude_readers']==previous[1:]+['e'*64], 'An expired ticket must not add exclusions'
            session.setProperty('mediaHeadStatus',200)
            QTest.keyClick(window,Qt.Key_Back);QTest.qWait(50)
            assert screen.property('playbackId') and not episode_player.property('controlsVisible'), 'Back first masks the HUD'
            QTest.keyClick(window,Qt.Key_Back);QTest.qWait(100)
            assert screen.property('panel')=='detail' and detail.property('activeFocus') and detail.property('episodeIndex')==2
            session.setProperty('failNextPlayback',True)
            QTest.keyClick(window,Qt.Key_Return);QTest.qWait(100)
            assert screen.property('playbackId')=='' and not screen.property('resolving') and detail.property('activeFocus')
            assert detail.property('extrasError')=='Ce flux est indisponible pour le moment.'
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
            if args.follow_up:
                follow_spec=importlib.util.spec_from_file_location('followup',pathlib.Path(__file__).with_name('atlas_tv_follow_up_bench.py'))
                follow=importlib.util.module_from_spec(follow_spec);follow_spec.loader.exec_module(follow)
                follow.run(window,session,screen,details,calls,QTest,Qt,QObject,spin,args.evidence)
                loading_spec=importlib.util.spec_from_file_location('loading',pathlib.Path(__file__).with_name('atlas_tv_loading_bench.py'))
                loading=importlib.util.module_from_spec(loading_spec);loading_spec.loader.exec_module(loading)
                loading.run(window,session,screen,details,calls,QTest,Qt,QObject,spin,args.evidence)
            later_bad=[m for m in messages if any(s in m for s in ['ReferenceError','TypeError','Unable to assign','Cannot assign'])]
            assert not later_bad,later_bad
            negotiated=[body for path,body in calls if path in ['/tv/v1/playbacks','/tv/v1/readers','/tv/v1/variants']]
            assert negotiated and all((body.get('accept_hls') is True) if args.hls else 'accept_hls' not in body for body in negotiated)
            (args.evidence/'verification.json').write_text(json.dumps({'passed':True,'scope':'real QML host/UI with fake API and fake decoder; no native playback claim','canonicalEpisode':13,'hlsNegotiated':args.hls,'defaultLanguage':'vo','frenchAvailabilityDoesNotSelectLanguage':True,'explicitFrenchStillSupported':True,'tvPlayer':{'anchoredMenusKeepChrome':True,'proposedTimelineUntilConfirmed':True,'cancelSeekKeepsPosition':True,'cancelResolutionIgnoresLateResponse':True,'strictSourceReaderVariant':True,'strictRetry401And200KeepsChoice':True,'failedChangeKeepsOldVideo':True,'pausedQualityAndVersionKeepPositionAndIntent':True,'episodesOverlayKeepsVideoAndSeasonBrowsing':True,'firstBackHidesHudWithoutClosing':True,'episodeJumpPreservesCurrentPlayback':True,'sourceReachableAfterNativeFailure':True,'episodeArtworkIdentityChecked':True,'missingCapabilityUnavailable':True,'perSessionProgressSequence':True},'lang':'vo','defaultSoundOnAndLabelled':True,'infoSelectionPreserved':True,'search':{'remoteKeyboard':True,'staleIgnored':True,'selectionAndBack':True},'profile':{'publicProfileWithoutOAuth':True,'statsScaleChecked':True,'selectionAndBack':True},'lateTrailerDoesNotChangeSelection':True,'silentGainZero':True,'bannerErrorUsesPoster':True,'artworkQueue':{'maxConcurrent':2,'identityChecked':True,'deduplicated':True,'capabilityRequired':True,'warmWithoutResume':True},'events':events},indent=2),encoding='utf-8')
            app.quit()
        except Exception as error: messages.append(traceback.format_exc());app.exit(1)
    QTimer.singleShot(600,check);QTimer.singleShot(60000 if args.follow_up else 25000,lambda:app.exit(2))
    code=app.exec_()
    window.close();sip.delete(engine)
    if code: raise AssertionError(messages)
    print(json.dumps({'passed':True,'scope':'host, canonical target, resume, pause/seek/back, progress sequence; mocked decoder/API'}))
