# Projects + Tasks (v1)

Productive mini-apps for workspace-scoped project hubs and replacement-grade task tracking.

## Apps

| Key | Role | Depends on | Status |
|---|---|---|---|
| `projects` | Project page is the task list for that project | — | available |
| `tasks` | All and Today across projects, plus the list inside a project | `projects` | available |

Install order is enforced by `dependsOn`. You cannot install Tasks without Projects. You cannot uninstall Projects while Tasks is installed.

## Data model

- `projects` and `tasks` each own their tables; both include `workspace_id`.
- `tasks.project_id` is a **soft UUID** (no FK into `projects`) so apps do not share tables. `TasksService` validates via `ProjectsService.assertProjectInWorkspace`.
- `tasks.status` and `tasks.priority` are **text** keys (not fixed DB enums).
- Workspace-scoped status/priority definitions (label, color, order, enabled, `isDone`) live in `workspace_apps.config` for `appKey=tasks`, seeded from `DEFAULT_TASK_SETTINGS` on install.
- Tasks never write Projects tables; Projects never write Tasks tables.

## Install / uninstall policy

**Safer default:**

1. Manifest dependency already blocks uninstalling `projects` while `tasks` is installed.
2. On `app.installed` for `projects`, seed an **Inbox** project when the workspace has none.
3. On install of `tasks`, seed default statuses/priorities into app config.
4. On `app.uninstalled` for `tasks`, delete that workspace’s task rows.
5. On `app.uninstalled` for `projects`, delete that workspace’s project rows (only reachable after Tasks is uninstalled).
6. **Deleting a project is blocked** while any tasks still soft-reference it. Archive instead, or move/delete tasks first.
7. Deleting a status/priority from settings is blocked while tasks still use that key; disable instead to hide from board.

Task delete is soft (`deleted_at`). Undo calls restore so id, position, and links stay. TODO: add a purge job for soft-deleted tasks older than a retention window.

## Domain events (Calendar soft coupling)

Tasks emit Nest domain events. Calendar is **not** required; if Calendar is not installed, events are simply unused. No `cross_app_links` are written until a real Calendar target exists.

| Event | When |
|---|---|
| `task.updated` | Create or update |
| `task.scheduled` | Due date set or changed |
| `task.unscheduled` | Due date cleared |
| `task.completed` | Status moves to a status marked `isDone` |
| `task.assigned` | Assignee set/changed to someone else |

Payload: `{ workspaceId, taskId, projectId, title, dueAt, assigneeUserIds, actorUserId, previousAssigneeUserId?, previousDueAt? }`.

`NotificationsService` notifies assignees (except the actor) on `task.assigned` and `task.scheduled`. A stub listener in `TasksService` also logs events for Calendar observability.

## API

- `GET/POST /workspaces/:id/projects`
- `GET/PATCH/DELETE /workspaces/:id/projects/:projectId`
- `GET/POST /workspaces/:id/tasks` (GET supports `projectId`, `status`, `assignee=me|anyone`, `due=overdue|today|upcoming|none`, `tz`)
- `POST /workspaces/:id/tasks/reorder`
- `GET /workspaces/:id/tasks/counts-by-project`
- `GET/PATCH /workspaces/:id/tasks/settings`
- `GET/PATCH/DELETE /workspaces/:id/tasks/:taskId`
- `POST /workspaces/:id/tasks/:taskId/restore`

Every route: cookie auth → workspace membership → app installed.

## Web routes

- `/w/[workspaceId]/projects` opens each project from the card. The card shows open and total task counts.
- `/w/[workspaceId]/projects/[projectId]` is that project's task list. The name and description save on blur. Archive and delete are in the header menu.
- `/w/[workspaceId]/tasks` is All and Today across projects (`scope=today`, `view=board`, `done=1`, `taskId=`). The list groups by project. The board groups by status.
- `/w/[workspaceId]/tasks/settings` edits statuses, priorities, colors, and order.
- `/w/[workspaceId]/tasks/[taskId]` redirects to `/tasks?taskId=`.

The task dialog autosaves. See [../UI.md](../UI.md).

Shell nav uses `/w/{id}/{appKey}` from installed manifests, with `manifest.nav.icon`.

## Non-goals (v1)

Subtasks, dependencies, custom fields, Gantt, time tracking, Notion-like docs blocks, automations, AI.
