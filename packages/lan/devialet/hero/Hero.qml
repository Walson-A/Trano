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
    readonly property bool browsingRows: zone==='rail'
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
    property bool libraryEnabled:false
    property bool keepPreviewLoaded: false
    property bool previewExternal:false
    property bool previewExternalFullscreen:false
    property real previewExternalHeight:308
    readonly property var previewPlayer:preview.item
    property bool reducedMotion: false
    property var displayedMedia: null
    property bool contentVisible: true
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
    signal interaction()
    signal dismissed()
    signal playRequested(var media, var target)
    signal detailsRequested(var media)
    signal trailerRequested(string trailerKey)
    signal previewObserved(var observation)
    signal artworkFailed(var media,string kind,url failedSource)
    signal artworkReady(var media,string kind,url loadedSource)
    signal searchRequested()
    signal profileRequested()
    signal libraryRequested()
    signal contextBackRequested()
    signal soundChosen(bool muted)
    signal posterWanted(var media)
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
        // Availability and a backend resume hint are not a language preference.
        if (media.a_lancer) { var next=JSON.parse(JSON.stringify(media.a_lancer)); next.vf=false; return next; }
        // Sans `a_lancer` (Franime n'a pas l'épisode), la suite de sa liste se lance par
        // `anilist_id` et le numéro : jamais l'épisode 1 d'une série commencée.
        var p=media.moi && media.moi.statut!=='COMPLETED' && media.moi.progression>0 ? media.moi.progression : 0;
        if(p && media.anilist_id>0 && !(media.episodes>0 && p>=media.episodes)) return {numero:p+1,vf:false};
        var f=media.franime;
        return f ? {franime_titre:f.titre,saison:f.saison,episode:f.episode,numero:1,vf:false} : media.anilist_id>0 ? {numero:1,vf:false} : null;
    }
    function resumeNumber(media){var t=target(media);return media && media.a_lancer ? media.a_lancer.numero : t && t.numero>1 ? t.numero : 0;}
    function art(media,kind) {
        if (!media) return "";
        var local=artworkMap[String(media.anilist_id)];
        if(kind==='poster') return local && (local.poster || local.card) ? local.poster || local.card : (media.affiche || '');
        return local && local[kind] ? local[kind] : kind === "banner" ? (media.banniere || media.affiche || "") : (media.banniere || media.affiche || "");
    }
    // `serie {saisons, episodes}` de catalog/home : la série entière, avant d'ouvrir la fiche.
    function seriesLabel(media){
        var s=media && media.serie;if(!s)return '';
        var seasons=Number.isInteger(s.saisons) && s.saisons>1 ? s.saisons+' saisons' : '',episodes=Number.isInteger(s.episodes) && s.episodes>0 ? s.episodes+' ép.' : '';
        return seasons && episodes ? seasons+' · '+episodes : seasons || episodes;
    }
    function meta(media) {
        if(!media) return "";
        var parts=[];
        if(media.score) parts.push("★ " + (media.score/10).toFixed(1).replace('.',','));
        if(media.franime && media.franime.vf) parts.push("VF disponible");
        if(media.annee) parts.push(media.annee);
        var series=media.format === "MOVIE" ? '' : seriesLabel(media);
        parts.push(media.format === "MOVIE" ? "Film" : series || "Série");
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
        if(selected && displayedMedia && selected.anilist_id===displayedMedia.anilist_id) { heroSwap.stop(); displayedMedia=selected; contentVisible=true; return; }
        contentVisible=false; heroSwap.restart();
    }
    function restartPreview() {
        if(previewExternal){delay.stop();previewTimeout.stop();return;}
        playingTrailerKey='';
        if(preview.item) preview.item.stop(); delay.stop(); previewTimeout.stop();
        previewState='image';
        if (previewEnabled && trailerId) delay.restart();
    }
    function startPreview() {
        if(previewExternal)return;
        if (!trailerId || !previewEnabled) return;
        var url=trailerSources[trailerId];
        if (url && preview.item) { playingTrailerKey=trailerId; previewState='loading'; previewTimeout.restart(); preview.item.play(url); }
        else { previewState='unavailable'; trailerRequested(trailerId); }
    }
    function observePreview(observation) {
        if(previewExternal){previewObserved(observation);return;}
        if(observation.event==='error') { previewState='error'; previewTimeout.stop(); }
        else if(observation.event==='preview' && observation.positionMs>400) { previewState='playing'; previewTimeout.stop(); }
        else if(observation.event==='status' && observation.status===7) { previewState='ended'; previewTimeout.stop(); }
        observation.id=playingTrailerKey;
        previewObserved(observation);
    }
    function activate() {
        if(zone==='nav') { if(navIndex===0) searchRequested();else if(navIndex===1) profileRequested();else if(navIndex===3 && libraryEnabled)libraryRequested();else zone='actions'; }
        else if(zone==='rail') { zone='actions'; }
        else if(zone==='sound') { muted=!muted; soundChosen(muted); }
        else if(actionIndex===1) { if(preview.item) preview.item.pause(); detailsRequested(selected); }
        else if(selected && target(selected)) { if(preview.item) preview.item.stop(); playRequested(selected,target(selected)); }
    }
    onSelectedChanged: { notice=""; queueHero(); restartPreview(); }
    onSelectedIndexChanged: { remember(); Qt.callLater(alignRail); }
    onItemsChanged: Qt.callLater(alignRail)
    onBrowsingRowsChanged: Qt.callLater(alignRail)
    onRowsChanged: {
        var index=0;
        for(var i=0;i<rows.length;i++) if(rows[i].id===selectedRowId) { index=i; break; }
        selectRow(index);
    }
    onTrailerSourcesChanged: { if(!videoReady) startPreview(); }
    onPreviewEnabledChanged: restartPreview()
    onPreviewExternalChanged:{if(previewExternal){delay.stop();previewTimeout.stop();}else if(previewEnabled)restartPreview();}
    onMutedChanged:console.info('ATLAS_TV_SOUND_STATE',muted,zone)
    onReducedMotionChanged: { heroSwap.stop(); displayedMedia=selected; contentVisible=true; alignRail(); }
    Component.onCompleted: { selectRow(0); forceActiveFocus(); restartPreview(); }
    Keys.onPressed: {
        interaction();
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape) {
            if(zone==='rail') zone='actions';
            else if(currentRow && currentRow.id==='context_selection') contextBackRequested();
            else { if(preview.item) preview.item.stop(); dismissed(); }
        } else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select) {
            activate();
        } else if(event.key===Qt.Key_Down) {
            if(zone==='nav') zone='actions';else if(zone==='rail') selectRow(selectedRow+1); else zone='rail';
        } else if(event.key===Qt.Key_Up) {
            if(zone==='rail' && selectedRow>0) selectRow(selectedRow-1);else if(zone==='rail')zone='actions';else if(zone==='actions' || zone==='sound')zone='nav';
        } else if(event.key===Qt.Key_Right || event.key===Qt.Key_Left) {
            var right=event.key===Qt.Key_Right;
            if(zone==='rail') choose(selectedIndex+(right ? 1 : -1));
            else if(zone==='nav')navIndex=navigation.step(navIndex,right ? 1 : -1);
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
    Component {id:trailerComponent;Trailer {}}
    Rectangle { anchors.fill: parent; color: "#090a0d" }
    Item {
        id: backdrop; anchors.fill: parent
        HeroArtwork { width: 1280; height: 620; visible:!scene.previewExternal;requestedSource: scene.art(scene.displayedMedia,'banner'); fallbackSource:scene.art(scene.displayedMedia,'poster'); reducedMotion: scene.reducedMotion; soften: !!scene.displayedMedia && !scene.displayedMedia.banniere
            onFailed:scene.artworkFailed(scene.displayedMedia,poster ? 'poster' : 'banner',failedSource)
            onImageReady:scene.artworkReady(scene.displayedMedia,poster ? 'poster' : 'banner',loadedSource)
        }
        Loader { id: preview; width: 1280; height:scene.previewExternal ? (scene.previewExternalFullscreen ? 720 : scene.previewExternalHeight) : 620; active:scene.previewEnabled || scene.keepPreviewLoaded;source:"Trailer.qml"; opacity:(scene.previewExternal ? !!preview.item && preview.item.ready : scene.videoReady) ? 1 : 0
            Behavior on opacity { enabled: !scene.reducedMotion; NumberAnimation { duration: Motion.ms('fade'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
            onLoaded: { item.silent=Qt.binding(function(){return scene.muted;});item.fitFrame=Qt.binding(function(){return scene.previewExternalFullscreen;});item.headerCrop=Qt.binding(function(){return scene.previewExternal && !scene.previewExternalFullscreen;});item.gain=Qt.binding(function(){return scene.previewExternalFullscreen ? 1 : .35;}); item.observed.connect(scene.observePreview); scene.restartPreview(); }
        }
        Rectangle { width: 1280; height: 620; visible:!scene.previewExternal;gradient: Gradient { orientation: Gradient.Horizontal
            GradientStop { position: 0; color: "#eb090a0d" }
            GradientStop { position: 0.46; color: "#c7090a0d" }
            GradientStop { position: 0.86; color: "#00090a0d" }
        } }
        Rectangle { width: 1280; height: 620; visible:!scene.previewExternal;gradient: Gradient {
            GradientStop { position: 0; color: "#40090a0d" }
            GradientStop { position: 0.55; color: "#00090a0d" }
            GradientStop { position: 0.82; color: "#a0090a0d" }
            GradientStop { position: 1; color: "#ff090a0d" }
        } }
        Rectangle { anchors.fill:parent;visible:!scene.previewExternal;opacity:scene.browsingRows ? 1 : 0
            gradient:Gradient {
                GradientStop {position:0;color:'#00090a0d'}
                GradientStop {position:.25;color:'#20090a0d'}
                GradientStop {position:.46;color:'#d9090a0d'}
                GradientStop {position:.72;color:'#f5090a0d'}
                GradientStop {position:1;color:'#ff090a0d'}
            }
            Behavior on opacity {enabled:!scene.reducedMotion;NumberAnimation {duration:Motion.ms('scroll');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        }
    }
    Column {
        objectName:'heroCopy';visible:!scene.previewExternal
        x: 64; width: 630; anchors.bottom: parent.top; anchors.bottomMargin: -350; spacing: 12
        transform: Translate { y:scene.browsingRows ? -152 : 0
            Behavior on y {enabled:!scene.reducedMotion;NumberAnimation {duration:Motion.ms('scroll');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        }
        opacity: scene.contentVisible ? 1 : 0
        Behavior on opacity { enabled: !scene.reducedMotion; NumberAnimation { duration: scene.contentVisible ? Motion.ms('focus') : Motion.ms('settle'); easing.type: Easing.Bezier; easing.bezierCurve: Motion.easeOut() } }
        Text { id:heroTitle; objectName: "heroTitle"; width: 630; text: scene.displayedMedia ? scene.displayedMedia.titre : "Aucun animé disponible";
            color: "#fafafb"; font.family: scene.family; font.pixelSize: 48; font.weight: Font.Bold; font.letterSpacing: -1.3;
            wrapMode: Text.Wrap; maximumLineCount: scene.browsingRows ? 1 : 2; elide: Text.ElideRight; textFormat: Text.PlainText; lineHeight: 50; lineHeightMode: Text.FixedHeight }
        Text { width: 650; text: scene.meta(scene.displayedMedia); color: "#d2d2d7"; font.family: scene.family; font.pixelSize: 17; elide: Text.ElideRight }
        Text { width: 600; visible:!scene.browsingRows; text: scene.displayedMedia ? scene.displayedMedia.resume || "" : ""; textFormat: Text.PlainText; color: "#d0d0d6";
            font.family: scene.family; font.pixelSize: 19; lineHeight: 24; lineHeightMode: Text.FixedHeight; wrapMode: Text.WordWrap; maximumLineCount: heroTitle.lineCount>1 ? 1 : 2; elide: Text.ElideRight }
        Item { width: 630; height: 52; visible:!scene.browsingRows
            Row { anchors.bottom: parent.bottom; spacing: 14
                HeroButton { objectName:'heroPlay'; width: scene.resumeNumber(scene.selected) ? 244 : 174; iconKey: 'play'; reducedMotion: scene.reducedMotion; label: scene.resumeNumber(scene.selected) ? "Reprendre · Ép. " + scene.resumeNumber(scene.selected) : "Lecture"; family: scene.family; primary: true; groupHasFocus:true; selected:scene.zone==='rail' && scene.actionIndex===0; focused: scene.zone==='actions' && scene.actionIndex===0; onActivated: { scene.zone='actions'; scene.actionIndex=0; scene.activate(); } }
                HeroButton { objectName:'heroInfo'; width: 180; iconKey: 'info'; reducedMotion: scene.reducedMotion; label: "Plus d’infos"; family: scene.family; selected:scene.zone==='rail' && scene.actionIndex===1; backdrop: backdrop; sampleRect: Qt.rect(scene.resumeNumber(scene.selected) ? 322 : 252,298,width,height); focused: scene.zone==='actions' && scene.actionIndex===1; onActivated: { scene.zone='actions'; scene.actionIndex=1; scene.activate(); } }
            }
        }
    }
    TvNavigation {id:navigation;visible:!scene.previewExternal;family:scene.family;page:'home';libraryEnabled:scene.libraryEnabled;focused:scene.zone==='nav';selectedIndex:scene.navIndex;avatar:scene.avatar;pseudo:scene.homeData.compte ? scene.homeData.compte.pseudo || 'Profil' : 'Profil';reducedMotion:scene.reducedMotion
        onDestinationRequested:{if(destination==='home'){scene.zone='actions';scene.navIndex=2;scene.forceActiveFocus();}else if(destination==='search'){scene.zone='nav';scene.navIndex=0;scene.searchRequested();}else if(destination==='library'){scene.zone='nav';scene.navIndex=3;scene.libraryRequested();}else {scene.zone='nav';scene.navIndex=1;scene.profileRequested();}}
    }
    HeroButton { objectName:'heroSound'; x: 1036; y: 298; width: 180; visible:!scene.browsingRows && !scene.previewExternal; iconKey: scene.muted ? 'volume-x' : 'volume-2'; label:scene.muted ? 'Son coupé' : 'Son activé'; reducedMotion: scene.reducedMotion; family: scene.family; backdrop: backdrop; sampleRect: Qt.rect(x,y,width,height); focused: scene.zone==='sound'; onActivated: { scene.zone='sound'; scene.muted=!scene.muted; scene.soundChosen(scene.muted); } }
    Text { x: 870; y: 355; width: 346; horizontalAlignment: Text.AlignRight; color: '#b9bac3'; font.family: scene.family; font.pixelSize: 16
        visible: !scene.previewExternal && scene.previewEnabled && !scene.browsingRows
        text: scene.previewState==='loading' ? 'Chargement de la bande-annonce…' : scene.previewState==='unavailable' || scene.previewState==='error' ? 'Bande-annonce indisponible' : ''
    }
    ListView {
        id:rowList; objectName:'heroRows';visible:!scene.previewExternal; x:0; y:380; width:1280; height:scene.browsingRows ? 498 : 340; clip:true
        transform: Translate { y:scene.browsingRows ? -158 : 0
            Behavior on y {enabled:!scene.reducedMotion;NumberAnimation {duration:Motion.ms('scroll');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        }
        model:scene.rows; currentIndex:scene.selectedRow; keyNavigationEnabled:false; interactive:false
        boundsBehavior:Flickable.StopAtBounds; highlightRangeMode:ListView.NoHighlightRange; cacheBuffer:0
        Behavior on contentY { enabled:!scene.reducedMotion; NumberAnimation { duration:Motion.ms('scroll'); easing.type:Easing.Bezier; easing.bezierCurve:Motion.easeOut() } }
        delegate:MediaRow { host:scene; rowData:modelData; rowIndex:index }
    }
    // Avis fugace : en bas, sous les rangées et hors du héros, et il s'efface seul.
    Toast { objectName:'heroNotice'; text: scene.notice; family: scene.family; reducedMotion: scene.reducedMotion; visible: !scene.previewExternal; onExpired: scene.notice='' }
}
