"""Episode 11/53 acceptance scenarios; actual host QML, fake API/media only."""
import copy,json
from PyQt5.QtCore import QPointF


def run(window,session,screen,details,calls,QTest,Qt,QObject,spin,evidence,baseline=False):
    def data(obj,name):
        value=obj.property(name)
        return value.toVariant() if hasattr(value,'toVariant') else value
    def visual(item):
        yield item
        for child in item.childItems():yield from visual(child)
    def shelf():return window.findChild(QObject,'episodeShelf')
    def card(number):return next((item for item in visual(shelf()) if item.objectName()=='playerEpisodeCard-'+str(number)),None)
    def center_error():
        item=shelf().property('currentItem')
        assert item is not None
        return item.mapToItem(shelf(),QPointF(item.width()/2,0)).x()-shelf().width()/2
    def centered():
        try:spin(lambda:abs(center_error())<2)
        except AssertionError:
            raise AssertionError({'centerError':center_error(),'index':shelf().property('currentIndex'),'menuIndex':window.findChild(QObject,'playerMenu').property('index'),'contentX':shelf().property('contentX'),'shelfWidth':shelf().width(),'itemX':shelf().property('currentItem').x()})
    def player():return window.findChild(QObject,'episodeLoader').property('item')
    def shot(name):assert window.grabWindow().save(str(evidence/(name+'.png')))
    hero=window.findChild(QObject,'atlasHero')
    for flag in ['delayDetails','delayPlaybacks','followupAiring','airingEnabled','extrasEnabled']:
        session.setProperty(flag,False)
    session.setProperty('episodeShelfFixture',True)
    session.setProperty('artworkEnabled',True)
    screen.setProperty('panel','');hero.setProperty('previewEnabled',False)
    media=copy.deepcopy(details['154587']['carte']);media['episodes']=85
    screen.launch(media,{'numero':11,'vf':False},[],None)
    spin(lambda:bool(screen.property('playbackId')) and player().property('started'))
    spin(lambda:player().property('resumed') and player().property('playing'))
    player().forceActiveFocus()
    owner=screen.property('playbackId');position=player().property('positionMs')
    player().openMenu('episodes');menu=window.findChild(QObject,'playerMenu')
    spin(lambda:menu.property('state')=='ready' and menu.property('index')==10)
    QTest.qWait(450)
    before=center_error()
    shot('episode-11-open')
    if baseline:
        (evidence/'episode-shelf-baseline.json').write_text(json.dumps({'scope':'Actual previous QML; explicit synthetic 85-episode fixture, fake API/decoder','episode':11,'centerErrorPx':before,'watchedIndicatorImplemented':False},indent=2),encoding='utf-8')
        player().close();session.setProperty('episodeShelfFixture',False);return
    centered()
    assert card(10).property('watched') is True
    assert card(9).property('watched') is False,'Missing vu must never be inferred from episode number'
    assert card(11).property('playing') is True and card(11).property('watched') is False
    # Artwork and public metadata updates replace the model without moving the focused episode.
    rows=copy.deepcopy(data(menu,'entries'));rows[10]['titre']='Titre enrichi de l’épisode 11'
    menu.setProperty('entries',rows);QTest.qWait(150);centered()
    assert card(10).property('watched') is True
    QTest.keyClick(window,Qt.Key_Right);QTest.qWait(80);centered()
    assert menu.property('index')==11 and screen.property('playbackId')==owner
    menu.jumpToPlaying();spin(lambda:menu.property('index')==10 and menu.property('state')=='ready');centered()
    QTest.keyClick(window,Qt.Key_Back);assert not menu.property('opened')
    player().openMenu('episodes');spin(lambda:menu.property('state')=='ready');centered()
    assert menu.property('index')==10 and screen.property('playbackId')==owner and player().property('positionMs')==position, {'index':menu.property('index'),'id':screen.property('playbackId'),'expectedId':owner,'position':player().property('positionMs'),'expectedPosition':position}
    QTest.qWait(250);shot('episode-11-reopened')
    # Paging and browsing seasons must not restart the active episode.
    menu.changePage(1);spin(lambda:menu.property('pageStart')==41 and menu.property('state')=='ready')
    assert screen.property('playbackId')==owner
    menu.jumpToPlaying();spin(lambda:menu.property('pageStart')==1 and menu.property('index')==10);centered()
    # A current episode beyond page 1 opens its own page, centered after layout.
    player().close();screen.launch(media,{'numero':53,'vf':False},[],None)
    spin(lambda:bool(screen.property('playbackId')) and player().property('started'))
    player().openMenu('episodes');menu=window.findChild(QObject,'playerMenu')
    spin(lambda:menu.property('state')=='ready' and menu.property('pageStart')==41 and menu.property('index')==12);centered()
    shot('episode-53-open')
    # Endpoints remain fully visible instead of creating an empty half shelf.
    menu.setProperty('index',0);QTest.qWait(80)
    assert shelf().property('contentX')>=shelf().property('originX')
    menu.setProperty('index',39);QTest.qWait(80)
    last=shelf().property('currentItem');point=last.mapToItem(shelf(),QPointF(last.width(),0))
    assert point.x()<=shelf().width()+1
    player().close();session.setProperty('episodeShelfFixture',False);hero.setProperty('previewEnabled',False)
    (evidence/'episode-shelf-verification.json').write_text(json.dumps({'passed':True,'scope':'Real QML host; explicit synthetic 85-episode fixture, fake API/decoder; no live episode played','episode11Centered':True,'episode53PageAndCenter':True,'explicitWatchedBadge':True,'missingWatchedFlagNotInferred':True,'modelRefreshKeepsCenter':True,'reopenAndJumpKeepCurrent':True,'browsingKeepsPlaybackAndPosition':True,'endpointsVisible':True,'centerErrorPx':before},indent=2),encoding='utf-8')
