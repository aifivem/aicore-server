# Vehicle keys layer

Every ai-* script gives, takes and checks vehicle keys through ai-core (owner decision: compatibility lives in ai-core, one change reaches every script). Scripts call lib `vehicleKeys.give / remove / has` (server); ai-core forwards to the active key system through one adapter file per system.

## How it works

- Server layer: `resources/[ai]/ai-core/resource/server/vehicleKeys/` (`index.ts` exports `GiveVehicleKeys`, `RemoveVehicleKeys`, `HasVehicleKeys`; `registry.ts` lists the adapters in detection order; `adapters/` one file per system).
- Pick: ai-core panel, General tab, "Vehicle keys": `auto` (the first running system in registry order) or one system. Picked again when a system starts or stops. GlobalState `ai:vehicleKeys` tells clients which one is active.
- A vehicle is a server entity or a plate. Systems with a server API get the call directly; systems with only a client API get it through ai-core's client (`ai-core:client:vehicleKeys (action, netId, plate)`), where `resource/client/vehicleKeys/adapters/<system>.ts` calls them (the vehicle must be networked).
- `HasVehicleKeys` answers true when the system cannot tell or none runs, so no script locks players out because of the key layer.
- ai-vehicles gives the keys to whoever takes an owned vehicle out; ai-admin (`car`) and ai-jobs (work vehicles) give theirs.

## Adapters

API facts come from each system's docs and from other bridges that support them (tgiann-core, p_bridge, prp-bridge, codem-lib, kq_link), not from a versioned source, so the adapters name no tested version and do not warn on version mismatch (unlike the inventory adapters). Only ai-vehiclekeys runs on the dev server; every other adapter is untested on ai-core.

| System | Side | Give / remove | Has |
|---|---|---|---|
| ai-vehiclekeys (default, `provide`s qbx_vehiclekeys) | server | `GiveKeys` / `RemoveKeys` (source, plate) | yes |
| qbx_vehiclekeys | server | `GiveKeys` / `RemoveKeys` (source, vehicle) | no |
| qb-vehiclekeys | server | `GiveKeys` / `RemoveKeys` (source, plate) | no |
| wasabi_carlock | server | `GiveKey` / `RemoveKey` (source, plate) | no |
| Renewed-Vehiclekeys | server | `addKey` / `removeKey` (source, plate) | no |
| MrNewbVehicleKeys | server | `GiveKeysByPlate` / `RemoveKeysByPlate` (source, plate) | no |
| vehicles_keys (Jaksam) | server | `giveVehicleKeysToPlayerId(source, plate, "temporary")` / `removeKeysFromPlayerId` | no |
| mVehicle | server | `AddTemporalVehicle(source, vehicle)` / none | no |
| cd_garage | server | client event `cd_garage:AddKeys (plate)` / none | no |
| tgiann-hotwire | client | `GiveKeyVehicle(vehicle, true)` / none | no |
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

Sources disagree on wasabi_carlock's server argument order (`(plate, source)` in one bridge); the adapter follows the order its documentation link gives, `(source, plate)`.

## Adding a key system

1. Server API: a file in `server/vehicleKeys/adapters/` exporting a `VehicleKeysAdapter` (`@aicore-fivem/shared` `vehicleKeys.ts`), calling the system with lib `callExport`; add it to `KEY_SYSTEMS` in `registry.ts`.
2. Client API only: add its resource name to `CLIENT_KEY_SYSTEMS` in `registry.ts` and a `VehicleKeysClientAdapter` file in `client/vehicleKeys/adapters/`, listed in `client/vehicleKeys/index.ts`.
3. Build ai-core; the panel lists the new system.
