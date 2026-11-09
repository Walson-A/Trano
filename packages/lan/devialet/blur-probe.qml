import QtQuick 2.4
import QtGraphicalEffects 1.0
import fbx.application 1.0

// Mesure du flou des boutons (HeroButton : ShaderEffectSource vivant + FastBlur 24) sur le
// Player. Diagnostic seulement : aucun compte, aucun réseau hors du rapport, sortie seule.
// Trois phases de 8 s sur un fond animé : 0 bouton flouté, 3 (l'accueil), 8 (le pire écran).
// Chaque phase compte les images réellement rendues (Canvas.requestAnimationFrame) et les
// intervalles au-delà de 20 ms ; le rapport part vers config.reportUrl.
Application {
    id: app
    property var config: __TRANO_PROBE_CONFIG__
    property var phases: [0, 3, 8]
    property int phase: -1
    property var intervals: []
    property double last: 0
    function report(value) {
        var req = new XMLHttpRequest();
        req.open("POST", config.reportUrl);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify(value));
    }
    function summary() {
        var list = intervals.slice().sort(function(a, b) { return a - b; });
        var n = list.length, sum = 0, slow = 0;
        for (var i = 0; i < n; i++) { sum += list[i]; if (list[i] > 20) slow++; }
        return {event: "blur_phase", blurred: phases[phase], frames: n,
                averageMs: n ? Math.round(sum / n * 10) / 10 : 0,
                p95Ms: n ? list[Math.min(n - 1, Math.floor(n * .95))] : 0,
                worstMs: n ? list[n - 1] : 0, over20ms: slow};
    }
    function next() {
        if (phase >= 0) report(summary());
        phase++; intervals = []; last = 0;
        if (phase >= phases.length) { report({event: "done"}); Qt.quit(); return; }
        clock.restart();
    }
    Rectangle { id: backdrop; anchors.fill: parent; color: "#090a0d"
        // Un fond qui bouge, comme une bande-annonce derrière le héros.
        Rectangle { id: band; width: parent.width * 1.6; height: parent.height; x: -parent.width * .3
            gradient: Gradient { orientation: Gradient.Horizontal
                GradientStop { position: 0; color: "#203a6b" } GradientStop { position: .5; color: "#c06a2b" } GradientStop { position: 1; color: "#1c5e47" } }
            SequentialAnimation on x { loops: Animation.Infinite
                NumberAnimation { to: 0; duration: 2000 } NumberAnimation { to: -parent.width * .6; duration: 2000 } }
        }
    }
    Grid {
        x: 64; y: 120; columns: 4; spacing: 24
        Repeater { model: app.phase >= 0 && app.phase < app.phases.length ? app.phases[app.phase] : 0
            Item { width: 220; height: 52
                Item { anchors.fill: parent; layer.enabled: true
                    layer.effect: OpacityMask { maskSource: Rectangle { width: 220; height: 52; radius: 12 } }
                    ShaderEffectSource { id: sample; sourceItem: backdrop; sourceRect: Qt.rect(parent.parent.x + 64, parent.parent.y + 120, 220, 52); live: true; hideSource: false; visible: false }
                    FastBlur { anchors.fill: parent; source: sample; radius: 24 }
                }
                Rectangle { anchors.fill: parent; radius: 12; color: "#7513161c"; border.color: "#30ffffff" }
                Text { anchors.centerIn: parent; text: "Plus d’infos"; color: "white"; font.pixelSize: 19 }
            }
        }
    }
    Canvas { id: ticker; width: 1; height: 1
        function frame() {
            var now = Date.now();
            if (app.last > 0) app.intervals.push(now - app.last);
            app.last = now;
            if (app.phase >= 0 && app.phase < app.phases.length) requestAnimationFrame(frame);
        }
    }
    Timer { id: clock; interval: 8000; onTriggered: app.next() }
    Component.onCompleted: { report({event: "started", mode: "blur_probe"}); next(); ticker.requestAnimationFrame(ticker.frame); }
}
