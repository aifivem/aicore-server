# Radial menu layer

Every ai-* script puts its wheel entries through ai-core (owner decision: compatibility lives in ai-core, one change reaches every script). Scripts call lib `radial.add(item)` / `remove(id)` / `refresh()` (client, Lua `aiLib.radial`); ai-core keeps the items and hands them to the radial menu that runs, through one adapter file per radial. Scripts written for another radial's API keep working because ai-radialmenu answers those APIs into the same registry.

## Item model

`RadialItem` in `@aicore-fivem/shared` (`radial.ts`), the tgiann-radialmenu model under the lib's names:

| Field | Meaning |
|---|---|
| `id`, `label`, `icon?` | `icon` = Font Awesome solid name without `fa-`, or an image url |
| `parent?` | item id this goes into (`RADIAL_VEHICLE` = the built-in vehicle category, or another item); left out = main wheel |
| `items?` | static sub items: the card opens a sub wheel |
| `canShow?()` | shown only while it returns true; read when the wheel opens and on `refresh()` (a category with no visible sub item hides too) |
| `onPressed?()` | the action; runs in the adding resource |
| `keepOpen?` | the wheel stays open after the press (doors) and refreshes |
| `whileDead?` | stays while the player is down (`PLAYER_BAGS.dead` or a dead ped); every other item hides then |

Functions cross resources as references; ai-core drops a resource's items when it stops, and a radial that starts later or restarts gets every item again (no re-adding on `onClientResourceStart`).

## How it works

- Layer: `resources/[ai]/ai-core/resource/client/radial/` (`index.ts` client exports `AddRadialItem`, `RemoveRadialItem`, `RefreshRadial`; `registry.ts` adapters in detection order; `adapters/` one file per radial; `parse.ts` checks items from other resources).
- Pick: the first running radial in `RADIALS` order, again when one starts or stops; items move from the old radial to the new one. No panel choice yet (only one radial should run; conflicts below).
- ai-radialmenu holds one registry for its wheel (`resources/[ai]/ai-radialmenu/resource/client/registry.ts`): its built-ins, the items ai-core forwards, and every compatibility API below, read into one shape by `compat.ts`.

## Adapters (ai-core items into a radial)

| Radial | Calls | Limits |
|---|---|---|
| ai-radialmenu (default) | `AddItem(item)` / `RemoveItem(id, parent)` / `Refresh()` | none |
| tgiann-radialmenu-target | `AddMenuItem(entry, parentId)` / `RemoveMenuItem(id, parentId)` / `RefreshMenu()` (written from its source) | none (`canInteract`, `onSelect`, `shouldClose`, `whileDead` map 1:1) |
| qb-radialmenu | `AddOption(option, id)` / `RemoveOption(id)` (`action` function) | no conditions: the item always shows and a press runs only while `canShow` holds; no `parent` (goes to the main wheel); untested |
| tgiann-radialmenu 1.0.0 (non-target) | `AddMenuItem(entry)` / `RemoveMenuItem(id)` (written from its source; wheel built on each open, nothing to refresh) | no `parent` (goes to the main wheel), no `whileDead`; it `provide`s `codem-supreme-radialmenu`, so it comes before that adapter |
| codem-supreme-radialmenu | `AddMenuItem(item)` / `RemoveMenuItem(id)` (written from its docs): `canOpen` = `canShow`, a leaf runs the local event `ai-core:radial:<id>`, which calls `onPressed` | no function action (hence the event), no `parent`, no `whileDead`; untested |
| ox_lib | `addRadialItem(item, parentMenuId)` / `removeRadialItem` / `registerRadial` for sub items | same as qb (no conditions); `parent` only into an ai-core item with sub items; untested |

## APIs ai-radialmenu answers (scripts written for another radial)

ai-radialmenu `provide`s `qb-radialmenu` and `tgiann-radialmenu-target`, so `exports['<name>']:X()` reaches it (provideExport). All of them land in its one registry and go when the calling resource stops.

| API | Exports | Notes |
|---|---|---|
| own | `AddItem(RadialItem)` (`onSelect` accepted as the old name of `onPressed`), `RemoveItem(id, parent?)`, `Refresh()` | used by ai-core's adapter; scripts use lib `radial` |
| qb-radialmenu | `AddOption(data, id?)` -> id, `RemoveOption(id)` | `title`, `icon` (`fas fa-x` accepted), `items`, `action` function or `type` + `event` (`client` emits locally, `server` sends to the server, `command`, `qbcommand` -> `QBCore:CallCommand`) with the item data as argument; `shouldClose = false` keeps the wheel open |
| tgiann-radialmenu-target | `AddMenuItem(item \| items, parentId?)`, `RemoveMenuItem(id, parentId?)`, `ClearMenuItems()`, `RegisterSubMenu({ id, items })`, `RefreshMenu()`, `DisableMenu(state)`, `IsMenuDisabled()`, `OpenMenu()`, `CloseMenu()`, `IsMenuOpen()`, `HasMenuItem(id)`, `SetMenuItemHidden(id, state)`, `IsMenuItemHidden(id)`, `UpdateMenuItem(id, { label?, icon? })`, `ResetMenuItem(id)` | item fields `label` (text or `{ en, tr }` by the `ai:locale` convar), `canInteract(args)`, `onSelect(args)`, `event` + `type` + `args` (event gets `{ id, ...args }`), `command`, `export { resource, name, args }`, `menu`, `shouldClose`, `whileDead`. `ClearMenuItems` clears only the calling resource's items (tgiann clears everyone's). Not answered: `GetCurrentMenuId`, the settings and player command exports, its server exports `DisableMenu(src)` / `CloseMenu(src)`, its target API (that is `ox_target`, ai-target) and its local events (`menuOpened`, `itemSelected`...) |

## ox_lib's radial (`lib.addRadialItem`, `lib.registerRadial`, ...)

Not answerable. ox_lib's `init.lua` turns `lib.addRadialItem(...)` in another resource into `exports.ox_lib:addRadialItem(...)` (read from ox_lib 3.39 `init.lua` `call` and `resource/interface/client/radial.lua`): an export of the real ox_lib resource, which ai-core does not provide (owner decision: no ox_lib on the server; a script that needs it brings it). While ox_lib runs it answers those exports itself; a second handler for `__cfx_export_ox_lib_addRadialItem` would race ox_lib's own (last registered wins) and break its wheel, so ai-core does not hijack it. Result: items of scripts written for ox_lib's radial show in ox_lib's own wheel (its key, default Z); when ox_lib is the only radial running, ai-core's adapter puts the ai-* items there too.

## Conflicts

`qb-radialmenu` and `tgiann-radialmenu-target` installed next to ai-radialmenu are reported by ai-core's conflict check (tgiann-radialmenu and codem-supreme-radialmenu are not: `RADIALS` is not read by the conflict rules) (`STAND_INS` in `resource/server/connection/conflicts.ts`): two wheels fight over the key, and ai-radialmenu `provide`s their names. A new `provide` line reports `missing` in `GetResourceState` until the next full server start.

## Adding a radial menu

1. A file in `ai-core/resource/client/radial/adapters/` exporting a `RadialAdapter` (`add`, `remove`, `refresh`), calling the radial with lib `callExport`.
2. One line in `RADIALS` (`registry.ts`), in the order it should win.
3. When ai-radialmenu should answer that radial's API too: its exports in `ai-radialmenu/resource/client/exports.ts` through `provideExport`, its item fields in `compat.ts`, the name in `fxProvide` and in ai-core's `STAND_INS`.
