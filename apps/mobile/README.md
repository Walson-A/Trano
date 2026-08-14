# Trano — l'app native

L'app que la famille installe sur son téléphone. Même vocabulaire, mêmes
couleurs et mêmes six onglets que le site ; ce qu'elle ajoute, c'est ce qu'un
navigateur ne peut pas faire.

## Pourquoi une app native alors que le site marche déjà

Trano est servi **en clair** sur le réseau de la maison (`http://…`). Or trois
capacités du navigateur sont réservées aux contextes sécurisés, et manquent donc
définitivement au site :

- les **notifications push** (Service Worker + Web Push) ;
- la **géolocalisation**, donc « qui est là » ;
- `crypto.randomUUID`, contourné à la main dans `apps/web/src/lib/deviceInfo.ts`.

Une coquille native autour d'une WebView aurait donné la même interface pour
rien : hors du réseau de la maison le serveur ne répond pas, et la page serait
blanche **précisément** au moment où le géofence sert.

## Ce qui est partagé avec le web, et ce qui ne l'est pas

React Native ne connaît ni `<div>`, ni `lucide-react`, ni `framer-motion` : les
vues ne se recopient pas telles quelles.

| | partagé ? |
|---|---|
| Types (`@trano/shared`) | verbatim |
| Client HTTP + WebSocket (`@trano/shared/api`) | verbatim |
| Écrans | réécrits en React Native, **mêmes classes Tailwind** |
| Géofence, notifications, adresse du serveur | propres au natif |

Le web est sur Tailwind 4, le natif sur Tailwind 3 — NativeWind 4 n'a pas encore
rattrapé la v4. Sans conséquence visible : les noms d'utilitaires n'ont pas
changé. Ce qui n'existe pas sur natif : `hover:`, `group-hover:`,
`backdrop-blur`.

## Ce n'est pas un workspace npm

La racine liste `apps/server`, `apps/web`, `packages/*` — délibérément pas
`apps/*`. Deux raisons :

- `npm ci` tourne à la racine **à chaque livraison sur `main`** ; happer React
  Native ajouterait plusieurs minutes à chaque déploiement du serveur ;
- le `Dockerfile` ferait entrer les mêmes centaines de mégaoctets dans l'image
  du serveur.

L'app a donc son propre `node_modules` et son propre `package-lock.json`.
`@trano/shared` est lié par `file:../../packages/shared`, et `metro.config.js`
déclare ce dossier en `watchFolders` — sans quoi un simple `import type` échoue.

```bash
cd apps/mobile && npm install
```

## Lancer

```bash
npm start
```

Expo Go suffit pour l'interface. **Il ne suffira pas** pour le géofence, les
notifications, les widgets ni les mises à jour par les airs : il faut une
construction de développement.

```bash
eas build --profile development --platform android
```

⚠️ **La toute première construction doit être lancée depuis un vrai terminal**,
pas par un agent : EAS pose une question à laquelle on ne peut répondre que de
façon interactive.

- **Android** — « Generate a new Android Keystore? » → oui. Une seule fois :
  la clé est ensuite gardée par EAS et réutilisée.
- **iOS** — connexion à l'Apple ID, puis création du certificat et du profil de
  provisionnement. Demande une adhésion à l'Apple Developer Program, et
  l'UDID de chaque iPhone qui installera la construction (profil `development`
  et `preview` = distribution interne, donc appareils déclarés un par un).

Une fois ces réponses données, les constructions suivantes passent en
`--non-interactive`.

## Mises à jour par les airs (OTA)

Projet EAS : `@walsondev/trano`
(`eb053b71-cc9e-469c-b011-5e9b978ac986`). Déjà configuré — `updates.url` est
dans `app.json`, les canaux `development` / `preview` / `production` dans
`eas.json`.

Publier une correction :

```bash
npm run ota
```

(`eas update --auto` : la branche prend le nom de la branche git courante.)

Les téléphones ramassent au lancement **et à chaque retour au premier plan** —
voir `src/lib/updates.ts`. Ce second point compte : une app qu'on ne tue jamais
ne se « lance » quasiment plus.

⚠️ **Seul le JavaScript voyage.** Ajouter un module natif — une permission, un
son, une capacité du téléphone — exige une nouvelle construction et une nouvelle
installation par tout le monde. C'est pourquoi les modules dont le chantier a
besoin (`expo-location`, `expo-task-manager`, `expo-notifications`,
`expo-battery`, `expo-network`) sont installés **dès maintenant**, avant d'être
utilisés : ils coûtent une construction aujourd'hui, et plus aucune ensuite.

La version d'exécution suit la politique `fingerprint` : Expo calcule une
empreinte du code natif, et un binaire ne reçoit que les mises à jour compilées
pour la même empreinte. Un téléphone ne peut donc jamais charger un JavaScript
qui réclame un module natif qu'il n'a pas.

## L'adresse du serveur

`http://192.168.1.65:3001` par défaut, modifiable dans Réglages et gardée sur
l'appareil. Deux réglages de plateforme la rendent joignable en clair :
`android.usesCleartextTraffic` et, côté iOS, `NSAllowsLocalNetworking` +
`NSLocalNetworkUsageDescription`.

**Point dur restant.** Hors du réseau de la maison, cette adresse ne répond pas
— et le géofence doit signaler un départ au moment précis où le Wi-Fi vient
d'être perdu. Deux issues, à trancher au chantier géofence : Tailscale sur les
téléphones, ou une file d'envoi rejouée à la reconnexion.
