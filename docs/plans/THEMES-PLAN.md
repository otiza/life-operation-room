# Themes plan: rooms you can choose

Written 16 November 2026, after the themes mockup and its design review. Reference mockup (local, git-excluded): `docs/plans/mockups/life-room-themes.html`; exported tokens: `docs/plans/mockups/design-md/*.DESIGN.md`.

Goal: let each person pick the room they work in — not just colours, but material, texture, type and small component shapes — **without** turning Life Room into a page builder and **without** ever making text hard to read.

This plan replaces the "custom user themes" line in the *Out of scope* list of [VISUAL-IDENTITY-PLAN.md](./VISUAL-IDENTITY-PLAN.md).

## Decisions already made

| Decision | Choice |
|---|---|
| What a theme is | A **palette** (light + dark tokens) plus **layer slots**: canvas, pattern, grain, surface, type, skin, and **detail tokens** (checkbox, divider, chip). |
| What a theme is not | A layout. Structure stays fixed: sidebar, reading column, masthead, the day as the hero. Arrangement presets are out of scope for now. |
| Text protection | An engine rule, not a setting. Busy textures (pattern, mosaic, tiles, ASCII) are **masked out** of the reading column and the top bar. Glass themes give lists a dense backing (≥ 76 % opaque). |
| Contrast bar | Body text ≥ 7:1, muted text ≥ 5.5:1 (canvas, card, sidebar), text on primary ≥ 4.5:1, event/priority/app hues ≥ 3:1 — in light and dark, for every theme. |
| Categorical hues | Each palette sets one lightness + chroma (`--hue-l`, `--hue-c`). Event colours, app tints and priority turn only the hue, so they always belong to the theme. |
| Source of truth | A typed **theme registry** in TypeScript. CSS tokens and one `DESIGN.md` per theme are **generated** from it. |
| Who chooses | Per **user**, not per workspace (appearance is personal). Mode (light / dark / system) stays per user too. |
| Default | **Paper** = today's Life Room, pixel for pixel. Nothing changes for anyone who doesn't open Appearance. |

## The ten themes (from the mockup)

| Theme | Palette | Canvas | Pattern | Grain | Surface | Type | Skin | Checkbox · Divider · Chip |
|---|---|---|---|---|---|---|---|---|
| Paper | cream | plain | — | paper | paper | Literata + Plex Sans | classic | circle · solid · pill |
| Atelier | cream | plain | halftone | noise | flat | Fraunces + Work Sans | classic | square · dotted · tag |
| Dot | ink | plain | dots | — | flat | Instrument Serif + Inter | classic | square · dotted · pill |
| Blueprint | blueprint | plain | grid | noise | flat | JetBrains Mono + Plex Condensed | drafting | square · dashed · square |
| Studio | felt | plain | — | felt | paper | Young Serif + Figtree | classic | rounded · stitch · pill |
| Thermal | thermal | gradient | — | noise | frosted | Syne + DM Sans | classic | circle · solid · pill |
| Fluted | deco | gradient | — | noise | fluted | Bodoni Moda + Jost | classic | diamond · double · square |
| Mosaic | cream | tiles | — | noise | frosted | Bricolage Grotesque | classic | rounded · solid · tag |
| Arcade | arcade | mosaic | — | — | paper | Pixelify + Plex Mono + Silkscreen | pixel | square · dotted · square |
| Terminal | terminal | ascii | scanlines | — | paper | JetBrains Mono | ascii | square · dashed · square |

All 20 variants (10 × light/dark) pass the contrast bar above and the documented `@google/design.md` lint rules (0 errors, 0 warnings; lowest text pair 4.91:1).

## What exists today (and what it means for the work)

- Tokens: `apps/web/src/app/globals.css` (`:root` + `.dark`, mapped in `@theme inline`). Names follow the shadcn convention (`background`, `card`, `muted-foreground`, `nav-active-bg`, `event-1…8`, `app-*`, `paper`). **Keep these names**; palettes fill them.
- Mode: `next-themes` with the class strategy (`components/theme-provider.tsx`, `theme-toggle.tsx`). Keep it for light / dark / system.
- Fonts: `next/font/google` in `app/layout.tsx` (Plex Sans, Literata, JetBrains Mono as CSS variables).
- Contrast: `app/design-tokens.test.ts` parses `globals.css`. It moves to the registry.
- Surfaces: `bg-card` appears 34 times, `bg-popover` 6, `rounded-*` 136, `shadow-*` 13 across 77 TSX files. Most `rounded-*` already map to `--radius`, so they theme for free; `bg-card` and shadows need **roles**.
- Ornaments: checkboxes are implemented separately in Home, Review, Notes and the event editor; 24 lucide icons are used.
- Users: `users` table has no preferences column; `GET /auth/me` returns the user.
- Settings: `app/w/[workspaceId]/settings` is **workspace** settings; there is no personal settings page yet.

## Architecture

```
apps/web/src/themes/
  registry.ts          ← ThemeDefinition[] (the 10 themes), typed, validated with zod
  palettes.ts          ← palette token sets (light/dark), incl. --hue-l / --hue-c
  layers/              ← canvas, pattern, grain, surface CSS (keyed on data-* attributes)
  type.ts              ← font pairings (next/font, preload: false except Paper)
  skins/               ← classic | drafting | pixel | ascii ornament styles + icon maps
  build.ts             ← generates themes.generated.css + docs/themes/<id>.DESIGN.md + baked textures
components/
  room-backdrop.tsx    ← the three texture layers, fixed behind the shell, with the text mask
  theme-provider.tsx   ← next-themes (mode) + data-theme/data-canvas/... on <html>
  ui/checkbox.tsx, ui/progress-meter.tsx, ui/icon.tsx, ui/divider (in RowList)  ← skin-aware ornaments
```

- `<html>` carries `class="dark"` (mode) and `data-theme`, `data-canvas`, `data-pattern`, `data-grain`, `data-surface`, `data-type`, `data-skin`, `data-cb`, `data-divider`, `data-chip`, `data-focus`. All styling keys off these attributes; components never read the theme in JS except the skin-aware ornaments.
- **Surface roles** replace raw `bg-card`: `surface-card` (lists on paper themes, cards), `surface-floating` (popover, menu, dialog, sheet — always solid, never glass on glass), `surface-chrome` (sidebar, header), and a `reading` region (lists and writing). Each is a Tailwind `@utility` whose look comes from the active surface material.
- **No flash:** the chosen theme is mirrored in a cookie; `app/layout.tsx` reads it server-side and writes the `data-*` attributes before first paint.
- **Fonts:** every pairing is declared with `next/font/google` and `preload: false` (Paper's stay preloaded). A font face is only downloaded when the active theme references its variable.
- **Textures:** grain tiles are static SVG files in `public/themes/`; mosaic, tiles and ASCII art are generated at build time per palette × mode (PNG / text). Nothing is generated in the browser.
- **Mask geometry:** `AppShell` publishes `--sidebar-w` and `PageContainer` publishes `--reading-w` (760 px, or `full` for calendar grid and board → the whole main area is masked). On phone the texture is a 20 % wash and lists become cards.

## Phase 0: Mockup and sign-off — done

- Mockup with the 10 themes, layer controls, live WCAG check, gallery, phone width.
- Design review applied (masking instead of plates, derived hues, own signatures for Fluted and Mosaic, detail tokens, phone type sizes).
- DESIGN.md export of all 20 variants, linted.

Exit: the user answers the open questions at the end of this plan.

## PR 1: Theme registry, Paper as data (no visual change)

- `themes/registry.ts`, `palettes.ts`, `ThemeDefinition` type. Only **Paper** is registered; its tokens are today's `globals.css` values, unchanged. (Registry invariants are enforced by tests; a zod schema arrives with the API in PR 5, in `packages/shared`.)
- `themes/generate.ts` + `pnpm --filter web themes:build` generate `app/themes.generated.css` (Paper owns `:root` / `.dark`; other themes `html[data-theme=…]` and `html[data-theme=…].dark`) and `docs/themes/<id>.<mode>.DESIGN.md`. Generated files are committed; a test fails if they are stale.
- Derived hues (`--hue-l` / `--hue-c` → `event-*`, `app-*`, `priority-*`) move to PR 3, when the first non-Paper palette needs them; Paper keeps its explicit values.
- `design-tokens.test.ts` iterates the registry instead of parsing CSS, with the new bar (7 / 5.5 / 4.5 / 3).
- Docs: `docs/DESIGN.md` gets a *Themes* section (registry, roles, the protection rule); principle 2 says "primary" instead of "terracotta", principle 5 becomes "the theme's display face is the voice".
- **Exit:** screenshots of Home, Tasks, Calendar, Notes identical to master in light and dark.

## PR 2: Surface roles and skin-aware ornaments (no visual change)

- `@utility surface-card | surface-floating | surface-chrome | surface-control`; the 44 `bg-card` / `bg-popover` / `bg-sidebar` uses are classified by hand and migrated. `cn()` knows the roles (tailwind-merge), so caller overrides still win.
- Shadows: Tailwind's `shadow-sm…2xl` become theme tokens (`--elevation-*`) with Tailwind's exact default values — no component edits needed.
- One `CheckMark` (`components/ui/check-mark.tsx`) for the three "done" marks (task rows, Home, Review); its shape is `rounded-check` → `--check-radius`. The Notes checklist keeps the native checkbox until the Notes plan rebuilds it.
- `ProgressMeter` for the masthead progress bar.
- `components/ui/icons` is the single icon import point (re-exports lucide today; ESLint blocks direct `lucide-react` imports) so skins can swap glyphs in PR 7.
- `<html>` gets the theme's `data-*` attributes; `RowList` is marked `data-region="reading"`.
- Test: no hex colours, colour functions, font families or arbitrary shadows in `.tsx` (user-editable status/priority colours excepted).
- **Exit:** screenshots of every screen (13 pages + profile menu, light/dark, 1440/390) compared pixel by pixel with master.

## PR 3: Layers, text protection and the Theme lab

- `RoomBackdrop` in the shell: each layer fixed behind the shell at z-index -1 (the wrapper is `display: contents` so blend modes blend with the room). Canvas: plain only for now (gradient, mosaic, tiles and ASCII arrive with their themes in PR 6–7). Patterns: grid, dots, halftone, scanlines. Grain: noise, paper, felt (static SVG tiles in `public/themes/`). Strength comes from the theme (`--texture-strength`).
- The mask rule, driven by `PageContainer`'s `data-page-size` (`reading`, `lg`, `full` → no canvas/pattern); a faint wash on phones.
- Surface `flat` (cards drawn by their hairline), skin `drafting` (small radius), detail tokens `data-cb` (circle/square/rounded), `data-divider` (solid/dashed/dotted/double/stitch, on `RowList` rows), `data-chip` (Badge via `rounded-chip`).
- `buildPalette()` derives a full palette from seeds; Ink, Blueprint and Felt palettes.
- Registers **Atelier, Dot, Blueprint, Studio** (Paper typography until PR 4). Not user-selectable yet.
- **Theme lab** at `/dev/themes` (404 in production) and a dev-only `?theme=<id>` switch on every page.
- **Exit:** contrast test green for 5 themes × 2 modes; Paper pixel-identical to master on every screen; the four new themes checked by eye in the lab and on Home, Tasks and Calendar.

## PR 4: Type pairings

- `themes/fonts.ts`: the font catalogue (family → next/font variable → fallback). `app/layout.tsx` loads each family once; only Paper's are preloaded, the rest use `preload: false` (downloaded only when the active theme uses them). next/font's variables are renamed (`--font-literata`, `--font-plex`, `--font-jetbrains`, …) so the **theme** owns `--font-heading`, `--font-body`, `--font-display`, `--font-section`, `--font-meta`, `--font-mono`.
- The registry's `typography` (display, page title, section title, body, meta; size or fluid clamp, weight, leading, tracking, style, case, variation) generates `--type-*` tokens; the text utilities read them.
- Pairings shipped with the registered themes: Paper (Literata + Plex, unchanged), Atelier (Fraunces + Work Sans), Dot (Instrument Serif + Inter), Blueprint (JetBrains Mono + Plex Condensed, Plex Mono meta), Studio (Young Serif + Figtree). The other pairings (Syne, Bodoni Moda + Jost, Bricolage, pixel, mono) arrive with their themes in PR 6–7.
- Tests: every family a theme uses is in the catalogue, and every catalogue family is loaded in the layout.
- **Exit:** Paper pixel-identical to master; the four pairings checked in the Theme lab.

## PR 5: Appearance — storage, switcher and focus mode (first release)

- Migration `0010_user_appearance`: `users.appearance jsonb not null default {"theme":"paper","strength":null,"focus":false}`. `GET /auth/me` returns it; `PATCH /auth/me/appearance` takes partial, strict changes validated against `THEME_IDS` (`@life-room/shared`).
- No flash: the choice is cached in `localStorage`, and a boot script in `<head>` applies it before first paint (instead of a cookie, so pages stay static); the shell re-applies the server copy when `/auth/me` loads.
- **Appearance page** (profile menu → Appearance): live preview cards, light/dark/system, texture strength (with reset), focus mode switch.
- **Focus mode**: `f` anywhere outside a text field (listed in `?` and the Manual) hides textures.
- Manual: an Appearance chapter; `f` in Shortcuts.
- Ships to users: **Paper, Atelier, Dot, Blueprint, Studio**.

## PR 6–8 (shipped together): glass, skins, the last five themes

The user asked to finish the plan in one run, so PR 6, 7 and the essentials of 8 shipped as one pull request.

- Palettes Thermal, Deco, Arcade, Terminal (plus `canvas-1…3` tokens for painted canvases; Paper gains them for Mosaic).
- Canvas: `gradient` (slow drift, stops with reduced motion; exempt from the mask because it is smooth) and `mosaic` / `tiles` / `ascii` as **static SVGs generated from the theme** into `public/themes/canvas-<theme>-<mode>.svg` (checked by the stale test).
- Surfaces `frosted` and `fluted` (ribs drawn over the glass; lists get a dense backing; floating surfaces stay solid; solid fallback under `prefers-reduced-transparency`).
- Skins: `pixel` (square corners, notched borders, crisp icons, segmented progress, stepped transitions) and `ascii` (double-line panels, `[ ]`/`[x]` marks, `##` headings, `[###·····]` progress from real values, blinking cursor on the Home date). Diamond done marks for Fluted.
- Pairings: Syne + DM Sans (Thermal), Bodoni Moda + Jost (Fluted), Bricolage (Mosaic), Pixelify + Plex Mono (Arcade), JetBrains Mono (Terminal).
- All ten themes selectable.

**Left for later** (not needed for the themes to work): a hand-drawn pixel icon set (Arcade uses crisp line icons), pixel/ASCII versions of the sun arc, per-theme density, and a full interaction-state review in the Theme lab.

## For every PR

- Screenshots from the Theme lab for the changed screens: light and dark, 1440 px and 390 px, checked by hand.
- Typecheck, lint, unit tests, API e2e, and Playwright against **local** Postgres. Start dev servers directly, not through turbo (see README).
- Regenerate themes (`themes:build`) and commit the generated CSS and `DESIGN.md` files.
- Update `docs/DESIGN.md`, `docs/UI.md` and the in-app Manual when a rule or on-screen wording changes.
- One branch off `master` per PR, opened as a pull request. Ask the user before merging.

## Order with the Notes plan

PR 1 and PR 2 change no pixels and give Notes the surface roles and the shared `Checkbox` it needs. Recommended order: **PR 1 → PR 2 → [NOTES-PLAN.md](./NOTES-PLAN.md) → PR 3 …** so Notes is built theme-ready instead of being retrofitted.

## Later (not in this plan)

- A theme that follows the day: the palette warms along the sun arc, light/dark switches at sunset.
- Accent picker within a palette (hue only; lightness and chroma fixed so contrast holds).
- User-made themes from the same schema (the registry already validates them).
- Arrangement presets (sidebar vs. top dock, Home slot order).

## Decisions on the open questions (16 November 2026)

The user approved the plan as written, so the recommended defaults apply:

1. Appearance is **per user only**; a per-device override can come later.
2. The first release (PR 5) ships **five themes**; the rest follow in PR 6–7.
3. Our own checks only (contrast test + generated DESIGN.md); `@google/design.md` can be added once it leaves alpha.
4. The focus-mode shortcut is chosen in PR 5 against the existing shortcut list.
5. **PR 1 → PR 2 → Notes → PR 3…**

## Out of scope

Free-form layouts or a page builder, per-workspace themes, importing themes from other apps, animated backgrounds beyond the slow gradient drift, sound.
