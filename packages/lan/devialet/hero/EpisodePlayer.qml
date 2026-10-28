import QtQuick 2.15
import QtMultimedia 5.0

FocusScope {
    id: player
    property string title: ""
    property string family: "sans-serif"
    property int resumeMs: 0
    property bool resumed: false
    property bool started: false
    property bool ended: false
    property bool controlsVisible: true
    property string failure: ""
    signal progress(var value)
    signal closed()
    function clock(ms) { var s=Math.floor(Math.max(0,ms)/1000); return Math.floor(s/60)+':'+('0'+s%60).slice(-2); }
    function report(state) {
        if(started && media.duration>0) progress({position_ms:media.position,duration_ms:media.duration,state:state});
    }
    function play(url) { resumed=false; started=false; ended=false; failure=''; media.source=url; media.play(); reveal(); forceActiveFocus(); }
    function close() { report('stopped'); started=false; media.stop(); media.source=''; closed(); }
    function seek(delta) {
        if(media.seekable && started) { media.seek(Math.max(0,Math.min(media.duration,media.position+delta))); report(media.playbackState===MediaPlayer.PausedState ? 'paused' : 'playing'); }
        reveal();
    }
    function reveal() { controlsVisible=true; hide.restart(); }
    Rectangle { anchors.fill: parent; color: 'black' }
    MediaPlayer {
        id: media; volume: 1
        onPlaybackStateChanged: {
            if(playbackState===MediaPlayer.PausedState) { player.report('paused'); player.reveal(); }
        }
        onPositionChanged: {
            if(playbackState===MediaPlayer.PlayingState && hasVideo && position>0) {
                player.started=true;
                if(!player.resumed && duration>0) { player.resumed=true; if(player.resumeMs>0 && seekable) seek(Math.min(player.resumeMs,Math.max(0,duration-1000))); player.report('playing'); }
            }
        }
        onStatusChanged: if(status===MediaPlayer.EndOfMedia) { player.report('ended'); player.started=false; player.ended=true; player.controlsVisible=true; }
        onError: { player.report('error'); player.started=false; player.failure='La vidéo est indisponible. Retour pour revenir au catalogue.'; player.controlsVisible=true; }
    }
    VideoOutput { anchors.fill: parent; source: media; fillMode: VideoOutput.PreserveAspectFit }
    Rectangle {
        anchors.left: parent.left; anchors.right: parent.right; anchors.bottom: parent.bottom; height: 180
        visible: player.controlsVisible || media.playbackState!==MediaPlayer.PlayingState
        gradient: Gradient { GradientStop {position:0;color:'#00000000'} GradientStop {position:1;color:'#ed000000'} }
        Text { x:64; y:42; width:1152; text:player.title; textFormat:Text.PlainText; color:'white'; font.family:player.family; font.pixelSize:26; elide:Text.ElideRight }
        Rectangle { x:64; y:97; width:1152; height:4; color:'#66888888'; Rectangle { width:parent.width*(media.duration ? media.position/media.duration : 0); height:4; color:'white' } }
        Text { x:64; y:118; text:player.clock(media.position)+' / '+player.clock(media.duration); color:'white'; font.family:player.family; font.pixelSize:18 }
        Text { anchors.right:parent.right; anchors.rightMargin:64; y:118; text:'← / →  10 s     OK  Pause / Lecture     Retour'; color:'#dddddd'; font.family:player.family; font.pixelSize:18 }
    }
    Text { anchors.centerIn:parent; width:1000; horizontalAlignment:Text.AlignHCenter; wrapMode:Text.WordWrap; text:player.failure || (player.ended ? 'Épisode terminé. Retour pour revenir au catalogue.' : !player.started ? 'Chargement de l’épisode…' : ''); color:'white'; font.family:player.family; font.pixelSize:26 }
    Timer { interval:15000; repeat:true; running:player.started && media.playbackState===MediaPlayer.PlayingState; onTriggered:player.report('playing') }
    Timer { id:hide; interval:4000; onTriggered:if(media.playbackState===MediaPlayer.PlayingState) player.controlsVisible=false }
    Keys.onPressed: {
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape) close();
        else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select) {
            if(media.playbackState===MediaPlayer.PlayingState) media.pause(); else if(!failure && !ended) media.play(); reveal();
        } else if(event.key===Qt.Key_Right) seek(10000);
        else if(event.key===Qt.Key_Left) seek(-10000);
        else if(event.key===Qt.Key_Up || event.key===Qt.Key_Down) reveal();
        else return;
        event.accepted=true;
    }
}
