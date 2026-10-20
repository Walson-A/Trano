import QtQuick 2.4
import fbx.application 1.0

// Temporary, read-only diagnostic. Configuration is supplied by devialet-check.py.
Application {
    id: app
    property var config: __TRANO_PROBE_CONFIG__
    property var pending: []
    property int ticks: 0

    function report(value) {
        var req = new XMLHttpRequest();
        req.open("POST", config.reportUrl);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(value));
    }

    function probeModule(label, declaration) {
        try {
            var object = Qt.createQmlObject(declaration, app, "trano_" + label);
            report({event: "module", name: label, available: true});
            object.destroy();
        } catch (error) {
            // Only module availability is retained; no runtime object is enumerated.
            report({event: "module", name: label, available: false, error: String(error).slice(0, 512)});
        }
    }

    function readUrl(label, url) {
        var req = new XMLHttpRequest();
        pending.push(req);
        req.onreadystatechange = function() {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            // No response body, cookie, header or identity secret is returned.
            report({event: "http", name: label, status: req.status});
        };
        req.open("GET", url);
        req.send();
    }

    Timer {
        interval: 5000
        running: true
        repeat: true
        onTriggered: {
            app.ticks += 1;
            app.report({event: "heartbeat", tick: app.ticks, visible: app.visible});
            if (app.ticks === 2) {
                for (var i = 0; i < app.pending.length; i++) {
                    if (app.pending[i].readyState !== XMLHttpRequest.DONE) app.pending[i].abort();
                }
            }
        }
    }
    Timer { interval: 15500; running: true; onTriggered: Qt.quit() }

    Component.onCompleted: {
        report({event: "started", os: Qt.platform.os});
        probeModule("websocket_client", 'import QtWebSockets 1.0; WebSocket { active: false }');
        probeModule("websocket_server", 'import QtWebSockets 1.0; WebSocketServer { listen: false }');
        probeModule("local_storage_module", 'import QtQuick 2.4; import QtQuick.LocalStorage 2.0; QtObject {}');
        readUrl("samsung", config.samsungUrl);
        readUrl("public_https", "https://example.com/");
        if (config.serverUrl) readUrl("trano_server_https", config.serverUrl);
    }
}
