# Notes plan: daily journal with a link to your tasks

Written 13 November 2026, after the daily review shipped. Current behaviour is in [../apps/NOTES.md](../apps/NOTES.md).

Decision: Notes stays **daily-only** (one page per day, linked to tasks). Pages that are not tied to a day are out of scope. No database migration is needed; the existing `notes` table and the checklist → task links in `cross_app_links` cover everything.

Four PRs, in order. Each one is useful on its own.

## Problems this fixes (found 13 Nov 2026)

1. **Enter does nothing.** The editor rebuilds its blocks from the saved Markdown on every change, and `serializeNoteMarkdown` drops empty paragraphs, so the new paragraph disappears. Typing after Enter glues text onto the same line.
2. **Ticking a checkbox is misleading.** Ticking an unlinked line creates an *open* task while the box shows ticked. **Make task** does the same, so two gestures do one job. Once linked, the box does not follow the task: completing it in Tasks leaves the note's box unchanged.
3. **Only today is visible.** `GET /notes/by-day/:day` exists, but there is no UI for other days. No list of past days, no search.
4. **No bullet lines.** `normalizeNoteMarkdown` flattens `- text` into a paragraph.

## PR 1: Make writing work

- **Editor holds its own blocks** (`apps/web/src/features/notes/note-editor.tsx`, `notes-workspace.tsx`): paragraphs, bullets, and checklist lines live in editor state and are saved through the existing 450 ms autosave. It reloads from the server only when the note id changes or after a line becomes a task.
- **Keys** (Apple Notes / Bear):
  - Enter splits the line at the cursor.
  - Backspace at the start of a line joins it to the line above.
  - Enter on an empty bullet or checklist line turns it into plain text.
  - Pasting several lines creates several blocks.
- **Bullets:** add a `bullet` block type in `packages/shared/src/notes/checklist-markdown.ts` (parse, serialize, normalize). `- [ ]` / `- [x]` still parse as checklist lines first. Typing `- ` at the start of a line makes a bullet, and `[] ` makes a checkbox.
- **Tests:**
  - Shared: round-trips for bullets, empty lines, and lines with task markers.
  - Web: editor key handling.
  - Playwright: type several paragraphs and bullets, reload, and check they are still there.

## PR 2: Checkboxes that tell the truth

Rule: a plain checkbox is a note-only to-do. A linked line **is** the task.

- **Plain lines:** ticking only toggles the box in the note. It no longer creates a task.
- **Turning a line into a task** is a separate action: a "→ Task" button on the focused line, the header's **Make task**, and `Ctrl/⌘+Enter`. The new task:
  - is created **open** (the line is not ticked);
  - gets `when_date = max(note day, today)`, so a line from a past note does not land as carried over.
- **Linked lines show the real task** (Logseq / Roam):
  - The note responses (`today`, `by-day`) also return `linkedTasks: { [taskId]: { title, isDone, deleted } }`. It comes from `TaskReferencesService.findTasksInWorkspace`, an allowed port, so `architecture/app-boundaries.spec.ts` must still pass.
  - Ticking a linked line completes or reopens the task through the tasks API, using the done-status rules in `features/today/today-decisions.ts`, with an undo toast.
  - The stored checked flag of a linked line is ignored when displaying it.
- **Deleted tasks:** the line shows "task deleted" with an **Unlink** action, which removes the marker and the link.
- **Task chip:** the "Task" label becomes a link that opens the task.
- **Tests:**
  - API e2e: the note response carries live task status, and turning a line into a task does not tick it.
  - Playwright: complete a task from the note, see it done in Tasks, then reopen it from Tasks and see the note follow.

## PR 3: Move between days (Obsidian)

- **Route and header:** `/w/[id]/notes?day=YYYY-MM-DD`. The header gets ← date →, a **Today** button, and a date picker. `[` and `]` move a day back or forward when the focus is not in a text field.
- **Browsing does not create rows:**
  - `GET /notes/by-day/:day` returns an empty note (`id: null`) without inserting.
  - The first save goes through a new `PUT /workspaces/:id/notes/by-day/:day` (upsert body).
  - `GET /notes/today` keeps get-or-create, because the home and the review depend on it.
- **Errors:** a 403 shows "You do not have access to this workspace", not "Could not open today's note".
- **Tests:**
  - API e2e: reading a day does not create a row; the first `PUT` does; the unique `(workspace_id, day)` constraint still holds.
  - Playwright: write yesterday, go to today, come back, and the text is still there.

## PR 4: Find past notes

- **Past days:** `GET /workspaces/:id/notes?before=YYYY-MM-DD&limit=` returns days with non-empty bodies, newest first, with `preview` (first line, plain text) and `checklist: { done, total }`. Shown as an **All days** panel beside the note (a sheet on phones).
- **Search:** `GET /workspaces/:id/notes/search?q=` does a case-insensitive `ILIKE` on `body`.
  - `%` and `_` are escaped.
  - At most 20 results, each with the day and a snippet around the match.
  - Also available as **Search notes…** in the command palette.
  - Plain `ILIKE` is enough at personal scale; consider `pg_trgm` only if it gets slow.
- **On this day** (Day One): at the bottom of the note, previews from 1 week, 1 month, and 1 year earlier, shown only when those notes exist.
- **Tests:** API e2e for search (match, case, escaping, workspace isolation) and the past-days list; Playwright for searching a word and opening that day.

## For every PR

- Run typecheck, lint, unit tests, API e2e, and Playwright against **local** Docker Postgres.
  - Turbo drops an undeclared `DATABASE_URL`, so start the dev servers directly (see README).
- Check the change in the browser before calling it done.
- Update `docs/apps/NOTES.md`, the in-app Manual (`apps/web/src/features/manual/manual.ts`), and `docs/PRODUCT-ROADMAP.md`.
- Each PR gets its own branch off `master` and one commit.

## Out of scope

`@` mentions, pages not tied to a day, headings and links, attachments, and a note preview on the home. Each can come later without redoing this work.
