import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion
import "EpisodePolicy.js" as Episode
import "LibraryPolicy.js" as Personal
import "RequestState.js" as RequestState

FocusScope {
    id: view
    objectName: 'atlasDetail'
    property var transport
    property var artworks
    property var previews
    property var trailerPlayer
    readonly property real headerHeight:header.height
    readonly property bool previewReady:!!(previewWanted && trailerPlayer && trailerPlayer.videoReady && !trailerPlayer.failure)
    property bool previewMuted:false
    property bool previewSuspended:false
    property int previewGeneration:0
    property var previewLease:null
    property string previewState:'image'
    property bool fullPreview:false
    readonly property bool hasTrailer:!!(card && /^[A-Za-z0-9_-]{11}$/.test(card.bande_annonce || ''))
    readonly property bool previewWanted:!!(opened && visible && !previewSuspended && transport && transport.state==='ready' && previews && previews.identity(card) && (fullPreview || viewport.contentY<1) && !followup.opened)
    property string family: 'sans-serif'
    property bool reducedMotion: false
    property bool opened: false
    property var media: null
    property var detail: null
    property var episodeData: null
    property string state: 'loading'
    property string episodeState: 'loading'
    property string extrasError: ''
    property string episodeError:''
    property string detailError:''
    property double detailRetryAt:0
    property double episodeRetryAt:0
    property int episodeRetrySeconds:0
    property int generation: 0
    property int episodeGeneration: 0
    property string episodeIdentity: ''
    property int episodeSelectionNumber: 0
    property var pendingEpisodesReady: null
    property var pendingDetailExtras:null
    property var pendingEpisodeExtras:null
    property bool detailExtrasInFlight:false
    property bool episodeExtrasInFlight:false
    property string zone: 'actions'
    property int actionIndex: 0
    property int episodeIndex: 0
    property int seasonIndex: 0
    property int relationIndex: 0
    property int castIndex: 0
    property int recommendationIndex: 0
    property int pageIndex: 0
    property int pageStart: 1
    property bool french: false
    property int languageIndex: 0
    property var stack: []
    readonly property var card: detail && detail.carte ? detail.carte : media
    readonly property var episodes: episodeData && episodeData.episodes ? episodeData.episodes : []
    readonly property var seasons: detail && detail.saisons ? detail.saisons : []
    readonly property var relations: detail && detail.relations ? detail.relations : []
    readonly property var cast: detail && detail.personnages ? detail.personnages : []
    readonly property var recommendations: detail && detail.recommandations ? detail.recommandations.filter(function(c){return !view.card || c.anilist_id!==view.card.anilist_id;}) : []
    readonly property var currentEpisode: episodes.length ? episodes[Math.min(episodeIndex,episodes.length-1)] : null
    readonly property bool canPrevious: pageStart>1
    readonly property bool canNext: !!episodeData && pageStart+episodes.length<=(Number.isInteger(episodeData.borne_connue) ? episodeData.borne_connue : episodeData.total)
    readonly property bool hasFrench: episodes.some(function(e){return e.franime && e.franime.vf;}) || !!(card && card.franime && card.franime.vf)
    readonly property int personalId:card && card.anilist_id>0 ? card.anilist_id : 0
    readonly property var personalEntry:library.entry(personalId)
    readonly property string personalPhase:library.phase(personalId)
    readonly property bool personalPending:personalPhase==='loading' || personalPhase==='idle'
    readonly property bool personalEnabled:library.available && personalId>0
    signal personalChanged(int identity,var value,bool refreshHome)
    signal closed()
    signal playRequested(var media,var target)
    function stopPreview(){previewGeneration++;if(previewLease)previewLease.cancel();previewLease=null;if(previewDelay)previewDelay.stop();if(previewTimeout)previewTimeout.stop();if(trailerPlayer)trailerPlayer.retire();previewState='image';}
    function suspendPreview(){previewSuspended=true;stopPreview();}
    function resumePreview(){previewSuspended=false;if(previewWanted)previewDelay.restart();}
    function openFullPreview(){if(!hasTrailer || !previews || !trailerPlayer || previewSuspended)return;fullPreview=true;trailerPlayer.zone='surface';trailerPlayer.reveal();trailerPlayer.forceActiveFocus();if(!trailerPlayer.hasSource)startPreview();}
    function closeFullPreview(){fullPreview=false;forceActiveFocus();}
    function startPreview(){
        if(!previewWanted)return;
        if(previewLease)previewLease.cancel();previewLease=null;
        var turn=++previewGeneration,key=previews.identity(card);previewState='loading';
        previewLease=previews.resolve(card,function(status,url){
            if(turn!==previewGeneration || !previewWanted || previews.identity(card)!==key)return;
            trailerPlayer.retrying=false;
            if(status===200 && url){trailerPlayer.play(url,true);previewTimeout.restart();}
            else previewState='unavailable';
        });
    }
    onPreviewWantedChanged:{if(previewWanted)previewDelay.restart();else stopPreview();}
    onCardChanged:{stopPreview();if(previewWanted)previewDelay.restart();}
    onPreviewStateChanged:if(fullPreview && previewState==='unavailable' && trailerPlayer && !trailerPlayer.failure){trailerPlayer.failure='La bande-annonce est indisponible.';trailerPlayer.reveal();}
    Timer {id:previewDelay;interval:900;onTriggered:view.startPreview();}
    Timer {id:previewTimeout;interval:10000;onTriggered:{if(view.trailerPlayer)view.trailerPlayer.retire();view.previewState='unavailable';}}
    Connections {target:view.trailerPlayer;ignoreUnknownSignals:true
        function onVideoReadyChanged(){if(view.previewReady){view.previewState='playing';previewTimeout.stop();}}
        function onFailureChanged(){if(view.trailerPlayer && view.trailerPlayer.failure){if(view.previews && view.previews.cachedSource(view.card))view.previews.invalidate(view.card);view.previewState='unavailable';previewTimeout.stop();}}
        function onEndedChanged(){if(view.trailerPlayer && view.trailerPlayer.ended){view.trailerPlayer.retire();view.previewState='ended';previewTimeout.stop();if(view.fullPreview)view.closeFullPreview();}}
    }
    TvLibrary {id:library;objectName:'detailLibrary';transport:view.transport;onAvailableChanged:if(available && view.opened && view.personalId)view.loadPersonal();onSaved:{
        if(identity===view.personalId && view.detail){var next={},updated={};Object.keys(view.detail).forEach(function(k){next[k]=view.detail[k];});Object.keys(view.card).forEach(function(k){updated[k]=view.card[k];});updated.moi=value.moi;next.carte=updated;view.detail=next;}
        var oldMoi=previous && previous.moi,newMoi=value.moi;
        view.personalChanged(identity,value,!previous || previous.presence!==value.presence || (oldMoi ? oldMoi.statut : null)!==(newMoi ? newMoi.statut : null) || (oldMoi ? oldMoi.progression : 0)!==(newMoi ? newMoi.progression : 0));
    }}
    function loadPersonal(){if(personalEnabled)library.ensure(personalId);}
    function personalAction(note){
        if(!personalEnabled || personalPhase==='saving')return;
        if(!note && personalPhase==='ready' && personalEntry && personalEntry.editable && personalEntry.presence==='absent')library.save(personalId,{statut:'PLANNING'});
        else followup.open(personalId,card.titre,note);
    }
    function identity(c) {return c && c.anilist_id>0 ? {anilist_id:c.anilist_id} : c && c.franime && c.franime.id>0 ? {franime_id:c.franime.id} : null;}
    function episodeKey(c){var key=identity(c);return !key ? '' : key.anilist_id ? 'a:'+key.anilist_id : 'f:'+key.franime_id+':'+(c.franime.saison || 1);}
    function prepareEpisodes(){
        var next=card.a_lancer ? card.a_lancer.numero : (card.moi ? card.moi.progression+1 : 1),start=Math.max(1,Math.floor((Math.max(1,next)-1)/40)*40+1);
        if(episodeIdentity===episodeKey(card) && pageStart===start){
            episodeSelectionNumber=next;
            if(pendingEpisodesReady){var receive=pendingEpisodesReady;pendingEpisodesReady=null;receive();}
            else if(episodeData)for(var i=0;i<episodes.length;i++)if(episodes[i].numero===next)episodeIndex=i;
        }else loadEpisodes(start,next);
    }
    function posterArt(c){var local=artworks && c ? artworks.sources[String(c.anilist_id)] : null;return local && local.poster || (c ? c.affiche || '' : '');}
    function art(c) {if(!c)return '';var local=artworks && artworks.sources[String(c.anilist_id)];return local && (local.banner || local.card || local.poster) || c.banniere || c.affiche || '';}
    function open(c) {stack=[];opened=true;load(c);forceActiveFocus();}
    function scheduleDetailExtras(key,turn){
        if(!key || !key.anilist_id || detailExtrasInFlight)return;
        pendingDetailExtras=function(){
            if(!opened || !visible || turn!==generation)return;
            detailExtrasInFlight=true;
                transport.api('/tv/v1/catalog/detail-extras',key,45000,function(code,extra){
                if(!opened || turn!==generation)return;
                detailExtrasInFlight=false;
                if(code!==200 || !extra){extrasError='Certaines informations n’ont pas pu être chargées.';return;}
                var merged={};Object.keys(detail).forEach(function(k){merged[k]=detail[k];});Object.keys(extra).forEach(function(k){if(k!=='carte')merged[k]=extra[k];});merged.complements_a_charger=false;detail=merged;
                for(var j=0;j<seasons.length;j++)if(card.anilist_id && seasons[j].anilist_id===card.anilist_id)seasonIndex=j;
                });
        };if(visible)detailEnrichment.restart();
    }
    function scheduleEpisodeExtras(key,turn,parentTurn){
        if(!key || !key.anilist_id || episodeExtrasInFlight)return;
        pendingEpisodeExtras=function(){
            if(!opened || !visible || turn!==episodeGeneration || parentTurn!==generation)return;
            episodeExtrasInFlight=true;
                transport.api('/tv/v1/catalog/episode-extras',key,45000,function(code,extra){
                if(!opened || turn!==episodeGeneration || parentTurn!==generation)return;
                episodeExtrasInFlight=false;
                if(code!==200 || !extra || !Array.isArray(extra.episodes))return;
                var byNumber={};extra.episodes.forEach(function(e){byNumber[e.numero]=e;});
                var merged={},old=episodeData;Object.keys(old).forEach(function(k){merged[k]=old[k];});
                merged.episodes=old.episodes.map(function(e){return Episode.merge(e,byNumber[e.numero]);});merged.complements_a_charger=false;episodeData=merged;
                });
        };if(visible)episodeEnrichment.restart();
    }
    function stopExtras(){detailEnrichment.stop();episodeEnrichment.stop();pendingDetailExtras=null;pendingEpisodeExtras=null;detailExtrasInFlight=false;episodeExtrasInFlight=false;}
    function resumeExtras(){if(!opened || !visible)return;if(detail && detail.complements_a_charger)scheduleDetailExtras(identity(card),generation);if(episodeData && episodeData.complements_a_charger){var key=identity(card);if(key && key.anilist_id){key.debut=pageStart;key.nombre=40;scheduleEpisodeExtras(key,episodeGeneration,generation);}}}
    onVisibleChanged:{if(!visible){detailEnrichment.stop();episodeEnrichment.stop();stopPreview();}else {resumeExtras();if(previewWanted)previewDelay.restart();}}
    Timer {id:detailEnrichment;interval:1200;onTriggered:{var task=view.pendingDetailExtras;view.pendingDetailExtras=null;if(task)task();}}
    Timer {id:episodeEnrichment;interval:1200;onTriggered:{var task=view.pendingEpisodeExtras;view.pendingEpisodeExtras=null;if(task)task();}}
    function load(c) {
        if(episodeKey(c)===episodeKey(media) && Date.now()<detailRetryAt)return;
        stopExtras();
        fullPreview=false;stopPreview();previewSuspended=false;
        detailError='';detailRetryAt=0;
        var key=identity(c),turn=++generation;episodeGeneration++;media=c;detail=null;episodeData=null;extrasError='';state='loading';episodeState='loading';zone='actions';actionIndex=0;episodeIndex=0;relationIndex=0;castIndex=0;recommendationIndex=0;pageIndex=0;pageStart=1;
        french=false;languageIndex=0;viewport.contentY=0;
        episodeIdentity='';pendingEpisodesReady=null;
        if(!key || !transport){state='error';return;}
        loadPersonal();
        prepareEpisodes();
        artworks.request(c,'poster',true);
        artworks.request(c,'banner',true);
        transport.api('/tv/v1/catalog/detail',key,45000,function(status,value) {
            if(!opened || turn!==generation)return;
            if(status!==200 || !value || !value.carte || (key.anilist_id && value.carte.anilist_id!==key.anilist_id) || (key.franime_id && (!value.carte.franime || value.carte.franime.id!==key.franime_id))){detailError=RequestState.message(status,value,'La fiche est momentanément indisponible.');episodeRetrySeconds=RequestState.retrySeconds(status,value);detailRetryAt=Date.now()+episodeRetrySeconds*1000;episodeRetryAt=detailRetryAt;state='error';episodeState='error';pendingEpisodesReady=null;return;}
            detail=value;state='ready';seasonIndex=0;if(!key.anilist_id){loadPersonal();artworks.request(card,'poster',true);artworks.request(card,'banner',true);}console.info('ATLAS_TV_DETAIL_READY',card.anilist_id || 0);
            for(var i=0;i<seasons.length;i++)if(card.anilist_id && seasons[i].anilist_id===card.anilist_id)seasonIndex=i;
            prepareEpisodes();
            if(value.complements_a_charger)scheduleDetailExtras(key,turn);
        });
    }
    function loadEpisodes(start,selectedNumber) {
        episodeEnrichment.stop();pendingEpisodeExtras=null;
        var key=identity(card);if(episodeKey(card)===episodeIdentity && start===pageStart && episodeRetrySeconds>0)return;var turn=++episodeGeneration,parentTurn=generation;
        if(!key){episodeState='error';return;}
        if(key.franime_id)key.saison=card.franime.saison || 1;
        else {key.debut=start;key.nombre=40;}
        episodeExtrasInFlight=false;episodeError='';episodeRetrySeconds=0;episodeState='loading';episodeData=null;pageStart=start;episodeIndex=0;episodeIdentity=episodeKey(card);episodeSelectionNumber=selectedNumber;pendingEpisodesReady=null;
        transport.api('/tv/v1/catalog/episodes',key,45000,function(status,value){
            if(!opened || turn!==episodeGeneration || parentTurn!==generation)return;
            var receive=function(){
            if(!opened || turn!==episodeGeneration || parentTurn!==generation)return;
            if(extrasError==='Actualisation de la diffusion…')extrasError='';
            if(status!==200 || !value || !Array.isArray(value.episodes) || (key.anilist_id && value.anilist_id!==key.anilist_id)){episodeError=RequestState.message(status,value,'Les épisodes sont momentanément indisponibles.');episodeRetrySeconds=RequestState.retrySeconds(status,value);episodeRetryAt=Date.now()+episodeRetrySeconds*1000;episodeState='error';return;}
            episodeData=value;episodeState='ready';console.info('ATLAS_TV_EPISODES_READY',card.anilist_id || 0,episodes.length);
            for(var i=0;i<episodes.length;i++)if(episodes[i].numero===episodeSelectionNumber)episodeIndex=i;
            if(value.complements_a_charger)scheduleEpisodeExtras(key,turn,parentTurn);
            };
            if(state==='loading')pendingEpisodesReady=receive;else if(state==='ready')receive();
        });
    }
    Timer {interval:1000;repeat:true;running:view.episodeRetrySeconds>0;onTriggered:view.episodeRetrySeconds=Math.max(0,Math.ceil((view.episodeRetryAt-Date.now())/1000))}
    function remember() {return {media:media,detail:detail,episodeData:episodeData,zone:zone,actionIndex:actionIndex,episodeIndex:episodeIndex,seasonIndex:seasonIndex,relationIndex:relationIndex,castIndex:castIndex,recommendationIndex:recommendationIndex,pageStart:pageStart,french:french,languageIndex:languageIndex,scroll:viewport.contentY};}
    function visit(c) {if(!identity(c))return;stack=stack.slice(-11).concat([remember()]);load(c);forceActiveFocus();}
    function back() {
        console.info('ATLAS_TV_DETAIL_BACK',card && card.anilist_id || 0,stack.length,zone);
        generation++;episodeGeneration++;pendingEpisodesReady=null;
        stopExtras();
        fullPreview=false;stopPreview();previewSuspended=false;
        if(stack.length){var saved=stack[stack.length-1],turn=generation;stack=stack.slice(0,-1);media=saved.media;detail=saved.detail;episodeData=saved.episodeData;state=detail ? 'ready' : 'error';episodeState=episodeData ? 'ready' : 'error';zone=saved.zone;actionIndex=saved.actionIndex;episodeIndex=saved.episodeIndex;seasonIndex=saved.seasonIndex;relationIndex=saved.relationIndex;castIndex=saved.castIndex;recommendationIndex=saved.recommendationIndex;pageStart=saved.pageStart;french=saved.french;languageIndex=saved.languageIndex;forceActiveFocus();Qt.callLater(function(){if(view.opened && turn===view.generation){viewport.contentY=saved.scroll;view.resumeExtras();}});}
        else {opened=false;closed();}
    }
    function launch(e) {
        if(!card || !e)return;
        if(Episode.due(e)){extrasError='Actualisation de la diffusion…';loadEpisodes(pageStart,e.numero);return;}
        if(Episode.blocked(e)){extrasError=Episode.notice(e);return;}
        if(french && !(transport && transport.airingEnabled) && !(e.franime && e.franime.vf)){extrasError='Cet épisode n’est pas disponible en VF. Choisis VOSTFR.';return;}
        if(!(card.anilist_id>0)){extrasError='Cet animé doit être relié à AniList dans Atlas pour être lu sur la TV.';return;}
        extrasError='';detailEnrichment.stop();episodeEnrichment.stop();playRequested(card,{numero:e.numero,vf:french});
    }
    function primary() {
        if(state==='error'){load(media);return;}
        if(episodeState==='error'){loadEpisodes(pageStart,0);return;}
        if(episodeState!=='ready')return;
        var number=card && card.a_lancer ? card.a_lancer.numero : card && card.moi ? (card.moi.progression || 0)+1 : 1;
        for(var i=0;i<episodes.length;i++)if(episodes[i].numero===number){launch(episodes[i]);return;}
        if(currentEpisode)launch(currentEpisode);
    }
    function zones() {var list=['back','actions'];if(seasons.length>1)list.push('seasons');list.push('language');if(episodes.length)list.push('episodes');if(canPrevious || canNext)list.push('pages');if(relations.length)list.push('relations');if(cast.length)list.push('cast');if(recommendations.length)list.push('recommendations');list.push('about');return list;}
    function scrollToZone() {
        var item=zone==='seasons' ? seasonSection : zone==='language' || zone==='episodes' || zone==='pages' ? episodeSection : zone==='relations' ? relationSection : zone==='cast' ? castSection : zone==='recommendations' ? recommendationSection : zone==='about' ? aboutSection : null;
        viewport.contentY=item ? Math.min(item.y-16,Math.max(0,viewport.contentHeight-viewport.height)) : 0;
        if(zone==='episodes')episodeRail.positionViewAtIndex(episodeIndex,ListView.Contain);
    }
    function move(direction) {var list=zones(),at=list.indexOf(zone==='trailer' ? 'back' : zone),next=Math.max(0,Math.min(list.length-1,at+direction));if(next!==at)zone=list[next];if(zone==='language')languageIndex=french ? 1 : 0;scrollToZone();}
    function activate() {
        if(zone==='back')back();else if(zone==='actions'){if(actionIndex===1){zone=episodes.length ? 'episodes' : 'language';scrollToZone();}else if(actionIndex>=2)personalAction(actionIndex===3);else primary();}
        else if(zone==='trailer')openFullPreview();
        else if(zone==='seasons') {var c=seasons[seasonIndex];if(c && (!card || c.anilist_id!==card.anilist_id))visit(c);}
        else if(zone==='language'){if(languageIndex===0 || hasFrench || transport && transport.airingEnabled){french=languageIndex===1;extrasError='';}else extrasError='La VF n’est pas disponible pour cette saison.';}
        else if(zone==='episodes')launch(currentEpisode);
        else if(zone==='pages'){if(pageIndex===0 && canPrevious)loadEpisodes(Math.max(1,pageStart-40),0);else if(pageIndex===1 && canNext)loadEpisodes(pageStart+episodes.length,0);}
        else if(zone==='relations')visit(relations[relationIndex].carte);
        else if(zone==='recommendations')visit(recommendations[recommendationIndex]);
    }
    function horizontal(delta) {
        if(zone==='actions')actionIndex=Math.max(0,Math.min(personalEnabled ? 3 : 1,actionIndex+delta));
        else if(zone==='back' && delta>0 && hasTrailer)zone='trailer';
        else if(zone==='trailer' && delta<0)zone='back';
        else if(zone==='language')languageIndex=delta>0 ? 1 : 0;
        else if(zone==='seasons')seasonIndex=Math.max(0,Math.min(seasons.length-1,seasonIndex+delta));
        else if(zone==='episodes'){episodeIndex=Math.max(0,Math.min(episodes.length-1,episodeIndex+delta));episodeRail.positionViewAtIndex(episodeIndex,ListView.Contain);}
        else if(zone==='pages')pageIndex=delta>0 ? 1 : 0;
        else if(zone==='relations'){relationIndex=Math.max(0,Math.min(relations.length-1,relationIndex+delta));relationRail.positionViewAtIndex(relationIndex,ListView.Contain);}
        else if(zone==='cast'){castIndex=Math.max(0,Math.min(cast.length-1,castIndex+delta));castRail.positionViewAtIndex(castIndex,ListView.Contain);}
        else if(zone==='recommendations'){recommendationIndex=Math.max(0,Math.min(recommendations.length-1,recommendationIndex+delta));recommendationRail.positionViewAtIndex(recommendationIndex,ListView.Contain);}
    }
    Rectangle {x:0;y:view.previewReady ? view.headerHeight : 0;width:parent.width;height:parent.height-y;color:'#090a0d'}
    Flickable {
        id:viewport;objectName:'detailViewport';anchors.fill:parent;contentWidth:1280;contentHeight:content.height;interactive:false;clip:true;boundsBehavior:Flickable.StopAtBounds
        Behavior on contentY {enabled:!view.reducedMotion;NumberAnimation {duration:Motion.ms('scroll');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        Column {id:content;width:1280;spacing:20
            Item {id:header;width:1280;height:Math.max(308,headerText.height+108)
                Item {id:detailBackdrop;x:0;y:0;width:1280;height:header.height
                    HeroArtwork {x:620;y:0;width:660;height:parent.height;visible:!view.previewReady;retainPrevious:false;requestedSource:view.art(view.card);fallbackSource:view.posterArt(view.card);onFailed:view.artworks.failed(view.card,poster ? 'poster' : 'banner',failedSource);onImageReady:view.artworks.confirmed(view.card,poster ? 'poster' : 'banner',loadedSource)}
                }
                Rectangle {anchors.fill:parent;gradient:Gradient {orientation:Gradient.Horizontal;GradientStop {position:0;color:'#ff090a0d'} GradientStop {position:.45;color:'#dc090a0d'} GradientStop {position:1;color:'#20090a0d'}}}
                Rectangle {anchors.fill:parent;gradient:Gradient {GradientStop {position:.4;color:'#00090a0d'} GradientStop {position:1;color:'#ff090a0d'}}}
                HeroButton {x:64;y:28;width:138;iconKey:'arrow-left';label:'Retour';family:view.family;focused:view.zone==='back';onActivated:view.back()}
                Text {x:236;y:43;text:'Épisodes et détails';color:'#c6c9d3';font.family:view.family;font.pixelSize:19}
                HeroButton {objectName:'detailTrailerButton';x:996;y:28;width:220;iconKey:'play';label:'Bande-annonce';family:view.family;visible:view.hasTrailer;focused:view.zone==='trailer';onActivated:{view.zone='trailer';view.openFullPreview();}}
                Rectangle {x:64;y:100;width:140;height:196;radius:10;color:'#242731'
                    Image {id:poster;objectName:'detailPoster';anchors.fill:parent;source:view.posterArt(view.card);asynchronous:true;fillMode:Image.PreserveAspectCrop;sourceSize.width:280;visible:false;onStatusChanged:if(status===Image.Error)view.artworks.failed(view.card,'poster',source);else if(status===Image.Ready)view.artworks.confirmed(view.card,'poster',source)}
                    OpacityMask {anchors.fill:parent;source:poster;maskSource:Rectangle {width:140;height:196;radius:10}}
                }
                Column {id:headerText;x:236;y:100;width:944;spacing:10
                    Text {width:820;text:view.card ? view.card.titre || '' : '';textFormat:Text.PlainText;color:'white';font.family:view.family;font.pixelSize:34;font.weight:Font.Bold;maximumLineCount:2;wrapMode:Text.WordWrap;elide:Text.ElideRight}
                    Text {width:944;elide:Text.ElideRight;text:view.card ? [view.card.annee,view.card.format==='MOVIE' ? 'Film' : 'Série',Episode.seriesLabel(view.episodeData) || Episode.seriesLabel(view.card),view.card.score ? (view.card.score/10).toFixed(1).replace('.',',')+' / 10' : ''].filter(function(v){return !!v;}).join('   ·   ') : '';color:'#d0d1d8';font.family:view.family;font.pixelSize:18}
                    Item {width:790;height:summarySkeleton.active ? 48 : summaryText.implicitHeight
                    LoadingSkeleton {id:summarySkeleton;anchors.fill:parent;layout:'text';active:view.state==='loading' && !(view.card && view.card.resume)}
                    Text {id:summaryText;objectName:'detailSummary';width:790;text:view.detail ? view.detail.resume_complet || '' : view.state==='error' ? view.detailError || 'La fiche est indisponible pour le moment.' : view.card && typeof view.card.resume==='string' && view.card.resume ? view.card.resume : '';textFormat:Text.PlainText;color:'#d0d1d8';font.family:view.family;font.pixelSize:18;lineHeight:1.25;maximumLineCount:2;wrapMode:Text.WordWrap;elide:Text.ElideRight;visible:!summarySkeleton.active}
                    }
                    Row {spacing:14
                        HeroButton {objectName:'detailPlay';width:320;iconKey:'play';label:view.state==='error' || view.episodeState==='error' ? (view.episodeRetrySeconds>0 ? 'Réessayer · '+view.episodeRetrySeconds+' s' : 'Réessayer') : (view.card && view.card.a_lancer ? 'Reprendre · Ép. '+view.card.a_lancer.numero : 'Lecture')+' · '+(view.french ? 'VF' : 'VOSTFR');family:view.family;primary:true;groupHasFocus:true;focused:view.zone==='actions' && view.actionIndex===0;onActivated:view.primary()}
                        HeroButton {width:160;label:'Épisodes';family:view.family;focused:view.zone==='actions' && view.actionIndex===1;onActivated:{view.zone='actions';view.actionIndex=1;view.activate();}}
                        HeroButton {objectName:'detailList';width:174;visible:view.personalEnabled;label:view.personalPhase==='saving' ? 'Enregistrement…' : view.personalPending && !view.personalEntry ? 'Ma liste…' : view.personalEntry && view.personalEntry.presence==='absent' ? '+ Ma liste' : view.personalEntry && view.personalEntry.moi ? Personal.statusLabel(view.personalEntry.moi.statut) : 'Ma liste';iconKey:view.personalEntry && view.personalEntry.presence==='present' ? 'check' : '';family:view.family;focused:view.zone==='actions' && view.actionIndex===2;onActivated:{view.zone='actions';view.actionIndex=2;view.personalAction(false)}}
                        HeroButton {objectName:'detailRate';width:160;visible:view.personalEnabled;label:view.personalPending && !view.personalEntry ? 'Note…' : view.personalEntry && view.personalEntry.moi && view.personalEntry.moi.note ? 'Ta note · '+Personal.score(view.personalEntry.moi.note) : 'Noter';family:view.family;focused:view.zone==='actions' && view.actionIndex===3;onActivated:{view.zone='actions';view.actionIndex=3;view.personalAction(true)}}
                    }
                }
            }
            Column {id:seasonSection;x:64;width:1152;spacing:14;visible:view.seasons.length>1
                ListView {id:seasonRail;width:1152;height:58;orientation:ListView.Horizontal;spacing:12;clip:true;interactive:false;model:view.seasons;currentIndex:view.seasonIndex;onCurrentIndexChanged:positionViewAtIndex(currentIndex,ListView.Contain)
                    delegate:HeroButton {width:Math.min(420,Math.max(210,seasonLabel.implicitWidth+42));label:modelData.titre || '';family:view.family;focused:view.zone==='seasons' && view.seasonIndex===index;selected:view.card && modelData.anilist_id===view.card.anilist_id;onActivated:{view.seasonIndex=index;view.zone='seasons';view.activate();}
                        Text {id:seasonLabel;text:modelData.titre || '';font.family:view.family;font.pixelSize:19;visible:false}
                    }
                }
            }
            Column {id:episodeSection;x:64;width:1152;spacing:12
                Row {width:1152;spacing:24
                    Text {objectName:'detailEpisodeCount';width:760;anchors.verticalCenter:parent.verticalCenter;text:Episode.heading(view.episodeData || view.card);color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.DemiBold;elide:Text.ElideRight}
                    Row {spacing:10
                        HeroButton {objectName:'episodeLanguage';width:160;label:'VOSTFR';family:view.family;selected:!view.french;focused:view.zone==='language' && view.languageIndex===0;onActivated:{view.zone='language';view.languageIndex=0;view.activate();}
                            Rectangle {x:20;y:parent.height-5;width:parent.width-40;height:3;radius:1.5;color:view.zone==='language' && view.languageIndex===0 ? '#16181d' : 'white';visible:!view.french}
                        }
                        HeroButton {width:160;label:'VF';family:view.family;selected:view.french;opacity:view.hasFrench || view.transport && view.transport.airingEnabled ? 1 : .35;focused:view.zone==='language' && view.languageIndex===1;onActivated:{view.zone='language';view.languageIndex=1;view.activate();}
                            Rectangle {x:20;y:parent.height-5;width:parent.width-40;height:3;radius:1.5;color:view.zone==='language' && view.languageIndex===1 ? '#16181d' : 'white';visible:view.french}
                        }
                    }
                }
                Text {objectName:'detailAiringSummary';width:1152;text:Episode.airingDetail(view.episodeData);visible:!!text;color:'#969eaf';font.family:view.family;font.pixelSize:16}
                Text {width:1152;text:view.french ? 'Version française sélectionnée pour la lecture' : 'Version originale sous-titrée en français sélectionnée';color:'#c1c5d0';font.family:view.family;font.pixelSize:17}
                Text {height:visible ? implicitHeight : 0;visible:view.episodeState==='error' && view.state!=='error' || view.episodeState==='ready' && !view.episodes.length; text:view.episodeState==='error' ? view.episodeError || 'Les épisodes sont momentanément indisponibles.' : 'Aucun épisode à afficher.';color:'#b6b8c3';font.family:view.family;font.pixelSize:19}
                Item {width:1152;height:visible ? 232 : 0;visible:view.episodeState==='loading';LoadingSkeleton {objectName:'episodeSkeleton';anchors.fill:parent;layout:'episodes';active:parent.visible && view.opened}}
                ListView {id:episodeRail;objectName:'detailEpisodes';width:1152;height:view.episodes.length ? 232 : 0;orientation:ListView.Horizontal;spacing:20;clip:true;interactive:false;model:view.episodes;cacheBuffer:0
                    delegate:Item {width:366;height:230
                        property bool upcoming:Episode.future(modelData)
                        property bool targeted:view.zone==='episodes' && view.episodeIndex===index
                        Item {id:episodePicture;x:6;y:12;width:350;height:197;scale:parent.targeted && !view.reducedMotion ? 1.025 : 1
                            Behavior on scale {enabled:!view.reducedMotion;NumberAnimation {duration:Motion.ms('focus');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
                            Rectangle {anchors.fill:parent;radius:12;color:'#21242c'}
                            Image {id:episodeImage;anchors.fill:parent;source:parent.parent.upcoming ? view.art(view.card) : modelData.vignette || view.art(view.card);sourceSize.width:700;asynchronous:true;fillMode:Image.PreserveAspectCrop;visible:false}
                            OpacityMask {anchors.fill:parent;source:episodeImage;opacity:parent.parent.upcoming ? .22 : 1;maskSource:Rectangle {width:350;height:197;radius:12}}
                            Rectangle {anchors.fill:parent;radius:12;color:'#20000000';border.width:2;border.color:parent.parent.targeted ? 'white' : 'transparent'}
                            Rectangle {x:12;y:12;width:38;height:30;radius:6;color:'#d0090a0d';Text {anchors.centerIn:parent;text:modelData.numero;color:'white';font.family:view.family;font.pixelSize:18;font.weight:Font.DemiBold}}
                            Rectangle {x:12;y:episodePicture.height-12;width:326;height:3;radius:1.5;color:modelData.vu ? 'white' : '#40ffffff';visible:!parent.parent.upcoming}
                            Text {x:20;y:150;width:310;text:parent.parent.upcoming ? Episode.dateLabel(modelData.diffusion.date) : (modelData.vu ? 'Vu' : '')+(modelData.duree ? (modelData.vu ? '  ·  ' : '')+modelData.duree+' min' : '');color:'white';font.family:view.family;font.pixelSize:16;style:Text.Outline;styleColor:'#80000000';elide:Text.ElideRight}
                            Rectangle {x:242;y:12;width:94;height:28;radius:7;color:'#d9090a0d';visible:parent.parent.upcoming;Text {anchors.centerIn:parent;text:'À venir';font.family:view.family;font.pixelSize:15;font.weight:Font.DemiBold;color:'#d7dbe5'}}
                        }
                        MouseArea {anchors.fill:parent;onClicked:{view.zone='episodes';view.episodeIndex=index;view.launch(modelData);}}
                    }
                }
                Text {width:1152;text:view.currentEpisode ? view.currentEpisode.numero+'. '+(view.currentEpisode.titre || 'Épisode '+view.currentEpisode.numero) : '';textFormat:Text.PlainText;color:'white';font.family:view.family;font.pixelSize:23;font.weight:Font.DemiBold;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight}
                Text {objectName:'episodeAiringNotice';width:1152;text:Episode.notice(view.currentEpisode,view.french);visible:!!text;textFormat:Text.PlainText;color:'#bec5d3';font.family:view.family;font.pixelSize:18;elide:Text.ElideRight}
                Text {width:1000;text:view.currentEpisode ? view.currentEpisode.resume || '' : '';textFormat:Text.PlainText;color:'#aeb1bd';font.family:view.family;font.pixelSize:18;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight}
                Row {spacing:14;visible:view.canPrevious || view.canNext
                    HeroButton {width:238;label:'Épisodes précédents';family:view.family;opacity:view.canPrevious ? 1 : .35;focused:view.zone==='pages' && view.pageIndex===0;onActivated:{view.pageIndex=0;view.zone='pages';view.activate();}}
                    HeroButton {width:238;label:'Épisodes suivants';family:view.family;opacity:view.canNext ? 1 : .35;focused:view.zone==='pages' && view.pageIndex===1;onActivated:{view.pageIndex=1;view.zone='pages';view.activate();}}
                }
            }
            Column {id:relationSection;x:50;width:1180;spacing:6;visible:view.relations.length>0
                Text {x:14;text:'De la même histoire';color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.DemiBold}
                ListView {id:relationRail;width:1180;height:245;orientation:ListView.Horizontal;spacing:8;clip:true;interactive:false;cacheBuffer:0;model:view.relations
                    delegate:Column {width:266;height:245
                        FocusCard {title:modelData.carte.titre;family:view.family;artwork:view.art(modelData.carte);focused:view.zone==='relations' && view.relationIndex===index;onActivated:view.visit(modelData.carte);onArtworkFailed:view.artworks.failed(modelData.carte,poster ? 'poster' : 'banner',failedSource);onArtworkReady:view.artworks.confirmed(modelData.carte,poster ? 'poster' : 'banner',loadedSource)}
                        Text {x:14;width:238;text:modelData.lien || '';textFormat:Text.PlainText;color:'#aeb1bd';font.family:view.family;font.pixelSize:16;elide:Text.ElideRight}
                    }
                }
            }
            Column {id:castSection;x:64;width:1152;spacing:18;visible:view.cast.length>0
                Text {text:'Personnages et voix';color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.DemiBold}
                ListView {id:castRail;width:1152;height:215;orientation:ListView.Horizontal;spacing:24;interactive:false;clip:true;cacheBuffer:0;model:view.cast
                    delegate:Item {width:184;height:215
                        Rectangle {x:29;y:3;width:126;height:126;radius:63;color:'#242731';border.color:view.zone==='cast' && view.castIndex===index ? 'white' : 'transparent';border.width:2
                            Image {id:portrait;anchors.fill:parent;anchors.margins:4;source:modelData.image || '';sourceSize.width:240;fillMode:Image.PreserveAspectCrop;asynchronous:true;visible:false}
                            OpacityMask {anchors.fill:portrait;source:portrait;maskSource:Rectangle {width:118;height:118;radius:59}}
                            Text {anchors.centerIn:parent;visible:portrait.status!==Image.Ready;text:(modelData.nom || '?').slice(0,1);color:'white';font.family:view.family;font.pixelSize:32}
                        }
                        Text {y:143;width:184;text:modelData.nom || '';textFormat:Text.PlainText;horizontalAlignment:Text.AlignHCenter;color:'white';font.family:view.family;font.pixelSize:18;elide:Text.ElideRight}
                        Text {y:172;width:184;text:modelData.doubleur ? modelData.doubleur.nom : modelData.role || '';textFormat:Text.PlainText;horizontalAlignment:Text.AlignHCenter;color:'#aeb1bd';font.family:view.family;font.pixelSize:16;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight}
                    }
                }
            }
            Column {id:recommendationSection;x:50;width:1180;spacing:6;visible:view.recommendations.length>0
                Text {x:14;text:'Dans le même esprit';color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.DemiBold}
                ListView {id:recommendationRail;width:1180;height:215;orientation:ListView.Horizontal;spacing:8;clip:true;interactive:false;cacheBuffer:0;model:view.recommendations
                    delegate:FocusCard {title:modelData.titre;family:view.family;artwork:view.art(modelData);focused:view.zone==='recommendations' && view.recommendationIndex===index;onActivated:view.visit(modelData);onArtworkFailed:view.artworks.failed(modelData,poster ? 'poster' : 'banner',failedSource);onArtworkReady:view.artworks.confirmed(modelData,poster ? 'poster' : 'banner',loadedSource)}
                }
            }
            Column {id:aboutSection;x:64;width:1152;spacing:18
                Text {text:'À propos';color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.DemiBold}
                Text {width:1060;text:view.detail ? view.detail.resume_complet || '' : '';textFormat:Text.PlainText;color:'#c5c7d0';font.family:view.family;font.pixelSize:20;lineHeight:1.35;wrapMode:Text.WordWrap}
                Text {width:1060;text:view.detail && view.detail.infos ? ['Studios : '+(view.detail.infos.studios || []).join(', '),(view.card && view.card.genres || []).join(' · ')].join('\n') : '';textFormat:Text.PlainText;color:'#aeb1bd';font.family:view.family;font.pixelSize:18;wrapMode:Text.WordWrap}
                Text {width:1060;text:view.extrasError;visible:!!text;color:'#e8c99b';font.family:view.family;font.pixelSize:18;wrapMode:Text.WordWrap}
            }
            Item {width:1280;height:60}
        }
    }
    Rectangle {x:64;y:652;width:1152;height:44;radius:10;color:'#ed282019';visible:!!view.extrasError
        Text {anchors.fill:parent;anchors.margins:12;text:view.extrasError;color:'#f0d6b2';font.family:view.family;font.pixelSize:17;elide:Text.ElideRight}
    }
    Keys.onPressed: {
        if(followup.opened){followup.key(event.key);event.accepted=true;return;}
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape)back();
        else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select)activate();
        else if(event.key===Qt.Key_Down){if(zone==='about')viewport.contentY=Math.min(viewport.contentY+360,Math.max(0,viewport.contentHeight-viewport.height));else move(1);}
        else if(event.key===Qt.Key_Up){if(zone==='about' && viewport.contentY>aboutSection.y-20)viewport.contentY=Math.max(aboutSection.y-28,viewport.contentY-360);else move(-1);}
        else if(event.key===Qt.Key_Right)horizontal(1);else if(event.key===Qt.Key_Left)horizontal(-1);else return;
        event.accepted=true;
    }
    LibraryEditor {id:followup;anchors.fill:parent;z:20;store:library;family:view.family;reducedMotion:view.reducedMotion;onClosed:view.forceActiveFocus()}
}
