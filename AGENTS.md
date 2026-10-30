# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, Gemini, Copilot and others). Claude Code reads the same files automatically.

1. Read `CLAUDE.md` first: project goals, source priority, structure, product decisions, the snapshot + delta rule and the process (typecheck, lint, build, RCON check).
2. Topic rules live in `.claude/rules/*.md`; each file's `paths:` header says which files it covers. Read the matching ones before editing (for example `fivem-runtime.md` and `data-and-sync.md` for `resources/**/resource/**/*.ts`, `nui.md` for `web/`, `database.md` for SQL).
3. Knowledge behind the rules is in the project skills: `.claude/skills/aicore-fivem/` (engine, natives, sync, debugging), `.claude/skills/aicore-ui/` (NUI stack, old-CEF limits, performance, UX), `.claude/skills/aicore-mysql/` (SQL). Open the `SKILL.md`, then the reference it points to.
4. Each script has its own `CLAUDE.md` in `resources/[ai]/<script>/` (and some folders have one); read it before changing that script.
5. Design of every screen: `docs/design.md` and the pictures in `docs/design/tgiann/`.
6. New script: `bun run new <name> "<description>"` in this folder, never a copy of another resource.
7. Never edit generated files (`fxmanifest.lua`, `dist/`, `resource/server/tables.ts`); change the source and build.
