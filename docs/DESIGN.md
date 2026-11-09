# Design system

The web app uses one token layer. New screens read this file before choosing colors.

The structure is the shadcn/ui token model on Tailwind v4: semantic names, not a fresh gray per page. The look is a light product surface (calm canvas, white cards, near-black actions, one indigo focus ring). Density stays closer to a work tool than a marketing page.

## Tokens

They live in [apps/web/src/app/globals.css](../apps/web/src/app/globals.css) and are mapped with `@theme inline`, so Tailwind utilities exist:

- `bg-background` / `text-foreground` for the page
- `bg-card` / `text-card-foreground` for panels and lists
- `bg-popover` for dialogs and menus
- `bg-primary` / `text-primary-foreground` for the main action and the active nav item
- `bg-secondary` for quiet chips
- `text-muted-foreground` for descriptions
- `bg-accent` for hover
- `border-border` / `border-input` for hairlines
- `ring-ring` for focus
- `bg-destructive` for delete
- `bg-sidebar` / `border-sidebar-border` / `bg-sidebar-accent` for the shell

Change the look by editing those variables. Do not add a parallel palette.

## Primitives

Use the components in `apps/web/src/components/ui` (`Button`, `Input`, `Card`, `Badge`, `Dialog`). They already consume the tokens.

Raw `zinc-*`, `white`, and hex backgrounds are leftovers. When you touch a screen, replace them with the semantic utilities above.

## What stays out

Do not adopt a full enterprise system (Material, Carbon, Polaris) or a second component library. This app owns a small set of primitives plus the tokens.
