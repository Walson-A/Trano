"""Run the real QML scene with a caller-selected local illustration and Qt 5."""
import argparse
import json
import pathlib
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path', type=pathlib.Path, required=True)
parser.add_argument('--artwork', type=pathlib.Path, required=True)
parser.add_argument('--capture-dir', type=pathlib.Path)
args = parser.parse_args()
sys.path.insert(0, str(args.qt_path.resolve()))
print('Loading isolated Qt 5 runtime', flush=True)
from PyQt5.QtCore import QUrl, QTimer, Qt, QT_VERSION_STR, qInstallMessageHandler, QObject
from PyQt5.QtGui import QGuiApplication, QFontDatabase
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow
from PyQt5.QtTest import QTest

if not args.artwork.is_file():
    parser.error('The illustration must be an existing local file.')
qInstallMessageHandler(lambda kind, context, message: print('Qt:', message, flush=True))
app = QGuiApplication([])
font_path = pathlib.Path('C:/Windows/Fonts/segoeui.ttf')
if font_path.is_file():
    QFontDatabase.addApplicationFont(str(font_path))
print('Qt GUI initialized', flush=True)
engine = QQmlApplicationEngine()
engine.rootContext().setContextProperty('demoArtwork', QUrl.fromLocalFile(str(args.artwork.resolve())))
scene_path = pathlib.Path(__file__).resolve().parent.parent / 'devialet/design-scene/desktop.qml'
engine.load(QUrl.fromLocalFile(str(scene_path)))
print('QML roots:', len(engine.rootObjects()), flush=True)
if not engine.rootObjects():
    sys.exit('QML scene failed to load')
window = engine.rootObjects()[0]
scene = window.findChild(QObject, 'atlasScene')
if args.capture_dir:
    args.capture_dir.mkdir(parents=True, exist_ok=True)
    def capture(name):
        target = args.capture_dir / name
        if not window.grabWindow().save(str(target)):
            raise RuntimeError('QML capture failed')
    def first():
        capture('atlas-tv-card.png')
        QTest.keyClick(window, Qt.Key_Return)
        assert scene.property('detailsOpen'), 'OK did not open details'
        QTimer.singleShot(300, detail)
    def detail():
        capture('atlas-tv-detail.png')
        QTest.keyClick(window, Qt.Key_Escape)
        assert not scene.property('detailsOpen'), 'Back did not restore the card'
        QTest.keyClick(window, Qt.Key_Right)
        assert not scene.property('selected'), 'Focus comparison failed'
        QTest.keyClick(window, Qt.Key_Return)
        assert scene.property('detailsOpen'), 'The panel action did not open details'
        QTimer.singleShot(300, panel_focus)
    def panel_focus():
        capture('atlas-tv-panel-focus.png')
        QTest.keyClick(window, Qt.Key_Escape)
        assert not scene.property('detailsOpen') and scene.property('selected'), 'Back did not restore card focus'
        scene.setProperty('blurEnabled', True)
        QTimer.singleShot(700, blur)
    def blur():
        capture('atlas-tv-blur.png')
        result = {'qt': QT_VERSION_STR, 'details': 'OK/Back passed',
                          'selection': 'Right/Left passed', 'blur': scene.property('blurStatus'),
                          'capture': 'desktop QML; not a Devialet capture'}
        (args.capture_dir/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(result, ensure_ascii=False))
        app.quit()
    QTimer.singleShot(1000, first)
sys.exit(app.exec_())
