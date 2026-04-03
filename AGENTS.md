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

---

# Superpowers for Antigravity

This profile adapts Superpowers workflows for Antigravity with strict single-flow execution.

## Core Rules

1. Prefer local skills in `.agent/skills/<skill-name>/SKILL.md`.
2. Execute one core task at a time with `task_boundary`.
3. Use `browser_subagent` only for browser automation tasks.
4. Track checklist progress in the native Antigravity `task.md` artifact.
5. Provide detailed implementation plans via the native `implementation_plan.md` artifact.
6. Document progress and verification in the native `walkthrough.md` artifact.
7. Keep changes scoped to the requested task and verify before completion claims.

## Tool Translation Contract

When source skills reference legacy tool names, use these Antigravity equivalents:

- Legacy assistant/platform names -> `Antigravity`
- `Task` tool -> `browser_subagent` for browser tasks, otherwise sequential `task_boundary`
- `Skill` tool -> `view_file project-local .agent/skills/<skill-name>/SKILL.md`
- `TodoWrite` -> update the native Antigravity `task.md` artifact
- `PlanWrite` -> create/update the native Antigravity `implementation_plan.md` artifact
- `WalkthroughWrite` -> create/update the native Antigravity `walkthrough.md` artifact
- File operations -> `view_file`, `write_to_file`, `replace_file_content`, `multi_replace_file_content`
- Directory listing -> `list_dir`
- Search -> `grep_search`, `find_by_name`
- Shell -> `run_command`
- Web fetch -> `read_url_content`
- Web search -> `search_web`
- Image generation -> `generate_image`
- User communication during tasks -> `notify_user`
- MCP tools -> `mcp_*` tool family

## Single-Flow Execution Model

- Do not dispatch multiple coding agents in parallel.
- Decompose large work into ordered, explicit steps.
- Keep exactly one active task at a time in the native Antigravity `task.md` artifact.
- If browser work is required, isolate it in a dedicated browser step.

## Verification Discipline

Before saying a task is done:

1. Run the relevant verification command(s).
2. Confirm exit status and key output.
3. Update the native Antigravity `task.md` artifact.
4. Report evidence, then claim completion.
