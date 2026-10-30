import QtQuick 2.15

// Ephemeral primary receiver. ACKs may retry; a native dispatch never does.
Item {
    id:receiver;objectName:'tvConversationLaunch';visible:false
    property var transport
    property var host
    property var player
    property bool primary:false
    property bool blocked:false
    property bool polling:false
    property bool acknowledging:false
    property int epoch:0
    property var active:null
    property var recent:[]
    readonly property bool receiving:!!(primary && !blocked && transport && transport.state==='ready' && transport.conversationLaunchEnabled===true)
    function valid(value){return value && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.request_id || '') && Number.isInteger(value.anilist_id) && value.anilist_id>0 && value.anilist_id<=2147483647 && Number.isInteger(value.episode) && value.episode>0 && value.episode<=100000 && ['vo','vf'].indexOf(value.lang)>=0 && Number.isInteger(value.expires_at) && value.expires_at>0 && Number.isInteger(value.ttl_ms) && value.ttl_ms>0 && value.ttl_ms<=90000;}
    function identity(value){return value.anilist_id+':'+value.episode+':'+value.lang;}
    function matches(value,item){return value && value.request_id===item.intent.request_id && value.anilist_id===item.intent.anilist_id && value.episode===item.intent.episode && value.lang===item.intent.lang;}
    function remember(item){recent=recent.filter(function(v){return v.until>Date.now() && v.id!==item.intent.request_id;}).slice(-31).concat([{id:item.intent.request_id,until:Date.now()+600000}]);}
    function forget(item){if(active!==item)return;remember(item);active=null;}
    function offer(value){
        if(!receiving || !valid(value) || active || recent.some(function(v){return v.id===value.request_id && v.until>Date.now();}))return;
        active={intent:value,deadline:Date.now()+value.ttl_ms,phase:'accepting',dispatched:false,expectedId:'',same:false,position:-1,at:0,advances:0,nextAck:0};
        tick();
    }
    function poll(){
        if(!receiving || polling)return;
        polling=true;var turn=epoch;
        transport.conversationApi('/tv/v1/launch-intents/next',{},30000,function(status,value){
            polling=false;
            if(turn===epoch && receiving){
                if(status===403){blocked=true;return;}
                if(status===200 && value)offer(value.intent);
            }
            if(receiving){pollDelay.interval=status===200 ? 250 : 2000;pollDelay.restart();}
        });
    }
    function finish(code){
        var item=active;if(!item || item.phase==='terminal')return;
        item.phase='terminal';item.receipt='failed';item.code=code;item.nextAck=0;
        host.cancelConversation(item.intent.request_id);tick();
    }
    function localAction(){finish('cancelled');}
    function failed(id,code){if(active && active.intent.request_id===id)finish(code==='episode_not_aired' ? code : code==='player_error' ? code : 'resolution_failed');}
    function accepted(item){
        if(active!==item || item.phase!=='accepting')return;
        if(Date.now()>=item.deadline){finish('intent_expired');return;}
        var current=host.pendingPlayback;
        if(current && host.playbackId && current.media.anilist_id===item.intent.anilist_id && current.target.numero===item.intent.episode && (current.target.vf ? 'vf' : 'vo')===item.intent.lang && player && player.observationReady){
            item.same=true;item.expectedId=host.playbackId;item.phase='observing';return;
        }
        if(host.resolving){finish('cancelled');return;}
        item.phase='detail';
        transport.api('/tv/v1/catalog/detail',{anilist_id:item.intent.anilist_id},Math.min(45000,Math.max(1,item.deadline-Date.now())),function(status,value){
            if(active!==item || item.phase!=='detail')return;
            if(Date.now()>=item.deadline){finish('intent_expired');return;}
            if(status!==200 || !value || !value.carte || value.carte.anilist_id!==item.intent.anilist_id){finish('resolution_failed');return;}
            item.dispatched=true;item.phase='observing';
            host.dispatchConversation(value.carte,item.intent);
        });
    }
    function acknowledge(item){
        if(acknowledging || !receiving || active!==item)return;
        acknowledging=true;var state=item.phase==='accepting' ? 'accepted' : item.receipt;
        var body={state:state};if(state==='failed')body.code=item.code;
        transport.conversationApi('/tv/v1/launch-intents/'+item.intent.request_id+'/ack',body,8000,function(status,value){
            acknowledging=false;if(active!==item)return;
            if(status===200 && matches(value,item)){
                if(state==='accepted'){
                    if(value.state==='accepted')accepted(item);
                    else if(['playing','failed','expired'].indexOf(value.state)>=0){forget(item);return;}
                }else if(value.state===state){forget(item);return;}
            }else if([400,403,404,409,410].indexOf(status)>=0){
                if(item.phase!=='terminal')host.cancelConversation(item.intent.request_id);
                forget(item);if(status===403)blocked=true;return;
            }
            item.nextAck=Date.now()+1000;
        });
    }
    function observe(item){
        var current=host.pendingPlayback;
        if(!item.expectedId){
            if(!current || current.remoteRequestId!==item.intent.request_id || !host.playbackId)return;
            item.expectedId=host.playbackId;
        }
        if(host.playbackId!==item.expectedId || !current || current.media.anilist_id!==item.intent.anilist_id || current.target.numero!==item.intent.episode || (current.target.vf ? 'vf' : 'vo')!==item.intent.lang){finish('cancelled');return;}
        if(player && player.failure){finish('player_error');return;}
        if(!player || !player.observationReady){item.position=-1;item.advances=0;return;}
        var position=player.positionMs,now=Date.now();
        if(item.position<0){item.position=position;item.at=now;return;}
        if(position===item.position)return;
        if(position<item.position || position-item.position>Math.max(2500,(now-item.at)*2+500))item.advances=0;
        else item.advances++;
        item.position=position;item.at=now;
        if(item.advances>=2){item.phase='terminal';item.receipt='playing';item.nextAck=0;}
    }
    function tick(){
        var item=active;if(!item)return;
        if(item.phase!=='terminal' && Date.now()>=item.deadline){finish('intent_expired');return;}
        if(item.phase==='observing')observe(item);
        if(active!==item)return;
        if(item.phase==='terminal' && Date.now()>item.deadline+10000){forget(item);return;}
        if((item.phase==='accepting' || item.phase==='terminal') && Date.now()>=item.nextAck)acknowledge(item);
    }
    onReceivingChanged:{epoch++;if(receiving)pollDelay.restart();else {pollDelay.stop();localAction();}}
    Timer {id:pollDelay;interval:250;onTriggered:receiver.poll()}
    Timer {interval:250;repeat:true;running:!!receiver.active;onTriggered:receiver.tick()}
    Component.onCompleted:if(receiving)pollDelay.restart()
}
