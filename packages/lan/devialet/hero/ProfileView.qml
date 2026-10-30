import QtQuick 2.15
import QtGraphicalEffects 1.0

FocusScope {
    id:view
    objectName:'atlasProfile'
    property var transport
    property var artworks
    property string family:'sans-serif'
    property bool opened:false
    property string state:'loading'
    property var history:null
    property int generation:0
    property string zone:'nav'
    property int navIndex:1
    property int index:0
    property var cards:recentCards()
    property var account:transport && transport.home.compte ? transport.home.compte : ({})
    property string pseudo:history && history.profil ? history.profil.pseudo || account.pseudo || '' : account.pseudo || ''
    property string avatar:history && history.profil ? history.profil.avatar || account.avatar || '' : account.avatar || ''
    signal interaction()
    signal closed()
    signal navigateRequested(string destination)
    signal chosen(var cards,int index,string title)
    function recentCards() {
        var activity=history && history.activite ? history.activite : [],seen={},result=[];
        for(var i=0;i<activity.length;i++) {
            var card=activity[i].carte;if(!card)continue;
            var id=card.anilist_id ? 'anilist:'+card.anilist_id : card.franime ? 'franime:'+card.franime.id : card.titre;
            if(!seen[id]) {seen[id]=true;result.push(card);}
        }
        return result;
    }
    function open() {opened=true;forceActiveFocus();if(state!=='ready')load();}
    function close() {opened=false;generation++;closed();}
    function load() {
        if(!transport)return;
        if(!account.connecte && !account.pseudo){state='disconnected';return;}
        var turn=++generation;state='loading';
        transport.api('/tv/v1/catalog/history',{page:1},45000,function(status,value) {
            if(!opened || turn!==generation)return;
            if(status!==200 || !value || !value.chiffres || !Array.isArray(value.activite)){state='error';return;}
            history=value;state='ready';index=0;
            for(var i=0;i<Math.min(6,cards.length);i++)artworks.request(cards[i],'banner',i===0);
        });
    }
    function value(key) {return history && history.chiffres && history.chiffres[key]!=null ? history.chiffres[key] : null;}
    function metric(key) {
        var n=value(key);if(n===null)return '—';
        if(key==='minutes')return Math.round(n/60)+' h';
        if(key==='moyenne')return (Math.round(n)/10).toFixed(1).replace('.',',')+' / 10';
        return String(n);
    }
    function art(media) {var local=artworks && artworks.sources[String(media.anilist_id)];return local && (local.card || local.poster) || media.banniere || media.affiche || '';}
    function activate() {if(zone==='nav')navigateRequested(navigation.destination(navIndex));else if(zone==='retry')load();else if(cards.length)chosen(cards,index,'Activité récente');}
    Rectangle {anchors.fill:parent;color:'#090a0d'}
    TvNavigation {id:navigation;page:'profile';libraryEnabled:!!(view.transport && view.transport.libraryEnabled);family:view.family;focused:view.zone==='nav';selectedIndex:view.navIndex;avatar:view.avatar;pseudo:view.pseudo || 'Profil';onDestinationRequested:view.navigateRequested(destination)}
    Rectangle {x:64;y:122;width:72;height:72;radius:36;color:'#323641'
        Image {id:avatarImage;objectName:'profileAvatar';anchors.fill:parent;source:view.avatar;sourceSize.width:144;asynchronous:true;fillMode:Image.PreserveAspectCrop;visible:false}
        OpacityMask {anchors.fill:parent;source:avatarImage;maskSource:Rectangle {width:72;height:72;radius:36}}
        Text {anchors.centerIn:parent;visible:avatarImage.status!==Image.Ready;text:view.pseudo ? view.pseudo.slice(0,1).toUpperCase() : '—';color:'white';font.family:view.family;font.pixelSize:34;font.weight:Font.Bold}
    }
    Text {x:160;y:119;width:1050;text:view.pseudo || 'Ton profil';textFormat:Text.PlainText;color:'#fafafa';font.family:view.family;font.pixelSize:40;font.weight:Font.Bold;elide:Text.ElideRight}
    Text {x:160;y:170;text:view.account.connecte || view.pseudo ? 'AniList · Ton historique' : 'Compte AniList';color:'#a7a9b4';font.family:view.family;font.pixelSize:19}
    LoadingSkeleton {objectName:'profileSkeleton';x:64;y:238;width:1152;height:380;layout:'profile';active:view.opened && view.state==='loading' && !view.history}
    Row {x:64;y:238;spacing:16;visible:!!view.history
        Repeater {model:[{key:'animes',label:'Animés dans ta liste'},{key:'episodes',label:'Épisodes regardés'},{key:'minutes',label:'Temps de visionnage'},{key:'moyenne',label:'Ta note moyenne'}]
            Rectangle {width:276;height:112;radius:16;color:'#1b1d24';border.color:'#30323c'
                Text {x:22;y:18;text:view.metric(modelData.key);color:'white';font.family:view.family;font.pixelSize:31;font.weight:Font.DemiBold}
                Text {x:22;y:70;text:modelData.label;color:'#abadb8';font.family:view.family;font.pixelSize:17}
            }
        }
    }
    Text {x:64;y:392;text:'Activité récente';visible:view.cards.length>0;color:'white';font.family:view.family;font.pixelSize:26;font.weight:Font.DemiBold}
    ListView {id:rail;x:50;y:432;width:1230;height:220;orientation:ListView.Horizontal;spacing:8;clip:true;model:view.cards;currentIndex:view.index;keyNavigationEnabled:false;interactive:false;rightMargin:64;cacheBuffer:0
        onCurrentIndexChanged:if(currentIndex>=0 && currentIndex<count)positionViewAtIndex(currentIndex,ListView.Contain)
        delegate:FocusCard {title:modelData.titre;family:view.family;artwork:view.art(modelData);fallbackArtwork:modelData.affiche || '';focused:view.zone==='cards' && view.index===index;selected:view.index===index
            onActivated:{view.zone='cards';view.index=index;view.activate();}
            onArtworkFailed:view.artworks.failed(modelData,poster ? 'poster' : 'banner',failedSource)
            onArtworkReady:view.artworks.confirmed(modelData,poster ? 'poster' : 'banner',loadedSource)
        }
    }
    Text {x:64;y:662;width:1152;color:'#abadb8';font.family:view.family;font.pixelSize:19
        text:view.state==='loading' ? 'Chargement de ton historique…' : view.state==='disconnected' ? 'Connecte ton compte AniList dans Atlas pour retrouver ta liste et ton historique.' : view.state==='error' ? 'Ton historique est indisponible pour le moment.' : !view.cards.length ? 'Aucune activité récente.' : ''
    }
    HeroButton {x:1000;y:650;width:216;visible:view.state==='error';label:'Réessayer';family:view.family;focused:view.zone==='retry';onActivated:view.load()}
    Keys.onPressed: {
        interaction();
        var key=event.key;
        if(key===Qt.Key_Back || key===Qt.Key_Escape)close();
        else if(key===Qt.Key_Return || key===Qt.Key_Enter || key===Qt.Key_Select)activate();
        else if(key===Qt.Key_Down){if(cards.length)zone='cards';else if(state==='error')zone='retry';}
        else if(key===Qt.Key_Up)zone='nav';
        else if(zone==='nav' && key===Qt.Key_Right)navIndex=navigation.step(navIndex,1);
        else if(zone==='nav' && key===Qt.Key_Left)navIndex=navigation.step(navIndex,-1);
        else if(zone==='cards' && key===Qt.Key_Right)index=Math.min(cards.length-1,index+1);
        else if(zone==='cards' && key===Qt.Key_Left)index=Math.max(0,index-1);
        else return;
        event.accepted=true;
    }
}
