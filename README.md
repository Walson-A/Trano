# Trano - Home Assistant Dashboard 🏡⚡

Trano est un tableau de bord domotique moderne, pensé spécifiquement pour une utilisation sur tablette. Il se connecte en temps réel à une instance Home Assistant locale.

## 🎯 Objectif et Philosophie
- **"Tesla-like" UI** : Un design Premium, minimaliste, avec des effets de verre dépoli (Glassmorphism), pensé pour le tactile (grosses zones de clic, prévention des sélections accidentelles).
- **Dark / Light Mode** : Contraste OLED absolu (`#000000`) pour la nuit, et fond très doux (`#e5e5ea`) pour le jour, afin de ne jamais agresser les yeux.
- **Zéro Latence** : Application Single Page pure, connectée directement au serveur HA local via WebSocket.

---

## 🏗️ Architecture du Projet (Feature-Sliced Design)

Pour garantir une scalabilité maximale et éviter que le projet ne devienne "un plat de spaghettis" quand de nouveaux capteurs sont ajoutés, nous utilisons une architecture moderne par domaines.

Le dossier principal est `/src` :

### 1. `core/` (Le cœur du système)
Contient la tuyauterie de l'app. Ne contient pas de composants d'affichage.
- `ha/` : Gère le WebSocket (`ha.js`) et le Context API de Home Assistant.
- `store/` : Gère l'état global de l'interface (Thème par défaut, Pièce active) via **Zustand**.
- `theme/` : Le fichier CSS principal (`index.css`) définissant notre "Design System" et nos variables racines.

### 2. `ui/` (Le Design System)
Contient les composants visuels purs, "bêtes" et hautement réutilisables. Ces composants ne connaissent rien de Home Assistant.
- `Card/`, `Button/`, `Typography/` ...

### 3. `features/` (La logique métier)
C'est ici que l'UI rencontre Home Assistant. On prend une `Card` du dossier `ui/`, on lui connecte les données du state HA, et on crée un composant intelligent.
- `lights/` : Logique d'allumage physique, variation RGB.
- `energy/` : Calcul et affichage en temps réel des watts du Shelly, SOC batterie.
- `climate/` : Thermostats.

### 4. `pages/` (Les écrans)
L'assemblage des `features` sur une page complète.
- `Home` : Tableau de bord principal.
- `Room` : Vue détaillée d'une pièce.

---

## 🛠️ Stack Technique
- **Framework** : React + Vite (Pour la vitesse au démarrage et le Hot Reload)
- **Connexion HA** : `home-assistant-js-websocket` (Liaison officielle en temps réel)
- **State UI** : `zustand` (Très léger, plus performant que Redux)
- **Styling** : Vanilla CSS + `clsx` (Pour des performances maximales sans alourdir le JS avec un framework externe). Prettier est forcé sur tout le code.

---

## 🚀 Lancer le projet localement

1. Cloner ou télécharger le dépôt.
2. Créer un fichier `.env.local` à la racine basé sur `.env` ou selon ces clés :
```env
VITE_HA_URL=ws://192.168.1.100:8123/api/websocket
VITE_HA_TOKEN=eyJhbGciOiJIUzI1NiI... (Token de longue durée HA)
```
3. Installer les dépendances :
```bash
npm install
```
4. Démarrer le serveur de développement :
```bash
npm run dev
```
