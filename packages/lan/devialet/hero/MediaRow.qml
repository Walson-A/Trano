import QtQuick 2.15
import "Motion.js" as Motion

Item {
    id: row
    property var host
    property var rowData: ({})
    property int rowIndex: 0
    property bool current: host.selectedRow===rowIndex
    property int selection: current ? host.selectedIndex : host.rowPositions[rowData.id] || 0
    // Le Top 10 du moment (forme `top10` de catalog/home, comme sur le PC) : rang et affiche.
    readonly property bool top10: rowData.forme==='top10' || rowData.id==='top10'
    readonly property int cardWidth: top10 ? 272 : 266
    readonly property var activeRail: top10 ? top10Rail : rail
    width:1280; height:252
    function align(index) {
        var list=activeRail;list.currentIndex=index;
        // Le 10e du Top 10 a deux chiffres : sa carte est plus large (comme sur le PC).
        var left=index*(cardWidth+list.spacing),right=left+(top10 && index===9 ? 336 : cardWidth),next=list.contentX;
        if(index===0) next=list.originX;
        else if(left<next) next=left;
        else if(right>next+list.width-list.rightMargin) next=right-list.width+list.rightMargin;
        list.contentX=Math.max(list.originX,Math.min(Math.max(0,list.contentWidth-list.width+list.rightMargin),next));
    }
    // La carte Reprendre porte l'épisode et la barre (`reprise` de catalog/home, partagée avec
    // le PC et le mobile). Sans reprise, l'épisode seul : rien d'inventé.
    function resumeRatio(c){var r=c && c.reprise;return r && r.duration_ms>0 && r.position_ms>=0 ? Math.min(1,r.position_ms/r.duration_ms) : -1;}
    function resumeLabel(c){
        var r=c && c.reprise,n=r && r.episode>0 ? r.episode : row.host.resumeNumber ? row.host.resumeNumber(c) : 0;if(!n)return '';
        var left=r && r.duration_ms>0 && r.position_ms>=0 ? Math.round((r.duration_ms-r.position_ms)/60000) : -1;
        return 'Épisode '+n+(left>0 ? ' · reste '+left+' min' : '');
    }
    // « +N » : épisodes sortis et pas vus d'une série encore diffusée (`nouveaux`, Reprendre).
    function newLabel(c){return row.rowData.id==='reprendre' && c && c.nouveaux>0 ? '+'+c.nouveaux : '';}
    // Sortis cette semaine : `sortie {episode, le}`, `le` en secondes.
    function releasedLabel(c,now){
        var s=c && c.sortie;if(!s || !(s.episode>0))return '';
        var label='Ép. '+s.episode;if(!(s.le>0))return label;
        var hours=Math.floor((now/1000-s.le)/3600),days=Math.floor(hours/24);
        return label+' · '+(hours<1 ? 'à l’instant' : hours<24 ? 'il y a '+hours+' h' : days===1 ? 'hier' : 'il y a '+days+' j');
    }
    function subtitleFor(c){return row.rowData.id==='reprendre' ? row.resumeLabel(c) : row.rowData.id==='sortis' ? row.releasedLabel(c,Date.now()) : c && c.format!=='MOVIE' && row.host.seriesLabel ? row.host.seriesLabel(c) : '';}
    onSelectionChanged: if(alignTimer) alignTimer.restart()
    onCurrentChanged: if(current && alignTimer) alignTimer.restart()
    Timer { id:alignTimer; interval:0; onTriggered:row.align(row.selection) }
    Component.onCompleted:alignTimer.restart()
    Text { x:64; y:0; width:1100; text:row.rowData.titre || ''; textFormat:Text.PlainText; color:'#f5f5f7'; font.family:row.host.family; font.pixelSize:24; font.weight:Font.DemiBold; elide:Text.ElideRight }
    ListView {
        id:rail; objectName:row.current ? 'heroRail' : 'heroRail'+row.rowIndex
        x:50; y:32; width:1230; height:220; orientation:ListView.Horizontal; spacing:8; clip:true
        model:row.top10 ? [] : row.rowData.cartes || []; currentIndex:row.selection; highlightRangeMode:ListView.NoHighlightRange
        keyNavigationEnabled:false; boundsBehavior:Flickable.StopAtBounds; rightMargin:64; interactive:false; cacheBuffer:0
        Behavior on contentX { enabled:!row.host.reducedMotion; NumberAnimation { duration:Motion.ms('scroll'); easing.type:Easing.Bezier; easing.bezierCurve:Motion.easeOut() } }
        delegate:FocusCard {
            objectName:row.current ? 'heroCard'+index : 'row'+row.rowIndex+'Card'+index
            title:modelData.titre; artwork:row.host.art(modelData,'card'); fallbackArtwork:row.host.art(modelData,'poster'); family:row.host.family
            subtitle:row.subtitleFor(modelData); badge:row.newLabel(modelData)
            progress:row.rowData.id==='reprendre' ? row.resumeRatio(modelData) : -1
            selected:row.current && row.selection===index; focused:selected && row.host.zone==='rail'; reducedMotion:row.host.reducedMotion
            onActivated: { row.host.selectRow(row.rowIndex); row.host.zone='rail'; row.host.choose(index); row.host.forceActiveFocus(); }
            onArtworkFailed:row.host.artworkFailed(modelData,poster ? 'poster' : 'banner',failedSource)
            onArtworkReady:if(row.host.artworkReady)row.host.artworkReady(modelData,poster ? 'poster' : 'banner',loadedSource)
        }
    }
    ListView {
        id:top10Rail; objectName:row.current ? 'heroTop10Rail' : 'top10Rail'+row.rowIndex; visible:row.top10
        x:50; y:32; width:1230; height:220; orientation:ListView.Horizontal; spacing:14; clip:true
        model:row.top10 ? (row.rowData.cartes || []).slice(0,10) : []; currentIndex:row.selection; highlightRangeMode:ListView.NoHighlightRange
        keyNavigationEnabled:false; boundsBehavior:Flickable.StopAtBounds; rightMargin:64; interactive:false; cacheBuffer:4000 // dix cartes toutes créées : largeur exacte, le 10e se cale au bord
        Behavior on contentX { enabled:!row.host.reducedMotion; NumberAnimation { duration:Motion.ms('scroll'); easing.type:Easing.Bezier; easing.bezierCurve:Motion.easeOut() } }
        delegate:Top10Card {
            objectName:row.current ? 'heroTop10Card'+index : 'row'+row.rowIndex+'Top10Card'+index
            rank:index+1; title:modelData.titre; artwork:row.host.art(modelData,'poster'); family:row.host.family
            selected:row.current && row.selection===index; focused:selected && row.host.zone==='rail'; reducedMotion:row.host.reducedMotion
            Component.onCompleted:if(row.host.posterWanted)row.host.posterWanted(modelData)
            onActivated: { row.host.selectRow(row.rowIndex); row.host.zone='rail'; row.host.choose(index); row.host.forceActiveFocus(); }
            onArtworkFailed:row.host.artworkFailed(modelData,'poster',failedSource)
            onArtworkReady:if(row.host.artworkReady)row.host.artworkReady(modelData,'poster',loadedSource)
        }
    }
}
