import QtQuick 2.15
import fbx.application 1.0
import "."
Application {
    FontLoader { id: regular; source: "regular.ttf" }
    FontLoader { source: "bold.ttf" }
    Hero {
        id: hero; objectName: "atlasHero"; scale: Math.min(parent.width/1280,parent.height/720); transformOrigin: Item.TopLeft
        family: regular.name || "sans-serif"
        property string reportUrl: ""
        function report(value) { if(!reportUrl) return; var r=new XMLHttpRequest(); r.open('POST',reportUrl); r.setRequestHeader('Content-Type','application/json'); r.send(JSON.stringify(value)); }
        onPreviewObserved: report(observation)
        onTrailerRequested: report({event:'trailer_requested',id:trailerKey})
        onSelectedChanged: if(selected) report({event:'selection',anilist_id:selected.anilist_id})
        onPlayRequested: { notice="La lecture des épisodes n’est pas raccordée dans cet essai."; report({event:'play_requested',anilist_id:media.anilist_id}); }
        onDismissed: Qt.quit()
        Component.onCompleted: {
            var req=new XMLHttpRequest();
            req.onreadystatechange=function() { if(req.readyState===XMLHttpRequest.DONE && req.status===200) {
                var data=JSON.parse(req.responseText); hero.reportUrl=data.reportUrl || ''; hero.reducedMotion=!!data.reducedMotion; hero.homeData=data.home; hero.artworkMap=data.artwork || {}; hero.trailerSources=data.trailers || {};
                hero.selectMode(hero.resumeItems.length ? 'resume' : 'featured');
                if(data.initialAnime) {
                    var cards=hero.homeData.hero || [];
                    for(var i=0;i<cards.length;i++) if(cards[i].anilist_id===data.initialAnime) { hero.selectMode('featured'); hero.choose(i); break; }
                }
            } };
            req.open('GET',Qt.resolvedUrl('session.json')); req.send();
        }
    }
}
