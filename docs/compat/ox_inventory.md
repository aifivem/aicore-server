# ox_inventory (answered by ai-inventory)

ai-inventory `provide`s `ox_inventory` and answers its exports, so scripts written for ox_inventory 2.44 run without changes. Code: `resources/[ai]/ai-inventory/resource/server/compat/ox.ts`, client part in `client/exports.ts`.

## Status

Works for the common API. Inventories are named as in ox: a player source, a stash name (`RegisterStash` first), `{ id, owner }` for personal stashes, a plate for trunks. Item names are case-insensitive (`WEAPON_PISTOL` = `weapon_pistol`); items listed in the panel with other names (aliases) answer to those too.

Server: `AddItem` (returns `success, response` and calls `cb`), `RemoveItem`, `GetItem`, `GetItemCount`, `Search` (`count` / `slots`), `CanCarryItem`, `CanCarryWeight`, `CanCarryAmount`, `GetInventory`, `GetInventoryItems`, `GetSlot`, `GetSlotWithItem`, `GetSlotsWithItem`, `GetSlotIdWithItem`, `GetSlotIdsWithItem`, `GetEmptySlot`, `SetMetadata`, `SetDurability`, `SetMaxWeight`, `RegisterStash`, `ClearInventory`, `Items`, `ItemList`, `forceOpenInventory` (stash, player, shop), `CreateTemporaryStash`, `CustomDrop`, `RemoveInventory`, `SwapSlots`.

Client: `openInventory`, `closeInventory`, `Search`, `GetItemCount`, `GetPlayerItems`, `GetPlayerWeight`, `GetPlayerMaxWeight`, `Items`, `useSlot`, `getCurrentWeapon` / `GetCurrentWeapon`; `displayMetadata`, `weaponWheel`, `setStashTarget` are accepted and do nothing.

## Known limits

- Hooks (`registerHook`, `removeHooks`), `UpdateVehicle`, `ConfiscateInventory` / `ReturnInventory`, `GetContainerFromSlot`, `RegisterShop` (shops come from the panel), the ox item `server.export` / `client.export` fields and `Keyboard` / `Progress` are not answered.
- Exports find only inventories in memory: a stash nobody opened since start is found after `RegisterStash` (which loads it) or after the first open.
- Weapons have no durability loss per shot; `durability` metadata is kept if a script sets it.
