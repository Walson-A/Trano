import QtQuick 2.4
import QtMultimedia 5.0
import fbx.application 1.0

// Diagnostic only: generated silent media, no account, no library, automatic exit.
Application {
    id: app
    property var config: __TRANO_PROBE_CONFIG__
    property int ticks: 0
    function report(value) {
        var req = new XMLHttpRequest();
        req.open("POST", config.reportUrl);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(value));
    }
    Rectangle { anchors.fill: parent; color: "black" }
    MediaPlayer {
        id: player
        source: app.config.videoUrl
        autoPlay: false
        muted: true
        onError: app.report({event: "video_error", code: error})
        onStatusChanged: app.report({event: "video_status", status: status})
    }
    VideoOutput { anchors.fill: parent; source: player; fillMode: VideoOutput.PreserveAspectFit }
    Timer {
        interval: 1000; running: true; repeat: true
        onTriggered: {
            app.ticks += 1;
            app.report({event: "video_tick", positionMs: player.position, durationMs: player.duration,
                        playbackState: player.playbackState, hasVideo: player.hasVideo});
        }
    }
    Timer { interval: 24000; running: true; onTriggered: { player.stop(); Qt.quit(); } }
    Component.onCompleted: {
        report({event: "started", mode: "silent_video"});
        player.play();
    }
}
