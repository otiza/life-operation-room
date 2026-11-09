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
- Protect routes with `AuthGuard`, `WorkspaceAccessGuard` (`@WorkspaceRoles`), and `AppInstalledGuard` (`@InstalledApp`)
- Do not query another app’s tables. Publish domain events, insert `cross_app_links`, or call a narrow port that app exports
- Seed install data from an `app.installed` listener in that app, not from `AppsService`
- Register the module in `AppModule`

## 3. Frontend feature

Create `apps/web/src/features/<app>/` for API helpers and UI.

Add a real route under `apps/web/src/app/w/[workspaceId]/<app>/` (the dynamic `[appKey]` placeholder can stay for stubs).

Follow [UI.md](./UI.md). A list-shaped app copies `TasksWorkspace`: the page is the work, edits autosave over the list, and scope stays separate from list or board.

Shell nav comes from installed manifests automatically after install. Use `manifest.nav.icon`.

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

## 6. Patterns used by Projects / Tasks

- **Install seed:** listen for `app.installed` in the app service (Projects creates an Inbox when none exists; Tasks writes default status and priority settings).
- **Uninstall keeps data (default):** on `app.uninstalled`, leave that workspace’s app rows in place. Reinstalling the app should make the data available again. `AppInstalledGuard` still blocks all app routes while uninstalled. Only hard-delete on uninstall when there is a strong reason (and document it).
- **Hard dependency without cross-app FK:** when `dependsOn` is required (Tasks → Projects), store the foreign id as a UUID column **without** a DB FK, and validate through the other app’s exported service. Reads such as “how many tasks point at this project” go through a port (`TaskReferencesService`), not a direct table import.
- Soft coupling to optional apps (e.g. Calendar): emit domain events only; do not write `cross_app_links` until a real target exists.
