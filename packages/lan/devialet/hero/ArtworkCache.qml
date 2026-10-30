import QtQuick 2.15

Item {
    id:cache
    visible:false
    property var transport
    property var sources:({})
    property var entries:({})
    property var sourceOrder:[]
    property var entryOrder:[]
    property var queued:[]
    property var pending:({})
    property int active:0
    property int epoch:0
    function available(){return transport && transport.artworkEnabled && transport.state==='ready';}
    function clear(){epoch++;sources={};entries={};sourceOrder=[];entryOrder=[];queued=[];pending={};active=0;}
    function clone(value){var result={};Object.keys(value || {}).forEach(function(k){result[k]=value[k];});return result;}
    function remember(key,value){
        var order=entryOrder.filter(function(k){return k!==key;}).concat([key]),next=clone(entries);next[key]=value;
        while(order.length>128)delete next[order.shift()];entryOrder=order;entries=next;
    }
    function touch(id){sourceOrder=sourceOrder.filter(function(k){return k!==String(id);}).concat([String(id)]);}
    function show(id,kind,url){
        var next=clone(sources),image=clone(next[String(id)]);image[kind]=url;if(kind==='banner')image.card=url;next[String(id)]=image;
        touch(id);var order=sourceOrder.slice();while(order.length>64)delete next[order.shift()];sourceOrder=order;sources=next;
    }
    function forget(id,kind,url){
        var current=sources[String(id)];if(!current || String(current[kind] || '')!==String(url))return;
        var next=clone(sources),image=clone(current);delete image[kind];if(kind==='banner' && String(image.card || '')===String(url))delete image.card;
        if(Object.keys(image).length)next[String(id)]=image;else{delete next[String(id)];sourceOrder=sourceOrder.filter(function(k){return k!==String(id);});}
        sources=next;
    }
    function enqueue(id,kind,priority){
        var key=id+':'+kind;
        if(pending[key]){if(priority){for(var i=0;i<queued.length;i++)if(queued[i].key===key){var list=queued.slice(),job=list.splice(i,1)[0];job.priority=true;queued=[job].concat(list);break;}}return;}
        if(queued.length>=64){if(!priority)return;var list=queued.slice(),dropped=list.pop();delete pending[dropped.key];queued=list;}
        pending[key]=true;var job={id:id,kind:kind,key:key,priority:!!priority};queued=priority ? [job].concat(queued) : queued.concat([job]);pump();
    }
    function request(media,kind,priority){
        if(!available() || !media || !(media.anilist_id>0) || ['poster','banner'].indexOf(kind)<0)return;
        var id=media.anilist_id,key=id+':'+kind,entry=clone(entries[key]),shown=sources[String(id)],now=Date.now();
        entry.id=id;entry.kind=kind;entry.wantedUntil=now+45000;entry.priority=!!priority || !!entry.priority;remember(key,entry);
        if(shown && shown[kind] && entry.expires>now+30000){touch(id);return;}
        if(entry.retryAt>now)return;
        if(entry.failures>=3){entry.failures=0;remember(key,entry);}
        enqueue(id,kind,priority);
    }
    function retry(job,status){
        var entry=clone(entries[job.key]),count=(entry.failures || 0)+1,retryable=status===0 || status===408 || status===429 || status>=500;
        entry.id=job.id;entry.kind=job.kind;entry.failures=count;entry.expires=0;
        entry.retryAt=Date.now()+(count>=3 || !retryable ? 60000 : status===429 ? 10000 : count===1 ? 1000 : 3000);
        entry.automatic=retryable && count<3;entry.priority=!!job.priority;remember(job.key,entry);
    }
    function failed(media,kind,url){
        if(!available() || !media || !(media.anilist_id>0) || !url)return;
        url=String(url);if(!url)return;var id=media.anilist_id,shown=sources[String(id)];
        if(shown && shown[kind] && String(shown[kind])===url){}else if(shown && String(shown.poster || '')===url)kind='poster';
        else if(shown && String(shown.banner || '')===url)kind='banner';
        else if(url===String(media.affiche || ''))kind='poster';
        else if(url===String(media.banniere || ''))kind='banner';
        else return;
        if(shown && shown[kind] && String(shown[kind])!==url)return;
        var key=id+':'+kind,entry=entries[key];if(entry && entry.retryAt>Date.now())return;
        if(!entry){request(media,kind,true);return;}
        var next=clone(entry);next.wantedUntil=Date.now()+45000;remember(key,next);
        retry({id:id,kind:kind,key:key,priority:true},0);forget(id,kind,url);
    }
    function confirmed(media,kind,url){
        if(!media || !url)return;var id=media.anilist_id,shown=sources[String(id)],text=String(url);if(!text)return;
        if(shown && shown[kind] && String(shown[kind])===text){}else if(shown && String(shown.poster || '')===text)kind='poster';else if(shown && String(shown.banner || '')===text)kind='banner';else return;
        var key=id+':'+kind,entry=clone(entries[key]);entry.failures=0;entry.automatic=false;entry.retryAt=0;remember(key,entry);touch(id);
    }
    function retryDue(){
        var now=Date.now();entryOrder.slice().forEach(function(key){var entry=entries[key];if(!entry || !entry.automatic)return;if(entry.wantedUntil<now){var expired=clone(entry);expired.automatic=false;remember(key,expired);return;}if(entry.retryAt>now || pending[key])return;
            var next=clone(entry);next.automatic=false;remember(key,next);enqueue(entry.id,entry.kind,entry.priority);
        });
    }
    function pump(){
        if(active>=2 || !queued.length || !available())return;
        var job=queued[0],generation=epoch;queued=queued.slice(1);active++;
        transport.api('/tv/v1/artworks',{anilist_id:job.id,kind:job.kind},30000,function(status,value){
            if(generation!==epoch)return;active--;delete pending[job.key];
            var url=value ? transport.mediaUrl(value.path,'artwork') : '';
            if(status===200 && value && value.anilist_id===job.id && value.kind===job.kind && value.expires_at*1000>Date.now()+30000 && url){
                var entry=clone(entries[job.key]);entry.expires=value.expires_at*1000;entry.retryAt=0;entry.automatic=false;remember(job.key,entry);show(job.id,job.kind,url);
            }else retry(job,status);
            pump();
        });pump();
    }
    Timer {interval:250;repeat:true;running:cache.available() && cache.entryOrder.some(function(key){var e=cache.entries[key];return e && e.automatic;});onTriggered:cache.retryDue()}
    Connections {target:cache.transport || null;function onUnavailable(){cache.clear();}}
}
