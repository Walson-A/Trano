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
    property bool reducedMotion:false
    property string zone:'surface'
    property int controlIndex:0
    property bool wantsPlaying:false
    property bool restoreAfterSeek:false
    property int seekTarget:-1
    property string seekFeedback:''
    readonly property int positionMs:media.position
    readonly property int durationMs:media.duration
    readonly property bool playing:media.playbackState===MediaPlayer.PlayingState
    readonly property bool audioMuted:media.muted || media.volume===0
    readonly property real rate:media.playbackRate
    readonly property var rates:[0.75,1,1.25,1.5,2]
    property int rateIndex:1
    signal progress(var value)
    signal closed()
    signal episodesRequested()
    signal retryRequested()
    function clock(ms) { var s=Math.floor(Math.max(0,ms)/1000); return Math.floor(s/60)+':'+('0'+s%60).slice(-2); }
    function report(state) {
        if(started && media.duration>0) progress({position_ms:media.position,duration_ms:media.duration,state:state});
    }
    function play(url) { resumed=false; started=false; ended=false; failure='';wantsPlaying=true;restoreAfterSeek=false;zone='surface';seekTarget=-1;seekFeedback='';seekCommit.stop();media.source=url; media.play(); reveal(); forceActiveFocus(); }
    function close() { seekCommit.stop();seekTarget=-1;restoreAfterSeek=false;report('stopped'); started=false;wantsPlaying=false;media.stop(); media.source=''; closed(); }
    function toggle() {if(failure){retryRequested();return;}if(ended)return;wantsPlaying=!wantsPlaying;if(wantsPlaying)media.play();else media.pause();console.info('ATLAS_TV_PLAY_INTENT',wantsPlaying,media.playbackState);reveal();}
    function toggleAudio(){var silent=!audioMuted;media.muted=silent;media.volume=silent ? 0 : 1;reveal();}
    function openRates(){seekFeedback='';rateIndex=Math.max(0,rates.indexOf(rate));zone='rates';reveal();}
    function chooseRate(){media.playbackRate=rates[rateIndex];console.info('ATLAS_TV_RATE',media.playbackRate);zone='toolbar';controlIndex=5;reveal();}
    function activateControl(){if(controlIndex===0)toggle();else if(controlIndex===1)seek(-10000);else if(controlIndex===2)seek(10000);else if(controlIndex===3)episodesRequested();else if(controlIndex===4)toggleAudio();else openRates();}
    function seek(delta) {
        if(media.seekable && started && media.duration>0) {
            seekTarget=Math.max(0,Math.min(media.duration-1000,(seekTarget>=0 ? seekTarget : media.position)+delta));
            seekFeedback=clock(seekTarget);seekFeedbackTimer.restart();seekCommit.restart();
            console.info('ATLAS_TV_EPISODE_SEEK_REQUEST',delta,seekTarget);
        }
        reveal();
    }
    function reveal() { controlsVisible=true; hide.restart(); }
    Rectangle { anchors.fill: parent; color: 'black' }
    MediaPlayer {
        id: media;objectName:'episodeMedia'; volume: 1
        onPlaybackStateChanged: {
            console.info('ATLAS_TV_EPISODE_STATE',playbackState,status,position,duration);
            if(playbackState===MediaPlayer.PausedState) { player.report('paused'); player.reveal(); }
        }
        onPositionChanged: {
            if(playbackState===MediaPlayer.PlayingState && hasVideo && position>0) {
                player.started=true;
                if(!player.resumed && duration>0) { player.resumed=true;console.info('ATLAS_TV_EPISODE_READY',hasVideo,hasAudio,duration);if(player.resumeMs>0 && seekable){player.restoreAfterSeek=player.wantsPlaying;seek(Math.min(player.resumeMs,Math.max(0,duration-1000)));}player.report('playing'); }
            }
            if(player.seekTarget>=0 && !seekCommit.running && Math.abs(position-player.seekTarget)<2000){player.seekTarget=-1;player.report(player.wantsPlaying ? 'playing' : 'paused');}
        }
        onStatusChanged: {console.info('ATLAS_TV_EPISODE_STATUS',status);if(status===MediaPlayer.EndOfMedia) { player.report('ended'); player.started=false;player.wantsPlaying=false; player.ended=true; player.controlsVisible=true; }}
        onError: {console.info('ATLAS_TV_EPISODE_ERROR',error);player.report('error'); player.started=false;player.wantsPlaying=false; player.failure='La lecture a été interrompue.'; player.controlsVisible=true; }
    }
    Loader {anchors.fill:parent;active:!!String(media.source);sourceComponent:Component {
        VideoOutput {objectName:'episodeVideoOutput';anchors.fill:parent;source:media;fillMode:VideoOutput.PreserveAspectFit}
    }}
    PlayerControls {anchors.fill:parent;player:parent;family:player.family;reducedMotion:player.reducedMotion;visible:player.controlsVisible || !player.playing}
    Rectangle {anchors.centerIn:parent;width:200;height:72;radius:18;color:'#cf181b22';visible:!!player.seekFeedback
        Text {anchors.centerIn:parent;text:player.seekFeedback;color:'white';font.family:player.family;font.pixelSize:32;font.weight:Font.DemiBold}
    }
    Text { anchors.centerIn:parent; width:1000; horizontalAlignment:Text.AlignHCenter; wrapMode:Text.WordWrap; text:player.failure || (player.ended ? 'Épisode terminé' : !player.started ? 'Chargement…' : ''); color:'white'; font.family:player.family; font.pixelSize:26 }
    HeroButton {anchors.horizontalCenter:parent.horizontalCenter;y:parent.height/2+58;width:190;label:'Réessayer';family:player.family;visible:!!player.failure;focused:true;onActivated:player.retryRequested()}
    Timer {id:seekCommit;interval:220;onTriggered:{var target=player.seekTarget;if(target<0)return;player.restoreAfterSeek=player.wantsPlaying;media.seek(target);console.info('ATLAS_TV_EPISODE_SEEK_COMMIT',target);if(player.seekTarget>=0 && Math.abs(media.position-target)<2000){player.seekTarget=-1;player.report(player.wantsPlaying ? 'playing' : 'paused');}}}
    Timer {interval:250;running:player.restoreAfterSeek && player.wantsPlaying && media.playbackState===MediaPlayer.PausedState && media.status===MediaPlayer.Buffered;onTriggered:{player.restoreAfterSeek=false;media.play();}}
    Timer {id:seekFeedbackTimer;interval:1400;onTriggered:player.seekFeedback=''}
    Timer { interval:15000; repeat:true; running:player.started && media.playbackState===MediaPlayer.PlayingState; onTriggered:player.report('playing') }
    Timer { id:hide; interval:2500; onTriggered:if(player.playing && player.zone==='surface') player.controlsVisible=false }
    Keys.onPressed: {
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape) {if(zone==='rates'){zone='toolbar';reveal();}else close();}
        else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select) {
            if(zone==='rates')chooseRate();else if(zone==='toolbar')activateControl();else toggle();
        } else if(event.key===Qt.Key_Right || event.key===Qt.Key_Left) {
            var delta=event.key===Qt.Key_Right ? 1 : -1;
            if(zone==='toolbar')controlIndex=Math.max(0,Math.min(5,controlIndex+delta));else if(zone!=='rates')seek(delta*10000);reveal();
        } else if(event.key===Qt.Key_Up || event.key===Qt.Key_Down) {
            var up=event.key===Qt.Key_Up;
            if(zone==='rates')rateIndex=Math.max(0,Math.min(rates.length-1,rateIndex+(up ? -1 : 1)));
            else if(zone==='surface'){zone='toolbar';controlIndex=0;}
            else if(zone==='toolbar')zone=up ? 'seek' : 'surface';else zone=up ? 'surface' : 'toolbar';reveal();
        }
        else return;
        event.accepted=true;
    }
}
