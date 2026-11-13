# Life Room

Modular life manager (Odoo-style installable apps) with a NestJS API and Next.js shell.

Packages use the `@life-room/*` scope. A few internal identifiers keep the old `tiza` prefix on purpose because existing data depends on them: the local Postgres user/database and volume, the `tiza_session` cookie, the `tiza-shell` saved UI preferences, and `@tiza-calendar` event UIDs in ICS feeds (changing these would duplicate events in subscribed calendars).

## Structure

```
apps/
  api/          NestJS modular monolith (http://localhost:3001)
  web/          Next.js shell + marketplace (http://localhost:3000)
packages/
  shared/       Zod schemas + app manifests
docs/
  ARCHITECTURE.md
  ADDING_APPS.md
  COMPETITIVE-BENCHMARK.md
  PRODUCT-ROADMAP.md
```

## Available apps

- **Projects** — workspace projects that organize tasks (Inbox is tasks without a project).
- **Tasks** — lists, board, smart views (Today, Upcoming, …), and keyboard-driven capture.
- **Calendar** — events, recurrence, ICS feed, and optional task time blocks via cross-app links.

Other catalog entries remain marketplace stubs until implemented.

## Prerequisites

- Node.js 20+
- pnpm 12+ (see `packageManager` in the root `package.json`)
- Docker (Postgres; Redis optional for later jobs)

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
# optional later: docker compose up -d redis
pnpm db:migrate
pnpm --filter @life-room/shared build
```

Create `apps/web/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:3001` (see `.env.example`).

## Development

```bash
pnpm dev
```

Or separately:

```bash
pnpm dev:api
pnpm dev:web
```

Useful checks:

```bash
pnpm build
pnpm lint
pnpm test
pnpm --filter api test:e2e
```

## Shell capabilities

- Email/password auth with HTTP-only session cookies
- Personal workspace on signup
- Shared workspaces + email invites
- Installable app catalog with dependency checks
- In-app notifications + Socket.IO delivery
- Notes daily page with checklist → task promotion
- Marketplace stubs for remaining vision apps (costs, chat, learning, work finder, goals, fitness)

## Branching & CI

Work on short-lived feature branches off `master` and merge through pull requests once CI passes. CI runs install, shared build, migrations, typecheck/build, lint, unit tests, and API e2e against Postgres 16 (see `.github/workflows/ci.yml`).

## Screenshots

TODO: add product screenshots of Projects, Tasks, and Calendar once UI is stable enough to document.

## Architecture notes

- PostgreSQL is the system of record (relations + JSONB). Redis is reserved for queues/pubsub later.
- Apps never share tables; they interconnect via `cross_app_links` and domain events.
- Agents: start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), then [docs/ADDING_APPS.md](docs/ADDING_APPS.md).
