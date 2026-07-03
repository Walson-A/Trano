# Assistant IA

Onglet « Assistant » : un chat en français avec la maison, propulsé par
OpenRouter. La clé API n'existe **que côté serveur** (jamais dans le build
frontend).

## Configuration

| Contexte | Où |
|---|---|
| Développement | `apps/server/.env` → `TRANO_OPENROUTER_KEY` (+ `TRANO_HA_URL`/`TRANO_HA_TOKEN` pour les outils) |
| Production | Options de l'add-on : `openrouter_key`, `openrouter_model` |

Modèle par défaut : `deepseek/deepseek-chat-v3.1:free` (gratuit, supporte les
tools). Changeable via `TRANO_OPENROUTER_MODEL` / option `openrouter_model`.
Tant que la clé manque, l'onglet affiche un écran d'explication.

## Outils du modèle

L'assistant ne peut faire QUE ce que ses outils permettent
(`apps/server/src/routes/assistant.ts` + `apps/server/src/lib/ha.ts`) :

- `etat_maison` — photographie compacte : météo, énergie (solaire/batterie/
  réseau avec commentaire import/export EDF), lumières allumées, lecture en
  cours, présence GPS des membres, wifi Freebox, appels manqués.
- `liste_appareils` — appareils contrôlables avec entity_id et état.
- `controler_appareil` — turn_on/turn_off/toggle, **restreint aux domaines**
  lumières, prises, ventilateurs, lecteurs multimédia (pas de serrures ni
  d'alarme par construction).

Boucle d'outils plafonnée à 5 tours ; historique limité aux 20 derniers
messages ; réponses non streamées (simplicité d'abord).

## API

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/assistant/status` | `{ configured, haReady, model }` |
| POST | `/api/assistant/chat` | `{ messages: [{role, content}] }` → `{ reply }` |

## Vérifié le 2026-07-03

L'outil `etat_maison` testé contre la vraie instance HA : météo, export
1862 W, solaire 989 W, batterie 99 %, présences et wifi corrects. Il ne
manque que la clé OpenRouter pour activer la boucle complète.
