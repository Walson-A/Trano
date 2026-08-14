# Stratégie de Notifications & Application Mobile (Expo)

Ce document décrit l'architecture visée pour les notifications, les alertes critiques et l'extension mobile de **Trano**.

> **Révisé le 2026-08-14** — décisions prises avec Walson, détail et raisons dans
> [`docs/plans/2026-08-14-modele-donnees-famille.md`](plans/2026-08-14-modele-donnees-famille.md) :
>
> - **Le canal 2 (Web Push / VAPID) est restreint au desktop.** Sur iOS une notification PWA
>   est **toujours muette** ; sur PC en revanche elle **sonne**, même application fermée, et
>   un clic ouvre l'interphone en plein écran. C'est exactement le cas « PC fermé ».
> - **Un quatrième canal apparaît : les écrans qui ne sont jamais ouverts (TV, Freebox,
>   Apple TV).** Ils ne peuvent recevoir ni WebSocket ni push — mais **HA les connaît déjà
>   comme `media_player`** et sait leur pousser un media. Voir §4.
> - **Le canal 3 est confirmé en natif Expo**, distribué en **TestFlight testeurs internes**
>   (aucune Beta App Review) et en APK `preview` pour Android. Pas de publication App Store.
> - **Les alertes critiques ne sont pas sur le chemin critique.** Sons personnalisés et
>   **Time Sensitive** ne demandent *aucune* approbation Apple ; l'entitlement n'ajoute que
>   « sonner malgré le silencieux ». On construit sans, on le demande en parallèle.

---

## 1. Objectifs & Constats

1. **Multi-écrans & Multi-utilisateurs :** 
   - L'expérience doit fonctionner aussi bien sur des smartphones (iOS/Android), des PC, des tablettes murales (mode Kiosque) et des télévisions.
   - Les invités et membres du foyer ne doivent pas tous être obligés d'installer l'application Home Assistant Companion.
2. **Alertes d'urgence :**
   - Nécessité de faire sonner les appareils en cas d'urgence (fuite d'eau, intrusion, fumée), même lorsque les téléphones sont en mode silencieux ou "Ne Pas Déranger".

---

## 2. Architecture des Notifications (4 Canaux)

```
                    ┌─────────────────────────────────┐
                    │        Serveur Trano            │
                    │     (@trano/server / Node)      │
                    └────────────────┬────────────────┘
                                     │
     ┌───────────────┬───────────────┼───────────────┬───────────────┐
     ▼               ▼               ▼               ▼
┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────────┐
│ WebSocket │  │ Web Push  │  │   Expo    │  │  HA media_player│
│temps réel │  │(VAPID/PWA)│  │(APNs/FCM) │  │   (play_media)  │
└─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └────────┬────────┘
      │              │              │                 │
      ▼              ▼              ▼                 ▼
 Page ouverte    PC, PWA        Téléphones      Écrans jamais
 kiosque, PC     fermée          iOS/Android     ouverts : TV,
                                                 Freebox, Apple TV
 - overlay       - notif OK      - son perso     - HA réveille
   plein écran     + son           + Time Sens.    l'appareil
 - Web Audio     - clic → app    - alerte crit.  - TTS ou media
```

> **La TV n'est pas dans le canal 1.** L'architecture d'origine l'y rangeait ;
> c'était faux, personne ne laisse une page Trano ouverte sur la télé. Elle est
> passée au canal 4.

### Canal 1 : Diffusion WebSocket (Écrans actifs & Kiosques) — **déjà en place**
- **Cible :** Tout écran où une page Trano est **réellement ouverte** — tablette murale
  en kiosque, PC avec l'onglet ouvert. **Pas la TV** (voir §4).
- **Fonctionnement :** `@trano/server` envoie un événement d'urgence via WebSocket.
  L'interphone l'utilise déjà : `POST /api/intercom` → `broadcastMessage()` →
  `IntercomOverlay.tsx`. **Home Assistant n'intervient pas** dans l'affichage.
- **Rendu :** surcouche plein écran + ding-dong **synthétisé en WebAudio** (aucun fichier son).
- ⚠️ **Défaut connu, à corriger :** le son ne sort pas sur un écran que personne n'a touché
  depuis le chargement. Le `try/catch` de `playChime()` attrape une exception qui n'arrive
  jamais — quand l'autoplay est bloqué, `new AudioContext()` ne lève rien, il rend un
  contexte `suspended` et le son ne part pas. Il faut débloquer le contexte à la première
  interaction et le réutiliser. **C'est précisément le cas du kiosque**, l'écran pour
  lequel ce canal existe et que personne ne touche.

### Canal 2 : Web Push API — **bloqué en l'état** (révisé le 2026-08-14)

> ⛔ **Trano est servi en HTTP clair** (`http://192.168.1.65:3001`), donc hors
> contexte sécurisé. Or le **Service Worker**, le **Web Push** et la
> **géolocalisation** y sont purement indisponibles — ce n'est pas une
> dégradation, c'est une absence. Ce canal ne peut donc pas exister tant que la
> maison n'est pas servie en HTTPS.
>
> Découvert le 2026-08-14 par un symptôme sans rapport apparent :
> `crypto.randomUUID is not a function` à l'enregistrement d'un appareil — la
> même règle de contexte sécurisé.
>
> **Ce qu'il faudrait** : un certificat pour le réseau local. Trois pistes, par
> ordre de simplicité — `tailscale serve` (déjà utilisé pour l'engine Oby, mais
> ne couvre que les appareils du tailnet, pas les tablettes murales), un nom de
> domaine réel pointant en 192.168.x avec un certificat Let's Encrypt par
> DNS-01, ou une autorité interne (impose d'installer le certificat racine sur
> chaque appareil de la maison).
>
> Tant que ce n'est pas fait, les téléphones passent par le canal 3 (natif) et
> les écrans fixes par le canal 1 (WebSocket) — qui, eux, marchent en clair.
- **Cible :** **PC uniquement**, PWA installée, application fermée.
- **Pourquoi ça vaut le coup sur PC :** le service de push du navigateur tourne en tâche de
  fond même app fermée, et **la notification sonne** sur desktop. Parcours réel :
  notification sonore → clic → l'interphone s'ouvre en plein écran.
- **Pourquoi pas sur iOS :** la notification arrive mais reste **toujours muette** — il
  n'existe même pas d'entrée « Son » dans les réglages iOS pour les web apps. Les
  téléphones passent donc par le canal 3, pas par celui-ci.
- **Limite qui vaut partout :** on ne peut **pas** peindre un plein écran sans clic.
  `clients.openWindow()` et `client.focus()` ne sont autorisés que depuis le gestionnaire
  de `notificationclick`. Le plein écran spontané n'existe que sur une page déjà ouverte
  (canal 1).

### Canal 3 : Application Native Expo (Alertes Critiques Mobile)
- **Cible :** Smartphones iOS (famille/membres du foyer) et Android.
- **Fonctionnement :** Package `apps/mobile` utilisant `expo-notifications` (APNs Apple + Google FCM).
- **Rendu :** Contournement du mode silencieux / "Ne Pas Déranger" via l'entitlement *Critical Alerts* (iOS) et canal prioritaire (Android).

---

## 3. Extension Mobile Native (`apps/mobile` avec Expo)

### Pourquoi Expo ?
- **Cross-platform :** Une seule codebase pour iOS et Android.
- **Distribution simplifiée (EAS Build) :**
  - **iOS :** Déploiement direct sur **TestFlight** (`eas build --platform ios`).
  - **Android :** Génération directe d'un fichier `.apk` / liens de preview sans validation Google Play (`eas build --platform android`).
- **Télémétrie native :** Lecture du niveau de batterie (`expo-battery`), état du réseau (`expo-network`) et retours haptiques.

### Intégration Monorepo
Dans le monorepo `Trano` :
- `apps/mobile` : Application React Native / Expo.
- `packages/shared` : Partage des types TS et utilitaires.
- Réutilisation du client WebSocket Home Assistant et des stores Zustand métier.

---

## 4. Canal 4 : les écrans jamais ouverts (TV, Freebox, Apple TV)

Ajouté le 2026-08-14. Il manquait à l'architecture d'origine, qui rangeait la TV
parmi les « écrans actifs » du canal 1 — **ce qu'elle n'est pas** : personne ne
laisse une page Trano ouverte sur la télé. Ces appareils ne peuvent recevoir ni
WebSocket ni Web Push.

**Mais Home Assistant les connaît déjà**, relevé sur l'instance le 2026-08-14 :

| Entité | Nom |
|---|---|
| `media_player.salon_2` | SALON (Cast — accepte `play_media`) |
| `media_player.walson_laptop` | Walson-Laptop (PC en renderer) |
| `media_player.salon_tele_salon` | Télé Salon |
| `media_player.thony_player_freebox_salon` | Freebox Salon |
| `media_player.chambre_freebox_argan` | Freebox Argan |

**Le principe : Trano ne gère pas ces écrans, il demande à HA de les utiliser.**
Un appel `media_player.play_media` réveille l'appareil et y pousse le contenu.

Pourquoi cette voie plutôt qu'un APK Android TV :

- Elle couvre **la TV, les deux Freebox et l'Apple TV** d'un coup ; un APK ne
  couvrirait que la TV Android.
- **Rien à installer, rien à enregistrer** : ces écrans ne sont pas des
  `user_devices`, ce sont des appareils de la maison que HA possède déjà. La
  séparation reste propre.
- Un APK Android TV garde du sens pour **naviguer dans l'app depuis le canapé** —
  c'est un autre besoin, pas celui de l'interphone.

**Sur une TV, faire parler la pièce vaut probablement mieux qu'afficher du
texte** que personne ne lit à quatre mètres.

> ⚠️ **Le TTS installé est en anglais** : `tts.google_translate_en_com`. Il lira
> « Le repas est prêt » avec une voix américaine. Une voix française est à
> installer avant de bâtir quoi que ce soit sur ce canal.
