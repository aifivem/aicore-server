# Phone layer

ai-* scripts reach the player's phone through ai-core (lib `phone`): `number(source)`, `sourceOf(number)`, `hasPhone(source)`, `mail(to, { sender, subject, message })`, `message(from, to, text)`, `notify(source, { title, message, app? })`. ai-core forwards to the first running phone (`resources/[ai]/ai-core/resource/server/phone/`, one adapter file each); with none every call answers null / false, so scripts work without a phone.

| Phone | Calls | Status |
|---|---|---|
| tgiann-phone | `GetPhoneNumber`, `GetSourceByNumber`, `HasPhone`, `SendMail({ to, from, subject, message })` (`to` may be a number), `SendSms(from, to, { body })`, `SendNotification(source, { app, title, content })` (lb-phone name it answers too) | written from its source |
| lb-phone | `GetEquippedPhoneNumber`, `GetSourceFromNumber`, `HasPhoneItem`, `SendMail({ to, sender, subject, message })`, `SendMessage(from, to, text)`, `SendNotification(source, { app, title, content })` | untested on ai-core |

A new phone: a file in `phone/adapters/` exporting a `PhoneAdapter` (`@aicore-fivem/shared` `phone.ts`) and a line in `phone/index.ts`.
