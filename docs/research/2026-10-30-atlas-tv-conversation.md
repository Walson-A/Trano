# Oby → Atlas TV : consommateur QML

Ce lot raccorde la demande humaine de lancement depuis une conversation au
lecteur TV existant. Le backend de référence est le commit
`39cfb1c3e1af9c88e90730b78a0f0c6a8e902917`, contrat dans
`Atlas/engine/docs/atlas-tv.md`, section Lancement depuis une conversation Oby.
Le correctif des bandes-annonces du commit `8efcdd2` est conservé.

## Présence et réception

`live.qml` instancie TvConversationLaunch en primary. Il s’agit de l’application
média livrée par le lancement normal `/tv/v1/app/launches`, pas d’un diagnostic.
Le récepteur exige une session prête et la capability `conversation_launch`
strictement égale à true. Aucun champ target absent du runtime n’est exigé.
L’engine reste l’autorité du rôle : un refus 403 arrête la réception.

Un seul POST `/tv/v1/launch-intents/next {}` est en vol, timeout client 30 s
pour un poll serveur d’au plus 20 s. Une réponse vide programme le suivant après
250 ms ; une erreur réseau attend 2 s. Les demandes reçues pendant une intention
active ne provoquent aucun second lancement. Les 32 identifiants récents sont
retenus au plus dix minutes en mémoire. Rien n’est persisté après fermeture.

L’intention exige UUID canonique, identité AniList Int32 positive, épisode
1–100000, VO/VF explicite, expiration entière et TTL 1–90000 ms. Le délai client
est relatif au TTL, sans comparaison à l’heure absolue du serveur. Une
redélivrance ne renouvelle pas ce délai.

## Réception confirmée, lancement puis observation

L’ACK accepted doit être confirmé pour la même demande, identité, langue et
épisode avant tout dispatch. Un ACK perdu peut être réessayé ; le dispatch
ne l’est jamais. Un reçu déjà terminal ne relance pas une ancienne demande.
Une fiche canonique est résolue pour le titre exact, puis le parcours existant
prépare le playback et ouvre EpisodePlayer. Une lecture déjà présente passe
par le même changement d’épisode ; une demande distante impose la lecture,
même si l’ancien épisode était en pause. Les bandes-annonces sont arrêtées
avant la préparation. Les cibles futures conservent leur refus de diffusion.

Une cible identique déjà en lecture n’est pas redémarrée : le récepteur observe
le playback existant. L’ACK playing exige vidéo présente, PlayingState, fin du
seek de reprise et plusieurs positions réellement croissantes sur l’identité
de playback corrélée. Un grand saut réinitialise cette observation. Le fait
d’avoir résolu une URL ou d’avoir affiché le chargement ne suffit pas.

Les interactions à la télécommande annulent une intention encore en
préparation. Retour, changement local et TTL invalident les callbacks tardifs
de fiche et de flux. Un ancien épisode reste en place si seule sa relève est
annulée. Les échecs remontent uniquement les codes fermés du contrat, sans
URL ni message libre. Une confirmation playing décrit la lecture observée à
cet instant, pas une garantie permanente après une autre action de l’utilisateur.

## Renouvellement de connexion

`TvSession.conversationApi` accepte exclusivement next et ACK avec UUID fermé.
Ces routes idempotentes peuvent être réessayées une fois après un 401 et la
rotation partagée des identifiants. Un second 401 ferme la session. Les autres
routes, notamment les mutations de liste/note, gardent leur absence de rejeu.
La demande reste en mémoire pendant une rotation normale. Réappairage,
révocation ou fermeture ne donnent aucune garantie de livraison exactement une fois.

## Vérifications et limites

Les vrais composants QML sont testés dans l’hôte complet, en MP4 et HLS,
avec transport, positions et décodeur simulés. Sont couverts : capability et
primary, poll unique, accepted avant dispatch, ACK perdus, doublons, vidéo
absente, reprise initiale, cible identique, changement depuis une pause,
VO/VF, Retour, TTL, réponse tardive, mauvaise identité, épisode futur, erreur
native simulée et enveloppe invalide. Le parcours de bande-annonce reste testé.

Un serveur HTTP local jetable teste séparément le vrai TvSession : deux 401
concurrents donnent une rotation unique, next/ACK sont réessayés une fois,
un second refus ferme la session et les mutations ordinaires ne sont pas rejouées.
Tous les identifiants de ces tests sont fictifs ; aucun épisode personnel n’est
lancé. Les captures du lecteur et du fond de fiche sont revues aux dimensions
1280×720 ; ce lot n’en modifie pas la composition.

La publication et la relance normale ne soumettent aucune intention de lecture.
La présence primary doit être vérifiée séparément en lecture seule après
publication. **Un récepteur en ligne ne prouve pas un lancement réel de bout en
bout** : cette réception nécessite une commande voulue par l’utilisateur.
L’application doit être ouverte et connectée ; le poll ne réveille ni ne lance
l’application après arrêt, reboot ou ouverture d’une autre application.

Les preuves sont dans `2026-10-30-atlas-tv-conversation/`.

## Publication et présence réelle

**hero-conversation-3493b637e5cb**, 39 fichiers et 399067 octets, est publié
depuis `bc9bb56`, poussé sur `feat/local-network`. Le prévol confirme l’engine
de référence et le gateway au SHA256
`3fe9b6eacd5baac82f110448439261962d7f2ff2f9b1eb389ed5c5cd39ea95c4`.
La publication atomique remplace hero-trailer-root-2f6ddaaf5671, vérifie les
empreintes exactes et ne redémarre pas l’engine. Aucun serveur n’est modifié.

Le lancement SDK `08241dec712f563dce6b7fe9ec30b4e1` est accepté. Le Player
demande 36 assets, dont TvConversationLaunch, TvSession et EpisodePlayer.
La lecture owner du statut confirme **primary online=true, request=null**.
Cela prouve une présence admise du nouveau récepteur auprès de l’engine,
au-delà du téléchargement du paquet. Aucune intention n’a été soumise et
aucun épisode réel n’a été lancé pour cette vérification.

Le chat backend confirme indépendamment l’enregistrement des deux outils,
un appel réel readonly de `get_atlas_tv_launch_status` avec online=true et
request=null, les refus 401 sans authentification et le refus 400 d’un corps
owner vide. Aucun lancement valide n’est soumis par ce contrôle.
[Reçu de cette vérification](2026-10-30-atlas-tv-conversation/backend-verification.json).

Voir [publication](2026-10-30-atlas-tv-conversation/publication.json),
[paquet](2026-10-30-atlas-tv-conversation/package.json),
[reçu SDK](2026-10-30-atlas-tv-conversation/launch.json) et
[présence en lecture seule](2026-10-30-atlas-tv-conversation/receiver-status.json).
La réception physique des bandes-annonces reste distincte et non confirmée
dans ce lot ; aucune nouvelle réussite d’image n’est déduite de ce statut.
