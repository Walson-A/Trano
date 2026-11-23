# UI/UX & Design System

Interface premium, minimaliste, optimisée pour tablettes tactiles et écrans OLED.

## 1. Palette de Couleurs

L'interface supporte Dark et Light mode (toggle manuel).

**Dark Mode :**
- Fond principal : `#111111`
- Surfaces : `zinc-800/50` avec bordures `zinc-800`
- Texte : `zinc-100` / `zinc-400`

**Light Mode :**
- Fond principal : `zinc-50`
- Surfaces : `white` avec bordures `zinc-200`
- Texte : `zinc-900` / `zinc-500`

**Accents monochromatiques :**
- Lumières : Amber (`amber-500`)
- Énergie : Emerald (`emerald-500`)
- Météo : Couleurs conditionnelles (sun `#fbbf24`, rain `#3b82f6`, cloud `#94a3b8`)
- Sécurité : Red (`red-500`)
- Température : Orange (`orange-500`)

## 2. Styling

- **Framework :** Tailwind CSS v4 avec `@theme` pour les variables custom.
- **Arrondis :** `rounded-2xl` / `rounded-3xl` sur les cartes et boutons.
- **Backdrop blur :** Utilisé sur la topbar (`backdrop-blur-md`) et les modales.
- **Transitions :** `transition-all` avec `active:scale-95` / `active:scale-90` pour le feedback tactile.

## 3. Typographie

- Police : **Inter** (importée via Google Fonts dans `index.css`).
- Hiérarchie : `font-extrabold` pour les valeurs, `font-semibold` pour les labels, `font-medium` pour le secondaire.

## 4. Layout

- Sidebar fixe à gauche (navigation par onglets).
- Topbar sticky avec horloge, météo live, status système, actions.
- Zone principale scrollable avec padding responsive (`p-4 sm:p-6 lg:p-12`).

## 5. Composants Clés

- **StatusCard :** Icône colorée + label + valeur, hover scale.
- **DeviceCard :** Carte d'appareil avec toggle, état visuel on/off.
- **Modal :** Overlay sombre + backdrop blur, centré, fermeture par X ou clic extérieur.
