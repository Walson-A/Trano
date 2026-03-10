# Architecture & Guidelines (For Developers & AI Assistants)

## 🏗️ Feature-Sliced Design (FSD) Adapté

L'application **Trano** utilise une architecture modulaire basée sur le principe de séparation des préoccupations pour faciliter la maintenance et l'évolution avec Home Assistant.

Voici la règle stricte concernant l'arborescence dans `src/` :

### 1. `src/core/` (Logique Globale & Infrastructure)
Contient le cœur technique de l'application, indépendant de toute interface utilisateur spécifique.
*   `ha/` : Gère le WebSocket (`ha.js`) et le Context API (`HAContext.jsx`) de Home Assistant.
*   `store/` : Gère l'état global de l'interface via **Zustand** (ex: `useAppStore.js` pour le thème et la navigation). Ne gère PAS les données Home Assistant (qui sont gérées par le contexte).
*   `theme/` : Le fichier CSS principal (`index.css`) définissant les variables racines (Dark/Light mode, couleurs).

### 2. `src/ui/` (Design System Pur)
Contient les composants visuels "bêtes" (Dumb Components).
**Règle absolue :** Un composant dans `ui/` ne doit **JAMAIS** importer le `HAContext` ni connaître l'existence de Home Assistant.
*   Ces composants recoivent uniquement des `props` (ex: `active`, `onClick`, `children`).
*   Exemples : `Card`, `Button`, `Typography`.
*   Le design s'appuie fortement sur le Glassmorphism (effets de flou CSS).

### 3. `src/features/` (Logique Métier & Entités)
C'est la couche intermédiaire ("Smart Components"). C'est ici que l'interface rencontre la donnée.
*   On importe une vue d'un composant de `ui/`.
*   On importe l'état de Home Assistant via `useHA()` (de `core/ha/`).
*   On crée un composant lié à un domaine domotique précis.
*   Exemples de dossiers attendus : `lights/` (pour une `LightCard`), `energy/` (pour le widget Shelly), `media/` (pour les players).

### 4. `src/pages/` (Écrans & Assemblage)
L'assemblage final des différents `features` pour créer des vues complètes occupant tout l'écran.
*   `Home/` : Le tableau de bord principal affichant des résumés.
*   `Room/` : Une vue dynamique filtrant les entités selon une pièce spécifique.

---

## 🎨 Note aux IA : Design & CSS
*   L'application **n'utilise pas** TailwindCSS. Tout le style est fait en Vanilla CSS étendu (variables CSS générées dans `core/theme/index.css`).
*   Le design cible particulièrement les dalles tactiles et écrans OLED (tablettes murales) avec le mode sombre profond (`#000000`).
*   Consulter `docs/design_concept.md` pour le comportement des composants et l'inspiration graphique.
