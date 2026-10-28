import QtQuick 2.15
Item {
    id:command
    property string icon
    property string label
    property bool focused:false
    property bool opened:false
    signal activated()
    width:52;height:52
    Accessible.role:Accessible.Button;Accessible.name:label
    Rectangle {anchors.centerIn:parent;width:48;height:48;radius:24;color:command.focused ? '#f7f7f8' : 'transparent'}
    Glyph {anchors.centerIn:parent;width:28;height:28;name:command.icon;ink:command.focused ? '#111114' : 'white'}
    Rectangle {anchors.horizontalCenter:parent.horizontalCenter;y:49;width:20;height:2;radius:1;color:'white';visible:command.opened}
    MouseArea {anchors.fill:parent;onClicked:command.activated()}
}
