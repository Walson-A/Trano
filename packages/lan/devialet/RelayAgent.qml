import QtQuick 2.4
import QtWebSockets 1.0

// No media action is implemented here. Only configured identities and read-only SOAP.
Item {
    id: relay
    visible: false
    width: 0
    height: 0
    signal diagnosticFinished()
    property var config: ({})
    property bool ready: false
    property bool collecting: false
    property int sequence: 0
    property int generation: 0
    property int remaining: 0
    property var rows: []
    property var requests: []

    function request(url, method, body, headers, done) {
        var req = new XMLHttpRequest();
        var currentGeneration = generation;
        var called = false;
        requests.push(req);
        req.onreadystatechange = function() {
            if (req.readyState !== XMLHttpRequest.DONE || called) return;
            called = true;
            if (currentGeneration !== generation || !collecting) return;
            done(req.status === 200 && req.responseText.length <= 262144 ? req.responseText : null);
        };
        req.open(method, url);
        for (var key in headers) req.setRequestHeader(key, headers[key]);
        req.send(body);
    }
    function complete() {
        remaining -= 1;
        if (remaining === 0) publish();
    }
    function soap(device, action, done) {
        var ns = "urn:schemas-upnp-org:service:RenderingControl:1";
        var body = '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:' + action + ' xmlns:u="' + ns + '"><InstanceID>0</InstanceID><Channel>Master</Channel></u:' + action + '></s:Body></s:Envelope>';
        request("http://" + device.host + ":" + device.port + "/upnp/control/RenderingControl1", "POST", body,
                {"Content-Type": 'text/xml; charset="utf-8"', "SOAPAction": '"' + ns + '#' + action + '"'}, done);
    }
    function read(device, index) {
        var row = {id: device.id, reachable: false, model: null, volume: null, muted: null};
        rows[index] = row;
        if (device.kind === "samsung") {
            request("http://" + device.host + ":8001/api/v2/", "GET", null, {}, function(text) {
                var info = null;
                try { info = JSON.parse(text).device; } catch (error) {}
                if (!info || info.type !== "Samsung SmartTV" || String(info.wifiMac).toLowerCase() !== device.mac) { complete(); return; }
                row.reachable = true; row.model = info.modelName; row.mac = device.mac;
                // Both are observations, never commands that change state.
                var reads = 2;
                soap(device, "GetVolume", function(xml) {
                    var match = xml && xml.match(/<(?:[\w.-]+:)?CurrentVolume>(\d+)<\//);
                    if (match && Number(match[1]) <= 100) row.volume = Number(match[1]);
                    if (--reads === 0) complete();
                });
                soap(device, "GetMute", function(xml) {
                    var match = xml && xml.match(/<(?:[\w.-]+:)?CurrentMute>([01])<\//);
                    if (match) row.muted = match[1] === "1";
                    if (--reads === 0) complete();
                });
            });
        } else {
            request("http://" + device.host + ":" + device.spotifyPort + "/zc?action=getInfo&version=2.10.0", "GET", null, {}, function(text) {
                var info = null;
                try { info = JSON.parse(text); } catch (error) {}
                if (info && info.status === 101 && info.brandDisplayName === "Freebox") {
                    row.reachable = true; row.model = info.modelDisplayName; row.brand = "Freebox";
                }
                complete();
            });
        }
    }
    function publish() {
        if (!collecting) return;
        collecting = false; deadline.stop();
        if (ready && socket.status === WebSocket.Open) {
            sequence += 1;
            socket.sendTextMessage(JSON.stringify({type: "inventory", sequence: sequence, devices: rows}));
        }
    }
    function refresh() {
        if (!ready || collecting) return;
        generation += 1; rows = []; requests = []; collecting = true; remaining = config.devices.length;
        deadline.restart();
        for (var i = 0; i < config.devices.length; i++) read(config.devices[i], i);
    }
    WebSocket {
        id: socket
        url: relay.config.url || ""
        active: Boolean(relay.config.url)
        onStatusChanged: {
            if (status === WebSocket.Open) {
                socket.sendTextMessage(JSON.stringify({type: "hello", token: relay.config.token}));
            } else if (status === WebSocket.Closed || status === WebSocket.Error) {
                relay.ready = false;
                socket.active = false;
                reconnect.restart();
            }
        }
        onTextMessageReceived: {
            var messageObject = null;
            try { messageObject = JSON.parse(message); } catch (error) {}
            if (messageObject && messageObject.type === "ready") { relay.ready = true; relay.refresh(); }
        }
    }
    Timer { id: reconnect; interval: 5000; onTriggered: socket.active = true }
    Timer { interval: 5000; running: true; repeat: true; onTriggered: relay.refresh() }
    Timer {
        id: deadline
        interval: 3000
        onTriggered: {
            // Publish known observations, retain unknown fields, then invalidate late callbacks.
            relay.publish(); relay.generation += 1;
            for (var i = 0; i < relay.requests.length; i++) {
                if (relay.requests[i].readyState !== XMLHttpRequest.DONE) relay.requests[i].abort();
            }
        }
    }
    Timer { interval: Math.max(1, relay.config.lifetimeMs || 0); running: relay.config.lifetimeMs > 0; onTriggered: relay.diagnosticFinished() }
}
