"""Real QML image/cache regression tests, explicit local image and fake issuance API."""
import argparse,json,os,pathlib,shutil,sys,tempfile,time

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--qt-path',type=pathlib.Path,required=True)
p.add_argument('--image',type=pathlib.Path,required=True)
p.add_argument('--evidence',type=pathlib.Path,required=True)
a=p.parse_args();sys.path.insert(0,str(a.qt_path.resolve()))
if not a.image.is_file():p.error('An existing local image is required')
dll=os.add_dll_directory(str(a.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QObject,qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow
from PyQt5.QtTest import QTest
messages=[];qInstallMessageHandler(lambda kind,context,text:messages.append(text))
app=QGuiApplication([]);a.evidence.mkdir(parents=True,exist_ok=False)
with tempfile.TemporaryDirectory(prefix='artwork-',dir=a.evidence.parent) as folder:
    root=pathlib.Path(folder).resolve();source=pathlib.Path(__file__).resolve().parent.parent/'devialet/hero'
    for name in ['ArtworkCache.qml','HeroArtwork.qml','FocusCard.qml','Motion.js']:shutil.copyfile(source/name,root/name)
    image=a.image.resolve().as_uri();bad=(root/'bad-proxy.jpg').as_uri()
    (root/'host.qml').write_text('''import QtQuick 2.15
import QtQuick.Window 2.2
Window {
 width:1280;height:720;visible:true;color:'#090a0d'
 property bool renderImages:false
 property var media:({anilist_id:98460,affiche:'file:///original-unavailable.jpg'})
 Item {id:transport;objectName:'transport';property bool artworkEnabled:true;property string state:'ready';property var calls:[];signal unavailable()
 function api(path,body,timeout,done){calls=calls.concat([{body:body,done:done}]);}
 function mediaUrl(path,kind){return path;}
 function finish(index,status,path){var call=calls[index];call.done(status,{anilist_id:call.body.anilist_id,kind:call.body.kind,path:path,expires_at:Date.now()/1000+900});}
 }
 ArtworkCache {id:art;objectName:'cache';transport:transport}
 Image {id:poster;objectName:'poster';x:60;y:40;width:240;height:340;fillMode:Image.PreserveAspectFit;asynchronous:true;source:renderImages && art.sources['98460'] ? art.sources['98460'].poster || '' : ''
 onStatusChanged:if(status===Image.Error)art.failed(media,'poster',source);else if(status===Image.Ready)art.confirmed(media,'poster',source)
 }
 HeroArtwork {objectName:'banner';x:350;y:40;width:560;height:320;requestedSource:renderImages && art.sources['98460'] ? art.sources['98460'].banner || '' : '';fallbackSource:renderImages && art.sources['98460'] ? art.sources['98460'].poster || '' : '';onFailed:art.failed(media,poster ? 'poster' : 'banner',failedSource);onImageReady:art.confirmed(media,poster ? 'poster' : 'banner',loadedSource)}
 FocusCard {objectName:'card';x:350;y:390;title:'Image réelle · API simulée';artwork:renderImages && art.sources['98460'] ? art.sources['98460'].banner || '' : '';fallbackArtwork:renderImages && art.sources['98460'] ? art.sources['98460'].poster || '' : '';onArtworkFailed:art.failed(media,poster ? 'poster' : 'banner',failedSource);onArtworkReady:art.confirmed(media,poster ? 'poster' : 'banner',loadedSource)}
}''',encoding='utf-8')
    engine=QQmlApplicationEngine();engine.load(QUrl.fromLocalFile(str(root/'host.qml')));assert engine.rootObjects(),'\n'.join(messages)
    window=engine.rootObjects()[0];cache=window.findChild(QObject,'cache');transport=window.findChild(QObject,'transport');poster=window.findChild(QObject,'poster')
    def value(obj,name):
        v=obj.property(name);return v.toVariant() if hasattr(v,'toVariant') else v
    def count():return len(value(transport,'calls'))
    def spin(test):
        end=time.monotonic()+4
        while not test() and time.monotonic()<end:QTest.qWait(20)
        assert test(),{'calls':count(),'entries':value(cache,'entries'),'messages':messages[-30:]}
    for identity in range(200000,200065):
        slot=count();cache.request({'anilist_id':identity},'poster',False);transport.finish(slot,200,image)
    assert len(value(cache,'sources'))==64 and '200000' not in value(cache,'sources')
    slot=count();cache.request({'anilist_id':98460},'poster',True);transport.finish(slot,200,image)
    assert '98460' in value(cache,'sources') and value(cache,'sourceOrder')[-1]=='98460'
    slot=count();cache.request({'anilist_id':98460},'poster',True);assert count()==slot
    cache.clear();transport.setProperty('calls',[]);window.setProperty('renderImages',True)
    card=value(window,'media');cache.request(card,'poster',True);transport.finish(0,200,bad)
    spin(lambda:count()==2)
    assert not value(cache,'sources').get('98460',{}).get('poster'), 'A fresh grant with failed bytes must be invalidated'
    transport.finish(1,200,image);spin(lambda:poster.property('status')==1)
    assert value(cache,'entries')['98460:poster']['failures']==0
    cache.failed(card,'poster',bad);assert value(cache,'sources')['98460']['poster']==image and count()==2
    cache.failed(card,'poster',image);spin(lambda:count()==3)
    transport.finish(2,200,image);spin(lambda:poster.property('status')==1)
    assert value(cache,'entries')['98460:poster']['failures']==0, 'The same URL must reload after invalidation'
    # A 429 waits, then bounded retries stop after three failures.
    other={'anilist_id':195516};cache.request(other,'poster',True);transport.finish(3,429,'')
    QTest.qWait(300);assert count()==4
    for slot in [4,5]:
        entry=value(cache,'entries')['195516:poster'];entry['retryAt']=0;cache.remember('195516:poster',entry);cache.retryDue();assert count()==slot+1;transport.finish(slot,503,'')
    entry=value(cache,'entries')['195516:poster'];assert entry['failures']==3 and not entry['automatic']
    cache.retryDue();assert count()==6
    # The backdrop and horizontal card use the same recovery signal with a poster fallback.
    cache.request(card,'banner',True);transport.finish(6,200,bad)
    spin(lambda:value(cache,'entries')['98460:banner'].get('automatic') is True)
    cache.confirmed(card,'banner',QUrl())
    assert value(cache,'entries')['98460:banner']['automatic'] is True, 'An empty QUrl is not proof of decoded pixels'
    spin(lambda:count()==8);transport.finish(7,200,image)
    spin(lambda:all(img.property('status')==1 for img in window.findChildren(QObject,'heroBanner')))
    assert not window.findChild(QObject,'banner').property('usingFallback'), 'A decoded primary must leave fallback even when its URL is unchanged'
    QTest.qWait(300);assert window.grabWindow().save(str(a.evidence/'recovered.png'))
    cache.clear();transport.setProperty('calls',[])
    for identity in [1,2,3,4]:cache.request({'anilist_id':identity},'poster',False)
    cache.request({'anilist_id':3},'poster',True)
    assert cache.property('active')==2 and value(cache,'queued')[0]['id']==3
    cache.clear();transport.finish(0,200,image)
    assert cache.property('active')==0 and value(cache,'sources')=={}, 'Late responses after clear must not resurrect artwork'
    result={'passed':True,'scope':'real Qt images, local pixels and fake metadata API; no network/account',
      'lowIdSurvivesFullCache':True,'lruBound64':True,'failedFreshGrantRecovered':True,'staleFailureIgnored':True,
      'sameUrlReloaded':True,'rateLimitBackoff':True,'retriesBounded':True,'selectedJobPromoted':True,'lateClearedResponseIgnored':True}
    (a.evidence/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
    window.close();engine.deleteLater();QTest.qWait(20)
