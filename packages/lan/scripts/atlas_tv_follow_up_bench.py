"""Opt-in scenarios for test-atlas-tv-live.py. Explicit fake API/account/decoder only."""
import json


def run(window, session, screen, details, calls, QTest, Qt, QObject, spin, evidence):
    def data(obj, name):
        value = obj.property(name)
        return value.toVariant() if hasattr(value, 'toVariant') else value

    def writes():
        return [body for path, body in calls if path == '/tv/v1/library-update']

    def playbacks():
        return [body for path, body in calls if path == '/tv/v1/playbacks']

    session.setProperty('delayDetails', False)
    for flag in ['delayPlaybacks','failNextPlayback','failNextVariants']:
        session.setProperty(flag,False)
    session.setProperty('libraryEnabled', True)
    session.setProperty('airingEnabled', True)
    screen.setProperty('exitVisible', False)
    screen.openDetail(details['154587']['carte'])
    detail = window.findChild(QObject, 'atlasDetail')
    editor = window.findChild(QObject, 'libraryEditor')
    store = window.findChild(QObject, 'detailLibrary')
    spin(lambda: detail.property('state') == 'ready' and detail.property('personalPhase') == 'ready')
    assert data(detail, 'personalEntry')['moi']['note'] == 7.2
    assert '7,2' in window.findChild(QObject, 'detailRate').property('label')
    spin(lambda:abs(window.findChild(QObject,'detailViewport').property('contentY'))<1)
    assert window.grabWindow().save(str(evidence / 'followup-detail.png'))
    before = len(writes())
    detail.personalAction(True)
    spin(lambda: editor.property('editable'))
    assert editor.property('draftNote') == 7.2
    QTest.qWait(200)
    assert window.grabWindow().save(str(evidence / 'followup-rating.png'))
    QTest.keyClick(window, Qt.Key_Right)
    assert editor.property('draftNote') == 7.5 and len(writes()) == before
    QTest.keyClick(window, Qt.Key_Back)
    assert not editor.property('opened') and screen.property('panel') == 'detail' and len(writes()) == before
    assert window.activeFocusItem()!=editor, 'An invisible editor must relinquish keyboard focus'

    # Focus alone changes nothing; a status-only save preserves decimal score and progress.
    detail.personalAction(False)
    spin(lambda: editor.property('editable'))
    QTest.keyClick(window, Qt.Key_Down)
    QTest.keyClick(window, Qt.Key_Left)
    assert editor.property('draftStatus') == 'CURRENT'
    QTest.keyClick(window, Qt.Key_Return)
    assert editor.property('draftStatus') == 'COMPLETED'
    editor.setProperty('zone', 'actions')
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: not editor.property('opened'))
    assert writes()[-1]['statut'] == 'COMPLETED' and 'note' not in writes()[-1] and 'progression' not in writes()[-1]
    assert data(store, 'entries')['154587']['moi'] == {'statut': 'COMPLETED', 'note': 7.2, 'progression': 5}

    # Re-reading after a conflict must not overwrite an untouched status changed on PC.
    detail.personalAction(True)
    spin(lambda: editor.property('editable'))
    QTest.keyClick(window, Qt.Key_Right)
    session.setProperty('libraryFailure', 'conflict')
    editor.setProperty('zone', 'actions')
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: editor.property('phase') == 'conflict')
    assert editor.property('draftNote') == 7.5
    assert window.grabWindow().save(str(evidence / 'followup-conflict.png'))
    before = len(writes())
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: editor.property('editable'))
    assert len(writes()) == before and editor.property('draftStatus') == 'PAUSED' and editor.property('draftNote') == 7.5
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: not editor.property('opened'))
    assert writes()[-1]['note'] == 7.5 and 'statut' not in writes()[-1] and 'progression' not in writes()[-1]

    # Lost response: confirm by reading, without replaying the mutation.
    detail.personalAction(True)
    spin(lambda: editor.property('editable'))
    QTest.keyClick(window, Qt.Key_Right)
    session.setProperty('libraryFailure', 'timeout')
    editor.setProperty('zone', 'actions')
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: editor.property('phase') == 'uncertain')
    before = len(writes())
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: editor.property('editable'))
    assert not editor.property('dirty') and len(writes()) == before
    QTest.keyClick(window, Qt.Key_Return)
    assert len(writes()) == before
    QTest.keyClick(window, Qt.Key_Back)
    detail.personalAction(True)
    spin(lambda: editor.property('editable'))
    editor.setProperty('zone', 'clear')
    QTest.keyClick(window, Qt.Key_Return)
    editor.setProperty('zone', 'actions')
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: not editor.property('opened'))
    assert writes()[-1]['note'] is None and 'statut' not in writes()[-1] and 'progression' not in writes()[-1]

    session.seedLibraryJson(154587, json.dumps({'anilist_id': 154587, 'presence': 'absent', 'moi': None, 'revision': 'absent', 'editable': True}))
    store.load(154587)
    spin(lambda: detail.property('personalPhase') in ['ready', 'error'])
    assert detail.property('personalPhase')=='ready', {'phase':detail.property('personalPhase'),'messages':data(store,'messages'),'fixture':session.libraryEntry(154587).toVariant()}
    before = len(writes())
    detail.personalAction(False)
    detail.personalAction(False)
    spin(lambda: detail.property('personalPhase') == 'ready')
    assert len(writes()) == before + 1 and writes()[-1]['statut'] == 'PLANNING' and 'progression' not in writes()[-1]

    # Explicit synthetic calendar fixture attached to public artwork, never a real airing claim.
    session.setProperty('followupAiring', True)
    detail.load(details['154587']['carte'])
    spin(lambda: detail.property('episodeState') == 'ready' and len(data(detail, 'episodes')) == 12)
    QTest.qWait(120)
    rows = data(detail, 'episodes')
    assert rows[5]['diffusion']['etat'] == 'a_venir' and rows[5]['lancable'] is False
    detail.setProperty('zone', 'episodes')
    detail.setProperty('episodeIndex', 5)
    detail.scrollToZone()
    QTest.qWait(300)
    assert '5 épisodes sortis sur 12 annoncés' in window.findChild(QObject, 'detailEpisodeCount').property('text')
    assert '03/01/' in window.findChild(QObject, 'episodeAiringNotice').property('text')
    assert window.grabWindow().save(str(evidence / 'followup-upcoming-detail.png'))
    before = len(playbacks())
    QTest.keyClick(window, Qt.Key_Return)
    assert len(playbacks()) == before and not screen.property('playbackId')
    screen.launch(data(detail, 'card'), {'numero': 6, 'vf': False}, [], 0)
    assert len(playbacks()) == before
    stale=json.loads(json.dumps(rows[5]));stale['diffusion']['date']['iso']='2000-01-03T20:00:00+01:00'
    reads=len([p for p,b in calls if p=='/tv/v1/catalog/episodes'])
    detail.launch(stale)
    spin(lambda:detail.property('episodeState')=='ready' and len([p for p,b in calls if p=='/tv/v1/catalog/episodes'])==reads+1)
    assert len(playbacks())==before, 'Crossing the cached airing boundary rechecks; it never starts speculatively'
    detail.setProperty('episodeIndex', 0)
    QTest.keyClick(window, Qt.Key_Return)
    player = window.findChild(QObject, 'episodeLoader').property('item')
    spin(lambda: player.property('playing') and player.property('resumed'))
    current = screen.property('playbackId')
    player.openMenu('episodes')
    menu = window.findChild(QObject, 'playerMenu')
    spin(lambda: menu.property('state') == 'ready' and len(data(menu, 'entries')) == 12)
    menu.setProperty('index', 5)
    shelf=window.findChild(QObject,'episodeShelf')
    spin(lambda:shelf.property('currentIndex')==5 and shelf.property('contentX')>0)
    QTest.qWait(200)
    assert shelf.property('currentIndex')==5 and shelf.property('contentX')>0, 'Late artwork/model refresh must keep the future selection visible'
    assert data(menu, 'entries')[5]['available'] is False
    assert window.grabWindow().save(str(evidence / 'followup-upcoming-player.png'))
    before = len(playbacks())
    QTest.keyClick(window, Qt.Key_Return)
    assert len(playbacks()) == before and screen.property('playbackId') == current and player.property('playing')
    # The manual FrAnime reader uses the same opaque-source contract as the other sites.
    session.setProperty('franimeEnabled',True);player.openMenu('source')
    spin(lambda:menu.property('state')=='ready' and any(e['id']=='franime' for e in data(menu,'sources')))
    entries=data(menu,'entries');menu.setProperty('index',next(i for i,e in enumerate(entries) if e['readerId']=='c'*64))
    QTest.qWait(150);assert window.grabWindow().save(str(evidence/'followup-franime-source.png'))
    QTest.keyClick(window,Qt.Key_Return)
    spin(lambda:data(screen,'pendingPlayback')['source']=='franime' and player.property('playing') and player.property('resumed') and not player.property('restoreAfterSeek') and not player.property('changing'))
    assert playbacks()[-1]['source']=='franime' and playbacks()[-1]['reader_id']=='c'*64
    assert data(screen,'pendingPlayback')['readerLabel']=='FrAnime · Sendvid'
    player.openMenu('quality');spin(lambda:menu.property('state')=='ready' and len(data(menu,'entries'))==2)
    QTest.keyClick(window,Qt.Key_Down);assert window.grabWindow().save(str(evidence/'followup-franime-quality.png'))
    QTest.keyClick(window,Qt.Key_Return)
    spin(lambda:data(screen,'pendingPlayback')['qualityLabel']=='Originale' and player.property('playing') and not player.property('restoreAfterSeek') and not player.property('changing'))
    assert playbacks()[-1]['variant_id']=='3'*64 and playbacks()[-1]['reader_id']=='c'*64 and playbacks()[-1]['source']=='franime'
    current=screen.property('playbackId');player.openMenu('episodes');spin(lambda:menu.property('state')=='ready')
    unknown = dict(data(detail, 'card'))
    unknown.update(anilist_id=987654, statut='RELEASING')
    session.setProperty('rejectNextUnaired', True)
    screen.changeEpisode(unknown, {'numero': 6, 'vf': False}, {})
    spin(lambda: not screen.property('resolving') and menu.property('changeError'))
    assert 'À venir' in menu.property('message') and screen.property('playbackId') == current and player.property('playing')
    QTest.keyClick(window, Qt.Key_Back)
    player.close()
    QTest.qWait(60)
    screen.navigate('library')
    catalog = window.findChild(QObject, 'atlasLibrary')
    spin(lambda: catalog.property('state') == 'ready')
    assert catalog.property('columns') == 6 and data(catalog, 'results')
    catalog.setProperty('zone', 'results')
    QTest.qWait(200)
    assert window.grabWindow().save(str(evidence / 'followup-library.png'))
    catalog.openFilter(0)
    QTest.keyClick(window, Qt.Key_Down)
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: catalog.property('state') == 'ready')
    assert [b for p, b in calls if p == '/tv/v1/library'][-1] == {'page': 1, 'statut': 'PLANNING'}
    assert all(c['moi']['statut'] == 'PLANNING' for c in data(catalog, 'results'))
    catalog.setProperty('zone', 'results')
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: screen.property('panel') == 'detail')
    QTest.keyClick(window, Qt.Key_Back)
    spin(lambda: screen.property('panel') == 'library')
    assert data(catalog, 'filters')['statut'] == 'PLANNING'
    session.setProperty('trimLibrary',True);catalog.search(True,5)
    spin(lambda:catalog.property('state')=='ready' and catalog.property('page')==1)
    screen.openDetail(details['154587']['carte'])
    spin(lambda:detail.property('personalPhase')=='ready')
    hero=window.findChild(QObject,'atlasHero');home_id=data(hero,'selected')['anilist_id'];home_row=data(hero,'currentRow')['id'];reloads=session.property('homeReloads')
    detail.personalAction(False);spin(lambda:editor.property('editable'));editor.chooseStatus(2)
    session.setProperty('libraryFailure','adjust_progress');editor.setProperty('zone','actions');QTest.keyClick(window,Qt.Key_Return)
    spin(lambda:not editor.property('opened') and session.property('homeReloads')>reloads)
    QTest.qWait(100)
    assert data(detail,'card')['moi']['progression']==12 and 'progression' not in writes()[-1]
    assert data(hero,'selected')['anilist_id']==home_id and data(hero,'currentRow')['id']==home_row
    session.seedLibraryJson(154587,json.dumps({'anilist_id':154587,'presence':'inconnu','moi':None,'revision':None,'editable':False}))
    store.load(154587);spin(lambda:detail.property('personalPhase')=='ready')
    before=len(writes());detail.personalAction(True)
    spin(lambda:not editor.property('waiting'))
    assert not editor.property('editable')
    editor.setProperty('zone','actions');QTest.keyClick(window,Qt.Key_Return)
    assert len(writes())==before, 'Unknown private membership must not become an add or rating'
    QTest.keyClick(window,Qt.Key_Back)
    session.unavailable.emit()
    assert data(store, 'entries') == {}
    (evidence / 'follow-up-verification.json').write_text(json.dumps({
        'passed': True, 'scope': 'real QML with fake account/API/decoder; explicit synthetic 12/5 calendar; no native or account writes',
        'draftCancel': True, 'precisionRetained': True, 'explicitPlanning': True, 'clientDoesNotRequestProgress': True,
        'partialConflictRebase': True, 'timeoutReadBeforeExplicitRetry': True, 'explicitClear': True,
        'centralFutureGate': True, 'lateExtrasCannotEnableFuture': True, 'futureKeepsPlayback': True,
        'serverFutureErrorVisible': True, 'privateListNavigation': True, 'privateStoreCleared': True,
        'airingBoundaryRechecksWithoutPlaying': True, 'unknownMembershipCannotWrite': True,
        'providerCanonicalProgressHonoured': True, 'homeRefreshKeepsSelection': True, 'emptyTrailingPageRecovers': True,
        'manualFranimeOpaqueReader': True, 'manualFranimeOriginalQuality': True,
    }, indent=2), encoding='utf-8')
