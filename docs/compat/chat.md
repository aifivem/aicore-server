# chat (answered by ai-chat)

ai-chat `provide`s `chat` (FiveM's system chat resource API); `resources_useSystemChat` stays `false`. Code: `resources/[ai]/ai-chat/resource/client/events.ts`, `server/exports.ts`, `server/router.ts`.

## Status

Works. Client: `chat:addMessage` (net and local, cfx shape or a plain string), `chatMessage (author, color, text)`, `chat:addSuggestion(s)`, `chat:removeSuggestion`, `chat:addMode` / `chat:removeMode`, `chat:clear`, `__cfx_internal:serverPrint`, exports `addMessage`, `addSuggestion`. Server: exports `addMessage(target, message)`, `registerMessageHook(fn)` (`updateMessage`, `cancel`, `setRouting`), `registerMode(data)` (its `cb` routes the message); the server event `chatMessage (source, author, text)` fires for every message and canceling it stops delivery.

## Known limits

- `chat:addTemplate` is ignored and templates are not drawn (HTML from scripts); the message shows its args.
- `setSeObject` of message hooks and mode `seObject` ACE filtering are not answered.
- Messages typed into chat are not sent through `_chat:messageEntered`; scripts that listen to that internal event see nothing (use `chatMessage`).
