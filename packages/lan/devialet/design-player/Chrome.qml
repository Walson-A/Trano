import QtQuick 2.15
import "../hero"

// Visual study only. Not part of the live package; never resolves a media URL.
Item {
    id:study;objectName:'playerStudy';width:1280;height:720
    property url frame
    property string family:'sans-serif'
    property string title:'To Your Eternity'
    property string chapter:'Épisode 1 · VOSTFR'
    property string mode:'hud'
    property bool paused:false
    property int focusIndex:-1
    property int currentMs:432000
    property int durationMs:1500000
    property int proposedMs:565000
    signal actionRequested(string action)
    function clock(ms){var seconds=Math.floor(ms/1000);return Math.floor(seconds/60)+':'+('0'+seconds%60).slice(-2);}
    Image {anchors.fill:parent;source:study.frame;fillMode:Image.PreserveAspectFit}
    Rectangle {anchors.bottom:parent.bottom;width:1280;height:400;gradient:Gradient {GradientStop {position:0;color:'#00000000'} GradientStop {position:.65;color:'#a6000000'} GradientStop {position:1;color:'#f2000000'}}}
    Item {anchors.fill:parent;visible:study.mode==='hud' || study.mode==='scrub'
        Text {x:72;y:405;width:1050;text:study.title;textFormat:Text.PlainText;color:'white';font.family:study.family;font.pixelSize:40;font.weight:Font.Bold;elide:Text.ElideRight}
        Text {x:72;y:459;width:1050;text:study.chapter;textFormat:Text.PlainText;color:'#dedee5';font.family:study.family;font.pixelSize:21;elide:Text.ElideRight}
        Row {x:64;y:514;spacing:12
            HeroButton {width:168;flat:true;iconKey:'list-video';label:'Épisodes';family:study.family;focused:study.mode==='hud' && study.focusIndex===0;onActivated:study.actionRequested('episodes')}
            HeroButton {width:226;flat:true;label:'Source et lecteur';family:study.family;focused:study.mode==='hud' && study.focusIndex===1;onActivated:study.actionRequested('source')}
            HeroButton {width:146;flat:true;label:'VOSTFR';family:study.family;focused:study.mode==='hud' && study.focusIndex===2;onActivated:study.actionRequested('version')}
            HeroButton {width:216;flat:true;label:'Qualité · 1080p';family:study.family;focused:study.mode==='hud' && study.focusIndex===3;onActivated:study.actionRequested('quality')}
        }
        Rectangle {id:track;x:72;y:632;width:1136;height:4;radius:2;color:'#70ffffff'
            Rectangle {width:parent.width*study.currentMs/study.durationMs;height:4;radius:2;color:'white'}
            Rectangle {x:parent.width*(study.mode==='scrub' ? study.proposedMs : study.currentMs)/study.durationMs-8;y:-6;width:16;height:16;radius:8;color:'white'}
            Rectangle {x:Math.max(0,Math.min(1008,parent.width*study.proposedMs/study.durationMs-64));y:-64;width:128;height:44;radius:10;color:'#eb1b1d24';border.color:'#35ffffff';visible:study.mode==='scrub'
                Text {anchors.centerIn:parent;text:study.clock(study.proposedMs);color:'white';font.family:study.family;font.pixelSize:23;font.weight:Font.DemiBold}
            }
        }
        Text {x:72;y:656;text:study.clock(study.currentMs);color:'#ededf2';font.family:study.family;font.pixelSize:19}
        Text {x:950;y:656;width:258;horizontalAlignment:Text.AlignRight;text:'−'+study.clock(study.durationMs-study.currentMs);color:'#c9cbd4';font.family:study.family;font.pixelSize:19}
    }
    Item {anchors.centerIn:parent;width:88;height:88;visible:study.paused
        Rectangle {anchors.fill:parent;radius:48;color:'#78000000'}
        Icon {anchors.centerIn:parent;width:40;height:40;name:'play'}
    }
    Rectangle {x:64;y:392;width:760;height:288;radius:16;color:'#ed181b23';border.color:'#38ffffff';visible:study.mode==='source'
        Text {x:24;y:20;text:'Source et lecteur';color:'white';font.family:study.family;font.pixelSize:25;font.weight:Font.DemiBold}
        Text {x:24;y:70;text:'Source';color:'#b2b6c3';font.family:study.family;font.pixelSize:18}
        Choice {x:16;y:102;width:288;label:'Voiranime';family:study.family;selected:true;onActivated:study.actionRequested('source:voiranime')}
        Choice {x:16;y:164;width:288;label:'FrAnime';detail:'Non disponible sur TV';available:false;family:study.family}
        Rectangle {x:332;y:72;width:1;height:178;color:'#25ffffff'}
        Text {x:356;y:70;text:'Lecteur';color:'#b2b6c3';font.family:study.family;font.pixelSize:18}
        Choice {x:348;y:102;width:388;label:'Automatique';family:study.family;focused:true;selected:true;onActivated:study.actionRequested('reader:auto')}
        Choice {x:348;y:164;width:388;label:'Mail.ru';detail:'En lecture';family:study.family;onActivated:study.actionRequested('reader:mail')}
    }
    Rectangle {x:64;y:392;width:study.mode==='quality' ? 420 : 560;height:288;radius:16;color:'#ed181b23';border.color:'#38ffffff';visible:study.mode==='quality' || study.mode==='version'
        Text {x:24;y:20;text:study.mode==='quality' ? 'Qualité' : 'Version';color:'white';font.family:study.family;font.pixelSize:25;font.weight:Font.DemiBold}
        Text {x:24;y:62;text:study.mode==='quality' ? 'Mail.ru · 1080p en lecture' : study.title;color:'#b2b6c3';font.family:study.family;font.pixelSize:18}
        Column {x:16;y:100;spacing:4
            Repeater {model:study.mode==='quality' ? ['Automatique','360p','1080p'] : ['VOSTFR','VF']
                Choice {width:study.mode==='quality' ? 388 : 528;family:study.family;label:modelData;detail:study.mode==='quality' ? '' : index===0 ? 'Version originale sous-titrée en français' : 'Version française';focused:index===(study.mode==='quality' ? 2 : 0);selected:index===(study.mode==='quality' ? 2 : 0);onActivated:study.actionRequested(modelData)}
            }
        }
    }
    Rectangle {x:716;y:80;width:500;height:600;radius:16;color:'#ed181b23';border.color:'#38ffffff';visible:study.mode==='episodes'
        Text {x:24;y:22;width:452;text:'Épisodes';color:'white';font.family:study.family;font.pixelSize:27;font.weight:Font.DemiBold}
        Text {x:24;y:65;width:452;text:study.title;textFormat:Text.PlainText;color:'#b2b6c3';font.family:study.family;font.pixelSize:19;elide:Text.ElideRight}
        Choice {x:16;y:105;width:468;label:'Saison 1';detail:'20 épisodes';family:study.family;onActivated:study.actionRequested('season')}
        Rectangle {x:24;y:183;width:452;height:1;color:'#25ffffff'}
        Column {x:16;y:200;spacing:10
            Repeater {model:5
                Choice {width:468;height:64;label:'Épisode '+(index+1);detail:index===0 ? 'En lecture · 7:12' : '';selected:index===0;focused:index===1;family:study.family;onActivated:study.actionRequested('episode:'+(index+1))}
            }
        }
        Text {x:24;y:574;text:'1–5 sur 20';color:'#b2b6c3';font.family:study.family;font.pixelSize:17}
    }
}
