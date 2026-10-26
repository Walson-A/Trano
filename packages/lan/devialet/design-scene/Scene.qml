import QtQuick 2.4

// Independent design experiment. No relay, account, catalog or video request.
FocusScope {
    id: scene
    width: 1280; height: 720
    focus: true
    property url artwork: ""
    property string typeface: "Segoe UI"
    property bool detailsOpen: false
    readonly property bool selected: card.activeFocus
    property bool blurEnabled: false
    property string blurStatus: "Verre sans flou"
    signal dismissed()

    function activate() { detailsOpen = !detailsOpen }
    Keys.onPressed: {
        if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Select) {
            activate(); event.accepted = true
        } else if (event.key === Qt.Key_Escape || event.key === Qt.Key_Back) {
            if (detailsOpen) { detailsOpen = false; card.forceActiveFocus() } else dismissed()
            event.accepted = true
        } else if (event.key === Qt.Key_Left || event.key === Qt.Key_Right) {
            if (event.key === Qt.Key_Left) card.forceActiveFocus(); else panel.forceActiveFocus()
            event.accepted = true
        } else if (event.key === Qt.Key_G || event.key === Qt.Key_Down) {
            blurEnabled = !blurEnabled; event.accepted = true
        }
    }
    Component.onCompleted: card.forceActiveFocus()
    Rectangle { anchors.fill: parent; color: "#10171e" }
    Image { id: backdrop; anchors.fill: parent; source: scene.artwork; fillMode: Image.PreserveAspectCrop; sourceSize.width: 1600 }
    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0; color: "#700c121b" }
            GradientStop { position: 0.45; color: "#880c121b" }
            GradientStop { position: 1; color: "#f50c121b" }
        }
    }
    Text { x: 64; y: 39; text: "atlas"; font.family: scene.typeface; font.pixelSize: 31; font.weight: Font.DemiBold; color: "#fafafa" }
    Rectangle { x: 148; y: 48; width: 36; height: 24; radius: 6; color: "#24ffffff"; Text { anchors.centerIn: parent; text: "TV"; color: "white"; font.family: scene.typeface; font.pixelSize: 13; font.bold: true } }
    Text { anchors.right: parent.right; anchors.rightMargin: 64; y: 47; text: "Scène de démonstration"; font.family: scene.typeface; font.pixelSize: 16; color: "#dce5ee" }

    Text { x: 64; y: 143; text: "L’image d’abord."; font.family: scene.typeface; font.pixelSize: 52; font.weight: Font.DemiBold; color: "#fafafa" }
    Text { x: 67; y: 215; text: "Une carte, une sélection claire. Le paysage fait le reste."; font.family: scene.typeface; font.pixelSize: 21; color: "#d4dde4" }

    FocusScope {
        id: card
        x: 68; y: 293; width: 650; height: 294
        Rectangle { anchors.fill: parent; anchors.margins: -6; color: "transparent"; border.color: scene.selected ? "#f5f8fb" : "transparent"; border.width: 3 }
        Rectangle { anchors.fill: parent; color: "#263540" }
        Image { x: 0; y: 0; width: parent.width; height: parent.height; source: scene.artwork; fillMode: Image.PreserveAspectCrop; sourceSize.width: 1000 }
        Rectangle { anchors.fill: parent; gradient: Gradient { GradientStop { position: 0.25; color: "transparent" } GradientStop { position: 1; color: "#ed0d1621" } } }
        Text { x: 27; y: 185; text: "Au-delà des sommets"; font.family: scene.typeface; font.pixelSize: 33; font.weight: Font.DemiBold; color: "white" }
        Text { x: 29; y: 237; text: "Étude de carte paysage"; font.family: scene.typeface; font.pixelSize: 18; color: "#e0e8ee" }
        MouseArea { anchors.fill: parent; onClicked: { card.forceActiveFocus(); scene.activate() } }
    }

    FocusScope {
        id: panel
        x: 776; y: 293; width: 436; height: 294; clip: true
        Loader {
            id: blurLoader; anchors.fill: parent; active: scene.blurEnabled
            sourceComponent: Component {
                Item {
                    property var effect: null
                    Component.onCompleted: {
                        try {
                            effect = Qt.createQmlObject('import QtQuick 2.4; import QtGraphicalEffects 1.0; Item { anchors.fill: parent; FastBlur { id: glassBlur; anchors.fill: parent; source: backdropSample; radius: 28; cached: true; visible: false } OpacityMask { anchors.fill: parent; source: glassBlur; maskSource: Rectangle { width: panel.width; height: panel.height; radius: 18 } } }', this, 'optional-glass');
                            scene.blurStatus = "Flou chargé · rendu à vérifier"
                        } catch(e) { scene.blurStatus = "Module de flou indisponible"; console.log("atlas_scene_blur_unavailable") }
                    }
                }
            }
        }
        ShaderEffectSource { id: backdropSample; sourceItem: scene.blurEnabled ? backdrop : null; sourceRect: Qt.rect(panel.x, panel.y, panel.width, panel.height); textureSize: Qt.size(218,147); live: false; visible: false }
        Rectangle {
            anchors.fill: parent; radius: 18; border.color: panel.activeFocus ? "#f5f8fb" : "#60ffffff"; border.width: panel.activeFocus ? 3 : 1
            gradient: Gradient { GradientStop { position: 0; color: "#6b71828d" } GradientStop { position: 1; color: "#b3243546" } }
        }
        Text { x: 29; y: 29; width: parent.width-58; text: scene.detailsOpen ? "Le détail, à la demande." : "Une présence légère."; wrapMode: Text.WordWrap; font.family: scene.typeface; font.pixelSize: 28; font.weight: Font.DemiBold; color: "white" }
        Text { x: 29; y: 105; width: parent.width-58; text: scene.detailsOpen ? "OK ouvre ce détail. Retour revient à la carte.\n\nCette scène ne lance aucune vidéo." : "Le paysage reste visible, les informations restent lisibles.\n\nUn verre léger, sans masquer l’image."; wrapMode: Text.WordWrap; font.family: scene.typeface; font.pixelSize: 19; lineHeight: 1.2; color: "#edf1f5" }
        Text { x: 29; y: 246; text: scene.detailsOpen ? "Fermer le détail" : "Afficher le détail"; font.family: scene.typeface; font.pixelSize: 18; font.weight: Font.DemiBold; color: "white" }
        MouseArea { anchors.fill: parent; onClicked: { panel.forceActiveFocus(); scene.activate() } }
    }
    Text { x: 68; y: 632; text: "← →  Choisir     OK  Détail     ↓  Verre     Retour  Fermer"; font.family: scene.typeface; font.pixelSize: 16; color: "#d2dce6" }
    Text { anchors.right: parent.right; anchors.rightMargin: 68; y: 665; text: scene.blurEnabled ? scene.blurStatus : "Verre sans flou · Bas ou G pour comparer"; font.family: scene.typeface; font.pixelSize: 14; color: "#a9b7c4" }
}
