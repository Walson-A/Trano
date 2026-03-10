# UI/UX & Design System - "Effet Tesla"

Pour obtenir une interface "Premium", minimaliste et agréable (particulièrement de nuit depuis une tablette), nous devons définir des règles de base solides avant d'écrire le CSS.

## 1. La Palette de Couleurs (Dark & Light Mode)
L'interface s'adaptera automatiquement en fonction de l'heure de la journée (Mode Clair la journée, Mode Sombre le soir/nuit).

**Dark Mode (Nuit) :**
*   **Fond principal :** Noir absolu (`#000000` - Parfait pour écran OLED/Tablette).
*   **Surface des "Cartes" :** Gris carbone profond semi-transparent (`rgba(28, 28, 30, 0.65)`).
*   **Texte Principal :** Blanc pur (`#ffffff`).

**Light Mode (Jour) :**
*   **Fond principal :** Gris très doux style iOS (`#e5e5ea`) pour ne pas éblouir.
*   **Surface des "Cartes" :** Blanc semi-transparent (`rgba(255, 255, 255, 0.6)`).
*   **Texte Principal :** Gris très foncé (`#1c1c1e`).

**Couleurs d'Accent (Partagées ou légèrement ajustées) :**
*   *Lumières :* Orange/jaune chaud (`#ffcc00`).
*   *Énergie/Batterie :* Vert pur (`#34c759`).
*   *Interrupteurs/Réseau :* Bleu Premium Apple/Tesla (`#007aff` et `#0a84ff` en dark).

## 2. Le style "Glassmorphism"
L'effet "Tesla" ou "Apple Home" repose beaucoup sur la superposition et le flou.
*   Nos cartes n'auront pas de bords nets et bruts, mais des **bordures arrondies** (ex: `border-radius: 20px`).
*   On utilisera la propriété CSS `backdrop-filter: blur(10px)` sur les tuiles pour donner cet effet de verre dépoli élégant au-dessus du fond.

## 3. Typographie (Les Polices)
Il faut une police de caractères ronde, moderne et "géométrique".
*   Inspiration : **Inter**, **Outfit** ou **SF Pro** (Apple).
*   On importera "Inter" depuis Google Fonts. C'est le standard pour les interfaces claires et lisibles de loin.

## 4. Animations et Transitions (Le ressenti Premium)
Une belle application est une application fluide :
*   Les boutons "s'enfoncent" légèrement (Scale -2%) quand on appuie dessus.
*   La couleur d'accent s'allume avec une douce transition fondu (0.3 secondes) plutôt que brutalement.
*   L'ouverture d'une vue détail (ex: le panneau pour régler la couleur de la lampe du salon) glisse doucement depuis le bas ou le côté.

---
*Ce document sert de référence avant de commencer l'intégration CSS.*
