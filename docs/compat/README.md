# Compatibility with other scripts

Owner decision: compatibility with ready-made scripts is a main goal, because almost every FiveM script is written for ESX, QB or Qbox and a framework they do not run on gets no users. No script or vendor is favoured, and the project ships no third-party scripts (server owners install their own); the code is structured so adding support for another script is a small, repeatable job (one file, copied from a template) that a non-coder can ask an AI to do.

## How scripts find a framework [code]

Read from popular third-party scripts:

- They detect the framework by resource state: `GetResourceState('qbx_core' | 'qb-core' | 'es_extended' | 'ox_core' | 'ND_Core' | 'vrp')`, each script in **its own order** (codem-lib: qbx_core → qb-core → es_extended; envi-bridge: es_extended → qbx_core → qb-core → ox_core → vrp → ND_Core; rcore: qb-core only; cdev: qbx_core then `exports.es_extended:getSharedObject()`). Some compare to `'started'`, some to `~= 'missing'`, some accept `'starting'`.
- Most ship a `Config.Framework = 'auto'` switch and an open (non-escrowed) bridge folder (`bridge/`, `framework/`, `modules/framework/`, `public/`), so the owner can force a framework or patch the bridge.
- They take the core object through `exports['qb-core']:GetCoreObject()`, the legacy `TriggerEvent('QBCore:GetObject', cb)`, `exports.es_extended:getSharedObject()`, and Qbox exports (`exports.qbx_core:GetPlayer`), then call framework functions and listen to framework events (`QBCore:Client:OnPlayerLoaded`, `QBCore:Notify`, `esx:playerLoaded`, `esx:setJob`...).
- Many also auto-detect the other systems they need, one list per category (envi-bridge: inventory from origen, jaksam, one, ox, codem, tgiann, qb/lj/ps...; same for target, notify, phone, dispatch, fuel, keys, clothing).

What this means for us:
- The bridges must answer every detection style: `provide` names, the started state, the core-object getters (export + legacy event), the Qbox exports, and the framework events with the same arguments and timing.
- Because each script checks frameworks in its own order and ai-core answers all three names, a script picks whichever it checks first. Every bridge part reads the same ai-core data, so any choice works as long as each part is complete. A provided name always reports `started`, so the bridge parts cannot be switched off at runtime. Verified on the dev server with `ai-mysql` providing oxmysql: `GetResourceState('<provided name>')` returns `started`, and `@<provided name>/...` file includes resolve to the providing resource; exports are not aliased and must be answered through `__cfx_export_<name>_<export>` handlers. Still to verify: answering ESX and QB events from one resource causes no double handling. ai-core's `provide` lines report `started` after a server start (added while the server runs they report `missing` until the next start). The bridge is written: coverage in `docs/compat/bridge.md`.

## Three layers of compatibility

1. **Framework bridge inside ai-core** (owner decision: no separate bridge resources; Lua with LuaLS types in ai-core's `bridge/esx`, `bridge/qb`, `bridge/qbx`): ai-core `provide`s `es_extended`, `qb-core` and `qbx_core` and answers their exports, core objects and events, so scripts written for ESX/QB/Qbox see ai-core as their framework and run unchanged. One resource means one source of truth with no export hop between core and bridge; the build has to add the Lua files and the `provide` lines to ai-core's generated manifest. Coverage is tracked function by function against each framework's public API (`frameworks.md`).
2. **Integrations** (adapters): ai-core and `ai-*` scripts need things other scripts provide (inventory, target, notify, progress bar, phone, dispatch, fuel, vehicle keys, garage, door lock, clothing/appearance, banking, billing, MDT, EMS, housing, death/ambulance, voice). Each category has one interface in `@aicore-fivem/shared`; each supported script is one adapter file implementing it; ai-core auto-detects the installed one (priority list) and the admin panel can override the choice per category. Adding support for a new script = copy the category's adapter template, fill in its calls, add one line to the registry.
3. **Per-script compatibility notes** (`docs/compat/<script>.md`, one per tested third-party script): tested version, status (works out of the box / needs a config value / needs a patch to its open bridge file), the exact config or patch, and known limits. The notes in this folder are the public compatibility list.

Character screens are a fourth case: ai-core's own screen steps aside for an installed multichar script, which logs players in through the bridge and reads ai-core-made ESX / QB tables (`multichar.md`: supported scripts, login exports, tables, what the bridge must call).

## Rules for the code

- No third-party script name is hardcoded outside its own adapter file or compat note. Core code calls the category interface only.
- Adapters are thin: translate the call, nothing else. No business logic in an adapter.
- Detection runs once at start (and again when a detected resource starts or stops: `onResourceStart` / `onResourceStop`), never per call.
- Every adapter states the script's tested version; a version check prints a clear warning when the installed version differs.
- Hot paths never go through a cross-resource export per call; adapters that need per-tick data keep a local mirror.
- Security still applies: data coming back from another script is parsed at the boundary like any other external input.

## Decisions

- **No priority target** (owner decision): bridge coverage follows each framework's public API, most-used functions first, so scripts of every vendor work. Many multi-framework scripts detect `es_extended` first, then `qbx_core`, then `qb-core` (seen in tgiann-core, which branches on `config.framework == "esx" | "qb"` **[code]**); such a script picks ai-core's ESX part, so that part must be complete first.
- **Adapters live in ai-core**, not in each script. Reasons: one file adds support for a third-party script to every `ai-*` script at once (per-script adapters would mean editing and rebuilding every script for each new one); detection runs once; the per-category choice sits in the core admin panel, where every setting belongs. Adapter calls are action-driven (give item, notify, send alert), not per frame, so the export hop is cheap. A script that needs a category nobody else uses keeps that adapter in itself, written with the same interface and template so it can move to core later. Exception: target scripts, whose adapters run in each resource through lib `Points` (a target ties options to the calling resource; `target.md`).
- **`ai-*` replacement scripts provide the popular APIs of their category** (owner decision: required for compatibility). Example: a future `ai-inventory` answers the `ox_inventory` (and `qb-inventory`) exports and events that third-party scripts call, so they work with it without any adapter. Only one resource can `provide` a name, so each category picks the most-used API to provide and tests it against popular scripts of that category.
