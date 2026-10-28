import QtQuick 2.15
import QtGraphicalEffects 1.0
Item {
    id: icon
    property string name: "play"
    property color ink: "white"
    // The release builder embeds every icon; the source bench uses local PNGs.
    property var embeddedSources: ({})
    width: 22; height: 22
    Image { id: asset; objectName:'iconPixels'; anchors.fill: parent; source: icon.embeddedSources[icon.name] || Qt.resolvedUrl('icons/'+icon.name+'.png'); sourceSize: Qt.size(44,44); visible: false }
    ColorOverlay { anchors.fill: asset; source: asset; color: icon.ink }
}
