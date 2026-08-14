# Serveur MCP — la maison vue par Oby

Trano expose ses outils domotiques à **Oby** (l'assistant de Walson) via le
protocole **MCP**, en streamable-HTTP. Oby garde le cerveau — sa mémoire, ses
sessions, son contexte — et Trano fournit les mains : Home Assistant, les
pièces, l'énergie, les scènes.

Les deux tournent sur **la même machine** (le serveur de la maison) : l'engine
Oby appelle donc `http://127.0.0.1:3001/api/mcp`, en boucle locale, sans rien
exposer au réseau.

## Ce que ça ne change pas

L'onglet **Assistant** de Trano (OpenRouter, écrans muraux) reste tel quel.
C'est l'assistant de la famille, il répond sur les tablettes, et il n'a pas
besoin d'Oby pour ça. Les deux surfaces consomment **la même table d'outils**
(`apps/server/src/lib/tools.ts`) — une seule définition, un seul endroit où la
sécurité se décide.

## La route

| Méthode | Route | Réponse |
|---|---|---|
| POST | `/api/mcp` | JSON-RPC MCP (`initialize`, `tools/list`, `tools/call`, `ping`) |
| GET / DELETE | `/api/mcp` | `405` — serveur sans session, rien à rouvrir ni à supprimer |

**Mode stateless** : un serveur MCP et un transport neufs à chaque requête,
aucune session à garder ni à expirer. Un appel d'outil est court et l'engine ne
s'abonne à rien ; la machinerie de session ne servirait qu'à se périmer.

**Authentification obligatoire** : en-tête `Authorization: Bearer <TRANO_MCP_TOKEN>`,
comparé à temps constant. Sans la variable `TRANO_MCP_TOKEN`, la route répond
**503** et un avertissement part dans les logs au démarrage. C'est délibéré : le
serveur écoute sur `0.0.0.0`, un défaut permissif ouvrirait le pilotage de la
maison à tout le réseau.

## Les outils exposés

Dix, marqués `oby: true` dans `lib/tools.ts` :

| Outil | |
|---|---|
| `etat_maison` · `meteo` · `energie` | lecture — vue d'ensemble, météo, solaire et batteries |
| `lister_pieces` · `lister_appareils` · `infos_appareil` | lecture — la maison et ses appareils |
| `controler_appareil` · `regler_lumiere` | action — allumer/éteindre, luminosité, couleur |
| `lister_scenes` · `activer_scene` | action — les scènes HA |

**Restent dehors, délibérément :**

- **les courses** (`courses_*`) — elles écrivent dans la liste partagée de la famille ;
- **l'interphone** — il sonne sur les téléphones de tout le monde ;
- **`controler_freebox`** — couper le wifi couperait accessoirement le lien entre
  Oby et la maison.

Les **serrures et l'alarme** ne sont exposées à personne : `controlDevice`
(`lib/ha.ts`) les exclut déjà, pour l'assistant de la maison comme pour Oby.

La liste blanche est vérifiée **deux fois** : à la déclaration (`tools/list` ne
montre que les dix) et à l'appel (`tools/call` refuse le reste). Un client MCP
peut très bien demander un outil qu'on ne lui a jamais listé.

## Le branchement côté Oby

L'engine est un client MCP général : il n'y a **aucun code à écrire de son
côté**, seulement une entrée de configuration dans
`/var/lib/oby/config/mcp_servers.json` :

```json
"trano": {
  "transport": "http",
  "url": "http://127.0.0.1:3001/api/mcp",
  "bearer": "${TRANO_MCP_TOKEN}",
  "enabled": true
}
```

Le `${TRANO_MCP_TOKEN}` est résolu depuis `/var/lib/oby/config/oby.env` — la même
valeur que dans le `~/trano/.env` du conteneur. Les outils arrivent alors chez
Oby sous le nom **`trano__etat_maison`**, `trano__controler_appareil`… (l'engine
préfixe par serveur). Reconnexion sans redémarrage depuis **Réglages →
Connexions MCP**.

## Vérifier

```bash
curl -s -X POST http://127.0.0.1:3001/api/mcp \
  -H "Authorization: Bearer $TRANO_MCP_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Attendu : les dix outils, en flux `text/event-stream`. Sans en-tête
`Authorization`, la même requête répond `401`.

## Et le widget de LifeOS ?

Le bureau de Walson a une **carte Maison** (favoris + bascules + réglages des
lumières, vue focus = cette app en iframe). Elle ne passe **pas** par MCP mais
par `GET /api/house`, `POST /api/house/device` et `POST /api/house/light`
(cf. [`server_api.md`](server_api.md)) : un widget veut un objet typé, pas du
JSON dans une chaîne dans du SSE. Même couche métier dessous, donc les deux
surfaces ne peuvent pas diverger. Côté LifeOS :
`Atlas/LifeOS/docs/home-system.md`.

`regler_lumiere` (MCP) et `/api/house/light` (REST) appellent tous deux
`light.turn_on`, mais avec **deux vocabulaires** : le premier prend un nom de
couleur français (`setLight`, table `COLOR_MAP`), le second des valeurs exactes
(`setLightState` : teinte, saturation, kelvins). On ne demande pas à une roue
chromatique de traduire sa teinte en « turquoise » pour que le serveur la
retraduise.

## Limites connues

- **Résultats en texte seul.** Chaque outil renvoie une chaîne (souvent du JSON
  sérialisé), comme pour l'assistant OpenRouter. Pas d'images ni de flux.
- **Pas de notification serveur → Oby.** Trano ne peut pas prévenir Oby qu'une
  lumière a changé ; Oby demande, Trano répond. Le WebSocket `/api/ws` reste
  réservé à la synchro entre écrans.
- **Le jeton est la seule barrière.** Il vaut le pilotage des lumières et des
  scènes de la maison : il se traite comme un mot de passe, et il n'a rien à
  faire dans git.
