"""Conversation receiver scenarios in the real QML host, fake API and decoder only."""
import copy,json,time


def run(window,session,screen,details,calls,QTest,Qt,QObject,spin,evidence):
    def data(obj,name):
        value=obj.property(name)
        return value.toVariant() if hasattr(value,'toVariant') else value
    receiver=window.findChild(QObject,'tvConversationLaunch')
    def player():return window.findChild(QObject,'episodeLoader').property('item')
    def media():return player().findChild(QObject,'episodeMedia')
    hero=window.findChild(QObject,'atlasHero')
    def playbacks():return [body for path,body in calls if path=='/tv/v1/playbacks']
    def acks():return data(session,'conversationAcks')
    def idle():spin(lambda:not data(receiver,'active'))
    def poll():spin(lambda:session.property('intentPollPending') is True)
    serial=0
    def intent(anilist=154587,episode=3,lang='vo',ttl=90000):
        nonlocal serial
        serial+=1
        return {'request_id':'bbbbbbbb-bbbb-bbbb-bbbb-'+str(serial).zfill(12),'anilist_id':anilist,'episode':episode,'lang':lang,'expires_at':int(time.time())+90,'ttl_ms':ttl}
    def offer(value):poll();session.deliverIntent(value)
    def move():
        for _ in range(3):media().setProperty('position',media().property('position')+1000);QTest.qWait(650)
    for flag in ['delayDetails','delayPlaybacks','delayLibrary','followupAiring','extrasEnabled','airingEnabled']:
        session.setProperty(flag,False)
    if screen.property('playbackId'):player().close()
    screen.setProperty('panel','');hero.setProperty('previewEnabled',False)
    # Both gates must be strict: diagnostics and absent capability never poll.
    before=session.property('intentPollCount');receiver.setProperty('primary',False);session.setProperty('conversationLaunchEnabled',True);QTest.qWait(400)
    assert session.property('intentPollCount')==before
    session.setProperty('conversationLaunchEnabled',False);receiver.setProperty('primary',True);QTest.qWait(400)
    assert session.property('intentPollCount')==before
    session.setProperty('conversationLaunchEnabled',True)
    # Accepted response lost: ACK retries, duplicate delivery does not dispatch.
    value=intent();session.setProperty('loseAcceptedAck',True);before=len(playbacks());offer(value)
    QTest.qWait(150);assert len(playbacks())==before
    offer(value);spin(lambda:len(playbacks())==before+1 and bool(screen.property('playbackId')) and player().property('playing'))
    assert len([a for a in acks() if a['id']==value['request_id'] and a['state']=='accepted'])==2
    assert not any(a['id']==value['request_id'] and a['state']=='playing' for a in acks()),'Resolution and the initial resume seek are not playing proof'
    first_id=screen.property('playbackId');assert data(screen,'pendingPlayback')['remoteRequestId']==value['request_id']
    # Wrong/native-video-absent observations must not produce playing.
    media().setProperty('hasVideo',False);move();assert not any(a['state']=='playing' for a in acks())
    media().setProperty('hasVideo',True);session.setProperty('losePlayingAck',True);move();idle()
    assert len(playbacks())==before+1 and screen.property('playbackId')==first_id
    assert len([a for a in acks() if a['id']==value['request_id'] and a['state']=='playing'])==2
    # Redelivery after completion is ignored; a fresh same-target intent observes, never restarts.
    offer(value);QTest.qWait(350);assert len(playbacks())==before+1 and not data(receiver,'active')
    same=intent();offer(same);spin(lambda:bool(data(receiver,'active')) and data(receiver,'active')['phase']=='observing')
    move();idle();assert screen.property('playbackId')==first_id and len(playbacks())==before+1
    # A paused different target uses the existing change pipeline and forces playing.
    player().toggle();assert not player().property('playing')
    changed=intent(episode=4,lang='vf');offer(changed)
    spin(lambda:screen.property('playbackId')!=first_id and player().property('playing'))
    assert data(screen,'pendingPlayback')['target']=={'numero':4,'vf':True}
    move();idle();assert playbacks()[-1]['lang']=='vf'
    # Local Return during delayed resolution invalidates its late stream callback.
    session.setProperty('delayPlaybacks',True);cancelled=intent(episode=5);offer(cancelled)
    spin(lambda:screen.property('resolving'));pending=len(data(session,'pendingPlaybacks'))-1;kept=screen.property('playbackId')
    player().reveal();player().forceActiveFocus();QTest.keyClick(window,Qt.Key_Back);idle()
    session.finishPlayback(pending);QTest.qWait(150)
    assert screen.property('playbackId')==kept and not screen.property('resolving')
    assert any(a['id']==cancelled['request_id'] and a['code']=='cancelled' for a in acks())
    # TTL invalidates the same preparation, without relying on device wall-clock alignment.
    expired=intent(episode=2);offer(expired);spin(lambda:screen.property('resolving'));pending=len(data(session,'pendingPlaybacks'))-1
    session.expireIntent(receiver);idle();session.finishPlayback(pending);QTest.qWait(100)
    assert screen.property('playbackId')==kept
    assert any(a['id']==expired['request_id'] and a['code']=='intent_expired' for a in acks())
    session.setProperty('delayPlaybacks',False)
    # Canonical identity mismatch never reaches the playback endpoint.
    session.setProperty('delayDetails',True);wrong=intent();before=len(playbacks());offer(wrong)
    spin(lambda:bool(data(receiver,'active')) and data(receiver,'active')['phase']=='detail')
    session.finishDetail(len(data(session,'pendingDetails'))-1,182255);idle();assert len(playbacks())==before
    assert any(a['id']==wrong['request_id'] and a['code']=='resolution_failed' for a in acks())
    session.setProperty('delayDetails',False)
    # The ordinary aired-episode refusal is preserved.
    session.setProperty('rejectNextUnaired',True);future=intent(episode=8);offer(future);idle()
    assert any(a['id']==future['request_id'] and a['code']=='episode_not_aired' for a in acks())
    session.setProperty('rejectNextUnaired',False)
    # Native error on a newly installed correlated player is a failed receipt.
    failed=intent(episode=1);offer(failed);spin(lambda:bool(data(receiver,'active')) and data(screen,'pendingPlayback')['remoteRequestId']==failed['request_id'])
    media().error.emit(1);idle();assert any(a['id']==failed['request_id'] and a['code']=='player_error' for a in acks())
    # Bad envelope is never acknowledged or launched.
    invalid=intent();invalid['lang']='auto';before=len(acks());offer(invalid);QTest.qWait(400);assert len(acks())==before
    session.setProperty('conversationLaunchEnabled',False);session.finishIntentPoll()
    if screen.property('playbackId'):player().close()
    assert session.property('maxIntentPolls')==1
    result={'passed':True,'scope':'real QML host with fake transport/decoder; no account, no real episode',
            'strictCapabilityAndPrimary':True,'onePoll':True,'acceptedConfirmedBeforeDispatch':True,'lostAcceptedAckRetriedWithoutDispatchReplay':True,
            'playingRequiresVideoAndPostSeekAdvancingPositions':True,'lostPlayingAckDoesNotRestart':True,'deduplicated':True,'samePlayingTargetNotRestarted':True,
            'replacementUsesExistingPipelineAndForcesPlaying':True,'localBackCancelsLateResolution':True,'ttlCancelsLateResolution':True,
            'wrongIdentityRejected':True,'unairedEpisodeRefused':True,'nativeErrorCorrelated':True,'invalidEnvelopeIgnored':True}
    (evidence/'conversation-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
