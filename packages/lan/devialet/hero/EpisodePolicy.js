.pragma library

function future(row) {return !!(row && row.diffusion && row.diffusion.etat==='a_venir');}
function seriesLabel(card){var code=card && (card.diffusion && card.diffusion.statut || card.statut),labels={FINISHED:'Diffusion terminée',RELEASING:'En diffusion',NOT_YET_RELEASED:'À venir',HIATUS:'Diffusion en pause',CANCELLED:'Diffusion annulée'};return labels[code] || '';}
function blocked(row) {return !!row && (future(row) || row.lancable===false);}
function due(row,now){var date=row && row.diffusion && row.diffusion.date;if(!future(row) || !date || date.precision!=='instant')return false;var stamp=Date.parse(date.iso);return isFinite(stamp) && stamp<=(typeof now==='number' ? now : Date.now());}
function dateLabel(date) {
    if(!date)return 'Date à confirmer';
    if(typeof date.libelle==='string' && date.libelle.length && date.libelle.length<=160)return date.libelle;
    // Preserve the explicit offset when no owner-localised label is supplied.
    // Never reinterpret an airing instant in the set-top box's unknown timezone.
    var m=/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/.exec(date.iso || '');
    if(!m || +m[2]<1 || +m[2]>12 || +m[3]<1 || +m[3]>31)return 'Date à confirmer';
    return m[3]+'/'+m[2]+'/'+m[1]+(m[4] ? ' à '+m[4]+'h'+m[5]+' '+(m[6]==='Z' ? 'UTC' : 'UTC'+m[6]) : '');
}
function notice(row,french) {
    if(!row)return '';
    if(future(row))return 'À venir · '+dateLabel(row.diffusion.date);
    if(row.diffusion && row.diffusion.etat==='hors_plage')return 'Épisode hors de cette saison';
    if(row.lancable===false)return 'Lecture indisponible';
    var voice=french ? 'VF' : 'VOSTFR',availability=row.disponibilite && row.disponibilite[french ? 'vf' : 'vo'];
    if(row.diffusion && row.diffusion.etat==='inconnu')return 'Diffusion à confirmer';
    if(availability && availability.etat==='absent')return voice+' indisponible chez les sources connues';
    if(availability && availability.etat==='inconnu')return 'Disponibilité '+voice+' à confirmer';
    return '';
}
function count(data,compact) {
    if(!data)return 'Épisodes';
    var info=data.diffusion || data;
    var announced=Number.isInteger(info.total_annonce) && info.total_annonce>=0 ? info.total_annonce : info.total_annonce===null ? null : Number.isInteger(data.total) && data.total>=0 ? data.total : null;
    var aired=Number.isInteger(info.diffuses) && info.diffuses>=0 ? info.diffuses : null;
    if(aired!==null && announced!==null && aired>announced)announced=null;
    if(aired!==null && announced!==null)return compact ? aired+'/'+announced+' diffusés' : aired+' épisode'+(aired===1 ? '' : 's')+' sorti'+(aired===1 ? '' : 's')+' sur '+announced+' annoncé'+(announced===1 ? '' : 's');
    if(aired!==null)return aired+' épisode'+(aired===1 ? '' : 's')+' diffusé'+(aired===1 ? '' : 's');
    if(announced!==null)return announced+' épisode'+(announced===1 ? '' : 's')+' annoncé'+(announced===1 ? '' : 's');
    return compact ? 'Total à confirmer' : 'Nombre d’épisodes à confirmer';
}
function merge(base,extra){
    var row={};Object.keys(base).forEach(function(k){row[k]=base[k];});
    if(!extra || extra.numero!==base.numero)return row;
    var lessCertain=base.diffusion && base.diffusion.etat!=='inconnu' && (!extra.diffusion || extra.diffusion.etat==='inconnu');
    Object.keys(extra).forEach(function(k){
        if(['numero','vu','franime'].indexOf(k)>=0 || lessCertain && (k==='diffusion' || k==='lancable'))return;
        if(['titre','resume','vignette','duree'].indexOf(k)>=0 && !extra[k])return;
        row[k]=extra[k];
    });return row;
}
