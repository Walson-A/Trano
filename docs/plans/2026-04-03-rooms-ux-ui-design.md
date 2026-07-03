# Design: Rooms UX/UI Improvements

## Context
The "Rooms" (Pièces) tab in the Trano application currently has a functional but basic UI and a major UX issue on small screens (selection makes the user scroll to the bottom). This design aims to fix these issues while elevating the overall premium feel of the dashboard for tablet and OLED displays.

## Proposed Design

### 1. UX: In-Place Accordion Expansion (Mobile & Tablet)
- **Mechanism**: Instead of a split-view (list on left, selection on right) on small screens, the room card will "expand" vertically on click.
- **Motion**: Use `framer-motion` to animate the card expansion (`layout` prop).
- **Auto-Scroll**: Selecting a room will trigger a smooth scroll to ensure the top of the expanded card is visible.
- **Navigation**: Expanding a new room will collapse the previously selected one (accordion behavior).

### 2. UI: Premium Modern Aesthetic
- **Glassmorphism**: 
  - Main background: Deep OLED black (`#0a0a0a`).
  - Cards: `bg-zinc-900/40` with `backdrop-blur-xl`.
  - Borders: Thin `border-white/5` or `border-zinc-800`.
- **Dynamic Icons**:
  - Add stylized icons for each room.
  - Active state indicators: Pulse effect on a small amber dot for lights, blue for AC, etc.
- **Information Density**:
  - Show room "Hero" stats even when collapsed (e.g., Temperature, average humidity).
  - Use a staggered fade-in animation for device cards inside an expanded room.

### 3. Responsive Layout (Large Screens)
- **Hybrid View**: On large screens, the "Accordion" logic can still be used, but with a more sophisticated grid.
- **Focus Mode**: When a room is selected, the grid will adapt, and the selected room will become more prominent (larger card size or highlighted background).

## Components to Update
- `src/views/Rooms.tsx`: Main logic for accordion expansion and glassmorphism styling.
- `src/components/DeviceCard.tsx`: Minor styling tweaks to match the new glassmorphism theme.

## Success Criteria
- [ ] Selecting a room on mobile does not require manual scrolling to see devices.
- [ ] The interface looks premium on OLED screens (high contrast, subtle blurs).
- [ ] Transitions between rooms are smooth (no layout jumps).
- [ ] Room sensors (temp/humidity) are displayed if available.
