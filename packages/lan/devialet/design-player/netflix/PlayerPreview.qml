import QtQuick 2.15

// Design proposal only: explicit fixtures, static frame, no API or media decoder.
FocusScope {
    id:study;objectName:'netflixPlayerStudy';width:1280;height:720;focus:true
    property url frame
    property string family:'sans-serif'
    property string title:'To Your Eternity'
    property string chapter:'Saison 1 · Épisode 1'
    property string zone:'surface'
    property string menu:''
    property bool paused:false
    property bool hud:true
    property bool loading:false
    property bool failed:false
    property int commandIndex:0
    property int menuIndex:0
    property int errorIndex:0
    property int episodeIndex:1
    property int season:1
    property int playingSeason:1
    property int currentEpisode:1
    property int positionMs:432000
    property int durationMs:1500000
    property int proposedMs:-1
    property string quality:'1080p'
    property string language:'VOSTFR'
    property string source:'Voiranime'
    readonly property var commands:[{icon:'list-video',label:'Épisodes',menu:'episodes'},{icon:'captions',label:'Langue',menu:'language'},{icon:'monitor-play',label:'Source',menu:'source'},{icon:'settings',label:'Qualité',menu:'quality'}]
    readonly property var options:menu==='quality' ? (source==='Anime-sama' ? [{label:'Originale'}] : [{label:'Automatique'},{label:'1080p'},{label:'360p'}]) : menu==='language' ? [{label:'VOSTFR',detail:'Version originale sous-titrée'},{label:'VF',detail:'Version française'}] : menu==='source' ? [{label:'Automatique'},{label:'Voiranime',detail:'Mail.ru'},{label:'Anime-sama',detail:'YourUpload'}] : [{label:'Saison 1',suffix:'20 ép.'},{label:'Saison 2',suffix:'20 ép.'}]
    readonly property string caption:commands[commandIndex].label+(commandIndex===1 ? ' · '+language : commandIndex===2 ? ' · '+source : commandIndex===3 ? ' · '+quality : '')
    function clock(ms){var s=Math.floor(ms/1000);return Math.floor(s/60)+':'+('0'+s%60).slice(-2);}
    function chosen(index){return menu==='quality' ? options[index].label===quality : menu==='language' ? options[index].label===language : menu==='source' ? options[index].label===source : index===season-1;}
    function open(index){commandIndex=index;menu=commands[index].menu;zone='menu';loading=false;menuIndex=menu==='quality' ? Math.max(0,options.map(function(o){return o.label;}).indexOf(quality)) : menu==='language' ? (language==='VF' ? 1 : 0) : menu==='source' ? (source==='Voiranime' ? 1 : source==='Anime-sama' ? 2 : 0) : 0;}
    function dismiss(){menu='';zone='commands';loading=false;}
    function choose(){
        if(loading)return;
        if(menu==='episodes'){playingSeason=season;currentEpisode=episodeIndex+1;chapter='Saison '+playingSeason+' · Épisode '+currentEpisode;dismiss();return;}
        if(menu==='quality')quality=options[menuIndex].label;
        else if(menu==='language')language=options[menuIndex].label;
        else if(menu==='source'){source=options[menuIndex].label;quality=source==='Anime-sama' ? 'Originale' : 'Automatique';}
        else if(menu==='seasons'){season=menuIndex+1;menu='episodes';episodeIndex=0;return;}
        dismiss();
    }
    function showState(name){
        hud=true;paused=false;loading=false;failed=false;errorIndex=0;menu='';zone='surface';commandIndex=0;menuIndex=0;episodeIndex=1;season=1;playingSeason=1;currentEpisode=1;positionMs=432000;proposedMs=-1;quality='1080p';language='VOSTFR';source='Voiranime';chapter='Saison 1 · Épisode 1';
        if(name==='video')hud=false;
        if(name==='focus'){zone='commands';commandIndex=3;}
        if(name==='pause')paused=true;
        if(name==='timeline'){zone='seek';proposedMs=565000;}
        if(name==='quality'){open(3);menuIndex=2;}
        if(name==='quality-original'){source='Anime-sama';quality='Originale';open(3);}
        if(name==='language')open(1);
        if(name==='source')open(2);
        if(name==='episodes')open(0);
        if(name==='seasons'){open(0);menu='seasons';}
        if(name==='loading'){open(3);loading=true;}
        if(name==='error')failed=true;
    }
    Rectangle {anchors.fill:parent;color:'black'}
    Image {anchors.fill:parent;source:study.frame;fillMode:Image.PreserveAspectFit}
    Item {anchors.fill:parent;visible:study.hud
        Rectangle {anchors.bottom:parent.bottom;width:1280;height:392;gradient:Gradient {GradientStop {position:0;color:'#00000000'} GradientStop {position:.38;color:'#68000000'} GradientStop {position:.72;color:'#cd000000'} GradientStop {position:1;color:'#f5000000'}}}
        Item {visible:!study.menu
            Text {x:64;y:438;width:1100;height:56;text:study.title;textFormat:Text.PlainText;color:'#f7f7f8';font.family:study.family;font.pixelSize:42;font.weight:Font.Bold;elide:Text.ElideRight}
            Text {x:64;y:498;width:1100;text:study.failed ? 'Lecture interrompue · Ce flux ne répond plus.' : study.chapter;textFormat:Text.PlainText;color:'#c5c5ca';font.family:study.family;font.pixelSize:21;elide:Text.ElideRight}
        }
        Row {id:commandRow;x:64;y:558;spacing:12;visible:!study.failed
            Repeater {model:study.commands
                Command {icon:modelData.icon;label:modelData.label;focused:study.zone==='commands' && study.commandIndex===index;opened:study.menu===modelData.menu || index===0 && study.menu==='seasons';onActivated:study.open(index)}
            }
        }
        Text {x:64;y:609;width:1000;text:study.caption;color:'#ededf0';font.family:study.family;font.pixelSize:17;visible:!study.failed && (study.zone==='commands' || !!study.menu)}
        Row {x:64;y:558;spacing:24;visible:study.failed
            Rectangle {width:164;height:48;radius:24;color:study.errorIndex===0 ? '#f7f7f8' : 'transparent'
                Text {anchors.centerIn:parent;text:'Réessayer';color:study.errorIndex===0 ? '#111114' : 'white';font.family:study.family;font.pixelSize:20;font.weight:Font.DemiBold}
                MouseArea {anchors.fill:parent;onClicked:study.failed=false}
            }
            Item {width:244;height:48
                Rectangle {anchors.fill:parent;radius:24;color:study.errorIndex===1 ? '#f7f7f8' : 'transparent'}
                Glyph {x:14;y:10;name:'monitor-play';ink:study.errorIndex===1 ? '#111114' : 'white'}
                Text {x:56;anchors.verticalCenter:parent.verticalCenter;text:'Changer de source';color:study.errorIndex===1 ? '#111114' : 'white';font.family:study.family;font.pixelSize:20}
                MouseArea {anchors.fill:parent;onClicked:{study.failed=false;study.open(2);}}
            }
        }
        Rectangle {id:rail;x:64;y:638;width:1152;height:6;radius:3;color:'#5b5b60';opacity:study.failed ? .5 : 1
            Rectangle {width:parent.width*study.positionMs/study.durationMs;height:6;radius:3;color:'#f7f7f8'}
            Rectangle {x:parent.width*(study.proposedMs>=0 ? study.proposedMs : study.positionMs)/study.durationMs-width/2;y:parent.height/2-height/2;width:study.zone==='seek' ? 28 : 24;height:width;radius:width/2;color:'#f7f7f8'}
            Rectangle {x:Math.max(0,Math.min(1040,parent.width*study.proposedMs/study.durationMs-56));y:-58;width:112;height:40;radius:5;color:'#ed0c0c0f';visible:study.proposedMs>=0
                Text {anchors.centerIn:parent;text:study.clock(study.proposedMs);color:'white';font.family:study.family;font.pixelSize:24;font.weight:Font.DemiBold}
            }
        }
        Text {x:64;y:662;text:study.clock(study.positionMs);color:'#c5c5ca';font.family:study.family;font.pixelSize:19}
        Text {x:1000;y:662;width:216;horizontalAlignment:Text.AlignRight;text:'−'+study.clock(study.durationMs-study.positionMs);color:'#c5c5ca';font.family:study.family;font.pixelSize:19}
    }
    Item {anchors.centerIn:parent;width:80;height:80;visible:study.paused && !study.menu
        Rectangle {anchors.fill:parent;radius:40;color:'#8f000000'}
        Glyph {anchors.centerIn:parent;width:36;height:36;name:'play'}
    }
    Rectangle {id:choices;objectName:'studyChoices';x:64+study.commandIndex*64;y:544-height;width:study.menu==='source' ? 336 : study.menu==='language' ? 304 : 248;height:study.loading ? 112 : 56+study.options.reduce(function(h,o){return h+(o.detail ? 64 : 48);},0)+8;radius:8;color:'#ed0c0c0f';border.color:'#35ffffff';visible:!!study.menu && study.menu!=='episodes'
        Text {x:20;y:15;text:study.menu==='seasons' ? 'Saisons' : study.commands[study.commandIndex].label;color:'#c5c5ca';font.family:study.family;font.pixelSize:17}
        Rectangle {x:8;y:44;width:parent.width-16;height:1;color:'#23ffffff'}
        Column {x:8;y:50;visible:!study.loading
            Repeater {model:study.options
                MenuRow {width:choices.width-16;family:study.family;label:modelData.label;detail:modelData.detail || '';suffix:modelData.suffix || '';focused:study.menuIndex===index;chosen:study.chosen(index);onActivated:{study.menuIndex=index;study.choose();}}
            }
        }
        Text {x:20;y:68;text:'Chargement des qualités…';visible:study.loading;color:'#ededf0';font.family:study.family;font.pixelSize:18}
    }
    Rectangle {id:episodes;objectName:'studyEpisodes';x:64;y:176;width:448;height:368;radius:8;color:'#ed0c0c0f';border.color:'#35ffffff';visible:study.menu==='episodes'
        Item {x:8;y:8;width:432;height:48
            Rectangle {anchors.fill:parent;radius:4;color:study.menuIndex===-1 ? '#f7f7f8' : 'transparent'}
            Text {x:16;anchors.verticalCenter:parent.verticalCenter;text:'Saison '+study.season;color:study.menuIndex===-1 ? '#111114' : 'white';font.family:study.family;font.pixelSize:21;font.weight:Font.DemiBold}
            Glyph {x:116;y:16;width:16;height:16;name:'chevron-down';ink:study.menuIndex===-1 ? '#111114' : 'white'}
            Text {x:240;width:176;anchors.verticalCenter:parent.verticalCenter;horizontalAlignment:Text.AlignRight;text:'20 épisodes';color:study.menuIndex===-1 ? '#48484f' : '#c5c5ca';font.family:study.family;font.pixelSize:17}
            MouseArea {anchors.fill:parent;onClicked:{study.menu='seasons';study.menuIndex=study.season-1;}}
        }
        Rectangle {x:8;y:62;width:432;height:1;color:'#23ffffff'}
        ListView {id:episodeList;x:8;y:72;width:432;height:280;clip:true;interactive:false;model:20;currentIndex:study.episodeIndex;onCurrentIndexChanged:positionViewAtIndex(currentIndex,ListView.Contain)
            delegate:MenuRow {width:432;height:56;label:'Épisode '+(index+1);detail:index===study.currentEpisode-1 && study.season===study.playingSeason ? 'En lecture' : '';family:study.family;chosen:index===study.currentEpisode-1 && study.season===study.playingSeason;focused:study.menuIndex!==-1 && study.episodeIndex===index;onActivated:{study.episodeIndex=index;study.choose();}}
        }
    }
    Keys.onPressed:{
        hud=true;
        if(failed && !menu){
            if(event.key===Qt.Key_Left || event.key===Qt.Key_Right)errorIndex=event.key===Qt.Key_Left ? 0 : 1;
            else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter){failed=false;if(errorIndex===1)open(2);}
            event.accepted=true;return;
        }
        if(event.key===Qt.Key_Back || event.key===Qt.Key_Escape){if(menu==='seasons'){menu='episodes';menuIndex=0;}else if(menu)dismiss();else if(proposedMs>=0){proposedMs=-1;zone='surface';}else {zone='surface';hud=false;}}
        else if(menu){
            if(event.key===Qt.Key_Up || event.key===Qt.Key_Down){var d=event.key===Qt.Key_Up ? -1 : 1;if(menu==='episodes'){if(d<0 && episodeIndex===0)menuIndex=-1;else {if(menuIndex===-1)menuIndex=0;else episodeIndex=Math.max(0,Math.min(19,episodeIndex+d));}}else menuIndex=Math.max(0,Math.min(options.length-1,menuIndex+d));}
            else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter){if(menu==='episodes' && menuIndex===-1){menu='seasons';menuIndex=season-1;}else choose();}
        }else if(event.key===Qt.Key_Right || event.key===Qt.Key_Left){var dx=event.key===Qt.Key_Right ? 1 : -1;if(zone==='commands')commandIndex=Math.max(0,Math.min(3,commandIndex+dx));else {zone='seek';proposedMs=Math.max(0,Math.min(durationMs-1000,(proposedMs>=0 ? proposedMs : positionMs)+dx*10000));}}
        else if(event.key===Qt.Key_Up)zone='commands';
        else if(event.key===Qt.Key_Down)zone='seek';
        else if(event.key===Qt.Key_Return || event.key===Qt.Key_Enter){if(failed)failed=false;else if(zone==='commands')open(commandIndex);else if(proposedMs>=0){positionMs=proposedMs;proposedMs=-1;zone='surface';}else paused=!paused;}
        else return;
        event.accepted=true;
    }
}
