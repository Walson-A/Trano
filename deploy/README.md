# Déployer Trano sur la Freebox Delta

Trano tourne comme **add-on Home Assistant** dans la VM HAOS de la Freebox.
Une seule VM, démarrage automatique, et la base de données (profils, courses)
est incluse dans les sauvegardes automatiques de HA.

L'image Docker est fabriquée par GitHub Actions et publiée sur GHCR : la
Freebox ne compile rien, elle télécharge. Installation et mises à jour se
comptent en secondes.

## Prérequis

- La VM Home Assistant OS (HAOS) sur la Freebox Delta — vérifiez que
  **Paramètres → Modules complémentaires** existe dans l'interface HA.
- Un **token d'accès longue durée** HA : Profil utilisateur → Sécurité →
  Créer un token. Gardez-le, il sert à l'étape 3.

## Une seule fois : rendre l'image publique

Au tout premier passage de la CI, le paquet GHCR est créé **privé** ;
Home Assistant, qui se connecte sans identifiants, ne pourrait pas le
télécharger (erreur d'authentification à l'installation).

Sur GitHub : page du dépôt → colonne de droite, section **Packages** →
**trano** → **Package settings** → *Danger Zone* → **Change visibility** →
**Public**. À faire une seule fois, jamais à refaire ensuite.

## Installation

### 1. Ajouter le dépôt dans HA

**Paramètres → Modules complémentaires → Boutique d'add-ons** → menu ⋮ en
haut à droite → **Dépôts** → collez :

```
https://github.com/Walson-A/Trano
```

→ **Ajouter**. Une section **Trano** apparaît dans la boutique.

Le Supervisor lit `repository.yaml` à la racine, puis découvre l'add-on
via le motif `**/config.*` — d'où `addon/trano/config.yaml`. Un add-on
posé à la racine du dépôt ne serait **pas** détecté : il lui faut son
propre sous-dossier.

### 2. Installer l'add-on

Cliquez sur **Trano** dans la boutique → **Installer**. Comme
`config.yaml` porte un champ `image`, le Supervisor télécharge l'image
déjà fabriquée (tag = le champ `version`) au lieu de la construire.

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

**Entièrement automatique.** On développe sur `dev` ; dès qu'un changement
est fusionné sur `main`, `.github/workflows/publish-image.yml` compile le
frontend, fabrique l'image (amd64 + arm64), la publie sur GHCR, puis
incrémente `version` dans `addon/trano/config.yaml` et recommite ce seul
fichier (message marqué `[skip ci]`, sans quoi la CI se relancerait sans
fin). C'est ce changement de numéro que Home Assistant surveille :

- **Mise à jour automatique activée** (recommandé, une fois pour toutes) :
  Paramètres → Modules complémentaires → **Trano** → interrupteur
  **« Mise à jour automatique »** → HA installe tout seul.
- Sinon, un bouton **Mettre à jour** apparaît sur la page de l'add-on.

L'ordre des étapes compte : la version n'est incrémentée qu'**après** la
publication réussie de l'image, pour que HA ne tente jamais de télécharger
un tag inexistant.

Les données (profils, courses) sont conservées entre les mises à jour :
elles vivent dans `/data/trano.db`, hors du conteneur.

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

## Faire tourner l'image ailleurs (hors Home Assistant)

L'image publiée est une image Docker ordinaire :

```bash
docker run -d --name trano -p 3001:3001 \
  -v trano-data:/data \
  -e TRANO_HA_URL=http://homeassistant.local:8123 \
  -e TRANO_HA_TOKEN=votre_token \
  ghcr.io/walson-a/trano:latest
```

Pour la reconstruire localement, compilez d'abord le frontend
(`npm run build` — le `Dockerfile` attend `apps/web/dist` déjà présent),
puis `docker build -t trano .`.
