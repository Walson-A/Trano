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
    readonly property string heading:kind==='source' ? 'Source et lecteur' : kind==='quality' ? 'Qualité' : kind==='version' ? 'Version' : kind==='seasons' ? 'Saisons' : 'Épisodes'
    readonly property bool opened:!!kind
    readonly property bool episodeMenu:kind==='episodes' || kind==='seasons'
    readonly property int rowHeight:kind==='quality' ? 44 : 52
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
        revision++;kind=name;index=0;column='items';state='ready';message='';entries=[];
        if(name==='source')loadReaders();else if(name==='quality')loadVariants();
        else if(name==='version'){
            entries=[{label:'VOSTFR',detail:'Version originale sous-titrée en français',vf:false},{label:'VF',detail:'Version française',vf:true}];index=current.target.vf ? 1 : 0;
        }else {episodeCard=current.media;seasons=[];pageStart=Math.floor((current.target.numero-1)/40)*40+1;loadEpisodes(current.target.numero);loadSeasons();}
    }
    function failed(text,canRetry){state='error';message=text;retryAllowed=canRetry!==false;entries=[];}
    function loadReaders(){
        if(!transport.readersEnabled){failed('Choix indisponible ici.',false);return;}
        var turn=revision,key=identity();state='loading';readers=[];sources=[];
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
        transport.api('/tv/v1/variants',key,110000,function(code,value){
            if(turn!==revision || kind!=='quality')return;
            if(code!==200 || !matches(value,key) || value.source!==key.source || value.reader_id!==key.reader_id || !Array.isArray(value.variants)){failed('Qualités indisponibles.');return;}
            variants=value.variants.slice(0,16).filter(function(v){return validId(v.variant_id) && v.container==='mp4' && typeof v.label==='string' && v.label.length<=80;});
            entries=[{label:'Automatique',variantId:''}].concat(variants.map(function(v){return {label:v.label,variantId:v.variant_id};}));
            index=0;for(var i=0;i<entries.length;i++)if(entries[i].variantId===(current.choice.variantId || ''))index=i;
            state='ready';if(!variants.length)message='Aucune variante MP4 compatible n’est annoncée pour ce lecteur.';
        });
    }
    function loadSeasons(){
        var turn=revision,key={anilist_id:current.media.anilist_id};
        transport.api('/tv/v1/catalog/detail',key,45000,function(code,value){
            if(turn!==revision || code!==200 || !value || !value.carte || value.carte.anilist_id!==key.anilist_id)return;
            seasons=(value.saisons || []).filter(function(c){return c.anilist_id>0;});
        });
    }
    function loadEpisodes(selected){
        var turn=++revision,key={anilist_id:episodeCard.anilist_id,debut:pageStart,nombre:40};state='loading';entries=[];
        transport.api('/tv/v1/catalog/episodes',key,45000,function(code,value){
            if(turn!==revision || kind!=='episodes')return;
            if(code!==200 || !value || value.anilist_id!==key.anilist_id || !Array.isArray(value.episodes)){failed('Impossible de charger les épisodes. OK pour réessayer.');return;}
            total=value.total || 0;entries=value.episodes.slice(0,40).filter(function(e){return Number.isInteger(e.numero) && e.numero>0;}).map(function(e){return {numero:e.numero,label:'Épisode '+e.numero,detail:(current.media.anilist_id===key.anilist_id && current.target.numero===e.numero ? 'En lecture' : e.titre || ''),available:true};});
            state='ready';index=0;for(var i=0;i<entries.length;i++)if(entries[i].numero===selected)index=i;
            showIndex();
        });
    }
    function selected(entry){
        if(!current || !entry)return false;
        if(kind==='quality')return entry.variantId===(current.choice.variantId || '');
        if(kind==='version')return entry.vf===current.target.vf;
        if(kind==='seasons')return !!entry.card && !!episodeCard && entry.card.anilist_id===episodeCard.anilist_id;
        if(kind==='episodes')return episodeCard.anilist_id===current.media.anilist_id && entry.numero===current.target.numero;
        return entry.readerId ? entry.readerId===current.choice.readerId && entry.source===current.choice.source : !current.choice.readerId && (entry.source || '')===(current.choice.source || '');
    }
    function activate(){
        if(busy)return;
        if(state==='error'){if(retryAllowed){if(kind==='episodes')loadEpisodes(0);else open(kind);}return;}
        if(state!=='ready')return;
        if(kind==='episodes' && column==='header'){
            if(seasons.length<2)return;
            kind='seasons';entries=seasons.map(function(c){return {label:c.titre || '',card:c};});index=0;column='items';return;
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
    function showIndex(){Qt.callLater(function(){list.positionViewAtIndex(index,ListView.Contain);});}
    function key(code){
        if(code===Qt.Key_Back || code===Qt.Key_Escape){if(kind==='seasons'){kind='episodes';loadEpisodes(current.target.numero);}else close();return;}
        if(busy)return;
        if(code===Qt.Key_Return || code===Qt.Key_Enter || code===Qt.Key_Select){activate();return;}
        if(state!=='ready')return;
        var delta=code===Qt.Key_Up ? -1 : code===Qt.Key_Down ? 1 : 0;
        if(kind==='episodes' && column==='header'){if(delta>0)column='items';return;}
        if(kind==='episodes' && column==='pages'){if(delta<0)column='items';if(code===Qt.Key_Left || code===Qt.Key_Right)pageIndex=code===Qt.Key_Left ? 0 : 1;return;}
        if(delta){if(kind==='episodes' && delta<0 && index===0)column='header';else if(kind==='episodes' && delta>0 && index===entries.length-1)column='pages';else index=Math.max(0,Math.min(entries.length-1,index+delta));showIndex();}
    }
    visible:opened
    Rectangle {id:surface;x:menu.kind==='quality' ? 640 : menu.kind==='version' ? 482 : menu.kind==='source' ? 244 : 64;y:500-height;width:menu.kind==='quality' ? 246 : menu.kind==='version' ? 360 : menu.kind==='source' ? 420 : 480;height:(menu.kind==='episodes' ? 110 : menu.kind==='seasons' ? 38 : 16)+menu.listHeight+(menu.message || menu.busy || menu.state!=='ready' ? 34 : 8);radius:12;color:'#202228';border.color:'#38ffffff'
        Text {x:20;y:14;width:parent.width-40;text:'Saisons';color:'#b2b6c3';font.family:menu.family;font.pixelSize:17;visible:menu.kind==='seasons'}
        PlayerChoice {x:8;y:8;width:464;label:menu.episodeCard && menu.episodeCard.franime && menu.episodeCard.franime.saison ? 'Saison '+menu.episodeCard.franime.saison : 'Épisodes';detail:menu.total+' épisodes'+(menu.seasons.length>1 ? ' · Changer de saison' : '');family:menu.family;focused:menu.column==='header';visible:menu.kind==='episodes';onActivated:{menu.column='header';menu.activate();}}
        ListView {id:list;objectName:'playerMenuList';x:8;y:menu.kind==='episodes' ? 78 : menu.kind==='seasons' ? 34 : 8;width:surface.width-x-8;height:menu.listHeight;clip:true;interactive:false;spacing:4;model:menu.entries;currentIndex:menu.index;onCurrentIndexChanged:positionViewAtIndex(currentIndex,ListView.Contain)
            delegate:PlayerChoice {width:list.width;height:menu.rowHeight;family:menu.family;label:modelData.label || '';detail:menu.kind==='version' || menu.kind==='quality' ? '' : modelData.detail || '';available:modelData.available!==false;focused:menu.column==='items' && menu.index===index;selected:menu.selected(modelData);onActivated:{menu.index=index;menu.column='items';menu.activate();}}
        }
        PlayerChoice {x:list.x;y:list.y;width:list.width;height:menu.rowHeight;label:'Réessayer';family:menu.family;focused:true;visible:menu.state==='error' && menu.retryAllowed;onActivated:menu.activate()}
        Row {x:8;y:78+menu.listHeight;spacing:8;visible:menu.kind==='episodes' && (menu.pageStart>1 || menu.pageStart+menu.entries.length<=menu.total)
            PlayerChoice {width:228;height:36;label:'Précédents';available:menu.pageStart>1;family:menu.family;focused:menu.column==='pages' && menu.pageIndex===0;onActivated:{menu.column='pages';menu.pageIndex=0;menu.activate();}}
            PlayerChoice {width:228;height:36;label:'Suivants';available:menu.pageStart+menu.entries.length<=menu.total;family:menu.family;focused:menu.column==='pages' && menu.pageIndex===1;onActivated:{menu.column='pages';menu.pageIndex=1;menu.activate();}}
        }
        Text {x:20;y:parent.height-28;width:parent.width-40;text:menu.busy ? 'Préparation…' : menu.state==='loading' ? 'Chargement…' : menu.message;textFormat:Text.PlainText;color:'#c6cad5';font.family:menu.family;font.pixelSize:16;elide:Text.ElideRight}
    }
}
