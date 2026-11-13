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
| `following` | Set original `rrule` UNTIL before the occurrence (UTC instant); create a new master from that point; move on/after exceptions to the new event (re-keyed); convert `COUNT` to the remaining count | Set original `rrule` UNTIL before the occurrence |
| `all` | Patch the master; if start shifts, shift existing exception keys by the same delta in the same transaction | Soft-delete the master |

Timed recurrence expands in the event’s IANA timezone (Luxon wall time → UTC). Nonexistent times (spring-forward gap) shift forward; ambiguous times (fall-back) use the earlier offset. Weekly 09:00 Europe/Paris stays 09:00 across DST. All-day dates do not shift across viewer timezones.

`UNTIL` is stored as a true UTC instant (`YYYYMMDDTHHMMSSZ`). Expansion compares in floating/local time for the series timezone.

## Undo semantics

Delete returns an `undo` payload the client can reverse:

| Delete scope | Undo kind | Reversal |
|---|---|---|
| `all` (or non-recurring) | `soft_delete` | Restore soft-deleted master |
| `this` | `cancel_exception` | Remove the cancellation exception (or clear `cancelled` if overrides remain) |
| `following` | `rrule_truncate` | Restore the previous RRULE on the original master |

Move/resize undo re-PATCHes the previous start/end (and all-day/timezone fields) with the **same scope** that was used for the forward edit. After a `following` split, undo targets the new series id with `scope: all` for the time fields.

## Task integration (events + links only)

Time blocks link through `cross_app_links`:

- `sourceApp=calendar`, `sourceRef=eventId`
- `targetApp=tasks`, `targetRef=taskId`
- `linkType=time_block`

| Event | Calendar reaction |
|---|---|
| `task.updated` | Update linked time-block titles |
| `task.completed` | List annotates blocks with `task.isDone` (strikethrough in UI) |
| `task.deleted` | Blocks stay; annotation shows task deleted |
| `task.restored` | Annotation recovers when the task exists again |
| `task.scheduled` / `task.unscheduled` | Due chips come from `TaskReferencesService.listDueInRange` on list |

Completing a task from a time block is done by the **web client** calling the Tasks API — Calendar never writes Tasks.

Narrow Tasks port used by Calendar: `TaskReferencesService.assertTaskInWorkspace`, `findTaskInWorkspace`, `findTasksInWorkspace`, `listDueInRange` (includes `isDone` resolved from Tasks settings, not hardcoded `done`).

`calendar.event_starting` is defined as a domain event for future reminders; no delivery in v1.

## API

All under `/workspaces/:id/calendar/...` with auth → workspace membership → `@InstalledApp('calendar')` (403 when not installed).

- `GET /events?from&to&tz` — expanded occurrences (+ due chips if Tasks installed); linked tasks batch-loaded
- `POST /events`, `PATCH/DELETE /events/:eventId` (scope + `occurrenceStart`), `POST .../restore`, `POST .../undo-delete`
- `POST /time-blocks` — `{ taskId, start, end }`
- `GET/PATCH /settings` — week start, working hours, default duration, secondary timezone, default view (admin for PATCH)
- `GET /ics-token`, `POST /ics-token/regenerate`, `POST /ics-token/revoke`

Public ICS (no session): `GET /calendar/ics/:token.ics`. Serving requires the token’s user to still be an **active workspace member** and Calendar **installed**; otherwise **404**. Regenerating rotates the hashed token; revoke rejects the old URL. Feed tokens are revoked when a member is removed (`member.removed`).

### ICS export shape

- Timed events: `DTSTART;TZID=<zone>:<local>` / `DTEND;TZID=...` plus a `VTIMEZONE` block
- All-day `EXDATE`: `EXDATE;VALUE=DATE:`
- Timed `EXDATE`: in the event’s TZID
- Modified exceptions: separate `VEVENT`s with `RECURRENCE-ID`

## Web

- `/w/[workspaceId]/calendar` — grid, quick add, command palette (Cmd/Ctrl+K), task sidebar when Tasks is installed
- Day/week: drag to move (15-minute snap), bottom-edge resize; week/month: drag across days
- Recurring edit/move/delete prompts for scope (`this` / `following` / `all`)
- Colours: the editor offers the 8 event swatches. `color` stores a swatch key (`event-1`…`event-8`), which follows the theme; older free-form CSS colours still render. No colour means the Calendar tint; task time uses the Tasks tint.
- Events are a soft fill with a solid left edge. Task time blocks are a dashed outline with a checkbox, so they do not read as meetings.
- Day and week views draw a terracotta now-line across every column when the range includes today, strongest in today's column, which gets a soft tint.
- Optimistic move updates with rollback; toast undo for move and delete
- `/w/[workspaceId]/calendar/settings` — workspace settings + ICS feed controls

Natural-language quick add uses `parseQuickAdd` in `@life-room/shared` (`chrono-node` + duration/location/recurrence helpers).

## Non-goals (v1)

Two-way Google/Outlook sync, attendees/RSVPs, booking links, AI auto-scheduling, reminder delivery.
