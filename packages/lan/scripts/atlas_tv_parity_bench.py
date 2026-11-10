"""Parité avec l'audit PC / mobile / TV du 9 novembre — scénarios opt-in de test-atlas-tv-live.py.

Faux API, faux compte, faux décodeur : aucune écriture AniList, aucun appel réseau.
Chaque scénario vérifie le comportement, puis capture l'écran pour la revue avant/après.
"""
import copy
import json


def run(window, session, screen, hero, details, calls, QTest, Qt, QObject, spin, evidence, snapshot):
    def data(obj, name):
        value = obj.property(name)
        return value.toVariant() if hasattr(value, 'toVariant') else value

    def shot(name):
        QTest.qWait(260)
        assert window.grabWindow().save(str(evidence / ('parity-' + name + '.png'))), name

    def visual(name):
        # Les délégués de ListView n'ont pas de parent QObject : on parcourt l'arbre visuel.
        stack = [window.contentItem()]
        while stack:
            item = stack.pop()
            if item.objectName() == name and item.property('visible'):
                return item
            stack.extend(item.childItems())
        return None

    def playbacks():
        return [body for path, body in calls if path == '/tv/v1/playbacks']

    def prefs():
        return data(session, 'preferenceWrites')

    def player():
        return window.findChild(QObject, 'episodeLoader').property('item')

    def close_player():
        p = player()
        if p is not None and screen.property('playbackId'):
            p.close()
        spin(lambda: not screen.property('playbackId'))

    report = {}
    for flag in ['delayDetails', 'delayPlaybacks', 'failNextPlayback', 'failNextVariants']:
        session.setProperty(flag, False)
    screen.setProperty('exitVisible', False)
    screen.setProperty('panel', '')

    # 1. La carte Reprendre porte l'épisode et la barre (reprise de catalog/home).
    # L'accueil complet du banc (le parcours principal l'a réduit à « À la une »).
    home = copy.deepcopy(snapshot)
    for row in home['rangees']:
        if row['id'] == 'reprendre':
            for card in row['cartes']:
                episode = card.get('a_lancer', {}).get('numero', 1) or 1
                card['reprise'] = {'episode': episode, 'position_ms': 900000, 'duration_ms': 1440000}
    # L'accueil du 10 novembre (engine 743fa4c0, anime.md § rangées) : « nouveaux » fondue dans
    # Reprendre (« +N »), « sortis » à la place de « ajouts », plus de « populaires » ni « deja_vus ».
    import time
    ids = [r['id'] for r in home['rangees']]
    if 'nouveaux' in ids:
        reprendre = home['rangees'][ids.index('reprendre')]
        for card in home['rangees'][ids.index('nouveaux')]['cartes']:
            card = copy.deepcopy(card)
            card['nouveaux'] = 3
            card['a_lancer'] = None  # Franime n'a pas l'épisode : lancement par anilist_id
            card['franime'] = None
            card['moi'] = dict(card.get('moi') or {}, statut='PAUSED', progression=5)
            card.pop('reprise', None)
            reprendre['cartes'].append(card)
        now = int(time.time())
        sortis = [dict(copy.deepcopy(c), sortie={'episode': 7 + i, 'le': now - [2 * 3600, 26 * 3600, 2 * 86400 + 600, 5 * 86400][i % 4]})
                  for i, c in enumerate(home['rangees'][ids.index('ajouts')]['cartes'][:8])] if 'ajouts' in ids else []
        home['rangees'] = [r for r in home['rangees'] if r['id'] not in ('nouveaux', 'ajouts', 'populaires', 'deja_vus')]
        at = [r['id'] for r in home['rangees']].index('top10') + 1
        home['rangees'].insert(at, {'id': 'sortis', 'titre': 'Sortis cette semaine', 'forme': 'affiche', 'cartes': sortis})
    # `serie {saisons, episodes}` (engine ab6eff69) : la série entière sur chaque carte.
    for row in home['rangees']:
        if row['id'] == 'pour_toi':
            for card, serie in zip(row['cartes'], [{'saisons': 3, 'episodes': 75}, {'saisons': 1, 'episodes': 24}, None]):
                card['serie'] = serie
                card['format'] = 'TV'
    session.setProperty('home', home)
    hero.selectMode('resume')
    hero.setProperty('zone', 'rail')
    hero.forceActiveFocus()
    QTest.qWait(150)
    card = visual('heroCard0')
    assert card is not None, {'rows': [r['id'] for r in data(hero, 'rows')], 'mode': hero.property('mode'), 'selectedRow': hero.property('selectedRow'), 'panel': screen.property('panel'), 'playback': screen.property('playbackId')}
    assert abs(card.property('progress') - 900000 / 1440000) < 1e-6, card.property('progress')
    assert card.property('subtitle').endswith('reste 9 min'), card.property('subtitle')
    shot('home-resume-bar')
    report['resumeBar'] = card.property('subtitle')

    # 1b. Le Top 10 du moment, comme sur le PC : rang en grand derrière l'affiche, rangée qui défile.
    rows = [r['id'] for r in data(hero, 'rows')]
    assert 'top10' in rows, rows
    hero.selectRow(rows.index('top10')); hero.setProperty('zone', 'rail'); hero.choose(0); QTest.qWait(400)
    first = visual('heroTop10Card0')
    assert first is not None and first.property('rank') == 1 and first.property('focused') is True
    shot('home-top10')
    for _ in range(9):
        QTest.keyClick(window, Qt.Key_Right)
    QTest.qWait(500)
    last = visual('heroTop10Card9')
    assert last is not None and last.property('rank') == 10 and last.property('focused') is True
    assert data(hero, 'selected')['anilist_id'] == data(hero, 'rows')[rows.index('top10')]['cartes'][9]['anilist_id']
    shot('home-top10-dix')
    # 1c. Reprendre : « +3 » sur la carte d'une série en pause ; sans `a_lancer`, la suite de
    # sa liste (épisode 6), jamais l'épisode 1.
    hero.selectMode('resume'); hero.setProperty('zone', 'rail'); hero.choose(1); QTest.qWait(400)
    shot('home-reprendre-nouveaux')
    paused = visual('heroCard1')
    assert paused is not None and paused.property('badge') == '+3', paused and paused.property('badge')
    assert visual('heroCard0').property('badge') == ''
    assert paused.property('subtitle') == 'Épisode 6', paused.property('subtitle')
    media = data(hero, 'selected')
    assert data(hero, 'selected')['nouveaux'] == 3
    target = hero.target(media)
    target = target.toVariant() if hasattr(target, 'toVariant') else target
    assert target == {'numero': 6, 'vf': False}, target
    assert window.findChild(QObject, 'heroPlay').property('label') == 'Reprendre · Ép. 6', window.findChild(QObject, 'heroPlay').property('label')
    report['reprendreNouveaux'] = {'badge': '+3', 'target': target}
    # 1d. Sortis cette semaine : « Ép. N · il y a … » sous chaque carte.
    rows = [r['id'] for r in data(hero, 'rows')]
    assert rows[:3] == ['reprendre', 'featured', 'pour_toi'] and 'sortis' in rows and not {'nouveaux', 'ajouts', 'populaires', 'deja_vus'} & set(rows), rows
    hero.selectRow(rows.index('sortis')); hero.setProperty('zone', 'rail'); hero.choose(0); QTest.qWait(400)
    shot('home-sortis')
    labels = [visual('heroCard%d' % i).property('subtitle') for i in range(4)]
    assert labels == ['Ép. 7 · il y a 2 h', 'Ép. 8 · hier', 'Ép. 9 · il y a 2 j', 'Ép. 10 · il y a 5 j'], labels
    report['sortis'] = labels
    # 1e. Saisons et épisodes avant d'ouvrir la fiche : en haut pour la carte ciblée, sous la carte.
    hero.selectRow(rows.index('pour_toi')); hero.setProperty('zone', 'rail'); hero.choose(0); QTest.qWait(400)
    shot('home-serie')
    labels = [visual('heroCard%d' % i).property('subtitle') for i in range(3)]
    assert labels == ['3 saisons · 75 ép.', '24 ép.', ''], labels
    meta = hero.meta(data(hero, 'selected'))
    assert '3 saisons · 75 ép.' in meta and 'Série' not in meta, meta
    report['serie'] = {'cards': labels, 'meta': meta}
    hero.selectMode('resume'); hero.setProperty('zone', 'actions')

    # 2. Avis fugace : en bas, il s'efface seul.
    hero.setProperty('zone', 'actions')
    hero.setProperty('notice', 'La progression n’a pas pu être synchronisée.')
    toast = window.findChild(QObject, 'heroNotice')
    assert toast.property('y') >= 620 and toast.property('shown')
    shot('home-toast')
    toast.expired.emit()
    assert hero.property('notice') == ''

    # 3. Préférences communes : la langue retenue pour la série ouvre la fiche en VF.
    session.setProperty('preferencesEnabled', True)
    session.setProperty('fakePreferences', {'global': {'suivant_auto': True, 'son_bandes_annonces': True},
                                            'series': {'154587': {'langue': 'vf', 'lecteur': {'source': 'anime-sama', 'provider': 'yourupload'}}}})
    session.setProperty('seriesPreferences', {})
    screen.openDetail(details['154587']['carte'])
    detail = window.findChild(QObject, 'atlasDetail')
    spin(lambda: detail.property('state') == 'ready' and detail.property('episodeState') == 'ready')
    spin(lambda: detail.property('french') is True)
    assert 'VF' in window.findChild(QObject, 'detailPlay').property('label')
    # Les épisodes au premier écran : la rangée entière tient sous 720 px sans défiler.
    spin(lambda: abs(window.findChild(QObject, 'detailViewport').property('contentY')) < 1)
    rail = window.findChild(QObject, 'detailEpisodes')
    from PyQt5.QtCore import QPointF
    origin = rail.mapToItem(window.contentItem(), QPointF(0, 0))
    assert origin.y() + rail.property('height') <= 700 and abs(window.findChild(QObject, 'detailViewport').property('contentY')) < 1, origin.y()
    report['episodesFirstScreenBottom'] = origin.y() + rail.property('height')
    shot('detail-preferences-vf')
    # Le choix fait sur la fiche devient la langue de la série.
    before = len(prefs())
    detail.setProperty('zone', 'language'); detail.setProperty('languageIndex', 0); detail.activate()
    spin(lambda: len(prefs()) == before + 1)
    assert prefs()[-1] == {'anilist_id': 154587, 'langue': 'vo'}, prefs()[-1]
    detail.setProperty('zone', 'language'); detail.setProperty('languageIndex', 1); detail.activate()
    spin(lambda: len(prefs()) == before + 2)

    # 4. Synopsis en un seul endroit : l'en-tête, « Plus » ouvre le texte entier ; À propos ne le répète pas.
    summary = window.findChild(QObject, 'detailSummary')
    if summary.property('truncated'):
        detail.setProperty('zone', 'synopsis'); detail.activate()
        assert detail.property('synopsisOpen') is True
        shot('detail-synopsis')
        QTest.keyClick(window, Qt.Key_Back)
        assert detail.property('synopsisOpen') is False and screen.property('panel') == 'detail'
    facts = window.findChild(QObject, 'detailFacts')
    assert facts is not None and facts.property('visible')
    detail.setProperty('zone', 'about'); detail.scrollToZone(); QTest.qWait(300)
    shot('detail-about')
    detail.setProperty('zone', 'actions'); detail.scrollToZone()

    # 5. Lancement : langue et lecteur retenus ; le lecteur retenu est une préférence souple.
    session.setProperty('failNextPlayback', True)
    count = len(playbacks())
    screen.launch(details['154587']['carte'], {'numero': 1, 'vf': False}, [], None)
    spin(lambda: len(playbacks()) == count + 2 and screen.property('playbackId'))
    first, second = playbacks()[-2], playbacks()[-1]
    assert first['lang'] == 'vf' and first.get('source') == 'anime-sama', first
    assert second['lang'] == 'vf' and 'source' not in second, 'A failing remembered reader falls back to Automatique'
    report['preferredReaderFallback'] = True
    spin(lambda: player() is not None and player().property('playing') is True)

    # 6. Menu Source : la coche dit le choix, la pastille dit ce qui joue (même en Automatique).
    p = player()
    p.openMenu('source')
    menu = window.findChild(QObject, 'playerMenu')
    spin(lambda: menu.property('state') == 'ready' and len(data(menu, 'entries')) > 2)
    entries = data(menu, 'entries')
    playing = [e for e in entries if e.get('playing')]
    assert len(playing) == 1 and playing[0]['readerId'] == 'e' * 64, entries
    assert visual('playingPill') is not None
    shot('player-source-pill')
    # Un lecteur choisi à la main, qui démarre, est retenu pour la série.
    target = [i for i, e in enumerate(entries) if e.get('readerId') == 'f' * 64][0]
    menu.setProperty('index', target); menu.activate()
    spin(lambda: data(screen, 'pendingPlayback')['readerId'] == 'f' * 64 and player().property('playing') is True)
    spin(lambda: any(w.get('lecteur') == {'source': 'anime-sama', 'provider': 'yourupload'} for w in prefs()))
    report['readerRemembered'] = True

    # 7. Avance plus fine : 10 s, puis 30 s quand on insiste dans le même sens.
    p = player()
    # La reprise doit être faite (position réelle, plus de saut en attente) avant de viser.
    spin(lambda: p.property('resumed') and p.property('observationResumeTarget') < 0 and p.property('positionMs') > 1000)
    position = p.property('positionMs')
    p.setProperty('controlsVisible', True); p.setProperty('zone', 'seek')
    for _ in range(4):
        p.propose(1)
    assert p.property('proposedMs') == position + 10000 * 3 + 30000, (position, p.property('proposedMs'))
    shot('player-seek-accelerated')
    QTest.keyClick(window, Qt.Key_Back)
    assert p.property('proposedMs') == -1

    # 8. La carte « À suivre » : vignette, titre, décompte annulable, réglable.
    close_player()
    session.setProperty('nextSuivant', {'anilist_id': 154587, 'episode': 2, 'saison_changee': False})
    count = len(playbacks())
    screen.launch(details['154587']['carte'], {'numero': 1, 'vf': True, 'explicitLanguage': True}, [], None)
    spin(lambda: player() is not None and player().property('playing') is True)
    decoder = player().findChild(QObject, 'episodeMedia')
    def near_end():
        d = player().findChild(QObject, 'episodeMedia')
        if d.property('position') < d.property('duration') * 0.8:
            d.setProperty('position', int(d.property('duration') * 0.9))
        return player().property('upNextPrepared') is True
    spin(near_end)
    decoder = player().findChild(QObject, 'episodeMedia')
    decoder.setProperty('status', 7)
    upnext = player().findChild(QObject, 'upNext')
    spin(lambda: upnext.property('visible') is True)
    spin(lambda: upnext.property('episodeTitle') != '')
    assert upnext.property('automatic') is True and upnext.property('remaining') == 8
    QTest.qWait(1150)
    assert upnext.property('remaining') == 7, upnext.property('remaining')
    shot('player-up-next')
    QTest.keyClick(window, Qt.Key_Right); QTest.keyClick(window, Qt.Key_Return)
    assert upnext.property('visible') is False and screen.property('playbackId'), 'Rester keeps the ended episode open'
    assert len(playbacks()) == count + 1
    shot('player-up-next-cancelled')
    # Lancer : l'épisode 2 par le chemin normal, dans la même langue, en lecture.
    session.setProperty('nextSuivant', None)
    upnext.open(); QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: len(playbacks()) == count + 2)
    assert playbacks()[-1]['episode'] == 2 and playbacks()[-1]['lang'] == 'vf'
    spin(lambda: player().property('playing') is True)
    report['upNext'] = {'countdown': True, 'cancel': True, 'launch': True}
    # Saison suivante, sans lecture automatique : la carte attend un choix.
    close_player()
    session.savePreferences({'suivant_auto': False}, None)
    spin(lambda: data(session, 'preferences')['suivant_auto'] is False)
    session.setProperty('nextSuivant', {'anilist_id': 182255, 'episode': 1, 'saison_changee': True, 'titre': 'Frieren Saison 2'})
    screen.launch(details['154587']['carte'], {'numero': 28, 'vf': False, 'explicitLanguage': True}, [], None)
    spin(lambda: player() is not None and player().property('playing') is True)
    decoder = player().findChild(QObject, 'episodeMedia')
    decoder.setProperty('status', 7)
    upnext = player().findChild(QObject, 'upNext')
    spin(lambda: upnext.property('visible') is True)
    assert upnext.property('automatic') is False and 'Frieren Saison 2' in upnext.property('heading')
    QTest.qWait(1100)
    assert upnext.property('remaining') == 8, 'No countdown when automatic next episode is off'
    shot('player-up-next-season')
    QTest.keyClick(window, Qt.Key_Back)
    session.savePreferences({'suivant_auto': True}, None)
    session.setProperty('nextSuivant', None)
    close_player()

    # 9. Mon suivi : la progression se modifie ; la note est visible ; l'avis écrit ne s'affiche jamais,
    #    même si une réponse le portait (décision de Walson, 10 novembre).
    session.setProperty('libraryEnabled', True)
    session.seedLibraryJson(154587, json.dumps({'anilist_id': 154587, 'presence': 'present', 'revision': 'r1', 'editable': True,
                                                'moi': {'statut': 'CURRENT', 'note': 8, 'progression': 5,
                                                        'avis': 'Une lenteur qui fait du bien : chaque épisode prend son temps, et ça marche.'}}))
    store = window.findChild(QObject, 'detailLibrary')
    store.load(154587)
    screen.openDetail(details['154587']['carte'])
    detail = window.findChild(QObject, 'atlasDetail')
    spin(lambda: detail.property('state') == 'ready' and detail.property('personalPhase') == 'ready')
    editor = window.findChild(QObject, 'libraryEditor')
    detail.personalAction(True)
    spin(lambda: editor.property('editable'))
    assert '8' in window.findChild(QObject, 'detailRate').property('label'), 'The rating is visible on the detail page'
    def texts(item):
        out = []
        for child in item.childItems():
            value = child.property('text')
            if isinstance(value, str) and child.property('visible'):
                out.append(value)
            out.extend(texts(child))
        return out
    assert not any('lenteur' in t for t in texts(window.contentItem())), 'A written review must never reach the TV screen'
    assert editor.property('total') == 28
    editor.setProperty('zone', 'progress')
    QTest.keyClick(window, Qt.Key_Right); QTest.keyClick(window, Qt.Key_Right)
    assert editor.property('draftProgress') == 7 and editor.property('dirty')
    shot('followup-progress-note')
    editor.setProperty('zone', 'actions'); editor.setProperty('actionIndex', 0)
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: not editor.property('opened'))
    write = [b for path, b in calls if path == '/tv/v1/library-update'][-1]
    assert write['progression'] == 7 and 'note' not in write and 'statut' not in write, write
    report['progressEdited'] = True
    QTest.keyClick(window, Qt.Key_Back); QTest.qWait(80)

    # 9b. Ma liste : ta note sur chaque affiche notée, lisible sans focus.
    screen.openPanel('library')
    library = window.findChild(QObject, 'atlasLibrary')
    spin(lambda: library.property('state') == 'ready' and len(data(library, 'results')) > 0)
    QTest.qWait(300)
    assert visual('posterNote') is not None, 'The rating badge is shown on Ma liste posters'
    shot('library-notes')
    QTest.keyClick(window, Qt.Key_Back); QTest.qWait(80)

    # 10. Recherche : accents au clavier et recherches récentes.
    screen.openPanel('search')
    search = window.findChild(QObject, 'atlasDiscovery')
    spin(lambda: search.property('opened'))
    search.openKeyboard()
    letters = data(search, 'letters')
    assert 'É' in letters and "'" in letters and search.property('keyRows') == 5
    search.setProperty('keyboardZone', 'keys'); search.setProperty('keyIndex', letters.index('É')); search.activate()
    search.setProperty('draftQuery', 'ÉDEN'); search.submitQuery()
    search.openKeyboard(); search.setProperty('draftQuery', "KAGUYA-SAMA"); search.submitQuery()
    search.openKeyboard()
    recent = data(search, 'recentQueries')
    assert recent[:2] == ['KAGUYA-SAMA', 'ÉDEN'] and len(recent) <= 6 and len(set(q.lower() for q in recent)) == len(recent), recent
    search.setProperty('keyboardZone', 'keys'); search.setProperty('keyIndex', 0)
    QTest.keyClick(window, Qt.Key_Up)
    assert search.property('keyboardZone') == 'recent'
    search.setProperty('keyboardZone', 'keys'); search.setProperty('keyIndex', letters.index('É'))
    shot('search-keyboard-accents-recent')
    QTest.keyClick(window, Qt.Key_Back); QTest.keyClick(window, Qt.Key_Back); QTest.qWait(80)

    # 11. Profil enrichi et réglages ; « Animations réduites » se propage à tous les écrans.
    screen.openPanel('profile')
    profile = window.findChild(QObject, 'atlasProfile')
    spin(lambda: profile.property('state') == 'ready')
    history = data(profile, 'history')
    history['chiffres']['genres'] = [{'genre': 'Fantasy', 'nombre': 9, 'moyenne': 84, 'minutes': 2100}, {'genre': 'Aventure', 'nombre': 7, 'moyenne': 81, 'minutes': 1700},
                                     {'genre': 'Drame', 'nombre': 5, 'moyenne': 79, 'minutes': 1200}, {'genre': 'Action', 'nombre': 4, 'moyenne': 72, 'minutes': 900}]
    history['chiffres']['statuts'] = [{'status': 'COMPLETED', 'count': 8}, {'status': 'CURRENT', 'count': 3}, {'status': 'PLANNING', 'count': 12}]
    profile.setProperty('history', history)
    QTest.qWait(120)
    assert len(data(profile, 'genres')) == 4 and len(data(profile, 'notes')) > 0
    shot('profile-top')
    profile.setProperty('zone', 'notes'); profile.scroll(); QTest.qWait(300)
    shot('profile-notes')
    profile.setProperty('zone', 'settings'); profile.setProperty('settingIndex', 2); profile.scroll(); QTest.qWait(300)
    QTest.keyClick(window, Qt.Key_Return)
    assert screen.property('reducedMotion') is True and hero.property('reducedMotion') is True
    assert window.findChild(QObject, 'atlasDetail').property('reducedMotion') is True
    profile.setProperty('settingIndex', 0)
    before = len(prefs())
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: len(prefs()) == before + 1)
    assert prefs()[-1] == {'suivant_auto': False}
    shot('profile-settings')
    QTest.keyClick(window, Qt.Key_Return)
    profile.setProperty('settingIndex', 2); QTest.keyClick(window, Qt.Key_Return)
    assert screen.property('reducedMotion') is False
    QTest.keyClick(window, Qt.Key_Back); QTest.qWait(80)
    # 9. Catalogue privé : une suite de touches depuis « Genres », pour la séance seulement.
    def searches():
        return [body for path, body in calls if path == '/tv/v1/catalog/search']
    def finish_last():
        session.finishSearch(len(data(session, 'pendingSearches')) - 1)
    count = len(searches())
    screen.openPanel('search')
    search = window.findChild(QObject, 'atlasDiscovery')
    spin(lambda: len(searches()) > count)
    finish_last(); spin(lambda: search.property('state') == 'ready')
    search.setProperty('zone', 'filters'); search.setProperty('filterIndex', 0); search.forceActiveFocus()
    assert 'Hentai' not in [o[0] for o in data(search, 'genreOptions')]
    keys = [Qt.Key_Up, Qt.Key_Up, Qt.Key_Down, Qt.Key_Down, Qt.Key_Left, Qt.Key_Right, Qt.Key_Left, Qt.Key_Right]
    for key in keys[:7]:
        QTest.keyClick(window, key)
    assert session.property('privateCatalog') is False and search.property('zone') == 'filters' and search.property('filterIndex') == 0
    for key in keys:
        QTest.keyClick(window, key)
    assert session.property('privateCatalog') is True, data(search, 'sequence')
    assert search.property('zone') == 'filters' and search.property('filterIndex') == 0 and not search.property('overlay')
    shot('search-private-unlocked')
    QTest.keyClick(window, Qt.Key_Return)
    options = data(search, 'options')
    assert search.property('overlay') == 'filter' and options[-1] == ['Hentai', 'H'], options[-3:]
    search.setProperty('optionIndex', len(options) - 1); QTest.qWait(200)
    shot('search-private-chip')
    search.chooseOption(); search.applyFilter()
    spin(lambda: searches()[-1].get('prive') is True)
    assert searches()[-1]['prive'] is True and 'Hentai' in searches()[-1]['genres'], searches()[-1]
    finish_last(); spin(lambda: search.property('state') == 'ready')
    found = data(search, 'results')
    assert found and all(c['prive'] is True and session.isPrivate(c['anilist_id']) for c in found)
    search.setProperty('zone', 'results'); search.setProperty('resultIndex', 0); search.forceActiveFocus()
    before = len(calls)
    QTest.keyClick(window, Qt.Key_Return)
    spin(lambda: screen.property('panel') == 'detail')
    detail = window.findChild(QObject, 'atlasDetail')
    spin(lambda: any(path == '/tv/v1/catalog/episodes' for path, _ in calls[before:]))
    opened = [(path, body) for path, body in calls[before:] if path.startswith('/tv/v1/catalog/')]
    assert opened and all(body.get('prive') is True for path, body in opened), opened
    assert not any(path == '/tv/v1/catalog/versions' for path, _ in opened)
    assert detail.property('privateCard') is True and detail.property('personalEnabled') is False
    assert not window.findChild(QObject, 'detailList').property('visible') and not window.findChild(QObject, 'detailRate').property('visible')
    writes = len(prefs())
    session.savePreferences({'anilist_id': found[0]['anilist_id'], 'langue': 'vf'}, None)
    assert len(prefs()) == writes
    # Une fiche privée complète (fixture du banc) : ni « Ma liste » ni « Noter ».
    QTest.keyClick(window, Qt.Key_Back); QTest.qWait(80)
    card = copy.deepcopy(details['154587']['carte']); card['prive'] = True
    screen.openDetail(card)
    spin(lambda: detail.property('state') == 'ready' and detail.property('episodeState') == 'ready')
    assert detail.property('personalEnabled') is False and not window.findChild(QObject, 'detailList').property('visible')
    shot('detail-private')
    report['privateCatalog'] = {'search': searches()[-1], 'detailCalls': [p for p, _ in opened]}
    QTest.keyClick(window, Qt.Key_Back); QTest.qWait(80)
    QTest.keyClick(window, Qt.Key_Back); QTest.qWait(80)
    session.setProperty('privateCatalog', False); session.setProperty('privateIds', {})
    session.setProperty('preferencesEnabled', False)
    report['passed'] = True
    (evidence / 'parity.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
