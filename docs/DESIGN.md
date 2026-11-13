# Design system (Life Room)

Read this before shipping UI. Tokens live in [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css). Primitives live in [`apps/web/src/components/ui`](../apps/web/src/components/ui). Work-surface behavior stays in [UI.md](./UI.md).

## Identity

| Decision | Choice |
|---|---|
| Product name in the UI | **Life Room** |
| Heading typeface | Literata (`--font-heading`, `text-page-title` / `text-section-title`) |
| Body typeface | IBM Plex Sans (`--font-body` / `font-sans`) |
| Accent | Terracotta `oklch(0.55 0.12 45)` (dark: `oklch(0.72 0.12 50)`) → `--primary` / `--ring` |
| Width | One reading width, about 760 px (`PageContainer` default `size="reading"`). `full` only for the calendar grid and the task board; `lg` for the marketplace and Manual. |

Do not fall back to Inter/Geist-only, purple gradients, or ALL-CAPS tracked eyebrows.

## Principles

The direction is "a calm room, not an office" ([plan](./plans/VISUAL-IDENTITY-PLAN.md)).

1. **The day is the hero.** The first thing on Home is the day: date, time of day, what is next, how far you are.
2. **Terracotta means "this matters".** Solid terracotta only for the one primary action, **Now**, and progress. Navigation uses a soft tint plus a thin marker.
3. **Fewer boxes.** Lists sit on the canvas with hairline dividers. Cards only for what floats: dialogs, sheets, popovers, calendar blocks, board cards.
4. **One reading width.** About 760 px for lists and writing; full width only for the calendar grid and the board.
5. **Literata is the voice.** Dates, page and section titles, empty states, and note text. Plex is for controls and metadata.
6. **Each app has a quiet signature tint** from one hue family, used for its icon, nav marker, and empty-state art. Never for large fills.

Theme: `next-themes` class strategy (`.dark`). Toggle light / dark / system in the profile menu at the bottom of the sidebar.

Brand mark: "Day arc" (a horizon with the sun partway along its arc). `components/brand/logo.tsx` (`LogoMark`, `Logo`), `app/icon.svg` (follows the system theme), `app/apple-icon.png`, and `app/favicon.ico` for older browsers.

## Tokens

Semantic colors (use Tailwind utilities mapped in `@theme inline`):

| Token | Use for |
|---|---|
| `background` / `foreground` | Page canvas and primary text |
| `card` / `popover` | Panels, menus, dialogs |
| `primary` / `primary-foreground` | One main action per view, **Now**, progress |
| `secondary` | Quiet chips and secondary surfaces |
| `muted` / `muted-foreground` | Descriptions and meta (AA contrast in both themes) |
| `accent` | Hover and nested (inner) active nav |
| `destructive` | Delete / irreversible |
| `success` / `warning` (+ `-foreground`) | Positive and caution states |
| `danger-soft` / `success-soft` (+ `-foreground`) | Soft tints for overdue / done affordances |
| `border` / `input` / `ring` | Hairlines and focus |
| `sidebar*` | Shell chrome |
| `priority-urgent\|high\|medium\|low\|none` | Priority accents |
| `event-1` … `event-8` | Calendar event colours: one lightness and chroma, only the hue turns |
| `app-tasks\|calendar\|notes\|projects` (+ `-soft`) | An app's signature tint: its icon, nav marker, small labels, empty-state marks. Never large fills. |
| `nav-active` / `nav-marker` | Active shell nav: soft tint background and a 2 px marker |
| `paper` / `paper-foreground` | Writing surfaces (Notes) |

Type scale utilities: `text-display` (Literata, Home date), `text-page-title`, `text-section-title`, `text-body`, `text-meta`.
Every section heading uses `SectionHeading` (`components/ui/section-heading.tsx`): title, optional count or meta, optional action link. Do not hand-roll `text-sm font-semibold` headings.  
Elevation: `shadow-flat`, `shadow-raised`, `shadow-overlay`.

### Contrast

Checked by `apps/web/src/app/design-tokens.test.ts`, which reads `globals.css`. Text needs 4.5:1; event colours are shapes and need 3:1 against the canvas.

| Pair | Light | Dark |
|---|---|---|
| muted-foreground on background | 7.0:1 | 7.6:1 |
| muted-foreground on card | 7.4:1 | 7.0:1 |
| primary-foreground on primary | 4.9:1 | 7.1:1 |
| primary on background (text) | 4.7:1 | 7.3:1 |
| foreground on nav-active | 14.0:1 | 12.7:1 |
| app-tasks on background / on its soft tint | 5.2 / 4.7:1 | 7.9 / 6.2:1 |
| app-calendar on background / on its soft tint | 5.4 / 5.0:1 | 8.7 / 6.7:1 |
| app-notes on background / on its soft tint | 5.2 / 4.8:1 | 9.4 / 7.3:1 |
| app-projects on background / on its soft tint | 5.6 / 5.1:1 | 8.5 / 6.6:1 |
| paper-foreground on paper | 15.1:1 | 14.2:1 |

**Rule:** no hardcoded Tailwind palette classes (`text-red-600`, `bg-emerald-500`, `zinc-*`, …). Prefer semantic tokens. Hex in task status/priority settings is user-editable data, not UI chrome.

## Components (when to use what)

| Component | Use for |
|---|---|
| `PageHeader` | Every page title; optional breadcrumb, description, actions |
| `SegmentedControl` | Mutually exclusive views (List/Board, Day/Week/Month/Agenda) |
| `PropertyField` | Labeled icon + value that opens a picker (status, priority, project, assignee, when, deadline) |
| `Toast` / `useToast` | Transient feedback with optional Undo (Tasks delete/complete/move, Calendar delete/move) |
| `Menu` | Compact action lists (workspace switcher, overflow “…”) |
| `EmptyState` | Empty lists with title, hint, and a **clickable** primary action (keyboard hint alone is not enough) |
| `Skeleton` | Loading placeholders that match final layout (never bare “Loading…”) |
| `Dialog` | Modal flows; focus trap, initial focus, focus return, `aria-labelledby` / `aria-describedby` |
| `Sheet` | Side panels; use `modal={false}` for the task panel so j/k still works |

Button rules: **one primary button per view**. Cancel and secondary actions use `outline`, `ghost`, or `secondary` — never `default`/`primary`.

Commands: apps register through `features/shell/command-registry.ts`. The shell owns Cmd/Ctrl+K and `?` (shortcuts cheat sheet from the same registry). Do not add a private app command palette.

## Rules for every screen

1. One primary button per view.
2. No hardcoded palette colors.
3. Sentence case; plain user-facing copy (active verbs; no system jargon).
4. Every keyboard hint has a clickable equivalent.
5. Works in light and dark themes and on mobile (~375px): `PageContainer`, touch-friendly targets, no horizontal page scroll.
6. When and deadline stay visually distinct (calendar vs flag).
7. Shell active nav uses the `nav-active` tint and a 2 px `nav-marker` on the left; nested views use foreground weight only. Never fill both.

## Checklist for new apps

- [ ] Manifest + Nest module + feature folder per [ADDING_APPS.md](./ADDING_APPS.md)
- [ ] Screen wrapped in `PageContainer` + `PageHeader` (breadcrumb when nested)
- [ ] Colors only from semantic tokens; dark mode checked
- [ ] Loading via `Skeleton`; empty via `EmptyState` with a primary action
- [ ] Destructive flows use `Dialog` (not `window.confirm`) and Undo via `useToast` when reversible
- [ ] Commands registered with `registerAppCommands`; shortcuts listed if they have keys
- [ ] Settings behind a gear / “…” in header actions, not a second always-on left rail
- [ ] Mobile-first layout; one primary CTA

## What stays out

No Storybook, no separate tokens package, no second component library (Radix only if justified first). No Material / Carbon / Polaris.
