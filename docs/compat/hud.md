# HUD layer (visibility, settings menu)

Full-screen UIs hide the HUD through ai-core (lib `hud.hide(reason)` / `show(reason)`, `NuiScreen` does it by itself; client exports `HideHud`, `ShowHud`, `IsHudVisible`). ai-core emits the local event `CORE.clientHudVisibleEvent (visible)` for HUDs that listen (ai-hud) and drives the first running HUD of its list through that HUD's own API (`resources/[ai]/ai-core/resource/client/hud.ts`). With no listed HUD running, ai-core shows and hides the minimap.

The radial menu's HUD entry (and any script) opens the running HUD's own settings menu through client exports `OpenHudSettings()` / `HasHudSettings()`.

| HUD | Hide / show | Settings menu | Status |
|---|---|---|---|
| tgiann-lumihud 2.2.1 | client event `tgiann-lumihud:ui (visible)` | client event `tgiann-lumihud:hudMenu` | written from its source |
| tgiann-hudv2 | client event `tgiann-hud:ui (visible)` | client event `tgiann-hud:hudMenu` | written from its source |
| tgiann-modern-hud | client event `tgiann-modernHud:ui (visible)` | client event `tgiann-modernHud:hudMenu` | written from its source |
| tgiann-statushud | client event `tgiann-statushud:ui (visible)` | none | written from its source |
| jg-hud 1.5.0 | export `toggleHud(visible)` | command `settings` (its default `Config.OpenSettingsCommand`) | written from its docs |
| 0r-hud-v3 | export `ToggleVisible(visible)` | none | written from its docs |
| codem-supreme-hud | exports `ShowHud()` / `HideHud()` | client event `codem-hud:client:OpenSettings` | written from its docs |
| Codem-BlackHUDV2 | client event `codem-blackhudv2:SetForceHide (hide, disableMinimap)` | none | written from its docs |
| wais-hudv6 | client event `wais:hudv6:client:hideHud (hide)` | none | written from its docs |
| qb-hud 2.2.0 | none: only the minimap follows | command `menu` | written from its source |
| ps-hud 2.1.2 | none: only the minimap follows | command `menu` | written from its source |
| ai-hud | listens to `CORE.clientHudVisibleEvent` | export `OpenSettings` | ours |

## Limits

- tgiann-carhud (resource `tgiann-hud`), qb-hud and ps-hud have no API another script can hide them with; they hide only on the pause menu (qb/ps). ai-core toggles the minimap for qb-hud and ps-hud, which set it again on their own ticks.
- jg-hud's settings open through the command name of its config; a server that renames `Config.OpenSettingsCommand` loses the radial's HUD entry.
- wais-hudv6 keeps its minimap while hidden (its separate `hideRadar` event is not called: showing would force the minimap on foot).
- Running two HUDs is not reported by ai-core's conflict check (HUDs are not in `connection/rules.ts`).

## Adding a HUD

One entry in `ADAPTERS` (`client/hud.ts`): resource name, the version the calls were read from, `set(visible)` and, when it has one, `settings()`, in the order it should win (ai-hud stays last).
