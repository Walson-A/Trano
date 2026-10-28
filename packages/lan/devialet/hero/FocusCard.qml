import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion
Item {
    id: card
    property string title: ""
    property url artwork: ""
    property url fallbackArtwork: ""
    onArtworkChanged: cardImage.source=artwork
    onFallbackArtworkChanged: if(cardImage.status===Image.Error && fallbackArtwork) cardImage.source=fallbackArtwork
    property string family: "Segoe UI"
    property bool selected: false
    property bool focused: false
    property bool reducedMotion: false
    property real progress: -1
    property real surfaceScale: surface.scale
    signal activated()
    signal artworkFailed(bool poster)
    width: 266; height: 205; z: focused ? 10 : 0
    Accessible.role: Accessible.Button
    Accessible.name: title
    Item {
        id: surface; x: 14; y: 18; width: 238; height: 134
        scale: card.focused && !card.reducedMotion ? 1.07 : 1
        transformOrigin: Item.Center
        Behavior on scale { enabled: !card.reducedMotion; NumberAnimation { duration: Motion.ms('focus'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
        transform: Translate { y: card.focused && !card.reducedMotion ? -4 : 0
            Behavior on y { enabled: !card.reducedMotion; NumberAnimation { duration: Motion.ms('focus'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
        }
        DropShadow { anchors.fill: picture; source: picture; verticalOffset: 8; radius: 20; samples: 25; color: '#b0000000'; visible: card.focused }
        Item {
            id: picture; anchors.fill: parent
            Rectangle { anchors.fill: parent; radius: 11; color: '#1a1c22' }
            Image { id: cardImage; objectName: "heroArtwork"; anchors.fill: parent; source: card.artwork; fillMode: Image.PreserveAspectCrop; asynchronous: true; visible: false; clip: true
                onStatusChanged: if(status===Image.Error) {
                    card.artworkFailed(source===card.fallbackArtwork);
                    if(card.fallbackArtwork && source!==card.fallbackArtwork) source=card.fallbackArtwork;
                }
            }
            Text { anchors.centerIn:parent; visible:cardImage.status===Image.Error || !cardImage.source; text:'Visuel indisponible'; color:'#92939c'; font.family:card.family; font.pixelSize:15 }
            OpacityMask { anchors.fill: parent; source: cardImage; maskSource: Rectangle { width: picture.width; height: picture.height; radius: 11 } }
            Rectangle { anchors.fill: parent; radius: 11; color: '#30000000'; opacity: card.focused || card.selected ? 0 : 1
                Behavior on opacity { enabled: !card.reducedMotion; NumberAnimation { duration: Motion.ms('focus') } }
            }
            Rectangle { anchors.bottom: parent.bottom; anchors.left: parent.left; anchors.right: parent.right; anchors.margins: 10; height: 3; radius: 1.5; color: '#60ffffff'; visible: card.progress>=0
                Rectangle { width: parent.width*Math.max(0,Math.min(1,card.progress)); height: 3; radius: 1.5; color: 'white' }
            }
        }
        Rectangle { anchors.fill: parent; radius: 11; color: 'transparent'; border.width: 2; border.color: 'white'; opacity: card.focused ? 1 : card.selected ? 0.4 : 0
            Behavior on opacity { enabled: !card.reducedMotion; NumberAnimation { duration: Motion.ms('focus') } }
        }
    }
    Text { x: 14; y: 168; width: 238; text: card.title; textFormat: Text.PlainText; wrapMode: Text.WordWrap; maximumLineCount: 2; elide: Text.ElideRight
        color: card.focused || card.selected ? '#fafafa' : '#a5a5af'; font.family: card.family; font.pixelSize: 17; font.weight: card.focused ? Font.DemiBold : Font.Normal; lineHeight: 21; lineHeightMode: Text.FixedHeight
    }
    MouseArea { anchors.fill: parent; onClicked: card.activated() }
}
