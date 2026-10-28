import QtQuick 2.15
import fbx.application 1.0
import "."

Application {
    id: app
    FontLoader { id: regular; source: "regular.ttf" }
    FontLoader { source: "bold.ttf" }
    TvSession { id: session; objectName:'tvSession'; onHomeLoaded: { hero.selectMode(hero.resumeItems.length ? 'resume' : 'featured'); Qt.callLater(screen.warmArtwork); } }
    ArtworkCache { id:artworks; objectName:'artworkCache'; transport:session }
    Item {
        id: screen; objectName:'tvScreen'
        width:1280; height:720; scale:Math.min(parent.width/1280,parent.height/720); transformOrigin:Item.TopLeft
        property bool resolving: false
        property int generation: 0
        property string playbackId: ""
        property var pendingPlayback: null
        property int sequence: 0
        property bool previewBusy: false
        property var previewCache: ({})
        property var previewFailures: ({})
        function warmArtwork() {
            if(playbackId || resolving) return;
            artworks.request(hero.selected,'banner',true);
            artworks.request(hero.selected,'poster',true);
            for(var i=0;i<Math.min(6,hero.items.length);i++) artworks.request(hero.items[i],'banner',false);
        }
        function preview() {
            if(resolving || playbackId || !hero.selected || !hero.trailerId || session.state!=='ready') return;
            if(previewBusy) { hero.previewState='loading'; return; }
            var id=hero.selected.anilist_id, key=hero.trailerId, cached=previewCache[key];
            if(!(id>0)) return;
            if(cached && cached.expires>Date.now()+30000) { var available={}; available[key]=cached.url; hero.trailerSources=available; return; }
            if(previewFailures[key]>Date.now()) { hero.previewState='unavailable'; return; }
            previewBusy=true; hero.previewState='loading';
            session.api('/tv/v1/previews',{anilist_id:id},110000,function(status,value) {
                previewBusy=false;
                var url=value ? session.mediaUrl(value.path,'trailer') : '';
                if(status===200 && value && value.kind==='trailer' && value.anilist_id===id && value.youtube_id===key && url) {
                    var next={}, keys=Object.keys(previewCache);
                    for(var i=Math.max(0,keys.length-15);i<keys.length;i++) if(previewCache[keys[i]].expires>Date.now()) next[keys[i]]=previewCache[keys[i]];
                    next[key]={url:url,expires:value.expires_at*1000}; previewCache=next;
                    if(hero.trailerId===key && !resolving && !playbackId) { var sources={}; sources[key]=url; hero.trailerSources=sources; }
                } else {
                    previewFailures[key]=Date.now()+60000;
                    if(hero.trailerId===key) hero.previewState='unavailable';
                }
                // A late response can warm its own cache, never change the selection.
                if(hero.trailerId!==key) preview();
            });
        }
        function launch(media,target) {
            if(resolving || playbackId) return;
            if(episode.status===Loader.Error) { hero.notice='Le lecteur n’a pas pu être chargé. Relance Atlas TV.'; return; }
            if(!media || !(media.anilist_id>0) || !target || !(target.numero>0)) {
                hero.notice='Cet épisode ne dispose pas encore d’une identité de lecture compatible TV.'; hero.restartPreview(); return;
            }
            resolving=true; var turn=++generation;
            hero.previewEnabled=false; waiting.forceActiveFocus();
            session.api('/tv/v1/playbacks',{anilist_id:media.anilist_id,episode:target.numero,lang:target.vf ? 'vf' : 'vo',exclude_readers:[]},110000,function(status,value) {
                if(turn!==generation) return;
                resolving=false;
                var url=value && value.stream ? session.mediaUrl(value.stream.path,'episode') : '';
                if(status!==200 || !value || !/^[a-f0-9-]{36}$/.test(value.id || '') || !url) {
                    hero.notice=status===429 ? 'Une vidéo est en cours de préparation. Réessaie dans un instant.' : 'Cet épisode est indisponible pour le moment.';
                    hero.previewEnabled=true; hero.forceActiveFocus(); return;
                }
                playbackId=value.id; sequence=0;
                pendingPlayback={url:url,title:media.titre+' · Épisode '+target.numero,resume:value.resume ? value.resume.position_ms || 0 : 0};
                if(episode.status===Loader.Ready) startEpisode();
            });
        }
        function startEpisode() {
            episode.item.title=pendingPlayback.title;
            episode.item.resumeMs=pendingPlayback.resume;
            episode.item.play(pendingPlayback.url);
        }
        function progress(value) {
            if(!playbackId) return;
            value.seq=++sequence;
            session.api('/tv/v1/playbacks/'+playbackId+'/progress',value,12000,function(status,response) {
                if(status!==200) hero.notice='La progression n’a pas pu être synchronisée.';
            });
        }
        Timer { interval:30000; repeat:true; running:session.state==='ready' && !screen.playbackId && !screen.resolving; onTriggered: {
            screen.warmArtwork();
            var key=hero.trailerId, cached=screen.previewCache[key];
            if(cached && cached.expires<=Date.now()+30000 && hero.trailerSources[key]) hero.trailerSources={};
        } }
        Hero {
            id:hero; objectName:'atlasHero'; family:regular.name || 'sans-serif'; homeData:session.home; keepPreviewLoaded:true
            artworkMap:artworks.sources
            visible:session.state==='ready' && !screen.playbackId
            enabled:!screen.resolving
            onTrailerRequested: screen.preview()
            onPlayRequested: screen.launch(media,target)
            onDismissed: Qt.quit()
            onArtworkFailed:artworks.request(media,kind,true)
        }
        Connections { target:hero; function onSelectedChanged() { screen.warmArtwork(); } function onItemsChanged() { screen.warmArtwork(); } }
        Loader {
            // Load once during bootstrap: the asset ticket expires in ten minutes.
            id:episode; objectName:'episodeLoader'; anchors.fill:parent; source:'EpisodePlayer.qml'; visible:!!screen.playbackId
            onLoaded: {
                item.family=regular.name || 'sans-serif';
                item.progress.connect(screen.progress);
                item.closed.connect(function() { screen.playbackId=''; hero.previewEnabled=true; hero.forceActiveFocus(); });
                if(screen.pendingPlayback && screen.playbackId) screen.startEpisode();
            }
        }
        FocusScope {
            id:waiting; anchors.fill:parent; visible:session.state!=='ready' || screen.resolving
            Rectangle { anchors.fill:parent; color:'#f2090a0d' }
            Text { anchors.centerIn:parent; width:1000; horizontalAlignment:Text.AlignHCenter; wrapMode:Text.WordWrap; text:screen.resolving ? 'Préparation de l’épisode…\nRetour pour annuler' : session.message; color:'white'; font.family:regular.name || 'sans-serif'; font.pixelSize:26 }
            Keys.onPressed: {
                if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape) {
                    if(screen.resolving) { screen.generation++; screen.resolving=false; hero.previewEnabled=true; hero.forceActiveFocus(); } else Qt.quit();
                } else if((event.key===Qt.Key_Return || event.key===Qt.Key_Select || event.key===Qt.Key_Enter) && session.state==='error' && session.accessToken) session.loadHome();
                else return;
                event.accepted=true;
            }
        }
    }
    Connections { target:session; function onStateChanged() { if(session.state==='ready') hero.forceActiveFocus(); else waiting.forceActiveFocus(); } }
    Component.onCompleted: { waiting.forceActiveFocus(); session.start(Qt.resolvedUrl('runtime.json')); }
}
