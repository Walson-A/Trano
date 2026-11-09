import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion

// La carte « À suivre », reprise du PC et enrichie : vignette et titre de l'épisode suivant,
// passage de saison compris, décompte visible et annulable. Le décompte n'existe que si
// « épisode suivant automatique » est actif dans les préférences communes ; sinon la carte
// attend un choix. Rien n'est lancé ici : `launchRequested` passe par le changement
// d'épisode normal de l'hôte (résolution, reprise, comptage à 80 %).
Item {
    id:card
    objectName:'upNext'
    property var transport
    property var next:null          // {anilist_id, episode, saison_changee, titre?}
    property string seriesTitle:''
    property string family:'sans-serif'
    property bool reducedMotion:false
    property bool automatic:true
    property bool active:false
    property int seconds:8
    property int remaining:seconds
    property int choice:0           // 0 = Lancer, 1 = Rester
    property string episodeTitle:''
    property url thumbnail:''
    property int generation:0
    readonly property string heading:next ? (next.saison_changee ? (next.titre ? next.titre+' · ' : 'Saison suivante · ')+'Épisode '+next.episode : 'Épisode '+next.episode) : ''
    signal launchRequested()
    signal dismissed()
    visible:active && !!next
    function prepare(){
        // Appelé avant la fin : titre et vignette sont prêts quand la carte s'ouvre.
        if(!next || !transport)return;var turn=++generation,key={anilist_id:next.anilist_id,debut:next.episode,nombre:1};episodeTitle='';thumbnail='';
        transport.api('/tv/v1/catalog/episodes',key,45000,function(status,value){
            if(turn!==card.generation || status!==200 || !value || value.anilist_id!==key.anilist_id || !Array.isArray(value.episodes))return;
            for(var i=0;i<value.episodes.length;i++)if(value.episodes[i].numero===key.debut && typeof value.episodes[i].titre==='string')card.episodeTitle=value.episodes[i].titre.slice(0,160);
        });
        art.request(next.anilist_id,next.episode);
    }
    function open(){if(!next)return;choice=0;remaining=seconds;active=true;if(automatic)countdown.restart();}
    function close(){countdown.stop();active=false;}
    function launch(){countdown.stop();active=false;launchRequested();}
    function cancel(){countdown.stop();active=false;dismissed();}
    function key(code){
        if(code===Qt.Key_Back || code===Qt.Key_Escape){cancel();return true;}
        if(code===Qt.Key_Left || code===Qt.Key_Right){choice=code===Qt.Key_Right ? 1 : 0;return true;}
        if(code===Qt.Key_Return || code===Qt.Key_Enter || code===Qt.Key_Select){if(choice===0)launch();else cancel();return true;}
        if(code===Qt.Key_Up || code===Qt.Key_Down)return true;
        return false;
    }
    onNextChanged:{close();generation++;episodeTitle='';thumbnail='';}
    EpisodeArtworkCache {id:art;transport:card.transport
        onSourcesChanged:{if(card.next){var url=art.sources[card.next.anilist_id+':'+card.next.episode];if(url)card.thumbnail=url;}}
    }
    Timer {id:countdown;interval:1000;repeat:true;onTriggered:{card.remaining--;if(card.remaining<=0)card.launch();}}
    Rectangle {anchors.fill:parent;gradient:Gradient {GradientStop {position:0;color:'#00000000'} GradientStop {position:.5;color:'#66000000'} GradientStop {position:1;color:'#e6000000'}}}
    Rectangle {
        id:surface;objectName:'upNextSurface'
        x:1216-width;y:676-height;width:520;height:286;radius:18;color:'#f21b1c21';border.color:'#30ffffff'
        opacity:card.visible ? 1 : 0
        transform:Translate {y:card.visible || card.reducedMotion ? 0 : 16
            Behavior on y {enabled:!card.reducedMotion;NumberAnimation {duration:Motion.ms('fade');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        }
        Behavior on opacity {enabled:!card.reducedMotion;NumberAnimation {duration:Motion.ms('fade')}}
        Item {id:picture;x:20;y:20;width:200;height:113
            Rectangle {anchors.fill:parent;radius:10;color:'#2a2d36'}
            Image {id:image;objectName:'upNextThumbnail';anchors.fill:parent;source:card.thumbnail;fillMode:Image.PreserveAspectCrop;asynchronous:true;sourceSize.width:400;visible:false}
            OpacityMask {anchors.fill:parent;source:image;visible:image.status===Image.Ready;maskSource:Rectangle {width:200;height:113;radius:10}}
            Icon {anchors.centerIn:parent;width:30;height:30;name:'play';ink:'#9aa0ad';visible:image.status!==Image.Ready}
        }
        Text {x:240;y:20;width:260;text:'À SUIVRE';color:'#a3a8b4';font.family:card.family;font.pixelSize:14;font.weight:Font.DemiBold;font.letterSpacing:1.6}
        Text {id:headingText;objectName:'upNextHeading';x:240;y:44;width:260;text:card.heading;textFormat:Text.PlainText;color:'white';font.family:card.family;font.pixelSize:22;font.weight:Font.Bold;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight}
        Text {objectName:'upNextTitle';x:240;y:headingText.y+headingText.height+6;width:260;text:card.episodeTitle || card.seriesTitle;textFormat:Text.PlainText;color:'#c9ccd5';font.family:card.family;font.pixelSize:17;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight}
        // La jauge dit le temps qui reste : un décompte en chiffres seul se lit mal du canapé.
        Rectangle {x:20;y:154;width:480;height:4;radius:2;color:'#30ffffff';visible:card.automatic
            Rectangle {objectName:'upNextGauge';width:parent.width*Math.max(0,card.remaining)/card.seconds;height:4;radius:2;color:'white'
                Behavior on width {enabled:!card.reducedMotion && card.remaining<card.seconds;NumberAnimation {duration:1000;easing.type:Easing.Linear}}
            }
        }
        Text {x:20;y:170;width:480;text:card.automatic ? 'L’épisode suivant démarre tout seul.' : 'Lecture automatique désactivée dans ton profil.';color:'#9aa0ad';font.family:card.family;font.pixelSize:16}
        Row {x:20;y:212;spacing:14
            HeroButton {objectName:'upNextLaunch';width:290;height:54;iconKey:'play';label:card.automatic ? 'Lancer ('+card.remaining+')' : 'Lancer';family:card.family;primary:true;groupHasFocus:true;reducedMotion:card.reducedMotion;focused:card.choice===0;onActivated:card.launch()}
            HeroButton {objectName:'upNextStay';width:176;height:54;label:'Rester';family:card.family;reducedMotion:card.reducedMotion;focused:card.choice===1;onActivated:card.cancel()}
        }
    }
}
