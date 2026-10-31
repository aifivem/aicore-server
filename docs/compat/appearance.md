# Appearance layer (clothing scripts)

Scripts that need a character's saved look, want to dress a ped, open a clothing menu or put on a job outfit (ai-core's character screen, ai-exitsleeping's sleeping bodies) go through ai-core: server lib `appearance.get(charId)` (export `GetCharacterAppearance(charId, done)`, a callback: no promise crosses a resource boundary), client lib `appearance.apply(ped, look)` / `appearance.read(ped)` (exports `ApplyAppearance`, `GetPedAppearance`); Lua `aiLib.appearance` the same (`get` waits, call it from a thread). A look is `{ model, data }`: the ped model hash and the clothing script's own data, opaque to everyone else. Create the ped with `look.model`, then apply; a ped of another model is refused.

ai-core picks the clothing script with the panel setting `appearance` (General, Clothing: `auto` = the first running one in `resource/server/appearance/registry.ts`) and publishes it in GlobalState `ai:appearance` for the client half (`resource/client/appearance/`). With none running `get` answers null and peds keep the model's default clothes.

| Script | Read (server) | Apply / read (client) | Status |
|---|---|---|---|
| tgiann-clothing 4.x | `tgiann_skin` (`model` hash, `skin` JSON) by the character's citizenid (tgiann-core's `getCid` on ai-core's ESX and QB bridges) | `SetPedAppearance(ped, skin)`, `GetPedSkinData(ped)` | written from its source; replaces ai-appearance (conflict rule) |
| illenium-appearance 5.7.0 | `playerskins.skin` (`active = 1`, the `model` name inside) by citizenid | `setPedAppearance(ped, appearance)`, `getPedAppearance(ped)` | written from its source; needs a patch (below) |
| qb-clothing 1.2.0 | `playerskins` (`model` hash as text, `skin` JSON, `active = 1`) by citizenid | local event `qb-clothing:client:loadPlayerClothing (skin, ped)`; no read | written from its source |
| crm-appearance (no version published) | `playerskins` (`model`, `skin`, `active = 1`), as tgiann-multichar reads it | `crm_set_ped_appearance(ped, skin)`, `crm_get_ped_appearance(ped)` | written from tgiann-multichar 2.2.1 and p_bridge 1.2.5 sources (no public docs) |
| rcore_clothing (no version published) | export `getSkinByIdentifier(citizenid)` -> `{ ped_model, skin }` | `setPedSkin(ped, skin)`; no read (`getPlayerSkin` reads only the local player) | written from tgiann-multichar 2.2.1's source (no public docs) |
| bl_appearance 1.3.5 | `appearance` (`id` = bl_bridge's player id = citizenid; `skin` with the `model` hash, `clothes`, `tattoos`, merged) | `SetPedAppearance(ped, appearance)`; no read (its `GetPedAppearance` answers a promise) | written from its source |
| ai-appearance | `ai_appearance_characters` (`model` name, `data` = its `Appearance` JSON) | `ApplyAppearance(ped, appearance)`, `GetPedAppearance(ped)` (only the local player's) | ours, last in the order |

tgiann-clothing `provide`s illenium-appearance, fivem-appearance, qb-clothing, skinchanger and esx_skin, so scripts written for those work while it runs; it comes first in the order for that reason. Every clothing adapter makes ai-appearance unneeded (built-in conflict rule from the registry).

Limits:
- Stored looks are read straight from the script's table by the character's citizenid (ai-core's ESX identifier and QB citizenid). A missing table (the script never started) logs an error and gives no look.
- illenium-appearance picks its framework with `GetResourceState(...) ~= "missing"`; ai-core provides both `qb-core` and `es_extended`, so its ESX file (loaded last) wins and saves to `users.skin`, which ai-core has no table for. Patch `shared/framework/framework.lua` so `Framework.ESX()` returns false (QB mode, `playerskins`).
- crm-appearance on ESX is not covered (only its QB table is known).

Not added: fivem-appearance 1.3.1 (stores nothing itself), esx_skin / skinchanger (store in ESX `users.skin`, which ai-core has no table for), qs-appearance, codem-appearance, 17mov_CharacterSystem (storage and ped exports not found in a source or docs).

TGIANN scripts the other way round: tgiann-multichar 2.2.1 reads looks of tgiann-clothing, illenium-appearance, rcore_clothing, crm-appearance and qb-clothing itself (its `editable.lua`); tgiann-core's clothing helpers open tgiann-clothing / illenium-appearance / qb-clothing menus and reload the skin through tgiann-clothing, illenium-appearance, esx_skin, qb-clothing or fivem-appearance; tgiann-naked and tgiann-shop do the same by resource name.

## Clothing menus and job outfits (client)

Client lib `appearance.openMenu("clothing" | "barber" | "outfits")` (export `OpenClothingMenu`, false when the script has no such menu), `appearance.wearOutfit(outfit)` (export `WearOutfit`) and `appearance.reloadSkin()` (export `ReloadSkin`); Lua `aiLib.appearance.openMenu` / `wearOutfit` / `reloadSkin`. A job outfit is `{ components, props }`, each piece `{ id, collection, index, texture }` (collection name + local index, `""` = base game; prop `index` -1 takes it off); only the listed pieces change, it is never saved as the player's own look, and `reloadSkin` takes it off.

| Script | Menus (clothing / barber / outfits) | Job outfit | Reload | Status |
|---|---|---|---|---|
| tgiann-clothing 4.1.0 | `OpenClothingShop`, `OpenBarberShop`, `OpenOutfitChanger` (outfit stash with clothing as items, else its saved outfits) | `ChangeScriptClothe({ components, props })` keyed by id, collection addressed; it keeps the player's own outfit to go back to | `ChangeScriptClothe(nil)` while a work outfit is on, else its `illenium-appearance:client:reloadSkin` handler | written from its source |
| illenium-appearance 5.7.0 | events `illenium-appearance:client:openClothingShop`, `OpenBarberShop`, `openOutfitMenu` | event `loadJobOutfit` with QB's `{ outfitData }` (global drawable indexes, worked out from the collection with `GetPedDrawableGlobalIndexFromCollection`) | event `reloadSkin (true)` | written from its source |
| qb-clothing 1.2.0 | `qb-clothing:client:openMenu` (its full editor), no barber, `openOutfitMenu` | event `qb-clothing:client:loadOutfit ({ outfitData })` | export `reloadSkin` | written from its source |
| rcore_clothing | event `rcore_clothing:openShop` with the shop types `binco` / `barber` of its default config, `openChangingRoom` | none (its own job changing rooms) | server event `rcore_clothing:reloadSkin` | written from its docs (documentation.rcore.cz api/client, configs) |
| bl_appearance 1.3.5 | `OpenMenu("clothing" / "barber" / "outfits")` (its data/menus.lua names) | none (its own outfit data shape) | `SetPlayerPedAppearance()` | written from its source |
| crm-appearance | none known | none | none | no public docs |
| ai-appearance | none: its stores and barbers are its own places (the server checks the store on save) | `WearOutfit(outfit)` (collection pieces, never saved) | `ReloadSkin()` | ours |

Limits: QB's outfit keys cover masks, arms, pants, bags, shoes, accessories, undershirts, vests, decals, tops, hats, glasses and ears (no face, hair, watches or bracelets); illenium-appearance clears a hat or glasses whose global index is 0. rcore_clothing's barber opened without its `SHOP_CONFIG_ALIAS.BARBER` config (a Lua global ai-core cannot pass) shows every category. No ai-* script dresses players in uniforms or opens a wardrobe yet: a locker point calls `appearance.wearOutfit` / `openMenu("outfits")`.

A new clothing script: one server adapter (`load(charId)` -> `{ model, data }` from its table or exports) and one client adapter (`apply(ped, data)`, optional `read(ped)`), a line in both lists (the conflict rule against ai-appearance follows the server list; citizenid and model readers in `resource/server/appearance/citizen.ts`).

Applying a look to the player's own ped changes what they wear now; whether that is saved is the clothing script's rule (tgiann-clothing saves it, ai-appearance does not).
