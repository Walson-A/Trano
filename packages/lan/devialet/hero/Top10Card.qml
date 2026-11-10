import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion

// Le « Top 10 du moment » du PC (le chiffre passe 12 px sous l'affiche, comme `-mr-3`), à la distance du canapé : le rang en très grand derrière
// l'affiche, comme sur l'accueil LifeOS (`CarteAnime` forme top10). Le chiffre est détouré
// (contour épais, fond de la page à l'intérieur) pour rester lisible à 3 m sans voler la
// vedette à l'affiche ; il s'éclaire quand la carte a le focus.
Item {
    id:card
    property int rank:1
    property string title:''
    property url artwork:''
    property string family:'sans-serif'
    property bool selected:false
    property bool focused:false
    property bool reducedMotion:false
    readonly property real surfaceScale:poster.scale
    signal activated()
    signal artworkFailed(url failedSource)
    signal artworkReady(url loadedSource)
    width:poster.x+poster.width;height:220;z:focused ? 10 : 0
    Accessible.role:Accessible.Button
    Accessible.name:'Numéro '+rank+', '+title
    Item {
        id:numeral;objectName:'top10Rank';x:0;y:-8;width:card.rank>=10 ? 214 : 150;height:224
        readonly property color stroke:card.focused ? '#f6f6f7' : card.selected ? '#b8bcc6' : '#7d828e'
        Repeater {
            // Un contour d'environ 3 px, fait de copies décalées : Text.Outline n'en trace qu'un.
            model:[[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,2],[-2,2],[2,-2]]
            Text {x:modelData[0];y:modelData[1];width:numeral.width;height:numeral.height;text:card.rank;horizontalAlignment:Text.AlignRight;verticalAlignment:Text.AlignBottom
                color:numeral.stroke;font.family:card.family;font.pixelSize:200;font.weight:Font.Black;font.letterSpacing:card.rank>=10 ? -16 : 0;lineHeight:.8
                Behavior on color {enabled:!card.reducedMotion;ColorAnimation {duration:Motion.ms('focus')}}
            }
        }
        Text {width:numeral.width;height:numeral.height;text:card.rank;horizontalAlignment:Text.AlignRight;verticalAlignment:Text.AlignBottom
            color:'#090a0d';font.family:card.family;font.pixelSize:200;font.weight:Font.Black;font.letterSpacing:card.rank>=10 ? -16 : 0;lineHeight:.8}
    }
    Item {
        id:poster;objectName:'top10Poster';x:numeral.width-12;y:8;width:134;height:200
        scale:card.focused && !card.reducedMotion ? 1.06 : 1;transformOrigin:Item.Bottom
        Behavior on scale {enabled:!card.reducedMotion;NumberAnimation {duration:Motion.ms('focus');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        DropShadow {anchors.fill:frame;source:frame;verticalOffset:8;radius:20;samples:25;color:'#b0000000';visible:card.focused}
        Item {id:frame;anchors.fill:parent
            Rectangle {anchors.fill:parent;radius:10;color:'#1a1c22'}
            Image {id:image;anchors.fill:parent;source:card.artwork;fillMode:Image.PreserveAspectCrop;asynchronous:true;sourceSize.width:268;visible:false
                onStatusChanged:if(status===Image.Ready)card.artworkReady(source);else if(status===Image.Error)card.artworkFailed(source)}
            OpacityMask {anchors.fill:parent;source:image;maskSource:Rectangle {width:134;height:200;radius:10}}
            Text {anchors.centerIn:parent;width:110;visible:image.status!==Image.Ready;text:card.title;textFormat:Text.PlainText;wrapMode:Text.WordWrap;maximumLineCount:4;elide:Text.ElideRight;horizontalAlignment:Text.AlignHCenter;color:'#92939c';font.family:card.family;font.pixelSize:15}
            Rectangle {anchors.fill:parent;radius:10;color:'#30000000';opacity:card.focused || card.selected ? 0 : 1
                Behavior on opacity {enabled:!card.reducedMotion;NumberAnimation {duration:Motion.ms('focus')}}
            }
        }
        Rectangle {anchors.fill:parent;radius:10;color:'transparent';border.width:3;border.color:'white';opacity:card.focused ? 1 : 0
            Behavior on opacity {enabled:!card.reducedMotion;NumberAnimation {duration:Motion.ms('focus')}}
        }
    }
    MouseArea {anchors.fill:parent;onClicked:card.activated()}
}
