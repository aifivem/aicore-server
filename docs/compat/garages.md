# Garage layer (garage scripts)

Impounding, storing, opening a garage menu and listing a player's garaged vehicles go through ai-core, so scripts never call a garage script. Each script answers only what it really exposes; an action it does not have answers false (or null for the list).

- Server: lib `garages.impound(vehicle, by?)`, `store(vehicle, garage?, by?)`, `open(source, garage?)`, `stored(source)` (a promise), `provider()` (exports `ImpoundVehicle`, `StoreVehicleInGarage`, `OpenGarage`, `GetGaragedVehicles(source, done)`, `GetGarageSystem`; `resources/[ai]/ai-core/resource/server/garages/`). Panel setting `garages` (`auto` = the first running script of `GARAGE_SYSTEMS`); the pick is published as GlobalState `ai:garages` for the client adapters.
- `impound` false means nothing took the vehicle: the caller deletes it (ai-police does; an owned ai-vehicles vehicle whose entity disappears goes to the impound state anyway).
- Client-API scripts get the action on the acting player's client (`ai-core:client:garages (action, netId, garage)`, `resource/client/garages/`).

| Script | Impound | Store | Open | List | Status |
|---|---|---|---|---|---|
| ai-garages | export `ImpoundVehicle(entity)` (ai-vehicles impound state, condition saved) | export `StoreVehicle(entity, garageId)` | none | export `GetStoredVehicles(source)` | ours |
| tgiann-realparking 2.14.0 | export `ImpoundVehicle(plate, { deleteVehicle = true })` | none | none | export `GetPlayerVehicleDetails(citizenid)` (vehicles not out) | written from its source |
| tgiann-garage | none | none | client event `tgiann-garage:open` (only inside its zones) | none | written from its source (no `version` in its fxmanifest) |
| jg-advancedgarages | client `showImpoundForm()` for `by` | client `storeVehicle(garageId)` for `by` (the vehicle `by` sits in) | client `openGarage(garageId)` | none | written from its docs |
| cd_garage | client event `cd_garage:ImpoundVehicle (vehicle)` for `by` (its impound form) | none | none | none | written from its docs |

A new garage script: one adapter file (`GarageAdapter`), or a `clientGarage(resource, actions)` line plus its client adapter (`GarageClientAdapter`), in `GARAGE_SYSTEMS`. Every third-party script of the list makes ai-garages unneeded unless its adapter is `besideOurs` (`connection/conflicts.ts`).

## Limits

- jg-advancedgarages and cd_garage impound through their own form on the officer's client: jg takes the vehicle closest to the officer (5 m), not necessarily the one picked.
- jg-advancedgarages needs a garage id for open and store; tgiann-garage opens only the garage zone the player stands in.
- ai-garages has no remote "open": its list needs the player inside the garage area.
- Not supported (no script API found): qb-garages 2.0.0 (only `getAllGarages`), okokGarage (keys and stolen-vehicle events only), rcore_garage (no documented API). qs-advancedgarages: its docs could not be read (the site moved to an app), so no adapter.
- Taking a vehicle out is not part of the layer: tgiann-realparking's `TakeVehicleOut(plate)` removes a parked vehicle, ai-garages spawns through ai-vehicles; no shared meaning.
