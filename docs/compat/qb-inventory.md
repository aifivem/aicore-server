# qb-inventory (answered by ai-inventory)

ai-inventory `provide`s `qb-inventory` and answers its exports (qb-inventory 2.0 API), so QBCore scripts that call `exports['qb-inventory']` work. Code: `resources/[ai]/ai-inventory/resource/server/compat/qb.ts`, client part in `client/exports.ts`.

## Status

Server: `AddItem(identifier, item, amount, slot, info)` (`info` is the metadata), `RemoveItem`, `HasItem` (name, list or `{ name = amount }`), `GetItemCount`, `GetItemByName`, `GetItemsByName`, `GetItemBySlot`, `CanAddItem`, `GetFreeWeight`, `GetSlots`, `ClearInventory`, `SetItemData`, `CreateInventory`, `OpenInventory` (creates the stash when missing), `OpenInventoryById`, `RemoveInventory`, `CloseInventory`. Client: `HasItem`, `CloseInventory`.

Returned items carry both shapes: `count` / `metadata` (ox) and `amount` / `info` (qb).

## Known limits

- Hooks and listeners (`AddHook`, `AddListener`), `CreateShop` / `OpenShop` (shops come from the panel), `SetInventory`, `GetInventory`, `SaveInventory`, `LoadInventory`, `UseItem` and the functions that take a QB items table (`GetFirstSlotByItem`, `GetSlotsByItem`, `GetTotalWeight`) are not answered.
- `Player.Functions.AddItem` / `RemoveItem` / `GetItemByName` and `QBCore.Functions.CreateUseableItem` belong to the framework bridge in ai-core, which answers them through ai-core's inventory layer (`docs/compat/inventory.md`).
