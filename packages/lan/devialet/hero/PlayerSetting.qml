import QtQuick 2.15

Item {
    id:control
    property string family:'sans-serif'
    property string label
    property string value
    property string icon
    property bool focused:false
    property bool opened:false
    signal activated()
    width:168;height:64
    Accessible.role:Accessible.Button
    Accessible.name:label+', '+value
    Rectangle {anchors.fill:parent;radius:12;color:control.focused ? '#f4f4f6' : control.opened ? '#28ffffff' : 'transparent'}
    Icon {x:12;y:12;width:20;height:20;name:control.icon;ink:control.focused ? '#151519' : '#ededf1'}
    Text {x:40;y:10;width:parent.width-48;text:control.label;color:control.focused ? '#151519' : '#ededf1';font.family:control.family;font.pixelSize:18;font.weight:Font.DemiBold}
    Text {x:40;y:36;width:parent.width-48;text:control.value;color:control.focused ? '#53535b' : '#bfbfc8';font.family:control.family;font.pixelSize:15;elide:Text.ElideRight;textFormat:Text.PlainText}
    MouseArea {anchors.fill:parent;onClicked:control.activated()}
}
