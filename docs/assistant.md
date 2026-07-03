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

- `etat_maison` — vue d'ensemble : météo, énergie, lumières allumées,
  lecture en cours, présence GPS, wifi, appels manqués.
- `meteo` — météo détaillée (température, ressenti, humidité, vent, pression).
- `energie` — bilan détaillé : solaire par source, réseau EDF, chaque
  batterie, production jour/semaine/totale.
- `lister_pieces` — pièces de la maison (depuis la base Trano).
- `lister_appareils` — appareils contrôlables avec entity_id, état **et pièce**
  (résolue via template HA `area_name`).
- `infos_appareil` — détail d'un appareil (état, pièce, attributs).
- `controler_appareil` — turn_on/turn_off/toggle, **restreint** aux lumières,
  prises, ventilateurs, lecteurs, volets (serrures et alarme exclues par sécurité).
- `courses_lister` / `courses_categories` / `courses_ajouter` /
  `courses_cocher` / `courses_supprimer` — gestion de la liste de courses
  (les ajouts sont attribués au profil actif).
- `interphone` — envoie une annonce aux écrans Trano et/ou aux téléphones,
  signée du profil actif.

Le profil actif est transmis dans la requête (`body.profile`) pour signer
les ajouts et l'interphone. Boucle d'outils plafonnée à 6 tours ; historique
limité aux 20 derniers messages ; reprise automatique sur erreur 5xx.

## Historique des conversations

- Stocké **côté client uniquement** : store Zustand `useAssistantChat`
  persisté en `localStorage` (clé `trano-assistant-chat`). Il survit donc au
  rechargement et à la fermeture du panneau, mais reste **local à l'appareil**
  (non partagé entre écrans, non lié au profil).
- Le **serveur est sans état** : chaque appel `/api/assistant/chat` reçoit
  l'historique complet du client (tronqué aux 20 derniers messages) et ne
  conserve rien sur disque.
- Bouton « Nouvelle » dans l'en-tête du panneau pour repartir de zéro.
- Évolutions possibles : conversations par profil, historique partagé côté
  serveur, streaming des réponses.

## API

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/assistant/status` | `{ configured, haReady, model }` |
| POST | `/api/assistant/chat` | `{ messages: [{role, content}] }` → `{ reply }` |

## Vérifié le 2026-07-03

L'outil `etat_maison` testé contre la vraie instance HA : météo, export
1862 W, solaire 989 W, batterie 99 %, présences et wifi corrects. Il ne
manque que la clé OpenRouter pour activer la boucle complète.
