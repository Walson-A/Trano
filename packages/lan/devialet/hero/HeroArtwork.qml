import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion
Item {
    id: artwork
    clip: true
    property url requestedSource: ""
    property url fallbackSource: ""
    property bool usingFallback: false
    property bool reducedMotion: false
    property bool soften: false
    property url lastReady: ""
    property bool fadeAllowed: false
    function stage() {
        if(front.source===requestedSource) return;
        back.source=lastReady; usingFallback=false;
        fadeAllowed=false; front.opacity=0; front.source=requestedSource;
        if(!requestedSource) { fallback(); return; }
        if(front.status===Image.Ready) reveal();
    }
    function reveal() { lastReady=front.source; fadeAllowed=true; front.opacity=1; }
    function fallback() {
        if(fallbackSource && front.source!==fallbackSource) { usingFallback=true; front.source=fallbackSource; }
        else { back.source=''; lastReady=''; front.opacity=0; }
    }
    onRequestedSourceChanged: stage()
    Component.onCompleted: stage()
    Item { id: images; anchors.fill: parent; visible: !artwork.soften && !artwork.usingFallback; clip: true
     Image { id: back; anchors.fill: parent; fillMode: Image.PreserveAspectCrop; verticalAlignment: Image.AlignTop; asynchronous: true }
     Image {
        id: front; objectName: "heroBanner"; anchors.fill: parent; fillMode: Image.PreserveAspectCrop; verticalAlignment: Image.AlignTop; asynchronous: true; opacity: 0
        onStatusChanged: { if(status===Image.Ready) artwork.reveal(); else if(status===Image.Error) artwork.fallback(); }
        Behavior on opacity { enabled: artwork.fadeAllowed && !artwork.reducedMotion; NumberAnimation { duration: Motion.ms('fade'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
     }
    }
    FastBlur { anchors.fill: parent; source: images; radius: 36; cached: true; visible: artwork.soften || artwork.usingFallback }
}
