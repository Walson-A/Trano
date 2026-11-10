"""Remote commands (PC/phone -> TV) in the real QML host, fake API and decoder only.

Atlas engine `tv/commandes.rs`: one command at a time, delivered once, receipt only after the
effect is observed. No account, no real episode, no network.
"""
import json,time


def run(window,session,screen,details,calls,QTest,Qt,QObject,spin,evidence):
    def data(obj,name):
        value=obj.property(name)
        return value.toVariant() if hasattr(value,'toVariant') else value
    receiver=window.findChild(QObject,'tvCommands')
    launcher=window.findChild(QObject,'tvConversationLaunch')
    def player():return window.findChild(QObject,'episodeLoader').property('item')
    def media():return player().findChild(QObject,'episodeMedia')
    hero=window.findChild(QObject,'atlasHero')
    def acks():return data(session,'commandAcks')
    def progresses():return [body for path,body in calls if path.endswith('/progress')]
    def poll():spin(lambda:session.property('commandPollPending') is True)
    def idle():spin(lambda:not data(receiver,'active'))
    def move():
        for _ in range(3):media().setProperty('position',media().property('position')+1000);QTest.qWait(650)
    serial=0
    def command(action,**extra):
        nonlocal serial
        serial+=1
        value={'request_id':'cccccccc-cccc-cccc-cccc-'+str(serial).zfill(12),'action':action,'ttl_ms':30000,'playback_id':screen.property('playbackId') or 'dddddddd-dddd-dddd-dddd-dddddddddddd'}
        value.update(extra)
        return value
    def send(value):poll();session.deliverCommand(value)
    def receipt(value):
        spin(lambda:any(a['id']==value['request_id'] for a in acks()))
        return [a for a in acks() if a['id']==value['request_id']][-1]
    for flag in ['delayDetails','delayPlaybacks','delayLibrary','followupAiring','extrasEnabled','airingEnabled']:
        session.setProperty(flag,False)
    if screen.property('playbackId'):player().close()
    screen.setProperty('panel','');hero.setProperty('previewEnabled',False)

    # The capability gate is strict: an older gateway never sees a command poll.
    before=session.property('commandPollCount');QTest.qWait(400)
    assert session.property('commandPollCount')==before and not session.property('commandPollPending')
    session.setProperty('tvCommandsEnabled',True);poll()

    # Nothing plays: refused, never queued for later.
    nothing=command('pause');send(nothing);assert receipt(nothing)=={'id':nothing['request_id'],'state':'failed','code':'no_playback'}

    # Start an episode the way Oby does (fake API), with an up-next episode.
    session.setProperty('nextSuivant',{'anilist_id':154587,'episode':4,'saison_changee':False})
    session.setProperty('conversationLaunchEnabled',True)
    spin(lambda:session.property('intentPollPending') is True)
    session.deliverIntent({'request_id':'bbbbbbbb-bbbb-bbbb-bbbb-000000000099','anilist_id':154587,'episode':3,'lang':'vo','expires_at':int(time.time())+90,'ttl_ms':90000})
    spin(lambda:bool(screen.property('playbackId')) and player().property('playing'))
    move();spin(lambda:not data(launcher,'active'))
    first=screen.property('playbackId')

    # Pause: applied only once the decoder is paused; the player's own paused progress goes out.
    n=len(progresses());pause=command('pause');send(pause)
    assert receipt(pause)['state']=='applied' and not player().property('playing')
    assert any(p['state']=='paused' for p in progresses()[n:]),'Pause must be reported at once'
    idle()

    # Play: applied once playing, and a playing progress is sent at once (no 15 s wait).
    n=len(progresses());play=command('play');send(play)
    assert receipt(play)['state']=='applied' and player().property('playing')
    assert any(p['state']=='playing' for p in progresses()[n:]),'Resume must be reported at once'
    idle()

    # Seek: applied once the position is confirmed near the target.
    seek=command('seek',position_ms=600000);send(seek)
    spin(lambda:abs(player().property('positionMs')-600000)<2500)
    assert receipt(seek)['state']=='applied';idle()

    # A command aimed at another playback is refused; an invalid envelope is never acknowledged.
    other=command('pause',playback_id='dddddddd-dddd-dddd-dddd-dddddddddddd');send(other)
    assert receipt(other)['code']=='playback_mismatch' and player().property('playing');idle()
    bad=command('volume');count=len(acks());send(bad);QTest.qWait(400)
    assert len(acks())==count and not data(receiver,'active')

    # A lost receipt is retried with the same answer; the command is not applied twice.
    session.setProperty('loseCommandAck',True);again=command('pause');send(again)
    spin(lambda:len([a for a in acks() if a['id']==again['request_id']])==2)
    assert all(a['state']=='applied' for a in acks() if a['id']==again['request_id']);idle()
    play2=command('play');send(play2);assert receipt(play2)['state']=='applied';idle()

    # Next: the existing up-next path; applied only when the new playback plays.
    # (Episode 4 resolves without an up-next entry, for the refusal below.)
    session.setProperty('nextSuivant',None)
    nxt=command('next');send(nxt)
    spin(lambda:screen.property('playbackId')!=first and player().property('playing'))
    move();assert receipt(nxt)['state']=='applied'
    assert {k:v for k,v in data(screen,'pendingPlayback')['target'].items() if v is not None}=={'numero':4,'vf':False}
    idle()

    # No next episode: refused, nothing changes.
    kept=screen.property('playbackId');jump=command('next');send(jump)
    assert receipt(jump)['code']=='no_next_episode' and screen.property('playbackId')==kept;idle()

    # Stop: back to the detail page, stopped progress reported.
    n=len(progresses());stop=command('stop');send(stop)
    assert receipt(stop)['state']=='applied' and not screen.property('playbackId')
    assert any(p['state']=='stopped' for p in progresses()[n:])
    idle()

    session.setProperty('tvCommandsEnabled',False);session.finishCommandPoll()
    session.setProperty('conversationLaunchEnabled',False);session.finishIntentPoll()
    result={'passed':True,'scope':'real QML host with fake transport/decoder; no account, no real episode',
            'strictCapability':True,'noPlaybackRefused':True,'pauseAppliedAfterDecoderPaused':True,'playReportedAtOnce':True,
            'seekConfirmedNearTarget':True,'otherPlaybackRefused':True,'invalidEnvelopeIgnored':True,'lostReceiptRetriedNotReapplied':True,
            'nextUsesUpNextAndWaitsForPlayback':True,'noNextRefused':True,'stopReturnsAndReportsStopped':True}
    (evidence/'commands-verification.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
