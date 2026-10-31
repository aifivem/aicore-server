# Phone layer

ai-* scripts reach the player's phone through ai-core (lib `phone`): `number(source)`, `sourceOf(number)`, `hasPhone(source)`, `mail(to, { sender, subject, message })`, `message(from, to, text)`, `notify(source, { title, message, app? })`. ai-core forwards to the first running phone (`resources/[ai]/ai-core/resource/server/phone/`, one adapter file each); with none every call answers null / false, so scripts work without a phone.

Detection order (first running wins): tgiann-phone, lb-phone, gksphone, 17mov_Phone, yseries, high-phone, roadphone, qs-smartphone.

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

Limits:

- Docs-only adapters carry no `version` (their docs state none), so ai-core cannot warn about another installed version.
- gksphone, 17mov_Phone, yseries: no has-phone export; a player counts as having a phone while the phone answers a number for them.
- gksphone mails only reach an online player (`SendNewMail` takes a server id; its offline mail takes a citizen id).
- 17mov_Phone notifications go to its `SYSTEM` app (its app ids are its own, not ours).
- yseries: the mail sender name also fills the sender address field. The separate `yphone` / `yflip` resources other bridges call with the same export names are not covered (TeamsGG's docs only describe `yseries`).
- high-phone `sendMail` mails addresses from a sender set up in its mail config, roadphone mails a framework identifier, qs-smartphone mails a server id or address: `mail` answers false on these three. qs-smartphone has no number -> player export (`sourceOf` null).
- roadphone: the older RoadPhone (same resource name) has none of these server exports; its calls fail and answer null / false.

Found, not added:

| Phone | Why |
|---|---|
| npwd 3.16.0 | its number and player lookups are async exports (`getPlayerData`), the only sync one (`getPhoneNumber`) logs a deprecation error on every call, notifications are client-only, no mail: the phone layer is synchronous (source read: github.com/project-error/npwd) |
| qs-smartphone-pro | no official docs for its exports; bridges call `GetPhoneNumberFromIdentifier(identifier, false)`, `sendNotification(number, { app, head, msg })`, `sendNewMail(source, {...})` |
| okokPhone | its docs are a Notion site that cannot be read; API not verified |
| codem-phone, sd-phone, cylex_phone, sky_phone | only seen in other scripts' integrations, no docs read |

A new phone: a file in `phone/adapters/` exporting a `PhoneAdapter` (`@aicore-fivem/shared` `phone.ts`) and a line in `phone/index.ts`.
