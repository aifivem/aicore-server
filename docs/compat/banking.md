# Banking layer (bank screens, society balances)

ai-core owns every balance, job (society) accounts included (`.claude/rules/data-and-sync.md`). The banking layer only opens a banking script's screen, reads the script's own society balance for display, and moves money that lands in the script's own society account into ai-core's job account, so ai-core stays the one place job money lives.

- Server: lib `banking.open(source)`, `societyBalance(job)` (null when the script keeps none), `provider()` (exports `OpenBank`, `GetBankSocietyBalance`, `GetBankingSystem`; `resources/[ai]/ai-core/resource/server/banking/`). Lua `aiLib.banking`. Money itself always moves with lib `money` (`TransferMoney`, `*SharedMoney`).
- Picked by the panel setting `banking` (General, Bank): `auto` = the first running script of `BANKING_SYSTEMS`. ai-banking comes first: it `provide`s qb-banking and Renewed-Banking.
- Forwarding: a script that reports deposits into its own job accounts (`watchDeposits`) has each one taken out again (`take`) and added to the job's ai-core `bank` account (ledger reason `banking:<script>`); the watch is set again on a new pick, after the script restarts and when a job is added in the panel.

| Script | Society balance | Open screen | Deposits forwarded | Status |
|---|---|---|---|---|
| ai-banking | none (its society accounts are ai-core's) | only at its branches and ATMs | not needed | ours |
| tgiann-bank 2.9.1 | `GetJobAccountBalance(job)` for jobs with a `config.jobAccounts` IBAN | no export | yes: `RegisterHook("balanceChanged", cb, { ibanFilter })`, `RemoveJobMoney(job, amount)` | written from its source |
| Renewed-Banking 2.1.4 | `getAccountMoney(job)` | client event `Renewed-Banking:client:openBankUI ({ atm = false })` (its own progress bar first) | no hook | written from its source |
| qb-banking 2.0.0 | `GetAccountBalance(job)` | only at an ATM | no hook | written from its source |
| okokBankingV2 | `GetAccount(society)` | no export | no hook | written from its docs |
| fd_banking | `GetAccount(job)` | no export | no hook | written from community_bridge's adapter |
| wasabi_banking | `GetAccountBalance(job, "society")` | no export | no hook | written from community_bridge's adapter |
| kartik-banking | `GetAccountMoney(job)` | no export | no hook | written from community_bridge's adapter |
| tgg-banking | `GetSocietyAccountMoney(job)` | no export | no hook | written from community_bridge's adapter |

Limits (owner decisions open):
- No two-way sync: a boss who withdraws from a banking script's own job account in its screen takes that script's money, and ai-core's job account does not change. With forwarding (tgiann-bank) the script's job accounts stay near 0, so bosses use ai-core's job money (ai-management). Mirroring ai-core's balance into the script and its withdrawals back would keep two copies of one balance.
- Scripts without a deposit hook keep whatever other scripts pay into them; nothing sweeps them (that would mean polling).
- okokBanking's society naming (`police` or `society_police`) is not documented; the job name is passed as is.
- Not supported: qs-banking and codem-bank (no export documentation found).
