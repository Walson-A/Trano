# Modèle de données « famille » — décisions et chantier

> **2026-08-14.** Ce document fixe les décisions prises avec Walson. **Seule
> l'étape 0 (sauvegardes) est implémentée** ; tout le reste est encore à écrire.
> Les docs qui décrivent l'existant (`profiles.md`, `architecture.md`) ne
> changeront qu'au fur et à mesure du code — sinon elles mentiraient. Les cases
> cochées du chantier sont la seule source de vérité sur l'avancement.

## Pourquoi ce chantier

L'inventaire de la base a montré une app **configurée mais pas habitée** :

- **5 profils**, un seul rempli (Argan). Les 4 autres n'ont ni favori, ni pièce.
- **`dashboard_layout` vide pour les cinq.** Jamais utilisé par personne.
- **`shopping_items` : 0 ligne.** La liste de courses n'a jamais servi.
- **11 pièces**, soignées : la seule table vraiment vivante. C'est Walson qui
  l'a remplie, une fois, en juillet.

La cause n'est pas le design des écrans. **Personne n'a l'app**, parce que ce
n'est pas une app : il n'y a rien à installer sur un téléphone, et l'iPad mural
n'a jamais été posé. Refondre l'UI sans régler ça produirait les mêmes tables
vides, en plus joli.

D'où l'ordre retenu : **les données d'abord, l'app ensuite, le visuel en
dernier.**

## Ce qui a été décidé

### Distribution — natif Expo pour les poches, web pour les écrans fixes

Ce n'est pas « les deux » par indécision, c'est une répartition par nature
d'écran.

- **Web** pour l'iPad mural et les PC : ces écrans ont une page *réellement
  ouverte*, donc le WebSocket + l'overlay interphone y font mieux qu'une
  notification. Sur PC fermé, le Web Push prend le relais — il **sonne** sur
  desktop, contrairement à iOS.
- **La TV, les Freebox et l'Apple TV ne sont dans aucun de ces deux cas** :
  personne n'y laisse une page ouverte. Elles passent par HA, qui les connaît
  déjà comme `media_player` (canal 4 de `notifications_and_mobile.md`).
- **Natif Expo** pour les cinq téléphones : c'est la seule voie qui donne le son,
  la présence en arrière-plan et les alertes critiques.
- **Distribution** : TestFlight en **testeurs internes** (aucune Beta App Review,
  jusqu'à 100 personnes) pour iOS, APK `eas build --profile preview` pour
  Android. **Pas de publication App Store** — les builds expirent au bout de
  90 jours, ce qui est accepté.

Trois limites d'iOS ont tranché contre la PWA :

| | PWA iOS | Natif |
|---|---|---|
| Son sur notification | ❌ **toujours muette** | ✅ son personnalisé |
| Alerte critique (perce le silencieux) | ❌ impossible par conception | ✅ avec entitlement |
| Localisation en arrière-plan | ❌ | ✅ |

> Les web apps installées sur l'écran d'accueil **fonctionnent** dans l'UE :
> Apple avait annoncé leur retrait avec iOS 17.4 puis **est revenue sur sa
> décision** en mars 2024. Ce n'est donc pas une interdiction qui écarte la PWA,
> ce sont les trois limites ci-dessus.

### Alertes critiques — ça ne bloque rien

L'entitlement Apple est une barrière de **provisioning**, pas d'App Review :
rester sur TestFlight ne l'évite pas, et sans lui la signature échoue en release.
**Mais il n'est pas sur le chemin critique** :

- **Sons personnalisés** : aucune approbation nécessaire, n'importe quelle app
  native embarque sa sonnerie.
- **Time Sensitive** : l'entitlement s'ajoute dans Xcode, **sans validation
  Apple**. Perce les modes Concentration.
- **Critical Alerts** n'apporte qu'une chose en plus : sonner quand le téléphone
  est **physiquement en silencieux ou en Ne Pas Déranger**.

Donc : on construit avec sons + Time Sensitive, **et on demande l'entitlement en
parallèle**, justifié sur les vrais scénarios de sécurité (fuite d'eau,
intrusion, fumée — pas « app maison »). Refus d'Apple = rien de construit n'est
perdu.

## Le modèle cible

### `profiles`

| | |
|---|---|
| **Gardé** | `id`, `name`, `avatar`, `color`, `favorites`, `created_at` |
| **Ajouté** | `kind` — `'person'` \| `'house'` |
| **Supprimé** | `is_kid`, `favorite_rooms`, `room_ids` |
| **Inchangé pour l'instant** | `dashboard_layout` (non prioritaire) |

**`is_kid` disparaît** : à `0` pour les cinq, et tout le monde est majeur. C'était
le seul concept de permission du modèle, il ne s'appliquait à personne. Il ne
sera **pas** remplacé par un `role` générique : un invité n'est pas « un profil
avec un drapeau », ce sera un autre concept le jour où il existera.

**`favorite_rooms` disparaît** : par défaut on affiche la pièce de la personne
avec tous ses appareils. Plus rien à configurer.

**Un profil « Maison »** (`kind='house'`) porte tous les écrans partagés. Ce
n'est pas une astuce pour éviter un `NULL` : `profiles.md` décrit déjà « la
tablette du salon peut rester sur un profil Maison ». Le discriminant `kind` est
indispensable — sans lui, « qui est là » afficherait *Maison* comme présente, le
sélecteur la proposerait comme une personne, et elle aurait des préférences de
notification. Sa suppression doit être **interdite côté API**.

### `profile_rooms` — nouvelle table de liaison

`profile_id` → `profiles.id` et `room_id` → `rooms.id`, **vraies FK**,
`ON DELETE CASCADE`, clé primaire sur le couple.

Une personne a plusieurs pièces **et** une pièce a plusieurs personnes : c'est du
plusieurs-à-plusieurs, donc une table de liaison, pas une colonne.

**Correction du 2026-08-14** : j'avais écrit ici que supprimer une pièce laissait
un identifiant mort « que rien ne nettoie ». **C'était faux** — `routes/rooms.ts`
nettoie bien les références au moment de la suppression. L'argument réel est plus
modeste, mais tient : ce nettoyage est **manuel et à réécrire dans chaque endroit
qui supprimera une pièce**, alors que `ON DELETE CASCADE` est structurel et ne
s'oublie pas. S'ajoute le fait qu'un tableau JSON ne se joint pas et ne se
contraint pas.

`PRAGMA foreign_keys = ON` est **déjà posé** (`db.ts:21`) — les contraintes sont
donc réellement appliquées (vérifié : supprimer une pièce retire le lien et
laisse le profil intact).

### `rooms` — inchangée

Elle existe déjà, 11 pièces (`id`, `name`, `floor`, `icon`, `sort_order`). Rien à
créer.

### `user_devices` — nouvelle table

> **Le nom est délibéré.** « Appareil » désigne déjà les **entités HA** (lampes,
> prises, volets) dans tout le code : le type `Device`, `DeviceCard`,
> `device_overrides`. Ce sont deux choses sans rapport — les entités HA ne sont
> même pas stockées, elles viennent de HA en direct. Confondre les deux noms
> rendrait le code illisible en trois semaines.

- **Identité** : `id` (généré par le client, stable), `name`, `profile_id`
  **NOT NULL** (la Maison pour les écrans partagés)
- **`type`** : `phone | tablet | pc | tv | kiosk` — **le champ le plus
  structurant** : il décide qui rapporte la présence, par quel canal on alerte,
  et quelle icône s'affiche
- **Statique** : `platform`, `model`, `os_version`
- **Valeur courante**, écrasée à chaque heartbeat : `battery_pct`,
  `battery_charging`, `is_home`, `last_seen_at`
- **`push_token`**, nullable, **rempli uniquement par l'app native**

**Pas de blob JSON.** Ce qui ne bouge jamais mérite une colonne : ça s'affiche et
ça se requête. Pas d'historique non plus — si les courbes de batterie deviennent
un besoin, ce sera une table dédiée.

### Les règles qui tiennent le modèle

- **`online` et la présence d'une personne se calculent, ne se stockent pas** —
  `now - last_seen < 90 s`, comme le fait déjà l'engine d'Oby (`presence-hub.md`).
- **Une personne est présente si au moins un de ses appareils l'est.** Stocker la
  présence sur le profil *et* sur l'appareil, c'est deux sources de vérité pour
  une seule question : elles divergeront, et c'est toujours celle affichée qui
  aura tort.
- **Seuls les `type='phone'` rapportent la présence.** Un kiosque « présent » ne
  veut rien dire.
- **La zone, pas la coordonnée.** Un géofence sur l'adresse de la maison suffit à
  « qui est là ». Une trace de coordonnées, c'est l'historique des déplacements
  de cinq adultes dans une base sauvegardée — à protéger, à purger, pour rien.

  > **Précisé le 2026-08-14, sur une idée de Walson** : le géofence est évalué
  > **sur le téléphone**, et seul le franchissement est envoyé. Il n'y a donc
  > aucune coordonnée à protéger — non par politique, mais parce qu'elle
  > n'existe nulle part. C'est la différence entre une intention et une
  > garantie ; à la question « qu'est-ce que Trano sait de mes déplacements ? »,
  > la réponse est « rien ».
  >
  > À reprendre d'AtlasMobile : surveiller **une seule région** est pris en
  > charge par l'OS, sans réveiller l'app — le coût en batterie est quasi nul,
  > très loin du « suivi permanent » qui relève une position tous les 100 m.

### La présence par le routeur : explorée, écartée

La Freebox expose un `device_tracker` par appareil vu sur son wifi — **130 au
registre, 122 désactivés par l'intégration**. L'idée était séduisante : une
présence qui marche sans installer quoi que ce soit, téléphone verrouillé au
fond d'une poche.

**Elle ne tient pas, à cause de la randomisation d'adresse MAC.** Relevé en
réel : `iphone_de_walson` marquait « dernière activité : 6 août » alors que le
téléphone était connecté au wifi à cet instant. Les adresses Wi-Fi privées d'iOS
et d'Android tournent, **chaque rotation crée un nouvel appareil pour la
Freebox**, donc un traqueur neuf — et l'ancien reste figé sur `not_home` pour
toujours. D'où quatre `styledbykev`, deux `iphone_de_walson` et cinq `iPhone`
anonymes : les mêmes téléphones sous des dizaines d'adresses successives.

Toutes les MAC relevées étaient « localement administrées » (`5E:`, `12:`,
`EA:`, `CE:`, `FE:`…), signature de la randomisation. Aucun mapping figé n'y
survit.

La parade existerait — désactiver l'adresse privée **pour ce réseau** sur chaque
téléphone — mais c'est cinq réglages à faire faire à la famille, soit
exactement l'effort qu'on cherchait à éviter. **La présence des personnes
passera donc uniquement par le géofence de l'app native.**

Ce qui reste utile de la Freebox : les appareils qui **ne randomisent pas** —
télé, Shelly, players, tablette murale. Leur MAC est stable. Ça ne sert pas à
« qui est là », mais ça pourra servir à « la télé du salon est allumée » sans
rien installer.

### L'écran de première connexion

Le moment exact où les gens acceptent de répondre à deux questions ; après, plus
jamais. Il **préremplit** ce que la plateforme donne, l'utilisateur **ajuste et
valide** : nom de l'appareil, propriétaire (ou « Maison »).

Ce qu'on peut préremplir dépend entièrement du navigateur :

| | Modèle exact | OS + version | Batterie |
|---|---|---|---|
| Chrome Android | ✅ | ✅ | ✅ |
| Chrome / Edge PC | ❌ (vide sur desktop) | ✅ | ✅ si portable |
| **iPhone / iPad, tous navigateurs** | ❌ | partiel | ❌ |
| App native Expo | ✅ | ✅ | ✅ |

Les **Client Hints** (`getHighEntropyValues`, qui donnent `model`) sont
**Chromium uniquement**. La **Battery Status API** n'a jamais été implémentée par
WebKit (jugée trop identifiante) — et comme Apple impose WebKit à tous les
navigateurs iOS, **aucun navigateur sur iPhone n'y a accès**. D'où l'écran de
validation : il se dégrade proprement là où on ne sait rien.

## L'interphone — déjà construit, et sans HA

À conserver tel quel, c'est le bon design :

- `POST /api/intercom` → `broadcastMessage()` sur le **WebSocket propre à
  Trano** → `IntercomOverlay.tsx` affiche la surcouche plein écran.
- **HA n'intervient pas** dans l'affichage. Il ne sert qu'à faire sonner les
  téléphones, et c'est le client émetteur qui l'appelle.
- Le ding-dong est **synthétisé en WebAudio**, aucun fichier son.

Trois cas, dont un impossible :

| Situation | Interphone plein écran |
|---|---|
| Page ouverte (kiosque, PC) | ✅ **déjà le cas** |
| Onglet ouvert en arrière-plan | ⚠️ s'affiche, mais invisible tant qu'on ne revient pas |
| PC, PWA installée fermée | ⚠️ notification **sonore**, puis clic → l'interphone s'ouvre. Pas de plein écran spontané |
| iPhone, app fermée | ❌ en web (notification muette) → c'est le rôle de l'app native |
| **TV, Freebox, Apple TV** | ➡️ **canal 4** : HA les connaît en `media_player`, il les réveille |

C'est pour le troisième cas, et lui seul, que l'app native existe.

## Ce qu'on ne construit pas

- **Le Web Push sur iOS** — la notification y est toujours muette. Sur **PC** en
  revanche il est conservé : la PWA installée reçoit et **sonne** même fermée, et
  un clic ouvre l'interphone. Voir `notifications_and_mobile.md` §2, canal 2.
- **Le journal d'usage** — son seul client était de déduire les favoris ; les
  favoris manuels sont conservés et la disposition du dashboard est reportée,
  donc l'argument tombe. C'est aussi la seule table qui grossirait sans limite,
  et un journal de ce que cinq adultes font chez eux. Il s'ajoutera plus tard
  sans rien casser (table en ajout seul, aucune dépendance). **Déclencheur** : le
  jour où l'app doit remonter ce que les gens utilisent sans le leur demander.
- **Un `role` générique** à la place d'`is_kid`.

## Le chantier, dans l'ordre

### 0. Une sauvegarde de `trano.db` qui marche — **avant tout le reste**

La première tâche du chantier **supprime trois colonnes** dans la base où vivent
les 5 profils et les 11 pièces de la famille. Or, relevé le 2026-08-14 :

- **Rien ne sauvegarde `trano.db`.** Ni cron, ni timer systemd, ni dossier de
  sauvegarde sur le serveur.
- Le commentaire en tête de `db.ts` affirme pourtant que la base est *« persistée
  et incluse dans les sauvegardes HA »*. **C'était vrai du temps de l'add-on HAOS
  sur la Freebox** ; depuis le passage en conteneur Docker sur tranoserver, c'est
  faux. Le commentaire promet une protection qui n'existe plus — **à corriger en
  même temps**, sinon il rendormira le prochain qui le lira.
- **Piège SQLite** : `trano.db` fait **4 Ko** et `trano.db-wal` **214 Ko**. Tout
  est dans le WAL, non checkpointé. Un `cp trano.db` copierait donc **une base
  quasi vide, sans erreur**. Il faut `VACUUM INTO` (que `node:sqlite` sait
  exécuter) ou un checkpoint préalable.

- [x] Sauvegarde par l'**Online Backup API** (`node:sqlite` l'expose, comme Oby)
- [x] Vérification **par réouverture** de la copie + comparaison des comptages
- [x] `quick_check` d'abord : une base corrompue n'est jamais sauvegardée
      — *vérifié en corrompant volontairement une copie : la sauvegarde saine a survécu*
- [x] Ordonnanceur quotidien **dans le serveur Node**, avec rattrapage au démarrage
- [x] Rotation 7 quotidiens / 4 hebdomadaires
- [x] Routes `GET /api/backup/status` et `POST /api/backup/run`
- [x] **`TZ=Europe/Paris` posé** — sans ça le conteneur tourne en UTC et la passe
      de 01:30 s'exécute à 03:30 heure de Paris
- [x] Commentaire mensonger de `db.ts` corrigé (« incluse dans les sauvegardes HA »)
- [x] **État affiché dans l'écran Réglages** — sauvegarde locale, son âge, et le
      dépôt hors-site, parce que les trois tombent en panne séparément
- [x] **Les 3 secrets CI posés** (`TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET`,
      `TRANO_DEPLOY_SSH_KEY`) — le déploiement sur le serveur est automatique
      depuis un merge sur `main`, plus besoin de tirer l'image à la main
- [x] **Dépôt chez Oby** pour le hors-site chiffré — le conteneur tourne sous l'uid
      1000, donc aucun bricolage de permissions. Couplage documenté des deux côtés

### 1. Socle données (serveur)

- [ ] `profiles` : ajouter `kind`, supprimer `is_kid`, `favorite_rooms`, `room_ids`
- [ ] **Préserver les 3 favoris d'Argan** — seule donnée personnalisée de toute la base
- [ ] Créer `profile_rooms` et y recopier les `room_ids` existants (2 lignes : Argan, Papa)
- [ ] Insérer le profil **Maison**, et interdire sa suppression côté API
- [ ] Créer `user_devices`
- [ ] Retirer du code le test `isKid` (garde-fou des Réglages) et l'usage de `favoriteRooms`
- [ ] API : `user_devices` register / heartbeat / list, calquée sur `devices/*` de l'engine Oby

### 2. Présence

- [ ] Géofence sur l'adresse de la maison, **une seule zone**
- [ ] Reprendre les gardes d'AtlasMobile (`location-tracking.md`) : **iOS refire un
      « Enter » à chaque ré-enregistrement quand on est déjà dans la zone** → signature
      du jeu de régions + déduplication par lieu courant. Sans ça : « Papa est arrivé »
      à chaque ouverture de l'app.
- [ ] Présence de la personne **calculée**, jamais stockée

### 3. App native (`apps/mobile`, Expo) — **le prochain gros morceau**

> **Elle est devenue le seul chemin vers la présence** (la piste routeur est
> écartée, voir plus haut). Elle porte donc trois choses qu'aucune autre surface
> ne peut faire : le géofence, le son sur notification, et les alertes critiques.

**Le socle serveur est déjà là et vérifié en production** — inutile d'y toucher :

| Route | Rôle |
|---|---|
| `POST /api/user-devices/register` | upsert par identifiant stable généré par le client |
| `POST /api/user-devices/:id/heartbeat` | `{ isHome?, batteryPct?, batteryCharging?, pushToken? }` |
| `GET /api/presence` | dérivée, trois états (`true` / `false` / `null` = on ne sait pas) |
| `GET /api/user-devices` | liste, `online` calculé (90 s) |

Un changement de `isHome` **sur un `type='phone'`** diffuse déjà sur le topic WS
`presence`, et c'est là que se branchera la notification « Papa vient de
partir » — le seul endroit qui connaisse l'instant exact de la transition.

#### Le géofence

- [ ] **Une seule région** : l'adresse de la maison. Pas de lieux multiples.
- [ ] **Évalué sur le téléphone, seul le franchissement est envoyé.** Aucune
      coordonnée ne quitte l'appareil — c'est une garantie, pas une politique.
- [ ] Reprendre `expo-location` + `expo-task-manager` d'AtlasMobile
      (`AtlasMobile/docs/location-tracking.md`), **mais pas son suivi permanent** :
      ici on surveille une région, ce que l'OS prend en charge sans réveiller
      l'app — coût batterie quasi nul.
- [ ] ⚠️ **Le piège déjà documenté** : iOS refire un « Enter » à chaque
      ré-enregistrement du géofence quand on est déjà dedans. Sans la signature
      du jeu de régions et la déduplication par lieu courant, la famille reçoit
      « Papa est arrivé » à chaque ouverture de l'app.
- [ ] Le géofence exige un **build standalone** — indisponible en Expo Go.
- [ ] iOS demandera la permission **« Toujours »**, avec ses rappels
      périodiques. Qui refuse n'a pas de présence : il n'y a plus de repli.

#### Le reste

- [x] **Squelette Expo posé** (SDK 57, React Native 0.86) — voir
      `apps/mobile/README.md`. Six onglets aux noms du web, « Qui est là » en
      tête de l'accueil, adresse du serveur réglable. Quatre décisions qui
      engagent la suite :
      - **Pas un workspace npm.** La racine liste désormais `apps/server`,
        `apps/web`, `packages/*` au lieu de `apps/*` : `npm ci` tourne à la
        racine à chaque livraison sur `main`, et le `Dockerfile` du serveur
        aurait avalé React Native. L'app a son propre `package-lock.json`.
      - **Client HTTP + WebSocket déplacés dans `@trano/shared/api`**, utilisés
        tels quels par les deux apps — seule l'adresse diffère. Entrée
        volontairement séparée de `.` : le serveur importe les types sans
        hériter de `fetch` et `WebSocket`, absents de son `lib`.
      - **NativeWind**, donc les mêmes chaînes de classes que le web se
        recopient. Tailwind 3 côté natif (NativeWind n'a pas la v4) ; sans
        effet visible, mais `hover:`, `group-hover:` et `backdrop-blur`
        n'existent pas.
      - **Modules natifs installés avant d'être utilisés** (`expo-location`,
        `expo-task-manager`, `expo-notifications`, `expo-battery`,
        `expo-network`, `expo-crypto`) : une mise à jour par les airs ne
        transporte que du JavaScript, donc chaque module ajouté plus tard
        coûterait une réinstallation à toute la famille.
- [x] **Mises à jour par les airs actives.** Projet EAS `@walsondev/trano`
      (`eb053b71-cc9e-469c-b011-5e9b978ac986`), canaux `development` /
      `preview` / `production`, version d'exécution en `fingerprint`.
      Vérification faite au premier plan **et** au lancement : une app qu'on ne
      tue jamais ne se « lance » quasiment plus.
- [ ] **L'accès hors maison — tunnel Cloudflare, une seule route.**
      `http://192.168.1.65:3001` ne répond pas hors du Wi-Fi, or le géofence doit
      signaler un départ **au moment précis** où le Wi-Fi vient d'être perdu.
      Les deux pistes notées ici avant le 2026-08-14 sont écartées :
      - **la file d'envoi rejouée ne marche pas.** La prochaine occasion de
        joindre le serveur, c'est le retour à la maison : « Papa est parti »
        serait livré au moment où il rentre ;
      - **Tailscale** n'est pas écarté pour son prix — le plan Personnel couvre
        6 utilisateurs et un nombre illimité d'appareils, gratuitement — mais
        parce qu'il faut le faire installer à cinq personnes et le laisser
        toujours actif sur leur téléphone.
      Retenu : un **tunnel Cloudflare** sur le serveur, rien sur les téléphones,
      ne routant **qu'un seul chemin** (`/api/presence-report`), porteur d'un
      jeton sur le modèle de `/api/mcp`. Le même tunnel sert le point HTTPS
      public que la skill Alexa attend, et donnerait le HTTPS qui débloque le
      Web Push sur les PC. Demande un domaine (`walsonrene.com`, sous-domaines
      à volonté) dont les serveurs de noms pointent vers Cloudflare.
- [ ] ⚠️ **Le cloisonnement par IP échoue en silence derrière un tunnel.**
      `trustProxy` n'est pas activé, donc `req.ip` est le pair TCP — et
      `cloudflared` tourne sur la même machine, donc se connecte depuis
      `127.0.0.1`. Une liste blanche RFC1918 côté Fastify **laisserait passer
      tout le trafic du tunnel** en donnant l'impression du contraire. Le
      filtrage doit vivre dans l'`ingress` de cloudflared, pas dans le serveur.
- [ ] 🔴 **`/api/config` livre le jeton HA, et c'est exploitable aujourd'hui.**
      Pas besoin d'attendre le tunnel : `fastifyCors, { origin: true }`
      (`index.ts:34`) reflète n'importe quelle origine, donc **n'importe quel
      onglet ouvert dans la maison peut lire la réponse en JavaScript**. Un
      jeton longue durée HA survit à tout — fermeture du tunnel, arrêt du
      conteneur — jusqu'à révocation manuelle.
      Correctif en trois temps, établi par la session dédiée :
      1. **CORS en liste blanche** — tout de suite. Pas `origin: false`, qui
         casserait le widget Maison de LifeOS (autre origine, voir
         `docs/mcp_oby.md`). Le web de Trano est servi en même origine, et
         l'app native n'est pas soumise au CORS.
      2. **Relais WebSocket** — moins cher que prévu : toute la surface HA du
         navigateur est WebSocket (8 types de messages, aucun REST, aucun
         `camera_proxy`). Un relais transparent qui **remplace `access_token`
         dans la trame `auth`** couvre 100 % du besoin : ~80 lignes serveur,
         ~10 lignes web, et **les 12 fichiers qui consomment `useHA()` ne
         bougent pas**. Le jeton ne quitte alors plus la machine.
      3. **Authentification de l'app entière** — seulement le jour du tunnel.
- [ ] Écran de première connexion : **mêmes trois questions que le web**
      (nom, type, propriétaire — et la pièce sauf pour un téléphone), en
      préremplissant ce que la plateforme donne. Voir
      `apps/web/src/features/Devices/DeviceSetup.tsx`, la logique est la même
      et la récolte y est bien plus riche qu'en navigateur.
- [ ] Push : jeton Expo → `user_devices.push_token` (déjà en base, jamais
      renvoyé par l'API — seul `hasPushToken` sort)
- [ ] Sons personnalisés + **Time Sensitive** : aucune approbation Apple
- [ ] **Demander l'entitlement Critical Alerts en parallèle**, tôt — la revue
      prend des semaines et un refus au premier essai est courant. Il n'est
      **pas** sur le chemin critique : sans lui tout marche sauf « sonner malgré
      le silencieux ».
- [ ] EAS : TestFlight **testeurs internes** (aucune Beta App Review), profil
      `preview` pour Android. Pas de publication App Store.

#### Ce que l'app débloque et que le web ne pourra jamais

Le web de Trano est servi en **HTTP clair**, donc hors contexte sécurisé :
Service Worker, Web Push et géolocalisation y sont **absents**, pas dégradés.
L'app native contourne tout ça sans dépendre d'un certificat.

### 3bis. Canaux d'alerte (voir `notifications_and_mobile.md`)

- [ ] **Web Push desktop** : clés VAPID + service worker, PC uniquement
- [ ] **Canal 4** : `media_player.play_media` via HA pour TV / Freebox / Apple TV
- [ ] **Installer une voix TTS française** — l'instance n'a que
      `tts.google_translate_en_com`, qui lira les messages avec une voix anglaise

### 4. Correctifs sur l'existant

- [ ] **`IntercomOverlay.playChime()` : le son ne sort pas sur un écran non touché.**
      Le `try/catch` attrape une exception qui n'arrive jamais — quand l'autoplay est
      bloqué, `new AudioContext()` ne lève rien, il rend un contexte `suspended` et le
      son ne part pas. Débloquer le contexte à la première interaction et le réutiliser.
      **C'est exactement le cas du kiosque**, l'écran que personne ne touche.
- [ ] `navigator.vibrate` : sans effet sur iOS, à ne pas compter comme repli.
- [ ] **`device_overrides` n'existe pas en production** : la table est créée par `dev`,
      le serveur tourne sur `main`. À garder en tête au déploiement.

## Ce qui reste ouvert

- **Les préférences de notification** — qui veut quoi, quand. Par personne, pas par
  appareil (« Papa veut les alertes solaires » vaut sur tous ses écrans). Table à part,
  prochain sujet.
- **La liste de courses** — jamais utilisée. À repenser plutôt qu'à reprendre.
- **L'énergie** — Papa y est en permanence, c'est le sujet le plus important de l'app,
  et il n'a pas encore été travaillé. Dépend de la réinstallation de l'Envoy et de la
  Zendure côté HA (`deploy/home-assistant.md`).
- **Le kiosque** : jamais posé, pas une seule fois. Le correctif audio ci-dessus est
  donc une précaution *avant* mise en service, pas une panne en cours.

## Références

| Sujet | Document |
|---|---|
| Profils tels qu'ils existent aujourd'hui | [`docs/profiles.md`](../profiles.md) |
| Canaux d'alerte | [`docs/notifications_and_mobile.md`](../notifications_and_mobile.md) |
| Home Assistant sur le serveur | [`deploy/home-assistant.md`](../../deploy/home-assistant.md) |
| Présence et heartbeat, déjà implémentés | `AtlasMobile/docs/presence-hub.md` (dépôt Atlas) |
| Localisation, géofencing et ses pièges | `AtlasMobile/docs/location-tracking.md` (dépôt Atlas) |
