# ESX / QB / Qbox bridge (ai-core)

ai-core presents itself as `es_extended`, `qb-core` and `qbx_core` (manifest `provide`) and answers their exports, core objects and events from Lua in `resources/[ai]/ai-core/bridge/`. Every call goes to ai-core; the player mirror follows ai-core's local events. Status: written and checked on the dev server with a test resource after a full server restart (resource states, exports, legacy events, Shared tables, item definitions; the three framework file includes from a resource that includes them like an ESX / QB script); not yet tested with a real ESX / QB script. Prepared for that test: esx_joblisting 1.14.1 (ESX-Legacy-Addons, needs only es_extended) and qb-cityhall (its server part needs only qb-core), cloned under `ai-core-research/bridgetest` and `ai-core-research/jobs`; running downloaded third-party code on the dev server needs the owner's go-ahead, so it was not started.

vRP (1.0, 0.5 call style, 2, 3) is answered too (`provide 'vrp'`, `bridge/vrp/`): its coverage and limits are in `docs/compat/vrp.md`.

## Detection

| Style | Status |
|---|---|
| `GetResourceState('es_extended' / 'qb-core' / 'qbx_core')` | `started` (checked after a full server restart; provides added while the server runs are only read at the next server start) |
| `exports['qb-core']:GetCoreObject()` | works |
| `TriggerEvent('QBCore:GetObject', cb)` | works |
| `exports.es_extended:getSharedObject()` | works |
| `TriggerEvent('esx:getSharedObject', cb)` | answered |
| `exports.qbx_core:*` | works (list below) |
| `@qbx_core/modules/playerdata.lua` include | ai-core's `modules/playerdata.lua` (keeps `QBX.PlayerData`) |
| `@qb-core/shared/locale.lua` include | ai-core's `shared/locale.lua` (QBCore's Locale class, copied from qb-core, GPL-3.0) |
| `@es_extended/imports.lua` include | ai-core's `imports.lua` (the `ESX` global, client `PlayerData` kept from the bridge's ESX events) |
| `@es_extended/locale.lua` include | ai-core's `locale.lua` (`Translate`, `_`, `_U`; both `Locales['en'] = {}` and returning locale files) |

## QBCore (server)

- `QBCore.Functions`: `GetPlayer`, `GetPlayerByCitizenId`, `GetOfflinePlayerByCitizenId` (online only), `GetPlayers`, `GetQBPlayers`, `GetIdentifier`, `Notify`, `CreateCallback`, `CreateUseableItem`, `CanUseItem`, `HasItem` (items through ai-core's inventory layer, `docs/compat/inventory.md`).
- `QBCore.Commands.Add`; `QBCore.Shared.Jobs`, `Gangs` (from ai-core's job and gang definitions, grades keyed `'0'`, `'1'`...), `Items` (from the active inventory).
- Player: `PlayerData` (`citizenid`, `cid`, `license`, `name`, `money`, `charinfo` (with ai-core's `nationality`), `job` with `onduty`/`isboss`/`grade`, `gang`, `metadata`), `Functions`: `AddMoney`, `RemoveMoney`, `SetMoney`, `GetMoney`, `SetJob`, `SetJobDuty`, `SetGang`, `SetMetaData`, `GetMetaData`, `AddItem`, `RemoveItem`, `GetItemByName`, `GetItemsByName`, `Notify`, `Save` / `UpdatePlayerData` (no-ops: ai-core saves itself).
- Events: `QBCore:Server:PlayerLoaded`, `QBCore:Server:OnPlayerUnload`, `QBCore:Server:OnMoneyChange`, `QBCore:Server:OnJobUpdate`, `QBCore:Server:OnGangUpdate`; callbacks over `QBCore:Server:TriggerCallback` / `QBCore:Client:TriggerCallback` (30 requests per 10 s per player).

## QBCore (client)

- `QBCore.Functions.GetPlayerData`, `TriggerCallback` (callback or await form), `Notify`, `GetClosestPlayer`, `GetClosestVehicle`, `GetPlate`, `Progressbar`, `HasItem` (name, list or `{ name = count }` through ai-core's inventory layer), `GetCoords`, `GetName`, `GetVehicles`, `GetObjects`, `GetPlayers`, `GetPlayersFromCoords`, `GetPeds`, `GetClosestPed`, `GetClosestObject`, `LoadModel`, `RequestAnimDict`, `DeleteVehicle`, `GetVehicleLabel`, `DrawText`, `DrawText3D`, `GetStreetNametAtCoords`, `GetZoneAtCoords`, `GetCardinalDirection`, `GetCurrentTime`, `GetGroundZCoord`, `GetGroundHash`; every one also as `exports['qb-core']:<name>` (as qb-core does).
- Events fired locally: `QBCore:Client:OnPlayerLoaded`, `QBCore:Client:OnPlayerUnload`, `QBCore:Player:SetPlayerData`, `QBCore:Client:OnJobUpdate`, `QBCore:Client:SetDuty`, `QBCore:Client:OnGangUpdate`, `QBCore:Client:OnMoneyChange`; `QBCore:Notify` from the server shows ai-core's notification.

## Qbox (`exports.qbx_core`)

Server: `GetPlayer` (source or citizenid), `GetPlayerByCitizenId`, `GetOfflinePlayer` (online only), `GetQBPlayers`, `GetPlayersData`, `GetJobs`, `GetGangs`, `GetJob`, `GetGang`, `Notify`, `CreateUseableItem`, `SetJob`, `AddPlayerToJob`, `RemovePlayerFromJob`, `SetPlayerPrimaryJob`, `SetJobDuty`, `AddPlayerToGang`, `RemovePlayerFromGang`, `GetGroups`, `HasGroup`, `HasPrimaryGroup`, `GetDutyCountJob`, `GetDutyCountType`, `CanUseItem`, `GetSource`, `IsPlayerLoaded`, `Logout`, `GetCoreObject`.
Client: `GetPlayerData`, `Notify`, `IsLoggedIn`, `GetGroups`, `HasPrimaryGroup`.

## ESX

- Server `ESX`: `GetPlayerFromId`, `GetPlayerFromIdentifier` (identifier = citizenid), `GetPlayers`, `GetExtendedPlayers` (`job` / `group` filter), `GetJobs`, `RegisterServerCallback`, `RegisterUsableItem`, `UseItem`, `GetItemLabel`, `RegisterCommand`, `GetExtendedPlayerCount`, `Player` (by id or identifier), `IsPlayerLoaded`, `GetPlayerIdFromIdentifier`, `DoesJobExist`, `GetConfig`, `RegisterPlayerFunctionOverrides` / `SetPlayerFunctionOverride` (every registered set replaces xPlayer functions, as in current ESX: on players built later and on the loaded ones; tgiann-core calls it in ESX mode and stops loading without it). `GetJobs()` marks a job `whitelisted` unless its ai-core panel switch "Listed in the job center" (`listed` in `data/jobs.json`, default off; `unemployed` ships listed) is on, so esx_joblisting shows exactly the listed jobs.
- xPlayer: `source`, `identifier`, `name`, `job`, `group` (`admin` with the `ai.admin` ace), `getName`, `getIdentifier`, `getGroup`, `getJob`, `setJob`, `getMoney` / `addMoney` / `removeMoney` / `setMoney` (ai-core's `cash`), `getAccounts`, `getAccount`, `addAccountMoney`, `removeAccountMoney`, `setAccountMoney` (`money` = `cash`), `getInventory`, `getInventoryItem`, `hasItem`, `addInventoryItem`, `removeInventoryItem`, `canCarryItem`, `getCoords`, `showNotification`, `triggerEvent`, `kick`, `set` / `get`, `getMeta` / `setMeta`.
- Server events: `esx:playerLoaded`, `esx:playerDropped`, `esx:playerLogout`, `esx:setJob`; callbacks over `esx:triggerServerCallback` / `esx:serverCallback`.
- Client `ESX`: `PlayerData` (with `ped`, kept from ai-core's cache watcher), `PlayerLoaded`, `playerId`, `serverId`, `GetPlayerData`, `IsPlayerLoaded`, `SetPlayerData`, `ShowNotification`, `TriggerServerCallback`, `AwaitServerCallback`, `GetConfig`, `SecureNetEvent`, `GetAccount`, `RegisterInput`, `HashString`, `DrawMissionText`, `ShowFloatingHelpNotification` (GTA native), the UI below, `ESX.Game` (`GetPedMugshot`, `Teleport`, `SpawnObject` / `SpawnLocalObject` (local objects), `SpawnLocalVehicle`, `DeleteVehicle`, `DeleteObject`, `IsVehicleEmpty`, `GetObjects`, `GetPeds`, `GetVehicles`, `GetPlayers`, `GetClosest*`, `GetPlayersInArea`, `GetVehiclesInArea`, `IsSpawnPointClear`, `GetShapeTestResultSync`, `RaycastScreen`, `GetVehicleInDirection`, `Utils.DrawText3D`), `ESX.Streaming.*`, `ESX.Point` / `ESX.Class` (from `@es_extended/imports.lua`; the 500 ms distance check runs in ai-core); events `esx:playerLoaded`, `esx:onPlayerLogout`, `esx:setAccountMoney`, `esx:setJob`; `esx:showNotification` / `esx:showAdvancedNotification` / `esx:showHelpNotification` from the server show ai-core's notification / prompt.
- Both sides: `ESX.Math`, `ESX.Table`, `ESX.SetTimeout` / `ClearTimeout`, `GetRandomString`, `DumpTable`, `Round`, `ValidateType`, `AssertType`, `IsFunctionReference`, `Await` (es_extended's shared modules). xPlayer also has `showHelpNotification` and `showAdvancedNotification`.

## Framework UI (client)

ESX's and QB's UI is drawn by ai-core's own menu, input dialog, prompts, notifications and progress bar (`bridge/core/ui.lua`); no framework NUI runs. ai-core `provide`s `esx_context`, `esx_textui`, `esx_notify`, `esx_progressbar`, `esx_menu_default`, `esx_menu_dialog`, `esx_menu_list`, `qb-menu`, `qb-input` and `progressbar` and answers their exports, so those resources must not be installed (the connection gate names them for deletion). The framework menus stack (a sub menu over its parent) while ai-core shows one dialog at a time: the bridge keeps the stack, shows its top, and shows a menu again when it stays open after a pick (esx_context and ESX default menus stay open until the script closes them). Closing from code uses ai-core's client export `CloseDialog()`.

| API | On ai-core |
|---|---|
| `ESX.OpenContext(position, eles, onSelect, onClose, canClose)`, `CloseContext`, `RefreshContext`, `exports.esx_context:Open/Close/Refresh` | ai-core menu: a first `unselectable` element is the title, later ones and `disabled` are dimmed rows, `description` and `icon` shown (icons outside ai-core's icon map show a dot), HTML and `~r~` codes stripped. `input` elements show their value; picking one opens an input dialog (`text`, `number` with min / max) or a pick list (`radio`) and writes `inputValue`, which the script reads from `menu.eles`. Escape fires `onClose` unless `canClose` is false |
| `ESX.UI.Menu.Open/Close/CloseAll/GetOpened/GetOpenedMenus/IsOpen/RegisterType`, menu `close/update/refresh/setElement/setElements/setTitle/removeElement` | type `default` = ai-core menu (submit `{ current, elements }`, Escape = the menu's `cancel`, or a close when it has none); slider rows show `label: < value >` and ask for the value (options pick list or number input), then call `change`, or `submit` when the menu has no `change`; type `dialog` = input dialog (`big` = several lines; numbers rounded and refused at 0 or below, the value trimmed to text, as esx_menu_dialog); type `list` = one row per `{{Label|value}}` button of each row (submit `{ data, value }`). A script that registers its own type with `RegisterType` keeps it |
| `ESX.RegisterInteraction(name, onPress, condition)`, `RemoveInteraction`, `GetInteractKey` | ai-core's interaction key (`aicore_interact`) runs every interaction whose condition holds while an ESX text UI or help notification prompt is on screen; `GetInteractKey` gives that key's binding |
| `ESX.TextUI` / `HideUI`, `exports.esx_textui`, `ESX:TextUI` / `ESX:HideUI` | ai-core prompt |
| `ESX.ShowHelpNotification` | ai-core prompt (`~INPUT_*~` tokens removed), hidden 250 ms after the last call (or after `duration`) |
| `ESX.ShowNotification`, `ShowAdvancedNotification` (sender = title), `exports.esx_notify:Notify`, `ESX:Notify` | ai-core notification |
| `ESX.Progressbar(message, length, { FreezePlayer, animation, onFinish, onCancel })`, `CancelProgressbar`, `exports.esx_progressbar` | ai-core progress bar; the bridge plays the anim / scenario and freezes; key mapping `cancelprog` (Backspace) cancels |
| `QBCore.Functions.Progressbar(...)`, `exports.progressbar:Progress(action, finish)`, `isDoingSomething`, `progressbar:client:cancel` | ai-core progress bar with anim / scenario, `controlDisables` and `canCancel` (`cancelprog`); props are not attached |
| `exports['qb-core']:DrawText/ChangeText/HideText/KeyPressed`, `qb-core:client:DrawText` events | ai-core prompt |
| `exports['qb-menu']:openMenu(data, sort, skipFirst)`, `closeMenu`, `qb-menu:client:openMenu/closeMenu` | ai-core menu (first `isMenuHeader` = title, `txt` = description, `hidden` skipped); a pick runs `params` like qb-menu (`isServer`, `isCommand`, `isQBCommand`, `isAction`, else a client event) |
| `exports['qb-input']:ShowInput({ header, submitText, inputs })` | waits: text / password / number / color fields in one input dialog, then one pick list per `select` / `radio` field; returns values by name (text values as strings) or nil |

## Known limits

- One job per framework view: the on-duty job, else the first membership (ai-core allows several).
- Offline players are not answered (`GetOfflinePlayer*` return online players only).
- QB metadata in `PlayerData` is a copy of the known keys (hunger, thirst, stress, isdead, inlaststand, ishandcuffed, armor...) at the moment the Player object is handed out; `GetMetaData(key)` reads any key live. `armor` is the armour ai-core sampled from the ped at its last save (periodic flush, unload). The client `PlayerData.metadata` is empty.
- ESX has no nationality field; ai-core's `nationality` reaches only QB / Qbox `charinfo`.
- Exports a server added to its own modified framework copy are not answered (`exports.qbx_core:GetPoliceJobs()` is not in Qbox): a config that calls one errors at load and leaves the rest of that config unset (`langs`, `locations` nil); write the value itself (`{ "police" }`). A real `qbx_core` / `es_extended` / `qb-core` folder next to ai-core does not bring them back: the connection gate names it for deletion.
- Not answered yet: `ESX.Game.GetVehicleProperties` / `SetVehicleProperties` / networked `SpawnVehicle`, `QBCore.Functions.GetVehicleProperties` / `SetVehicleProperties` / `SpawnVehicle`, `ESX.SearchInventory`, `ESX.ShowInventory`, `ESX.UI.ShowInventoryItemNotification`, `ESX.GetWeapon*`, `ESX.Scaleform.*`, `ESX.RegisterClientCallback`, `ESX.SpawnPlayer`, `ESX.OneSync.*`, `QBCore.Functions.PlayAnim`, `LookAtEntity`, `IsWearingGloves`, `SpawnClear`, `AttachProp`, particle and bone helpers, `CreateClientCallback`, qb-core `KeepTrack`, Qbox `lib` module includes (`@qbx_core/modules/lib.lua`).
- UI limits: ai-core's menu shows 40 rows (longer ESX / QB menus are cut); ai-core has no unfocused menu, so `ESX.PreviewContext`, esx_context `focusPreview` and qb-menu `showHeader` show nothing; an ESX interaction fires only while an ESX text UI or help prompt is on screen (ESX runs them on any press of its key); text fields must not be empty to confirm (optional qb-input fields too); qb-input `checkbox` fields are not asked; QB progress props are not attached.
