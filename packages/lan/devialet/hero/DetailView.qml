import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion

FocusScope {
    id: view
    objectName: 'atlasDetail'
    property var transport
    property var artworks
    property string family: 'sans-serif'
    property bool reducedMotion: false
    property bool opened: false
    property var media: null
    property var detail: null
    property var episodeData: null
    property string state: 'loading'
    property string episodeState: 'loading'
    property string extrasError: ''
    property int generation: 0
    property int episodeGeneration: 0
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
    readonly property bool canNext: !!episodeData && pageStart+episodes.length<=episodeData.total
    readonly property bool hasFrench: episodes.some(function(e){return e.franime && e.franime.vf;}) || !!(card && card.franime && card.franime.vf)
    signal closed()
    signal playRequested(var media,var target)
    function identity(c) {return c && c.anilist_id>0 ? {anilist_id:c.anilist_id} : c && c.franime && c.franime.id>0 ? {franime_id:c.franime.id} : null;}
    function art(c) {if(!c)return '';var local=artworks && artworks.sources[String(c.anilist_id)];return local && (local.banner || local.card || local.poster) || c.banniere || c.affiche || '';}
    function open(c) {stack=[];opened=true;load(c);forceActiveFocus();}
    function load(c) {
        var key=identity(c),turn=++generation;episodeGeneration++;media=c;detail=null;episodeData=null;extrasError='';state='loading';episodeState='loading';zone='actions';actionIndex=0;episodeIndex=0;relationIndex=0;castIndex=0;recommendationIndex=0;pageIndex=0;pageStart=1;
        french=!!(c && (c.a_lancer ? c.a_lancer.vf : c.franime && c.franime.vf));languageIndex=french ? 1 : 0;viewport.contentY=0;
        if(!key || !transport){state='error';return;}
        artworks.request(c,'banner',true);
        transport.api('/tv/v1/catalog/detail',key,45000,function(status,value) {
            if(!opened || turn!==generation)return;
            if(status!==200 || !value || !value.carte || (key.anilist_id && value.carte.anilist_id!==key.anilist_id) || (key.franime_id && (!value.carte.franime || value.carte.franime.id!==key.franime_id))){state='error';return;}
            detail=value;state='ready';seasonIndex=0;console.info('ATLAS_TV_DETAIL_READY',card.anilist_id || 0);
            for(var i=0;i<seasons.length;i++)if(card.anilist_id && seasons[i].anilist_id===card.anilist_id)seasonIndex=i;
            var next=card.a_lancer ? card.a_lancer.numero : (card.moi ? card.moi.progression+1 : 1);
            loadEpisodes(Math.max(1,Math.floor((Math.max(1,next)-1)/40)*40+1),next);
            if(value.complements_a_charger && key.anilist_id)transport.api('/tv/v1/catalog/detail-extras',key,45000,function(code,extra){
                if(!opened || turn!==generation)return;
                if(code!==200 || !extra){extrasError='Certaines informations n’ont pas pu être chargées.';return;}
                var merged={};Object.keys(detail).forEach(function(k){merged[k]=detail[k];});Object.keys(extra).forEach(function(k){if(k!=='carte')merged[k]=extra[k];});detail=merged;
                for(var j=0;j<seasons.length;j++)if(card.anilist_id && seasons[j].anilist_id===card.anilist_id)seasonIndex=j;
            });
        });
    }
    function loadEpisodes(start,selectedNumber) {
        var key=identity(card),turn=++episodeGeneration,parentTurn=generation;
        if(!key){episodeState='error';return;}
        if(key.franime_id)key.saison=card.franime.saison || 1;
        else {key.debut=start;key.nombre=40;}
        episodeState='loading';episodeData=null;pageStart=start;episodeIndex=0;
        transport.api('/tv/v1/catalog/episodes',key,45000,function(status,value){
            if(!opened || turn!==episodeGeneration || parentTurn!==generation)return;
            if(status!==200 || !value || !Array.isArray(value.episodes) || (key.anilist_id && value.anilist_id!==key.anilist_id)){episodeState='error';return;}
            episodeData=value;episodeState='ready';console.info('ATLAS_TV_EPISODES_READY',card.anilist_id || 0,episodes.length);
            for(var i=0;i<episodes.length;i++)if(episodes[i].numero===selectedNumber)episodeIndex=i;
            if(value.complements_a_charger && key.anilist_id)transport.api('/tv/v1/catalog/episode-extras',key,45000,function(code,extra){
                if(!opened || turn!==episodeGeneration || parentTurn!==generation || code!==200 || !extra || !Array.isArray(extra.episodes))return;
                var byNumber={};extra.episodes.forEach(function(e){byNumber[e.numero]=e;});
                var merged={},old=episodeData;Object.keys(old).forEach(function(k){merged[k]=old[k];});
                merged.episodes=old.episodes.map(function(e){var result={},more=byNumber[e.numero] || {};Object.keys(e).forEach(function(k){result[k]=e[k];});Object.keys(more).forEach(function(k){if(k!=='numero' && k!=='vu' && k!=='franime')result[k]=more[k];});return result;});episodeData=merged;
            });
        });
    }
    function remember() {return {media:media,detail:detail,episodeData:episodeData,zone:zone,actionIndex:actionIndex,episodeIndex:episodeIndex,seasonIndex:seasonIndex,relationIndex:relationIndex,castIndex:castIndex,recommendationIndex:recommendationIndex,pageStart:pageStart,french:french,languageIndex:languageIndex,scroll:viewport.contentY};}
    function visit(c) {if(!identity(c))return;stack=stack.slice(-11).concat([remember()]);load(c);forceActiveFocus();}
    function back() {
        console.info('ATLAS_TV_DETAIL_BACK',card && card.anilist_id || 0,stack.length,zone);
        generation++;episodeGeneration++;
        if(stack.length){var saved=stack[stack.length-1],turn=generation;stack=stack.slice(0,-1);media=saved.media;detail=saved.detail;episodeData=saved.episodeData;state=detail ? 'ready' : 'error';episodeState=episodeData ? 'ready' : 'error';zone=saved.zone;actionIndex=saved.actionIndex;episodeIndex=saved.episodeIndex;seasonIndex=saved.seasonIndex;relationIndex=saved.relationIndex;castIndex=saved.castIndex;recommendationIndex=saved.recommendationIndex;pageStart=saved.pageStart;french=saved.french;languageIndex=saved.languageIndex;forceActiveFocus();Qt.callLater(function(){if(view.opened && turn===view.generation)viewport.contentY=saved.scroll;});}
        else {opened=false;closed();}
    }
    function launch(e) {
        if(!card || !e)return;
        if(french && !(e.franime && e.franime.vf)){extrasError='Cet épisode n’est pas disponible en VF. Choisis VOSTFR.';return;}
        if(!(card.anilist_id>0)){extrasError='Cet animé doit être relié à AniList dans Atlas pour être lu sur la TV.';return;}
        extrasError='';playRequested(card,{numero:e.numero,vf:french});
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
        viewport.contentY=item ? Math.min(item.y-28,Math.max(0,viewport.contentHeight-viewport.height)) : 0;
        if(zone==='episodes')episodeRail.positionViewAtIndex(episodeIndex,ListView.Contain);
    }
    function move(direction) {var list=zones(),at=list.indexOf(zone);zone=list[Math.max(0,Math.min(list.length-1,at+direction))];if(zone==='language')languageIndex=french ? 1 : 0;scrollToZone();}
    function activate() {
        if(zone==='back')back();else if(zone==='actions'){if(actionIndex===1){zone=episodes.length ? 'episodes' : 'language';scrollToZone();}else primary();}
        else if(zone==='seasons') {var c=seasons[seasonIndex];if(c && (!card || c.anilist_id!==card.anilist_id))visit(c);}
        else if(zone==='language'){if(languageIndex===0 || hasFrench){french=languageIndex===1;extrasError='';}else extrasError='La VF n’est pas disponible pour cette saison.';}
        else if(zone==='episodes')launch(currentEpisode);
        else if(zone==='pages'){if(pageIndex===0 && canPrevious)loadEpisodes(Math.max(1,pageStart-40),0);else if(pageIndex===1 && canNext)loadEpisodes(pageStart+episodes.length,0);}
        else if(zone==='relations')visit(relations[relationIndex].carte);
        else if(zone==='recommendations')visit(recommendations[recommendationIndex]);
    }
    function horizontal(delta) {
        if(zone==='actions')actionIndex=Math.max(0,Math.min(1,actionIndex+delta));
        else if(zone==='language')languageIndex=delta>0 ? 1 : 0;
        else if(zone==='seasons')seasonIndex=Math.max(0,Math.min(seasons.length-1,seasonIndex+delta));
        else if(zone==='episodes'){episodeIndex=Math.max(0,Math.min(episodes.length-1,episodeIndex+delta));episodeRail.positionViewAtIndex(episodeIndex,ListView.Contain);}
        else if(zone==='pages')pageIndex=delta>0 ? 1 : 0;
        else if(zone==='relations'){relationIndex=Math.max(0,Math.min(relations.length-1,relationIndex+delta));relationRail.positionViewAtIndex(relationIndex,ListView.Contain);}
        else if(zone==='cast'){castIndex=Math.max(0,Math.min(cast.length-1,castIndex+delta));castRail.positionViewAtIndex(castIndex,ListView.Contain);}
        else if(zone==='recommendations'){recommendationIndex=Math.max(0,Math.min(recommendations.length-1,recommendationIndex+delta));recommendationRail.positionViewAtIndex(recommendationIndex,ListView.Contain);}
    }
    Rectangle {anchors.fill:parent;color:'#090a0d'}
    Flickable {
        id:viewport;objectName:'detailViewport';anchors.fill:parent;contentWidth:1280;contentHeight:content.height;interactive:false;clip:true;boundsBehavior:Flickable.StopAtBounds
        Behavior on contentY {enabled:!view.reducedMotion;NumberAnimation {duration:Motion.ms('scroll');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        Column {id:content;width:1280;spacing:20
            Item {id:header;width:1280;height:Math.max(308,headerText.height+108)
                HeroArtwork {x:620;y:0;width:660;height:header.height;retainPrevious:false;requestedSource:view.art(view.card);fallbackSource:view.card ? view.card.affiche || '' : '';onFailed:view.artworks.request(view.card,poster ? 'poster' : 'banner',true)}
                Rectangle {anchors.fill:parent;gradient:Gradient {orientation:Gradient.Horizontal;GradientStop {position:0;color:'#ff090a0d'} GradientStop {position:.45;color:'#dc090a0d'} GradientStop {position:1;color:'#20090a0d'}}}
                Rectangle {anchors.fill:parent;gradient:Gradient {GradientStop {position:.4;color:'#00090a0d'} GradientStop {position:1;color:'#ff090a0d'}}}
                HeroButton {x:64;y:28;width:138;iconKey:'arrow-left';label:'Retour';family:view.family;focused:view.zone==='back';onActivated:view.back()}
                Text {x:236;y:43;text:'Épisodes et détails';color:'#c6c9d3';font.family:view.family;font.pixelSize:19}
                Rectangle {x:64;y:100;width:140;height:196;radius:10;color:'#242731'
                    Image {id:poster;anchors.fill:parent;source:{var local=view.artworks && view.card ? view.artworks.sources[String(view.card.anilist_id)] : null;return local && local.poster || (view.card ? view.card.affiche || '' : '');}asynchronous:true;fillMode:Image.PreserveAspectCrop;sourceSize.width:280;visible:false;onStatusChanged:if(status===Image.Error)view.artworks.request(view.card,'poster',true)}
                    OpacityMask {anchors.fill:parent;source:poster;maskSource:Rectangle {width:140;height:196;radius:10}}
                }
                Column {id:headerText;x:236;y:100;width:820;spacing:10
                    Text {width:820;text:view.card ? view.card.titre || '' : '';textFormat:Text.PlainText;color:'white';font.family:view.family;font.pixelSize:34;font.weight:Font.Bold;maximumLineCount:2;wrapMode:Text.WordWrap;elide:Text.ElideRight}
                    Text {text:view.card ? [view.card.annee,view.card.format==='MOVIE' ? 'Film' : 'Série',view.card.episodes ? view.card.episodes+' épisodes' : '',view.card.score ? (view.card.score/10).toFixed(1).replace('.',',')+' / 10' : ''].filter(function(v){return !!v;}).join('   ·   ') : '';color:'#d0d1d8';font.family:view.family;font.pixelSize:18}
                    Text {width:790;text:view.detail ? view.detail.resume_complet || '' : view.state==='error' ? 'La fiche est indisponible pour le moment.' : 'Chargement de la fiche…';textFormat:Text.PlainText;color:'#d0d1d8';font.family:view.family;font.pixelSize:18;lineHeight:1.25;maximumLineCount:2;wrapMode:Text.WordWrap;elide:Text.ElideRight}
                    Row {spacing:14
                        HeroButton {objectName:'detailPlay';width:320;iconKey:'play';label:view.state==='error' || view.episodeState==='error' ? 'Réessayer' : (view.card && view.card.a_lancer ? 'Reprendre · Ép. '+view.card.a_lancer.numero : 'Lecture')+' · '+(view.french ? 'VF' : 'VOSTFR');family:view.family;primary:true;groupHasFocus:true;focused:view.zone==='actions' && view.actionIndex===0;onActivated:view.primary()}
                        HeroButton {width:160;label:'Épisodes';family:view.family;focused:view.zone==='actions' && view.actionIndex===1;onActivated:{view.zone='actions';view.actionIndex=1;view.activate();}}
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
                    Text {width:760;anchors.verticalCenter:parent.verticalCenter;text:'Épisodes'+(view.episodeData && view.episodeData.total ? ' · '+view.episodeData.total+' au total' : '');color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.DemiBold}
                    Row {spacing:10
                        HeroButton {objectName:'episodeLanguage';width:160;label:'VOSTFR';family:view.family;selected:!view.french;focused:view.zone==='language' && view.languageIndex===0;onActivated:{view.zone='language';view.languageIndex=0;view.activate();}
                            Rectangle {x:20;y:parent.height-5;width:parent.width-40;height:3;radius:1.5;color:view.zone==='language' && view.languageIndex===0 ? '#16181d' : 'white';visible:!view.french}
                        }
                        HeroButton {width:160;label:'VF';family:view.family;selected:view.french;opacity:view.hasFrench ? 1 : .35;focused:view.zone==='language' && view.languageIndex===1;onActivated:{view.zone='language';view.languageIndex=1;view.activate();}
                            Rectangle {x:20;y:parent.height-5;width:parent.width-40;height:3;radius:1.5;color:view.zone==='language' && view.languageIndex===1 ? '#16181d' : 'white';visible:view.french}
                        }
                    }
                }
                Text {width:1152;text:view.french ? 'Version française sélectionnée pour la lecture' : 'Version originale sous-titrée en français sélectionnée';color:'#c1c5d0';font.family:view.family;font.pixelSize:17}
                Text {height:visible ? implicitHeight : 0;visible:view.episodeState!=='ready' || !view.episodes.length; text:view.episodeState==='loading' ? 'Chargement des épisodes…' : view.episodeState==='error' ? 'Épisodes indisponibles. Choisis Réessayer en haut de la fiche.' : 'Aucun épisode disponible.';color:'#b6b8c3';font.family:view.family;font.pixelSize:19}
                ListView {id:episodeRail;objectName:'detailEpisodes';width:1152;height:view.episodes.length ? 232 : 0;orientation:ListView.Horizontal;spacing:20;clip:true;interactive:false;model:view.episodes;cacheBuffer:0
                    delegate:Item {width:366;height:230
                        property bool targeted:view.zone==='episodes' && view.episodeIndex===index
                        Item {id:episodePicture;x:6;y:12;width:350;height:197;scale:parent.targeted && !view.reducedMotion ? 1.025 : 1
                            Behavior on scale {enabled:!view.reducedMotion;NumberAnimation {duration:Motion.ms('focus');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
                            Rectangle {anchors.fill:parent;radius:12;color:'#21242c'}
                            Image {id:episodeImage;anchors.fill:parent;source:modelData.vignette || view.art(view.card);sourceSize.width:700;asynchronous:true;fillMode:Image.PreserveAspectCrop;visible:false}
                            OpacityMask {anchors.fill:parent;source:episodeImage;maskSource:Rectangle {width:350;height:197;radius:12}}
                            Rectangle {anchors.fill:parent;radius:12;color:'#20000000';border.width:2;border.color:parent.parent.targeted ? 'white' : 'transparent'}
                            Rectangle {x:12;y:12;width:38;height:30;radius:6;color:'#d0090a0d';Text {anchors.centerIn:parent;text:modelData.numero;color:'white';font.family:view.family;font.pixelSize:18;font.weight:Font.DemiBold}}
                            Rectangle {x:12;y:episodePicture.height-12;width:326;height:3;radius:1.5;color:modelData.vu ? 'white' : '#40ffffff'}
                            Text {x:20;y:150;width:310;text:(modelData.vu ? 'Vu' : '')+(modelData.duree ? (modelData.vu ? '  ·  ' : '')+modelData.duree+' min' : '');color:'white';font.family:view.family;font.pixelSize:16;style:Text.Outline;styleColor:'#80000000'}
                        }
                        MouseArea {anchors.fill:parent;onClicked:{view.zone='episodes';view.episodeIndex=index;view.launch(modelData);}}
                    }
                }
                Text {width:1152;text:view.currentEpisode ? view.currentEpisode.numero+'. '+(view.currentEpisode.titre || 'Épisode '+view.currentEpisode.numero) : '';textFormat:Text.PlainText;color:'white';font.family:view.family;font.pixelSize:23;font.weight:Font.DemiBold;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight}
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
                        FocusCard {title:modelData.carte.titre;family:view.family;artwork:view.art(modelData.carte);focused:view.zone==='relations' && view.relationIndex===index;onActivated:view.visit(modelData.carte);onArtworkFailed:view.artworks.request(modelData.carte,'banner',true)}
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
                    delegate:FocusCard {title:modelData.titre;family:view.family;artwork:view.art(modelData);focused:view.zone==='recommendations' && view.recommendationIndex===index;onActivated:view.visit(modelData);onArtworkFailed:view.artworks.request(modelData,'banner',true)}
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
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape)back();
        else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter || event.key===Qt.Key_Select)activate();
        else if(event.key===Qt.Key_Down){if(zone==='about')viewport.contentY=Math.min(viewport.contentY+360,Math.max(0,viewport.contentHeight-viewport.height));else move(1);}
        else if(event.key===Qt.Key_Up){if(zone==='about' && viewport.contentY>aboutSection.y-20)viewport.contentY=Math.max(aboutSection.y-28,viewport.contentY-360);else move(-1);}
        else if(event.key===Qt.Key_Right)horizontal(1);else if(event.key===Qt.Key_Left)horizontal(-1);else return;
        event.accepted=true;
    }
}
