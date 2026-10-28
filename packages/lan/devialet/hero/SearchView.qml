import QtQuick 2.15

FocusScope {
    id: view
    objectName:'atlasSearch'
    property var transport
    property var artworks
    property string family: 'sans-serif'
    property bool opened: false
    property string query: ''
    property string state: 'hint'
    property var results: []
    readonly property var cards:!query.length && transport && transport.home.hero ? transport.home.hero : results
    property int generation: 0
    property string zone: 'keys'
    property int keyIndex: 0
    property int toolIndex: 0
    property int resultIndex: 0
    property int navIndex:0
    property string avatar:''
    readonly property var letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
    signal closed()
    signal navigateRequested(string destination)
    signal chosen(var cards,int index,string title)
    function open() { opened=true;forceActiveFocus();if(query.trim().length>=2 && state==='hint') debounce.restart(); }
    function close() { opened=false;generation++;debounce.stop();closed(); }
    function append(text) { query=(query+text).slice(0,60); }
    function search(focusResults) {
        var term=query.trim(),turn=++generation;
        if(term.length<2 || !opened || !transport) {state='hint';results=[];return;}
        state='loading';
        transport.api('/tv/v1/catalog/search',{q:term},45000,function(status,value) {
            if(!opened || turn!==generation) return;
            if(status!==200 || !value || !Array.isArray(value.resultats)) {state='error';return;}
            results=value.resultats;resultIndex=0;state='ready';
            if(focusResults && results.length)zone='results';
            for(var i=0;i<Math.min(6,results.length);i++) artworks.request(results[i],'banner',i===0);
        });
    }
    function activate() {
        if(zone==='nav')navigateRequested(navIndex===2 ? 'home' : navIndex===1 ? 'profile' : 'search');
        else if(zone==='keys') append(letters[keyIndex]);
        else if(zone==='tools') {
            if(toolIndex===0) append(' ');else if(toolIndex===1) query=query.slice(0,-1);else search(true);
        } else if(cards.length) chosen(cards,resultIndex,query.trim() ? 'Recherche · '+query.trim() : 'À découvrir');
    }
    function art(media) {
        var local=artworks && artworks.sources[String(media.anilist_id)];
        return local && (local.card || local.poster) || media.banniere || media.affiche || '';
    }
    onQueryChanged: {
        generation++;results=[];resultIndex=0;state='hint';
        if(opened && debounce) { if(query.trim().length>=2) {state='loading';debounce.restart();}else debounce.stop(); }
    }
    onOpenedChanged: if(!opened) {generation++;debounce.stop();}
    Timer { id:debounce; interval:550; onTriggered:view.search() }
    Rectangle {anchors.fill:parent;color:'#090a0d'}
    TvNavigation {id:navigation;page:'search';family:view.family;focused:view.zone==='nav';selectedIndex:view.navIndex;avatar:view.avatar;pseudo:view.transport && view.transport.home.compte ? view.transport.home.compte.pseudo || 'Profil' : 'Profil';onDestinationRequested:view.navigateRequested(destination)}
    Text {x:64;y:102;text:'Recherche';color:'#fafafa';font.family:view.family;font.pixelSize:40;font.weight:Font.Bold}
    Rectangle {x:494;y:112;width:722;height:64;radius:12;color:'#1b1d23';border.color:'#4b4d56'
        Text {x:20;anchors.verticalCenter:parent.verticalCenter;width:682;text:view.query || 'Un titre, en français, anglais ou japonais';textFormat:Text.PlainText;elide:Text.ElideLeft;color:view.query ? 'white' : '#8e909b';font.family:view.family;font.pixelSize:view.query ? 26 : 20}
    }
    Grid {x:64;y:224;columns:6;spacing:8
        Repeater {model:view.letters
            Rectangle {width:52;height:46;radius:9;color:view.zone==='keys' && view.keyIndex===index ? '#fafafa' : '#24262e'
                Text {anchors.centerIn:parent;text:modelData;color:view.zone==='keys' && view.keyIndex===index ? '#121316' : 'white';font.family:view.family;font.pixelSize:22}
                MouseArea {anchors.fill:parent;onClicked:{view.zone='keys';view.keyIndex=index;view.activate();view.forceActiveFocus();}}
            }
        }
    }
    Row {x:64;y:560;spacing:8
        Repeater {model:['Espace','Effacer','Chercher']
            HeroButton {width:112;label:modelData;family:view.family;focused:view.zone==='tools' && view.toolIndex===index;onActivated:{view.zone='tools';view.toolIndex=index;view.activate();view.forceActiveFocus();}}
        }
    }
    Text {x:64;y:652;width:360;text:'Flèches pour choisir · OK pour saisir';color:'#9b9da7';font.family:view.family;font.pixelSize:16}
    Text {x:494;y:203;width:720;color:'#bfc0c9';font.family:view.family;font.pixelSize:19;wrapMode:Text.WordWrap;textFormat:Text.PlainText
        text:!view.query.length && view.cards.length ? 'À découvrir' : view.state==='hint' ? 'Saisis au moins deux caractères.' : view.state==='loading' ? 'Recherche…' : view.state==='error' ? 'Recherche indisponible. Choisis Chercher pour réessayer.' : view.results.length ? view.results.length+' résultats' : 'Aucun résultat pour « '+view.query.trim()+' ».'
    }
    GridView {id:grid;x:480;y:244;width:736;height:452;cellWidth:244;cellHeight:205;clip:true;model:view.cards;currentIndex:view.resultIndex;keyNavigationEnabled:false;interactive:false
        onCurrentIndexChanged:if(currentIndex>=0 && currentIndex<count)positionViewAtIndex(currentIndex,GridView.Contain)
        delegate:FocusCard {artworkWidth:214;title:modelData.titre;family:view.family;artwork:view.art(modelData);fallbackArtwork:modelData.affiche || '';focused:view.zone==='results' && view.resultIndex===index;selected:view.resultIndex===index
            onActivated:{view.zone='results';view.resultIndex=index;view.activate();}
            onArtworkFailed:view.artworks.request(modelData,poster ? 'poster' : 'banner',true)
        }
    }
    Keys.onPressed: {
        var key=event.key;
        if(key===Qt.Key_Back || key===Qt.Key_Escape) close();
        else if(key===Qt.Key_Return || key===Qt.Key_Enter || key===Qt.Key_Select) activate();
        else if(key===Qt.Key_Backspace) query=query.slice(0,-1);
        else if(key===Qt.Key_Left) {
            if(zone==='nav')navIndex=navigation.step(navIndex,-1);
            else if(zone==='keys') keyIndex=Math.max(Math.floor(keyIndex/6)*6,keyIndex-1);
            else if(zone==='tools') toolIndex=Math.max(0,toolIndex-1);
            else if(zone==='results') {if(resultIndex%3===0)zone='keys';else resultIndex--;}
        } else if(key===Qt.Key_Right) {
            if(zone==='nav')navIndex=navigation.step(navIndex,1);
            else if(zone==='keys') {if(keyIndex%6===5 && cards.length)zone='results';else keyIndex=Math.min(Math.floor(keyIndex/6)*6+5,keyIndex+1);}
            else if(zone==='tools') {if(toolIndex===2 && cards.length)zone='results';else toolIndex=Math.min(2,toolIndex+1);}
            else if(zone==='results' && resultIndex%3<2) resultIndex=Math.min(cards.length-1,resultIndex+1);
        } else if(key===Qt.Key_Down) {
            if(zone==='nav')zone='keys';else if(zone==='keys'){if(keyIndex>=30)zone='tools';else keyIndex+=6;}
            else if(zone==='tools' && cards.length)zone='results';else if(zone==='results')resultIndex=Math.min(cards.length-1,resultIndex+3);
        } else if(key===Qt.Key_Up) {
            if(zone==='keys'){if(keyIndex<6)zone='nav';else keyIndex-=6;}
            else if(zone==='tools'){zone='keys';keyIndex=30+toolIndex*2;}
            else if(zone==='results'){if(resultIndex<3)zone='nav';else resultIndex-=3;}
        } else if(event.text && event.text.length===1 && event.text.charCodeAt(0)>=32) append(event.text);
        else return;
        event.accepted=true;
    }
}
