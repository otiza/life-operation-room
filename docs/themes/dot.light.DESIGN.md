---
version: alpha
name: "Life Room — Dot (light)"
description: "A dot-grid notebook: monochrome paper with the terracotta accent. The quietest room."
colors:
  primary: "#a74f21"
  primary-foreground: "#fcfcfc"
  background: "#fafafa"
  foreground: "#161616"
  muted-foreground: "#585858"
  card: "#ffffff"
  card-foreground: "#161616"
  sidebar: "#f7f7f7"
  sidebar-foreground: "#161616"
  border: "#dedede"
  nav-active-bg: "#f8ece6"
  paper: "#ffffff"
  paper-foreground: "#161616"
  destructive: "#c53637"
  destructive-foreground: "#fff9f8"
  success: "#187c49"
  success-foreground: "#f7fef9"
  warning: "#d19936"
  warning-foreground: "#3c220f"
  event-1: "#a87158"
  event-2: "#967d46"
  event-3: "#758953"
  event-4: "#4e9074"
  event-5: "#3c8e97"
  event-6: "#5b84ae"
  event-7: "#8377ab"
  event-8: "#a16d8f"
  app-tasks: "#8d5136"
  app-tasks-soft: "#ffe9de"
  app-calendar: "#4a6d51"
  app-calendar-soft: "#e1f5e4"
  app-notes: "#765f3b"
  app-notes-soft: "#faedd9"
  app-projects: "#496684"
  app-projects-soft: "#e0f1ff"
  priority-urgent: "#ce514d"
  priority-high: "#ba673f"
  priority-medium: "#a17833"
  priority-low: "#4989a7"
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
