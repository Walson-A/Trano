# Trano Project Rules

1. **Documentation is Mandatory:**
   - Whenever you implement a new feature (especially in `src/features/` or `src/core/`), you MUST document it in the `docs/` folder or update the relevant existing documentation.
   - If you modify the design system, colors, components, or UI/UX behavior (in `src/core/theme` or `src/ui`), you MUST update `docs/design_concept.md` accordingly.
   - Never let the codebase and the documentation fall out of sync.

2. **Git Workflow:**
   - Do NOT run `git commit` or `git push` automatically. Always prepare the code and wait for explicit permission from the user to commit or push.
   - **Branching Strategy:** The primary development branch is `dev`. All new features must be developed on a dedicated feature branch named `feat/nom-de-la-feature`. Once the feature is completed and tested, it will be merged back into the `dev` branch.

3. **Architecture Adherence:**
   - Strictly follow the Feature-Sliced Design (FSD) architecture defined in `docs/architecture.md`.
   - `src/ui/` components must remain "dumb" and never import Home Assistant context or logic.
