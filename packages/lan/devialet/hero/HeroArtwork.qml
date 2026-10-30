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
    property bool retainPrevious: true
    signal failed(bool poster,url failedSource)
    signal imageReady(bool poster,url loadedSource)
    function stage() {
        var target=String(requestedSource);
        if(String(front.source)===target){if(!target)fallback();else{usingFallback=false;if(front.status===Image.Ready){reveal();imageReady(false,front.source);}}return;}
        back.source=retainPrevious ? lastReady : ''; usingFallback=false;
        fadeAllowed=false; front.opacity=0; front.source=requestedSource;
        if(String(requestedSource)!==target || String(front.source)!==target)return;
        if(!target) { fallback(); return; }
        if(front.status===Image.Ready) reveal();
    }
    function reveal() { if(!String(front.source))return;lastReady=front.source; fadeAllowed=true; front.opacity=1; }
    function fallback() {
        if(String(fallbackSource)) { usingFallback=true;if(String(front.source)!==String(fallbackSource))front.source=fallbackSource;if(front.status===Image.Ready)reveal();else if(front.status===Image.Error){back.source='';lastReady='';front.opacity=0;} }
        else { back.source=''; lastReady=''; front.opacity=0; }
    }
    onRequestedSourceChanged: stage()
    onFallbackSourceChanged: {
        if(usingFallback || front.status===Image.Error || !String(front.source))fallback();
    }
    Component.onCompleted: stage()
    Item { id: images; anchors.fill: parent; visible: !artwork.soften && !artwork.usingFallback; clip: true
     Image { id: back; anchors.fill: parent; fillMode: Image.PreserveAspectCrop; verticalAlignment: Image.AlignTop; asynchronous: true }
     Image {
        id: front; objectName: "heroBanner"; anchors.fill: parent; fillMode: Image.PreserveAspectCrop; verticalAlignment: Image.AlignTop; asynchronous: true; opacity: 0
        onStatusChanged: { if(status===Image.Ready && String(source)){artwork.reveal();artwork.imageReady(artwork.usingFallback,source);}else if(status===Image.Error){var failedUrl=source;artwork.failed(artwork.usingFallback,failedUrl);if(status===Image.Error && String(source)===String(failedUrl))artwork.fallback();} }
        Behavior on opacity { enabled: artwork.fadeAllowed && !artwork.reducedMotion; NumberAnimation { duration: Motion.ms('fade'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
     }
    }
    FastBlur { anchors.fill: parent; source: images; radius: 36; cached: true; visible: artwork.soften || artwork.usingFallback }
}
