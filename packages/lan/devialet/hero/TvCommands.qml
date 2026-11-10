import QtQuick 2.15

// Pilotage depuis le PC : lecture, pause, position, épisode suivant, arrêt (Atlas, engine
// `tv/commandes.rs`, doc `Atlas/engine/docs/atlas-tv.md` « Piloter la lecture depuis le PC »).
// Une commande à la fois, appliquée par les gestes du lecteur ; `applied` ne part qu'après
// l'effet observé. Les reçus se réessaient ; une commande ne s'applique jamais deux fois.
Item {
    id:receiver;objectName:'tvCommands';visible:false
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
    readonly property bool receiving:!!(primary && !blocked && transport && transport.state==='ready' && transport.tvCommandsEnabled===true)
    function isId(v){return typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);}
    function valid(v){
        if(!v || !isId(v.request_id) || ['play','pause','seek','next','stop'].indexOf(v.action)<0)return false;
        if(!Number.isInteger(v.ttl_ms) || v.ttl_ms<=0 || v.ttl_ms>30000)return false;
        if(v.playback_id!==undefined && !isId(v.playback_id))return false;
        return v.action==='seek' ? Number.isInteger(v.position_ms) && v.position_ms>=0 && v.position_ms<=43200000 : v.position_ms===undefined;
    }
    function seen(id){return recent.some(function(v){return v.id===id && v.until>Date.now();});}
    function forget(item){
        if(active!==item)return;
        recent=recent.filter(function(v){return v.until>Date.now() && v.id!==item.command.request_id;}).slice(-31).concat([{id:item.command.request_id,until:Date.now()+600000}]);
        active=null;
        if(receiving){pollDelay.interval=250;pollDelay.restart();}
    }
    function settle(item,receipt,code){
        if(active!==item || item.phase==='terminal')return;
        item.phase='terminal';item.receipt=receipt;item.code=code || '';item.nextAck=0;
        console.info('ATLAS_TV_COMMAND',item.command.action,receipt,code || '');
        acknowledge(item);
    }
    function offer(value){
        if(!receiving || !valid(value) || active || seen(value.request_id))return;
        var item={command:value,deadline:Date.now()+value.ttl_ms,phase:'applying',receipt:'',code:'',nextAck:0,origin:host ? host.playbackId : '',target:-1,sawChange:false};
        active=item;apply(item);
    }
    function apply(item){
        var c=item.command,p=player;
        if(!host || !host.playbackId || !p){settle(item,'failed','no_playback');return;}
        if(c.playback_id && c.playback_id!==host.playbackId){settle(item,'failed','playback_mismatch');return;}
        // Arrêter = revenir à la fiche, comme Retour : même pendant un changement d'épisode.
        if(c.action==='stop'){item.phase='observing';p.close();observe(item);return;}
        if(host.resolving || p.changing || p.retrying){settle(item,'failed','player_busy');return;}
        if(c.action==='next'){
            if(!p.current || !p.current.suivant || p.current.target.version){settle(item,'failed','no_next_episode');return;}
            item.phase='observing';p.launchNext();return;
        }
        if(p.failure){settle(item,'failed','player_error');return;}
        if(c.action==='play' && !p.remotePlay() || c.action==='pause' && !p.remotePause()){settle(item,'failed','player_busy');return;}
        if(c.action==='seek'){
            if(!p.seekTo(c.position_ms)){settle(item,'failed','not_seekable');return;}
            item.target=Math.max(0,Math.min(p.durationMs-1000,c.position_ms));
        }
        item.phase='observing';observe(item);
    }
    function observe(item){
        var c=item.command,p=player;
        if(c.action==='stop'){if(!host.playbackId)settle(item,'applied');return;}
        if(c.action==='next'){
            // L'épisode suivant joue : nouvelle lecture, vidéo qui avance. Une résolution qui
            // retombe sur l'ancienne lecture (ou ferme le lecteur) est un échec.
            if(host.resolving){item.sawChange=true;return;}
            if(host.playbackId && host.playbackId!==item.origin){
                if(p && p.failure)settle(item,'failed','player_error');
                else if(p && p.observationReady)settle(item,'applied');
                return;
            }
            if(item.sawChange || !host.playbackId)settle(item,'failed','player_error');
            return;
        }
        if(host.playbackId!==item.origin){settle(item,'failed','player_busy');return;}
        if(!p || p.failure){settle(item,'failed','player_error');return;}
        if(c.action==='play' && p.playing){settle(item,'applied');p.reportNow();}
        // La pause et la position ont déjà leur progression dans le lecteur (onPlaybackStateChanged,
        // confirmSeek) : on n'en ajoute pas une seconde.
        else if(c.action==='pause' && !p.playing && !p.wantsPlaying)settle(item,'applied');
        else if(c.action==='seek' && p.seekTarget<0 && Math.abs(p.positionMs-item.target)<2500)settle(item,'applied');
    }
    function acknowledge(item){
        if(acknowledging || !receiving || active!==item)return;
        acknowledging=true;var id=item.command.request_id,body={state:item.receipt};if(item.receipt==='failed')body.code=item.code;
        transport.conversationApi('/tv/v1/commands/'+id+'/ack',body,8000,function(status,value){
            acknowledging=false;if(active!==item)return;
            if(status===200 && value && value.request_id===id || [400,403,404,409,410].indexOf(status)>=0){
                if(status===403)blocked=true;
                forget(item);return;
            }
            item.nextAck=Date.now()+1000;
        });
    }
    function poll(){
        if(!receiving || polling || active)return;
        polling=true;var turn=epoch;
        transport.conversationApi('/tv/v1/commands/next',{},30000,function(status,value){
            polling=false;
            if(turn===epoch && receiving){
                if(status===403){blocked=true;return;}
                if(status===200 && value && value.command)offer(value.command);
            }
            if(receiving && !active){pollDelay.interval=status===200 ? 250 : 2000;pollDelay.restart();}
        });
    }
    function tick(){
        var item=active;if(!item)return;
        if(item.phase==='observing'){
            if(Date.now()>=item.deadline){settle(item,'failed','command_expired');return;}
            observe(item);
        }else if(item.phase==='terminal'){
            if(Date.now()>item.deadline+10000){forget(item);return;}
            if(Date.now()>=item.nextAck)acknowledge(item);
        }
    }
    onReceivingChanged:{epoch++;if(receiving)pollDelay.restart();else {pollDelay.stop();if(active)forget(active);}}
    Timer {id:pollDelay;interval:250;onTriggered:receiver.poll()}
    Timer {interval:250;repeat:true;running:!!receiver.active;onTriggered:receiver.tick()}
    Component.onCompleted:if(receiving)pollDelay.restart()
}
