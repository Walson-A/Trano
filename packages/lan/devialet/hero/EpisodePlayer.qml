import QtQuick 2.15
import QtMultimedia 5.0

FocusScope {
    id:player
    property string title:''
    property string chapter:''
    property string family:'sans-serif'
    property var transport
    property var current:null
    property int resumeMs:0
    property bool resumed:false
    property bool started:false
    property bool ended:false
    property bool controlsVisible:true
    property string failure:''
    property bool reducedMotion:false
    property string zone:'surface'
    property int controlIndex:0
    property bool wantsPlaying:false
    property bool restoreAfterSeek:false
    property bool retrying:false
    property bool changing:false
    property int seekTarget:-1
    property int proposedMs:-1
    readonly property int positionMs:media.position
    readonly property int durationMs:media.duration
    readonly property bool playing:media.playbackState===MediaPlayer.PlayingState
    readonly property bool menuOpened:menu.opened
    readonly property string menuName:menu.kind
    signal progress(var value)
    signal closed()
    signal retryRequested()
    signal changeRequested(var media,var target,var choice)
    signal cancelChangeRequested()
    function clock(ms){var s=Math.floor(Math.max(0,ms)/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
    function report(state){if(started && media.duration>0)progress({position_ms:media.position,duration_ms:media.duration,state:state});}
    function play(url,desiredPlaying){
        resumed=false;started=false;ended=false;failure='';wantsPlaying=desiredPlaying!==false;restoreAfterSeek=false;zone='surface';seekTarget=-1;proposedMs=-1;menu.revision++;menu.kind='';menu.message='';media.source=url;media.play();reveal();forceActiveFocus();
    }
    function retire(){
        report('stopped');started=false;wantsPlaying=false;restoreAfterSeek=false;retrying=false;proposedMs=-1;seekTarget=-1;media.stop();media.source='';
    }
    function close(){menu.revision++;menu.kind='';cancelChangeRequested();retire();closed();}
    function toggle(){
        if(retrying || changing)return;
        if(failure){retryRequested();return;}
        if(ended)return;
        wantsPlaying=!wantsPlaying;if(wantsPlaying)media.play();else media.pause();
        console.info('ATLAS_TV_PLAY_INTENT',wantsPlaying,media.playbackState);reveal();
    }
    function openMenu(name){if(changing || failure)return;proposedMs=-1;zone='actions';controlIndex=Math.max(0,['episodes','source','version','quality'].indexOf(name));menu.open(name);reveal();}
    function activateControl(){openMenu(['episodes','source','version','quality'][controlIndex]);}
    function propose(delta){
        if(media.seekable && started && media.duration>0){proposedMs=Math.max(0,Math.min(media.duration-1000,(proposedMs>=0 ? proposedMs : media.position)+delta));zone='seek';}
        reveal();
    }
    function commitSeek(){
        if(proposedMs<0){toggle();return;}
        var target=proposedMs;proposedMs=-1;zone='surface';seekTarget=target;restoreAfterSeek=wantsPlaying;media.seek(target);
        console.info('ATLAS_TV_EPISODE_SEEK_COMMIT',target);
        if(Math.abs(media.position-target)<2000){seekTarget=-1;report(wantsPlaying ? 'playing' : 'paused');}reveal();
    }
    function reveal(){controlsVisible=true;hide.restart();}
    Rectangle {anchors.fill:parent;color:'black'}
    MediaPlayer {
        id:media;objectName:'episodeMedia';volume:1
        onPlaybackStateChanged:{
            console.info('ATLAS_TV_EPISODE_STATE',playbackState,status,position,duration);
            if(playbackState===MediaPlayer.PausedState && player.started){player.report('paused');player.reveal();}
        }
        onPositionChanged:{
            if(playbackState===MediaPlayer.PlayingState && hasVideo && position>0){
                player.started=true;
                if(!player.resumed && duration>0){
                    player.resumed=true;console.info('ATLAS_TV_EPISODE_READY',hasVideo,hasAudio,duration);
                    if(player.resumeMs>0 && seekable){player.restoreAfterSeek=player.wantsPlaying;media.seek(Math.min(player.resumeMs,Math.max(0,duration-1000)));}
                    if(!player.wantsPlaying)media.pause();player.report(player.wantsPlaying ? 'playing' : 'paused');
                }
            }
            if(player.seekTarget>=0 && Math.abs(position-player.seekTarget)<2000){player.seekTarget=-1;player.report(player.wantsPlaying ? 'playing' : 'paused');}
        }
        onStatusChanged:{console.info('ATLAS_TV_EPISODE_STATUS',status);if(status===MediaPlayer.EndOfMedia){player.report('ended');player.started=false;player.wantsPlaying=false;player.ended=true;player.controlsVisible=true;}}
        onError:{console.info('ATLAS_TV_EPISODE_ERROR',error);player.report('error');player.started=false;player.wantsPlaying=false;player.failure='La lecture a été interrompue.';player.controlsVisible=true;}
    }
    Loader {anchors.fill:parent;active:!!String(media.source);sourceComponent:Component {
        VideoOutput {objectName:'episodeVideoOutput';anchors.fill:parent;source:media;fillMode:VideoOutput.PreserveAspectFit}
    }}
    PlayerControls {anchors.fill:parent;player:parent;family:player.family;reducedMotion:player.reducedMotion;visible:!player.failure && (menu.opened || player.controlsVisible || !player.playing)}
    Item {anchors.centerIn:parent;width:88;height:88;visible:player.started && !player.playing && !player.failure && !menu.opened
        Rectangle {anchors.fill:parent;radius:44;color:'#78000000'}
        Icon {anchors.centerIn:parent;width:40;height:40;name:'play'}
    }
    PlayerMenu {id:menu;anchors.fill:parent;current:player.current;transport:player.transport;family:player.family;busy:player.changing || player.retrying
        onChangeRequested:player.changeRequested(media,target,choice)
        onCancelRequested:player.cancelChangeRequested()
        onDismissed:{player.zone='actions';player.reveal();player.forceActiveFocus();}
    }
    function changeFailed(message){retrying=false;menu.message=message;reveal();}
    Text {anchors.centerIn:parent;width:1000;horizontalAlignment:Text.AlignHCenter;wrapMode:Text.WordWrap;text:player.failure || (player.ended ? 'Épisode terminé' : !player.started ? 'Chargement…' : '');color:'white';font.family:player.family;font.pixelSize:26}
    HeroButton {anchors.horizontalCenter:parent.horizontalCenter;y:parent.height/2+58;width:240;label:player.retrying || player.changing ? 'Préparation…' : 'Réessayer';family:player.family;visible:!!player.failure;focused:true;onActivated:if(!player.retrying && !player.changing)player.retryRequested()}
    Timer {interval:250;running:player.restoreAfterSeek && player.wantsPlaying && media.playbackState===MediaPlayer.PausedState && media.status===MediaPlayer.Buffered;onTriggered:{player.restoreAfterSeek=false;media.play();}}
    Timer {interval:15000;repeat:true;running:player.started && media.playbackState===MediaPlayer.PlayingState;onTriggered:player.report('playing')}
    Timer {id:hide;interval:2500;onTriggered:if(player.playing && player.zone==='surface' && !menu.opened)player.controlsVisible=false}
    Keys.onPressed:{
        if(menu.opened){menu.key(event.key);event.accepted=true;return;}
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape){
            if(player.changing || player.retrying){cancelChangeRequested();retrying=false;}
            else if(proposedMs>=0){proposedMs=-1;zone='surface';reveal();}
            else if(zone!=='surface'){zone='surface';reveal();}else close();
        }else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select){
            if(failure)toggle();else if(zone==='actions')activateControl();else if(zone==='seek')commitSeek();else toggle();
        }else if(event.key===Qt.Key_Right || event.key===Qt.Key_Left){
            var delta=event.key===Qt.Key_Right ? 1 : -1;
            if(zone==='actions')controlIndex=Math.max(0,Math.min(3,controlIndex+delta));else propose(delta*10000);reveal();
        }else if(event.key===Qt.Key_Up || event.key===Qt.Key_Down){
            var up=event.key===Qt.Key_Up;
            if(proposedMs>=0)proposedMs=-1;
            if(zone==='surface')zone=up ? 'actions' : 'seek';else if(zone==='seek')zone=up ? 'actions' : 'surface';else zone='seek';reveal();
        }else return;
        event.accepted=true;
    }
}
