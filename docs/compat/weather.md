# Time and weather layer

Every ai-* script reads and sets time and weather through ai-core (lib `world`), never a weather script itself, so the owner can swap the weather script without breaking admin commands or scripts.

## How it works

- Server: ai-core `resource/server/world.ts` calls the qb-weathersync export contract (`getWeatherState`, `setWeather`, `getTime`, `setTime`, `setBlackout`, `setTimeFreeze`), the API most weather scripts answer: ai-weathersync (`provide 'qb-weathersync'`), qb-weathersync itself and Renewed-Weathersync (`provide 'qb-weathersync'`, answers the exports through `__cfx_export_qb-weathersync_*`). ai-core exports `GetWeather`, `SetWeather`, `GetTime`, `SetTime`, `SetBlackout`, `FreezeTime` (null / false while no such script runs).
- Client: pausing the sync (interiors, scenes) is counted per reason in ai-core (`PauseWorldSync` / `ResumeWorldSync`, lib `world.pauseSync` / `resumeSync`). Pause events other scripts send (`qb-weathersync:client:DisableSync` / `EnableSync`, `cd_easytime:PauseSync`, `vSync:toggle`) count as reasons too, so one script's resume never ends another's pause. A change goes out as `CORE.clientWorldSyncEvent (paused)` (ai-weathersync listens only to it; `IsWorldSyncPaused` for a late start) and as every common pause event for third-party weather scripts: `qb-weathersync:client:DisableSync` / `EnableSync` (qb-weathersync, Renewed), `cd_easytime:PauseSync (paused)`, `vSync:toggle (enabled)`.

## Scripts

| Script | Status |
|---|---|
| ai-weathersync | full (also blackout, freeze, dynamic, regions) |
| qb-weathersync | full (its own exports) |
| Renewed-Weathersync | through its qb-weathersync compatibility (`nextWeatherStage` and `setDynamicWeather` print "not supported" there) |
| cd_easytime, vSync | pause events only; get / set need an adapter (a script that `provide`s qb-weathersync works at once) |
