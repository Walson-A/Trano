# Atlas TV — piloter la lecture depuis le PC, l'iPhone ou Oby (10 novembre 2026)

Contrat engine : `Atlas/engine/docs/atlas-tv.md` § « Piloter une lecture depuis un autre
appareil » (dépôt Atlas, `tv/commandes.rs`). Ordre de publication et état :
`docs/atlas-tv-backend.md` § « Ce qui joue sur Atlas TV, vu du PC » (dépôt Atlas).

## Ce que fait la scène

`TvCommands.qml`, à côté de `TvConversationLaunch.qml`, sur le récepteur primary seulement et si
le runtime annonce `tv_commands` (`TvSession.tvCommandsEnabled`). Une attente longue
`POST /tv/v1/commands/next {}` (par `conversationApi`, le seul transport rejouable après un 401,
dont la liste de chemins accepte désormais `/tv/v1/commands/next` et `…/<uuid>/ack`) ; aucune
attente tant qu'une commande est en cours.

| Commande | Geste du lecteur | `applied` quand |
| --- | --- | --- |
| `play` | `remotePlay()` (= `toggle` si besoin) | le décodeur joue ; une progression `playing` part aussitôt (`reportNow`) |
| `pause` | `remotePause()` | le décodeur est en pause (la progression `paused` part déjà du lecteur) |
| `seek` | `seekTo(ms)` | la position est confirmée à ± 2,5 s (progression par `confirmSeek`) |
| `next` | `launchNext()`, le parcours « À suivre » | une nouvelle lecture avance (`observationReady`) |
| `stop` | `close()`, retour à la fiche | le lecteur est fermé (progression `stopped`) |

Refus, codes fermés : `no_playback`, `playback_mismatch` (la commande vise une autre lecture),
`player_busy` (changement d'épisode, erreur de reprise, épisode terminé), `player_error`,
`not_seekable`, `no_next_episode` (pas de suivant, ou version de saison), `command_expired`.
Le reçu se réessaie (1 s) jusqu'à 10 s après l'échéance ; une commande déjà vue n'est jamais
rejouée. Journal : `ATLAS_TV_COMMAND <action> <reçu> <code>`.

## Banc

```
python -B packages/lan/scripts/test-atlas-tv-live.py --qt-path <PyQt5-local> --snapshot <accueil.json> \
  --assets <images> --regular <regular.ttf> --bold <bold.ttf> --tv-commands-only --evidence <dossier-neuf>
```

`--tv-commands-only` ne joue que le scénario (`atlas_tv_commands_bench.py`) ; `--tv-commands` le
joue après les contrôles généraux. Vert le 10 novembre : `--tv-commands-only` deux fois,
`--conversation-launch --tv-commands` complet deux fois, `test-atlas-tv-conversation-session.py`.
La fixture `LifeOS/src/banc/animes/accueil.json` du 10 novembre (accueil mis à plat) ne convient
plus aux contrôles généraux du banc (épisode 13 attendu) : utiliser celle du 19 septembre
(`git show c177277e:LifeOS/src/banc/animes/accueil.json`). Le banc complet reste sensible à la
charge du PC : relancer avant de conclure.

Non vu sur le vrai Player. Volume : rien (aucun réglage vérifié depuis la scène).
