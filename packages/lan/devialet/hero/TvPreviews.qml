import QtQuick 2.15

// The home and detail share grants, never arbitrary URLs or episode progress.
Item {
    id:store
    visible:false
    property var transport
    property var cache:({})
    property var pending:({})
    property var failures:({})
    property int epoch:0
    property int active:0
    function identity(media){return media && Number.isInteger(media.anilist_id) && media.anilist_id>0 && /^[A-Za-z0-9_-]{11}$/.test(media.bande_annonce || '') ? media.anilist_id+':'+media.bande_annonce : '';}
    function cachedSource(media){var entry=cache[identity(media)];return entry && entry.expires>Date.now()+30000 ? entry.url : '';}
    function clear(){epoch++;cache={};pending={};failures={};active=0;}
    function resolve(media,done){
        var key=identity(media),url=cachedSource(media);
        if(!key || !transport || transport.state!=='ready'){done(404,'');return;}
        if(url){done(200,url);return;}
        if(failures[key]>Date.now()){done(429,'');return;}
        if(pending[key]){if(pending[key].length<8)pending[key].push(done);else done(429,'');return;}
        if(active>=2){done(429,'');return;}
        var turn=epoch,id=media.anilist_id,trailer=media.bande_annonce;pending[key]=[done];active++;
        transport.api('/tv/v1/previews',{anilist_id:id},110000,function(status,value){
            if(turn!==epoch)return;
            var callbacks=pending[key] || [];delete pending[key];active--;
            var grant=value ? transport.mediaUrl(value.path,'trailer') : '';
            if(status===200 && value && value.kind==='trailer' && value.anilist_id===id && value.youtube_id===trailer && grant && typeof value.expires_at==='number' && isFinite(value.expires_at) && value.expires_at*1000>Date.now()+30000){
                var next={},keys=Object.keys(cache);
                for(var i=Math.max(0,keys.length-15);i<keys.length;i++)if(cache[keys[i]].expires>Date.now()+30000)next[keys[i]]=cache[keys[i]];
                next[key]={url:grant,expires:value.expires_at*1000};cache=next;url=grant;
            }else{
                var recent={},failedKeys=Object.keys(failures);
                for(var j=Math.max(0,failedKeys.length-15);j<failedKeys.length;j++)if(failures[failedKeys[j]]>Date.now())recent[failedKeys[j]]=failures[failedKeys[j]];
                recent[key]=Date.now()+60000;failures=recent;url='';if(status===200)status=502;
            }
            for(var c=0;c<callbacks.length;c++)callbacks[c](status,url);
        });
    }
    Connections {target:store.transport;function onUnavailable(){store.clear();}}
}
