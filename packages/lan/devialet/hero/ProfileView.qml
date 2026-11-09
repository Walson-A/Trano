import QtQuick 2.15
import QtGraphicalEffects 1.0
import "Motion.js" as Motion

// Le profil commun, condensé pour le canapé : les chiffres, tes genres, ce que tu as regardé,
// tes notes — l'historique du PC — puis les réglages d'Atlas TV. Une page qui défile par zone.
FocusScope {
    id:view
    objectName:'atlasProfile'
    property var transport
    property var artworks
    property string family:'sans-serif'
    property bool reducedMotion:false
    property bool opened:false
    property string state:'loading'
    property var history:null
    property int generation:0
    property string zone:'nav'
    property int navIndex:1
    property int index:0
    property int noteIndex:0
    property int settingIndex:0
    property var cards:recentCards()
    property var events:recentEvents()
    property var notes:ratedCards()
    property var genres:history && history.chiffres && Array.isArray(history.chiffres.genres) ? history.chiffres.genres.filter(function(g){return g && g.genre && g.nombre>0;}).slice(0,8) : []
    property var statuses:history && history.chiffres && Array.isArray(history.chiffres.statuts) ? history.chiffres.statuts.filter(function(s){return s && (s.status || s.statut) && (s.count>0 || s.nombre>0);}) : []
    property var account:transport && transport.home.compte ? transport.home.compte : ({})
    property string pseudo:history && history.profil ? history.profil.pseudo || account.pseudo || '' : account.pseudo || ''
    property string avatar:history && history.profil ? history.profil.avatar || account.avatar || '' : account.avatar || ''
    readonly property var settings:[
        {key:'suivant_auto',label:'Épisode suivant automatique',detail:'La carte « À suivre » lance l’épisode après 8 secondes.',value:!!(transport && transport.preferences.suivant_auto!==false)},
        {key:'son_bandes_annonces',label:'Son des bandes-annonces',detail:'À l’accueil et sur les fiches.',value:!!(transport && transport.preferences.son_bandes_annonces!==false)},
        {key:'mouvements',label:'Animations réduites',detail:'Pas d’agrandissement ni de glissement au focus.',value:view.reducedMotion}
    ]
    signal interaction()
    signal closed()
    signal navigateRequested(string destination)
    signal chosen(var cards,int index,string title)
    signal reducedMotionChosen(bool value)
    signal soundChosen(bool enabled)
    function recentEvents() {
        var activity=history && history.activite ? history.activite : [],seen={},result=[];
        for(var i=0;i<activity.length;i++) {
            var card=activity[i].carte;if(!card)continue;
            var id=card.anilist_id ? 'anilist:'+card.anilist_id : card.franime ? 'franime:'+card.franime.id : card.titre;
            if(!seen[id]) {seen[id]=true;result.push(activity[i]);}
        }
        return result;
    }
    function recentCards(){return recentEvents().map(function(e){return e.carte;});}
    function ratedCards(){var list=history && Array.isArray(history.notes) ? history.notes.filter(function(c){return c && c.moi && c.moi.note>0;}) : [];return list.slice().sort(function(a,b){return b.moi.note-a.moi.note;}).slice(0,20);}
    function day(seconds){
        if(!(seconds>0))return '';var then=new Date(seconds*1000),now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
        var days=Math.floor((start-new Date(then.getFullYear(),then.getMonth(),then.getDate()).getTime())/86400000);
        return days<=0 ? 'aujourd’hui' : days===1 ? 'hier' : days<7 ? 'il y a '+days+' jours' : then.toLocaleDateString(Qt.locale('fr_FR'),'d MMM');
    }
    function eventLabel(e){
        if(!e)return '';var p=typeof e.progression==='string' ? e.progression.trim() : e.progression ? String(e.progression) : '';
        var what=e.statut==='completed' ? 'Terminé' : e.statut==='planning' || e.statut==='plans to watch' ? 'Ajouté à ta liste' : p ? (p.indexOf('-')>0 ? 'Épisodes '+p.replace(/\s*-\s*/,' à ') : 'Épisode '+p) : 'Regardé';
        var when=day(e.le);return what+(when ? ' · '+when : '');
    }
    function statusName(s){var key=(s.status || s.statut || '').toUpperCase();return {CURRENT:'En cours',PLANNING:'À voir',COMPLETED:'Terminés',PAUSED:'En pause',DROPPED:'Abandonnés',REPEATING:'À revoir'}[key] || key;}
    function open() {opened=true;forceActiveFocus();if(state!=='ready')load();}
    function close() {opened=false;generation++;closed();}
    function load() {
        if(!transport)return;
        if(!account.connecte && !account.pseudo){state='disconnected';return;}
        var turn=++generation;state='loading';
        transport.api('/tv/v1/catalog/history',{page:1},45000,function(status,value) {
            if(!opened || turn!==generation)return;
            if(status!==200 || !value || !value.chiffres || !Array.isArray(value.activite)){state='error';return;}
            history=value;state='ready';index=0;noteIndex=0;
            for(var i=0;i<Math.min(6,cards.length);i++)artworks.request(cards[i],'banner',i===0);
            for(var j=0;j<Math.min(6,notes.length);j++)artworks.request(notes[j],'banner',false);
        });
    }
    function value(key) {return history && history.chiffres && history.chiffres[key]!=null ? history.chiffres[key] : null;}
    function metric(key) {
        var n=value(key);if(n===null)return '—';
        if(key==='minutes')return n>=1440 ? (Math.round(n/144)/10).toString().replace('.',',')+' j' : Math.round(n/60)+' h';
        if(key==='moyenne')return (Math.round(n)/10).toFixed(1).replace('.',',')+' / 10';
        return Number(n).toLocaleString(Qt.locale('fr_FR'),'f',0);
    }
    function art(media) {var local=artworks && artworks.sources[String(media.anilist_id)];return local && (local.card || local.poster) || media.banniere || media.affiche || '';}
    function zones(){var list=['nav'];if(state==='error')list.push('retry');if(cards.length)list.push('cards');if(notes.length)list.push('notes');list.push('settings');return list;}
    function move(delta){var list=zones(),at=Math.max(0,list.indexOf(zone)),next=list[Math.max(0,Math.min(list.length-1,at+delta))];zone=next;scroll();}
    function scroll(){var item=zone==='cards' ? activitySection : zone==='notes' ? notesSection : zone==='settings' ? settingsSection : null;page.contentY=item ? Math.max(0,Math.min(item.y-96,page.contentHeight-page.height)) : 0;}
    function toggle(i){
        var s=settings[i];if(!s)return;
        if(s.key==='mouvements'){reducedMotionChosen(!s.value);return;}
        if(s.key==='son_bandes_annonces'){soundChosen(!s.value);return;}
        if(transport)transport.savePreferences({suivant_auto:!s.value});
    }
    function activate() {
        if(zone==='nav')navigateRequested(navigation.destination(navIndex));
        else if(zone==='retry')load();
        else if(zone==='cards' && cards.length)chosen(cards,index,'Activité récente');
        else if(zone==='notes' && notes.length)chosen(notes,noteIndex,'Tes notes');
        else if(zone==='settings')toggle(settingIndex);
    }
    Rectangle {anchors.fill:parent;color:'#090a0d'}
    Flickable {
        id:page;objectName:'profilePage';anchors.fill:parent;contentWidth:1280;contentHeight:body.y+body.height+48;interactive:false;clip:true
        Behavior on contentY {enabled:!view.reducedMotion;NumberAnimation {duration:Motion.ms('scroll');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
        Rectangle {x:64;y:118;width:72;height:72;radius:36;color:'#323641'
            Image {id:avatarImage;objectName:'profileAvatar';anchors.fill:parent;source:view.avatar;sourceSize.width:144;asynchronous:true;fillMode:Image.PreserveAspectCrop;visible:false}
            OpacityMask {anchors.fill:parent;source:avatarImage;maskSource:Rectangle {width:72;height:72;radius:36}}
            Text {anchors.centerIn:parent;visible:avatarImage.status!==Image.Ready;text:view.pseudo ? view.pseudo.slice(0,1).toUpperCase() : '—';color:'white';font.family:view.family;font.pixelSize:34;font.weight:Font.Bold}
        }
        Text {x:160;y:114;width:1050;text:view.pseudo || 'Ton profil';textFormat:Text.PlainText;color:'#fafafa';font.family:view.family;font.pixelSize:40;font.weight:Font.Bold;elide:Text.ElideRight}
        Text {x:160;y:166;text:view.account.connecte || view.pseudo ? 'AniList · Ton historique' : 'Compte AniList';color:'#a7a9b4';font.family:view.family;font.pixelSize:19}
        LoadingSkeleton {objectName:'profileSkeleton';x:64;y:226;width:1152;height:380;layout:'profile';active:view.opened && view.state==='loading' && !view.history}
        Column {
            id:body;x:64;y:226;width:1152;spacing:30
            Row {spacing:16;visible:!!view.history
                Repeater {model:[{key:'animes',label:'Animés dans ta liste'},{key:'episodes',label:'Épisodes regardés'},{key:'minutes',label:'Devant des animés'},{key:'moyenne',label:'Ta note moyenne'}]
                    Rectangle {width:276;height:104;radius:16;color:'#1b1d24';border.color:'#30323c'
                        Text {x:22;y:16;text:view.metric(modelData.key);color:'white';font.family:view.family;font.pixelSize:30;font.weight:Font.DemiBold}
                        Text {x:22;y:64;text:modelData.label;color:'#abadb8';font.family:view.family;font.pixelSize:17}
                    }
                }
            }
            Row {objectName:'profileGenres';spacing:48;visible:view.genres.length>0 || view.statuses.length>0;height:visible ? implicitHeight : 0
                Column {width:660;spacing:10;visible:view.genres.length>0
                    Text {text:'Tes genres';color:'white';font.family:view.family;font.pixelSize:24;font.weight:Font.DemiBold}
                    Repeater {model:view.genres
                        Row {spacing:14;height:24
                            Text {width:150;anchors.verticalCenter:parent.verticalCenter;text:modelData.genre;textFormat:Text.PlainText;elide:Text.ElideRight;color:'#e3e5eb';font.family:view.family;font.pixelSize:17}
                            Rectangle {width:340;height:8;radius:4;anchors.verticalCenter:parent.verticalCenter;color:'#262a33'
                                Rectangle {width:parent.width*modelData.nombre/Math.max(1,view.genres[0].nombre);height:8;radius:4;color:'#e9eaee'}
                            }
                            Text {width:130;anchors.verticalCenter:parent.verticalCenter;horizontalAlignment:Text.AlignRight;text:modelData.nombre+(modelData.moyenne ? ' · '+(Math.round(modelData.moyenne)/10).toFixed(1).replace('.',',')+'/10' : '');color:'#9aa0ad';font.family:view.family;font.pixelSize:16}
                        }
                    }
                }
                Column {width:440;spacing:10;visible:view.statuses.length>0
                    Text {text:'Ta liste';color:'white';font.family:view.family;font.pixelSize:24;font.weight:Font.DemiBold}
                    Repeater {model:view.statuses
                        Row {spacing:14;height:24
                            Text {width:200;text:view.statusName(modelData);color:'#e3e5eb';font.family:view.family;font.pixelSize:17}
                            Text {width:120;horizontalAlignment:Text.AlignRight;text:String(modelData.count || modelData.nombre || 0);color:'#9aa0ad';font.family:view.family;font.pixelSize:17}
                        }
                    }
                }
            }
            Column {id:activitySection;spacing:10;visible:view.cards.length>0;height:visible ? implicitHeight : 0
                Text {text:'Ce que tu as regardé';color:'white';font.family:view.family;font.pixelSize:24;font.weight:Font.DemiBold}
                ListView {id:rail;objectName:'profileActivity';x:-14;width:1230;height:220;orientation:ListView.Horizontal;spacing:8;clip:true;model:view.events;currentIndex:view.index;keyNavigationEnabled:false;interactive:false;rightMargin:64;cacheBuffer:0
                    onCurrentIndexChanged:if(currentIndex>=0 && currentIndex<count)positionViewAtIndex(currentIndex,ListView.Contain)
                    delegate:FocusCard {title:modelData.carte.titre;subtitle:view.eventLabel(modelData);family:view.family;reducedMotion:view.reducedMotion;artwork:view.art(modelData.carte);fallbackArtwork:modelData.carte.affiche || '';focused:view.zone==='cards' && view.index===index;selected:view.zone==='cards' && view.index===index
                        onActivated:{view.zone='cards';view.index=index;view.activate();}
                        onArtworkFailed:view.artworks.failed(modelData.carte,poster ? 'poster' : 'banner',failedSource)
                        onArtworkReady:view.artworks.confirmed(modelData.carte,poster ? 'poster' : 'banner',loadedSource)
                    }
                }
            }
            Column {id:notesSection;spacing:10;visible:view.notes.length>0;height:visible ? implicitHeight : 0
                Text {text:'Tes notes';color:'white';font.family:view.family;font.pixelSize:24;font.weight:Font.DemiBold}
                ListView {id:noteRail;objectName:'profileNotes';x:-14;width:1230;height:220;orientation:ListView.Horizontal;spacing:8;clip:true;model:view.notes;currentIndex:view.noteIndex;keyNavigationEnabled:false;interactive:false;rightMargin:64;cacheBuffer:0
                    onCurrentIndexChanged:if(currentIndex>=0 && currentIndex<count)positionViewAtIndex(currentIndex,ListView.Contain)
                    delegate:FocusCard {title:modelData.titre;subtitle:'Ta note · '+String(modelData.moi.note).replace('.',',')+' / 10';family:view.family;reducedMotion:view.reducedMotion;artwork:view.art(modelData);fallbackArtwork:modelData.affiche || '';focused:view.zone==='notes' && view.noteIndex===index;selected:view.zone==='notes' && view.noteIndex===index
                        onActivated:{view.zone='notes';view.noteIndex=index;view.activate();}
                        onArtworkFailed:view.artworks.failed(modelData,poster ? 'poster' : 'banner',failedSource)
                        onArtworkReady:view.artworks.confirmed(modelData,poster ? 'poster' : 'banner',loadedSource)
                    }
                }
            }
            Column {id:settingsSection;objectName:'profileSettings';spacing:10
                Text {text:'Réglages d’Atlas TV';color:'white';font.family:view.family;font.pixelSize:24;font.weight:Font.DemiBold}
                Text {width:1152;visible:!(view.transport && view.transport.preferencesEnabled);text:'Ces réglages valent pour cette séance : ta connexion ne partage pas encore les préférences.';color:'#8f95a3';font.family:view.family;font.pixelSize:16}
                Repeater {model:view.settings
                    Item {objectName:'profileSetting'+index;width:760;height:66
                        property bool targeted:view.zone==='settings' && view.settingIndex===index
                        Rectangle {anchors.fill:parent;radius:14;color:parent.targeted ? '#f6f6f7' : '#1b1d24';border.color:parent.targeted ? 'white' : '#30323c'}
                        Text {x:22;y:10;width:560;text:modelData.label;color:parent.targeted ? '#121316' : 'white';font.family:view.family;font.pixelSize:19;font.weight:Font.DemiBold}
                        Text {x:22;y:38;width:560;text:modelData.detail;elide:Text.ElideRight;color:parent.targeted ? '#4b4e58' : '#9aa0ad';font.family:view.family;font.pixelSize:15}
                        Rectangle {x:parent.width-82;y:19;width:60;height:28;radius:14;color:modelData.value ? (parent.targeted ? '#121316' : '#f6f6f7') : (parent.targeted ? '#c9ccd5' : '#3a3f4b')
                            Rectangle {x:modelData.value ? 34 : 4;y:4;width:20;height:20;radius:10;color:modelData.value ? (parent.parent.targeted ? '#f6f6f7' : '#121316') : 'white'
                                Behavior on x {enabled:!view.reducedMotion;NumberAnimation {duration:Motion.ms('press');easing.type:Easing.Bezier;easing.bezierCurve:Motion.easeOut()}}
                            }
                        }
                        Accessible.role:Accessible.CheckBox;Accessible.name:modelData.label;Accessible.checked:modelData.value
                        MouseArea {anchors.fill:parent;onClicked:{view.zone='settings';view.settingIndex=index;view.activate();}}
                    }
                }
            }
        }
        Text {x:64;y:body.y+body.height-20;width:1152;visible:!!text;color:'#abadb8';font.family:view.family;font.pixelSize:19
            text:view.state==='loading' ? '' : view.state==='disconnected' ? 'Connecte ton compte AniList dans Atlas pour retrouver ta liste et ton historique.' : view.state==='error' ? 'Ton historique est indisponible pour le moment.' : ''
        }
    }
    // Dès qu'on descend, la navigation garde un fond plein : le contenu ne passe plus dessous.
    Rectangle {width:1280;height:100;color:'#090a0d';opacity:page.contentY>8 ? 1 : 0
        Behavior on opacity {enabled:!view.reducedMotion;NumberAnimation {duration:Motion.ms('fade')}}
        Rectangle {y:parent.height;width:1280;height:24;gradient:Gradient {GradientStop {position:0;color:'#090a0d'} GradientStop {position:1;color:'#00090a0d'}}}
    }
    TvNavigation {id:navigation;page:'profile';libraryEnabled:!!(view.transport && view.transport.libraryEnabled);family:view.family;reducedMotion:view.reducedMotion;focused:view.zone==='nav';selectedIndex:view.navIndex;avatar:view.avatar;pseudo:view.pseudo || 'Profil';onDestinationRequested:view.navigateRequested(destination)}
    HeroButton {x:1000;y:118;width:216;visible:view.state==='error';label:'Réessayer';family:view.family;reducedMotion:view.reducedMotion;focused:view.zone==='retry';onActivated:view.load()}
    Keys.onPressed: {
        interaction();
        var key=event.key;
        if(key===Qt.Key_Back || key===Qt.Key_Escape)close();
        else if(key===Qt.Key_Return || key===Qt.Key_Enter || key===Qt.Key_Select)activate();
        else if(key===Qt.Key_Down){if(zone==='settings')settingIndex=Math.min(settings.length-1,settingIndex+1);else move(1);}
        else if(key===Qt.Key_Up){if(zone==='settings' && settingIndex>0)settingIndex--;else move(-1);}
        else if(zone==='nav' && key===Qt.Key_Right)navIndex=navigation.step(navIndex,1);
        else if(zone==='nav' && key===Qt.Key_Left)navIndex=navigation.step(navIndex,-1);
        else if(zone==='cards' && key===Qt.Key_Right)index=Math.min(cards.length-1,index+1);
        else if(zone==='cards' && key===Qt.Key_Left)index=Math.max(0,index-1);
        else if(zone==='notes' && key===Qt.Key_Right)noteIndex=Math.min(notes.length-1,noteIndex+1);
        else if(zone==='notes' && key===Qt.Key_Left)noteIndex=Math.max(0,noteIndex-1);
        else return;
        event.accepted=true;
    }
}
