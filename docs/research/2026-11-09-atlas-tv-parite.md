# Atlas TV au niveau de la version cible — 9 novembre 2026

## Point de départ

L'audit PC / mobile / TV du 9 novembre (artefact « Atlas TV sur trois écrans ») a
classé la TV comme la plus aboutie en interaction, avec des manques précis : fin
d'épisode sèche, préférences non retenues, Reprendre sans barre, épisodes sous le
premier écran de la fiche, synopsis en double, profil pauvre, clavier sans accents,
avance par pas fixes, progression non modifiable, avis jamais montré, mouvements
réduits jamais branchés, flou des boutons jamais mesuré, et du code mort embarqué.
Walson demande que chaque ligne de la matrice soit à « oui » sur la TV, sauf ce que
l'appareil ne permet pas, et laisse le design ouvert.

Ce lot touche le QML (`packages/lan/devialet/hero/`), les bancs, et une ligne du
gateway Atlas (liste blanche des préférences). Il ne lance rien sur le Player et
n'écrit rien dans AniList : tous les essais sont au banc PyQt, faux API et faux
décodeur. Il part de `feat/atlas-tv-versions` (les versions d'une saison, autre
session) pour ne pas se battre sur la fiche, le lecteur et `live.qml`.

## Ce qui change, ligne par ligne

| Ligne de la matrice | Avant | Après |
|---|---|---|
| Carte « Reprendre » | « Épisode N », barre jamais remplie | épisode, barre et « reste N min » depuis `reprise` de `catalog/home` (position *dans* l'épisode, partagée PC / mobile / TV) |
| Recherche | clavier A–Z sans accents | rangée É È Ê À Ç Ô ' - :, recherches récentes au-dessus du clavier (six, sans doublon) |
| Historique et profil | 4 chiffres et un rail | chiffres, tes genres (barres et moyenne), ta liste par statut, « Ce que tu as regardé » daté (« Épisode 13 · hier »), tes notes, réglages |
| Saisons et épisodes | rail sous le premier écran | une rangée d'épisodes entière au premier écran, même avec la rangée des saisons (bas du rail à 621 px sur 720) |
| Infos | relations, personnages, recommandations | + « À propos » factuel : public, classement, studio, origine, auteur, diffusion, durée, genres, tags. Critiques et équipe complète restent au PC (cible : « la TV n'en garde que l'essentiel ») |
| Note | ±0,5, bouton « Retirer » | ±0,5 ; sous 0,5 la note est retirée — le bas de l'échelle, plus un bouton à part |
| Avis privé | jamais affiché | affiché dans « Mon suivi » s'il arrive. **L'engine le retire aujourd'hui de toutes les réponses TV** (`private_text_out`) : voir *Ce qui reste* |
| Progression manuelle | affichée seulement | « Où tu en es : − Épisode N sur T + », écrite par `library-update` (révision et identifiant de requête, comme statut et note) |
| Choisir la source | coche seule | coche = ce que tu as choisi ; pastille « En lecture » = ce qui joue, même en Automatique. Idem pour la qualité |
| Épisode suivant | « Épisode terminé » | carte « À suivre » : vignette, titre de l'épisode, passage de saison, décompte de 8 s annulable (Rester), ou attente d'un choix si l'automatique est coupé |
| Préférences retenues | tout repart en Automatique / VOSTFR | langue par série (fiche, lecteur, héros), lecteur retenu, épisode suivant automatique, son des bandes-annonces — dans l'engine, communs aux trois écrans |
| Lecteur : avance | pas fixes de 10 s | 10 s par appui, 30 s puis 60 s quand on insiste dans le même sens ; la bulle montre le temps visé **et l'écart** (« +1:00 ») |
| Accès | session perdue à la fermeture | inchangé : **l'appareil ne s'y prête pas** (voir plus bas) |

### Préférences communes

`TvSession` lit `/tv/v1/preferences` (globales au démarrage, puis par série) et
écrit `/tv/v1/preferences-update`, seulement si le runtime annonce la capacité
`preferences` (gateway à jour). Sans elle, les réglages valent pour la séance et
le profil le dit.

- **Langue** : la fiche s'ouvre dans la langue retenue pour la série ; la changer
  sur la fiche ou dans le menu Version du lecteur l'écrit. Le héros et la carte
  Reprendre l'appliquent aussi. VOSTFR reste le défaut.
- **Lecteur retenu** : un lecteur choisi à la main, qui démarre vraiment, est
  retenu (`{source, provider}` — des noms, jamais une URL). Au lancement suivant,
  il devient une **préférence souple** : la source est demandée, et si elle échoue
  la lecture repart aussitôt en Automatique (journal `ATLAS_TV_PREFERRED_READER_FALLBACK`).
  Choisir « Automatique » à la main l'oublie.
- **Épisode suivant automatique** et **son des bandes-annonces** : réglages du
  profil. Le son est lu une fois au démarrage ; ensuite le bouton « Son » du héros
  et le profil l'écrivent.

### Design

- **Fiche** : en-tête resserré (affiche 120 × 168, titre sur une ligne), synopsis
  sur deux lignes avec « Plus » collé à la dernière ligne, qui ouvre le texte entier.
  « À propos » ne le répète plus. Saisons en pastilles de 44 px, langue sur la ligne
  du nombre d'épisodes (« Version française sélectionnée… » est retiré : le bouton
  Lecture le dit déjà). Vignettes 288 × 162 avec la barre de reprise de l'épisode.
- **Menus Source et Qualité** : pastille « En lecture » à droite, menu Source élargi
  à 440 px pour la loger.
- **Avis fugaces** (`Toast.qml`) : en bas, dans la marge de sécurité de 5 %, hors du
  héros et des menus ; ils s'effacent seuls (4,5 à 9 s selon la longueur). Le lecteur
  a le sien (échec de changement d'épisode quand aucun menu n'est ouvert).
- **Mouvements réduits** : un seul réglage, « Animations réduites » dans le profil,
  propagé par `live.qml` au héros, à la fiche, à la recherche, à Ma liste, au profil,
  au lecteur d'épisode et au lecteur de bande-annonce.
- **Code mort retiré** : `SearchView.qml` (remplacé par `DiscoveryView` depuis le
  29 octobre, encore embarqué dans chaque paquet) et le panneau `detailOpen` du héros
  (la fiche appartient à `DetailView` depuis le 28 octobre).

## Ce qui reste, et pourquoi

1. **La session qui survit à la fermeture.** Le Devialet ne garde aucune application
   installée hors FreeStore : toute ouverture passe par `debug_qml_app` depuis un
   appareil du réseau local ([recherche du 22 octobre](2026-10-22-devialet-apps-sans-freestore.md)).
   Un appairage durable ne change rien tant que rien ne peut relancer l'app sans le
   téléphone, et chaque lancement réappaire déjà le Player. La seule piste réelle
   est un *autre lanceur* sur le réseau de l'appartement — LifeOS, sur le PC, qui a
   le JWT propriétaire et le même réseau. C'est une fonction LifeOS, hors de ce lot.
2. **L'avis privé.** La TV l'affiche s'il arrive, mais l'engine le retire exprès de
   toutes les réponses TV (test `private_reviews_never_leave_tv_catalogues`). Le
   laisser passer vers « Mon suivi » seulement est une décision de Walson : c'est un
   texte privé sur l'écran du salon.
3. **Le flou des boutons sur le Player.** `devialet/blur-probe.qml` mesure le temps
   par image avec 0, 3 et 8 boutons floutés sur un fond animé (Canvas
   `requestAnimationFrame`, 8 s par phase, moyenne, p95, pire, images > 20 ms) :
   `python -B packages/lan/scripts/devialet-check.py --player 192.168.0.30 --bind <IP-du-PC> --blur --launch`.
   Il n'a **pas** été lancé : il interrompt l'écran du Player, l'accord de Walson est
   requis. Le banc PC ne dit rien du GPU du Player.
4. **Recherches récentes durables** : en mémoire pendant la séance ; l'engine n'a
   pas de route pour elles, et le stockage local du Player n'est pas prouvé.
5. **Publication** : le gateway doit d'abord ouvrir les préférences (branche Atlas
   `feat/atlas-tv-preferences-gateway`, `upgrade.py`), puis le paquet QML se publie.
   Ni l'un ni l'autre n'a été fait : accord de Walson requis.

## Preuves

Banc `test-atlas-tv-live.py --parity` (nouveau scénario `atlas_tv_parity_bench.py`),
faux API, faux compte, faux décodeur. Il vérifie, dans l'hôte réel : la barre et
« reste 9 min » de Reprendre ; l'avis fugace en bas qui s'efface ; la fiche ouverte en
VF par la préférence de la série et l'écriture `{anilist_id, langue}` au changement ;
le bas du rail d'épisodes à 621 px sans défilement ; « Plus » et le synopsis entier ;
« À propos » ; le lecteur retenu demandé puis abandonné pour Automatique quand il échoue ;
la pastille « En lecture » unique ; un lecteur choisi à la main retenu au démarrage ;
l'avance 10 + 10 + 10 + 30 s ; la carte « À suivre » (titre chargé, décompte 8 → 7,
Rester, Lancer l'épisode 2 dans la même langue, saison suivante sans décompte quand
l'automatique est coupé) ; la progression 5 → 7 écrite seule ; l'avis affiché ; les
accents, les récentes et la touche Haut vers elles ; le profil (genres, notes),
« Animations réduites » propagé au héros et à la fiche, `suivant_auto` écrit.

Variantes existantes, toutes vertes sur ce lot : `plain`, `--follow-up`,
`--detail-preview`, `--conversation-launch`, `--hls`, `--episode-shelf`,
`--parity --hls`, `test-atlas-tv-session.py`, `test-atlas-tv-conversation-session.py`,
`test-atlas-tv-follow-up.cjs` (59 contrôles), `test-reader-policy.cjs`,
`test-home-refresh.cjs`. Trois bancs autonomes (`test-atlas-tv-home-browse.py`,
`preview-atlas-tv-hero.py`) ne chargent pas ici le module `QtMultimedia` du runtime
PyQt local : même échec sur `340d221`, c'est l'environnement, pas ce lot.

Le parcours du lecteur du banc complet est sensible à la charge du PC (attentes de
350 ms et de 3 s) : sous 80–90 % de CPU, la base `340d221` échoue aussi (1 sur 3 en
alternance, contre 0 sur 3 pour ce lot). Relancer avant de conclure à une régression.

Captures avant / après dans [`2026-11-09-atlas-tv-parite/`](2026-11-09-atlas-tv-parite/) :
`avant-*.jpg` sur `340d221`, `apres-*.jpg` sur ce lot, et `parity.json`. Aucune
capture d'un vrai Player.
