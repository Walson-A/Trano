import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion
import "Discovery.js" as Catalog

// Live catalog discovery. Uses the authenticated TV session and artwork cache.
FocusScope {
    id:view
    objectName:'atlasDiscovery'
    property var transport
    property var artworks
    property string family:'sans-serif'
    property bool reducedMotion:false
    // Six large posters are opt-in for visual review, not enabled by the live host.
    property bool denseLayout:false
    readonly property int columns:denseLayout ? 6 : 4
    property bool opened:false
    property string avatar:''
    property string query:''
    property var filters:Catalog.defaults()
    property var results:[]
    readonly property var cards:results
    readonly property var currentCard:results.length ? results[Math.min(resultIndex,results.length-1)] : null
    property string state:'idle'
    property int generation:0
    property int page:1
    property int requestedPage:1
    property bool hasNext:false
    property var pagePositions:({})
    property int resultIndex:0
    property string zone:'filters'
    property int navIndex:0
    property int filterIndex:0
    property int pageIndex:1
    property string overlay:''
    property var draft:Catalog.defaults()
    property int optionIndex:0
    property bool applyFocused:false
    property string filterNotice:''
    property string draftQuery:''
    property int keyIndex:0
    property int toolIndex:0
    property string keyboardZone:'keys'
    readonly property var letters:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
    readonly property var filterNames:['Genres','Format','Année','Diffusion','Trier']
    readonly property var filterFields:['genres','format','annee','statut','tri']
    readonly property var options:filterIndex===0 ? Catalog.genres : filterIndex===1 ? Catalog.formats : filterIndex===2 ? Catalog.years() : filterIndex===3 ? Catalog.statuses : Catalog.sorts
    signal closed()
    signal navigateRequested(string destination)
    signal chosen(var cards,int index,string title)
    function open(){opened=true;forceActiveFocus();if(state==='idle' || state==='loading')search(false,requestedPage);}
    function close(){opened=false;overlay='';closed();}
    function art(card,kind){if(!card)return '';var local=artworks && artworks.sources[String(card.anilist_id)];return local && (kind==='poster' ? local.poster : local.banner || local.card || local.poster) || (kind==='poster' ? card.affiche : card.banniere || card.affiche) || '';}
    function warm(){if(!opened || !artworks || !results.length)return;var first=Math.floor(resultIndex/columns)*columns;for(var i=first;i<Math.min(first+columns*2,results.length);i++)artworks.request(results[i],'poster',i===resultIndex);if(!denseLayout)artworks.request(currentCard,'banner',true);}
    function search(focusResults,nextPage){
        if(!opened || !transport)return;
        var turn=++generation,target=nextPage || 1;requestedPage=target;state='loading';
        transport.api('/tv/v1/catalog/search',Catalog.body(query,filters,target),45000,function(status,value){
            if(!opened || turn!==generation)return;
            if(status!==200 || !value || !Array.isArray(value.resultats) || value.resultats.length>24 || typeof value.page!=='number' || value.page%1 || value.page!==target || typeof value.has_next_page!=='boolean'){state='error';return;}
            page=value.page;hasNext=value.has_next_page && page<1000;results=value.resultats;
            resultIndex=Math.max(0,Math.min(results.length-1,pagePositions[String(page)] || 0));state='ready';
            if(focusResults)zone=results.length ? 'results' : 'filters';
            Qt.callLater(function(){grid.positionViewAtIndex(resultIndex,GridView.Beginning);warm();});
        });
    }
    function restart(){pagePositions={};page=1;resultIndex=0;search(true,1);}
    function goPage(delta){
        if(state!=='ready' || delta>0 && !hasNext || delta<0 && page===1)return;
        var positions=Catalog.clone(pagePositions);positions[String(page)]=resultIndex;pagePositions=positions;search(true,page+delta);
    }
    function valueLabel(index){
        if(index===0)return filters.genres.length ? Catalog.label(Catalog.genres,filters.genres[0])+(filters.genres.length>1 ? ' +'+(filters.genres.length-1) : '') : 'Genres';
        if(index===1)return filters.format ? Catalog.label(Catalog.formats,filters.format) : 'Format';
        if(index===2)return filters.annee || 'Année';
        if(index===3)return filters.statut ? Catalog.label(Catalog.statuses,filters.statut) : 'Diffusion';
        return filters.tri ? Catalog.label(Catalog.sorts,filters.tri) : query.trim() ? 'Pertinence' : 'Tendances';
    }
    function filterActive(index){return index===0 ? filters.genres.length>0 : !!filters[filterFields[index]];}
    function openFilter(index){
        filterIndex=index;draft=Catalog.clone(filters);optionIndex=0;applyFocused=false;filterNotice='';overlay='filter';
        if(index!==0)for(var i=0;i<options.length;i++)if(options[i][0]===draft[filterFields[index]])optionIndex=i;
        Qt.callLater(function(){optionList.positionViewAtIndex(optionIndex,ListView.Contain);});
    }
    function optionSelected(index){return filterIndex===0 ? draft.genres.indexOf(options[index][0])>=0 : draft[filterFields[filterIndex]]===options[index][0];}
    function chooseOption(){
        var copy=Catalog.clone(draft),value=options[optionIndex][0];
        if(filterIndex===0){var at=copy.genres.indexOf(value);if(at>=0)copy.genres.splice(at,1);else if(copy.genres.length<3)copy.genres.push(value);else {filterNotice='3 genres maximum';return;}draft=copy;filterNotice='';}
        else {copy[filterFields[filterIndex]]=value;draft=copy;applyFilter();}
    }
    function applyFilter(){var changed=JSON.stringify(filters)!==JSON.stringify(draft);filters=Catalog.clone(draft);overlay='';zone='filters';if(changed)restart();}
    function openKeyboard(){draftQuery=query;overlay='keyboard';keyboardZone='keys';keyIndex=0;toolIndex=2;}
    function submitQuery(){var changed=query!==draftQuery.trim();query=draftQuery.trim().slice(0,60);overlay='';zone='results';if(changed)restart();else if(state==='error')search(true,page);else zone=results.length ? 'results' : 'filters';}
    function append(text){draftQuery=(draftQuery+text).slice(0,60);}
    function activate(){
        if(overlay==='filter'){if(applyFocused)applyFilter();else chooseOption();return;}
        if(overlay==='keyboard'){if(keyboardZone==='keys')append(letters[keyIndex]);else if(toolIndex===0)append(' ');else if(toolIndex===1)draftQuery=draftQuery.slice(0,-1);else submitQuery();return;}
        if(zone==='nav')navigateRequested(navIndex===2 ? 'home' : navIndex===1 ? 'profile' : 'search');
        else if(zone==='search')openKeyboard();
        else if(zone==='filters'){if(filterIndex<5)openFilter(filterIndex);else {filters=Catalog.defaults();query='';restart();}}
        else if(zone==='results' && state==='ready' && results.length)chosen(results,resultIndex,query ? 'Recherche · '+query : 'Découvrir');
        else if(zone==='pages'){if(state==='error')search(true,requestedPage);else if(pageIndex===0)goPage(-1);else goPage(1);}
    }
    onOpenedChanged:if(!opened){generation++;artDelay.stop();}
    onResultIndexChanged:if(opened && state==='ready')artDelay.restart();
    Timer {id:artDelay;interval:160;onTriggered:view.warm()}
    Rectangle {anchors.fill:parent;color:'#090a0d'}
    TvNavigation {id:navigation;page:'search';family:view.family;focused:view.zone==='nav' && !view.overlay;selectedIndex:view.navIndex;avatar:view.avatar;reducedMotion:view.reducedMotion;pseudo:view.transport && view.transport.home.compte ? view.transport.home.compte.pseudo || 'Profil' : 'Profil';onDestinationRequested:view.navigateRequested(destination)}
    Text {x:64;y:view.denseLayout ? 102 : 110;text:'Recherche';color:'white';font.family:view.family;font.pixelSize:view.denseLayout ? 32 : 40;font.weight:Font.Bold}
    Text {x:66;y:164;visible:!view.denseLayout;text:'Trouve ta prochaine histoire.';color:'#a7aab4';font.family:view.family;font.pixelSize:20}
    HeroButton {objectName:'discoverySearch';x:772;y:view.denseLayout ? 98 : 119;width:444;height:view.denseLayout ? 52 : 60;family:view.family;label:view.query || 'Rechercher un animé';iconKey:'search';focused:view.zone==='search' && !view.overlay;reducedMotion:view.reducedMotion;onActivated:{view.zone='search';view.openKeyboard();}}
    Row {x:64;y:view.denseLayout ? 164 : 214;spacing:12
        Repeater {model:[212,168,130,188,206]
            HeroButton {objectName:'discoveryFilter'+index;width:modelData;height:view.denseLayout ? 46 : 48;label:view.valueLabel(index);family:view.family;selected:view.filterActive(index);focused:view.zone==='filters' && view.filterIndex===index && !view.overlay;iconKey:'chevron-down';reducedMotion:view.reducedMotion;onActivated:{view.zone='filters';view.openFilter(index);}}
        }
        HeroButton {width:128;height:view.denseLayout ? 46 : 48;label:'Effacer';family:view.family;flat:true;opacity:Catalog.count(view.filters) || view.query ? 1 : 0.35;focused:view.zone==='filters' && view.filterIndex===5 && !view.overlay;reducedMotion:view.reducedMotion;onActivated:{view.zone='filters';view.filterIndex=5;view.activate();}}
    }
    Text {x:66;y:view.denseLayout ? 222 : 277;width:view.denseLayout ? 1152 : 810;text:view.state==='loading' ? 'Recherche en cours…' : view.state==='error' ? 'Le catalogue ne répond pas.' : view.denseLayout && view.zone==='results' && view.currentCard ? view.currentCard.titre+' · '+Catalog.meta(view.currentCard) : view.query ? 'Résultats pour « '+view.query+' »' : view.filters.genres.length ? view.valueLabel(0) : 'À explorer';color:'#b9bdc7';font.family:view.family;font.pixelSize:18;textFormat:Text.PlainText;elide:Text.ElideRight}
    GridView {id:grid;objectName:'discoveryGrid';x:56;y:view.denseLayout ? 256 : 310;width:view.denseLayout ? 1168 : 840;height:view.denseLayout ? 404 : 350;cellWidth:width/view.columns;cellHeight:view.denseLayout ? 310 : 336;clip:true;model:view.results;currentIndex:view.resultIndex;interactive:false;keyNavigationEnabled:false;visible:view.state!=='error';opacity:view.state==='loading' ? 0.3 : 1
        onCurrentIndexChanged:if(currentIndex>=0 && currentIndex<count)positionViewAtIndex(currentIndex,GridView.Beginning)
        delegate:Item {id:tile;width:grid.cellWidth;height:grid.cellHeight
            property bool targeted:view.zone==='results' && view.resultIndex===index && !view.overlay
            property bool chosen:view.resultIndex===index
            Item {x:8;y:7;width:view.denseLayout ? 174 : 190;height:300;scale:tile.targeted ? 1.025 : 1;transformOrigin:Item.Top
                Behavior on scale {NumberAnimation {duration:view.reducedMotion ? 0 : Motion.ms('focus');easing.type:Easing.OutCubic}}
                Rectangle {id:frame;width:parent.width;height:view.denseLayout ? 242 : 264;radius:9;color:'#1b1e26';border.width:tile.targeted ? 3 : tile.chosen ? 1 : 0;border.color:tile.targeted ? 'white' : '#848994'}
                Image {id:poster;objectName:'discoveryArtwork';x:4;y:4;width:frame.width-8;height:frame.height-8;source:view.art(modelData,'poster');fillMode:Image.PreserveAspectCrop;asynchronous:true;sourceSize.width:380;visible:false;onStatusChanged:if(status===Image.Error && view.artworks)view.artworks.request(modelData,'poster',true)}
                OpacityMask {x:4;y:4;width:frame.width-8;height:frame.height-8;source:poster;maskSource:Rectangle {width:poster.width;height:poster.height;radius:6}}
                Text {anchors.centerIn:frame;width:155;text:poster.status===Image.Error ? 'Image indisponible' : 'Atlas';visible:poster.status!==Image.Ready;color:'#727783';font.family:view.family;font.pixelSize:18;horizontalAlignment:Text.AlignHCenter;wrapMode:Text.WordWrap}
                Text {y:frame.height+10;width:parent.width;height:46;text:modelData.titre || '';textFormat:Text.PlainText;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight;color:tile.targeted ? 'white' : '#bfc2ca';font.family:view.family;font.pixelSize:17;font.weight:tile.targeted ? Font.DemiBold : Font.Normal}
            }
            MouseArea {anchors.fill:parent;onClicked:{view.zone='results';view.resultIndex=index;view.activate();view.forceActiveFocus();}}
        }
    }
    Rectangle {x:56;y:640;width:grid.width;height:22;gradient:Gradient {GradientStop {position:0;color:'#00090a0d'} GradientStop {position:1;color:'#090a0d'}}}
    Rectangle {x:view.denseLayout ? 1230 : 902;y:grid.y+8;width:2;height:grid.height-40;radius:1;color:'#252a35';visible:view.results.length>view.columns && view.state==='ready'
        Rectangle {width:2;height:parent.height/Math.ceil(view.results.length/view.columns);y:Math.floor(view.resultIndex/view.columns)*height;radius:1;color:'#a3a9b5'}
    }
    Item {x:930;y:316;width:286;height:354;visible:!view.denseLayout && !!view.currentCard && view.state==='ready'
        Image {id:preview;width:286;height:144;source:view.denseLayout ? '' : view.art(view.currentCard,'banner');fillMode:Image.PreserveAspectCrop;asynchronous:true;sourceSize.width:600;visible:false;onStatusChanged:if(status===Image.Error && view.artworks)view.artworks.request(view.currentCard,'banner',true)}
        OpacityMask {width:286;height:144;source:preview;maskSource:Rectangle {width:286;height:144;radius:9}}
        Text {id:previewTitle;y:160;width:286;height:Math.min(implicitHeight,68);text:view.currentCard ? view.currentCard.titre : '';textFormat:Text.PlainText;color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.Bold;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight}
        Text {id:previewMeta;y:previewTitle.y+previewTitle.height+12;width:286;text:view.currentCard ? Catalog.meta(view.currentCard) : '';color:'#b2b6c1';font.family:view.family;font.pixelSize:16;elide:Text.ElideRight}
        Text {id:previewGenres;y:previewMeta.y+28;width:286;text:view.currentCard && view.currentCard.genres ? view.currentCard.genres.slice(0,3).join(' · ') : '';color:'#d3d5dc';font.family:view.family;font.pixelSize:16;elide:Text.ElideRight}
        Text {y:previewGenres.y+32;width:286;height:382-y;text:view.currentCard ? Catalog.plain(view.currentCard.resume) || 'Ouvre la fiche pour en savoir plus.' : '';color:'#a7acb7';font.family:view.family;font.pixelSize:17;wrapMode:Text.WordWrap;elide:Text.ElideRight;textFormat:Text.PlainText}
    }
    Item {x:64;y:view.denseLayout ? 336 : 364;width:view.denseLayout ? 1152 : 800;height:220;visible:view.state==='error' || view.state==='ready' && !view.results.length
        Text {width:parent.width;text:view.state==='error' ? 'Impossible de charger les animés' : 'Aucun animé avec ces critères';color:'white';font.family:view.family;font.pixelSize:30;font.weight:Font.DemiBold;horizontalAlignment:Text.AlignHCenter}
        Text {y:54;width:parent.width;text:view.state==='error' ? 'Tes critères sont conservés. Tu peux réessayer.' : view.query ? 'Essaie un autre titre ou efface les critères.' : 'Essaie un autre genre ou efface les filtres.';color:'#a7acb7';font.family:view.family;font.pixelSize:20;horizontalAlignment:Text.AlignHCenter}
    }
    Row {x:64;y:670;spacing:12
        HeroButton {width:154;height:38;label:'Précédente';family:view.family;flat:true;visible:view.page>1;focused:view.zone==='pages' && view.pageIndex===0;onActivated:view.goPage(-1)}
        Text {height:38;verticalAlignment:Text.AlignVCenter;text:'Page '+view.page;color:'#8f95a3';font.family:view.family;font.pixelSize:16}
        HeroButton {width:172;height:38;label:view.state==='error' ? 'Réessayer' : 'Voir la suite';family:view.family;flat:true;visible:view.hasNext || view.state==='error';focused:view.zone==='pages' && view.pageIndex===1;onActivated:{view.zone='pages';view.pageIndex=1;view.activate();}}
    }
    Rectangle {anchors.fill:parent;color:'#ce050609';visible:!!view.overlay;z:10;MouseArea {anchors.fill:parent;onClicked:{view.overlay='';view.forceActiveFocus();}}}
    Rectangle {objectName:'discoveryFilterPanel';x:Math.min(64+[0,224,404,546,746][Math.min(view.filterIndex,4)],816);y:view.denseLayout ? 154 : 204;width:400;height:480;radius:18;color:'#f020232c';border.color:'#606773';visible:view.overlay==='filter';z:11
        Text {x:24;y:21;width:352;text:view.filterNames[view.filterIndex] || '';color:'white';font.family:view.family;font.pixelSize:27;font.weight:Font.DemiBold}
        Text {x:24;y:63;width:352;text:view.filterIndex===0 ? view.filterNotice || '3 maximum · tous les genres choisis' : 'Choisir pour appliquer';color:'#aeb4c0';font.family:view.family;font.pixelSize:16}
        ListView {id:optionList;objectName:'discoveryOptions';x:14;y:101;width:372;height:view.filterIndex===0 ? 294 : 354;clip:true;model:view.options;currentIndex:view.optionIndex;interactive:false
            onCurrentIndexChanged:if(currentIndex>=0)positionViewAtIndex(currentIndex,ListView.Contain)
            delegate:Rectangle {width:372;height:50;radius:9;color:view.optionIndex===index && !view.applyFocused ? '#f7f8fa' : 'transparent'
                Text {x:14;width:300;anchors.verticalCenter:parent.verticalCenter;text:modelData[1];color:view.optionIndex===index && !view.applyFocused ? '#12151c' : '#e3e5eb';font.family:view.family;font.pixelSize:20}
                Icon {x:330;y:14;width:22;height:22;name:'check';visible:view.optionSelected(index);ink:view.optionIndex===index && !view.applyFocused ? '#12151c' : 'white'}
                MouseArea {anchors.fill:parent;onClicked:{view.optionIndex=index;view.applyFocused=false;view.chooseOption();view.forceActiveFocus();}}
            }
        }
        HeroButton {x:24;y:414;width:352;height:46;label:'Appliquer'+(view.draft.genres.length ? ' · '+view.draft.genres.length+(view.draft.genres.length>1 ? ' genres' : ' genre') : '');family:view.family;visible:view.filterIndex===0;focused:view.applyFocused;onActivated:{view.applyFilter();view.forceActiveFocus();}}
    }
    Rectangle {x:246;y:142;width:788;height:510;radius:22;color:'#f020232c';border.color:'#606773';visible:view.overlay==='keyboard';z:11
        Text {x:30;y:24;text:'Rechercher un animé';color:'white';font.family:view.family;font.pixelSize:28;font.weight:Font.DemiBold}
        Rectangle {x:30;y:80;width:728;height:60;radius:10;color:'#12151c';border.color:'#6e7685';Text {x:18;width:692;anchors.verticalCenter:parent.verticalCenter;text:view.draftQuery || 'Un titre…';color:view.draftQuery ? 'white' : '#8c93a1';textFormat:Text.PlainText;elide:Text.ElideLeft;font.family:view.family;font.pixelSize:26}}
        Grid {x:30;y:164;columns:9;spacing:8;Repeater {model:view.letters
            Rectangle {width:74;height:54;radius:9;color:view.keyboardZone==='keys' && view.keyIndex===index ? 'white' : '#353a46'
                Text {anchors.centerIn:parent;text:modelData;color:view.keyboardZone==='keys' && view.keyIndex===index ? '#13161d' : 'white';font.family:view.family;font.pixelSize:24}
                MouseArea {anchors.fill:parent;onClicked:{view.keyIndex=index;view.keyboardZone='keys';view.activate();view.forceActiveFocus();}}
            }
        }}
        Row {x:30;y:425;spacing:12;Repeater {model:['Espace','Effacer','Rechercher'];HeroButton {width:index===2 ? 284 : 210;height:52;label:modelData;family:view.family;focused:view.keyboardZone==='tools' && view.toolIndex===index;onActivated:{view.toolIndex=index;view.keyboardZone='tools';view.activate();view.forceActiveFocus();}}}}
    }
    Keys.onPressed:{
        var key=event.key,back=key===Qt.Key_Back || key===Qt.Key_Escape;
        if(back){if(!event.isAutoRepeat){if(overlay){var previous=overlay;overlay='';if(previous==='keyboard')zone='search';}else close();}}
        else if(key===Qt.Key_Return || key===Qt.Key_Enter || key===Qt.Key_Select)activate();
        else if(overlay==='filter'){
            if(key===Qt.Key_Down){if(optionIndex===options.length-1 && filterIndex===0)applyFocused=true;else if(!applyFocused)optionIndex=Math.min(options.length-1,optionIndex+1);}
            else if(key===Qt.Key_Up){if(applyFocused)applyFocused=false;else optionIndex=Math.max(0,optionIndex-1);}
            else if(key===Qt.Key_Right && filterIndex===0)applyFocused=true;else if(key===Qt.Key_Left && filterIndex===0)applyFocused=false;else return;
        }else if(overlay==='keyboard'){
            if(key===Qt.Key_Backspace)draftQuery=draftQuery.slice(0,-1);
            else if(key===Qt.Key_Left){if(keyboardZone==='keys')keyIndex=Math.max(Math.floor(keyIndex/9)*9,keyIndex-1);else toolIndex=Math.max(0,toolIndex-1);}
            else if(key===Qt.Key_Right){if(keyboardZone==='keys')keyIndex=Math.min(Math.floor(keyIndex/9)*9+8,keyIndex+1);else toolIndex=Math.min(2,toolIndex+1);}
            else if(key===Qt.Key_Down){if(keyboardZone==='keys'){if(keyIndex>=27){keyboardZone='tools';toolIndex=Math.floor((keyIndex%9)/3);}else keyIndex+=9;}}
            else if(key===Qt.Key_Up){if(keyboardZone==='tools'){keyboardZone='keys';keyIndex=27+toolIndex*3;}else keyIndex=Math.max(0,keyIndex-9);}
            else if(event.text && event.text.length===1 && event.text.charCodeAt(0)>=32)append(event.text);else return;
        }else if(key===Qt.Key_Left || key===Qt.Key_Right){
            var delta=key===Qt.Key_Left ? -1 : 1;
            if(zone==='nav')navIndex=navigation.step(navIndex,delta);
            else if(zone==='filters')filterIndex=Math.max(0,Math.min(5,filterIndex+delta));
            else if(zone==='results'){if(delta<0 && resultIndex%columns>0 || delta>0 && resultIndex%columns<columns-1)resultIndex=Math.max(0,Math.min(results.length-1,resultIndex+delta));}
            else if(zone==='pages')pageIndex=delta<0 && page>1 ? 0 : 1;else if(zone==='search' && delta<0)zone='nav';
        }else if(key===Qt.Key_Down){
            if(zone==='nav')zone='search';else if(zone==='search')zone='filters';
            else if(zone==='filters' && state==='ready' && results.length)zone='results';
            else if(zone==='filters' && state==='error'){zone='pages';pageIndex=1;}
            else if(zone==='results'){if(Math.floor(resultIndex/columns)<Math.floor((results.length-1)/columns))resultIndex=Math.min(results.length-1,resultIndex+columns);else if(hasNext || page>1){zone='pages';pageIndex=hasNext ? 1 : 0;}}
        }else if(key===Qt.Key_Up){
            if(zone==='search')zone='nav';else if(zone==='filters')zone='search';else if(zone==='results'){if(resultIndex>=columns)resultIndex-=columns;else zone='filters';}else if(zone==='pages')zone=results.length ? 'results' : 'filters';
        }else if(event.text && event.text.length===1 && event.text.charCodeAt(0)>=32){openKeyboard();append(event.text);}else return;
        event.accepted=true;
    }
}
