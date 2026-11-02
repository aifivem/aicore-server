# Updating ai-* resources and the packages

The owner gives nothing: find what is outdated, download it from GitHub, carry the server's state over, build, restart, check.

## 1. Find outdated scripts

Every ai-* resource's `package.json` has `version` and `repository` (`github:aifivem/<name>`; the build writes both into `fxmanifest.lua`). ai-core's update check (`resources/[ai]/ai-core/resource/server/versions.ts`) compares them with `releases/latest` on GitHub and prints `<name> <current> is outdated: <latest> is out (<url>)` in the console (also on the admin dashboard, export `GetUpdates`). It only sees started resources and skips those in the panel's `updates.ignore` (ai-core `data/settings.json`), so check every folder yourself:

```bash
cd "resources/[ai]"
for n in ai-*; do
  repo=$(sed -n 's#.*"repository": *"\(github:\|https://github.com/\)\([^"]*\)".*#\2#p' "$n/package.json" | sed 's#\.git$##')
  cur=$(sed -n 's#^  "version": *"\([^"]*\)".*#\1#p' "$n/package.json")
  latest=$(gh release view --repo "$repo" --json tagName --jq .tagName 2>/dev/null | sed 's#^v##')
  echo "$n $cur ${latest:-no-release}"
done
```

- Compare like `versions.ts`: strip a leading `v`, compare dotted numbers, ignore pre-release suffixes. No release (404) means nothing to update.
- Without a logged-in `gh`: `curl -s -H "Accept: application/vnd.github+json" https://api.github.com/repos/<owner>/<name>/releases/latest` (60 unauthenticated requests per hour per IP, shared with ai-core's own check).
- A resource in `updates.ignore` is listed as ignored and updated only when the owner names it.
- **A working copy ahead of its release is not outdated**: local version above the latest tag, or commits after the latest tag in a clone (the maintainer's own repos). Skip it; never move a folder backwards.
- `packages/` (`@aicore-fivem/lib`, `shared`, `mysql`, `build`) has no `repository` line: compare each `package.json` version with npm (`npm view @aicore-fivem/<pkg> version`) and with the upstream of `packages/` when it is a clone (`git remote -v`). Update packages first when a new resource release needs a range the local copies do not satisfy, or bun installs the npm copy next to the workspace one.
- Read the release notes of every version between current and latest (`gh release view <tag> --repo <repo> --json body,assets,url`): breaking changes, required package versions, migrations, new cfg lines (`ensure`, `add_convar_permission`, ACE), new `provide` names, manual steps.

Show the list (name, current -> latest, notes that need action) and wait for the go unless already given. Update in dependency order: packages, ai-mysql, ai-core, ai-lib, then the rest.

## 2. Download old and new upstream

Per resource, two new empty directories in the scratchpad (`update/<name>/old`, `update/<name>/new`):

```bash
gh release download <tag> --repo aifivem/<name> --archive zip --dir update/<name>/new   # tag source
gh release download <tag> --repo aifivem/<name> --pattern '*.zip' --dir update/<name>/new  # a release asset, when the release has one
unzip -q update/<name>/new/*.zip -d update/<name>/new/x
```

- Prefer a release asset when the release attaches one (a ready package); otherwise the tag's source (it carries the committed `dist/` and `fxmanifest.lua`). The zipball's top folder is `<owner>-<name>-<sha>/`.
- **Old upstream** is the tag of the version the server runs (find the tag name style with `gh release list --repo aifivem/<name>`). It is always downloadable, so the three-way always has its base. A local clone that has the tag can use `git show <tag>:<path>` instead (in Git Bash `cd` into the folder first: `git -C` fails on `[ai]` paths).
- Nothing from these folders is run, installed or built in place.

## 3. Back up

- Copy the whole resource folder except `node_modules` to `update/<name>/ours` (`robocopy "<src>" "<dst>" /E /XD node_modules`; robocopy exit codes below 8 are success). This is "ours" for the three-way and the way back.
- Git-ignored files exist only here: `data/secrets.json`, `data/*.json.bak`. In a clone list them with `git ls-files --others --ignored --exclude-standard` (ignore `node_modules`, `*.tsbuildinfo`).
- Uncommitted changes in a clone (`git status --porcelain`) are the server's changes too: they are part of "ours". Tell the owner; commit them only if asked.

## 4. Merge, file by file

Run the three-way model of `SKILL.md` over old / ours / new, writing the result into the resource folder. Per kind of file:

| File | Rule |
|---|---|
| `resource/**`, `web/src/**`, `bridge/**`, `sql/**`, Lua and other source | three-way; a local change whose code moved or whose contract changed is adapted to the new code; one with no place left is reported |
| `package.json` | new upstream, plus local additions that still make sense; `version` ends at the new release's version (or the update check keeps warning) |
| `dist/`, `fxmanifest.lua`, `resource/server/tables.ts`, `data/schemas/*.schema.json` | take new; the build regenerates them |
| `data/<file>.json` (panel content) | keep ours (below) |
| `data/secrets.json`, `data/*.json.bak` | restore from the backup untouched |
| `locales/en.json` | three-way: new keys and placeholders from upstream, the server's wording for keys that still exist |
| `locales/<lang>.json` the release does not ship | keep; add the new keys translated into that language in the same tone, drop removed keys, follow changed placeholders (`{0}`, `{1}`) |
| `CLAUDE.md`, docs | take new, re-add the server's own notes |

### Panel content (`data/*.json`)

The release ships default panel content; the server's files are its live, panel-edited content. Never replace them with the shipped ones.

- Schema unchanged (the new `schema.ts` / loader reads the same fields): keep ours as is. Files the new version adds: take the shipped file.
- Schema changed: look for the resource's own start-time migration (release notes, a `migrate.ts` called at the server's start, as ai-rental's `migrateLocations` in `server/content.ts`). If one exists, leave ours in place; it converts on start. If none exists, convert by hand following the new loader and `schema.ts` (or `schema/`): same field names, types and id format as the shipped file, every value kept, new fields at the shipped default, removed fields dropped and reported. Validate that each file parses.
- After the start, check the console for panel load or validation errors of that resource and open its panel tab in the report's test list.

### Database

Each resource installs its tables from `sql/main.sql` with `createDatabaseTables` at start: it creates missing tables and adds missing columns, and never drops, renames or changes columns or adds keys. Diff old vs new `sql/main.sql`:

- New tables and columns: applied by the restart, nothing to do.
- A changed column type, a new index or key, a renamed or dropped column: the release must bring an explicit, idempotent migration step (release notes, server code). If it does, it runs on start; check the log. If it does not, write the SQL (with the `aicore-mysql` skill), show it to the owner, back up the affected tables, and run it only on their go.

### Cfg files outside the folder

- `server.cfg`: a new resource gets its `ensure` line in dependency order; a removed one loses it (ask first).
- `env.cfg` and `env.example.cfg`: a resource that starts using the database needs `add_convar_permission <resource> read mysql_connection_string`.
- `permission.cfg`: ACE lines the release notes ask for.
- `security.cfg`: never loosened.

## 5. Build, restart, check

1. `bun install` at the server root (workspace; links local `packages/`). Never delete `node_modules`.
2. In each resource: `bun run typecheck`, `bun run lint`, `bun run build`. Always build: `dist/` must come from the merged source and the local packages. Fix errors in the server's carried changes; an error in untouched upstream code is reported, not patched.
3. Compare the result with new upstream (`diff -r --strip-trailing-cr -x node_modules -x dist -x data update/<name>/new/x/<top> "<resource>"`): every remaining difference must be one of the server's changes.
4. `bun tools/rcon.ts --log ../default/logs/fxserver.log --wait 3 "refresh"`, then `bun tools/restart.ts --from <resource>`; after ai-core, ai-lib, ai-mysql or a packages update, `bun tools/restart.ts` (restarts ai-core and ensures every ai-* after it, checking each). ai-mysql stands in for oxmysql: third-party resources that depend on it stop with it and are ensured again by name. New `provide` lines: full start with `bun tools/rcon.ts "quit \"<reason>\""`.
5. Read the log: `SCRIPT ERROR`, `Failed to load script`, `[client error]`, panel and database errors. The `is outdated` warning for the resource must be gone after its next check.
