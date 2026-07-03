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

### 2. Copier l'add-on dans la VM HAOS

Le plus simple : installez l'add-on officiel **Samba share** dans HA
(Paramètres → Modules complémentaires → Boutique), démarrez-le, puis depuis
l'explorateur Windows ouvrez `\\homeassistant.local\addons` et copiez-y le
dossier `deploy/ha-addon/trano` entier.

### 3. Installer l'add-on

Dans HA : **Paramètres → Modules complémentaires → Boutique d'add-ons**,
menu ⋮ en haut à droite → **Rechercher les mises à jour**, puis rafraîchissez :
une section **Add-ons locaux** apparaît avec **Trano**. Cliquez → **Installer**
(le premier build prend quelques minutes sur la Freebox).

### 4. Configurer

Dans l'onglet **Configuration** de l'add-on :

| Option | Valeur |
|---|---|
| `ha_url` | `http://homeassistant.local:8123` (ou l'IP de la VM, ex. `http://192.168.1.XX:8123`) |
| `ha_token` | votre token longue durée |
| `weather_entity` | `weather.forecast_home` |

Puis **Démarrer** (et activez « Lancer au démarrage » et « Chien de garde »).

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
