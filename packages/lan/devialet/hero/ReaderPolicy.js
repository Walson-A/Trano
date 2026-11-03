.pragma library
function identity(t,source,id){return t && Number.isInteger(t.anilist_id) && t.anilist_id>0 && Number.isInteger(t.episode) && t.episode>0 && ['vo','vf'].indexOf(t.lang)>=0 && ['voiranime','anime-sama','franime'].indexOf(source)>=0 && /^[a-f0-9]{64}$/.test(id || '') ? t.anilist_id+':'+t.episode+':'+t.lang+':'+source+':'+id : '';}
function remember(previous,target,attempts,now){
    var next={},keys=Object.keys(previous || {});
    for(var i=Math.max(0,keys.length-120);i<keys.length;i++)if(previous[keys[i]]>now)next[keys[i]]=previous[keys[i]];
    if(!Array.isArray(attempts))return next;
    attempts.slice(-8).forEach(function(a){
        if(!a || ['source_missing','source_denied','format_unsupported','reader_unsupported','reader_unavailable'].indexOf(a.code)<0)return;
        var key=identity(target,a.source,a.reader_id);if(key)next[key]=now+(a.code==='source_missing' ? 300000 : 60000);
    });return next;
}
function usable(reader,target,failures,now,current){
    if(current && current.readerId===reader.reader_id && current.source===reader.source)return true;
    return reader.supported===true && !((failures || {})[identity(target,reader.source,reader.reader_id)]>now);
}
function recovered(previous,target,source,id){var next={},key=identity(target,source,id);Object.keys(previous || {}).forEach(function(k){if(k!==key)next[k]=previous[k];});return next;}
function bitrate(value){return typeof value==='number' && isFinite(value) && value>=1 && value<=1000000 ? 'Débit annoncé · '+(value/1000).toFixed(1).replace('.',',')+' Mb/s' : '';}
