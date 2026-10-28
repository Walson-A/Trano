# Atlas TV : le lecteur revu est publié

Walson demande d'intégrer à la vraie application le lecteur et le sélecteur
d'épisodes qu'il vient d'apprécier. La release **`hero-player-914ca56735ce`**
est publiée sur le service permanent et le Devialet a accepté son lancement.
Les 26 ressources utilisées ont été servies, dont les nouveaux composants.
Cela ne confirme pas encore leur rendu, la lecture native ou la réception de Retour
par la télécommande ; la vérification visuelle de Walson reste attendue.

[Publication et téléchargements](2026-10-29-atlas-tv-player-live/deployment.json),
[acceptation SDK](2026-10-29-atlas-tv-player-live/native-launch.json),
[empreintes des 28 fichiers](2026-10-29-atlas-tv-player-live/release.json).

## Raccordement

Le paquet `hero/` utilise maintenant la disposition retenue : identité à gauche,
Version/Source/Qualité nommées à droite, timeline large et Épisodes séparé.
Les menus conservent la barre et le titre ; focus et choix confirmé ont des
signes distincts. Le choix courant vient de la réponse backend, pas des exemples
de la proposition. Un unique fichier disponible ne fabrique pas de résolutions.

Les transactions existantes sont conservées : pendant la préparation, l'ancienne
sortie vidéo et sa position restent en place ; une réponse annulée/tardive est
ignorée. La même identité conserve position et intention pause/lecture. Au succès,
le focus retrouve la commande à l'origine du changement. Après erreur vidéo,
Changer de source reste accessible, sans imposer de quitter l'épisode.

Le sélecteur consomme les épisodes et leurs compléments par identité AniList.
Titre et durée sont réels et facultatifs ; l'épisode joué est distinct de celui
ciblé. La liste s'ouvre sur l'épisode actuel, propose un raccourci pour y revenir,
et conserve les pages de 40 pour les longues saisons. Parcourir une autre saison
ne remplace pas la lecture. Aucun numéro visible n'est converti en URL fournisseur.

Les vignettes utilisent l'extension livrée par la conversation backend dans
`c43ffce04c413a14e64ee161e96b9b541fbe5af9` :
`POST /tv/v1/artworks {anilist_id,kind:"episode",episode}`. Le cache QML vérifie
identité, numéro, kind, expiration et chemin média fermé. Deux préparations
d'images simultanées, mémoire bornée et repli sans fausse vignette ; aucune URL
Kitsu n'est transmise au composant Image. Les demandes de métadonnées et d'images
tardives ne changent pas le focus. Le transport réel des quatre images de référence
a été vérifié par la conversation backend, pas par un nouveau test de décodage ici.

Les surfaces des menus sont translucides. Elles ne capturent pas la sortie vidéo
native pour appliquer le flou du banc sur image fixe : il n'y a ni second décodeur
ni promesse de flou vidéo natif déduite des captures desktop.

## Retour

1. Pendant une préparation : annuler, conserver la lecture et retrouver les choix.
2. Dans les saisons : revenir à la liste ; dans un menu : fermer ce menu.
3. Pendant un déplacement sur la timeline : annuler la position proposée.
4. Barre visible : la masquer sans fermer le lecteur, y compris en pause.
5. Vidéo seule : revenir à la fiche ou au contexte précédent.

Les répétitions automatiques de la touche Retour sont consommées pour éviter
qu'un maintien ne traverse plusieurs niveaux. Une première flèche lorsque la
barre est masquée la réaffiche sans appliquer un seek. Le volume reste matériel.

## Vérification du composant intégré

Le [banc de l'hôte complet](2026-10-29-atlas-tv-player-live/verification.json)
passe avec API et décodeur explicitement simulés. Il couvre notamment la pause,
le seek proposé/confirmé/annulé, Retour en pause, le retour du focus après changement,
les choix stricts, l'annulation et la réponse tardive, les erreurs et réessais,
la progression par session, la navigation d'épisodes/saisons et le rejet d'une
image rattachée au mauvais numéro. Les régressions accueil/recherche/profil/fiche
restent dans cette suite. Le test de session Qt HTTP jetable passe également :
sept requêtes, rotation unique, runtime non fiable rejeté et chemins média fermés.

Captures des composants du vrai paquet, examinées en 1280×720 sur le banc :
[barre](2026-10-29-atlas-tv-player-live/episode-controls.png),
[timeline](2026-10-29-atlas-tv-player-live/player-timeline.png),
[qualité](2026-10-29-atlas-tv-player-live/player-quality.png),
[source](2026-10-29-atlas-tv-player-live/player-source.png),
[version](2026-10-29-atlas-tv-player-live/player-version.png),
[épisodes](2026-10-29-atlas-tv-player-live/player-episodes.png),
[source après erreur](2026-10-29-atlas-tv-player-live/player-error-source.png).
Les images d'épisodes du banc sont les actifs publics du lot de conception.
L'image de fond et les résolutions de ce banc restent des entrées de test.

```powershell
python -B packages/lan/scripts/test-atlas-tv-live.py --qt-path .local/atlas-tv-qml-runtime --snapshot C:/Users/Walson/Documents/Atlas/LifeOS/src/banc/animes/accueil.json --assets .local/atlas-tv-hero-20261026 --regular .local/atlas-tv-home-20261026/DMSans-400.ttf --bold .local/atlas-tv-home-20261026/DMSans-700.ttf --detail-assets .local/atlas-tv-detail-assets-20261028 --episode-fixture docs/research/2026-10-28-atlas-tv-episode-selector/fixture.json --video-frame .local/atlas-tv-live-20261028/player-frame.jpg --evidence .local/atlas-tv-integrated-check
python -B packages/lan/scripts/test-atlas-tv-session.py --qt-path .local/atlas-tv-qml-runtime
```

## Publication reproductible et ménage

`package-atlas-tv-hero.py` embarque trois composants supplémentaires et les
cinq icônes dans le composant Icon existant : 28 fichiers, 289438 octets, sans
fixture, runtime privé, compte ou URL média. Le nom de release dérive des hashes.

`publish-atlas-tv-ui.py` est exécuté sur le gateway Linux, avec racine et versions
attendues explicites. Il vérifie le SHA de `server.mjs`, prend `.upgrade.lock`,
valide les fichiers avec le vrai `loadRelease`, compare la configuration de
départ, sauvegarde celle-ci en mode 0600 puis remplace atomiquement le JSON.
Seuls `releaseId`, `bundleDir` et `files` changent. Il redémarre uniquement
`atlas-tv-launch` et contrôle la disponibilité avec le credential existant en
mémoire ; un échec restaure la configuration précédente. Le refus d'une mauvaise
release de départ a été vérifié sans modifier la configuration.

Une première publication `hero-player-1b2999ddcca5` a précédé le dernier ajustement
de focus/saisons ; la release finale est `hero-player-914ca56735ce`. Les deux bascules
ont seulement redémarré le service de lancement. `server.mjs` garde le SHA
`837a0035d128ae1a918e796c2d63bd828914fa82e9408f44d4d69a2ac057d7b7` ; réseau,
authentification, proxy et engine ne sont pas modifiés par la publication UI.
La relance finale n'a lancé aucun épisode ni écrit de progression de lecture.

Racine serveur : `/home/trano/.local/share/atlas-tv/scene-b77800f/`.
Le paquet actif et les anciennes releases/configurations privées y restent
pour retour arrière. Les scripts de publication transférés ont été retirés.
Les exports locaux intermédiaires sont nettoyés après conservation des preuves.
Le worktree et la branche restent actifs pour la réception native ; les deux
travaux non suivis préexistants (`devialet/tv/`, `preview-atlas-tv-home.py`)
ne sont ni modifiés ni livrés par ce lot.
