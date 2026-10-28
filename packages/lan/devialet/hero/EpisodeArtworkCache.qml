import QtQuick 2.15
Item {
    id:cache;objectName:"episodeArtworkCache";visible:false
    property var transport
    property var sources:({})
    property var entries:({})
    property var pending:({})
    property var queue:[]
    property int active:0
    function request(identity,number){
        if(!transport || !transport.artworkEnabled || transport.state!=='ready' || !(identity>0) || !(number>0) || number>100000)return;
        var key=identity+':'+number,entry=entries[key];
        if(pending[key] || queue.length>=40 || entry && (entry.retryAt>Date.now() || sources[key] && entry.expires>Date.now()+30000))return;
        pending[key]=true;queue=queue.concat([{key:key,id:identity,number:number}]);pump();
    }
    function invalidate(identity,number){
        var key=identity+':'+number,next=JSON.parse(JSON.stringify(sources));delete next[key];sources=next;entries[key]={retryAt:Date.now()+60000};
    }
    function pump(){
        if(active>=2 || !queue.length || !transport || transport.state!=='ready')return;
        var job=queue[0];queue=queue.slice(1);active++;
        transport.api('/tv/v1/artworks',{anilist_id:job.id,kind:'episode',episode:job.number},45000,function(status,value){
            active--;delete pending[job.key];
            var url=value ? transport.mediaUrl(value.path,'artwork') : '';
            if(status===200 && value && value.anilist_id===job.id && value.episode===job.number && value.kind==='episode' && value.expires_at*1000>Date.now()+30000 && url){
                var next=JSON.parse(JSON.stringify(sources));next[job.key]=url;
                while(Object.keys(next).length>80)delete next[Object.keys(next)[0]];
                sources=next;entries[job.key]={expires:value.expires_at*1000};
            }else entries[job.key]={retryAt:Date.now()+(status===429 ? 15000 : 300000)};
            var keys=Object.keys(entries);for(var i=0;i<keys.length-120;i++)delete entries[keys[i]];
            pump();
        });pump();
    }
}
