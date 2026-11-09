# Projects + Tasks (v1)

Productive mini-apps for workspace-scoped project hubs and replacement-grade task tracking.

## Apps

| Key | Role | Depends on | Status |
|---|---|---|---|
| `projects` | Thin hub: CRUD projects | — | available |
| `tasks` | List/board tasks inside projects | `projects` | available |

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
- `GET/POST /workspaces/:id/tasks` (GET supports `projectId`, `status`, `assignee=me|anyone`, `due=overdue|today|upcoming|none`)
- `GET /workspaces/:id/tasks/counts-by-project`
- `GET/PATCH /workspaces/:id/tasks/settings`
- `GET/PATCH/DELETE /workspaces/:id/tasks/:taskId`

Every route: cookie auth → workspace membership → app installed.

## Web routes

- `/w/[workspaceId]/projects`
- `/w/[workspaceId]/projects/[projectId]`
- `/w/[workspaceId]/tasks` (list + board with drag-and-drop; click opens edit modal via `?taskId=`)
- `/w/[workspaceId]/tasks/settings` (statuses, priorities, colors, order)
- `/w/[workspaceId]/tasks/[taskId]` redirects to `/tasks?taskId=`

Tasks app chrome includes a top nav: **Tasks** | **Settings**.

Shell nav uses `/w/{id}/{appKey}` from installed manifests.

## Non-goals (v1)

Subtasks, dependencies, custom fields, Gantt, time tracking, Notion-like docs blocks, automations, AI.
