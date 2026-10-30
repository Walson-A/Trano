import QtQuick 2.15

// The home and detail share grants, never arbitrary URLs or episode progress.
Item {
    id:store
    visible:false
    property var transport
    property var cache:({})
    property var pending:({})
    property var failures:({})
    property var queued:[]
    property int epoch:0
    property int active:0
    function identity(media){return media && Number.isInteger(media.anilist_id) && media.anilist_id>0 && /^[A-Za-z0-9_-]{11}$/.test(media.bande_annonce || '') ? media.anilist_id+':'+media.bande_annonce : '';}
    function cachedSource(media){var entry=cache[identity(media)];return entry && entry.expires>Date.now()+30000 ? entry.url : '';}
    function clear(){epoch++;cache={};pending={};queued=[];failures={};active=0;}
    function invalidate(media){var key=identity(media),next={},bad={};Object.keys(cache).forEach(function(k){if(k!==key)next[k]=cache[k];});Object.keys(failures).forEach(function(k){if(k!==key)bad[k]=failures[k];});cache=next;failures=bad;}
    function resolve(media,done){
        var key=identity(media),url=cachedSource(media);
        if(!key || !transport || transport.state!=='ready'){done(404,'');return;}
        if(url){done(200,url);return;}
        if(failures[key]>Date.now()){done(429,'');return;}
        var job=pending[key];
        if(job){job.listeners=job.listeners.filter(function(l){return l.live;});if(job.listeners.length>=8){done(429,'');return;}}
        else{
            if(queued.length>=2){done(429,'');return;}
            job={key:key,id:media.anilist_id,trailer:media.bande_annonce,listeners:[],running:false};pending[key]=job;queued=queued.concat([job]);
        }
        var listener={live:true,done:done};job.listeners.push(listener);pump();
        return {cancel:function(){
            listener.live=false;
            if(!job.running && !job.listeners.some(function(l){return l.live;})){
                if(pending[key]===job)delete pending[key];queued=queued.filter(function(value){return value!==job;});pump();
            }
        }};
    }
    function pump(){
        while(active<2 && queued.length){
            var job=queued[0];queued=queued.slice(1);
            if(!job.listeners.some(function(l){return l.live;})){if(pending[job.key]===job)delete pending[job.key];continue;}
            send(job);
        }
    }
    function send(job){
        var turn=epoch,key=job.key,id=job.id,trailer=job.trailer;job.running=true;active++;
        transport.api('/tv/v1/previews',{anilist_id:id},110000,function(status,value){
            if(turn!==epoch)return;
            var callbacks=job.listeners;delete pending[key];active--;var url='';
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
            for(var c=0;c<callbacks.length;c++)if(callbacks[c].live)callbacks[c].done(status,url);
            pump();
        });
    }
    Connections {target:store.transport;function onUnavailable(){store.clear();}}
}
