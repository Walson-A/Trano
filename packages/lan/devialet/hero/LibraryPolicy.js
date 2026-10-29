.pragma library

var statuses=[['PLANNING','À voir'],['CURRENT','En cours'],['COMPLETED','Terminé'],['PAUSED','En pause'],['DROPPED','Abandonné'],['REPEATING','À revoir']];
function knownStatus(value){return statuses.some(function(s){return s[0]===value;});}
function statusLabel(value){for(var i=0;i<statuses.length;i++)if(statuses[i][0]===value)return statuses[i][1];return 'Suivi à confirmer';}
function score(value){return typeof value==='number' && isFinite(value) && value>0 ? String(value).replace('.',',') : 'Non noté';}
function step(value,direction){if(!(value>0))return .5;return Math.max(.5,Math.min(10,(direction>0 ? Math.floor(value*2+1.000001) : Math.ceil(value*2-1.000001))/2));}
function uuid(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.floor(Math.random()*16);return (c==='x' ? r : (r&3)|8).toString(16);});}
function matches(entry,patch){
    if(!entry || entry.presence!=='present' || !entry.moi)return false;
    return Object.keys(patch).every(function(k){return k==='note' ? (entry.moi.note || null)===(patch.note || null) : entry.moi[k]===patch[k];});
}
function validEntry(value,id){
    if(!value || value.anilist_id!==id || ['present','absent','inconnu'].indexOf(value.presence)<0 || typeof value.editable!=='boolean')return false;
    if(value.presence==='inconnu')return !value.editable;
    if(typeof value.revision!=='string' || !value.revision.length || value.revision.length>512)return false;
    if(value.presence==='absent')return value.moi===null;
    var moi=value.moi;
    return !!moi && knownStatus(moi.statut) && Number.isInteger(moi.progression) && moi.progression>=0 && (moi.note===null || typeof moi.note==='number' && isFinite(moi.note) && moi.note>=0 && moi.note<=10);
}
