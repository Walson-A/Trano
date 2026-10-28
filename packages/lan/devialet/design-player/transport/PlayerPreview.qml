import QtQuick 2.15
import "../netflix" as Assets

// An isolated composition study. All choices are explicit fixtures, no API/SDK/decoder.
FocusScope {
    id:study;objectName:'transportStudy';width:1280;height:720;focus:true
    property url frame
    property string family:'sans-serif'
    property string title:'To Your Eternity'
    property string zone:'surface'
    property string menu:''
    property bool hud:true
    property bool paused:false
    property bool failed:false
    property bool pending:false
    property bool pendingFailed:false
    property bool singleFile:false
    property bool brightFrame:false
    property int commandIndex:0
    property int menuIndex:0
    property int episodeIndex:0
    property int season:1
    property int playingSeason:1
    property int currentEpisode:1
    property int errorIndex:0
    property int positionMs:432000
    property int durationMs:1500000
    property int proposedMs:-1
    property string quality:'1080p'
    property string version:'VOSTFR'
    property string reader:'Mail.ru'
    property string requestedLabel:''
    property var requestedChoice:({})
    readonly property var menus:['version','source','quality']
    readonly property var settings:[{label:'Version',value:version,icon:'captions'}, {label:'Source',value:reader,icon:'monitor-play'}, {label:'Qualité',value:quality,icon:'settings'}]
    readonly property var options:menu==='quality' ? (singleFile ? [{label:'Originale',detail:'Fichier unique'}] : [{label:'1080p',detail:'Haute définition'},{label:'360p',detail:'Définition réduite'}]) : menu==='version' ? [{label:'VOSTFR',detail:'Voix originales · Sous-titres français'},{label:'VF',detail:'Voix françaises'}] : menu==='source' ? [{label:'Mail.ru',detail:'Voiranime'},{label:'YourUpload',detail:'Anime-sama'}] : [{label:'Saison 1',detail:'20 épisodes'},{label:'Saison 2',detail:'20 épisodes'}]
    readonly property string heading:menu==='quality' ? 'Qualité' : menu==='version' ? 'Version' : menu==='source' ? 'Source et lecteur' : 'Saisons'
    function clock(ms){var s=Math.floor(ms/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
    function active(index){return menu==='quality' ? options[index].label===quality : menu==='version' ? options[index].label===version : menu==='source' ? options[index].label===reader : index===season-1;}
    function openSetting(index){commandIndex=index;menu=menus[index];zone='menu';pending=false;pendingFailed=false;menuIndex=0;for(var i=0;i<options.length;i++)if(active(i))menuIndex=i;}
    function openEpisodes(){menu='episodes';zone='episodes';episodeIndex=season===playingSeason ? currentEpisode-1 : 0;}
    function dismiss(){var content=menu==='episodes'||menu==='seasons';menu='';zone=content ? 'content' : 'settings';pending=false;pendingFailed=false;}
    function prepare(){
        if(pending)return;
        if(menu==='seasons'){season=menuIndex+1;menu='episodes';zone='episodes';episodeIndex=0;return;}
        if(menu==='episodes' && season===playingSeason && episodeIndex+1===currentEpisode){dismiss();return;}
        if(menu!=='episodes' && active(menuIndex)){dismiss();return;}
        requestedChoice={menu:menu,index:menu==='episodes' ? episodeIndex : menuIndex,season:season};
        requestedLabel=menu==='episodes' ? 'Épisode '+(episodeIndex+1) : options[menuIndex].label;
        pending=true;pendingFailed=false;
    }
    // Called by the bench, deliberately not timed as though real media had loaded.
    function complete(success){
        if(!pending)return;
        pending=false;
        if(!success){pendingFailed=true;return;}
        var choice=requestedChoice;
        if(choice.menu==='quality')quality=options[choice.index].label;
        else if(choice.menu==='version')version=options[choice.index].label;
        else if(choice.menu==='source'){reader=options[choice.index].label;singleFile=reader==='YourUpload';quality=singleFile ? 'Originale' : '1080p';}
        else if(choice.menu==='episodes'){playingSeason=choice.season;currentEpisode=choice.index+1;positionMs=0;}
        dismiss();failed=false;
    }
    function back(){
        if(pending || pendingFailed){pending=false;pendingFailed=false;return;}
        if(menu==='seasons'){menu='episodes';zone='season';return;}
        if(menu){dismiss();return;}
        if(proposedMs>=0){proposedMs=-1;zone='timeline';return;}
        hud=false;zone='surface';
    }
    function showState(name){
        hud=true;paused=false;failed=false;pending=false;pendingFailed=false;menu='';zone='surface';commandIndex=0;menuIndex=0;episodeIndex=0;season=1;playingSeason=1;currentEpisode=1;errorIndex=0;positionMs=432000;proposedMs=-1;quality='1080p';version='VOSTFR';reader='Mail.ru';singleFile=false;brightFrame=false;
        if(name==='video')hud=false;
        if(name==='focus'){zone='settings';commandIndex=1;}
        if(name==='pause')paused=true;
        if(name==='timeline'){zone='timeline';proposedMs=565000;}
        if(name==='quality'){openSetting(2);menuIndex=1;}
        if(name==='quality-original'){reader='YourUpload';singleFile=true;quality='Originale';openSetting(2);}
        if(name==='version'){openSetting(0);menuIndex=1;}
        if(name==='source'){openSetting(1);menuIndex=1;}
        if(name==='episodes'){openEpisodes();episodeIndex=1;}
        if(name==='episodes-far'){openEpisodes();episodeIndex=18;}
        if(name==='seasons'){openEpisodes();menu='seasons';zone='menu';menuIndex=1;}
        if(name==='loading' || name==='change-error'){openSetting(2);menuIndex=1;prepare();if(name==='change-error')complete(false);}
        if(name==='error')failed=true;
        if(name==='error-source'){failed=true;openSetting(1);menuIndex=1;}
        if(name==='episode-loading'){openEpisodes();episodeIndex=1;prepare();}
        if(name==='bright'){brightFrame=true;openSetting(2);menuIndex=1;}
    }
    Rectangle {anchors.fill:parent;color:study.brightFrame ? 'white' : 'black'}
    Image {id:imagePlane;anchors.fill:parent;source:study.frame;fillMode:Image.PreserveAspectFit;visible:!study.brightFrame}
    Item {anchors.fill:parent;visible:study.hud
        Rectangle {anchors.bottom:parent.bottom;width:1280;height:360;gradient:Gradient {GradientStop {position:0;color:'#00000000'} GradientStop {position:.35;color:'#a8000000'} GradientStop {position:.72;color:'#e8000000'} GradientStop {position:1;color:'#f8000000'}}}
        // Identity and playback settings are separate above the transport rail.
        Text {x:64;y:500;width:535;height:48;text:study.title;textFormat:Text.PlainText;color:'#f5f5f7';font.family:study.family;font.pixelSize:34;font.weight:Font.Bold;elide:Text.ElideRight}
        Text {x:64;y:548;width:535;text:'Saison '+study.playingSeason+' · Épisode '+study.currentEpisode;color:'#c6c6ce';font.family:study.family;font.pixelSize:20}
        Row {x:688;y:506;spacing:12;visible:!study.failed || !!study.menu
            Repeater {model:study.settings
                Setting {family:study.family;label:modelData.label;value:modelData.value;icon:modelData.icon;focused:study.zone==='settings' && study.commandIndex===index;opened:study.menu===study.menus[index];onActivated:study.openSetting(index)}
            }
        }
        Rectangle {x:64;y:600;width:1152;height:study.zone==='timeline' ? 6 : 4;radius:3;color:'#66ffffff'
            Rectangle {width:parent.width*study.positionMs/study.durationMs;height:parent.height;radius:3;color:'#f5f5f7'}
            Rectangle {x:parent.width*(study.proposedMs>=0 ? study.proposedMs : study.positionMs)/study.durationMs-width/2;y:parent.height/2-height/2;width:study.zone==='timeline' ? 22 : 14;height:width;radius:width/2;color:'#f5f5f7'}
            Rectangle {x:Math.max(0,Math.min(parent.width-width,parent.width*study.proposedMs/study.durationMs-width/2));y:-66;width:104;height:42;radius:10;color:'#ef242429';border.color:'#35ffffff';visible:study.proposedMs>=0
                Text {anchors.centerIn:parent;text:study.clock(study.proposedMs);color:'white';font.family:study.family;font.pixelSize:23;font.weight:Font.DemiBold}
            }
            MouseArea {anchors.fill:parent;anchors.margins:-14;onClicked:{study.zone='timeline';study.proposedMs=Math.max(0,Math.min(study.durationMs-1000,(mouse.x-14)/1152*study.durationMs));}}
        }
        Text {x:64;y:620;text:study.clock(study.positionMs);color:'#c6c6ce';font.family:study.family;font.pixelSize:18}
        Text {x:1030;y:620;width:186;horizontalAlignment:Text.AlignRight;text:'−'+study.clock(study.durationMs-study.positionMs);color:'#c6c6ce';font.family:study.family;font.pixelSize:18}
        Item {x:52;y:658;width:168;height:42
            Rectangle {anchors.fill:parent;radius:10;color:study.zone==='content' ? '#f5f5f7' : study.menu==='episodes' || study.menu==='seasons' ? '#28ffffff' : 'transparent'}
            Assets.Glyph {x:12;y:11;width:20;height:20;name:'list-video';ink:study.zone==='content' ? '#16161a' : 'white'}
            Text {x:42;y:8;text:'Épisodes';color:study.zone==='content' ? '#16161a' : '#f5f5f7';font.family:study.family;font.pixelSize:20;font.weight:Font.DemiBold}
            MouseArea {anchors.fill:parent;onClicked:study.openEpisodes()}
        }
        Text {x:238;y:666;text:'Saison '+study.playingSeason+' · 20 épisodes';color:'#a9a9b3';font.family:study.family;font.pixelSize:17}
    }
    Item {anchors.centerIn:parent;width:80;height:80;visible:study.hud && study.paused && !study.menu && !study.failed
        Rectangle {anchors.fill:parent;radius:40;color:'#a5202025';border.color:'#25ffffff'}
        Assets.Glyph {anchors.centerIn:parent;width:32;height:32;name:'play'}
    }
    // Small settings menus remain attached to their trigger. The HUD never moves.
    Glass {id:choices;objectName:'transportChoices';video:imagePlane;frost:!study.brightFrame;x:study.menu==='seasons' ? 64 : Math.min(1216-width,688+study.commandIndex*180);y:486-height;width:study.menu==='version' ? 396 : 304;height:study.pending || study.pendingFailed ? 210 : 72+study.options.length*64;visible:!!study.menu && study.menu!=='episodes'
        Text {x:24;y:19;width:parent.width-48;text:study.heading;color:'#f5f5f7';font.family:study.family;font.pixelSize:23;font.weight:Font.DemiBold}
        Column {x:8;y:64;visible:!study.pending && !study.pendingFailed
            Repeater {model:study.options
                Assets.MenuRow {width:choices.width-16;height:64;family:study.family;label:modelData.label;detail:modelData.detail;focused:study.menuIndex===index;chosen:study.active(index);onActivated:{study.menuIndex=index;study.prepare();}}
            }
        }
        Text {x:24;y:76;width:parent.width-48;text:study.pendingFailed ? study.requestedLabel+' indisponible' : 'Préparation de '+study.requestedLabel+'…';color:'#f5f5f7';font.family:study.family;font.pixelSize:20;wrapMode:Text.Wrap;visible:study.pending || study.pendingFailed}
        Text {x:24;y:116;width:parent.width-48;text:study.failed ? 'Ta position est conservée.' : 'La lecture actuelle est conservée.';color:'#c6c6ce';font.family:study.family;font.pixelSize:17;wrapMode:Text.Wrap;visible:study.pending || study.pendingFailed}
        Rectangle {x:16;y:157;width:parent.width-32;height:40;radius:8;color:'#f5f5f7';visible:study.pending || study.pendingFailed
            Text {anchors.centerIn:parent;text:study.pendingFailed ? 'Revenir aux choix' : 'Annuler';color:'#16161a';font.family:study.family;font.pixelSize:18;font.weight:Font.DemiBold}
            MouseArea {anchors.fill:parent;onClicked:{study.pending=false;study.pendingFailed=false;}}
        }
    }
    // Content navigation is a horizontal shelf, not another playback setting.
    Glass {id:episodes;objectName:'transportEpisodes';video:imagePlane;x:64;y:290;width:1152;height:184;visible:study.menu==='episodes'
        Item {x:16;y:12;width:184;height:44;visible:!study.pending && !study.pendingFailed
            Rectangle {anchors.fill:parent;radius:8;color:study.zone==='season' ? '#f5f5f7' : 'transparent'}
            Text {x:8;y:7;text:'Saison '+study.season;color:study.zone==='season' ? '#151519' : '#f5f5f7';font.family:study.family;font.pixelSize:23;font.weight:Font.DemiBold}
            Assets.Glyph {x:136;y:14;width:16;height:16;name:'chevron-down';ink:study.zone==='season' ? '#151519' : 'white'}
            MouseArea {anchors.fill:parent;onClicked:{study.menu='seasons';study.zone='menu';study.menuIndex=study.season-1;}}
        }
        Text {x:880;y:24;width:248;horizontalAlignment:Text.AlignRight;text:(study.episodeIndex+1)+' / 20 épisodes';color:'#c6c6ce';font.family:study.family;font.pixelSize:18;visible:!study.pending && !study.pendingFailed}
        ListView {id:shelf;objectName:'episodeShelf';x:8;y:70;width:1136;height:104;orientation:ListView.Horizontal;spacing:8;clip:true;interactive:false;model:20;currentIndex:study.episodeIndex;onCurrentIndexChanged:positionViewAtIndex(currentIndex,ListView.Contain);visible:!study.pending && !study.pendingFailed
            delegate:Item {width:180;height:100
                Rectangle {anchors.fill:parent;anchors.margins:2;radius:10;color:index===study.episodeIndex && study.zone==='episodes' ? '#f5f5f7' : 'transparent'}
                Text {x:16;y:16;text:'Épisode '+(index+1);color:index===study.episodeIndex && study.zone==='episodes' ? '#151519' : '#f5f5f7';font.family:study.family;font.pixelSize:21;font.weight:Font.DemiBold}
                Text {x:16;y:49;text:index===study.currentEpisode-1 && study.season===study.playingSeason ? 'En lecture · '+study.clock(study.positionMs) : '';color:index===study.episodeIndex && study.zone==='episodes' ? '#53535b' : '#bfbfc8';font.family:study.family;font.pixelSize:16}
                Rectangle {x:16;y:82;width:148;height:3;radius:2;color:'#40ffffff';visible:index===study.currentEpisode-1 && study.season===study.playingSeason
                    Rectangle {width:parent.width*study.positionMs/study.durationMs;height:3;color:index===study.episodeIndex && study.zone==='episodes' ? '#151519' : '#f5f5f7'}
                }
                MouseArea {anchors.fill:parent;onClicked:{study.episodeIndex=index;study.prepare();}}
            }
        }
        // A content preparation stays in the shelf; position is unchanged until success.
        Rectangle {anchors.fill:parent;radius:14;color:'#fa1b1c21';visible:study.pending || study.pendingFailed
            Text {x:24;y:20;text:study.pendingFailed ? 'Cet épisode ne peut pas être lancé.' : 'Préparation de l’épisode '+(study.episodeIndex+1)+'…';color:'white';font.family:study.family;font.pixelSize:25}
            Text {x:24;y:62;text:'L’épisode actuel reste en lecture.';color:'#c6c6ce';font.family:study.family;font.pixelSize:19}
            Rectangle {x:24;y:116;width:240;height:48;radius:10;color:'#f5f5f7'
                Text {anchors.centerIn:parent;text:study.pendingFailed ? 'Revenir aux épisodes' : 'Annuler';color:'#151519';font.family:study.family;font.pixelSize:20}
            }
        }
    }
    Glass {x:344;y:238;width:592;height:224;video:imagePlane;visible:study.failed && !study.menu
        Text {x:28;y:26;text:'La lecture s’est interrompue';color:'white';font.family:study.family;font.pixelSize:27;font.weight:Font.DemiBold}
        Text {x:28;y:76;text:'Ta position est conservée à '+study.clock(study.positionMs)+'.';color:'#c6c6ce';font.family:study.family;font.pixelSize:20}
        Row {x:20;y:142;spacing:12
            Repeater {model:['Réessayer','Changer de source']
                Rectangle {width:index===0 ? 176 : 344;height:56;radius:10;color:study.errorIndex===index ? '#f5f5f7' : '#20ffffff'
                    Text {anchors.centerIn:parent;text:modelData;color:study.errorIndex===index ? '#151519' : 'white';font.family:study.family;font.pixelSize:21;font.weight:Font.DemiBold}
                    MouseArea {anchors.fill:parent;onClicked:{study.errorIndex=index;if(index===1)study.openSetting(1);else study.failed=false;}}
                }
            }
        }
    }
    Keys.onPressed:{
        var key=event.key,wasHidden=!hud;hud=true;
        if(key===Qt.Key_Back || key===Qt.Key_Escape){back();event.accepted=true;return;}
        if(pending || pendingFailed){if(key===Qt.Key_Return || key===Qt.Key_Enter){pending=false;pendingFailed=false;}event.accepted=true;return;}
        if(failed && !menu){if(key===Qt.Key_Left || key===Qt.Key_Right)errorIndex=key===Qt.Key_Left ? 0 : 1;else if(key===Qt.Key_Return || key===Qt.Key_Enter){if(errorIndex===1)openSetting(1);else failed=false;}event.accepted=true;return;}
        if(wasHidden && key!==Qt.Key_Return && key!==Qt.Key_Enter){zone='timeline';event.accepted=true;return;}
        if(menu){
            if(menu==='episodes'){
                if(key===Qt.Key_Up)zone='season';
                else if(key===Qt.Key_Down)zone='episodes';
                else if(zone==='episodes' && (key===Qt.Key_Left || key===Qt.Key_Right))episodeIndex=Math.max(0,Math.min(19,episodeIndex+(key===Qt.Key_Right ? 1 : -1)));
                else if(key===Qt.Key_Return || key===Qt.Key_Enter){if(zone==='season'){menu='seasons';menuIndex=season-1;zone='menu';}else prepare();}
            }else if(key===Qt.Key_Up || key===Qt.Key_Down)menuIndex=Math.max(0,Math.min(options.length-1,menuIndex+(key===Qt.Key_Down ? 1 : -1)));
            else if(key===Qt.Key_Return || key===Qt.Key_Enter)prepare();
        }else if(key===Qt.Key_Up){zone=zone==='content' ? 'timeline' : 'settings';proposedMs=-1;}
        else if(key===Qt.Key_Down){zone=zone==='settings' ? 'timeline' : 'content';proposedMs=-1;}
        else if(key===Qt.Key_Left || key===Qt.Key_Right){
            if(zone==='settings')commandIndex=Math.max(0,Math.min(2,commandIndex+(key===Qt.Key_Right ? 1 : -1)));
            else if(zone!=='content'){zone='timeline';proposedMs=Math.max(0,Math.min(durationMs-1000,(proposedMs>=0 ? proposedMs : positionMs)+(key===Qt.Key_Right ? 10000 : -10000)));}
        }else if(key===Qt.Key_Return || key===Qt.Key_Enter){
            if(zone==='settings')openSetting(commandIndex);
            else if(zone==='content')openEpisodes();
            else if(proposedMs>=0){positionMs=proposedMs;proposedMs=-1;}
            else paused=!paused;
        }else return;
        event.accepted=true;
    }
}
