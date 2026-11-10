# Notes

Daily writing surface for a workspace. One page per calendar day in the viewer timezone. Not a Notion clone and not a Markdown IDE.

## Apps

| Key | Role | Depends on | Status |
|---|---|---|---|
| `notes` | One daily note per day; paragraphs and checklist lines | — | available |

Notes does not depend on Projects or Calendar. Promoting a checklist line to a task requires Tasks to be installed; without Tasks the checkbox stays part of the note.

## Data model

- `notes` owns its table and includes `workspace_id`.
- Unique `(workspace_id, day)` — day is `YYYY-MM-DD` in the viewer timezone.
- `body` is Markdown limited to paragraphs and task-list lines (`- [ ]` / `- [x]`).
- When a checklist line becomes a task, the note keeps the line and stores the task id inline as `<!--tiza-task:uuid-->` (hidden in the writing UI).
- The connection is also recorded in `cross_app_links`: `sourceApp=notes`, `sourceRef=${noteId}:${taskId}`, `targetApp=tasks`, `targetRef=taskId`, `linkType=checklist`.
- Notes never queries the `tasks` table. Task creation goes through `TasksService.create`.

## Install / uninstall policy

1. No seed data on install.
2. On `app.uninstalled` for `notes`, keep note rows. Routes stay blocked while uninstalled.
3. Reinstalling makes the same daily pages available again.

## Daily note

`GET /workspaces/:id/notes/today?tz=…` resolves today with `calendarDateKeyInTimeZone` and get-or-creates the row. Opening `/w/[workspaceId]/notes` loads that page. Autosave patches the body; there is no Save button.

## Checklist → task

Checking an open line, or **Make task** on a focused open line, creates a task when Tasks is installed:

- Title = checklist text
- `when_date` = the note’s day
- Line is marked checked and tagged with the task id
- A `checklist` cross-app link is written

Promoting the same linked line again returns the existing task id and does not create a second task. If Tasks is not installed, the checkbox remains local note content and Make task explains that Tasks is required.

## API

- `GET /workspaces/:id/notes/today?tz=`
- `GET /workspaces/:id/notes/by-day/:day?tz=`
- `PATCH /workspaces/:id/notes/:noteId` — `{ body }`
- `POST /workspaces/:id/notes/:noteId/promote` — `{ lineIndex, checked? }`

Every route: cookie auth → workspace membership → Notes installed.

## Web routes

- `/w/[workspaceId]/notes` — today’s note (writing surface)
- Shell nav comes from the installed manifest (`NotebookPen`)

## Workspace home

When Notes is installed, the home header has **Today's note**. The home stays events, then tasks. The note is not a third decision list. Today task decisions are unchanged.

## Non-goals (this batch)

Files / FilesGateway, folders, search across notes, sharing, mentions, templates, capture with `q`, turning capture into a note, headings toolbar, bold, tables, images, wiki links, raw source mode, TipTap / ProseMirror / MDX / block database.
