import QtQuick 2.4
import fbx.application 1.0
import "."

Application {
    Scene {
        width: 1280; height: 720
        scale: Math.min(parent.width / 1280, parent.height / 720)
        transformOrigin: Item.TopLeft
        artwork: "artwork.jpg"
        onDismissed: Qt.quit()
    }
}
