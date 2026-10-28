import QtQuick 2.15

Item {
    id: cache
    visible:false
    property var transport
    property var sources: ({})
    property var entries: ({})
    property var queued: []
    property var pending: ({})
    property int active: 0
    function request(media,kind,priority) {
        if(!transport || !transport.artworkEnabled || transport.state!=='ready' || !media || !(media.anilist_id>0)) return;
        var id=media.anilist_id, key=id+':'+kind, entry=entries[key], shown=sources[String(id)];
        if(pending[key] || queued.length>=64 || (entry && ((shown && shown[kind] && entry.expires>Date.now()+30000) || entry.retryAt>Date.now()))) return;
        pending[key]=true;
        var job={id:id,kind:kind,key:key};
        queued=priority ? [job].concat(queued) : queued.concat([job]);
        pump();
    }
    function pump() {
        if(active>=2 || !queued.length || !transport.artworkEnabled || transport.state!=='ready') return;
        var job=queued[0]; queued=queued.slice(1); active++;
        transport.api('/tv/v1/artworks',{anilist_id:job.id,kind:job.kind},30000,function(status,value) {
            active--; delete pending[job.key];
            var url=value ? transport.mediaUrl(value.path,'artwork') : '';
            if(status===200 && value && value.anilist_id===job.id && value.kind===job.kind && value.expires_at*1000>Date.now()+30000 && url) {
                entries[job.key]={expires:value.expires_at*1000};
                var next=JSON.parse(JSON.stringify(sources)), artwork=next[String(job.id)] || {};
                artwork[job.kind]=url;
                if(job.kind==='banner') artwork.card=url;
                next[String(job.id)]=artwork;
                // Only the current home/list is warmed; keep a bounded memory map.
                var ids=Object.keys(next);
                while(ids.length>64) { delete next[ids.shift()]; }
                sources=next;
            } else entries[job.key]={retryAt:Date.now()+(status===429 ? 10000 : 60000)};
            var keys=Object.keys(entries);
            for(var i=0;i<keys.length-128;i++) delete entries[keys[i]];
            pump();
        });
        pump();
    }
}
