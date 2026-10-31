# Notification layer (ai-lib's cards to another UI)

Every ai-* script and ai-core's bridge show notifications through ai-lib (lib `notify`, server `notify(source, ...)`, Lua `aiLib.notify`, ESX / QB notify). The owner can send those cards to another notification script: ai-core panel, General, Notifications (`notify`: `ai-lib` by default, or one of the list below). There is no automatic pick, so a server that runs ox_lib for other scripts keeps ai-lib's cards until the owner picks otherwise.

ai-core publishes the pick in GlobalState `ai:notify` (unset = ai-lib's own cards, also while the picked script is stopped); ai-lib's client hands each card to ai-core's client export `ExternalNotify(card)` while it is set (`resources/[ai]/ai-lib/resource/ui/notify.ts`), and ai-core translates it through the script's adapter (`resources/[ai]/ai-core/resource/client/notify.ts`). Without ai-core ai-lib always draws its own cards.

| Script | Call | Status |
|---|---|---|
| tgiann-lumihud 2.2.1 | `Notify({ title, description, type, duration })` (types primary / success / error: info and warning show as primary) | written from its source (client/client.lua) |
| okokNotify | `Alert(title, text, time, type, false)` | written from community_bridge's adapter (source) |
| ox_lib | `notify({ title, description, type, duration })` (info as `inform`) | written from community_bridge's adapter (source) |
| mythic_notify | `SendAlert(type, text, length)` (inform / error / success: warning shows as inform) | written from community_bridge's adapter (source) |
| brutal_notify | `SendAlert(title, text, time, type, false)` | written from community_bridge's adapter (source) |

Limits: only notification cards move; ai-lib's prompts (the right-hand text and its key) stay ai-lib's. Not added: tgiann-core has no notification UI of its own (its `tgiCore.notif` uses tgiann-lumihud or the framework), codem notify (no export found in a source or docs), wasabi_notify (community_bridge's call passes the type as the title; arguments unclear).

A new notification script: one line in `NOTIFY_SYSTEMS` (`resource/server/notify/registry.ts`) and one adapter in `ADAPTERS` (`resource/client/notify.ts`).
