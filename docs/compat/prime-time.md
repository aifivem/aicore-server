# Prime time (busy hours) and tgiann-policealert

ai-core knows each job's prime time: the busy hours of the day. The paycheck can lower salaries outside them (ported from a Qbox server's `qbx_core` paycheck, where `tgiann-policealert` held the hours), and every script can ask through the server export `IsPrimeTime(job?) -> boolean` (lib `isPrimeTime(job?)`).

## How it works

- Code: `resources/[ai]/ai-core/resource/server/jobs/primeTime/` (`index.ts` source pick and export, `registry.ts` the scripts that keep their own hours, `adapters/` one file each), `jobs/paycheck.ts` (salary), readers `content/primeTime.ts`, panel cards `admin/primeTimeSchema.ts`.
- Panel: Job and gang rules, Prime time: lower salary on/off (`primeTime.enabled`, on by default: half salary outside 18:00-01:00), the off prime factor (`offPrimeMultiplier`, 0-1, default 0.5), where the hours come from (`source`: `auto`, `ai-core`, `tgiann-policealert`), a read-only row with the hours in use now, and the default hours (`start`, `finish`). Jobs tab, each job: own prime hours (`primeOwn`, `primeStart`, `primeFinish`); each rank: off prime salary (`offPrimePayment`, 0 = not set).
- Hours are whole server hours (0-23) in the server's local time (as tgiann-policealert's `os.date`); `start > finish` runs past midnight (18-1 = 18:00 to 00:59), `start < finish` within one day, `start = finish` the whole day. No days of the week or time zones (neither has tgiann-policealert).
- Source: `auto` asks the first running script of the registry (tgiann-policealert's `IsPrimeTime(jobName)`) while it runs (its `configs/config.lua` `config.primeTime` per job and `default` decides; ai-core's hours are unused), else ai-core's hours. `ai-core` always uses ai-core's hours. `tgiann-policealert` always asks it, and while it is stopped every hour counts as prime time (full salary, like the original paycheck). A failing export call falls back to ai-core's hours with an error in the console.
- Paycheck (only with `enabled`): outside the on-duty job's prime time the rank's `offPrimePayment` is paid when set, else `floor(salary x offPrimeMultiplier)`; nothing is paid when that is 0. With "Pay from the job's own money" the job account pays what the player gets. The prime time answer is asked once per job per paycheck run.
- `IsPrimeTime` answers the hours whether or not the salary cut is on.

## tgiann-policealert

| What | Where |
|---|---|
| global `isPrimeTime(jobName?)`, `true` inside the job's window (`config.primeTime[jobName]` or `.default`); **not exported** in stock 2.9 / 2.10 | `server/editable.lua` (open) |
| `config.primeTime = { default = { start = 18, finish = 1 }, police = {...} }` | `configs/config.lua` |
| Personal list "prime hour working time": while an officer is on duty inside prime hours, the time adds up in its UI (`workingHours` column of `tgiann_police_alert_personal_list`) | escrowed, not readable |

Its formula `hour >= start or hour < finish` only works for windows past midnight (a same-day window like 10-18 is always prime there); ai-core reads same-day windows correctly in its own hours, but while tgiann-policealert is the source its own formula decides.

Status: needs a patch to its open `server/editable.lua`. Stock 2.9.0 and 2.10.0 keep `isPrimeTime` as a global function and export nothing, so ai-core's call fails (console error, ai-core's hours used). Add one line under the function:

```lua
exports("IsPrimeTime", isPrimeTime)
```

Written from tgiann-policealert 2.10.0's `editable.lua` (same function as 2.9.0), untested on ai-core. The adapter warns once in the console when another version runs.

Other scripts with their own prime hours: none found (searched the local TGIANN servers' resources; no public dispatch, MDT or job script found with a prime time API).

## Adding a script with its own prime hours

One file in `jobs/primeTime/adapters/` exporting a `PrimeTimeAdapter` (`resource`, `version`, `isPrimeTime(job?)` through lib `callExport`, parse the answer) and one line in `registry.ts`; the panel's source select and the read-only row pick it up.
