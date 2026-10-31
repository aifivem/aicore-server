# Banking layer (bank screens, society balances)

The banking layer opens a banking script's screen, reports a job's society balance and links the script's own job and gang accounts to ai-core's job and gang `bank` accounts through the script's documented exports (no patches, no manifest includes).

- Server: lib `banking.open(source)`, `societyBalance(job)`, `provider()` (exports `OpenBank`, `GetBankSocietyBalance`, `GetBankingSystem`; `resources/[ai]/ai-core/resource/server/banking/`, the link in `banking/link.ts`). Lua `aiLib.banking`. Money itself always moves with lib `money` (`TransferMoney`, `*SharedMoney`).
- Picked by the panel setting `banking` (General, Bank): `auto` = the first running script of `BANKING_SYSTEMS`. ai-banking comes first: it `provide`s qb-banking and Renewed-Banking.
- An adapter whose script has job / gang exports fills `accounts` (`BankingAccounts` in `@aicore-fivem/shared`: `has`, `balance`, `add`, `remove`, optional `set` and `watch`). Only ai-core's `bank` account of a job or gang is linked, and only for jobs / gangs the script has an account for; character money is never touched.
- Account mode, panel setting `bankAccounts` (same card, "Job and gang accounts"):
  - `core` (default): ai-core holds the money. `societyBalance(job)` answers ai-core's job `bank` balance. For a script with `set` and `watch`: every change of a linked ai-core account (paychecks, bills, `AddSharedMoney`, transfers, admin edits) is written to the script with `set`, one write per account per tick (`setImmediate` batch) and none when the script already shows that balance; a change made in the script (its screen: deposit, withdrawal, transfer; its own money exports called by other scripts) arrives through `watch` and is applied to ai-core's account as the same delta (ledger reason `banking:<script>`); a delta ai-core cannot take (the account would go below 0) is logged and the script is set back to ai-core's balance. On every activation (start, a new pick, the script restarting, switching to `core`, a job or gang added in the panel) ai-core's balance wins: the script's balance of every linked account is set to ai-core's. A write the script refuses (it creates its accounts a moment after it starts) is tried again every 3 s, 10 times, then logged and left until the next activation.
  - Echo guard: the script reports ai-core's own `set` back synchronously (tgiann-bank fires `balanceChanged` inside `SetJobMoney`); the link sets a `writing` flag around each call and drops reports while it is up, and keeps the balance the script shows per account (`known`), so a write that would not change it is skipped.
  - `own`: the script holds the money. ai-core's job / gang `bank` account reads (`GetSharedMoney`, the bridge's society functions) and changes (`AddSharedMoney`, `RemoveSharedMoney`, `TransferMoney`, paychecks from the job account, bills paid to a job) go to the script's `balance` / `add` / `remove` synchronously inside `Account` (`money/account.ts`, `linkSharedAccounts`); a refusal (`false`: no account, not enough money) is a failed change. ai-core's own rows of those accounts are left untouched and no ai-core ledger row is written; jobs / gangs the script has no account for stay in ai-core. `societyBalance(job)` answers the script's own balance.

| Script | Docs checked | `core` mode | `own` mode | Open screen | Status |
|---|---|---|---|---|---|
| ai-banking | ours | its society accounts are ai-core's (always) | the same (it keeps none of its own; `societyBalance` null) | only at its branches and ATMs | ours |
| tgiann-bank 2.9.1 | https://tgiann.gitbook.io/tgiann/scripts/tgiann-bank/exports, `/hooks`, its source (`server/exports.lua`, `hooks.lua`) | linked both ways: `SetJobMoney` / `SetGangMoney` for ai-core's changes, `RegisterHook("balanceChanged", cb, { ibanFilter })` for its own | `GetJobAccountBalance` / `AddJobMoney` / `RemoveJobMoney` (and the gang ones) | no export | written from its docs and source |
| Renewed-Banking 2.1.4 | https://github.com/Renewed-Scripts/Renewed-Banking (README exports), its source | ai-core's balance reported; its own society accounts not linked (no set export, no change hook) | `getAccountMoney` / `addAccountMoney` / `removeAccountMoney(account, amount)` (job or gang name) | client event `Renewed-Banking:client:openBankUI ({ atm = false })` (its own progress bar first) | written from its source |
| qb-banking 2.0.0 | its source | ai-core's balance reported; not linked | `GetAccountBalance(job)` reported only | only at an ATM | written from its source |
| okokBankingV2 | https://docs.okokscripts.io/scripts/okokbankingv2/exports | ai-core's balance reported; not linked (no set export, no change hook) | `GetAccount` / `AddMoney` / `RemoveMoney(society, value)` | no export | written from its docs |
| fd_banking | community_bridge's adapter | ai-core's balance reported; not linked | `GetAccount(job)` reported only | no export | written from community_bridge's adapter |
| wasabi_banking | community_bridge's adapter | ai-core's balance reported; not linked | `GetAccountBalance(job, "society")` reported only | no export | written from community_bridge's adapter |
| kartik-banking | community_bridge's adapter | ai-core's balance reported; not linked | `GetAccountMoney(job)` reported only | no export | written from community_bridge's adapter |
| tgg-banking | community_bridge's adapter | ai-core's balance reported; not linked | `GetSocietyAccountMoney(job)` reported only | no export | written from community_bridge's adapter |

"Not linked" in `core` mode: whatever other scripts pay into the script's own society accounts stays there (nothing sweeps them, that would mean polling). "Reported only" in `own` mode: `societyBalance` shows the script's balance, ai-core's job money stays in ai-core.

## tgiann-bank

- A job's / gang's account is the one in its `config.jobAccounts` / `config.gangAccounts` (`GetJobIbanFromName` / `GetGangIbanFromName`); only those are linked. `GetJobAccountBalance` answers 0 (not false) without an account, so the IBAN decides.
- Accounts are not created from ai-core: `CreateJobAccount` / `CreateGangAccount` add an account to its memory and table but not to its config, so `GetJobIbanFromName`, `SetJobMoney` and its screens (which list config accounts with their grade permissions) never find it. A job whose money should show in tgiann-bank gets an entry in its `configs/configJobAccounts.lua` (or `configGangAccounts.lua`).
- It creates its job accounts after a database wait following its start; the first writes of an activation may be refused and are retried (above).
- Gang accounts exist only on QB (`gangAccountActive`); elsewhere the gang writes are refused, retried and then logged once.
- Switching `core` to `own` leaves its balances where ai-core last set them; switching back (or any start in `core`) sets them to ai-core's again, so money moved in `own` mode is replaced by ai-core's balance.
- In `own` mode tgiann-bank's history shows ai-core's paychecks and bills as plain balance changes (its job exports write no history row).

## Other limits

- okokBanking's society naming (`police` or `society_police`) and its export return values are not documented: the job / gang name is passed as is, an account counts as existing while `GetAccount` answers a number, a removal is checked against that balance first, and a money call counts as done unless it answers false.
- Not supported: qs-banking and codem-bank (no export documentation found).
