import QtQuick 2.15

// One overlay, owned by the episode player. Catalogs never contain provider URLs.
Item {
    id:menu;objectName:'playerMenu'
    property var transport
    property var current:null
    property string family:'sans-serif'
    property string kind:''
    property string state:'ready'
    property string message:''
    property bool busy:false
    property bool changeError:false
    property bool retryAllowed:true
    property int revision:0
    property int index:0
    property string column:'items'
    property var readers:[]
    property var variants:[]
    property var entries:[]
    property var sources:[]
    property var seasons:[]
    property var episodeCard:null
    property int pageStart:1
    property int total:0
    property int pageIndex:0
    property int positionMs:0
    property int durationMs:0
    property int rememberedEpisode:0
    readonly property bool previousAvailable:pageStart>1
    readonly property bool nextAvailable:pageStart+entries.length<=total
    readonly property var episodeRows:kind==='episodes' ? entries.map(function(e){var row={};Object.keys(e).forEach(function(k){row[k]=e[k];});row.vignette=episodeArt.sources[episodeCard.anilist_id+':'+e.numero] || '';return row;}) : []
    EpisodeArtworkCache {id:episodeArt;transport:menu.transport}
    function warmEpisodes(){if(kind!=='episodes' || state!=='ready' || !episodeCard)return;for(var i=Math.max(0,index-4);i<Math.min(entries.length,index+5);i++)episodeArt.request(episodeCard.anilist_id,entries[i].numero);}
    onIndexChanged:warmEpisodes()
    onEntriesChanged:warmEpisodes()
    Timer {interval:30000;repeat:true;running:menu.kind==='episodes';onTriggered:menu.warmEpisodes()}
    function jumpToPlaying(){episodeCard=current.media;pageStart=Math.floor((current.target.numero-1)/40)*40+1;column='items';loadEpisodes(current.target.numero);}
    function changePage(direction){if(direction<0 && previousAvailable){pageStart=Math.max(1,pageStart-40);column='items';loadEpisodes(pageStart+39);}else if(direction>0 && nextAvailable){pageStart+=entries.length;column='items';loadEpisodes(pageStart);}}
    readonly property string heading:kind==='source' ? 'Source et lecteur' : kind==='quality' ? 'Qualité' : kind==='version' ? 'Version' : kind==='seasons' ? 'Saisons' : 'Épisodes'
    readonly property bool opened:!!kind
    readonly property bool episodeMenu:kind==='episodes' || kind==='seasons'
    readonly property int rowHeight:64
    readonly property int listHeight:Math.min(kind==='episodes' || kind==='source' ? 4 : 3,Math.max(1,entries.length))*(rowHeight+4)-4
    signal changeRequested(var media,var target,var choice)
    signal dismissed()
    signal cancelRequested()
    function validId(value){return /^[a-f0-9]{64}$/.test(value || '');}
    function sourceName(value){return value==='voiranime' ? 'Voiranime' : value==='anime-sama' ? 'Anime-sama' : '';}
    function identity(){return {anilist_id:current.media.anilist_id,episode:current.target.numero,lang:current.target.vf ? 'vf' : 'vo'};}
    function matches(value,key){return value && value.anilist_id===key.anilist_id && value.episode===key.episode && value.lang===key.lang;}
    function close(){revision++;kind='';message='';cancelRequested();dismissed();}
    function open(name){
        if(!current || !transport)return;
        revision++;kind=name;index=0;column='items';state='ready';message='';changeError=false;entries=[];
        if(name==='source')loadReaders();else if(name==='quality')loadVariants();
        else if(name==='version'){
            entries=[{label:'VOSTFR',detail:'Version originale sous-titrée en français',vf:false},{label:'VF',detail:'Version française',vf:true}];index=current.target.vf ? 1 : 0;
        }else {episodeCard=current.media;seasons=[];pageStart=Math.floor((current.target.numero-1)/40)*40+1;loadEpisodes(current.target.numero);loadSeasons();}
    }
    function failed(text,canRetry){state='error';message=text;retryAllowed=canRetry!==false;entries=[];}
    function loadReaders(){
        if(!transport.readersEnabled){failed('Choix indisponible ici.',false);return;}
        var turn=revision,key=identity();state='loading';readers=[];sources=[];
        if(transport.hlsEnabled)key.accept_hls=true;
        transport.api('/tv/v1/readers',key,110000,function(code,value){
            if(turn!==revision || kind!=='source')return;
            if(code!==200 || !matches(value,key) || !Array.isArray(value.readers)){failed('Lecteurs indisponibles.');return;}
            readers=value.readers.slice(0,128).filter(function(r){return validId(r.reader_id) && !!sourceName(r.source) && typeof r.label==='string' && r.label.length<=160;});
            var list=[{id:'',label:'Automatique'}];['voiranime','anime-sama'].forEach(function(s){if(readers.some(function(r){return r.source===s;}))list.push({id:s,label:sourceName(s)});});sources=list;
            state='ready';filterReaders();
        });
    }
    function filterReaders(){
        var list=[{label:'Automatique',readerId:'',source:'',available:true}];
        sources.slice(1).forEach(function(site){
            list.push({label:site.label+' · Automatique',readerId:'',source:site.id,available:true});
            readers.filter(function(r){return r.source===site.id;}).forEach(function(r){list.push({label:r.label,readerId:r.reader_id,source:r.source,available:r.supported===true,detail:site.label+(current.readerId===r.reader_id && current.source===r.source ? ' · En lecture' : r.supported ? '' : ' · Non pris en charge')});});
        });entries=list;
        index=0;for(var i=0;i<entries.length;i++)if(entries[i].readerId===(current.choice.readerId || '') && entries[i].source===(current.choice.source || ''))index=i;
    }
    function loadVariants(){
        if(!transport.variantsEnabled || !validId(current.readerId) || !sourceName(current.source)){failed('Choix indisponible ici.',false);return;}
        var turn=revision,key=identity();key.source=current.source;key.reader_id=current.readerId;state='loading';variants=[];
        if(transport.hlsEnabled)key.accept_hls=true;
        transport.api('/tv/v1/variants',key,110000,function(code,value){
            if(turn!==revision || kind!=='quality')return;
            if(code!==200 || !matches(value,key) || value.source!==key.source || value.reader_id!==key.reader_id || !Array.isArray(value.variants)){failed('Qualités indisponibles.');return;}
            variants=value.variants.slice(0,16).filter(function(v){return validId(v.variant_id) && (v.container==='mp4' || transport.hlsEnabled && v.container==='hls') && typeof v.label==='string' && v.label.length<=80;});
            entries=(variants.length>1 ? [{label:'Automatique',variantId:''}] : []).concat(variants.map(function(v){return {label:v.label,variantId:v.variant_id};}));
            index=0;for(var i=0;i<entries.length;i++)if(entries[i].variantId===(current.choice.variantId || ''))index=i;
            state='ready';if(!variants.length)message=transport.hlsEnabled ? 'Aucune qualité compatible n’est annoncée pour ce lecteur.' : 'Aucune variante MP4 compatible n’est annoncée pour ce lecteur.';
        });
    }
    function loadSeasons(){
        var turn=revision,key={anilist_id:current.media.anilist_id};
        transport.api('/tv/v1/catalog/detail',key,45000,function(code,value){
            if(turn!==revision || code!==200 || !value || !value.carte || value.carte.anilist_id!==key.anilist_id)return;
            seasons=(value.saisons || []).filter(function(c){return c.anilist_id>0;});
            if(value.complements_a_charger===true)transport.api('/tv/v1/catalog/detail-extras',key,45000,function(status,extra){
                if(turn!==revision || status!==200 || !extra || !Array.isArray(extra.saisons))return;
                seasons=extra.saisons.filter(function(c){return c.anilist_id>0;});
            });
        });
    }
    function episodeEntries(rows,key){return rows.slice(0,40).filter(function(e){return Number.isInteger(e.numero) && e.numero>0;}).map(function(e){return {numero:e.numero,label:'Épisode '+e.numero,titre:typeof e.titre==='string' ? e.titre : '',duree:typeof e.duree==='number' && e.duree>0 ? e.duree : 0,detail:current.media.anilist_id===key.anilist_id && current.target.numero===e.numero ? 'En lecture' : e.titre || '',available:true};});}
    function loadEpisodes(selected){
        var turn=++revision,key={anilist_id:episodeCard.anilist_id,debut:pageStart,nombre:40};state='loading';entries=[];
        transport.api('/tv/v1/catalog/episodes',key,45000,function(code,value){
            if(turn!==revision || kind!=='episodes')return;
            if(code!==200 || !value || value.anilist_id!==key.anilist_id || !Array.isArray(value.episodes)){failed('Impossible de charger les épisodes.');return;}
            total=Number.isInteger(value.total) && value.total>=0 ? value.total : 0;entries=episodeEntries(value.episodes,key);
            state='ready';index=0;for(var i=0;i<entries.length;i++)if(entries[i].numero===selected)index=i;
            warmEpisodes();showIndex();
            if(value.complements_a_charger===true)transport.api('/tv/v1/catalog/episode-extras',key,45000,function(status,extra){
                if(turn!==revision || kind!=='episodes' || status!==200 || !extra || extra.anilist_id!==key.anilist_id || !Array.isArray(extra.episodes))return;
                var rows=episodeEntries(extra.episodes,key),byNumber={};rows.forEach(function(e){byNumber[e.numero]=e;});
                entries=entries.map(function(e){var more=byNumber[e.numero];if(!more)return e;var row={};Object.keys(e).forEach(function(k){row[k]=e[k];});if(more.titre)row.titre=more.titre;if(more.duree)row.duree=more.duree;return row;});
            });
        });
    }
    function selected(entry){
        if(!current || !entry)return false;
        if(kind==='quality')return entry.variantId===(current.choice.variantId || '') || variants.length===1 && !current.choice.variantId;
        if(kind==='version')return entry.vf===current.target.vf;
        if(kind==='seasons')return !!entry.card && !!episodeCard && entry.card.anilist_id===episodeCard.anilist_id;
        if(kind==='episodes')return episodeCard.anilist_id===current.media.anilist_id && entry.numero===current.target.numero;
        return entry.readerId ? entry.readerId===current.choice.readerId && entry.source===current.choice.source : !current.choice.readerId && (entry.source || '')===(current.choice.source || '');
    }
    function activate(){
        if(busy)return;
        if(changeError){changeError=false;message="";return;}
        if(state==='error'){if(retryAllowed){if(kind==='episodes')loadEpisodes(0);else open(kind);}return;}
        if(state!=='ready')return;
        if(kind==='episodes' && column==='header'){
            if(seasons.length<2)return;
            rememberedEpisode=entries[index] ? entries[index].numero : 0;kind='seasons';entries=seasons.map(function(c){return {label:c.titre || '',card:c};});index=0;column='items';return;
        }
        if(kind==='episodes' && column==='pages'){
            if(pageIndex===0 && pageStart>1)pageStart=Math.max(1,pageStart-40);else if(pageIndex===1 && pageStart+entries.length<=total)pageStart+=entries.length;else return;
            column='items';loadEpisodes(0);return;
        }
        var entry=entries[index];if(!entry || entry.available===false)return;
        if(kind==='seasons'){episodeCard=entry.card;kind='episodes';pageStart=1;loadEpisodes(0);return;}
        if(selected(entry)){close();return;}
        var choice={},target={numero:current.target.numero,vf:current.target.vf},card=current.media;
        if(kind==='source'){if(entry.source)choice.source=entry.source;if(entry.readerId)choice.readerId=entry.readerId;}
        else if(kind==='quality'){choice.source=current.source;choice.readerId=current.readerId;if(entry.variantId)choice.variantId=entry.variantId;}
        else if(kind==='version')target.vf=entry.vf;
        else {card=episodeCard;target.numero=entry.numero;}
        message='Préparation…';changeRequested(card,target,choice);
    }
    function showIndex(){Qt.callLater(function(){if(kind!=='episodes')list.positionViewAtIndex(index,ListView.Contain);});}
    function key(code){
        var ok=code===Qt.Key_Return || code===Qt.Key_Enter || code===Qt.Key_Select;
        if(changeError){if(ok || code===Qt.Key_Back || code===Qt.Key_Escape){changeError=false;message="";}return;}
        if(busy){if(code===Qt.Key_Back || code===Qt.Key_Escape || ok){cancelRequested();message='';}return;}
        if(code===Qt.Key_Back || code===Qt.Key_Escape){if(kind==='seasons'){kind='episodes';column='header';loadEpisodes(rememberedEpisode);}else close();return;}
        if(ok){if(kind==='episodes' && column==='current')jumpToPlaying();else if(kind==='episodes' && (column==='previous' || column==='next'))changePage(column==='previous' ? -1 : 1);else activate();return;}
        if(state!=='ready')return;
        if(kind==='episodes'){
            if(code===Qt.Key_Up){column='header';return;}if(code===Qt.Key_Down){column='items';return;}
            var delta=code===Qt.Key_Left ? -1 : code===Qt.Key_Right ? 1 : 0;if(!delta)return;
            if(column!=='items'){var fields=['header','current'];if(previousAvailable)fields.push('previous');if(nextAvailable)fields.push('next');column=fields[Math.max(0,Math.min(fields.length-1,fields.indexOf(column)+delta))];return;}
            if(index===0 && delta<0 && previousAvailable){changePage(-1);return;}
            if(index===entries.length-1 && delta>0 && nextAvailable){changePage(1);return;}
            index=Math.max(0,Math.min(entries.length-1,index+delta));return;
        }
        if(code===Qt.Key_Up || code===Qt.Key_Down){index=Math.max(0,Math.min(entries.length-1,index+(code===Qt.Key_Up ? -1 : 1)));showIndex();}
    }
    visible:opened
    Rectangle {id:surface;x:menu.episodeMenu ? 64 : Math.min(1216-width,688+(menu.kind==='version' ? 0 : menu.kind==='source' ? 1 : 2)*180);y:(menu.kind==='episodes' ? 474 : 486)-height;width:menu.kind==='episodes' ? 1152 : menu.kind==='version' ? 396 : menu.kind==='source' ? 380 : 304;height:menu.kind==='episodes' && menu.state==='ready' && !menu.busy && !menu.changeError ? 322 : menu.busy || menu.changeError || menu.state!=='ready' ? 184 : 72+menu.listHeight;radius:14;color:'#ee1b1c21';border.color:'#28ffffff'
        Text {x:24;y:19;width:parent.width-48;text:menu.heading;color:'#f5f5f7';font.family:menu.family;font.pixelSize:23;font.weight:Font.DemiBold;visible:menu.kind!=='episodes' || menu.state!=='ready' || menu.busy || menu.changeError}
        ListView {id:list;objectName:'playerMenuList';x:8;y:64;width:surface.width-16;height:menu.listHeight;clip:true;interactive:false;spacing:4;model:menu.entries;currentIndex:menu.index;onCurrentIndexChanged:if(menu.kind!=='episodes')positionViewAtIndex(currentIndex,ListView.Contain);visible:menu.kind!=='episodes' && menu.state==='ready' && !menu.busy && !menu.changeError
            delegate:PlayerChoice {width:list.width;height:64;family:menu.family;label:modelData.label || '';detail:modelData.detail || '';available:modelData.available!==false;focused:menu.index===index;selected:menu.selected(modelData);onActivated:{menu.index=index;menu.column='items';menu.activate();}}
        }
        PlayerEpisodes {family:menu.family;episodes:menu.episodeRows;selectedIndex:menu.index;currentEpisode:menu.current ? menu.current.target.numero : 0;sameSeries:menu.current && menu.episodeCard && menu.episodeCard.anilist_id===menu.current.media.anilist_id;seasonLabel:menu.episodeCard && menu.episodeCard.franime && menu.episodeCard.franime.saison ? 'Saison '+menu.episodeCard.franime.saison : 'Épisodes';total:menu.total;pageStart:menu.pageStart;previousAvailable:menu.previousAvailable;nextAvailable:menu.nextAvailable;positionMs:menu.positionMs;durationMs:menu.durationMs;zone:menu.column==='items' ? 'episodes' : menu.column==='header' ? 'season' : menu.column;visible:menu.kind==='episodes' && menu.state==='ready' && !menu.busy && !menu.changeError
            onSelectEpisode:menu.index=index
            onActivateEpisode:{menu.index=index;menu.column='items';menu.activate();}
            onOpenSeasons:{menu.column='header';menu.activate();}
            onJumpToPlaying:menu.jumpToPlaying()
            onChangePage:menu.changePage(direction)
            onThumbnailFailed:episodeArt.invalidate(menu.episodeCard.anilist_id,number)
        }
        Text {x:24;y:72;width:parent.width-48;text:menu.busy ? 'Préparation…' : menu.state==='loading' ? 'Chargement…' : menu.message;textFormat:Text.PlainText;color:'#c6c6ce';font.family:menu.family;font.pixelSize:18;wrapMode:Text.Wrap;visible:menu.busy || menu.changeError || menu.state!=='ready'}
        Rectangle {x:16;y:128;width:parent.width-32;height:40;radius:8;color:'#f5f5f7';visible:menu.busy || menu.changeError || menu.state==='error' && menu.retryAllowed
            Text {anchors.centerIn:parent;text:menu.busy ? 'Annuler' : menu.changeError ? 'Revenir aux choix' : 'Réessayer';color:'#151519';font.family:menu.family;font.pixelSize:18;font.weight:Font.DemiBold}
            MouseArea {anchors.fill:parent;onClicked:{if(menu.busy){menu.cancelRequested();menu.message='';}else menu.activate();}}
        }
    }
}
