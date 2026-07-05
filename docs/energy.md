# Module Énergie

Objectif de la maison : **autonomie totale, 0 € chez EDF**. Le module Énergie
suit la production solaire, les batteries et les échanges réseau, et se veut
proactif (bandeaux d'alerte import EDF / surplus exploitable).

## Installation réelle (découverte le 2026-07-03)

| Système | Matériel | Entités clés |
|---|---|---|
| Solaire principal | Enphase Envoy + micro-onduleurs | `sensor.envoy_*_production_d_electricite_actuelle` (kW), `_production_d_energie_totale` (MWh) |
| Batterie maison | Zendure Hyper 2000 + pack AB2000X | `sensor.hyper_2000_*` (solar_input, bat_in_out, electric_level, aggr_*) |
| Système jardin | PV + batterie « Thony » (cloud, instable) | mesuré localement via Shelly EM Gen3 `energy_meter_0` (négatif = injection) |
| Compteur réseau | Shelly Pro 3EM | `sensor.shellypro3em_*_puissance` (négatif = export), `_energie` (import), `_energie_restituee` (export) |

Toute la cartographie vit dans `apps/web/src/config/energy.ts` — c'est LE
fichier à éditer quand un capteur change.

## Temps réel

- Solaire = somme Envoy + entrée PV Zendure + injection jardin (Shelly EM inversé)
- Réseau = Shelly Pro 3EM (positif = import EDF, négatif = export)
- Batterie = `hyper_2000_bat_in_out` (+ jardin) — positif = décharge
- Maison = max(0, solaire + réseau + batterie)
- Bandeaux proactifs : import EDF > 50 W → alerte ambre ; export > 50 W →
  suggestion verte (lancer les gros appareils).

## Historique (graphiques Jour/Semaine/Mois/Année)

Source : API WebSocket HA `recorder/statistics_during_period`
(hook `apps/web/src/hooks/useEnergyStats.ts`), champ `change` par période
pour les compteurs cumulatifs, `mean` pour le SOC et les capteurs de
puissance (`meanPower: true` → énergie = moyenne × durée).

Consommation maison **reconstituée par bilan** (aucun compteur direct) :

```
conso = production + import EDF - export + décharge batterie - charge batterie
```

### Garde-fous qualité de données

- Un `change` négatif (reset de compteur) est ignoré.
- Un saut > 10 kWh/h par source est ignoré (glitch d'intégration).
- `sensor.thony_total_energy` est **exclu** : l'intégration cloud du jardin
  produit des sauts fantômes (+15,27 kWh observé le 03/07 à 1h du matin).
  La production jardin passe par le Shelly EM local à la place.

## À valider avec Papa

1. Le Shelly EM Gen3 `energy_meter_0` mesure-t-il bien l'injection du
   système jardin ? (hypothèse actuelle, cohérente avec les valeurs)
2. Convention de signe de `hyper_2000_bat_in_out` (positif = décharge ?
   jamais observé ≠ 0 pour l'instant — champ `invert` prévu dans la config).
3. ⚠️ Le tableau de bord Énergie de Home Assistant lui-même est **mal
   configuré** (l'import réseau y est déclaré comme production solaire,
   l'entrée PV du Zendure comme charge batterie) — ses chiffres sont faux,
   ne pas s'y comparer.

## Surveillance proactive EDF

`apps/server/src/lib/energyWatcher.ts` interroge HA toutes les 5 min et
**alerte quand l'import EDF est évitable** : import réseau > seuil ET batterie
au-dessus du minimum (donc la batterie aurait pu couvrir → quelque chose
d'anormal ou un gros appareil). La nuit batterie vide, l'import est jugé
inévitable → **pas d'alerte** (anti-spam). Une seule alerte par épisode, avec
un délai de garde ; diffusée aux écrans Trano en interphone (⚡ Trano) et,
optionnellement, aux téléphones.

Réglable par variables d'environnement (voir `apps/server/.env.example`) :
`TRANO_EDF_ALERT`, `TRANO_EDF_THRESHOLD_W`, `TRANO_EDF_MIN_SOC`,
`TRANO_EDF_COOLDOWN_MIN`, `TRANO_EDF_ALERT_PHONES`.

## Suites prévues

- « Que puis-je lancer maintenant ? » : puissance disponible avant de puiser
  batterie/EDF, calculée depuis le surplus courant
- Prévision solaire (nécessite l'intégration Forecast.Solar dans HA)
- Prévision nocturne : batterie suffisante pour la nuit selon les habitudes
