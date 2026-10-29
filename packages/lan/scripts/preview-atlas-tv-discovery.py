"""Capture actual discovery QML with explicit PC fixtures, no network or publication."""
import argparse
import json
import os
import pathlib
import sys
import traceback

parser = argparse.ArgumentParser(description=__doc__)
for name in ['qt-path', 'cards', 'regular', 'bold', 'captures']:
    parser.add_argument('--'+name, type=pathlib.Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.qt_path.resolve()))
dll = os.add_dll_directory(str(args.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name == 'nt' else None
from PyQt5.QtCore import QByteArray, QObject, Qt, QTimer, QT_VERSION_STR, qInstallMessageHandler
from PyQt5.QtGui import QFontDatabase, QGuiApplication
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow
from PyQt5.QtTest import QTest

messages = []
qInstallMessageHandler(lambda kind, context, value: messages.append(value))
app = QGuiApplication([])
for path in [args.regular, args.bold]:
    font_id = QFontDatabase.addApplicationFontFromData(QByteArray(path.read_bytes()))
    assert font_id >= 0
family = QFontDatabase.applicationFontFamilies(font_id)[0]
fixture = json.loads(args.cards.read_text(encoding='utf-8'))['cards']
assert len(fixture) >= 25, 'Use at least two pages of real catalog cards'
engine = QQmlApplicationEngine()
engine.rootContext().setContextProperty('benchCards', fixture)
engine.rootContext().setContextProperty('benchFamily', family)
source = pathlib.Path(__file__).resolve().parent.parent/'devialet/hero'
engine.loadData(('''import QtQuick 2.15
import QtQuick.Window 2.2
import "'''+source.as_uri()+'''"
import "'''+(source/'Discovery.js').as_uri()+'''" as Catalog
Window {
    id:host;width:1280;height:720;visible:true
    property bool showOld:false
    property var chosenCard:null
    property var calls:[]
    function finish(index,status){session.finish(index,status);}
    function returnFromDetail(){candidate.open();}
    QtObject {
        id:session
        property var home:({hero:benchCards.slice(0,6),compte:{pseudo:'Profil'}})
        property var pending:[]
        function api(path,body,timeout,callback){var next=host.calls.slice();next.push({path:path,body:body});host.calls=next;pending.push({body:body,callback:callback});}
        function finish(index,status){
            var request=pending[index],b=request.body,rows=benchCards.slice();
            if(status!==200){request.callback(status,null);return;}
            if(b.q)rows=rows.filter(function(c){return (c.titre+' '+c.titre_romaji).toLowerCase().indexOf(b.q.toLowerCase())>=0;});
            if(b.genres)rows=rows.filter(function(c){return b.genres.every(function(g){var fr=Catalog.label(Catalog.genres,g);return c.genres.indexOf(fr)>=0;});});
            if(b.format)rows=rows.filter(function(c){return c.format===b.format;});
            if(b.annee)rows=rows.filter(function(c){return c.annee===b.annee;});
            if(b.statut)rows=rows.filter(function(c){return c.statut===b.statut;});
            if(b.tri==='notes')rows.sort(function(a,b){return (b.score || 0)-(a.score || 0);});
            if(b.tri==='popularite')rows.sort(function(a,b){return (b.popularite || 0)-(a.popularite || 0);});
            var page=b.page || 1;
            request.callback(200,{resultats:rows.slice((page-1)*24,page*24),page:page,has_next_page:rows.length>page*24});
        }
    }
    DiscoveryView {id:candidate;anchors.fill:parent;visible:!host.showOld;family:benchFamily;transport:session;onChosen:{host.chosenCard=cards[index];opened=false;}}
    SearchView {anchors.fill:parent;visible:host.showOld;family:benchFamily;transport:session}
}''').encode())
assert engine.rootObjects(), messages
window = engine.rootObjects()[0]
view = window.findChild(QObject, 'atlasDiscovery')
grid = window.findChild(QObject, 'discoveryGrid')
assert view and grid
args.captures.mkdir(parents=True, exist_ok=False)
checks, captures = [], []


def value(obj, name):
    item = obj.property(name)
    return item.toVariant() if hasattr(item, 'toVariant') else item


def expect(condition, name):
    assert condition, name
    checks.append(name)


def key(which, times=1):
    for _ in range(times):
        QTest.keyClick(window, which)
    QTest.qWait(50)


def capture(name):
    QTest.qWait(280)
    assert window.grabWindow().save(str(args.captures/(name+'.png')))
    captures.append(name)


def finish(status=200, index=None):
    window.finish(len(value(window, 'calls'))-1 if index is None else index, status)
    QTest.qWait(100)


def run():
    try:
        window.requestActivate()
        window.setProperty('showOld', True)
        capture('00-before')
        window.setProperty('showOld', False)
        view.open()
        expect(value(window, 'calls')[-1]['body']=={'page':1}, 'entry browses catalog without a query')
        finish()
        expect(value(view,'state')=='ready' and len(value(view,'cards'))==24, 'first catalog page renders 24 actual fixture cards')
        capture('01-explore')
        key(Qt.Key_Down)
        key(Qt.Key_Right)
        expect(value(view,'zone')=='results' and value(view,'resultIndex')==1, 'remote enters grid and targets next anime')
        capture('02-target')
        key(Qt.Key_Down,3)
        expect(value(view,'resultIndex')==13 and value(grid,'contentY')>0, 'Down scrolls catalog to the selected row')
        capture('03-scroll')
        key(Qt.Key_Return)
        saved_y=value(grid,'contentY')
        expect(not value(view,'opened') and value(window,'chosenCard')['anilist_id']==fixture[13]['anilist_id'], 'OK hands selected card to detail without playback')
        window.returnFromDetail()
        expect(value(view,'resultIndex')==13 and abs(value(grid,'contentY')-saved_y)<1, 'return from detail retains index and exact scroll')
        capture('04-return')
        key(Qt.Key_Up,4)
        expect(value(view,'zone')=='filters', 'Up reaches filters from the first row')
        key(Qt.Key_Return)
        key(Qt.Key_Down,4)
        key(Qt.Key_Return)
        expect(value(view,'draft')['genres']==['Fantasy'] and value(view,'filters')['genres']==[], 'genre choice remains a draft until Apply')
        capture('05-genres')
        key(Qt.Key_Back)
        expect(value(view,'overlay')=='' and value(view,'filters')['genres']==[] and value(view,'opened'), 'Back cancels genre draft without leaving Search')
        key(Qt.Key_Return)
        for _ in range(4):
            key(Qt.Key_Return)
            key(Qt.Key_Down)
        expect(len(value(view,'draft')['genres'])==3 and value(view,'filterNotice'), 'genre selection is capped at three with visible explanation')
        key(Qt.Key_Back)
        key(Qt.Key_Return)
        key(Qt.Key_Down,4)
        key(Qt.Key_Return)
        key(Qt.Key_Right)
        key(Qt.Key_Return)
        expect(value(window,'calls')[-1]['body']=={'genres':['Fantasy'],'page':1}, 'Apply sends canonical genres and resets pagination')
        finish()
        expect(all('Fantasy' in c['genres'] for c in value(view,'results')), 'filtered fixture page contains the requested genre')
        capture('06-filtered')
        view.setProperty('zone','filters')
        view.openFilter(1)
        key(Qt.Key_Down,2)
        capture('07-format')
        key(Qt.Key_Return)
        expect(value(window,'calls')[-1]['body']=={'genres':['Fantasy'],'format':'MOVIE','page':1}, 'format combines with the applied genre')
        finish()
        capture('08-combined')
        view.openFilter(2)
        key(Qt.Key_Down,2)
        selected_year=int(value(view,'options')[2][0])
        capture('15-year')
        key(Qt.Key_Return)
        expect(value(window,'calls')[-1]['body']=={'genres':['Fantasy'],'format':'MOVIE','annee':selected_year,'page':1}, 'year is numeric and combines with existing criteria')
        finish()
        view.openFilter(3)
        key(Qt.Key_Down,2)
        capture('16-status')
        key(Qt.Key_Return)
        expect(value(window,'calls')[-1]['body']['statut']=='FINISHED', 'status label sends the canonical diffusion enum')
        finish()
        # A fresh query clears none of the user's filters unless Effacer is chosen.
        view.setProperty('zone','filters')
        view.setProperty('filterIndex',5)
        key(Qt.Key_Return)
        finish()
        view.setProperty('zone','search')
        key(Qt.Key_Return)
        for letter in [Qt.Key_Z,Qt.Key_E,Qt.Key_R,Qt.Key_O]:key(letter)
        capture('09-keyboard')
        key(Qt.Key_Back)
        expect(value(view,'query')=='' and value(view,'zone')=='search', 'Back cancels title draft and returns to its trigger')
        key(Qt.Key_Return)
        for letter in [Qt.Key_Z,Qt.Key_E,Qt.Key_R,Qt.Key_O]:key(letter)
        key(Qt.Key_Down,4)
        key(Qt.Key_Right,2)
        key(Qt.Key_Return)
        expect(value(window,'calls')[-1]['body']=={'q':'zero','page':1}, 'remote keyboard submits a real title query')
        finish()
        expect(value(view,'results') and all('zero' in (c['titre']+' '+c['titre_romaji']).lower() for c in value(view,'results')), 'title query renders matching fixture cards')
        capture('10-title')
        view.setProperty('query','zzzzzz');view.restart();finish()
        expect(value(view,'state')=='ready' and not value(view,'results'), 'empty results remain empty without fallback titles')
        capture('14-empty')
        # Exercise asynchronous races: an old response must never replace a new one.
        view.setProperty('query','mob');view.restart()
        stale=len(value(window,'calls'))-1
        view.setProperty('query','eternity');view.restart()
        finish()
        ids=[c['anilist_id'] for c in value(view,'results')]
        finish(index=stale)
        expect([c['anilist_id'] for c in value(view,'results')]==ids and ids, 'late catalog response cannot overwrite current criteria')
        view.setProperty('query','');view.restart();finish()
        view.setProperty('zone','results');view.setProperty('resultIndex',23)
        key(Qt.Key_Down);key(Qt.Key_Return)
        expect(value(window,'calls')[-1]['body']=={'page':2}, 'end of grid reaches the real next page action')
        finish();capture('11-next-page')
        expect(value(view,'page')==2 and value(view,'results')[0]['anilist_id']==fixture[24]['anilist_id'], 'next page is distinct, not a repeated home subset')
        view.goPage(-1);finish()
        expect(value(view,'page')==1 and value(view,'resultIndex')==23, 'previous page restores its focused card')
        key(Qt.Key_Up,5);key(Qt.Key_Up)
        view.openFilter(4);key(Qt.Key_Down,3);key(Qt.Key_Return)
        expect(value(window,'calls')[-1]['body']=={'tri':'notes','page':1}, 'sort is a server request before pagination')
        capture('12-loading')
        finish(503);capture('13-error')
        expect(value(view,'filters')['tri']=='notes' and value(view,'state')=='error', 'network failure retains filters without substituting a home list')
        view.setProperty('zone','pages');view.setProperty('pageIndex',1)
        key(Qt.Key_Return);finish()
        expect(value(view,'state')=='ready', 'retry reuses current criteria')
        view.search(False,1);last=len(value(window,'calls'))-1
        view.close();finish(index=last)
        expect(not value(view,'opened') and value(view,'state')=='loading', 'closed screen rejects an in-flight response')
        view.open();finish()
        expect(value(view,'state')=='ready', 'reopening interrupted request cannot leave a permanent loading state')
        # Short last rows must remain reachable from every column above.
        view.setProperty('zone','results')
        view.setProperty('results',fixture[:6])
        view.setProperty('resultIndex',3)
        key(Qt.Key_Down)
        expect(value(view,'resultIndex')==5, 'Down reaches a short final row instead of skipping it')
        key(Qt.Key_Left)
        at_start=value(grid,'contentY')
        key(Qt.Key_Left)
        expect(value(view,'resultIndex')==4 and value(grid,'contentY')==at_start, 'first column and viewport do not need an extra Left')
        view.setProperty('resultIndex',0)
        view.setProperty('reducedMotion',True)
        key(Qt.Key_Right,2)
        expect(value(view,'resultIndex')==2, 'reduced motion preserves directional navigation')
        bad=[m for m in messages if any(t in m for t in ['ReferenceError','TypeError','Cannot assign','Unable to assign','Binding loop','Cannot open:','is not a function'])]
        expect(not bad, 'QML runtime has no binding, asset or script errors: '+str(bad))
        result={'checks':checks,'captures':captures,'resolution':[1280,720],'qtVersion':QT_VERSION_STR,'data':'48 actual Atlas PC fixture cards assembled for UI review; NOT a live catalog ranking','network':False,'published':False,'nativeDecoder':False,'nativeQa':False,'apiCalls':value(window,'calls'),'qmlMessages':messages}
        (args.captures/'review.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps({'checks':len(checks),'captures':captures,'qt':QT_VERSION_STR,'errors':bad}))
        app.quit()
    except Exception:
        traceback.print_exc()
        print(json.dumps({'qmlMessages':messages,'calls':value(window,'calls'),'zone':value(view,'zone'),'overlay':value(view,'overlay'),'key':value(view,'keyIndex'),'tool':value(view,'toolIndex')},ensure_ascii=False))
        app.exit(1)


QTimer.singleShot(200,run)
sys.exit(app.exec_())
