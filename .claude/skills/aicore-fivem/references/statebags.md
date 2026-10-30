# State bags: what the engine does, and the lib classes

Sources: citizenfx/fivem `data/shared/citizen/scripting/v8/main.js` (JS proxies), `code/components/citizen-scripting-core/src/ResourceScriptFunctions.cpp` (natives), `code/components/citizen-resources-core/src/StateBagComponent.cpp` (storage), docs "State bags", `sv_stateBagStrictMode`, issues #1942, #3930, #3289, #1304.

## A read is expensive

`Entity(e).state.fuel` in JS:

1. `Entity(e)` builds a proxy; `.state` calls `NetworkGetEntityIsNetworked` + `NetworkGetNetworkIdFromEntity` (server: also `EnsureEntityStateBag`), builds the bag name string and a second proxy.
2. `.fuel` calls `GET_STATE_BAG_VALUE`: the component looks the bag up in a global map under a shared lock (allocating a `std::string` for the key), the bag looks the key up under its own shared lock and copies the stored msgpack string, the native copies it again into a thread-local buffer.
3. The runtime decodes the msgpack into new JS objects.

Every read repeats all of it. On a busy server the map lock is shared with the network thread (it takes it exclusively when a player joins and walks every bag), so a read in a tick can wait milliseconds (issue #1942: an entity bag read in a tick went from <5 ms to 100-250 ms with player count). In a loop over entities or every frame this is the "state check eats ms" effect.

## A write is deferred, and change handlers run first

- `SET_STATE_BAG_VALUE` refuses replicated writes from clients while `sv_stateBagStrictMode` is on (a warning, nothing set).
- As soon as **any** resource has a change handler, every `SetKey` unpacks the value, and on the server it is queued to the main thread: a read right after a set returns the old value (issue #3930).
- Change handlers are one engine-wide event: every handler of every resource is tested (key and bag name string compare) on every change; a matching one is called into the runtime with the decoded value. The handlers run **before** the value is stored, so reading the bag inside a handler gives the old value.
- A handler with an empty key (`""`) is called for every change of its bag filter; with an empty bag filter for every bag. Keep wildcard handlers to one per resource on the global bag (lib `GlobalGroup`).

## Entities

- Client: a bag's values can arrive before the entity exists there (issue #1304): resolve the entity later, by network id.
- Clients get no event when an entity leaves their scope; its bag is gone, a mirror must prune by itself.
- Network ids are reused; a bag can outlive its vehicle (issue #3289 with `CreateVehicleServerSetter`): compare the entity handle, never trust a value by network id alone.

## The lib classes (`@aicore-fivem/lib` client and server)

`EntityState<T>(key, parse)`, `PlayerState<T>(key, parse)`, `GlobalKey<T>(key, parse)`, `GlobalGroup<T>(prefix, parse)`:

- one change handler per key per resource, values in a `Map` (entities by network id with the owning handle, players by server id, global groups by id after the prefix); `get` is a map lookup (entities: one `NetworkGetNetworkIdFromEntity`); a first read of something set before the resource started reads the bag once.
- `onChange((id, value, old) => ...)` runs after the value is stored, so code there reads the new value (no `setTimeout`).
- the server classes add `set`: it writes the bag and the server mirror at once (readable immediately), the change handler later finds the same value.
- parsers (`stateNumber`, `stateBoolean`, `stateString`, or any `(v) => T | undefined`) turn replicated data into types; a removed value (`nil`/`false` from FiveM's side, `null` from ours) is `undefined`.
- cleanup: server on `entityRemoved` / `playerDropped`, client entity mirrors every 30 s (`DoesEntityExist(NetworkGetEntityFromNetworkId(id))`).

Bench (`packages/lib/bench/state.bench.ts`, natives stubbed, so the real gap is wider): a pass over 100k entities 111 ms raw vs 14 ms mirror, 1M 962 ms vs 120 ms (~130 ns a read).

## Picking the channel

- Per entity, everyone near needs it (fuel, owned flag, look): entity bag.
- Per player, others near need it (downed, cuffed, held prop): player bag.
- Only the owner needs it (money, inventory, jobs): never a bag; the player data channel (snapshot + delta).
- Everyone needs it, small (door lock, weather, duty counts, active inventory): `GlobalKey` / `GlobalGroup`, one key per item, never a whole table in one key.
- Client-local values shared between resources on one client (seat belt): a local event plus an export for late starters, not `LocalPlayer.state`.
