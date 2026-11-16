---
version: alpha
name: "Life Room — Arcade (light)"
description: "Pixel art: a pixel mosaic, pixel type, notched borders and square checkboxes. Mint on indigo in dark."
colors:
  primary: "#b90d75"
  primary-foreground: "#fdfcf5"
  background: "#f2f1de"
  foreground: "#211d44"
  muted-foreground: "#494772"
  card: "#fdfcf3"
  card-foreground: "#211d44"
  sidebar: "#f7f6e7"
  sidebar-foreground: "#211d44"
  border: "#babbd7"
  nav-active-bg: "#ffd6f1"
  paper: "#fdfcf3"
  paper-foreground: "#211d44"
  destructive: "#c53637"
  destructive-foreground: "#fff9f8"
  success: "#187c49"
  success-foreground: "#f7fef9"
  warning: "#d19936"
  warning-foreground: "#3c220f"
  event-1: "#c84000"
  event-2: "#a66500"
  event-3: "#5b8500"
  event-4: "#009457"
  event-5: "#008fa9"
  event-6: "#0075dd"
  event-7: "#8054d6"
  event-8: "#b83997"
  app-tasks: "#981c62"
  app-tasks-soft: "#f6dde7"
  app-calendar: "#006c28"
  app-calendar-soft: "#d7ebda"
  app-notes: "#814a00"
  app-notes-soft: "#f0e3cf"
  app-projects: "#0059a2"
  app-projects-soft: "#d6e7f8"
  priority-urgent: "#ea0000"
  priority-high: "#d72300"
  priority-medium: "#b45a00"
  priority-low: "#0083cc"
typography:
  display:
    fontFamily: "Pixelify Sans"
    fontSize: 2.75rem
    fontWeight: 600
    lineHeight: 1.05
  page-title:
    fontFamily: "Pixelify Sans"
    fontSize: 1.75rem
    fontWeight: 600
    lineHeight: 1.15
  section-title:
    fontFamily: "Pixelify Sans"
    fontSize: 1.375rem
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "IBM Plex Mono"
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "IBM Plex Mono"
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

Pixel art: a pixel mosaic, pixel type, notched borders and square checkboxes. Mint on indigo in dark.

Life Room is a calm daily planner: the day is the hero. Every theme shares one layout — sidebar, a reading column of about 760px, the Home masthead — and changes only the room: palette, texture, material, type and small component shapes.

| Slot | Value |
|---|---|
| Canvas | mosaic |
| Pattern | none |
| Grain | none |
| Surface | paper |
| Skin | pixel |
| Checkbox · divider · chip | square · dotted · square |

## Colors

- **Primary** (`{colors.primary}`): the one thing that matters now — the main action of a view, **Now**, progress, done checkboxes. Navigation uses a soft tint (`{colors.nav-active-bg}`) and a thin marker, never a primary fill.
- **Background / foreground**: body text is at least 7:1; muted text (`{colors.muted-foreground}`) at least 5.5:1 on the canvas, cards and the sidebar.
- **Event colours** (`event-1…8`) share one lightness and chroma; only the hue turns. They are shapes, at least 3:1 against the canvas.
- **App tints** (`app-*`) mark an app's icon, nav marker and small labels. Never large fills.

## Typography

- Display (Home date): Pixelify Sans 600, 2.75rem.
- Page and section titles: Pixelify Sans.
- Body, controls and metadata: IBM Plex Mono.
- Sentence case everywhere; no all-caps eyebrows.

## Layout

One reading width (about 760px) for lists and writing; full width only for the calendar grid and the task board. 4px base unit, 44px minimum row height, 16px phone gutter.

## Elevation & Depth

Surface material: **paper**. Lists sit on the canvas with hairline dividers; cards only for what floats (dialogs, sheets, popovers, calendar blocks, board cards). Three elevations: flat, raised, overlay.

## Shapes

Base radius 14px. Checkboxes are **square**, dividers **dotted**, chips **square**.

## Components

Components declare a role — page, card, floating surface, chrome, reading content, meta — and the theme decides how that role looks. One primary button per view.

## Do's and Don'ts

- Do use token references everywhere; never inline colours, fonts or radii.
- Do keep small text off busy textures (the engine masks textures out of the reading column).
- Don't fill navigation with the primary colour.
- Don't use raw Tailwind palette classes (`text-red-600`, `bg-emerald-500`, …).
