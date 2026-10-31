# Billing layer (bills and invoices)

Bills from a job (police fines, service fees) or a player go to a player through ai-core, so scripts never call a billing script directly and any of the supported ones can run.

- Server: lib `billing.send({ to, amount, label, from?, job? })`, `unpaid(source)` (a promise of `{ id, label, amount, sender }[]` or null), `pay(source, id)`, `provider()` (exports `SendBill`, `GetUnpaidBills(source, done)`, `PayBill`, `GetBillingSystem`; `resources/[ai]/ai-core/resource/server/billing/`). Lua `aiLib.billing`. A bill with `job` pays that job's account, one without pays `from` (then required).
- Picked by the panel setting `billing` (General, Bills): `auto` = the first running script of `BILLING_SCRIPTS`, then ai-core's own bills (`ai-core`), which always run, so a bill never goes nowhere.
- ai-core's own bills: kept in memory by character id until paid (at most 20 open per character; a restart drops them). The player gets the list of open bills when one arrives and after each character load (ai-lib menu) and pays one by picking it: one `money.transfer` from the payer's bank, else cash, to the job's `bank` account or the issuer's bank. A personal bill whose issuer is offline cannot be paid until the issuer is back.

| Script | Send | Open bills / pay | Status |
|---|---|---|---|
| tgiann-phone 2.0.0-b8 (billing app) | `CreateInvoice({ sender = { type = "job" or "player", id, label }, issuer, target = { kind = "source", value }, items = { { label, price, quantity = 1 } }, vat = false })` | `GetUnpaidInvoices(citizenid)`; paid only in the phone app | written from its source |
| okokBillingV3 | `CreateInvoice(receiver, amount, reason, author)` (author = job name or the issuer's server id) | `getInvoices(target)` (every status but `paid` counts as open, fees added), `payReference(payer, ref)` | written from its docs |
| wasabi_billing | `CreateInvoice(authorSource, targetCitizenid, amount, reason, "society" or "personal", "personal")` | `PayInvoiceByReference(payer, ref)`; its list rows are not documented | written from its docs |
| codem-billing | `createBilling(issuerSource, targetServerId, amount, reason, job)` (job bills with an issuer only) | in its own screen | written from its docs (the export wasabi_billing's compat layer also answers) |
| qs-billing | `ServerCreateInvoice(receiver, label, label, amount, true, false, false, false, job)` (job bills only: its docs say `isSociety` must be true) | in its own screen | written from its docs |
| esx_billing 1.0 (ESX Legacy 1.16.3) | `BillPlayer(targetId, senderCitizenid, "society_<job>" or the sender's id, label, amount)` | in its own menu | written from its source |

Limits:
- codem-billing, wasabi_billing and personal bills need an issuing player; a job bill without `from` (a speed camera) works with ai-core's own bills, tgiann-phone, okokBilling, qs-billing and esx_billing.
- esx_billing checks a society bill with `esx_addonaccount:getSharedAccount`, which ai-core's bridge does not answer: its job bills fail on ai-core (personal bills work).
- okokBilling's open-bill statuses other than `paid` are not documented; anything else counts as open.
- Exports that wait for their database answer a promise: `send` reports it as sent and logs a later refusal.
- Not supported: jim-payments (its charge events take the biller from the event `source`, no server export), ps-billing (no such resource found).
