import QtQuick 2.15
import QtQuick.Window 2.2
Window {
    width: 1280; height: 720; visible: true; color: "#090a0d"; title: "Atlas TV — héros PC adapté"
    Hero { objectName: "atlasHero"; scale: Math.min(parent.width/1280,parent.height/720); transformOrigin: Item.TopLeft
        homeData: benchmarkHome; artworkMap: benchmarkArtwork; family: benchmarkFamily; trailerSources: benchmarkTrailers; previewEnabled: benchmarkPreview
        onDismissed: Qt.quit()
    }
}
