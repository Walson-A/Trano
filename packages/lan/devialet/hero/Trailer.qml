import QtQuick 2.15
import QtMultimedia 5.0
Item {
    id: preview
    property bool silent: true
    property bool ready: media.playbackState===MediaPlayer.PlayingState && media.position>400 && media.hasVideo
    signal observed(var observation)
    function play(url) { media.stop(); media.source=url; media.play(); }
    function stop() { media.stop(); media.source=""; }
    function pause() { media.pause(); }
    // Some Player backends leave muted ineffective: enforce silence at gain too.
    MediaPlayer { id: media; objectName:'trailerMedia'; muted: preview.silent; volume: preview.silent ? 0 : 0.35
        onError: preview.observed({event:'error',code:error})
        onStatusChanged: preview.observed({event:'status',status:status})
    }
    Loader {anchors.fill:parent;active:!!String(media.source);sourceComponent:Component {
        VideoOutput {objectName:'trailerVideoOutput';anchors.fill:parent;source:media;fillMode:VideoOutput.PreserveAspectCrop}
    }}
    Timer { interval: 2000; running: media.playbackState===MediaPlayer.PlayingState; repeat: true
        onTriggered: preview.observed({event:'preview',positionMs:media.position,hasVideo:media.hasVideo,hasAudio:media.hasAudio}) }
}
