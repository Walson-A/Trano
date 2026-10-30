"""Full-host detail trailer scenarios. Fake transport/decoder only; no real account."""
import copy,json


def run(window,session,screen,details,calls,QTest,Qt,QObject,spin,evidence):
    def data(obj,name):
        value=obj.property(name)
        return value.toVariant() if hasattr(value,'toVariant') else value
    def preview_calls():return [body for path,body in calls if path=='/tv/v1/previews']
    def playback_calls():return [body for path,body in calls if path=='/tv/v1/playbacks']
    def output_count():return len(window.findChildren(QObject,'trailerVideoOutput'))+len(window.findChildren(QObject,'episodeVideoOutput'))
    def shot(name):assert window.grabWindow().save(str(evidence/(name+'.png')))
    hero=window.findChild(QObject,'atlasHero');detail=window.findChild(QObject,'atlasDetail')
    store=window.findChild(QObject,'tvPreviews');hero.setProperty('previewEnabled',False)
    store.clear();session.setProperty('pendingPreviews',{})
    for flag in ['delayDetails','delayPlaybacks','delayLibrary','followupAiring','extrasEnabled']:
        session.setProperty(flag,False)
    session.setProperty('airingEnabled',False)
    first=details['154587']['carte'];second=details['182255']['carte']
    before=len(preview_calls());progress_before=len([1 for path,body in calls if path.endswith('/progress')]);episodes_before=len(playback_calls())
    screen.openDetail(first);spin(lambda:detail.property('state')=='ready')
    spin(lambda:len(preview_calls())>before)
    trailer=window.findChild(QObject,'detailTrailer');assert detail.property('previewWanted')
    detail.startPreview() # joins the same pending grant, newest view serial wins
    assert len(preview_calls())==before+1,'Home/detail grant requests must be coalesced'
    session.finishPreview(first['anilist_id'],first['bande_annonce'])
    spin(lambda:trailer.property('ready') is True)
    assert output_count()==1,'Hero and detail must not own video outputs simultaneously'
    assert window.grabWindow().save(str(evidence/'detail-trailer-background.png'))
    media=trailer.findChild(QObject,'trailerMedia');source=str(media.property('source').toString());position=media.property('position')
    # Directional access to the secondary trailer action, without changing episodes.
    detail.setProperty('zone','actions');detail.forceActiveFocus();QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Right)
    assert detail.property('zone')=='trailer'
    QTest.keyClick(window,Qt.Key_Return);QTest.qWait(80)
    assert detail.property('fullPreview') is True and trailer.property('fitFrame') is True
    assert media.property('position')==position and str(media.property('source').toString())==source,'Fullscreen must not restart the trailer'
    assert output_count()==1 and trailer.width()==1280 and trailer.height()==720
    shot('detail-trailer-fullscreen')
    QTest.keyClick(window,Qt.Key_Return);assert trailer.property('playing') is False and trailer.property('ready') is True
    QTest.keyClick(window,Qt.Key_Return);assert trailer.property('playing') is True
    QTest.keyClick(window,Qt.Key_Right);spin(lambda:trailer.property('playing') is True)
    assert trailer.property('positionMs')==position+10000
    QTest.keyClick(window,Qt.Key_Left);spin(lambda:trailer.property('playing') is True)
    assert trailer.property('positionMs')==position
    QTest.keyClick(window,Qt.Key_Back)
    assert detail.property('fullPreview') is True and detail.property('previewHud') is False
    QTest.keyClick(window,Qt.Key_Back)
    assert detail.property('fullPreview') is False and screen.property('panel')=='detail'
    assert detail.property('zone')=='trailer' and trailer.property('positionMs')==position and output_count()==1
    assert not trailer.property('fitFrame') and trailer.height()<720
    # Scrolling below the header releases the decoder; returning reuses the grant.
    before=len(preview_calls());detail.setProperty('zone','episodes');detail.scrollToZone();QTest.qWait(300)
    assert not detail.property('previewWanted') and output_count()==0
    detail.setProperty('zone','actions');detail.scrollToZone();spin(lambda:trailer.property('ready') is True)
    assert len(preview_calls())==before,'Returning to the header must reuse its fresh grant'
    # Episode preparation must clear the preview before even resolving its stream.
    session.setProperty('delayPlaybacks',True);detail.primary()
    assert screen.property('resolving') is True,{'phase':detail.property('episodeState'),'error':detail.property('extrasError'),'suspended':detail.property('previewSuspended')}
    spin(lambda:output_count()==0)
    pending=data(session,'pendingPlaybacks');session.finishPlayback(len(pending)-1)
    spin(lambda:bool(screen.property('playbackId')))
    assert output_count()==1 and not window.findChildren(QObject,'trailerVideoOutput')
    player=window.findChild(QObject,'episodeLoader').property('item');player.close();session.setProperty('delayPlaybacks',False)
    # A pending answer after leaving the detail never opens a hidden decoder.
    detail.stopPreview();store.clear();session.setProperty('pendingPreviews',{})
    detail.resumePreview();detail.startPreview();detail.back();hero.setProperty('previewEnabled',False)
    session.finishPreview(first['anilist_id'],first['bande_annonce']);QTest.qWait(100)
    assert output_count()==0 and not detail.property('opened')
    # Reject a reply for a different trailer, retain this title's artwork.
    store.clear();session.setProperty('pendingPreviews',{});screen.openDetail(second)
    spin(lambda:detail.property('state')=='ready');spin(lambda:second['anilist_id'] in data(session,'pendingPreviews') or str(second['anilist_id']) in data(session,'pendingPreviews'))
    session.finishPreview(second['anilist_id'],first['bande_annonce']);QTest.qWait(100)
    assert detail.property('previewState')=='unavailable' and output_count()==0
    shot('detail-trailer-unavailable')
    # No metadata means no invented trailer action or request.
    detail.stopPreview();value=copy.deepcopy(data(detail,'detail'));value['carte']['bande_annonce']=None
    detail.setProperty('detail',value);before=len(preview_calls());QTest.qWait(1000)
    assert not detail.property('hasTrailer') and not detail.property('previewWanted') and len(preview_calls())==before
    # Clear failures on session invalidation and ignore a pending grant from that epoch.
    store.clear();session.setProperty('pendingPreviews',{});detail.setProperty('detail',details['182255'])
    detail.startPreview();store.clear();session.finishPreview(second['anilist_id'],second['bande_annonce']);QTest.qWait(100)
    assert not data(store,'cache') and output_count()==0
    detail.back();hero.setProperty('previewEnabled',False)
    # Only the deliberately tested episode above may generate playback/progress calls.
    assert len(playback_calls())==episodes_before+1
    new_progress=[body for path,body in calls if path.endswith('/progress')][progress_before:]
    assert all(body.get('duration_ms')==1500095 for body in new_progress)
    result={'passed':True,'scope':'real QML/full host with fake API/decoder, frame is bench media; no real trailer playback claim',
            'automaticBackground':True,'sharedGrantDeduplication':True,'oneVideoOutputAtATime':True,'fullscreenKeepsSourceAndPosition':True,
            'pauseResumeAndSeek':True,'backHidesHudThenReturnsToDetail':True,'scrollReleasesOutput':True,'freshCacheReused':True,
            'episodeResolutionStopsPreviewFirst':True,'lateAnswerDoesNotReopen':True,'wrongTrailerRejected':True,'missingMetadataDoesNotInvent':True,
            'invalidatedEpochCannotRestoreGrant':True,'trailersDoNotCreateEpisodeSessions':True}
    (evidence/'detail-preview-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
