# Work surfaces

This is the interaction contract for list-shaped mini-apps. Projects and Tasks are the reference. Read it before adding a screen that holds a user's work.

Copy `apps/web/src/features/tasks/tasks-workspace.tsx` for the next list-shaped app. Do not start from a settings form.

## A record is the work, not a form

- A project page is the list of its tasks. The name and description are the header. Archive and delete live in a menu.
- A task opens over that list (`?taskId=`). `/tasks/:taskId` redirects there. The list stays in place.
- The task dialog autosaves. The title is the heading. Status, priority, assignee, and due are pills. There is no Save button.
- Due is a menu: Today, Tomorrow, pick a day, and Clear. Today and Tomorrow are 18:00 local.
- Delete asks inside the app dialog. Do not use `window.confirm`. A short undo bar can restore the task, and a board move, for about 5 seconds.
- Assignees show the member’s name. Use the email only when the account has no name.

## Scope and layout

Scope and layout are separate, and both live in the URL.

- Scope is **All**, **Today**, or one project (the project route locks the scope). A title search lives in `q`.
- Layout is **list** or **board** (`view=board`).
- All is open tasks. On the cross-project list, done tasks stay hidden until "Show done". Inside one project, done tasks sit in a collapsed **Completed** group at the bottom. The board still shows the done column.
- Today is overdue plus due today, filtered on the client. The API `due` filter accepts only one value.
- On All, the list groups by project. Inside one project, the list groups by status.
- The done circle is the only status control on a row.

The seeded project named Inbox is the default capture project. The All view is the cross-project home. Do not add a second control named Inbox.

## Capture and keys

- The composer stays at the top, including the project choice on a phone.
- Enter creates the task and leaves focus in the composer.
- `c` focuses the composer when the user is not already typing in a field.
- `/` focuses the title search.
- `j` / `k` move the list highlight. Enter opens the focused task.
- Escape closes the dialog.
- An empty search result says **No matches**, not that the list is clear.

## Board and shell

- Each board column can add a task in that status, into the locked project or the Inbox capture project.
- Drag the card itself. A click that does not move opens the task.
- A priority other than `none` is a label. The color rail stays.
- The shell shows the workspace name and `manifest.nav.icon`. It does not explain the product.
- Task settings autosave. Drag the grip to reorder statuses and priorities. A rejected delete (a status or priority still used by tasks) puts the row back and shows the error.

## Still out of scope

Subtasks, comments, dependencies, custom fields, cycles, and a command palette. Do not add them unless the user asks.
