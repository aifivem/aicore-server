# Inventory layer (ai-core)

Every script reaches items through ai-core: ai-* scripts with `@aicore-fivem/lib` `inventory` (server: `addItem`, `removeItem`, `getItemCount`, `hasItem`, `canCarryItem`, `getItems`, `clearInventory`, `registerStash`, `openInventory`, `registerUsableItem`, `getItemDefinition`, `registerShop`, `openShop`; client: `openInventory`, `hasItem`), ESX / QB / Qbox scripts through ai-core's bridge (`xPlayer.addInventoryItem`, `Player.Functions.AddItem`, `ESX.RegisterUsableItem`, `QBCore.Functions.CreateUseableItem`...), any other script through ai-core's exports of the same names (`exports['ai-core']:AddItem(source, 'bread', 2)`). ai-core forwards each call to the active inventory through its adapter, so changing the inventory changes it for every script at once.

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
| tgiann-inventory | 2.4.1 (`server/exports.lua`, `shared/shared.lua`, `client/exports.lua`) | Written from its source. Weight from `GetPlayerInventoryData` + `GetFreeWeight`, held weapon from client `GetCurrentWeapon` (no picture: the item carries none). Running tgiann-inventory itself on ai-core also needs tgiann-core on ai-core's ESX or QB bridge; not tried. |
| ox_inventory | 2.48.1 (`modules/inventory/server.lua`, `server.lua`, `client.lua`) | Untested. ox_inventory keeps player inventories in the framework's tables (`users` / `players`), which ai-core does not have. |
| qb-inventory | 2.2.3 (`server/functions.lua`, `client/main.lua`) | Not usable yet: it keeps player items in qb-core's `PlayerData.items` and reads item definitions from qb-core's shared items; ai-core has neither, so the adapter answers no definitions. Stash `jobs` are not enforced (qb-inventory has no job lock). |
| qs-inventory | no version published (quasar-store.com/docs/inventory "Commands and Exports") | Written from its docs. Player: `AddItem`, `RemoveItem`, `GetItemTotalAmount` (no metadata filter), `CanCarryItem`, `GetInventory`, `ClearInventory`; stash `<name>` = qs `Stash_<name>`: `AddItemIntoStash`, `RemoveItemIntoStash`, `StashCanCarryItem`, `GetStashItems`, `ClearOtherInventory('stash', id)`. qs has no register-only export: the adapter keeps the definitions and opens with `RegisterStash(source, name, slots, weight, label)`; stash `jobs` are not enforced. Another player opens through the `qb-inventory` name qs answers (`OpenInventoryById`). Definitions from `GetItemList` (pictures `html/images/`). Client: `inventory` command, `Search`, `GetCurrentWeapon`. |
| codem-inventory | no version published (codem.gitbook.io, mInventory Remake "Server / Client Exports") | Written from its docs. Player only for add / remove (`AddItem`, `RemoveItem` without metadata), `GetItemsTotalAmount`, `GetInventory(citizenid, source)`, `ClearInventory`; stashes read with `GetStashItems`, cleared with `UpdateStash(id, {})`. No export registers, fills or opens a stash or checks carry weight: `registerStash` does nothing, `openInventory` answers false, `canCarryItem` answers true (`AddItem` checks weight itself). Client: no open or held-weapon export; `hasItem` sums `getUserInventory`. It needs CodeM's edited qb-core / es_extended, so running it on ai-core's bridge is not expected to work as is. |
| core_inventory | no version published (docs.c8re.store/core-inventory/exports) | Written from its docs. Stash `<name>` = `stash-<name>` of core_inventory's `stash` type (slots and size from its `Config.Inventories`; the definition's `slots` / `maxWeight` / `jobs` are unused). `addItem`, `removeItem` (no metadata / slot), `getItemCount`, `canCarry`, `getInventory().content`, `clearInventory`, `openInventory(source, id, 'stash', label, nil, true)`, `openOtherPlayerInventory`, `getItemsList` (no pictures). Client: `openInventory`, `hasItem`, `getWeaponEquiped`. |
| origen_inventory | no version published (docs site offline; calls from envi-bridge 0.5.3, prp-bridge 1.1.5, codem-lib, p_bridge 1.2.5) | Written from those bridges' sources. `addItem`, `removeItem`, `getItemCount`, `canCarryItem`, `getInventoryItems`, `RegisterStash(id, label, slots, weight)` (no job lock), `Items`; a clear removes each stack. No server open export: `openInventory` answers false. Client: `Search('count', item)`; no own-open or held-weapon export known. |
| jaksam_inventory | no version published (calls from envi-bridge 0.5.3, codem-lib) | Written from those bridges' sources. `addItem`, `removeItem`, `getTotalItemAmount`, `canCarryItem`, `getInventory().items`, `clearInventory`, `registerStash({ id, label, maxWeight, maxSlots })` (no job lock), `getStaticItem` / `getStaticItemsList` (`stackable: false` = unique). No server open export: `openInventory` answers false. Client: `getTotalItemAmount(item)`; no own-open or held-weapon export known. |

ai-inventory comes first in the registry because it `provide`s `ox_inventory` and `qb-inventory`: those names read started while it runs. Only one resource can provide a name: remove ai-inventory before installing ox_inventory or qb-inventory.

The adapter logs a warning when the installed version differs from the one it was written against. Adapters written from docs or bridges without a published version have an empty version and never warn.

Usable items: qs-inventory, codem-inventory, core_inventory, origen_inventory and jaksam_inventory get no `registerUsableItem`; they are expected to run the framework's usable items (QB `CanUseItem` / `ESX.UseItem`), which ai-core's bridge answers, but none documents its use path, so this is unverified. Never hand handlers to an inventory that also registers them with the framework (qs-inventory's `CreateUsableItem` does): the bridge's `CreateUseableItem` puts them back into the layer and item use loops.

Every inventory above except ai-inventory keeps player items through its framework integration (qb-core `players` / ESX `users` tables, shared items), which ai-core's bridge does not provide as tables; running one on ai-core is not tried.

TGIANN scripts the other way round: tgiann-core (4.9x) talks to tgiann-inventory, ox_inventory, codem-inventory, origen_inventory and core_inventory by name, else to the ESX / QB player item functions; on ai-core those are ai-core's bridge, so tgiann scripts reach whichever inventory ai-core's layer picked (ai-inventory also through the `ox_inventory` name it `provide`s). Its item pictures (`config.itemImages = "auto"`) know tgiann-inventory, ox_inventory, qb-inventory, ps-inventory, qs-inventory, codem-inventory and core_inventory.

Not added: ps-inventory 1.1.0 and lj-inventory 1.1 (qb-inventory forks: everything goes through qb-core's `Player.PlayerData.items`, the `players` / `stashitems` tables and `QBCore.Shared.Items`; lj has no server open export), ak47_inventory (the bridges show only player add / remove / count, no stash, clear or carry calls), chezza inventory (no API source found).

## Shops

Server lib `inventory.registerShop(name, label, [{ name, price }])` once at start (export `RegisterShop`; kept by ai-core and registered again with an inventory that starts later, like stashes) and `inventory.openShop(source, name)` (export `OpenShop`) after the script's own access and range checks; Lua `aiLib.inventory.registerShop` / `openShop`. A script shop has no place of its own: the script decides who opens it.

| Inventory | Register / open | Status |
|---|---|---|
| ai-inventory | own exports `RegisterShop(name, label, items)` / `OpenShop(source, name)`: the shop shows on its shop panel; buying is allowed while that player has it open (paid from cash, then bank) | ours |
| tgiann-inventory 2.4.1 | `RegisterShop(name, products, { label })` (products `{ name, price, type = "item" }`), `OpenShop(src, name)` | written from its source (server/exports.lua) |
| ox_inventory 2.48.1 | `RegisterShop(name, { name = label, inventory })` without locations; opened with its client net event `ox_inventory:openInventory ('shop', { type = name })` (its server `forceOpenInventory` has no shop branch) | written from its source (modules/shops/server.lua, client.lua) |

Not added: qb-inventory 2.2.3 (`CreateShop` / `OpenShop` exist, but its shop rows come from `QBCore.Shared.Items`, which ai-core's bridge does not fill, so every product would drop), qs-inventory, codem-inventory, core_inventory, origen_inventory, jaksam_inventory (no shop export found in a source or docs; the docs of qs are not readable without a browser). Crafting is not part of the layer: no ai-* script opens a bench by hand (ai-inventory's benches are panel places).

## Adding an inventory

1. Copy the closest adapter in `resource/server/inventory/adapters/` to `<resource>.ts` and map each `InventoryAdapter` method onto the inventory's real exports (read its source, never guess a signature). Use lib `callExport(resource, name, ...args)` and parse every answer with the readers in `../parse.ts` (Lua returns: several values arrive as an array, slot-keyed tables as an array or an object). Set `version` to the version you read.
2. Leave `registerUsableItem` out when the inventory calls the framework's use functions; implement it when it keeps its own list.
3. Add the adapter to `INVENTORIES` in `registry.ts` (order = auto detection priority) and a client adapter in `resource/client/inventory/adapters/` plus its line in `client/inventory/index.ts`.
4. Add a row to the table above. Typecheck, lint and build ai-core.

No inventory name appears outside its adapter files, the registries and this note.
