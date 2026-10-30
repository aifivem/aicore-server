# Appearance layer (clothing scripts)

Scripts that need a character's saved look or want to dress a ped (ai-core's character screen, ai-exitsleeping's sleeping bodies) go through ai-core: server lib `appearance.get(charId)` (export `GetCharacterAppearance(charId, done)`, a callback: no promise crosses a resource boundary), client lib `appearance.apply(ped, look)` / `appearance.read(ped)` (exports `ApplyAppearance`, `GetPedAppearance`); Lua `aiLib.appearance` the same (`get` waits, call it from a thread). A look is `{ model, data }`: the ped model hash and the clothing script's own data, opaque to everyone else. Create the ped with `look.model`, then apply; a ped of another model is refused.

ai-core picks the clothing script with the panel setting `appearance` (General, Clothing: `auto` = the first running one in `resource/server/appearance/registry.ts`) and publishes it in GlobalState `ai:appearance` for the client half (`resource/client/appearance/`). With none running `get` answers null and peds keep the model's default clothes.

| Script | Read (server) | Apply / read (client) | Status |
|---|---|---|---|
| tgiann-clothing 4.x | `tgiann_skin` (`model` hash, `skin` JSON) by the character's citizenid (tgiann-core's `getCid` on ai-core's ESX and QB bridges) | `SetPedAppearance(ped, skin)`, `GetPedSkinData(ped)` | written from its source; replaces ai-appearance (conflict rule) |
| ai-appearance | `ai_appearance_characters` (`model` name, `data` = its `Appearance` JSON) | `ApplyAppearance(ped, appearance)`, `GetPedAppearance(ped)` (only the local player's) | ours, last in the order |

Not supported yet (no source checked): illenium-appearance, fivem-appearance, qb-clothing, esx_skin / skinchanger, rcore_clothing, crm-appearance. tgiann-clothing `provide`s illenium-appearance, fivem-appearance, qb-clothing, skinchanger and esx_skin, so scripts written for those work while it runs.

A new clothing script: one server adapter (`load(charId)` -> `{ model, data }` from its table or exports) and one client adapter (`apply(ped, data)`, optional `read(ped)`), a line in both lists; when it replaces ai-appearance, a `STAND_INS` line in `resource/server/connection/conflicts.ts`.

Applying a look to the player's own ped changes what they wear now; whether that is saved is the clothing script's rule (tgiann-clothing saves it, ai-appearance does not).
