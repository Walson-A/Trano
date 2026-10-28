import QtQuick 2.15
import "Motion.js" as Motion

Item {
    id:chrome
    property var player
    property string family:'sans-serif'
    property bool reducedMotion:false
    function rateText(value){return String(Number(value.toFixed(2))).replace('.',',')+'×';}
    Rectangle {width:parent.width;height:160;gradient:Gradient {GradientStop {position:0;color:'#d9000000'} GradientStop {position:1;color:'#00000000'}}}
    HeroButton {x:56;y:32;width:56;height:52;iconKey:'arrow-left';flat:true;family:chrome.family;onActivated:chrome.player.close();Accessible.name:'Retour à la fiche'}
    Text {x:134;y:39;width:1050;text:chrome.player.title;textFormat:Text.PlainText;color:'white';font.family:chrome.family;font.pixelSize:27;font.weight:Font.DemiBold;elide:Text.ElideRight}
    Rectangle {anchors.bottom:parent.bottom;width:parent.width;height:260;gradient:Gradient {GradientStop {position:0;color:'#00000000'} GradientStop {position:1;color:'#ed000000'}}}
    Item {x:64;y:parent.height-156;width:1152;height:132
        Rectangle {y:12;width:1152;height:chrome.player.zone==='seek' ? 6 : 4;radius:3;color:'#55ffffff'
            Rectangle {height:parent.height;width:parent.width*(chrome.player.durationMs>0 ? Math.max(0,Math.min(1,chrome.player.positionMs/chrome.player.durationMs)) : 0);radius:3;color:'white'}
            Rectangle {x:parent.width*(chrome.player.durationMs>0 ? Math.max(0,Math.min(1,chrome.player.positionMs/chrome.player.durationMs)) : 0)-6;y:parent.height/2-6;width:12;height:12;radius:6;color:'white';visible:chrome.player.zone==='seek'}
        }
        HeroButton {x:0;y:44;width:52;height:52;pill:true;primary:true;iconKey:chrome.player.playing ? 'pause' : 'play';family:chrome.family;focused:chrome.player.zone==='toolbar' && chrome.player.controlIndex===0;onActivated:chrome.player.toggle();Accessible.name:chrome.player.playing ? 'Pause' : 'Lecture'
            Rectangle {x:-5;y:-5;width:62;height:62;radius:31;color:'transparent';border.width:2;border.color:'white';visible:parent.focused}
        }
        HeroButton {x:68;y:44;width:92;height:52;flat:true;iconKey:'rotate-ccw';label:'10';family:chrome.family;focused:chrome.player.zone==='toolbar' && chrome.player.controlIndex===1;onActivated:chrome.player.seek(-10000);Accessible.name:'Reculer de 10 secondes'}
        HeroButton {x:176;y:44;width:92;height:52;flat:true;iconKey:'rotate-cw';label:'10';family:chrome.family;focused:chrome.player.zone==='toolbar' && chrome.player.controlIndex===2;onActivated:chrome.player.seek(10000);Accessible.name:'Avancer de 10 secondes'}
        Text {x:300;y:59;width:390;text:chrome.player.clock(chrome.player.positionMs)+' / '+(chrome.player.durationMs>0 ? chrome.player.clock(chrome.player.durationMs) : '—');color:'#e8e8ee';font.family:chrome.family;font.pixelSize:20}
        HeroButton {x:716;y:44;width:168;height:52;flat:true;iconKey:'list-video';label:'Épisodes';family:chrome.family;focused:chrome.player.zone==='toolbar' && chrome.player.controlIndex===3;onActivated:chrome.player.episodesRequested()}
        HeroButton {x:900;y:44;width:56;height:52;flat:true;iconKey:chrome.player.audioMuted ? 'volume-x' : 'volume-2';family:chrome.family;focused:chrome.player.zone==='toolbar' && chrome.player.controlIndex===4;onActivated:chrome.player.toggleAudio();Accessible.name:chrome.player.audioMuted ? 'Activer le son' : 'Couper le son'}
        HeroButton {x:972;y:44;width:180;height:52;flat:true;label:chrome.rateText(chrome.player.rate);family:chrome.family;focused:chrome.player.zone==='toolbar' && chrome.player.controlIndex===5;onActivated:chrome.player.openRates();Accessible.name:'Vitesse de lecture'}
    }
    Rectangle {x:950;y:parent.height-478;width:266;height:282;radius:18;color:'#ed20232b';border.color:'#48ffffff';visible:chrome.player.zone==='rates'
        Text {x:24;y:20;text:'Vitesse';color:'white';font.family:chrome.family;font.pixelSize:23;font.weight:Font.DemiBold}
        Column {x:16;y:62;spacing:2
            Repeater {model:chrome.player.rates
                HeroButton {width:234;height:40;flat:true;family:chrome.family;label:chrome.rateText(modelData);selected:chrome.player.rate===modelData;focused:chrome.player.rateIndex===index;onActivated:{chrome.player.rateIndex=index;chrome.player.chooseRate();}}
            }
        }
    }
}
