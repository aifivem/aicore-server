# Voice (pma-voice contract)

ai-voice stands in for pma-voice 7.x: it `provide`s `pma-voice`, `mumble-voip`, `tokovoip`, `toko-voip`, `tokovoip_script` and answers pma-voice's exports through `provideExport`, so radio, phone and HUD scripts written for pma-voice run unchanged. Do not run pma-voice next to it. Design: `docs/voice-design.md`.

Status: built and type checked; Legacy runs on the dev server, the features below are not yet tested in game.

| pma-voice part | ai-voice | Notes |
|---|---|---|
| Client `setRadioChannel` / `SetRadioChannel` / `addPlayerToRadio` / `removePlayerFromRadio` | yes | The active frequency; 0 leaves every frequency. Job frequencies are checked on the server |
| Client `setCallChannel` / `SetCallChannel` / `addPlayerToCall` / `removePlayerFromCall` | yes, joining needs a check | The server refuses a client's call join unless a phone script registered `addCallCheck` or the panel's "Let players' games join calls" is on (lb-phone needs it) |
| Client `setRadioVolume` / `getRadioVolume` / `setCallVolume` / `getCallVolume` | yes | Kept per player in KVP |
| Client `setVoiceProperty` / `SetMumbleProperty` / `SetTokoProperty` | yes | `radioEnabled`, `micClicks` |
| Client `overrideProximityRange` / `clearProximityOverride` / `setAllowProximityCycleState` | yes | A client's custom range is refused on Enhanced (server scripts use `setPlayerRange`) |
| Client `overrideProximityCheck` / `resetProximityCheck`, `setVoiceState` | Legacy only | Enhanced routes on the server |
| Client `toggleMutePlayer`, `toggleRadioAnim`, `getRadioAnimState`, `addRadioDisableBit` / `removeRadioDisableBit` | yes | |
| Client `registerCustomSubmix`, `setEffectSubmix`; event `pma-voice:registerCustomSubmixes` | yes | Into ai-voice's submix registry |
| Server `setPlayerRadio`, `setPlayerCall`, `getPlayersInRadioChannel` / `GetPlayersInRadioChannel`, `addChannelCheck`, `overrideRadioNameGetter`, `isValidPlayer` | yes | Checks from a stopped resource are dropped |
| Bags `proximity`, `radioChannel`, `callChannel`, `muted`, `submix` | yes | Written by the server (pma's client writes fail under `sv_stateBagStrictMode`); `submix` through the server export `setPlayerSubmix` |
| Bag `isDead` | read | ai-core's `dead` too |
| Bags `radio`, `phone` (volumes), `voiceIntent` | no | Volumes are client-side |
| Events `pma-voice:setTalkingMode`, `radioActive`, `toggleRadioAnim`, `settingsCallback`, `playerMuted` | yes | |
| Net events `syncRadioData`, `addPlayerToRadio`, `removePlayerFromRadio`, `setTalkingOnRadio`, `clSetPlayerRadio`, `syncCallData`, `addPlayerToCall`, `removePlayerFromCall`, `clSetPlayerCall`; client to server `setPlayerRadio`, `setTalkingOnRadio`, `setPlayerCall` | yes | Same names and payloads; radio events add the frequency as a last argument; member tables arrive with string keys; `clSetPlayerRadio` is sent on every change of the active frequency |
| Net event `setTalkingOnCall` | no | Call members hear each other for the whole call |
| `cycleproximity` / `+radiotalk` | replaced | ai keybinds `voice_cycle` (F11, or `voice_defaultCycle`), `voice_radio` (left Alt, or `voice_defaultRadio`), set in ai-core's Keybinds tab |
| `/muteply` | yes | Admins; the mute survives a reconnect |
| `/vol`, `/setvoiceintent` | no | Players do not type commands on ai-core |
| Convars `voice_defaultVoiceMode`, `voice_enableProximityCycle`, `voice_enableRadios`, `voice_enablePhones`, `voice_defaultRadioVolume`, `voice_defaultPhoneVolume` / `voice_defaultCallVolume`, `voice_enableSubmix`, `voice_enableRadioAnim`, `voice_disableVehicleRadioAnim`, `voice_syncPlayerNames` | seed the panel | Read once at start: a set convar replaces a panel value still at its default and is written into the panel, which wins from then on |
| Convars `voice_externalAddress` / `voice_externalPort`, `voice_onClickVolume` / `voice_offClickVolume`, `voice_refreshRate`, `voice_enableUi` | no | Clicks are GTA sounds without a volume; no UI |

## Scripts with their own radio / phone audio

| Script | Status | What ai-voice does |
|---|---|---|
| tgiann-radio v1 | works | Uses pma-voice's exports; ai-voice's radio effect is turned off while it runs (owner decision) |
| tgiann-radio-v2 (1.11.0) | needs an in-game test | Routes radio on Mumble itself. ai-voice keeps its members in the voice target while `tgiann-radio-v2:setRadioPressed` is true (members from its local `pma-voice:syncRadioData`) and leaves the radio effect off. Its custom `pma-voice/client/module/tgiann_radio.lua` is not needed; `ai-voice/client/module/tgiann_radio.lua` exists only for its install check (works if `GetResourcePath("pma-voice")` resolves to ai-voice) |
| tgiann-phone (2.0.0-b8) | needs an in-game test | Routes and filters calls (and its loudspeaker) on Mumble itself. ai-voice keeps the players of `tgiann-phone:voiceTargets` in the voice target and leaves the phone effect off. Its custom `pma-voice/client/init/main.lua` and `client/module/tgiann_phone.lua` are not needed (same install-check file) |
| tgiann-voice-lib | works on Legacy | Records through the embedded Mumble server; each player keeps channel = server id as with pma. No Mumble on Enhanced |
| lb-phone | needs `clientCalls` | Joins calls through the client export `addPlayerToCall`: turn on "Let players' games join calls". Its own call effect (`Config.Voice.CallEffects = true`) is not detected: turn ai-voice's phone effect off then |

All of these use Mumble client natives: on Enhanced they need `setr sv_mumble true`.
