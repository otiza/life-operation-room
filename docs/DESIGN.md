# Design system (Life Room)

Read this before shipping UI. Tokens live in [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css). Primitives live in [`apps/web/src/components/ui`](../apps/web/src/components/ui). Work-surface behavior stays in [UI.md](./UI.md).

## Identity

| Decision | Choice |
|---|---|
| Product name in the UI | **Life Room** |
| Heading typeface | Literata (`--font-heading`, `text-page-title` / `text-section-title`) |
| Body typeface | IBM Plex Sans (`--font-body` / `font-sans`) |
| Accent | Terracotta `oklch(0.58 0.12 45)` → `--primary` / `--ring` |
| Density | Comfortable (Things-like): `--radius` 0.875rem, roomy row/padding tokens |

Do not fall back to Inter/Geist-only, purple gradients, or ALL-CAPS tracked eyebrows.

Theme: `next-themes` class strategy (`.dark`). Toggle light / dark / system in the shell user menu.

## Tokens

Semantic colors (use Tailwind utilities mapped in `@theme inline`):

| Token | Use for |
|---|---|
| `background` / `foreground` | Page canvas and primary text |
| `card` / `popover` | Panels, menus, dialogs |
| `primary` / `primary-foreground` | One main action per view; shell active nav |
| `secondary` | Quiet chips and secondary surfaces |
| `muted` / `muted-foreground` | Descriptions and meta (AA contrast in both themes) |
| `accent` | Hover and nested (inner) active nav |
| `destructive` | Delete / irreversible |
| `success` / `warning` (+ `-foreground`) | Positive and caution states |
| `danger-soft` / `success-soft` (+ `-foreground`) | Soft tints for overdue / done affordances |
| `border` / `input` / `ring` | Hairlines and focus |
| `sidebar*` | Shell chrome |
| `priority-urgent\|high\|medium\|low\|none` | Priority accents |
| `event-1` … `event-8` | Calendar event tints |

Type scale utilities: `text-page-title`, `text-section-title`, `text-body`, `text-meta`.  
Elevation: `shadow-flat`, `shadow-raised`, `shadow-overlay`.

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
7. Shell active nav uses primary fill; nested/inner nav uses a subtle accent tint — not both heavy fills.

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
