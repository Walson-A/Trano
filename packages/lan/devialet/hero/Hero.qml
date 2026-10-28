import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion

FocusScope {
    id: scene
    width: 1280; height: 720; focus: true
    property var homeData: ({})
    property var artworkMap: ({})
    // Host-owned map of trailer id -> playable URL, never episode footage.
    property var trailerSources: ({})
    property string family: "Segoe UI"
    property string mode: currentRow && currentRow.id==='reprendre' ? 'resume' : currentRow && currentRow.id==='featured' ? 'featured' : currentRow ? currentRow.id : ''
    property string zone: "actions"
    property int actionIndex: 0
    property int navIndex: 0
    property string avatar: ''
    property var contextRow: null
    property int selectedRow: 0
    property string selectedRowId: ""
    property var rowPositions: ({})
    property int selectedIndex: 0
    property bool muted: false
    property bool previewEnabled: true
    property bool keepPreviewLoaded: false
    property bool reducedMotion: false
    property var displayedMedia: null
    property bool contentVisible: true
    property bool detailOpen: false
    property string previewState: "image"
    property string notice: ""
    property var resumeItems: row("reprendre")
    property var rows: buildRows()
    property var currentRow: rows.length ? rows[Math.min(selectedRow,rows.length-1)] : null
    property var items: currentRow ? currentRow.cartes : []
    property var selected: items.length ? items[Math.min(selectedIndex,items.length-1)] : null
    property string trailerId: selected && selected.bande_annonce ? selected.bande_annonce : ""
    property string playingTrailerKey: ""
    property bool videoReady: !!preview.item && preview.item.ready && playingTrailerKey===trailerId && !!displayedMedia && displayedMedia.bande_annonce===trailerId
    signal dismissed()
    signal playRequested(var media, var target)
    signal detailsRequested(var media)
    signal trailerRequested(string trailerKey)
    signal previewObserved(var observation)
    signal artworkFailed(var media,string kind)
    signal searchRequested()
    signal profileRequested()
    signal contextBackRequested()
    function row(id) {
        var rows=homeData.rangees || [];
        for(var i=0;i<rows.length;i++) if(rows[i].id===id) return rows[i].cartes || [];
        return [];
    }
    function buildRows() {
        var result=[],resume=row('reprendre'),featured=homeData.hero || [],provided=homeData.rangees || [];
        if(contextRow && contextRow.cartes && contextRow.cartes.length) result.push(contextRow);
        if(resume.length) result.push({id:'reprendre',titre:'À reprendre',cartes:resume});
        if(featured.length) result.push({id:'featured',titre:'À la une',cartes:featured});
        for(var i=0;i<provided.length;i++) if(provided[i].id!=='reprendre' && provided[i].cartes && provided[i].cartes.length) result.push(provided[i]);
        return result;
    }
    function target(media) {
        if (!media) return null;
        if (media.a_lancer) return media.a_lancer;
        var f=media.franime;
        return f ? {franime_titre:f.titre,saison:f.saison,episode:f.episode,numero:1,vf:f.vf} : media.anilist_id>0 ? {numero:1,vf:false} : null;
    }
    function art(media,kind) {
        if (!media) return "";
        var local=artworkMap[String(media.anilist_id)];
        if(kind==='poster') return local && (local.poster || local.card) ? local.poster || local.card : (media.affiche || '');
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
        var id=value==='resume' ? 'reprendre' : value==='featured' ? 'featured' : value;
        for(var i=0;i<rows.length;i++) if(rows[i].id===id) { selectRow(i); choose(0); return; }
        selectRow(0); choose(0);
    }
    function selectRow(index) {
        if(!rows || !rows.length) { selectedRow=0; selectedRowId=''; selectedIndex=0; return; }
        selectedRow=Math.max(0,Math.min(rows.length-1,index));
        var targetRow=rows[selectedRow],cards=targetRow.cartes || [];
        selectedRowId=targetRow.id;
        selectedIndex=Math.max(0,Math.min(cards.length-1,rowPositions[selectedRowId] || 0));
        detailOpen=false;
        Qt.callLater(alignRail);
    }
    function remember() {
        if(!currentRow) return;
        var next=JSON.parse(JSON.stringify(rowPositions));next[currentRow.id]=selectedIndex;rowPositions=next;
    }
    function choose(index) { selectedIndex=Math.max(0,Math.min(items.length-1,index)); }
    function alignRail() {
        if(!rowList) return;
        rowList.currentIndex=selectedRow;
        rowList.contentY=Math.max(0,Math.min(selectedRow*252,Math.max(0,rowList.contentHeight-rowList.height)));
        var item=rowList.itemAtIndex(selectedRow);if(item) item.align(selectedIndex);
    }
    function queueHero() {
        if(!displayedMedia || reducedMotion) { displayedMedia=selected; contentVisible=true; return; }
        if(selected && displayedMedia && selected.anilist_id===displayedMedia.anilist_id) { heroSwap.stop(); contentVisible=true; return; }
        contentVisible=false; heroSwap.restart();
    }
    function restartPreview() {
        playingTrailerKey='';
        if(preview.item) preview.item.stop(); delay.stop(); previewTimeout.stop();
        previewState='image';
        if (previewEnabled && trailerId && !detailOpen) delay.restart();
    }
    function startPreview() {
        if (!trailerId || !previewEnabled || detailOpen) return;
        var url=trailerSources[trailerId];
        if (url && preview.item) { playingTrailerKey=trailerId; previewState='loading'; previewTimeout.restart(); preview.item.play(url); }
        else { previewState='unavailable'; trailerRequested(trailerId); }
    }
    function observePreview(observation) {
        if(observation.event==='error') { previewState='error'; previewTimeout.stop(); }
        else if(observation.event==='preview' && observation.positionMs>400) { previewState='playing'; previewTimeout.stop(); }
        else if(observation.event==='status' && observation.status===7) { previewState='ended'; previewTimeout.stop(); }
        observation.id=playingTrailerKey;
        previewObserved(observation);
    }
    function activate() {
        if(zone==='nav') { if(navIndex===0) searchRequested();else if(navIndex===1) profileRequested();else zone='actions'; }
        else if(zone==='rail') { zone='actions'; }
        else if(zone==='sound') muted=!muted;
        else if(actionIndex===1) { if(preview.item) preview.item.pause(); detailOpen=true; detailsRequested(selected); }
        else if(selected && target(selected)) { if(preview.item) preview.item.stop(); playRequested(selected,target(selected)); }
    }
    onSelectedChanged: { notice=""; queueHero(); restartPreview(); }
    onSelectedIndexChanged: { remember(); Qt.callLater(alignRail); }
    onItemsChanged: Qt.callLater(alignRail)
    onRowsChanged: {
        var index=0;
        for(var i=0;i<rows.length;i++) if(rows[i].id===selectedRowId) { index=i; break; }
        selectRow(index);
    }
    onTrailerSourcesChanged: { if(!videoReady) startPreview(); }
    onPreviewEnabledChanged: restartPreview()
    onMutedChanged:console.info('ATLAS_TV_SOUND_STATE',muted,zone)
    onReducedMotionChanged: { heroSwap.stop(); displayedMedia=selected; contentVisible=true; alignRail(); }
    onDetailOpenChanged: { if(!detailOpen) restartPreview(); }
    Component.onCompleted: { selectRow(0); forceActiveFocus(); restartPreview(); }
    Keys.onPressed: {
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape) {
            if(detailOpen) { detailOpen=false; restartPreview(); }
            else if(zone==='rail') zone='actions';
            else if(currentRow && currentRow.id==='context_selection') contextBackRequested();
            else { if(preview.item) preview.item.stop(); dismissed(); }
        } else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select) {
            if(detailOpen) detailOpen=false; else activate();
        } else if(!detailOpen && event.key===Qt.Key_Down) {
            if(zone==='nav') zone='actions';else if(zone==='rail') selectRow(selectedRow+1); else zone='rail';
        } else if(!detailOpen && event.key===Qt.Key_Up) {
            if(zone==='rail' && selectedRow>0) selectRow(selectedRow-1);else if(zone==='rail')zone='actions';else if(zone==='actions' || zone==='sound')zone='nav';
        } else if(!detailOpen && (event.key===Qt.Key_Right || event.key===Qt.Key_Left)) {
            var right=event.key===Qt.Key_Right;
            if(zone==='rail') choose(selectedIndex+(right ? 1 : -1));
            else if(zone==='nav'){var order=[2,0,1];navIndex=order[Math.max(0,Math.min(2,order.indexOf(navIndex)+(right ? 1 : -1)))];}
            else if(zone==='sound' && !right) { zone='actions'; actionIndex=1; }
            else if(zone==='actions') {
                if(right && actionIndex===1) zone='sound';
                else actionIndex=right ? 1 : 0;
            }
        } else return;
        event.accepted=true;
    }
    Timer { id: delay; interval: 900; onTriggered: scene.startPreview() }
    Timer { id: heroSwap; interval: Motion.ms('settle'); onTriggered: { scene.displayedMedia=scene.selected; scene.contentVisible=true; } }
    Timer { id: previewTimeout; interval: 10000; onTriggered: { if(preview.item) preview.item.stop(); scene.previewState='error'; } }
    Rectangle { anchors.fill: parent; color: "#090a0d" }
    Item {
        id: backdrop; anchors.fill: parent
        HeroArtwork { width: 1280; height: 620; requestedSource: scene.art(scene.displayedMedia,'banner'); fallbackSource:scene.art(scene.displayedMedia,'poster'); reducedMotion: scene.reducedMotion; soften: !!scene.displayedMedia && !scene.displayedMedia.banniere
            onFailed:scene.artworkFailed(scene.displayedMedia,poster ? 'poster' : 'banner')
        }
        Loader { id: preview; width: 1280; height: 620; source: scene.previewEnabled || scene.keepPreviewLoaded ? "Trailer.qml" : ""; opacity: scene.videoReady ? 1 : 0
            Behavior on opacity { enabled: !scene.reducedMotion; NumberAnimation { duration: Motion.ms('fade'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
            onLoaded: { item.silent=Qt.binding(function(){return scene.muted;}); item.observed.connect(scene.observePreview); scene.restartPreview(); }
        }
        Rectangle { width: 1280; height: 620; gradient: Gradient { orientation: Gradient.Horizontal
            GradientStop { position: 0; color: "#eb090a0d" }
            GradientStop { position: 0.46; color: "#c7090a0d" }
            GradientStop { position: 0.86; color: "#00090a0d" }
        } }
        Rectangle { width: 1280; height: 620; gradient: Gradient {
            GradientStop { position: 0; color: "#40090a0d" }
            GradientStop { position: 0.55; color: "#00090a0d" }
            GradientStop { position: 0.82; color: "#a0090a0d" }
            GradientStop { position: 1; color: "#ff090a0d" }
        } }
    }
    Column {
        x: 64; width: 630; anchors.bottom: parent.top; anchors.bottomMargin: -350; spacing: 16
        opacity: scene.contentVisible ? 1 : 0
        Behavior on opacity { enabled: !scene.reducedMotion; NumberAnimation { duration: scene.contentVisible ? Motion.ms('focus') : Motion.ms('settle'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
        Text { objectName: "heroTitle"; width: 630; text: scene.displayedMedia ? scene.displayedMedia.titre : "Aucun animé disponible";
            color: "#fafafb"; font.family: scene.family; font.pixelSize: 50; font.weight: Font.Bold; font.letterSpacing: -1.6;
            wrapMode: Text.WordWrap; maximumLineCount: 2; elide: Text.ElideRight; textFormat: Text.PlainText; lineHeight: 52; lineHeightMode: Text.FixedHeight }
        Text { width: 650; text: scene.meta(scene.displayedMedia); color: "#d2d2d7"; font.family: scene.family; font.pixelSize: 17; elide: Text.ElideRight }
        Text { width: 600; text: scene.displayedMedia ? scene.displayedMedia.resume || "" : ""; textFormat: Text.PlainText; color: "#d0d0d6";
            font.family: scene.family; font.pixelSize: 19; lineHeight: 27; lineHeightMode: Text.FixedHeight; wrapMode: Text.WordWrap; maximumLineCount: 2; elide: Text.ElideRight }
        Item { width: 630; height: 64
            Row { anchors.bottom: parent.bottom; spacing: 14
                HeroButton { objectName:'heroPlay'; width: scene.selected && scene.selected.a_lancer ? 244 : 174; iconKey: 'play'; reducedMotion: scene.reducedMotion; label: scene.selected && scene.selected.a_lancer ? "Reprendre · Ép. " + scene.selected.a_lancer.numero : "Lecture"; family: scene.family; primary: true; groupHasFocus:true; selected:scene.zone==='rail' && scene.actionIndex===0; focused: scene.zone==='actions' && scene.actionIndex===0; onActivated: { scene.zone='actions'; scene.actionIndex=0; scene.activate(); } }
                HeroButton { objectName:'heroInfo'; width: 180; iconKey: 'info'; reducedMotion: scene.reducedMotion; label: "Plus d’infos"; family: scene.family; selected:scene.zone==='rail' && scene.actionIndex===1; backdrop: backdrop; sampleRect: Qt.rect(scene.selected && scene.selected.a_lancer ? 322 : 252,298,width,height); focused: scene.zone==='actions' && scene.actionIndex===1; onActivated: { scene.zone='actions'; scene.actionIndex=1; scene.activate(); } }
            }
        }
    }
    TvNavigation {id:navigation;family:scene.family;page:'home';focused:scene.zone==='nav';selectedIndex:scene.navIndex;avatar:scene.avatar;pseudo:scene.homeData.compte ? scene.homeData.compte.pseudo || 'Profil' : 'Profil';reducedMotion:scene.reducedMotion
        onDestinationRequested:{if(destination==='home'){scene.zone='actions';scene.navIndex=2;scene.forceActiveFocus();}else if(destination==='search'){scene.zone='nav';scene.navIndex=0;scene.searchRequested();}else {scene.zone='nav';scene.navIndex=1;scene.profileRequested();}}
    }
    HeroButton { objectName:'heroSound'; x: 1036; y: 298; width: 180; iconKey: scene.muted ? 'volume-x' : 'volume-2'; label:scene.muted ? 'Son coupé' : 'Son activé'; reducedMotion: scene.reducedMotion; family: scene.family; backdrop: backdrop; sampleRect: Qt.rect(x,y,width,height); focused: scene.zone==='sound'; onActivated: { scene.zone='sound'; scene.muted=!scene.muted; } }
    Text { x: 870; y: 355; width: 346; horizontalAlignment: Text.AlignRight; color: '#b9bac3'; font.family: scene.family; font.pixelSize: 16
        visible: scene.previewEnabled && !scene.detailOpen
        text: scene.previewState==='loading' ? 'Chargement de la bande-annonce…' : scene.previewState==='unavailable' || scene.previewState==='error' ? 'Bande-annonce indisponible' : ''
    }
    ListView {
        id:rowList; objectName:'heroRows'; x:0; y:380; width:1280; height:340; clip:true
        model:scene.rows; currentIndex:scene.selectedRow; keyNavigationEnabled:false; interactive:false
        boundsBehavior:Flickable.StopAtBounds; highlightRangeMode:ListView.NoHighlightRange; cacheBuffer:0
        Behavior on contentY { enabled:!scene.reducedMotion; NumberAnimation { duration:Motion.ms('scroll'); easing.type:Easing.Bezier; easing.bezierCurve:Motion.easeOut() } }
        delegate:MediaRow { host:scene; rowData:modelData; rowIndex:index }
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
