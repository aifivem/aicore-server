# ai-core

A public (GPL-3.0) FiveM framework and script collection written in TypeScript. Two goals decide every design choice:

1. **Anyone can work on it with an AI.** A server owner who cannot code asks an AI to change a file or write a script, and the result fits the system. Rules, templates and notes in this repo exist for that; keep them short, current and correct.
2. **One admin panel for everything.** Every `ai-*` script is configured in ai-core's in-game admin panel. A setting a server owner tunes never lives only in a file.

A third goal shapes the code: **compatibility with ready-made scripts**. Almost every FiveM script is written for ESX, QB or Qbox, so any of them must run on ai-core unchanged: ai-core itself presents as those frameworks through its built-in bridge (owner decision: without this nobody can use the framework); ai-core uses other scripts through adapters. No script or vendor is a priority target, and this project ships and develops no third-party scripts: the work goes into ai-core and the ai-* scripts, a server owner installs the scripts they want together with their dependencies. See `docs/compat/README.md`.

## Source priority

1. This repo: this file, `.claude/rules/`, each script's `CLAUDE.md`, `docs/`.
2. The project skills in `.claude/skills/`: `aicore-fivem` (engine, natives, state bags, sync, runtime, debugging), `aicore-ui` (NUI stack, CEF limits, performance, motion, UX), `aicore-mysql` (SQL), `aicore-script-update` (updating ai-* scripts from their GitHub releases and third-party scripts from the owner's files, keeping the server's data and changes). They load by themselves when a task matches; read them when they do not.
3. `aicore-mysql` for anything touching SQL.
4. Look of every NUI: TGIANN style (owner decision): `docs/design.md` (token block, display font, sibling per screen, reference pictures) plus `aicore-ui` (`.claude/rules/nui.md`).

When they conflict, the higher one wins. A skill rule that does not apply here gets one line in the matching rules file.

## Stack

- Scripts: TypeScript, each resource follows the overextended/fivem-ts layout (bun, tsdown, oxlint, Prettier; `resource/{client,server,common}`, `locales/`, `public/`, `web/`). Details: `.claude/rules/resource-structure.md`.
- Bridge: part of ai-core, no separate bridge resources (owner decision). ai-core `provide`s `es_extended`, `qb-core` and `qbx_core` and answers their exports, core objects and events, so another script uses ai-core as if it were that framework. The bridge code lives in ai-core's `bridge/` folder, Lua 5.4 with full LuaLS annotations (`.claude/rules/lua-bridges.md`). The only other Lua is ai-lib's Lua side (`resources/[ai]/ai-lib/lua/`), the lib for Lua resources.
- Shared code: our own `@aicore-fivem/lib` (callbacks, locale, waitFor, streaming, keybinds, rate limits, DB tables...), **no ox_lib in ai-* resources** (owner decision). Anything used twice goes into the lib (`.claude/rules/lib.md`).
- DB: our own engine `@aicore-fivem/mysql` (owner decision): every ai-* resource runs a small pool in-process; `ai-mysql` stands in for oxmysql for third-party scripts (`.claude/rules/database.md`). Never guess a signature: read the source or `.d.ts` in `node_modules`.
- NUI: the `aicore-ui` stack: React 19 + Vite + TypeScript, Tailwind v4, shadcn/ui (Radix), TanStack Router / Virtual / Pacer, Redux Toolkit, `motion`, `fivem-nui-react` (`.claude/rules/nui.md`).
- Third-party resources: only bob74_ipl (owner decision: GTA Online interiors the ai-* places use); voice is ai-voice, which stands in for pma-voice. No ox_lib on the server (owner decision): a third-party script that needs it (many ESX/QB/Qbox scripts) is installed by the server owner together with that script. No oxmysql: `ai-mysql` provides it. Ask before adding another resource or npm package.

## Structure

- This folder (`txData/ai-core.base`) is the server data folder, the server repo and the bun workspace root: cfg files, docs, rules, tools, `template/`. Its `node_modules` stays outside `resources/` so FXServer never scans it.
- `resources/[standalone]/`: third-party resources the server ships with (bob74_ipl), not in git; the txAdmin recipe downloads each one listed in `STANDALONE` in `tools/recipe.ts`.
- `resources/[ai]/`: **every `ai-*` resource is its own git repo**. `packages/` is one more repo: the npm packages `@aicore-fivem/build`, `@aicore-fivem/lib`, `@aicore-fivem/mysql`, `@aicore-fivem/shared`; bun links the local copies inside the workspace. The server repo ignores both.
- New resource: `bun run new <name> "<description>"` in this folder (creates `resources/[ai]/ai-<name>` from `template/resource`), then `bun install`, `bun run build` in the new folder, `git init`, and `ensure ai-<name>` in `server.cfg`.

## Product decisions

- Language and text: everything in the repos is English (code, comments, docs, commit messages). Player-facing text comes from lang files only (`locales/en.json` is the complete base; other languages are added on top).
- License GPL-3.0-only in every repo. Open-source FiveM projects (frameworks, ox_lib, scripts; local copies in the research folder) can be checked for how a feature works and for code examples; GPL / LGPL code may be used. Every project we learn from or take code from gets a line in `CREDITS.md` (owner decision: credit them, no trouble later).
- No obfuscation. Client bundles are minified with hidden source maps (never downloadable; ai-core maps client error positions back to the source); server bundles drop comments but keep names and lines so console errors stay readable (owner decision).
- Jobs and gangs: several per character (switchable in the panel, `maxJobs` / `maxGangs`), at most one on-duty job and one active gang at a time, salary only from the on-duty job. No generic group system. Details: `resources/[ai]/ai-core/resource/server/jobs/CLAUDE.md`.
- Data: panel-edited content in each resource's `data/*.json`, panel-edited secrets (webhooks, API keys) in its git-ignored `data/secrets.json`, player data in the DB, server memory is the source of truth (`.claude/rules/data-and-sync.md`). `env.cfg` holds only what the server needs to start (license, database connection, RCON).
- Scale first (owner decision): every system is planned and written as if it holds millions of records (what does this do at 100,000 and 1,000,000?). Code in `packages/` and ai-core is benchmarked at 100k and 1M with natives stubbed (`packages/lib/bench/`) before it counts as done, and the numbers go into the report.
- Security: the server is authoritative and runs with strict security convars (`security.cfg`). Code is written for them; they are never loosened to make a script work.
- Commits and PRs carry no AI attribution lines. Commit messages are Conventional Commits in English (`feat(scope): ...`, `fix: ...`, `perf:`, `refactor:`, `docs:`, `chore:`, `feat!:` for a breaking change): release-please writes every repository's release notes from them (`README.md` "Releases"), so one commit is one change a server owner can read.

## Data sync (HARD RULE)

Live data from server to client/NUI goes as snapshot + delta: one full snapshot when a session or screen opens, then only changed rows/fields, only to who needs it (owner, group members, players with the screen open). Banned: "changed, refetch" signals, polling, broadcasting per-player data to everyone (`-1`), resending constant data every tick, action responses carrying the whole screen (they return `{ ok }`). Countdowns and expiry run on the client clock. Read the `aicore-fivem` skill's `references/sync.md` before writing any server→client push.

## Knowledge layout

| What | Where | Loaded |
|---|---|---|
| Project-wide rules | this file | every session |
| Topic rules | `.claude/rules/*.md` (`paths:` frontmatter) | when a matching file is read or edited |
| Script knowledge | `resources/[ai]/<script>/CLAUDE.md` (what the whole script needs) | when a file in that script is read |
| Folder knowledge | a `CLAUDE.md` in the folder it is about (`web/`, `resource/server/admin/`, ...) | when a file in that folder is read |
| Reasoning behind rules, engine knowledge, measurements | `.claude/skills/<skill>/references/*.md` | when the skill loads or by hand |
| Compatibility notes per third-party script | `docs/compat/<script>.md` | read by hand when working on that script |
| Design language | `docs/design.md` + `docs/design/` reference | NUI work (`nui.md` rule points there) |

New script: `template/resource/CLAUDE.md` is copied with it. Knowledge about one folder (a subsystem, the NUI, a set of files) goes into a `CLAUDE.md` in that folder, not into the script root file (owner decision); the root file keeps what the whole script needs and points to the folder files.

### Recording what was learned

Before finishing, write down anything reusable:

- A correct-usage rule ("use X for Y", "never Z") → one line in the matching `.claude/rules/*.md` (new file with `paths:` if none fits).
- A mechanism with code shape, or the reasoning behind a decision → the matching project skill's `references/<topic>.md` (general) or the folder's `CLAUDE.md` (one script). `docs/research/` is the maintainer's private notes, not in git.
- Something specific to one script → that script's `CLAUDE.md`, in its template section.
- A finding valid for every FiveM project (engine, native, CEF, runtime, SQL) → the matching project skill in `.claude/skills/` (`aicore-fivem`, `aicore-ui`, `aicore-mysql`).
- Owner preferences and project status → auto memory, not the repo.

Write current truth in imperative form, no history ("used to be X"). Fix a wrong note instead of adding a second one. No file or function lists that reading the code shows.

## Process

- Writing or changing a script: `.claude/rules/scripts.md` is the hard checklist (which lib helper for which job, what is never written by hand).
- Audits are project agents in `.claude/agents/`: `lib-compliance` (code that bypasses the lib or ai-core), `lib-candidates` (repeated code that belongs in the lib or an ai-core layer), `stability-audit` (security, loops, memory, sync and SQL under 2048 / 10k players and 1M records, with benches). Their reports are findings; the fixes follow the rules here.

- After a TS change, in the resource: `bun run typecheck`, `bun run lint`, `bun run build`. The game only reads `dist/` and the generated `fxmanifest.lua`.
- Server commands go through RCON: `bun tools/rcon.ts --log <txData profile>/logs/fxserver.log --wait 3 "ensure ai-core"`. After a build, `ensure`/`restart` the resource and search the log for `Failed to load script`, `SCRIPT ERROR`, `[client error]`, not only for "Started". `bun tools/rcon.ts "aicore_db slow"` shows database statistics of every resource. A new resource or a changed `fxmanifest.lua` needs `refresh` first.
- Restarting a resource stops the resources that depend on it. Restarting ai-core and everything after it: `bun tools/restart.ts` (refresh, restart, `ensure` every `ai-*` of server.cfg, checks each `Started resource` in the console log, ensures the missing ones again, prints script errors; exit 1 on a failure). A hand-made `ensure` loop always leaves some resources stopped (UDP loses commands, and an `ensure` of a dependency stops resources ensured before it), so it is never trusted without that check. `--from <resource>` restarts one resource the same way.
- The txAdmin recipe (`recipe/`, install guide in `recipe/README.md`) is generated: after changing `server.cfg` (a new `ensure ai-*` line) or `env.example.cfg`, run `bun tools/recipe.ts` and commit `recipe/`.
- A change that needs a full server start (new `provide` lines): `bun tools/rcon.ts "quit \"<reason>\""`; txAdmin starts the server again within seconds.
- Before using a native the codebase does not use yet, verify name, argument order and client/server availability with `python .claude/skills/aicore-fivem/tools/native.py <name>`. Native names in JS are the same PascalCase as in Lua.
- Before choosing a command name, grep all of `resources/` for it (command mapping is case-insensitive).
- `fxmanifest.lua` is generated by the build, never edited by hand. Versions live in `package.json` and are never bumped by hand: release-please bumps `package.json`, `CHANGELOG.md` and the marked `version` line of `fxmanifest.lua` in its release pull request, and the owner merges it. Never re-add code the owner deleted; say so if its removal causes a problem.
- Recursive scans of `C:\TGIANN` take minutes; search inside a known folder.
- In Git Bash, `git -C "<path with [ai]>"` fails (path conversion); `cd` into the folder first.
- Git Bash also rewrites arguments that look like paths (`/c` becomes `C:/`): set `MSYS_NO_PATHCONV=1` before a tool that takes slash text (typed chat commands in a browser test).
- In PowerShell, `[ai]` in a path is a wildcard: use `-LiteralPath` (`Test-Path -LiteralPath`, `Get-ChildItem -LiteralPath`), or a check reports a missing file that exists.
- Releases only when the owner says so (owner decision): never merge a release-please pull request, push a tag or create a GitHub release on your own. When the owner asks for a release, pick the version yourself from what changed since the last one (SemVer: a breaking change bumps major, `feat` minor, only fixes patch; before 1.0.0 a breaking change bumps minor), set it with a `Release-As: x.y.z` commit footer when release-please would pick another, and say which version and why.
- Commits, pushes and releases: `.claude/rules/git.md` (commit after every verified step without asking; push and release only when the owner asks). Secrets live in `env.cfg` (not in git); a new secret also gets an empty line in `env.example.cfg`.
