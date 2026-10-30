# ESX / QB / Qbox bridge (ai-core)

ai-core presents itself as `es_extended`, `qb-core` and `qbx_core` (manifest `provide`) and answers their exports, core objects and events from Lua in `resources/[ai]/ai-core/bridge/`. Every call goes to ai-core; the player mirror follows ai-core's local events. Status: written and checked on the dev server with a test resource (exports, legacy events, Shared tables, item definitions); not yet tested with a real ESX / QB script in game.

## Detection

| Style | Status |
|---|---|
| `GetResourceState('es_extended' / 'qb-core' / 'qbx_core')` | `provide` lines are in the manifest. On the running dev server they still report `missing` after `refresh` + restart of ai-core, while `oxmysql` (provided by ai-mysql since server start) reports `started`: provides seem to be read only at server start. Verify after the next full server restart. |
| `exports['qb-core']:GetCoreObject()` | works |
| `TriggerEvent('QBCore:GetObject', cb)` | works |
| `exports.es_extended:getSharedObject()` | works |
| `TriggerEvent('esx:getSharedObject', cb)` | answered |
| `exports.qbx_core:*` | works (list below) |
| `@qbx_core/modules/playerdata.lua` include | ai-core's `modules/playerdata.lua` (keeps `QBX.PlayerData`) |

## QBCore (server)

- `QBCore.Functions`: `GetPlayer`, `GetPlayerByCitizenId`, `GetOfflinePlayerByCitizenId` (online only), `GetPlayers`, `GetQBPlayers`, `GetIdentifier`, `Notify`, `CreateCallback`, `CreateUseableItem` (ai-inventory), `HasItem`.
- `QBCore.Commands.Add`; `QBCore.Shared.Jobs`, `Gangs` (from ai-core's job and gang definitions, grades keyed `'0'`, `'1'`...), `Items` (from ai-inventory).
- Player: `PlayerData` (`citizenid`, `cid`, `license`, `name`, `money`, `charinfo`, `job` with `onduty`/`isboss`/`grade`, `gang`, `metadata`), `Functions`: `AddMoney`, `RemoveMoney`, `SetMoney`, `GetMoney`, `SetJob`, `SetJobDuty`, `SetGang`, `SetMetaData`, `GetMetaData`, `AddItem`, `RemoveItem`, `GetItemByName`, `GetItemsByName`, `Notify`, `Save` / `UpdatePlayerData` (no-ops: ai-core saves itself).
- Events: `QBCore:Server:PlayerLoaded`, `QBCore:Server:OnPlayerUnload`, `QBCore:Server:OnMoneyChange`, `QBCore:Server:OnJobUpdate`, `QBCore:Server:OnGangUpdate`; callbacks over `QBCore:Server:TriggerCallback` / `QBCore:Client:TriggerCallback` (30 requests per 10 s per player).

## QBCore (client)

- `QBCore.Functions.GetPlayerData`, `TriggerCallback`, `Notify`, `GetClosestPlayer`, `GetClosestVehicle`, `GetPlate`.
- Events fired locally: `QBCore:Client:OnPlayerLoaded`, `QBCore:Client:OnPlayerUnload`, `QBCore:Player:SetPlayerData`, `QBCore:Client:OnJobUpdate`, `QBCore:Client:SetDuty`, `QBCore:Client:OnGangUpdate`, `QBCore:Client:OnMoneyChange`; `QBCore:Notify` from the server shows ai-core's notification.

## Qbox (`exports.qbx_core`)

Server: `GetPlayer` (source or citizenid), `GetPlayerByCitizenId`, `GetOfflinePlayer` (online only), `GetQBPlayers`, `GetPlayersData`, `GetJobs`, `GetGangs`, `GetJob`, `GetGang`, `Notify`, `CreateUseableItem`, `SetJob`, `AddPlayerToJob`, `RemovePlayerFromJob`, `SetPlayerPrimaryJob`, `SetJobDuty`, `AddPlayerToGang`, `RemovePlayerFromGang`, `GetGroups`, `HasGroup`, `HasPrimaryGroup`, `GetDutyCountJob`, `GetDutyCountType`, `GetSource`, `IsPlayerLoaded`, `Logout`, `GetCoreObject`.
Client: `GetPlayerData`, `Notify`, `IsLoggedIn`, `GetGroups`, `HasPrimaryGroup`.

## ESX

- Server `ESX`: `GetPlayerFromId`, `GetPlayerFromIdentifier` (identifier = citizenid), `GetPlayers`, `GetExtendedPlayers` (`job` / `group` filter), `GetJobs`, `RegisterServerCallback`, `RegisterUsableItem`, `GetItemLabel`, `RegisterCommand`, `GetExtendedPlayerCount`.
- xPlayer: `source`, `identifier`, `name`, `job`, `group` (`admin` with the `ai.admin` ace), `getName`, `getIdentifier`, `getGroup`, `getJob`, `setJob`, `getMoney` / `addMoney` / `removeMoney` / `setMoney` (ai-core's `cash`), `getAccounts`, `getAccount`, `addAccountMoney`, `removeAccountMoney`, `setAccountMoney` (`money` = `cash`), `getInventory`, `getInventoryItem`, `hasItem`, `addInventoryItem`, `removeInventoryItem`, `canCarryItem`, `getCoords`, `showNotification`, `triggerEvent`, `kick`, `set` / `get`, `getMeta` / `setMeta`.
- Server events: `esx:playerLoaded`, `esx:playerDropped`, `esx:playerLogout`, `esx:setJob`; callbacks over `esx:triggerServerCallback` / `esx:serverCallback`.
- Client `ESX`: `PlayerData`, `PlayerLoaded`, `GetPlayerData`, `IsPlayerLoaded`, `SetPlayerData`, `ShowNotification`, `TriggerServerCallback`; events `esx:playerLoaded`, `esx:onPlayerLogout`, `esx:setAccountMoney`, `esx:setJob`; `esx:showNotification` from the server shows ai-core's notification.

## Known limits

- One job per framework view: the on-duty job, else the first membership (ai-core allows several).
- Offline players are not answered (`GetOfflinePlayer*` return online players only).
- QB metadata in `PlayerData` is a copy of the known keys (hunger, thirst, stress, isdead, inlaststand, ishandcuffed, armor...) at the moment the Player object is handed out; `GetMetaData(key)` reads any key live.
- Not answered yet: `ESX.Game.*`, `QBCore.Functions.GetVehicleProperties` / `SetVehicleProperties`, client `HasItem`, `ESX.OneSync.*`, qb-core `KeepTrack`, Qbox `lib` module includes (`@qbx_core/modules/lib.lua`).
