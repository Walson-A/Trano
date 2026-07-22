# Déployer Trano sur la Freebox Delta

Trano tourne comme **add-on Home Assistant** dans la VM HAOS de la Freebox.
Une seule VM, démarrage automatique, et la base de données (profils, courses)
est incluse dans les sauvegardes automatiques de HA.

## Prérequis

- La VM Home Assistant OS (HAOS) sur la Freebox Delta — vérifiez que
  **Paramètres → Modules complémentaires** existe dans l'interface HA.
- Un **token d'accès longue durée** HA : Profil utilisateur → Sécurité →
  Créer un token. Gardez-le, il sert à l'étape 4.

## Installation (recommandée) : dépôt GitHub

Home Assistant peut lire l'add-on **directement depuis GitHub** — plus
besoin de partage réseau ni de copier de dossier, ni au premier
déploiement, ni pour les suivants.

### 1. Ajouter le dépôt dans HA

**Paramètres → Modules complémentaires → Boutique d'add-ons** → menu ⋮ en
haut à droite → **Dépôts** → collez :

```
https://github.com/Walson-A/Trano
```

→ **Ajouter**. Une section **Trano** apparaît dans la boutique (elle lit la
branche `release`, qui contient l'add-on déjà prêt à l'emploi).

### 2. Installer l'add-on

Cliquez sur **Trano** dans la boutique → **Installer**.

### 3. Configurer

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

### 4. Utiliser

Sur n'importe quel appareil de la maison :
**http://homeassistant.local:3001** (ou `http://IP-de-la-VM:3001`).

Ajoutez le site à l'écran d'accueil des téléphones/tablettes pour un
lancement plein écran façon application.

## Mise à jour

Sur le PC, à la racine du projet :

```bash
bash deploy/publish-addon.sh
```

Ce script compile le frontend, incrémente automatiquement le numéro de
version et publie le résultat sur la branche `release` de GitHub. Dans HA,
un bouton **Mettre à jour** apparaît alors sur l'add-on Trano (Paramètres →
Modules complémentaires → Trano) — un clic suffit. Les données (profils,
courses) sont conservées entre les mises à jour : elles vivent dans
`/data/trano.db`, hors du conteneur.

## Installation alternative (sans GitHub) : copie manuelle

Si le dépôt doit rester privé, ou sans accès internet depuis la Freebox :

1. `bash deploy/build-addon.sh` compile et assemble `deploy/ha-addon/trano/`.
2. Installez l'add-on officiel **Samba share** dans HA, démarrez-le, puis
   depuis l'explorateur Windows copiez le dossier `deploy/ha-addon/trano`
   entier dans `\\homeassistant.local\addons`.
3. Boutique d'add-ons → ⋮ → **Rechercher les mises à jour** → une section
   **Add-ons locaux** apparaît avec **Trano** → **Installer**.
4. Pour chaque mise à jour : répétez les étapes 1 et 2 (le dossier est
   écrasé), puis dans l'add-on : **Reconstruire**.

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
