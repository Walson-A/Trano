import QtQuick 2.15

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
    property double expiresAt: 0
    property bool refreshing: false
    property var waiters: []
    property var requests: []
    property var home: ({})
    property string state: "connecting"
    property string message: "Connexion à Atlas…"
    signal homeLoaded()
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
            request(apiOrigin+'/tv/v1/session/activate',{code:runtime.activation.code},'',12000,function(code,value) {
                if(code!==200 || !credentials(value)) { fail(); return; }
                loadHome();
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
    function loadHome() {
        api('/tv/v1/catalog/home',{},45000,function(status,value) {
            if(!accessToken) return;
            if(status!==200 || !value || !Array.isArray(value.hero) || !Array.isArray(value.rangees)) {
                state='error'; message='Le catalogue est indisponible. OK pour réessayer.'; return;
            }
            home=value; state='ready'; message=''; homeLoaded();
            if(value.complements_a_charger) api('/tv/v1/catalog/home-extras',{},45000,function(code,complete) {
                if(code===200 && complete && Array.isArray(complete.hero) && Array.isArray(complete.rangees)) home=complete;
            });
        });
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
