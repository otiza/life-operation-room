# Adding a mini-app

Each life-manager feature is a mini-app: Nest module + frontend feature folder + shared manifest.

## 1. Declare the manifest

Add an entry in [`packages/shared/src/apps/manifests.ts`](../packages/shared/src/apps/manifests.ts):

- `key`, `name`, `description`, `version`
- `category`: `productivity` | `learning` | `career` | `health` | `social` | `finance` | `ai`
- `dependsOn`: other app keys that must be installed first
- `permissions`: capability strings enforced later by guards
- `capabilities`: platform services needed (`ai`, `files`, `integrations`, `goals`)
- `nav`: sidebar label/href/icon
- `status`: `available` when the UI exists, otherwise `coming_soon`

Rebuild shared: `pnpm --filter @erp-tiza/shared build`

## 2. Backend module

Create `apps/api/src/<app>/` with a Nest module, controller, and service.

Rules:

- Scope every row with `workspace_id`
- Use `WorkspacesService.requireMembership(...)` (or dedicated guards)
- Call `AppsService.assertInstalled(workspaceId, appKey)` on app routes
- Do not query another app’s tables; publish domain events and/or insert `cross_app_links`
- Register the module in `AppModule`

## 3. Frontend feature

Create `apps/web/src/features/<app>/` for API helpers and UI.

Add a real route under `apps/web/src/app/w/[workspaceId]/<app>/` (the dynamic `[appKey]` placeholder can stay for stubs).

Shell nav comes from installed manifests automatically after install.

Responsive checklist (mandatory):

- Wrap the page in `PageContainer` / `PageHeader`
- Mobile-first grids (`grid` → `sm:grid-cols-2` …)
- Touch-friendly primary actions (`h-11` on small screens; full-width CTAs OK)
- No horizontal page scroll; truncate or wrap long content
- Test at ~375px width before merging

## 4. Platform services (when needed)

Prefer the contracts in [`apps/api/src/platform/platform.contracts.ts`](../apps/api/src/platform/platform.contracts.ts):

| Need | Contract | Example consumers |
|---|---|---|
| Attachments / CVs | `FilesGateway` | notes, work_finder, learning |
| Chat / plans | `AiGateway` + `AiContextAdapter` | goals, learning, work_finder |
| Wearables / OAuth | `IntegrationsGateway` | fitness, calendar sync |
| Milestones | `GoalsGateway` | learning paths, job search, fitness |

Implement the Nest module the first time an app truly needs it; until then keep using the interface.

## 5. Events

Emit typed events through Nest `EventEmitter2` (see `DOMAIN_EVENTS`). Notifications and future AI/goals subscribers listen without tight coupling.
