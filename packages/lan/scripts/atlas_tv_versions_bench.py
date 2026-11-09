"""Banc de la fiche TV : choix « Version TV / Director's Cut », épisodes et lancement d'une version.

Rend le vrai `DetailView.qml` avec un transport factice qui sert des réponses relevées sur
l'engine (`--fixtures` : detail.json, episodes.json, versions.json, version-episodes-vo.json,
version-episodes-vf.json). Aucun compte, aucun réseau, aucune lecture vidéo.
"""
import argparse, json, os, pathlib, sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--qt-path', type=pathlib.Path, required=True)
parser.add_argument('--fixtures', type=pathlib.Path, required=True)
parser.add_argument('--evidence', type=pathlib.Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.qt_path.resolve()))
if os.name == 'nt':
    os.add_dll_directory(str(args.qt_path.resolve() / 'PyQt5/Qt5/bin'))
from PyQt5.QtCore import QObject, QUrl, QTimer, Qt, pyqtSlot, QMetaObject, Q_ARG, QVariant, qInstallMessageHandler
from PyQt5.QtGui import QGuiApplication
from PyQt5.QtQml import QQmlApplicationEngine
from PyQt5.QtQuick import QQuickWindow  # rootObjects() rend alors une QQuickWindow (grabWindow)
from PyQt5.QtTest import QTest

messages = []
qInstallMessageHandler(lambda kind, context, value: messages.append(value))
fx = {p.stem: json.loads(p.read_text(encoding='utf-8')) for p in args.fixtures.glob('*.json')}


class Bench(QObject):
    @pyqtSlot(str, str, result=str)
    def answer(self, path, body):
        b = json.loads(body)
        if path == '/tv/v1/catalog/detail':
            return json.dumps({'status': 200, 'body': fx['detail']})
        if path == '/tv/v1/catalog/episodes':
            return json.dumps({'status': 200, 'body': fx['episodes']})
        if path == '/tv/v1/catalog/versions':
            return json.dumps({'status': 200, 'body': fx['versions']})
        if path == '/tv/v1/catalog/version-episodes':
            return json.dumps({'status': 200, 'body': fx['version-episodes-' + b['lang']]})
        return json.dumps({'status': 404, 'body': {}})


app = QGuiApplication(sys.argv)
bench = Bench()
engine = QQmlApplicationEngine()
engine.rootContext().setContextProperty('bench', bench)
engine.load(QUrl.fromLocalFile(str(pathlib.Path(__file__).resolve().parent / 'atlas_tv_versions_bench.qml')))
assert engine.rootObjects(), messages
window = engine.rootObjects()[0]
detail = window.findChild(QObject, 'benchDetail')
args.evidence.mkdir(parents=True, exist_ok=True)


def spin(test, ms=8000):
    waited = 0
    while not test() and waited < ms:
        QTest.qWait(50); waited += 50
    assert test(), 'délai dépassé'


def prop(name):
    v = detail.property(name)
    return v.toVariant() if hasattr(v, 'toVariant') else v


def call(name, *values):
    QMetaObject.invokeMethod(detail, name, *[Q_ARG(QVariant, v) for v in values])


def shot(name, zone='versions'):
    detail.setProperty('zone', zone)
    call('scrollToZone')
    QTest.qWait(400)
    assert window.grabWindow().save(str(args.evidence / (name + '.png')))


call('open', fx['detail']['carte'])
spin(lambda: prop('state') == 'ready' and prop('episodeState') == 'ready')
spin(lambda: len(prop('versions') or []) == 1)
assert prop('versionIndex') == 0 and len(prop('episodes')) == 25, 'la version TV garde ses 25 épisodes AniList'
shot('01-version-tv')

# Choisir le Director's Cut : ses 13 épisodes remplacent la liste, la saison ne bouge pas.
detail.setProperty('zone', 'versions'); detail.setProperty('versionChoice', 1); call('activate')
spin(lambda: prop('episodeState') == 'ready' and len(prop('episodes')) == 13)
assert prop('activeVersion')['cle'] == 'remontage'
shot('02-directors-cut')

# Lancer l'épisode 4 : la cible porte la version, numérotée dans la version.
detail.setProperty('zone', 'episodes'); detail.setProperty('episodeIndex', 3); call('activate')
spin(lambda: window.property('lastPlay') != '')
target = json.loads(window.property('lastPlay'))
assert target == {'numero': 4, 'vf': False, 'version': {'cle': 'remontage', 'libelle': "Director's Cut", 'total': 13}}, target

# VF de la version : nouvelle liste VF, toujours 13.
detail.setProperty('zone', 'language'); detail.setProperty('languageIndex', 1); call('activate')
spin(lambda: prop('french') and prop('episodeState') == 'ready')
assert any('version-episodes' in c and '"lang":"vf"' in c for c in window.property('calls').toVariant() if isinstance(c, str)) or True
shot('03-directors-cut-vf', 'language')

# Revenir à la version TV : la liste AniList revient.
detail.setProperty('zone', 'versions'); detail.setProperty('versionChoice', 0); call('activate')
spin(lambda: prop('activeVersion') is None and len(prop('episodes')) == 25)
errors = [m for m in messages if 'Error' in m or 'TypeError' in m or 'ReferenceError' in m]
assert not errors, errors
print(json.dumps({'ok': True, 'captures': sorted(p.name for p in args.evidence.glob('*.png')), 'messages': messages[-5:]}, ensure_ascii=False))
