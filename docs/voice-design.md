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
| Ranges and default tunable without a rebuild (prototype: replicated convars; ai-core: the admin panel) | prototype `src/common/config.ts` |
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

The owner added on 2026-10-30: the script is named ai-voice and fully replaces pma-voice on this server (pma-voice is removed from server.cfg and deleted afterwards), so everything pma-voice does here is in scope.

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

ai-voice `provide`s `pma-voice` (plus pma's own `mumble-voip`, `tokovoip`, `toko-voip`, `tokovoip_script`) and answers each export through `provideExport` (provide does not alias exports).

**Client exports**: `setRadioChannel` / `SetRadioChannel` / `addPlayerToRadio` / `removePlayerFromRadio`, `setCallChannel` / `SetCallChannel` / `addPlayerToCall` / `removePlayerFromCall`, `setRadioVolume` / `getRadioVolume` / `setCallVolume` / `getCallVolume`, `setVoiceProperty` / `SetMumbleProperty` / `SetTokoProperty` (`radioEnabled`, `micClicks`), `overrideProximityRange(range, disableCycle)` / `clearProximityOverride`, `setAllowProximityCycleState`, `overrideProximityCheck` / `resetProximityCheck` (Mumble only), `toggleMutePlayer`, `toggleRadioAnim` / `getRadioAnimState`, `setVoiceState` (Mumble only).

**Server exports**: `setPlayerRadio(source, channel)`, `setPlayerCall(source, channel)`, `getPlayersInRadioChannel` / `GetPlayersInRadioChannel`, `addChannelCheck(channel, fn)`, `overrideRadioNameGetter(channel, fn)`, `isValidPlayer`.

**Player state bags** (all written by the server: `sv_stateBagStrictMode` blocks pma's client writes, so on this server pma's own `proximity` bag never replicated): `proximity` `{ index, distance, mode }`, `radioChannel`, `callChannel`, `muted`. Read: `isDead` and ai-core's `dead` (no radio while dead).

**Local client events** emitted: `pma-voice:setTalkingMode (index)`, `pma-voice:radioActive (bool)`, `pma-voice:toggleRadioAnim (bool)`; answered: `pma-voice:settingsCallback (cb)` (gets `{ voiceModes }`). **Local server event**: `pma-voice:playerMuted (target, by, muted, duration)`.

**Net events** keep pma's names and payloads, because third-party radio UIs listen to them: client to server `pma-voice:setPlayerRadio`, `pma-voice:setTalkingOnRadio`, `pma-voice:setPlayerCall`; server to client `pma-voice:syncRadioData (members, name?)`, `pma-voice:addPlayerToRadio (source, name?)`, `pma-voice:removePlayerFromRadio (source)`, `pma-voice:setTalkingOnRadio (source, talking)`, `pma-voice:clSetPlayerRadio (channel)`, `pma-voice:syncCallData (members)`, `pma-voice:addPlayerToCall (source)`, `pma-voice:removePlayerFromCall (source)`, `pma-voice:clSetPlayerCall (channel)`. These are exactly snapshot (sync on join) + delta (add / remove / talking) sent only to the members of that channel.

**Keys**: `cycleproximity` (pma F11) becomes the ai Keybind `voice_cycle` (default F11), `+radiotalk` becomes `voice_radio` (default LMENU, left Alt); both rebindable in ai-core's Keybinds tab and listed in the HUD key hints.

**Commands**: `/muteply <id> [seconds]` (admins). pma's `/vol` and `/setvoiceintent` are player commands; players do not type commands on ai-core, so they are not ported (volumes through exports; a settings menu is a later step).

**Convars** pma read become panel settings: `voice_defaultVoiceMode`, `voice_enableProximityCycle`, `voice_enableRadios`, `voice_enablePhones`, `voice_defaultRadioVolume`, `voice_defaultPhoneVolume`, `voice_enableSubmix`, `voice_enableRadioAnim`, `voice_disableVehicleRadioAnim`, `voice_syncPlayerNames`. Engine convars stay engine convars: on the Mumble backend ai-voice sets `voice_useNativeAudio true` and `voice_useSendingRangeOnly true` itself (as pma does when none is set), so `misc.cfg` no longer needs them.

## 4. Architecture

```
server                                         client
  content.ts   panel (settings, channels)        state from GlobalKey backend + PlayerState bags
  backend.ts   probe, Enhanced natives by hash   mumble.ts    Legacy: own channel, target loop (200 ms),
  players.ts   VoicePlayer per source                          spectate listen, volume / submix per talker
  groups.ts    radio + call membership,          effects.ts   submixes, mic clicks, volume overrides
               pma net events, checks            proximity.ts cycle key, range override
  enhanced.ts  spatial channels per bucket and   radio.ts     PTT, anim, dead check, disable bits
               distance, radio/call channels     phone.ts     call membership
  exports.ts   own + pma-voice exports           exports.ts   own + pma-voice exports
```

- **Server owns state** on both backends: range, radio and call membership, mute. Clients ask through the lib gate (`onClientEvent` with `args` parsers and rate limits); the server sets the state bags and sends pma's deltas.
- **Enhanced backend** (server routes audio):
  - Proximity: one spatial channel per (routing bucket, distance). Every player is a member of all channels of their bucket and unmuted only in the one of their range. A custom range (`overrideProximityRange`) gets its own distance channel, created on first use and deleted when nobody uses it. A 1 s server timer moves players whose routing bucket changed (FiveM has no bucket event), so instanced interiors at the same coordinates do not leak voice.
  - Radio: one non-spatial channel per frequency, members join muted; `pma-voice:setTalkingOnRadio true` unmutes, false mutes.
  - Calls: one non-spatial channel per call id, members unmuted.
  - Admin mute: muted in every channel; unmutes are refused while the mute lasts.
  - `VoiceChannel` (from the prototype) remembers mute / deaf per member and never re-adds a member (re-adding resets both).
- **Mumble backend** (client routes audio, pma's proven model): each client joins its own channel (its server id), uses voice target 1, every 200 ms re-targets the channels of players within range (`GetActivePlayers` already filters routing buckets), targets call members always and radio members while PTT is held; receivers apply a volume override and the radio / phone submix to a talker while they talk on radio or are in a call. `MumbleSetTalkerProximity` follows the range. Spectating listens to every channel.
- **Effects on Enhanced**: the client applies volume overrides and submixes only when `sv_mumble` is true (the only client voice API there); otherwise radio and calls play without filter. Mic clicks are GTA frontend sounds (`Start_Squelch` / `End_Squelch` of `CB_RADIO_SFX`) on both backends, so ai-voice has no NUI.
- **Admin panel** (ai-core F10): tab Settings (backend, ranges list with name and metres, default range, cycle on/off, radio on/off, radio volume, radio animation and in-vehicle animation, radio effect, mic clicks, radio names, phone on/off, phone volume, phone effect), tab Restricted channels (records: name, frequency from-to, jobs, on duty only) checked on the server with lib `online`. Settings are `sync: "all"` (clients read ranges and volumes); restricted channels stay on the server.
- **HUD**: ai-hud keeps working without a change: it reads the `proximity` bag (now really replicated), `pma-voice:setTalkingMode` and `pma-voice:radioActive`, and `NetworkIsPlayerTalking`. ai-voice shows no UI of its own.
- **Scale**: per-player state is a class in a `Map` by source, cleared on drop (Enhanced reuses ids). Channel membership events go only to that channel's members. The Mumble target loop walks only players in scope. The Enhanced bucket timer is one native call per player per second on the server.

## 5. Step plan

1. Resource from the template (`bun run new voice`), no database, `provide` lines, panel schema and lang texts. Verify: typecheck, lint, build; the generated manifest has `provide 'pma-voice'`.
2. Server core: settings reader, backend probe, `VoicePlayer` registry, range requests and the `proximity` / `radioChannel` / `callChannel` / `muted` bags, radio and call groups with pma's net events, channel checks (exports + panel jobs), admin mute, `voicedebug`. Verify: build; on the Legacy server the console prints `backend mumble`.
3. Enhanced server: `VoiceChannel`, proximity channels per bucket and distance, radio and call channels, mute. Verify on the Enhanced test server (`enhance/` profile with `voice_internal`): two players hear each other within the range only, radio PTT, a call across the map, routing bucket separation.
4. Client: backend from GlobalState, Mumble backend (channel, targets, spectate), effects, cycle keybind, range override, radio PTT (anim, dead check, disable bits, control 249 forced while held), calls, volumes (KVP), exports. Verify on Legacy with two clients: ranges, radio with effect and clicks, phone call, ai-hud indicator.
5. pma-voice exports and events through `provideExport`; remove pma-voice from server.cfg, delete it, restart. Verify ai-hud and a phone / radio script.
6. Later: player voice settings menu (volumes, mic clicks), noise-suppression intent (`MumbleSetAudioInputIntent`) on Legacy, a `submix` state bag, hook rewrite (not only veto), Enhanced listen-only (spectate) for admins, client voice API on Enhanced when FiveM documents it.

## 6. Open questions to verify in game

- Enhanced: does `NetworkIsPlayerTalking` report talking without `sv_mumble`? (ai-hud depends on it.)
- Enhanced: does a spatial channel already separate routing buckets? (If yes, the bucket keying is harmless.)
- Enhanced: does control 249 (push-to-talk) forced by script make the client transmit, as on Mumble?
- Legacy: an unknown native hash through `Citizen.invokeNative` throws (the probe also guards against a silent return).
