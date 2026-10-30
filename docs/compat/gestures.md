# Gestures layer (hands up, pointing)

Scripts that need to know whether a player shows their hands (a police search, a robbery) ask ai-core on the player's client (lib `gestures.isHandsUp()` / `isPointing()`, client exports `IsHandsUp`, `IsPointing`, `GetGestureProvider`). ai-core answers from the first running emote script (`resources/[ai]/ai-core/resource/client/gestures.ts`); with none both are false.

| Script | Calls | Status |
|---|---|---|
| tgiann-emotes | `IsPlayerInHandsUp`, `IsPlayerPointing` | written from its source |
| ai-smallresources | `IsHandsUp`, `IsPointing` (its gestures; its keys stay off while tgiann-emotes runs) | ours |

A new emote script: one line in `PROVIDERS` (resource name and its two export names), in the order it should win.
