import QtQuick 2.15
import "RequestState.js" as RequestState

// Credentials belong to this runtime only. Never persist or log tokens/URLs.
Item {
    id: session
    visible: false
    property string apiOrigin: ""
    property string accessToken: ""
    property string refreshToken: ""
    property bool artworkEnabled: false
    property bool readersEnabled: false
    property bool variantsEnabled: false
    property bool hlsEnabled: false
    property bool libraryEnabled: false
    property bool libraryReadCacheEnabled:false
    property bool libraryRemoveEnabled:false
    property bool airingEnabled: false
    property bool conversationLaunchEnabled:false
    // Pilotage depuis le PC (lecture, pause, position, suivant, arrêt) : TvCommands.qml.
    property bool tvCommandsEnabled:false
    // Préférences communes aux trois écrans (engine) : langue par série, lecteur retenu,
    // épisode suivant automatique, son des bandes-annonces. Défauts de l'engine sans gateway.
    property bool preferencesEnabled:false
    property var preferences:({suivant_auto:true,son_bandes_annonces:true})
    property var seriesPreferences:({})
    signal preferencesLoaded()
    property double expiresAt: 0
    property bool refreshing: false
    property var waiters: []
    property var requests: []
    property var home: ({})
    property int homeGeneration:0
    property bool homeRefreshAllowed:false
    property bool homeRefreshing:false
    property string state: "connecting"
    property string message: "Connexion à Atlas…"
    signal homeLoaded()
    signal homeUpdating()
    signal unavailable()

    function fail() {
        accessToken=""; refreshToken=""; expiresAt=0;
        state="error"; message="Relance Atlas TV depuis ton téléphone pour te reconnecter.";
        unavailable();
    }
    function request(url, body, token, timeout, done, method) {
        var xhr=new XMLHttpRequest(), completed=false;
        var pending={xhr:xhr, deadline:Date.now()+timeout, finish:function(code,value) {
            if(completed) return;
            completed=true;
            var next=[];
            for(var i=0;i<requests.length;i++) if(requests[i]!==pending) next.push(requests[i]);
            requests=next;
            done(code,value);
        }};
        xhr.onreadystatechange=function() {
            if(xhr.readyState!==XMLHttpRequest.DONE || completed) return;
            var value=null;
            try { value=JSON.parse(xhr.responseText); } catch(e) {}
            pending.finish(xhr.status,value);
        };
        xhr.open(method || (body===null ? 'GET' : 'POST'),url);
        if(token) xhr.setRequestHeader('Authorization','Bearer '+token);
        if(body!==null) xhr.setRequestHeader('Content-Type','application/json');
        requests=requests.concat([pending]);
        xhr.send(body===null ? '' : JSON.stringify(body));
    }
    function credentials(value) {
        if(!value || !/^tv_access_[a-f0-9]{64}$/.test(value.access_token || '') ||
           !/^tv_refresh_[a-f0-9]{64}$/.test(value.refresh_token || '') || !(value.expires_in>0)) return false;
        accessToken=value.access_token; refreshToken=value.refresh_token;
        expiresAt=Date.now()+value.expires_in*1000;
        return true;
    }
    function start(runtimeUrl) {
        request(runtimeUrl,null,'',12000,function(status,runtime) {
            // Only the HTTPS origin that delivered this package may receive its activation.
            var origin=/^(https:\/\/[^\/]+)\//.exec(String(runtimeUrl));
            if(status!==200 || !runtime || runtime.protocol!==1 || !origin || runtime.apiOrigin!==origin[1] ||
               !runtime.activation || !/^tv_pair_[a-f0-9]{64}$/.test(runtime.activation.code || '')) { fail(); return; }
            apiOrigin=runtime.apiOrigin;
            artworkEnabled=!!(runtime.capabilities && runtime.capabilities.artwork);
            readersEnabled=!!(runtime.capabilities && runtime.capabilities.readers===true);
            variantsEnabled=!!(runtime.capabilities && runtime.capabilities.variants===true);
            hlsEnabled=!!(runtime.capabilities && runtime.capabilities.hls===true);
            libraryEnabled=!!(runtime.capabilities && runtime.capabilities.library===true);
            libraryReadCacheEnabled=!!(runtime.capabilities && runtime.capabilities.library_read_cache===true);
            libraryRemoveEnabled=!!(runtime.capabilities && runtime.capabilities.library_remove===true);
            airingEnabled=!!(runtime.capabilities && runtime.capabilities.airing===true);
            conversationLaunchEnabled=!!(runtime.capabilities && runtime.capabilities.conversation_launch===true);
            tvCommandsEnabled=!!(runtime.capabilities && runtime.capabilities.tv_commands===true);
            preferencesEnabled=!!(runtime.capabilities && runtime.capabilities.preferences===true);
            request(apiOrigin+'/tv/v1/session/activate',{code:runtime.activation.code},'',12000,function(code,value) {
                if(code!==200 || !credentials(value)) { fail(); return; }
                loadHome();loadPreferences(0,function(){});
            });
        });
    }
    function withAccess(done) {
        if(!accessToken) { done(false); return; }
        if(!refreshing && Date.now()<expiresAt-60000) { done(true); return; }
        waiters=waiters.concat([done]);
        if(refreshing) return;
        refreshing=true;
        request(apiOrigin+'/tv/v1/session/refresh',{refresh_token:refreshToken},'',12000,function(status,value) {
            var ok=status===200 && credentials(value), callbacks=waiters;
            waiters=[]; refreshing=false;
            // A lost rotation response must never be retried with the consumed refresh.
            if(!ok) fail();
            for(var i=0;i<callbacks.length;i++) callbacks[i](ok);
        });
    }
    function api(path,body,timeout,done) {
        withAccess(function(ok) {
            if(!ok) { done(401,null); return; }
            request(apiOrigin+path,body,accessToken,timeout,function(status,value) {
                if(status===401) fail();
                done(status,value);
            });
        });
    }
    // Only receiver next/ack (launch intents, PC commands) are idempotent across a single access refresh.
    function conversationApi(path,body,timeout,done){
        if(!/^\/tv\/v1\/(?:launch-intents|commands)\/(?:next|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\/ack)$/.test(path)){done(400,null);return;}
        function attempt(retried){withAccess(function(ok){
            if(!ok){done(401,null);return;}
            var admitted=accessToken;
            request(apiOrigin+path,body,admitted,timeout,function(status,value){
                if(status===401 && !retried){if(accessToken===admitted)expiresAt=0;attempt(true);return;}
                if(status===401)fail();done(status,value);
            });
        });}
        attempt(false);
    }
    function applyHome(value) {
        if(JSON.stringify(home)===JSON.stringify(value))return;
        homeUpdating();
        home=value;
        homeLoaded();
    }
    function loadHome(quiet) {
        if(quiet && (!homeRefreshAllowed || homeRefreshing || state!=='ready'))return;
        homeRefreshing=true;
        var turn=++homeGeneration;
        api('/tv/v1/catalog/home',{},45000,function(status,value) {
            if(!accessToken || turn!==homeGeneration) return;
            if(quiet && !homeRefreshAllowed){homeRefreshing=false;return;}
            if(status!==200 || !value || !Array.isArray(value.hero) || !Array.isArray(value.rangees)) {
                homeRefreshing=false;
                if(quiet)return;
                state='error'; message=RequestState.message(status,value,'Le catalogue est indisponible. OK pour réessayer.'); return;
            }
            state='ready'; message='';
            // Keep the current rows while a partial background response is enriched.
            if(!quiet || !value.complements_a_charger)applyHome(value);
            if(value.complements_a_charger) api('/tv/v1/catalog/home-extras',{},45000,function(code,complete) {
                if(turn!==homeGeneration)return;
                homeRefreshing=false;
                if(quiet && !homeRefreshAllowed)return;
                if(code===200 && complete && Array.isArray(complete.hero) && Array.isArray(complete.rangees))applyHome(complete);
                else if(quiet && (!home.rangees || !home.rangees.length))applyHome(value);
            });
            else homeRefreshing=false;
        });
    }
    // Lit les préférences, globales et pour une série. `done(serie)` reçoit
    // {langue:'vo'|'vf', langue_choisie, lecteur:{source,provider}|null} ou null.
    function acceptPreferences(value,id){
        if(!value || !value.global)return null;
        var g=value.global;preferences={suivant_auto:g.suivant_auto!==false,son_bandes_annonces:g.son_bandes_annonces!==false};
        var s=value.serie,serie=null;
        if(id>0 && s && s.anilist_id===id){
            var l=s.lecteur && typeof s.lecteur.source==='string' && typeof s.lecteur.provider==='string' ? {source:s.lecteur.source.slice(0,64),provider:s.lecteur.provider.slice(0,64)} : null;
            serie={langue:s.langue==='vf' ? 'vf' : 'vo',langue_choisie:s.langue_choisie===true,lecteur:l};
            var copy={};Object.keys(seriesPreferences).slice(-199).forEach(function(k){copy[k]=seriesPreferences[k];});copy[String(id)]=serie;seriesPreferences=copy;
        }
        preferencesLoaded();return serie;
    }
    function loadPreferences(id,done){
        if(!preferencesEnabled || state!=='ready' && !accessToken){done(null);return;}
        api('/tv/v1/preferences',id>0 ? {anilist_id:id} : {},12000,function(status,value){done(status===200 ? acceptPreferences(value,id) : null);});
    }
    // Une préférence absente de l'engine garde son défaut : la lecture n'attend jamais l'écriture.
    function savePreferences(patch,done){
        // Sans gateway à jour, le choix vaut pour la séance : on le garde en mémoire, sans écrire.
        var id=patch.anilist_id || 0;
        if(id>0){var current=seriesPreferences[String(id)] || {langue:'vo',langue_choisie:false,lecteur:null},next={langue:current.langue,langue_choisie:current.langue_choisie,lecteur:current.lecteur};
            if(patch.langue){next.langue=patch.langue;next.langue_choisie=true;}if(patch.hasOwnProperty('lecteur'))next.lecteur=patch.lecteur;
            var copy={};Object.keys(seriesPreferences).forEach(function(k){copy[k]=seriesPreferences[k];});copy[String(id)]=next;seriesPreferences=copy;}
        if(patch.hasOwnProperty('suivant_auto') || patch.hasOwnProperty('son_bandes_annonces')){var g={suivant_auto:preferences.suivant_auto,son_bandes_annonces:preferences.son_bandes_annonces};if(patch.hasOwnProperty('suivant_auto'))g.suivant_auto=patch.suivant_auto;if(patch.hasOwnProperty('son_bandes_annonces'))g.son_bandes_annonces=patch.son_bandes_annonces;preferences=g;}
        if(!preferencesEnabled){if(done)done(false);return;}
        api('/tv/v1/preferences-update',patch,12000,function(status,value){if(status===200 && value && value.global)acceptPreferences(value,id);if(done)done(status===200);});
    }
    function mediaUrl(path,kind) {
        var pattern=kind==='trailer' ? /^\/tv\/v1\/preview-media\/[a-f0-9]{64}$/ : kind==='artwork' ? /^\/tv\/v1\/artwork-media\/[a-f0-9]{64}$/ : /^\/tv\/v1\/episode-media\/[a-f0-9]{64}$/;
        return pattern.test(path || '') ? apiOrigin+path : '';
    }
    function inspectEpisode(path,done) {
        var url=mediaUrl(path,'episode');
        if(!url){done(0,null);return;}
        request(url,null,'',8000,done,'HEAD');
    }
    Timer { interval: 1000; repeat: true; running: true; onTriggered: {
        var active=session.requests.slice();
        for(var i=0;i<active.length;i++) if(Date.now()>=active[i].deadline) {
            active[i].finish(0,null); active[i].xhr.abort();
        }
    } }
    Timer { interval: 30000; repeat: true; running: session.state==='ready'; onTriggered: session.withAccess(function(ok){}) }
    Component.onDestruction: {
        var active=requests.slice(); requests=[];
        for(var i=0;i<active.length;i++) { active[i].xhr.onreadystatechange=function(){}; active[i].xhr.abort(); }
    }
}
