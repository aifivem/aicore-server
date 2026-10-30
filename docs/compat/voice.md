# Voice (pma-voice contract)

ai-voice stands in for pma-voice 7.x: it `provide`s `pma-voice`, `mumble-voip`, `tokovoip`, `toko-voip`, `tokovoip_script` and answers pma-voice's exports through `provideExport`, so radio, phone and HUD scripts written for pma-voice run unchanged. Do not run pma-voice next to it. Design: `docs/voice-design.md`.

Status: built and type checked; not yet tested in game.

| pma-voice part | ai-voice | Notes |
|---|---|---|
| Client `setRadioChannel` / `SetRadioChannel` / `addPlayerToRadio` / `removePlayerFromRadio` | yes | Job frequencies from the panel are checked on the server |
| Client `setCallChannel` / `SetCallChannel` / `addPlayerToCall` / `removePlayerFromCall` | yes | |
| Client `setRadioVolume` / `getRadioVolume` / `setCallVolume` / `getCallVolume` | yes | Kept per player in KVP |
| Client `setVoiceProperty` / `SetMumbleProperty` / `SetTokoProperty` | yes | `radioEnabled`, `micClicks` |
| Client `overrideProximityRange` / `clearProximityOverride` / `setAllowProximityCycleState` | yes | The range goes through the server (0.5-100 m) |
| Client `overrideProximityCheck` / `resetProximityCheck` | Legacy only | Enhanced routes on the server |
| Client `setVoiceState` | Legacy only | Logs a warning on Enhanced |
| Client `toggleMutePlayer`, `toggleRadioAnim`, `getRadioAnimState` | yes | |
| Client `addRadioDisableBit` / `removeRadioDisableBit` (newer pma) | yes | |
| Server `setPlayerRadio`, `setPlayerCall`, `getPlayersInRadioChannel` / `GetPlayersInRadioChannel`, `addChannelCheck`, `overrideRadioNameGetter`, `isValidPlayer` | yes | Checks from a stopped resource are dropped |
| Bags `proximity`, `radioChannel`, `callChannel`, `muted` | yes | Written by the server (pma's client writes fail under `sv_stateBagStrictMode`) |
| Bag `isDead` | read | ai-core's `dead` too |
| Bags `radio`, `phone` (volumes), `voiceIntent`, `submix` | no | Volumes are client-side |
| Events `pma-voice:setTalkingMode`, `radioActive`, `toggleRadioAnim`, `settingsCallback`, `playerMuted` | yes | |
| Net events `syncRadioData`, `addPlayerToRadio`, `removePlayerFromRadio`, `setTalkingOnRadio`, `clSetPlayerRadio`, `syncCallData`, `addPlayerToCall`, `removePlayerFromCall`, `clSetPlayerCall`; client to server `setPlayerRadio`, `setTalkingOnRadio`, `setPlayerCall` | yes | Same names and payloads; member tables arrive with string keys |
| Net event `setTalkingOnCall` | no | Call members hear each other for the whole call |
| `cycleproximity` / `+radiotalk` commands | replaced | ai keybinds `voice_cycle` (F11), `voice_radio` (left Alt), set in ai-core's Keybinds tab |
| `/muteply` | yes | Admins (ACE `ai.admin`) |
| `/vol`, `/setvoiceintent` | no | Players do not type commands on ai-core |
| Convars `voice_enableRadios`, `voice_enablePhones`, `voice_defaultRadioVolume`, `voice_defaultPhoneVolume`, `voice_enableSubmix`, `voice_enableRadioAnim`, `voice_disableVehicleRadioAnim`, `voice_syncPlayerNames`, `voice_defaultVoiceMode`, `voice_enableProximityCycle`, `voice_defaultCycle`, `voice_defaultRadio` | panel / keybinds | |
| Convars `voice_externalAddress` / `voice_externalPort` | no | |
