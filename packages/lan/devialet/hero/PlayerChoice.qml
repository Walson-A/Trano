import QtQuick 2.15

Item {
    id:choice
    property string family:'sans-serif'
    property string label:''
    property string detail:''
    property bool focused:false
    property bool selected:false
    property bool available:true
    // Ce qui joue, distinct de ce qu'on a choisi (la coche) : vrai aussi en Automatique.
    property bool playing:false
    signal activated()
    width:320;height:detail ? 64 : 50;opacity:available ? 1 : .45
    Accessible.role:Accessible.Button;Accessible.name:label+(detail ? ', '+detail : '')+(playing ? ', en lecture' : '')
    Rectangle {anchors.fill:parent;radius:10;color:choice.focused ? '#f6f6f7' : choice.selected ? '#27ffffff' : 'transparent'}
    Text {x:46;y:choice.detail ? 6 : 0;width:parent.width-62-(choice.playing ? pill.width+10 : 0);height:choice.detail ? 28 : parent.height;verticalAlignment:Text.AlignVCenter;text:choice.label;textFormat:Text.PlainText;color:choice.focused ? '#121316' : 'white';font.family:choice.family;font.pixelSize:19;font.weight:choice.focused ? Font.DemiBold : Font.Normal;elide:Text.ElideRight}
    Text {x:46;y:32;width:parent.width-62;text:choice.detail;textFormat:Text.PlainText;color:choice.focused ? '#4b4e58' : '#afb4c2';font.family:choice.family;font.pixelSize:16;elide:Text.ElideRight;visible:!!text}
    Rectangle {id:pill;objectName:'playingPill';x:parent.width-width-12;y:choice.detail ? 9 : parent.height/2-height/2;width:pillText.implicitWidth+20;height:24;radius:12;visible:choice.playing;color:choice.focused ? '#13151b' : '#e8f5f5f7'
        Text {id:pillText;anchors.centerIn:parent;text:'En lecture';color:choice.focused ? 'white' : '#13151b';font.family:choice.family;font.pixelSize:13;font.weight:Font.DemiBold}
    }
    Icon {x:14;y:parent.height/2-10;width:20;height:20;name:'check';ink:choice.focused ? '#13151b' : 'white';visible:choice.selected}
    MouseArea {anchors.fill:parent;enabled:choice.available;onClicked:choice.activated()}
}
