import QtQuick 2.4
import QtQuick.Window 2.2

Window {
    visible: true; width: 1280; height: 720
    title: "Atlas TV — banc QML"
    color: "#10171e"
    Scene {
        id: scene; objectName: "atlasScene"
        scale: Math.min(parent.width / 1280, parent.height / 720)
        transformOrigin: Item.TopLeft
        x: (parent.width - width * scale) / 2
        y: (parent.height - height * scale) / 2
        artwork: demoArtwork
        onDismissed: Qt.quit()
    }
}
