# Gestures layer (hands up, pointing, emotes)

Scripts that need to know whether a player shows their hands (a police search, a robbery) ask ai-core on the player's client (lib `gestures.isHandsUp()` / `isPointing()`, client exports `IsHandsUp`, `IsPointing`, `GetGestureProvider`). ai-core answers from the first running emote script (`resources/[ai]/ai-core/resource/client/gestures.ts`); with none both are false.

| Script | Calls | Status |
|---|---|---|
| tgiann-emotes 2.0.1 | `IsPlayerInHandsUp`, `IsPlayerPointing` (older versions such as 1.5.0 lack both: ai-core warns on the version) | written from its source |
| codem-emotemenu | `IsHandsUp`, `IsPointing` | written from its docs |
| rpemotes (rpemotes-reborn 2.2.0 `provide`s `rpemotes` and answers its exports under that name, so either folder name works) | `IsPlayerInHandsUp` (only while its `Config.HandsupEnabled`), `IsPlayerPointing` | written from its source |
| 0r-animmenu | `getHandsup` (no pointing export: pointing reads false) | written from its docs |
| ai-smallresources | `IsHandsUp`, `IsPointing` (its gestures; its keys stay off while another emote script above runs) | ours |

Hands up / pointing not supported: dpemotes (no exports), scully_emotemenu (hands up only in its local state bag `handsup`, no export; no pointing state).

## Emotes (play / cancel)

Client lib `gestures.playEmote(name)` (export `PlayEmote`: the emote's command name as `/e <name>` takes it, letters, digits, `_` and `-`), `gestures.cancelEmote()` (export `CancelEmote`), `gestures.emoteProvider()`; Lua `aiLib.gestures.playEmote` / `cancelEmote`. A second picker in the same file (`EMOTES`, first running wins); with none both answer false. ai-police cancels the emote when a player is cuffed.

| Script | Play / cancel | Status |
|---|---|---|
| tgiann-emotes 2.0.1 | `EmoteCommandStart(name)`, `EmoteCancel()` | written from its source |
| rpemotes (rpemotes-reborn 2.2.0) | `EmoteCommandStart(name)`, `EmoteCancel()` (also under `rpemotes`) | written from its source |
| scully_emotemenu 2.1.0 | `playEmoteByCommand(name)`, `cancelEmote()` | written from its docs (repo docs/exports/client) |
| dpemotes | no exports: its `e <name>` / `e c` commands | written from its source |

Not added: codem-emotemenu and 0r-animmenu play / cancel (no export found in a source or docs).

A new emote script: one line in `PROVIDERS` (resource name, the version the names were read from, its hands-up export and, when it has one, its pointing export), in the order it should win.
