# ERP Tiza

Modular life manager (Odoo-style installable apps) with a NestJS API and Next.js shell.

## Structure

```
apps/
  api/          NestJS modular monolith (http://localhost:3001)
  web/          Next.js shell + marketplace (http://localhost:3000)
packages/
  shared/       Zod schemas + app manifests
docs/
  ADDING_APPS.md
```

## Prerequisites

- Node.js 20+
- pnpm 12+
- Docker (Postgres; Redis optional for later jobs)

## Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
# optional later: docker compose up -d redis
pnpm db:migrate
pnpm --filter @erp-tiza/shared build
```

## Development

```bash
pnpm dev
```

Or separately:

```bash
pnpm dev:api
pnpm dev:web
```

## Phase 1 shell capabilities

- Email/password auth with HTTP-only session cookies
- Personal workspace on signup
- Shared workspaces + email invites
- Installable app catalog with dependency checks
- In-app notifications + WebSocket stub
- Marketplace stubs for near-term and vision apps (tasks, notes, costs, chat, learning, work finder, goals, fitness)

## Architecture notes

- PostgreSQL is the system of record (relations + JSONB). Redis is reserved for queues/pubsub later.
- Apps never share tables; they interconnect via `cross_app_links` and domain events.
- Agents: start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), then [docs/ADDING_APPS.md](docs/ADDING_APPS.md).
