.pragma library

function errorCode(value){return value && value.error && typeof value.error.code==='string' ? value.error.code : '';}
function busy(status,value){return status===429 || ['anilist_busy','anilist_rate_limited','upstream_rate_limited'].indexOf(errorCode(value))>=0;}
function retrySeconds(status,value){var seconds=value && value.error && value.error.details && value.error.details.retry_after;return busy(status,value) && typeof seconds==='number' && isFinite(seconds) && seconds>0 && seconds<=300 ? Math.ceil(seconds) : 0;}
function message(status,value,fallback){
    if(busy(status,value))return 'Le service est très sollicité. Réessaie dans un instant.';
    if(errorCode(value)==='airing_unavailable')return 'Le calendrier est momentanément indisponible.';
    if(status===0 || status===504)return 'Le chargement n’a pas abouti. Tu peux réessayer.';
    return fallback;
}
