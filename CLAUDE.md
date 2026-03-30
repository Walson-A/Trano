# CLAUDE.md — Trano Project Guide

## Project Overview

**Trano** is a React-based Home Assistant dashboard designed for tablet/touch wall displays. It features a premium "Tesla-like" UI with Glassmorphism effects, automatic dark/light mode, and real-time WebSocket integration with Home Assistant.

---

## Tech Stack

| Category | Tool / Library |
|---|---|
| Framework | React 19.2.0 + Vite 7.3.1 |
| State Management | Zustand 5.0.11 (global UI state) + React Context (HA data) |
| Styling | Vanilla CSS only — no Tailwind, no CSS-in-JS |
| HA Connection | `home-assistant-js-websocket` 9.6.0 |
| Icons | `lucide-react` 0.577.0 |
| Class utilities | `clsx` 2.1.1 |
| Linting | ESLint 9 (flat config) + Prettier 3.8.1 |
| Package manager | npm |

---

## Development Commands

```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Preview the production build
npm run lint      # Run ESLint across the codebase
```

**Required before running:** Create `.env.local` at project root:
```
VITE_HA_URL=ws://<HOME_ASSISTANT_IP>:8123/api/websocket
VITE_HA_TOKEN=<long-lived access token>
```

No test framework is configured — there are no test files or test commands.

---

## Repository Structure

```
src/
├── core/               # Global infrastructure (no UI-specific code)
│   ├── store/          # Zustand store (useAppStore.js) — theme, active page
│   └── theme/          # CSS variables (index.css) — dark/light, color palette
├── context/            # HAContext.jsx — Home Assistant WebSocket provider
├── lib/                # ha.js — HA connection utility
├── hooks/              # useTheme.js — auto dark/light based on time of day
├── ui/                 # Pure "dumb" design system components
│   ├── Button/
│   ├── Card/
│   ├── Dock/
│   ├── Modal/
│   └── Typography/
├── features/           # Smart components — domain logic + HA data
│   ├── System/         # SystemStatus widget (ping, HA version, connection)
│   └── Weather/        # WeatherWidget + WeatherModal
├── pages/              # Screen-level assemblies
│   ├── Home/
│   ├── Rooms/
│   ├── Energy/
│   └── Settings/
├── App.jsx             # Root component (header, layout, navigation, theme toggle)
└── main.jsx            # React entry point — wraps App in HAProvider
docs/
├── architecture.md     # Feature-Sliced Design rules
├── design_concept.md   # Color palette, Glassmorphism, typography, animations
├── weather.md          # Weather module spec
└── system_status.md    # SystemStatus widget spec
```

---

## Architecture: Feature-Sliced Design (FSD)

Trano uses an adapted Feature-Sliced Design architecture. The layer boundaries are strict:

### `src/core/` — Infrastructure
- Technical backbone; no UI components.
- `ha/` (`HAContext.jsx`, `ha.js`) — WebSocket connection and entity subscriptions.
- `store/` (`useAppStore.js`) — Zustand store for theme and current page. Does NOT store HA entity state.
- `theme/` (`index.css`) — CSS custom properties for dark/light mode and all color tokens.

### `src/ui/` — Dumb Design System
- **Absolute rule: components in `src/ui/` must never import `HAContext` or any Home Assistant logic.**
- Accept only props (`active`, `onClick`, `children`, etc.).
- Responsible only for visual rendering and CSS.
- Examples: `Card`, `Button`, `Dock`, `Modal`, `Typography`.

### `src/features/` — Smart Components
- The layer where UI meets HA data.
- Import from `src/ui/` for visuals.
- Import `useHA()` from `src/context/HAContext.jsx` for entity state.
- Each folder maps to a home automation domain.
- Examples: `System/`, `Weather/`, and future: `lights/`, `energy/`, `media/`.

### `src/pages/` — Screen Assemblies
- Compose multiple `features/` into full-screen views.
- No direct HA logic — delegate to features.
- Examples: `Home/`, `Rooms/`, `Energy/`, `Settings/`.

---

## Styling Conventions

**No Tailwind. No CSS-in-JS. Vanilla CSS only.**

### CSS Variables (defined in `src/core/theme/index.css`)
- All colors and design tokens are CSS custom properties.
- Two color schemes: `dark` (default, OLED-optimized) and `light` (auto-switched at 7h–19h).

### Dark Mode Palette
- Background: `#000000` (pure black, OLED-perfect)
- Cards: `rgba(28, 28, 30, 0.65)` (semi-transparent carbon gray)
- Text: `#ffffff`

### Light Mode Palette
- Background: `#e5e5ea` (soft iOS gray)
- Cards: `rgba(255, 255, 255, 0.6)` (semi-transparent white)
- Text: `#1c1c1e`

### Accent Colors
| Use case | Color |
|---|---|
| Lights | `#ffcc00` (warm orange/yellow) |
| Energy | `#34c759` (emerald green) |
| Weather/rain | `#3b82f6` (blue) |
| UI accents | `#f8fafc` or `#0f172a` |

### Glassmorphism Pattern
```css
border-radius: 20px;
backdrop-filter: blur(10px); /* or 20px–40px for overlays */
background: rgba(28, 28, 30, 0.65); /* dark mode */
```

### Animations
- Buttons press: `scale(0.9)` to `scale(0.98)` on `:active`
- Transitions: `0.3s ease` — never abrupt
- Modal entry: slide from bottom or side

### Typography
- Font: **Inter** (loaded from system or Google Fonts)
- Geometric, modern, optimized for large-format legibility

---

## State Management

### Zustand Store (`src/core/store/useAppStore.js`)
Manages UI-only global state:
- Current active page/navigation
- Theme (dark/light override)

### Home Assistant Context (`src/context/HAContext.jsx`)
- Provides `useHA()` hook to all `features/` components
- Manages WebSocket connection lifecycle
- Subscribes to entity state changes in real-time
- Connection config comes from `VITE_HA_URL` and `VITE_HA_TOKEN` env vars

### Theme Hook (`src/hooks/useTheme.js`)
- Automatically switches to light mode from 7h to 19h, dark mode otherwise
- Can be overridden manually

---

## Code Style

### Prettier (`.prettierrc`)
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### ESLint (`eslint.config.js`)
- Flat config format (ESLint v9)
- React Hooks rules enforced
- `no-unused-vars` ignores `^[A-Z_]` pattern (React component names)
- JSX allowed in both `.js` and `.jsx` files

---

## Git Workflow

### Branching Strategy
- **`dev`** — primary development branch
- **`feat/<feature-name>`** — all new features branch from and merge back to `dev`
- Do NOT develop directly on `main`

### Commit Rules
- Do not run `git commit` or `git push` automatically — always wait for explicit user approval.
- Write clear, descriptive commit messages in the `feat:`, `fix:`, `docs:`, `refactor:` convention.

---

## Documentation Rules

These are **mandatory** — keep code and docs in sync:

1. **New feature in `src/features/` or `src/core/`** → create or update a file in `docs/`.
2. **Change to design system, colors, or UI behavior** → update `docs/design_concept.md`.
3. **Architecture change** → update `docs/architecture.md`.
4. Never let the codebase diverge from the documentation.

---

## Key Constraints for AI Assistants

1. **Never use Tailwind or any CSS framework** — vanilla CSS with CSS custom properties only.
2. **Never import HAContext into `src/ui/` components** — this violates FSD layer boundaries.
3. **Keep `src/ui/` components fully dumb** — props only, no business logic.
4. **No auto-commits or auto-pushes** — always present changes and wait for user confirmation.
5. **Target is tablet/touch displays** — ensure all interactive elements have large touch targets.
6. **OLED-first dark mode** — avoid off-black grays for the background; use pure `#000000`.
7. **Always update `docs/`** when implementing or modifying features, components, or design.

---

## Adding a New Feature (Checklist)

- [ ] Create `src/features/<domain>/` folder
- [ ] Place HA-connected logic in the feature component (import `useHA()`)
- [ ] Use `src/ui/` components for visual rendering only
- [ ] Style with vanilla CSS using existing CSS variables
- [ ] Register the feature in the relevant `src/pages/` assembly
- [ ] Create or update corresponding documentation in `docs/`
- [ ] Run `npm run lint` before committing

## Adding a New UI Component (Checklist)

- [ ] Create `src/ui/<ComponentName>/` folder with `index.jsx` and `ComponentName.css`
- [ ] Accept all data via props — no internal HA imports
- [ ] Use CSS variables from `src/core/theme/index.css` for colors and spacing
- [ ] Follow Glassmorphism and animation conventions described above
- [ ] Update `docs/design_concept.md` if introducing new design patterns
