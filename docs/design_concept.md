# UI/UX & Design System

Interface premium, minimaliste, optimisée pour tablettes tactiles et écrans OLED.

## Logement contrôlé

La barre supérieure porte un sélecteur de logement permanent, distinct du profil.
Il prend la forme d'un bouton arrondi avec icône et chevron, puis un menu court
où le logement actif porte une coche et un fond ambré discret. Flèches, Entrée,
Échap et sortie par Tab restent utilisables ; un clic extérieur ferme le menu.
Les noms longs reviennent à la ligne dans les choix. Le badge indique simplement
« Connecté » ; la voie serveur reste expliquée dans son infobulle.
[Revue du sélecteur](reviews/home-selector/review.md).
Le titre de la page confirme le logement. L’appartement propose les appareils
compatibles et les courses ; plan/énergie/réglages de la maison familiale restent
dans `main`. L’état Tuya non connecté explique la prochaine action tout en laissant
les courses accessibles. Les commandes indisponibles restent désactivées.
La liste de courses affiche un choix d’envoi séparé du bouton « acheté », le
destinataire et une confirmation de conservation de la source.
« Choisir les appareils de ce logement » permet d’affecter les entités du HA
familial à l’appartement, sans demander de clés cloud Tuya pour une lampe déjà
reliée. La grande vue passe par la REST quand le WebSocket HA du LAN est inaccessible.
Voir [le contrat](multi-home.md) et [la revue](reviews/multi-home/review.md).

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
