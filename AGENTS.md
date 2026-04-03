# Trano Project Rules

1. **Documentation is Mandatory:**
   - Toute nouvelle feature dans `src/features/` ou `src/core/` doit être documentée dans `docs/`.
   - Toute modification du design system ou des composants UI doit mettre à jour `docs/design_concept.md`.
   - Le code et la documentation doivent rester synchronisés.

2. **Git Workflow:**
   - Ne pas `git commit` ou `git push` sans permission explicite de l'utilisateur.
   - **Branching :** Branche principale `main`. Features sur `feat/nom-de-la-feature`.

3. **Architecture :**
   - Suivre l'architecture définie dans `docs/architecture.md`.
   - Les composants `src/ui/` sont des Dumb Components : jamais d'import de `HAContext`.
   - Les entity IDs HA sont configurables via `.env.local`, jamais hardcodés.

4. **Pas de données mock :**
   - Ne jamais utiliser de données fictives comme fallback quand HA est déconnecté.
   - Afficher un état "non disponible" propre à la place.

5. **Stack :**
   - TypeScript strict, React 18, Tailwind CSS v4, Vite.
   - Toutes les données domotiques viennent de Home Assistant via WebSocket.
