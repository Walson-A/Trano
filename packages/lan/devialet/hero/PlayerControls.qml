import QtQuick 2.15
import "Motion.js" as Motion

Item {
    id:chrome
    property var player
    property string family:'sans-serif'
    property bool reducedMotion:false
    property bool trailerMode:false
    readonly property int displayPositionMs:trailerMode ? player.timelinePositionMs : player.positionMs
    readonly property real timelineRatio:player.durationMs>0 ? Math.max(0,Math.min(1,displayPositionMs/player.durationMs)) : 0
    readonly property var settings:trailerMode ? [] : [{label:'Version',value:player.current && player.current.target.vf ? 'VF' : 'VOSTFR',icon:'captions',menu:'version'},{label:'Source',value:player.current && player.current.readerLabel || 'Automatique',icon:'monitor-play',menu:'source'},{label:'Qualité',value:player.current && player.current.qualityLabel || 'Automatique',icon:'settings',menu:'quality'}]
    Rectangle {anchors.bottom:parent.bottom;width:1280;height:360;gradient:Gradient {GradientStop {position:0;color:'#00000000'} GradientStop {position:.35;color:'#a8000000'} GradientStop {position:.72;color:'#e8000000'} GradientStop {position:1;color:'#f8000000'}}}
    Text {x:64;y:500;width:535;height:48;visible:!chrome.trailerMode || chrome.player.proposedMs<0;text:chrome.player.title;textFormat:Text.PlainText;color:'white';font.family:chrome.family;font.pixelSize:34;font.weight:Font.Bold;elide:Text.ElideRight}
    Text {x:64;y:548;width:535;visible:!chrome.trailerMode || chrome.player.proposedMs<0;text:chrome.player.chapter;textFormat:Text.PlainText;color:'#dedee5';font.family:chrome.family;font.pixelSize:20;elide:Text.ElideRight}
    Row {x:688;y:506;spacing:12;visible:!chrome.player.failure || chrome.player.menuOpened
        Repeater {model:chrome.settings
            PlayerSetting {family:chrome.family;label:modelData.label;value:modelData.value;icon:modelData.icon;focused:!chrome.player.menuOpened && chrome.player.zone==='actions' && chrome.player.controlIndex===index;opened:chrome.player.menuName===modelData.menu;onActivated:chrome.player.openMenu(modelData.menu)}
        }
    }
    Rectangle {id:track;x:64;y:600;width:1152;height:chrome.player.zone==='seek' ? 6 : 4;radius:3;color:'#66ffffff'
        Rectangle {width:parent.width*(chrome.trailerMode ? 1 : chrome.timelineRatio);height:parent.height;radius:3;color:'white';transform:Scale {origin.x:0;xScale:chrome.trailerMode ? chrome.timelineRatio : 1
            Behavior on xScale {enabled:chrome.trailerMode && !chrome.reducedMotion;NumberAnimation {duration:Motion.ms('press');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        }}
        Rectangle {x:-width/2;y:parent.height/2-height/2;width:chrome.player.zone==='seek' ? 22 : 14;height:width;radius:width/2;color:'white';transform:Translate {x:track.width*(chrome.trailerMode ? chrome.timelineRatio : chrome.player.durationMs>0 ? Math.min(1,(chrome.player.proposedMs>=0 ? chrome.player.proposedMs : chrome.player.positionMs)/chrome.player.durationMs) : 0)
            Behavior on x {enabled:chrome.trailerMode && !chrome.reducedMotion;NumberAnimation {duration:Motion.ms('press');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        }}
        Rectangle {x:Math.max(0,Math.min(parent.width-width,parent.width*(chrome.player.durationMs>0 ? chrome.player.proposedMs/chrome.player.durationMs : 0)-width/2));y:-66;width:104;height:42;radius:10;color:'#eb1b1d24';border.color:'#35ffffff';visible:chrome.player.proposedMs>=0
            Text {anchors.centerIn:parent;text:chrome.player.clock(chrome.player.proposedMs);color:'white';font.family:chrome.family;font.pixelSize:23;font.weight:Font.DemiBold}
        }
    }
    Text {x:64;y:620;text:chrome.player.clock(chrome.displayPositionMs);color:'#ededf2';font.family:chrome.family;font.pixelSize:18}
    Text {x:1030;y:620;width:186;horizontalAlignment:Text.AlignRight;text:chrome.player.durationMs>0 ? '−'+chrome.player.clock(chrome.player.durationMs-chrome.displayPositionMs) : '—';color:'#c9cbd4';font.family:chrome.family;font.pixelSize:18}
    Item {x:52;y:658;width:168;height:42;visible:!chrome.trailerMode
        Rectangle {anchors.fill:parent;radius:10;color:!chrome.player.menuOpened && chrome.player.zone==='content' ? '#f5f5f7' : chrome.player.menuName==='episodes' || chrome.player.menuName==='seasons' ? '#28ffffff' : 'transparent'}
        Icon {x:12;y:11;width:20;height:20;name:'list-video';ink:!chrome.player.menuOpened && chrome.player.zone==='content' ? '#151519' : 'white'}
        Text {x:42;y:8;text:'Épisodes';color:!chrome.player.menuOpened && chrome.player.zone==='content' ? '#151519' : '#f5f5f7';font.family:chrome.family;font.pixelSize:20;font.weight:Font.DemiBold}
        MouseArea {anchors.fill:parent;onClicked:chrome.player.openMenu('episodes')}
    }
    Text {x:238;y:666;width:750;text:chrome.player.episodeCountLabel;visible:!chrome.trailerMode
        color:'#a9a9b3';font.family:chrome.family;font.pixelSize:17}
}
