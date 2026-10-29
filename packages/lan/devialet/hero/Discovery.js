.pragma library
var genres=[['Action','Action'],['Adventure','Aventure'],['Comedy','Comédie'],['Drama','Drame'],['Fantasy','Fantasy'],['Horror','Horreur'],['Mystery','Mystère'],['Romance','Romance'],['Sci-Fi','Science-fiction'],['Slice of Life','Tranche de vie'],['Sports','Sport'],['Supernatural','Surnaturel'],['Thriller','Thriller'],['Psychological','Psychologique'],['Mecha','Mecha'],['Music','Musique'],['Mahou Shoujo','Magical girl'],['Ecchi','Ecchi']];
var formats=[['','Tous les formats'],['TV','Séries'],['MOVIE','Films'],['TV_SHORT','Séries courtes'],['OVA','OVA'],['ONA','ONA'],['SPECIAL','Épisodes spéciaux'],['MUSIC','Clips musicaux']];
var statuses=[['','Toutes les diffusions'],['RELEASING','En cours'],['FINISHED','Terminés'],['NOT_YET_RELEASED','À venir'],['HIATUS','En pause'],['CANCELLED','Annulés']];
var sorts=[['','Automatique'],['tendances','Tendances'],['popularite','Popularité'],['notes','Mieux notés']];
function label(list,value){for(var i=0;i<list.length;i++)if(list[i][0]===value)return list[i][1];return '';}
function years(){var a=[['','Toutes les années']];for(var y=new Date().getFullYear()+1;y>=1940;y--)a.push([String(y),String(y)]);return a;}
function defaults(){return {genres:[],format:'',annee:'',statut:'',tri:''};}
function clone(value){return JSON.parse(JSON.stringify(value));}
function count(v){return v.genres.length+(v.format?1:0)+(v.annee?1:0)+(v.statut?1:0)+(v.tri?1:0);}
// Closed TV catalog contract. Labels never become API values.
function body(query,f,page){var r={page:page};if(query.trim())r.q=query.trim();if(f.genres.length)r.genres=f.genres.slice();if(f.format)r.format=f.format;if(f.annee)r.annee=Number(f.annee);if(f.statut)r.statut=f.statut;if(f.tri)r.tri=f.tri;return r;}
function plain(value){return String(value || '').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();}
function meta(c){if(!c)return '';var a=[],names={TV:'Série',MOVIE:'Film',TV_SHORT:'Série courte',SPECIAL:'Épisode spécial',OVA:'OVA',ONA:'ONA',MUSIC:'Clip musical'};if(c.annee)a.push(c.annee);if(c.format)a.push(names[c.format] || c.format);if(c.format==='MOVIE'){if(c.duree)a.push(c.duree+' min');}else if(c.episodes)a.push(c.episodes+(c.episodes>1 ? ' épisodes' : ' épisode'));return a.join(' · ');}
