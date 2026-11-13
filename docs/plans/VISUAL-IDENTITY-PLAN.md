# Visual identity plan: a calm room, not an office

Written 13 November 2026 after a full screen review (Home, Tasks, Calendar, marketplace, Review, Notes; light and dark). This plan comes **before** [NOTES-PLAN.md](./NOTES-PLAN.md), because it changes every screen and is cheaper to do before Notes is rebuilt.

Direction: **evolve, do not rebrand.** Keep the warm cream and brown palette, terracotta accent, Literata, and IBM Plex Sans. Change how they are used. The rules end up in [../DESIGN.md](../DESIGN.md).

## What the review found

| # | Problem | Where |
|---|---|---|
| 1 | Layout reads as an admin panel: Home, Marketplace, Settings, and Manual are siblings under an "Installed apps" label. The marketplace says "Dependencies are enforced the Odoo way". | `features/shell/app-shell.tsx`, `app/w/[workspaceId]/apps/page.tsx` |
| 2 | Terracotta goes to navigation, not to the day: the active nav is a solid fill (`ShellNavLink`: `bg-primary`). On Tasks, parent and child are both highlighted, and the composer has a permanent orange ring. | `app-shell.tsx`, `tasks-composer.tsx` |
| 3 | Everything is a list in a rounded box, all with the same weight. Home has no focal point. | Home, Tasks, Review, marketplace |
| 4 | Literata appears only on page titles. Section headings are `text-sm font-semibold` sans, and the date is small grey meta. | Home, Review, Tasks |
| 5 | Widths vary with no rule: Home, Tasks, and Projects are `full` (rows about 1,300 px), Review and Notes are `md`, the marketplace is `xl`. | `PageContainer` callers |
| 6 | No brand mark: plain-text wordmark and the default `favicon.ico`. | `app-shell.tsx`, `app/favicon.ico` |
| 7 | Calendar colours are hashed pastels (`eventColorFor`), not brand hues. A task block looks like an event. | `features/calendar/event-colors.ts`, `grid/event-block.tsx` |
| 8 | Wording and noise: "Inbox" under every task row, "When: …" labels, "This Evening" vs "This evening", theme toggle and logout always visible in the sidebar. | Task rows, shell footer |
| 9 | Notes looks like a form (box of textareas). | `features/notes/*` (handled in the Notes plan; this plan only gives it the paper surface tokens) |

## Principles

1. **The day is the hero.** The first thing on Home is the day: date, time of day, what is next, how far you are.
2. **Terracotta means "this matters".** Solid terracotta only for the one primary action, **Now**, and progress. Navigation uses a tint plus a thin marker.
3. **Fewer boxes.** Lists sit on the canvas with hairline dividers. Cards only for what floats: dialogs, sheets, popovers, calendar blocks, board cards.
4. **One reading width.** About 760 px for lists and writing; full width only for the calendar grid and the board.
5. **Literata is the voice.** Dates, page and section titles, empty states, and note text. Plex is for controls and metadata.
6. **Each app has a quiet signature tint** from one hue family, used for its icon, nav marker, and empty-state art. Never for large fills.

## Phase 0: Mockup and sign-off (no code in the app)

Publish one page with **before / after** for the sidebar, Home, a Tasks list, the Calendar week, and the Notes page, in light and dark, at desktop and 390 px. It also shows the brand mark options and the tint swatches with contrast numbers.

Exit: the user picks the brand mark and confirms the tints and the Home masthead. Then the PRs below follow, in order, one branch off `master` each.

## PR A: Foundations (tokens, type, widths, wording)

No layout change yet. Everything else builds on this.

- **Tokens** (`app/globals.css`, light and dark):
  - `--app-tasks` (terracotta), `--app-calendar` (sage), `--app-notes` (ochre), `--app-projects` (slate), each with a `-soft` variant. Use them only for icons, markers, and small tints.
  - Nav tokens: `--nav-active-bg` (soft tint) and `--nav-active-marker` (terracotta).
  - Replace `--event-1…8` with 8 hues at the same lightness and chroma as the brand, so any mix looks related.
  - `--paper` and `--paper-foreground` for writing surfaces, used by Notes later.
  - Register the new tokens in the `@theme inline` block.
- **Type:**
  - Add `text-display` (Literata, about 2.5 rem, for the Home date).
  - Make `text-section-title` the only section heading, using a new `components/ui/section-heading.tsx` (title, optional count or meta, optional action link).
  - Replace the ad-hoc `text-sm font-semibold` headings on Home, Review, and Tasks.
- **Widths:** `PageContainer` gets `size="reading"` (about 760 px), which becomes the default.
  - Home, Tasks list, Projects, Review, Notes, and Settings use `reading`.
  - Calendar and the Tasks board stay `full`.
  - The marketplace and Manual use `lg`.
- **Wording:**
  - "This Evening" becomes "This evening".
  - Drop the `When:` prefix on chips.
  - Show the project under a task only when it has one; Inbox is implied.
  - Marketplace intro: "Add the apps you need. Some apps need another one first."
- **Docs:** add the six principles and the token rules to `docs/DESIGN.md`, replacing the identity table's density row with the width rule.
- **Checks:**
  - Contrast: muted text and tinted text at least 4.5:1 in both themes. Write the numbers into DESIGN.md.
  - The no-hardcoded-palette rule still holds.

## PR B: Shell and brand mark

- **Sidebar structure:**
  - **Top:** brand mark and wordmark, workspace switcher.
  - **Day:** Today (Home), Review day.
  - **Apps:** installed apps in a flat list, each icon in its signature tint, with the Tasks smart views nested as today. The "Installed apps" label goes away.
  - **Bottom:** one profile button (avatar + name) opening a menu: Settings, Manual, Add apps (marketplace), theme (light / dark / system), Log out.
- **Active state:**
  - Top-level items get `--nav-active-bg` plus a 2 px terracotta marker on the left.
  - Nested items get foreground weight only, so the parent and child are no longer both filled.
  - Rule 7 in DESIGN.md changes to match.
- **Brand mark:** `components/brand/logo.tsx` (inline SVG that inherits `currentColor` and the accent), `app/icon.svg` (Next.js app icon convention, replaces `favicon.ico`), and `app/apple-icon.png`. Both themes.
- **Header bar:** keep the breadcrumb and actions, lower the visual weight (no bottom border on scroll-top; a hairline after scrolling).
- **Mobile:** the drawer shows the same structure; the profile menu works at 375 px.
- **Tests:** update Playwright selectors that use "Marketplace" (`e2e/daily-loop.spec.ts`), and add a test that the profile menu reaches Settings and Log out.

## PR C: Lists without boxes

- A shared row-list style (`components/ui/row-list.tsx`): rows on the canvas, hairline dividers, a hover tint, and a 44 px minimum height. It replaces the `rounded-xl border bg-card` list containers in:
  - the Home calendar and task lists (`app/w/[workspaceId]/page.tsx`, `features/today/today-review.tsx`);
  - Tasks list sections (`features/tasks/tasks-list-section.tsx`, `task-rows.tsx`);
  - the Review steps (`features/review/review-workspace.tsx`);
  - the Logbook.
- The tasks composer loses its permanent ring; focus shows the ring.
- The marketplace becomes a simple list with an install toggle per app, not a card grid.
- Board columns, calendar blocks, dialogs, and sheets keep cards.

## PR D: Home masthead

- **Masthead** at the top of Home:
  - **Date and greeting:** "Friday, 13 November" in `text-display`, with a greeting by time of day ("Good morning, Sam").
  - **Sun arc:** an SVG showing how far through the 09:00–18:00 window you are (`WORK_WINDOW` from `features/review/review-plan.ts`), with a dot for now.
  - **Next up:** the next event with "in 25 min", from the existing now/next logic.
  - **Progress:** "3 of 7 done" (moves here from the Tasks heading).
  - **Intention slot:** left empty for now; Notes fills it later.
- **Below the masthead:** the composer, then the calendar list and the task list.
- **Phone:** the masthead collapses to the date and the next event.
- **Tests:** a unit test for the sun-arc position (before, during, and after the window), and a Playwright check that the masthead shows the next event.

## PR E: Calendar polish

- **Event colours:** `eventColorFor` uses the harmonized palette. Events without a colour default to the calendar tint instead of a hash.
- **Task blocks** get a dashed outline and a small checkbox icon, so they read as task time, not meetings.
- **Grid:** a terracotta now-line across the day view and week view; the today column gets a soft tint instead of a fill.
- **Event editor:** the colour picker shows the new 8 swatches.

## For every PR

- Screenshots of the changed screens in light and dark, at 1440 px and 390 px, checked by hand before calling it done.
- Typecheck, lint, unit tests, API e2e, and Playwright against **local** Postgres. Start dev servers directly, not through turbo (see README).
- Update `docs/DESIGN.md` and `docs/UI.md` when a rule changes, and update the in-app Manual if wording on screen changes.
- One branch off `master` per PR, opened as a pull request. Ask the user before merging.

## After this plan

[NOTES-PLAN.md](./NOTES-PLAN.md) runs next, on the new tokens. It gets one extra PR for the journal ideas from the same review: paper surface, an intention line shown on Home, timestamped entries, the day's events in the margin for meeting notes, mood and energy (needs a small migration), and an `n` shortcut to jot into today's note.

## Out of scope

A new palette or typeface, illustrations beyond the brand mark and empty-state marks, custom user themes, and motion beyond the existing completion animation.
