# Gestures layer (hands up, pointing)

Scripts that need to know whether a player shows their hands (a police search, a robbery) ask ai-core on the player's client (lib `gestures.isHandsUp()` / `isPointing()`, client exports `IsHandsUp`, `IsPointing`, `GetGestureProvider`). ai-core answers from the first running emote script (`resources/[ai]/ai-core/resource/client/gestures.ts`); with none both are false.

| Script | Calls | Status |
|---|---|---|
| tgiann-emotes 2.0.1 | `IsPlayerInHandsUp`, `IsPlayerPointing` (older versions such as 1.5.0 lack both: ai-core warns on the version) | written from its source |
| codem-emotemenu | `IsHandsUp`, `IsPointing` | written from its docs |
| rpemotes (rpemotes-reborn 2.2.0 `provide`s `rpemotes` and answers its exports under that name, so either folder name works) | `IsPlayerInHandsUp` (only while its `Config.HandsupEnabled`), `IsPlayerPointing` | written from its source |
| 0r-animmenu | `getHandsup` (no pointing export: pointing reads false) | written from its docs |
| ai-smallresources | `IsHandsUp`, `IsPointing` (its gestures; its keys stay off while another emote script above runs) | ours |

Not supported: dpemotes (no exports), scully_emotemenu (hands up only in its local state bag `handsup`, no export; no pointing state).

A new emote script: one line in `PROVIDERS` (resource name, the version the names were read from, its hands-up export and, when it has one, its pointing export), in the order it should win.
