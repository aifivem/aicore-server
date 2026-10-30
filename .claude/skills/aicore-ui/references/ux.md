# Layout, states, focus, copy, review

A fixed 16:9 game screen, dark theme, mouse + keyboard. No responsive breakpoints, no light mode.

## Spacing and grouping

- Steps `0.4 / 0.8 / 1.2 / 1.6 / 2.4 vh`. Space between groups at least twice the space inside a group.
- Group by space first, then surface, last a line.
- Panel padding 1.2-1.6vh, card 1.2vh, row `0.8vh 1.2vh`, row gap 0.8-1vh.
- No fixed width/height on text boxes: `max-w` + wrap (translations grow).
- Full-screen grids with side columns use `minmax(0, 1fr)`.

## Alignment and reading order

- One left edge per column; numbers right, text left. Important information top-left; in a row identity first, then meta, then actions. Visual order equals DOM order.
- One primary action per view; more than three secondary actions go into a menu. The primary action sits in a fixed bar or header, not at the bottom of a scroll.
- Clickable elements look different from static text; accent means interaction.
- Tabs, category bars and filters carry icon + label; icon-only only for universal meanings (close, HUD status circles) or where no label fits (then a tooltip).

## Empty, loading, error

- Every list and panel has all three, tested without real data.
- Empty: what it is + how it fills + one action. Loading: skeletons at real row size, no layout shift. Error: reason + fix + retry, with an icon.

## Targets, focus, keyboard

- Hit targets at least 2.8vh; decorative layers `pointer-events-none`; `#root { pointer-events: none }`, the active panel `pointer-events-auto`.
- Every interactive element has hover, active and a visible `focus-visible` ring.
- `<button>`, never `<div onClick>`; no positive `tabIndex`. Enter/Space activate, arrows move inside a group, Escape closes the last opened layer (an open Radix popover first).
- Icon-only buttons get `aria-label`.

## Forms

- Visible labels (a placeholder is not a label); errors under the field with an icon.
- Validate on blur; on submit focus the first wrong field; disable submit while the request runs.
- Confirm destructive actions; the confirm button repeats the result ("Delete vehicle").
- Text inputs do not write to the store on every key: debounced draft, flush on blur / Enter.

## Copy

- Every text from the lang file, English, no em dash, sentence case.
- Buttons start with a verb ("Save changes"); no "OK" / "Yes". The same thing has the same name everywhere.
- Errors say reason and fix; no "Oops", no exclamation marks.
- No sentence glued from parts: full templates with `{0}` in the lang file.

## Navigation

- Back goes one level up and keeps scroll and filters. Every screen answers: where am I, where can I go, how do I leave.
- Modals and side panels have a visible close button and Escape.

## Review vocabulary

Tie a finding to one of Apple's eight principles: purpose, agency (easy undo, confirm only the irreversible), responsibility, familiarity (same look = same behaviour, close always in the same corner), flexibility, simplicity, craft, delight.

## Delivery checklist

1. Panel type and sizes follow `docs/design.md` and its sibling; every size in vh.
2. Accent only as accent.
3. Hover, active, focus-visible everywhere; targets ≥ 2.8vh.
4. Selected state shown by colour and a static mark.
5. Motion follows `performance.md`.
6. Scrolling lists are `VirtualList`; empty / loading / error exist.
7. Text ≥ 1.2vh, contrast 4.5:1 body / 3:1 secondary.
8. Texts from lang, buttons start with a verb.
9. No CEF-forbidden utilities.
10. Build passes; screenshot in the browser preview (`bun run webdev`) or checked in game.
