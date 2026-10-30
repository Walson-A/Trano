import QtQuick 2.15
import QtMultimedia 5.0
Item {
    id: preview
    property bool silent: true
    property bool fitFrame:false
    property real gain:0.35
    property bool restoreAfterSeek:false
    property bool wantsPlaying:false
    readonly property int positionMs:media.position
    readonly property int durationMs:media.duration
    readonly property bool playing:media.playbackState===MediaPlayer.PlayingState
    readonly property bool hasSource:!!String(media.source)
    property bool ready: (playing || media.playbackState===MediaPlayer.PausedState) && media.position>400 && media.hasVideo
    signal observed(var observation)
    function play(url) { restoreAfterSeek=false;wantsPlaying=true;media.stop(); media.source=url; media.play(); }
    function stop() { restoreAfterSeek=false;wantsPlaying=false;media.stop(); media.source=""; }
    function pause() { wantsPlaying=false;restoreAfterSeek=false;media.pause(); }
    function toggle(){if(String(media.source)){if(wantsPlaying)pause();else {wantsPlaying=true;media.play();}}}
    function seekBy(delta){if(media.seekable && durationMs>0){restoreAfterSeek=wantsPlaying;media.seek(Math.max(0,Math.min(durationMs-1000,positionMs+delta)));}}
    // Some Player backends leave muted ineffective: enforce silence at gain too.
    MediaPlayer { id: media; objectName:'trailerMedia'; muted: preview.silent; volume: preview.silent ? 0 : preview.gain
        onError: preview.observed({event:'error',code:error})
        onStatusChanged: {if(preview.restoreAfterSeek && preview.wantsPlaying && (status===MediaPlayer.LoadedMedia || status===MediaPlayer.Buffered)){preview.restoreAfterSeek=false;play();}preview.observed({event:'status',status:status});}
    }
    Loader {anchors.fill:parent;active:!!String(media.source);sourceComponent:Component {
        VideoOutput {objectName:'trailerVideoOutput';anchors.fill:parent;source:media;fillMode:preview.fitFrame ? VideoOutput.PreserveAspectFit : VideoOutput.PreserveAspectCrop}
    }}
    Timer { interval: 2000; running: media.playbackState===MediaPlayer.PlayingState; repeat: true
        onTriggered: preview.observed({event:'preview',positionMs:media.position,hasVideo:media.hasVideo,hasAudio:media.hasAudio}) }
}
