# Stratégie de Notifications & Application Mobile (Expo)

Ce document décrit l'architecture visée pour les notifications, les alertes critiques et l'extension mobile de **Trano**.

> **Révisé le 2026-08-14** — décisions prises avec Walson, détail et raisons dans
> [`docs/plans/2026-08-14-modele-donnees-famille.md`](plans/2026-08-14-modele-donnees-famille.md) :
>
> - **Le canal 2 (Web Push / VAPID) est abandonné.** Sur iOS une notification PWA est
>   **toujours muette** — il n'existe même pas d'entrée « Son » dans les réglages pour les
>   web apps. Et sur les écrans toujours allumés, le canal 1 fait *mieux* qu'une
>   notification. Maintenir des clés VAPID et un service worker pour un canal strictement
>   inférieur aux deux autres, c'est de la dette pour rien.
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

## 2. Architecture des Notifications (3 Canaux)

```
                       ┌─────────────────────────────────┐
                       │       Serveur Trano            │
                       │    (@trano/server / Node)      │
                       └──────────────┬──────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│  WebSocket   │              │   Web Push   │              │     Expo     │
│  Temps Réel  │              │ (VAPID/PWA)  │              │(APNs / FCM)  │
└──────┬───────┘              └──────┬───────┘              └──────┬───────┘
       │                             │                             │
       ▼                             ▼                             ▼
Écrans ouverts               Navigateurs fermés            App Mobile Native
(TV, PC, Tablette)           (PC, Chrome Android)          (TestFlight / APK)
- Bannière modale            - Notification OS             - Alerte Critique iOS
- Alarme Web Audio                                         - Bypass DND Android
```

### Canal 1 : Diffusion WebSocket (Écrans actifs & Kiosques) — **déjà en place**
- **Cible :** Tout écran où Trano est ouvert (Tablette murale salon, TV, PC ouvert).
- **Fonctionnement :** `@trano/server` envoie un événement d'urgence via WebSocket.
  L'interphone l'utilise déjà : `POST /api/intercom` → `broadcastMessage()` →
  `IntercomOverlay.tsx`. **Home Assistant n'intervient pas** dans l'affichage.
- **Rendu :** surcouche plein écran + ding-dong **synthétisé en WebAudio** (aucun fichier son).
- ⚠️ **Défaut connu, à corriger :** le son ne sort pas sur un écran que personne n'a touché
  depuis le chargement. Le `try/catch` de `playChime()` attrape une exception qui n'arrive
  jamais — quand l'autoplay est bloqué, `new AudioContext()` ne lève rien, il rend un
  contexte `suspended` et le son ne part pas. Il faut débloquer le contexte à la première
  interaction et le réutiliser. **C'est précisément le cas du kiosque et de la TV**, les
  deux écrans pour lesquels ce canal existe.

### ~~Canal 2 : Web Push API (Navigateurs & PWA)~~ — **abandonné le 2026-08-14**
- **Cible visée :** PC et smartphones Android avec navigateur fermé.
- **Pourquoi on ne le construit pas :** muet sur iOS par conception ; sur Android et PC il
  double le canal 3 sans rien apporter ; et sur les écrans toujours allumés le canal 1 est
  supérieur (overlay plein écran + son, plutôt qu'une bannière).
- **Ce qui le ferait revenir :** un cas réel de « PC fermé, appel manqué » qui gêne
  quelqu'un. Pas avant.

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
