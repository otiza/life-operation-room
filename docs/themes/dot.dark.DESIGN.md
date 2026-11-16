---
version: alpha
name: "Life Room — Dot (dark)"
description: "A dot-grid notebook: monochrome paper with the terracotta accent. The quietest room."
colors:
  primary: "#e88e59"
  primary-foreground: "#0b0b0b"
  background: "#0b0b0b"
  foreground: "#eeeeee"
  muted-foreground: "#ababab"
  card: "#141414"
  card-foreground: "#eeeeee"
  sidebar: "#070707"
  sidebar-foreground: "#eeeeee"
  border: "#2e2e2e"
  nav-active-bg: "#301f18"
  paper: "#141414"
  paper-foreground: "#eeeeee"
  destructive: "#e85854"
  destructive-foreground: "#22100f"
  success: "#59b47d"
  success-foreground: "#0a1a10"
  warning: "#e5ac4c"
  warning-foreground: "#291507"
  event-1: "#d69b81"
  event-2: "#c2a76f"
  event-3: "#9fb47c"
  event-4: "#79bb9e"
  event-5: "#69bac3"
  event-6: "#84afdc"
  event-7: "#aea1d9"
  event-8: "#ce97bb"
  app-tasks: "#e0a07d"
  app-tasks-soft: "#302017"
  app-calendar: "#97bc9d"
  app-calendar-soft: "#19281c"
  app-notes: "#c6ad86"
  app-notes-soft: "#2c2213"
  app-projects: "#95b5d6"
  app-projects-soft: "#192532"
  priority-urgent: "#ff7e76"
  priority-high: "#e99169"
  priority-medium: "#cea35f"
  priority-low: "#74b5d4"
typography:
  display:
    fontFamily: "Instrument Serif"
    fontSize: 3.25rem
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: -0.02em
  page-title:
    fontFamily: "Instrument Serif"
    fontSize: 2rem
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.01em
  section-title:
    fontFamily: "Instrument Serif"
    fontSize: 1.5rem
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Inter"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Inter"
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: 0px
  sm: 10px
  md: 12px
  lg: 14px
  xl: 18px
  full: 9999px
spacing:
  unit: 4px
  row: 44px
  gutter: 16px
  reading: 760px
  sidebar: 236px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
  page-meta:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.meta}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.lg}"
  card-meta:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    width: "{spacing.sidebar}"
  sidebar-meta:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.muted-foreground}"
  nav-item-active:
    backgroundColor: "{colors.nav-active-bg}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "{spacing.row}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.md}"
  badge-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.success-foreground}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.warning-foreground}"
    rounded: "{rounded.full}"
  paper-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-foreground}"
  masthead-date:
    textColor: "{colors.foreground}"
    typography: "{typography.display}"
  page-title:
    textColor: "{colors.foreground}"
    typography: "{typography.page-title}"
  section-heading:
    textColor: "{colors.foreground}"
    typography: "{typography.section-title}"
  task-row:
    height: "{spacing.row}"
    typography: "{typography.body}"
  divider:
    backgroundColor: "{colors.border}"
  app-chip-tasks:
    backgroundColor: "{colors.app-tasks-soft}"
    textColor: "{colors.app-tasks}"
  app-chip-calendar:
    backgroundColor: "{colors.app-calendar-soft}"
    textColor: "{colors.app-calendar}"
  app-chip-notes:
    backgroundColor: "{colors.app-notes-soft}"
    textColor: "{colors.app-notes}"
  app-chip-projects:
    backgroundColor: "{colors.app-projects-soft}"
    textColor: "{colors.app-projects}"
  event-block-1:
    backgroundColor: "{colors.event-1}"
  event-block-2:
    backgroundColor: "{colors.event-2}"
  event-block-3:
    backgroundColor: "{colors.event-3}"
  event-block-4:
    backgroundColor: "{colors.event-4}"
  event-block-5:
    backgroundColor: "{colors.event-5}"
  event-block-6:
    backgroundColor: "{colors.event-6}"
  event-block-7:
    backgroundColor: "{colors.event-7}"
  event-block-8:
    backgroundColor: "{colors.event-8}"
  priority-urgent:
    backgroundColor: "{colors.priority-urgent}"
  priority-high:
    backgroundColor: "{colors.priority-high}"
  priority-medium:
    backgroundColor: "{colors.priority-medium}"
  priority-low:
    backgroundColor: "{colors.priority-low}"
---

## Overview

A dot-grid notebook: monochrome paper with the terracotta accent. The quietest room.

Life Room is a calm daily planner: the day is the hero. Every theme shares one layout — sidebar, a reading column of about 760px, the Home masthead — and changes only the room: palette, texture, material, type and small component shapes.

| Slot | Value |
|---|---|
| Canvas | plain |
| Pattern | dots |
| Grain | none |
| Surface | flat |
| Skin | classic |
| Checkbox · divider · chip | square · dotted · pill |

## Colors

- **Primary** (`{colors.primary}`): the one thing that matters now — the main action of a view, **Now**, progress, done checkboxes. Navigation uses a soft tint (`{colors.nav-active-bg}`) and a thin marker, never a primary fill.
- **Background / foreground**: body text is at least 7:1; muted text (`{colors.muted-foreground}`) at least 5.5:1 on the canvas, cards and the sidebar.
- **Event colours** (`event-1…8`) share one lightness and chroma; only the hue turns. They are shapes, at least 3:1 against the canvas.
- **App tints** (`app-*`) mark an app's icon, nav marker and small labels. Never large fills.

## Typography

- Display (Home date): Instrument Serif 400, 3.25rem.
- Page and section titles: Instrument Serif.
- Body, controls and metadata: Inter.
- Sentence case everywhere; no all-caps eyebrows.

## Layout

One reading width (about 760px) for lists and writing; full width only for the calendar grid and the task board. 4px base unit, 44px minimum row height, 16px phone gutter.

## Elevation & Depth

Surface material: **flat**. Lists sit on the canvas with hairline dividers; cards only for what floats (dialogs, sheets, popovers, calendar blocks, board cards). Three elevations: flat, raised, overlay.

## Shapes

Base radius 14px. Checkboxes are **square**, dividers **dotted**, chips **pill**.

## Components

Components declare a role — page, card, floating surface, chrome, reading content, meta — and the theme decides how that role looks. One primary button per view.

## Do's and Don'ts

- Do use token references everywhere; never inline colours, fonts or radii.
- Do keep small text off busy textures (the engine masks textures out of the reading column).
- Don't fill navigation with the primary colour.
- Don't use raw Tailwind palette classes (`text-red-600`, `bg-emerald-500`, …).
