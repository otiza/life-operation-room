# Calendar (v1)

Day / week / month / agenda planning with optional Tasks soft-coupling. Calendar never reads or writes the `tasks` table.

| Key | Depends on | Status |
|---|---|---|
| `calendar` | — (no hard deps) | available |

Task features (due chips, unscheduled sidebar, time blocks) light up only when Tasks is installed in the workspace.

## Data model

- `calendar_events` — workspace-scoped masters. Timed events use `start_at` / `end_at` (timestamptz). All-day events use `start_date` / `end_date` (**exclusive end**, Google/RFC style). `timezone` (IANA) drives recurrence expansion. `rrule` is an RFC 5545 string or null. `kind` is `event` or `time_block`. Soft delete via `deleted_at`. `source` (default `local`) and `external_id` are reserved for future Google/Outlook sync.
- `calendar_event_exceptions` — per-occurrence cancel or override for recurring masters (`original_occurrence_start` + either `cancelled` or overridden fields).
- `calendar_feed_tokens` — hashed ICS subscription tokens (same SHA-256 pattern as sessions).

Indexes: `(workspace_id, start_at)`, `(workspace_id, end_at)`, `(workspace_id, start_date)`.

Expanded occurrences are **never** stored. The API expands with the `rrule` library for the requested range (max 100 days).

## Recurrence semantics

| Scope | Edit | Delete |
|---|---|---|
| `this` | Upsert exception with overrides | Upsert cancelled exception |
| `following` | Set original `rrule` UNTIL before the occurrence; create a new master from that point | Set original `rrule` UNTIL before the occurrence |
| `all` | Patch the master | Soft-delete the master |

Timed recurrence expands in the event’s IANA timezone so weekly 09:00 Europe/Paris stays 09:00 across DST. All-day dates do not shift across viewer timezones.

## Task integration (events + links only)

Time blocks link through `cross_app_links`:

- `sourceApp=calendar`, `sourceRef=eventId`
- `targetApp=tasks`, `targetRef=taskId`
- `linkType=time_block`

| Event | Calendar reaction |
|---|---|
| `task.updated` | Update linked time-block titles |
| `task.completed` | List annotates blocks as done (strikethrough in UI) |
| `task.deleted` | Blocks stay; annotation shows task deleted |
| `task.restored` | Annotation recovers when the task exists again |
| `task.scheduled` / `task.unscheduled` | Due chips come from `TaskReferencesService.listDueInRange` on list |

Completing a task from a time block is done by the **web client** calling the Tasks API — Calendar never writes Tasks.

Narrow Tasks port used by Calendar: `TaskReferencesService.assertTaskInWorkspace`, `findTaskInWorkspace`, `listDueInRange`.

`calendar.event_starting` is defined as a domain event for future reminders; no delivery in v1.

## API

All under `/workspaces/:id/calendar/...` with auth → workspace membership → `@InstalledApp('calendar')`.

- `GET /events?from&to&tz` — expanded occurrences (+ due chips if Tasks installed)
- `POST /events`, `PATCH/DELETE /events/:eventId` (scope + `occurrenceStart`), `POST .../restore`
- `POST /time-blocks` — `{ taskId, start, end }`
- `GET/PATCH /settings` — week start, working hours, default duration, secondary timezone, default view (admin for PATCH)
- `GET /ics-token`, `POST /ics-token/regenerate`, `POST /ics-token/revoke`

Public ICS (no session): `GET /calendar/ics/:token.ics`. Regenerating rotates the hashed token; revoke rejects the old URL.

## Web

- `/w/[workspaceId]/calendar` — grid, quick add, command palette (Cmd/Ctrl+K), task sidebar when Tasks is installed
- `/w/[workspaceId]/calendar/settings` — workspace settings + ICS feed controls

Natural-language quick add uses `parseQuickAdd` in `@erp-tiza/shared` (`chrono-node` + duration/location/recurrence helpers).

## Non-goals (v1)

Two-way Google/Outlook sync, attendees/RSVPs, booking links, AI auto-scheduling, reminder delivery.
