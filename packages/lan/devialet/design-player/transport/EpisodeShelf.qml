import QtQuick 2.15
import "../netflix" as Assets

// Content-only shelf. The host owns preparation, playback and cancellation.
Item {
    id:view
    property string family:'sans-serif'
    property var episodes:[]
    property int selectedIndex:0
    property int currentEpisode:1
    property int season:1
    property int playingSeason:1
    property int positionMs:0
    property int durationMs:0
    property string zone:'episodes'
    property bool thumbnails:true
    signal selectEpisode(int index)
    signal activateEpisode(int index)
    signal openSeasons()
    signal jumpToPlaying()
    width:1152;height:322
    function clock(ms){var s=Math.floor(ms/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
    Item {x:16;y:12;width:184;height:44
        Rectangle {anchors.fill:parent;radius:8;color:view.zone==='season' ? '#f5f5f7' : 'transparent'}
        Text {x:8;y:7;text:'Saison '+view.season;color:view.zone==='season' ? '#151519' : '#f5f5f7';font.family:view.family;font.pixelSize:23;font.weight:Font.DemiBold}
        Assets.Glyph {x:136;y:14;width:16;height:16;name:'chevron-down';ink:view.zone==='season' ? '#151519' : 'white'}
        MouseArea {anchors.fill:parent;onClicked:view.openSeasons()}
    }
    Item {x:224;y:12;width:288;height:44
        Rectangle {anchors.fill:parent;radius:8;color:view.zone==='current' ? '#f5f5f7' : 'transparent'}
        Text {anchors.centerIn:parent;text:'En lecture : épisode '+view.currentEpisode;color:view.zone==='current' ? '#151519' : '#bfbfc8';font.family:view.family;font.pixelSize:18}
        MouseArea {anchors.fill:parent;onClicked:view.jumpToPlaying()}
    }
    Text {x:880;y:24;width:248;horizontalAlignment:Text.AlignRight;text:(view.selectedIndex+1)+' / '+view.episodes.length+' épisodes';color:'#c6c6ce';font.family:view.family;font.pixelSize:18}
    ListView {
        id:shelf;objectName:'episodeShelf';x:16;y:68;width:1120;height:240
        orientation:ListView.Horizontal;spacing:16;clip:true;interactive:false
        model:view.episodes;currentIndex:view.selectedIndex
        onCurrentIndexChanged:{if(currentIndex===0)positionViewAtBeginning();else positionViewAtIndex(Math.min(count-1,currentIndex+1),ListView.Contain);}
        delegate:Item {
            id:card;width:258;height:240
            readonly property bool targeted:index===view.selectedIndex && view.zone==='episodes'
            readonly property bool playing:modelData.numero===view.currentEpisode && view.season===view.playingSeason
            Accessible.role:Accessible.Button
            Accessible.name:'Épisode '+modelData.numero+(modelData.titre ? ', '+modelData.titre : '')+(playing ? ', en lecture' : '')
            Rectangle {x:0;y:0;width:258;height:146;radius:8;color:'#25262e';border.width:card.targeted ? 3 : 0;border.color:'#f5f5f7'
                Image {id:thumb;x:4;y:4;width:250;height:138;source:view.thumbnails ? modelData.vignette || '' : '';fillMode:Image.PreserveAspectCrop;asynchronous:false;sourceSize:Qt.size(500,276)}
                Text {anchors.centerIn:parent;text:'Épisode '+modelData.numero;color:'#bfbfc8';font.family:view.family;font.pixelSize:22;visible:thumb.status!==Image.Ready}
                Rectangle {x:4;y:112;width:250;height:30;color:'#d9000000';visible:card.playing
                    Text {x:10;y:5;text:'En lecture · '+view.clock(view.positionMs);color:'white';font.family:view.family;font.pixelSize:15}
                }
                Rectangle {x:4;y:139;width:250;height:3;color:'#5a5a63';visible:card.playing
                    Rectangle {width:parent.width*(view.durationMs>0 ? Math.min(1,view.positionMs/view.durationMs) : 0);height:3;color:'white'}
                }
                Item {x:105;y:47;width:48;height:48;visible:card.targeted && thumb.status===Image.Ready
                    Rectangle {anchors.fill:parent;radius:24;color:'#aa101014';border.color:'#50ffffff'}
                    Assets.Glyph {anchors.centerIn:parent;width:22;height:22;name:'play'}
                }
            }
            Text {x:2;y:155;text:'Épisode '+modelData.numero;color:card.targeted ? '#f5f5f7' : '#c6c6ce';font.family:view.family;font.pixelSize:17;font.weight:Font.DemiBold}
            Text {x:176;y:155;width:80;horizontalAlignment:Text.AlignRight;text:modelData.duree>0 ? modelData.duree+' min' : '';color:'#bfbfc8';font.family:view.family;font.pixelSize:16}
            Text {x:2;y:181;width:254;height:50;text:modelData.titre || '';textFormat:Text.PlainText;color:'#f5f5f7';font.family:view.family;font.pixelSize:18;font.weight:card.targeted ? Font.DemiBold : Font.Normal;wrapMode:Text.Wrap;maximumLineCount:2;elide:Text.ElideRight}
            MouseArea {anchors.fill:parent;onClicked:{view.selectEpisode(index);view.activateEpisode(index);}}
        }
    }
}
