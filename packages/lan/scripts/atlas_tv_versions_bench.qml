// Banc de la fiche TV avec les versions d'une saison (Director's Cut…). Transport, vignettes et
// bande-annonce factices : aucun compte, aucun réseau. Piloté par atlas_tv_versions_bench.py.
import QtQuick 2.15
import QtQuick.Window 2.15
import "../devialet/hero"

Window {
    id: window
    width: 1280; height: 720; visible: true; color: '#0b0c10'
    property string lastPlay: ''
    property var calls: []
    QtObject {
        id: transport
        property string state: 'ready'
        property bool airingEnabled: false
        property bool libraryEnabled: false
        property bool libraryReadCacheEnabled: false
        property bool libraryRemoveEnabled: false
        function api(path, body, timeout, done) {
            window.calls = window.calls.concat([path + ' ' + JSON.stringify(body)]);
            var reply = JSON.parse(bench.answer(path, JSON.stringify(body)));
            Qt.callLater(function() { done(reply.status, reply.body); });
        }
    }
    QtObject { id: artworks; property var sources: ({}); function request() {} function failed() {} function confirmed() {} }
    QtObject {
        id: previews
        function identity(c) { return ''; }
        function resolve() { return { cancel: function() {} }; }
        function cachedSource() { return ''; }
        function invalidate() {}
    }
    Item {
        id: trailer
        property bool videoReady: false; property string failure: ''; property bool ended: false
        property bool hasSource: false; property bool retrying: false; property string zone: ''
        function play() {} function retire() {} function reveal() {}
    }
    DetailView {
        id: detail
        objectName: 'benchDetail'
        anchors.fill: parent
        transport: transport; artworks: artworks; previews: previews; trailerPlayer: trailer
        family: 'Segoe UI'; reducedMotion: true
        onPlayRequested: window.lastPlay = JSON.stringify(target)
    }
}
