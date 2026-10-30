# Framework API surfaces [code]

What each framework exposes for players, characters, money, jobs and permissions, read from their public sources. This is the feature list ai-core covers and the surface the bridges must answer. Data storage and saving are compared at the end.

## What tgiann-core uses (an example multi-framework consumer)

A typical multi-framework consumer: tgiann-core reaches ESX/QB through this list, a useful test set for the bridge (no priority over other scripts) (tgiann-core 4.84, `server|client/framework/{esx,qb}/main.lua`):

- **ESX object:** `exports.es_extended:getSharedObject()`, `GetPlayerFromId`, `GetPlayerFromIdentifier`, `GetPlayers`, `GetPlayerData` (client), `RegisterServerCallback` / `TriggerServerCallback`, `RegisterUsableItem`, `RegisterCommand`, `GetItemLabel`, `Items`, `Game.Utils`.
- **xPlayer:** `source`, `identifier`, `job`, `getAccount`, `addAccountMoney`, `removeAccountMoney`, `setJob`, `getInventory`, `getInventoryItem`, `addInventoryItem`, `removeInventoryItem`.
- **QB object:** `exports['qb-core']:GetCoreObject()`, `Functions.GetPlayer`, `GetPlayers`, `GetQBPlayers`, `GetPlayerByCitizenId`, `GetOfflinePlayerByCitizenId`, `GetPlayerData` (client), `CreateCallback` / `TriggerCallback`, `CreateUseableItem`, `SpawnVehicle`, `DrawText`, `Commands.Add`.
- **QB Player:** `PlayerData.{source, citizenid, money, items, metadata, charinfo.firstname/lastname, job.{name,label,grade,onduty,isboss}, gang.{name,label,grade}}`, `Functions.{SetJob, SetJobDuty, RemoveMoney, Save, AddPlayerMethod}`.
- **Qbox:** `exports.qbx_core:GetJobs`.
- **Events listened:** `esx:playerLoaded`, `esx:onPlayerLogout`, `esx:setJob`, `esx:setAccountMoney`, `esx:addInventoryItem`, `esx:removeInventoryItem`, `esx:onPlayerSpawn`, `esx:onPlayerDeath`, `QBCore:Client:OnPlayerLoaded`, `QBCore:Client:OnPlayerUnload`, `QBCore:Client:OnJobUpdate`, `QBCore:Server:OnJobUpdate`, `QBCore:Server:PlayerLoaded`, `QBCore:Server:SetDuty`, `QBCore:Player:SetPlayerData`.

## ESX (es_extended)

- **xPlayer:** accounts (`getAccount(s)`, `add/remove/setAccountMoney`, `get/add/remove/setMoney` for cash), job (`getJob`, `setJob`, `refreshJob`, paycheck toggle), group (`getGroup`, `setGroup`, `isAdmin`), identity (`getIdentifier`, `getName`, `setName`, `getSSN`), metadata (`getMeta`, `setMeta`, `clearMeta`), inventory and loadout (items, weapons, components, tints, weight), coords, `triggerEvent`, notifications, `kick`, play time.
- **ESX server:** player lookup (`GetPlayerFromId`, `GetPlayerFromIdentifier`, `GetExtendedPlayers`, `GetPlayerIdFromIdentifier`, `IsPlayerLoaded`), jobs (`GetJobs`, `CreateJob`, `DoesJobExist`, `RefreshJob(s)`), items (`GetItems`, `RegisterUsableItem`, `UseItem`, `GetItemLabel`), callbacks (both directions), commands, OneSync spawners (`SpawnVehicle`, `SpawnPed`, `SpawnObject`), Discord log, weapons list.
- **ESX client:** `GetPlayerData`, `SetPlayerData`, `IsPlayerLoaded`, callbacks, notifications, text UI, progress bar, context and menus, `Game.*` utils, `SpawnPlayer`.
- **Client events:** `esx:playerLoaded`, `esx:setAccountMoney`, `esx:setJob`, `esx:setGroup`, `esx:setInventory`, `esx:add/removeInventoryItem`, `esx:setMaxWeight`, `esx:updatePlayerData`, `esx:onPlayerLogout`, notifications. Server events: `esx:playerLoaded`, `esx:playerDropped`, `esx:setJob`, `esx:setGroup`, `esx:onPlayerDeath`, `esx:onPlayerSpawn`, `esx:playerSaved`, inventory events.
- **Config:** accounts and starting money, multichar, identity, paycheck (interval, off-duty multiplier, society payouts), admin groups, default spawns, max weight, PvP, NPC/world adjustments.
- **Schema:** `users` row (identifier, accounts JSON, group, job + job_grade, inventory, loadout, metadata, position, identity columns, skin, status, is_dead), `jobs` + `job_grades` (salary, skins).

## QBCore

- **Player:** `PlayerData` (citizenid, license, name, money map, charinfo, job, gang, metadata, items, position), `Functions.{SetJob, SetGang, SetJobDuty, AddMoney, RemoveMoney, SetMoney, GetMoney, SetMetaData, GetMetaData, SetPlayerData, UpdatePlayerData, AddRep/RemoveRep/GetRep, HasItem, Notify, Save, Logout, AddField, AddMethod}`.
- **Server:** player lookup by source, citizenid, license, phone, account, charinfo; offline players; `GetPlayersByJob`, `GetPlayersOnDuty`, `GetDutyCount`; permissions (`Add/Remove/Get/HasPermission`); buckets; callbacks; usable items; spawn vehicles; kick, bans, whitelist, opt-in; `Commands.Add`.
- **Exports:** `GetCoreObject`, `GetPlayer`, `GetPlayerByCitizenId`, `GetOfflinePlayerByCitizenId`, `AddJob(s)`, `UpdateJob`, `RemoveJob`, gang and item equivalents, `AddPlayerField`, `AddPlayerMethod`, `GetShared`.
- **Events:** client `QBCore:Client:OnPlayerLoaded`, `OnPlayerUnload`, `OnJobUpdate`, `OnGangUpdate`, `OnMoneyChange`, `OnPlayerUpdated`, `SetDuty`, `QBCore:Notify`, `QBCore:Player:SetPlayerData`; server `QBCore:Server:PlayerLoaded`, `OnPlayerUnload`, `OnJobUpdate`, `OnGangUpdate`, `OnMoneyChange`, `SetDuty`, `PlayerDropped`.
- **Config:** money types with starting amounts (`cash`, `bank`, `crypto`), accounts that cannot go negative, minus limit, paycheck interval and society payouts, update interval.

## Qbox (qbx_core)

- QB's surface plus multi-job/gang (`AddPlayerToJob`, `RemovePlayerFromJob`, `SetPlayerPrimaryJob`, gang equivalents, `HasGroup`, `HasPrimaryGroup`, `IsGradeBoss`, `GetGroupMembers`), job/gang data management at runtime (`CreateJob(s)`, `UpsertJobData`, `UpsertJobGrade`, `RemoveJobGrade`, ...), duty counts by job and type, character info (`SetCharInfo`), hooks (`registerHook`), persistence toggles, user ids (`GetUserId`, `GetPlayerByUserId`), session ids, `SearchPlayers`.
- Convars: `qbx:max_jobs_per_player`, `qbx:max_gangs_per_player`, `qbx:setjob_replaces`, `qbx:setgang_replaces`, `qbx:enablebridge`, `qbx:bucketlockdownmode`, `qbx:enablequeue`, `qbx:motd`.

## ox_core

- **OxPlayer:** characters (`createCharacter`, `deleteCharacter`, `setActiveCharacter`, `logout`), groups (`getGroup(s)`, `getGroupByType`, `setGroup`, `setActiveGroup`, `hasPermission`), statuses (`get/set/add/removeStatus`), licenses (`add/get/update/removeLicense`), metadata (`get`/`set` with replication flag), `payInvoice`, `save`, `emit`.
- **Accounts:** shared accounts table (character, group), `addBalance`, `removeBalance`, `transferBalance`, `depositMoney`, `withdrawMoney`, roles and permissions per account, invoices, ledger.
- **Exports:** player lookup (by source, charId, userId, filter), groups (`CreateGroup`, `DeleteGroup`, `Get/SetGroupPermission`, active players by group/type), accounts and invoices, vehicles (`CreateVehicle`, `SpawnVehicle`, plate/VIN generators, lookups), bans.

## ND_Core

- Small surface (`GetCoreObject`), with its own esx/qb compatibility folders; nothing ai-core needs beyond the others.

## Feature list for ai-core (union, minus what belongs to other scripts)

Core owns: users and identifiers, characters (multi-character data, create/select/delete, slots), money accounts (per character, per job, per gang) with ledger, jobs and gangs (multi, duty, grades, boss flags, salary/paycheck), permissions (ACE mirror, admin roles), metadata bag, position and basic state persistence, player lookup and offline lookup, callbacks (lib), usable-item registry hook point (the inventory owns items), player/character lifecycle events.

Not in core (separate `ai-*` scripts or adapters): inventory and items, weapons/loadout, appearance/skin, vehicles and garages, needs/status (hunger, thirst, stress), notifications/text UI/progress/menus UI, licenses, invoices/billing, bans and queue (later, maybe core), Discord logging (core log sink, later).

## How frameworks store data

From their public sources (latest commits as of 2026-10-29): data storage, saving and sync.

| | ESX (es_extended) | QBCore | Qbox (qbx_core) | ox_core |
|---|---|---|---|---|
| Language / license | Lua, GPL-3.0 | Lua, GPL-3.0 | Lua, GPL-3.0 | TS, LGPL-3.0 |
| DB driver | oxmysql | oxmysql | oxmysql | own `mariadb` pool, MariaDB 11.4+ required |
| Player schema | `users` row; `accounts`, `inventory`, `loadout`, `metadata`, `position` as JSON columns | `players` row; `money`, `charinfo`, `job`, `gang`, `metadata`, `position` as JSON | same `players` as QB + a `player_groups` table | normalized: `users`, `characters`, `character_groups`, `character_inventory`, `accounts`, `accounts_transactions`, `vehicles`, `character_licenses` |
| Money | in memory, written with the row | in memory as JSON | in memory as JSON | in the DB: `UPDATE accounts SET balance = balance ± ?` + transaction + `accounts_transactions` ledger |
| Saving | queue per identifier (one ordered write), skipped when the JSON fingerprint is unchanged within 60 s, bulk save in batches of 25 with 50 ms gaps | on leave + periodic (`UpdateInterval = 5` min), one upsert each | every 5 min walks players staggered, drops hunger/thirst and saves each one | multi-row bulk save every 10 min; on leave, on resource stop and on `txAdmin:events:serverShuttingDown` |
| Client sync | delta per account (`esx:setAccountMoney`) | per key (`QBCore:Client:OnPlayerUpdated`) but the whole `PlayerData` through `SetPlayerData` | the whole `PlayerData` to a server event and the client on every `SetPlayerData` / `SetMetadata` (20 call sites in the file) | per key (`ox:setPlayerData`, with a `replicated` flag) |
| GlobalState | | | | per-group counters (`<group>:count`, `:activeCount`) |
| Compatibility | | | `provide 'qb-core'`, `bridge/qb/` | |

### Take

- **ox_core:** atomic money in the DB + ledger; normalized schema; multi-row bulk save; save on txAdmin shutdown; per-key client sync; TS class layout (`OxPlayer` static registry + instance).
- **ESX:** ordered write queue per record; bulk saves advance in batches (no server hitch).
- **Qbox:** the compatibility layer layout through `provide` (`bridge/qb/client|server|shared`).

### Leave

- QB/Qbox: sending the whole `PlayerData` to the client when one field changes; in Qbox this means two full `PlayerData` sends per player every 5 minutes (hunger + thirst).
- ESX/QB: keeping everything about a player in one row of JSON columns (no indexes, no atomic updates, the whole row written every save).
- ox_core: a second DB pool next to oxmysql (bridge scripts already use oxmysql).
- ESX: JSON-encoding all data on every save to check whether it changed (a dirty flag is enough).

### Files to read

- ESX saving: `esx_core/[core]/es_extended/server/modules/player/save.lua`
- QB saving and client updates: `qb-core/server/player.lua` (`QBCore.Player.Save`, `Player:UpdateClient`)
- Qbox: `qbx_core/server/player.lua` (`SetPlayerData`, `UpdatePlayerData`), `server/loops.lua`
- ox_core: `server/player/class.ts` (`saveAll`, `set`), `server/accounts/db.ts`, `server/db/pool.ts`, `sql/install.sql`
