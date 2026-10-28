import QtQuick 2.15
Item {
    id:row
    property string family:'sans-serif'
    property string label:''
    property string detail:''
    property string suffix:''
    property bool focused:false
    property bool chosen:false
    signal activated()
    width:300;height:detail ? 64 : 48
    Accessible.role:Accessible.Button;Accessible.name:label+(detail ? ', '+detail : '')
    Rectangle {anchors.fill:parent;radius:4;color:row.focused ? '#f7f7f8' : 'transparent'}
    Glyph {x:14;y:parent.height/2-10;width:20;height:20;name:'check';visible:row.chosen;ink:row.focused ? '#111114' : 'white'}
    Text {x:46;y:row.detail ? 8 : 0;width:parent.width-62-(row.suffix ? 70 : 0);height:row.detail ? 28 : parent.height;text:row.label;textFormat:Text.PlainText;verticalAlignment:Text.AlignVCenter;color:row.focused ? '#111114' : '#f7f7f8';font.family:row.family;font.pixelSize:20;font.weight:row.focused ? Font.DemiBold : Font.Normal;elide:Text.ElideRight}
    Text {x:46;y:36;width:parent.width-62;text:row.detail;textFormat:Text.PlainText;color:row.focused ? '#48484f' : '#b8b8c0';font.family:row.family;font.pixelSize:16;visible:!!text;elide:Text.ElideRight}
    Text {anchors.right:parent.right;anchors.rightMargin:16;anchors.verticalCenter:parent.verticalCenter;text:row.suffix;color:row.focused ? '#48484f' : '#b8b8c0';font.family:row.family;font.pixelSize:16}
    MouseArea {anchors.fill:parent;onClicked:row.activated()}
}
