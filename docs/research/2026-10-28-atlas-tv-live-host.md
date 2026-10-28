# Héros Atlas TV : raccordement au serveur

## État du 28 octobre

`hero/live.qml` consomme le contrat média préparé par la conversation backend
Atlas. `player.qml` reste le banc visuel, avec entrées explicites. Les tests
locaux Qt 5.15.2 passent. Le paquet `0f61f46` a ensuite été publié et lancé
sur le Devialet depuis le service permanent ; Walson confirme le héros et les
animés réels. Le lancement iPhone PC éteint reste à tester : le bouton manque
encore sur son build installé, et le build natif est prévu avec Carte.

Publication vérifiée : service `atlas-tv-launch`, release `hero-0f61f46`,
vingt fichiers et quatre capacités actives, même listener 3016 et origine
`https://tranoserver.taila81674.ts.net:10000`. `server.mjs` et les autres ports
n'ont pas été changés par ce déploiement de bundle. Le paquet est dans
`/home/trano/.local/share/atlas-tv/scene-b77800f/hero-0f61f46`, avec sauvegarde
privée `config-before-hero-0f61f46.json` et ancien bundle conservés pour retour
arrière. SDK accepté puis dix-sept fichiers demandés, dont lecteurs, polices
et SVG ; les téléchargements seuls n'étaient pas présentés comme du rendu.
La confirmation de Walson constitue la preuve de l'affichage.

Le backend signale encore `no_verified_source` pour l'épisode de référence
(DNS Voiranime serveur local, refus conservé). Aucune nouvelle lecture
d'épisode native n'est certifiée par ce lot. La bande-annonce de référence
a été transportée par le backend, sans nouvelle confirmation audio/vidéo de
Walson dans le héros pour ce lancement.

Retour humain : sourdine affichée mais son audible, plusieurs images absentes,
beaucoup de previews indisponibles ; design encore à améliorer. Correctif QML :
volume nul en plus de `muted`, bannière en erreur repliée sur l'affiche du même
animé, suppression de l'ancien visuel si les deux échouent. Les essais locaux
injectent une bannière absente et vérifient le gain 0/0,35 selon l'icône.
Le résultat sonore natif reste à confirmer après relance.

Deux illustrations exactes (AniList 21507 et 5114) répondent 403 avec le
User-Agent Python et 200 JPEG avec `AtlasTV/1.0`, sur le serveur ; le même
GET AtlasTV fonctionne sur PC. Les neuf cartes observées ont leurs identifiants
de trailer et leurs deux URL d'illustration : les absences ne sont donc pas
simplement des champs vides. Qt interdit l'en-tête User-Agent dans son XHR
QML (source publique locale `qqmlxmlhttprequest.cpp`, méthode
`method_setRequestHeader`). Un transport artwork fermé côté backend est demandé
à la conversation propriétaire ; le fallback seul ne garantit pas de résoudre
tous les refus CDN. Pas de contournement natif ou d'accès administrateur.

Le correctif `0481187` est ensuite publié (`hero-0481187`, vingt fichiers) et
relancé via le service permanent. Le résultat sonore humain reste attendu.

## Transport d'illustrations préparé

`ArtworkCache.qml` consomme le contrat backend `POST /tv/v1/artworks` avec
`{anilist_id,kind:banner|poster}`. Le résultat doit correspondre aux deux
identifiants et fournir un chemin fermé `/tv/v1/artwork-media/:ticket`, résolu
sur la seule origine du service. Il n'envoie pas d'URL de CDN arbitraire.
La route ne sera appelée que si `runtime.json.capabilities.artwork` est vrai ;
un ancien gateway conserve donc le parcours précédent.

Le client prépare deux images simultanément, donne la priorité au titre
sélectionné et chauffe les six premières cartes de la rangée. Requêtes dédupliquées,
file limitée à 64, map à 64 titres, métadonnées à 128 entrées. Cache de ticket
jusqu'à trente secondes avant expiration ; en cas de refus, aucune boucle
(dix secondes de pause sur 429, sinon une minute). Image native/affiche restent
des replis. Un retour tardif ne change que l'image de sa propre identité.
Le serveur reste propriétaire des URL canoniques, du cache et des contrôles CDN.

Les tests du vrai hôte QML couvrent aussi la file, la capacité obligatoire,
la déduplication et le refus d'une identité de réponse différente. Le transport
artwork est préparé côté frontend ; son déploiement backend et son rendu TV
ne sont pas encore certifiés par cette preuve locale.

## Parcours et droits

Le téléphone prépare `/tv/v1/app/launches` et transmet la commande SDK au Player.
Le Player télécharge `runtime.json` à côté du manifeste. `TvSession.qml` exige
la même origine HTTPS que le paquet, consomme une fois `activation.code` sur
`/tv/v1/session/activate`, puis conserve les seuls jetons TV en mémoire.
Aucune clé engine, aucun JWT propriétaire ou compte dans le paquet. Le
renouvellement via `/tv/v1/session/refresh` est unique pour les appels concurrents.
Une réponse de rotation perdue impose un nouveau lancement depuis le téléphone,
sans réutiliser automatiquement le refresh consommé.

- `catalog/home` et `home-extras` : DTO Atlas existants, sans catalogue embarqué.
- `previews` : identité AniList sélectionnée ; identité YouTube retournée
  vérifiée ; chemin fermé `/tv/v1/preview-media/:ticket` de la même origine.
  Une réponse tardive ne change pas la sélection. Refus : image conservée,
  nouvel essai espacé d'une minute. Cache mémoire borné à seize entrées.
- `playbacks` : numéro canonique `a_lancer.numero`, jamais la coordonnée
  fournisseur `a_lancer.episode`. Sans reprise, une carte AniList commence
  à l'épisode 1. Franime sans identité AniList reste explicitement indisponible.
  Le lecteur accepte `stream.path` sous `/tv/v1/episode-media/:ticket`, aucune
  URL fournisseur arbitraire. Busy/erreur ne relance pas automatiquement le SDK.
- `playbacks/:id/progress` : séquence croissante, uniquement après position
  vidéo réelle ; ensuite toutes les quinze secondes et après pause, seek,
  arrêt, fin ou erreur. Le backend décide de la persistance et du seuil à 80 %.
  Les tests de ce lot n'envoient rien au compte AniList.

Le lecteur applique la reprise temporelle et affiche titre, temps courant,
durée et barre. OK : pause/reprise ; Gauche/Droite : 10 secondes ; Retour :
héros. Contrôles masqués après quatre secondes de lecture. Fin et erreur
explicites. La fiche complète, les pistes/sous-titres et le choix manuel du
lecteur restent hors de ce lot. Une résolution peut durer plusieurs dizaines
de secondes ; un refus YouTube ou hébergeur reste possible.

## Distribution

`package-atlas-tv-hero.py` fabrique un dossier neuf, sans réseau ni secret.
Les deux polices sont des entrées explicites ; leurs licences sont incluses.
Les quatre SVG existants sont aplatis en `icon-*.svg`, avec adaptation de leur
seule référence dans la copie de `Icon.qml`. Le manifeste de sortie vise
`live.qml`, avec `qmldir` et tous les composants. Pas de snapshot ni vidéo du
banc. Le gateway conserve son allowlist plate.

Le bootstrap expire après dix minutes. Le lecteur et le composant de preview
sont donc chargés au démarrage et gardés en mémoire pendant un épisode.
Les tickets média et jetons TV ont leur propre durée. Ce lot ne change pas
la destruction du runtime par Netflix et ne promet aucun relais permanent.

## Vérifications et revue

- `test-atlas-tv-session.py` : vrai contrôleur QML et HTTP jetable, faux jetons ;
  home authentifié, une seule rotation pour deux appels concurrents, refus d'un
  runtime HTTP avant activation, chemins média fermés.
- `test-atlas-tv-live.py` : vrais composants/hôte/lecteur, API et décodeur
  explicitement simulés ; épisode canonique 13/VF, reprise 2:00, pause,
  avance 2:10, retour au héros, séquences et réponse tardive de bande-annonce.
  Vérification supplémentaire : mute impose le gain nul et une bannière absente
  charge l'affiche du même titre.
- Banc historique : huit captures, reprise, mouvement interrompable et retour
  à la première carte sans appui supplémentaire. `git diff --check`.

Captures examinées : [contrôles](2026-10-28-atlas-tv-live/episode-controls.png),
[héros après Retour](2026-10-28-atlas-tv-live/hero-return.png),
[résultats](2026-10-28-atlas-tv-live/verification.json). Le noir derrière les
contrôles est le décodeur simulé, pas une preuve de vidéo native. La composition
et le focus du héros sont conservés ; le rendu n'est pas déclaré final.

```powershell
python -B packages/lan/scripts/test-atlas-tv-session.py --qt-path <PyQt5-local>
python -B packages/lan/scripts/test-atlas-tv-live.py --qt-path <PyQt5-local> --snapshot <accueil-PC.json> --assets <images> --regular <regular.ttf> --bold <bold.ttf> --evidence <dossier-neuf>
python -B packages/lan/scripts/package-atlas-tv-hero.py --output <paquet-neuf> --regular <regular.ttf> --bold <bold.ttf>
```

## Espace disque

C: a atteint zéro octet libre. Une seule copie dérivée de notre recherche,
`.local/research/native-20261022/userland-inputs/bank1-rootfs.bin`, a été retirée
après comparaison intégrale à l'image originale conservée
`image-fbx7hd_bank1_1.5.26` : offset 6 029 312, longueur 131 276 800,
SHA-256 `d7f0f135f417a1099f01a39e03188d2f08a14184f18e68b853b0b97d4a5642ef`.
Elle se reconstruit par extraction de cette plage. Original et preuves conservés ;
aucun fichier d'une autre conversation supprimé par ce travail.
