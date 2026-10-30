# tgiann-free-phone

The phone of choice (owner decision): ai-* scripts do not write their own phone. Status: the source was not found on this machine (searched the esx_test, vLand and crew server folders and GitHub), so nothing is tested yet. tgiann phones reach the framework through tgiann-core's ESX / QB bridge; on ai-core they should see ai-core as ESX or QB through ai-core's bridge (`docs/compat/bridge.md`).

## Integration points (optional dependency through `optionalExport`; every script works without the phone)

| Script | Phone feature | Today without the phone |
|---|---|---|
| ai-banking | bank app: balance, transfers, history | bank and ATM screens |
| ai-garages | garage app: owned vehicles, where they are | garage menus at the garages |
| ai-police | police alerts as phone notifications, calls to 911 | blip + notification card (`SendAlert`) |
| ai-death | EMS calls when down | revive by medics nearby, hospital respawn |
| ai-mechanic | invoices from mechanics to customers | job account pays, no invoice |
| ai-drugs | delivery missions by message | street sales from the radial menu |
| ai-lapraces | race invites and results by message | start line menu, best times menu |
| ai-robberies | armored truck job by message | the job giver point |
| ai-properties | house keys and doorbell messages | keys from the property menu |

## When the source is found

1. Install it next to ai-core and check which framework it detects (it should pick ai-core's ESX or QB part).
2. List every export / event it calls on the framework and add what the bridge misses (`docs/compat/bridge.md`).
3. Fill in its own exports (send message, notification, invoice) per integration point above and wire each script through `optionalExport`.
