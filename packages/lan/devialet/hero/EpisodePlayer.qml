import QtQuick 2.15
import QtMultimedia 5.0
import "EpisodePolicy.js" as Episode

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
    property string menuOrigin:'actions'
    property int errorIndex:0
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
    readonly property string episodeCountLabel:current && menu.airingData && menu.airingData.anilist_id===current.media.anilist_id && menu.airingData.diffusion ? Episode.count(menu.airingData,true) : current && current.media.diffusion ? Episode.count(current.media,true) : current && current.media.episodes>0 ? current.media.episodes+' épisodes' : ''
    signal progress(var value)
    signal closed()
    signal retryRequested()
    signal changeRequested(var media,var target,var choice)
    signal cancelChangeRequested()
    function clock(ms){var s=Math.floor(Math.max(0,ms)/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
    function knownEpisode(identity,number){if(menu.episodeCard && menu.episodeCard.anilist_id===identity)for(var i=0;i<menu.entries.length;i++)if(menu.entries[i].numero===number)return menu.entries[i];return null;}
    function report(state){if(started && media.duration>0)progress({position_ms:media.position,duration_ms:media.duration,state:state});}
    function play(url,desiredPlaying){
        var returnZone=menu.opened ? menuOrigin : 'surface';
        resumed=false;started=false;ended=false;failure='';errorIndex=0;wantsPlaying=desiredPlaying!==false;restoreAfterSeek=false;zone=returnZone;seekTarget=-1;proposedMs=-1;menu.revision++;menu.kind='';menu.message='';media.source=url;media.play();reveal();forceActiveFocus();
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
    function openMenu(name){if(changing)return;proposedMs=-1;menuOrigin=name==='episodes' ? 'content' : 'actions';zone=menuOrigin;if(name!=='episodes')controlIndex=Math.max(0,['version','source','quality'].indexOf(name));menu.open(name);reveal();}
    function activateControl(){openMenu(['version','source','quality'][controlIndex]);}
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
    PlayerControls {anchors.fill:parent;player:parent;family:player.family;reducedMotion:player.reducedMotion;visible:menu.opened || player.controlsVisible}
    Item {anchors.centerIn:parent;width:80;height:80;visible:player.controlsVisible && player.started && !player.playing && !player.failure && !menu.opened
        Rectangle {anchors.fill:parent;radius:40;color:'#a5202025';border.color:'#25ffffff'}
        Icon {anchors.centerIn:parent;width:32;height:32;name:'play'}
    }
    PlayerMenu {id:menu;anchors.fill:parent;current:player.current;transport:player.transport;family:player.family;busy:player.changing || player.retrying;positionMs:player.positionMs;durationMs:player.durationMs
        onChangeRequested:player.changeRequested(media,target,choice)
        onCancelRequested:player.cancelChangeRequested()
        onDismissed:{player.zone=player.menuOrigin;player.reveal();player.forceActiveFocus();}
    }
    function changeFailed(message){retrying=false;menu.message=message;menu.changeError=true;reveal();}
    Text {anchors.centerIn:parent;width:1000;horizontalAlignment:Text.AlignHCenter;wrapMode:Text.WordWrap;text:!player.failure && !menu.opened ? (player.ended ? 'Épisode terminé' : !player.started ? 'Chargement…' : '') : '';color:'white';font.family:player.family;font.pixelSize:26}
    Rectangle {x:344;y:238;width:592;height:224;radius:14;color:'#ee1b1c21';border.color:'#28ffffff';visible:!!player.failure && !menu.opened
        Text {x:28;y:26;text:'La lecture s’est interrompue';color:'white';font.family:player.family;font.pixelSize:27;font.weight:Font.DemiBold}
        Text {x:28;y:76;text:'Ta position est conservée à '+player.clock(player.positionMs)+'.';color:'#c6c6ce';font.family:player.family;font.pixelSize:20}
        Row {x:20;y:142;spacing:12
            Repeater {model:['Réessayer','Changer de source']
                Rectangle {width:index===0 ? 176 : 344;height:56;radius:10;color:player.errorIndex===index ? '#f5f5f7' : '#20ffffff'
                    Text {anchors.centerIn:parent;text:player.retrying || player.changing ? 'Préparation…' : modelData;color:player.errorIndex===index ? '#151519' : 'white';font.family:player.family;font.pixelSize:21;font.weight:Font.DemiBold}
                    MouseArea {anchors.fill:parent;onClicked:{player.errorIndex=index;if(index===1)player.openMenu('source');else if(!player.retrying && !player.changing)player.retryRequested();}}
                }
            }
        }
    }
    Timer {interval:250;running:player.restoreAfterSeek && player.wantsPlaying && media.playbackState===MediaPlayer.PausedState && media.status===MediaPlayer.Buffered;onTriggered:{player.restoreAfterSeek=false;media.play();}}
    Timer {interval:15000;repeat:true;running:player.started && media.playbackState===MediaPlayer.PlayingState;onTriggered:player.report('playing')}
    Timer {id:hide;interval:2500;onTriggered:if(player.playing && player.zone==='surface' && !menu.opened)player.controlsVisible=false}
    Keys.onPressed:{
        if((event.key===Qt.Key_Back || event.key===Qt.Key_Escape) && event.isAutoRepeat){event.accepted=true;return;}
        if(menu.opened){menu.key(event.key);event.accepted=true;return;}
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape){
            if(player.changing || player.retrying){cancelChangeRequested();retrying=false;}
            else if(proposedMs>=0){proposedMs=-1;zone='surface';reveal();}
            else if(controlsVisible && !failure){controlsVisible=false;zone='surface';hide.stop();}else close();
        }else if(failure){
            if(event.key===Qt.Key_Left || event.key===Qt.Key_Right)errorIndex=event.key===Qt.Key_Left ? 0 : 1;
            else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select){if(errorIndex===1)openMenu('source');else toggle();}
        }else if(!controlsVisible && (event.key===Qt.Key_Right || event.key===Qt.Key_Left || event.key===Qt.Key_Up || event.key===Qt.Key_Down)){
            zone='seek';reveal();
        }else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select){
            if(zone==='actions')activateControl();else if(zone==='content')openMenu('episodes');else if(zone==='seek')commitSeek();else toggle();
        }else if(event.key===Qt.Key_Right || event.key===Qt.Key_Left){
            var delta=event.key===Qt.Key_Right ? 1 : -1;
            if(zone==='actions')controlIndex=Math.max(0,Math.min(2,controlIndex+delta));else if(zone!=='content')propose(delta*10000);reveal();
        }else if(event.key===Qt.Key_Up || event.key===Qt.Key_Down){
            var up=event.key===Qt.Key_Up;
            if(proposedMs>=0)proposedMs=-1;
            if(up)zone=zone==='content' ? 'seek' : 'actions';else zone=zone==='actions' ? 'seek' : 'content';reveal();
        }else return;
        event.accepted=true;
    }
}
