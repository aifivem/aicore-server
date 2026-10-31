# Time and weather layer

Every ai-* script reads and sets time and weather through ai-core (lib `world`), never a weather script itself, so the owner can swap the weather script without breaking admin commands or scripts.

## How it works

- Server: ai-core `resource/server/world/` picks an adapter (`WEATHER_SYSTEMS`: Renewed-Weathersync, av_weather, cd_easytime, then qb-weathersync; the first two names `provide` qb-weathersync, so they come before it) and otherwise calls the qb-weathersync export contract (`getWeatherState`, `setWeather`, `getTime`, `setTime`, `setBlackout`, `setTimeFreeze`), the API most weather scripts answer: ai-weathersync (`provide 'qb-weathersync'`) and qb-weathersync itself. `getTime` is read as `{ hour, minute }` (ai-weathersync) or as Lua's two return values `hour, min` (qb-weathersync, Renewed), which reach JS as an array. ai-core exports `GetWeather`, `SetWeather`, `GetTime`, `SetTime`, `SetBlackout`, `FreezeTime` (null / false while no such script runs).
- Client: pausing the sync (interiors, scenes) is counted per reason in ai-core (`PauseWorldSync` / `ResumeWorldSync`, lib `world.pauseSync` / `resumeSync`). Pause events other scripts send (`qb-weathersync:client:DisableSync` / `EnableSync`, `cd_easytime:PauseSync`, `vSync:toggle`) count as reasons too, so one script's resume never ends another's pause. A change goes out as `CORE.clientWorldSyncEvent (paused)` (ai-weathersync listens only to it; `IsWorldSyncPaused` for a late start) and as every common pause event for third-party weather scripts (with the real cd_easytime running only `cd_easytime:PauseSync`: its framework hooks turn qb `EnableSync` and `vSync:toggle (true)` into a pause, the meaning reversed; Renewed-Weathersync also `provide`s cd_easytime but reads all three the right way, so it gets all): `qb-weathersync:client:DisableSync` / `EnableSync` (qb-weathersync, Renewed), `cd_easytime:PauseSync (paused)`, `vSync:toggle (enabled)`, `av_weather:freeze (paused)`. `av_weather:freeze` from other scripts is not counted as a pause reason (it carries their hour and weather, which ai-core's resend would drop).

## Scripts

| Script | Status |
|---|---|
| ai-weathersync | full (also blackout, freeze, dynamic, regions) |
| qb-weathersync | full (its own exports) |
| Renewed-Weathersync 1.1.8 | own adapter calling its qb-weathersync exports (it also `provide`s cd_easytime, whose export it does not answer, so it must win over the cd_easytime adapter); `nextWeatherStage` and `setDynamicWeather` print "not supported" there; written from its source |
| av_weather | written from its docs: weather per zone (`getZone(name)`, `updateZone(name, weather, freeze)`: ai-core reads Los Santos and sets every zone it reports (santos, sandy, paleto, cayo), keeping each zone's freeze), time `getTime()` (`{ hour, minutes }`) / `updateTime(hour, minute, freeze, instant = true)`, `setBlackout(on)`; freeze = `updateTime` at the current time; it has no "is time frozen" getter, so setting the time unfreezes the clock; pause through `av_weather:freeze (paused)` |
| cd_easytime | weather and time get / set through its server exports (`GetAllData`, `SetWeather`, `SetTime`); blackout and freeze have no server API (answer false); pause through `cd_easytime:PauseSync` |
| vSync | pause only: no exports, its state is local to its server file and setting it means its console commands, whose names `/weather` and `/time` clash with ai-admin's (archived script; use one that `provide`s qb-weathersync) |
