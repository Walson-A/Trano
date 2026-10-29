import QtQuick 2.15
import "LibraryPolicy.js" as Library

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
    readonly property int freshnessMs:30000
    property int epoch:0
    readonly property bool available:!!(transport && transport.libraryEnabled)
    signal changed(int identity)
    signal saved(int identity,var value,var previous)
    function entry(id){return entries[String(id)] || null;}
    function phase(id){return phases[String(id)] || 'idle';}
    function message(id){return messages[String(id)] || '';}
    function assign(map,id,value){var copy={};Object.keys(map).forEach(function(k){copy[k]=map[k];});copy[String(id)]=value;return copy;}
    function setPhase(id,phase,text){phases=assign(phases,id,phase);messages=assign(messages,id,text || '');changed(id);}
    function clear(){epoch++;entries={};phases={};messages={};serials={};checkedAt={};}
    function begin(id){var n=(serials[String(id)] || 0)+1;serials=assign(serials,id,n);return n;}
    function accept(id,value){
        if(!Library.validEntry(value,id))return false;
        // Keep the cache bounded; neither credentials nor personal data go to disk.
        var copy={},keys=Object.keys(entries);for(var i=Math.max(0,keys.length-119);i<keys.length;i++)copy[keys[i]]=entries[keys[i]];
        copy[String(id)]=value;entries=copy;
        var times={};Object.keys(copy).forEach(function(k){times[k]=k===String(id) ? Date.now() : checkedAt[k];});checkedAt=times;return true;
    }
    function ensure(id){var age=Date.now()-(checkedAt[String(id)] || 0),value=entry(id);if(phase(id)==='loading' || phase(id)==='saving' || phase(id)==='ready' && value && value.presence!=='inconnu' && age>=0 && age<freshnessMs)return;load(id);}
    function load(id){
        if(!available || !Number.isInteger(id) || id<=0 || phase(id)==='saving' || phase(id)==='loading')return;
        var turn=begin(id),session=epoch;setPhase(id,'loading','');
        transport.api('/tv/v1/library-entry',{anilist_id:id},45000,function(code,value){
            if(session!==epoch || serials[String(id)]!==turn)return;
            if(code!==200 || !accept(id,value)){setPhase(id,'error','Impossible de charger ton suivi. Réessaie.');return;}
            setPhase(id,'ready',value.presence==='inconnu' ? 'Connecte AniList dans Atlas pour retrouver ton suivi.' : !value.editable ? 'Ton suivi est en lecture seule sur cette TV.' : '');
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
    Connections {target:store.transport || null;function onUnavailable(){store.clear();}}
}
