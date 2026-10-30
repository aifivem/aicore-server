# Updating third-party resources

The owner provides the new version's files (a folder or zip path). Install each new version as shipped, then carry the server's changes onto it, then check that ai-core still talks to it correctly. ai-core ships no third-party scripts; the owner installed them, usually under `resources/[standalone]/`, which the server repo does not track.

## 1. Inventory

- List the drop. Each top-level folder with an `fxmanifest.lua` (or `__resource.lua`) is a resource; a `[category]` folder holds several. Unpack zips into a new empty scratchpad directory; run nothing from it.
- Find the installed copy by folder name inside `resources/` (`find resources -maxdepth 3 -type d -name <name>`; never scan all of `C:\` or the parent folders). Keep the installed location, not the drop's category. No match or several: ask. A resource with no installed copy is installed only when the owner says so.
- An `ai-*` folder in the drop is not this flow: ai-* scripts update from GitHub (`ai-scripts.md`); ask the owner what the folder is.
- Read both manifests: `version`, `files`, scripts, `dependencies`, `provide`, `escrow_ignore`, `ai_replaces`. Note the version jump. A version that goes down, or a drop missing files the installed copy has, may be an older build: compare and report instead of installing.
- New dependencies: oxmysql is answered by ai-mysql (never install oxmysql next to it); ox_lib and other libraries are the owner's to install; a dependency on a resource ai-core stands in for (`es_extended`, `qb-core`, `qbx_core`, `pma-voice`, `ox_inventory`...) is already met.
- Show the matched list (name, path, current -> new version) and wait for the go unless already given.

## 2. Back up

- Copy the whole installed folder to `<scratchpad>/update-backup/<name>/` (`robocopy "<src>" "<dst>" /E`; exit codes below 8 are success). For an untracked folder this backup is the only copy of the server's version.
- If the folder is tracked by a git repo (`git ls-files -- <path>` non-empty): `git status --porcelain -- <path>` (uncommitted changes count as ours; tell the owner) and `git ls-files --others --ignored --exclude-standard -- <path>` (git-ignored runtime files: saved JSON, caches; they are in the backup).

## 3. Find the server's changes (three-way)

Old upstream, in order of preference:

1. The owner still has the old vendor zip or folder.
2. An open-source script on GitHub: the release or tag of the installed version.
3. Git history, when the folder is tracked: the commit that set the installed `version` (`git log -S"version '<old>'" -- <path>/fxmanifest.lua`). If that commit also re-applied earlier customizations, its config files count as ours and the pure stock is one commit earlier.
4. None: diff ours against the new version directly (the judgment rule in `SKILL.md`) and say so in the report.

Then read every difference old -> ours (the server's edits: configs, `locales/*` or `languages/*`, editable files, `data/*.json`, `fxmanifest.lua`, SQL, images, sounds, streamed files, and code patches in open-source resources) and old -> new (the vendor's changes: added and removed files, renamed keys, moved sections, changed editable functions). Escrowed resources (`.fxap` present): only files in `escrow_ignore` are readable and editable; an edit in a file the new version escrows cannot be carried and is reported.

## 4. Install the new version

- Delete the installed folder completely, then copy the new folder to the same path, hidden files (`.fxap`) included. Old leftovers are bugs; the old version stays in the backup.
- Restore backed-up runtime files only if the new version still uses them in the same format; otherwise convert or drop them and report.

## 5. Re-apply, file by file

For each of the server's edits, find where that setting lives in the new version and write the value there in the new format:

- **Same key, same file:** set the value in the new file; keep the new file's comments and layout.
- **Renamed or restructured key:** find the new key by reading the code that uses it (grep for the old name, its comment, its default, its text key) and convert the value to the new shape.
- **Config moved to a data file** (JSON edited by the script's own panel): read the new loader and the shipped file, write the old values in that exact schema (field names, types, id format, indentation), validate it parses. Do not rely on a converter the script may run.
- **The server's existing data files** (content its owner edited live): carry them over; convert field by field if the schema changed; never replace them with the vendor sample.
- **Removed option:** no code reads it any more (grep confirms): drop it and report it with the old value.
- **Editable functions** (`client/editable.lua`, `server/editable.lua`...): start from the new file; re-apply each changed function body, adapted to a changed signature or return contract; new functions keep their default.
- **Languages:** keep the server's wording for every key that still exists; new keys are added to every language file the server uses, translated in the tone of the existing texts; removed keys go; changed placeholders are followed.
- **fxmanifest:** the new one, plus only the server's own additions that still make sense. Never change `version`.
- **SQL** (`*.sql`, install folders): diff old vs new; new tables, columns and indexes go into the report as SQL the owner runs (through ai-mysql like every third-party query). Load `aicore-mysql` before reading or writing it; run nothing without the owner's go.
- **Credentials** (bot tokens, API keys, webhook urls in configs): never print them in chat. Carry them from the backup; if writing them back is refused, leave the new default and list file and key for the owner.
- **Assets** (`stream/`, images, sounds): the vendor's, plus files the server added that are still referenced.
- Coordinates, items, prices, texts and behaviour are carried exactly; nothing beyond the server's own edits changes.

## 6. ai-core compatibility

The script may be one ai-core talks to. Find every place that names it:

```bash
grep -rln "<name>" "resources/[ai]/ai-core/resource" "resources/[ai]/ai-core/bridge" docs/compat
```

| Category | ai-core adapters | Note |
|---|---|---|
| Inventory | `resource/server/inventory/adapters/`, `resource/client/inventory/adapters/` | `docs/compat/inventory.md` |
| Vehicle keys | `resource/server/vehicleKeys/adapters/`, `resource/client/vehicleKeys/adapters/` | `docs/compat/vehicle-keys.md` |
| Phone | `resource/server/phone/adapters/` | `docs/compat/phone.md` |
| Police alerts | `resource/server/dispatch/adapters/` | `docs/compat/dispatch.md` |
| Radial menu | `resource/client/radial/adapters/` | `docs/compat/radial.md` |
| Emotes, hands up | `resource/client/gestures.ts` | `docs/compat/gestures.md` |
| Time and weather | `resource/server/world.ts`, `resource/client/world.ts` | `docs/compat/weather.md` |
| HUD | `resource/client/hud.ts` | |
| Voice, chat | ai-voice (pma-voice API), ai-chat (`chat` API) | `docs/compat/voice.md`, `chat.md` |
| ESX / QB / Qbox use | `bridge/` | `docs/compat/bridge.md`, `frameworks.md` |

- For every export, event and callback an adapter calls or listens to, check the new version: still there, same arguments, same return shape, same timing. Escrowed code: check the readable files and the vendor's docs; list what cannot be verified.
- A mismatch is fixed in the adapter file (thin translation only, `.claude/rules/compatibility.md`), with its tested version raised; then typecheck, lint and build ai-core and restart it (`bun tools/restart.ts`). No third-party name goes outside its adapter or note.
- A new `ai_replaces` line or `provide` in the new version can make ai-core refuse joins while an ai-* stand-in still runs: name the folder the owner must remove.
- Update `docs/compat/<script>.md` (tested version, status, exact config or patch, known limits; format in `docs/compat/README.md`). A supported script without a note gets one.

## 7. Verify and restart

- Compare the installed result with the new version: every difference is one of the server's changes; no old-version file remains that the new version does not ship (restored runtime files aside).
- Edited Lua parses (Lua language server if available, otherwise read it carefully); JSON parses; every config key set exists in the new code.
- Unless SQL is waiting for the owner: `bun tools/rcon.ts --log ../default/logs/fxserver.log --wait 3 "refresh"`, then `... "ensure <name>"`, and read the log for `SCRIPT ERROR`, `Failed to load script` and the script's own errors. When resources that depend on it were stopped, ensure them again.
