import QtQuick 2.15
Item {
    id:choice
    property string family:'sans-serif'
    property string label:''
    property string detail:''
    property bool focused:false
    property bool selected:false
    property bool available:true
    signal activated()
    width:320;height:detail ? 64 : 50;opacity:available ? 1 : .45
    Accessible.role:Accessible.Button;Accessible.name:label
    Rectangle {anchors.fill:parent;radius:10;color:choice.focused ? '#f6f6f7' : choice.selected ? '#27ffffff' : 'transparent'}
    Text {x:18;y:choice.detail ? 6 : 0;width:parent.width-52;height:choice.detail ? 28 : parent.height;verticalAlignment:Text.AlignVCenter;text:choice.label;textFormat:Text.PlainText;color:choice.focused ? '#121316' : 'white';font.family:choice.family;font.pixelSize:19;font.weight:choice.focused ? Font.DemiBold : Font.Normal;elide:Text.ElideRight}
    Text {x:18;y:35;width:parent.width-52;text:choice.detail;textFormat:Text.PlainText;color:choice.focused ? '#4b4e58' : '#afb4c2';font.family:choice.family;font.pixelSize:16;elide:Text.ElideRight;visible:!!text}
    Rectangle {x:parent.width-27;y:parent.height/2-3;width:6;height:6;radius:3;color:choice.focused ? '#13151b' : 'white';visible:choice.selected}
    MouseArea {anchors.fill:parent;enabled:choice.available;onClicked:choice.activated()}
}
