"""Delayed reads and admission failures against real QML; explicit synthetic API only."""
import json


def run(window, session, screen, details, calls, QTest, Qt, QObject, spin, evidence):
    def data(obj, name):
        value = obj.property(name)
        return value.toVariant() if hasattr(value, 'toVariant') else value

    def count(path):
        return len([1 for p, _ in calls if p == path])

    def skeleton(parent, name):
        item = parent.findChild(QObject, name)
        spin(lambda: item.property('visible'))
        assert not item.property('enabled')
        return item

    session.setProperty('delayCollections', True)
    session.setProperty('delayDetails', False)
    session.setProperty('libraryEnabled', True)
    screen.navigate('search')
    catalog = window.findChild(QObject, 'atlasDiscovery')
    if catalog is None:
        catalog = window.findChild(QObject, 'atlasSearch')
    assert catalog is not None
    catalog.setProperty('results', [])
    catalog.setProperty('retrySeconds', 0)
    catalog.setProperty('retryBody', '')
    search_slot = len(data(session, 'pendingSearches'))
    catalog.search(True, 1)
    skeleton(catalog, 'catalogSkeleton')
    assert data(catalog, 'results') == []
    assert window.grabWindow().save(str(evidence / 'loading-search.png'))
    session.failSearch(search_slot)
    assert catalog.property('state') == 'error' and catalog.property('retrySeconds') == 3
    before = count('/tv/v1/catalog/search')
    catalog.search(True, 1)
    assert count('/tv/v1/catalog/search') == before, 'Same read must respect Retry-After'
    assert 'sollicité' in catalog.property('failureMessage')
    assert window.grabWindow().save(str(evidence / 'loading-busy.png'))
    QTest.qWait(3150)
    catalog.search(True, 1)
    assert count('/tv/v1/catalog/search') == before + 1
    screen.navigate('library')
    session.finishSearch(search_slot + 1)
    assert not catalog.property('opened') and catalog.property('state') != 'ready', 'Late response resurrected a closed search'

    library = window.findChild(QObject, 'atlasLibrary')
    library.setProperty('results', [])
    slot = len(data(session, 'pendingCollections'))
    library.search(True, 1)
    skeleton(library, 'catalogSkeleton')
    assert window.grabWindow().save(str(evidence / 'loading-library.png'))
    session.finishCollection(slot)
    spin(lambda: library.property('state') == 'ready')

    screen.navigate('profile')
    profile = window.findChild(QObject, 'atlasProfile')
    profile.setProperty('history', None)
    slot = len(data(session, 'pendingCollections'))
    profile.load()
    skeleton(profile, 'profileSkeleton')
    assert window.grabWindow().save(str(evidence / 'loading-profile.png'))
    session.finishCollection(slot)
    spin(lambda: profile.property('state') == 'ready')
    session.setProperty('delayCollections', False)

    session.setProperty('delayDetails', True)
    session.setProperty('delayLibrary', True)
    detail = window.findChild(QObject, 'atlasDetail')
    store = window.findChild(QObject, 'detailLibrary')
    store.clear()
    slot = len(data(session, 'pendingDetails'))
    private_slot = len(data(session, 'pendingLibrary'))
    screen.openDetail(details['154587']['carte'])
    skeleton(detail, 'episodeSkeleton')
    detail.setProperty('zone', 'language')
    detail.scrollToZone()
    QTest.qWait(200)
    assert window.grabWindow().save(str(evidence / 'loading-episodes.png'))
    assert data(detail, 'episodes') == []
    detail.personalAction(True)
    editor = window.findChild(QObject, 'libraryEditor')
    skeleton(editor, 'followupSkeleton')
    assert not editor.property('editable')
    assert window.grabWindow().save(str(evidence / 'loading-followup.png'))
    QTest.keyClick(window, Qt.Key_Back)
    session.finishLibrary(private_slot)
    session.finishDetail(slot, 154587)
    spin(lambda: detail.property('state') == 'ready')
    session.setProperty('delayDetails', False)
    session.setProperty('delayLibrary', False)

    session.setProperty('extrasEnabled', True)
    before = count('/tv/v1/catalog/detail-extras')
    screen.openDetail(details['154587']['carte'])
    spin(lambda: detail.property('state') == 'ready')
    QTest.qWait(200)
    assert count('/tv/v1/catalog/detail-extras') == before
    detail.back()
    QTest.qWait(1250)
    assert count('/tv/v1/catalog/detail-extras') == before, 'Leaving must cancel enrichment not yet sent'
    screen.openDetail(details['154587']['carte'])
    spin(lambda: detail.property('state') == 'ready')
    spin(lambda: count('/tv/v1/catalog/detail-extras') == before + 1)
    assert window.grabWindow().save(str(evidence / 'loading-ready-detail.png'))
    session.setProperty('extrasEnabled', False)
    detail.back()
    (evidence / 'loading-verification.json').write_text(json.dumps({
        'passed': True, 'scope': 'real QML, fake API/account/decoder; no native or live account writes',
        'staticSkeletons': ['search', 'library', 'profile', 'episodes', 'followup'],
        'noInventedResults': True, 'retryAfterHonoured': True, 'lateSearchIgnored': True,
        'deferredExtrasCancelledOnLeave': True, 'extrasEventuallyLoadWhenStaying': True,
    }, indent=2), encoding='utf-8')
