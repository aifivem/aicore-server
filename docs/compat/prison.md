# Prison layer

Jail, release and "time left" go through ai-core (lib `prison.jail(source, minutes, by?)`, `release`, `timeLeft`; exports `JailPlayer`, `ReleasePlayer`, `GetJailTime`; `resources/[ai]/ai-core/resource/server/prison/`), so police scripts and admin tools never call a prison script directly. The first running script in `PRISONS` answers; with none running every call answers false / 0.

| Script | Jail / release | Time left | Status |
|---|---|---|---|
| ai-prison | exports `JailPlayer` / `ReleasePlayer` | export `GetJailTime` | ours |
| qb-prison | QB `injail` metadata + client events `prison:client:Enter (minutes)` / `prison:client:UnjailPerson` | QB `injail` metadata | written from its source |
| rcore_prison | exports `Jail(id, minutes, nil, officerId?)` / `Unjail(id)` (only when `IsPrisoner(id)`) | `GetPrisonerData(id).jail_time` | written from its docs |
| xt-prison 1.4.8 | qb-prison's client events `prison:client:Enter (minutes)` / `prison:client:UnjailPerson`, which it still answers | player state `jailTime` | written from its source |
| tgiann-policejob 1.7.0 | exports `SendToJail(id, minutes, nil, officerId?)` / `ReleaseFromJail(id)` | `IsPlayerJailed(id)` (`true, minutes` as an array) | written from its source |

A new prison script: one adapter file in `prison/adapters/` and one line in `PRISONS`, in the order it should win.

## Limits

- tgiann-policejob comes last: it is a police job whose jail may be switched off while a separate prison script runs. `SendToJail` adds the minutes to a running sentence (the others set it). Its jail exports exist only in builds newer than some 1.7.0 copies (the crew server's 1.7.0 has none): without them every call answers false silently ("No such export").
- xt-prison prints "triggered deprecated event" for every jail and release (its qb compatibility events); its own way in is an ox_lib client callback ai-core cannot call. `SetJailTime` is not used: it waits inside the export and only sets the time, without moving the player.
- rcore_prison and tgiann-policejob take no reason from ai-core (the layer has none); the jailing officer goes in as `by` when given.
- Not a conflict rule: ai-prison next to another prison script is not refused by `connection/rules.ts` (it builds rules from the inventory and key registries only).
