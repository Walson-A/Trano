"""Capture the isolated transport study and exercise its remote state contract."""
import argparse
import json
import os
import pathlib
import sys
import traceback

parser = argparse.ArgumentParser(description=__doc__)
for name in ['qt-path', 'frame', 'regular', 'bold', 'captures']:
    parser.add_argument('--'+name, type=pathlib.Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.qt_path.resolve()))
dll = os.add_dll_directory(str(args.qt_path.resolve() / 'PyQt5/Qt5/bin')) if os.name == 'nt' else None
from PyQt5.QtCore import QByteArray, QObject, Qt, QTimer, QT_VERSION_STR, qInstallMessageHandler
from PyQt5.QtGui import QFontDatabase, QGuiApplication
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow
from PyQt5.QtTest import QTest
from PyQt5 import sip

messages = []
qInstallMessageHandler(lambda kind, context, value: messages.append(value))
app = QGuiApplication([])
for path in [args.regular, args.bold]:
    index = QFontDatabase.addApplicationFontFromData(QByteArray(path.read_bytes()))
    assert index >= 0
family = QFontDatabase.applicationFontFamilies(index)[0]
engine = QQmlApplicationEngine()
source = pathlib.Path(__file__).resolve().parent.parent / 'devialet/design-player/transport'
engine.rootContext().setContextProperty('studyFrame', args.frame.resolve().as_uri())
engine.rootContext().setContextProperty('studyFamily', family)
engine.loadData(('import QtQuick 2.15\nimport QtQuick.Window 2.2\nimport "'+source.as_uri()+'"\nWindow {width:1280;height:720;visible:true;PlayerPreview {frame:studyFrame;family:studyFamily}}').encode())
assert engine.rootObjects(), messages
window = engine.rootObjects()[0]
study = window.findChild(QObject, 'transportStudy')
assert study
args.captures.mkdir(parents=True, exist_ok=False)
states = ['hud', 'focus', 'pause', 'timeline', 'quality', 'quality-original', 'version', 'source', 'episodes', 'episodes-far', 'seasons', 'loading', 'change-error', 'error', 'error-source', 'episode-loading', 'bright', 'video']
checks = []


def key(value):
    QTest.keyClick(window, value)


def expect(expression, name):
    assert expression, name
    checks.append(name)


def run():
    try:
        window.requestActivate()
        study.forceActiveFocus(Qt.OtherFocusReason)
        for name in states:
            study.showState(name)
            QTest.qWait(180)
            assert window.grabWindow().save(str(args.captures / (name+'.png')))
        study.showState('quality')
        key(Qt.Key_Return)
        expect(study.property('pending') and study.property('quality') == '1080p', 'quality is unchanged during preparation')
        key(Qt.Key_Back)
        expect(not study.property('pending') and study.property('menu') == 'quality', 'Back cancels preparation into the same menu')
        key(Qt.Key_Return)
        study.complete(False)
        expect(study.property('pendingFailed') and study.property('positionMs') == 432000, 'failed preparation preserves position and selection')
        key(Qt.Key_Back)
        key(Qt.Key_Return)
        study.complete(True)
        expect(study.property('quality') == '360p' and study.property('zone') == 'settings' and study.property('commandIndex') == 2, 'successful quality choice returns to its trigger')
        study.showState('timeline')
        study.setProperty('paused', True)
        key(Qt.Key_Back)
        expect(study.property('positionMs') == 432000 and study.property('proposedMs') == -1 and study.property('paused'), 'cancel seek preserves position and paused intention')
        study.showState('timeline')
        key(Qt.Key_Return)
        expect(study.property('positionMs') == 565000 and not study.property('paused'), 'confirm seek applies proposed position without pausing')
        study.showState('timeline')
        key(Qt.Key_Up)
        expect(study.property('proposedMs') == -1 and study.property('positionMs') == 432000, 'leaving timeline cancels an unconfirmed seek')
        study.showState('version')
        key(Qt.Key_Return)
        study.complete(True)
        expect(study.property('version') == 'VF' and study.property('positionMs') == 432000, 'version preparation preserves position')
        study.showState('source')
        key(Qt.Key_Return)
        study.complete(True)
        study.openSetting(2)
        expect(study.property('quality') == 'Originale' and len(study.property('options').toVariant()) == 1, 'single file does not manufacture quality alternatives')
        study.showState('episodes')
        for _ in range(18):
            key(Qt.Key_Right)
        expect(study.property('episodeIndex') == 19, 'remote reaches last episode')
        for _ in range(19):
            key(Qt.Key_Left)
        QTest.qWait(150)
        shelf = study.findChild(QObject, 'episodeShelf')
        expect(study.property('episodeIndex') == 0 and abs(shelf.property('contentX')) < 1, 'shelf returns to first item without extra Left')
        key(Qt.Key_Up)
        key(Qt.Key_Return)
        key(Qt.Key_Down)
        key(Qt.Key_Return)
        expect(study.property('season') == 2 and study.property('playingSeason') == 1 and study.property('menu') == 'episodes', 'browsing seasons does not change playing content')
        key(Qt.Key_Back)
        expect(study.property('zone') == 'content' and study.property('menu') == '', 'close episodes returns to content trigger')
        study.showState('episodes')
        key(Qt.Key_Return)
        key(Qt.Key_Back)
        expect(study.property('currentEpisode') == 1 and study.property('positionMs') == 432000, 'cancel another episode leaves current episode intact')
        study.showState('error')
        key(Qt.Key_Right)
        key(Qt.Key_Return)
        expect(study.property('menu') == 'source', 'source remains reachable after playback failure')
        study.showState('focus')
        key(Qt.Key_Down)
        key(Qt.Key_Down)
        key(Qt.Key_Up)
        key(Qt.Key_Up)
        expect(study.property('zone') == 'settings' and study.property('commandIndex') == 1, 'settings retain focused command across vertical navigation')
        bad = [m for m in messages if any(term in m for term in ['ReferenceError', 'TypeError', 'Cannot assign', 'Unable to assign', 'Cannot open:', 'Binding loop', 'failed'])]
        expect(not bad, 'QML loads without runtime errors: '+str(bad))
        result = {'states': states, 'resolution': [1280, 720], 'qtVersion': QT_VERSION_STR, 'checks': checks, 'qmlMessages': messages, 'staticFrame': True, 'fixtureChoices': True, 'nativeDecoder': False, 'apiCalls': False, 'sdkLaunched': False}
        (args.captures / 'review.json').write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
        app.quit()
    except Exception:
        messages.append(traceback.format_exc())
        app.exit(1)


QTimer.singleShot(500, run)
QTimer.singleShot(20000, lambda: app.exit(2))
code = app.exec_()
window.close()
sip.delete(engine)
if code:
    raise AssertionError(messages)
print(json.dumps({'passed': True, 'states': len(states), 'checks': len(checks), 'scope': 'isolated QML, no decoder or network'}))
