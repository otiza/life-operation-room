---
version: alpha
name: "Life Room — Studio (dark)"
description: "Wool felt: sage in light, billiard green with brass in dark. Paper cards sit on it; rules are stitched."
colors:
  primary: "#ebb25f"
  primary-foreground: "#0d1f16"
  background: "#123021"
  foreground: "#f0efe6"
  muted-foreground: "#c1c7b2"
  card: "#1d3a2b"
  card-foreground: "#f0efe6"
  sidebar: "#0e271b"
  sidebar-foreground: "#f0efe6"
  border: "#375545"
  nav-active-bg: "#264837"
  paper: "#1d3a2b"
  paper-foreground: "#f0efe6"
  destructive: "#e85854"
  destructive-foreground: "#22100f"
  success: "#59b47d"
  success-foreground: "#0a1a10"
  warning: "#e5ac4c"
  warning-foreground: "#291507"
  event-1: "#f6b294"
  event-2: "#dfc07f"
  event-3: "#b7cf8e"
  event-4: "#8ad7b6"
  event-5: "#78d5e0"
  event-6: "#97c9fd"
  event-7: "#c8b9f9"
  event-8: "#ecaed7"
  app-tasks: "#f5c076"
  app-tasks-soft: "#4c4031"
  app-calendar: "#a6daaf"
  app-calendar-soft: "#37473a"
  app-notes: "#e8c58f"
  app-notes-soft: "#4b4130"
  app-projects: "#a3cffd"
  app-projects-soft: "#364452"
  priority-urgent: "#ff938b"
  priority-high: "#ffa87b"
  priority-medium: "#ebbb6e"
  priority-low: "#85cff3"
typography:
  display:
    fontFamily: "Young Serif"
    fontSize: 2.75rem
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: -0.015em
  page-title:
    fontFamily: "Young Serif"
    fontSize: 1.75rem
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.01em
  section-title:
    fontFamily: "Young Serif"
    fontSize: 1.25rem
    fontWeight: 400
    lineHeight: 1.3
  body:
    fontFamily: "Figtree"
    fontSize: 0.9375rem
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Figtree"
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

Wool felt: sage in light, billiard green with brass in dark. Paper cards sit on it; rules are stitched.

Life Room is a calm daily planner: the day is the hero. Every theme shares one layout — sidebar, a reading column of about 760px, the Home masthead — and changes only the room: palette, texture, material, type and small component shapes.

| Slot | Value |
|---|---|
| Canvas | plain |
| Pattern | none |
| Grain | felt |
| Surface | paper |
| Skin | classic |
| Checkbox · divider · chip | rounded · stitch · pill |

## Colors

- **Primary** (`{colors.primary}`): the one thing that matters now — the main action of a view, **Now**, progress, done checkboxes. Navigation uses a soft tint (`{colors.nav-active-bg}`) and a thin marker, never a primary fill.
- **Background / foreground**: body text is at least 7:1; muted text (`{colors.muted-foreground}`) at least 5.5:1 on the canvas, cards and the sidebar.
- **Event colours** (`event-1…8`) share one lightness and chroma; only the hue turns. They are shapes, at least 3:1 against the canvas.
- **App tints** (`app-*`) mark an app's icon, nav marker and small labels. Never large fills.

## Typography

- Display (Home date): Young Serif 400, 2.75rem.
- Page and section titles: Young Serif.
- Body, controls and metadata: Figtree.
- Sentence case everywhere; no all-caps eyebrows.

## Layout

One reading width (about 760px) for lists and writing; full width only for the calendar grid and the task board. 4px base unit, 44px minimum row height, 16px phone gutter.

## Elevation & Depth

Surface material: **paper**. Lists sit on the canvas with hairline dividers; cards only for what floats (dialogs, sheets, popovers, calendar blocks, board cards). Three elevations: flat, raised, overlay.

## Shapes

Base radius 14px. Checkboxes are **rounded**, dividers **stitch**, chips **pill**.

## Components

Components declare a role — page, card, floating surface, chrome, reading content, meta — and the theme decides how that role looks. One primary button per view.

## Do's and Don'ts

- Do use token references everywhere; never inline colours, fonts or radii.
- Do keep small text off busy textures (the engine masks textures out of the reading column).
- Don't fill navigation with the primary colour.
- Don't use raw Tailwind palette classes (`text-red-600`, `bg-emerald-500`, …).
