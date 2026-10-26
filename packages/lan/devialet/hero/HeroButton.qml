import QtQuick 2.15
import QtGraphicalEffects 1.0

Item {
    id: control
    property string label: ""
    property string family: "Segoe UI"
    property bool primary: false
    property bool selected: false
    property bool focused: false
    property Item backdrop: null
    property rect sampleRect: Qt.rect(x,y,width,height)
    signal activated()
    width: 180; height: 52
    Accessible.role: Accessible.Button
    Accessible.name: label
    ShaderEffectSource { id: sample; sourceItem: control.backdrop; sourceRect: control.sampleRect; live: true; hideSource: false; visible: false }
    FastBlur { anchors.fill: parent; source: sample; radius: 24; visible: !control.primary && !!control.backdrop }
    Rectangle {
        anchors.fill: parent; radius: 10
        color: control.primary ? "#f6f6f7" : control.selected ? "#42ffffff" : "#720b0c10"
        border.color: control.focused ? "white" : "#45ffffff"; border.width: control.focused ? 2 : 1
    }
    Rectangle { anchors.fill: parent; anchors.margins: -5; radius: 15; color: "transparent"; border.width: 2; border.color: control.focused ? "white" : "transparent" }
    Text { anchors.centerIn: parent; text: control.label; color: control.primary ? "#121316" : "#f8f8fa"; font.family: control.family; font.pixelSize: 19; font.weight: Font.DemiBold }
    MouseArea { anchors.fill: parent; onClicked: control.activated() }
}
