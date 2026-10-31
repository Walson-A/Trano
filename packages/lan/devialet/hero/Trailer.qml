import QtQuick 2.15
import QtMultimedia 5.0
Item {
    id: preview
    property bool silent: true
    property bool fitFrame:false
    property bool headerCrop:false
    clip:headerCrop
    property real gain:0.35
    property bool restoreAfterSeek:false
    property bool wantsPlaying:false
    property bool presented:false
    property bool dispatchingSeek:false
    property int pendingSeek:-1
    property double seekDeadline:0
    property int pendingError:0
    property double errorAt:0
    property int errorPosition:0
    readonly property int positionMs:media.position
    readonly property int durationMs:media.duration
    readonly property bool playing:media.playbackState===MediaPlayer.PlayingState
    readonly property bool hasSource:!!String(media.source)
    property bool ready:hasSource && presented
    signal observed(var observation)
    function currentPosition(){return media.position;}
    function play(url) { presented=false;pendingSeek=-1;pendingError=0;restoreAfterSeek=false;wantsPlaying=true;media.stop(); media.source=url; media.play();inspect(); }
    function stop() { presented=false;pendingSeek=-1;pendingError=0;restoreAfterSeek=false;wantsPlaying=false;media.stop(); media.source=""; }
    function pause() { wantsPlaying=false;restoreAfterSeek=false;media.pause(); }
    function toggle(){if(String(media.source)){if(wantsPlaying)pause();else {wantsPlaying=true;media.play();}}}
    function seekBy(delta){if(media.seekable && durationMs>0){pendingSeek=Math.max(0,Math.min(durationMs-1000,media.position+delta));seekDeadline=Date.now()+8000;restoreAfterSeek=wantsPlaying;dispatchingSeek=true;media.seek(pendingSeek);dispatchingSeek=false;inspect();}}
    function inspect(){
        if(!hasSource)return;
        var position=media.position,now=Date.now(),active=media.playbackState===MediaPlayer.PlayingState;
        if(media.hasVideo && position>400 && (active || media.playbackState===MediaPlayer.PausedState))presented=true;
        if(pendingSeek>=0 && (Math.abs(position-pendingSeek)<1500 || now>=seekDeadline))pendingSeek=-1;
        if(restoreAfterSeek && pendingSeek<0 && wantsPlaying){if(active)restoreAfterSeek=false;else if(media.playbackState===MediaPlayer.PausedState && media.status===MediaPlayer.Buffered){restoreAfterSeek=false;media.play();}}
        if(pendingError>0){
            if(active && position!==errorPosition){pendingError=0;return;}
            if(pendingSeek<0 && now-errorAt>=1500){var code=pendingError;pendingError=0;observed({event:'error',code:code});}
        }
    }
    // Some Player backends leave muted ineffective: enforce silence at gain too.
    MediaPlayer { id: media; objectName:'trailerMedia'; muted: preview.silent; volume: preview.silent ? 0 : preview.gain
        onError:if(error>0 && preview.hasSource){preview.pendingError=error;preview.errorAt=Date.now();preview.errorPosition=position;}else if(error===0)preview.pendingError=0;
        onPositionChanged:if(!preview.dispatchingSeek)preview.inspect()
        onStatusChanged:{if(status===MediaPlayer.EndOfMedia){if(preview.presented && preview.pendingSeek<0 && !preview.restoreAfterSeek){preview.presented=false;preview.observed({event:'status',status:status});}}else preview.observed({event:'status',status:status});}
    }
    // Keep Loader unconstrained: explicit Loader sizing overrides the output's aspect-correct height.
    Loader {x:(preview.width-width)/2;y:(preview.height-height)/2;active:!!String(media.source);sourceComponent:Component {
        VideoOutput {id:surface;objectName:'trailerVideoOutput';source:media
            readonly property real aspect:sourceRect.height>0 ? sourceRect.width/sourceRect.height : 16/9
            width:preview.headerCrop ? Math.max(preview.width,preview.height*aspect) : preview.width
            height:preview.headerCrop ? Math.max(preview.height,preview.width/aspect) : preview.height
            fillMode:preview.fitFrame || preview.headerCrop ? VideoOutput.PreserveAspectFit : VideoOutput.PreserveAspectCrop
        }
    }}
    Timer { interval: 2000; running: media.playbackState===MediaPlayer.PlayingState; repeat: true
        onTriggered: preview.observed({event:'preview',positionMs:media.position,hasVideo:media.hasVideo,hasAudio:media.hasAudio}) }
    Timer {interval:100;repeat:true;running:preview.hasSource;onTriggered:preview.inspect()}
}
