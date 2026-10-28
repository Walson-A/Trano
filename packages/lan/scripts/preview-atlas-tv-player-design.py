"""Capture a TV-only chrome study. Explicit frame, no account, decoder or live API."""
import argparse,os,pathlib,sys
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path',type=pathlib.Path,required=True)
parser.add_argument('--frame',type=pathlib.Path,required=True)
parser.add_argument('--font',type=pathlib.Path,action='append',required=True)
parser.add_argument('--captures',type=pathlib.Path,required=True)
args=parser.parse_args();sys.path.insert(0,str(args.qt_path.resolve()))
dll=os.add_dll_directory(str(args.qt_path.resolve()/'PyQt5/Qt5/bin')) if os.name=='nt' else None
from PyQt5.QtCore import QUrl,QTimer,QObject,QByteArray,qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication,QFontDatabase
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow
from PyQt5.QtTest import QTest
from PyQt5 import sip
messages=[];qInstallMessageHandler(lambda kind,context,value:messages.append(value));app=QGuiApplication([])
for font in args.font:
    index=QFontDatabase.addApplicationFontFromData(QByteArray(font.read_bytes()));assert index>=0
family=QFontDatabase.applicationFontFamilies(index)[0]
engine=QQmlApplicationEngine();source=pathlib.Path(__file__).resolve().parent.parent/'devialet/design-player'
engine.rootContext().setContextProperty('studyFrame',args.frame.resolve().as_uri());engine.rootContext().setContextProperty('studyFamily',family)
engine.loadData(('import QtQuick 2.15\nimport QtQuick.Window 2.2\nimport "'+source.as_uri()+'"\nWindow {width:1280;height:720;visible:true;Chrome {frame:studyFrame;family:studyFamily}}').encode())
assert engine.rootObjects(),messages
window=engine.rootObjects()[0];study=window.findChild(QObject,'playerStudy');args.captures.mkdir(parents=True,exist_ok=False)
def capture():
    try:
        for name,mode,paused in [('hud','hud',False),('actions','hud',False),('pause','hud',True),('timeline','scrub',False),('source','source',False),('quality','quality',False),('version','version',False),('episodes','episodes',False)]:
            study.setProperty('mode',mode);study.setProperty('paused',paused);study.setProperty('focusIndex',0 if name=='actions' else -1);QTest.qWait(240)
            assert window.grabWindow().save(str(args.captures/(name+'.png')))
        assert not any(x in m for m in messages for x in ['ReferenceError','TypeError','Cannot assign','Unable to assign']),messages
        app.quit()
    except Exception:
        import traceback;messages.append(traceback.format_exc());app.exit(1)
QTimer.singleShot(500,capture);QTimer.singleShot(15000,lambda:app.exit(2));code=app.exec_();window.close();sip.delete(engine)
if code:raise RuntimeError(messages)
print('Eight QML design states captured; static frame and illustrative menus, no live API')
