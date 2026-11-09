# Projects + Tasks

Productive mini-apps for workspace-scoped project hubs and Things/Todoist-style task tracking.

## Apps

| Key | Role | Depends on | Status |
|---|---|---|---|
| `projects` | Project hubs and project-scoped task lists | — | available |
| `tasks` | Smart views (Inbox / Today / …), capture, and the list inside a project | `projects` | available |

Install order is enforced by `dependsOn`. You cannot install Tasks without Projects. You cannot uninstall Projects while Tasks is installed.

## Data model

- `projects` and `tasks` each own their tables; both include `workspace_id`.
- `tasks.project_id` is a **nullable soft UUID** (no FK into `projects`). **Null = Inbox.** `TasksService` validates a project only when one is given.
- **When** (`when_date`, `when_evening`) is separate from **due** (`due_at`). Both are optional.
- `is_someday` parks work without a when date. Setting `when_date` clears `is_someday` and vice versa (Zod + service).
- `completed_at` is set when a task enters an `isDone` status and cleared when it leaves one.
- `today_position` is the manual order inside the Today view (independent of project `position`).
- `tasks.status` / `tasks.priority` are text keys; definitions live in `workspace_apps.config` for `appKey=tasks`.
- Apps never share tables.

## Install / uninstall policy

1. Manifest dependency blocks uninstalling `projects` while `tasks` is installed.
2. Projects no longer seeds an Inbox project. Existing projects named Inbox stay as normal projects; new no-project tasks use `project_id = null`.
3. On install of `tasks`, seed default statuses/priorities into app config.
4. On `app.uninstalled` for `tasks`, keep task rows. Routes stay blocked while uninstalled.
5. On `app.uninstalled` for `projects`, delete that workspace’s project rows (only after Tasks is uninstalled).
6. Deleting a project is blocked while any tasks still soft-reference it.
7. Deleting a status/priority from settings is blocked while tasks still use that key; disable instead.

Task delete is soft (`deleted_at`). Undo calls restore so id, position, and links stay.

## Smart views

`GET /workspaces/:id/tasks?view=…&tz=…` computes membership on the server in the client timezone.

| View | Rule |
|---|---|
| `inbox` | Open, no project, no `when_date`, not someday |
| `today` | Open, `when_date <= today` (past dates roll over) **or** due today/overdue. Each row may include `section`: `today` \| `evening` |
| `upcoming` | Open, when or due after today; appears once on `when_date` else due date; `groupKey` for day/month grouping |
| `anytime` | Open, has a project, no when, not someday |
| `someday` | Open, `is_someday` |
| `logbook` | Completed (`completed_at` set), ordered by `completed_at` desc, paginated (`cursor`, `limit`) |

"Open" = not soft-deleted and status not `isDone`. Project list/board keep working via `projectId` / board filters. `GET …/tasks/counts` returns open counts for each smart view plus per-project totals.

## Quick-add syntax

Shared parser: `parseTaskQuickAdd` in `@erp-tiza/shared` (Calendar keeps `parseQuickAdd` unchanged).

| Token | Effect |
|---|---|
| `today`, `tonight` / `this evening`, `tomorrow`, `next fri`, `in 3 days`, `jan 12` | `when_date` (+ evening for tonight) |
| `someday` | `is_someday` |
| `due fri`, `by friday`, `due jan 12 5pm` | `due_at` |
| `#project` | Match existing projects (case-insensitive, fuzzy prefix). Unknown names stay in the title with a warning chip |
| `!1`–`!4` or `!<priority key>` | Priority from enabled priorities in configured order (skipping `none`) |
| `every …` | Left in the title (recurrence out of scope; extension point exists) |

Global capture: `q` (when not typing) or shell header `+` when Tasks is installed. Enter creates; Shift/Cmd+Enter creates and keeps the dialog open. Project pages default the project; Today defaults `when_date` to today.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `q` | New task (shell) |
| `j` / `k` | Move selection (panel follows when open) |
| `s` / `p` / `d` / `w` / `m` / `a` | Status / priority / due / when / move / assignee pickers |
| `x` | Toggle complete |
| `e` | Open / edit title in side panel |
| `Backspace` | Soft-delete with undo |
| `?` | Shortcuts overlay |
| `Cmd/Ctrl+K` | Shell command palette (installed apps only) |

Shortcuts never fire while focus is in an input, textarea, select, or contenteditable, and do not override browser-reserved chords.

## Domain events (Calendar soft coupling)

| Event | When |
|---|---|
| `task.updated` | Create or update |
| `task.scheduled` | Due date set or changed |
| `task.unscheduled` | Due date cleared |
| `task.completed` | Status moves to `isDone` |
| `task.assigned` | Assignee set/changed to someone else |
| `task.deleted` | Soft delete |
| `task.restored` | Restore after soft delete |

Payload: `{ workspaceId, taskId, projectId: string | null, title, status, dueAt, assigneeUserIds, actorUserId, … }`.

## API

- `GET/POST /workspaces/:id/projects`
- `GET/PATCH/DELETE /workspaces/:id/projects/:projectId`
- `GET/POST /workspaces/:id/tasks` (GET: `view`, `projectId`, `status`, `assignee`, `due`, `tz`, `cursor`, `limit`)
- `POST /workspaces/:id/tasks/reorder` (supports `todayPosition`)
- `GET /workspaces/:id/tasks/counts` and `counts-by-project`
- `GET/PATCH /workspaces/:id/tasks/settings`
- `GET/PATCH/DELETE /workspaces/:id/tasks/:taskId`
- `POST /workspaces/:id/tasks/:taskId/restore`

Every route: cookie auth → workspace membership → app installed.

## Web routes

- `/w/[workspaceId]/tasks` defaults to Today (`view=today`). Left nav: Inbox, Today, Upcoming, Anytime, Someday, Logbook, then projects with open counts. Layout uses `layout=board`.
- `/w/[workspaceId]/projects/[projectId]` — project task list with the same side panel and shortcuts.
- `/w/[workspaceId]/tasks/[taskId]` redirects to `/tasks?view=today&task=`.
- Task detail is a right-hand side panel (`?task=`), full-screen on narrow viewports.

Completion: check animation, ~1.5s struck-through delay, then leave the list (skipped when `prefers-reduced-motion`). Undo remains available. Logbook can reopen tasks.

## Non-goals (this batch)

Recurring tasks, labels, saved views, sub-tasks, multi-select, comments, mentions, activity log, Plan-my-day with Calendar.
