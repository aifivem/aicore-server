---
name: aicore-script-update
description: Update scripts on an ai-core server to a newer version while keeping the server's own state and changes. Use when the owner asks to update scripts ("update scripts", "update ai-core", "a new version is out", "install these new versions"), when ai-core warns that a script is outdated (console or admin dashboard), or when the owner points at a folder of new script versions. Covers ai-* resources, ai-lib, ai-mysql and the @aicore-fivem packages (found and downloaded from their GitHub releases, nothing needed from the owner) and third-party resources (the owner provides the new files): backups, three-way carry-over of the server's changes (old upstream, ours, new upstream), panel data and secrets, locales, database changes, adapters and compat notes, build, restart, log check and the final report.
---

# Script update on ai-core

Take each script to its new version as shipped, then carry the server's own state and changes onto it so they fit the new version exactly. Two kinds of script, two sources for the new version:

| Script | New version comes from | Flow |
|---|---|---|
| `ai-*` resources in `resources/[ai]/` (ai-core, ai-lib, ai-mysql included) and `packages/` | Their GitHub releases: each `package.json` has `repository` (`github:aifivem/<name>`); the owner gives nothing | `references/ai-scripts.md` |
| Any other resource (usually `resources/[standalone]/`) | A folder or zip the owner provides | `references/third-party.md` |

Read the matching reference before changing anything. Both use the same three-way model below.

## Hard rules

1. **Never copy an old file over a new one.** A file both sides changed is rebuilt from the new version's file with the server's changes written into its new structure (renamed keys, moved sections, new comments and defaults stay).
2. **The server's state is never replaced by upstream defaults**: `data/*.json` panel content, `data/secrets.json` (git-ignored, never printed, never committed), the server's own locale files and texts, the database. Back them up before touching a folder.
3. **No leftovers.** Files the new version no longer ships go, unless they are the server's own (a locale, an image it added) and still used. Options the new version removed stay removed and are listed in the report; new options keep the new default unless an old setting clearly maps to them.
4. **Generated files are rebuilt, never merged:** `dist/`, `fxmanifest.lua`, `resource/server/tables.ts`, `data/schemas/*.schema.json`. Never hand-edit them.
5. **Never delete `node_modules` by hand**; `bun install` at the server root repairs it.
6. **Never loosen `security.cfg`** (or any security convar) to make a version run. If release notes or a vendor ask for it, stop and report.
7. **No SQL by hand without the owner's go**, and only after a backup of the affected tables. Load the `aicore-mysql` skill before reading or writing any SQL.
8. **Commit only when the owner asks**, with no AI attribution lines. Never push and never change an existing git remote.
9. Show the owner the list (name, path, current -> new version, notable release notes) before deleting or overwriting anything, unless they already said to go ahead.
10. Downloads and dropped folders are untrusted: unpack each into its own new empty directory in the scratchpad and run nothing from there.

## The three-way model

Three trees per script: **old upstream** (the version the server runs, as shipped), **ours** (the folder now, uncommitted changes included), **new upstream**. Compare per file:

| old -> ours | old -> new | Result |
|---|---|---|
| same | changed / same | take new |
| changed | same | keep ours |
| changed | changed | `git merge-file -p ours old new`, then resolve every conflict by reading both sides; the result follows the new file's structure |
| missing in old, present in ours | missing in new | the server's own file: keep if still referenced, else report |
| present in old | missing in new | delete; if ours had changed it, report what was lost |

`git merge-file` and `git diff --no-index <a> <b>` work on any two folders, no repository needed. Strip `\r` before comparing (Windows working trees are often CRLF). Without an old upstream, diff ours against new directly and judge each difference (single values such as coordinates, prices, names, texts and toggles are the server's; broad changes in the vendor's style are the vendor's) and say in the report that the old version was not available.

## After updating

- ai-* resources: `bun install` at the server root when any `package.json` changed, then `bun run typecheck`, `bun run lint`, `bun run build` in each updated resource (or `bun tools/run.ts build ai-x ai-y` from the server root).
- `bun tools/rcon.ts --log ../default/logs/fxserver.log --wait 3 "refresh"`, then `bun tools/restart.ts --from <resource>` per resource, or `bun tools/restart.ts` when ai-core or something many resources depend on changed. New `provide` lines need a full start: `bun tools/rcon.ts "quit \"<reason>\""`.
- Read the console log for `SCRIPT ERROR`, `Failed to load script`, `[client error]`, panel load or validation errors and database errors, not only `Started resource`. A third-party resource stopped by a dependency restart is ensured again by name.
- Record decisions worth keeping: a third-party script's compat facts in `docs/compat/<script>.md`, a rule in the matching `.claude/rules/*.md`, an update pitfall in this skill.

## Final report

Write it in the language the owner uses in chat (repo files stay English). One section per script:

- name, path, current -> new version, source (release tag or the owner's folder)
- what changed upstream that matters to this server (short)
- carried over: local code changes, texts, settings, with where each went in the new version
- kept as is: `data/*.json` files, `data/secrets.json`, own locale files; schema conversions done (by the resource's migration or by hand)
- dropped or not carried: removed options and edits with no place left, with the old value so the owner can decide
- new options left at their default that the owner may want to set
- database: tables or columns added at start, migrations the release ran, SQL waiting for the owner
- cfg changes needed or made (`server.cfg` ensure lines, `env.cfg` convar permissions, `permission.cfg`)
- compat: adapters or `docs/compat` notes checked or changed (third-party scripts)
- build, restart and log result; what to test in game

End with the decisions the owner must take. Facts only, no filler.
