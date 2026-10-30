import QtQuick 2.15
import "LibraryPolicy.js" as Library

FocusScope {
    id:editor
    objectName:'libraryEditor'
    property var store
    property string family:'sans-serif'
    property bool reducedMotion:false
    property bool opened:false
    property int identity:0
    property string title:''
    property string zone:'status'
    property int statusIndex:0
    property int actionIndex:0
    property var draftNote:null
    property string draftStatus:'PLANNING'
    property bool waiting:false
    property bool preserveDraft:false
    property bool ownSave:false
    property string originalStatus:'PLANNING'
    property var originalNote:null
    readonly property var entry:store ? store.entry(identity) : null
    readonly property string phase:store ? store.phase(identity) : 'error'
    readonly property bool editable:!!(entry && entry.editable && phase==='ready' && !waiting)
    readonly property bool busy:phase==='loading' || phase==='saving'
    readonly property bool recover:['conflict','uncertain','error'].indexOf(phase)>=0
    readonly property bool dirty:!!entry && (entry.presence==='absent' || draftStatus!==(entry.moi ? entry.moi.statut : 'PLANNING') || (draftNote || null)!==(entry.moi ? entry.moi.note || null : null))
    signal closed()
    function hydrate(keep){var e=entry;if(!e)return;var changedStatus=draftStatus!==originalStatus,changedNote=(draftNote || null)!==(originalNote || null);originalStatus=e.moi ? e.moi.statut : 'PLANNING';originalNote=e.moi ? e.moi.note || null : null;if(!keep || !changedStatus)draftStatus=originalStatus;if(!keep || !changedNote)draftNote=originalNote;statusIndex=0;for(var i=0;i<Library.statuses.length;i++)if(Library.statuses[i][0]===draftStatus)statusIndex=i;}
    function open(id,name,note){waiting=true;identity=id;title=name || '';draftStatus='PLANNING';draftNote=null;statusIndex=0;preserveDraft=false;ownSave=false;zone=note ? 'note' : 'status';actionIndex=0;opened=true;store.ensure(id);refresh();forceActiveFocus();}
    function close(){focus=false;opened=false;closed();}
    function reload(){waiting=true;preserveDraft=true;store.load(identity);}
    function refresh(){if(!opened || !waiting || phase!=='ready')return;hydrate(preserveDraft);waiting=false;}
    function chooseStatus(index){if(!editable)return;statusIndex=index;draftStatus=Library.statuses[index][0];}
    function changeNote(delta){if(editable)draftNote=Library.step(draftNote,delta);}
    function save(){
        if(recover){reload();return;}
        if(!editable || !dirty)return;
        var patch={},moi=entry.moi;
        if(entry.presence==='absent' || draftStatus!==moi.statut)patch.statut=draftStatus;
        if((draftNote || null)!==(moi ? moi.note || null : null))patch.note=draftNote;
        ownSave=true;if(!store.save(identity,patch))ownSave=false;
    }
    function activate(){if(zone==='status')chooseStatus(statusIndex);else if(zone==='note'){zone='actions';actionIndex=0;}else if(zone==='clear'){if(editable){draftNote=null;zone='note';}}else if(zone==='actions'){if(actionIndex===1)close();else save();}}
    function key(value){
        if(value===Qt.Key_Back || value===Qt.Key_Escape){close();return;}
        if(value===Qt.Key_Return || value===Qt.Key_Enter || value===Qt.Key_Select){activate();return;}
        if(value===Qt.Key_Left || value===Qt.Key_Right){var d=value===Qt.Key_Right ? 1 : -1;if(zone==='status'){var first=Math.floor(statusIndex/2)*2;statusIndex=Math.max(first,Math.min(first+1,statusIndex+d));}else if(zone==='note')changeNote(d);else if(zone==='actions')actionIndex=d>0 ? 1 : 0;return;}
        if(value===Qt.Key_Up){if(zone==='status' && statusIndex>=2)statusIndex-=2;else if(zone==='note')zone='status';else if(zone==='clear')zone='note';else if(zone==='actions')zone=draftNote ? 'clear' : 'note';}
        if(value===Qt.Key_Down){if(zone==='status' && statusIndex<4)statusIndex+=2;else if(zone==='status')zone='note';else if(zone==='note')zone=draftNote ? 'clear' : 'actions';else if(zone==='clear')zone='actions';}
    }
    Connections {target:editor.store;function onChanged(id){if(id===editor.identity)editor.refresh();}function onSaved(id,value){if(editor.opened && id===editor.identity){if(editor.ownSave)editor.close();else editor.refresh();}}}
    visible:opened
    Rectangle {anchors.fill:parent;color:'#a3000000';MouseArea {anchors.fill:parent;onClicked:editor.close()}}
    Rectangle {x:568;y:0;width:712;height:720;color:'#f5161920'
        Rectangle {width:1;height:parent.height;color:'#35ffffff'}
        MouseArea {anchors.fill:parent}
        Text {x:40;y:32;text:'Mon suivi';font.family:editor.family;font.pixelSize:34;font.weight:Font.Bold;color:'white'}
        Text {x:40;y:82;width:624;height:52;text:editor.title;textFormat:Text.PlainText;maximumLineCount:2;wrapMode:Text.WordWrap;elide:Text.ElideRight;font.family:editor.family;font.pixelSize:21;color:'#c5c9d3'}
        Text {x:40;y:149;text:'Ma liste';font.family:editor.family;font.pixelSize:20;font.weight:Font.DemiBold;color:'white'}
        LoadingSkeleton {objectName:'followupSkeleton';x:40;y:184;width:624;height:306;layout:'followup';active:editor.opened && editor.phase==='loading'}
        Grid {x:40;y:184;columns:2;spacing:10;opacity:editor.phase==='loading' ? 0 : 1
            Repeater {model:Library.statuses
                HeroButton {width:306;height:50;family:editor.family;label:modelData[1];selected:editor.editable && editor.draftStatus===modelData[0];focused:editor.zone==='status' && editor.statusIndex===index;iconKey:editor.editable && editor.draftStatus===modelData[0] ? 'check' : '';reducedMotion:editor.reducedMotion;opacity:editor.editable ? 1 : .45;onActivated:{editor.zone='status';editor.chooseStatus(index)}}
            }
        }
        Text {x:40;y:374;text:'Ta note';font.family:editor.family;font.pixelSize:20;font.weight:Font.DemiBold;color:'white'}
        Rectangle {x:40;y:410;width:624;height:80;radius:12;color:'#292e39';border.width:editor.zone==='note' ? 2 : 1;border.color:editor.zone==='note' ? 'white' : '#45ffffff';opacity:editor.phase==='loading' ? 0 : editor.editable ? 1 : .45
            HeroButton {x:8;y:14;width:64;label:'−';family:editor.family;flat:true;onActivated:{editor.zone='note';editor.changeNote(-1)}}
            Text {anchors.centerIn:parent;text:Library.score(editor.draftNote)+(editor.draftNote ? ' / 10' : '');font.family:editor.family;font.pixelSize:editor.draftNote ? 38 : 26;font.weight:Font.DemiBold;color:'white'}
            HeroButton {x:552;y:14;width:64;label:'+';family:editor.family;flat:true;onActivated:{editor.zone='note';editor.changeNote(1)}}
        }
        HeroButton {x:40;y:499;width:180;height:44;label:'Retirer la note';family:editor.family;flat:true;focused:editor.zone==='clear';opacity:editor.draftNote && editor.editable ? 1 : .4;onActivated:{editor.zone='clear';editor.activate()}}
        Text {objectName:'libraryFeedback';x:40;y:552;width:624;height:58;text:editor.busy ? (editor.phase==='saving' ? 'Enregistrement…' : 'Chargement de ton suivi…') : editor.recover || !editor.editable ? (editor.store ? editor.store.message(editor.identity) : 'Suivi indisponible') : editor.entry && editor.entry.presence==='absent' ? 'Cet animé sera ajouté à « '+Library.statusLabel(editor.draftStatus)+' ».' : editor.preserveDraft ? (editor.dirty ? 'Suivi actuel : '+Library.statusLabel(editor.originalStatus)+' · '+Library.score(editor.originalNote)+'. Tes choix restent préparés.' : 'Ton choix est bien enregistré.') : editor.entry && editor.entry.moi && editor.entry.moi.progression>0 ? 'Progression actuelle : épisode '+editor.entry.moi.progression : 'Aucun épisode marqué vu.';textFormat:Text.PlainText;wrapMode:Text.WordWrap;maximumLineCount:2;color:editor.recover ? '#e9c38f' : '#aeb5c3';font.family:editor.family;font.pixelSize:18}
        Row {x:40;y:632;spacing:14
            HeroButton {objectName:'librarySave';width:306;height:52;label:editor.recover ? 'Vérifier mon suivi' : editor.phase==='saving' ? 'Enregistrement…' : 'Enregistrer';family:editor.family;primary:true;groupHasFocus:true;focused:editor.zone==='actions' && editor.actionIndex===0;opacity:editor.recover || editor.editable && editor.dirty ? 1 : .4;onActivated:editor.save()}
            HeroButton {width:306;height:52;label:'Annuler';family:editor.family;focused:editor.zone==='actions' && editor.actionIndex===1;onActivated:editor.close()}
        }
    }
    Keys.onPressed:{if(event.isAutoRepeat && (event.key===Qt.Key_Back || event.key===Qt.Key_Escape)){event.accepted=true;return;}key(event.key);event.accepted=true;}
}
