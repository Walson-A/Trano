import QtQuick 2.15
import "Motion.js" as Motion

// Un avis fugace. Il vit en bas, dans la marge de sécurité de la TV (5 %), hors du contenu
// qu'on regarde, et s'efface seul : un message n'a jamais à être fermé à la télécommande.
Item {
    id:toast
    property string text:''
    property string family:'sans-serif'
    property bool reducedMotion:false
    property int duration:Math.max(4500,Math.min(9000,2500+text.length*60))
    signal expired()
    x:0;y:640;width:1280;height:44;z:40
    readonly property bool shown:!!text
    onTextChanged:if(text)timer.restart();else timer.stop()
    Timer {id:timer;interval:toast.duration;onTriggered:toast.expired()}
    Rectangle {objectName:'toastSurface';anchors.horizontalCenter:parent.horizontalCenter;width:Math.min(1152,label.implicitWidth+48);height:44;radius:22;color:'#ee1b1d24';border.color:'#30ffffff'
        opacity:toast.shown ? 1 : 0
        transform:Translate {y:toast.shown || toast.reducedMotion ? 0 : 12
            Behavior on y {enabled:!toast.reducedMotion;NumberAnimation {duration:Motion.ms('fade');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        }
        Behavior on opacity {enabled:!toast.reducedMotion;NumberAnimation {duration:Motion.ms('fade');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        Text {id:label;anchors.centerIn:parent;width:Math.min(implicitWidth,1104);text:toast.text;textFormat:Text.PlainText;elide:Text.ElideRight;color:'white';font.family:toast.family;font.pixelSize:17}
    }
}
