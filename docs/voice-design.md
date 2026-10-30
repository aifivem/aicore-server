# ai-voice design

ai-voice replaces pma-voice on ai-core servers: proximity voice with ranges, radio with push-to-talk, phone calls and the radio/phone effects, on **FiveM Legacy** (Mumble) and **FiveM for GTAV Enhanced** (server-side voice channels) from one resource. It answers pma-voice's public contract (`provide 'pma-voice'`, exports, state bags, events), so ai-hud and third-party radio and phone scripts keep working unchanged.

Sources: the owner's Enhanced prototype `enhance/.../resources/tgiann-voice` (its `docs/fivem-voice.en.md`, `docs/pma-voice-analiz.md`, `src/`, `ui/`), docs.fivem.net (scripting-manual/voice, developers/legacy-vs-enhanced, read 2026-10-30), pma-voice 7.x as installed in `resources/[standalone]/pma-voice`, the Enhanced server binary (`cfx-server.exe` b110).

## 1. Features the owner asked for

From the prototype and its notes (`pma-voice-analiz.md` section 6 "ideas worth keeping", the prototype code and README-style comments):

| Feature | Source |
|---|---|
| Works on GTAV Enhanced through the new server voice API (no client-controlled channels) | prototype `src/server/modules/proximity.ts`, `docs/fivem-voice.en.md` |
| Proximity ranges (whisper / normal / shout) as one spatial channel per range; the player is a member of all of them and unmuted only in the selected one | prototype `proximity.ts` header comment |
| Server-authoritative range: the client only asks, the server applies and writes the player state bag | prototype `src/client/modules/proximity.ts` comment |
| Cycle key for the range, rebindable | prototype `addKeybind('voice_cycleproximity')` |
| Ranges and default tunable without a rebuild (prototype: replicated convars; ai-voice: the admin panel) | prototype `src/common/config.ts` |
| Channel wrapper that remembers mute / deaf per member (the natives cannot be queried; re-adding resets both) | prototype `src/server/utils/channels.ts` |
| Radio: non-spatial channel per frequency, members muted, push-to-talk unmutes | `pma-voice-analiz.md` section 6 table |
| Listening without talking (spectate): member + muted | `pma-voice-analiz.md` section 6, `fivem-voice.en.md` "Replacing MumbleAddVoiceChannelListen" |
| Radio and phone submix effects | `pma-voice-analiz.md` section 6 "ideas worth keeping" |
| Mic click sounds on radio | same |
| `disableRadio` bitfield (several resources can block the radio) | same |
| `addChannelCheck` permission system for radio frequencies | same |
| State-bag integration (`isDead`, `submix`) | same |
| Clean-up of callbacks other resources registered when they stop | same, and pma `onResourceStop` handlers |
| Hooks that can veto (or rewrite) a range change | prototype `src/common/utils/hooks.ts` |
| Debug dump of the voice state (`voicedebug`) | prototype `src/common/utils/debug.ts` |
| HUD range indicator (label, metres, bars) | prototype `ui/src/components/proximity/` (ai-core: ai-hud draws it) |
| Lang files (en, tr) | prototype `locales/` |

Owner requests on top of the prototype: the script is ai-voice and fully replaces pma-voice (everything pma-voice does, its exports, bags, events and cfg convars); a submix registry other scripts create, find and edit submixes through, with panel switches for the default radio / phone submix; ai-voice's effect off while tgiann-radio / tgiann-radio-v2 or tgiann-phone bring their own (shown in the panel); those scripts working without their custom pma-voice files; several radio frequencies at once (talk on the active one); radio animation sets per frequency span, a default, or off; a phone loudspeaker; every range and volume in the panel; calls joined only by the server or a phone script's check.

No transcript under `~/.claude/projects/` discusses the voice script (no project folder name contains "enhance"; a search of every transcript for voice + Enhanced in owner messages found nothing).

## 2. Legacy vs Enhanced voice

| | FiveM Legacy | FiveM for GTAV Enhanced |
|---|---|---|
| Transport | Mumble (built-in server, `voice_externalAddress` for external) | New voice stack: `voice_internal` in server.cfg, or an external voice FXServer (`voice_external_host` / `voice_external_connect`, experimental) |
| Who decides who hears whom | The client: `MumbleSetVoiceChannel`, voice targets (`MumbleSetVoiceTarget`, `MumbleAddVoiceTargetChannel`, `MumbleAddVoiceTargetPlayerByServerId`), `MumbleSetTalkerProximity`. Any client can join any channel. | The server only: `CreateVoiceChannel(mode, maxDistance)`, `AddPlayerToVoiceChannel`, `RemovePlayerFromVoiceChannel`, `SetPlayerMutedInVoiceChannel` (hears, cannot talk), `SetPlayerDeafInVoiceChannel` (talks, cannot hear), `DeleteVoiceChannel` |
| Channel kinds | Numbered Mumble channels | `0` non-spatial (2D, by membership), `1` spatial (3D, receivers within `maxDistance`), `2` custom (no API yet), `3` temporary spatial (deleted when empty). Ids from 0; 65535 = limit reached. Players leave every channel on disconnect. |
| Effects | `voice_useNativeAudio true` + `MumbleSetSubmixForServerId`, `MumbleSetVolumeOverrideByServerId` | No client voice API documented. The Mumble natives still route through the new system only with `setr sv_mumble true` (which re-opens client-controlled channels: a security hole) |
| Convars | `voice_useNativeAudio`, `voice_useSendingRangeOnly`, `voice_use2dAudio`, `voice_use3dAudio`, `voice_inBitrate` | Only `voice_inBitrate` stays; the other four are removed |
| Server mute | `MumbleSetPlayerMuted` | Muted state per channel |
| Talking detection | `MumbleIsPlayerTalking`, `NetworkIsPlayerTalking` | Not documented; `NetworkIsPlayerTalking` is the GTA native FiveM hooks: verify in game |
| Player ids | Count up | Reused after a disconnect (clear every per-source structure on drop) |

The Enhanced natives are not in `@citizenfx/server` typings nor in the native database (`native.py` does not know them). They exist in `cfx-server.exe` (strings `CREATE_VOICE_CHANNEL` ... `SET_PLAYER_DEAF_IN_VOICE_CHANNEL`), and CFX native hashes are the joaat of the upper-case name (checked: `MUMBLE_SET_TALKER_PROXIMITY` = `0x74E927B0`, `MUMBLE_SET_PLAYER_MUTED` = `0xCC6C2EB1`). ai-voice calls them by hash:

| Native | Hash |
|---|---|
| `CREATE_VOICE_CHANNEL(int mode, float maxDistance) -> int` | `0x7A70A736` |
| `DELETE_VOICE_CHANNEL(int channel)` | `0x0D3A0512` |
| `ADD_PLAYER_TO_VOICE_CHANNEL(int channel, int client)` | `0xEA8CA2F5` |
| `REMOVE_PLAYER_FROM_VOICE_CHANNEL(int channel, int client)` | `0xDB325A2D` |
| `SET_PLAYER_MUTED_IN_VOICE_CHANNEL(int channel, int client, bool muted)` | `0x2A1DEA36` |
| `SET_PLAYER_DEAF_IN_VOICE_CHANNEL(int channel, int client, bool deaf)` | `0x3469B8AC` |

Float arguments are passed like FiveM's own wrappers do (`x + 0.0000001` unless 0), or an integral distance arrives as an int.

### Choosing the backend

One resource, two backends, chosen on the server at start (panel `backend`: `auto` | `enhanced` | `mumble`). `auto` probes the Enhanced API: create two non-spatial channels, accept only when both calls return distinct ids below 65535, delete them. A Legacy server throws on the unknown hash (or returns the same nothing twice), so it picks Mumble. The choice is published in one GlobalState key (`ai-voice:backend`); clients read it and run the matching client half.

## 3. pma-voice compatibility surface

ai-voice `provide`s `pma-voice` (plus pma's own `mumble-voip`, `tokovoip`, `toko-voip`, `tokovoip_script`) and answers each export through `provideExport` (provide does not alias exports). The full table with notes is `docs/compat/voice.md`.

**Client exports**: `setRadioChannel` / `SetRadioChannel` / `addPlayerToRadio` / `removePlayerFromRadio`, `setCallChannel` / `SetCallChannel` / `addPlayerToCall` / `removePlayerFromCall`, `setRadioVolume` / `getRadioVolume` / `setCallVolume` / `getCallVolume`, `setVoiceProperty` / `SetMumbleProperty` / `SetTokoProperty`, `overrideProximityRange` / `clearProximityOverride`, `setAllowProximityCycleState`, `overrideProximityCheck` / `resetProximityCheck` and `setVoiceState` (Mumble only), `toggleMutePlayer`, `toggleRadioAnim` / `getRadioAnimState`, `addRadioDisableBit` / `removeRadioDisableBit`, `registerCustomSubmix`, `setEffectSubmix`.

**Server exports**: `setPlayerRadio`, `setPlayerCall`, `getPlayersInRadioChannel` / `GetPlayersInRadioChannel`, `addChannelCheck`, `overrideRadioNameGetter`, `isValidPlayer`.

**Player state bags** (all written by the server: `sv_stateBagStrictMode` blocks pma's client writes): `proximity` `{ index, distance, mode }`, `radioChannel` (the active frequency), `callChannel`, `muted`, `submix`. Read: `isDead` and ai-core's `dead`.

**Events**: local client `pma-voice:setTalkingMode`, `pma-voice:radioActive`, `pma-voice:toggleRadioAnim`, `pma-voice:registerCustomSubmixes`, answered `pma-voice:settingsCallback`; local server `pma-voice:playerMuted`. Net events keep pma's names and payloads (snapshot on join, deltas to that channel's members only); radio events add the frequency as an extra last argument, which pma's listeners ignore.

**Keys**: `voice_cycle` (F11) and `voice_radio` (left Alt), ai keybinds rebindable in ai-core's Keybinds tab; pma's replicated `voice_defaultCycle` / `voice_defaultRadio` set their defaults.

**Convars**: pma's cfg convars seed the panel once (a set convar replaces a panel value still at its built-in default and is written into the panel; the panel wins from then on): `voice_defaultVoiceMode`, `voice_enableProximityCycle`, `voice_enableRadios`, `voice_enablePhones`, `voice_defaultRadioVolume`, `voice_defaultPhoneVolume` / `voice_defaultCallVolume`, `voice_enableSubmix`, `voice_enableRadioAnim`, `voice_disableVehicleRadioAnim`, `voice_syncPlayerNames`. On the Mumble backend ai-voice sets `voice_useNativeAudio true` and `voice_useSendingRangeOnly true` itself.

### Scripts that route audio themselves

tgiann-radio-v2 and tgiann-phone drive Mumble voice targets, volume overrides and submixes themselves and ship small files that patch pma-voice:

- tgiann-radio-v2 `client/module/tgiann_radio.lua` sets pma's `radioPressed` from the local event `tgiann-radio-v2:setRadioPressed`, and the script sends its members as a local `pma-voice:syncRadioData`, so pma keeps them in the voice target while its key is held.
- tgiann-phone `client/module/tgiann_phone.lua` takes the local event `tgiann-phone:voiceTargets` (`{ [serverId]: true }`, the call peers and loudspeaker bystanders) as pma's call targets; its replacement `client/init/main.lua` leaves pma's radio / call submix out while tgiann-radio-v2 / tgiann-phone run.

ai-voice answers the same events (adapter `resource/common/external.ts`) and turns its own effect off for those scripts, so neither needs a file in ai-voice changed. Both check that their file exists under `GetResourcePath("pma-voice")`; ai-voice ships empty marker files at that path.

## 4. Architecture

```
server                                            client
  content.ts / convars.ts  panel, cfg seeding       state.ts     panel files, bags, frequencies, call
  natives.ts   Enhanced natives by hash, probe      mumble.ts    Legacy: own channel, target loop (200 ms)
  players.ts   VoicePlayer per source               effects.ts   volume overrides, submix per talker
  groups.ts    frequencies + calls, pma events      submixes.ts  submix registry (40 game slots)
  speaker.ts   phone loudspeakers                   radio.ts     PTT on the active frequency
  takeover.ts  scripts with their own effect        anim.ts      animation per frequency span
  enhanced.ts  channels per bucket / distance,      phone.ts     calls, loudspeaker audio
               frequency, call
  checks.ts    channel / range / call checks        exports.ts   own + pma-voice exports
```

- **Server owns state** on both backends: range, frequencies, calls, loudspeakers, mute. Clients ask through the lib gate with rate limits (range 2/s, a script range 1/s, frequency changes 2/s, push-to-talk 4/s, call joins 2/s); the server sets the bags and sends pma's deltas.
- **Calls are server decisions**: `setPlayerCall` (server export) joins anyone; a client's join is refused unless a phone script's `addCallCheck(fn(source, callId))` answers true or the panel's "Let players' games join calls" is on (needed by phones that join from the client, e.g. lb-phone). Hanging up is always allowed.
- **Several frequencies**: a player hears every joined frequency (panel limit, default 3) and talks on the active one. pma's single radio is the active frequency. Job frequencies (panel spans with jobs and an on-duty switch) are checked on join and again on job, duty and character changes and on a panel change.
- **Ranges**: clients pick only the panel's ranges; a client's custom range is taken on Mumble and refused on Enhanced; server scripts set any range (`setPlayerRange`).
- **Enhanced backend** (server routes audio):
  - Proximity: one spatial channel per (routing bucket, distance). Every player is a member of all channels of their bucket and unmuted only in the one of their range. A custom range gets its own channel, deleted when nobody uses it. A 1 s server timer moves players whose routing bucket changed (FiveM has no bucket event).
  - Each frequency is a 2D channel, members muted until push-to-talk on their active frequency. Each call is a 2D channel. Loudspeaker bystanders join the call's channel (muted unless the call hears them).
  - Admin mute: muted in every channel.
- **Mumble backend** (client routes audio, pma's model): own channel = server id, voice target 1, every 200 ms the channels of players within the range times the panel's reach factor (default 3); player targets: call members, loudspeaker targets, tgiann-phone's targets, and the active frequency or tgiann-radio-v2's members while their key is held. Receivers apply a volume override and the radio / phone submix. Spectating listens to every channel.
- **Loudspeaker**: a 1 s server timer runs while any speaker is on; bystanders come from lib `playersNear`; Mumble clients get `{ send, call, speaker }` sets only when they change.
- **Submixes**: the game mixer has 40 submix slots shared with the game's own audio (FiveM `NuiAudioSink.cpp`, `kSubmixCount = 40`; past it `CreateAudioSubmix` returns -1 and logs "Exceeded maximum number of audio submixes", older builds overwrote memory). A submix can never be deleted and a name is created once per game session. ai-voice keeps one registry per client: `createSubmix(name, spec)` returns an existing name's id, `editSubmix` changes it, pma's `registerCustomSubmix` / `setEffectSubmix` feed it. ai-voice's own Radio / Phone submixes are created on first use, never when switched off in the panel or taken over (turning a switch off after a submix was made frees its slot only with a game restart).
- **Takeover** (owner decision, no config reading): tgiann-radio or tgiann-radio-v2 running turns the radio effect off, tgiann-phone the phone effect; shown next to the effect switches. lb-phone is not detected.
- **Animations**: three base-game sets (shoulder, chatter, handheld) or a custom dictionary / clip; per frequency span in the panel, a default, off for everyone (panel) or one player (`setRadioAnimDisabled`, pma `toggleRadioAnim`).
- **Admin mute** by license with an end time: survives a reconnect; timers re-arm past setTimeout's 24.8-day limit.
- **HUD**: ai-hud reads the `proximity` bag, `pma-voice:setTalkingMode`, `pma-voice:radioActive` and `NetworkIsPlayerTalking`; ai-voice shows no UI of its own.
- **Scale**: per-player state in a `Map` by source, cleared on drop (Enhanced reuses ids). Membership events go only to that channel's members. The Mumble loop reads its own position once per tick and walks only players in scope. Server timers (bucket watch, loudspeakers) cost one native call per player per second, the loudspeaker one only while a speaker is on.

## 5. Step plan

1. Resource, panel, lang texts, provides. Done.
2. Server core: backend probe, players, frequencies and calls with pma events, checks, mute, commands. Done.
3. Enhanced router (bucket / distance channels, frequency and call channels, bystanders). Done; verified against stubbed natives, not in game.
4. Client: Mumble routing, effects, submix registry, radio (several frequencies, animations), phone (loudspeaker), exports. Done.
5. Compatibility: pma exports / events / convars, tgiann-radio-v2 and tgiann-phone without custom files. Done; in-game test pending.
6. In-game tests on Legacy (two clients): ranges, radio with clicks and effect, two frequencies, job frequency revoked on duty off, a call joined by a server script and refused from the client, loudspeaker, admin mute across a reconnect, tgiann-radio-v2 and tgiann-phone.
7. Enhanced tests on the `enhance/` server with `voice_internal`.
8. Later: player voice settings menu (volumes, clicks), noise-suppression intent on Legacy, hook rewrite (not only veto), Enhanced listen-only for admins, client voice API on Enhanced when FiveM documents it.

## 6. Open questions to verify in game

- Enhanced: does `NetworkIsPlayerTalking` report talking without `sv_mumble`? (ai-hud depends on it.)
- Enhanced: does a spatial channel already separate routing buckets? (If yes, the bucket keying is harmless.)
- Enhanced: does control 249 (push-to-talk) forced by script make the client transmit, as on Mumble?
- Does `GetResourcePath("pma-voice")` resolve to ai-voice (the provider)? tgiann-radio-v2's and tgiann-phone's install checks need it; otherwise they print an install error (their audio still works).
- Legacy: an unknown native hash through `Citizen.invokeNative` throws (the probe also guards against a silent return).
