# Vehicle keys layer

Every ai-* script gives, takes and checks vehicle keys through ai-core (owner decision: compatibility lives in ai-core, one change reaches every script). Scripts call lib `vehicleKeys.give(source, vehicle, purpose) / remove / has` (server); ai-core forwards to the active key system through one adapter file per system.

## How it works

- Server layer: `resources/[ai]/ai-core/resource/server/vehicleKeys/` (`index.ts` exports `GiveVehicleKeys`, `RemoveVehicleKeys`, `HasVehicleKeys`; `registry.ts` lists the adapters in detection order; `adapters/` one file per system).
- Pick: ai-core panel, General tab, "Vehicle keys": `auto` (the first running system in registry order) or one system. Picked again when a system starts or stops. GlobalState `ai:vehicleKeys` tells clients which one is active.
- A vehicle is a server entity or a plate. Systems with a server API get the call directly; systems with only a client API get it through ai-core's client (`ai-core:client:vehicleKeys (action, netId, plate, purpose)`), where `resource/client/vehicleKeys/adapters/<system>.ts` calls them (the vehicle must be networked).
- Every give names why the player gets the key (`KeyPurpose` in `@aicore-fivem/shared`): `purchase` (now owned, a new key), `garage` (owned vehicle out of storage), `job` (work vehicle), `rental`, `temporary` (default: admin spawn, test drive, robbery vehicle). A system that knows the difference gets it (tgiann-hotwire below); the others give a key the same way for every purpose.
- `HasVehicleKeys` answers true when the system cannot tell or none runs, so no script locks players out because of the key layer.
- Client `HasVehicleKeys(entity | plate)` (lib client `vehicleKeys.has`, QB `HasKeys` on the client): exports stay synchronous and no key system keeps a client state ai-core can read, so ai-core's client keeps the server layer's answers per plate for 10 s. It asks the server (`ai-core:vehicleKeys:has`, a net id or a plate) when the player enters a vehicle and when a script asks about an unknown or stale plate (that call answers false, or the old value), and the server sends the new answer (`ai-core:client:vehicleKeyHeld (plate, held)`) to the player after every give / remove through ai-core. Keys a system grants or takes itself (lockpick, hotwire, hand over) show once the answer expires. For client-API systems and systems without a server `has` (the table below) the answer is true, as on the server.
- Callers: ai-vehicles `SpawnVehicle(id, at, asker, cb, purpose = "garage")` (ai-garages: `garage`, ai-vehicleshop: `purchase`), ai-jobs `job`, ai-rental `rental`, ai-admin `car` `temporary`.

## Adapters

API facts come from each system's docs and from other bridges that support them (tgiann-core, p_bridge, prp-bridge, codem-lib, kq_link), not from a versioned source, so the adapters name no tested version and do not warn on version mismatch (unlike the inventory adapters). Only ai-vehiclekeys runs on the dev server; every other adapter is untested on ai-core.

| System | Side | Give / remove | Has |
|---|---|---|---|
| ai-vehiclekeys (default, `provide`s qbx_vehiclekeys) | server | `GiveKeys` / `RemoveKeys` (source, plate) | yes |
| qbx_vehiclekeys (1.0.3 source) | server | `GiveKeys` / `RemoveKeys` (source, vehicle) | `HasKeys(source, vehicle)`; a plate alone counts as held |
| qb-vehiclekeys | server | `GiveKeys` / `RemoveKeys` (source, plate) | no |
| wasabi_carlock | server | `GiveKey` / `RemoveKey` (source, plate) | `HasKey(source, plate)` |
| Renewed-Vehiclekeys | server | `addKey` / `removeKey` (source, plate) | no |
| MrNewbVehicleKeys | server | `GiveKeysByPlate` / `RemoveKeysByPlate` (source, plate) | no |
| vehicles_keys (Jaksam) | server | `giveVehicleKeysToPlayerId(source, plate, "temporary")` / `removeKeysFromPlayerId` | no |
| mVehicle | server | `AddTemporalVehicle(source, vehicle)` / none | no |
| cd_garage | server | client event `cd_garage:AddKeys (plate)` / none | no |
| tgiann-hotwire | server | by purpose, below / `SetNonRemoveableIgnition(netId, vehicle, false)` for a fixed ignition key | `keyInIgnition` state or a `car_key` item with the plate |
| qs-vehiclekeys | client | `GiveKeys(plate, model, true)` / `RemoveKeys(plate, model)` | no |
| okokGarage | client | server events `okokGarage:GiveKeys` / `RemoveKeys` (plate) | no |
| 0r-vehiclekeys, filo_vehiclekey | client | `GiveKeys` / `RemoveKeys` (plate) | no |
| LifeSaver_KeySystem | client | `AddCarkey` / `RemoveCarkey` (plate, model) | no |
| ak47_vehiclekeys, ak47_qb_vehiclekeys | client | `GiveKey` / `RemoveKey` (plate, local) | no |
| brutal_keys | client | `addVehicleKey(plate, "car")` / `removeKey(plate, true)` | no |
| ic3d_vehiclekeys | client | `ClientInventoryKeys("add" / "remove", plate)` | no |
| is_vehiclekeys | client | `GiveKey` / `RemoveKey` (plate) | no |
| mk_vehiclekeys | client | `AddKey` / `RemoveKey` (vehicle) | no |
| mm_carkeys | client | `GiveKeyItem(plate, vehicle)` / `RemoveKeyItem(plate)` | no |
| p_carkeys | client | server events `p_carkeys:CreateKeys` / `RemoveKeys` (plate) | no |
| rd_vehiclekeys | client | server events `rd_vehiclekeys:server:GiveKeys` / `RemoveKeys` (plate) | no |
| t1ger_keys | client | `GiveTemporaryKeys(plate, vehicle name, "")` (its docs) / none (temporary keys cannot be taken back; owned keys need ESX `owned_vehicles`) | no |

### tgiann-hotwire by purpose

Keys are `car_key` items (metadata `plate` + `keyId`); a key can sit in the ignition (entity state `keyInIgnition`, saved per plate). Server exports take `(netId, entity, ...)`; `GiveKeyPlate(source, plate, isNew)`.

| Purpose | Call | Result |
|---|---|---|
| `purchase` | `GiveKeyPlate(source, plate, true)` | new key id: a key item, older copies stop working |
| `garage` | `CheckKeyInIgnitionWhenSpawn(netId, vehicle)` | the key goes back into the ignition when it was there at parking; the owner keeps the item otherwise |
| `job`, `rental`, `temporary` | `SetNonRemoveableIgnition(netId, vehicle, true)` | a key fixed in the ignition, nothing in an inventory |
| any, plate only | `GiveKeyPlate(source, plate, false)` | a key item with the plate's current key id |

Sources disagree on wasabi_carlock's server argument order (`(plate, source)` in one bridge); the adapter follows its documentation (docs.wasabiscripts.com, advanced-series wasabi-carlock exports), `(source, plate)`. community_bridge reaches Renewed-Vehiclekeys (`addKey(plate)` / `removeKey(plate)`) and MrNewbVehicleKeys (`GiveKeysByPlate(plate)` / `RemoveKeysByPlate(plate)`) through client exports; their server signatures used here are not confirmed by a doc.

TGIANN scripts that only use keys (tgiann-garage, tgiann-vehiclecontrol, tgiann-core's `GiveVehicleKey`) are callers of tgiann-hotwire / qb-vehiclekeys, not key systems: nothing to adapt.

## Adding a key system

1. Server API: a file in `server/vehicleKeys/adapters/` exporting a `VehicleKeysAdapter` (`@aicore-fivem/shared` `vehicleKeys.ts`), calling the system with lib `callExport`; add it to `KEY_SYSTEMS` in `registry.ts`.
2. Client API only: add its resource name to `CLIENT_KEY_SYSTEMS` in `registry.ts` and a `VehicleKeysClientAdapter` file in `client/vehicleKeys/adapters/`, listed in `client/vehicleKeys/index.ts`.
3. Build ai-core; the panel lists the new system.
