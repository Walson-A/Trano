import QtQuick 2.4
import fbx.application 1.0

// Fixed, read-only OS metadata. No settings, credentials, user files or writes.
Application {
    id: app
    property var config: __TRANO_PROBE_CONFIG__
    property var pending: []
    function report(value) {
        var req = new XMLHttpRequest();
        req.open("POST", config.reportUrl);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(value));
    }
    function readMetadata(path, kind) {
        var req = new XMLHttpRequest();
        pending.push(req);
        req.onreadystatechange = function() {
            if (req.readyState !== XMLHttpRequest.DONE) return;
            var text = req.responseText || "";
            var result = {event: "boot_metadata", name: kind, readable: text.length > 0 && text.length <= 16384};
            if (result.readable) {
                if (kind === "process_identity") {
                    var uid = text.match(/^Uid:\s+([0-9]+)\s+([0-9]+)/m);
                    var gid = text.match(/^Gid:\s+([0-9]+)\s+([0-9]+)/m);
                    if (uid) result.effectiveUid = Number(uid[2]);
                    if (gid) result.effectiveGid = Number(gid[2]);
                } else if (kind === "kernel") {
                    var kernel = text.match(/^Linux version ([A-Za-z0-9_.+\-]+)/);
                    if (kernel) result.version = kernel[1];
                } else if (kind === "init") {
                    var executables = [];
                    var lines = text.split("\n");
                    for (var i = 0; i < lines.length && executables.length < 16; i++) {
                        if (/^\s*(#|$)/.test(lines[i])) continue;
                        var fields = lines[i].split(":");
                        if (fields.length < 4) continue;
                        var command = fields.slice(3).join(":").match(/^\s*(\/[A-Za-z0-9_./\-]+)/);
                        if (command) executables.push(command[1]);
                    }
                    result.executables = executables;
                } else if (kind === "os") {
                    var id = text.match(/^ID=["']?([A-Za-z0-9_.\-]+)/m);
                    if (id) result.id = id[1];
                }
            }
            report(result);
        };
        try { req.open("GET", "file://" + path); req.send(); }
        catch (error) { report({event: "boot_metadata", name: kind, readable: false}); }
    }
    Timer { interval: 3500; running: true; onTriggered: Qt.quit() }
    Component.onCompleted: {
        report({event: "started", mode: "fixed_boot_metadata"});
        readMetadata("/proc/self/status", "process_identity");
        readMetadata("/proc/version", "kernel");
        readMetadata("/etc/inittab", "init");
        readMetadata("/etc/os-release", "os");
    }
}
