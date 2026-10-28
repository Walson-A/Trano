import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion

Item {
    id: control
    property string label: ""
    property string family: "Segoe UI"
    property bool primary: false
    property bool selected: false
    property bool focused: false
    property bool groupHasFocus: false
    property bool whiteSurface: focused || primary && !groupHasFocus
    property bool reducedMotion: false
    property bool pill: false
    property bool flat: false
    property string iconKey: ""
    property Item backdrop: null
    property rect sampleRect: Qt.rect(x,y,width,height)
    signal activated()
    width: 180; height: 52
    scale: focused && !reducedMotion ? 1.035 : 1
    Behavior on scale { enabled: !control.reducedMotion; NumberAnimation { duration: Motion.ms('focus'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
    Accessible.role: Accessible.Button
    Accessible.name: label
    Item {
        anchors.fill: parent; visible: !control.primary && !control.focused && !!control.backdrop
        layer.enabled: true
        layer.effect: OpacityMask { maskSource: Rectangle { width: control.width; height: control.height; radius: control.pill ? height/2 : 12 } }
        ShaderEffectSource { id: sample; sourceItem: control.backdrop; sourceRect: control.sampleRect; live: true; hideSource: false; visible: false }
        FastBlur { anchors.fill: parent; source: sample; radius: 24 }
    }
    Rectangle {
        anchors.fill: parent; radius: control.pill ? height/2 : 12
        color: control.whiteSurface ? "#f6f6f7" : control.selected ? "#42ffffff" : control.flat ? 'transparent' : "#7513161c"
        border.color: control.focused ? "#f6f6f7" : control.flat ? 'transparent' : "#30ffffff"; border.width: 1
        Behavior on color { enabled: !control.reducedMotion; ColorAnimation { duration: Motion.ms('press') } }
    }
    Row { anchors.centerIn: parent; spacing: control.iconKey && control.label ? 11 : 0
        Icon { name: control.iconKey || 'play'; visible: !!control.iconKey; width: visible ? 21 : 0; height: 21; anchors.verticalCenter: parent.verticalCenter; ink: control.whiteSurface ? '#121316' : '#f8f8fa' }
        Text { text: control.label; width:Math.min(implicitWidth,control.width-(control.iconKey ? 66 : 32));elide:Text.ElideRight;color: control.whiteSurface ? "#121316" : "#f8f8fa"; font.family: control.family; font.pixelSize: 19; font.weight: Font.DemiBold }
    }
    MouseArea { anchors.fill: parent; onClicked: control.activated() }
}
