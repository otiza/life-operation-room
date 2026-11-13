# Competitive benchmark

Research date: **10 November 2026**.

This note compares workflows, not feature checklists. **Verified** means the behavior was read from a public product page, help article, or changelog on that date. **Recommendation** is our judgment about Life Room. Branding, proprietary copy, and screen layouts were not copied.

Life Room today (from this repo, not from the comparison products): capture with natural language (`q`), Inbox / Today / Upcoming / Anytime / Someday / Logbook, when separate from due, This evening, projects, calendar with drag-to-create time blocks, and a workspace home that listed today's tasks and events as two read-only lists. The home now also lets you decide what stays on today. See [PRODUCT-ROADMAP.md](./PRODUCT-ROADMAP.md).

## Tasks

### Things

| | |
|---|---|
| Best workflow | Today is the daily list. When answers "when can I start?", a separate deadline answers "when must this be finished?". This Evening holds work that waits until later. Clear when, and the to-do falls back to Anytime. Future when dates stay in Upcoming until that day. |
| Why it works | The day stays short because start date and deadline are different questions. Evening is a section, not a clock time, so the morning list stays calm. |
| Life Room already | The same lists, when vs due, and This evening. Past when dates roll onto Today automatically. |
| Missing before this pass | No explicit decision when a rolled-over when date piles onto Today. Home could show the task but not move it. |
| Integration | Tasks, Projects, Today. Calendar stays context, not a second date. Future notes can link a task without changing when. |
| Complexity | Small for a when-only decision on the existing Today query. A full Things review ritual (areas, weekly) is large. |
| Source | Verified: [Scheduling to-dos](https://culturedcode.com/things/support/articles/2803579/) (fetched 10 Nov 2026). Things also documents Today, This evening, and calendar events on Today on [What's new](https://culturedcode.com/things/features/). |

### Todoist

| | |
|---|---|
| Best workflow | Today shows work scheduled for today across projects. If the list is too long, reschedule one task or every overdue task. Postponing is how you reach an empty Today. Quick add reads a date out of the title. A deadline can sit beside the scheduled date. |
| Why it works | The daily act is subtraction. Capture stays in one field. |
| Life Room already | Today across projects, quick add with dates, when vs due. |
| Missing before this pass | No reschedule from the home list, and no bulk move for work that rolled forward. Life Room's "overdue" is a deadline, not a missed when date. |
| Integration | Tasks and Today. Do not rewrite due when the user only postpones the plan. |
| Complexity | Small for per-task and bulk when changes. Recurrence postponement is a separate, larger job. |
| Source | Verified from Todoist help retrieved 10 Nov 2026: [Plan your day with the Today view](https://www.todoist.com/help/todoist/get-started/plan-your-day-with-the-today-view-UVUXaiSs), [Quick add](https://www.todoist.com/help/todoist/features/use-task-quick-add-in-todoist-va4Lhpzz), [Deadlines](https://www.todoist.com/help/todoist/features/introduction-to-deadlines-in-todoist-uMqbSLM6U). |

### TickTick

| | |
|---|---|
| Best workflow | Split view puts the task list beside the calendar. Drag a task onto a time to schedule it, or drag it onto a smart list such as Today. |
| Why it works | Planning and the list stay on one screen, so you do not lose the backlog while looking at the day. |
| Life Room already | Calendar has an unscheduled-task sidebar and drag-to time block. Tasks and Calendar are separate routes. Home showed both, without drag. |
| Missing | Home does not drag a task onto a clock time. Eisenhower and a focus timer are separate products inside TickTick. |
| Integration | Tasks and Calendar already share time blocks through links. A second drag surface on home would duplicate the calendar sidebar. |
| Complexity | Medium to large if home becomes another calendar grid. |
| Source | Verified from TickTick help retrieved 10 Nov 2026: [Show tasks with calendar](https://help.ticktick.com/articles/7358389904469917696). |

## Calendar

### Fantastical

| | |
|---|---|
| Best workflow | One sentence becomes an event or a task ("todo …", "task …"). Dated tasks sit with events in the day list. Overdue tasks carry forward. |
| Why it works | Capture does not ask you to pick an object type first. The day list is one sequence. |
| Life Room already | Separate quick-add parsers for tasks and events. Home lists events and tasks in two sections. Time blocks are tasks on the calendar. |
| Missing | One capture field that can create either an event or a task. A single chronological mix of events and open tasks. |
| Integration | High with Tasks and Calendar, but a shared parser is easy to get wrong (when vs start time). |
| Complexity | Medium. |
| Source | Verified from Flexibits help and product pages retrieved 10 Nov 2026: [Adding events and tasks](https://flexibits.com/fantastical-ios/help/adding-events-and-tasks), [Fantastical](https://flexibits.com/fantastical). |

### Google Calendar

| | |
|---|---|
| Best workflow | Click an empty time, or type a title with a time ("Tennis practice at 5pm"), and the event lands on that slot. Drag downward to lengthen it. All-day events sit above the hours. |
| Why it works | The grid is the form. Time is chosen by where you click. |
| Life Room already | Day and week grids, drag to move, resize, natural-language event quick add. |
| Missing | Guest editing and conferencing are collaboration features, not the daily loop. |
| Integration | Already the Calendar app. |
| Complexity | Not the next step. |
| Source | Verified: [Create an event](https://support.google.com/calendar/answer/72143?hl=en) (fetched 10 Nov 2026). |

### Sunsama

| | |
|---|---|
| Best workflow | A daily ritual: look at yesterday, choose today, cut what can wait, then shut down. Shutdown reviews what was completed. Incomplete tasks can roll to tomorrow automatically, or the product can ask you which ones roll. |
| Why it works | The decision is a ritual with a stopping point, not an ever-growing list. Fixed events bound how much task time is left. |
| Life Room already | Today, evening, calendar on the home, time blocks on the calendar. No shutdown ritual and no prompt when when dates roll forward. |
| Missing | Guided planning, time estimates, and publishing a plan. The missing piece that matches the current apps is the explicit "what rolls forward?" decision. |
| Integration | Tasks, Calendar, Today, Projects. Future notes can be a reflection step later. Do not add Slack publish yet. |
| Complexity | Small for when-date decisions on tasks already on Today. Large for the full ritual, channels, and agent planning. |
| Source | Verified 10 Nov 2026: [Daily planning and shutdown](https://www.sunsama.com/features/daily-planning-and-shutdown), [Daily planning manual](https://help.sunsama.com/docs/usage-guides/daily-planning/) (agentic planning is in beta there), [Account settings](https://help.sunsama.com/docs/settings/user-settings/) (rollover during evening planning can be automatic or a prompt). |

## Notes

### Apple Notes

| | |
|---|---|
| Best workflow | The same note can hold a quick thought or a long page, including files from other apps. |
| Why it works | Capture does not start a second system. |
| Life Room already | Task quick add. Notes is a marketplace stub. |
| Missing | A note object, and a way for a note to become today's work. |
| Integration | Future Notes app should land in Today as a task or a linked item, not as a third home list. |
| Complexity | Large (new app). |
| Source | Verified: [Notes user guide for Mac](https://support.apple.com/guide/notes/create-a-quick-note-apd8d4e4c3e0/mac) (fetched 10 Nov 2026). The fetched page describes jotting a quick thought or a longer note. It did not document the Quick Note hotkey steps, so that shortcut is not treated as verified here. |

### Notion

| | |
|---|---|
| Best workflow | One database, many views (table, board, calendar, list). A view of another database can be linked onto the page you are already on. |
| Why it works | You decide in context. Projects and tasks are not separate products you have to cross. |
| Life Room already | Tasks list and board, project pages that are task lists, calendar as its own app, cross-app links. |
| Missing | A note or message database. Linked views that are not task rows. |
| Integration | High later. Building a Notion-style database now would bypass the app boundaries. |
| Complexity | Large. |
| Source | Verified: [Database views, filters, sorts, and groups](https://www.notion.com/help/views-filters-and-sorts) (retrieved 10 Nov 2026). |

### Obsidian

| | |
|---|---|
| Best workflow | Open today's daily note (or create it). Use it as a journal, a to-do list, or a log. A template can prefill the page. A date property can link to that day's note. |
| Why it works | The day is a page you return to, so capture and review share a place. |
| Life Room already | Today is a task view, not a note. |
| Missing | Daily note. Recommendation: when Notes exists, today's note should open from the home, and checklist lines should become tasks. Do not build the note app in this pass. |
| Integration | Today and future Notes. |
| Complexity | Large. |
| Source | Verified: [Daily notes](https://help.obsidian.md/plugins/daily-notes) (fetched 10 Nov 2026). |

## Projects

### Linear

| | |
|---|---|
| Best workflow | Triage is an inbox for issues that arrived from outside the team (Slack, support tools, other members). Accept, decline, mark duplicate, or snooze before the issue enters the normal workflow. |
| Why it works | New work is not the same as committed work. Someone decides. |
| Life Room already | Inbox is tasks with no project and no when date. There is no snooze and no "decline". |
| Missing | A processing pass over Inbox, and a path from a message into that inbox. |
| Integration | Projects, Tasks, future collaboration. Secondary to the daily loop until messages exist. |
| Complexity | Medium for inbox triage actions. Large once Slack-style intake exists. |
| Source | Verified: [Triage](https://linear.app/docs/triage) (retrieved 10 Nov 2026). |

### Basecamp

| | |
|---|---|
| Best workflow | The home is action-oriented. My Bar keeps your tasks, upcoming events, and personal notes reachable without leaving the page. Loose to-dos can sit uncategorized, then be dragged into a list. |
| Why it works | You can capture before you know the project. Commitments stay visible while you work. |
| Life Room already | Inbox is the uncategorized list. Home shows today. Personal scratchpad notes do not exist. |
| Missing | Notes on the home, and dragging an inbox task into a project from the home. |
| Integration | Projects and future Notes. |
| Complexity | Medium for drag-to-project. Large for a notes scratchpad. |
| Source | Verified from the [Basecamp 5](https://basecamp.com/5) product page (retrieved 10 Nov 2026): action-oriented home, My Bar, loose to-dos, personal notes. |

### Notion (projects)

Covered above. Recommendation: keep Projects as task hubs. Do not add a second project document model.

## Capture

### Raycast

| | |
|---|---|
| Best workflow | A global hotkey opens a floating note or a command (including "create issue" for Linear) above the current app. |
| Why it works | Capture happens before context is lost. The destination can be chosen by the command. |
| Life Room already | In-app `q` and the shell + button when Tasks is installed. No OS-level hotkey. |
| Missing | A desktop companion. Out of scope for the web app. |
| Integration | Tasks first. Notes later. |
| Complexity | Large outside the browser. |
| Source | Verified: [Raycast Notes](https://www.raycast.com/core-features/notes) and [Linear for Raycast](https://linear.app/integrations/raycast) (retrieved 10 Nov 2026). |

### Things and Todoist capture

Covered in Tasks. Life Room already parses when, due, project, and priority in quick add. Recurrence is left in the title on purpose.

## Collaboration

### Notion and Slack, via Linear

| | |
|---|---|
| Best workflow | A Slack message becomes an issue (mention or message menu). The Slack thread and the issue thread stay in sync. Asks land in Triage even for people without a Linear account. |
| Why it works | The conversation stays the source. The task system only receives what someone accepted. |
| Life Room already | Shared workspaces, invites, in-app notifications. No chat app. No message-to-task. |
| Missing | The whole path. Recommendation: defer until a chat app exists, then land accepted items in Inbox, not on Today. |
| Integration | Future chat, Tasks, Projects. |
| Complexity | Large. |
| Source | Verified: [Slack integration](https://linear.app/integrations/slack), [Asks with Slack](https://linear.app/docs/linear-asks-slack) (retrieved 10 Nov 2026). A fetch of a Slack "save message" help URL on 10 Nov 2026 resolved to notification settings instead, so Slack's own save-for-later flow is not treated as verified here. |

## What the comparison implies

Verified pattern across Things, Todoist, and Sunsama: the useful daily act is deciding what is no longer today's work, with the calendar visible so fixed commitments bound that decision. Life Room already captures, organizes, and shows the day. It rolled unfinished when dates forward without asking. That was the gap with the best cost-to-value ratio. See the roadmap for the score and for what stays deferred.
