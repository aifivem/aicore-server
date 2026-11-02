# Phone layer

ai-* scripts reach the player's phone through ai-core (lib `phone`): `number(source)`, `sourceOf(number)`, `hasPhone(source)`, `mail(to, { sender, subject, message })`, `message(from, to, text)`, `notify(source, { title, message, app? })`, and `onUsed(fn)` on both sides (below). ai-core forwards to the first running phone (`resources/[ai]/ai-core/resource/server/phone/`, one adapter file each); with none every call answers null / false, so scripts work without a phone.

Detection order (first running wins): tgiann-phone, lb-phone, gksphone, 17mov_Phone, yseries, high-phone, roadphone, qs-smartphone, codem-phone.

| Phone | Calls | Status |
|---|---|---|
| tgiann-phone 2.0.0-b8 | `GetPhoneNumber`, `GetSourceByNumber`, `HasPhone`, `SendMail({ to, from, subject, message })` (`to` may be a number), `SendSms(from, to, { body })`, `SendNotification(source, { app, title, content })` (lb-phone name it answers too) | written from its source |
| lb-phone | `GetEquippedPhoneNumber`, `GetSourceFromNumber`, `HasPhoneItem`, `SendMail({ to, sender, subject, message })`, `SendMessage(from, to, text)`, `SendNotification(source, { app, title, content })` | untested on ai-core |
| gksphone (GKSPHONE V2) | `GetPhoneBySource` (number, and has-phone = a number), `GetSourceByPhone`, `SendNewMail(source, { sender, subject, message })` to the number's online player, `SendMessage(from, to, text)` (`{ status }`), `sendNotification(source, { title, message, duration })` | written from its docs (docs.gkshop.org) |
| 17mov_Phone | `GetNumberFromPlayer` (number, has-phone), `GetPlayerSrcFromActiveNumber`, `Email_SendEmailByNumber(number, sender, subject, message, nil, true)`, `Messages_SendMessageToNumber(to, text, from)` (`{ success }`), `SendNotificationToSrc(source, { app = "SYSTEM", title, message })` | written from its docs (docs.17movement.net/phone) |
| yseries (TeamsGG YPhone / YFlip) | `GetPhoneNumberBySourceId` (number, has-phone), `GetPlayerSourceIdByPhoneNumber`, `SendMail({ title, sender, senderDisplayName, content }, "phoneNumber", to)`, `SendMessageTo(from, to, text)`, `SendNotification({ app, title, text }, "source", source)` | written from its docs (teamsgg.dev/docs, phone server exports) |
| high-phone | `getPlayerPhoneNumber`, `getPlayerByPhone(number).id`, `getPlayerPhone` (has-phone), `sendMessage({ sender, recipient, content })`, `sendNotification(source, { application = { name }, title, content, duration })`; mail not mapped | written from its docs (docs.high-scripts.com/phone) |
| roadphone (RoadPhone Pro) | `GetPhoneNumberBySource`, `getSourceFromPhone`, `hasPhone`, `sendMessage(from, to, text)`, `PhoneNotifyPlayer(source, { title, message, app })`; mail not mapped | written from its docs (docs.roadshop.org/roadphonepro) |
| qs-smartphone (Quasar, current) | `GetCurrentPhoneNumber`, `getPhoneScopeIdentifier` (has-phone), `SendNewMessageFromApp({ targetPhone, appLabel = from, message })` (`{ ok }`), `sendPhoneNotification(source, { appId, title, text })`; number -> player and mail not mapped | written from its docs (quasar-store.com/docs/smartphone) |
| codem-phone (CodeM mPhone 2.5) | `GetPhoneNumberBySource` (number, has-phone), `GetSourceFromNumber`, `SendMailBySource(source, { sender, title, description })` and `SendMessageFromBySource(from, source, text)` (`ok, result`) to the number's online player, `SendNotify(source, { app, title, message })` (only with an `app`) | written from its docs (codem.gitbook.io, mPhone 2.5, Exports and events, Server Exports) |

Limits:

- Docs-only adapters carry no `version` (their docs state none), so ai-core cannot warn about another installed version.
- gksphone, 17mov_Phone, yseries: no has-phone export; a player counts as having a phone while the phone answers a number for them.
- gksphone mails only reach an online player (`SendNewMail` takes a server id; its offline mail takes a citizen id).
- 17mov_Phone notifications go to its `SYSTEM` app (its app ids are its own, not ours).
- yseries: the mail sender name also fills the sender address field. The separate `yphone` / `yflip` resources other bridges call with the same export names are not covered (TeamsGG's docs only describe `yseries`).
- high-phone `sendMail` mails addresses from a sender set up in its mail config, roadphone mails a framework identifier, qs-smartphone mails a server id or address: `mail` answers false on these three. qs-smartphone has no number -> player export (`sourceOf` null).
- roadphone: the older RoadPhone (same resource name) has none of these server exports; its calls fail and answer null / false.
- codem-phone: no has-phone export (a number counts); mails and texts reach only an online player (its exports take a server id); `notify` without an `app` answers false (`SendNotify` refuses it, and its app ids are its own).

## Phone used

When the local player opens the phone, ai-core fires the client local event `CORE.clientPhoneUsedEvent (phone)` (lib client `phone.onUsed(fn)`) and tells the server (`CORE.phoneOpenedEvent`, through the lib gate: a loaded character, one per 5 s), which fires the server local event `CORE.phoneUsedEvent (src, phone)` (lib server `phone.onUsed(fn)`, Lua `aiLib.phone.onUsed`); `phone` is the active phone's resource name. Once per opening (a close and a new open), at most once per 10 s per player. The client half (`resources/[ai]/ai-core/resource/client/phone/`, one adapter file per phone) follows the server's pick (GlobalState `ai:phone`) and counts only the picked phone's signal; a phone with only an open-state export is read once a second while it is the picked one. ai-police reports a wanted player's phone use as the sighting place `phone`.

| Phone | Signal | Source |
|---|---|---|
| tgiann-phone | client local `tgiann-phone:hook:visibility (isOpen, onScreen)`, an opening = `isOpen` turning true | its readable `compat/lb-phone/client.lua` (2.0.0-b8) |
| lb-phone | client `lb-phone:phoneToggled (open)`, `open` true (listened to as a local and as a server event) | docs.lbscripts.com/phone/exports/client-events |
| gksphone | client export `isPhoneOpen()`, read once a second (no open event: its server events cover calls, messages, posts, reports and damage only; its `phoneOpen` player state bag ("Phone on or off") is not used: the docs say "the phone writes" it without saying from which side, and client writes are refused here) | docs.gkshop.org/gksphone-v2/exports-and-events/client-exports, .../server-events, .../state-bags |
| 17mov_Phone | client export `IsPhoneOpen()`, read once a second (no phone open event or state bag in its docs; `17mov_Phone:Client:AppStateChanged (appName, state)` is per app, not the phone) | docs.17movement.net/phone/exports/global-exports/client-exports.md, phone/building-custom-apps/native-features-integration.md |
| yseries | client export `IsOpen()`, read once a second (no client events page; its `phoneOpen` / `softOpen` player state bags are not used: the docs do not say who writes them, and client writes are refused here) | teamsgg.dev/docs/paid-scripts/phone/exports/client-side/general, phone/state-bags |
| high-phone | player state bag `phone:open` of the local player turning true (no open event or export; works only if high-phone writes it from its server, `sv_stateBagStrictMode`) | docs.high-scripts.com/phone/statebags/player |
| roadphone | client export `isPhoneOpen()`, read once a second (`roadphone:use` opens the phone on an item use, it is not a signal; its `roadphoneStatus.open` bag is written by the client (refused here); `roadphoneActive` (server) is written on a use or open but not cleared on close; the server events `roadphone:battery:phoneOpened` / `phoneClosed` exist only with `Config.BatterySystem` and `Config.UseMetadata`) | docs.roadshop.org/roadphonepro/api/client.md, api/clientevents.md, api/server.md (Phone Status, Active phone state bags), api/serverevents.md |
| qs-smartphone | client local `phone:opened ({ mode })`, only `mode` `full` (a `peek` shows a notification) | quasar-store.com/docs/smartphone/commands-and-exports |
| codem-phone | `codem-phone:client:playerPhoneUsed ()` (listened to as a local and as a server event; its docs also list a client `IsPhoneOpen()`) | the owner's server (qbx_smallresources isWanted listens to it) |

Found, not added:

| Phone | Why |
|---|---|
| npwd 3.16.0 | its number and player lookups are async exports (`getPlayerData`), the only sync one (`getPhoneNumber`) logs a deprecation error on every call, notifications are client-only, no mail: the phone layer is synchronous (source read: github.com/project-error/npwd) |
| qs-smartphone-pro | no official docs for its exports; bridges call `GetPhoneNumberFromIdentifier(identifier, false)`, `sendNotification(number, { app, head, msg })`, `sendNewMail(source, {...})` |
| okokPhone | its docs are a Notion site that cannot be read; API not verified |
| sd-phone, cylex_phone, sky_phone | only seen in other scripts' integrations, no docs read |

A new phone: a file in `server/phone/adapters/` exporting a `PhoneAdapter` (`@aifivem/shared` `phone.ts`) and a line in `server/phone/index.ts`; its open signal a file in `client/phone/adapters/` exporting a `PhoneClientAdapter` (`watch` for an event or state bag, `isOpen` for an export only; neither when none is documented: "Phone used" says none) and a line in `client/phone/index.ts`, in the same order.
