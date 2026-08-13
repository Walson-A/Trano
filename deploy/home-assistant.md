# Home Assistant sur tranoserver

> **Installé le 2026-08-13.** Le conteneur tourne et sert la page d'accueil.
> **L'onboarding reste à faire** (créer le compte propriétaire), puis il faut
> rebrancher Trano sur la nouvelle adresse — voir « Ce qu'il reste à faire ».

## Pourquoi on a déménagé

La VM Home Assistant de la Freebox était plafonnée à 1 Go. Le 2026-08-13 elle
n'était plus qu'un port ouvert : le TCP répondait bien sur `192.168.1.158:8123`,
mais **aucune requête HTTP n'aboutissait** — 60 s d'attente, `curl` code 000, et
le conteneur Trano échouait exactement pareil. Le port 4357 (l'observateur HAOS)
était fermé, le 22 aussi. Autrement dit HA ne servait plus rien depuis un
moment, et le widget Maison comme les outils `trano__*` d'Oby tournaient à vide
sans que ça se voie.

Rien n'a été récupéré de cette instance : **installation neuve, aucune donnée
reprise** (décidé avec Walson).

## Pourquoi un conteneur, et pas une VM HA OS

HA OS dans une VM est le chemin officiellement recommandé : store d'add-ons,
mises à jour en un clic, sauvegardes système. **Il est hors d'atteinte sur cette
machine** — le HP ProDesk 600 G2 DM a VT-x désactivé dans son firmware.

Vérifié plutôt que supposé, cinq indices convergents :

| Vérification | Résultat |
|---|---|
| `systemd-detect-virt` | `none` → bare metal, `vmx` n'est donc pas masqué par un hyperviseur |
| Flags CPUID | `smx` présent, mais **ni `vmx`, ni `ept`, ni `vpid`, ni `tpr_shadow`** |
| `lscpu` | **aucune ligne `Virtualization:`** (elle apparaît dès que `vmx` est là) |
| `/proc/cmdline` | rien qui désactive KVM côté noyau |
| `/dev/kvm` | absent ; `kvm_intel` refuse de se charger sans `vmx` |

Et **le BIOS n'est pas pilotable à distance**, ce qui aurait tout débloqué. Le
pilote `hp_bioscfg` est pourtant chargé et expose bien l'attribut
`Virtualization Technology (VTx)` (`current_value = Disable`,
`possible_values = Disable;Enable`), avec `Setup Password/is_enabled = 0`. Mais
toute écriture est rejetée par le firmware :

```
hp_bioscfg: Returned error 0x4, "Invalid command type"
```

Ce n'est **pas** une question de mot de passe BIOS manquant — ce serait une
erreur d'autorisation. Le test décisif : réécrire à l'attribut `Fast Boot` *sa
propre valeur actuelle* (opération neutre) échoue avec exactement la même
erreur. Le BIOS N22 v02.58 (2016) n'implémente pas la méthode WMI d'écriture que
le pilote moderne appelle. `hp_bioscfg` sait lire, pas écrire, sur cette
plateforme.

> **Le jour où on veut la VM** : écran + clavier + F10 → Security → System
> Security → Virtualization Technology (VTx) → Enable. La migration depuis le
> conteneur est alors une sauvegarde HA restaurée dans HA OS : config,
> intégrations, entités, zones et automatisations suivent. Rien de ce qui est
> fait ici n'est perdu.

HA Supervised n'a jamais été envisagé : **déprécié**, et interdit sur une
machine qui fait déjà tourner autre chose (il prend la main sur Docker,
AppArmor et NetworkManager — or cette machine porte l'engine Oby, Trano et
Hermès).

## Ce qui est en place

| | |
|---|---|
| Hôte | `tranoserver` (192.168.1.65 filaire / 192.168.1.22 wifi, Tailscale 100.80.77.107) |
| Emplacement | `~/homeassistant/` — `docker-compose.yml` + `config/` |
| Image | `ghcr.io/home-assistant/home-assistant:stable` — **2026.8.1** |
| Adresse | **http://192.168.1.65:8123** |
| Conso | ~370 Mo de RAM au repos (contre 1 Go de plafond sur la Freebox) |

```yaml
services:
  homeassistant:
    container_name: homeassistant
    image: ghcr.io/home-assistant/home-assistant:stable
    restart: unless-stopped
    network_mode: host
    environment:
      TZ: Europe/Paris
    volumes:
      - ./config:/config
```

Trois choix, et leurs raisons :

**`network_mode: host`.** Ce n'est pas du confort, c'est une nécessité : les
Shelly (CoIoT/mDNS), la Freebox (SSDP) et l'Envoy (mDNS) se découvrent par
diffusion sur le LAN. En mode bridge Docker, HA ne les verrait jamais et il
faudrait tout ajouter à la main par IP. Contrepartie assumée : HA partage la
pile réseau de l'hôte, donc il voit aussi `127.0.0.1:7777` (oby-engine) et
`:3001` (Trano). L'engine exige sa master key, ce n'est donc pas une porte
ouverte.

**Bind mount `./config`, pas un volume nommé.** Contrairement à Trano (qui
utilise `trano-data`), la config HA reste lisible et sauvegardable directement
depuis l'hôte, dans `~/homeassistant/config/`. C'est ce qui rend une sauvegarde
hors-HA triviale.

**Ni `privileged: true`, ni `/run/dbus`.** La doc officielle les recommande,
mais ils ne servent qu'au matériel : aucun dongle USB n'est branché
(`lsusb` ne montre que le Bluetooth interne), et `bluetoothd` est **inactif** sur
l'hôte. Les accorder élargirait la surface pour rien sur une machine qui porte
aussi l'engine.

> **Conséquence connue et bénigne** : en mode hôte, HA détecte l'adaptateur
> Bluetooth Intel de la machine (`hci0`) et n'arrive pas à s'en servir — il
> logue un traceback `habluetooth` avec un backoff exponentiel (1 s, 6, 10, 20,
> 40…). Un clic après l'onboarding suffit à le faire taire : **Réglages →
> Appareils et services → Bluetooth → Désactiver**. Pour vouloir le Bluetooth un
> jour, il faut les trois ensemble : `sudo systemctl enable --now bluetooth`,
> monter `/run/dbus:/run/dbus:ro`, et `cap_add: [NET_ADMIN, NET_RAW]`.

## Ce qu'il reste à faire

### 1. Onboarding

http://192.168.1.65:8123 → créer le compte propriétaire, le lieu, le fuseau
(Europe/Paris) et les unités. Puis désactiver l'intégration Bluetooth (ci-dessus).

### 2. Réserver l'adresse IP sur la Freebox

**À ne pas sauter.** Les tablettes murales parlent à HA **en direct** en
WebSocket (voir `docs/architecture.md`) : l'URL leur vient de `/api/config`, mais
c'est bien leur navigateur qui se connecte. Si l'IP du serveur bouge, tous les
écrans tombent d'un coup.

Freebox OS → DHCP → baux statiques → réserver pour la MAC **`ec:8e:b5:73:98:05`**
(`eno1`, le filaire) l'adresse **192.168.1.65**.

### 3. Réinstaller les intégrations

Installation neuve : tout est à refaire. Ce que l'ancienne portait, d'après les
entités que Trano consomme (`apps/web/src/config/energy.ts`) :

| Intégration | Note |
|---|---|
| **Enphase Envoy** | `sensor.envoy_122237060306_*`. Firmware D7+ → demande les identifiants du compte Enlighten. |
| **Shelly** | Pro 3EM (`ac15187b3e18`), EM Gen3 (`dcb4d9c5664c`), Plug S G3 (`d885ac1ebaa8`). Découverte automatique — c'est ce que `network_mode: host` achète. |
| **Freebox** | Demande d'**autoriser la nouvelle application sur l'écran de la Freebox** (flèche droite). Le jeton de l'ancienne instance ne vaut plus rien. |
| **Météo (Met.no)** | Doit produire `weather.forecast_home` — c'est ce qu'attend `TRANO_WEATHER_ENTITY`. À vérifier, et à renommer si HA choisit autre chose. |
| **Zendure** | Hyper 2000 + AB2000X, via **HACS**. Voir la section MQTT ci-dessous. |
| **« Thony »** (jardin) | `sensor.thony_pv_power`, `thony_battery_power`, `thony_battery_state_of_charge`, `thony_total_energy`. Origine non identifiée depuis le code — à retrouver au remontage. |

### 4. Zendure : HACS, et sans doute Mosquitto

La **Hyper 2000 est un « legacy device »** chez Zendure : son intégration HA
passe par **MQTT local**, pas par le cloud. Il faut donc un broker — et c'est là
que l'absence du store d'add-ons se paie, puisqu'il devient un conteneur à
monter à la main.

HACS d'abord (script officiel de hacs.xyz) :

```bash
docker exec homeassistant bash -lc "wget -O - https://get.hacs.xyz | bash -" && docker restart homeassistant
```

Puis Mosquitto, seulement si l'intégration Zendure réclame du MQTT local :

```bash
mkdir -p ~/mosquitto/{config,data,log} && cd ~/mosquitto
printf 'listener 1883 0.0.0.0\nallow_anonymous false\npassword_file /mosquitto/config/passwd\npersistence true\npersistence_location /mosquitto/data/\nlog_dest stdout\n' > config/mosquitto.conf
```

Créer l'utilisateur (choisir le mot de passe à l'invite), puis démarrer :

```bash
docker run --rm -it -v ~/mosquitto/config:/mosquitto/config eclipse-mosquitto mosquitto_passwd -c /mosquitto/config/passwd zendure
```

Le `docker-compose.yml` du broker (port 1883 publié, `restart: unless-stopped`,
les trois dossiers montés sur `/mosquitto/{config,data,log}`), puis pointer le
matériel Zendure sur `192.168.1.65:1883`.

### 5. Recréer les zones

Trano mappe les *areas* HA vers ses pièces
(`apps/web/src/config/rooms.ts`, `HA_AREA_TO_ROOM`). Pour que l'affectation
automatique marche, créer les zones avec ces noms : **Salon, Cuisine, Garage,
Salle de bain (bas), Chambre parents, Chambre Mahalia, Chambre Kevin, Chambre
Argan, Chambres enfants, Salle de bain étage**.

### 6. Rebrancher Trano

Un jeton longue durée : HA → profil (en bas à gauche) → Sécurité → **Créer un
jeton**. Puis dans `~/trano/.env` sur le serveur :

```
TRANO_HA_URL=http://192.168.1.65:8123
TRANO_HA_TOKEN=<le nouveau jeton>
```

```bash
cd ~/trano && docker compose up -d
```

> ⚠️ **`docker compose restart` ne suffit pas** : il ne relit pas `env_file`.
> Il faut `up -d`, qui recrée le conteneur.

Vérifier : `curl -s localhost:3001/api/config`, puis le widget Maison de LifeOS
et un `trano__etat_maison` depuis Oby.

**À contrôler ensuite** : les surcharges d'appareils (`device_overrides` dans
`trano.db`) référencent des `entity_id`. Beaucoup se régénèrent à l'identique
(les Shelly dérivent de la MAC, l'Envoy du numéro de série), mais les
renommages manuels sont perdus et les surcharges correspondantes deviennent
inertes. Réglages → Appareils.

### 7. Sauvegardes

Le store d'add-ons manque, mais **les sauvegardes marchent** : l'intégration
`backup` de HA couvre toutes les méthodes d'installation, container compris.
Réglages → Système → Sauvegardes → sauvegarde automatique. Elles atterrissent
dans `~/homeassistant/config/backups/` sur l'hôte, donc hors du conteneur.

À noter : les sauvegardes de l'engine Oby (`data_jobs.rs`) ne couvrent que
`OBY_DATA_DIR`. Home Assistant est un périmètre séparé.

### 8. Éteindre la VM Freebox

Une fois que tout répond : `mafreebox.freebox.fr` → VMs → arrêter puis
supprimer la VM Home Assistant, et libérer le bail de `192.168.1.158`.

## Mettre à jour

Pas de bouton « mettre à jour » — c'est la contrepartie du conteneur. Home
Assistant publie une version majeure par mois, avec des changements cassants
annoncés dans les notes de version : prendre une sauvegarde avant.

```bash
cd ~/homeassistant && docker compose pull && docker compose up -d
```

Revenir en arrière : remplacer `:stable` par la version voulue
(ex. `:2026.8.1`) dans `docker-compose.yml`, puis `docker compose up -d`.

## Références

| Sujet | Document |
|---|---|
| Trano en conteneur, à côté de HA | [`deploy/README.md`](README.md) |
| Ce que Trano lit dans HA (areas, entités, WebSocket) | [`docs/architecture.md`](../docs/architecture.md) |
| Les entités énergie de la maison | `apps/web/src/config/energy.ts` |
| Les outils de la maison servis à Oby | [`docs/mcp_oby.md`](../docs/mcp_oby.md) |
| Le serveur, systemd, l'engine Oby | `Atlas/engine/docs/deploy-linux.md` (dépôt Atlas) |
