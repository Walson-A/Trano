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
    property bool ownRemove:false
    property bool removeOpen:false
    property int removeChoice:0
    property string originalStatus:'PLANNING'
    property var originalNote:null
    readonly property var entry:store ? store.entry(identity) : null
    readonly property string phase:store ? store.phase(identity) : 'error'
    readonly property bool editable:!!(entry && entry.editable && phase==='ready' && !waiting)
    readonly property bool busy:phase==='loading' || phase==='saving'
    readonly property bool removalVisible:!!(store && store.removalAvailable && entry && entry.presence==='present')
    readonly property bool recover:['conflict','uncertain','error'].indexOf(phase)>=0
    readonly property bool dirty:!!entry && (entry.presence==='absent' || draftStatus!==(entry.moi ? entry.moi.statut : 'PLANNING') || (draftNote || null)!==(entry.moi ? entry.moi.note || null : null))
    signal closed()
    function hydrate(keep){var e=entry;if(!e)return;var changedStatus=draftStatus!==originalStatus,changedNote=(draftNote || null)!==(originalNote || null);originalStatus=e.moi ? e.moi.statut : 'PLANNING';originalNote=e.moi ? e.moi.note || null : null;if(!keep || !changedStatus)draftStatus=originalStatus;if(!keep || !changedNote)draftNote=originalNote;statusIndex=0;for(var i=0;i<Library.statuses.length;i++)if(Library.statuses[i][0]===draftStatus)statusIndex=i;}
    function open(id,name,note){waiting=true;identity=id;title=name || '';draftStatus='PLANNING';draftNote=null;statusIndex=0;preserveDraft=false;ownSave=false;ownRemove=false;removeOpen=false;removeChoice=0;zone=note ? 'note' : 'status';actionIndex=0;opened=true;store.ensure(id);refresh();forceActiveFocus();}
    function close(){focus=false;opened=false;removeOpen=false;closed();}
    function reload(){waiting=true;preserveDraft=true;store.load(identity);}
    function refresh(){if(!opened || !waiting || phase!=='ready')return;hydrate(preserveDraft);waiting=false;if(removeOpen)removeChoice=0;}
    function chooseStatus(index){if(!editable)return;statusIndex=index;draftStatus=Library.statuses[index][0];}
    function changeNote(delta){if(editable)draftNote=Library.step(draftNote,delta);}
    function askRemoval(){
        if(!editable || !removalVisible)return;
        removeOpen=true;removeChoice=0;
        if(!Library.removable(entry)){waiting=true;preserveDraft=true;if(!store.prepareRemoval(identity))waiting=false;}
    }
    function cancelRemoval(){removeOpen=false;removeChoice=0;zone='remove';}
    function confirmRemoval(){
        if(busy)return;
        if(recover){reload();return;}
        if(!editable)return;
        if(entry.presence==='absent'){close();return;}
        if(!Library.removable(entry)){waiting=true;preserveDraft=true;if(!store.prepareRemoval(identity))waiting=false;return;}
        ownSave=true;ownRemove=true;if(!store.remove(identity)){ownSave=false;ownRemove=false;}
    }
    function save(){
        if(recover){reload();return;}
        if(!editable || !dirty)return;
        var patch={},moi=entry.moi;
        if(entry.presence==='absent' || draftStatus!==moi.statut)patch.statut=draftStatus;
        if((draftNote || null)!==(moi ? moi.note || null : null))patch.note=draftNote;
        ownRemove=false;ownSave=true;if(!store.save(identity,patch))ownSave=false;
    }
    function activate(){if(zone==='remove')askRemoval();else if(zone==='status')chooseStatus(statusIndex);else if(zone==='note'){zone='actions';actionIndex=0;}else if(zone==='clear'){if(editable){draftNote=null;zone='note';}}else if(zone==='actions'){if(actionIndex===1)close();else save();}}
    function key(value){
        if(removeOpen){
            if(value===Qt.Key_Back || value===Qt.Key_Escape){cancelRemoval();return;}
            if(value===Qt.Key_Left || value===Qt.Key_Right){removeChoice=value===Qt.Key_Right ? 1 : 0;return;}
            if(value===Qt.Key_Return || value===Qt.Key_Enter || value===Qt.Key_Select){if(removeChoice===0)cancelRemoval();else confirmRemoval();}return;
        }
        if(value===Qt.Key_Back || value===Qt.Key_Escape){close();return;}
        if(value===Qt.Key_Return || value===Qt.Key_Enter || value===Qt.Key_Select){activate();return;}
        if(value===Qt.Key_Left || value===Qt.Key_Right){var d=value===Qt.Key_Right ? 1 : -1;if(zone==='status'){var first=Math.floor(statusIndex/2)*2;statusIndex=Math.max(first,Math.min(first+1,statusIndex+d));}else if(zone==='note')changeNote(d);else if(zone==='actions')actionIndex=d>0 ? 1 : 0;return;}
        if(value===Qt.Key_Up){if(zone==='status' && statusIndex>=2)statusIndex-=2;else if(zone==='status' && removalVisible)zone='remove';else if(zone==='note')zone='status';else if(zone==='clear')zone='note';else if(zone==='actions')zone=draftNote ? 'clear' : 'note';}
        if(value===Qt.Key_Down){if(zone==='remove')zone='status';else if(zone==='status' && statusIndex<4)statusIndex+=2;else if(zone==='status')zone='note';else if(zone==='note')zone=draftNote ? 'clear' : 'actions';else if(zone==='clear')zone='actions';}
    }
    Connections {target:editor.store;function onChanged(id){if(id===editor.identity)editor.refresh();}function onSaved(id,value){if(editor.opened && id===editor.identity){if(editor.ownSave || editor.removeOpen && value.presence==='absent')editor.close();else editor.refresh();}}}
    visible:opened
    Rectangle {anchors.fill:parent;color:'#a3000000';MouseArea {anchors.fill:parent;onClicked:editor.close()}}
    Rectangle {x:568;y:0;width:712;height:720;color:'#f5161920'
        Rectangle {width:1;height:parent.height;color:'#35ffffff'}
        MouseArea {anchors.fill:parent}
        Text {x:40;y:32;text:'Mon suivi';font.family:editor.family;font.pixelSize:34;font.weight:Font.Bold;color:'white'}
        Text {x:40;y:82;width:624;height:52;text:editor.title;textFormat:Text.PlainText;maximumLineCount:2;wrapMode:Text.WordWrap;elide:Text.ElideRight;font.family:editor.family;font.pixelSize:21;color:'#c5c9d3'}
        Text {x:40;y:149;text:'Ma liste';font.family:editor.family;font.pixelSize:20;font.weight:Font.DemiBold;color:'white'}
        HeroButton {objectName:'libraryRemove';x:380;y:133;width:284;height:44;label:'Retirer de Ma liste';family:editor.family;flat:true;visible:editor.removalVisible;focused:editor.zone==='remove';opacity:editor.editable ? 1 : .4;onActivated:editor.askRemoval()}
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
        Text {objectName:'libraryFeedback';x:40;y:552;width:624;height:58;text:editor.busy ? (editor.phase==='saving' ? (editor.ownRemove ? 'Retrait en cours…' : 'Enregistrement…') : 'Chargement de ton suivi…') : editor.recover || !editor.editable ? (editor.store ? editor.store.message(editor.identity) : 'Suivi indisponible') : editor.entry && editor.entry.presence==='absent' ? 'Cet animé sera ajouté à « '+Library.statusLabel(editor.draftStatus)+' ».' : editor.preserveDraft ? (editor.dirty ? 'Suivi actuel : '+Library.statusLabel(editor.originalStatus)+' · '+Library.score(editor.originalNote)+'. Tes choix restent préparés.' : 'Ton choix est bien enregistré.') : editor.entry && editor.entry.moi && editor.entry.moi.progression>0 ? 'Progression actuelle : épisode '+editor.entry.moi.progression : 'Aucun épisode marqué vu.';textFormat:Text.PlainText;wrapMode:Text.WordWrap;maximumLineCount:2;color:editor.recover ? '#e9c38f' : '#aeb5c3';font.family:editor.family;font.pixelSize:18}
        Row {x:40;y:632;spacing:14
            HeroButton {objectName:'librarySave';width:306;height:52;label:editor.recover ? 'Vérifier mon suivi' : editor.phase==='saving' ? (editor.ownRemove ? 'Retrait…' : 'Enregistrement…') : 'Enregistrer';family:editor.family;primary:true;groupHasFocus:true;focused:editor.zone==='actions' && editor.actionIndex===0;opacity:editor.recover || editor.editable && editor.dirty ? 1 : .4;onActivated:editor.save()}
            HeroButton {width:306;height:52;label:'Annuler';family:editor.family;focused:editor.zone==='actions' && editor.actionIndex===1;onActivated:editor.close()}
        }
        Rectangle {objectName:'libraryRemoveConfirmation';anchors.fill:parent;visible:editor.removeOpen;color:'#161920'
            MouseArea {anchors.fill:parent}
            Text {x:40;y:32;width:624;text:'Retirer de Ma liste ?';font.family:editor.family;font.pixelSize:32;font.weight:Font.Bold;color:'white'}
            Text {x:40;y:96;width:624;height:84;text:editor.title;textFormat:Text.PlainText;maximumLineCount:2;wrapMode:Text.WordWrap;elide:Text.ElideRight;font.family:editor.family;font.pixelSize:25;color:'#f0f1f5'}
            Text {x:40;y:218;width:624;text:'Cet animé sera retiré de ta liste AniList. Sa note, sa progression et les notes personnelles associées seront aussi supprimées sur AniList.';wrapMode:Text.WordWrap;font.family:editor.family;font.pixelSize:22;lineHeight:1.35;color:'#c5c9d3'}
            Text {x:40;y:390;width:624;text:'Ton historique de lecture Atlas reste conservé.';font.family:editor.family;font.pixelSize:18;color:'#aeb5c3'}
            LoadingSkeleton {x:40;y:436;width:624;height:34;layout:'text';active:editor.removeOpen && editor.phase==='loading'}
            Text {objectName:'removalFeedback';x:40;y:480;width:624;height:96;text:editor.phase==='loading' ? 'Vérification de ta liste…' : editor.phase==='saving' ? 'Retrait en cours…' : editor.recover || !editor.editable ? editor.store.message(editor.identity) : !Library.removable(editor.entry) ? 'Le retrait ne peut pas encore être confirmé. Vérifie ton suivi avant de réessayer.' : '';wrapMode:Text.WordWrap;maximumLineCount:3;font.family:editor.family;font.pixelSize:19;color:editor.recover ? '#e9c38f' : '#aeb5c3'}
            Row {x:40;y:632;spacing:14
                HeroButton {width:306;height:52;label:'Annuler';family:editor.family;focused:editor.removeChoice===0;onActivated:editor.cancelRemoval()}
                HeroButton {objectName:'libraryRemoveConfirm';width:306;height:52;label:editor.recover ? 'Vérifier le retrait' : editor.phase==='saving' ? 'Retrait…' : editor.editable && !Library.removable(editor.entry) ? 'Vérifier mon suivi' : 'Retirer';family:editor.family;focused:editor.removeChoice===1;opacity:editor.busy || !editor.editable && !editor.recover ? .4 : 1;onActivated:editor.confirmRemoval()}
            }
        }
    }
    Keys.onPressed:{if(event.isAutoRepeat && [Qt.Key_Back,Qt.Key_Escape,Qt.Key_Return,Qt.Key_Enter,Qt.Key_Select].indexOf(event.key)>=0){event.accepted=true;return;}key(event.key);event.accepted=true;}
}
