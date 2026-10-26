# Atlas TV — héros adapté du PC

## Contrat limité

Walson demande de repartir du héros animé d’Atlas PC, plutôt que de poursuivre
les premiers accueils TV redessinés. La référence lue et examinée est le vrai
`Hero.tsx` avec `BandeAnnonce.tsx`, `animes.css` et le banc `mainAnimes.tsx`.
Les données de démonstration sont un instantané explicite du banc PC, pas une
lecture du catalogue actuel de Walson.

Cette première adaptation QML conserve : grand visuel, dégradés de lisibilité,
titre et métadonnées à gauche, résumé, Lecture/Reprendre et Plus d’infos.
Les surfaces translucides sont limitées aux commandes. Les captures ont amené
à corriger l’interligne des titres longs (qui approchaient les onglets), la
jonction du visuel avec le fond et les noms sur deux lignes dans la liste.
La navigation latérale des anciens brouillons n’est pas reprise.

La liste sélectionnée pilote le héros. À reprendre est le mode initial quand
la rangée existe ; sinon À la une utilise la liste `hero` ordonnée du backend.
Le frontend n’invente ni classement ni nouvelle sélection aléatoire. Il n’y a
pas de carrousel automatique qui déplace le choix pendant la navigation.

Les previews sont des **bandes-annonces**, jamais des extraits d’épisode. Après
0,9 seconde de sélection (réduit après le retour du 27 octobre), le composant consomme une source correspondant à
l’identifiant de bande-annonce du DTO. Le visuel reste jusqu’à ce que le lecteur
annonce vidéo présente, lecture active et position supérieure à 400 ms. Changer
d’animé arrête et vide la source précédente. Une absence de source, une erreur
ou une fin de lecture laisse l’image. Les aperçus sont muets par défaut avec
une commande son accessible. La préférence sonore n’est pas encore persistée.

## Sources et frontière backend

`packages/lan/devialet/hero/` contient les composants de ce chantier, séparés des
anciens brouillons non validés de `devialet/tv/` :

- `Hero.qml` : composition, sélection, navigation et actions.
- `HeroButton.qml` : contrôle avec fond échantillonné/flouté et focus visible.
- `Trailer.qml` : lecteur natif et `VideoOutput`, chargé seulement si activé.
- `desktop.qml` : montage du banc PC sans vidéo.
- `player.qml`, `manifest.json`, `qmldir` : montage SDK de développement.

Entrées : `homeData` (DTO anime PC), `artworkMap` optionnel, `trailerSources`
(identifiant de bande-annonce → URL temporaire lisible), police et activation
de preview. `playRequested(media,target)` conserve la cible `a_lancer` exacte,
ou les coordonnées Franime existantes ; aucun rapprochement de titre n’est fait.
`trailerRequested(trailerKey)` permet au transport de résoudre une source
absente. Aucun JWT propriétaire ni clé engine ne doit être incorporé au QML.

Le montage Player charge un `session.json` du banc. **Ce fichier n’est pas une
route backend livrée.** Le service Atlas TV permanent n’a pas été modifié.
Lecture d’épisode et vraie fiche restent des actions à raccorder : le banc
montre une information locale minimale et signale explicitement l’absence de
raccordement de lecture plutôt que de simuler un épisode lancé.

## Bancs et vérifications

`preview-atlas-tv-hero.py` monte les vrais composants avec un instantané et des
assets explicitement fournis. Qt Windows 5.15.2 : six captures, modes reprise/
à la une, changement de sélection, titre long, informations/retour, 1080p et
absence de reprise. La cible de reprise 13/VF est vérifiée sans lancer un flux.
Le contrôle QML ne relève ni erreur de référence/type ni boucle de bindings.
Captures et mesures : dossier [`2026-10-26-atlas-tv-hero/`](2026-10-26-atlas-tv-hero/).

### Corrections après revue TV du 27 octobre

Walson trouve la base « belle » / « pas mal », avec de fortes améliorations
visuelles encore attendues. Il signale les previews longues/absentes et le retour
de droite à gauche nécessitant un appui supplémentaire pour recaler la liste.

Le banc reproduit le second défaut : sélection 0 mais `contentX=198`,
`originX=0`. La plage de suivi automatique du ListView est retirée ; le contrôle
synchronise explicitement index et position, avec alignement au début pour la
première carte et maintien en vue des suivantes. La navigation clavier propre
au ListView est désactivée, puisque le FocusScope la possède. Le contrôle ajouté
parcourt jusqu’à la dernière carte puis revient à la première : `contentX=0`,
et un appui Gauche supplémentaire ne le modifie pas. Huit captures et les
contrôles antérieurs passent ; revue des captures du retour au début effectuée.
Cette correction n’est pas encore confirmée physiquement sur la TV.

La preview de Re:ZERO était la seule source fournie au banc. Les autres œuvres
signalaient `trailerRequested` sans résolution backend raccordée : l’absence de
vidéo n’était pas seulement une lenteur. Le délai est réduit de 1,8 à 0,9 s,
avec états « Chargement de la bande-annonce… » et « Bande-annonce indisponible ».
Un chargement sans observation de lecture est borné à dix secondes, puis le
visuel reste affiché. Les nouvelles branches de statut ne sont pas validées par
une lecture vidéo dans le banc Windows, qui désactive toujours QtMultimedia.
Le raccordement effectif de toutes les bandes-annonces reste du travail backend,
et cette priorité lui a été transmise. La régression de défilement et ses mesures
sont conservées dans `2026-10-27-atlas-tv-hero-fixes/`.

Le plugin multimédia du runtime PyQt Windows manque de sa dépendance
`Qt5MultimediaQuick.dll`. Le banc désactive donc explicitement le Loader vidéo :
les captures PC valident la composition et la navigation, pas une vidéo jouée
sur Windows. La lecture native est testée séparément sur le Devialet.

`try-atlas-tv-hero.py` sert une liste fermée de fichiers au seul Player désigné,
avec réponses Range pour les MP4, durée bornée et arrêt du QML à l’échéance.
Il exige `--launch`, une IP LAN explicite, un instantané, les assets/polices et
les vidéos de test. Il ne résout pas les sources et n’accède à aucun compte.
Les mesures enregistrées excluent URL signées et tickets.

Sur le vrai Devialet, les composants, polices et six bannières ont été demandés.
Un passage automatique (`--exercise`) sélectionne Re:ZERO, le quitte puis le
resélectionne. La télémétrie montre la lecture avec audio/vidéo détectés,
l’arrêt sur changement et le redémarrage de la bande-annonce depuis le début,
sans erreur pendant les observations. Seule cette preview 360p est fournie dans
ce banc. Une tentative de préparation de To Your Eternity a rencontré une erreur
HTTP CDN ; aucune vidéo de substitution n’a été attribuée à cet animé.
La question de revue sur la TV a été envoyée à Walson ; le rendu intégré derrière
les textes et l’usage de ce héros ne sont pas encore confirmés par lui.

Exemple PC :

```powershell
python packages/lan/scripts/preview-atlas-tv-hero.py --qt-path <runtime-PyQt5> --snapshot <accueil.json> --assets <dossier-bannieres> --captures <captures> --font <regular.ttf> --font <bold.ttf>
```

Les assets `<AniList-ID>-banner.jpg` proviennent des bannières existantes du PC ;
ils sont des entrées du banc, pas une nouvelle bibliothèque embarquée. Le script
Player prend en plus `--player`, `--bind`, `--regular`, `--bold`, `--evidence`,
`--trailer <YouTube-ID> <fichier.mp4>` et `--launch`.

## Limites de livraison

Ce héros est un prototype de revue. Il ne constitue ni un catalogue vivant,
ni une application installée/autonome, ni une validation esthétique de Walson.
L’affichage vidéo derrière le texte, le focus et le verre doivent encore être
jugés sur la TV. Le test de bande-annonce entier précédent était en 360p ; la
HD et le transport stable depuis le serveur permanent restent ouverts.
L’absence de preview pour une œuvre ne doit jamais lancer un extrait d’épisode
ou présenter un téléchargement comme une lecture confirmée.

Le serveur LAN d’essai est arrêté, le port libéré et les vidéos/résolveurs
temporaires supprimés sur PC et serveur. Les six bannières d’entrée du banc
restent dans `.local/atlas-tv-hero-20261026/` pour les itérations suivantes.
Les captures intermédiaires ont été retirées après conservation des six états
relus et des mesures dans le dossier de revue ci-dessus. Les anciens brouillons
`devialet/tv/` et `preview-atlas-tv-home.py` sont préservés hors de cette livraison.
