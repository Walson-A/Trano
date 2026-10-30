import QtQuick 2.15
import "LibraryPolicy.js" as Library
import "RequestState.js" as RequestState

// Session-only confirmed state. A public card with moi:null is not an absence.
Item {
    id:store
    visible:false
    property var transport
    property var entries:({})
    property var phases:({})
    property var messages:({})
    property var serials:({})
    property var checkedAt:({})
    property var pendingRemovals:({})
    readonly property int freshnessMs:30000
    property int epoch:0
    readonly property bool available:!!(transport && transport.libraryEnabled)
    readonly property bool removalAvailable:available && transport.libraryRemoveEnabled===true
    signal changed(int identity)
    signal saved(int identity,var value,var previous)
    function entry(id){return entries[String(id)] || null;}
    function phase(id){return phases[String(id)] || 'idle';}
    function message(id){return messages[String(id)] || '';}
    function assign(map,id,value){var copy={};Object.keys(map).forEach(function(k){copy[k]=map[k];});copy[String(id)]=value;return copy;}
    function setPhase(id,phase,text){phases=assign(phases,id,phase);messages=assign(messages,id,text || '');changed(id);}
    function clear(){epoch++;entries={};phases={};messages={};serials={};checkedAt={};pendingRemovals={};}
    function begin(id){var n=(serials[String(id)] || 0)+1;serials=assign(serials,id,n);return n;}
    function accept(id,value){
        if(!Library.validEntry(value,id))return false;
        // Keep the cache bounded; neither credentials nor personal data go to disk.
        var copy={},keys=Object.keys(entries);for(var i=Math.max(0,keys.length-119);i<keys.length;i++)copy[keys[i]]=entries[keys[i]];
        copy[String(id)]=value;entries=copy;
        var times={};Object.keys(copy).forEach(function(k){times[k]=k===String(id) ? Date.now() : checkedAt[k];});checkedAt=times;return true;
    }
    function ensure(id){var age=Date.now()-(checkedAt[String(id)] || 0),value=entry(id);if(phase(id)==='loading' || phase(id)==='saving' || phase(id)==='ready' && value && value.presence!=='inconnu' && age>=0 && age<freshnessMs)return;read(id,['conflict','uncertain'].indexOf(phase(id))<0 && !(value && value.presence==='inconnu'));}
    function load(id){read(id,false);}
    function prepareRemoval(id){
        var value=entry(id);if(!removalAvailable || phase(id)!=='ready' || !value || !value.editable || value.presence!=='present')return false;
        pendingRemovals=assign(pendingRemovals,id,true);load(id);return true;
    }
    function read(id,reuseRecent){
        if(!available || !Number.isInteger(id) || id<=0 || phase(id)==='saving' || phase(id)==='loading')return;
        var before=entry(id),turn=begin(id),session=epoch;setPhase(id,'loading','');
        var body={anilist_id:id};if(reuseRecent===true && !pendingRemovals[String(id)] && transport.libraryReadCacheEnabled===true)body.reuse_recent=true;
        transport.api('/tv/v1/library-entry',body,45000,function(code,value){
            if(session!==epoch || serials[String(id)]!==turn)return;
            if(code!==200 || !accept(id,value)){setPhase(id,'error',RequestState.message(code,value,'Impossible de charger ton suivi. Réessaie.'));return;}
            var removing=!!pendingRemovals[String(id)];pendingRemovals=assign(pendingRemovals,id,false);
            setPhase(id,'ready',value.presence==='inconnu' ? 'Connecte AniList dans Atlas pour retrouver ton suivi.' : !value.editable ? 'Ton suivi est en lecture seule sur cette TV.' : '');
            if(removing && value.presence==='absent')saved(id,value,before);
        });
    }
    function save(id,patch){
        var before=entry(id);if(!available || phase(id)!=='ready' || !before || !before.editable)return false;
        var fields=Object.keys(patch);if(!fields.length || fields.some(function(k){return ['statut','note','progression'].indexOf(k)<0;}))return false;
        var body={anilist_id:id,revision:before.revision,request_id:Library.uuid()};fields.forEach(function(k){body[k]=patch[k];});
        var turn=begin(id),session=epoch;setPhase(id,'saving','Enregistrement…');
        transport.api('/tv/v1/library-update',body,45000,function(code,value){
            if(session!==epoch || serials[String(id)]!==turn)return;
            if(code===200 && value && value.request_id===body.request_id && accept(id,value)){setPhase(id,'ready','Enregistré');saved(id,value,before);return;}
            // A transport timeout is ambiguous. Never replay a mutation automatically.
            if(code===409){setPhase(id,'conflict','Ton suivi a changé ailleurs. Recharge-le avant d’enregistrer.');return;}
            setPhase(id,'uncertain','Enregistrement non confirmé. Vérifie ton suivi avant de réessayer.');
        });return true;
    }
    function remove(id){
        var before=entry(id);if(!removalAvailable || phase(id)!=='ready' || !Library.removable(before))return false;
        var body={anilist_id:id,removal_revision:before.removal_revision,request_id:Library.uuid()},turn=begin(id),session=epoch;
        pendingRemovals=assign(pendingRemovals,id,true);setPhase(id,'saving','Retrait…');
        transport.api('/tv/v1/library-remove',body,45000,function(code,value){
            if(session!==epoch || serials[String(id)]!==turn)return;
            if(code===200 && value && value.request_id===body.request_id && value.presence==='absent' && accept(id,value)){
                pendingRemovals=assign(pendingRemovals,id,false);setPhase(id,'ready','Retiré de Ma liste');saved(id,value,before);return;
            }
            if(code===409){setPhase(id,'conflict','Ton suivi a changé ailleurs. Vérifie-le avant de confirmer à nouveau le retrait.');return;}
            setPhase(id,'uncertain','Retrait non confirmé. Vérifie ta liste avant de réessayer.');
        });return true;
    }
    Connections {target:store.transport || null;function onUnavailable(){store.clear();}}
}
