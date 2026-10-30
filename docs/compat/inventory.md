# Inventory layer (ai-core)

Every script reaches items through ai-core: ai-* scripts with `@aicore-fivem/lib` `inventory` (server: `addItem`, `removeItem`, `getItemCount`, `hasItem`, `canCarryItem`, `getItems`, `clearInventory`, `registerStash`, `openInventory`, `registerUsableItem`, `getItemDefinition`; client: `openInventory`, `hasItem`), ESX / QB / Qbox scripts through ai-core's bridge (`xPlayer.addInventoryItem`, `Player.Functions.AddItem`, `ESX.RegisterUsableItem`, `QBCore.Functions.CreateUseableItem`...), any other script through ai-core's exports of the same names (`exports['ai-core']:AddItem(source, 'bread', 2)`). ai-core forwards each call to the active inventory through its adapter, so changing the inventory changes it for every script at once.

Contract: `@aicore-fivem/shared` `inventory.ts`. Code: `resources/[ai]/ai-core/resource/server/inventory/` (layer, registry, one adapter file per inventory) and `resource/client/inventory/`.

## How it works

- **Choice:** ai-core's panel, General tab, Inventory card: `Automatic` (default) uses the first running inventory in the registry order; picking one uses only that one. The choice is made once and again when a listed inventory starts or stops or the setting changes; calls never check resource states.
- **No inventory running:** calls answer false / 0 / an empty list; usable items and stashes are kept.
- **Usable items and stashes** are kept by ai-core and handed to every inventory that becomes active (also after an inventory restart), so a script registers them once at its own start, before or after the inventory starts.
- **Using an item:** ai-inventory gets each handler (`RegisterUsableItem`). tgiann-inventory, ox_inventory and qb-inventory call the framework instead (`ESX.UseItem`, QB / Qbox `CanUseItem`); ai-core's bridge answers those from the same handlers. A handler returning false keeps the item in ai-inventory (otherwise its `consume` amount is taken); other inventories consume according to their own item settings, so an item a handler removes itself should not be consumable there too.
- **Clients** follow the server's pick through GlobalState `ai:inventory` (the active resource name); ai-core's client exports `OpenInventory()` / `HasItem(item, count)` forward to the client adapter.
- **Item use event:** ai-core emits `ai-core:itemUsed (source, name, status)`; `status` (hunger / thirst / stress) comes only from ai-inventory.
- **Bridge item cache:** the bridge caches item definitions per name and drops the cache on `ai-core:inventoryChanged`.

## Adapters

| Inventory | Written against | Status |
|---|---|---|
| ai-inventory | 0.1.0 (own exports) | Default. Same calls ai-* scripts made before; checked with typecheck / build, in-game run pending (ai-core restart by the lead). |
| tgiann-inventory | 2.4.1 (`server/exports.lua`, `shared/shared.lua`, `client/exports.lua`) | Untested. Calls mapped from the source. Running tgiann-inventory itself on ai-core also needs tgiann-core on ai-core's ESX or QB bridge; not tried. |
| ox_inventory | 2.48.1 (`modules/inventory/server.lua`, `server.lua`, `client.lua`) | Untested. ox_inventory keeps player inventories in the framework's tables (`users` / `players`), which ai-core does not have. |
| qb-inventory | 2.2.3 (`server/functions.lua`, `client/main.lua`) | Not usable yet: it keeps player items in qb-core's `PlayerData.items` and reads item definitions from qb-core's shared items; ai-core has neither, so the adapter answers no definitions. Stash `jobs` are not enforced (qb-inventory has no job lock). |

ai-inventory comes first in the registry because it `provide`s `ox_inventory` and `qb-inventory`: those names read started while it runs. Only one resource can provide a name: remove ai-inventory before installing ox_inventory or qb-inventory.

The adapter logs a warning when the installed version differs from the one it was written against.

## Adding an inventory

1. Copy the closest adapter in `resource/server/inventory/adapters/` to `<resource>.ts` and map each `InventoryAdapter` method onto the inventory's real exports (read its source, never guess a signature). Use lib `callExport(resource, name, ...args)` and parse every answer with the readers in `../parse.ts` (Lua returns: several values arrive as an array, slot-keyed tables as an array or an object). Set `version` to the version you read.
2. Leave `registerUsableItem` out when the inventory calls the framework's use functions; implement it when it keeps its own list.
3. Add the adapter to `INVENTORIES` in `registry.ts` (order = auto detection priority) and a client adapter in `resource/client/inventory/adapters/` plus its line in `client/inventory/index.ts`.
4. Add a row to the table above. Typecheck, lint and build ai-core.

No inventory name appears outside its adapter files, the registries and this note.
