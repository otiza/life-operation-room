---
version: alpha
name: "Life Room — Mosaic (dark)"
description: "Large tiles with grout lines in the Paper colours, seen through frosted glass. Heavy grotesque type."
colors:
  primary: "#e08d5d"
  primary-foreground: "#21110a"
  background: "#17100c"
  foreground: "#f0eae4"
  muted-foreground: "#aea298"
  card: "#211914"
  card-foreground: "#f0eae4"
  sidebar: "#120c08"
  sidebar-foreground: "#e9e4de"
  border: "#3c302a"
  nav-active-bg: "#352118"
  paper: "#1c1611"
  paper-foreground: "#e9e4dc"
  destructive: "#e85854"
  destructive-foreground: "#22100f"
  success: "#59b47d"
  success-foreground: "#06150c"
  warning: "#e0ae57"
  warning-foreground: "#291507"
  event-1: "#d9906f"
  event-2: "#c1a057"
  event-3: "#96b069"
  event-4: "#62b995"
  event-5: "#48b7c2"
  event-6: "#73a9e1"
  event-7: "#a998dd"
  event-8: "#cf8cb8"
  app-tasks: "#e3956c"
  app-tasks-soft: "#392317"
  app-calendar: "#8abd93"
  app-calendar-soft: "#1a2e1e"
  app-notes: "#d7b16a"
  app-notes-soft: "#332710"
  app-projects: "#92b1d3"
  app-projects-soft: "#192a3c"
  priority-urgent: "#fa6863"
  priority-high: "#e9884d"
  priority-medium: "#e0ae57"
  priority-low: "#5bb0d7"
typography:
  display:
    fontFamily: "Bricolage Grotesque"
    fontSize: 3rem
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.05em
  page-title:
    fontFamily: "Bricolage Grotesque"
    fontSize: 1.75rem
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.03em
  section-title:
    fontFamily: "Bricolage Grotesque"
    fontSize: 1.25rem
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.02em
  body:
    fontFamily: "Bricolage Grotesque"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Bricolage Grotesque"
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

Large tiles with grout lines in the Paper colours, seen through frosted glass. Heavy grotesque type.

Life Room is a calm daily planner: the day is the hero. Every theme shares one layout — sidebar, a reading column of about 760px, the Home masthead — and changes only the room: palette, texture, material, type and small component shapes.

| Slot | Value |
|---|---|
| Canvas | tiles |
| Pattern | none |
| Grain | noise |
| Surface | frosted |
| Skin | classic |
| Checkbox · divider · chip | rounded · solid · tag |

## Colors

- **Primary** (`{colors.primary}`): the one thing that matters now — the main action of a view, **Now**, progress, done checkboxes. Navigation uses a soft tint (`{colors.nav-active-bg}`) and a thin marker, never a primary fill.
- **Background / foreground**: body text is at least 7:1; muted text (`{colors.muted-foreground}`) at least 5.5:1 on the canvas, cards and the sidebar.
- **Event colours** (`event-1…8`) share one lightness and chroma; only the hue turns. They are shapes, at least 3:1 against the canvas.
- **App tints** (`app-*`) mark an app's icon, nav marker and small labels. Never large fills.

## Typography

- Display (Home date): Bricolage Grotesque 800, 3rem.
- Page and section titles: Bricolage Grotesque.
- Body, controls and metadata: Bricolage Grotesque.
- Sentence case everywhere; no all-caps eyebrows.

## Layout

One reading width (about 760px) for lists and writing; full width only for the calendar grid and the task board. 4px base unit, 44px minimum row height, 16px phone gutter.

## Elevation & Depth

Surface material: **frosted**. Lists sit on the canvas with hairline dividers; cards only for what floats (dialogs, sheets, popovers, calendar blocks, board cards). Three elevations: flat, raised, overlay.

## Shapes

Base radius 14px. Checkboxes are **rounded**, dividers **solid**, chips **tag**.

## Components

Components declare a role — page, card, floating surface, chrome, reading content, meta — and the theme decides how that role looks. One primary button per view.

## Do's and Don'ts

- Do use token references everywhere; never inline colours, fonts or radii.
- Do keep small text off busy textures (the engine masks textures out of the reading column).
- Don't fill navigation with the primary colour.
- Don't use raw Tailwind palette classes (`text-red-600`, `bg-emerald-500`, …).
