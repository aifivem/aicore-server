# Target layer (lib `Points`)

Every ai-* place, NPC, model and vehicle option is a lib `Points` entry (`.claude/rules/lib.md` "Interaction points"). It shows as ai-lib's prompt, or as an option on the target script that runs when the owner picks Interaction "target" in ai-core's panel; the same `onPressed` runs either way. Lua resources get the same through `aiLib.Points`.

## Why it lives in the lib, not in ai-core

Every target ties an option's functions to the resource that called it and drops them when that resource stops. A call through ai-core would make ai-core the owner (options left behind by stopped scripts, functions that never reach the script). So the adapters run inside each resource: `packages/lib/src/client/points/targets/` (TypeScript, one file per adapter) and `resources/[ai]/ai-lib/lua/client/targets.lua` with its adapters in `targets/adapters.lua` (Lua), the same list and order on both sides.

## Pick

- Target mode = ai-core's panel setting `interaction` is `target` and a target in the list below runs; else prompts. Points with `promptOnly` stay prompts, points with `preferTarget` use a running target whatever the setting.
- The first started resource in list order wins. Scripts that `provide` ox_target or qb-target come before those names, because a provided name reads started too.
- Not ready yet: while a client loads, a target reads started before its scripts ran ("No such export"). That target is skipped (the next one, or prompts) until any target resource starts; then every point is put on the target again. A start or stop of any listed resource restyles every point.
- A point's option is taken off the target that took it; when that target stopped, its options went with it.

## Adapters (win order)

| Script | Calls | Status | Limits |
|---|---|---|---|
| ai-target | ox_target API under `ai-target` | own script | none |
| tgiann-radialmenu-target 1.2.0 | ox_target API under `tgiann-target` (it answers that name and `ox_target`, not its own; `client/target/api.lua`) | written from its source | its target module off (`config.target.enabled = false`): no exports, the next target or prompts |
| tgiann-target 1.3.0 | ox_target API under its own name (an ox_target fork, `client/api.lua`) | written from its source | none |
| sleepless_interact 2.6.0 | own API: `addCoords(coords, options)` / `removeCoords(id, name)`, `addLocalEntity` / `removeLocalEntity`, `addModel` / `removeModel`, `addGlobalVehicle` / `removeGlobalVehicle` (`client/api.lua`), ox option shape | written from its source | a point's option sits at its coordinates (no zone radius); the option `distance` is the point's radius |
| ox_target | `addSphereZone` / `removeZone`, `addLocalEntity` / `removeLocalEntity`, `addModel` / `removeModel`, `addGlobalVehicle` / `removeGlobalVehicle` | written from its source | none |
| qb-target 5.5.0 | `AddCircleZone(name, center, radius, { useZ = true }, { options, distance })` / `RemoveZone(name)`, `AddTargetEntity` / `RemoveTargetEntity(entity, label)`, `AddTargetModel` / `RemoveTargetModel(models, label)`, `AddGlobalVehicle` / `RemoveGlobalVehicle(label)`; option `action(entity)`, `canInteract(entity)` (`registration.lua`) | written from its source | options are keyed by label: two options with the same label on one model or entity replace each other; qb-target keeps a stopped resource's options, so the lib takes its own off when the resource stops |
| interact (darktrovx) | `AddInteraction` / `RemoveInteraction(id)`, `AddLocalEntityInteraction` / `RemoveLocalEntityInteraction(entity, id)`, `AddModelInteraction` (one model per call) / `RemoveModelInteraction(hash, id)`, `AddGlobalVehicleInteraction` / `RemoveGlobalVehicleInteraction(id)`; option `action(entity)`, `canInteract(entity)` (`client/interactions.lua`) | written from its source | last in order (often installed next to a target for other scripts); from TypeScript a point at bare coordinates stays a prompt: `AddInteraction` needs a Lua `vector3` and the JS runtime sends no vectors (peds, models and vehicles work); no icons |

Option names are `<resource>:<point id>`: interact and qb-target zones keep one list for every resource.

Scripts that `provide` `ox_target` or `qb-target` and answer their exports through `__cfx_export_*` handlers (Core Focus says it does, from its docs) are reached through those names without an adapter of their own; untested.

## Not added

- qs-target (Quasar): no public source or API docs found.

## Adding a target

1. An adapter object in its own file in `packages/lib/src/client/points/targets/`, listed in `targets.ts` (`TargetAdapter`: `coords`, `addSphere` / `removeZone`, `addLocalEntity` / `removeLocalEntity`, `addModels` / `removeModels`, `addGlobalVehicle` / `removeGlobalVehicle`) calling the script with lib `callExport`, and the same table in `lua/client/targets/adapters.lua`.
2. One line in `TARGETS` / `LIST` (`targets/adapters.lua`) in win order (before any name the script `provide`s).
3. A row above.
