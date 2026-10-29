---
paths:
  - "resources/**/*.{ts,tsx}"
---

# Shared packages

`packages/` in the server folder (outside `resources/`, so FXServer never sees it) is its own git repo and is published to npm under `@aicore-fivem`. Resources depend on them with npm ranges; bun links the local copies inside the workspace.

| Package | Content | When |
|---|---|---|
| `@aicore-fivem/lib` | Repeated helpers: `/shared` (anywhere, no natives), `/fivem` (natives on both sides, for `resource/common/`), `/server`, `/client` | A helper is about to be written a second time |
| `@aicore-fivem/shared` | Contracts between resources: types, event/callback names, export types (`CitizenExports`) | Anything one resource uses to talk to another |
| `@aicore-fivem/mysql` | The database engine (`mysql` API, in-process pool) and the oxmysql-compatible functions `ai-mysql` exports | Every DB access of an ai-* resource |
| `@aicore-fivem/build` | Build steps (`aicore-client-errors`) | Every resource's `build` script |

- The lib replaces ox_lib in ai-* resources (owner decision): never import ox_lib; what is missing gets added to the lib.
- Every helper is built for scale: benchmark anything that holds or walks a collection at 100k and 1M (`packages/lib/bench/`, `bun run bench`).
- Look in `@aicore-fivem/lib` before writing a helper; add it there when a second user appears. Code specific to one resource stays in that resource.
- Every lib function has a one-line JSDoc saying what it does. `/server`, `/client` and `/fivem` may call natives; `/shared` never does.
- Another resource's export types extend `CitizenExports` in `@aicore-fivem/shared/src/exports.ts` (a type alias per resource, not an interface).
- A change to a package that resources rely on is a version bump of that package (the owner bumps versions) and a note in the package repo's changelog.
- Current lib: `isRecord`, `logSafe` (client text made safe for the console), `formatText` (`{0}` placeholders), `createLogger`, `sleep`, `waitFor`, `asArgs` (one parsed value as an `args` list), panel content readers `num` / `int` / `bool` / `str` / `record` / `vec4` (shared); `createLocale`, `loadLocaleTexts` (lang table for a NUI), `registerExport`, `resourceExport`, `optionalExport`, `isResourceStarted` (fivem, also re-exported from client and server); `eventSource`, `isOnline`, `SourceLock`, `RateLimit`, `WriteQueue`, `DataFile` (panel content in `data/*.json`, atomic writes), `AdminPanel` (a script's panel store: schema, validation, save, deltas; `.claude/rules/admin-panel.md`), `aiLog` / `aiLogChannels` (logs through ai-core), `notify(source, text, kind)` (ai-core notification card), `createDatabaseTables`, `onClientEvent`, `onClientCallback` (client input through the gate: rate, `guards`, `args`, `lock`), guards `isAdmin`, `hasCharacter`, `near`, `triggerClientCallback`, `sendPlayerData` / `patchPlayerData` (ai-core only) (server); `TickLoop`, `Keybind`, `requestModel`, `requestAnimDict`, `requestPtfxAsset`, `onServerEvent`, `Zones` (per-zone interval, 64 m grid), `cache` / `onCache` (fed by ai-core's watcher), `showPrompt` / `hidePrompt` / `onPromptPressed`, `notify(text, kind)`, `progress({ label, duration, anim })` (ai-core's progress bar, resolves false when cancelled), `menu(request, onHover?)` / `input(request)` (ai-core's shared menu and input dialog; `onHover` previews the item under the pointer), `triggerServerCallback`, `onServerCallback`, `onPlayerData`, `getPlayerData`, `seedPlayerData`, `AdminWorld` (client mirror of a script's `sync: "all"` panel files) (client).
