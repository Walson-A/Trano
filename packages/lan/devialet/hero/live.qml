import QtQuick 2.15
import fbx.application 1.0
import "."
import "EpisodePolicy.js" as Episode

Application {
    id: app
    FontLoader { id: regular; source: "regular.ttf" }
    FontLoader { source: "bold.ttf" }
    property bool firstHome: true
    property var homeContext:null
    TvSession { id: session; objectName:'tvSession'; onHomeLoaded: {
        if(app.firstHome){hero.muted=false;app.firstHome=false;console.info('ATLAS_TV_HOME_SOUND',hero.muted);}
        var context=app.homeContext;app.homeContext=null;var restored=false;
        if(context)for(var pass=0;pass<2 && !restored;pass++)for(var r=0;r<hero.rows.length && !restored;r++){
            if(pass===0 && hero.rows[r].id!==context.rowId)continue;
            for(var i=0;i<hero.rows[r].cartes.length;i++)if(hero.rows[r].cartes[i].anilist_id===context.identity){hero.selectRow(r);hero.choose(i);restored=true;break;}
        }
        if(!restored)hero.selectMode(hero.resumeItems.length ? 'resume' : 'featured');Qt.callLater(screen.warmArtwork);
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
        property bool retryInspectBusy:false
        property int retrySerial:0
        property var previewCache: ({})
        property var previewFailures: ({})
        property string panel: ''
        property string returnPanel: 'search'
        property string homeRowId: ''
        property string detailOrigin: ''
        property bool exitVisible:false
        property bool exitChosen:false
        function panelLoader(name){return name==='library' ? libraryPanel : name==='search' ? searchPanel : profilePanel;}
        function updatePersonal(id,value,refreshHome){
            function patch(c){if(!c || c.anilist_id!==id)return c;var next={};Object.keys(c).forEach(function(k){next[k]=c[k];});next.moi=value.moi;return next;}
            var next={};Object.keys(session.home).forEach(function(k){next[k]=session.home[k];});next.hero=(session.home.hero || []).map(patch);
            next.rangees=(session.home.rangees || []).map(function(row){var copy={};Object.keys(row).forEach(function(k){copy[k]=row[k];});copy.cartes=(row.cartes || []).map(patch);return copy;});session.home=next;
            if(libraryPanel.item)libraryPanel.item.invalidate();
            if(refreshHome){if(!app.homeContext)app.homeContext={identity:hero.selected ? hero.selected.anilist_id : 0,rowId:hero.currentRow ? hero.currentRow.id : ''};session.loadHome();}
        }
        function knownEpisode(media,number){
            var detail=detailPanel.item;if(detail && detail.opened && detail.card && detail.card.anilist_id===media.anilist_id){for(var i=0;i<detail.episodes.length;i++)if(detail.episodes[i].numero===number)return detail.episodes[i];}
            return episode.item ? episode.item.knownEpisode(media.anilist_id,number) : null;
        }
        function askExit(){exitVisible=true;exitChosen=false;hero.previewEnabled=false;exitDialog.forceActiveFocus();}
        function cancelExit(){exitVisible=false;hero.previewEnabled=true;hero.forceActiveFocus();}
        function openDetail(media) {
            if(detailPanel.status!==Loader.Ready){hero.notice='La fiche n’a pas pu être chargée. Relance Atlas TV.';return;}
            detailOrigin=panel;
            if(panel==='search')searchPanel.item.opened=false;
            if(panel==='profile')profilePanel.item.opened=false;
            if(panel==='library')libraryPanel.item.opened=false;
            panel='detail';hero.detailOpen=false;hero.previewEnabled=false;
            detailPanel.item.open(media);
        }
        function closeDetail() {
            panel='';
            if(detailOrigin==='search' || detailOrigin==='profile' || detailOrigin==='library')openPanel(detailOrigin);
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
            if(['search','profile','library'].indexOf(name)<0 || name==='library' && !session.libraryEnabled)return;
            if(hero.currentRow && hero.currentRow.id!=='context_selection')homeRowId=hero.currentRow.id;
            panel=name;returnPanel=name;hero.previewEnabled=false;
            var loader=panelLoader(name);
            if(loader.status===Loader.Error){panel='';hero.previewEnabled=true;hero.notice='Cet écran est indisponible. Relance Atlas TV.';hero.forceActiveFocus();}
            else if(loader.status===Loader.Ready)loader.item.open();else waiting.forceActiveFocus();
        }
        function navigate(destination) {
            if(destination==='home'){closePanel('home');return;}
            if(destination===panel){var same=panelLoader(panel);same.item.zone=panel==='search' || panel==='library' ? 'filters' : same.item.cards.length ? 'cards' : 'nav';same.item.forceActiveFocus();return;}
            if(panel==='search')searchPanel.item.opened=false;
            if(panel==='profile')profilePanel.item.opened=false;
            if(panel==='library')libraryPanel.item.opened=false;
            openPanel(destination);
        }
        function closePanel(destination) {
            var name=panel;if(['search','profile','library'].indexOf(name)>=0 && panelLoader(name).item)panelLoader(name).item.opened=false;panel='';hero.contextRow=null;
            Qt.callLater(function(){
                for(var i=0;i<hero.rows.length;i++)if(hero.rows[i].id===homeRowId){hero.selectRow(i);break;}
                hero.zone='nav';hero.navIndex=destination==='home' ? 2 : name==='profile' ? 1 : name==='library' ? 3 : 0;hero.previewEnabled=true;hero.forceActiveFocus();
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
            if(playbackId)return;
            resolvePlayback(media,target,{},excluded,resumeOverride,false,false);
        }
        function cancelChange(){generation++;resolving=false;retrySerial++;retryInspectBusy=false;if(episode.item)episode.item.retrying=false;}
        function changeEpisode(media,target,choice){resolvePlayback(media,target,choice,[],undefined,true,false);}
        function resolvePlayback(media,target,choice,excluded,resumeOverride,replacing,forceRefresh) {
            if(resolving || (replacing && !playbackId))return;
            if(app.homeContext && !replacing){playbackError('Actualisation de ton suivi…');return;}
            if(episode.status===Loader.Error){playbackError('Le lecteur n’a pas pu être chargé. Relance Atlas TV.');return;}
            if(!media || !(media.anilist_id>0) || !target || !(target.numero>0)){playbackError('Cet épisode ne dispose pas d’une identité de lecture compatible TV.');return;}
            var known=knownEpisode(media,target.numero);
            if(Episode.blocked(known)){
                var blocked=Episode.notice(known);
                if(replacing)episode.item.changeFailed(blocked);else playbackError(blocked);return;
            }
            choice=choice || {};
            if(choice.source && ['voiranime','anime-sama','franime'].indexOf(choice.source)<0 || choice.readerId && !/^[a-f0-9]{64}$/.test(choice.readerId) || choice.variantId && (!/^[a-f0-9]{64}$/.test(choice.variantId) || !choice.readerId || !choice.source))return;
            if((choice.readerId || choice.source) && !session.readersEnabled || choice.variantId && !session.variantsEnabled){if(replacing)episode.item.changeFailed('Ce choix n’est pas disponible sur cette connexion.');return;}
            resolving=true;var turn=++generation,old=pendingPlayback,oldId=playbackId;
            var readers=[];
            for(var i=0;excluded && i<excluded.length;i++)if(/^[a-f0-9]{64}$/.test(excluded[i]) && excluded[i]!==choice.readerId && readers.indexOf(excluded[i])<0)readers.push(excluded[i]);
            readers=readers.slice(-8);
            var body={anilist_id:media.anilist_id,episode:target.numero,lang:target.vf ? 'vf' : 'vo',exclude_readers:readers};
            if(session.hlsEnabled)body.accept_hls=true;
            if(choice.source)body.source=choice.source;if(choice.readerId)body.reader_id=choice.readerId;if(choice.variantId)body.variant_id=choice.variantId;if(forceRefresh)body.force_refresh=true;
            hero.previewEnabled=false;if(!replacing)waiting.forceActiveFocus();
            session.api('/tv/v1/playbacks',body,110000,function(status,value){
                if(turn!==generation || replacing && playbackId!==oldId)return;
                resolving=false;
                var url=value && value.stream ? session.mediaUrl(value.stream.path,'episode') : '';
                if(status!==200 || !value || value.anilist_id!==body.anilist_id || value.episode!==body.episode || value.lang!==body.lang || !/^[a-f0-9-]{36}$/.test(value.id || '') || !url || choice.readerId && value.reader_id!==choice.readerId || choice.source && value.source!==choice.source || choice.variantId && value.variant_id!==choice.variantId){
                    logResolveFailure(status,value);
                    var error=value && value.error || {};
                    var message=error.code==='episode_not_aired' ? Episode.notice({diffusion:error.details && error.details.diffusion || {etat:'a_venir'},lancable:false}) : error.code==='episode_out_of_range' ? 'Cet épisode ne fait pas partie de cette saison.' : error.code==='airing_unavailable' ? 'Le calendrier est temporairement indisponible. Réessaie dans un instant.' : status===429 ? 'Une vidéo est en cours de préparation. Réessaie dans un instant.' : 'Ce flux est indisponible pour le moment.';
                    if(replacing)episode.item.changeFailed(message);else {playbackError(message);returnFromPlayback();}return;
                }
                var sameEpisode=replacing && old.media.anilist_id===media.anilist_id && old.target.numero===target.numero;
                var resume=typeof resumeOverride==='number' && isFinite(resumeOverride) && resumeOverride>=0 ? resumeOverride : sameEpisode ? episode.item.positionMs : value.resume ? value.resume.position_ms || 0 : 0;
                var intent=replacing ? episode.item.failure ? true : episode.item.wantsPlaying : true;
                // This reports the old session before installing the new identity/sequence.
                if(replacing)episode.item.retire();
                playbackId=value.id;sequence=0;
                pendingPlayback={url:url,path:value.stream.path,title:media.titre,chapter:'Épisode '+target.numero+' · '+(target.vf ? 'VF' : 'VOSTFR'),resume:resume,playingIntent:intent,media:media,target:{numero:target.numero,vf:!!target.vf},readerId:/^[a-f0-9]{64}$/.test(value.reader_id || '') ? value.reader_id : '',source:['voiranime','anime-sama','franime'].indexOf(value.source)>=0 ? value.source : '',readerLabel:typeof value.reader==='string' ? (value.source==='franime' ? 'FrAnime · ' : '')+value.reader.slice(0,160) : '',qualityLabel:value.quality && typeof value.quality.label==='string' ? value.quality.label.slice(0,80) : '',choice:{source:choice.source || '',readerId:choice.readerId || '',variantId:choice.variantId || ''},excluded:readers};
                if(episode.status===Loader.Ready)startEpisode();
            });
        }
        function startEpisode(){
            episode.item.title=pendingPlayback.title;episode.item.chapter=pendingPlayback.chapter;
            episode.item.resumeMs=pendingPlayback.resume;episode.item.play(pendingPlayback.url,pendingPlayback.playingIntent);
        }
        function retryEpisode(){
            var current=pendingPlayback,id=playbackId;if(!current || !id || retryInspectBusy || resolving)return;
            var position=episode.item ? episode.item.positionMs : 0,turn=++retrySerial;retryInspectBusy=true;episode.item.retrying=true;
            session.inspectEpisode(current.path,function(status,value){
                if(screen.playbackId!==id || turn!==screen.retrySerial)return;
                screen.retryInspectBusy=false;episode.item.retrying=false;
                var excluded=(current.excluded || []).slice(),choice=current.choice || {};
                if(!choice.readerId && (status>=200 && status<300 || status===502 || status===503 || status===504) && current.readerId){excluded=excluded.filter(function(reader){return reader!==current.readerId;});excluded.push(current.readerId);excluded=excluded.slice(-8);}
                // A 401 renews the ticket without blaming the host. Strict choices stay strict.
                screen.resolvePlayback(current.media,current.target,choice,excluded,position,true,true);
            });
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
            avatar:session.home.compte && session.home.compte.avatar ? session.home.compte.avatar : profilePanel.item ? profilePanel.item.avatar : ''
            visible:session.state==='ready' && !screen.playbackId
            enabled:!screen.resolving && !screen.panel
            onTrailerRequested: screen.preview()
            onPlayRequested: screen.launch(media,target)
            onDetailsRequested:screen.openDetail(media)
            onDismissed: screen.askExit()
            onArtworkFailed:artworks.failed(media,kind,failedSource)
            onArtworkReady:artworks.confirmed(media,kind,loadedSource)
            onSearchRequested:screen.openPanel('search')
            onProfileRequested:screen.openPanel('profile')
            onLibraryRequested:screen.openPanel('library')
            libraryEnabled:!!session.libraryEnabled
            onContextBackRequested:screen.openPanel(screen.returnPanel)
        }
        Connections { target:hero; function onSelectedChanged() { screen.warmArtwork(); } function onItemsChanged() { screen.warmArtwork(); } }
        Loader {
            // Load once during bootstrap: the asset ticket expires in ten minutes.
            id:episode; objectName:'episodeLoader'; anchors.fill:parent; source:'EpisodePlayer.qml'; visible:!!screen.playbackId
            onLoaded: {
                item.family=regular.name || 'sans-serif';
                item.transport=session;item.current=Qt.binding(function(){return screen.pendingPlayback;});item.changing=Qt.binding(function(){return screen.resolving;});
                item.progress.connect(screen.progress);item.changeRequested.connect(screen.changeEpisode);item.cancelChangeRequested.connect(screen.cancelChange);item.retryRequested.connect(screen.retryEpisode);
                item.closed.connect(function() { screen.playbackId='';screen.pendingPlayback=null;screen.cancelChange();screen.returnFromPlayback(); });
                if(screen.pendingPlayback && screen.playbackId) screen.startEpisode();
            }
        }
        Loader {id:searchPanel;objectName:'searchPanel';anchors.fill:parent;source:'DiscoveryView.qml';visible:screen.panel==='search'
            onLoaded:{item.transport=session;item.artworks=artworks;item.family=regular.name || 'sans-serif';item.denseLayout=true;item.avatar=Qt.binding(function(){return hero.avatar;});item.closed.connect(screen.closePanel);item.chosen.connect(screen.selectPanelResult);item.navigateRequested.connect(screen.navigate);if(screen.panel==='search')item.open();}
            onStatusChanged:if(status===Loader.Error && screen.panel==='search'){screen.closePanel();hero.notice='La recherche n’a pas pu être ouverte. Relance Atlas TV.';}
        }
        Loader {id:libraryPanel;objectName:'libraryPanel';anchors.fill:parent;source:'LibraryView.qml';visible:screen.panel==='library'
            onLoaded:{item.transport=session;item.artworks=artworks;item.family=regular.name || 'sans-serif';item.avatar=Qt.binding(function(){return hero.avatar;});item.closed.connect(screen.closePanel);item.chosen.connect(screen.selectPanelResult);item.navigateRequested.connect(screen.navigate);if(screen.panel==='library')item.open();}
            onStatusChanged:if(status===Loader.Error && screen.panel==='library'){screen.closePanel();hero.notice='Ta liste n’a pas pu être ouverte. Relance Atlas TV.';}
        }
        Loader {id:profilePanel;objectName:'profilePanel';anchors.fill:parent;source:'ProfileView.qml';visible:screen.panel==='profile'
            onLoaded:{item.transport=session;item.artworks=artworks;item.family=regular.name || 'sans-serif';item.closed.connect(screen.closePanel);item.chosen.connect(screen.selectPanelResult);item.navigateRequested.connect(screen.navigate);if(screen.panel==='profile')item.open();}
            onStatusChanged:if(status===Loader.Error && screen.panel==='profile'){screen.closePanel();hero.notice='Le profil n’a pas pu être ouvert. Relance Atlas TV.';}
        }
        Loader {id:detailPanel;objectName:'detailPanel';anchors.fill:parent;source:'DetailView.qml';visible:screen.panel==='detail' && !screen.playbackId
            onLoaded:{item.transport=session;item.artworks=artworks;item.family=regular.name || 'sans-serif';item.closed.connect(screen.closeDetail);item.playRequested.connect(screen.launch);item.personalChanged.connect(screen.updatePersonal);}
        }
        FocusScope {
            id:waiting; anchors.fill:parent; visible:session.state!=='ready' || screen.resolving && !screen.playbackId || (screen.panel==='search' && searchPanel.status!==Loader.Ready) || (screen.panel==='profile' && profilePanel.status!==Loader.Ready) || (screen.panel==='library' && libraryPanel.status!==Loader.Ready)
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
