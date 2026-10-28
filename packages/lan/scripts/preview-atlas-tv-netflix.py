"""Render the separate Netflix-reference QML proposal, never a live media session."""
import argparse
import json
import os
import pathlib
import sys
import traceback

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path', type=pathlib.Path, required=True)
parser.add_argument('--frame', type=pathlib.Path, required=True)
parser.add_argument('--regular', type=pathlib.Path, required=True)
parser.add_argument('--bold', type=pathlib.Path, required=True)
parser.add_argument('--captures', type=pathlib.Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.qt_path.resolve()))
dll = os.add_dll_directory(str(args.qt_path.resolve() / 'PyQt5/Qt5/bin')) if os.name == 'nt' else None
from PyQt5.QtCore import QByteArray, QObject, Qt, QTimer, qInstallMessageHandler
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
source = pathlib.Path(__file__).resolve().parent.parent / 'devialet/design-player/netflix'
engine.rootContext().setContextProperty('studyFrame', args.frame.resolve().as_uri())
engine.rootContext().setContextProperty('studyFamily', family)
engine.loadData(('import QtQuick 2.15\nimport QtQuick.Window 2.2\nimport "' + source.as_uri() + '"\nWindow {width:1280;height:720;visible:true;PlayerPreview {frame:studyFrame;family:studyFamily}}').encode())
assert engine.rootObjects(), messages
window = engine.rootObjects()[0]
study = window.findChild(QObject, 'netflixPlayerStudy')
args.captures.mkdir(parents=True, exist_ok=False)
states = ['video', 'hud', 'focus', 'pause', 'timeline', 'quality', 'quality-original', 'language', 'source', 'episodes', 'seasons', 'loading', 'error']


def run():
    try:
        window.requestActivate()
        study.forceActiveFocus(Qt.OtherFocusReason)
        for name in states:
            study.showState(name)
            QTest.qWait(150)
            assert window.grabWindow().save(str(args.captures / (name + '.png')))
        # Exercise the proposed remote journey, independent of any API/decoder.
        study.showState('focus')
        QTest.keyClick(window, Qt.Key_Return)
        assert study.property('menu') == 'quality'
        QTest.keyClick(window, Qt.Key_Down)
        QTest.keyClick(window, Qt.Key_Return)
        assert study.property('quality') == '360p' and study.property('menu') == ''
        assert study.property('positionMs') == 432000
        study.showState('timeline')
        QTest.keyClick(window, Qt.Key_Back)
        assert study.property('positionMs') == 432000 and study.property('proposedMs') == -1
        study.showState('timeline')
        QTest.keyClick(window, Qt.Key_Return)
        assert study.property('positionMs') == 565000
        study.showState('episodes')
        QTest.keyClick(window, Qt.Key_Back)
        assert study.property('menu') == '' and window.isVisible()
        study.showState('seasons')
        QTest.keyClick(window, Qt.Key_Down)
        QTest.keyClick(window, Qt.Key_Return)
        assert study.property('menu') == 'episodes' and study.property('season') == 2
        assert study.property('playingSeason') == 1 and study.property('chapter') == 'Saison 1 · Épisode 1'
        study.showState('error')
        QTest.keyClick(window, Qt.Key_Right)
        QTest.keyClick(window, Qt.Key_Return)
        assert study.property('menu') == 'source'
        QTest.keyClick(window, Qt.Key_Down)
        QTest.keyClick(window, Qt.Key_Return)
        study.open(3)
        assert study.property('quality') == 'Originale' and len(study.property('options').toVariant()) == 1
        bad = [m for m in messages if any(term in m for term in ['ReferenceError', 'TypeError', 'Cannot assign', 'Unable to assign', 'Cannot open:'])]
        assert not bad, bad
        (args.captures / 'review.json').write_text(json.dumps({'states': states, 'resolution': [1280, 720], 'qmlErrors': [], 'remoteJourney': True, 'staticFrame': True, 'fixtureChoices': True, 'nativeDecoder': False, 'apiCalls': False, 'sdkLaunched': False}, indent=2), encoding='utf-8')
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
print(json.dumps({'passed': True, 'states': len(states), 'scope': 'separate QML design proposal; static frame, no live API or decoder'}))
