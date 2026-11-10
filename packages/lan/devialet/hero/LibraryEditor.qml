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
    // Où tu en es : la progression AniList, modifiable à la main comme sur le PC.
    property int draftProgress:0
    property int originalProgress:0
    property int total:0
    readonly property var entry:store ? store.entry(identity) : null
    readonly property string phase:store ? store.phase(identity) : 'error'
    readonly property bool editable:!!(entry && entry.editable && phase==='ready' && !waiting)
    readonly property bool busy:phase==='loading' || phase==='saving'
    readonly property bool removalVisible:!!(store && store.removalAvailable && entry && entry.presence==='present')
    readonly property bool recover:['conflict','uncertain','error'].indexOf(phase)>=0
    readonly property bool dirty:!!entry && (entry.presence==='absent' || draftStatus!==(entry.moi ? entry.moi.statut : 'PLANNING') || (draftNote || null)!==(entry.moi ? entry.moi.note || null : null) || draftProgress!==(entry.moi ? entry.moi.progression || 0 : 0))
    // La note s'affiche sur la TV ; l'avis écrit jamais (décision de Walson, 10 novembre) :
    // l'engine le retire de toutes les réponses TV et ce panneau n'a aucun chemin pour le montrer.
    signal closed()
    function hydrate(keep){var e=entry;if(!e)return;var changedStatus=draftStatus!==originalStatus,changedNote=(draftNote || null)!==(originalNote || null),changedProgress=draftProgress!==originalProgress;originalStatus=e.moi ? e.moi.statut : 'PLANNING';originalNote=e.moi ? e.moi.note || null : null;originalProgress=e.moi ? e.moi.progression || 0 : 0;if(!keep || !changedStatus)draftStatus=originalStatus;if(!keep || !changedNote)draftNote=originalNote;if(!keep || !changedProgress)draftProgress=originalProgress;statusIndex=0;for(var i=0;i<Library.statuses.length;i++)if(Library.statuses[i][0]===draftStatus)statusIndex=i;}
    function open(id,name,note,episodes){waiting=true;identity=id;title=name || '';total=episodes>0 ? episodes : 0;draftStatus='PLANNING';draftNote=null;draftProgress=0;originalProgress=0;statusIndex=0;preserveDraft=false;ownSave=false;ownRemove=false;removeOpen=false;removeChoice=0;zone=note ? 'note' : 'status';actionIndex=0;opened=true;store.ensure(id);refresh();forceActiveFocus();}
    function close(){focus=false;opened=false;removeOpen=false;closed();}
    function reload(){waiting=true;preserveDraft=true;store.load(identity);}
    function refresh(){if(!opened || !waiting || phase!=='ready')return;hydrate(preserveDraft);waiting=false;if(removeOpen)removeChoice=0;}
    function chooseStatus(index){if(!editable)return;statusIndex=index;draftStatus=Library.statuses[index][0];}
    function changeNote(delta){if(editable)draftNote=Library.step(draftNote,delta);}
    function changeProgress(delta){if(editable)draftProgress=Math.max(0,Math.min(total>0 ? total : 100000,draftProgress+delta));}
    function progressLabel(n){return n>0 ? 'Épisode '+n+(total>0 ? ' sur '+total : '') : 'Aucun épisode vu';}
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
        if(draftProgress!==(moi ? moi.progression || 0 : 0))patch.progression=draftProgress;
        ownRemove=false;ownSave=true;if(!store.save(identity,patch))ownSave=false;
    }
    function activate(){if(zone==='remove')askRemoval();else if(zone==='status')chooseStatus(statusIndex);else if(zone==='note'){zone='progress';}else if(zone==='progress'){zone='actions';actionIndex=0;}else if(zone==='actions'){if(actionIndex===1)close();else save();}}
    function key(value){
        if(removeOpen){
            if(value===Qt.Key_Back || value===Qt.Key_Escape){cancelRemoval();return;}
            if(value===Qt.Key_Left || value===Qt.Key_Right){removeChoice=value===Qt.Key_Right ? 1 : 0;return;}
            if(value===Qt.Key_Return || value===Qt.Key_Enter || value===Qt.Key_Select){if(removeChoice===0)cancelRemoval();else confirmRemoval();}return;
        }
        if(value===Qt.Key_Back || value===Qt.Key_Escape){close();return;}
        if(value===Qt.Key_Return || value===Qt.Key_Enter || value===Qt.Key_Select){activate();return;}
        if(value===Qt.Key_Left || value===Qt.Key_Right){var d=value===Qt.Key_Right ? 1 : -1;if(zone==='status'){var first=Math.floor(statusIndex/2)*2;statusIndex=Math.max(first,Math.min(first+1,statusIndex+d));}else if(zone==='note')changeNote(d);else if(zone==='progress')changeProgress(d);else if(zone==='actions')actionIndex=d>0 ? 1 : 0;return;}
        if(value===Qt.Key_Up){if(zone==='status' && statusIndex>=2)statusIndex-=2;else if(zone==='status' && removalVisible)zone='remove';else if(zone==='note')zone='status';else if(zone==='progress')zone='note';else if(zone==='actions')zone='progress';}
        if(value===Qt.Key_Down){if(zone==='remove')zone='status';else if(zone==='status' && statusIndex<4)statusIndex+=2;else if(zone==='status')zone='note';else if(zone==='note')zone='progress';else if(zone==='progress')zone='actions';}
    }
    Connections {target:editor.store;function onChanged(id){if(id===editor.identity)editor.refresh();}function onSaved(id,value){if(editor.opened && id===editor.identity){if(editor.ownSave || editor.removeOpen && value.presence==='absent')editor.close();else editor.refresh();}}}
    visible:opened
    Rectangle {anchors.fill:parent;color:'#a3000000';MouseArea {anchors.fill:parent;onClicked:editor.close()}}
    Rectangle {x:568;y:0;width:712;height:720;color:'#f5161920'
        Rectangle {width:1;height:parent.height;color:'#35ffffff'}
        MouseArea {anchors.fill:parent}
        Text {x:40;y:26;text:'Mon suivi';font.family:editor.family;font.pixelSize:32;font.weight:Font.Bold;color:'white'}
        Text {x:40;y:70;width:624;text:editor.title;textFormat:Text.PlainText;maximumLineCount:1;elide:Text.ElideRight;font.family:editor.family;font.pixelSize:20;color:'#c5c9d3'}
        Text {x:40;y:118;text:'Ma liste';font.family:editor.family;font.pixelSize:19;font.weight:Font.DemiBold;color:'white'}
        HeroButton {objectName:'libraryRemove';x:380;y:106;width:284;height:42;label:'Retirer de Ma liste';family:editor.family;flat:true;visible:editor.removalVisible;focused:editor.zone==='remove';reducedMotion:editor.reducedMotion;opacity:editor.editable ? 1 : .4;onActivated:editor.askRemoval()}
        LoadingSkeleton {objectName:'followupSkeleton';x:40;y:154;width:624;height:356;layout:'followup';active:editor.opened && editor.phase==='loading'}
        Grid {x:40;y:154;columns:2;spacing:8;opacity:editor.phase==='loading' ? 0 : 1
            Repeater {model:Library.statuses
                HeroButton {width:308;height:44;family:editor.family;label:modelData[1];selected:editor.editable && editor.draftStatus===modelData[0];focused:editor.zone==='status' && editor.statusIndex===index;iconKey:editor.editable && editor.draftStatus===modelData[0] ? 'check' : '';reducedMotion:editor.reducedMotion;opacity:editor.editable ? 1 : .45;onActivated:{editor.zone='status';editor.chooseStatus(index)}}
            }
        }
        Text {x:40;y:318;text:'Ta note';font.family:editor.family;font.pixelSize:19;font.weight:Font.DemiBold;color:'white'}
        Text {x:364;y:320;width:300;horizontalAlignment:Text.AlignRight;text:'− sous 0,5 pour retirer la note';visible:editor.zone==='note' && !!editor.draftNote;color:'#8f95a3';font.family:editor.family;font.pixelSize:15}
        Rectangle {objectName:'libraryNote';x:40;y:348;width:624;height:60;radius:12;color:'#292e39';border.width:editor.zone==='note' ? 2 : 1;border.color:editor.zone==='note' ? 'white' : '#45ffffff';opacity:editor.phase==='loading' ? 0 : editor.editable ? 1 : .45
            HeroButton {x:8;y:6;width:60;height:48;label:'−';family:editor.family;flat:true;onActivated:{editor.zone='note';editor.changeNote(-1)}}
            Text {anchors.centerIn:parent;text:Library.score(editor.draftNote)+(editor.draftNote ? ' / 10' : '');font.family:editor.family;font.pixelSize:editor.draftNote ? 32 : 22;font.weight:Font.DemiBold;color:'white'}
            HeroButton {x:556;y:6;width:60;height:48;label:'+';family:editor.family;flat:true;onActivated:{editor.zone='note';editor.changeNote(1)}}
        }
        Text {x:40;y:424;text:'Où tu en es';font.family:editor.family;font.pixelSize:19;font.weight:Font.DemiBold;color:'white'}
        Rectangle {objectName:'libraryProgress';x:40;y:454;width:624;height:60;radius:12;color:'#292e39';border.width:editor.zone==='progress' ? 2 : 1;border.color:editor.zone==='progress' ? 'white' : '#45ffffff';opacity:editor.phase==='loading' ? 0 : editor.editable ? 1 : .45
            HeroButton {x:8;y:6;width:60;height:48;label:'−';family:editor.family;flat:true;onActivated:{editor.zone='progress';editor.changeProgress(-1)}}
            Text {anchors.centerIn:parent;text:editor.progressLabel(editor.draftProgress);font.family:editor.family;font.pixelSize:22;font.weight:Font.DemiBold;color:'white'}
            HeroButton {x:556;y:6;width:60;height:48;label:'+';family:editor.family;flat:true;onActivated:{editor.zone='progress';editor.changeProgress(1)}}
        }
        Text {objectName:'libraryFeedback';x:40;y:534;width:624;height:80;text:editor.busy ? (editor.phase==='saving' ? (editor.ownRemove ? 'Retrait en cours…' : 'Enregistrement…') : 'Chargement de ton suivi…') : editor.recover || !editor.editable ? (editor.store ? editor.store.message(editor.identity) : 'Suivi indisponible') : editor.entry && editor.entry.presence==='absent' ? 'Cet animé sera ajouté à « '+Library.statusLabel(editor.draftStatus)+' ».' : editor.preserveDraft ? (editor.dirty ? 'Suivi actuel : '+Library.statusLabel(editor.originalStatus)+' · '+Library.score(editor.originalNote)+'. Tes choix restent préparés.' : 'Ton choix est bien enregistré.') : editor.dirty ? 'Rien n’est écrit sur AniList avant « Enregistrer ».' : '';textFormat:Text.PlainText;wrapMode:Text.WordWrap;maximumLineCount:2;elide:Text.ElideRight;color:editor.recover ? '#e9c38f' : '#aeb5c3';font.family:editor.family;font.pixelSize:17}
        Row {x:40;y:636;spacing:14
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
