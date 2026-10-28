import QtQuick 2.15
import "Motion.js" as Motion

Item {
    id: row
    property var host
    property var rowData: ({})
    property int rowIndex: 0
    property bool current: host.selectedRow===rowIndex
    property int selection: current ? host.selectedIndex : host.rowPositions[rowData.id] || 0
    width:1280; height:252
    function align(index) {
        rail.currentIndex=index;
        var left=index*(266+rail.spacing),right=left+266,next=rail.contentX;
        if(index===0) next=rail.originX;
        else if(left<next) next=left;
        else if(right>next+rail.width-rail.rightMargin) next=right-rail.width+rail.rightMargin;
        rail.contentX=Math.max(rail.originX,Math.min(Math.max(0,rail.contentWidth-rail.width+rail.rightMargin),next));
    }
    onSelectionChanged: if(alignTimer) alignTimer.restart()
    onCurrentChanged: if(current && alignTimer) alignTimer.restart()
    Timer { id:alignTimer; interval:0; onTriggered:row.align(row.selection) }
    Component.onCompleted:alignTimer.restart()
    Text { x:64; y:0; width:1100; text:row.rowData.titre || ''; textFormat:Text.PlainText; color:'#f5f5f7'; font.family:row.host.family; font.pixelSize:24; font.weight:Font.DemiBold; elide:Text.ElideRight }
    ListView {
        id:rail; objectName:row.current ? 'heroRail' : 'heroRail'+row.rowIndex
        x:50; y:32; width:1230; height:220; orientation:ListView.Horizontal; spacing:8; clip:true
        model:row.rowData.cartes || []; currentIndex:row.selection; highlightRangeMode:ListView.NoHighlightRange
        keyNavigationEnabled:false; boundsBehavior:Flickable.StopAtBounds; rightMargin:64; interactive:false; cacheBuffer:0
        Behavior on contentX { enabled:!row.host.reducedMotion; NumberAnimation { duration:Motion.ms('scroll'); easing.type:Easing.Bezier; easing.bezierCurve:Motion.easeOut() } }
        delegate:FocusCard {
            objectName:row.current ? 'heroCard'+index : 'row'+row.rowIndex+'Card'+index
            title:modelData.titre; artwork:row.host.art(modelData,'card'); fallbackArtwork:row.host.art(modelData,'poster'); family:row.host.family
            selected:row.selection===index; focused:row.current && selected && row.host.zone==='rail'; reducedMotion:row.host.reducedMotion
            progress:modelData.moi && modelData.episodes ? modelData.moi.progression/Math.max(1,modelData.episodes) : -1
            onActivated: { row.host.selectRow(row.rowIndex); row.host.zone='rail'; row.host.choose(index); row.host.forceActiveFocus(); }
            onArtworkFailed:row.host.artworkFailed(modelData,poster ? 'poster' : 'banner')
        }
    }
}
