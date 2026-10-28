import QtQuick 2.15
import fbx.application 1.0
import "."

Application {
    id: app
    FontLoader { id: regular; source: "regular.ttf" }
    FontLoader { source: "bold.ttf" }
    property bool firstHome: true
    TvSession { id: session; objectName:'tvSession'; onHomeLoaded: {
        if(app.firstHome){hero.muted=false;app.firstHome=false;console.info('ATLAS_TV_HOME_SOUND',hero.muted);}
        hero.selectMode(hero.resumeItems.length ? 'resume' : 'featured'); Qt.callLater(screen.warmArtwork);
    }
        onUnavailable:{if(screen.playbackId && episode.item)episode.item.close();hero.previewEnabled=false;}
    }
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
        property string panel: ''
        property string returnPanel: 'search'
        property string homeRowId: ''
        property string detailOrigin: ''
        property bool exitVisible:false
        property bool exitChosen:false
        function askExit(){exitVisible=true;exitChosen=false;hero.previewEnabled=false;exitDialog.forceActiveFocus();}
        function cancelExit(){exitVisible=false;hero.previewEnabled=true;hero.forceActiveFocus();}
        function openDetail(media) {
            if(detailPanel.status!==Loader.Ready){hero.notice='La fiche n’a pas pu être chargée. Relance Atlas TV.';return;}
            detailOrigin=panel;
            if(panel==='search')searchPanel.item.opened=false;
            if(panel==='profile')profilePanel.item.opened=false;
            panel='detail';hero.detailOpen=false;hero.previewEnabled=false;
            detailPanel.item.open(media);
        }
        function closeDetail() {
            panel='';
            if(detailOrigin==='search' || detailOrigin==='profile')openPanel(detailOrigin);
            else {hero.detailOpen=false;hero.zone='actions';hero.actionIndex=1;hero.previewEnabled=true;hero.forceActiveFocus();}
        }
        function returnFromPlayback() {
            if(panel==='detail'){hero.previewEnabled=false;detailPanel.item.forceActiveFocus();}
            else {hero.previewEnabled=true;hero.forceActiveFocus();}
        }
        function playbackError(message) {
            hero.notice=message;
            if(panel==='detail' && detailPanel.item)detailPanel.item.extrasError=message;
        }
        function logResolveFailure(status,value) {
            var error=value && value.error || {},code=/^[a-z_0-9]{1,64}$/.test(error.code || '') ? error.code : 'unknown';
            var request=/^[A-Za-z0-9_.:-]{1,96}$/.test(error.request_id || '') ? error.request_id : '';
            console.info('ATLAS_TV_RESOLVE_FAILURE',status,code,request);
            var attempts=error.details && error.details.attempts || [];
            for(var i=0;i<Math.min(8,attempts.length);i++){
                var a=attempts[i];console.info('ATLAS_TV_RESOLVE_ATTEMPT',/^[a-z_]{1,32}$/.test(a.source || '') ? a.source : '',/^[A-Za-z0-9+_. -]{1,48}$/.test(a.reader || '') ? a.reader : '',/^[a-z_0-9]{1,64}$/.test(a.code || '') ? a.code : '',/^[a-z_0-9]{1,64}$/.test(a.cause || '') ? a.cause : '');
            }
        }
        function openPanel(name) {
            if(hero.currentRow && hero.currentRow.id!=='context_selection')homeRowId=hero.currentRow.id;
            panel=name;returnPanel=name;hero.previewEnabled=false;
            var loader=name==='search' ? searchPanel : profilePanel;
            if(loader.status===Loader.Error){panel='';hero.previewEnabled=true;hero.notice='Cet écran est indisponible. Relance Atlas TV.';hero.forceActiveFocus();}
            else if(loader.status===Loader.Ready)loader.item.open();else waiting.forceActiveFocus();
        }
        function navigate(destination) {
            if(destination==='home'){closePanel('home');return;}
            if(destination===panel){var same=panel==='search' ? searchPanel : profilePanel;same.item.zone=panel==='search' ? 'keys' : same.item.cards.length ? 'cards' : 'nav';same.item.forceActiveFocus();return;}
            if(panel==='search')searchPanel.item.opened=false;
            if(panel==='profile')profilePanel.item.opened=false;
            openPanel(destination);
        }
        function closePanel(destination) {
            var name=panel;panel='';hero.contextRow=null;
            Qt.callLater(function(){
                for(var i=0;i<hero.rows.length;i++)if(hero.rows[i].id===homeRowId){hero.selectRow(i);break;}
                hero.zone='nav';hero.navIndex=destination==='home' ? 2 : name==='profile' ? 1 : 0;hero.previewEnabled=true;hero.forceActiveFocus();
            });
        }
        function selectPanelResult(cards,index,title) {
            openDetail(cards[index]);
        }
        function warmArtwork() {
            if(playbackId || resolving || panel) return;
            artworks.request(hero.selected,'banner',true);
            artworks.request(hero.selected,'poster',true);
            for(var i=0;i<Math.min(6,hero.items.length);i++) artworks.request(hero.items[i],'banner',false);
        }
        function preview() {
            if(resolving || playbackId || panel || !hero.selected || !hero.trailerId || session.state!=='ready') return;
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
        function launch(media,target,excluded,resumeOverride) {
            if(resolving || playbackId) return;
            if(episode.status===Loader.Error) { playbackError('Le lecteur n’a pas pu être chargé. Relance Atlas TV.'); return; }
            if(!media || !(media.anilist_id>0) || !target || !(target.numero>0)) {
                playbackError('Cet épisode ne dispose pas encore d’une identité de lecture compatible TV.'); hero.restartPreview(); return;
            }
            resolving=true; var turn=++generation;
            var readers=[];
            for(var i=0;excluded && i<excluded.length && readers.length<8;i++)if(/^[a-f0-9]{64}$/.test(excluded[i]) && readers.indexOf(excluded[i])<0)readers.push(excluded[i]);
            hero.previewEnabled=false; waiting.forceActiveFocus();
            session.api('/tv/v1/playbacks',{anilist_id:media.anilist_id,episode:target.numero,lang:target.vf ? 'vf' : 'vo',exclude_readers:readers},110000,function(status,value) {
                if(turn!==generation) return;
                resolving=false;
                var url=value && value.stream ? session.mediaUrl(value.stream.path,'episode') : '';
                if(status!==200 || !value || !/^[a-f0-9-]{36}$/.test(value.id || '') || !url) {
                    logResolveFailure(status,value);
                    playbackError(status===429 ? 'Une vidéo est en cours de préparation. Réessaie dans un instant.' : 'Cet épisode est indisponible pour le moment.');
                    returnFromPlayback(); return;
                }
                playbackId=value.id; sequence=0;
                pendingPlayback={url:url,title:media.titre+' · Épisode '+target.numero+' · '+(target.vf ? 'VF' : 'VOSTFR'),resume:resumeOverride>0 ? resumeOverride : value.resume ? value.resume.position_ms || 0 : 0,media:media,target:target,readerId:/^[a-f0-9]{64}$/.test(value.reader_id || '') ? value.reader_id : '',excluded:readers};
                if(episode.status===Loader.Ready) startEpisode();
            });
        }
        function startEpisode() {
            episode.item.title=pendingPlayback.title;
            episode.item.resumeMs=pendingPlayback.resume;
            episode.item.play(pendingPlayback.url);
        }
        function browsePlayingEpisodes(){var current=pendingPlayback ? pendingPlayback.media : null;if(playbackId && episode.item)episode.item.close();if(panel!=='detail' && current)openDetail(current);}
        function retryEpisode(){var current=pendingPlayback;if(!current)return;var excluded=(current.excluded || []).slice(),position=episode.item ? episode.item.positionMs : 0;if(current.readerId && excluded.indexOf(current.readerId)<0 && excluded.length<8)excluded.push(current.readerId);if(playbackId && episode.item)episode.item.close();launch(current.media,current.target,excluded,position);}
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
            avatar:session.home.compte && session.home.compte.avatar ? session.home.compte.avatar : profilePanel.item ? profilePanel.item.avatar : ''
            visible:session.state==='ready' && !screen.playbackId
            enabled:!screen.resolving && !screen.panel
            onTrailerRequested: screen.preview()
            onPlayRequested: screen.launch(media,target)
            onDetailsRequested:screen.openDetail(media)
            onDismissed: screen.askExit()
            onArtworkFailed:artworks.request(media,kind,true)
            onSearchRequested:screen.openPanel('search')
            onProfileRequested:screen.openPanel('profile')
            onContextBackRequested:screen.openPanel(screen.returnPanel)
        }
        Connections { target:hero; function onSelectedChanged() { screen.warmArtwork(); } function onItemsChanged() { screen.warmArtwork(); } }
        Loader {
            // Load once during bootstrap: the asset ticket expires in ten minutes.
            id:episode; objectName:'episodeLoader'; anchors.fill:parent; source:'EpisodePlayer.qml'; visible:!!screen.playbackId
            onLoaded: {
                item.family=regular.name || 'sans-serif';
                item.progress.connect(screen.progress);
                item.episodesRequested.connect(screen.browsePlayingEpisodes);item.retryRequested.connect(screen.retryEpisode);
                item.closed.connect(function() { screen.playbackId=''; screen.returnFromPlayback(); });
                if(screen.pendingPlayback && screen.playbackId) screen.startEpisode();
            }
        }
        Loader {id:searchPanel;objectName:'searchPanel';anchors.fill:parent;source:'SearchView.qml';visible:screen.panel==='search'
            onLoaded:{item.transport=session;item.artworks=artworks;item.family=regular.name || 'sans-serif';item.avatar=Qt.binding(function(){return hero.avatar;});item.closed.connect(screen.closePanel);item.chosen.connect(screen.selectPanelResult);item.navigateRequested.connect(screen.navigate);if(screen.panel==='search')item.open();}
            onStatusChanged:if(status===Loader.Error && screen.panel==='search'){screen.closePanel();hero.notice='La recherche n’a pas pu être ouverte. Relance Atlas TV.';}
        }
        Loader {id:profilePanel;objectName:'profilePanel';anchors.fill:parent;source:'ProfileView.qml';visible:screen.panel==='profile'
            onLoaded:{item.transport=session;item.artworks=artworks;item.family=regular.name || 'sans-serif';item.closed.connect(screen.closePanel);item.chosen.connect(screen.selectPanelResult);item.navigateRequested.connect(screen.navigate);if(screen.panel==='profile')item.open();}
            onStatusChanged:if(status===Loader.Error && screen.panel==='profile'){screen.closePanel();hero.notice='Le profil n’a pas pu être ouvert. Relance Atlas TV.';}
        }
        Loader {id:detailPanel;objectName:'detailPanel';anchors.fill:parent;source:'DetailView.qml';visible:screen.panel==='detail' && !screen.playbackId
            onLoaded:{item.transport=session;item.artworks=artworks;item.family=regular.name || 'sans-serif';item.closed.connect(screen.closeDetail);item.playRequested.connect(screen.launch);}
        }
        FocusScope {
            id:waiting; anchors.fill:parent; visible:session.state!=='ready' || screen.resolving || (screen.panel==='search' && searchPanel.status!==Loader.Ready) || (screen.panel==='profile' && profilePanel.status!==Loader.Ready)
            Rectangle { anchors.fill:parent; color:'#f2090a0d' }
            Text { anchors.centerIn:parent; width:1000; horizontalAlignment:Text.AlignHCenter; wrapMode:Text.WordWrap; text:session.state!=='ready' ? session.message : screen.resolving ? 'Préparation de l’épisode…\nRetour pour annuler' : 'Ouverture…'; color:'white'; font.family:regular.name || 'sans-serif'; font.pixelSize:26 }
            Keys.onPressed: {
                if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape) {
                    if(screen.resolving) { screen.generation++; screen.resolving=false; screen.returnFromPlayback(); }else if(screen.panel==='detail')detailPanel.item.back();else if(screen.panel)screen.closePanel();else Qt.quit();
                } else if((event.key===Qt.Key_Return || event.key===Qt.Key_Select || event.key===Qt.Key_Enter) && session.state==='error' && session.accessToken) session.loadHome();
                else return;
                event.accepted=true;
            }
        }
        FocusScope {id:exitDialog;objectName:'exitDialog';anchors.fill:parent;visible:screen.exitVisible
            Rectangle {anchors.fill:parent;color:'#df090a0d'}
            Rectangle {x:350;y:230;width:580;height:260;radius:24;color:'#242730';border.color:'#45ffffff'
                Text {x:36;y:34;width:508;text:'Quitter Atlas TV ?';color:'white';font.family:regular.name || 'sans-serif';font.pixelSize:32;font.weight:Font.Bold}
                Text {x:36;y:90;width:508;text:'Tu reviendras à l’écran du Devialet.';color:'#c7cad4';font.family:regular.name || 'sans-serif';font.pixelSize:19}
                Row {x:36;y:162;spacing:16
                    HeroButton {width:246;label:'Rester';family:regular.name || 'sans-serif';focused:!screen.exitChosen;onActivated:screen.cancelExit()}
                    HeroButton {width:246;label:'Quitter';family:regular.name || 'sans-serif';focused:screen.exitChosen;onActivated:Qt.quit()}
                }
            }
            Keys.onPressed:{
                if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape)screen.cancelExit();
                else if(event.key===Qt.Key_Left)screen.exitChosen=false;else if(event.key===Qt.Key_Right)screen.exitChosen=true;
                else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select){if(screen.exitChosen)Qt.quit();else screen.cancelExit();}else return;
                event.accepted=true;
            }
        }
    }
    Connections { target:session; function onStateChanged() { if(session.state==='ready') hero.forceActiveFocus(); else waiting.forceActiveFocus(); } }
    Component.onCompleted: { hero.muted=false;console.info('ATLAS_TV_BOOT_SOUND',hero.muted);waiting.forceActiveFocus(); session.start(Qt.resolvedUrl('runtime.json')); }
}
