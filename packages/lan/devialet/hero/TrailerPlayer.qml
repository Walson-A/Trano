import QtQuick 2.15

// Controls only: the Hero retains the one native Trailer/VideoOutput.
FocusScope {
    id:player
    property var core
    property string title:''
    property string chapter:'Bande-annonce'
    property string family:'sans-serif'
    property bool reducedMotion:false
    property bool inlinePreview:true
    property bool controlsVisible:true
    property bool retrying:false
    property bool ended:false
    property string failure:''
    property string zone:'surface'
    property int proposedMs:-1
    property int revision:0
    readonly property bool videoReady:!!core && core.ready
    readonly property bool playing:!!core && core.playing
    readonly property bool started:videoReady
    readonly property bool hasSource:!!core && core.hasSource
    readonly property int positionMs:core ? (revision,core.currentPosition()) : 0
    readonly property int durationMs:core ? core.durationMs : 0
    readonly property bool menuOpened:false
    readonly property string menuName:''
    readonly property string episodeCountLabel:''
    signal interaction()
    signal inlineRequested()
    signal retryRequested()
    function clock(ms){var s=Math.floor(Math.max(0,ms)/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
    function play(url,desired){failure='';ended=false;proposedMs=-1;retrying=false;if(core)core.play(url);reveal();}
    function retire(){if(core && core.hasSource)core.stop();proposedMs=-1;retrying=false;}
    function reveal(){controlsVisible=true;hide.restart();}
    function toggle(){if(retrying)return;if(failure)retryRequested();else if(core)core.toggle();reveal();}
    function propose(delta){if(started && durationMs>0)proposedMs=Math.max(0,Math.min(durationMs-1000,(proposedMs>=0 ? proposedMs : positionMs)+delta));zone='seek';reveal();}
    function commitSeek(){if(proposedMs<0){toggle();return;}var target=proposedMs;proposedMs=-1;zone='surface';if(core)core.seekBy(target-core.currentPosition());reveal();}
    PlayerControls {anchors.fill:parent;player:parent;family:player.family;trailerMode:true;visible:!player.inlinePreview && player.controlsVisible}
    Item {objectName:'playerPauseFeedback';anchors.centerIn:parent;width:80;height:80;visible:!player.inlinePreview && player.controlsVisible && player.started && !player.playing && !player.failure
        Rectangle {anchors.fill:parent;radius:40;color:'#a5202025';border.color:'#25ffffff'}
        Icon {anchors.centerIn:parent;width:32;height:32;name:'play'}
    }
    Text {anchors.centerIn:parent;visible:!player.inlinePreview && !player.failure && !player.videoReady;text:'Chargement…';color:'white';font.family:player.family;font.pixelSize:26}
    Rectangle {x:344;y:238;width:592;height:224;radius:14;color:'#ee1b1c21';border.color:'#28ffffff';visible:!player.inlinePreview && !!player.failure
        Text {x:28;y:26;text:'Bande-annonce indisponible';color:'white';font.family:player.family;font.pixelSize:27;font.weight:Font.DemiBold}
        Text {x:28;y:76;text:'Le chargement de la vidéo a échoué.';color:'#c6c6ce';font.family:player.family;font.pixelSize:20}
        HeroButton {x:20;y:142;width:176;family:player.family;label:player.retrying ? 'Préparation…' : 'Réessayer';focused:true;onActivated:if(!player.retrying)player.retryRequested()}
    }
    Connections {target:player.core;ignoreUnknownSignals:true
        function onObserved(observation){if(observation.event==='error')player.failure='La lecture a été interrompue.';else if(observation.event==='status' && observation.status===7)player.ended=true;}
    }
    Timer {interval:250;repeat:true;running:player.hasSource;onTriggered:player.revision++}
    Timer {id:hide;interval:2500;onTriggered:if(player.playing && player.zone==='surface')player.controlsVisible=false}
    Keys.onPressed:{
        interaction();
        if(event.isAutoRepeat && (event.key===Qt.Key_Back || event.key===Qt.Key_Escape)){event.accepted=true;return;}
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape){if(!started || failure)inlineRequested();else if(proposedMs>=0){proposedMs=-1;zone='surface';reveal();}else if(controlsVisible){controlsVisible=false;hide.stop();}else inlineRequested();}
        else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select){if(proposedMs>=0)commitSeek();else toggle();}
        else if(event.key===Qt.Key_Right || event.key===Qt.Key_Left){if(!failure)propose(event.key===Qt.Key_Right ? 10000 : -10000);}
        else if(event.key===Qt.Key_Up || event.key===Qt.Key_Down){zone='seek';reveal();}else return;
        event.accepted=true;
    }
}
