import QtQuick 2.15
import QtGraphicalEffects 1.0

FocusScope {
    id: scene
    width: 1280; height: 720; focus: true
    property var homeData: ({})
    property var artworkMap: ({})
    // Host-owned map of trailer id -> playable URL, never episode footage.
    property var trailerSources: ({})
    property string family: "Segoe UI"
    property string mode: "resume"
    property string zone: "actions"
    property int actionIndex: 0
    property int tabIndex: mode === "resume" ? 0 : 1
    property int selectedIndex: 0
    property bool muted: true
    property bool previewEnabled: true
    property bool detailOpen: false
    property string previewState: "image"
    property string notice: ""
    property var resumeItems: row("reprendre")
    property var items: mode === "resume" && resumeItems.length ? resumeItems : (homeData.hero || [])
    property var selected: items.length ? items[Math.min(selectedIndex,items.length-1)] : null
    property string trailerId: selected && selected.bande_annonce ? selected.bande_annonce : ""
    property bool videoReady: !!preview.item && preview.item.ready
    signal dismissed()
    signal playRequested(var media, var target)
    signal detailsRequested(var media)
    signal trailerRequested(string trailerKey)
    signal previewObserved(var observation)
    function row(id) {
        var rows=homeData.rangees || [];
        for(var i=0;i<rows.length;i++) if(rows[i].id===id) return rows[i].cartes || [];
        return [];
    }
    function target(media) {
        if (!media) return null;
        if (media.a_lancer) return media.a_lancer;
        var f=media.franime;
        return f ? {franime_titre:f.titre,saison:f.saison,episode:f.episode,numero:1,vf:f.vf} : null;
    }
    function art(media,kind) {
        if (!media) return "";
        var local=artworkMap[String(media.anilist_id)];
        return local && local[kind] ? local[kind] : kind === "banner" ? (media.banniere || media.affiche || "") : (media.banniere || media.affiche || "");
    }
    function meta(media) {
        if(!media) return "";
        var parts=[];
        if(media.score) parts.push("★ " + (media.score/10).toFixed(1).replace('.',','));
        if(media.franime && media.franime.vf) parts.push("VF");
        if(media.annee) parts.push(media.annee);
        parts.push(media.format === "MOVIE" ? "Film" : "Série");
        if(media.genres) parts.push(media.genres.slice(0,3).join(" · "));
        return parts.join("    ·    ");
    }
    function selectMode(value) {
        mode=value; selectedIndex=0; tabIndex=value === 'resume' ? 0 : 1; detailOpen=false;
    }
    function choose(index) { selectedIndex=Math.max(0,Math.min(items.length-1,index)); }
    function alignRail() {
        if(!rail) return;
        rail.currentIndex=selectedIndex;
        if(selectedIndex===0) rail.positionViewAtBeginning();
        else rail.positionViewAtIndex(selectedIndex,ListView.Contain);
    }
    function restartPreview() {
        if(preview.item) preview.item.stop(); delay.stop(); previewTimeout.stop();
        previewState='image';
        if (previewEnabled && trailerId && !detailOpen) delay.restart();
    }
    function startPreview() {
        if (!trailerId || !previewEnabled || detailOpen) return;
        var url=trailerSources[trailerId];
        if (url && preview.item) { previewState='loading'; previewTimeout.restart(); preview.item.play(url); }
        else { previewState='unavailable'; trailerRequested(trailerId); }
    }
    function observePreview(observation) {
        if(observation.event==='error') { previewState='error'; previewTimeout.stop(); }
        else if(observation.event==='preview' && observation.positionMs>400) { previewState='playing'; previewTimeout.stop(); }
        else if(observation.event==='status' && observation.status===7) { previewState='ended'; previewTimeout.stop(); }
        previewObserved(observation);
    }
    function activate() {
        if(zone==='tabs') selectMode(tabIndex===0 ? 'resume' : 'featured');
        else if(zone==='rail') { zone='actions'; actionIndex=0; }
        else if(zone==='sound') muted=!muted;
        else if(actionIndex===1) { if(preview.item) preview.item.pause(); detailOpen=true; detailsRequested(selected); }
        else if(selected && target(selected)) { if(preview.item) preview.item.stop(); playRequested(selected,target(selected)); }
    }
    onSelectedChanged: { notice=""; restartPreview(); }
    onSelectedIndexChanged: Qt.callLater(alignRail)
    onItemsChanged: Qt.callLater(alignRail)
    onTrailerSourcesChanged: { if(!videoReady) startPreview(); }
    onPreviewEnabledChanged: restartPreview()
    onDetailOpenChanged: { if(!detailOpen) restartPreview(); }
    Component.onCompleted: { if(!resumeItems.length) mode='featured'; forceActiveFocus(); restartPreview(); }
    Keys.onPressed: {
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape) {
            if(detailOpen) { detailOpen=false; restartPreview(); }
            else if(zone==='rail') zone='actions';
            else { if(preview.item) preview.item.stop(); dismissed(); }
        } else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select) {
            if(detailOpen) detailOpen=false; else activate();
        } else if(!detailOpen && event.key===Qt.Key_Down) {
            zone=zone==='tabs' ? 'actions' : 'rail';
        } else if(!detailOpen && event.key===Qt.Key_Up) {
            zone=zone==='rail' ? 'actions' : 'tabs';
        } else if(!detailOpen && (event.key===Qt.Key_Right || event.key===Qt.Key_Left)) {
            var right=event.key===Qt.Key_Right;
            if(zone==='rail') choose(selectedIndex+(right ? 1 : -1));
            else if(zone==='tabs') tabIndex=right ? 1 : 0;
            else if(zone==='sound' && !right) { zone='actions'; actionIndex=1; }
            else if(zone==='actions') {
                if(right && actionIndex===1) zone='sound';
                else actionIndex=right ? 1 : 0;
            }
        } else return;
        event.accepted=true;
    }
    Timer { id: delay; interval: 900; onTriggered: scene.startPreview() }
    Timer { id: previewTimeout; interval: 10000; onTriggered: { if(preview.item) preview.item.stop(); scene.previewState='error'; } }
    Rectangle { anchors.fill: parent; color: "#090a0d" }
    Item {
        id: backdrop; anchors.fill: parent
        Image { id: banner; objectName: "heroBanner"; width: 1280; height: 620; source: scene.art(scene.selected,'banner'); fillMode: Image.PreserveAspectCrop; verticalAlignment: Image.AlignTop; asynchronous: true }
        Loader { id: preview; width: 1280; height: 620; source: scene.previewEnabled ? "Trailer.qml" : ""; visible: scene.videoReady
            onLoaded: { item.silent=Qt.binding(function(){return scene.muted;}); item.observed.connect(scene.observePreview); scene.restartPreview(); }
        }
        Rectangle { width: 1280; height: 620; gradient: Gradient { orientation: Gradient.Horizontal
            GradientStop { position: 0; color: "#eb090a0d" }
            GradientStop { position: 0.32; color: "#ab090a0d" }
            GradientStop { position: 0.72; color: "#00090a0d" }
        } }
        Rectangle { width: 1280; height: 620; gradient: Gradient {
            GradientStop { position: 0; color: "#40090a0d" }
            GradientStop { position: 0.55; color: "#00090a0d" }
            GradientStop { position: 0.82; color: "#a0090a0d" }
            GradientStop { position: 1; color: "#ff090a0d" }
        } }
    }
    Row {
        x: 64; y: 40; spacing: 12
        HeroButton { width: 162; label: "À reprendre"; family: scene.family; backdrop: backdrop; sampleRect: Qt.rect(64,40,width,height); selected: scene.mode==='resume'; focused: scene.zone==='tabs' && scene.tabIndex===0; onActivated: { scene.zone='tabs'; scene.selectMode('resume'); } }
        HeroButton { width: 126; label: "À la une"; family: scene.family; backdrop: backdrop; sampleRect: Qt.rect(238,40,width,height); selected: scene.mode==='featured'; focused: scene.zone==='tabs' && scene.tabIndex===1; onActivated: { scene.zone='tabs'; scene.selectMode('featured'); } }
    }
    Column {
        x: 64; width: 630; anchors.bottom: parent.top; anchors.bottomMargin: -458; spacing: 18
        Text { objectName: "heroTitle"; width: 630; text: scene.selected ? scene.selected.titre : "Aucun animé disponible";
            color: "#fafafb"; font.family: scene.family; font.pixelSize: 52; font.weight: Font.Bold; font.letterSpacing: -1.6;
            wrapMode: Text.WordWrap; maximumLineCount: 2; elide: Text.ElideRight; textFormat: Text.PlainText; lineHeight: 54; lineHeightMode: Text.FixedHeight }
        Text { width: 650; text: scene.meta(scene.selected); color: "#d2d2d7"; font.family: scene.family; font.pixelSize: 17; elide: Text.ElideRight }
        Text { width: 600; text: scene.selected ? scene.selected.resume || "" : ""; textFormat: Text.PlainText; color: "#d0d0d6";
            font.family: scene.family; font.pixelSize: 19; lineHeight: 1.32; wrapMode: Text.WordWrap; maximumLineCount: 3; elide: Text.ElideRight }
        Item { width: 630; height: 64
            Row { anchors.bottom: parent.bottom; spacing: 14
                HeroButton { width: scene.selected && scene.selected.a_lancer ? 244 : 174; label: scene.selected && scene.selected.a_lancer ? "▶   Reprendre · Ép. " + scene.selected.a_lancer.numero : "▶   Lecture"; family: scene.family; primary: true; focused: scene.zone==='actions' && scene.actionIndex===0; onActivated: { scene.zone='actions'; scene.actionIndex=0; scene.activate(); } }
                HeroButton { width: 180; label: "ⓘ   Plus d’infos"; family: scene.family; backdrop: backdrop; sampleRect: Qt.rect(scene.selected && scene.selected.a_lancer ? 322 : 252,406,width,height); focused: scene.zone==='actions' && scene.actionIndex===1; onActivated: { scene.zone='actions'; scene.actionIndex=1; scene.activate(); } }
            }
        }
    }
    HeroButton { x: 1164; y: 406; width: 52; label: scene.muted ? "♪ ×" : "♪"; family: scene.family; backdrop: backdrop; sampleRect: Qt.rect(x,y,width,height); focused: scene.zone==='sound'; onActivated: { scene.zone='sound'; scene.muted=!scene.muted; } }
    Text { x: 870; y: 472; width: 346; horizontalAlignment: Text.AlignRight; color: '#b9bac3'; font.family: scene.family; font.pixelSize: 16
        visible: scene.previewEnabled && !scene.detailOpen
        text: scene.previewState==='loading' ? 'Chargement de la bande-annonce…' : scene.previewState==='unavailable' || scene.previewState==='error' ? 'Bande-annonce indisponible' : ''
    }
    Text { x: 64; y: 505; text: scene.mode==='resume' ? 'À reprendre' : 'À la une'; color: "#f5f5f7"; font.family: scene.family; font.pixelSize: 24; font.weight: Font.DemiBold }
    ListView {
        id: rail; objectName: "heroRail"; x: 56; y: 545; width: 1224; height: 175; orientation: ListView.Horizontal; spacing: 18; clip: true
        model: scene.items; currentIndex: scene.selectedIndex; highlightRangeMode: ListView.NoHighlightRange
        keyNavigationEnabled: false; boundsBehavior: Flickable.StopAtBounds
        delegate: Item {
            width: 222; height: 164
            Rectangle { x: 0; y: 0; width: 222; height: 127; radius: 12; color: "transparent"; border.width: scene.selectedIndex===index ? 2 : 0; border.color: scene.zone==='rail' ? 'white' : '#70ffffff' }
            Image { objectName: "heroArtwork"; x: 5; y: 5; width: 212; height: 117; source: scene.art(modelData,'card'); fillMode: Image.PreserveAspectCrop; asynchronous: true }
            Rectangle { x: 5; y: 119; width: 212; height: 3; color: '#35ffffff'; visible: !!modelData.moi && !!modelData.episodes
                Rectangle { width: parent.width*Math.min(1,modelData.moi ? modelData.moi.progression/Math.max(1,modelData.episodes) : 0); height: 3; color: '#f0f0f4' } }
            Text { x: 5; y: 135; width: 212; text: modelData.titre; textFormat: Text.PlainText; wrapMode: Text.WordWrap; maximumLineCount: 2; elide: Text.ElideRight; color: scene.selectedIndex===index ? 'white' : '#a8a8b1'; font.family: scene.family; font.pixelSize: 16; lineHeight: 20; lineHeightMode: Text.FixedHeight; font.weight: Font.Medium }
            MouseArea { anchors.fill: parent; onClicked: { scene.zone='rail'; scene.choose(index); } }
        }
    }
    Rectangle {
        anchors.fill: parent; color: '#ed090a0d'; visible: scene.detailOpen
        Column { x: 96; y: 140; width: 920; spacing: 28
            Text { width: 920; text: scene.selected ? scene.selected.titre : ''; textFormat: Text.PlainText; wrapMode: Text.WordWrap; color: 'white'; font.family: scene.family; font.pixelSize: 44; font.weight: Font.Bold }
            Text { width: 900; text: scene.selected ? scene.selected.resume || '' : ''; textFormat: Text.PlainText; wrapMode: Text.WordWrap; color: '#d4d4dc'; font.family: scene.family; font.pixelSize: 24; lineHeight: 1.4 }
            Text { text: 'Retour pour revenir au héros'; color: '#a9a9b4'; font.family: scene.family; font.pixelSize: 19 }
        }
    }
    Rectangle { anchors.horizontalCenter: parent.horizontalCenter; y: 465; width: noticeText.width+32; height: 38; radius: 8; color: '#dd13151a'; visible: !!scene.notice
        Text { id: noticeText; anchors.centerIn: parent; text: scene.notice; color: 'white'; font.family: scene.family; font.pixelSize: 16 }
    }
}
