import QtQuick 2.15

Item {
    id:chrome
    property var player
    property string family:'sans-serif'
    property bool reducedMotion:false
    Rectangle {anchors.bottom:parent.bottom;width:1280;height:400;gradient:Gradient {GradientStop {position:0;color:'#00000000'} GradientStop {position:.65;color:'#a6000000'} GradientStop {position:1;color:'#f2000000'}}}
    Text {visible:!chrome.player.menuOpened;x:72;y:405;width:1050;text:chrome.player.title;textFormat:Text.PlainText;color:'white';font.family:chrome.family;font.pixelSize:40;font.weight:Font.Bold;elide:Text.ElideRight}
    Text {visible:!chrome.player.menuOpened;x:72;y:459;width:1050;text:chrome.player.chapter;textFormat:Text.PlainText;color:'#dedee5';font.family:chrome.family;font.pixelSize:21;elide:Text.ElideRight}
    Row {x:64;y:514;spacing:12
        HeroButton {width:168;flat:true;iconKey:'list-video';label:'Épisodes';family:chrome.family;reducedMotion:true;selected:chrome.player.menuName==='episodes';focused:!chrome.player.menuOpened && chrome.player.zone==='actions' && chrome.player.controlIndex===0;onActivated:chrome.player.openMenu('episodes')}
        HeroButton {width:226;flat:true;label:'Source et lecteur';family:chrome.family;reducedMotion:true;selected:chrome.player.menuName==='source';focused:!chrome.player.menuOpened && chrome.player.zone==='actions' && chrome.player.controlIndex===1;onActivated:chrome.player.openMenu('source')}
        HeroButton {width:146;flat:true;label:chrome.player.current && chrome.player.current.target.vf ? 'VF' : 'VOSTFR';family:chrome.family;reducedMotion:true;selected:chrome.player.menuName==='version';focused:!chrome.player.menuOpened && chrome.player.zone==='actions' && chrome.player.controlIndex===2;onActivated:chrome.player.openMenu('version')}
        HeroButton {width:246;flat:true;label:'Qualité'+(chrome.player.current && chrome.player.current.qualityLabel ? ' · '+chrome.player.current.qualityLabel : ' · Auto');family:chrome.family;reducedMotion:true;selected:chrome.player.menuName==='quality';focused:!chrome.player.menuOpened && chrome.player.zone==='actions' && chrome.player.controlIndex===3;onActivated:chrome.player.openMenu('quality')}
    }
    Rectangle {id:track;x:72;y:632;width:1136;height:chrome.player.zone==='seek' ? 6 : 4;radius:3;color:'#70ffffff'
        Rectangle {width:parent.width*(chrome.player.durationMs>0 ? Math.min(1,chrome.player.positionMs/chrome.player.durationMs) : 0);height:parent.height;radius:3;color:'white'}
        Rectangle {x:parent.width*(chrome.player.durationMs>0 ? Math.min(1,(chrome.player.proposedMs>=0 ? chrome.player.proposedMs : chrome.player.positionMs)/chrome.player.durationMs) : 0)-8;y:parent.height/2-8;width:16;height:16;radius:8;color:'white'}
        Rectangle {x:Math.max(0,Math.min(1008,parent.width*(chrome.player.durationMs>0 ? chrome.player.proposedMs/chrome.player.durationMs : 0)-64));y:-64;width:128;height:44;radius:10;color:'#eb1b1d24';border.color:'#35ffffff';visible:chrome.player.proposedMs>=0
            Text {anchors.centerIn:parent;text:chrome.player.clock(chrome.player.proposedMs);color:'white';font.family:chrome.family;font.pixelSize:23;font.weight:Font.DemiBold}
        }
    }
    Text {x:72;y:656;text:chrome.player.clock(chrome.player.positionMs);color:'#ededf2';font.family:chrome.family;font.pixelSize:19}
    Text {x:950;y:656;width:258;horizontalAlignment:Text.AlignRight;text:chrome.player.durationMs>0 ? '−'+chrome.player.clock(chrome.player.durationMs-chrome.player.positionMs) : '—';color:'#c9cbd4';font.family:chrome.family;font.pixelSize:19}
}
