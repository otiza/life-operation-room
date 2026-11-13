# Work surfaces

This is the interaction contract for list-shaped mini-apps. Projects and Tasks are the reference. Read it before adding a screen that holds a user's work.

Copy `apps/web/src/features/tasks/tasks-workspace.tsx` for the next list-shaped app. Do not start from a settings form.

## A record is the work, not a form

- A project page is the list of its tasks. The name and description are the header. Archive and delete live in a menu.
- A task opens in a right-hand side panel (`?task=`). `/tasks/:taskId` redirects there. The list stays in place; on narrow screens the panel is full-screen.
- The task panel autosaves. The title is the heading. Status, priority, assignee, when, and due are pills / pickers. There is no Save button.
- **When** (plan to do it) is separate from **due** (deadline).
- Delete asks inside the app UI. Do not use `window.confirm`. A short undo bar can restore the task, a board move, or a completion for about 5 seconds.
- Assignees show the member’s name. Use the email only when the account has no name.

## Smart views and layout

- Tasks left nav: Inbox, Today (default), Upcoming, Anytime, Someday, Logbook, then projects with open-task counts.
- Inbox is tasks with no project (`project_id` null), not a seeded project.
- Layout is **list** or **board** (`layout=board`). Board is available on views where it helps (not Logbook / Upcoming day groups).
- Today has a **This evening** section for `when_evening`. Ordering in Today is manual (`today_position`).
- The workspace home is the daily decision surface. Calendar commitments for today sit above the task list. Each open today task can be marked done, moved to tomorrow, moved to this evening, taken off today, or parked in Someday. Those moves change **when**, not **due**. A task that is due today or overdue stays on the home list. Carried-over when dates (before today) can be moved to tomorrow together. Undo is on the toast.
- Title search lives in `q`. An empty search result says **No matches**.

## Capture and keys

- Global quick add: `q` (when not typing) or the shell `+` button when Tasks is installed. Natural-language tokens highlight live; chips can be removed.
- Enter creates; Shift/Cmd+Enter creates and keeps the dialog open for the next capture.
- In-list composer remains available. `/` focuses title search.
- `j` / `k` move the list highlight; with the panel open they also move the open task. Enter opens the focused task.
- Single-key actions on the selected task: `s` status, `p` priority, `d` due, `w` when, `m` move, `a` assignee, `x` complete, `e` edit, Backspace delete.
- `?` lists shortcuts. `Cmd/Ctrl+K` opens the shell command palette (installed apps only).
- Escape closes the panel / pickers / palette.
- Shortcuts never fire in an input, textarea, select, or contenteditable.

## Board and shell

- Each board column can add a task in that status.
- Drag the card itself. A click that does not move opens the task.
- A priority other than `none` is a label. The color rail stays.
- Completing a task shows a short check animation and stays struck for ~1.5s before leaving (respect `prefers-reduced-motion`).
- The shell shows the workspace name and `manifest.nav.icon`. It does not explain the product.
- Sidebar order: the mark and wordmark, the workspace switcher, **Day** (Today, Review day), **Apps** (installed apps, each icon in its signature tint, Tasks with its views and projects nested), then one profile button. The profile menu holds Settings, Manual, Add apps, the theme, and Log out.
- Active nav: a top-level item gets the soft `nav-active` tint and a 2 px terracotta marker; a nested view gets foreground weight only. Never fill both.
- The header has no bottom border at the top of the page; a hairline appears once the page scrolls.
- Task settings autosave. Drag the grip to reorder statuses and priorities.

## Home and daily review

- Home calendar: past events are faded and struck through, the current one is highlighted **Now**, and the next timed one shows **Next · in N min**.
- Home masthead (`features/today/masthead.tsx`): the date in `text-display`, a greeting by time of day, the sun arc over the 09:00 to 18:00 work window (`WORK_WINDOW`), **Next up** (or **Happening now**), and `done of planned` progress. On a phone it keeps the date and the next event. The intention slot below it is left for Notes.
- Home tasks: an `N left` count beside the heading, and **This evening** as its own section.
- From 17:00 the home shows a wrap-up banner until the day is closed; after that the header button reads **Day closed**.
- The review (`/review`) is one page with four numbered steps. In step 2 the scheduling decisions are buttons on the row so a whole list can be triaged without opening menus. See [apps/REVIEW.md](./apps/REVIEW.md).

## Still out of scope

Labels, saved views, subtasks, multi-select, comments, mentions, activity log, and a guided plan-my-day ritual (time estimates and automatic time blocks).
