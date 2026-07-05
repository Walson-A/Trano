# Déployer Trano sur la Freebox Delta

Trano tourne comme **add-on Home Assistant** dans la VM HAOS de la Freebox.
Une seule VM, démarrage automatique, et la base de données (profils, courses)
est incluse dans les sauvegardes automatiques de HA.

## Prérequis

- La VM Home Assistant OS (HAOS) sur la Freebox Delta — vérifiez que
  **Paramètres → Modules complémentaires** existe dans l'interface HA.
- Un **token d'accès longue durée** HA : Profil utilisateur → Sécurité →
  Créer un token. Gardez-le, il sert à l'étape 4.

## Installation

### 1. Préparer le dossier de l'add-on

Sur votre PC, à la racine du projet :

```bash
bash deploy/build-addon.sh
```

Ce script **compile le frontend sur le PC** (bundle moderne + bundle
compatible vieux Safari pour l'iPad mural) puis assemble le dossier
`deploy/ha-addon/trano/`. La Freebox n'aura qu'à installer les dépendances
serveur : pas de build lourd sur la VM.

### 2. Copier l'add-on dans la VM HAOS

Le plus simple : installez l'add-on officiel **Samba share** dans HA
(Paramètres → Modules complémentaires → Boutique), démarrez-le, puis depuis
l'explorateur Windows ouvrez `\\homeassistant.local\addons` et copiez-y le
dossier `deploy/ha-addon/trano` entier.

### 3. Installer l'add-on

Dans HA : **Paramètres → Modules complémentaires → Boutique d'add-ons**,
menu ⋮ en haut à droite → **Rechercher les mises à jour**, puis rafraîchissez :
une section **Add-ons locaux** apparaît avec **Trano**. Cliquez → **Installer**.

### 4. Configurer

Dans l'onglet **Configuration** de l'add-on :

| Option | Valeur |
|---|---|
| `ha_url` | `http://homeassistant.local:8123` (ou l'IP de la VM, ex. `http://192.168.1.XX:8123`) |
| `ha_token` | votre token longue durée |
| `weather_entity` | `weather.forecast_home` |
| `openrouter_key` | votre clé OpenRouter (pour l'assistant IA) |
| `openrouter_model` | laisser la valeur par défaut, ou un autre modèle |

Puis **Démarrer** (« Lancer au démarrage » et « Chien de garde » sont
recommandés — le chien de garde surveille `/api/health` et relance
l'add-on tout seul en cas de pépin).

### 5. Utiliser

Sur n'importe quel appareil de la maison :
**http://homeassistant.local:3001** (ou `http://IP-de-la-VM:3001`).

Ajoutez le site à l'écran d'accueil des téléphones/tablettes pour un
lancement plein écran façon application.

## Mise à jour

Rejouez les étapes 1 et 2 (écrasez le dossier), incrémentez `version` dans
`config.yaml`, puis dans l'add-on : **Reconstruire**. Les données
(profils, courses) sont conservées : elles vivent dans `/data/trano.db`,
hors du conteneur.

## Écran mural : vieil iPad (iOS 12)

Le build inclut un bundle « legacy » qui fonctionne sur Safari 12
(iPad Air 1, iPad mini 2/3…). Mise en place :

1. Sur l'iPad, ouvrez Safari → `http://IP-de-la-VM:3001/?kiosk`
   (le paramètre `?kiosk` active un rafraîchissement automatique chaque
   nuit à 4h, pour purger la mémoire des vieux Safari).
2. Partager → **Sur l'écran d'accueil** → ouvrez l'icône Trano créée :
   l'app se lance en plein écran, sans barre Safari.
3. **Réglages → Luminosité et affichage → Verrouillage auto → Jamais.**
4. **Réglages → Accessibilité → Accès guidé** : activez, définissez un code.
   Ouvrez Trano, puis **triple-clic sur le bouton principal → Démarrer** :
   l'iPad est verrouillé sur Trano (impossible d'en sortir sans le code).
   Dans les options d'Accès guidé, laissez « Verrouillage auto : Jamais ».
5. Branchez l'iPad sur secteur en permanence. Évitez de le coller contre
   un mur sans aération : les vieilles batteries n'aiment pas la chaleur.

Limites connues sur iOS 12 : quelques espacements plus serrés et des
effets de flou absents — l'interface reste entièrement fonctionnelle.

## Alternative : Docker sur une autre machine

Le `Dockerfile` à la racine du repo construit la même image pour tout hôte
Docker (amd64/arm64) :

```bash
docker build -t trano .
docker run -d --name trano -p 3001:3001 \
  -v trano-data:/data \
  -e TRANO_HA_URL=http://homeassistant.local:8123 \
  -e TRANO_HA_TOKEN=votre_token \
  trano
```
