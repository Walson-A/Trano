# Stratégie de Notifications & Application Mobile (Expo)

Ce document décrit l'architecture visée pour les notifications, les alertes critiques et l'extension mobile de **Trano**.

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

### Canal 1 : Diffusion WebSocket (Écrans actifs & Kiosques)
- **Cible :** Tout écran où Trano est ouvert (Tablette murale salon, TV, PC ouvert).
- **Fonctionnement :** `@trano/server` envoie un événement d'urgence via WebSocket.
- **Rendu :** Affichage d'une modal/banner d'alerte + déclenchement de l'API `Web Audio` du navigateur pour jouer une sonnerie d'alarme à 100% de volume.

### Canal 2 : Web Push API (Navigateurs & PWA)
- **Cible :** PC et smartphones Android avec navigateur fermé.
- **Fonctionnement :** Clefs VAPID configurées sur `@trano/server` et enregistrement d'un Service Worker dans `@trano/web`.
- **Rendu :** Notification système native poussée par le Push Service du navigateur.

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
