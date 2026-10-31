# Server↔Client Data Sync (Delta Sync)

**HARD RULE.** Any script with an NUI or client state fed by live server data (tablet, shop, market, group, team, family, radio, map blips, stats...) follows this pattern. Never re-fetch or re-broadcast full state on every change: send only what changed, to only who needs it. A design that breaks a rule here is a bug, not a style choice.

Names for it: **snapshot + delta synchronization** (state sync / incremental sync); the "who gets it" side is **publish/subscribe** with **interest management** (game networking term: a client only receives what it can see or use); keeping a per-receiver copy and sending the difference is **delta compression**; marking what a mutation touched and sending it once is **dirty tracking**.

## 0. Banned patterns (reject them in review)

- "Something changed, refetch" signals (`xChanged` with no data) that make the client pull the whole screen again.
- Polling loops (`setInterval(reload, N)`) for server state. Time-based things (countdowns, invite expiry, "last seen") run on the client clock against server time (`offset = now - serverTime` at snapshot).
- Broadcasting to everyone (`-1`, all loaded players) state that only some players use or that differs per player.
- Re-sending constant data every tick (names, styles, labels in a position stream).
- Action responses carrying the whole screen ("return the fresh home").
- One field changes, the whole aggregate (group, family, catalog) is resent.


## 1. Full snapshot once per session, not on every open

- Client tracks a `client.xLoaded` flag (e.g. `client.tabletLoaded`). First time the UI opens, fetch the full snapshot via a callback, store it, set the flag. Every later open just re-shows the UI (`uiUtilty.show()` — a lightweight NUI action with no payload) — never call the full-fetch callback again.
- The NUI is a persistent single-page app (the `ui_page` never reloads between open/close, only `SetNuiFocus` toggles) — its Redux store survives across closes. Rely on that: don't rebuild state from scratch on every open.
- Server tracks which sources already received the initial snapshot (e.g. `loadedPlayers[src] = true`, set inside the full-snapshot callback). This set is cleared ONLY on `playerDropped` — never on UI close. Deltas keep flowing to a player even while their UI is closed, so the client-side store never goes stale and reopening never needs a refetch.

### 1b. Screen-scoped subscription (when deltas should stop while the UI is closed)

Session scope (above) fits a persistent NUI whose store survives close and whose data is small. When the UI tree unmounts on close, or the data is big/busy and only a few players look at it at a time (store catalog, family page, friends, radio channel lists), scope the subscription to the open screen instead:

- The screen's snapshot callback adds the player to the watchers of that screen (server side, per screen: `watchers[part]`).
- The screen sends a one-way `unwatch` net event when it closes (unmount cleanup). Several screens showing the same data are counted on the client; only the last close unwatches.
- Watchers are dropped on `playerDropped` and pruned at send time when they can no longer see the screen (left the menu, etc.).
- Every reopen takes a fresh snapshot (cheap, and the only full send).
- Deltas go only to watchers; notifications that must reach the player anyway (invite toast) travel separately.

### 1c. Per-viewer views

When the same item looks different per player (owned, bought count, "in my team", rights), build the delta row per watcher from server state; never broadcast one row and let clients guess.

## 2. Model every synced field as a delta, not a blob

Never have an action handler return (or a sync push carry) a bundle of "everything that might have changed" (e.g. an old `{ok, personal}` pattern bundling rep+money+stats+contracts+group...). That's the full-refetch anti-pattern wearing a disguise — one field changes, the whole bundle gets resent, and the UI reducer has to shallow-merge a dozen fields it didn't need.

Instead, classify each piece of state and pick the matching shape:

| Shape | Pattern | Example actions |
|---|---|---|
| Scalar field | `xSet` carrying just the new value | `repSet`, `moneySet`, `usernameSet`, `leaderboardHiddenSet` |
| Counter/map with independent keys | `xSet` carrying `{key, value}` | `statSet` (one stat counter changed) |
| Append-only set | `xAdded` carrying the new single item | `tierUnlocked` (carries the tier name; client appends if not already present) |
| List of entities with ids | `xAdd` (upsert-by-id) / `xRemove` (id) | `marketAdd`/`marketRemove`, `ownedContractAdd`/`ownedContractRemove` |
| Single nested entity (0 or 1) | `xSet` carrying the entity or `null` | `activeContractSet`, `groupInviteSet` |

`xAdd` is always an upsert (replace-by-id if present, else append) — this covers both "new entity" and "existing entity's fields changed" with one action. Never add a second "xUpdate" action for the same collection.

## 3. Push from the single source of truth, not from every call site

Put the delta push inside the mutator itself (e.g. a player class's `addRep`/`addStat`/`walletAdd` methods, or a group's `removeMember` helper), not scattered after every place that calls the mutator. If ten different features can change a player's rep, you want ten call sites to automatically get the push for free — not ten places that might forget to call `sync()` after.

```ts
class Player {
  addMoney(amount: number): void {
    this.money += amount;
    this.save();
    this.push("moneySet", this.money); // every caller gets this for free
  }
}
```

A `push(action, data)` helper resolves the target source from the stored character id and does nothing if the player is offline or not loaded yet; callers never pass a source.

## 4. Broadcast vs targeted send — decide per field by who needs to know

- **Private fields** (money, rep, personal stats, username) → targeted send to that one player only. Never broadcast.
- **Shared/public fields** (market listings, shop stock, a contract pool) → broadcast to every loaded player. When the actor who caused the change already has (or is about to get) their own targeted variant (e.g. `isMine: true` vs `false`), broadcast with `exceptSrc` set to the actor to avoid a redundant echo.
- A multi-member aggregate (a group, a crew) is not "shared to everyone" or "private to one" — it's shared to its *members only*. See §5.

## 5. Multi-member aggregates: never resend the whole aggregate on membership change

Don't rebuild and resend a full group/crew object to every member every time one member joins/leaves/gets kicked — that's O(members) full objects for a one-line change. Instead:

- Membership add → send a `xMemberAdd` (the new member's row only) to the *existing* members.
- Membership remove → send a `xMemberRemove` (the departed member's id only) to the *remaining* members.
- A field shared by the whole aggregate (name, tag, owner/leader) → its own scalar `xInfoSet` / `xLeaderSet` action to all members, not a full resend.
- The member who just joined/created the aggregate gets ONE full snapshot (`xSet` with the whole object) — for them it's a real state transition (had nothing → has everything), so a full send is correct there, not wasteful.
- The member who left gets a single `xSet null` (or equivalent "cleared" action) — not the aggregate delta actions, they're gone.

## 6. Action responses carry `{ok}`, nothing else

An NUI action's callback response should be `{ok: boolean}` (plus an error key if useful). All state changes travel through the delta-push channel described above, which fires as a side effect while the action handler runs — by the time the response reaches the client, the relevant push(es) are already in flight. Don't have the client do a second fetch "just in case" after an action; if a field didn't get a push, that's a missing push at the source (§3), not something to patch over with a refetch.

## 6b. Periodic streams (positions, blips, timers): interest management

For data that is pushed on an interval (member positions for map blips, moving objects):

- Keep, per receiver, what was last sent to them. Each tick send only: entries that came into view (with their constant data such as name/label, once), entries that moved past a threshold (e.g. 2 m / 15°, rounded values), and ids that left view.
- Constant per-stream data (style, colour, label) goes once at subscribe and again only when it changes.
- Send nothing when nothing changed. Filter by what the receiver can actually use (same routing bucket, same group, within range).

## 6b2. World objects around a player: grid streaming

Items that live at a place (ground drops, plants, sleeping bodies, placed props) go to the players around them through lib `AreaStream` (server) and `AreaFollower` (client): items filed by grid cell, followers by their own cell; a follower gets the items of the `(2r+1)^2` cells around its cell once, then puts and removes. Who has an item is computed from the cells (followers whose area covers the item's cell, plus an optional `alsoTo` player such as a carrier), so nothing is stored per follower and item; a cell change sends only the cells that came into or left the area. Followers either report their cell (client job every 2 s, checked within one cell of the ped on the server) or the server reads positions on a timer (`followAll`). Long lists go as small ordinary events in chunks: a latent event could overtake the puts and removes sent after it.

## 6c. Batching and dirty tracking

- Bursty sources (purchases, many joins) collect dirty ids and flush once per short window (1-2 s) instead of one send per event.
- Aggregates keep a `pending` record (changed member ids, new log rows) that their mutators fill; one `flush(aggregate)` turns it into the delta for its watchers. Header-like records can be diffed against the last-sent copy to send only changed fields.

## 6d. Reuse what already arrives

Before adding a fetch or event for client-side derived state (e.g. "does this player have a family radio"), check whether an existing per-player push already carries it (player-data channel, statebag) and derive from that on the client.

## 7. Prefer the native over a passthrough framework wrapper

Before using a wrapper (an export of another resource, a bridge function) in a hot path, check its source once. If it is a 1:1 forward to a FiveM native, call the native directly and skip the hop. In ai-core, hot paths read lib `online` / `cache` mirrors instead of calling ai-core exports.

## Checklist for a new synced feature

1. Does this field change independently of others? → give it its own action, don't fold it into a bundle.
2. Is it a list of entities? → `xAdd` (upsert) / `xRemove` (id), never resend the array.
3. Who needs to know — one player, or everyone, or one aggregate's members? → pick targeted send / broadcast / member-scoped push accordingly.
4. Where does this field actually mutate? → put the push there, once, not at every caller.
5. Does the action handler's response carry more than `{ok}`? → it shouldn't; make sure the real change traveled as a push.
6. Session scope or screen scope (§1 / §1b)? Who are the watchers, when do they stop?
7. Any `setInterval` refetch, "changed" ping, `-1` broadcast of player-specific data, or constant data resent per tick? → remove it (§0, §6b).
8. Do countdowns/expiry run on the client clock with the server time offset? → they must; the server does not push expiry.
