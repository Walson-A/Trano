"""Full-host detail trailer scenarios. Fake transport/decoder only; no real account."""
import copy,json


def run(window,session,screen,details,calls,QTest,Qt,QObject,spin,evidence):
    def data(obj,name):
        value=obj.property(name)
        return value.toVariant() if hasattr(value,'toVariant') else value
    def preview_calls():return [body for path,body in calls if path=='/tv/v1/previews']
    def playback_calls():return [body for path,body in calls if path=='/tv/v1/playbacks']
    def output_count():return len(window.findChildren(QObject,'trailerVideoOutput'))+len(window.findChildren(QObject,'episodeVideoOutput'))+len(window.findChildren(QObject,'detailTrailerVideoOutput'))
    def shot(name):assert window.grabWindow().save(str(evidence/(name+'.png')))
    hero=window.findChild(QObject,'atlasHero');detail=window.findChild(QObject,'atlasDetail')
    store=window.findChild(QObject,'tvPreviews');hero.setProperty('previewEnabled',False)
    store.clear();session.setProperty('pendingPreviews',{})
    # Two in-flight preparations must queue the latest target instead of failing it.
    cards=[{'anilist_id':800000+i,'bande_annonce':'12345678901'} for i in range(4)]
    queue_before=len(preview_calls())
    for card in cards[:3]:session.askPreview(store,card)
    assert data(store,'active')==2 and len(data(store,'queued'))==1
    assert len(preview_calls())==queue_before+2 and data(session,'previewReplies')==[]
    session.cancelPreview(2);assert data(store,'queued')==[]
    session.askPreview(store,cards[3]);assert len(data(store,'queued'))==1
    for card in [cards[0],cards[1],cards[3]]:session.finishPreview(card['anilist_id'],card['bande_annonce'])
    assert data(store,'active')==0 and data(store,'queued')==[]
    assert [r['id'] for r in data(session,'previewReplies')]==[cards[i]['anilist_id'] for i in [0,1,3]]
    assert all(r['status']==200 for r in data(session,'previewReplies'))
    assert len(preview_calls())==queue_before+3
    session.askPreview(store,cards[3]);assert len(preview_calls())==queue_before+3
    store.clear();session.setProperty('pendingPreviews',{})
    for flag in ['delayDetails','delayPlaybacks','delayLibrary','followupAiring','extrasEnabled']:
        session.setProperty(flag,False)
    session.setProperty('airingEnabled',False)
    first=details['154587']['carte'];second=details['182255']['carte']
    before=len(preview_calls());progress_before=len([1 for path,body in calls if path.endswith('/progress')]);episodes_before=len(playback_calls())
    screen.openDetail(first);spin(lambda:detail.property('state')=='ready')
    spin(lambda:len(preview_calls())>before)
    trailer=window.findChild(QObject,'detailTrailerPlayer');assert detail.property('previewWanted')
    detail.startPreview() # joins the same pending grant, newest view serial wins
    assert len(preview_calls())==before+1,'Home/detail grant requests must be coalesced'
    session.finishPreview(first['anilist_id'],first['bande_annonce'])
    spin(lambda:trailer.property('videoReady') is True)
    assert output_count()==1,'Hero and detail must not own video outputs simultaneously'
    assert trailer.parentItem().objectName()=='tvScreen','Native video keeps the application root as its parent'
    assert window.grabWindow().save(str(evidence/'detail-trailer-background.png'))
    core=trailer.property('core');assert core is hero.property('previewPlayer'),'Hero/detail must use the exact same native player'
    assert len(window.findChildren(QObject,'trailerMedia'))==1,'Only one native trailer player exists'
    assert not trailer.findChildren(QObject,'detailTrailerMedia'),'The detail controller never creates another decoder'
    media=core.findChild(QObject,'trailerMedia');surface=core.findChild(QObject,'trailerVideoOutput');source=str(media.property('source').toString());position=media.property('position')
    # Directional access to the secondary trailer action, without changing episodes.
    detail.setProperty('zone','actions');detail.forceActiveFocus();QTest.keyClick(window,Qt.Key_Up);QTest.keyClick(window,Qt.Key_Right)
    assert detail.property('zone')=='trailer'
    QTest.keyClick(window,Qt.Key_Return);QTest.qWait(80)
    assert detail.property('fullPreview') is True and trailer.property('inlinePreview') is False
    assert media.property('position')==position and str(media.property('source').toString())==source,'Fullscreen must not restart the trailer'
    assert output_count()==1 and trailer.width()==1280 and trailer.height()==720
    assert core.findChild(QObject,'trailerVideoOutput') is surface,'Fullscreen retains the Hero video surface'
    shot('detail-trailer-fullscreen')
    chrome=trailer.findChild(QObject,'playerPauseFeedback');QTest.keyClick(window,Qt.Key_Return)
    assert abs(chrome.x()+chrome.width()/2-trailer.width()/2)<1 and abs(chrome.y()+chrome.height()/2-trailer.height()/2)<1
    shot('detail-trailer-paused')
    QTest.keyClick(window,Qt.Key_Return)
    QTest.keyClick(window,Qt.Key_Return);assert trailer.property('playing') is False and trailer.property('videoReady') is True
    QTest.keyClick(window,Qt.Key_Return);assert trailer.property('playing') is True
    QTest.keyClick(window,Qt.Key_Right);assert trailer.property('proposedMs')==position+10000
    assert trailer.property('positionMs')==position
    QTest.keyClick(window,Qt.Key_Return);spin(lambda:trailer.property('playing') is True)
    assert trailer.property('positionMs')==position+10000
    QTest.keyClick(window,Qt.Key_Left);assert trailer.property('proposedMs')==position
    QTest.keyClick(window,Qt.Key_Return);spin(lambda:trailer.property('playing') is True)
    assert trailer.property('positionMs')==position
    QTest.keyClick(window,Qt.Key_Back)
    assert detail.property('fullPreview') is True and trailer.property('controlsVisible') is False
    QTest.keyClick(window,Qt.Key_Back)
    assert detail.property('fullPreview') is False and screen.property('panel')=='detail'
    assert detail.property('zone')=='trailer' and trailer.property('positionMs')==position and output_count()==1
    assert trailer.property('inlinePreview') and core.height()<720
    # A failed native grant must not remain a positive cache hit until its TTL.
    media.error.emit(1);assert detail.property('previewState')=='unavailable' and not store.cachedSource(first)
    before=len(preview_calls());detail.startPreview();assert len(preview_calls())==before+1
    session.finishPreview(first['anilist_id'],first['bande_annonce']);spin(lambda:trailer.property('videoReady') and not trailer.property('failure'))
    # Scrolling below the header releases the decoder; returning reuses the grant.
    before=len(preview_calls());detail.setProperty('zone','episodes');detail.scrollToZone();QTest.qWait(300)
    assert not detail.property('previewWanted') and output_count()==0
    detail.setProperty('zone','actions');detail.scrollToZone();spin(lambda:trailer.property('videoReady') is True)
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
    detail.openFullPreview();assert detail.property('fullPreview') and not trailer.property('started')
    QTest.keyClick(window,Qt.Key_Back);assert not detail.property('fullPreview') and screen.property('panel')=='detail'
    session.finishPreview(second['anilist_id'],first['bande_annonce']);QTest.qWait(100)
    assert detail.property('previewState')=='unavailable' and output_count()==0
    shot('detail-trailer-unavailable')
    detail.openFullPreview();assert trailer.property('failure') and detail.property('fullPreview')
    QTest.keyClick(window,Qt.Key_Back);assert not detail.property('fullPreview') and screen.property('panel')=='detail'
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
            'automaticBackground':True,'stableRootParent':True,'sharedValidatedPlayer':True,'pauseFeedbackCentered':True,'latestTargetQueuedInsteadOfBusyFailure':True,'cancelledQueuedTargetNotRequested':True,'sharedGrantDeduplication':True,'oneVideoOutputAtATime':True,'fullscreenKeepsSourceAndPosition':True,
            'pauseResumeAndSeek':True,'backHidesHudThenReturnsToDetail':True,'scrollReleasesOutput':True,'freshCacheReused':True,'failedNativeGrantInvalidated':True,
            'episodeResolutionStopsPreviewFirst':True,'lateAnswerDoesNotReopen':True,'wrongTrailerRejected':True,'missingMetadataDoesNotInvent':True,
            'invalidatedEpochCannotRestoreGrant':True,'trailersDoNotCreateEpisodeSessions':True}
    result.update(sameHeroTrailerInstance=True,oneNativeTrailerPlayer=True,sameSurfaceInFullscreen=True)
    (evidence/'detail-preview-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
