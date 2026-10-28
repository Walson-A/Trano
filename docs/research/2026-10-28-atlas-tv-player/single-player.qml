import QtQuick 2.15
import fbx.application 1.0
import "."
Application {
 id:app
 property bool requested:false
 property string message:'Préparation du test vidéo…'
 property bool playing:false
 TvSession {id:session;onHomeLoaded:{
  if(app.requested)return;app.requested=true;
  api('/tv/v1/playbacks',{anilist_id:5630,episode:2,lang:'vf',exclude_readers:[]},110000,function(status,value){
   var url=value && value.stream ? session.mediaUrl(value.stream.path,'episode') : '';
   console.info('ATLAS_TV_SINGLE_RESOLVE',status,!!url);if(status!==200 && value && value.error){console.info('ATLAS_TV_SINGLE_FAILURE',String(value.error.code || '').replace(/[^a-zA-Z0-9_. -]/g,'').slice(0,80));var attempts=value.error.details && value.error.details.attempts || [];for(var i=0;i<Math.min(8,attempts.length);i++)console.info('ATLAS_TV_SINGLE_ATTEMPT',String(attempts[i].source || '').replace(/[^a-zA-Z0-9_. -]/g,'').slice(0,40),String(attempts[i].reader || '').replace(/[^a-zA-Z0-9_. -]/g,'').slice(0,40),String(attempts[i].code || '').replace(/[^a-zA-Z0-9_. -]/g,'').slice(0,40));}
   if(status!==200 || !url){app.message='Épisode indisponible pour cet essai.';return;}
   app.playing=true;player.resumeMs=0;player.play(url);
  });
 }}
 Rectangle {anchors.fill:parent;color:'black'}
 Text {anchors.centerIn:parent;width:1000;text:app.message;horizontalAlignment:Text.AlignHCenter;wrapMode:Text.WordWrap;color:'white';font.pixelSize:30;visible:!app.playing}
 EpisodePlayer {id:player;anchors.fill:parent;visible:app.playing;title:'Test vidéo unique · Eden of the East · Épisode 2 · VF';onClosed:{app.playing=false;app.message='Essai terminé. Aucun suivi de visionnage enregistré.';}}
 Timer {interval:45000;running:player.started;onTriggered:player.close()}
 Component.onCompleted:session.start(Qt.resolvedUrl('runtime.json'))
}
