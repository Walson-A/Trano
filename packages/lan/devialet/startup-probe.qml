import QtQuick 2.4
import fbx.application 1.0
import fbx.system 1.0

// App names only; Device exposes just its documented model and firmware version.
// No App property values, settings reads, setters or native method calls.
Application {
    property var config: __TRANO_PROBE_CONFIG__
    function report(value) {
        var req = new XMLHttpRequest();
        req.open("POST", config.reportUrl);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(value));
    }
    Timer { interval: 3500; running: true; onTriggered: Qt.quit() }
    Component.onCompleted: {
        report({event: "started", mode: "startup_api_names_only"});
        report({event: "device_firmware", model: String(Device.model).slice(0, 80),
                firmwareVersion: String(Device.firmwareVersion).slice(0, 80)});
        var names = [];
        try {
            for (var key in App) {
                if (/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key) && names.length < 128) names.push(key);
            }
            names.sort();
            report({event: "native_app_members", names: names});
        } catch (error) {
            report({event: "native_app_members", enumerationFailed: true});
        }
    }
}
