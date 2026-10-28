import QtQuick 2.15
import QtGraphicalEffects 1.0

Rectangle {
    id:pane
    property Item video
    property bool frost:true
    radius:14;color:'#ee1b1c21'
    // Capture only the image plane, never the controls or the pane itself.
    ShaderEffectSource {id:sample;sourceItem:pane.video;sourceRect:Qt.rect(pane.x,pane.y,pane.width,pane.height);textureSize:Qt.size(pane.width/2,pane.height/2);live:false;hideSource:false;visible:false}
    FastBlur {anchors.fill:parent;anchors.margins:2;source:sample;radius:32;cached:true;opacity:.28;visible:pane.frost}
    Rectangle {anchors.fill:parent;radius:parent.radius;color:'#a6121318';border.color:'#28ffffff'}
}
